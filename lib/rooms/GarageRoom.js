/**
 * # Garage Room
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Garage room, does nothing, just keep clients in.
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = GarageRoom;

var Room = require('./Room');

GarageRoom.prototype.__proto__ = Room.prototype;
GarageRoom.prototype.constructor = GarageRoom;

function GarageRoom(config) {
    config = config || {};
    config.acm = {
        notify: {
            onConnect: false,
            onStageUpdate: false,
            onStageLevelUpdate: false,
            onStageLoadedUpdated: false
        }
    };
    // No node instance in the garage.
    // TODO: Here.
    config.node = null;
    Room.call(this, 'Garage', config);
    this.registerRoom();
}

// Empty methods.

GarageRoom.prototype.setupGame = function() {
    // Nothing.
};
GarageRoom.prototype.startGame = function() {
    // Nothing.
};
GarageRoom.prototype.pauseGame = function() {
    // Nothing.
};
GarageRoom.prototype.resumeGame = function() {
    // Nothing.
};
GarageRoom.prototype.stopGame = function() {
    // Nothing.
};
