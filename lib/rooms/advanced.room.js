/**
 * # WaitingRoom
 *
 * Starts a game room based on a list of criteria.
 */


"use strict";

// ## Global scope
module.exports = Wait;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;

exports.WaitingRoom = WaitingRoom;


function WaitingRoom(options) {

    this.triggerManager = new ngc.TriggerManager(options);

    var that = this;

    var pullTriggers = function() {

        var groups  = that.pullTriggers();

        if (!groups) return;
        if (!J.isArray(groups)) groups = [groups];

        var i, name, count = 0;
        for (i = 0; i< groups.length; i++) {
            name = groups[i].name || count++;

            // Start Game.
            // node.game.room[name] = new Game(groups[i]);

        }
    };

    var onConnectFunc = function() {
        //console.log('added')
        node.onPLIST(function(){
            pullTriggers();
        });
    };

    var onConnect;
    Object.defineProperty(this, 'onConnect', {
        set: function(value) {
            if (value === false) {
                node.removeListener('in.say.PLIST', pullTriggers);
                node.removeListener('in.set.PLIST', pullTriggers);
            }
            else if (value === true) {
                node.onPLIST(pullTriggers);
            }
            onConnect = value;

        },
        get: function() {
            return onConnect;
        },
        configurable: true
    });

    var onTimeout, onTimeoutTime;

    Object.defineProperty(this, 'onTimeout', {
        set: function(value) {
            if (!value) {
                clearTimeout(onTimeout);
                onTimeoutTime = value;
                onTimeout = false;
            }
            else if ('numeric' === typeof value) {

                if (onTimeout) {
                    clearTimeout(onTimeout);
                }
                onTimeoutTime = value;
                onTimeout = setTimeout(pullTriggers);
            }
        },
        get: function() {
            return onTimeoutTime;
        },
        configurable: true
    });

    var onInterval, onIntervalTime;
    Object.defineProperty(this, 'onInterval', {
        set: function(value) {
            if (!value) {
                clearInterval(onInterval);
                onIntervalTime = value;
                onInterval = false;
            }
            else if ('numeric' === typeof value) {

                if (onInterval) {
                    clearInterval(onInterval);
                }
                onInterval = setInterval(pullTriggers);
                onIntervalTime = value;
            }
        },
        get: function() {
            return onIntervalTime;
        },
        configurable: true
    });


    this.init(options);
}


WaitingRoom.prototype.init = function (options) {
    options = options || {};

    this.onConnect = options.onConnect || true;
    this.onTimeout = options.onTimeout || false;
    this.onInterval = options.onInterval || false;


    this.addTrigger(function(){
        return new Group({
            players: node.pool,
            game: options.loops
        });
    });

    if (options.minPlayers && options.maxPlayers) {
        this.addTrigger(function(){
            if (node.pool.length < options.minPlayers) {
                return false;
            }
            if (node.pool.length > options.maxPlayers) {
                // Take N = maxPlayers random player
                var players = node.pool.shuffle().limit(options.maxPlayers);
                return new Group({
                    players: players,
                    game: options.loops
                });

            }

            return new Group({
                players: node.pool,
                game: options.loops
            });
        });
    }

    if (options.minPlayers) {
        this.addTrigger(function(){
            if (node.pool.length < options.minPlayers) {
                return false;
            }

            return new Group({
                players: node.pool,
                game: options.loops
            });
        });
    }

    if (options.maxPlayers) {
        this.addTrigger(function(){
            if (node.pool.length > options.maxPlayers) {
                // Take N = maxPlayers random player
                var players = node.pool.shuffle().limit(options.maxPlayers);
                return new Group({
                    players: players,
                    game: options.loops
                });

            }
        });
    }

    if (options.nPlayers) {
        this.addTrigger(function(){
            if (node.pool.length === options.nPlayers) {
                // Take N = maxPlayers random player
                return new Group({
                    players: node.pool,
                    game: options.loops
                });

            }
        });
    }

};


WaitingRoom.prototype.criteria = function (func, pos) {
    this.addTrigger(func, pos);
};


/**
 * ## WaitingRoom.setInterval
 *
 * Set the update interval
 *
 */
WaitingRoom.prototype.setInterval = function(interval) {
    if (!interval) clearInterval(this.interval);
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(this.pullTriggers, interval);
};
