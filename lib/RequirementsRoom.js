/**
 * # Requirements Room
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Requirements room representation
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = RequirementsRoom;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;

var BasicRoom = require('./BasicRoom');

RequirementsRoom.prototype.__proto__ = BasicRoom.prototype;
RequirementsRoom.prototype.constructor = RequirementsRoom;

function RequirementsRoom(config) {
    BasicRoom.call(this, 'Requirements', config);
    if (!this.logicPath) this.logicPath  = './rooms/requirements.room';
    this.registerRoom();
}
