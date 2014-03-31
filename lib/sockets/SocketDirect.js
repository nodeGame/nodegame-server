/**
 * # SocketDirect
 * Copyright(c) 2014 Stefano Balietti
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
function SocketDirect(gameServer) {
    this.name = 'direct';
    this.gameServer = gameServer;
    this.clients = {};

    // Must be unique for every socket:
    this.sidPrefix = gameServer.ADMIN_SERVER ? 'DA' : 'DP';
}

SocketDirect.prototype.generateID = function() {
    return J.uniqueKey(this.clients, this.sidPrefix);
};

//## METHODS

SocketDirect.prototype.connect = function(clientSocket, options) {
    var sid, res, headers;
    options = options || {};

    // Generate the socket id for this connection.
    sid = this.generateID();

    // Adds the socket temporarily (GameServer will start
    // sending a message before this methods exits).
    this.clients[sid] = clientSocket;

    // Ask GameServer to register the client with the ChannelRegistry.
    res = this.gameServer.onConnect(sid, this, options.headers, 
                                     options.startingRoom);

    // If an error occurred in the GameServer or ChannelRegistry
    // we delete the socket.
    if (!res) {
        delete this.clients[sid];
    }
    return res;
};

SocketDirect.prototype.message = function(msg) {
    this.gameServer.onMessage(msg);
};

SocketDirect.prototype.disconnect = function(sid) {
    var socket = this.clients[sid];
    delete this.clients[sid];
    this.gameServer.onDisconnect(sid, socket);
};


SocketDirect.prototype.attachListeners = function() {};

SocketDirect.prototype.send = function(msg, sid) {
    // var rel;
    var client;
    var sysLogger, msgLogger;

    sysLogger = this.gameServer.sysLogger, 
    msgLogger = this.gameServer.msgLogger;

    if (sid === 'SERVER' || sid === null) {
        sysLogger.log('SocketDirect.send: Trying to send a msg to nobody.',
                      'error');
        return false;
    }

    // Cleanup msg, if necessary.
    if (msg._to) {
        if (!msg._originalTo) {
            sysLogger.log('SocketDirect.send: _to field found, but no ' +
                          '_originalTo.', 'error');
            return false;
        }
        msg.to = msg._orginalTo;
        delete msg._to;
        delete msg._originalTo;
    }

    // Not used at the moment (keep for future implementation).
    // rel = msg.reliable;

    // Broadcast.
    if (sid === 'ALL') {

        for (client in this.clients) {
            if (this.clients.hasOwnProperty(client)) {
                // no self-send
                if (client !== msg.from) {
                    this.clients[client].message(msg);
                }

            }
        }

        sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + sid);
        msgLogger.log(msg);
    }
    // Send to a specific client.
    else {
        client = this.clients[sid];

        if (client) {

            client.message(msg);

            sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + sid);
            msgLogger.log(msg);
        }
        else {
            sysLogger.log('SocketDirect.send: msg not sent. Unexisting ' +
                          'recipient: ' + sid, 'error');
            return false;
        }
    }
    return true;
};


