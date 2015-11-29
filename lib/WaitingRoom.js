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



// WaitingRoom.prototype.__proto__ = HostRoom.prototype;

// Same effect as before without relying on non-standard `__proto__`
WaitingRoom.prototype =
    Object.create ? // Object.create is not supported in all browsers
    Object.create(HostRoom.prototype) :
    function(o) {
        var F = function(){};
        F.prototype = o;
        return new F();
    }(Hostroom.prototype);

WaitingRoom.prototype.constructor = WaitingRoom;

function WaitingRoom(config) {
    HostRoom.call(this, 'Waiting', config);
    if (!this.logicPath) this.logicPath  = './rooms/wait.room';
    this.roomOpen = config.roomOpen || true;

    this.timeOuts;

    this.GROUP_SIZE = null;
    this.POOL_SIZE = null;
    this.START_DATE = null;
    this.EXECUTION_MODE = null;
    this.MAX_WAIT_TIME = null;
    this.ON_TIMEOUT = null;
    this.CHOSEN_TREATMENT = null;
}

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

WaitingRoom.prototype.isRoomOpen = function() {
    return this.roomOpen;
};

WaitingRoom.prototype.closeRoom = function() {
    this.roomOpen = false;
}
WaitingRoom.prototype.openRoom = function() {
    this.roomOpen = true;
}

// Dispatch may only be called once.
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

WaitingRoom.prototype.clearTimeOut = function(playerID) {
    clearTimeout(this.timeOuts[playerID]);
    delete this.timeOuts[playerID];
}

function checkPositiveInteger(settings, name, where) {
    N = parseFloat(settings[name]);
    if (isNaN(N) || N % 1 !== 0) {
        throw new Error (where + name + ' must be an' +
        ' integer and larger than 0.' +
        ' Provided value: ' + N);
    }
}

// decideTreatment: check if string, or use it.
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
