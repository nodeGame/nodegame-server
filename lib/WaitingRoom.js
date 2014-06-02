/**
 * # GameRoom
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Waiting room representation.
 * ---
 */

"use strict";

// ## Global scope
module.exports = WaitingRoom;

var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;

/**
 * ## WaitingRoom constructor
 *
 * Creates a new instance of WaitingRoom
 *
 * The constructor registers the room globally creating a unique random id
 * within the whole _ServerNode_.
 *
 * @param {object} config Initialization values for the WaitingRoom object
 *  (see documentation of fields in constructor)
 */
function WaitingRoom(config) {
    // Check for proper config parameter:
    if ('object' !== typeof config) {
        throw new TypeError('WaitingRoom: config parameter must be an object');
    }
    if ('string' !== typeof config.group) {
        throw new TypeError('WaitingRoom: config.group must be a string');
    }
    if ('string' !== typeof config.name) {
        throw new TypeError('WaitingRoom: config.name must be a string');
    }
    if (config.clients && !(config.clients instanceof PlayerList)) {
        throw new TypeError('WaitingRoom: config.clients must be a ' +
                            'PlayerList or undefined');
    }
    if ('string' !== typeof config.logicPath) {
        throw new TypeError('WaitingRoom: config.logicPath must be a string');
    }
    if ('object' !== typeof config.channel) {
        throw new TypeError('WaitingRoom: config.channel must be an object');
    }
    if (config.runtimeConf && 'object' !== typeof config.runtimeConf) {
        throw new TypeError('WaitingRoom: config.channel must be an object');
    }

    /**
     * ### WaitingRoom.name
     *
     * Name of the room
     */
    this.name = config.name;

    /**
     * ### WaitingRoom.group
     *
     * The group to which the game room belongs
     */
    this.group = config.group;

    /**
     * ### WaitingRoom.channel
     *
     * Reference to the room's ServerChannel
     */
    this.channel = config.channel;

    /**
     * ### WaitingRoom.id
     *
     * Random global unique room identifier.
     *
     * @see ServerNode.rooms
     */
    this.id = J.uniqueKey(this.channel.servernode.rooms);

    if (!this.id) {
        throw new TypeError('WaitingRoom ' + config.name + ' failed to generate ' +
                           'random global unique identifier.');
    }

    // Register room globally.
    this.channel.servernode.rooms[this.id] = this;

    /**
     * ### WaitingRoom.clients
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

    // Importing initial clients, if any
    this.clients.importDB(config.clients);

    /**
     * ### WaitingRoom.logicPath
     *
     * Game logic path for the room
     */
    this.logicPath = config.logicPath;

    /**
     * ### WaitingRoom.parentRoom
     *
     * Name of the room's parent or null
     */
    this.parentRoom = config.parentRoom || null;

    /**
     * ### WaitingRoom.childRooms
     *
     * Names of the room's children
     */
    this.childRooms = config.childRooms || [];

    /**
     * ### WaitingRoom.runtimeConf
     *
     * Extra configuration that can be accessed by the logic.
     */
    this.runtimeConf = config.runtimeConf || {};

    /**
     * ### WaitingRoom.options
     *
     * Miscellaneous options
     */
    this.options = config.options || {};

    /**
     * ### WaitingRoom.node
     *
     * node instance
     */
    // TODO: Check config.node integrity
    this.node = config.node || ngc.getClient();
}

// ## WaitingRoom methods

/**
 * ### WaitingRoom.startGame
 *
 * Starts the game, optionally starts connected clients (not yet implemented)
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Will override settings from the required file.
 * @param {boolean} startGame Whether to send 'start' request to clients.
 *   Default: False.
 * @param {string} treatmentName The name of the treatment with which to start
 *   the game.
 * @param {object} settings Options corresponding to the chosen treatment.
 *   TODO: Remove parameter and get the options from ServerNode.
 */
WaitingRoom.prototype.startGame = function(mixinConf, startClients, treatmentName, settings) {
    var game, channel, node, room;

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError('WaitingRoom.startGame: mixinConf must be object or ' +
                            'undefined.');
    }
    node = this.node;
    channel = this.channel;
    room = this;

    // Alternative 1
    // game = channel.require(this.logicPath, { node: node });

    // Alternative 2
    game = require(this.logicPath)(node, channel, this, treatmentName, settings);

    // Alternative 3
    // game = require(this.logicPath);

   // Mixin-in nodeGame options.
    node.socket.setSocketType('SocketDirect', {
        socket: channel.admin.socket.sockets.direct
    });

    if (mixinConf) {
        J.mixin(game, mixinConf);
    }

    // Setup must be called before connect.
    node.setup('nodegame', game);

    function startCb() {
        node.game.start();

        if (startClients) {
            // TODO
        }
    };

    node.connect(null, startCb, {
        startingRoom: this.name
    });
};