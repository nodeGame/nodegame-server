/**
 * # WaitinRoom
 * Copyright(c) 2019 Stefano Balietti <ste@nodegame.org>
 * MIT Licensed
 *
 * Waiting room.
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = WaitingRoom;

var J = require('JSUS').JSUS;
var path = require('path');
var ngt = require('nodegame-game-template');
var PlayerList = require('nodegame-client').PlayerList;

var HostRoom = require('./HostRoom');

/*  Inherit from HostRoom.
    Same effect as `WaitingRoom.prototype.__proto__ = HostRoom.prototype;`
    without relying on non-standard `__proto__`
*/
WaitingRoom.prototype = Object.create(HostRoom.prototype);

WaitingRoom.prototype.constructor = WaitingRoom;

/**
 * ## WaitingRoom.sortingCallbacks
 *
 * Predefined callbacks to sort the list of players before dispatching
 */
WaitingRoom.sortingCallbacks = {

    // ### timesNotSelected
    // Gives priority to players which have been left out in previous dispatch
    timesNotSelected: function(a, b) {
        if ((a.timesNotSelected || 0) < b.timesNotSelected) {
            return -1;
        }
        else if ((a.timesNotSelected || 0) > b.timesNotSelected) {
            return 1;
        }
        return 0;
    }
};

/**
 * ## WaitingRoom.treatmentCallbacks
 *
 * Names of callbacks for assigning treatments to groups of players
 */
WaitingRoom.treatmentCallbacks = {

    // Keep treatment_ in front to minimize risk of collision
    // with real treatment names.

    // Important! If names change, change also:
    //   - the routine creating WaitingRoom.availableTreatments,
    //   - the method WaitingRoom.decideTreatments,
    //   - the WaitingRoom widget displaying them.

    // ### treatment_rotate
    treatment_rotate: 'Rotates across all treatments sequentially',
    // ### random
    treatment_random: 'Selects a random treatment (with re-sampling)'
};

/**
 * ## WaitingRoom.dispatchStates
 *
 * States of the dispatching method
 *
 *    - NONE: no dispatching called
 *    - INITING: dispatching called, but can return if params are not correct
 *    - DISPATCHING: dispatching a group of players
 *    - NOTIFYING: dispatching is ending by notifying not selected players
 *
 * @see WaitingRoom.dispatch
 */
WaitingRoom.dispatchStates = {
    NONE: 'NONE',
    INITING: 'INITING',
    DISPATCHING: 'DISPATCHING',
    NOTIFYING: 'NOTIFYING'
};

/**
 * ## WaitingRoom constructor
 *
 * Creates a new instance of WaitingRoom
 *
 * @param {object} config Configuration object
 *
 * @see HostRoom
 */
function WaitingRoom(config) {
    // Supercall
    HostRoom.call(this, 'Waiting', config);
    if (!this.logicPath) this.logicPath = ngt.resolve('waitroom/waitroom.js');

    /**
     * ### WaitingRoom.roomOpen
     *
     * Flag indicating whether the room is open
     */
    this.roomOpen = config.roomOpen || true;

    /**
     * ### WaitingRoom.dispatching
     *
     * Numeric flag indicating whether the room is dispatching a new game
     *
     *
     */
    this.dispatching = 0;

    /**
     * ### WaitingRoom.timeOuts
     *
     * Array of setTimeout return values indexed by playerIDs
     */
    this.timeOuts = {};

    /**
     * ### WaitingRoom.notifyTimeout
     *
     * A timeout to notify players about updates in the number of players
     *
     * @see WaitingRoom.notifyPlayers
     */
    this.notifyTimeout = null;

    /**
     * ### WaitingRoom.numberOfDispatches
     *
     * Non-negative integer indicating the number of game dispatches
     */
    this.numberOfDispatches = config.numberOfDispatches || 0;

    /**
     * ### WaitingRoom.lastGameRoom
     *
     * Reference to the last created game room
     */
    this.lastGameRoom = null;

    /**
     * ### WaitingRoom.GROUP_SIZE
     *
     * Positive non-zero integer indicating the size of each group
     */
    this.GROUP_SIZE = null;

    /**
     * ### WaitingRoom.POOL_SIZE
     *
     * Positive non-zero integer indicating number of clients for group forming
     */
    this.POOL_SIZE = null;

    /**
     * ### WaitingRoom.DISCONNECT_IF_NOT_SELECTED
     *
     * Boolean or null, indicating whether unselected players are disconnected
     */
    this.DISCONNECT_IF_NOT_SELECTED = null;

    /**
     * ### WaitingRoom.timeOuts
     *
     * Array of setTimeout return values indexed by playerIDs
     */
    this.N_GAMES = null;

    /**
     * ### WaitingRoom.START_DATE
     *
     * Time and date of game start
     *
     * Must be valid input for `Date` constructor
     */
    this.START_DATE = null;

    /**
     * ### WaitingRoom.EXECUTION_MODE
     *
     * String indicating execution mode
     *
     * In the execution mode `'TIMEOUT`, one waits until the time is up, then
     * it will be checked whether enough players are there to start the game.
     * In the execution mode `WAIT_FOR_N_PLAYERS`, the game starts right away
     * if there are the desired number of players. Otherwise, when the time is
     * up, it will be checked if there are at least a certain minimum number of
     * players to start the game. If the execution mode is `WAIT_FOR_DISPATCH`,
     * it simply waits for a dispatch command from monitor, the number of
     * connected players is not taken into account.
     */
    this.EXECUTION_MODE = null;

    /**
     * ### WaitingRoom.MAX_WAIT_TIME
     *
     * Positive non-zero integer indicating max number of milliseconds to start
     *
     * Cannot be defined at the same time as `WaitingRoom.START_DATE`
     */
    this.MAX_WAIT_TIME = null;

    /**
     * ### WaitingRoom.ON_TIMEOUT
     *
     * Callback to be executed client-side after waiting time has elapsed
     */
    this.ON_TIMEOUT = null;

    /**
     * ### WaitingRoom.ON_TIMEOUT_SERVER
     *
     * Callback to be executed after a timeout has expired
     */
    this.ON_TIMEOUT_SERVER = null;

    /**
     * ### WaitingRoom.ON_OPEN
     *
     * Callback to be executed when the waiting room becomes open
     */
    this.ON_OPEN = null;

    /**
     * ### WaitingRoom.ON_CLOSE
     *
     * Callback to be executed when the waiting room becomes close
     */
    this.ON_CLOSE = null;

    /**
     * ### WaitingRoom.ON_CONNECT
     *
     * Callback to be executed when a player connects
     */
    this.ON_CONNECT = null;

    /**
     * ### WaitingRoom.ON_DISCONNECT
     *
     * Callback to be executed when a player disconnects
     */
    this.ON_DISCONNECT = null;

    /**
     * ### WaitingRoom.ON_INIT
     *
     * Callback to be executed after the settings have been parsed
     */
    this.ON_INIT = null;

    /**
     * ### WaitingRoom.ON_DISPATCH
     *
     * Callback to be executed just before starting dispatching
     *
     * Receives the options of the dispatch call as second param
     */
    this.ON_DISPATCH = null;

    /**
     * ### WaitingRoom.ON_DISPATCHED
     *
     * Callback to be executed at the end of a dispatch call
     */
    this.ON_DISPATCHED = null;

    /**
     * ### WaitingRoom.ON_FAILED_DISPATCH
     *
     * Callback to be executed if a dispatch attempt failed
     */
    this.ON_FAILED_DISPATCH = null;

    /**
     * ### WaitingRoom.CHOSEN_TREATMENT
     *
     * String or undefined indicating chosen treatment
     */
    this.CHOSEN_TREATMENT = null;

    /**
     * ### WaitingRoom.OVERWRITE_CHOSEN_TREATMENT
     *
     * If set, it overwrites chosen treatment for the next dispatch only
     *
     * When dispatch is invoked remotely, users may specify a treatment.
     *
     * It is set to null at every dispatch.
     *
     * @see WaitingRoom.ALLOW_SELECT_TREATMENT
     */
    this.OVERWRITE_CHOSEN_TREATMENT = null;

    /**
     * ### WaitingRoom.PLAYER_SORTING
     *
     * Callback to sort the list of players before dispatching
     *
     * If NULL, random sorting takes place. Default: 'timesNotSelected'
     */
    this.PLAYER_SORTING = WaitingRoom.sortingCallbacks.timesNotSelected;

    /**
     * ### WaitingRoom.PING_BEFORE_DISPATCH
     *
     * If TRUE, all players are pinged before a dispatch (Default: TRUE)
     *
     * Non-responding clients are disconnected.
     *
     * If only one player is needed and mode is 'WAIT_FOR_N_PLAYERS',
     * pinging is skipped.
     *
     * @see PING_MAX_REPLY_TIME
     */
    this.PING_BEFORE_DISPATCH = true;

    /**
     * ### WaitingRoom.PING_MAX_REPLY_TIME
     *
     * The time to wait to receive a ping back
     *
     * Clients will be disconnected if they do not reply in time.
     *
     * @see PING_BEFORE_DISPATCH
     */
    this.PING_MAX_REPLY_TIME = 3000;

    /**
     * ### WaitingRoom.PING_DISPATCH_ANYWAY
     *
     * If TRUE, dispatch continues even if disconnections occur during PING
     *
     * @see PING_BEFORE_DISPATCH
     * @see PING_MAX_REPLY_TIME
     */
    this.PING_DISPATCH_ANYWAY = false;

    /**
     * ### WaitingRoom.TEXTS
     *
     * List of texts replacing default ones in WaitingRoom widget
     *
     * @see WaitingRoom.texts (widget)
     */
    this.TEXTS = {};

    /**
     * ### WaitingRoom.SOUNDS
     *
     * List of paths to sounds replacing default ones in WaitingRoom widget
     *
     * @see WaitingRoom.sounds (widget)
     */
    this.SOUNDS = {};

    /**
     * ### WaitingRoom.PAGE_TITLE
     *
     * Sets the page title, optionally adds to page
     *
     */
    this.PAGE_TITLE =  { title: 'Welcome!', addToBody: true };

    /**
     * ### WaitingRoom.isPingInProgress
     *
     * Flag to indicate whether currently pinging for unresponsive players
     */
    this.isPingInProgress = false;

    /**
     * ### WaitingRoom.suspendedPings
     *
     * Flag to indicate whether currently pinging for unresponsive players
     */
    this.suspendedPings = [];

    /**
     * ### WaitingRoom.closeAfterDispatch
     *
     * Flag that the waiting room will close after next dispatch
     *
     * Note: waiting room can dispatch multiple groups, and then will close.
     */
    this.closeAfterDispatch = false;

    /**
     * ### WaitingRoom.makeClientTimeouts
     *
     * TRUE, if it makes timeouts for connecting clients
     *
     * Makes timeout if START_DATE or MAX_WAIT_TIME is set.
     *
     * @see WaitingRoom.makeTimeOut
     * @see WaitingRoom.clearTimeOut
     * @see WaitingRoom.START_DATE
     * @see WaitingRoom.MAX_WAIT_TIME
     */
    this.makeClientTimeOuts = false;

    /**
     * ### WaitingRoom.NOTIFY_INTERVAL
     *
     * The number of milliseconds to wait before sending a player-update message
     *
     * @see WaitingRoom.notifyPlayerUpdate
     */
    this.NOTIFY_INTERVAL = 200;

    /**
     * ### WaitingRoom.availableTreatments
     *
     * List of available treatments including treatment callbacks
     *
     * Maps names to descriptions.
     */
    this.availableTreatments = (function(that) {
        var o, t, key;
        if (that.gameLevel) {
            // Treatments are not yet parsed.
            t = that.game.levels[that.gameLevel].settings.treatments;
        }
        else {
            // Treatments are already parsed at this point.
            t = that.game.settings;
        }
        // Hard-cloned, check names in treatmentCallbacks.
        o = {
            treatment_random:
            WaitingRoom.treatmentCallbacks['treatment_random'],
            treatment_rotate:
            WaitingRoom.treatmentCallbacks['treatment_rotate']
        };
        for (key in t) {
            if (t.hasOwnProperty(key)) {
                o[key] = t[key].description || 'no description';
            }
        }
        return o;
    })(this);
}

/**
 * ## WaitingRoom.dispatchWithBots
 *
 * Dispatches waiting players to new gamerooms adding bots if needed
 *
 * If bots not are necessary, it just dispatches.
 *
 * @see WaitingRoom.dispatch
 */
WaitingRoom.prototype.dispatchWithBots = function(justConnect) {
    var neededBots, botOptions;
    var i;

    // Fill rest of group with bots.
    neededBots = this.POOL_SIZE - this.clients.player.db.length;

    // If no bots are necessary (e.g., when pool size is 1) just dispatch.
    if (neededBots < 1) {
        this.dispatch();
        return;
    }

    botOptions = {
        room: this,
        clientType: 'bot',
        setup: {}
    };
    if (neededBots >= 1) {
        this.channel.connectBot(botOptions);
    }
    if (neededBots >= 2) {
        this.channel.connectBot(botOptions);
    }
    if (neededBots >= 3) {
        this.channel.connectBot(botOptions);
    }
    if (neededBots >= 4) {
        i = -1;
        neededBots = neededBots - 3;
        for (; ++i < neededBots;) {
            this.channel.connectBot(botOptions);
        }
    }

    // WAIT_FOR_N_PLAYERS automatically dispatches.
    if (!justConnect && this.EXECUTION_MODE !== 'WAIT_FOR_N_PLAYERS') {
        this.dispatch();
    }
};

/**
 * ## WaitingRoom.parseSettings
 *
 * Validates settings and appends values to `this`
 *
 * @param {object} settings Configuration object
 */
WaitingRoom.prototype.parseSettings = function(settings) {
    var d, where, gameName;
    var that = this;

    gameName = this.channel.gameInfo.info.name + ' ';
    where = gameName + 'WaitingRoom.parseSettings: ';

    if ('object' !== typeof settings) {
        throw new TypeError(where + 'settings must be object. Found: ' +
                            settings);
    }

    if ('number' === typeof settings.GROUP_SIZE) {
        checkPositiveInteger(settings, 'GROUP_SIZE', where);
        this.GROUP_SIZE = settings.GROUP_SIZE;
    }
    else {
        throw new TypeError(where + 'GROUP_SIZE must be a positive number. ' +
                            'Found: ' + settings.GROUP_SIZE);
    }

    if ('undefined' !== typeof settings.POOL_SIZE) {
        if ('number' === typeof settings.POOL_SIZE) {
            checkPositiveInteger(settings, 'POOL_SIZE', where);
            this.POOL_SIZE = settings.POOL_SIZE;
        }
        else {
            throw new TypeError(where + 'POOL_SIZE must be a positive ' +
                                'number or undefined. Found: ' +
                                settings.POOL_SIZE);
        }
    }
    else {
        this.POOL_SIZE = settings.GROUP_SIZE;
    }

    if (this.POOL_SIZE < this.GROUP_SIZE) {
        throw new TypeError(where + 'POOL_SIZE should be larger or equal ' +
                            'to GROUP_SIZE. Found: ' + this.POOL_SIZE + ', ' +
                            this.GROUP_SIZE);
    }

    if ('undefined' !== typeof settings.N_GAMES) {
        if ('number' === typeof settings.POOL_SIZE) {
            checkPositiveInteger(settings, 'N_GAMES', where);
            this.N_GAMES = settings.N_GAMES;
        }
        else {
            throw new TypeError(where + 'N_GAMES must be a positive number ' +
                                'or undefined. Found: ' + settings.N_GAMES);
        }
    }

    if ('undefined' !== typeof settings.NOTIFY_INTERVAL) {
        if ('number' === typeof settings.NOTIFY_INTERVAL) {
            checkPositiveInteger(settings, 'NOTIFY_INTRVAL', where);
            this.NOTIFY_INTERVAL = settings.NOTIFY_INTERVAL;
        }
        else {
            throw new TypeError(where + 'NOTIFY_INTERVAL must be a positive ' +
                                'number or undefined. Found: ' +
                                settings.NOTIFY_INTERVAL);
        }
    }

    if ('undefined' !== typeof settings.DISCONNECT_IF_NOT_SELECTED) {
        if ('boolean' === typeof settings.DISCONNECT_IF_NOT_SELECTED) {
            this.DISCONNECT_IF_NOT_SELECTED =
                settings.DISCONNECT_IF_NOT_SELECTED;
        }
        else {
            throw new TypeError(where + 'DISCONNECT_IF_NOT_SELECTED must ' +
                                'be boolean or undefined. Found: ' +
                                settings.DISCONNECT_IF_NOT_SELECTED );
        }
    }


    if ('undefined' !== typeof settings.DISPATCH_TO_SAME_ROOM) {
        if ('boolean' === typeof settings.DISPATCH_TO_SAME_ROOM) {
            this.DISPATCH_TO_SAME_ROOM = settings.DISPATCH_TO_SAME_ROOM;
        }
        else {
            throw new TypeError(where + 'DISPATCH_TO_SAME_ROOM must ' +
                                'be boolean or undefined. Found: ' +
                                settings.DISPATCH_TO_SAME_ROOM);
        }
    }

    if ('string' !== typeof settings.EXECUTION_MODE) {
        throw new TypeError(where + 'EXECUTION_MODE must be string. Found: ' +
                            settings.EXECUTION_MODE);
    }
    else {
        if (settings.EXECUTION_MODE !== 'TIMEOUT' &&
            settings.EXECUTION_MODE !== 'WAIT_FOR_N_PLAYERS' &&
            settings.EXECUTION_MODE !== 'WAIT_FOR_DISPATCH') {
            throw new Error(where + 'Invalid execution mode: ' +
                            settings.EXECUTION_MODE);
        }
        this.EXECUTION_MODE = settings.EXECUTION_MODE;
    }

    if ('undefined' !== typeof settings.START_DATE) {
        if (this.EXECUTION_MODE !== 'TIMEOUT') {
            throw new Error(where + 'Execution mode ' + this.EXECUTION_MODE +
                            ' cannot have a START_DATE');
        }
        d = new Date(settings.START_DATE);
        if (isNaN(d.getTime())) {
            throw new Error (where + 'START_DATE must be valid argument ' +
                             'for Date constructor. Found: ' +
                             settings.START_DATE);
        }
        if ('undefined' !== typeof settings.MAX_WAIT_TIME) {
            throw new Error(where + 'Cannot define both MAX_WAIT_TIME and ' +
                            'START_DATE.');
        }
        this.START_DATE = settings.START_DATE;
    }
    else if ('undefined' !== typeof settings.MAX_WAIT_TIME) {
        if ('number' === typeof settings.MAX_WAIT_TIME) {
            checkPositiveInteger(settings, 'MAX_WAIT_TIME', where);
            this.MAX_WAIT_TIME = settings.MAX_WAIT_TIME;
        }
        else {
            throw new TypeError(where + 'MAX_WAIT_TIME must be ' +
                                'number or undefined. Found: ' +
                                settings.MAX_WAIT_TIME);
        }
    }
    else {
        if (this.EXECUTION_MODE === 'TIMEOUT') {
            throw new Error(where + 'For EXECUTION_MODE="TIMEOUT" either ' +
                            'MAX_WAIT_TIME or START_DATE must be defined.');
        }
    }

    assignIfFunction('ON_TIMEOUT', this, settings);

    assignIfFunction('ON_TIMEOUT_SERVER', this, settings);

    assignIfFunction('ON_OPEN', this, settings);

    assignIfFunction('ON_CLOSE', this, settings);

    assignIfFunction('ON_INIT', this, settings);

    assignIfFunction('ON_CONNECT', this, settings);

    assignIfFunction('ON_DISCONNECT', this, settings);

    assignIfFunction('ON_DISPATCH', this, settings);

    assignIfFunction('ON_DISPATCHED', this, settings);

    assignIfFunction('ON_FAILED_DISPATCH', this, settings);
    this.CHOSEN_TREATMENT = this.validateTreatment(settings.CHOSEN_TREATMENT,
                                                   where + ' CHOSEN_TREATMENT');

    if ('undefined' !== typeof settings.PLAYER_SORTING) {
        if ('string' === typeof settings.PLAYER_SORTING &&
            !WaitingRoom.sortingCallbacks[settings.PLAYER_SORTING]) {

            throw new TypeError(where + 'PLAYER_SORTING algorithm ' +
                                'not found: ' + settings.PLAYER_SORTING);
        }
        else if ('function' !== typeof settings.PLAYER_SORTING &&
                 null !== settings.PLAYER_SORTING) {

            throw new TypeError(where + 'PLAYER_SORTING must be string, ' +
                                'function, null or undefined. Found: ' +
                                settings.PLAYER_SORTING);
        }
        this.PLAYER_SORTING = settings.PLAYER_SORTING;
    }

    if ('undefined' !== typeof settings.PLAYER_GROUPING) {

        if ('function' !== typeof settings.PLAYER_GROUPING &&
            null !== settings.PLAYER_GROUPING) {

            throw new TypeError(where + 'PLAYER_GROUPING must be function, ' +
                                'null or undefined. Found: ' +
                                settings.PLAYER_GROUPING);
        }
        this.PLAYER_GROUPING = settings.PLAYER_GROUPING;
    }

    if ('undefined' !== typeof settings.PING_BEFORE_DISPATCH) {

        if ('boolean' !== typeof settings.PING_BEFORE_DISPATCH) {

            throw new TypeError(where + 'PING_BEFORE_DISPATCH must ' +
                                'be boolean or undefined. Found: ' +
                                settings.PING_BEFORE_DISPATCH);
        }
        this.PING_BEFORE_DISPATCH = settings.PING_BEFORE_DISPATCH;
    }

    if ('undefined' !== typeof settings.PING_MAX_REPLY_TIME) {
        if ('number' === typeof settings.PING_MAX_REPLY_TIME) {
            checkPositiveInteger(settings, 'PING_MAX_REPLY_TIME', where);
            this.PING_MAX_REPLY_TIME = settings.PING_MAX_REPLY_TIME;
        }
        else {
            throw new TypeError(where + 'PING_MAX_REPLY_TIME must be a ' +
                                'positive number or undefined. Found: ' +
                                settings.PING_MAX_REPLY_TIME);
        }
    }

    if ('undefined' !== typeof settings.PING_DISPATCH_ANYWAY) {

        if ('boolean' !== typeof settings.PING_DISPATCH_ANYWAY) {

            throw new TypeError(where + 'PING_DISPATCH_ANYWAY must ' +
                                'be boolean or undefined. Found: ' +
                                settings.PING_DISPATCH_ANYWAY);
        }
        this.PING_DISPATCH_ANYWAY = settings.PING_DISPATCH_ANYWAY;
    }

    if ('undefined' !== typeof settings.PAGE_TITLE) {

        if ('string' === settings.PAGE_TITLE) {
            this.PAGE_TITLE = {
                title: settings.PAGE_TITLE,
                addToBody: true
            };
        }
        else {
            if ('object' !== typeof settings.PAGE_TITLE) {

                throw new TypeError(where + 'PAGE_TITLE must ' +
                                    'be object or undefined. Found: ' +
                                    settings.PAGE_TITLE);
            }
            if ('string' !== typeof settings.PAGE_TITLE.title) {
                throw new TypeError(where + 'PAGE_TITLE.title must ' +
                                    'be string. Found: ' +
                                    settings.PAGE_TITLE.title);
            }
            this.PAGE_TITLE = settings.PAGE_TITLE;
        }
    }

    if ('undefined' !== typeof settings.ALLOW_PLAY_WITH_BOTS) {
        this.ALLOW_PLAY_WITH_BOTS = !!settings.ALLOW_PLAY_WITH_BOTS;
    }
    else {
        this.ALLOW_PLAY_WITH_BOTS = false;
    }

    if ('undefined' !== typeof settings.ALLOW_SELECT_TREATMENT) {
        this.ALLOW_SELECT_TREATMENT = !!settings.ALLOW_SELECT_TREATMENT;
    }
    else {
        this.ALLOW_SELECT_TREATMENT = false;
    }

    if (this.ALLOW_SELECT_TREATMENT && !this.ALLOW_PLAY_WITH_BOTS) {
        this.channel.sysLogger.log('ALLOW_SELECT_TREAMENT is true, but ' +
                                   'ALLOW_PLAY_WITH_BOTS is false, so it ' +
                                   'will be ignored', 'warn');

        this.ALLOW_SELECT_TREATMENT = false;
    }

    this.node.on.data('PLAYWITHBOT', function(msg) {
        var pid, t, logStr;

        pid = msg.from;
        // Check if the client was allowed to send it.
        if (!that.ALLOW_PLAY_WITH_BOTS && !that.channel.registry.isAdmin(pid)) {
            that.channel.sysLogger.log('Received illegal bot dispatch ' +
                                       'by client ' + pid, 'warn');
            return;
        }

        logStr = 'Bot dispatch started by client ' + pid;

        // Var msg.data contains treatment name.
        t = msg.data;
        if (t) {
            if (!that.ALLOW_SELECT_TREATMENT &&
                !that.channel.registry.isAdmin(pid)) {

                that.channel.sysLogger.log('Received illegal treatment ' +
                                           'selection by client ' + pid,
                                           'warn');
                return;
            }

            // Treatment string is validated by dispatch method.

            // Set next chosen treatment.
            that.OVERWRITE_CHOSEN_TREATMENT = t;

            logStr += ' with treatment=' + t;
        }

        that.channel.sysLogger.log(logStr);

        that.dispatchWithBots();

        // TODO: was:
        //if (that.PING_BEFORE_DISPATCH) {
        //    that.kickUnresponsivePlayers(that.dispatchWithBots,
        //                                 { callbackArgs: {}} );
        //}
        //else {
        //    that.dispatchWithBots();
        //}
        // However, dispatchWithBots calls kickunresponsive player again.
        // Find a way to avoid it.
    });

    if (this.START_DATE || this.MAX_WAIT_TIME) this.makeClientTimeouts = true;

    assignIfStringLikeObj('TEXTS', this, settings);

    assignIfStringLikeObj('SOUNDS', this, settings);

    // Executes ON_INIT, if found.
    if (this.ON_INIT) this.ON_INIT(this);
};

/**
 * ### WaitingRoom.validateTreatment
 *
 * Validates if a treatment parameter is found amongst existing options
 *
 * The action taken in case of failing to validate and the return value
 * depend on the second parameter `doThrow`.
 *
 * @param {string|function} Optional. The name of the treatment
 *   (undefined is a valid value).
 * @param {string|boolean} doThrow Optional. If truthy and the treatment
 *   does not pass validation, an error will be thrown. If doThrow is a
 *   string, it is used as the beginning of the sentence for
 *   the error message. Default: 'WaitingRoom.validateTreatment: treatment'
 *
 * @return {string|boolean} The validated treatment name|function.
 */
WaitingRoom.prototype.validateTreatment = function(treatment, doThrow) {
    var t, err;
    if ('undefined' !== typeof treatment) {
        if (doThrow) {
            if ('boolean' === typeof doThrow) {
                doThrow = 'WaitingRoom.validateTreatment: treatment';
            }
            else if ('string' !== typeof doThrow) {
                throw new TypeError('WaitingRoom.validateTreatment: doThrow ' +
                                    'must be boolean, string or undefined. ' +
                                    'Found: ' + doThrow);
            }
        }
        if ('string' === typeof treatment) {
            if (!this.availableTreatments[treatment]) {
                err = ' not found: ' + treatment;
            }
        }
        else if ('function' !== typeof treatment) {
            err = 'must be string, function or undefined. Found: ' + treatment;
        }
    }

    if (doThrow) {
        if (err) throw new Error(doThrow + err);
        else return treatment;
    }
    return !err;
};

/**
 * ## WaitingRoom.makeWidgetConfig
 *
 * Creates an object to configure the `WaitingRoom` widget
 *
 * @return {object} The configuration object
 */
WaitingRoom.prototype.makeWidgetConfig = function() {
    var o = {
        // Texts and Sounds are usually sent separately (before).
        // texts: this.TEXTS,
        // sounds: this.SOUNDS,
        groupSize: this.GROUP_SIZE,
        poolSize: this.POOL_SIZE,
        disconnectIfNotSelected: this.DISCONNECT_IF_NOT_SELECTED,
        nGames: this.N_GAMES,
        startDate: this.START_DATE,
        executionMode: this.EXECUTION_MODE,
        maxWaitTime: this.MAX_WAIT_TIME,
        onTimeout: this.ON_TIMEOUT,
        // chosenTreatment: this.CHOSEN_TREATMENT,
        playWithBotOption: this.ALLOW_PLAY_WITH_BOTS,
        selectTreatmentOption: this.ALLOW_SELECT_TREATMENT,
    };
    if (this.ALLOW_SELECT_TREATMENT) {
        o.availableTreatments = this.availableTreatments;
    }
    return o;
};

/**
 * ## WaitingRoom.isRoomOpen
 *
 * Returns flag indicating whether the `WaitingRoom` is open
 *
 * @return {boolean} Flag indicating whether `this` is open
 */
WaitingRoom.prototype.isRoomOpen = function() {
    return this.roomOpen;
};

/**
 * ## WaitingRoom.closeRoom
 *
 * Changes state of `this` to closed
 *
 * @param {string} mod Optional. Modifies the behavior of closeRoom.
 *   Available options:
 *
 *   - 'now': (default)
 *   - 'afterDispatch': true/false
 *
 * @param {mixed} param Optional. Parameter for modifier
 */
WaitingRoom.prototype.closeRoom = function(mod, param) {
    if (mod && mod !== 'now') {
        if (mod === 'afterDispatch') {
            this.closeAfterDispatch = true;
            return;
        }
        else {
            throw new Error('WaitingRoom.closeRoom: unknown modifier: ' + mod);
        }
    }
    this.roomOpen = false;
    if (this.ON_CLOSE) this.ON_CLOSE(this);
};

/**
 * ## WaitingRoom.openRoom
 *
 * Changes state of `this` to open
 */
WaitingRoom.prototype.openRoom = function() {
    this.roomOpen = true;
    if (this.ON_OPEN) this.ON_OPEN(this);
};

/**
 * ### WaitingRoom.shouldDispatchMoreGames
 *
 * Checks whether another game can be dispatched
 */
WaitingRoom.prototype.shouldDispatchMoreGames = function() {
    if (!this.roomOpen) return false;
    if (this.N_GAMES) return this.numberOfDispatches < this.N_GAMES;
    // TODO: Maybe check other conditions?
    return true;
};

/**
 * ### WaitingRoom.kickUnresponsivePlayers
 *
 * Pings all players and kicks those who fail to respond
 *
 * @param {function} callback Callback to be executed when pinging
 *    is completed with WaitingRoom as context.
 * @param {object} options Options object. Accepted values:
 *
 *   - callbackArgs: (array) arguments to be passed to the callback.
 *        Property pList is automatically added and contains the
 *        players that have responded to ping.
 *   - timeToWaitForPing: Wait time before kicking in milliseconds.
 *        Default: WaitingRoom.PING_MAX_REPLY_TIME || 3000
 *   - doCallback: if TRUE, the callback is executed also if some
 *        players are disconnected.
 *        Default: WaitingRoom.PING_DISPATCH_ANYWAY || false
 */
WaitingRoom.prototype.kickUnresponsivePlayers = function(callback, options) {
    var cb, that;
    var i, timeToWaitForPing;
    var timeout, pingReturnedCb, doCallback, totPingReturned;
    var players, p, pList, pLen;
    var where;

    where = 'WaitingRoom.kickUnresponsivePlayers';
    that = this;

    if (this.isPingInProgress) {
        console.log('Warning: Suspending call to ' + where +
                    ' because kicking is still in progress.');
        this.suspendedPings.push([callback, options]);
        return;
    }

    // Check parameters.

    if ('function' !== typeof callback) {
        throw new TypeError(where + ': callback must be function. Found: ' +
                            callback);
    }

    options = options || {};

    timeToWaitForPing = options.timeToWaitForPing || this.PING_MAX_REPLY_TIME;
    if ('number' !== typeof timeToWaitForPing || timeToWaitForPing < 1) {
        throw new TypeError(where + ': timeToWaitForPing must be ' +
                            'a positive number or undefined. Found: ' +
                            timeToWaitForPing);
    }

    if ('undefined' !== typeof options.doCallback) {
        doCallback = !!options.doCallback;
    }
    else {
        doCallback = this.PING_DISPATCH_ANYWAY;
    }

    // Lock this function.
    this.isPingInProgress = true;

    // Setup variables for pinging all players.

    // Manual copy of player list.
    players = this.clients.player.db;
    pList = new PlayerList();
    pLen = players.length;
    // Need to update pcounter because we use .insert below.
    pList.pcounter = pLen;

    // Create callback that will be executed if all players return from PING.
    cb = function() {
        var pSize;

        // When done, unlock function.
        that.isPingInProgress = false;

        pSize = pList.size();
        // Call the callback: if required so and at least one player
        // is still connected, or if all players returned the PING.
        if ((doCallback && pSize) || (pSize === pLen)) {
            // Add list of pinged players to dispatch options.
            options.callbackArgs.pList = pList;
            callback.call(that, options.callbackArgs);
        }
        else {
            console.log('Not enough players:' + pList.size(), pLen);
        }

        // Execute suspended calls.
        if (that.suspendedPings.length > 0) {

            // Cancel suspended pings if waiting room is closed.
            if (!that.shouldDispatchMoreGames()) {
                console.log('Warning: room is closed. Clearing previously ' +
                            'suspended pings.');
                that.suspendedPings = [];
            }
            else if (that.clients.player.size() < that.POOL_SIZE) {
                console.log('Warning: not enough players now. ' +
                            'Aborting previously suspended pings.');
                that.suspendedPings = [];
            }
            else {
                that.kickUnresponsivePlayers.apply(that,
                                                   that.suspendedPings.pop());
            }
        }
    };

    // Count how many pings returned.
    totPingReturned = 0;
    // Callback to execute when a ping-back is returned.
    pingReturnedCb = function() {
        totPingReturned++;
        if (totPingReturned === pLen) {
            clearTimeout(timeout);
            cb();
        }
    };

    // Start pinging.

    for (i = 0; i < players.length; ++i) {
        p = players[i];

        // Call .insert, not .add (saves some operations).
        pList.insert(p);

        // Ping only remote clients.
        if (!that.channel.registry.isRemote(p)) {
            totPingReturned++;
            continue;
        }

        console.log('Pinging player ' + p.id, timeToWaitForPing);
        that.node.get('PING', pingReturnedCb, p.id, {
            timeout: timeToWaitForPing,
            executeOnce: true,
            // The callback on failure.
            timeoutCb: (function(p, i) {
                return function() {
                    // This marks the PING failed.
                    pList.remove(p.id);
                    console.log('Player %s unresponsive. Kicking.', p.id);
                    that.node.disconnectClient(p);
                };
            })(p, i)
        });
    }

    // At the end of this timeout, we will check how many players
    // have responded. If all players have responded (or doCallback = TRUE)
    // the callback is executed. In any case, we set pingInProgress = FALSE.
    timeout = setTimeout(cb, timeToWaitForPing + 500);
};

/**
 * ## WaitingRoom.dispatch
 *
 * Initiates the start of the game
 *
 * It is assumed that it is called only after connected players > POOL_SIZE.
 *
 * @param {object} opts Optional. Configuration options for the method.
 *   Available options:
 *
 *   - numberOfGames: sets the number of games to dispatch
 *   - closeAfterDispatch: closes the waiting room after this dispatch
 *   - msg: dispatch-message to send to all players. Default:
 *        { action: 'AllPlayersConnected', exit: 0 }
 */
WaitingRoom.prototype.dispatch = (function() {
    var doDispatch, where, parseGroupSizeOptions, checkShouldDispatch;
    where = 'WaitingRoom.dispatch: ';

    checkShouldDispatch = function() {
        // Check if we are still allowed to dispatch games.
        if (!this.shouldDispatchMoreGames()) {
            this.channel.sysLogger.log(where + ' waiting room is closed. ' +
                                       'Dispatches: ' +
                                       this.numberOfDispatches + '/' +
                                       this.N_GAMES +
                                       '. Aborting current dispatch.',
                                       'warning');
            if (this.suspendedPings.length) this.suspendedPings = [];
            return false;
        }
        return true;
    };

    parseGroupSizeOptions = function(opts) {
        var groupSize, numberOfGames, nPlayers;
        opts = opts || {};

        if ('undefined' !== typeof opts.groupSize) {
            groupSize = J.isInt(opts.groupSize, 0);
            if (false === groupSize) {
                throw new TypeError(where + 'opts.groupSize must be a ' +
                                    'positive number or undefined. Found: ' +
                                    opts.groupSize);
            }
        }
        else {
            groupSize = this.GROUP_SIZE;
        }

        // If nothing is specified, try to dispatch maximal amount of games.
        numberOfGames = opts.numberOfGames;
        if ('undefined' === typeof numberOfGames) {
            nPlayers = this.clients.player.size();
            if (!nPlayers ||
                this.MAX_WAIT_TIME && this.EXECUTION_MODE === 'TIMEOUT') {

                numberOfGames = 1;
            }
            else {
                numberOfGames = Math.floor(nPlayers / groupSize);
            }
        }
        if (this.N_GAMES !== null) {
            numberOfGames = Math.min(numberOfGames, this.N_GAMES);
        }

        opts.numberOfGames = numberOfGames;
        opts.groupSize = groupSize;

        return opts;
    };

    doDispatch = function(opts) {
        var treatmentName;
        var dispatchList;
        var pId, group, groupIdx, groupLimit;
        var i, j;
        var gameRoom, code, gameNumber;
        var pList, nPlayers, nPlayersToDispatch;
        var groups, nGroupsCreated, chosenTreatment;
        var msg, numberOfGames, groupSize, closeAfterDispatch;

        var channel, sysLogger;

        // Have we dispatched 'em all?
        if (!checkShouldDispatch.call(this)) return;

        this.setDispatchState(WaitingRoom.dispatchStates.INITING);

        channel = this.channel;
        sysLogger = channel.sysLogger;

        if (this.ON_DISPATCH) this.ON_DISPATCH(this, opts);
        if ('undefined' !== typeof opts.chosenTreatment) {
            if (this.validateTreatment(opts.chosenTreatment)) {
                chosenTreatment = opts.chosenTreatment;
            }
            else {
                this.abortDispatch(opts, 'Invalid treatment specified: ' +
                                   opts.chosenTreatment);
                return;
            }

        }
        else {
            chosenTreatment = this.CHOSEN_TREATMENT;
        }

        // If coming from a "kick," there might be more players than
        // when the original call to dispatch was performed. Additional
        // players have not been tested, therefore "kick" must pass
        // the list of tested players.
        pList = opts.pList || this.clients.player;
        nPlayers = pList.size();

        groupSize = opts.groupSize;
        numberOfGames = opts.numberOfGames;

        msg = opts.msg || { action: 'allPlayersConnected', exit: 0 };

        if ('undefined' === typeof opts.closeAfterDispatch) {
            closeAfterDispatch = this.closeAfterDispatch;
        }
        else {
            closeAfterDispatch = opts.closeAfterDispatch;
        }

        // If numberOfGames is received as input parameter,
        // the total number of players to dispatch might be too large.
        nPlayersToDispatch = groupSize * numberOfGames;

        if (nPlayers < nPlayersToDispatch) {
            this.abortDispatch(opts,
                               'Cannot dispatch ' + numberOfGames +
                               ' game/s now, too few players are connected: ' +
                               nPlayers);
            return;
        }

        // Shuffle and sort players, if necessary.
        // This means that at least two groups will be created.
        if (nPlayersToDispatch > groupSize) {

            if (this.PLAYER_GROUPING) {
                groups = this.PLAYER_GROUPING(pList, numberOfGames);
                nGroupsCreated = groups.length;

                if (nGroupsCreated !== numberOfGames) {
                    this.abortDispatch(opts,
                                       'PLAYER_GROUPING did not return ' +
                                       'the expected number of groups: ' +
                                       groups.length + ' (found) vs ' +
                                       numberOfGames + ' (expected)');
                    return;
                }

                // TODO: check if each subgroup has the right size.
                // TODO: shall we allowed groups of different sizes?
                dispatchList = [].concat.apply([], groups);

                if (dispatchList.length !== nPlayersToDispatch) {
                    this.abortDispatch(opts,
                                       'PLAYER_GROUPING did not return ' +
                                       'the expected number of players: ' +
                                       dispatchList.length + ' (found) vs ' +
                                       nPlayersToDispatch + ' (expected)');
                    return;
                }


            }
            else {
                // Shuffle player list anyway.
                dispatchList = pList.shuffle().db;
                // Sort according to priority.
                // TODO: We could optimize it, if we knew in advance the
                // sorting criteria, i.e. there might be no need to sort here.
                if (null !== this.PLAYER_SORTING) {
                    dispatchList = dispatchList.sort(this.PLAYER_SORTING);
                }
            }
        }
        else {
            // was:
            // dispatchList = pList.breed().db;
            dispatchList = pList.db.slice();
        }

        this.setDispatchState(WaitingRoom.dispatchStates.DISPATCHING);
        console.log('DISPATCH: ',
                    nPlayersToDispatch + '/' + nPlayers,
                    ('string' === typeof chosenTreatment ?
                     chosenTreatment : 'Function'));

        // If we have too many players log a warning.
        if (nPlayers > nPlayersToDispatch) {

            // Warn if more participants than spots available.
            sysLogger.log('There are more players than available ' +
                          'spots in the game.' +
                          (this.DISCONNECT_IF_NOT_SELECTED ?
                           ' Some players will be disconnected.' : '' ),
                          'warning');
        }

        i = -1;
        gameNumber = -1;
        group = new Array(groupSize);
        groupLimit = groupSize - 1;
        for ( ; ++i < nPlayersToDispatch ; ) {

            // Player id.
            pId = dispatchList[i].id;

            // Do not send messages to bots.
            if (dispatchList[i].clientType !== 'bot') {

                // Inform players.
                this.node.say('DISPATCH', pId, msg);
                this.node.remoteSetup('page', pId, {
                    clearBody: true
                });
            }

            // Clear timeout for players.
            if (this.makeClientTimeOuts) this.clearTimeOut(pId);

            // Add it to the group.
            groupIdx = i % groupSize;
            group[groupIdx] = pId;

            if (groupIdx === groupLimit) {
                gameNumber++;
                // If this is the first dispatch or we need to create a new room
                // anyway, assign a treatment and then setup the game.
                if (!this.lastGameRoom || !this.DISPATCH_TO_SAME_ROOM) {

                    // Decide treatment.
                    treatmentName = this.decideTreatment(chosenTreatment,
                                                        gameNumber);

                    // Starts a game level or the main game.
                    // TODO: should the main game have a ghost level?
                    if (this.gameLevel) {
                        gameRoom = channel.gameLevels[this.gameLevel]
                            .createGameRoom({
                                clients: group,
                                treatmentName: treatmentName
                            });
                    }
                    else {
                        // Create new game room.
                        gameRoom = channel.createGameRoom({
                            clients: group,
                            treatmentName: treatmentName
                        });
                    }

                    // Setup and start game.
                    gameRoom.setupGame();
                    // The list of clients is empty, because the logic
                    // will automatically start them (if syncstepping is on).
                    gameRoom.startGame(true, []);

                    // Store reference.
                    this.lastGameRoom = gameRoom;
                }
                else {
                    // Move clients into existing room.
                    j = -1;
                    for ( ; ++j < groupSize ; ) {
                        channel.moveClient(group[j],
                                           this.lastGameRoom.name,
                                           this.name);
                    }
                    // Setup new group of players in the old room.
                    this.lastGameRoom.setupGame(undefined, false, group);
                    this.lastGameRoom.startGame(false, group, true);
                }

                // One more dispatch done!
                ++this.numberOfDispatches;

                // Close waitingRoom if next game would not be dispatchable.
                if (!this.shouldDispatchMoreGames()) {
                    this.closeRoom();
                    // Force to exit loop.
                    break;
                }
                else {
                    // Clear group.
                    group = new Array(groupSize);
                }
            }
        }

        // All dispatch attempts have been completed.

        // Close room, if requested.
        if (closeAfterDispatch) {
            this.setDispatchState(WaitingRoom.dispatchStates.NONE);
            this.closeRoom();
            this.closeAfterDispatch = false;
        }
        this.setDispatchState(WaitingRoom.dispatchStates.NOTIFYING);

        // Tell players still waiting, that they have not been selected.
        pList = this.clients.player;
        nPlayers = pList.size();
        for (i = 0; i < nPlayers; ++i) {
            pId = pList.db[i].id;

            // Increment timesNotSelected for player.
            if (pList.db[i].timesNotSelected) ++pList.db[i].timesNotSelected;
            else pList.db[i].timesNotSelected = 1;

            if (this.makeClientTimeOuts) this.clearTimeOut(pId);

            code = channel.registry.getClient(pId);
            this.node.say('DISPATCH', pId, {
                action: 'notSelected',
                exit: code.ExitCode,
                shouldDispatchMoreGames: this.shouldDispatchMoreGames()
            });

            // Ste was: (but it does not make any sense).
            // Exit loop.
            // if (!this.shouldDispatchMoreGames()) break
        }
        this.setDispatchState(WaitingRoom.dispatchStates.NONE);

        if (this.ON_DISPATCHED) this.ON_DISPATCHED(this, opts);
    };

    return function(opts) {

        if (!opts) {
            opts = {};
        }
        else if ('object' !== typeof opts) {
            throw new TypeError(where + 'opts must be object ' +
                                'or undefined. Found: ' + opts);
        }
        if (opts.msg && 'object' !== typeof opts.msg) {
            throw new TypeError(where + 'opts.msg must be ' +
                                'object or undefined. Found: ' + opts.msg);
        }

        // Have we dispatched 'em all?
        if (!checkShouldDispatch.call(this)) return;

        // TODO: check here.
        // Originally numberOfGames was set in waitroom.js.
        // Number of games requested.
        //if (!opts.numberOfGames) {
        //    opts.numberOfGames = Math.floor(this.POOL_SIZE / this.GROUP_SIZE);
        //}

        // Fix group size and number of groups.
        // In case of kickUnresponsivePlayers, these can change in between.
        opts = parseGroupSizeOptions.call(this, opts);

        // If a treatment was set, copy it into settings and delete it.
        if (this.OVERWRITE_CHOSEN_TREATMENT) {
            opts.chosenTreatment = this.OVERWRITE_CHOSEN_TREATMENT;
            this.OVERWRITE_CHOSEN_TREATMENT = null;
        }
        // If we have pool of 1 and mode == WAIT_FOR_N_PLAYERS just go ahead!
        if (!this.PING_BEFORE_DISPATCH ||
            (this.EXECUTION_MODE === 'WAIT_FOR_N_PLAYERS' &&
             this.POOL_SIZE === 1)) {

            doDispatch.call(this, opts);
        }
        else {
            // Blocks until all players have returned the ping or are kicked.
            this.kickUnresponsivePlayers(doDispatch, { callbackArgs: opts });
        }
    };
})();

/**
 * ### WaitingRoom.notifyPlayerUpdate
 *
 * Notifies players a change in the number of players
 *
 * @param {number} np Optional. Number of players. If not specified
 *   the number of players will be fetched at the moment of sending the
 *   message. If specified, the message is sent immediately.
 */
WaitingRoom.prototype.notifyPlayerUpdate = function(np) {
    var that;
    if ('number' === typeof np) {
        this.node.say('PLAYERSCONNECTED', 'ROOM', np);
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
            this.notifyTimeout = null;
        }
    }
    else if (!this.notifyTimeout) {
        that = this;
        // Group together a few connect-notifications before sending them.
        this.notifyTimeout = setTimeout(function() {
            // Delete timeout.
            that.notifyTimeout = null;
            // Notify all players of new connection/s.
            that.node.say('PLAYERSCONNECTED', 'ROOM', that.node.game.pl.size());
        }, this.NOTIFY_INTERVAL);
    }
};

/**
 * ## WaitingRoom.makeTimeOut
 *
 * Register a timeout for a player
 *
 * @param {number} playerID ID of player for which to register timeout.
 * @param {number} waitTime Nnumber of milliseconds to wait before execution
 *   of callback. If null then no timeout is made.
 * @param {function} cb (Optional) callback to register. If undefined a
 *   predefine callback is used.
 *
 * @see WaitingRoom.clearTimeOut
 */
WaitingRoom.prototype.makeTimeOut = function(playerID, waitTime, cb) {
    var that, channel;
    if (null === waitTime) return;

    that = this;
    channel = this.channel;

    cb = cb || function() {
        var code, pList, nPlayers, res;
        channel.sysLogger.log('Waitroom timed out for: ' + playerID);
        pList = that.clients.player;
        nPlayers = pList.size();

        that.node.say('TIME', playerID);

        code = channel.registry.getClient(playerID);

        // If a timeout function for the server was specified,
        // executes. If the return value is FALSE, do not continue
        // with checkout and informing the player about NotEnoughPlayers.
        if (that.ON_TIMEOUT_SERVER) {
            // TODO: pass that as parameter.
            res = that.ON_TIMEOUT_SERVER.call(that, code);
            if (res === false) return;
        }

        // If an access code is defined, checkout remotely.
        channel.registry.checkOut(playerID);
        that.node.say('DISPATCH', playerID, {
            action: 'notEnoughPlayers',
            exit: code.ExitCode
        });
    };
    this.timeOuts[playerID] = setTimeout(cb, waitTime);
};

/**
 * ## WaitingRoom.clearTimeOut
 *
 * Clear a timeout for a player
 *
 * @param {number} playerID ID of player for which to clear the timeout.
 *
 * @see WaitingRoom.makeTimeOut
 */
WaitingRoom.prototype.clearTimeOut = function(playerID) {
    clearTimeout(this.timeOuts[playerID]);
    this.timeOuts[playerID] = null;
};

/**
 * ## WaitingRoom.decideTreatment
 *
 * Check if string, or use it.
 *
 * @param {mixed} t String, object, function or undefined
 *   used to decide a treatment
 *
 * @return {string} Chosen treatment
 */
WaitingRoom.prototype.decideTreatment = function(t, idxInBatch) {
    var treatments, tLen, chosenT;
    treatments = this.channel.gameInfo.treatmentNames;
    tLen = treatments.length;

    if (t === 'treatment_rotate') {
        return treatments[(this.channel.autoRoomNo) % tLen];
    }
    if ('treatment_random' === t || 'undefined' === typeof t) {
        return treatments[J.randomInt(-1, tLen-1)];
    }
    if ('function' === typeof t) {

        chosenT = t(treatments, this.channel.autoRoomNo, idxInBatch);
        if ('string' !== typeof chosenT) {
            throw new TypeError('WaitingRoom.decideTreatment: callback must ' +
                                'return string. Found: ' + chosenT);
        }
        if (!this.channel.hasGameTreatment(chosenT))  {
            throw new TypeError('WaitingRoom.decideTreatment: callback ' +
                                'returned unknown treatment: ' + chosenT);
        }
        return chosenT;
    }

    // Return treatment (was a string already).
    return t;
};

/**
 * ### WaitingRoom.abortDispatch
 *
 * Aborts an an attempt to dispatch
 *
 * Logs an error message, cleans up state, and executes a callback, if defined.
 *
 * @param {object} opts The dispatch options
 * @param {string} msg Optional. A message describing the reason for
 *   aborting the dispatch
 *
 * @see WaitingRoom.ON_FAILED_DISPATCH
 */
WaitingRoom.prototype.abortDispatch = function(opts, msg) {
    this.channel.sysLogger.log('WaitingRoom.dispatch: aborted. ' + (msg || ''),
                               'error');
    this.setDispatchState(WaitingRoom.dispatchStates.NONE);
    if (this.ON_FAILED_DISPATCH) this.ON_FAILED_DISPATCH(this, opts, msg);
};

/**
 * ### WaitingRoom.setDispatchState
 *
 * Sets the dispatching state
 *
 * @see WaitingRoom.getdispatchState
 * @see WaitingRoom.dispatchState
 * @see WaitingRoom.dispatchStates
 */
WaitingRoom.prototype.setDispatchState = function(state) {
    if (!WaitingRoom.dispatchStates[state]) {
        throw new Error('WaitingRoom.setdispatchState: unknown state. ' +
                        'Found: ' + state);
    }
    this.dispatchState = state;
};

/**
 * ### WaitingRoom.getDispatchState
 *
 * Sets the dispatching state
 *
 * @see WaitingRoom.setdispatchState
 * @see WaitingRoom.dispatchState
 * @see WaitingRoom.dispatchStates
 */
WaitingRoom.prototype.getDispatchState = function() {
    return this.dispatchState;
};

// ## Helper methods

/**
 * ## checkPositiveInteger
 *
 * Checks whether a property is a positive integer throwing an error if not
 *
 * @param {object} settings The object for which to check a property.
 * @param {string} name The name of the property to check.
 * @param {string} where String to prepend to the error message.
 *
 * @throws {Error} Thrown if `settings[name]` is not a positive integer
 *
 * @see WaitingRoom.parseSettings
 */
function checkPositiveInteger(settings, name, where) {
    var N;
    N = settings[name];
    if (!J.isInt(N, 0)) {
        throw new Error (where + name + ' must be an' +
                         ' integer and larger than 0. Found: ' + N);
    }
}

/**
 * ## assignIfFunction
 *
 * Assigns a property to an object from another one if it is a function
 *
 * The property in the object must be undefined or function, otherwise
 * an error will be raised.
 *
 * @param {string} name The name of the property to verify and assign
 * @param {object} toObj The object to which the property will be assigned
 * @param {object} fromObj The object from which the property will be copied
 * @param {string} where A prefix for the error message. Default:
 *   'WaitingRoom.parseSettings: '.
 */
function assignIfFunction(name, toObj, fromObj, where) {
    if ('undefined' !== typeof fromObj[name]) {
        if ('function' !== typeof fromObj[name]) {
            new TypeError((where || 'WaitingRoom.parseSettings: ') + name +
                          'must be function or undefined. Found: ' +
                          fromObj[name]);
        }
        toObj[name] = fromObj[name];
    }
}


/**
 * ## assignIfStringLikeObj
 *
 * Assigns an object that must contains only "string-like" values
 *
 * "String-like" means string, function (returning a string), or falsy
 * (negating the string). Other values will raise an error.
 *
 * @param {string} name The name of the property to verify and assign
 * @param {object} toObj The object to which the property will be assigned
 * @param {object} fromObj The object from which the property will be copied
 * @param {string} where A prefix for the error message. Default:
 *   'WaitingRoom.parseSettings: '.
 */
function assignIfStringLikeObj(name, toObj, fromObj, where) {
    var t, value;
    if ('undefined' !== typeof fromObj[name]) {
        if ('object' !== typeof fromObj[name]) {
            new TypeError((where || 'WaitingRoom.parseSettings: ') + name +
                          'must be object or undefined. Found: ' +
                          fromObj[name]);
        }
        for (t in fromObj[name]) {
            if (fromObj[name].hasOwnProperty(t)) {
                value = fromObj[name][t];
                if ('string' !== typeof value &&
                    'function' !== typeof value &&
                    false !== value) {

                    throw new TypeError(
                        (where || 'WaitingRoom.parseSettings: ') + name +
                            '.' + t + ' must be string, function, false or ' +
                            'undefined. Found: ' + value
                    );
                }
            }
        }
        toObj[name] = fromObj[name];
    }
}
