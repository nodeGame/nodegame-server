/**
 * # GameRoom
 *
 * Data and utilities for game rooms
 *
 * ---
 */

// ## Global scope
module.exports = GameRoom;

var ngc = require('nodegame-client');

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
    if ('object' !== typeof config) {
        throw new TypeError('GameRoom: config parameter must be an object');
    }
    if ('string' !== typeof config.group) {
        throw new TypeError('GameRoom: config.group must be a string');
    }
    if ('string' !== typeof config.name) {
        throw new TypeError('GameRoom: config.name must be a string');
    }
    if (config.clients && !(config.clients instanceof PlayerList)) {
        throw new TypeError('GameRoom: config.clients must be a ' +
                            'PlayerList or undefined');
    }
    if ('string' !== typeof config.logicPath) {
        throw new TypeError('GameRoom: config.logicPath must be a string');
    }
    if ('object' !== typeof config.channel) {
        throw new TypeError('GameRoom: config.channel must be an object');
    }
    
    /**
     * ### GameRoom.name
     *
     * Name of the room
     */
    this.name = config.name;


    /**
     * ### GameRoom.group
     *
     * The group to which the game room belongs
     */
    this.name = config.name;

    /**
     * ### GameRoom.clients
     *
     * PlayerList containing players and admins inside the room
     */
    this.clients = new ngc.PlayerList();

    // Adding views to distinguish admins and players.
    // Note: this.node.player will be added to admins.
    this.clients.view('admin', function(p) { return p.admin ? p.id : undefined; });
    this.clients.view('player', function(p) { return !p.admin ? p.id : undefined; });

    // This does not work until NDDB creates all views also empty ones immediately
    //this.admins = this.clients.admin;
    //this.players = this.clients.players;

    // Importing initial clients, if any
    this.clients.importDB(config.clients);

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


    /**
     * ### GameRoom.node
     *
     * node instance
     */
    // TODO: Check config.node integrity
    this.node = config.node || ngc.getClient();
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
    var game, channel, node, room;

    node = this.node;
    channel = this.channel;
    room = this;
    
    // Alternative 1
    // game = channel.require(this.logicPath, { node: node });
    
    // Alternative 2
    game = require(this.logicPath)(node, channel);
    
    // Alternative 3
    // game = require(this.logicPath);

    
    node.socket.setSocketType('SocketDirect', {
        socket: channel.admin.socket.sockets.direct
    });

    // Setup must be called before connect.
    node.setup('nodegame', game);
    
    node.connect();
    

    //node.on('PLAYER_CREATED', function(player) {
    // Aren't already set?
    //    node.setup('plot', game.plot);
     //   node.setup('game_metadata', game.game_metadata);
     //   node.setup('game_settings', game.game_settings);
        //node.setup('plist', game.plist);

        // We need to add the logic to a room as well.
        console.log('AAAAAAAAAAAAA');
        node.game.start();

        if (startClients) {
            // TODO
        }
    //});
};
