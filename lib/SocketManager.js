/**
 * # SocketManager
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * Game socket manager: registers of all open sockets and
 * connected clients
 *
 * ---
 *
 */

// Global scope

module.exports = SocketManager;


/**
 * ## SocketManager constructor
 *
 * Creates an instance of SocketManager
 *
 * @param {GameServer} server A GameServer instance
 */
function SocketManager(server) {
    this.server = server;

    this.sysLogger = server.sysLogger;
    this.msgLogger = server.msgLogger;

    this.sockets = {};
    this.clients = {};
}

// ## METHODS

/**
 * SocketManager.registerSocket
 *
 * Registers a new type of socket
 *
 * @param {string} name The name of the socket
 * @param {object} socket The connection socket
 *
 */
SocketManager.prototype.registerSocket = function(name, socket) {
    this.sockets[name] = socket;
};

/**
 * SocketManager.registerClient
 *
 * Matches a client to a socket
 *
 * @param client {string} The id of the client
 * @param socket {object} The socket through which the client is connected
 *
 */
SocketManager.prototype.registerClient = function(client, socket) {
    this.clients[client] = socket;
};


/**
 * ### SocketManager.send
 *
 * Low level primitive to send a game message
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {boolean} FALSE, if an error occurs
 */
SocketManager.prototype.send = function(gameMsg) {
    var to = gameMsg.to;
    var smoothExec = true;
    var socket, res, oneFail;
    var registry = this.server.channel.registry;
    var resolvedTo, receiverObj, receiverSid;

    // Broadcasting a msg (TODO: remove)
    if (to === 'ALL') {
        for (var i in this.sockets) {
            if (this.sockets.hasOwnProperty(i)) {
                res = this.sockets[i].send(gameMsg);
                if (!res) {
                    this.sysLogger.log('An error occurred while sending a message to ALL. client:' + i, 'ERR');
                    oneFail = false;
                }
            }
        }
        return smoothExec;
    }

    // Sending a msg to a specific client
    else {
        
        // TODO: move somewhere in the wiki 
        // Game aliases are global associations with a client id that are valid throughout
        // the whole game, while room-aliases are valid only within a specific room. 
        // When a client leaves that room the room alias is deleted.

        // Matches the 'to' (GameMsg.to) field with a client ID.
        // The 'to' field can be already a client ID, or a game-alias or a room-alias.
        // In case of a room-alias, uses 'from' (GameMsg.from) field to locate the room.
        // Can return null if the lookup fails.
        resolvedTo = registry.lookupClient(to,
                                           registry.getClientRoom(gameMsg.from));

        socket = this.clients[resolvedTo];

        if (!socket) {
            this.sysLogger.log('Msg not sent. Unexisting recipient: ' +
                    to + ' (resolved as: ' + resolvedTo + ')', 'ERR');
            return false;
        }

        
        receiverObj = registry.getClients()[resolvedTo];

        if (!receiverObj) {
            this.sysLogger.log('Msg not sent. Could not resolve the client id to a socket id', 'ERR');
            return false;
        }


        receiverSid = receiverObj.sid;

        if (!receiverSid) {
            this.sysLogger.log('Msg not sent. Player object has no socket id.', 'ERR');
            return false;
        }


        res = socket.send(gameMsg, receiverSid);
        if (!res) {
            this.sysLogger.log('An error occurred while sending a message to ' +
                    to + ' (resolved as: ' + resolvedTo + ')', 'ERR');
        }
        return res;
    }

};



/**
 * ### SocketManager.broadcast
 *
 * Broadcasts a game message to all connected clients in the sender's room,
 * sender excluded
 *
 * TODO: This method at the moment sends message within ROOM only
 * TODO: create a new method that works across ROOMS 
 *
 * @param {GameMsg} gameMsg The game message to send
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.broadcast = function(gameMsg, from) {
    var client, originalTo, smoothExec;
    var registry = this.server.channel.registry;
    var resolvedFrom;
    var fromRoomName, fromRoom, toClients;

    smoothExec = true;
    originalTo = gameMsg.to;
    from = from || gameMsg.from;

    // Checks if from is an alias, and returns the id.
    // If it is not an alias, it still needs to be registered
    // in the registry, otherwise it returns NULL.
    resolvedFrom = registry.lookupClient(from);
    fromRoomName = registry.getClientRoom(resolvedFrom);
    if (!fromRoomName) {
        throw new Error('SocketManager.broadcast: Sender (ID: ' + resolvedFrom + ') is not in any room');
    }
    else {
        fromRoom = this.server.channel.gameRooms[fromRoomName];
        if(!fromRoom) {
            throw new Error('SocketManager.broadcast: Sender (ID: ' + resolvedFrom + ') is not in any room');
        }
        else {
            toClients = fromRoom.playerList.id.getAllKeyElements();
        }
    }

    for (client in toClients) {
        if (toClients.hasOwnProperty(client)) {
            if (client != resolvedFrom) {  // TODO: change back to '!==' once 'from' is string again
                gameMsg.to = client;
                smoothExec = smoothExec && this.send(gameMsg);
            }
        }
    }

    // The original _from_ field of the gameMsg must be re-set
    // to avoid that a wrong reuse of the msg in the callee
    gameMsg.to = originalTo;

    return smoothExec;
};


/**
 * ### GameMsgManager.forward
 *
 * Low level primitive to forward messages
 *
 * @param {GameMsg} gameMsg The game message to forward
 */
SocketManager.prototype.forward = function(gameMsg) {

    // <!--
    // Create a copy of the msg and prepare the attributes
    // var gameMsg = new GameMsg(gameMsg);
    // gameMsg.from = this.server.name;
    // --!>

    gameMsg.forward = 1;

    if (gameMsg.to === 'SERVER' || gameMsg === null || gameMsg.to === undefined) {
        gameMsg.to = 'ALL';
    }

    this.server.partner.socket.send(gameMsg);

    this.msgLogger.log('F', gameMsg);
    this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' forwarded to ' + this.server.partner.name);
};


