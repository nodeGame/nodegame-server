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

var HostRoom = require('./HostRoom');

/*  Inherit from HostRoom.
    Same effect as `WaitingRoom.prototype.__proto__ = HostRoom.prototype;`
    without relying on non-standard `__proto__`
*/
WaitingRoom.prototype = Object.create(HostRoom.prototype);

WaitingRoom.prototype.constructor = WaitingRoom;

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
    if (!this.logicPath) this.logicPath  = './rooms/wait.room';

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
    var d;
    var where;
    var gameName;
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
            throw new Error (where + 'START_DATE must be valid argument for' +
                ' Date constructor. Found: ' + settings.START_DATE);
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
                   'number or undefined. Found: ' +  settings.MAX_WAIT_TIME);
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

    if ('undefined' !== typeof settings.CHOSEN_TREATMENT) {
        if ('function' !== typeof settings.CHOSEN_TREATMENT &&
            'string' !== typeof settings.CHOSEN_TREATMENT) {

            throw new TypeError(where + 'CHOSEN_TREATMENT must be string, ' +
                'function or undefined. Found: ' + settings.CHOSEN_TREATMENT);
        }
        this.CHOSEN_TREATMENT = settings.CHOSEN_TREATMENT;
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
 * @param {function} callback Callback to be executed when pinging iscompleted.
 * @param {object} options Options object taking the following default values:
 *   - timeToWaitForPing: 1000 // Milliseconds to wait for response before kick
 *   - waitFullTime: false // If true, callback is executed after
 *                         // timeToWaitForPing + 500. If false callback is
 *                         // executed when last pinging is complete.
 */
WaitingRoom.prototype.kickUnresponsivePlayers = function(callback, options) {
    var cb, that;
    var i, timeToWaitForPing;
    var hasReturned, timeout, makeCallback;
    var players, where;
    where = 'WaitingRoom.kickUnresponsivePlayers';
    that = this;

    if (this.isPingInProgress) {
        console.log('Warning: Suspending call to ' + where +
               ' because kicking is still in progress.');
        this.suspendedPings.push([callback, options]); // was arguments
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
        if(callback) callback();

        // Execute suspended calls.
        if(that.suspendedPings.length > 0) {
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
        var p = players[i];
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
    var customSorting;
    customSorting = function(a,b) {
        if (a.timesNotSelected < b.timesNotSelected) {
            return -1;
        }
        else if (a.timesNotSelected > b.timesNotSelected) {
            return 1;
        }
        return 0;
    };
    return function(msg, numberOfGames) {
        var where, that;
        that = this;
        where = 'WaitingRoom.dispatch: ';

        // Blocks until all players have returned the ping or are kicked.
        this.kickUnresponsivePlayers(function () {
            var treatmentName;
            var shuffledPList;
            var limitedPList;
            var i, gameRoom, code, gameNumber;
            var pList, nPlayers;

            // If nothing is specified, try to dispatch maximal amount of games.
            if ('undefined' === typeof numberOfGames) {
                if (that.MAX_WAIT_TIME && that.EXECUTION_MODE === 'TIMEOUT') {
                    numberOfGames = 1;
                }
                else {
                    pList = that.clients.player;
                    nPlayers = pList.size();
                    numberOfGames = Math.floor(nPlayers/that.GROUP_SIZE);
                }
            }
            if (that.N_GAMES !== null) {
                numberOfGames = Math.min(numberOfGames,that.N_GAMES);
            }

            // Warn if more participants than seats available.
            if (that.GROUP_SIZE * numberOfGames < nPlayers) {
                console.log('Warning. There are more players than available' +
                ' seats in the game.' + that.DISCONNECT_IF_NOT_SELECTED ?
                ' Some players will be disconnected.' : '');
            }

            // Attempt to dispatch `numberOfGames`.
            for (gameNumber = 0; gameNumber < numberOfGames; ++gameNumber) {

                pList = that.clients.player;
                nPlayers = pList.size();

                // Cannot dispatch a game with too few participants.
                if (nPlayers < that.GROUP_SIZE) {
                    throw new Error(where + 'Attempting to dispatch game for ' +
                        that.GROUP_SIZE + ' players with only ' + nPlayers +
                        ' participants.');
                }

                // Check if we are still allowed to dispatch games.
                if (!that.shouldDispatchMoreGames()) {
                    that.channel.sysLogger.log(where +
                           'Number of dispatches already performed: ' +
                           that.numberOfDispatches +
                           ' Number of specified games: ' + that.N_GAMES +
                           ' Dispatching again anyways.');
                    return;
                }
                ++that.numberOfDispatches;

                // Shuffle player list.
                shuffledPList = pList.shuffle();

                // Sort according to priority.
                shuffledPList.sort(customSorting);

                // Inform players.
                for (i = 0; i < nPlayers; i++) {
                    // Players that may join the game.
                    if (i < that.GROUP_SIZE) {
                        that.node.say('DISPATCH', shuffledPList.db[i].id, msg);

                        // Clear body.
                        that.node.remoteSetup('page', shuffledPList.db[i].id, {
                            clearBody: true
                        });
                        // Clear timeout for players.
                        that.clearTimeOut(shuffledPList.db[i].id);
                    }
                    // Players that may not join.
                    else {
                        // Increase timesNotSelected of player.
                        if (that.clients.player.db[i].timesNotSelected) {
                            ++that.clients.player.db[i].timesNotSelected;
                        }
                        else {
                            that.clients.player.db[i].timesNotSelected = 1;
                        }

                        if (that.START_DATE) {
                            that.clearTimeOut(shuffledPList.db[i].id);
                        }
                    }
                }

                // Choose players.
                limitedPList = shuffledPList.limit(that.GROUP_SIZE);

                // Decide treatment.
                treatmentName = that.decideTreatment(that.CHOSEN_TREATMENT);

                // Create new game room.
                gameRoom = that.channel.createGameRoom({
                    clients: limitedPList,
                    treatmentName: treatmentName
                });

                // Setup and start game.
                gameRoom.setupGame();
                gameRoom.startGame(true, []);

                // Close waitingRoom if next game would not be dispatchable.
                if (!that.shouldDispatchMoreGames()) {
                    that.closeRoom();
                }

            } // All dispatch attempts have been completed.
            pList = that.clients.player;
            nPlayers = pList.size();
            // Tell players still waiting, that they have not been selected.
            for (i = 0; i < nPlayers; ++i) {
                code = that.channel.registry.getClient(pList.db[i].id);
                that.node.say('DISPATCH', pList.db[i].id, {
                    action: 'NotSelected',
                    exit: code.ExitCode,
                    shouldDispatchMoreGames: that.shouldDispatchMoreGames()
                });
            }
        });
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
    var that;
    that = this;
    if (null === waitTime) return;
    cb = cb || function() {
        var code, pList, nPlayers;
        that.channel.sysLogger.log('Timeout has not been cleared!!!');
        pList = that.clients.player;
        nPlayers = pList.size();

        that.node.say('TIME', playerID);
        if (nPlayers >= that.POOL_SIZE) {
            that.dispatch({
                action: 'AllPlayersConnected',
                nPlayers: nPlayers
            });
        }
        else {
            that.channel.registry.checkOut(playerID);

            // See if an access code is defined, if so checkout remotely
            // also.
            code = that.channel.registry.getClient(playerID);

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
 *
 * @see ServerChannel.treatments
 */
WaitingRoom.prototype.decideTreatment = function(t) {
    var treatments, tLen, chosenT;
    treatments = this.channel.treatmentNames;
    tLen = treatments.length;

    if (t === 'treatment_rotate') {
        return treatments[(this.channel.autoRoomNo) % tLen];
    }
    if ('undefined' === typeof t) {
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
