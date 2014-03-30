/**
 * # SocketIo
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles network connections through Socket.IO
 * ---
 */

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
     * ## SocketIo.name
     *
     * The name of the socket. 
     */
    this.name = 'sio';

    /**
     * ## Socket.gameServer
     *
     * Reference to the game server in which the socket is created.
     *
     * @see GameServer
     */
    this.gameServer = gameServer;

    /**
     * ## Socket.sio
     *
     * Reference to the Socket.IO app of the game server
     *
     * @see GameServer
     */
    this.sio = this.gameServer.sio;

    /**
     * ## SocketIo.channel
     *
     * The Socket.IO internal channel 
     *
     * Notice: do not confound with ServerChannel
     * TODO: rename.
     */
    this.channel = null;

    /**
     * ## SocketIo.sidPrefix
     *
     * The prefix to be added to the id of every client connected to the socket 
     *
     * Must have exactly 2 characters and be unique for every socket.
     */ 
    this.sidPrefix = this.gameServer.ADMIN_SERVER ? 'SA' : 'SP';
}


//## METHODS

/**
 * ## SocketIo.attachListeners
 *
 * Activates the socket to accepts incoming connections
 */
SocketIo.prototype.attachListeners = function() {
    var that = this;
    this.channel = this.sio.of(this.gameServer.endpoint).on('connection',
        function(socket) {            
            var res, headers, prefixedSid;
            prefixedSid = that.sidPrefix + socket.id;
            headers = socket.handshake.headers;

            res = that.gameServer.onConnect(prefixedSid, that, headers);

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
 * ## SocketIo.disconnect
 *
 * Disconnects the client registered under the specified socket id 
 *
 * @param {string} sid The socket id of the client to disconnect
 */
SocketIo.prototype.disconnect = function(sid) {
    var socket = this.sio.sockets.sockets[sid];

    if (!socket) {
        throw new Error('SocketIo.disconnect: socket not found for sid "' +
                sid + '".');
    }

    socket.disconnect();
    this.gameServer.onDisconnect(sid, socket);
};

/**
 * ## SocketIo.send
 *
 * Sends a game message to the client registered under the specified socket id
 *
 * The _to_ field of the game message is usually different from the _sid_ and
 * it is not used to locate the client.
 *
 * @param {GameMsg} gameMsg The game message
 * @param {string} sid The socket id of the receiver
 * @return {boolean} TRUE, on success
 */
SocketIo.prototype.send = function(gameMsg, sid) {
    var client,
        to = sid,
        rel = gameMsg.reliable,
        msg = gameMsg.stringify(),
        strippedSid;

    var sysLogger, msgLogger;
    sysLogger = this.gameServer.sysLogger, 
    msgLogger = this.gameServer.msgLogger;

    if (to === 'SERVER' || to === null) {
        sysLogger.log('SocketIo.send: Trying to send msg to ' +
                      'nobody: ' + to, 'error');
        return false;
    }

    // Cleanup msg, if necessary.
    if (msg._to) {
        if (!msg._originalTo) {
            sysLogger.log('SocketIo.send: _to field found, but no _originalTo ',
                          'error');
            return false;
        }
        msg.to = msg._orginalTo;
        delete msg._to;
        delete msg._originalTo;
    }

    // Send to ALL.
    if (to === 'ALL') {
        if (rel) {
            this.channel.json.send(msg);
        }
        else {
            this.channel.volatile.json.send(msg);
        }
        sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ' + to);
        msgLogger.log(gameMsg);
    }
    // Send to a specific client.
    else {
        // Remove socket name from sid (exactly 2 characters, see constructor):
        strippedSid = to.slice(2);

        client = this.channel.sockets[strippedSid];

        if (client) {
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
        else {
            sysLogger.log('SocketIo.send: Msg not sent. Unexisting recipient ' +
                          'sid: ' + strippedSid, 'error');
            return false;
        }
    }
    return true;
};



