/**
 * # GameRoom
 *
 * Data and utilities for game rooms
 *
 * ---
 */

// ## Global scope
module.exports = GameRoom;


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
    if ('object' !== typeof config ||
            'string' !== typeof config.name ||
            'string' !== typeof config.logicPath ||
            'object' !== typeof config.channel) {
        throw new TypeError('GameRoom: invalid config parameter');
    }

    /**
     * ### GameRoom.node
     *
     * node instance
     */
    // TODO: Check config.node integrity
    this.node = config.node || require('nodegame-client');

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
    this.playerList = config.playerList || new this.node.PlayerList();

    /**
     * ### GameRoom.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = config.logicPath;

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
}


// ## GameRoom methods

/**
 * ### GameRoom.startGame
 *
 * Starts the game, optionally starts connected clients
 *
 * @param { ...
 * @param {boolean} startGame Whether to send 'start' request to clients.
 *   Default: False.
 */
GameRoom.prototype.startGame = function(startClients) {
    var game = this.channel.require(this.logicPath, { node: this.node });

    this.node.setup('plot', game.plot);
    this.node.setup('game_metadata', game.game_metadata);
    this.node.setup('game_settings', game.game_settings);
    this.node.setup('plist', game.plist);

    this.node.game.start();

    if (startClients) {
        // TODO
    }
};
