/**
 * # Game Room
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Game room representation
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = GameRoom;

var ngc = require('nodegame-client');
var Stager = ngc.Stager;
var GameStage = ngc.GameStage;
var stepRules = ngc.stepRules;
var publishLevels = ngc.constants.publishLevels;

var J = require('JSUS').JSUS;

var Room = require('./Room');

GameRoom.prototype.__proto__ = Room.prototype;
GameRoom.prototype.constructor = GameRoom;

/**
 * ## GameRoom constructor
 *
 * Creates a new game room
 *
 * @param {object} config Configuration options
 *
 * @see Room
 */
function GameRoom(config) {
    var that, node;

    Room.call(this, 'Game', config);
    if (!this.logicPath) this.logicPath  = './rooms/game.room';

    if (config.treatmentName && 'string' !== typeof config.treatmentName) {
        throw new TypeError('GameRoom: config.treatmentName must be ' +
                            'undefined or string.');
    }

    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        throw new TypeError('GameRoom: config.runtimeConf must be object.');
    }

    /**
     * ### GameRoom.treatmentName
     *
     * The name of the game played in this room, or 'standard' if not defined.
     */
    this.treatmentName = config.treatmentName || 'standard';

    if (!this.game.settings[this.treatmentName]) {
        throw new Error('GameRoom: game ' + this.gameName + ' treatment ' +
                        'not found: ' + this.treatmentName + '.');
    }

    /**
     * ### GameRoom.gameLevel
     *
     * Game paths for the room
     */
    this.gameLevel = config.gameLevel;

    if (this.gameLevel && !this.game.levels[this.gameLevel]) {
        throw new Error('GameRoom: game ' + this.gameName + ' game level ' +
                        'not found: ' + this.gameLevel + '.');
    }

    /**
     * ### GameRoom.gamePaths
     *
     * Game paths for the room
     */
    this.clientTypes = this.gameLevel ?
        this.game.levels[this.gameLevel].clientTypes :
        this.game.clientTypes;

    /**
     * ### GameRoom.gameTreatment
     *
     * Actual settings for current game based on treatment and runtime conf
     *
     * @see GameRoom.runtimeConf
     * @see GameRoom.setupGame
     */
    this.gameTreatment = this.game.settings[this.treatmentName];
    if (this.runtimeConf) J.mixin(this.gameTreatment, this.runtimeConf);


    /**
     * ### GameRoom.countdown
     *
     * Timeout handled by
     *
     */
    // Configure disconnect/reconnect policy.
    that = this;
    node = this.node;

    /**
     * ## GameRoom.wrongNumOfPlayers
     *
     * Default listener for `onWronPlayerNum` on logics
     *
     * This listener is added as default stager property `onWrongPlayerNum`
     * to all `logic` client types by method `GameRoom.getClientType`,
     * if no other is already defined.
     *
     * The listener is invoked when there is a "wrong" number of players.
     * The number of players is "wrong" if it has been defined any
     * min|max|exactPlayers property in current game step.
     *
     * Default behavior:
     *
     * 1 - Immediately pauses all connected players. A message is displayed
     *     with information.
     * 2 - A timer is started for the value specified in settings.WAIT_TIME,
     *     or 30 seconds otherwise.
     * 3 - If timer expires, game is resumed and, if a custom callback is
     *     is defined, it is executed.
     *
     * The listener is then invoked with `node.game` context.
     *
     * @param {string} type The type of "wrong" number: 'min', 'max', 'exact'
     * @param {function} customCb Optional. A callback to be executed in
     *     in case the timer expires.
     * @param {object} player Optional. The player object that triggered
     *     the listener by either connecting or disconnecting (if available)
     *
     * @see GameRoom.correctNumOfPlayersAgain
     * @see GameRoom.getClientType
     */
    this.wrongNumOfPlayers = function(type, customCb, player) {
        var node;
        var waitTime, disconnectStr;
        node = this.node;

        if (type === 'min') {
            node.warn('warning: not enough players!!');
        }
        else if (type === 'max') {
            node.warn('warning: too many players!!');
        }
        else {
            node.warn('warning: wrong number of players!!');
        }

        waitTime = 'number' === typeof this.settings.WAIT_TIME ?
            this.settings.WAIT_TIME : 30;

        disconnectStr = this.settings.WAIT_TIME_TEXT ||
            'One or more players disconnected. If they ' +
            'do not reconnect within ' + waitTime  +
            ' seconds the game will be terminated.';

        // Pause connected players.
        node.remoteCommand('pause', 'ROOM', disconnectStr);
        node.game.pause();

        that.countdown = setTimeout(function() {
            node.warn('Disconnection Countdown fired: ' + node.nodename);
            node.remoteCommand('resume', 'ROOM');
            node.game.resume();
            if (customCb) customCb.call(node.game, player);

        }, waitTime * 1000);
    };

    /**
     * ## GameRoom.correctNumOfPlayersAgain
     *
     * Listener invoked at any time the correct number of players is recovered
     *
     * The number of players is "wrong" if it has been defined any
     * min|max|exactPlayers property in current game step.
     *
     * Default behavior:
     *
     * 1 - Immediately resumes all connected players that have been
     *     paused by callback `wrongNumOfPlayers`
     * 2 - The timer defined by `wrongNumOfPlayers` is cleared
     * 3 - If any custom callback was defined, it gets executed
     *
     * This listener is added as default stager property `onCorrectPlayerNum`
     * to all `logic` client types by method `GameRoom.getClientType`,
     * if no othe is already defined.
     *
     * The listener is then invoked with `node.game` context.
     *
     * @param {string} type The type of "wrong" number: 'min', 'max', 'exact'
     * @param {function} customCb Optional. A callback to be executed in
     *     in case the timer expires.
     * @param {object} player Optional. The player object that triggered
     *     the listener by either connecting or disconnecting (if available)
     *
     * @see GameRoom.wrongNumOfPlayers
     * @see GameRoom.getClientType
     */
    this.correctNumOfPlayersAgain = function(type, customCb, player) {
        var node;
        node = this.node;
        if (type === 'min') {
            node.warn('warning: enough players again!!');
        }
        else if (type === 'max') {
            node.warn('warning: number of players below maximum again!!');
        }
        else {
            node.warn('warning: correct number of players again!!');
        }

        // Delete countdown to terminate the game.
        clearTimeout(that.countdown);
        that.countdown = null;
        node.game.resume();
        // Resume other players.
        setTimeout(function() {
            node.game.pl.each(function(p) {
                if (player.id !== p.id) {
                    node.remoteCommand('resume', p.id);
                }
            });
        }, 100);
        if (customCb) customCb.call(node.game, player);
    };

    // Register player disconnection, and wait for him...
    node.on.pdisconnect(function(p) {
        console.log('Disconnection in Stage: ' + node.player.stage);
    });

    // Player reconnecting.
    // This function is called first, and it invokes any
    // min/max/exact handler accordingly.
    node.on.preconnect(function(p) {
        var code, curStage, reconCb, res;
        var reconOptions;
        var milliseconds, resetTime;

        node.warn('Oh...somebody reconnected!', p);
        code = that.channel.registry.getClient(p.id);

        // Only within stage reconnections are allowed.
        curStage = node.game.getCurrentGameStage();

        if (that.sameStepReconnectionOnly) {
            if (GameStage.compare(code.stage, curStage)) {
                node.err('player reconnected from another stage. ' +
                         'Not allowed. Player: ' + p.id);
                disposeClient(node, p);
                return;
            }
        }

        // Setup client.
        that.setupClient(p.id);

        if (code.lang.name !== 'English') {
            // If lang is different from Eng, remote setup it.
            // TRUE: sets also the URI prefix.
            console.log('CODE LANG SENT');
            node.remoteSetup('lang', p.id, [code.lang, true]);
        }

        // Start the game on the reconnecting client.
        // Need to give step: false, we just init it.
        node.remoteCommand('start', p.id, { step: false });

        // Create the reconnection options object.
        reconOptions = {};

        // Sets the timer on reconnecting client if milliseconds is found.
        milliseconds = node.game.timer.milliseconds;
        if ('number' === typeof milliseconds) {
            // Time left to play in stage.
            resetTime = Math.max(milliseconds -
                                 node.timer.getTimeSince('step', true), 0);

            reconOptions.plot = { timer: resetTime };

            // node.remoteSetup('plot', p.id, { timer: resetTime }, 'tmpCache');
        }

        reconCb = this.plot.getProperty(curStage, 'reconnect');

        if (reconCb) {
            // Res contains the reconnect options for the step,
            // or false to abort reconnection.
            res = reconCb.call(this, code, reconOptions);
            if (res === false) {
                node.warn('Reconnect Cb returned false');
                disposeClient(node, p);
                return;
            }
        }

        // Add player to player list.
        node.game.pl.add(p);

        // Start the step on reconnecting client.
        // Unless differently specified by the reconnect callback,
        // target step is the current step of the logic.
        if (!reconOptions.targetStep) reconOptions.targetStep = curStage;
        node.remoteCommand('goto_step', p.id, reconOptions);

        // See if we have enough players now.
        res = node.game.plChangeHandler(p);

        // If we are still missing more players pause reconnecting player.
        if (!res) node.remoteCommand('pause', p.id);

    });

    this.registerRoom();
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
    var rc;

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

    // Set up logic.
    if (doLogic) setupLogic.call(this, mixinConf);

    // At this point clientList should be an array of client IDs.
    setupClients.call(this, clientList, mixinConf);
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
    if (doLogic) node.game.start();

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
    if (doLogic) node.game.pause();

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
    if (doLogic) node.game.resume();

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
    if (doLogic) node.game.stop();

    this.sendRemoteCommand('stop', clientList);
};

/**
 * ### GameRoom.getClientType
 *
 * Loads a specified client type
 *
 * @param {string} type The name of the client type
 * @param {object} mixinConf Optional. Additional configuration options
 *   that will be mixed-in with the final game object
 *
 * @return {object} The built client type
 */
GameRoom.prototype.getClientType = function(type, mixinConf) {
    var game, settings, stager, setup;
    var properties, stepRule;
    var that;

    if (!this.clientTypes[type]) {
        throw new Error('GameRoom.getClientType: unknown type: ' + type + '.');
    }
    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new Error('GameRoom.getClientType: runtimeConf must ' +
                        'be object.');
    }

    that = this;

    // Get the right stager.
    if (this.gameLevel) {
        stager = ngc.getStager(
            this.game.levels[this.gameLevel].stager.getState());
    }
    else {
        stager = ngc.getStager(this.game.stager.getState());
    }

    // Start adding default properties by client type.

    stepRule = stager.getDefaultStepRule();
    properties = stager.getDefaultProperties();

    // For both logic and other client types.

    if ('undefined' === typeof properties.timer) {
        stager.setDefaultProperty('timer', function() {
            var timer, stepId;
            stepId = this.getCurrentStep().id;
            timer = this.settings.TIMER[stepId];
            // If it is a function must be executed.
            // Other values will be parsed later.
            if ('function' === typeof timer) timer = timer.call(this);
            return timer || null;
        });
    }

    if ('undefined' === typeof properties.onWrongNumOfPlayers) {
        stager.setDefaultProperty('onWrongPlayerNum',
                                  this.wrongNumOfPlayers);
    }

    if ('undefined' === typeof properties.onCorrectNumOfPlayers) {
        stager.setDefaultProperty('onCorrectPlayerNum',
                                  this.correctNumOfPlayersAgain);
    }

    // Set different defaults for logic and other client types.
    if (type === 'logic') {
        if ('undefined' === typeof properties.publishLevel) {
            properties.publishLevel = 0;
        }
        if ('undefined' === typeof properties.syncStepping) {
            properties.syncStepping = true;
        }
        if ('undefined' === typeof properties.autoSet) {
            properties.autoSet = false;
        }
        if (stepRule === stepRules.SOLO) {
            stager.setDefaultStepRule(stepRules.OTHERS_SYNC_STEP);
        }
        if ('undefined' === typeof properties.timeup) {
            stager.setDefaultProperty('timeup', function() {
                var conf, gameStage;
                gameStage = this.getCurrentGameStage();
                conf = this.plot.getProperty(gameStage, 'pushClients');
                if (!conf) return;
                this.pushManager.startTimer(conf);
            });
        }

    }
    else {
        if ('undefined' === typeof properties.publishLevel) {
            properties.publishLevel = publishLevels.REGULAR;
        }
        if ('undefined' === typeof properties.autoSet) {
            properties.autoSet = true;
        }
        if (stepRule === stepRules.SOLO) {
            stager.setDefaultStepRule(stepRules.WAIT);
        }
        if ('undefined' === typeof properties.timeup) {
            stager.setDefaultProperty('timeup', function() {
                node.done();
            });
        }
    }

    setup = J.clone(this.game.setup);
    settings = J.clone(this.gameTreatment);
    game = this.clientTypes[type](this.treatmentName, settings, stager,
                                  setup, this);

    if ('object' !== typeof game) {
        throw new Error('GameRoom.getClientType: room ' + this.name +
                        ': ' + type + ' did not return a valid game object.');
    }

    // Add treatment settings.
    game.settings = settings;

    // Mixin-in nodeGame options.
    if (mixinConf) J.mixin(game, mixinConf);

    return game;
};

/**
 * ## GameRoom.setupClient
 *
 * Setups a client based on its id
 *
 * Retrieves the client object, checks its client type, and run the
 * appropriate setup command depending if the client it is a bot or
 * a remote client.
 *
 * @param {string} clientId The id of the client
 * @param {object} mixinConf Optional. Additional configuration options
 * @param {object} cache Optional. A cache object from where retrieving
 *   client types
 *
 * @return {boolean} TRUE on success
 *
 * @see GameRoom.getClientType
 */
GameRoom.prototype.setupClient = function(clientId, mixinConf, cache) {
    var clientObj, gameNode, type;
    var game;

    clientObj = tryToGetClient.call(this, clientId);
    if (!clientObj) {
        this.channel.sysLogger.log('GameRoom.setupClient: client not found: ' +
                                   clientId + '.', 'error');
        return;
    }
    // Fake cache.
    cache = cache || {};

    // See if the client is local or remote.
    gameNode = this.channel.bots[clientId];

    // Client type.
    type = clientObj.clientType;

    // Get the client type, check cache (bots are never cached).
    if (!gameNode && cache[type]) {
        game = cache[type];
    }
    else {
        game = this.getClientType(type, mixinConf);
        mixinGameMetadata.call(this, game);
        cache[type] = game;
    }

    // Setup the client.

    // Local client.
    if (gameNode) {
        // Can't remoteSetup here because serializing the plot methods
        // would make them lose their context (node etc.).
        gameNode.stop();
        gameNode.setup('nodegame', game);
    }
    // Remote client.
    else {
        this.node.remoteCommand('stop', clientId);
        this.node.remoteSetup('nodegame', clientId, game);
    }

    return true;
};

// ## Helper Methods.

/**
 * ## setupLogic
 *
 * Instantiates and setups the logic of the game room
 *
 * @param {object} mixinConf Optional. Additional options to mixin with the
 *   instantiated client type.
 *
 * @see GameRoom.getClientType
 * @see GameRoom.node
 */
function setupLogic(mixinConf) {
    var game, node;

    game = this.getClientType('logic', mixinConf);

    mixinGameMetadata.call(this, game);

    node = this.node;

    // Stop logic if necessary.
    if (node.game.isStoppable()) node.game.stop();

    // Setup must be called before connect.
    node.setup('nodegame', game);

    // Connect logic to server, if not already connected. E.g., after a stop
    // command it is generally still connected. Or the node object can be
    // passed in the constructor and be already connected.
    if (!node.socket.isConnected()) {
        node.socket.setSocketType('SocketDirect', {
            socket: this.channel.adminServer.socketManager.sockets.direct
        });
        node.connect(null, {
            startingRoom: this.name,
            clientType:   'logic'
        });
    }
}

/**
 * ## setupClients
 *
 * Instantiates and setups a number of clients of the game room
 *
 * @param {string|object} clientList The list of clients or a string
 *  specifying which clients are to be setup (Accepted values:
 *  'all', 'players', or 'admins')
 * @param {object} mixinConf
 *  Optional. Additional options to mixin with the instantiated client
 *  type.
 *
 * @see GameRoom.getClientType
 * @see GameRoom.node
 */
function setupClients(clientList, mixinConf) {
    var i, len, cache;

    cache = {};

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

    // Setup all given clients.
    i = -1, len = clientList.length;
    for ( ; ++i < len ; ) {
        this.setupClient(clientList[i], mixinConf, cache);
    }
}

/**
 * ### tryToGetClient
 *
 * Returns a client obj with given id, if found.
 *
 * Notice: separated from the main function because of the try-catch block,
 * otherwise the whole function is not optimized.
 *
 * @param {string} clientId The client id
 *
 * @return {object} The client object
 */
function tryToGetClient(clientId) {
    var clientObj;
    try {
        clientObj = this.clients.get(clientId);
    }
    catch(e) {
        this.channel.sysLogger.log("GameRoom.setupGame: no client with id '" +
                                   clientId + "'", 'warn');
    }
    return clientObj;
}

/**
 * ### mixinGameMetadata
 *
 * Adds default game info (name, description, version) if missing
 *
 * @param {object} game The game object used to setup a client
 *
 * @see GameRoom.setupClients
 * @see GameRoom.setupLogic
 */
function mixinGameMetadata(game) {
    if (!game.metadata) game.metadata = {};
    if (!game.metadata.name) game.metadata.name = this.game.info.name;
    if (!game.metadata.description) {
        game.metadata.description = this.game.info.description;
    }
    if (!game.metadata.version) game.metadata.version = this.game.info.version;
}

/**
 * ### disposeClient
 *
 * Disconnects a client that was not authorized to reconnect
 *
 * @param {NodeGameCLient} node The node instance of the game room
 * @param {object} p The player object
 *
 * @see GameRoom.on
 */
function disposeClient(node, p) {
    node.remoteAlert('Reconnection to game not authorized.', p.id);
    // Disconnect client.
    setTimeout(function() { node.disconnectClient(p); });
}
