/**
 * # SocketDirect
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Manages the communication with clients as objects in memory
 *
 * Message passing is handles with a shared object between the
 * client and this socket.
 *
 * @see SocketIO
 * @see GameServer
 * @see nodegame-client/lib/sockets/SocketDirect.js
 */

"use strict";

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


// ## SocketDirect methods

/**
 * ### SocketDirect.generateID
 *
 * Generates a unique identifier for newly connecting clients
 *
 * All Identiers starts with the same prefix.
 *
 * @return {string} A unique identifier
 *
 * @see SocketDirect.sidPrefix
 * @see SocketDirect.clients
 */
SocketDirect.prototype.generateID = function() {
    return J.uniqueKey(this.clients, this.sidPrefix);
};

/**
 * ### SocketDirect.connect
 *
 * Registers a newly connected client
 *
 * @param {SocketDirect} clientSocket The Socket of the connecting client
 * @param {object} options Configuration options
 *
 * @return {boolean} TRUE if the server accepts the connection
 *
 * @see GameServer.onConnect
 */
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
                                    options.clientType, options.startingRoom);

    // If an error occurred in the GameServer or ChannelRegistry
    // we delete the socket.
    if (!res) {
        delete this.clients[sid];
    }
    return res;
};

/**
 * ### SocketDirect.message
 *
 * Delivers an incoming message to the server
 *
 * @param {string} msg A stringified game message
 */
SocketDirect.prototype.message = function(msg) {
    var that;

    that = this;
    // Async message handling to avoid recursion problems
    // (e.g. Game.publishUpdate calling itself).
    setTimeout(function() {
        that.gameServer.onMessage(msg);
    }, 0);
};

/**
 * ### SocketDirect.disconnect
 *
 * Disconnects the client registered under the specified socket id
 *
 * @param {string} sid The socket id of the client to disconnect
 */
SocketDirect.prototype.disconnect = function(sid) {
    var socket = this.clients[sid];
    delete this.clients[sid];
    this.gameServer.onDisconnect(sid, socket);
};

/**
 * ### SocketDirect.attachListeners
 *
 * Activates the socket to accepts incoming connections
 */
SocketDirect.prototype.attachListeners = function() {};

/**
 * ### SocketDirect.send
 *
 * Sends a game message to the client registered under the specified socket id
 *
 * The _to_ field of the game message is usually different from the _sid_ and
 * it is not used to locate the client.
 *
 * @param {GameMsg} msg The game message
 * @param {string} sid The socket id of the receiver
 * @param {boolean} broadcast If TRUE, the message will not be sent to
 *   the client with sid = sid. Default: FALSE
 * @return {boolean} TRUE, on success
 */
SocketDirect.prototype.send = function(msg, sid, broadcast) {
    // var rel;
    var client;
    var sysLogger, msgLogger;


    if (sid === 'SERVER' || sid === null) {
        sysLogger.log('SocketDirect.send: Trying to send a msg to nobody.',
                      'error');
        return false;
    }

    broadcast = broadcast || false;

    sysLogger = this.gameServer.sysLogger;
    msgLogger = this.gameServer.msgLogger;

    if (sid === 'ALL' && broadcast) {
        sysLogger.log('SocketDirect.send: Incompatible options: ' +
                      'broadcast = true and sid = ALL', 'error');
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

    if (msg._sid) delete msg._sid;
    if (msg._channelName) delete msg._channelName;
    if (msg._roomName) delete msg._roomName;

    // Not used at the moment (keep for future implementation).
    // rel = msg.reliable;

    // Send to ALL.
    if (sid === 'ALL') {

        for (client in this.clients) {
            if (this.clients.hasOwnProperty(client)) {
                this.clients[client].message(msg);
            }
        }

        sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + sid);
        msgLogger.log(msg);
    }

    // Either send to a specific client(1), or to ALL but a specific client(2).
    else {

        // (1)
        if (!broadcast) {
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
        // (2)
        else {

            for (client in this.clients) {
                if (this.clients.hasOwnProperty(client)) {
                    // No self-send
                    if (client !== sid) {
                        this.clients[client].message(msg);
                        sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + sid);
                        msgLogger.log(msg);
                    }
                }
            }
        }
    }
    return true;
};


