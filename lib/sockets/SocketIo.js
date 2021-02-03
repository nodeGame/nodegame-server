/**
 * # SocketIo
 * Copyright(c) 2020 Stefano Balietti
 * MIT Licensed
 *
 * Handles network connections through Socket.IO
 */

"use strict";

// Global scope

module.exports = SocketIo;

/**
 * ## SocketIo constructor
 *
 * Creates an instance of SocketIo
 *
 * @param {GameServer} server A GameServer instance
 *
 * @see GameServer
 */
function SocketIo(gameServer) {

    /**
     * ### SocketIo.name
     *
     * The name of the socket.
     */
    this.name = 'sio';

    /**
     * ### Socket.gameServer
     *
     * Reference to the game server in which the socket is created.
     *
     * @see GameServer
     */
    this.gameServer = gameServer;

    /**
     * ### Socket.sio
     *
     * Reference to the Socket.IO app of the game server
     *
     * @see GameServer
     */
    this.sio = this.gameServer.sio;

    /**
     * ### SocketIo.sioChannel
     *
     * The Socket.IO internal channel
     */
    this.sioChannel = null;

    /**
     * ### SocketIo.sidPrefix
     *
     * The prefix to be added to the id of every client connected to the socket
     *
     * Must have exactly 2 characters and be unique for every socket.
     */
    this.sidPrefix = this.gameServer.ADMIN_SERVER ? 'SA' : 'SP';

    /**
     * ### SocketIo.sidPrefixStrip
     *
     * The prefix to be stripped from sid for internal operations
     *
     * Sids are represented as SA/endpoint#sid, but in sockets.connected
     * they are saved as /#sid. Note: endpoints already start with a /.
     *
     * Notice: this depends on how Socket.io represets sid internally.
     * If they change the internal structure it needs to be adapted.
     *
     * @see SocketIo.disconnect
     */
    this.sidPrefixStrip = this.sidPrefix + this.gameServer.endpoint;

    /**
     * ### SocketIo.sidPrefixStripLen
     *
     * The length of the prefix to be stripped from sid for internal operations
     *
     * @see SocketIo.sidPrefixStrip
     * @see SocketIo.disconnect
     */
    this.sidPrefixStripLen = this.sidPrefixStrip.length;
}


// ## SocketIo methods

/**
 * ### SocketIo.attachListeners
 *
 * Activates the socket to accepts incoming connections
 */
SocketIo.prototype.attachListeners = function() {
    var that;
    that = this;
    this.sioChannel = this.sio.of(this.gameServer.endpoint).on('connection',
        function(socket) {
            var res, prefixedSid;
            var startingRoom, clientType;

//            console.log('hello!', socket.handshake.decoded_token.name);

            prefixedSid = that.sidPrefix + socket.id;

            if (that.gameServer.options.sioQuery && socket.handshake.query) {
                startingRoom = socket.handshake.query.startingRoom;
                clientType = socket.handshake.query.clientType;

                // TODO: check the implications of allowing setting ID here.
                // var clientId;
                // clientId = socket.handshake.query.id;

                // Cleanup clientType (sometimes browsers add quotes).
                if (clientType &&
                    ((clientType.charAt(0) === '"' &&
                     clientType.charAt(clientType.length-1) === '"') ||
                    (clientType.charAt(0) === "'" &&
                     clientType.charAt(clientType.length-1) === "'"))) {

                    clientType = clientType.substr(1,clientType.length -2);
                }
            }

            // Add information about the IP in the headers.
            // This might change in different versions of Socket.IO
            // socket.handshake.headers.address = socket.handshake.address;

            res = that.gameServer.onConnect(prefixedSid, that,
                                            socket.handshake, clientType,
                                            startingRoom);

            if (res) {
                socket.on('message', function(msgStr) {
                    var gameMsg;
                    gameMsg = that.gameServer.secureParse(msgStr);
                    if (!gameMsg) return;

                    // Anti-spoofing.
                    if (that.gameServer.antiSpoofing &&
                        gameMsg.sid !== socket.id) {

                        // We log it here because we skip onMessage.
                        that.gameServer.msgLogger.log(gameMsg, 'in', msgStr);
                        // Find out the id of the spoofer.
                        res = that.gameServer.registry.sid;
                        if (!res) {
                            res = '[no-sid-yet]';
                        }
                        else {
                            res = res.get(gameMsg.sid);
                            res = res ? res.id : '[id-not-found]';
                        }
                        that.gameServer.sysLogger.log('SocketIo socket ' +
                                                      'spoofed msg detected: ' +
                                                      gameMsg.id + ' from ' +
                                                      res);
                        return;
                    }
                    that.gameServer.onMessage(gameMsg, msgStr);
                });
                socket.on('disconnect', function() {
                    that.gameServer.onDisconnect(prefixedSid, socket);
                });
            }
        });

    this.sio.sockets.on("shutdown", that.gameServer.onShutdown);
};

/**
 * ### SocketIo.disconnect
 *
 * Disconnects the client registered under the specified socket id
 *
 * @param {string} sid The socket id of the client to disconnect
 */
SocketIo.prototype.disconnect = function(sid) {
    var socket, strippedSid;

    // Remove socket name from sid (2 chars + channel name).
    strippedSid = this.parseSid(sid);

    // Ste: was.
    //socket = this.sio.sockets.sockets[strippedSid];
    // Ste: was.
    // socket = this.sio.sockets.connected[strippedSid]; // full strip.
    socket = this.sioChannel.connected[sid.slice(2)];

    if (!socket) {
        throw new Error('SocketIo.disconnect: ' +
                        'socket not found for sid "' + sid + '". Stripped: ' +
                        strippedSid
                       );
    }

    socket.disconnect(true);
    // This is already triggered by the method above.
    // this.gameServer.onDisconnect(sid, socket);
};

/**
 * ### SocketIo.send
 *
 * Sends a game message to the client registered under the specified socket id
 *
 * The _to_ field of the game message is usually different from the _sid_ and
 * it is not used to locate the client.
 *
 * @param {GameMsg} gameMsg The game message
 * @param {string} sid The socket id of the receiver
 * @param {boolean} broadcast If TRUE, the message will not be sent to
 *   the client with sid = sid. Default: FALSE
 * @return {boolean} TRUE, on success
 */
SocketIo.prototype.send = function(gameMsg, sid, broadcast) {
    var msg, client, rel, strippedSid, clientSid;
    var sysLogger, msgLogger;

    if (sid === 'SERVER' || sid === null) {
        sysLogger.log('SocketIo.send: Trying to send msg to ' +
                      'nobody: ' + sid, 'error');
        return false;
    }

    broadcast = broadcast || false;

    sysLogger = this.gameServer.sysLogger;
    msgLogger = this.gameServer.msgLogger;

    if (sid === 'ALL' && broadcast) {
        sysLogger.log('SocketIo.send: Incompatible options: broadcast = true ' +
                      'and sid = ALL', 'error');
        return false;
    }

    // Cleanup msg, if necessary.
    if (gameMsg._to) {
        if (!gameMsg._originalTo) {
            sysLogger.log('SocketIo.send: _to field found, but no _originalTo ',
                          'error');
            return false;
        }
        gameMsg.to = gameMsg._orginalTo;
        delete gameMsg._to;
        delete gameMsg._originalTo;
    }

    if (gameMsg._sid) delete gameMsg._sid;
    if (gameMsg._channelName) delete gameMsg._channelName;
    if (gameMsg._roomName) delete gameMsg._roomName;

    rel = gameMsg.reliable;
    msg = gameMsg.stringify();

    // Send to ALL.
    if (sid === 'ALL') {
        if (rel) {
            this.sioChannel.json.send(msg);
        }
        else {
            this.sioChannel.volatile.json.send(msg);
        }
        sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ALL');
        msgLogger.log(gameMsg, 'out-ALL');
    }

    // Either send to a specific client(1), or to ALL but a specific client(2).
    else {
        // Remove socket name from sid (exactly 2 characters, see parseSid).
        strippedSid = sid.slice(2);

        // (1)
        if (!broadcast) {

            // Ste: Now:
            client = this.sioChannel.connected[strippedSid];


            if (!client) {
                sysLogger.log('SocketIo.send: msg ' + gameMsg.toSMS()  +
                              ' not sent. Unexisting recipient sid: ' +
                              strippedSid, 'error');
                return false;
            }

            if (rel) {
                client.json.send(msg);
            }
            else {
                client.volatile.json.send(msg);
            }
            sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to sid ' +
                          strippedSid);
            msgLogger.log(gameMsg, 'out-ID');

        }
        // (2)
        else {

            for (clientSid in this.sioChannel.connected) {
                if (strippedSid === clientSid) continue;

                client = this.sioChannel.connected[clientSid];


                if (rel) {
                    client.json.send(msg);
                }
                else {
                    client.volatile.json.send(msg);
                }
                sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to sid ' +
                              clientSid);
                msgLogger.log(gameMsg, 'out-BROADCAST');
            }
        }
    }
    return true;
};

/**
 * ### SocketIo.parseSid
 *
 * Parses a socket id (sid) from nodeGame to Socket.io format
 *
 * This returns the format found in `this.sio.sockets.connected`.
 * In `sioChannel.connected` the format is sid.slice(2).
 *
 * @param {string} sid The sid to parse
 *
 * @return {string} The Socket.io-formatted sid
 */
SocketIo.prototype.parseSid = function(sid) {
    return '/' + sid.slice(this.sidPrefixStripLen);
};
