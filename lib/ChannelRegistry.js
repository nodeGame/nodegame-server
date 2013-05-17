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
	// TODO: docs
	this.clients = new PlayerList({
		I: {
			admin:        function(p) { return p.admin ? p.id : undefined; },
			player:       function(p) { return !p.admin ? p.id : undefined; },
			disconnected: function(p) { return p.disconnected ? p.id : undefined; },
			connected:    function(p) { return !p.disconnected ? p.id : undefined; }
		}});

	this.roomStacks = {};
	this.roomAliases = {};
	this.gameAliases = {};
}

// ## ChannelRegistry methods

/**
 * ### ChannelRegistry.addClient
 *
 * TODO: docs
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
 * Removes a client from the registry
 *
 * All room and game aliases to client's ID are removed.
 *
 * TODO: docs
 */
ChannelRegistry.prototype.removeClient = function(client) {
	var clientId = this.lookupClient(client);
	var alias;

	if (!this.clients.exist(clientId)) return false;

	// Remove client from all the rooms to trigger removing room aliases to client ID:
	while (this.moveClient(clientId));

	// Remove game aliases to ID:
	for (alias in this.gameAliases) {
		if (this.gameAliases[alias] === clientId) {
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
 * Moves client between game rooms
 *
 * If client is removed from a room, all local room aliases pointing
 * directly to the client's ID are removed.
 *
 * TODO: docs
 */
ChannelRegistry.prototype.moveClient = function(client, newRoom) {
	var clientId = this.lookupClient(client);
	var roomStack;
	var oldRoom, oldRoomAlises;
	var alias;

	if (clientId === null) return false;

	roomStack = this.roomStacks[clientId];

	if ('undefined' === typeof newRoom) {
		// Remove client's current room from his stack:

		// Remove all room aliases to the client's ID:
		if (roomStack.length > 0) {
			oldRoom = roomStack[roomStack.length - 1];
			oldRoomAliases = this.roomAliases[oldRoom];
			for (alias in oldRoomAliases) {
				if (oldRoomAliases[alias] === clientId) {
					// Delete that alias:
					this.registerRoomAlias(oldRoom, alias);
				}
			}
		}

		// Try to pop the client's stack:
		if ('undefined' === typeof roomStack.pop()) return false;
	}
	else {
		// Add room to client's stack:
		roomStack.push(newRoom);
	}

	return true;
};

/**
 * ### ChannelRegistry.getIds
 *
 * Returns an array of all IDs
 */
ChannelRegistry.prototype.getIds = function() {
	return JSUS.keys(this.clients.id);
};

/**
 * ### ChannelRegistry.getPlayers
 *
 * Returns a map of all clients
 */
ChannelRegistry.prototype.getClients = function() {
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
 * TODO: docs
 */
ChannelRegistry.prototype.getClientRoom = function(client) {
	var stack = this.getClientRoomStack(client);

	if (!stack || !stack.length) return null;

	return stack[stack.length - 1];
};

/**
 * ### ChannelRegistry.getClientRoomStack
 *
 * TODO: docs
 */
ChannelRegistry.prototype.getClientRoomStack = function(client) {
	var clientId = this.lookupClient(client);

	if (clientId === null) return null;

	return this.roomStacks[clientId];
};

/**
 * ### ChannelRegistry.getRoomIds
 *
 * TODO: docs
 */
ChannelRegistry.prototype.getRoomIds = function(room) {
	var ids = [];
	var clientId;

	for (clientId in this.roomStacks) {
		if (this.getClientRoom(clientId) === room) {
			ids.push(clientId);
		}
	}

	return ids;
};

/**
 * ### ChannelRegistry.getRoomAliases
 *
 * TODO: docs
 */
ChannelRegistry.prototype.getRoomAliases = function(room) {
	return this.roomAliases[room];
};

/**
 * ### ChannelRegistry.registerRoomAlias
 *
 * TODO: docs
 */
ChannelRegistry.prototype.registerRoomAlias = function(room, alias, client) {
	if ('undefined' === typeof client) {
		// Remove alias:

		if (!this.roomAliases.hasOwnProperty(room)) return false;
		if (!this.roomAliases[room].hasOwnProperty(alias)) return false;

		delete this.roomAliases[room][alias];

		if (JSUS.isEmpty(this.roomAliases[room])) {
			delete this.roomAliases[room];
		}
	}
	else {
		// Add alias:

		if (!this.roomAliases.hasOwnProperty(room)) {
			this.roomAliases[room] = {};
		}

		this.roomAliases[room][alias] = client;
	}

	return true;
};

/**
 * ### ChannelRegistry.registerGameAlias
 *
 * TODO: docs
 */
ChannelRegistry.prototype.registerGameAlias = function(alias, client) {
	if ('undefined' === typeof client) {
		// Remove alias:

		if (!this.gameAliases.hasOwnProperty(alias)) return false;

		delete this.gameAliases[alias];
	}
	else {
		// Add alias:
		this.gameAliases[alias] = client;
	}

	return true;
};

/**
 * ### ChannelRegistry.lookupClient
 *
 * Gets client's ID from alias and game room
 *
 * May return ID even if that client is not in the given room.
 *
 * TODO: docs
 */
ChannelRegistry.prototype.lookupClient = function(client, room) {
	if ('undefined' !== (typeof room) && this.roomAliases.hasOwnProperty(room) &&
			this.roomAliases[room].hasOwnProperty(client)) {
				return this.lookupClient(this.roomAliases[room][client], room);
			}

	if (this.clients.exist(client)) {
		return client;
	}

	if (this.gameAliases.hasOwnProperty(client)) {
		return this.lookupClient(this.gameAliases[client], room);
	}

	return null;
};

/**
 * ### ChannelRegistry.generateId
 *
 * TODO: docs
 * Remove in favor of JSUS.uniqueKey?
 */
ChannelRegistry.prototype.generateId = function() {
	var tries, id;

	for (tries = 0; tries < 100; tries++) {
		id = Math.floor(Math.random() * 1000000000000000000).toString();
		if (!this.clients.exist(id)) return id;
	}

	return null;
};

// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
