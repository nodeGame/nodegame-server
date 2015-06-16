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

WaitingRoom.prototype.__proto__ = HostRoom.prototype;
WaitingRoom.prototype.constructor = WaitingRoom;

function WaitingRoom(config) {
    HostRoom.call(this, 'Waiting', config);
    if (!this.logicPath) this.logicPath  = './rooms/wait.room';
}
