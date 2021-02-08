/**
 * # Host Room
 * Copyright(c) 2019 Stefano Balietti
 * MIT Licensed
 *
 * An host room keeps the client before moving them to another room.
 *
 * Examples: requirements and waiting room.
 *
 * http://nodegame.org
 */

"use strict";

// ## Global scope
module.exports = HostRoom;

const J = require('JSUS').JSUS;

const Room = require('./Room');

HostRoom.prototype.__proto__ = Room.prototype;
HostRoom.prototype.constructor = HostRoom;

function HostRoom(type, config) {
    config = config || {};
    if (!config.acm) {
        config.acm = {
            notify: {
                onConnect: false,
                onStageUpdate: false,
                onStageLevelUpdate: false,
                onStageLoadedUpdated: false
            }
        };
    }
    Room.call(this, type, config);
    this.registerRoom();
}

/**
 * ### HostRoom.setupGame
 *
 * Setups the logic game objectx
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Will override default settings of the game
 */
HostRoom.prototype.setupGame = function(mixinConf) {
    var game, channel, node, room, settings, runtimeConf;

    if (mixinConf && 'object' !== typeof mixinConf) {
        throw new TypeError(this.roomType +
                            'Room.setupGame: mixinConf must be ' +
                            'object or undefined. Found: ' + mixinConf);
    }
    node = this.node;
    channel = this.channel;
    settings = this.settings;
    runtimeConf = this.runtimeConf;
    room = this;

    // Require game configuration for the logic.
    game = require(this.logicPath)(settings, room, runtimeConf);

    if ('object' !== typeof game) {
        throw new Error(this.roomType + 'Room.setupGame: room ' + this.name +
                        ': logicPath did not return a valid game ' +
                        'object. Found: ' + game);
    }

    // Mixin-in nodeGame options.
    if (mixinConf) J.mixin(game, mixinConf);

    // Setup must be called before connect.
    node.setup('nodegame', game);

    // Connect logic to server, if not already connected. E.g., after a stop
    // command it is generally still connected. Or the node object can be
    // passed in the constructor and be already connected.
    if (!node.socket.isConnected()) {
        // Mixin-in nodeGame options.
        node.socket.setSocketType('SocketDirect', {
            socket: channel.adminServer.socketManager.sockets.direct
        });
        node.connect(null, {
            startingRoom: this.name,
            clientType:   'logic'
        });
    }
};


/**
 * ### HostRoom.startGame
 *
 * Starts the game, optionally starts connected players
 *
 * @param {boolean} startPlayers If TRUE, sends a start command to all players.
 *   Default: False.
 */
HostRoom.prototype.startGame = function(startPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStartable()) {
        this.channel.sysLogger.log(
            this.roomType + 'Room.startGame: game cannot be started.', 'warn');
        return;
    }
    node.game.start();
    if (startPlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('start', p.id);
        });
    }
};

/**
 * ### HostRoom.pauseGame
 *
 * Pauses the game, optionally pauses connected players
 *
 * @param {boolean} pausePlayers If TRUE, sends a pause command to all players.
 *   Default: False.
 */
HostRoom.prototype.pauseGame = function(pausePlayers) {
    var node;
    node = this.node;

    if (!node.game.isPausable()) {
        this.channel.sysLogger.log(this.roomType +
                                   'Room.pauseGame: game cannot be paused.',
                                   'warn');
        return;
    }

    node.game.pause();
    if (pausePlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('pause', p.id);
        });
    }
};

/**
 * ### HostRoom.resumeGame
 *
 * Resumes the game, optionally resumes connected players
 *
 * @param {boolean} resumePlayers If TRUE, sends a resume command to
 *   all players. Default: False.
 */
HostRoom.prototype.resumeGame = function(resumePlayers) {
    var node;
    node = this.node;

    if (!node.game.isResumable()) {
        this.channel.sysLogger.log(this.roomType +
                                   'Room.resumeGame: game cannot be resumed.',
                                   'warn');
        return;
    }

    node.game.resume();
    if (resumePlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('resume', p.id);
        });
    }
};

/**
 * ### HostRoom.stopGame
 *
 * Stops the game, optionally stops connected players
 *
 * @param {boolean} stopPlayers If TRUE, sends a stop command to all players.
 *   Default: False.
 */
HostRoom.prototype.stopGame = function(stopPlayers) {
    var node;
    node = this.node;

    if (!node.game.isStoppable()) {
        this.channel.sysLogger.log(this.roomType +
                                   'Room.stopGame: game cannot be stopped.',
                                   'warn');
        return;
    }

    node.game.stop();
    if (stopPlayers) {
        this.clients.player.each(function(p) {
            node.remoteCommand('stop', p.id);
        });
    }
};
