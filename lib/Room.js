/**
 * # Room
 * Copyright(c) 2015 Stefano Balietti
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

var roomTypes = { 'Basic': '', 'Requirements': '', 'Game': '', 'Waiting': '' };


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
        throw new Error('Room: unknown room type: ' + type + '.');
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
     * ### GameRoom.gameName
     *
     * The name of the game played in this room
     */
    this.gameName = this.channel.gameName;

    /**
     * ### GameRoom.game
     *
     * Reference to the game info object contained in servernode
     */
    this.game = this.channel.servernode.getGamesInfo(this.gameName);

    if (!this.game) {
        throw new Error(type + 'Room: game not found: ' + this.gameName + '.');
    }

    /**
     * ### GameRoom.gameLevel
     *
     * Game paths for the room
     */
    this.gameLevel = config.gameLevel;

    if (this.gameLevel && !this.game.levels[this.gameLevel]) {
        throw new Error(type + 'Room: game ' + this.gameName + ' game level ' +
                        'not found: ' + this.gameLevel + '.');
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
    this.id = null
}

// ## Room methods

/**
 * ## Room.registerRoom
 *
 * Creates a random unique id for the room and save a reference in servernode
 */
Room.prototype.registerRoom = function() {
    this.id = J.uniqueKey(this.channel.servernode.rooms);
    if (!this.id) {
        throw new TypeError(this.roomType + 'Room ' + this.name + ' failed ' +
                            'to generate random global unique identifier.');
    }
    // Register room globally.
    this.channel.servernode.rooms[this.id] = this;
};
