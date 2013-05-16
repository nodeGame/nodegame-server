/**
 * # ChannelRegistry
 *
 * Container for players, rooms and aliases
 *
 * ---
 */
(function(exports, node) {

// ## Global scope
exports.ChannelRegistry = ChannelRegistry;

var JSUS = require('JSUS').JSUS;

/**
 * ## ChannelRegistry constructor
 *
 * Creates a new instance of ChannelRegistry
 */
function ChannelRegistry() {
	// TODO: docs
	this.players = {};
	this.roomAliases = {};
	this.gameAliases = {};
}

// ## ChannelRegistry methods

/**
 * ### ChannelRegistry.addPlayer
 *
 * TODO: docs
 */
ChannelRegistry.prototype.addPlayer = function(playerId) {
	if (this.players.hasOwnProperty(playerId)) return false;

	this.players[playerId] = {
		roomStack: []
	};
	return true;
};

/**
 * ### ChannelRegistry.removePlayer
 *
 * Removes a player from the registry
 *
 * All room and game aliases to player's ID are removed.
 *
 * TODO: docs
 */
ChannelRegistry.prototype.removePlayer = function(player) {
	var playerId = this.lookupPlayer(player);
	var alias;

	if (!playerId) return false;
	if (!this.players.hasOwnProperty(playerId)) return false;

	// Remove player from all the rooms to trigger removing room aliases to player ID:
	while (this.movePlayer(playerId));

	// Remove game aliases to ID:
	for (alias in this.gameAliases) {
		if (this.gameAliases[alias] === playerId) {
			delete this.gameAliases[alias];
		}
	}

	delete this.players[playerId];
	return true;
};

/**
 * ### ChannelRegistry.movePlayer
 *
 * Moves player between game rooms
 *
 * If player is removed from a room, all local room aliases pointing
 * directly to the player's ID are removed.
 *
 * TODO: docs
 */
ChannelRegistry.prototype.movePlayer = function(player, newRoom) {
	var playerId = this.lookupPlayer(player);
	var roomStack;
	var oldRoom, oldRoomAlises;
	var alias;

	if (!playerId) return false;

	roomStack = this.players[playerId].roomStack;

	if ('undefined' === typeof newRoom) {
		// Remove player's current room from his stack:

		// Remove all room aliases to the player's ID:
		oldRoom = roomStack.length ? roomStack[roomStack.length - 1] : null;
		oldRoomAliases = this.roomAliases[oldRoom];
		for (alias in oldRoomAliases) {
			if (oldRoomAliases[alias] === playerId) {
				// Delete that alias:
				this.registerRoomAlias(oldRoom, alias);
			}
		}

		// Try to pop the player's stack:
		if ('undefined' === typeof roomStack.pop()) return false;
	}
	else {
		// Add room to player's stack:
		roomStack.push(newRoom);
	}

	return true;
};

/**
 * ### ChannelRegistry.getPlayerRoom
 *
 * TODO: docs
 */
ChannelRegistry.prototype.getPlayerRoom = function(player) {
	var stack = this.getPlayerRoomStack(player);

	if (!stack || !stack.length) return null;

	return stack[stack.length - 1];
};

/**
 * ### ChannelRegistry.getPlayerRoomStack
 *
 * TODO: docs
 */
ChannelRegistry.prototype.getPlayerRoomStack = function(player) {
	var playerId = this.lookupPlayer(player);

	if (!playerId) return null;

	return this.players[playerId].roomStack;
};

/**
 * ### ChannelRegistry.registerRoomAlias
 *
 * TODO: docs
 */
ChannelRegistry.prototype.registerRoomAlias = function(room, alias, player) {
	if ('undefined' === typeof player) {
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

		this.roomAliases[room][alias] = player;
	}

	return true;
};

/**
 * ### ChannelRegistry.registerGameAlias
 *
 * TODO: docs
 */
ChannelRegistry.prototype.registerGameAlias = function(alias, player) {
	if ('undefined' === typeof player) {
		// Remove alias:

		if (!this.gameAliases.hasOwnProperty(alias)) return false;

		delete this.gameAliases[alias];
	}
	else {
		// Add alias:
		this.gameAliases[alias] = player;
	}

	return true;
};

/**
 * ### ChannelRegistry.lookupPlayer
 *
 * TODO: docs
 */
ChannelRegistry.prototype.lookupPlayer = function(player, room) {
	if ('undefined' !== room && this.roomAliases.hasOwnProperty(room) &&
			this.roomAliases[room][player]) {
				return this.lookupPlayer(this.roomAliases[room][player], room);
			}

	if (this.players.hasOwnProperty(player)) {
		return player;
	}

	if (this.gameAliases.hasOwnProperty(player)) {
		return this.lookupPlayer(this.gameAliases[player], room);
	}

	return null;
};

// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
