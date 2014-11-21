/**
 * # SocketIo
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles network connections through Socket.IO
 */

"use strict";

// Global scope

module.exports = SocketIo;

var GameMsg = require('nodegame-client').GameMsg;

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
     * ### SocketIo.channel
     *
     * The Socket.IO internal channel
     *
     * Notice: do not confound with ServerChannel
     * TODO: rename.
     */
    this.channel = null;

    /**
     * ### SocketIo.sidPrefix
     *
     * The prefix to be added to the id of every client connected to the socket
     *
     * Must have exactly 2 characters and be unique for every socket.
     */
    this.sidPrefix = this.gameServer.ADMIN_SERVER ? 'SA' : 'SP';
}


// ## SocketIo methods

/**
 * ### SocketIo.attachListeners
 *
 * Activates the socket to accepts incoming connections
 */
SocketIo.prototype.attachListeners = function() {
    var that = this;
    this.channel = this.sio.of(this.gameServer.endpoint).on('connection',
        function(socket) {
            var res, prefixedSid;
            var startingRoom, clientType;

            prefixedSid = that.sidPrefix + socket.id;

            if (that.gameServer.options.sioQuery && socket.handshake.query) {
                startingRoom = socket.handshake.query.startingRoom;
                clientType = socket.handshake.query.clientType;
            }

            res = that.gameServer.onConnect(prefixedSid, that,
                socket.handshake.headers, clientType, startingRoom);

            if (res) {
                socket.on('message', function(msg) {
                    that.gameServer.onMessage(msg);
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
    // Remove socket name from sid (exactly 2 characters, see constructor):
    strippedSid = sid.slice(2);
    socket = this.sio.sockets.sockets[strippedSid];

    if (!socket) {
        throw new Error('SocketIo.disconnect: ' +
                        'socket not found for sid "' + sid + '".');
    }

    socket.disconnect();
    this.gameServer.onDisconnect(sid, socket);
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
            this.channel.json.send(msg);
        }
        else {
            this.channel.volatile.json.send(msg);
        }
        sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ALL');
        msgLogger.log(gameMsg);
    }

    // Either send to a specific client(1), or to ALL but a specific client(2).
    else {
        // Remove socket name from sid (exactly 2 characters, see constructor):
        strippedSid = sid.slice(2);

        // (1)
        if (!broadcast) {

            client = this.channel.sockets[strippedSid];

            if (!client) {
                sysLogger.log('SocketIo.send: Msg not sent. Unexisting ' +
                              'recipient sid: ' + strippedSid, 'error');
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
            msgLogger.log(gameMsg);

        }
        // (2)
        else {

            for (clientSid in this.channel.sockets) {
                if (strippedSid === clientSid) continue;

                client = this.channel.sockets[clientSid];
                if (rel) {
                    client.json.send(msg);
                }
                else {
                    client.volatile.json.send(msg);
                }
                sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to sid ' +
                              clientSid);
                msgLogger.log(gameMsg);
            }
        }
    }
    return true;
};



