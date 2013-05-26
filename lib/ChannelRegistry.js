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

var JSUS       = require('JSUS').JSUS;
var PlayerList = require('nodegame-client').PlayerList;
var Player     = require('nodegame-client').Player;

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
 * ### ChannelRegistry.addClient
 *
 * Registers a client
 *
 * @param {object} playerObj An object constituting a valid Player object
 *   except the `id` field
 *
 * @return {string} The ID of the client. Null on error.
 *
 * @see Player
 */
ChannelRegistry.prototype.addClient = function(playerObj) {
	var clientId = JSUS.uniqueKey(this.clients.id);

	if ('undefined' === typeof clientId) return null;

	playerObj.id = clientId;
	playerObj = new Player(playerObj);

	if (!this.clients.add(playerObj)) return null;

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
 * @return {boolean} true on success, false on error
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
<<<<<<< HEAD
		if (this.gameAliases[alias] === clientId) {
=======
		if (this.gameAliases.hasOwnProperty(alias) &&
				this.gameAliases[alias] === clientId) {
>>>>>>> b4460a4db24a6b65657ed764a9d5dc4d4d2773cd
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
 * @return {boolean} true on success, false on error
 */
ChannelRegistry.prototype.moveClient = function(client, newRoom) {
	var clientId = this.lookupClient(client);

	if (clientId === null) return false;
	if ('undefined' === typeof newRoom) return false;

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
 * @return {boolean} true on success, false on error
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
<<<<<<< HEAD
			if (oldRoomAliases[alias] === clientId) {
=======
			if (oldRoomAliases.hasOwnProperty(alias) &&
					oldRoomAliases[alias] === clientId) {
>>>>>>> b4460a4db24a6b65657ed764a9d5dc4d4d2773cd
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
	// TODO: With new NDDB: wait for update
	return JSUS.keys(this.clients.id);
};

/**
 * ### ChannelRegistry.getClients
 *
 * Returns a map of all clients
 */
ChannelRegistry.prototype.getClients = function() {
	// TODO: With new NDDB: wait for update
	return this.clients.id;
};

/**
 * ### ChannelRegistry.getPlayers
 *
 * Returns a map of all players
 */
ChannelRegistry.prototype.getPlayers = function() {
	return this.clients.player;
};

/**
 * ### ChannelRegistry.getAdmins
 *
 * Returns a map of all admins
 */
ChannelRegistry.prototype.getAdmins = function() {
	return this.clients.admin;
};

/**
 * ### ChannelRegistry.getConnected
 *
 * Returns a map of all connected clients
 */
ChannelRegistry.prototype.getConnected = function() {
	return this.clients.connected;
};

/**
 * ### ChannelRegistry.getDisconnected
 *
 * Returns a map of all disconnected clients
 */
ChannelRegistry.prototype.getDisconnected = function() {
	return this.clients.disconnected;
};

/**
 * ### ChannelRegistry.getClientRoom
 *
 * Returns the current room ID of a client
 *
 * @param {string} client The client's alias or ID
 *
 * @return {string} The room ID. Null on error.
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
 * @return {array} The room IDs of the client in the order of joining.
 *   Null on error.
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
<<<<<<< HEAD
		if (this.getClientRoom(clientId) === room) {
=======
		if (this.roomStacks.hasOwnProperty(clientId) &&
				this.getClientRoom(clientId) === room) {
>>>>>>> b4460a4db24a6b65657ed764a9d5dc4d4d2773cd
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
 * @return {boolean} true on success, false on error
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
 */
ChannelRegistry.prototype.registerGameAlias = function(alias, client) {
	this.gameAliases[alias] = client;
};

/**
 * ### ChannelRegistry.deregisterGameAlias
 *
 * Deregisters a game-global client alias
 *
 * @param {string} alias The alias to deregister
 *
 * @return {boolean} true on success, false on error
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
 * Returns null if not found or infinite loop detected.
 *
 * @param {string} client The client's alias or ID
 * @param {string} room Optional. The room ID.
 *
 * @return {string} The client ID. Null on error.
 */
ChannelRegistry.prototype.lookupClient = function(client, room) {
	var aliasTrace = [];

	while (true) {
		// Avoid alias loop:
		if (aliasTrace.indexOf(client) !== -1) return null;
		aliasTrace.push(client);

		// Check aliases in given room:
		if ('undefined' !== (typeof room) && this.roomAliases.hasOwnProperty(room) &&
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
<<<<<<< HEAD
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
=======
	'undefined' != typeof node ? node : module.exports,
	'undefined' != typeof node ? node : module.parent.exports
>>>>>>> b4460a4db24a6b65657ed764a9d5dc4d4d2773cd
);
