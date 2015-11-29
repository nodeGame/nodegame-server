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

    if ('undefined' !== typeof settings.ON_TIMEOUT) {
        if ('function' !== typeof settings.ON_TIMEOUT) {
            new Error(where + 'ON_TIMEOUT must be a function.');
        }
        this.ON_TIMEOUT = ON_TIMEOUT;
    }
};

function checkPositiveInteger(settings, name, where) {
    N = parseFloat(settings[name]);
    if (isNaN(N) || N % 1 !== 0) {
        throw new Error (where + name + ' must be an' +
        ' integer and larger than 0.' +
        ' Provided value: ' + N);
    }
}
