/**
 * # ChannelRegistry
 *
 * Container for clients, rooms and aliases
 *
 * ---
 */
(function(exports, node) {

// ## Global scope
exports.ChannelRegistry = ChannelRegistry;

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
            connected:    function(p) { return !p.disconnected ? p.id : undefined; }
        }});

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
    return JSUS.uniqueKey(this.clients.id);
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
 * @see Player
 */
ChannelRegistry.prototype.addClient = function(playerObj) {
    var clientId, errStr, res;
    if ('undefined' === typeof playerObj) {
        throw TypeError('ChannelRegistry.addClient: playerObj cannot be undefined');
    }
    clientId = this.generateClientId();

    if ('string' !== typeof clientId) {
        throw TypeError('ChannelRegistry.addClient: clientId must be a string');
    }
    
    playerObj.id = clientId;
    playerObj = new Player(playerObj);
    
    // TODO this must be changed to support different types of DB
    res = this.clients.add(playerObj)

    if (!res) {
        errStr = "ChannelRegistry.addClient: an error occurred when adding player with id " + clientId;
        this.sysLogger.log('error', errStr);
        return null;
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
 *
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.removeClient = function(client) {
    var clientId = this.lookupClient(client);
    var alias;

    if (clientId === null) return false;

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

    return this.clients.remove(clientId);
};

/**
 * ### ChannelRegistry.moveClient
 *
 * Moves client to a new game room
 *
 * @param {string} client The client's alias or ID
 * @param {string} newRoom The new room ID of the client
 *
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.moveClient = function(client, newRoom) {
    var clientId = this.lookupClient(client);

    if (clientId === null) return false;
    if ('string' !== typeof newRoom) return false;

    this.roomStacks[clientId].push(newRoom);

    return true;
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
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.moveClientBack = function(client) {
    var clientId = this.lookupClient(client);
    var roomStack;
    var oldRoom, oldRoomAlises;
    var alias;

    if (clientId === null) return false;

    roomStack = this.roomStacks[clientId];

    // Remove all room aliases to the client's ID:
    if (roomStack.length > 0) {
        oldRoom = roomStack[roomStack.length - 1];
        oldRoomAliases = this.roomAliases[oldRoom];
        for (alias in oldRoomAliases) {
            if (oldRoomAliases.hasOwnProperty(alias) &&
                    oldRoomAliases[alias] === clientId) {
                // Delete that alias:
                this.registerRoomAlias(oldRoom, alias);
            }
        }
    }

    // Try to pop the client's stack:
    if ('undefined' === typeof roomStack.pop()) return false;

    return true;
};

/**
 * ### ChannelRegistry.getIds
 *
 * Returns an array of all IDs
 */
ChannelRegistry.prototype.getIds = function() {
    // TODO: Check with new NDDB
    return this.clients.id.getAllKeys();
};

/**
 * ### ChannelRegistry.getClients
 *
 * Returns a map of all clients
 */
ChannelRegistry.prototype.getClients = function() {
    // TODO: Check with new NDDB
    return this.clients.id.getAllKeyElements();
};

/**
 * ### ChannelRegistry.getPlayers
 *
 * Returns a map of all players
 */
ChannelRegistry.prototype.getPlayers = function() {
    // TODO: Check with new NDDB
    return this.clients.player;
};

/**
 * ### ChannelRegistry.getAdmins
 *
 * Returns a map of all admins
 */
ChannelRegistry.prototype.getAdmins = function() {
    // TODO: Check with new NDDB
    return this.clients.admin;
};

/**
 * ### ChannelRegistry.getConnected
 *
 * Returns a map of all connected clients
 */
ChannelRegistry.prototype.getConnected = function() {
    // TODO: Check with new NDDB
    return this.clients.connected;
};

/**
 * ### ChannelRegistry.getDisconnected
 *
 * Returns a map of all disconnected clients
 */
ChannelRegistry.prototype.getDisconnected = function() {
    // TODO: Check with new NDDB
    return this.clients.disconnected;
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

    if (clientId === null) return null;

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
 *
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.registerRoomAlias = function(room, alias, client) {
    if ('string' !== typeof room ||
        'string' !== typeof alias ||
        'string' !== typeof client) return false;

    if (!this.roomAliases.hasOwnProperty(room)) {
        this.roomAliases[room] = {};
    }

    this.roomAliases[room][alias] = client;
    return true;
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
    if (!this.roomAliases.hasOwnProperty(room)) return false;
    if (!this.roomAliases[room].hasOwnProperty(alias)) return false;

    delete this.roomAliases[room][alias];

    if (JSUS.isEmpty(this.roomAliases[room])) {
        delete this.roomAliases[room];
    }

    return true;
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
 *
 * @return {boolean} TRUE on success, FALSE on error
 */
ChannelRegistry.prototype.registerGameAlias = function(alias, client) {
    if ('string' !== typeof alias ||
        'string' !== typeof client) return false;

    this.gameAliases[alias] = client;
    return true;
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

        // Check if ID exists:
        if (this.clients.exist(client)) {
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

// ## Closure
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);
