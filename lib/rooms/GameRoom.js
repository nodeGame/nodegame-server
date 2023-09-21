/**
 * # Game Room
 * Copyright(c) 2023 Stefano Balietti <ste@nodegame.org>
 * MIT Licensed
 *
 * Game room representation
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = GameRoom;

const path = require('path');
const fs = require('fs-extra');

const ngc = require('nodegame-client');
const GameStage = ngc.GameStage;
const stepRules = ngc.stepRules;
const publishLevels = ngc.constants.publishLevels;
const DONE = ngc.constants.stageLevels.DONE;

const J = require('JSUS').JSUS;

const Room = require('./Room');

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
    var that, node, settings;

    Room.call(this, 'Game', config);
    if (!this.logicPath) this.logicPath  = './rooms/game.room';

    if (config.treatmentName && 'string' !== typeof config.treatmentName) {
        throw new TypeError('GameRoom: config.treatmentName must be ' +
                            'undefined or string. Found: ' +
                            config.treatmentName);
    }

    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        throw new TypeError('GameRoom: config.runtimeConf must be object. ' +
                            'Found: ' + config.runtimeConf);
    }

    /**
     * ### GameRoom.treatmentName
     *
     * The name of the treatment played, or 'standard' if not defined
     */
    this.treatmentName = config.treatmentName || 'standard';

    settings = this.gameLevel ?
        this.game.levels[this.gameLevel].settings : this.game.settings;

    if (!settings[this.treatmentName]) {
        throw new Error('GameRoom: game ' + this.gameName + ' treatment ' +
                        'not found: ' + this.treatmentName);
    }

    /**
     * ### GameRoom.gameTreatment
     *
     * Actual settings for current game based on treatment and runtime conf
     *
     * @see GameRoom.runtimeConf
     * @see GameRoom.setupGame
     */
    this.gameTreatment = settings[this.treatmentName];
    if (this.runtimeConf) J.mixin(this.gameTreatment, this.runtimeConf);


    /**
     * ### GameRoom.clientTypes
     *
     * Client types for the room (level checked)
     */
    this.clientTypes = this.gameLevel ?
        this.game.levels[this.gameLevel].clientTypes : this.game.clientTypes;

    /**
     * ### GameRoom.dataDir
     *
     * Path to the data directory
     *
     * @see ServerChannel.getGameDir
     */
    if (config.ownDataDir || this.channel.roomOwnDataDir) {
        this.dataDir = path.resolve(this.channel.getGameDir(),
                                    'data', this.name);


        // TODO: warning if it already exists.
        fs.ensureDir(this.dataDir);
    }
    else {
        this.dataDir = path.resolve(this.channel.getGameDir(), 'data');
    }

    /**
     * ### GameRoom.endGameListener
     *
     * Label of a game end listener added to node
     *
     * @see ServerChannel.handleG
     */
    this.endGameListener = null;

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
        var waitTime, msgToClients;
        node = this.node;

        // If the default value (30) is changed the documentation
        // on the wiki needs to be updated too (Disconnections page).
        waitTime = 'number' === typeof this.settings.WAIT_TIME ?
            this.settings.WAIT_TIME : 30;

        if (type === 'min') {

            msgToClients = this.settings.WAIT_TIME_TEXT ||
                'One or more players disconnected. We are waiting ' +
                '<span id="ng_pause_timer">' + waitTime +
                '</span> seconds to see if they reconnect.';

            node.warn('warning: not enough players!!');
        }
        else if (type === 'max') {
            msgToClients = this.settings.WAIT_TIME_TEXT ||
                'Too many players connected. We are waiting ' +
                '<span id="ng_pause_timer">' + waitTime + '</span> ' +
                'seconds to see if the right number of players is restored.';

            node.warn('warning: too many players!!');
        }
        else {
            msgToClients = this.settings.WAIT_TIME_TEXT ||
                'Wrong number of connected players detected. We are waiting' +
                '<span id="ng_pause_timer">' + waitTime + '</span> ' +
                'seconds to see if the right number of players is restored.';

            node.warn('warning: wrong number of players!!');
        }

        if (!node.game.isPaused()) {
            // Pause connected players.
            node.remoteCommand('pause', 'ROOM', msgToClients);
            node.game.pause();
        }

        that.countdown = setTimeout(function() {
            node.warn('Disconnection Countdown fired: ' + node.nodename);
            node.remoteCommand('resume', 'ROOM');
            node.game.resume();
            if (customCb) customCb.call(node.game, player);
            setTimeout(function() {
                if (node.game.shouldStep()) node.game.step();
            }, 100);

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

        // Player can reconnect during the countdown or after.
        // If after, then the game won't be paused.
        if (node.game.isPaused()) {
            node.game.resume();
            // Resume other players.
            setTimeout(function() {
                node.game.pl.each(function(p) {
                    if (player.id !== p.id) {
                        node.remoteCommand('resume', p.id);
                    }
                });
            }, 100);
        }

        if (customCb) customCb.call(node.game, player);
    };

    // Logs connections.
    node.on.pconnect(function(p) {
        that.logClientEvent(p, 'connect');
    });

    // Some players are already there, and do not fire pconnect.
    node.once('INIT', function() {
        // Avoid the whole loop.
        if (!that.logClients) return;
        node.game.pl.each(function(p) {
            that.logClientEvent(p, 'connect');
        });

    });

    // Logs disconnection.
    node.on.pdisconnect(function(p) {
        console.log('Disconnection: ' + p.id + ' (server stage: ' +
                    node.player.stage + ')');
        that.logClientEvent(p, 'disconnect');

    });

    // Player reconnecting.
    // This function is called first, and it invokes any
    // min/max/exact handler accordingly.
    node.on.preconnect(function(p) {
        var code, discoStage, discoStageLevel, curStage, reconCb, res;
        var compareSteps, reconOptions;
        var milliseconds, resetTime;
        var setup, msgs;

        that.logClientEvent(p, 'reconnect');

        node.warn('Oh...somebody reconnected!', p);
        code = that.channel.registry.getClient(p.id);

        discoStage = code.disconnectedStage;
        curStage = node.game.getCurrentGameStage();
        compareSteps = GameStage.compare(discoStage, curStage);

        // Check if only within stage reconnections are allowed.
        if (that.sameStepReconnectionOnly && compareSteps) {
            node.err('GameRoom: player reconnected from another step. ' +
                     'Not allowed. Player: ' + p.id);
            disposeClient(node, p);
            return;
        }

        // Setup client.
        that.setupClient(p.id);

        if (code.lang.name !== 'English') {
            // If lang is different from Eng, remote setup it.
            // TRUE: sets also the URI prefix.
            node.remoteSetup('lang', p.id, [code.lang, true]);
        }

        // Start the game on the reconnecting client.
        // Need to give step: false, we just init it.
        node.remoteCommand('start', p.id, { step: false });

        // Create the reconnection options object.
        reconOptions = { plot: {} };

        // Roles/partner are assigned in this step if matcher is truthy.
        if (node.game.getProperty('matcher')) {
            // Check if had role and partner.
            // Get old setup for re-connecting player.
            setup = node.game.matcher.getSetupFor(p.id);

            if (setup) {
                if (setup.role) reconOptions.plot.role = setup.role;
                if (setup.partner) reconOptions.plot.partner = setup.partner;
            }
        }

        // Mark the state as DONE, if this is the case.
        // Important!
        // IF the client was DONE, and waiting for other players,
        // and the STEP command is sent right before its disconnection,
        // THEN the willBeDone option is applied to the next step, which
        // is the wrong thing to do. So we add willBeDone only on same
        // stage, or if the client is ahead.
        discoStageLevel = code.disconnectedStageLevel;
        if (compareSteps <= 0 && discoStageLevel === DONE) {
            reconOptions.willBeDone = true;
            // Temporarily remove the done callback.
            reconOptions.plot.done = null;
            reconOptions.plot.autoSet = null;
        }
        else {
            // Resend messages
        }

        // Sets the timer on reconnecting client if milliseconds is found.
        milliseconds = node.game.timer.milliseconds;
        if ('number' === typeof milliseconds) {
            // Time left to play in stage.
            resetTime = Math.max(milliseconds -
                                 node.timer.getTimeSince('step', true), 0);

            reconOptions.plot.timer = resetTime;
        }

        // Session.
        reconOptions.session = node.game.session.player(p.id);

        reconCb = this.plot.getProperty(curStage, 'reconnect');

        if (reconCb === true) {
            // Get messages sent to client in current step.
            if (node.socket.journal.to[p.id]) {
                msgs = node.socket.journal.to[p.id].fetch();
                if (msgs.length) setup.msgs = msgs;
            }

        }
        else if ('function' === typeof reconCb) {

            // reconOptions.game = {};

            // Res contains the reconnect options for the step,
            // or false to abort reconnection.
            res = reconCb.call(this, code, reconOptions);
            if (res === false) {
                node.warn('Reconnect Cb returned false');
                disposeClient(node, p);
                return;
            }
            // console.log(reconOptions);
            // if (J.isEmpty(reconOptions.game)) reconOptions.game = null;
            // console.log(reconOptions);
        }

        // Add player to player list.
        node.game.pl.add(p);

        // Start the step on reconnecting client.
        // Unless differently specified by the reconnect callback,
        // target step is what is more advanced between the logic step,
        // and the step when the client disconnected.
        if (!reconOptions.targetStep) {
            // console.log(compareSteps, curStage, code.stage);
            // -1 means first param is ahead in game stage.
            // compareSteps = GameStage.compare(code.stage, curStage);
            if (compareSteps < 0) reconOptions.targetStep = discoStage;
            else reconOptions.targetStep = curStage;
        }

        node.remoteCommand('goto_step', p.id, reconOptions);

        // See if we have enough players now.
        res = node.game.sizeManager.changeHandler('pconnect', p);

        // If we are still missing more players pause reconnecting player.
        if (!res) node.remoteCommand('pause', p.id);

    });

    // Create sequence in the stager.

    (() => {

        let gameStages, mySetup;

        // Get the right stages.
        if (this.gameLevel) {
            // Setup is not cloned.
            mySetup = this.game.levels[this.gameLevel].setup;

            gameStages = this.game.levels[this.gameLevel].gameStages;
        }
        else {
            // Setup is not cloned.
            mySetup = this.game.setup;

            gameStages = this.game.gameStages;
        }

        // Settings are cloned.
        let gameSettings = J.clone(this.gameTreatment);

        let stager = ngc.getStager();

        if (gameStages.length === 2) {
            console.log('***v7 deprecation warning: game.stages function ' +
                        'should accept 5 parameters: ' +
                        'treatmentName, settings, stager, setup, gameRoom');

            gameStages(stager, gameSettings);
        }
        else {
            gameStages(this.treatmentName, gameSettings, stager, mySetup, this);
        }

        // Storing a reference to the stager.
        this.stager = stager;

    })();

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
 * @param {NodeGameClient} gameNode Optional. The nodeGame client
 *   object that this client type will configure (only for local clients,
 *   such as bots and logics).
 *
 * @return {object} The built client type
 */
GameRoom.prototype.getClientType = function(type, mixinConf, gameNode) {
    var game, settings, stager;
    var properties, stepRule;

    if (!this.clientTypes[type]) {
        throw new Error('GameRoom.getClientType: unknown type: ' + type);
    }
    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new Error('GameRoom.getClientType: mixinConf must ' +
                        'be object. Found: ' + mixinConf);
    }

    // Insulates the stager across client types.
    stager = ngc.getStager(this.stager.getState());

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
            // If moved into another file update documentation page.
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
                this.node.done();
            });
        }
    }

    // Setup is not cloned.
    let setup = this.gameLevel ?
        this.game.levels[this.gameLevel].setup : this.game.setup;

    // Settings are cloned.
    settings = J.clone(this.gameTreatment);

    // Experimental code.
    // Shared settings for all stager requires (for all client types).
    (() => {
        let treatmentName = this.treatmentName;
        let node = gameNode;
        let gameRoom = this;
        stager.share({ settings, treatmentName, setup, gameRoom, node });
    })();

    game = this.clientTypes[type](this.treatmentName, settings, stager,
                                  setup, this, gameNode);

    // If nothing is returned creates the obj.
    if ('undefined' === typeof game) {
        game = { plot: stager.getState() };
    }
    else if ('object' !== typeof game) {
        throw new Error('GameRoom.getClientType: room ' + this.name +
                        ': type "' + type + '" must return undefined or a ' +
                        'valid game object. Found: ' + game);
    }

    // Add defaults from setup.
    if ('undefined' === typeof game.debug) game.debug = setup.debug;
    if ('undefined' === typeof game.verbosity) game.verbosity = setup.verbosity;

    if (type === 'logic') {
        // Logic gets room name.
        if ('undefined' === typeof game.nodename) game.nodename = this.name;
        if ('undefined' === typeof game.verbosity) {
            game.verbosity = ngc.constants.verbosity_levels.warn;
        }
    }
    // Add window setup if not logic or bot.
    if (type !== 'bot' && type !== 'logic') {
        if ('undefined' === typeof game.window) game.window = setup.window;
    }

    // Add treatment settings.
    game.settings = settings;

    // Mixin-in nodeGame options.
    if (mixinConf) J.mixin(game, mixinConf);

    // Here we just add the frame property where missing.
    preprocessGame(this, type, game);

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
                                   clientId, 'error');
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
        game = this.getClientType(type, mixinConf, gameNode);
        mixinGameMetadata.call(this, game);
        cache[type] = game;
    }

    // Setup the client.

    // Local client (bot).
    if (gameNode) {
        // Can't remoteSetup here because serializing the plot methods
        // would make them lose their context (node etc.).
        if (gameNode.game.isStoppable()) gameNode.game.stop();
        gameNode.setup('nodegame', game);
    }
    // Remote client.
    else {
        this.node.remoteCommand('stop', clientId);
        this.node.remoteSetup('nodegame', clientId, game);
    }

    return true;
};

/**
 * ## GameRoom.getMemoryDb
 *
 * Returns all items in the database of the logic
 *
 * @return {array} The database of the logic
 *
 * @see GameRoom.node
 */
GameRoom.prototype.getMemoryDb = function() {
    return this.node ? this.node.game.memory.db : [];
};

GameRoom.prototype.updateWin = function(id, update, opts = {}) {
    console.log('***Depracation warn: GameRoom.updateWin is deprecated, use ' +
                'GameRoom.updateBonus instead.');
    this.updateBonus(id, update, opts);
};

/**
 * ## GameRoom.updateBonus
 *
 * Updates the current winning value of a client in the registry
 *
 * @param {string} id The id of the client
 * @param {number} win The update to be added to current winning
 * @param {object} opts Configuration options:
 *    - clear: If TRUE, the update overwrites current value
 *    - winProperty: The name of the property where bonus is stored,
 *                   default: 'win'.
 *
 * @param {number|boolean} The updated value or FALSE if the client is
 *   not found.
 *
 * @see GameRoom.computeBonus
 */
GameRoom.prototype.updateBonus = function(id, update, opts = {}) {
    if ('string' !== typeof id) {
        throw new TypeError('GameRoom.updateWin: id must be string. ' +
                            'Found: ' + id);
    }
    let client = this.channel.registry.getClient(id);
    if (!client) return false;
    if ('number' !== typeof update) {
        throw new TypeError('GameRoom.updateWin: update must be number. ' +
                            'Found: ' + update);
    }
    let clear = opts.clear || false;
    let win = opts.winProperty || 'win';
    client[win] = (!client[win] || clear) ? update : (client[win] + update);
    return client[win];
};

/**
 * ## GameRoom.computeBonus
 *
 * Computes, sends, dumps the total bonus of each player in the room
 *
 * @param {object} options Optional. Available options (default in brackets):
 *
 *   - dump: (true) If true, writes a 'bonus.csv' file.
 *
 *   - append (false) If true, it appends to an existing bonus.csv file, if any.
 *      If append is false (or if a file is already existing), it won't
 *      add the header of csv files;
 *
 *   - header: ([ 'id' 'type', 'bonus' ]): The name of the columns
 *      in the dump file.
 *
 *      The values for each column are extracted from the client objects
 *      in the registry, property names are matched exactly.
 *
 *      Furthermore, it is possible to specify a different property name
 *      by passing an array, instead of a string, where the first element
 *      is the name of the column in the dump file, and the second
 *      element is the name of the property in the client object.
 *      It is also possible to pass a function as second element, and
 *      in this case the return value is included in the file.
 *
 *      The default header [ 'id' 'type', 'bonus' ] can be changed by other
 *      options.
 *
 *      If `amt` option is true or AMT information is found, it adds:
 *
 *      [ 'workerid', 'hitid', 'assignmentid', 'access',
 *        'exit', 'approve', 'reject' ];
 *
 *      If `addDisconnected` option is true, it adds:
 *
 *      [ 'disconnected', 'disconnectedStage' ].
 *
 *      Example:
 *      ```
 *      header: [ 'id', [ 'type', 'clientType' ], 'win',
 *              [ 'approve', item => !item.disconnected ]
 *      ],
 *      ```
 *   - headerAdd: ([ 'svo', 'svother' ]): adds columns to the header without
 *                replacing defaults,
 *
 *   - headerKeys: ([ 'id' 'AccessCode', 'ExitCode', winProperty ] || header):
 *                 the name of the keys in the registry object from which
 *                 the values for the dump file are taken. If a custom
 *                 header is provided, then it is equal to header. DEPRECATED.
 *
 *   - exchangeRate: (settings.EXCHANGE_RATE || 1) If different from 1,
 *                   the bonus is multiplied by the exchange rate, and a
 *                   new property named (winProperty+'Raw') is added.
 *
 *   - winProperty: ('win') The name of the property holding the bonus.
 *
 *   - winDecimals: (2) The decimals included in the bonus (-1 = no rounding).
 *
 *   - missing: ('NA'): If a property is missing, this value is used.
 *
 *   - say: (true) sends the computed bonus to each client.
 *
 *   - filter: (undefined) Callback to filter clients.
 *
 *   - clients: (undefined) An array of clients (ids or objects) to be
 *               used instead of default game room clients.
 *
 *   - cb: (undefined) Callback manipulating the bonus object before sending it.
 *
 *   - print: (false): console.log each bonus object.
 *
 *   - addDisconnected: (true): If TRUE, currently diconnected players are
 *        added to the printout and dump file.
 *
 *   - amt: (false) If TRUE, it forces writing AMT columns into dump file,
 *        if FALSE, it prevents it.
 *
 *   - prolific: (false) If TRUE, it writes a simplified bonus file with
 *        only player id, and bonus, without any header or additional columns
 *
 *   - ip: (channel.options.collectIp) If TRUE, it writes a file containing
 *         player ids and their ip/s as reported by the Express server.
 *         Default: TRUE, if the option `collectIp` is enabled for the channel.
 *
 * @return {array} Array of computed bonus objects:
 *
 * ```javascript
 * {
 *    id: '1234',
 *    access: 'access-code',
 *    exit:   'exit-code',
 *    win:  10,
 *
 *    // Optional properties:
 *
 *    winRaw: 100,
`*    exchangeRate: 0.1
 * }
 * ```
 *
 * @see GameRoom.updateWin
 * @see GameRoom.node
 */
GameRoom.prototype.computeBonus = function(opts) {
    let clients;
    let outStr, prolificStr, ipStr;
    let filename;
    let winProperty, winDecimals, exchangeRate, miss;
    let header, headerKeys, headerLen;

    const node = this.node;
    const channel = this.channel;

    const settings = node.game.settings;

    // Set options.
    opts = opts || {};

    // Say, dump, print (true by default).
    const say = 'undefined' === typeof opts.say ? true : opts.say;
    const dump = 'undefined' === typeof opts.dump ? true : opts.dump;
    const print = 'undefined' === typeof opts.print ? true : opts.print;

    if (opts.winProperty) {
        if ('string' !== typeof opts.winProperty ||
            opts.winProperty.trim() === '') {

            throw new Error('GameRoom.computeBonus: opts.winProperty ' +
                            'must be undefined or a non-empty string. Found: ' +
                            opts.winProperty);
        }
        winProperty = opts.winProperty;
    }
    else {
        winProperty = 'win';
    }

    if ('undefined' !== typeof opts.winDecimals) {
        if ('number' !== typeof opts.winDecimals) {

            throw new Error('GameRoom.computeBonus: opts.winDecimals ' +
                            'must be undefined or number. Found: ' +
                            opts.winDecimals);
        }
        winDecimals = opts.winDecimals;
    }
    else {
        winDecimals = 2;
    }

    if (opts.exchangeRate) {
        if ('number' !== typeof opts.exchangeRate ||
            opts.exchangeRate < 0) {

            throw new Error('GameRoom.computeBonus: opts.exchangeRate ' +
                            'must be undefined or a number > 0. Found: ' +
                            opts.exchangeRate);
        }
        exchangeRate = opts.exchangeRate;
    }
    else {
        // TODO: we need to validate EXCHANGE_RATE from settings.
        exchangeRate = settings.EXCHANGE_RATE || 1;
    }

    if ('undefined' !== typeof opts.missing) {
        if ('string' !== typeof opts.missing &&
            'number' !== typeof opts.missing) {

            throw new Error('GameRoom.computeBonus: opts.missing ' +
                            'must be undefined, string or number. Found: ' +
                            opts.missing);
        }
        miss = opts.missing;
    }
    else {
        miss = 'NA';
    }

    if (opts.cb && 'function' !== typeof opts.cb) {
        throw new Error('GameRoom.computeBonus: opts.cb ' +
                        'must be function or undefined. Found: ' + opts.cb);
    }

    if (opts.filter && 'function' !== typeof opts.filter) {
        throw new Error('GameRoom.computeBonus: opts.filter ' +
                        'must be function or undefined. Found: ' +
                        opts.filter);
    }

    if (opts.clients) {
        if (!J.isArray(opts.clients)) {
            throw new Error('GameRoom.computeBonus: opts.clients ' +
                            'must be array or undefined. Found: ' +
                            opts.clients);
        }
        clients = opts.clients;
    }
    else {
        clients = this.clients.player.fetch();

        // MODS.
        if (opts.addDisconnected !== false && this.haveDisconnected) {

            let d = this.haveDisconnected;
            for (let i in d) {
                if (d.hasOwnProperty(i)) {
                    // For now, the disconnected flag is not removed,
                    // even if they reconnect.
                    if (d[i].disconnected) clients.push(d[i]);
                }
            }
        }
        // END MODS.
    }

    if (!clients || !clients.length) {
        channel.sysLogger.log('GameRoom.computeBonus: no clients to compute ' +
                              'bonus.', 'warn');
        return;
    }

    if ('undefined' !== typeof opts.header) {
        if (!J.isArray(opts.header) || !opts.header.length) {

            throw new Error('GameRoom.computeBonus: opts.header ' +
                            'must be undefined or a non-empty array. Found: ' +
                            opts.header);
        }
        header = opts.header;
    }
    else {

        header = [ 'id', [ 'type', 'clientType' ], [ 'basepay', 'basePay' ],
                 [ 'bonus', winProperty ] ];

        let amt;
        // Check the first client to see if there is AMT data.
        if (opts.amt === true) amt = true;
        else if (opts.amt !== false) amt = !!clients[0].AssignmentId;

        if (amt) {
            // Add AMT columns, but leave bonus the last field.
            header.splice(2, 0,
                          [ 'workerid', 'WorkerId' ],
                          [ 'hitid', 'HITId' ],
                          [ 'assignmentid', 'AssignmentId' ],
                          [ 'access', 'AccessCode' ],
                          [ 'exit', 'ExitCode' ],
                          [ 'approve',  c => !c.disconnected ],
                          [ 'reject', c => c.disconnected ]
                         );
        }

        // MODS.
        if (opts.addDisconnected) {
            header.push('disconnected');
            header.push('disconnectedStage');
        }
        // END MODS.

    }

    // Add properties to header without replacing it.
    if (opts.headerAdd) {
        header = [ ...header, ...opts.headerAdd ];
    }

    // Setting headeKeys to header (all info is there now).
    // Note! headerKeys may still be overwritten by option (see below).
    headerKeys = header;

    headerLen = header.length;

    if ('undefined' !== typeof opts.headerKeys) {

        if (!J.isArray(opts.headerKeys) ||
            opts.headerKeys.length !== headerLen) {

            throw new Error('GameRoom.computeBonus: opts.headerKeys ' +
                            'must be undefined or an array of the same ' +
                            'length of the header. Found: ' +
                            opts.headerKeys);
        }
        headerKeys = opts.headerKeys;

        console.log('***GameRoom.computeBonus: option headerKeys ' +
                    'is deprecated.***');
    }

    // Prepare the dump.
    if (dump) outStr = '';
    if (opts.prolific) prolificStr = '';
    let ip = opts.ip === true ||
        (opts.ip !== false && channel.options.collectIp);
    if (ip) ipStr = '';

    if (print) console.log('****COMPUTED BONUS PER PLAYER****');

    // Guaranteed payment for all participants.
    let basePay = settings.BASE_PAY || 0;

    let out = [];

    // Looping through an NDDB view or an array provided by user.
    clients.forEach(function(p) {
        var client, accessCode, exitCode, obj, id;
        id = 'string' === typeof p ? p : p.id;
        client = channel.registry.getClient(id);

        // Check filter.
        if (opts.filter && !opts.filter(client)) return;

        accessCode = client.AccessCode || client.accessCode;
        exitCode = client.ExitCode || client.exitCode;

        client[winProperty] = Number(client[winProperty] || 0);

        // TODO: should be done earlier on, when game starts.
        client.basePay = basePay;

        if (exchangeRate !== 1) {
            client[winProperty + 'Raw'] = client[winProperty];
            client[winProperty] *= (exchangeRate);
        }

        if (winDecimals !== -1) {
            // Shorten.
            client[winProperty] = client[winProperty].toFixed(2);
            // Make it a number again.
            client[winProperty] = parseFloat(client[winProperty], 10);
        }

        obj = {
            basePay: basePay,
            bonus: client[winProperty],
            total: basePay + client[winProperty],
            exit: exitCode
        };

        if (exchangeRate !== -1) {
            obj.totalRaw = client[winProperty + 'Raw'];
            obj.exchangeRate = exchangeRate;
        }

        if (opts.showBonus === false) obj.showBonus = false;

        // Execute callback on row.
        if (opts.cb) opts.cb(obj, p);

        // Decorate object with disconnect info or send it via msg.
        if (p.disconnected) {
            obj.disconnected = true;
            obj.disconnectedStage = p.disconnectedStage;
        }
        else if (say) {
            node.say('WIN', id, obj);
        }

        // Add id (no need to send it in say, so we do it afterwards.
        obj.id = id;
        obj.exit = obj.exit || miss;
        obj.access = accessCode || miss;

        // Print output.
        if (print) console.log(obj);

        // Create dump string.
        if (dump) {
            if (headerLen == 1) {
                outStr += formatField(client, headerKeys[0], miss);
            }
            else if (headerLen == 2) {
                outStr += formatField(client, headerKeys[0], miss) + ',' +
                    formatField(client, headerKeys[1], miss);
            }
            else if (headerLen == 3) {
                outStr += formatField(client, headerKeys[0], miss) + ',' +
                    formatField(client, headerKeys[1], miss) + ',' +
                    formatField(client, headerKeys[2], miss);
            }
            else if (headerLen == 4) {
                outStr += formatField(client, headerKeys[0], miss) + ',' +
                    formatField(client, headerKeys[1], miss) + ',' +
                    formatField(client, headerKeys[2], miss) + ',' +
                    formatField(client, headerKeys[3], miss);
            }
            else {
                let i = -1;
                for (let i = -1 ; ++i < headerLen ; ) {
                    outStr += formatField(client, headerKeys[i], miss);
                    if (i !== (headerLen-1)) outStr += ',';
                }
            }
            outStr += '\n';
        }
        if (opts.prolific) {
            prolificStr += id + "," + client[winProperty] + "\n";
        }
        if (ip) {
            let ip1 = client.ip['x-real-ip'] || miss;
            let ip2 = client.ip['x-forwarded-for'] || miss;
            if ('object' === typeof ip1) ip1 = JSON.stringify(ip);
            if ('object' === typeof ip2) ip2 = JSON.stringify(ip2);
            ipStr += id + ',' + ip1 + ',' + ip2;
        }
        out.push(obj);
    });


    if (dump) {
        filename = path.join(node.game.memory.getWD(), 'bonus.csv');

        writeWithBk(filename, opts.append, opts.backup,
                    channel.sysLogger, outStr, header);
    }

    if (opts.prolific) {
        filename = path.join(node.game.memory.getWD(), 'bonus_prolific.csv');

        // No header here.
        writeWithBk(filename, opts.append, opts.backup,
                    channel.sysLogger, prolificStr);
    }

    if (ip) {
        filename = path.join(node.game.memory.getWD(), 'ips.csv');
        writeWithBk(filename, opts.append, opts.backup,
            channel.sysLogger, ipStr, ['id', 'x-real-ip', 'x-forwarded-for']);
    }

    return out;
};


/**
 * @api experimental
 * ## GameRoom.use
 *
 * Runs predefined configuration scripts on the logic
 *
 * @param {object} policies Object containing the policies to run (keys)
 *    and their configuration (values)
 */
GameRoom.prototype.use = function(policies = {}) {

    for (let p in policies) {
        if (policies.hasOwnProperty(p)) {

            let value = policies[p];

            if (p === "defaultStreams") {
                defaultStreamsPolicy(this, value);
            }
            else if (p === "initSinglePlayer") {
                initSinglePlayerPolicy(this, value);
            }
            else if (p === "initMultiPlayer") {
                initMultiPlayerPolicy(this, value);
            }
            else if (p === "singlePlayerEndGame") {
                singlePlayerEndGamePolicy(this, value);
            }
            else {
                this.channel.sysLogger.log('GameRoom.use: policy not not ' +
                                           'found: ' + p, 'warn');
            }

        }
    }
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

    node.game.memory.setWD(this.dataDir, true);

    // Stop logic if necessary.
    if (node.game.isStoppable()) node.game.stop();

    // Setup must be called before connect.
    node.setup('nodegame', game);

    // Saving
    // @experimental
    // node.on('STEPPING', function(oldStep, newStep) {
    //     var save, header, format;
    //     save = this.plot.getProperty(oldStep, 'save');
    //     if (!save) return;
    //     // If array is the header.
    //     header = J.isArray(save) ? save : (save.header || save.headers);
    //     format = '.' + (save.format || 'csv');
    //     this.memory.stage[oldStep].save('stage_' + oldStep.stage + format, {
    //         headers: header,
    //         flags: 'a'
    //     });
    // });

    // Logging errors from remote clients to console.
    node.on('in.say.LOG', function(msg) {
        if (msg.text === 'error') {
            node.warn('error from client ' + msg.from + ' : ' + msg.data);
        }
    });

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

/**
 * ## writeWithBk
 *
 * Writes content to file, optionally appends and creates a backup.
 *
 * @param {string} filename The name of the file to write
 * @param {boolean} append  If TRUE and the file exists, it will append
 * @param {boolean} bk If TRUE and the file exists, it will create a backup
 * @param {Logger} logger The Channel logger
 * @param {array} header Optional. A header to add if file is not existing
 *
 * @see GameRoom.getClientType
 */
function writeWithBk(filename, append, bk, logger, str, header) {
    let fileExists = fs.existsSync(filename);
    append = fileExists && append;
    if (bk === false) {
        writeFile(filename, header, str, logger, append);
    }
    else {
        if (fileExists) {
            let filenameBak = filename + '_' + J.randomInt(1000000) + '.bak';

            fs.copyFile(filename, filenameBak)
                .then(function() {
                    writeFile(filename, header, str, logger, append);
                    fs.unlink(filenameBak);
                })
                .catch(function(err) {
                    logger.log('An error occurred while creating backup file ' +
                            filenameBak, 'error');
                    logger.log(err, 'error');
                });

        }
        else {
            writeFile(filename, header, str, logger, append);
        }
    }
}

/**
 * ### writeFile
 *
 * Writes a string to a file with a header (csv format)
 *
 * @param {string} filename The name of the file (full path)
 * @param {array} header The header of the csv file (format as in computeBonus)
 * @param {string} content The main content of the file
 * @param {Logger} sysLogger Reference to the channel logger
 * @param {boolean} append If TRUE, it will append to bonus file, and it will
 *    skip the header
 *
 * @see GameRoom.computeBonus
 */
function writeFile(filename, header, content, sysLogger, append) {
    var bonusFile, finalHeader;
    bonusFile = append ?
        fs.createWriteStream(filename, { flags: 'a' }) :
        fs.createWriteStream(filename);
    bonusFile.on('error', function(err) {
        sysLogger.log('Error while saving file: ' + filename, 'error');
        sysLogger.log(err, 'error');
    });
    bonusFile.on('close', function() {
        sysLogger.log('File saved: ' + filename);
    });
    if (!append && header) {
        finalHeader = '';
        header.forEach((h, i) => {
            if ('object' === typeof h) h = h[0];
            if (i !== (header.length - 1)) h += ',';
            finalHeader += h;
        });
        finalHeader += '\n';
        bonusFile.write(finalHeader);
    }
    bonusFile.write(content);
    bonusFile.end();
}

/**
 * ### formatField
 *
 * Formats a field to be written into the bonus csv file.
 *
 * What it does:
 *
 *   - Replaces all missing values with the missing variable.
 *   - Formats game stages.
 *   - Changes non-zero falsy values into zeros.
 *
 * @param {object} obj The object from which to extract the field.
 * @param {function|string|array} field If string, the name of the field;
 *     if array, the name is the second element; if function, it is executed
 *     with the obj as input parameter.
 * @param {string} missing The missing variable (e.g., "NA").
 *
 * @return {mixed} The formatted field
 *
 * @see GameRoom.computeBonus
 */
function formatField(obj, field, missing) {
    var res;
    // Retrieve value based on field format.
    if ('object' === typeof field) field = field[1];
    res = 'function' === typeof field ? field(obj) : obj[field];
    // If undefined, set missing.
    if ('undefined' === typeof res) res = missing;
    // True into 1.
    if (res === true) res = 1;
    // Falsy into 0.
    if ('number' !== typeof res && !res) res = 0;
    // Convert game stages.
    else if ('object' === typeof res) {
        if (res.hasOwnProperty('stage') && res.hasOwnProperty('step') &&
            res.hasOwnProperty('round')) {

            res = res.stage + '.' + res.step + '.' + res.round;
        }
    }
    return res;
}

/**
 * ### preprocessGame
 *
 * Process a game object (as returned by the stager) adding new properties
 *
 * For now, it just add missing `frame` properties to stages and steps of
 * client types not 'bot' and not 'logic'.
 *
 * If no frame is specified by user, and if a frame found, it adds it to
 * stage/step object.
 *
 * @param {object} gameRoom The gameRoom object
 * @param {string} id The id of the step/stage
 *
 * @return {string|boolean} frame The name of the frame or false if not found
 *
 * @see findFrame
 */
const preprocessGame = (gameRoom, clientType, game) => {
    if (clientType === 'bot' || clientType === 'logic') return;

    let stages = game.plot.stages;

    for (let s in stages) {
        if (stages.hasOwnProperty(s)) {
            if (!stages[s].frame) {
                let frame = findFrame(gameRoom, stages[s].id);
                if (frame) stages[s].frame = frame;
            }
            stages[s].steps.forEach((stepId) => {
                let step = game.plot.steps[stepId];
                if (!step.frame) {
                    let frame = findFrame(gameRoom, stepId);
                    if (frame) step.frame = frame;
                }
            });
        }
    }
};

/**
 * ### findFrame
 *
 * Checks if a frame named after the stage/step id exists and returns it
 *
 * It searches: ID.html, ID.htm, and inside the views directory for ID.
 *
 * Results of every search are cached.
 *
 * @param {object} gameRoom The gameRoom object
 * @param {string} id The id of the step/stage
 *
 * @return {string|boolean} frame The name of the frame or false if not found
 *
 */
const findFrame = (gameRoom, id) => {
    let frameCache = gameRoom.channel.frameCache;

    if ('undefined' !== typeof frameCache[id]) return frameCache[id];
    let frame = false;
    let channel = gameRoom.channel;
    let dir = channel.getGameDir();
    let publicDir = path.join(dir, 'public');
    let file = `${id}.htm`;
    if (fs.existsSync(path.join(publicDir, file))) {
        frame = file;
    }
    else {
        file = `${id}.html`;
        if (fs.existsSync(path.join(publicDir, file))) {
            frame = file;
        }
        else {
            let viewsDir = path.join(dir, 'views', 'templates');
            file = `${id}.jade`;
            // Views do not need the extension.
            if (fs.existsSync(path.join(viewsDir, file))) frame = file;
        }
    }
    // Cache results.
    frameCache[id] = frame;

    return frame;
}

/**
 * ### defaultStreamsPolicy
 *
 * Adds default streams to save to file to node.game.memory
 *
 * Default streams include:
 *
 * - memory.json:  all items in memory.
 * - feedback.csv: all items with a property `feedback` (creates new view).
 * - email.csv:    all items with a property `email` (creates a new view).
 * - times.csv     the times to complete every step.
 *
 * @param {GameRoom} gameRoom
 * @param {object} mask Optional. A configuration object to exclude a
 *    stream. E.g., `{ email: false }` will not add the email stream.
 */
function defaultStreamsPolicy(gameRoom, mask = {}) {

    const memory = gameRoom.node.game.memory;

    // Done.
    if (mask === true || mask.memory !== false) {
        let filename = mask.memory || 'memory.ndjson';
        if (filename.indexOf('.') === -1) filename += '.ndjson';
        memory.stream(filename);
    }
    // Feedback.
    if (mask === true || mask.feedback !== false) {
        let filename = mask.feedback || 'feedback.csv';
        if (filename.indexOf('.') === -1) filename += '.csv';
        memory.view("feedback").stream({
            filename: filename,
            header: ["time", "timestamp", "player", "feedback"],
        });
    }

    // Email.
    if (mask === true || mask.email !== false) {
        let filename = mask.feedback || 'email.csv';
        if (filename.indexOf('.') === -1) filename += '.csv';
        memory.view("email").stream({
            filename: filename,
            header: ["timestamp", "player", "email"],
        });
    }

    // Times.
    if (mask === true || mask.times !== false) {
        let filename = mask.feedback || 'times.csv';
        if (filename.indexOf('.') === -1) filename += '.csv';
        memory.stream({
            filename: filename,
            delay: 20000,
            header: [
                "session",
                "treatment",
                "player",
                "stage",
                "step",
                "round",
                "stageId",
                "stepId",
                "timestamp",
                "time",
            ],
            stageNum2Id: false, // TODO: this should be default FALSE
        });
    }
}

/**
 * Adds a default listener to logic to handle incoming messages with given label
 *
 * @param {GameRoom} gameRoom
 * @param {mixed} mod Modifier: TRUE enables it, object enables and pass the
 *    specified options to `computeBonus`, FALSE disables it
 *
 * @see GameRoom.computeBonus
 */
function singlePlayerEndGamePolicy(gameRoom, mod) {
    const logger = gameRoom.channel.sysLogger;
    const node = gameRoom.node;

    // TODO: if more automatic requests are added, create an object to
    // store references to listeners (such as gameRoom.endGameListener).

    if (mod) {
        if (gameRoom.endGameListener) {
            // Do nothing if not object (already registered).
            if ('object' !== typeof mod) return;
            // Remove previous listener if object (update settings).
            singlePlayerEndGamePolicy(gameRoom, false);
        }

        // Keep reference to remove it, if mod = false.
        gameRoom.endGameListener = node.on.data("WIN", function (msg) {
            let client = gameRoom.channel.registry.getClient(msg.from);
            if (!client) {
                logger.log("GameRoom.handleGameEndRequests: " +
                           "msg from unknown client: " + msg.from, 'warn');
                return;
            }

            if (client.checkout) {
                // Just resend bonus.
                gameRoom.computeBonus({
                    clients: [ msg.from ],
                    dump: false,
                    print: false
                });
            }
            else {
                // Computing bonus with user options, if passed.
                let opts = { clients: [ msg.from ] };
                // Clone settings if object.
                if ('object' === typeof mod) opts = J.merge(mod, opts);

                // Append, unless user specified otherwise.
                if ('undefined' === typeof opts.append) opts.append = true;

                // Compute total win.
                gameRoom.computeBonus(opts);

                // Mark client checked out.
                gameRoom.channel.registry.checkOut(msg.from);
            }
        });
    }
    else if (mod === false && gameRoom.endGameListener) {
        node.off(gameRoom.endGameListener);
        this.endGameListener = null;
    }
    else {
        logger.log("GameRoom.handleGameEndRequests: " +
                   "unknown mod ignored: " + mod, 'warn');
    }
}


function initSinglePlayerPolicy(gameRoom, mod) {

    let stager = mod.stager || mod;

    if (mod.customInit) {
        if ('function' !== typeof mod.customInit) {
            gameRoom.sysLogger.logger.log('initSinglePlayer: customInit ' +
            'must be function or undefined. Found: ' + mod.customInit);
        }
        else {
            stager.setDefaultProperty('__ng_customInit', mod.customInit);
        }
    }

    // Step Rule.
    stager.setDefaultStepRule(ngc.stepRules.SOLO);

    stager.setOnInit(function() {
        var customInit;

        // Initialize the client.

        // Setup page: header + frame.
        W.generateHeader();
        W.generateFrame();

        // Add widgets.

        this.visualStage = node.widgets.append('VisualStage', W.getHeader(), {
            next: false,
            previous: false,
            rounds: true
        });

        this.discBox = node.widgets.append('DisconnectBox', W.getHeader(), {
            // showStatus: true,
            // showDiscBtn: true
            disconnectCb: function() {
                W.init({ waitScreen: true });
                node.game.pause('Disconnection detected. Please ' +
                                'refresh the page to continue.');
                alert('Disconnection detected. Please refresh the page ' +
                        'to continue.');
            },
            connectCb: function() {
                // If the user refresh the page, this is not called, it
                // is a normal (re)connect.
                if (node.game.isPaused()) node.game.resume();
            }
        });

        this.doneButton = node.widgets.append('DoneButton', W.getHeader(), {
            text: 'Next',
            // onclick: function() {
                // node.widgets.last.setValues();
            // }
        });

        // Additional debug information while developing the game.
        // this.debugInfo = node.widgets.append('DebugInfo', header)

        W.init({ waitScreen: false });

        customInit = this.getProperty('__ng_customInit');

        if (customInit) customInit.call(this);

    });
}


function initMultiPlayerPolicy(gameRoom, mod) {

    let stager = mod.stager || mod;

    if (mod.customInit) {
        if ('function' !== typeof mod.customInit) {
            gameRoom.sysLogger.logger.log('initMultiPlayer: customInit ' +
            'must be function or undefined. Found: ' + mod.customInit);
        }
        else {
            stager.setDefaultProperty('__ng_customInit', mod.customInit);
        }
    }

    stager.setOnInit(function() {
        var customInit, header;

        // Initialize the client.

        // Setup page: header + frame.
        header = W.generateHeader();
        W.generateFrame();

        // Add widgets.

        // Uncomment to visualize the name of the stages.
        //node.game.visualStage = node.widgets.append('VisualStage', header);

        node.game.visualRound = node.widgets.append('VisualRound', header, {
            // Try alternative display modes (may mix together modes):
            // displayMode: [
            //     'COUNT_DOWN_STAGES', 'COUNT_DOWN_STEPS', 'COUNT_DOWN_ROUNDS'
            // ]
            // displayMode: [
            //     'COUNT_UP_STAGES', 'COUNT_UP_STEPS', 'COUNT_UP_ROUNDS'
            // ]
            // displayMode: [
            //     'COUNT_UP_STAGES_TO_TOTAL',
            //      'COUNT_UP_STEPS_TO_TOTAL',
            //     'COUNT_UP_ROUNDS_TO_TOTAL'
            // ]
            // displayMode: [
            //     'COUNT_UP_STAGES_TO_TOTAL',
            //     'COUNT_UP_STEPS_TO_TOTAL_IFNOT1',
            //     'COUNT_UP_ROUNDS_TO_TOTAL_IFNOT1'
            // ]
            // displayMode: [
            //     'COUNT_UP_STAGES_TO_TOTAL',
            //     'COUNT_UP_STEPS_IFNOT1',
            //     'COUNT_UP_ROUNDS_IFNOT1'
            // ]
        });

        node.game.visualTimer = node.widgets.append('VisualTimer', header);

        // Add additional debug information while developing the game.
        // node.game.debugInfo = node.widgets.append('DebugInfo', header)

        this.discBox = node.widgets.append('DisconnectBox', W.getHeader(), {
            // showStatus: true,
            // showDiscBtn: true
            disconnectCb: function() {
                W.init({ waitScreen: true });
                node.game.pause('Disconnection detected. Please ' +
                                'refresh the page to continue.');
                alert('Disconnection detected. Please refresh the page ' +
                        'to continue.');
            },
            connectCb: function() {
                // If the user refresh the page, this is not called, it
                // is a normal (re)connect.
                if (node.game.isPaused()) node.game.resume();
            }
        });

        // Done button to click.
        node.game.doneButton = node.widgets.append('DoneButton', header);

        // Additional debug information while developing the game.
        // this.debugInfo = node.widgets.append('DebugInfo', header)

        customInit = this.getProperty('__ng_customInit');

        if (customInit) customInit.call(this);

    });
}
