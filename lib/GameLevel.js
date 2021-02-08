/**
 * # GameLevel
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Wrapper of for a set of waiting, requirements and game rooms
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global

module.exports = GameLevel;

/**
 * ## GameLevel constructor
 *
 * Creates an instance of GameLevel
 *
 * @param {object} options Configuration object
 * @param {ServerChannel} channel The ServerChannel instance
 */
function GameLevel(options, channel) {

    /**
     * ### GameLevel.channel
     *
     * Reference to the Channel
     */
    this.channel = channel;

    /**
     * ### GameLevel.registry
     *
     * The registry of all connected clients
     *
     * @see ChannelRegistry
     */
    this.registry = this.channel.registry;

    /**
     * ### GameLevel.options
     *
     * Configuration options
     */
    this.options = options;

    /**
     * ### GameLevel.name
     *
     * The name of the level
     */
    this.name = options.name;

    /**
     * ### GameLevel.sysLogger
     *
     * The logger for the channel
     */
    this.sysLogger = this.channel.sysLogger;

    /**
     * ### GameLevel.waitingRoom
     *
     * The waiting room for the channel.
     *
     * @see GameLevel.createWaitingRoom
     */
    this.waitingRoom = null;

    /**
     * ### GameLevel.requirementsRoom
     *
     * The requirements room for the channel.
     *
     * @see GameLevel.createRequirementsRoom
     */
    this.requirementsRoom = null;

    /**
     * ### GameLevel.gameRooms
     *
     * Associative container for all the game rooms in the channel.
     *
     * @see GameLevel.createGameRoom
     */
    this.gameRooms = {};

    // Creates waiting and requriements room.
    if (options.requirements && options.requirements.enabled) {
        this.createRequirementsRoom(options.requirements);
    }
    if (options.waitroom) {
        this.createWaitingRoom(options.waitroom);
    }

    // Sets the entry room, if either requirements or waiting is created.
    if (this.requirementsRoom) this.setEntryRoom(this.requirementsRoom);
    else if (this.waitingRoom) this.setEntryRoom(this.waitingRoom);
}

// ## GameLevel methods

/**
 * ### GameLevel.getEntryRoom
 *
 * Returns the entry room, or null if none is set
 *
 * @return {Room} The entry room. Could be of any type.
 *
 * @see GameLevel.entryRoom
 * @see GameLevel.setEntryRoom
 */
GameLevel.prototype.getEntryRoom = function() {
    return this.entryRoom || null;
};

/**
 * ### GameLevel.setEntryRoom
 *
 * Sets the entry room for the level
 *
 * @param {string|Room} room The entry room
 *
 * @see GameLevel.entryRoom
 * @see GameLevel.getEntryRoom
 */
GameLevel.prototype.setEntryRoom = function(room) {
    if ('string' === typeof room) {
        if (!this.gameRooms[room]) {
            throw new Error('GameLevel.setEntryRoom: room is not in level: ' +
                            room);
        }
        room = this.gameRooms[room];
    }
    else if ('object' !== typeof room) {
        throw new Error('GameLevel.setEntryRoom: room must be string or ' +
                        'object. Found: ' + room);
    }

    return this.entryRoom = room;
};

/**
 * ### GameLevel.createGameRoom
 *
 * Creates a new game room using the channel api and stores a reference to it
 *
 * @param {object} conf Config object, acceptable by GameRoom constructor
 *
 * @return {GameRoom} The new GameRoom
 *
 * @see ServerChannel.createGameRoom
 */
GameLevel.prototype.createGameRoom = function(conf) {
    var room;
    conf = conf || {};
    conf.gameLevel = this.name;
    room = this.channel.createGameRoom(conf);
    this.gameRooms[room.name] = room;
    return room;
};

/**
 * ### GameLevel.createWaitingRoom
 *
 * Creates the waiting room using the channel api and stores a reference to it
 *
 * If a waiting room is already existing an error will be thrown.
 *
 * @param {object} settings Config object
 *
 * @return {WaitingRoom} The waiting room
 *
 * @see WaitingRoom
 * @see ServerChannel.createWaitingRoom
 */
GameLevel.prototype.createWaitingRoom = function(settings) {
    var room;
    if (this.waitingRoom) {
        throw new Error('GameLevel.createWaitingRoom: waiting room already ' +
                        'existing. Level: ' + this.name);
    }
    settings = settings || {};
    settings.gameLevel = this.name;
    settings.name = settings.name || 'waiting_' + this.name;
    room = this.channel.createWaitingRoom(settings);
    this.waitingRoom = room;
    return room;
};

/**
 * ### GameLevel.createRequirementsRoom
 *
 * Creates the requirements room using the channel api and stores a reference
 *
 * If a requirements room is already existing an error will be thrown.
 *
 * @param {object} settings Config object
 *
 * @return {RequirementsRoom} The requirements room
 *
 * @see RequirementsRoom
 * @see ServerChannel.createWaitingRoom
 */
GameLevel.prototype.createRequirementsRoom = function(settings) {
    var room;
    if (this.requirementsRoom) {
        throw new Error('GameLevel.requirementsRoom: requirements room ' +
                        'already existing. Level: ' + this.name);
    }
    settings = settings || {};
    settings.gameLevel = this.name;
    settings.name = settings.name || 'requirements_' + this.name;
    room = this.channel.createRequirementsRoom(settings);
    this.requirementsRoom = room;
    return room;
};
