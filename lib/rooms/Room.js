/**
 * # Room
 * Copyright(c) 2019 Stefano Balietti
 * MIT Licensed
 *
 * Basic room representation
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global scope
module.exports = Room;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;
var fs = require('fs');
var path  = require('path');

/**
 * ## verifyInput
 *
 * Sanity check for Room constructor parameters
 *
 * @param {object} config Configuration object
 *
 * @return {string} Returns a text representing an error, if found
 */
function verifyInput(config) {
    if ('object' !== typeof config) {
        return 'config must be object.';
    }
    if ('string' !== typeof config.group) {
        return 'config.group must be string.';
    }
    if ('string' !== typeof config.name) {
        return 'config.name must be string.';
    }
    if (config.clients && !(config.clients instanceof PlayerList)) {
        return 'config.clients must be PlayerList or undefined.';
    }
    if (config.logicPath && 'string' !== typeof config.logicPath) {
        return 'config.logicPath must be string or undefined.';
    }
    if ('object' !== typeof config.channel) {
        return 'config.channel must be object.';
    }
    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        return 'config.channel must be object.';
    }
    return;
}

var roomTypes = {
    'Basic': '',  // TODO: is it still needed?
    'Requirements': '',
    'Game': '',
    'Waiting': '',
    'Garage': ''
};


/**
 * ## Room constructor
 *
 * Creates a new instance of Room
 *
 * @param {object} config Initialization values for the Room object
 */
function Room(type, config) {
    var res;

    if (!(type in roomTypes)) {
        throw new Error('Room: unknown room type: ' + type);
    }

    res = verifyInput(config);
    if (res) throw new TypeError(type + 'Room: ' + res);

    /**
     * ### Room.roomType
     *
     * Room type flag
     */
    this.roomType = type;

    /**
     * ### Room.roomType
     *
     * GameRoom flag
     */
    this.gameRoom = type === 'Game';

    /**
     * ### Room.name
     *
     * Name of the room
     */
    this.name = config.name;

    /**
     * ### Room.group
     *
     * The group to which the game room belongs
     */
    this.group = config.group;

    /**
     * ### Room.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel;

    /**
     * ### Room.gameName
     *
     * The name of the game played in this room
     */
    this.gameName = this.channel.gameName;

    /**
     * ### Room.game
     *
     * Reference to the game info object contained in servernode
     */
    this.game = this.channel.servernode.getGamesInfo(this.gameName);

    if (!this.game) {
        throw new Error(type + 'Room: game not found: ' + this.gameName);
    }

    /**
     * ### Room.gameLevel
     *
     * Game paths for the room
     */
    this.gameLevel = config.gameLevel;

    if (this.gameLevel && !this.game.levels[this.gameLevel]) {
        throw new Error(type + 'Room: game ' + this.gameName + ' game level ' +
                        'not found: ' + this.gameLevel);
    }

   /**
     * ### Room.channelOptions
     *
     * Action control management for player server
     *
     * It can overwrite default player server settings.
     */
    if (J.isEmpty(config.acm)) this.acm = this.channel.playerServer.acm;
    else this.acm = J.merge(this.channel.playerServer.acm, config.acm);
    if (!this.acm.notify) this.acm.notify = {};

    /**
     * ### Room.clients
     *
     * PlayerList containing players and admins inside the room
     */
    this.clients = new ngc.PlayerList();

    // Adding views to distinguish admins and players.
    // Note: this.node.player will be added to admins.
    this.clients.view('admin', function(p) {
        return p.admin ? p.id : undefined;
    });
    this.clients.view('player', function(p) {
        return !p.admin ? p.id : undefined;
    });
    this.clients.view('playerConnected', function(p) {
        return !p.admin && p.connected ? p.id : undefined;
    });

    // Importing initial clients, if any.
    if (config.clients && config.clients.length) {
        this.clients.importDB(config.clients);
    }

    /**
     * ### Room.parentRoom
     *
     * Name of the room's parent or null
     */
    this.parentRoom = null;

    /**
     * ### Room.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = config.logicPath || null;

    /**
     * ### Room.runtimeConf
     *
     * Extra configuration that can be accessed by the logic.
     */
    this.runtimeConf = config.runtimeConf || {};

    /**
     * ### Room.settings
     *
     * Settings for the actual game room (node instance)
     */
    this.settings = config.settings || {};

    /**
     * ### Room.node
     *
     * node instance
     */
    this.node = config.node === null ? null : config.node || ngc.getClient();

    /**
     * ### Room.id
     *
     * Random global unique room identifier.
     *
     * @see ServerNode.rooms
     */
    this.id = null;

    // Code for Logging Client Events
    /////////////////////////////////

    // TODO: Should it be in an own object?

    /**
     * ### Room.timeoutSave
     *
     * Contains a reference to timeout object saving the cache
     */
    this.timeoutSave = null;

    /**
     * ### Room.cacheToSave
     *
     * A string waiting to be flushed to fs
     *
     * @see ServerNode.timeoutSave
     * @see ServerNode.cacheDumpInterval
     */
    this.cacheToSave = '';

    /**
     * ### Room.cacheDumpInterval
     *
     * Saves the cache every X milliseconds
     */
    this.cacheDumpInterval = config.logClientsInterval || 1000;

    /**
     * ### Room.logClients
     *
     * If TRUE, clients events will be logged
     */
    this.logClients = config.logClients || false;

    /**
     * ### Room.logClientsExtra
     *
     * A function adding extra properties info the clients log.
     */
    this.logClientsExtra = config.logClientsExtra || null;

    /**
     * ### Room.logFilePath
     *
     * Path to the log file where the cache is dumped.
     */
    this.logFilePath = (function(that) {
        var str;
        str = new Date().toISOString();
        str = str.substring(0, str.length - 5);
        return path.join(that.channel.getGameDir(),
                         'log', (that.name + '_' + str + '.csv'));
    })(this);

    ///////////////////////////////////////////////////////////////
}

// ## Room methods

/**
 * ### Room.registerRoom
 *
 * Creates a random unique id for the room and save a reference in servernode
 */
Room.prototype.registerRoom = function() {
    this.id = J.uniqueKey(this.channel.servernode.rooms);
    if (!this.id) {
        throw new TypeError(this.roomType + 'Room ' + this.name + ' failed ' +
                            'to generate random global unique identifier');
    }
    // Register room globally.
    this.channel.servernode.rooms[this.id] = this;
};

/**
 * ### Room.size
 *
 * Returns the number of players|admin in the room
 *
 * @param {string} mod Optional. Modifies the return value. Available values:
 *
 *  - 'player-connected': (default) The number of players currently connected
 *
 * @return {number} The number of clients connected
 *
 * @experimental
 */
Room.prototype.size = function(mod) {
    mod = mod || 'playerConnected';
    if (mod && 'string' !== typeof mod) {
        throw new TypeError('Room.size: mod must be string or undefined. ' +
                            'Found: ' + mod);
    }

    switch(mod) {
        case 'playerConnected':
        return this.clients.playerConnected.size();
        break;
    }
};

/**
 * ### Room.update
 *
 * Updates a live settings value
 *
 * Throws an error if update is not possible, e.g., property not existing.
 *
 * @param {string} prop The name of the property to update
 * @param {mixed} value The updated value
 *
 * @return {mixed} The old value of the updated property
 *
 * @experimental
 */
Room.prototype.update = function(prop, value) {
    var prop, old;
    if ('string' !== typeof prop) {
        throw new TypeError(this.roomType + 'Room ' + this.name + '.update: ' +
                            'prop must be string. Found: ' + prop);
    }
    if (!this.hasOwnProperty(prop)) {
        throw new TypeError(this.roomType + 'Room ' + this.name + '.update: ' +
                            'property not found: ' + prop);
    }
    old = this[prop];
    this[prop] = value;
    // TODO: emit it somehow.
    return old;
};

/**
 * ### Room.log
 *
 * Logs a string to file inside the logs folder
 *
 * @param {array} arr Array of values to log to be joined with a comma
 *
 * @experimental
 */
Room.prototype.log = function(arr) {
    var that;

    if (!this.logFilePath) {
        throw new Error(this.roomType + 'Room ' + this.name + '.log: ' +
                        'logFilePath is null');
    }
    this.cacheToSave += ("\n" + arr.join(','));
    if (!this.timeoutSave) {
        that = this;
        this.timeoutSave = setTimeout(function() {
            var txt;
            txt = that.cacheToSave;
            that.cacheToSave = '';
            that.timeoutSave = null;
            fs.appendFile(that.logFilePath, txt, function(err) {
                if (err) {
                    console.log(txt);
                    console.log(err);
                }
            });
        }, this.cacheDumpInterval);
    }
};

/**
 * ### Room.logClientEvent
 *
 * Checks the room and channel settings and eventually logs a client event
 *
 * @param {object} p A player object
 * @param {string} event The client event, e.g., "connect"
 *
 * @experimental
 */
Room.prototype.logClientEvent = function(p, event) {
    var log;
    if (this.logClients) {
        log = [ Date.now(), event, p.id ];
        if (this.logClientsExtra) {
            log = log.concat(this.logClientsExtra(p));
        }
        this.log(log);
    }
};
