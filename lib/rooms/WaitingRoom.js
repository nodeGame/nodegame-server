/**
 * # WaitinRoom
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Waiting room.
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = WaitingRoom;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;
var path = require('path');
var ngt = require('nodegame-game-template');

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
 * Predefined callbacks to sort the list of players before dispatching.
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

    // ### treatment_rotate
    // Rotates across all treatments sequentially
    'treatment_rotate': true,
    // ### random
    // Selects a random treatment (with re-sampling)
    'treatment_random': true
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
    if (!this.logicPath) {
        this.logicPath = ngt.resolve('waitroom/waitroom.js');
    }

    /**
     * ### WaitingRoom.roomOpen
     *
     * Flag indicating whether the room is open
     */
    this.roomOpen = config.roomOpen || true;

    /**
     * ### WaitingRoom.timeOuts
     *
     * Array of setTimeout return values indexed by playerIDs
     */
    this.timeOuts = {};

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
     * In the execution mode ´'TIMEOUT'´, one waits until the time is up, then
     * it will be checked whether enough players are there to start the game.
     * In the execution mode ´'WAIT_FOR_N_PLAYERS'´, the game starts right away
     * if there are the desired number of players. Otherwise, when the time is
     * up, it will be checked if there are at least a certain minimum number of
     * players to start the game.
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
     * ### WaitingRoom.CHOSEN_TREATMENT
     *
     * String or undefined indicating chosen treatment
     */
    this.CHOSEN_TREATMENT = null;

    /**
     * ### WaitingRoom.PLAYER_SORTING
     *
     * Callback to sort the list of players before dispatching
     *
     * If NULL, random sorting takes place. Default: 'timesNotSelected'
     */
    this.PLAYER_SORTING = WaitingRoom.sortingCallbacks.timesNotSelected;

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
}

/**
 * ## WaitingRoom.parseSettings
 *
 * Validates settings and appends values to `this`
 *
 * @param {object} settings Configuration object
 */
WaitingRoom.prototype.parseSettings = function(settings) {
    var d, where, gameName, t;
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
        throw new TypeError(where + 'GROUP_SIZE must be number. Found: ' +
                            settings.GROUP_SIZE);
    }

    if ('undefined' !== typeof settings.POOL_SIZE) {
        if ('number' === typeof settings.POOL_SIZE) {
            checkPositiveInteger(settings, 'POOL_SIZE', where);
            this.POOL_SIZE = settings.POOL_SIZE;
        }
        else {
            throw new TypeError(where + 'POOL_SIZE must be number or ' +
                                'undefined. Found: ' + settings.POOL_SIZE);
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
            throw new TypeError(where + 'N_GAMES must be a number or ' +
                                'undefined. Found: ' + settings.N_GAMES);
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
                                settings.DISPATCH_TO_SAME_ROOM );
        }
    }

    if ('string' !== typeof settings.EXECUTION_MODE) {
        throw new TypeError(where + 'EXECUTION_MODE must be string. Found: ' +
                            settings.EXECUTION_MODE);
    }
    else {
        if (settings.EXECUTION_MODE !== 'TIMEOUT' &&
            settings.EXECUTION_MODE !== 'WAIT_FOR_N_PLAYERS') {
            throw new Error(where + 'Invalid execution mode: ' +
                            settings.EXECUTION_MODE);
        }
        this.EXECUTION_MODE = settings.EXECUTION_MODE;
    }

    if ('undefined' !== typeof settings.START_DATE) {
        if (this.EXECUTION_MODE === 'WAIT_FOR_N_PLAYERS') {
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

    if ('undefined' !== typeof settings.ON_TIMEOUT) {
        if ('function' !== typeof settings.ON_TIMEOUT) {
            new TypeError(where +
                          'ON_TIMEOUT must be function or undefined. Found: ' +
                          settings.ON_TIMEOUT);
        }
        this.ON_TIMEOUT = settings.ON_TIMEOUT;
    }

    if ('undefined' !== typeof settings.ON_TIMEOUT_SERVER) {
        if ('function' !== typeof settings.ON_TIMEOUT_SERVER) {
            throw new TypeError(where + 'ON_TIMEOUT_SERVER must be function ' +
                                'or undefined. Found: ' +
                                settings.ON_TIMEOUT_SERVER);
        }
        this.ON_TIMEOUT_SERVER = settings.ON_TIMEOUT_SERVER;
    }


    if ('undefined' !== typeof settings.CHOSEN_TREATMENT) {
        if ('string' === typeof settings.CHOSEN_TREATMENT) {
            if (!WaitingRoom.treatmentCallbacks[settings.CHOSEN_TREATMENT]) {

                if (this.gameLevel) {
                    // Treatments are not yet parsed.
                    t = this.game.levels[this.gameLevel].settings.treatments;
                }
                else {
                    // Treatments are already parsed at this point.
                    t = this.game.settings;
                }

                if (!t[settings.CHOSEN_TREATMENT]) {

                    throw new TypeError(where + 'CHOSEN_TREATMENT algorithm ' +
                                        'or treatment not found: ' +
                                        settings.CHOSEN_TREATMENT);
                }
            }
        }
        else if ('function' !== typeof settings.CHOSEN_TREATMENT) {

            throw new TypeError(where + 'CHOSEN_TREATMENT must be string, ' +
                                'function or undefined. Found: ' +
                                settings.CHOSEN_TREATMENT);
        }
        this.CHOSEN_TREATMENT = settings.CHOSEN_TREATMENT;
    }

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

};

/**
 * ## WaitingRoom.makeWidgetConfig
 *
 * Creates an object to be passed to widget for configuration
 */

WaitingRoom.prototype.makeWidgetConfig = function() {
    return {
        groupSize: this.GROUP_SIZE,
        poolSize: this.POOL_SIZE,
        disconnectIfNotSelected: this.DISCONNECT_IF_NOT_SELECTED,
        nGames: this.N_GAMES,
        startDate: this.START_DATE,
        executionMode: this.EXECUTION_MODE,
        maxWaitTime: this.MAX_WAIT_TIME,
        onTimeout: this.ON_TIMEOUT,
        chosenTreatment: this.CHOSEN_TREATMENT
    };
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
 */
WaitingRoom.prototype.closeRoom = function() {
    this.roomOpen = false;
};

/**
 * ## WaitingRoom.openRoom
 *
 * Changes state of `this` to open
 */
WaitingRoom.prototype.openRoom = function() {
    this.roomOpen = true;
};

/**
 * ### WaitingRoom.shouldDispatchMoreGames
 *
 * Checks whether another game can be dispatched
 */
WaitingRoom.prototype.shouldDispatchMoreGames = function() {
    if (this.N_GAMES) {
       return this.numberOfDispatches < this.N_GAMES;
    }
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
 *   - callbackArgs: (array) arguments to be passed to the callback
 *   - timeToWaitForPing: Wait time before kicking in milliseconds.
 *        Default: 1000
 *   - waitFullTime: If TRUE, callback is executed after
 *        (timeToWaitForPing + 500). If FALSE callback is executed when
 *        pinging is complete.
 */
WaitingRoom.prototype.kickUnresponsivePlayers = function(callback, options) {
    var cb, that;
    var i, timeToWaitForPing;
    var hasReturned, timeout, makeCallback;
    var players, p;
    var where;

    where = 'WaitingRoom.kickUnresponsivePlayers';
    that = this;

    if (this.isPingInProgress) {
        console.log('Warning: Suspending call to ' + where +
               ' because kicking is still in progress.');
        this.suspendedPings.push([callback, options]);
        return;
    }

    // Lock this function.
    this.isPingInProgress = true;

    players = this.clients.player.db;

    options = options || {};
    timeToWaitForPing = options.timeToWaitForPing || 1000;
    cb = function() {
        // When done, unlock function.
        that.isPingInProgress = false;
        if (callback) {
            callback.apply(that, options.callbackArgs);
        }

        // Execute suspended calls.
        if (that.suspendedPings.length > 0) {
            that.kickUnresponsivePlayers.apply(that, that.suspendedPings.pop());
        }
    };

    hasReturned = [];
    timeout = setTimeout(cb, timeToWaitForPing + 500);
    makeCallback = function(i) {
        if (options.waitFullTime) return function(){};
        return function() {
            var j, allReturned;

            allReturned = true;
            hasReturned[i] = true;
            for (j = 0; j < players.length; ++j) {
                allReturned = allReturned && (hasReturned[j] === true);
            }
            if (allReturned) {
                clearTimeout(timeout);
                cb();
            }
        };
    };
    for (i = 0; i < players.length; ++i) {
        p = players[i];
        console.log('Pinging player ' + p.id);
        that.node.get('PING',
            makeCallback(i),
            p.id,
            {
                timeout: timeToWaitForPing,
                executeOnce: true,
                timeoutCb: (function(p) {
                    return function() {
                        console.log('Player ' + p.id +
                                ' unresponsive. Kicking.');
                        that.node.socket.send(that.node.msg.create({
                            target: 'SERVERCOMMAND',
                            text: 'DISCONNECT',
                            data: {
                                id: p.id,
                                sid: p.sid
                            }
                        }));
                    };
                })(p)
            }
        );
    }
};

/**
 * ## WaitingRoom.dispatch
 *
 * Initiates the start of the game
 *
 * May only be called once. Implemented using a self-calling function
 *
 * @param {object} msg Data to send to all players
 */
WaitingRoom.prototype.dispatch = (function() {
    var doDispatch;

    doDispatch = function(msg, numberOfGames) {
        var treatmentName;
        var shuffledPList;
        var pId, group, groupIdx, groupLimit;
        var i, j;
        var gameRoom, code, gameNumber;
        var pList, nPlayers, playerIds, nPlayersToDispatch;

        var where, channel, sysLogger;

        channel = this.channel;
        sysLogger = channel.sysLogger;
        where = 'WaitingRoom.dispatch: ';

        pList = this.clients.player;
        nPlayers = pList.size();

        // If nothing is specified, try to dispatch maximal amount of games.
        if ('undefined' === typeof numberOfGames) {
            if (this.MAX_WAIT_TIME && this.EXECUTION_MODE === 'TIMEOUT') {
                numberOfGames = 1;
            }
            else {
                numberOfGames = Math.floor(nPlayers / this.GROUP_SIZE);
            }
        }
        if (this.N_GAMES !== null) {
            numberOfGames = Math.min(numberOfGames, this.N_GAMES);
        }

        // If numberOfGames is received as input parameter,
        // the total number of players to dispatch might be too large.
        nPlayersToDispatch = this.GROUP_SIZE * numberOfGames;

        if (nPlayers < nPlayersToDispatch) {
            sysLogger.log(where + ' cannot dispatch ' + numberOfGames +
                          ' now, too few players are connected: ' + nPlayers +
                          '. Aborting dispatch.', 'error');
            return;
        }

        // Shuffle and sort players, if necessary.
        if (nPlayersToDispatch > this.GROUP_SIZE) {

            // Shuffle player list anyway.
            shuffledPList = pList.shuffle();
            // Sort according to priority.
            // TODO: We could optimize it, if we knew in advance the
            // sorting criteria, i.e. there might be no need to sort here.
            if (null !== this.PLAYER_SORTING) {
                shuffledPList = shuffledPList.sort(this.PLAYER_SORTING);
            }
        }
        else {
            shuffledPList = pList.breed();
        }

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
        group = new Array(this.GROUP_SIZE), groupLimit = this.GROUP_SIZE - 1;
        for ( ; ++i < nPlayersToDispatch ; ) {

            // Check if we are still allowed to dispatch games.
            if (!this.shouldDispatchMoreGames()) {
                sysLogger.log(where + ' all games already dispatched: ' +
                              this.numberOfDispatches + '/' + this.N_GAMES +
                              '. Aborting current dispatch.', 'warning');
                return;
            }
            ++this.numberOfDispatches;

            // Player id.
            pId = shuffledPList.db[i].id;

            // Inform players.
            this.node.say('DISPATCH', pId, msg);
            this.node.remoteSetup('page', pId, {
                clearBody: true
            });
            // Clear timeout for players.
            this.clearTimeOut(pId);

            // Add it to the group.
            groupIdx = i % this.GROUP_SIZE;
            group[groupIdx] = pId;

            if (groupIdx === groupLimit) {
                console.log('DISPATCH!');
                // If this is the first dispatch or we need to create a new room
                // anyway, assign a treatment and then setup the game.
                if (!this.lastGameRoom || !this.DISPATCH_TO_SAME_ROOM) {

                    // Decide treatment.
                    treatmentName = this.decideTreatment(this.CHOSEN_TREATMENT);

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
                    gameRoom.startGame(true, []);

                    // Store reference.
                    this.lastGameRoom = gameRoom;
                }
                else {
                    // Move clients into existing room.
                    j = -1;
                    for ( ; ++j < this.GROUP_SIZE ; ) {
                        channel.moveClient(group[j],
                                           this.lastGameRoom.name,
                                           this.name);
                    }
                    // Setup new group of players in the old room.
                    this.lastGameRoom.setupGame(undefined, false, group);
                    this.lastGameRoom.startGame(false, group, true);
                }

                // Close waitingRoom if next game would not be dispatchable.
                if (!this.shouldDispatchMoreGames()) {
                    this.closeRoom();
                }
                else {
                    // Clear group.
                    group = new Array(this.GROUP_SIZE);
                }
            }
        }

        // All dispatch attempts have been completed.

        // Tell players still waiting, that they have not been selected.
        pList = this.clients.player;
        nPlayers = pList.size();
        // TODO: check HERE!!
        for (i = 0; i < nPlayers; ++i) {
            pId = pList.db[i].id;

            // Increment timesNotSelected for player.
            if (pList.db[i].timesNotSelected) ++pList.db[i].timesNotSelected;
            else pList.db[i].timesNotSelected = 1;

            if (this.START_DATE) this.clearTimeOut(pId);

            code = channel.registry.getClient(pId);
            this.node.say('DISPATCH', pId, {
                action: 'NotSelected',
                exit: code.ExitCode,
                shouldDispatchMoreGames: this.shouldDispatchMoreGames()
            });
        }
    };

    return function(msg, numberOfGames) {
        // If we have pool of 1 and mode == WAIT_FOR_N_PLAYERS just go ahead!
        if (this.EXECUTION_MODE === 'WAIT_FOR_N_PLAYERS' &&
            this.POOL_SIZE === 1) {

            doDispatch.call(this, msg, numberOfGames);
        }
        else {
            // Blocks until all players have returned the ping or are kicked.
            this.kickUnresponsivePlayers(doDispatch, [ msg, numberOfGames ]);
        }
    };
})();

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

        // TODO: do we need to check if we have enough players?
        if (nPlayers >= that.POOL_SIZE) {
            that.dispatch({
                action: 'AllPlayersConnected',
                nPlayers: nPlayers
            });
        }
        else {
            code = channel.registry.getClient(playerID);

            // If a timeout function for the server was specified,
            // executes. If the return value is FALSE, do not continue
            // with checkout and informing the player about NotEnoughPlayers.
            if (that.ON_TIMEOUT_SERVER) {
                res = that.ON_TIMEOUT_SERVER.call(that, code);
                if (res === false) return;
            }

            // If an access code is defined, checkout remotely.
            channel.registry.checkOut(playerID);
            that.node.say('DISPATCH', playerID, {
                action: 'NotEnoughPlayers',
                exit: code.ExitCode
            });
        }

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
WaitingRoom.prototype.decideTreatment = function(t) {
    var treatments, tLen, chosenT;
    treatments = this.channel.gameInfo.treatmentNames;
    tLen = treatments.length;

    if (t === 'treatment_rotate') {
        return treatments[(this.channel.autoRoomNo) % tLen];
    }
    if ('random' === t || 'undefined' === typeof t) {
        return treatments[J.randomInt(-1, tLen-1)];
    }
    if ('function' === typeof t) {

        chosenT = t(treatments, this.channel.autoRoomNo);
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
