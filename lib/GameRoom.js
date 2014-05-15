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
        throw new TypeError('GameRoom: config parameter must be object.');
    }
    if ('string' !== typeof config.group) {
        throw new TypeError('GameRoom: config.group must be string.');
    }
    if ('string' !== typeof config.name) {
        throw new TypeError('GameRoom: config.name must be string.');
    }
    if (config.clients && !(config.clients instanceof PlayerList)) {
        throw new TypeError('GameRoom: config.clients must be ' +
                            'PlayerList or undefined.');
    }
    if ('object' !== typeof config.channel) {
        throw new TypeError('GameRoom: config.channel must be object.');
    }

    if ('string' !== typeof config.gameName) {
        throw new TypeError('GameRoom: config.gameName must be string.');
    }

    if (config.treatmentName && 'string' !== typeof config.treatmentName) {
        throw new TypeError('GameRoom: config.treatmentName must be undefined ' +
                            'or string.');
    }

    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        throw new TypeError('GameRoom: config.channel must be object.');
    }

    if (config.node && 'object' !== typeof config.node) {
        throw new TypeError('GameRoom: config.node must be object.');
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

    // Try to fetch game or game logic

    /**
     * ### GameRoom.gameName
     *
     * The name of the game played in this room
     */
    this.gameName = config.gameName;

    /**
     * ### GameRoom.treatmentName
     *
     * The name of the game played in this room, or null if not defined.
     */
    this.treatmentName = config.treatmentName || 'standard';

    /**
     * ### GameRoom.game
     *
     * Reference to the game info object contained in servernode
     */
    this.game = this.channel.servernode.getGamesInfo(this.gameName);

    if (!this.game) {
        throw new Error('GameRoom: game not found: ' + this.gameName + '.');
    }

    if (!this.game.treatments[this.treatmentName]) {
        throw new Error('GameRoom: game ' + this.gameName + ' treatment ' +
                        'not found: ' + this.treatmentName + '.');
    }

    /**
     * ### GameRoom.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = this.game.treatments[this.treatmentName].logicPath;

    /**
     * ### GameRoom.clientPath
     *
     * Game client path for the room, or null if not defined.
     */
    this.clientPath = this.game.treatments[this.treatmentName].clientPath;

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
    this.node = config.node || ngc.getClient();



    // Everything in order, register room globally.
    this.channel.servernode.rooms[this.id] = this;
}

// ## GameRoom methods

/**
 * ### GameRoom.setupGame
 *
 * Setups logic and clients in the room
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Will override default settings of the game
 */
GameRoom.prototype.setupGame = function(mixinConf) {
    var game, channel, node, room;
    var settings;

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError('GameRoom.setupGame: mixinConf must be object or ' +
                            'undefined.');
    }
    node = this.node;
    channel = this.channel;
    room = this;

    // TODO: see if we need to modify this object.
    settings = this.game.treatments[this.treatmentName];

    // Require Logic.
    game = require(this.logicPath)(node, channel, this, this.treatmentName,
                                   settings);
    // Mixin-in nodeGame options.
    if (mixinConf) {
        J.mixin(game, mixinConf);
    }

    // Setup must be called before connect.
    node.setup('nodegame', game);

    // Connect logic to server, if not already connected. E.g., after a stop
    // command it is generally still connected. Or the node object can be
    // passed in the constructor and be already connected.
    if (!node.socket.isConnected()) {        
        node.socket.setSocketType('SocketDirect', {
            socket: channel.admin.socket.sockets.direct
        });
        node.connect(null, null, { startingRoom: this.name });
    }

    // Require Client.
    game = require(this.clientPath)(this, this.treatmentName, settings);

    this.clients.player.each(function(p) {
        // Clears the state of the clients.
        node.remoteCommand('stop', p.id);
        // Setting the actual game.
        node.remoteSetup('nodegame', p.id, game);
    });
};

/**
 * ### GameRoom.startGame
 *
 * Starts the game, optionally starts connected players
 *
 * @param {boolean} startPlayers If TRUE, sends a start command to all players.
 *   Default: False.
 */
GameRoom.prototype.startGame = function(startPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStartable()) {
        this.channel.sysLogger.log(
            'GameRoom.startGame: game cannot be started.', 'warn');
        return;
    }

    node.game.start();
    if (startPlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('start', p.id);            
        });
    }       
};

/**
 * ### GameRoom.pauseGame
 *
 * Pauses the game, optionally pauses connected players
 *
 * @param {boolean} pausePlayers If TRUE, sends a pause command to all players.
 *   Default: False.
 */
GameRoom.prototype.pauseGame = function(pausePlayers) {
    var node;
    node = this.node;

    if (!node.game.isPausable()) {
        this.channel.sysLogger.log(
                'GameRoom.pauseGame: game cannot be paused.', 'warn');
        return;
    }

    node.game.pause();
    if (pausePlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('pause', p.id);            
        });
    }       
};

/**
 * ### GameRoom.resumeGame
 *
 * Resumes the game, optionally resumes connected players
 *
 * @param {boolean} resumePlayers If TRUE, sends a resume command to all players.
 *   Default: False.
 */
GameRoom.prototype.resumeGame = function(resumePlayers) {
    var node;
    node = this.node;

    if (!node.game.isResumable()) {
        this.channel.sysLogger.log(
                'GameRoom.resumeGame: game cannot be resumed.', 'warn');
        return;
    }

    node.game.resume();
    if (resumePlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('resume', p.id);            
        });
    }       
};

/**
 * ### GameRoom.stopGame
 *
 * Stops the game, optionally stops connected players
 *
 * @param {boolean} stopPlayers If TRUE, sends a stop command to all players.
 *   Default: False.
 */
GameRoom.prototype.stopGame = function(stopPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStoppable()) {
        this.channel.sysLogger.log(
                'GameRoom.stopGame: game cannot be stopped.', 'warn');
        return;
    }

    node.game.stop();
    if (stopPlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('stop', p.id);            
        });
    }       
};
