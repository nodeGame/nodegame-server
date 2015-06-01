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

var BasicRoom = require('./BasicRoom');

WaitingRoom.prototype.__proto__ = BasicRoom.prototype;
WaitingRoom.prototype.constructor = WaitingRoom;

function WaitingRoom(config) {
    BasicRoom.call(this, 'Waiting', config);
    if (!this.logicPath) this.logicPath  = './rooms/wait.room';
    this.registerRoom();
}
