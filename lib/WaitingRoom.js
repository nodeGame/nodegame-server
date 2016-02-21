/**
 * # WaitinRoom
 * Copyright(c) 2015 Stefano Balietti
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

    this.DISCONNECT_IF_NOT_SELECTED = null;
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
         throw new TypeError(where + 'settings must be object.');
    }

    if ('number' === typeof settings.GROUP_SIZE) {
        checkPositiveInteger(settings, 'GROUP_SIZE', where);
        this.GROUP_SIZE = settings.GROUP_SIZE;
    }
    else {
        throw new TypeError(where + 'GROUP_SIZE must be a number.');
    }

    if ('undefined' !== typeof settings.POOL_SIZE) {
        if ('number' === typeof settings.POOL_SIZE) {
            checkPositiveInteger(settings, 'POOL_SIZE', where);
            this.POOL_SIZE = settings.POOL_SIZE;
        }
        else {
            throw new TypeError(where +
                'POOL_SIZE must be a number or undefined.');
        }
    }
    else {
        this.POOL_SIZE = settings.GROUP_SIZE;
    }

    if ('undefined' !== typeof settings.N_GAMES) {
        if ('number' === typeof settings.POOL_SIZE) {
            checkPositiveInteger(settings, 'N_GAMES', where);
            this.N_GAMES = settings.N_GAMES;
        }
        else {
            throw new TypeError(where +
                'N_GAMES must be a number or undefined.');
        }
    }

    if ('undefined' !== typeof settings.DISCONNECT_IF_NOT_SELECTED) {
        if ('boolean' === typeof settings.DISCONNECT_IF_NOT_SELECTED) {
            this.DISCONNECT_IF_NOT_SELECTED =
                settings.DISCONNECT_IF_NOT_SELECTED;
        }
        else {
            throw new TypeError(where +
                'DISCONNECT_IF_NOT_SELECTED must be boolean or undefined');
        }
    }

    if ('string' !== typeof settings.EXECUTION_MODE) {
        throw new TypeError(where + 'EXECUTION_MODE must be a string.');
    }
    else {
        if (settings.EXECUTION_MODE !== 'TIMEOUT' &&
            settings.EXECUTION_MODE !== 'WAIT_FOR_N_PLAYERS') {
            throw new Error(where + 'Invalid exection mode: ' +
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
                ' Date constructor. Value provided: ' + settings.START_DATE);
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
                   'a number or undefined.');
        }
    }
    else {
        if (this.EXECUTION_MODE === 'TIMEOUT') {
            throw new Error(where + 'For EXECUTION_MODE "TIMEOUT" either ' +
                'MAX_WAIT_TIME or START_DATE must be ' + 'defined.');
        }
    }

    if ('undefined' !== typeof settings.ON_TIMEOUT) {
        if ('function' !== typeof settings.ON_TIMEOUT) {
            new TypeError(where +
                'ON_TIMEOUT must be a function or undefined.');
        }
        this.ON_TIMEOUT = settings.ON_TIMEOUT;
    }

    if ('undefined' !== typeof settings.CHOSEN_TREATMENT) {
        if ('string' !== typeof settings.CHOSEN_TREATMENT) {
            throw new TypeError(where + 'CHOSEN_TREATMENT must be string or ' +
                'undefined');
        }
        this.CHOSEN_TREATMENT = settings.CHOSEN_TREATMENT;
    }
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

WaitingRoom.prototype.isDispatchable() {
    if (this.N_GAMES) {
       return this.numberOfDispatches < this.N_GAMES;
    }
    // TODO: Maybe check other conditions?
    return true;
}
/**
 * ## WaitingRoom.dispatch
 *
 * Initiates the start of the game
 *
 * May only be called once. Implemented using a self-calling function
 *
 * @param {object} timeOutData Data to send to all players
 */
WaitingRoom.prototype.dispatch = function (timeOutData) {
    var treatmentName;
    var shuffledPList;
    var limitedPList;
    var i, gameRoom;
    var pList, nPlayers;
    var where;
    where = 'WaitingRoom.dispatch: ';

    pList = this.clients.player;
    nPlayers = pList.size();

    if (!this.isDispatchable()) {
        this.channel.sysLogger.log(where + 'Not allowed to dispatch game.');
        // TODO: Should we just return here?
        // return;
    }
    else {
        ++this.numberOfDispatches;
    }

    // Shuffle player list.
    shuffledPList = pList.shuffle();

    // Sort according to priority.
    shuffledPList.sort(function(a,b) {
        if (a.timesNotSelected < b.timesNotSelected) {
            return -1;
        }
        else if (a.timesNotSelected > b.timesNotSelected) {
            return 1;
        }
        return 0;
    });


    // Inform players.
    for (i = 0; i < nPlayers; i++) {
        // Players that may join the game.
        if (i < this.GROUP_SIZE) {
            this.node.say("TIME", shuffledPList.db[i].id, timeOutData);

            // Clear body.
            this.node.remoteSetup('page', shuffledPList.db[i].id, {
                clearBody: true
            });
            // Clear timeout for players.
            this.clearTimeOut(shuffledPList.db[i].id);
        }
        // Players that may not join.
        else {
            this.node.say("TIME", shuffledPList.db[i].id, {
                over: "Not selected",
                isDispatchable: this.isDispatchable()
            });
            // Increase timesNotSelected of player.
            if (this.clients.player.db[i].timesNotSelected) {
                ++this.clients.player.db[i].timesNotSelected;
            }
            else {
                this.clients.player.db[i].timesNotSelected = 1;
            }

            if (this.START_DATE) {
                this.clearTimeOut(shuffledPList.db[i].id);
            }
        }
    }

    // Choose players.
    limitedPList = shuffledPList.limit(this.GROUP_SIZE);

    // Decide treatment.
    treatmentName = this.decideTreatment(this.CHOSEN_TREATMENT);

    // Create new game room.
    gameRoom = this.channel.createGameRoom({
        clients: limitedPList,
        treatmentName: treatmentName
    });

    // Setup and start game.
    gameRoom.setupGame();
    gameRoom.startGame(true, []);

    // Close waitingRoom if next game would not be dispatchable.
    if (!this.isDispatchable()) {
        this.closeRoom();
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
    var that = this;
    if (null === waitTime) return;
    cb = cb || function() {
        var timeOutData, code, pList, nPlayers;
        that.channel.sysLogger.log("Timeout has not been cleared!!!");
        pList = that.clients.player;
        nPlayers = pList.size();

        if (nPlayers >= that.POOL_SIZE) {
            that.dispatch({
                over: "Time elapsed!!!",
                nPlayers: nPlayers
            });
        }
        else {
            that.channel.registry.checkOut(playerID);

            // See if an access code is defined, if so checkout remotely
            // also.
            code = that.channel.registry.getClient(playerID);

            timeOutData = {
                over: "Time elapsed, disconnect",
                exit: code.ExitCode
            };
            that.node.say("TIME", playerID, timeOutData);
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
 * @param {various} t String or object to use to decide on a treatment
 *
 * @return {object} Decided treatment
 */
WaitingRoom.prototype.decideTreatment = function(t) {
    var treatments, tLen;

    treatments = Object.keys(this.channel.gameInfo.settings);
    tLen = treatments.length;

    if (t === "treatment_rotate") {
        return treatments[(this.channel.autoRoomNo) % tLen];
    }
    else if ('undefined' === typeof t) {
        return treatments[J.randomInt(-1,tLen-1)];
    }
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
 * @see WaitingRoom.parseSettings
 */
function checkPositiveInteger(settings, name, where) {
    var N;
    N = settings[name];
    if (!J.isInt(N,0)) {
        throw new Error (where + name + ' must be an' +
        ' integer and larger than 0.' +
        ' Provided value: ' + N);
    }
}
