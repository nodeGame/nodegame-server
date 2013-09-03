/**
 * # SocketIo
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * Handles network connections
 *
 * ---
 *
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
            var res;
            var prefixedSid = that.sidPrefix + socket.id;

            res = that.game_server.onConnect(prefixedSid, that);

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

    if (to === 'SERVER' || to === null) {
        this.game_server.sysLogger.log('Trying to send msg to nobody: ' + to, 'error');
        return false;
    }

    // Broadcast
    if (to === 'ALL') {
        if (rel) {
            this.channel.json.send(msg);
        }
        else {
            this.channel.volatile.json.send(msg);
        }
        this.game_server.sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ' + to);
        this.game_server.msgLogger.log('B', gameMsg);
    }
    // Send to a specific client
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
            this.game_server.sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to sid' + strippedSid);
            this.game_server.msgLogger.log('S', gameMsg);
        }
        else {
            this.game_server.sysLogger.log('Msg not sent. Unexisting recipient sid: ' + strippedSid, 'error');
            return false;
        }
    }
    return true;
};



