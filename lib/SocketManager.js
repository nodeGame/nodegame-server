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

var ngc = require('nodegame-client');
var PlayerList = ngc.PlayerList;
var J = ngc.JSUS;



/**
 * ## SocketManager constructor
 *
 * Creates an instance of SocketManager
 *
 * @param {GameServer} server A GameServer instance
 */
function SocketManager(server) {

    /**
     * ### SocketManager.server
     *
     * Cyclic ref to the GameServer object containing this instance
     *
     */
    this.server = server;

    /**
     * ### SocketManager.sockets
     *
     *  List of available sockets
     */
    this.sockets = {};

    /**
     * ### SocketManager.clients
     *
     * Maps a client ID to a socket obj (e.g. Direct or SIO) 
     *
     * @see SocketManager.sockets
     */
    this.clients = {};

    
    this.sysLogger = server.sysLogger;
    this.msgLogger = server.msgLogger;
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
    
    switch(gameMsg.to) {
        
    case 'ALL':
        return this.send2all(gameGmsg);

    case 'ROOM':
        // TODO: do we need it?
        return;
        
    default:
        return this.send2client(gameMsg);
        
    }

};

/**
 * ### SocketManager.send
 *
 * Low level primitive to send a game message
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {boolean} FALSE, if an error occurs
 */
SocketManager.prototype.send2all = function(gameMsg) {
    var smoothExec, res, i;
    smoothExec = true;

    for (i in this.sockets) {
        if (this.sockets.hasOwnProperty(i)) {
            res = this.sockets[i].send(gameMsg, 'ALL');
            if (!res) {
                this.sysLogger.log('SocketManager.send2all: An error occurred in socket: ' + i, 'ERR');
                smoothExec = false;
            }
        }
    }
    return smoothExec;

};

/**
 * ### SocketManager.send2client
 *
 * Low level primitive to send a game message
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {boolean} FALSE, if an error occurs
 */
SocketManager.prototype.send2client = function(gameMsg) {
    var resolvedInfo, socket, receiverSid;
    var res, errMsg;

    resolvedInfo = this.resolveClientAndSocket(gameMsg);
    
    if (!resolvedInfo.success) {
        this.sysLogger.log('Msg not sent. ' + resolvedInfo.errMsg);
        return false;
    }
    
    socket = resolvedInfo.socket;
    receiverSid = resolvedInfo.sid;
    res = socket.send(gameMsg, receiverSid);

    if (!res) {
        errMsg = 'An error occurred while sending a message to ' +
            gameMsg.to + ' (cid: ' + resolvedInfo.cid + ', sid: ' + receiverSid + ')';
        this.sysLogger.log(errMsg, 'ERR');
    }
    return res;
};


// TODO check here what kind of data is input

function send2clients(gameMsg, cids) {
    var originalTo, res;
    res = true;
    originalTo = gameMsg.to;
    for (i = 0; i < cids.length; i++) {
        gameMsg.to = cids[i];
        res = res && this.send2client(gameMsg);
    }
    // The original _from_ field of the gameMsg must be re-set
    // to avoid that a wrong reuse of the msg in the callee
    gameMsg.to = originalTo;
    return res;
}

/**
 * ### SocketManager.send2room
 *
 * Sends a game message to all clients in the same room
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room. The id or alias of the sender
 * @return {boolean} FALSE is an error occurs
 *
 * TODO: better to have it with the room name?
 */
SocketManager.prototype.send2room = function(gameMsg, room) {
    var res;
    res = send2clients(gameMsg, room.clients.id.getAllKeys());
    if (!res) this.sysLogger.log('SocketManager.send2room: an error occurred for room ' + room.name);
    return res;
};

/**
 * ### SocketManager.send2roomAdmins
 *
 * Sends a game message to all admins in the same room
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room. The id or alias of the sender
 * @return {boolean} FALSE is an error occurs
 *
 * TODO: better to have it with the room name?
 */
SocketManager.prototype.send2roomAdmins = function(gameMsg, room) {
    var res;
    res = send2clients(gameMsg, room.admins.id.getAllKeys());
    if (!res) this.sysLogger.log('SocketManager.send2roomAdmins: an error has occurred for room ' + room.name);
    return res;
};

/**
 * ### SocketManager.send2roomAdmins
 *
 * Sends a game message to all admins in the same room
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room. The id or alias of the sender
 * @return {boolean} FALSE is an error occurs
 *
 * TODO: better to have it with the room name?
 */
SocketManager.prototype.send2roomPlayers = function(gameMsg, room) {
    var res;
    res = send2clients(gameMsg, room.players.id.getAllKeys());
    if (!res) this.sysLogger.log('SocketManager.send2roomPlayers: an error has occurred for room ' + room.name);
    return res;
};

/**
 * ### SocketManager.send2group
 *
 * Sends a game message to a group of clients
 *
 * The methods works regardless of the socket or room the clients
 * belong to.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {array|PlayerList} The recipients of the message
 * @return {boolean} TRUE on success
 */
SocketManager.prototype.send2group = function(gameMsg, group) {
    var res, i;
    res = true;
    
    if (!J.isArray(group)) {
        group = group.db;
    }
    for (i = 0; i < group.length; i++) {
        res = res && this.send2client(gameMsg, group[i].id);
    }
    
    if (!res) this.sysLogger.log('SocketManager.send2group: an error has occurred.');
    return res;
};

/**
 * ### SocketManager.resolveClientAndSocket
 *
 * Retrieves the socket, and sid of the receiver of a GameMsg
 *
 * Returns an object with the following properties:
 *
 *  - socket: the Socket object
 *  - sid: the id of the recipient within the socket
 *  - cid: the client id of the recipient within the channel
 *  - success: boolean flag, TRUE if resolving is successful
 *  - errMsg: set if an error occurs
 *
 * @param {GameMsg} gameMsg The game message to analyze
 * @return {object} An object containing the result of the 
 *   resolving process
 */
SocketManager.prototype.resolveClientAndSocket = function(gameMsg) {
    var to, socket;
    var resolvedTo, registry;
    var receiverObj, receiverSid;

    registry = this.server.channel.registry;
    to = gameMsg.to;

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
    
    socket = this.clients[to];

    if (!socket) {
        return {
            success: false,
            errMsg: 'Unexisting recipient: ' + to + ' (resolved as: ' + resolvedTo + ')'
        };
    }

    receiverObj = registry.getClients()[resolvedTo];

    if (!receiverObj) {
         return {
            success: false,
            errMsg: 'Could not resolve the client id to a socket id'
         };
    }

    receiverSid = receiverObj.sid;

    if (!receiverSid) {
        return {
            success: false,
            errMsg: 'Player object has no socket id.'
        };
    }

    return {
        success: true,
        sid: receiverSid,
        cid: resolvedTo,
        socket: socket
    };
};


/**
 * ### SocketManager.broadcast
 *
 * Sends a game message to all clients in the same room except the sender
 *
 * The sender is taken from the 'from' field of the game message, 
 * or it can be specified as a second parameter. 
 *
 * TODO: This method at the moment sends message within ROOM only
 * TODO: create a new method that works across ROOMS 
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
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
    // If it is not an alias, it still needs to be found
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
            toClients = fromRoom.clients.id.getAllKeyElements();
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
 * ### SocketManager.broadcast2group
 *
 * Broadcasts a game message to a group of clients
 *
 * The methods works regardless of the socket or room the clients
 * belong to.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {array|PlayerList} The recipients of the message
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} TRUE on success
 */
SocketManager.prototype.broadcast2group = function(gameMsg, group, from) {
    var res, i, from;
    res = true;
    from = from || gameMsg.from;

    if (!J.isArray(group)) {
        group = group.db;
    }
    for (i = 0; i < group.length; i++) {
        // Do not send the msg to sender as well.
        if (group[i].id === from) continue;
        res = res && this.send2client(gameMsg, group[i].id);
    }
    
    if (!res) this.sysLogger.log('SocketManager.broadcast2group: an error has occurred.');
    return res;
};

/**
 * ### GameMsgManager.forward
 *
 * Low level primitive to forward messages
 *
 * Forward uses the send method of the partner server to
 * dispatch the message.
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

    if (gameMsg.to === 'SERVER' || !gameMsg.to) {
        gameMsg.to = 'ALL';
    }

    this.server.partner.socket.send(gameMsg);

    this.msgLogger.log('F', gameMsg);
    this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' forwarded to ' + this.server.partner.name);
};


