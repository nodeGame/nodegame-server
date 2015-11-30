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
WaitingRoom.prototype =
    Object.create ? // Object.create is not supported in all browsers
    Object.create(HostRoom.prototype) :
    function(o) {
        var F = function(){};
        F.prototype = o;
        return new F();
    }(Hostroom.prototype);

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
    this.timeOuts;

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
    var d, N;
    var where;
    where = 'WaitingRoom.parseSettings: ';


    if ('undefined' === typeof settings) {
        throw new Error(where + 'No settings provided to validate.');
    }

    if ('undefined' !== typeof settings.GROUP_SIZE) {
        checkPositiveInteger(settings, 'GROUP_SIZE', where);
        this.GROUP_SIZE = settings.GROUP_SIZE;
    }
    else {
        throw new Error(where + 'GROUP_SIZE must be defined.');
    }

    if ('undefined' !== typeof settings.POOL_SIZE) {
        checkPositiveInteger(settings, 'POOL_SIZE', where);
        this.POOL_SIZE = settings.POOL_SIZE;
    }
    else {
        this.POOL_SIZE = settings.GROUP_SIZE;
    }


    if ('undefined' !== typeof settings.START_DATE) {
        d = new Date(settings.START_DATE);
        if (isNaN(d.getTime()) {
            throw new Error (where + 'START_DATE must be valid argument for' +
                ' Date constructor. Value provided: ' + settings.START_DATE);
        }
        if ('undefined' !== typeof settings.MAX_WAIT_TIME) {
            throw new Error(where + 'Cannot both define MAX_WAIT_TIME and ' +
                ' START_DATE.');
        }
        this.START_DATE = settings.START_DATE;
    }
    else if ('undefined' !== typeof settings.MAX_WAIT_TIME) {
        checkPositiveInteger(settings, 'MAX_WAIT_TIME', where);
        this.MAX_WAIT_TIME = settings.MAX_WAIT_TIME;
    }
    else {
        throw new Error(where + 'Either MAX_WAIT_TIME or START_DATE must be ' +
            'defined.');
    }

    if ('undefined' !== typeof settings.EXECUTION_MODE) {
        if ('string' !== typeof settings.EXECUTION_MODE) {
            throw new Error(where + 'EXECUTION_MODE must be a string.');
        }
        if (settings.EXECUTION_MODE !== 'TIMEOUT' &&
            settings.EXECUTION_MODE !== 'WAIT_FOR_N_PLAYERS') {
            throw new Error(where + 'Invalid exection mode: ' +
                settings.EXECUTION_MODE);
        }
        this.EXECUTION_MODE = settings.EXECUTION_MODE;
    }
    else {
        throw new Error(where + 'EXECUTION_MODE must not be undefined.');
    }

    if ('undefined' !== typeof settings.ON_TIMEOUT) {
        if ('function' !== typeof settings.ON_TIMEOUT) {
            new Error(where + 'ON_TIMEOUT must be a function or undefined.');
        }
        this.ON_TIMEOUT = ON_TIMEOUT;
    }

    if ('undefined' !== typeof settings.CHOSEN_TREATMENT) {
        if ('string' !== typeof settings.CHOSEN_TREATMENT) {
            throw new Error(where + 'CHOSEN_TREATMENT must be string or ' +
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
}

/**
 * ## WaitingRoom.openRoom
 *
 * Changes state of `this` to open
 */
WaitingRoom.prototype.openRoom = function() {
    this.roomOpen = true;
}

/**
 * ## WaitingRoom.openRoom
 *
 * Initiates the start of the game
 *
 * May only be called once. Implemented using a self-calling function
 *
 * @param {object} timeOutData Data to send to all players
 */
WaitingRoom.prototype.dispatch = function(maxCalls) {
    var numCalls;
    var where;
    where = 'WaitingRoom.dispatch: ';
    numCalls = 0;

    return function (timeOutData) {
        var treatmentName;
        var tmpPlayerList;
        var i, gameRoom;
        var pList, nPlayers;

        pList = this.clients.player;
        nPlayers = pList.size();

        if (++numCalls > maxCalls) {
            throw new Error(where + 'called more than ' + maxCalls +
                ' time(s).');
        }

        for (i = 0; i < nPlayers; i++) {
            this.node.say("TIME", pList.db[i].id, timeOutData);

            // Clear body.
            this.node.remoteSetup('page', pList.db[i].id, { clearBody: true });

            // Clear timeout for players.
            clearTimeout(this.timeOuts[i]);
        }

        // Select a subset of players from pool.
        tmpPlayerList = pList.shuffle().limit(GROUP_SIZE);

        // Decide treatment.
        treatmentName = decideTreatment(this.CHOSEN_TREATMENT);

        // Create new game room.
        gameRoom = this.channel.createGameRoom({
            clients: tmpPlayerList,
            treatmentName: treatmentName
        });

        // Setup and start game.
        gameRoom.setupGame();
        gameRoom.startGame(true, []);
    };
}(1);


/**
 * ## WaitingRoom.makeTimeOut
 *
 * Register a timeout for a player
 *
 * @param {number} playerID ID of player for which to register timeout.
 * @param {number} waitTime Nnumber of milliseconds to wait before execution
 *   of callback.
 * @param {function} cb (Optional) callback to register. If undefined a
 *   predefine callback is used.
 *
 * @see WaitingRoom.clearTimeOut
 */
WaitingRoom.prototype.makeTimeOut = function(playerID, waitTime, cb) {
    var that = this;
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
}

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
    delete this.timeOuts[playerID];
}

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
    N = parseFloat(settings[name]);
    if (isNaN(N) || N % 1 !== 0) {
        throw new Error (where + name + ' must be an' +
        ' integer and larger than 0.' +
        ' Provided value: ' + N);
    }
}


/**
 * ## decideTreatment
 *
 * Check if string, or use it.
 *
 * @param {various} t String or object to use to decide on a treatment
 *
 * @return {object} Decided treatment
 */
function decideTreatment(t) {
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
}
