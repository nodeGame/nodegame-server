/**
 * # GameRoom
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Game room representation
 *
 * TODO: there is a big overlap with WaitingRoom. See if they can merge.
 */

"use strict";

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
        throw new TypeError('GameRoom: config.treatmentName must be ' +
                            'undefined or string.');
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
     * ### GameRoom.gamePaths
     *
     * Game paths for the room
     */
    this.gamePaths = this.game.treatments[this.treatmentName].gamePaths;

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

    // Importing initial clients, if any.
    if (config.clients && config.clients.length) {
        this.clients.importDB(config.clients);
    }

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
     * Extra configuration that will mixed in to the treatment settings.
     *
     * Unlike the _mixinConf_ parameter of the _setupGame_ method, _runtimeConf_
     * options are merged before requiring the logic or client file.
     *
     * @see GameRoom.setupGame
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

// ## GameRoom static functions

/**
 * ### GameRoom.checkParams
 *
 * Type-check the parameters given to setup/start/pause/resume/stopGame
 *
 * @param {boolean} doLogic If TRUE, sends a command to the logic as well
 * @param {array|string} clientList List of client IDs to which to send the
 *   command, or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins).
 * @param {boolean} force If TRUE, skip the check
 *
 * @return {null|string} NULL for valid parameters, error string for bad ones.
 */
GameRoom.checkParams = function(doLogic, clientList, force) {
    if ('boolean' !== typeof doLogic && 'undefined' !== typeof doLogic) {
        return 'doLogic must be boolean or undefined';
    }

    if (!J.isArray(clientList) &&
        ('string' !== typeof clientList ||
         (clientList !== 'all' &&
          clientList !== 'players' &&
          clientList !== 'admins')) &&
        'undefined' !== typeof clientList) {

        return "clientList must be array, 'all', 'players', 'admins' " +
               'or undefined';
    }

    if ('boolean' !== typeof force && 'undefined' !== typeof force) {
        return 'force must be boolean or undefined';
    }

    return null;
};

// ## GameRoom methods

/**
 * ### GameRoom.sendRemoteCommand
 *
 * Utility method for sending a remote command to given recipients
 *
 * @param {string} command The command to send
 * @param {array|string} clientList List of client IDs to which to send the
 *   command, or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins)
 *
 * @private
 */
GameRoom.prototype.sendRemoteCommand = function(command, clientList) {
    var node;
    node = this.node;

    // TODO: Don't send to logic!
    if (J.isArray(clientList)) {
        node.remoteCommand(command, clientList);
    }
    else {
        if (clientList === 'all' || clientList === 'players') {
            this.clients.player.each(function(p) {
                node.remoteCommand(command, p.id);
            });
        }

        if (clientList === 'all' || clientList === 'admins') {
            this.clients.admin.each(function(p) {
                node.remoteCommand(command, p.id);
            });
        }
    }
};

/**
 * ### GameRoom.setupGame
 *
 * Setups logic and clients in the room
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Overrides the returned game configuration from the
 *   require statement.
 * @param {boolean} doLogic Optional. If TRUE, sets up the logic as well.
 *   Default: TRUE.
 * @param {array|string} clientList Optional. List of client IDs to set up,
 *   or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins).
 *   Default: 'players'.
 * @param {boolean} force Optional. If TRUE, skip the check. Default: FALSE.
 *
 * @see GameRoom.runtimeConf
 */
GameRoom.prototype.setupGame = function(mixinConf, doLogic, clientList, force) {
    var game, botGame, channel, node, gameNode, that, settings;
    var i, clientId, clientObj, type;
    var rc;

    node = this.node;
    channel = this.channel;
    that = this;

    // Check parameters.
    rc = GameRoom.checkParams(doLogic, clientList, force);
    if (rc !== null) throw new TypeError('GameRoom.setupGame: ' + rc + '.');

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError('GameRoom.setupGame: mixinConf must be object or ' +
                            'undefined.');
    }

    if ('undefined' !== typeof clientList &&
        !J.isArray(clientList) &&
        clientList !== 'all' &&
        clientList !== 'players' &&
        clientList !== 'admins') {

        throw new TypeError("GameRoom.setupGame: clientList must be " +
                            "undefined, array, or one of 'all', 'players' " +
                            " or 'admins'");
    }

    // Apply defaults.
    if ('undefined' === typeof doLogic)    doLogic    = true;
    if ('undefined' === typeof clientList) clientList = 'players';
    if ('undefined' === typeof force)      force      = false;

    settings = this.game.treatments[this.treatmentName];

    if (this.runtimeConf) {
        J.mixin(settings, this.runtimeConf);
    }

    // Set up logic.
    if (doLogic) {
        // Require Logic.
        game = require(this.gamePaths.logic)(
                node, channel, this, this.treatmentName, settings);

        if ('object' !== typeof game) {
            throw new Error('GameRoom.setupGame: room ' + this.name +
                            '. logicPath did not return a valid game object.');
        }

        // Mixin-in nodeGame options.
        if (mixinConf) {
            J.mixin(game, mixinConf);
        }

        // Stop logic if necessary.
        if (node.game.isStoppable()) {
            node.game.stop();
        }

        // Setup must be called before connect.
        node.setup('nodegame', game);

        // Connect logic to server, if not already connected. E.g., after a stop
        // command it is generally still connected. Or the node object can be
        // passed in the constructor and be already connected.
        if (!node.socket.isConnected()) {
            node.socket.setSocketType('SocketDirect', {
                socket: channel.admin.socketManager.sockets.direct
            });
            node.connect(null, {
                startingRoom: this.name,
                clientType:   'logic'
            });
        }
    }

    // Resolve special values of clientList.
    if ('string' === typeof clientList) {
        switch (clientList) {
        case 'all':
            clientList = this.clients.id.getAllKeys();
            break;

        case 'players':
            clientList = this.clients.player.id.getAllKeys();
            break;

        case 'admins':
            clientList = this.clients.admin.id.getAllKeys();
            break;
        }
    }
    // At this point clientList should be an array of client IDs.

    // Setup all given clients.
    for (i in clientList) {
        if (clientList.hasOwnProperty(i)) {
            clientId = clientList[i];
            try {
                clientObj = this.clients.get(clientId);
            }
            catch (e) {
                this.channel.sysLogger.log(
                        "GameRoom.setupGame: no client with id '" +
                        clientId + "'", 'warn');
                continue;
            }
            type = clientObj.clientType;

            // Clear the state of the client with 'stop'.
            node.remoteCommand('stop', clientId);

            // Require the game.
            if (!this.gamePaths.hasOwnProperty(type)) {
                throw new Error("GameRoom.setupGame: no path defined for " +
                        "client type '" + type + "'.");
            }
            gameNode = this.channel.bots[clientId];
            game = require(this.gamePaths[type])(
                    this, this.treatmentName, settings, gameNode);
            if ('object' !== typeof game) {
                throw new Error('GameRoom.setupGame: room ' + this.name +
                        '. playerPath did not return a valid game object.');
            }

            // Setup the client.
            if (gameNode) {
                // Can't remoteSetup here because serializing the plot methods
                // would make them lose their context (node etc.).
                gameNode.setup('nodegame', game);
            }
            else {
                node.remoteSetup('nodegame', clientId, game);
            }
        }
    }
};

/**
 * ### GameRoom.startGame
 *
 * Starts the game for the logic and/or other clients
 *
 * @param {boolean} doLogic Optional. If TRUE, sends a start command to the
 *   logic as well. Default: TRUE.
 * @param {array|string} clientList Optional. List of client IDs to which to
 *   send the start command, or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins).
 *   Default: 'all'.
 * @param {boolean} force Optional. If TRUE, skip the startable check.
 *   Default: FALSE.
 */
GameRoom.prototype.startGame = function(doLogic, clientList, force) {
    var node;
    var rc;

    node = this.node;

    // Check parameters.
    rc = GameRoom.checkParams(doLogic, clientList, force);
    if (rc !== null) throw new TypeError('GameRoom.startGame: ' + rc + '.');

    // Apply defaults.
    if ('undefined' === typeof doLogic)    doLogic    = true;
    if ('undefined' === typeof clientList) clientList = 'all';
    if ('undefined' === typeof force)      force      = false;

    // Check startability.
    if (!force && !node.game.isStartable()) {
        this.channel.sysLogger.log(
            'GameRoom.startGame: game cannot be started.', 'warn');
        return;
    }

    // Start.
    if (doLogic) {
        node.game.start();
    }
    this.sendRemoteCommand('start', clientList);
};

/**
 * ### GameRoom.pauseGame
 *
 * Pauses the game for the logic and/or other clients
 *
 * @param {boolean} doLogic Optional. If TRUE, sends a pause command to the
 *   logic as well. Default: TRUE.
 * @param {array|string} clientList Optional. List of client IDs to which to
 *   send the pause command, or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins).
 *   Default: 'all'.
 * @param {boolean} force Optional. If TRUE, skip the pauseable check.
 *   Default: FALSE.
 */
GameRoom.prototype.pauseGame = function(doLogic, clientList, force) {
    var node;
    var rc;

    node = this.node;

    // Check parameters.
    rc = GameRoom.checkParams(doLogic, clientList, force);
    if (rc !== null) throw new TypeError('GameRoom.pauseGame: ' + rc + '.');

    // Apply defaults.
    if ('undefined' === typeof doLogic)    doLogic    = true;
    if ('undefined' === typeof clientList) clientList = 'all';
    if ('undefined' === typeof force)      force      = false;

    // Check pausability.
    if (!force && !node.game.isPausable()) {
        this.channel.sysLogger.log(
            'GameRoom.pauseGame: game cannot be paused.', 'warn');
        return;
    }

    // Pause.
    if (doLogic) {
        node.game.pause();
    }
    this.sendRemoteCommand('pause', clientList);
};

/**
 * ### GameRoom.resumeGame
 *
 * Resumes the game for the logic and/or other clients
 *
 * @param {boolean} doLogic Optional. If TRUE, sends a resume command to the
 *   logic as well. Default: TRUE.
 * @param {array|string} clientList Optional. List of client IDs to which to
 *   send the resume command, or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins).
 *   Default: 'all'.
 * @param {boolean} force Optional. If TRUE, skip the resumeable check.
 *   Default: FALSE.
 */
GameRoom.prototype.resumeGame = function(doLogic, clientList, force) {
    var node;
    var rc;

    node = this.node;

    // Check parameters.
    rc = GameRoom.checkParams(doLogic, clientList, force);
    if (rc !== null) throw new TypeError('GameRoom.resumeGame: ' + rc + '.');

    // Apply defaults.
    if ('undefined' === typeof doLogic)    doLogic    = true;
    if ('undefined' === typeof clientList) clientList = 'all';
    if ('undefined' === typeof force)      force      = false;

    // Check resumability.
    if (!force && !node.game.isResumable()) {
        this.channel.sysLogger.log(
            'GameRoom.resumeGame: game cannot be resumed.', 'warn');
        return;
    }

    // Resume.
    if (doLogic) {
        node.game.resume();
    }
    this.sendRemoteCommand('resume', clientList);
};

/**
 * ### GameRoom.stopGame
 *
 * Stops the game for the logic and/or other clients
 *
 * @param {boolean} doLogic Optional. If TRUE, sends a stop command to the logic
 *   as well. Default: TRUE.
 * @param {array|string} clientList Optional. List of client IDs to which to
 *   send the stop command, or one of the following strings:
 *   'all' (all clients), 'players' (all players), 'admins' (all admins).
 *   Default: 'all'.
 * @param {boolean} force Optional. If TRUE, skip the stopable check.
 *   Default: FALSE.
 */
GameRoom.prototype.stopGame = function(doLogic, clientList, force) {
    var node;
    var rc;

    node = this.node;

    // Check parameters.
    rc = GameRoom.checkParams(doLogic, clientList, force);
    if (rc !== null) throw new TypeError('GameRoom.stopGame: ' + rc + '.');

    // Apply defaults.
    if ('undefined' === typeof doLogic)    doLogic    = true;
    if ('undefined' === typeof clientList) clientList = 'all';
    if ('undefined' === typeof force)      force      = false;

    // Check stoppability.
    if (!force && !node.game.isStoppable()) {
        this.channel.sysLogger.log(
            'GameRoom.stopGame: game cannot be stopped.', 'warn');
        return;
    }

    // Stop.
    if (doLogic) {
        node.game.stop();
    }
    this.sendRemoteCommand('stop', clientList);
};
