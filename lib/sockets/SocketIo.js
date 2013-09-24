/**
 * # SocketIo
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Handles network connections
 *
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
 */
function SocketIo(game_server) {
    this.name = 'sio';
    this.game_server = game_server;
    this.sio = game_server.sio;
    this.channel = null;

    // Must have exactly 2 characters and be unique for every socket:
    this.sidPrefix = game_server.ADMIN_SERVER ? 'SA' : 'SP';
}


//## METHODS

SocketIo.prototype.attachListeners = function() {
    var that = this;

    this.channel = this.sio.of(this.game_server.endpoint).on('connection',
        function(socket) {            
            var res, headers, prefixedSid;
            prefixedSid = that.sidPrefix + socket.id;
            headers = socket.handshake.headers;
            
            res = that.game_server.onConnect(prefixedSid, that, headers);

            if (res) {
                socket.on('message', function(msg) {
                    that.game_server.onMessage(msg);
                });
                socket.on('disconnect', function() {
                    that.game_server.onDisconnect(prefixedSid, socket);
                });
            }
        });

    this.sio.sockets.on("shutdown", that.game_server.onShutdown);
};


SocketIo.prototype.disconnect = function(sid) {
    var socket = this.sio.sockets.sockets[sid];

    if (!socket) {
        throw new Error('SocketIo.disconnect: socket not found for sid "' +
                sid + '".');
    }

    socket.disconnect();
    this.game_server.onDisconnect(sid, socket);
};


SocketIo.prototype.send = function(gameMsg, sid) {
    var to = sid, client,
        rel = gameMsg.reliable,
        msg = gameMsg.stringify(),
        strippedSid;

    var sysLogger, msgLogger;
    sysLogger = this.game_server.sysLogger, 
    msgLogger = this.game_server.msgLogger;

    if (to === 'SERVER' || to === null) {
        sysLogger.log('SocketIo.send: Trying to send msg to ' +
                      'nobody: ' + to, 'error');
        return false;
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



