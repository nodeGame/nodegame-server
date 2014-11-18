/**
 * # WaitingRoom
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Waiting room representation
 *
 * TODO: there is a big overlap with GameRoom. See if they can merge.
 */

"use strict";

// ## Global scope
module.exports = WaitingRoom;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;

/**
 * ## WaitingRoom constructor
 *
 * Creates a new instance of WaitingRoom
 *
 * The constructor registers the room globally creating a unique random id
 * within the whole _ServerNode_.
 *
 * @param {object} config Initialization values for the WaitingRoom object
 *  (see documentation of fields in constructor)
 */
function WaitingRoom(config) {
    // Check for proper config parameter:
    if ('object' !== typeof config) {
        throw new TypeError('WaitingRoom: config parameter must be an object');
    }
    if ('string' !== typeof config.group) {
        throw new TypeError('WaitingRoom: config.group must be a string');
    }
    if ('string' !== typeof config.name) {
        throw new TypeError('WaitingRoom: config.name must be a string');
    }
    if (config.clients && !(config.clients instanceof PlayerList)) {
        throw new TypeError('WaitingRoom: config.clients must be a ' +
                            'PlayerList or undefined');
    }
    if ('string' !== typeof config.logicPath) {
        throw new TypeError('WaitingRoom: config.logicPath must be a string');
    }
    if ('object' !== typeof config.channel) {
        throw new TypeError('WaitingRoom: config.channel must be an object');
    }
    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        throw new TypeError('WaitingRoom: config.channel must be an object');
    }

    /**
     * ### WaitingRoom.waitingRoom
     *
     * Flag to distinguish game rooms from waiting rooms
     */
    this.waitingRoom = true;

    /**
     * ### WaitingRoom.name
     *
     * Name of the room
     */
    this.name = config.name;

    /**
     * ### WaitingRoom.group
     *
     * The group to which the game room belongs
     */
    this.group = config.group;

    /**
     * ### WaitingRoom.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel;

    /**
     * ### WaitingRoom.id
     *
     * Random global unique room identifier.
     *
     * @see ServerNode.rooms
     */
    this.id = J.uniqueKey(this.channel.servernode.rooms);

    if (!this.id) {
        throw new TypeError('WaitingRoom ' + config.name + ' failed to ' +
                            'generate random global unique identifier.');
    }

    // Register room globally.
    this.channel.servernode.rooms[this.id] = this;

    /**
     * ### WaitingRoom.clients
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
     * ### WaitingRoom.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = config.logicPath;

    /**
     * ### WaitingRoom.parentRoom
     *
     * Name of the room's parent or null
     */
    this.parentRoom = config.parentRoom || null;

    /**
     * ### WaitingRoom.childRooms
     *
     * Names of the room's children
     */
    this.childRooms = config.childRooms || [];

    /**
     * ### WaitingRoom.runtimeConf
     *
     * Extra configuration that can be accessed by the logic.
     */
    this.runtimeConf = config.runtimeConf || {};

    /**
     * ### WaitingRoom.options
     *
     * Miscellaneous options
     */
    this.options = config.options || {};

    /**
     * ### WaitingRoom.node
     *
     * node instance
     */
    this.node = config.node || ngc.getClient();
}

// ## WaitingRoom methods

/**
 * ### WaitingRoom.setupGame
 *
 * Setups the logic game objectx
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Will override default settings of the game
 */
WaitingRoom.prototype.setupGame = function(mixinConf) {
    var game, channel, node, room;

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError('WaitingRoom.setupGame: mixinConf must be ' +
                            'object or undefined.');
    }
    node = this.node;
    channel = this.channel;
    room = this;

    game = require(this.logicPath)(node, channel, this, this.runtimeConf);

    if ('object' !== typeof game) {
        throw new Error('WaitingRoom.setupGame: room ' + this.name +
                        '. logicPath did not return a valid game object.');
    }

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
        // Mixin-in nodeGame options.
        node.socket.setSocketType('SocketDirect', {
            socket: channel.admin.socket.sockets.direct
        });
        node.connect(null, {
            startingRoom: this.name,
            clientType:   'logic'
        });
    }
};


/**
 * ### WaitingRoom.startGame
 *
 * Starts the game, optionally starts connected players
 *
 * @param {boolean} startPlayers If TRUE, sends a start command to all players.
 *   Default: False.
 */
WaitingRoom.prototype.startGame = function(startPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStartable()) {
        this.channel.sysLogger.log(
            'WaitingRoom.startGame: game cannot be started.', 'warn');
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
 * ### WaitingRoom.pauseGame
 *
 * Pauses the game, optionally pauses connected players
 *
 * @param {boolean} pausePlayers If TRUE, sends a pause command to all players.
 *   Default: False.
 */
WaitingRoom.prototype.pauseGame = function(pausePlayers) {
    var node;
    node = this.node;

    if (!node.game.isPausable()) {
        this.channel.sysLogger.log(
                'WaitingRoom.pauseGame: game cannot be paused.', 'warn');
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
 * ### WaitingRoom.resumeGame
 *
 * Resumes the game, optionally resumes connected players
 *
 * @param {boolean} resumePlayers If TRUE, sends a resume command to
 *   all players. Default: False.
 */
WaitingRoom.prototype.resumeGame = function(resumePlayers) {
    var node;
    node = this.node;

    if (!node.game.isResumable()) {
        this.channel.sysLogger.log(
                'WaitingRoom.resumeGame: game cannot be resumed.', 'warn');
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
 * ### WaitingRoom.stopGame
 *
 * Stops the game, optionally stops connected players
 *
 * @param {boolean} stopPlayers If TRUE, sends a stop command to all players.
 *   Default: False.
 */
WaitingRoom.prototype.stopGame = function(stopPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStoppable()) {
        this.channel.sysLogger.log(
                'WaitingRoom.stopGame: game cannot be stopped.', 'warn');
        return;
    }

    node.game.stop();
    if (stopPlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('stop', p.id);
        });
    }
};
