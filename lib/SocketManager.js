
/**
 * # SocketManager
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * SocketManager: a register of all open sockets.
 *
 * Exposes method to send and broadcast messages to a specific recipient, or
 * groups of recipients.
 *
 * Send: delivers a message to all recipients.
 * Broadcast: delivers a message to all recipients, except the sender.
 *
 * At the moment thre is some code duplication across methods, however it could
 * make them slightly faster avoiding nested external methods calls.
 * ---
 */

// Global scope

module.exports = SocketManager;

var ngc = require('nodegame-client');
var PlayerList = ngc.PlayerList;
var NDDB = ngc.NDDB;
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
 */
SocketManager.prototype.registerSocket = function(socket) {
    this.sockets[socket.name] = socket;
};

/**
 * SocketManager.registerClient
 *
 * Matches a client to a socket
 *
 * @param client {string} The id of the client
 * @param socket {object} The socket through which the client is connected
 */
SocketManager.prototype.registerClient = function(client, socket) {
    // TODO: Add unregisterClient
    this.clients[client] = socket;
};


/**
 * ### SocketManager.send
 *
 * General call to send a game message
 *
 * The method will examin the _to_ field and rely on specific functions.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @return {boolean} FALSE, if an error occurs
 *
 * @see SocketManager.send2all
 * @see SocketManager.send2channel
 * @see SocketManager.send2room
 * @see SocketManager.send2client
 */
SocketManager.prototype.send = function(gameMsg) {
    var toObj;

    switch(gameMsg.to) {

    case 'ALL':
        return this.send2all(gameMsg);

    case 'CHANNEL':
        return this.send2ownChannel(gameMsg);

    case 'ROOM':
        return this.send2ownRoom(gameMsg);

    case 'CHANNEL_X':
        this.send2channel(gameMsg, gameMsg._to);

    case 'ROOM_X':
        return this.send2room(gameMsg, gameMsg._to);

    default:
        return this.send2client(gameMsg);
    }

};

/**
 * ### SocketManager.send2all
 *
 * Broadcast a message to all clients in all game rooms in all channels.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @return {boolean} FALSE, if at least one error occurs
 */
SocketManager.prototype.send2all = function(gameMsg) {
    var channels, channelName, res;

    res = true;
    channels = this.server.channel.servernode.channels;

    for (channelName in channels) {
        if (channels.hasOwnProperty(channelName)) {
            res = res && this.send2channel(gameMsg, channels[channelName]);
        }
    }

    if (!res) {
        this.sysLogger.log('SocketManager.send2all: error/s occurred.',
                           'error');
    }
    return res;
};

/**
 * ### SocketManager.send2allPlayers
 *
 * Broadcast a message to all clients in all game rooms in all channels.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @return {boolean} FALSE, if at least one error occurs
 */
SocketManager.prototype.send2allPlayers = function(gameMsg) {
    var channels, channelName, res;

    res = true;
    channels = this.server.channel.servernode.channels;

     for (channelName in channels) {
        if (channels.hasOwnProperty(channelName)) {
            res = res && this.send2channelPlayers(gameMsg,
                                                  channels[channelName]);
        }
     }

    if (!res) {
        this.sysLogger.log('SocketManager.send2allPlayers: error/s occurred.',
                           'error');
    }
    return res;
};

/**
 * ### SocketManager.send2ownChannel
 *
 * Sends a game message to all clients in the channel of the sender
 *
 * The sender is taken from the 'from' field of the game message, or it
 * can be specified as a second parameter.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.send2ownChannelOld = function(gameMsg, from) {
    var registry, fromRoomName, channel;
    registry = this.server.channel.registry;
    from = from || gameMsg.from

    // Checks if from is an alias, and returns the id.
    // If it is not an alias, it still needs to be found
    // in the registry, otherwise it returns NULL.
    resolvedFrom = registry.lookupClient(from);
    fromRoomName = registry.getClientRoom(resolvedFrom);
    if (!fromRoomName) {
        throw new Error('SocketManager.send2ownChannel: Sender (ID: ' +
                        resolvedFrom + ') is not in any room.');
    }

    fromRoom = this.server.channel.gameRooms[fromRoomName];
    if (!fromRoom) {
        throw new Error('SocketManager.send2ownChannel: Sender (ID: ' +
                        resolvedFrom + ') is not in any room.');
    }

    return this.send2channel(gameMsg, fromRoom.channel);
};
SocketManager.prototype.send2ownChannel = function(gameMsg, from) {
    var channel;
    if ('undefined' !== typeof from) gameMsg.from = from;

    // Case 1. Channel was correctly detected before (msg received from server).
    if ('undefined' !== typeof gameMsg._channelName &&
        gameMsg._channelName === this.server.channel.name) {
        channel = this.server.channel;
    }
    // Case 2. Channel was not found before (msg created inside the server).
    else {
        fromRoom = this.lookupRoom(gameMsg.from);
        if (!fromRoom) {
            throw new Error('SocketManager.send2ownChannel: Sender (ID: ' +
                            resolvedFrom + ') is not in any room.');
        }
        channel = fromRoom.channel;
    }

    return this.send2channel(gameMsg, channel)
};

/**
 * ### SocketManager.send2channel
 *
 * Sends a game message to all clients in all game rooms of a given channel
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {ServerChannel} channel The channel object
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.send2channel = function(gameMsg, channel, from) {
    var res;
    if ('undefined' !== typeof from) gameMsg.from = from;

    res = send2AllClientsInGameServer(gameMsg, channel.admin);
    res = res && send2AllClientsInGameServer(gameMsg, channel.player);
    return res;
};

/**
 * ### SocketManager.send2channelPlayers
 *
 * Sends a game message to all clients in all game rooms of a given channel
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {ServerChannel} channel The channel object
 * @return {boolean} FALSE is an error occurs
 *
 * @see SocketManager.send2roomPlayers
 */
SocketManager.prototype.send2channelPlayersOld = function(gameMsg, channel) {
    var res, room;
    res = true;
    // Waiting room is included here.
    for (room in channel.gameRooms) {
        if (channel.gameRooms.hasOwnProperty(room)) {
            res = res && this.send2roomPlayers(gameMsg, channel.gameRooms[room]);
        }
    }

    if (!res) {
        this.sysLogger.log('SocketManager.send2channelPlayers: error/s ' +
                           'occurred for channel: ' + channel.name + '.',
                           'error');
    }
    return res;
};
SocketManager.prototype.send2channelPlayers = function(gameMsg, channel, from) {
    if ('undefined' !== typeof from) gameMsg.from = from;
    return send2AllClientsInGameServer(gameMsg, channel.player);
};

/**
 * ### SocketManager.send2ownRoom
 *
 * Sends a game message to all clients in the room of the sender
 *
 * The sender is taken from the 'from' field of the game message, or it
 * can be specified as a second parameter.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.send2ownRoom = function(gameMsg, from) {
    var registry, fromRoomName, fromRoom;
    var ownChannel;
    var channels, channelName, channel;

    if ('undefined' !== typeof from) gameMsg.from = from;

    // Case 1. Room was correctly detected before (msg received from server).
    if ('undefined' !== typeof gameMsg._roomName) {
        fromRoom = this.server.channel.gameRooms[gameMsg._roomName];
    }

    // Case 2. Room was not found before (msg created inside the server).
    if (!fromRoom) {
        fromRoom = this.lookupRoom(gameMsg.from);
    }

    // Room not found.
    if (!fromRoom) {
        this.sysLogger.log('SocketManager.send2ownRoom: Sender (ID: ' +
                           gameMsg.from + ') is not in any room.');
        return false;
    }

    return this.send2room(gameMsg, fromRoom);
};

/**
 * ### SocketManager.send2room
 *
 * Sends a game message to all clients in the same room
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room The room object
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.send2room = function(gameMsg, room) {
    var res;
    ids = room.clients.id.getAllKeys();
    res = this.send2group(gameMsg, ids);
    if (!res) {
        this.sysLogger.log('SocketManager.send2room: an error occurred ' +
                           'for room ' + room.name + '.', 'error');
    }
    return res;
};

/**
 * ### SocketManager.send2roomAdmins
 *
 * Sends a game message to all admins in the same room
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room The room object
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.send2roomAdmins = function(gameMsg, room) {
    var res, ids;
    ids = room.clients.admin.fetchValues('id').id;
    res = this.send2group(gameMsg, ids);
    if (!res) {
        this.sysLogger.log('SocketManager.send2roomAdmins: an error has ' +
                           'occurred for room ' + room.name, 'error');
    }
    return res;
};

/**
 * ### SocketManager.send2roomPlayers
 *
 * Sends a game message to all players in the same room
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room The room object
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.send2roomPlayers = function(gameMsg, room) {
    var res, ids;
    ids = room.clients.player.fetchValues('id').id;
    res = this.send2group(gameMsg, ids);
    if (!res) {
        this.sysLogger.log('SocketManager.send2roomPlayers: an error has ' +
                           'occurred for room ' + room.name, 'error');
    }
    return res;
};

/**
 * ### SocketManager.send2group
 *
 * Sends a game message to a group of clients
 *
 * The methods works regardless of the socket or room the clients belong to.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {array|PlayerList|NDDB} The recipients of the message
 * @return {boolean} TRUE on success
 */
SocketManager.prototype.send2group = function(gameMsg, group) {
    var res, i, len;
    res = true;

    if (group instanceof PlayerList || group instanceof NDDB) {
        group = group.fetchValues('id').id;
    }
    else if (!J.isArray(group)) {
        debugger
        throw new TypeError('SocketManager.send2group: group must be array ' +
                            'or instance of PlayerList/NDDB.', 'error');
    }

    i = -1, len = group.length;
    for ( ; ++i < len ; ) {
        res = res && this.send2client(gameMsg, group[i]);
    }

    if (!res) {
        this.sysLogger.log('SocketManager.send2group: an error has ' +
                           'occurred.', 'error');
    }
    return res;
};

/**
 * ### SocketManager.send2client
 *
 * Low level primitive to send a game message
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} to Optional. The recipient of the message.
 *
 * @return {boolean} FALSE, if an error occurs
 */
SocketManager.prototype.send2client = function(gameMsg, to) {
    var originalTo;
    var resolvedInfo, socket, receiverSid;
    var res, errMsg;

    var channels, channelName, ownChannelName, socketManager;

    originalTo = gameMsg.to;
    gameMsg.to = to || originalTo;

    // Looks into the local registry first, and then into the registry of
    // other channels, if the server is allowed to do so.
    resolvedInfo = this.resolveClientAndSocket(gameMsg);

    if (!resolvedInfo.success) {
        gameMsg.to = originalTo;
        this.sysLogger.log('SocketManager.send2client: Msg not sent. ' +
                           resolvedInfo.errMsg, 'error');
        debugger
        return false;
    }

    socket = resolvedInfo.socket;
    receiverSid = resolvedInfo.sid;
    res = socket.send(gameMsg, receiverSid);

    if (!res) {
        errMsg = 'SocketManager.send2client: An error occurred while sending ' +
            'a message to ' + gameMsg.to + ' (cid: ' + resolvedInfo.cid +
            ', sid: ' + receiverSid + ')';
        this.sysLogger.log(errMsg, 'error');
    }
    gameMsg.to = originalTo;
    return res;
};

// Broadcast methods.

/**
 * ### SocketManager.broadcast
 *
 * Sends a game message to all clients in the same room except the sender
 *
 * The sender is taken from the 'from' field of the game message,
 * or it can be specified as a second parameter.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.broadcast = function(gameMsg, from) {
    var toObj;

    switch(gameMsg.to) {

    case 'ALL':
        return this.broadcast2all(gameMsg, from);

    case 'CHANNEL':
        return this.broadcast2ownChannel(gameMsg, from);

    case 'ROOM':
        return this.broadcast2ownRoom(gameMsg, from);

    case 'CHANNEL_X':
        this.broadcast2channel(gameMsg, gameMsg._to, from);

    case 'ROOM_X':
        return this.broadcast2room(gameMsg, gameMsg._to, from);

    default:
        throw new Error('SocketManager.broadcast: unrecognized to: ' +
                        gameMsg.to);
    }
};

/**
 * ### SocketManager.broadcast2all
 *
 * Broadcast a message to all clients in all game rooms in all channels.
 *
 * @param {GameMsg} gameMsg The game message to broadcast
 * @return {boolean} FALSE, if at least one error occurs
 */
SocketManager.prototype.broadcast2allOld = function(gameMsg, from) {
    var channels, channelName, res;

    res = true;
    channels = this.server.channel.servernode.channels;

    for (channelName in channels) {
        if (channels.hasOwnProperty(channelName)) {
            res = res && this.broadcast2channel(gameMsg, channels[channelName],
                                               from);
        }
     }

    if (!res) {
        this.sysLogger.log('SocketManager.broadcast2all: error/s occurred.',
                           'error');
    }
    return res;
};

SocketManager.prototype.broadcast2all = function(gameMsg, from) {
    var channels, channelName, channel, res;
    if ('undefined' !== typeof from) gameMsg.from = from;

    res = true;
    channels = this.server.channel.servernode.channels;

    // Case 1. SID was correctly detected before (msg received from server).
    if (gameMsg._sid) {
        // Broadcast to own channel first.
        // This method will remove the ._sid property as well.
        this.broadcast2ownChannel(gameMsg);

        // Sends to all other channels then.
        for (channelName in channels) {
            if (channelName !== gameMsg._channelName &&
                channels.hasOwnProperty(channelName)) {

                channel = channels[channelName];

                res = res && this.send2channel(gameMsg, channel);
            }
        }
    }

    // Case 2. SID was not found before (msg created inside the server).
    else {
        // Sends to all other channels then.
        for (channelName in channels) {
            if (channels.hasOwnProperty(channelName)) {
                channel = channels[channelName];
                res = res && this.broadcast2channel(gameMsg, channel);
            }
        }
    }

    if (!res) {
        this.sysLogger.log('SocketManager.broadcast2all: error/s occurred.',
                           'error');
    }
    return res;
};

/**
 * ### SocketManager.broadcast2ownChannel
 *
 * Broadcast a game message in the channel of the sender
 *
 * The sender is taken from the 'from' field of the game message, or it
 * can be specified as a second parameter.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.broadcast2ownChannelOld = function(gameMsg, from) {
    var registry, fromRoomName, channel;
    registry = this.server.channel.registry;
    from = from || gameMsg.from

    // Checks if from is an alias, and returns the id.
    // If it is not an alias, it still needs to be found
    // in the registry, otherwise it returns NULL.
    resolvedFrom = registry.lookupClient(from);
    fromRoomName = registry.getClientRoom(resolvedFrom);
    fromRoom = this.server.channel.gameRooms[fromRoomName];

    if (!fromRoom) {
        throw new Error('SocketManager.send2ownChannel: Sender (ID: ' +
                        resolvedFrom + ') is not in any room.');
    }

    return this.broadcast2channel(gameMsg, fromRoom.channel);
};
SocketManager.prototype.broadcast2ownChannel = function(gameMsg, from) {
    var channel;
    if ('undefined' !== typeof from) gameMsg.from = from;

    // Case 1. Channel was correctly detected before (msg received from server).
    if ('undefined' !== typeof gameMsg._channelName &&
        gameMsg._channelName === this.server.channel.name) {
        channel = this.server.channel;
    }
    // Case 2. Channel was not found before (msg created inside the server).
    else {
        fromRoom = this.lookupRoom(gameMsg.from);
        if (!fromRoom) {
            this.sysLogger.log('SocketManager.send2ownChannel: Sender (ID: ' +
                               resolvedFrom + ') is not in any room.');
            return false;
        }
        channel = fromRoom.channel;
    }

    return this.broadcast2channel(gameMsg, channel)
};

/**
 * ### SocketManager.broadcast2channel
 *
 * Sends a game message to all clients in all game rooms of a given channel
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {ServerChannel} channel The channel object
 * @param {string} Optional, if set modifies the _from_ field of the message
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.broadcast2channel = function(gameMsg, channel, from) {
    var res, resolvedInfo, globalLookUp;
    var sid;
    if ('undefined' !== typeof from) gameMsg.from = from;

    // We need to determine if the sender is in this channel. If so, we use
    // broadcast, if not we use the send method.

    // Case 1. Message was created by the server, and SID must be checked.
    if ('undefined' === typeof gameMsg._sid) {
        globalLookUp = false;
        resolvedInfo = channel.admin.socket.resolveClientAndSocket(gameMsg.from,
                                                                   globalLookUp);

        // Sender is not in the same channel. We can use the send method.
        if (!resolvedInfo.success) {
            res = send2AllClientsInGameServer(gameMsg, channel.admin);
            res = res && send2AllClientsInGameServer(gameMsg, channel.player);
        }
        else {
            gameMsg._sid = resolvedInfo.sid;
        }
    }

    // Case 2. Message was received by server, and SID already detected,
    // or sender was found in this channel.
    if ('undefined' !== typeof gameMsg._sid) {
        // We need to make a copy, because it will be deleted by the socket.
        sid = gameMsg._sid;
        res = broadcast2AllClientsInGameServer(gameMsg, channel.admin, sid);
        res = res && broadcast2AllClientsInGameServer(gameMsg, channel.player,
                                                      sid);
    }

    if (!res) {
        this.sysLogger.log('SocketManager.broadcast2channel: error/s occurred ' +
                           'for channel: ' + channel.name + '.', 'error');
    }
    return res;
};

/**
 * ### SocketManager.broadcast2ownRoom
 *
 * Sends a game message to all clients in the same room except the sender
 *
 * The sender is taken from the 'from' field of the game message,
 * or it can be specified as a second parameter.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {string} from Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.broadcast2ownRoomOld = function(gameMsg, from) {
    var registry, fromRoomName;
    registry = this.server.channel.registry;
    from = from || gameMsg.from

    // Checks if from is an alias, and returns the id.
    // If it is not an alias, it still needs to be found
    // in the registry, otherwise it returns NULL.
    resolvedFrom = registry.lookupClient(from);
    fromRoomName = registry.getClientRoom(resolvedFrom);
    if (!fromRoomName) {
        throw new Error('SocketManager.broadcast: Sender (ID: ' +
                        resolvedFrom + ') is not in any room.');
    }

    fromRoom = this.server.channel.gameRooms[fromRoomName];
    if (!fromRoom) {
        throw new Error('SocketManager.broadcast: Sender (ID: ' +
                        resolvedFrom + ') is not in any room');
    }

    return this.broadcast2room(gameMsg, fromRoom, resolvedFrom);
};
SocketManager.prototype.broadcast2ownRoom = function(gameMsg, from) {
    var registry, fromRoomName, fromRoom;
    var ownChannel;
    var channels, channelName, channel;

    if ('undefined' !== typeof from) gameMsg.from = from;

    // Case 1. Room was correctly detected before (msg received from server).
    if ('undefined' !== typeof gameMsg._roomName) {
        fromRoom = this.server.channel.gameRooms[gameMsg._roomName];
    }

    // Case 2. Room was not found before (msg created inside the server).
    if (!fromRoom) {
        fromRoom = this.lookupRoom(gameMsg.from);
    }

    // Room not found.
    if (!fromRoom) {
        this.sysLogger.log('SocketManager.send2ownRoom: Sender (ID: ' +
                           gameMsg.from + ') is not in any room.');
        return false;
    }

    return this.broadcast2room(gameMsg, fromRoom);
};

/**
 * ### SocketManager.broadcast2room
 *
 * Sends a game message to all clients in the same room except the sender
 *
 * The sender is taken from the 'from' field of the game message,
 * or it can be specified as a second parameter.
 *
 * @param {GameMsg} gameMsg The game message to send
 * @param {GameRoom} room The room in which to broadcast
 * @param {string} resolvedFrom The id of the sender.
 * @return {boolean} FALSE is an error occurs
 */
SocketManager.prototype.broadcast2room = function(gameMsg, room, resolvedFrom) {
    var originalTo, res, toClients;

    originalTo = gameMsg.to;

    // Find all clients connected to game room.
    toClients = room.clients.id.getAllKeys();
    
    res = this.broadcast2group(gameMsg, toClients, resolvedFrom);

    if (!res) {
        this.sysLogger.log('SocketManager.broadcast2room: an error has ' +
                           'occurred for room ' + room.name + '.', 'error');
    }

    // The original _from_ field of the gameMsg must be re-set
    // to avoid that a wrong reuse of the msg in the callee
    gameMsg.to = originalTo;

    return res;
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
 * @param {array|PlayerList|NDDB} The recipients of the message
 * @param {string} resolvedFrom Optional. The id or alias of the sender. Defaults,
 *    the value of the field gameMsg.from
 * @return {boolean} TRUE on success
 */
SocketManager.prototype.broadcast2group = function(gameMsg, group, resolvedFrom) {
    var res, i, len;
    res = true;

    from = resolvedFrom || gameMsg.from;

    if (group instanceof PlayerList || group instanceof NDDB) {
        group = group.fetchValues('id').id;
    }
    else if (!J.isArray(group)) {
        debugger
        throw new TypeError('SocketManager.broadcast2group: group must be ' +
                            'array or instance of PlayerList/NDDB.', 'error');
    }

    i = -1, len = group.length;
    for ( ; ++i < len ; ) {
        // Do not send the msg to sender as well.
        if (group[i].id !== from) {
            res = res && this.send2client(gameMsg, group[i]);
        }
    }

    if (!res) {
        this.sysLogger.log('SocketManager.broadcast2group: an error has ' +
                           'occurred.', 'error');
    }
    return res;
};


// Helper methods.

/**
 * ### SocketManager.resolveClientAndSocket
 *
 * Retrieves the socket, and sid of the recipient of a GameMsg
 *
 * Returns an object with the following properties:
 *
 *  - channel: the ServerChannel object
 *  - socket: the Socket object
 *  - sid: the id of the recipient within the socket
 *  - cid: the client id of the recipient within the channel
 *  - success: boolean flag, TRUE if resolving is successful
 *  - errMsg: set if an error occurs
 *
 * If server is allowed to do so, and the recipient is not found in the
 * local registry, it will look into the registry of other channels.
 *
 * @param {GameMsg} gameMsg The game message to analyze
 * @param {boolean} glovalLookUp If defined, overwrites settings:
 *   `this.server.channel.servernode.channels`.
 * @return {object} An object containing the result of the
 *   resolving process
 */
SocketManager.prototype.resolveClientAndSocket = function(gameMsg, globalLookUp) {
    var to, socket;
    var resolvedTo, registry;
    var receiverObj, receiverSid;
    var ownChannel;
    var channels, channelName, channel;

    globalLookUp = 'undefined' !== typeof globalLookUp ?
        globalLookUp : this.server.options.canSendTo.anyChannel;

    ownChannel = this.server.channel;
    to = gameMsg.to;

    // TODO: move somewhere in the wiki
    // Game aliases are global associations with a client id that are valid
    // throughout the whole game, while room-aliases are valid only within a
    // specific room. When a client leaves that room the room alias is deleted.

    // Matches the 'to' (GameMsg.to) field with a client ID.
    // The 'to' field can be already a client ID, or a game-alias or a
    // room-alias. In case of a room-alias, uses 'from' (GameMsg.from) field
    // to locate the room. Can return null if the lookup fails.

    registry = ownChannel.registry;
    resolvedTo = registry.lookupClient(to,
                                       gameMsg._room ||
                                       registry.getClientRoom(gameMsg.from));

    // Get the socket object first from current channel.
    socket = this.clients[resolvedTo] ||
        this.server.partner.socket.clients[resolvedTo];

    if (socket) {
        channel = ownChannel;
    }
    // If server can send to other channels as well, look for
    // recipient information in all channels.
    else if (globalLookUp) {

        channels = this.server.channel.servernode.channels;
        for (channelName in channels) {
            if (channelName !== ownChannel.name &&
                channels.hasOwnProperty(channelName)) {

                channel = channels[channelName];

                registry = channel.registry;
                resolvedTo = registry.lookupClient(to,
                                                   registry.getClientRoom(to));

                socket = channel.player.socket.clients[resolvedTo] ||
                    channel.admin.socket.clients[resolvedTo];

                if (socket) break;
            }
        }
    }

    // If socket object for to field is not found, return an error message.
    if (!socket) {
        return {
            success: false,
            errMsg: 'Could not find socket for recipient: ' + to +
                ' (last resolved as: ' + resolvedTo + ')'
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
        socket: socket,
        channel: channel
    };
};

/**
 * ## SocketManager.lookupRoom
 *
 * Tries to resolve a client id to an existing room
 *
 * Looks in the registry of other channels as well, if the client id is not
 * found in the local registry, and if the server is allowed to do so.
 *
 * @param {string} clientId The id or alias of a client to resolve
 * @return {GameRoom} room The resolved GameRoom object
 *
 * @see ChannelRegistry.lookupClient
 */
SocketManager.prototype.lookupRoom = function(clientId) {
    var registry, roomName, room, resolvedId;
    var ownChannel, channels, channelName, channel;


    // Look first inside own channel.
    ownChannel = this.server.channel;

    // Checks if clientId is an alias, and returns the real id.
    // If it is not an alias, it still needs to be found
    // in the registry, otherwise it returns NULL.
    registry = ownChannel.registry;
    resolvedId = registry.lookupClient(clientId);
    roomName = registry.getClientRoom(resolvedId);
    room = ownChannel.gameRooms[roomName];

    if (!room &&
        // If server can send to other channels as well, look for
        // recipient information in all channels.
        this.server.options.canSendTo.anyChannel) {

        channels = ownChannel.servernode.channels;
        for (channelName in channels) {
            if (channelName !== ownChannel.name &&
                channels.hasOwnProperty(channelName)) {

                channel = channels[channelName];
                registry = channel.registry;

                resolvedId = registry.lookupClient(clientId,
                                                   registry.getClientRoom(clientId));

                roomName = registry.getClientRoom(resolvedId);
                room = channel.gameRooms[roomName];

                if (room) break;
            }
        }
    }

    return room || null;
};


// function send2clients(gameMsg, cids) {
//     var res;
//     res = true;
//     for (i = 0; i < cids.length; i++) {
//         res = res && this.send2client(gameMsg, cids[i]);
//     }
//     return res;
// }

function send2AllClientsInGameServer(gameMsg, server) {
    var i, res, sockets, smoothExec;
    smoothExec = true;
    sockets = server.socket.sockets;
    for (i in sockets) {
        if (sockets.hasOwnProperty(i)) {
            res = sockets[i].send(gameMsg, 'ALL');
            if (!res) {
                server.sysLogger.log('SocketManager.send2channel: An error ' +
                                     'occurred in channel ' + channel.name +
                                     ', ' + server.name + ' server, and ' +
                                     'socket: ' + i, 'error');
                smoothExec = false;
            }
        }
    }
    return smoothExec;
}

function broadcast2AllClientsInGameServer(gameMsg, server, sid) {
    var i, res, sockets, smoothExec;
    smoothExec = true;
    sockets = server.socket.sockets;
    for (i in sockets) {
        if (sockets.hasOwnProperty(i)) {
            res = sockets[i].send(gameMsg, sid, true);
            if (!res) {
                server.sysLogger.log('SocketManager.send2channel: An error ' +
                                     'occurred in channel ' + channel.name +
                                     ', ' + server.name + ' server, and ' +
                                     'socket: ' + i, 'error');
                smoothExec = false;
            }
        }
    }
    return smoothExec;
}