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
    config = config || {};

    /**
     * ### GameRoom.name
     *
     * Name of the room
     */
    this.name = config.name || "";

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
    this.logic = config.logic || {};

    /**
     * ### GameRoom.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel || null;

    /**
     * ### GameRoom.parentRoom
     *
     * Name of the room's parent
     */
    this.parentRoom = config.parentRoom || "";

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
 * @param {boolean} startGame Whether to send 'start' request to clietns
 */
GameRoom.prototype.startGame = function(startClients) {
    // TODO
};
