/**
 * # GameRoom
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Game room representation.
 * ---
 */

// ## Global scope
module.exports = GameRoom;

var ngc = require('nodegame-client');

var J = require('JSUS').JSUS;

/**
 * ## GameRoom constructor
 *
 * Creates a new instance of GameRoom
 *
 * The constructor registers the room globally creating a unique random id
 * within the whole _ServerNode_.
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
    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
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
    this.group = config.group;

    /**
     * ### GameRoom.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel;

    /**
     * ### GameRoom.id
     *
     * Random global unique room identifier.
     *
     * @see ServerNode.rooms
     */
    this.id = J.uniqueKey(this.channel.servernode.rooms);
    
    if (!this.id) {
        throw new TypeError('GameRoom ' + config.name + ' failed to generate ' +
                           'random global unique identifier.');
    }

    // Register room globally.
    this.channel.servernode.rooms[this.id] = this;
    
    /**
     * ### GameRoom.clients
     *
     * PlayerList containing players and admins inside the room
     */
    this.clients = new ngc.PlayerList();

    // Adding views to distinguish admins and players.
    // Note: this.node.player will be added to admins.
    this.clients.view('admin', function(p) { 
        return p.admin ? p.id : undefined;
    });
    this.clients.view('player', function(p) {
        return !p.admin ? p.id : undefined;
    });

    // Importing initial clients, if any
    this.clients.importDB(config.clients);

    /**
     * ### GameRoom.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = config.logicPath;

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
     * ### GameRoom.runtimeConf
     *
     * Extra configuration that can be accessed by the logic.
     */
    this.runtimeConf = config.runtimeConf || {};

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
 * Starts the game, optionally starts connected clients (not yet implemented)
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Will override settings from the required file.
 * @param {boolean} startGame Whether to send 'start' request to clients.
 *   Default: False.
 * @param {string} treatmentName The name of the treatment with which to start
 *   the game.
 * @param {object} settings Options corresponding to the chosen treatment.
 *   TODO: Remove parameter and get the options from ServerNode.
 */
GameRoom.prototype.startGame = function(mixinConf, startClients, treatmentName, settings) {
    var game, channel, node, room;

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError('GameRoom.startGame: mixinConf must be object or ' +
                            'undefined.');
    }
    node = this.node;
    channel = this.channel;
    room = this;
   
    // Alternative 1
    // game = channel.require(this.logicPath, { node: node });
    
    // Alternative 2
    game = require(this.logicPath)(node, channel, this, treatmentName, settings);
    
    // Alternative 3
    // game = require(this.logicPath);

   // Mixin-in nodeGame options.
    node.socket.setSocketType('SocketDirect', {
        socket: channel.admin.socket.sockets.direct
    });

    if (mixinConf) {
        J.mixin(game, mixinConf);
    }

    // Setup must be called before connect.
    node.setup('nodegame', game);

    function startCb() {
        node.game.start();
            
        if (startClients) {
            // TODO
        }
    };

    node.connect(null, startCb, { 
        startingRoom: this.name
    });    
};
