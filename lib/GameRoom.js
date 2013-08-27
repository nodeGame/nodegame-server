/**
 * # GameRoom
 *
 * Data and utilities for game rooms
 *
 * ---
 */

// ## Global scope
module.exports = GameRoom;

var PlayerList = require('nodegame-client').PlayerList;


/**
 * ## GameRoom constructor
 *
 * Creates a new instance of GameRoom
 *
 * @param {object} config Initialization values for the GameRoom object
 *  (see documentation of fields in constructor)
 */
function GameRoom(config) {
    // Check for proper config parameter:
    if ('object' !== (typeof config) ||
            'string' !== (typeof config.name) ||
            'object' !== (typeof config.logic) ||
            'object' !== (typeof config.channel)) {
        throw new TypeError('GameRoom: invalid config parameter');
    }

    /**
     * ### GameRoom.name
     *
     * Name of the room
     */
    this.name = config.name;

    /**
     * ### GameRoom.playerList
     *
     * PlayerList containing players inside the room
     */
    this.playerList = config.playerList || new PlayerList();

    /**
     * ### GameRoom.logic
     *
     * Game logic for the room
     */
    this.logic = config.logic;

    /**
     * ### GameRoom.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel;

    /**
     * ### GameRoom.parentRoom
     *
     * Name of the room's parent or null
     */
    this.parentRoom = config.parentRoom || null;

    /**
     * ### GameRoom.childRooms
     *
     * Names of the room's children
     */
    this.childRooms = config.childRooms || [];

    /**
     * ### GameRoom.options
     *
     * Miscellaneous options
     */
    this.options = config.options || {};

    /**
     * ### GameRoom.node
     *
     * node instance
     */
    this.node = require('nodegame-client');
}


// ## GameRoom methods

/**
 * ### GameRoom.startGame
 *
 * Starts the game, optionally starts connected clients
 *
 * @param {boolean} startGame Whether to send 'start' request to clients.
 *   Default: False.
 */
GameRoom.prototype.startGame = function(startClients) {
    this.node.game.start();

    if (startClients) {
        // TODO
    }
};
