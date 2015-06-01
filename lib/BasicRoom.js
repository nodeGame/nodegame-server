/**
 * # BasicRoom
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Basic room representation
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = BasicRoom;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;

/**
 * ## verifyInput
 *
 * Sanity check for BasicRoom constructor parameters
 *
 * @param {object} config Configuration object
 *
 * @return {string} Returns a text representing an error, if found
 */
function verifyInput(config) {
    if ('object' !== typeof config) {
        return 'config must be object.';
    }
    if ('string' !== typeof config.group) {
        return 'config.group must be string.';
    }
    if ('string' !== typeof config.name) {
        return 'config.name must be string.';
    }
    if (config.clients && !(config.clients instanceof PlayerList)) {
        return 'config.clients must be PlayerList or undefined.';
    }
    if (config.logicPath && 'string' !== typeof config.logicPath) {
        return 'config.logicPath must be string or undefined.';
    }
    if ('object' !== typeof config.channel) {
        return 'config.channel must be object.';
    }
    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        return 'config.channel must be object.';
    }
    return;
}

var roomTypes = { 'Requirements': '', 'Game': '', 'Waiting': '' };


/**
 * ## BasicRoom constructor
 *
 * Creates a new instance of BasicRoom
 *
 * @param {object} config Initialization values for the BasicRoom object
 */
function BasicRoom(type, config) {
    var res;

    if (!(type in roomTypes)) {
        throw new Error('BasicRoom: unknown room type: ' + type + '.');
    }

    res = verifyInput(config);
    if (res) throw new TypeError(type + 'Room: ' + res);

    /**
     * ### BasicRoom.roomType
     *
     * Room type flag
     */
    this.roomType = type;

    /**
     * ### BasicRoom.name
     *
     * Name of the room
     */
    this.name = config.name;

    /**
     * ### BasicRoom.group
     *
     * The group to which the game room belongs
     */
    this.group = config.group;

    /**
     * ### BasicRoom.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel;

    /**
     * ### BasicRoom.clients
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

    // Importing initial clients, if any.
    if (config.clients && config.clients.length) {
        this.clients.importDB(config.clients);
    }

    /**
     * ### BasicRoom.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = config.logicPath;

    /**
     * ### BasicRoom.parentRoom
     *
     * Name of the room's parent or null
     */
    this.parentRoom = null;

    /**
     * ### BasicRoom.childRooms
     *
     * Names of the room's children
     */
    this.childRooms = config.childRooms || [];

    /**
     * ### BasicRoom.runtimeConf
     *
     * Extra configuration that can be accessed by the logic.
     */
    this.runtimeConf = config.runtimeConf || {};

    /**
     * ### BasicRoom.settings
     *
     * Settings for the actual game room (node instance)
     */
    this.settings = config.settings || {};

    /**
     * ### BasicRoom.node
     *
     * node instance
     */
    this.node = config.node || ngc.getClient();


    /**
     * ### BasicRoom.id
     *
     * Random global unique room identifier.
     *
     * @see ServerNode.rooms
     */
    this.id = null
}

// ## BasicRoom methods

/**
 * ## BasicRoom.registerRoom
 *
 * Creates a random unique id for the room and save a reference in servernode
 */
BasicRoom.prototype.registerRoom = function() {
    this.id = J.uniqueKey(this.channel.servernode.rooms);
    if (!this.id) {
        throw new TypeError(this.roomType + 'Room ' + this.name + ' failed ' +
                            'to generate random global unique identifier.');
    }
    // Register room globally.
    this.channel.servernode.rooms[this.id] = this;
};

/**
 * ### BasicRoom.setupGame
 *
 * Setups the logic game objectx
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Will override default settings of the game
 */
BasicRoom.prototype.setupGame = function(mixinConf) {
    var game, channel, node, room, settings, runtimeConf;

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError(this.roomType +
                            'Room.setupGame: mixinConf must be ' +
                            'object or undefined.');
    }
    node = this.node;
    channel = this.channel;
    settings = this.settings;
    runtimeConf = this.runtimeConf;
    room = this;

    game = require(this.logicPath)(settings, room, runtimeConf);

    if ('object' !== typeof game) {
        throw new Error(this.roomType + 'Room.setupGame: room ' + this.name +
                        ': logicPath did not return a valid game object.');
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
            socket: channel.adminServer.socketManager.sockets.direct
        });
        node.connect(null, {
            startingRoom: this.name,
            clientType:   'logic'
        });
    }
};


/**
 * ### BasicRoom.startGame
 *
 * Starts the game, optionally starts connected players
 *
 * @param {boolean} startPlayers If TRUE, sends a start command to all players.
 *   Default: False.
 */
BasicRoom.prototype.startGame = function(startPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStartable()) {
        this.channel.sysLogger.log(
            this.roomType + 'Room.startGame: game cannot be started.', 'warn');
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
 * ### BasicRoom.pauseGame
 *
 * Pauses the game, optionally pauses connected players
 *
 * @param {boolean} pausePlayers If TRUE, sends a pause command to all players.
 *   Default: False.
 */
BasicRoom.prototype.pauseGame = function(pausePlayers) {
    var node;
    node = this.node;

    if (!node.game.isPausable()) {
        this.channel.sysLogger.log(this.roomType +
                                   'Room.pauseGame: game cannot be paused.',
                                   'warn');
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
 * ### BasicRoom.resumeGame
 *
 * Resumes the game, optionally resumes connected players
 *
 * @param {boolean} resumePlayers If TRUE, sends a resume command to
 *   all players. Default: False.
 */
BasicRoom.prototype.resumeGame = function(resumePlayers) {
    var node;
    node = this.node;

    if (!node.game.isResumable()) {
        this.channel.sysLogger.log(this.roomType +
                                   'Room.resumeGame: game cannot be resumed.',
                                   'warn');
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
 * ### BasicRoom.stopGame
 *
 * Stops the game, optionally stops connected players
 *
 * @param {boolean} stopPlayers If TRUE, sends a stop command to all players.
 *   Default: False.
 */
BasicRoom.prototype.stopGame = function(stopPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStoppable()) {
        this.channel.sysLogger.log(this.roomType +
                                   'Room.stopGame: game cannot be stopped.',
                                   'warn');
        return;
    }

    node.game.stop();
    if (stopPlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('stop', p.id);
        });
    }
};
