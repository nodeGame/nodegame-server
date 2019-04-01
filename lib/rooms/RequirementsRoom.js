/**
 * # Requirements Room
 * Copyright(c) 2019 Stefano Balietti
 * MIT Licensed
 *
 * Requirements room representation
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = RequirementsRoom;

var path = require('path');

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;
var ngt = require('nodegame-game-template');

var HostRoom = require('./HostRoom');

RequirementsRoom.prototype.__proto__ = HostRoom.prototype;
RequirementsRoom.prototype.constructor = RequirementsRoom;

function RequirementsRoom(config) {
    HostRoom.call(this, 'Requirements', config);
    if (!this.logicPath) {
        this.logicPath = ngt.resolve('requirements/requirements.room.js');
    }
}
