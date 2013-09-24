/**
 * # ChannelRegistry
 *
 * Container for clients, rooms and aliases
 *
 * ---
 */

// ## Global scope
module.exports = ChannelRegistry;

var ngc = require('nodegame-client');

var JSUS       = ngc.JSUS;
var PlayerList = ngc.PlayerList;
var Player     = ngc.Player;


/**
 * ## ChannelRegistry constructor
 *
 * Creates a new instance of ChannelRegistry
 */
function ChannelRegistry() {

    /**
     * ### ChannelRegistry.clients
     *
     * List of registered clients
     *
     * @see PlayerList
     */
    this.clients = new PlayerList({
        I: {
            admin:        function(p) { return p.admin ? p.id : undefined; },
            player:       function(p) { return !p.admin ? p.id : undefined; },
            disconnected: function(p) { return p.disconnected ? p.id : undefined; },
            connected:    function(p) { return !p.disconnected ? p.id : undefined; },
            sid:          function(p) { return p.sid ? p.sid : undefined; }
        }
    });

    /**
     * ### ChannelRegistry.roomStacks
     *
     * Room membership of players
     *
     * key: clientID,  value: array of roomIDs, last ID is current room
     */
    this.roomStacks = {};

    /**
     * ### ChannelRegistry.roomAliases
     *
     * Per-room client aliases
     *
     * key: roomID,  value: map from aliases to aliases/clientIDs
     */
    this.roomAliases = {};

    /**
     * ### ChannelRegistry.gameAliases
     *
     * Game-global client aliases
     *
     * key: alias,  value: alias/clientID
     */
    this.gameAliases = {};
}

// ## ChannelRegistry methods

/**
 * ### ChannelRegistry.generateClientId
 *
 * Generates a unique id for newly connecting clients
 *
 * @return {string} The ID of the client
 *
 * @see ChannelRegistry.addClient
 */
ChannelRegistry.prototype.generateClientId = function() {
    return JSUS.uniqueKey(this.getClients());
};


/**
 * ### ChannelRegistry.addClient
 *
 * Registers a client
 *
 * @param {object} playerObj An object constituting a valid Player object
 *   except the `id` field
 *
 * @return {string} The ID of the client.
 *
 * @see node.Player
 */
ChannelRegistry.prototype.addClient = function(playerObj) {
    var clientId, res;

    if ('undefined' === typeof playerObj) {
        throw new TypeError('ChannelRegistry.addClient: playerObj cannot be undefined.');
    }
    clientId = this.generateClientId();

    if ('string' !== typeof clientId) {
        throw new Error('ChannelRegistry.addClient: error generating clientId.');
    }

    playerObj.id = clientId;
    playerObj = new Player(playerObj);

    // TODO this must be changed to support different types of DB
    res = this.clients.add(playerObj);

    if (!res) {
        throw new Error('ChannelRegistry.addClient: error ' +
                'adding client with id ' + clientId + '.');
    }

    this.roomStacks[clientId] = [];
    return clientId;
};

/**
 * ### ChannelRegistry.removeClient
 *
 * Deregisters a client
 *
 * All room and game aliases to the client's ID are removed.
 *
 * @param {string} client The client's alias or ID
 */
ChannelRegistry.prototype.removeClient = function(client) {
    var clientId = this.lookupClient(client);
    var alias;

    if (clientId === null) {
        throw new Error('ChannelRegistry.removeClient: unknown client "' + client + '".');
    }

    // Remove client from all the rooms to trigger removing
    // room aliases to client ID:
    while (this.moveClientBack(clientId));

    // Remove game aliases to ID:
    for (alias in this.gameAliases) {
        if (this.gameAliases.hasOwnProperty(alias) &&
                this.gameAliases[alias] === clientId) {
            delete this.gameAliases[alias];
        }
    }

    // Remove room stack:
    delete this.roomStacks[clientId];

    // Remove client from PlayerList:
    if (!this.clients.remove(clientId)) {
        throw new Error('ChannelRegistry.removeClient: error ' +
                'removing client with id ' + clientId + '.');
    }
};

/**
 * ### ChannelRegistry.moveClient
 *
 * Moves client to a new game room
 *
 * All local room aliases pointing directly to the client's ID are removed
 * from the old room.
 *
 * @param {string} client The client's alias or ID
 * @param {string} newRoom The new room ID of the client
 */
ChannelRegistry.prototype.moveClient = function(client, newRoom) {
    var clientId = this.lookupClient(client);
    var roomStack;
    var oldRoom;

    if ('string' !== typeof newRoom) {
        throw new TypeError('ChannelRegistry.moveClient: newRoom must be a string.');
    }
    if (clientId === null) {
        throw new Error('ChannelRegistry.moveClient: unknown client "' + client + '".');
    }

    roomStack = this.roomStacks[clientId];

    // Remove all room aliases to the client's ID:
    if (roomStack.length > 0) {
        oldRoom = roomStack[roomStack.length - 1];
        this.deregisterClientRoomAliases(clientId, oldRoom);
    }

    roomStack.push(newRoom);
};

/**
 * ### ChannelRegistry.moveClientBack
 *
 * Moves client to previous game room
 *
 * All local room aliases pointing directly to the client's ID are removed.
 *
 * @param {string} client The client's alias or ID
 *
 * @return {boolean} Whether the client was moved back successfully
 */
ChannelRegistry.prototype.moveClientBack = function(client) {
    var clientId = this.lookupClient(client);
    var roomStack;
    var oldRoom;

    if (clientId === null) {
        throw new Error('ChannelRegistry.moveClientBack: unknown client "' + client + '".');
    }

    roomStack = this.roomStacks[clientId];

    // Remove all room aliases to the client's ID:
    if (roomStack.length > 0) {
        oldRoom = roomStack[roomStack.length - 1];
        this.deregisterClientRoomAliases(clientId, oldRoom);
    }

    // Try to pop the client's stack:
    if ('undefined' === typeof roomStack.pop()) {
        return false;
    }

    return true;
};

/**
 * ### ChannelRegistry.markDisconnected
 *
 * Marks a client as disconnected
 *
 * @param {string} client The client's alias or ID
 */
ChannelRegistry.prototype.markDisconnected = function(client) {
    var clientId, clientName;

    clientId = this.lookupClient(client);
    if (!this.clients.exist(clientId)) {
        clientName = client + ' (resolved to "' + clientId + '")';
        throw new Error('ChannelRegistry.markDisconnected: invalid client ' + clientName + '.');
    }

    // Update the PlayerList:
    if (!this.clients.id.update(clientId, { disconnected: true })) {
        throw new Error('ChannelRegistry.markDisconnected: error ' +
                'updating client with id ' + clientId + '.');
    }
};

/**
 * ### ChannelRegistry.markDisconnected
 *
 * Marks a client as connected
 *
 * @param {string} client The client's alias or ID
 */
ChannelRegistry.prototype.markConnected = function(clientId) {
    var clientId, clientName;

    // TODO: this fails because the client is disconnected. Maybe we don't
    // need to lookup in this cases;
    //clientId = this.lookupClient(client);
    if (!this.clients.exist(clientId)) {
        clientName = client + ' (resolved to "' + clientId + '")';
        throw new Error('ChannelRegistry.markConnected: invalid client ' + clientName + '.');
    }

    // Update the PlayerList:
    if (!this.clients.id.update(clientId, { disconnected: false })) {
        throw new Error('ChannelRegistry.markConnected: error ' +
                'updating client with id ' + clientId + '.');
    }
};


/**
 * ### ChannelRegistry.getIds
 *
 * Returns an array of all IDs
 */
ChannelRegistry.prototype.getIds = function() {
    return this.clients.id.getAllKeys();
};

/**
 * ### ChannelRegistry.getSids
 *
 * Returns an array of all SIDs
 */
ChannelRegistry.prototype.getSids = function() {
    return this.clients.sid.getAllKeys();
};

/**
 * ### ChannelRegistry.getClients
 *
 * Returns a map of all clients
 */
ChannelRegistry.prototype.getClients = function() {
    return this.clients.id.getAllKeyElements();
};

/**
 * ### ChannelRegistry.getPlayers
 *
 * Returns a map of all players
 */
ChannelRegistry.prototype.getPlayers = function() {
    return this.clients.player.getAllKeyElements();
};

/**
 * ### ChannelRegistry.getAdmins
 *
 * Returns a map of all admins
 */
ChannelRegistry.prototype.getAdmins = function() {
    return this.clients.admin.getAllKeyElements();
};

/**
 * ### ChannelRegistry.getConnected
 *
 * Returns a map of all connected clients
 */
ChannelRegistry.prototype.getConnected = function() {
    return this.clients.connected.getAllKeyElements();
};

/**
 * ### ChannelRegistry.getDisconnected
 *
 * Returns a map of all disconnected clients
 */
ChannelRegistry.prototype.getDisconnected = function() {
    return this.clients.disconnected.getAllKeyElements();
};

/**
 * ### ChannelRegistry.getClientRoom
 *
 * Returns the current room ID of a client
 *
 * @param {string} client The client's alias or ID
 *
 * @return {string|null} The room ID. NULL on error.
 */
ChannelRegistry.prototype.getClientRoom = function(client) {
    var stack = this.getClientRoomStack(client);

    if (!stack || !stack.length) return null;

    return stack[stack.length - 1];
};

/**
 * ### ChannelRegistry.getClientRoomStack
 *
 * Returns the room stack of a client
 *
 * @param {string} client The client's alias or ID
 *
 * @return {array|null} The room IDs of the client in the order of joining.
 *   NULL on error.
 */
ChannelRegistry.prototype.getClientRoomStack = function(client) {
    var clientId = this.lookupClient(client);

    if (clientId === null) {
        //throw new Error('ChannelRegistry.getClientRoomStack: unknown client "' + client + '".');
        return null;
    }

    return this.roomStacks[clientId];
};

/**
 * ### ChannelRegistry.getRoomIds
 *
 * Returns an array of all known room IDs
 */
ChannelRegistry.prototype.getRoomIds = function(room) {
    var ids = [];
    var clientId;

    for (clientId in this.roomStacks) {
        if (this.roomStacks.hasOwnProperty(clientId) &&
                this.getClientRoom(clientId) === room) {
            ids.push(clientId);
        }
    }

    return ids;
};

/**
 * ### ChannelRegistry.getRoomAliases
 *
 * Returns the room alias mappings
 *
 * @see ChannelRegistry.roomAliases
 */
ChannelRegistry.prototype.getRoomAliases = function(room) {
    return this.roomAliases[room];
};

/**
 * ### ChannelRegistry.registerRoomAlias
 *
 * Registers a per-room client alias
 *
 * The alias can point to a client ID, a game alias or
 * a different room alias in the same room.
 *
 * Aliases can be registered even if the target doesn't exist, but lookups on
 * the alias will fail then.
 *
 * @param {string} room The room ID
 * @param {string} alias The alias to register
 * @param {string} client The target of the alias
 */
ChannelRegistry.prototype.registerRoomAlias = function(room, alias, client) {
    if ('string' !== typeof room) {
        throw new TypeError('ChannelRegistry.registerRoomAlias: room must be a string.');
    }
    if ('string' !== typeof alias) {
        throw new TypeError('ChannelRegistry.registerRoomAlias: alias must be a string.');
    }
    if ('string' !== typeof client) {
        throw new TypeError('ChannelRegistry.registerRoomAlias: client must be a string.');
    }

    if (!this.roomAliases.hasOwnProperty(room)) {
        this.roomAliases[room] = {};
    }

    this.roomAliases[room][alias] = client;
};

/**
 * ### ChannelRegistry.deregisterRoomAlias
 *
 * Deregisters a per-room client alias
 *
 * @param {string} room The room ID
 * @param {string} alias The alias to deregister
 *
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.deregisterRoomAlias = function(room, alias) {
    if ('string' !== typeof room) {
        throw new TypeError('ChannelRegistry.deregisterRoomAlias: room must be a string.');
    }
    if ('string' !== typeof alias) {
        throw new TypeError('ChannelRegistry.deregisterRoomAlias: alias must be a string.');
    }

    if (!this.roomAliases.hasOwnProperty(room)) return false;
    if (!this.roomAliases[room].hasOwnProperty(alias)) return false;

    delete this.roomAliases[room][alias];

    if (JSUS.isEmpty(this.roomAliases[room])) {
        delete this.roomAliases[room];
    }

    return true;
};

/**
 * ### ChannelRegistry.deregisterClientRoomAliases
 *
 * Deregisters all per-room aliases for a client in a room
 *
 * @param {string} client The client's alias or ID
 * @param {string} room The room ID
 */
ChannelRegistry.prototype.deregisterClientRoomAliases = function(client, room) {
    var clientId = this.lookupClient(client);
    var roomAliases, alias;

    if ('string' !== typeof client) {
        throw new TypeError('ChannelRegistry.deregisterClientRoomAliases: client must be a string.');
    }
    if ('string' !== typeof room) {
        throw new TypeError('ChannelRegistry.deregisterClientRoomAliases: room must be a string.');
    }

    if (clientId === null) {
        throw new Error('ChannelRegistry.deregisterClientRoomAliases: unknown client "' + client + '".');
    }

    roomAliases = this.roomAliases[room];
    for (alias in roomAliases) {
        if (roomAliases.hasOwnProperty(alias) &&
                roomAliases[alias] === clientId) {
            // Delete that alias:
            this.deregisterRoomAlias(room, alias);
        }
    }
};

/**
 * ### ChannelRegistry.registerGameAlias
 *
 * Registers a game-global client alias
 *
 * The alias can point to a client ID, a game alias or a room alias.
 *
 * Aliases can be registered even if the target doesn't exist, but lookups on
 * the alias will fail then.
 *
 * @param {string} alias The alias to register
 * @param {string} client The target of the alias
 */
ChannelRegistry.prototype.registerGameAlias = function(alias, client) {
    if ('string' !== typeof alias) {
        throw new TypeError('ChannelRegistry.registerGameAlias: alias must be a string.');
    }
    if ('string' !== typeof client) {
        throw new TypeError('ChannelRegistry.registerGameAlias: client must be a string.');
    }

    this.gameAliases[alias] = client;
};

/**
 * ### ChannelRegistry.deregisterGameAlias
 *
 * Deregisters a game-global client alias
 *
 * @param {string} alias The alias to deregister
 *
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.deregisterGameAlias = function(alias) {
    if (!this.gameAliases.hasOwnProperty(alias)) return false;

    delete this.gameAliases[alias];

    return true;
};

/**
 * ### ChannelRegistry.lookupClient
 *
 * Gets client ID from an alias and optional game room
 *
 * May return ID even if that client is not in the given room.
 * Only connected clients are searched.
 * Returns NULL if not found or infinite loop detected.
 *
 * @param {string} client The client's alias or ID
 * @param {string} room Optional. The room ID.
 *
 * @return {string|null} The client ID. NULL on error.
 */
ChannelRegistry.prototype.lookupClient = function(client, room) {
    var aliasTrace = [];

    while (true) {
        // Avoid alias loop:
        if (aliasTrace.indexOf(client) !== -1) return null;
        aliasTrace.push(client);

        // Check aliases in given room:
        if ('undefined' !== (typeof room) &&
                this.roomAliases.hasOwnProperty(room) &&
                this.roomAliases[room].hasOwnProperty(client)) {
            client = this.roomAliases[room][client];
            continue;
        }

        // Check if ID exists and is connected:
        if (this.clients.connected.get(client)) {
            return client;
        }

        // Check game aliases:
        if (this.gameAliases.hasOwnProperty(client)) {
            client = this.gameAliases[client];
            continue;
        }

        // Client wasn't found:
        return null;
    }
};

/**
 * ### ChannelRegistry.id2sid
 *
 * Returns the socket id associated with a client id
 *
 * Returns NULL if not found or infinite loop detected.
 *
 * @param {string} client The client alias or ID
 * @param {string} room Optional. The room ID.
 *
 * @return {string|null} The client sid. NULL on error.
 *
 * TODO: maybe we do not need it.
 */
ChannelRegistry.prototype.id2sid = function(client, room) {
    // TODO: fix
    var sid, clientObj;

    clientObj = this.playerList.id.get(client);

    if (clientObj) {
        sid = clientObj.sid;
        if ('undefined' !== typeof sid) {
            return sid;
        }
    }
    // client was an alias, need to resolve it.
    else {
        clientObj = this.lookupClient(client, room);
        return clientObj ? clientObj.sid : null;
    }
};
