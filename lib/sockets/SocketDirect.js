/**
 * # SocketDirect
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Manages the communication with clients as objects in memory.
 *
 * Message passing is handles with a shared object between the
 * client and this socket.
 *
 * @see SocketIO
 * ---
 */

// Global scope

module.exports = SocketDirect;

var gsc = require('nodegame-client');

var GameMsg = gsc.GameMsg,
    J = gsc.JSUS;

/**
 * ## SocketDirect constructor
 *
 * Creates an instance of SocketDirect
 *
 * @param {GameServer} server A GameServer instance
 */
function SocketDirect(game_server) {
    this.name = 'direct';
    this.game_server = game_server;
    this.clients = {};

    // Must be unique for every socket:
    this.sidPrefix = game_server.ADMIN_SERVER ? 'DA' : 'DP';
}

SocketDirect.prototype.generateID = function() {
    return J.uniqueKey(this.clients, this.sidPrefix);
};

//## METHODS

SocketDirect.prototype.connect = function(clientSocket) {
    var sid, res;

    // Generate the socket id for this connection
    sid = this.generateID();

    // Adds the socket temporarily (GameServer will start
    // sending a message before this methods exits)
    this.clients[sid] = clientSocket;

    // Ask GameServer to register the client with the
    // ChannelRegistry
    res = this.game_server.onConnect(sid, this);

    // If an error occurred in the GameServer or ChannelRegistry
    // we delete the socket.
    if (!res) {
        delete this.clients[sid];
    }
};

SocketDirect.prototype.message = function(msg) {
    this.game_server.onMessage(msg);
};

SocketDirect.prototype.disconnect = function(sid) {
    var socket = this.clients[sid];
    delete this.clients[sid];
    this.game_server.onDisconnect(sid, socket);
};


SocketDirect.prototype.attachListeners = function() {};


SocketDirect.prototype.send = function(msg, sid) {
    var to = sid,
        rel = msg.reliable,
        gameMsg, client;

    if (to === 'SERVER' || to === null) {
        this.game_server.sysLogger.log('Trying to send msg to nobody: ' + to, 'error');
        return false;
    }

    try {
        gameMsg = JSON.stringify(msg);
    }
    catch(e) {
        this.game_server.sysLogger.log('An error has occurred. Cannot send message: ' + msg);
        return false;
    }

    // Broadcast
    if (to === 'ALL') {

        for (client in this.clients) {
            if (this.clients.hasOwnProperty(client)) {
                // no self-send
                if (client !== msg.from) {
                    this.clients[client].message(gameMsg);
                }

            }
        }

        this.game_server.sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + to);
        this.game_server.msgLogger.log('B', msg);
    }
    // Send to a specific client
    else {
        client = this.clients[to];

        if (client) {

            client.message(gameMsg);

            this.game_server.sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + to);
            this.game_server.msgLogger.log('S', msg);
        }
        else {
            this.game_server.sysLogger.log('msg not sent. Unexisting recipient: ' + to, 'error');
            return false;
        }
    }
    return true;
};


