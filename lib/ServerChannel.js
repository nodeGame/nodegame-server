/**
 * # ServerChannel
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Creates the Player, and Admin Server
 *
 * Keeps a register of connected players.
 *
 * Uses the Socket.IO app created in ServerNode.
 *
 * Gives methods to create and destroy game rooms,
 * and to move players around them.
 *
 * http://www.nodegame.org
 */

"use strict";

// ## Global

module.exports = ServerChannel;

var AdminServer = require('./servers/AdminServer'),
    PlayerServer = require('./servers/PlayerServer'),
    GameServer = require('./GameServer');

var ChannelRegistry = require('./ChannelRegistry');
var GameLevel = require('./GameLevel');

var Logger = require('./Logger');

var J = require('JSUS').JSUS;

var spawn = require('child_process').spawn;

var ngc = require('nodegame-client');
var PlayerList = ngc.PlayerList;

var GameRoom = require('./rooms/GameRoom');
var GarageRoom = require('./rooms/GarageRoom');
var WaitingRoom = require('./rooms/WaitingRoom');
var RequirementsRoom = require('./rooms/RequirementsRoom');

/**
 * ### ServerChannel.parseOptions
 *
 * Parses configuration options for player and admin server
 *
 * Each server (player and admin) needs a separate configuration object.
 * However servernode _addChannel_ method receive a single object.
 *
 * The object must have the _adminServer_ and _playerServer_ properties,
 * as two objects. All the other properties in the main configuration object,
 * and that are not found in _admin_ or _player_ will be added to them.
 *
 * @param {object} options Configuration options
 *
 * @return {object} out Parsed configuration object
 */
ServerChannel.parseOptions = function(options) {
    var adminOptions, playerOptions, out, tmp;

    // Options are mixed in.
    adminOptions = options.adminServer;
    playerOptions = options.playerServer;
    delete options.adminServer;
    delete options.playerServer;

    out = J.clone(options);
    J.mixin(adminOptions, out);
    tmp = J.clone(options);
    J.mixout(playerOptions, out);

    out.adminServer = adminOptions;
    out.playerServer = playerOptions;

    return out;
};

/**
 * ## ServerChannel constructor
 *
 * Creates an instance of ServerChannel
 *
 * @param {object} options Configuration object
 * @param {ServerNode} servernode The ServerNode instance
 * @param {object} sio The socket.io server
 */
function ServerChannel(options, servernode, sio) {

    /**
     * ### ServerChannel.servernode
     *
     * Reference to the ServerNode
     */
    this.servernode = servernode;

    /**
     * ### ServerChannel.sio
     *
     * Reference to the Socket.IO app of ServerNode
     */
    this.sio = sio;

    /**
     * ### ServerChannel.options
     *
     * Configuration options
     *
     * // TODO: do not parse options
     * // (they are already parsed by ServerNode).
     */
    this.options = ServerChannel.parseOptions(options);

    /**
     * ### ServerChannel.name
     *
     * The name of the channel (under normal condition equal to gameName)
     */
    this.name = options.name

    /**
     * ### ServerChannel.gameName
     *
     * The name of the game associated with the channel
     */
    this.gameName = options.gameName;

    /**
     * ### ServerChannel.defaultChannel
     *
     * TRUE, if this is the ServerNode's default Channel.
     */
    this.defaultChannel = null;

    /**
     * ### ServerChannel.gameInfo
     *
     * Reference to the game information, including treatments and client types
     */
    this.gameInfo = this.servernode.info.games[this.gameName];

    /**
     * ### ServerChannel.sysLogger
     *
     * The logger for the channel
     */
    this.sysLogger = Logger.get('channel', {name: this.name});

    /**
     * ### ServerChannel.session
     *
     * Unique session id, shared by both Player and Admin Server
     */
    this.session = '' + Math.floor(Math.random()*10000000000000000);

    /**
     * ## ServerChannel.credentials
     *
     * Administrator account to manage the channel
     *
     * The `GameLoader` will populate the object with the data read from
     * file system. The final object is of the type:
     *
     *  - {user: 'admin', pwd: 'pwd' }
     *
     * @see GameLoader.loadServerDir
     */
    this.credentials = null;

    /**
     * ### ServerChannel.session
     *
     * Secret string used to sign channels' json tokens
     *
     * The `GameLoader` will read the secret from file system.
     *
     * @see GameLoader.loadServerDir
     */
    this.secret = null;

    /**
     * ### ServerChannel.registry
     *
     * The registry of all connected clients
     *
     * @see ChannelRegistry
     */
    this.registry = new ChannelRegistry({
        channelName: this.name
    });

    /**
     * ### ServerChannel.admin
     *
     * The admin server
     *
     * @see GameServer
     * @see AdminServer
     */
    this.adminServer = null;

    /**
     * ### ServerChannel.player
     *
     * The player server
     *
     * @see GameServer
     * @see PlayerServer
     */
    this.playerServer = null;

    /**
     * ### ServerChannel.garageRoom
     *
     * The garage room for the channel
     */
    this.garageRoom = null;

    /**
     * ### ServerChannel.waitingRoom
     *
     * The waiting room for the channel
     *
     * @see ServerChannel.createWaitingRoom
     */
    this.waitingRoom = null;

    /**
     * ### ServerChannel.requirementsRoom
     *
     * The requirements room for the channel
     *
     * @see ServerChannel.createRequirementsRoom
     */
    this.requirementsRoom = null;

    /**
     * ### ServerChannel.gameRooms
     *
     * Associative container for all the game rooms in the channel.
     *
     * @see ServerChannel.createGameRoom
     */
    this.gameRooms = {};

    /**
     * ### ServerChannel.maxRooms
     *
     * The maximum number of game rooms allowed in this channel.
     * The value -1 means unlimited.
     */
    this.maxRooms = 'undefined' === typeof options.maxRooms ?
        -1 : options.maxRooms;

    /**
     * ### ServerChannel.autoRoomNo
     *
     * Incremental index used when creating
     * game rooms with a default name.
     */
    this.autoRoomNo = 0;

    /**
     * ### ServerChannel.gameLevels
     *
     * Active game levels of the game
     */
    this.gameLevels = {};

    /**
     * ### ServerChannel.bots
     *
     * node instances of bots inside the channel, indexed by Client ID
     */
    this.bots = {};

    /**
     * ### ServerChannel.phantoms
     *
     * Spawn phantomjs processes, indexed by PID
     */
    this.phantoms = {};

    // Creating the AdminServer and PlayerServer.
    this.createServers();

    // Create garage room.
    this.garageRoom = this.createRoom('Garage');
}

// ## ServerChannel methods

/**
 * ### ServerChannel.createServers
 *
 * Creates the AdminServer and the PlayerServer
 *
 * Creates the configuration objects to pass to the constructor of each server.
 *
 * @see GameServer
 * @see PlayerServer
 * @see AdminServer
 */
ServerChannel.prototype.createServers = function() {
    var options = this.options;

    // Enforce a name.
    options.adminServer.name = options.adminServer.name || '[ADMIN_SERVER]';
    options.playerServer.name = options.playerServer.name || '[PLAYER_SERVER]';

    // Actually creates the servers.
    this.adminServer = new AdminServer(options.adminServer, this);
    this.playerServer = new PlayerServer(options.playerServer, this);

    // The two servers are aware of each other.
    this.adminServer.setPartner(this.playerServer);
    this.playerServer.setPartner(this.adminServer);
};

/**
 * ### ServerChannel.listen
 *
 * Puts the AdminServer and PlayerServer on listen mode
 *
 * @return {boolean} TRUE, if both servers are turned on successfully
 */
ServerChannel.prototype.listen = function() {
    try {
        this.adminServer.listen();
        this.playerServer.listen();
        return true;
    }
    catch(e) {
        this.sysLogger.log(e, 'error');
        return false;
    }
};

/**
 * ### ServerChannel.createGameRoom
 *
 * Creates and returns a new GameRoom object
 *
 * If conf.name is not given, the next free name in the sequence
 * 'room1', 'room2', ..., 'room999' is automatically chosen and set in
 * the conf parameter.
 *
 * @param {object} conf Config object, acceptable by GameRoom constructor
 *
 * @return {GameRoom} The new GameRoom
 *
 * @see GameRoom
 */
ServerChannel.prototype.createGameRoom = function(conf) {
    var maxRoomsErr;
    var autoRoomNo;
    var clients;
    var i, len, playerIds;
    var newRoom, roomGroup;
    conf = conf || {};

    // Checking if the limit in the number of game rooms has been hit.
    if (this.maxRooms !== -1 && J.size(this.gameRooms) >= this.maxRooms) {
        maxRoomsErr = 'Max number of game rooms for ' + this.name +
            ' reached: ' + this.maxRooms;
        maxRoomsErr += ' . Cannot create another game room.';
        this.sysLogger.log(maxRoomsErr, 'error');
        return false;
    }

    clients = conf.clients;

    roomGroup = 'string' !== typeof conf.group ? 'room' : conf.group;
    // Generate default name if none given:
    if ('undefined' === typeof conf.name) {
        // Try 'room1', 'room2', ..., 'room999':
        do {
            this.autoRoomNo++;
            conf.name = roomGroup + '' + this.autoRoomNo;
        }
        while (conf.name in this.gameRooms);
    }
    // Check for name availibility:
    else if (conf.name in this.gameRooms) {
        throw new Error("ServerChannel.createGameRoom: Requested room name '" +
                    conf.name + "' already taken.");
    }

    // Check for parent existence:
    if (conf.parentRoom && !(conf.parentRoom in this.gameRooms)) {
        throw new Error("ServerChannel.createGameRoom: Nonexistent room '" +
                    conf.parentRoom + "' requested as parent.");
    }

    if ('undefined' !== typeof conf.channel) {
        this.sysLogger.log("ServerChannel.createGameRoom: channel parameter " +
                           "ignored.", 'warn');
    }

    // Adding a reference to this channel.
    conf.channel = this;

    // Construct room (the players will be moved into it explicitly):
    delete conf.clients;

    // Setting group = name if none is defined.
    conf.group = 'undefined' === typeof conf.group ? conf.name : conf.group;

    newRoom = new GameRoom(conf);
    conf.clients = clients;

    // Add to parent:
    if (conf.parentRoom) {
        this.gameRooms[conf.parentRoom].children.push(newRoom.name);
    }

    // Register room:
    this.gameRooms[newRoom.name] = newRoom;

    // Move players into the room:
    if (clients) {
        playerIds = J.isArray(clients) ? clients : clients.id.getAllKeys();
        i = -1, len = playerIds.length;
        for ( ; ++i < len ; ) {
            this.moveClient(playerIds[i], newRoom.name);
        }
    }

    this.sysLogger.log('channel ' + this.name + ': room ' + this.autoRoomNo +
                       ' created. Chosen treatment: ' +
                       conf.treatmentName || '(undefined).');

    return newRoom;
};

/**
 * ### ServerChannel.createWaitingRoom
 *
 * Creates the waiting room and stores a reference in channel
 *
 * @param {object} settings Config object
 * @param {boolean} primary Optional. Marks the newly created waiting room
 *    as default, and stores a reference under ServerChannel.waitingRoom.
 *    If TRUE and a default waiting room is existing an error will be thrown.
 *    Default: FALSE.
 *
 * @return {WaitingRoom} The waiting room
 *
 * @see WaitingRoom
 * @see ServerChannel.createRoom
 * @see ServerChannel.setDefaultWaitingRoom
 */
ServerChannel.prototype.createWaitingRoom = function(settings, makeDefault) {
    var room;
    if (makeDefault && this.waitingRoom) {
        this.sysLogger.log("Default waiting room for channel '" + this.name +
                           "' already existing.", 'error');
        return false;
    }
    room = this.createRoom('Waiting', settings);
    // Sets it as the default waiting room for the channel, if requested so.
    if (makeDefault) this.setDefaultWaitingRoom(room);
    return room;
};

/**
 * ### ServerChannel.setDefaultWaitingRoom
 *
 * Sets the default waiting room for the channel
 *
 * @param {string|object} The name of the requirements room or the room itself
 *
 * @see WaitingRoom
 */
ServerChannel.prototype.setDefaultWaitingRoom = function(room) {
    var roomObj;

    if ('string' === typeof room) {
        roomObj = this.gameRooms[room];
        if (!roomObj) {
            throw new Error('ServerChannel.setDefaultWaitingRoom: ' +
                            'could find room: ' + room);
        }
    }
    else if ('object' === typeof room) {
        roomObj = room;
    }
    else {
        throw new TypeError('ServerChannel.setDefaultWaitingRoom: ' +
                            'room must be object or string. Found: ' + room);
    }
    if (roomObj.roomType !== 'Waiting') {
        throw new Error('ServerChannel.setDefaultWaitingRoom: ' +
                        'room is not a waiting room: ' + roomObj.type);
    }
    this.waitingRoom = roomObj;
};

/**
 * ### ServerChannel.createRequirementsRoom
 *
 * Creates the requirements room and stores a reference in channel
 *
 * @param {object} settings Config object
 * @param {boolean} makeDefault Optional. Marks the newly created
 *    requirement room as default, and stores a reference under
 *    ServerChannel.requirementRoom. If TRUE and a requirements room
 *    is already existing an error will be thrown. Default: FALSE.
 *
 * @return {RequirementsRoom} The requirements room
 *
 * @see RequirementsRoom
 * @see ServerChannel.createRoom
 * @see ServerChannel.setDefaultRequirementsRoom
 */
ServerChannel.prototype.createRequirementsRoom = function(settings,
                                                          makeDefault) {
    var room;
    if (makeDefault && this.requirementsRoom) {
        this.sysLogger.log("Default requirements Room for channel '" +
                           this.name + "' already existing.", 'error');
        return false;
    }
    room = this.createRoom('Requirements', settings);
    // Sets it as the default requirement room for the channel, if requested so.
    if (makeDefault) this.setDefaultRequirementsRoom(room);
    return room;
};

/**
 * ### ServerChannel.setDefaultRequirementRoom
 *
 * Sets the default requirements room for the channel
 *
 * @param {string|object} The name of the requirements room or the room itself
 *
 * @see RequirementsRoom
 */
ServerChannel.prototype.setDefaultRequirementsRoom = function(room) {
    var roomObj;
    if ('string' === typeof room) {
        roomObj = this.gameRooms[room];
        if (!roomObj) {
            throw new Error('ServerChannel.setDefaultRequirementsRoom: ' +
                            'could find room: ' + room);
        }
    }
    else if ('object' === typeof room) {
        roomObj = room;
    }
    else {
        throw new TypeError('ServerChannel.setDefaultRequirementsRoom: ' +
                            'room must be object or string. Found: ' + room);
    }
    if (roomObj.roomType !== 'Requirements') {
        throw new Error('ServerChannel.setDefaultRequirementsRoom: ' +
                        'room is not a requirements room: ' + roomObj.type);
    }
    this.requirementsRoom = roomObj;
};


/**
 * ### ServerChannel.createRoom
 *
 * Primitive for creating a Waiting or Requirements room
 *
 * @param {string} type 'Waiting' or 'Requirements'
 * @param {object} settings The settings for the constructor of the room
 *
 * @return {RequirementsRoom|WaitingRoom} room The created room
 */
ServerChannel.prototype.createRoom = function(type, settings) {
    var room, conf;
    settings = settings || {};
    if ('object' !== typeof settings) {
        throw new TypeError('ServerChannel.create' + type + 'Room: settings ' +
                            'must be object or undefined.');
    }

    conf = {};
    conf.group = type + 'Room';
    conf.name = settings.name || type.toLowerCase();
    conf.gameLevel = settings.gameLevel;

    if (this.gameRooms[conf.name]) {
        throw new Error('ServerChannel.create' + type + 'Room: room name ' +
                        'already taken: ' + conf.name + '.');
    }

    conf.logicPath = settings.logicPath;

    delete settings.logicPath;
    delete settings.name;
    delete settings.gameLevel;

    // Adding a reference to this channel.
    conf.channel = this;

    // Adding settings.
    conf.settings = settings;

    // Construct room (the players will be moved into it explicitly):
    if (type === 'Waiting') {
        room = new WaitingRoom(conf);
    }
    else if (type === 'Requirements') {
        room = new RequirementsRoom(conf);
    }
    else if (type === 'Garage') {
        room = new GarageRoom(conf);
    }
    else {
        throw new Error('ServerChannel.createRoom: unknown room type: ' + type);
    }

    // TODO: consider this. Maybe waiting and requirements room should not
    // be added to the gameRooms. But there is a lot refactoring for this.
    // Notice that unlike game rooms, waiting and requirements room are added
    // as a direct reference in the channel object, instead of to the
    // `gameRooms` object.

    // Adding room to gameRooms object.
    this.gameRooms[conf.name] = room;

    room.setupGame();
    room.startGame();

    return room;
};

/**
 * ### ServerChannel.destroyRoom
 *
 * Destroys a game|requirements|waiting room
 *
 * The child-rooms of the destroyed room are reparented to the destroyed room's
 * parent.
 * The room is only destroyed if it's empty or if a valid substitute room is
 * given to move the players to.
 *
 * @param {string|object} room The name of room, or the room object to destroy
 * @param {object} options Optional. Additional parameters.
 *
 *   - ignoreRunningGame (boolean):
 *       Optional. Tries to destroy the room even if the game is
 *       not in gameover state. Default: FALSE
 *
 *   - substituteRoomName (string):
 *       Optional. Name of the room to move the players to.
 *       If null, the room will not be destroyed if it contains players unless
 *       `disconnectPlayers` is true. Default: null
 *
 *   - disconnectPlayers (boolean):
 *       Optional. If no `substituteRoomName` is given causes remaining players
 *       to disconnect. Otherwise room will not be destroyed. Default: FALSE
 *
 * @return {boolean} Whether the room was destroyed successfully
 *
 * @see GameRoom
 */
ServerChannel.prototype.destroyGameRoom = function(room, options) {
    var i, len;
    var roomObj;
    var clientObjs;
    var parentRoom;
    var childName;
    var substituteRoomName, ignoreRunningGame, disconnectPlayers;
    var socket;

    if ('string' === typeof room) {
        roomObj = this.gameRooms[room];
        if (!roomObj) {
            throw new TypeError('ServerChannel.destroyGameRoom: room not ' +
                                'found: ' + room + '.');
        }
    }
    else if ('object' === typeof room) {
        roomObj = room;
    }
    else {
        throw new TypeError('ServerChannel.destroyGameRoom: room must be ' +
                            'string or object.');
    }

    // Get parameters.
    options = options || {};
    substituteRoomName = options.substituteRoomName || null;
    ignoreRunningGame = !!options.ignoreRunningGame;
    disconnectPlayers = !!options.disconnectPlayers;

    if (substituteRoomName && !(this.gameRooms[substituteRoomName])) {
        throw new Error('ServerChannel.destroyGameRoom: ' +
                        'options.substituteRoomName is not a valid room: ' +
                        substituteRoomName + '.');
    }

    if (substituteRoomName && disconnectPlayers) {
        throw new Error('ServerChannel.destroyGameRoom: incompatible ' +
                        'options selected: substituteRoomName and ' +
                        'disconnectPlayers.');
    }


    // Check whether the game in the room is still running.
    if (!ignoreRunningGame && !roomObj.node.game.isGameover()) {
        this.sysLogger.log('ServerChannel.destroyGameRoom: game still ' +
                           'running in room ' + roomObj.name + '. Use ' +
                           'ignoreRunningGame flag to proceed anyway. ' +
                           'Aborting.', 'error');
        return false;
    }

    if (roomObj.clients.player.size() &&
        (!substituteRoomName && !disconnectPlayers)) {
        this.sysLogger.log('ServerChannel.destroyGameRoom: room ' +
                           roomObj.name + 'still contains players. Use ' +
                           'substituteRoomName or disconnectPlayers flags ' +
                           'to proceed anyway.', 'error');
        return false;
    }

    // Find out where to move the remaining players.
    clientObjs = roomObj.clients.id.getAllKeyElements();
    if (!J.isEmpty(clientObjs)) {

        // Move/disconnect players and disconnect admins.
        for (i in clientObjs) {
            if (clientObjs.hasOwnProperty(i)) {
                if (clientObjs[i].admin) {
                    // Disconnect admin.
                    socket = this.adminServer.socketManager.clients[i];
                    socket.disconnect(clientObjs[i].sid);
                }
                else {
                    // Move or disconnect player.
                    if (substituteRoomName) {
                        this.moveClient(i, substituteRoomName);
                    }
                    else {
                        socket = this.playerServer.socketManager.clients[i];
                        socket.disconnect(clientObjs[i].sid);
                    }
                }
            }
        }
    }

    // Remove from parent's list of children.
    parentRoom = roomObj.parentRoom;
    if (parentRoom && this.gameRooms[parentRoom]) {
        delete this.gameRooms[parentRoom].children[roomName];
    }
    else {
        parentRoom = null;
    }

    // Give orphan rooms to their grandparent.
    i = -1, len = roomObj.childRooms.length;
    for ( ; ++i < len ; ) {
        childName = roomObj.childRooms[i];
        if (childName in this.gameRooms) {
            // Tell child.
            this.gameRooms[childName].parentRoom = parentRoom;

            // Tell parent.
            if (parentRoom) {
                this.gameRooms[parentRoom].childRooms.push(childName);
            }
        }
    }

    // Remove room references.
    delete this.gameRooms[roomObj.name];
    delete this.servernode.rooms[roomObj.id];

    this.sysLogger.log('room destroyed: ' + roomObj.name + '.');
    return true;
};

/**
 * ### ServerChannel.createGameLevel
 *
 * Creates a new game level
 *
 * @param {object} settings Config object
 * @param {boolean} makeDefault Optional. Marks the newly created
 *    requirement room as default, and stores a reference under
 *    ServerChannel.requirementRoom. If TRUE and a requirements room
 *    is already existing an error will be thrown. Default: FALSE.
 *
 * @return {RequirementsRoom} The requirements room
 *
 * @see RequirementsRoom
 * @see ServerChannel.createRoom
 * @see ServerChannel.setDefaultRequirementsRoom
 */
ServerChannel.prototype.createGameLevel = function(settings) {

    var name, level;
    name = settings.name;
    if ('string' !== typeof name) {
        throw new TypeError('ServerChannel.createGameLevel: settings must ' +
                            'be string. Found: ' + name);
    }
    if (this.gameLevels[name]) {
        throw new TypeError('ServerChannel.createGameLevel: a level with ' +
                            'the same name already exists: ' + name);

    }
    level = new GameLevel(settings, this);
    this.gameLevels[name] = level;
    return level;
};

/**
 * ### ServerChannel.moveClient
 *
 * Moves a player into a different room
 *
 * Removes player from his old room and inserts him into the given room.
 * Updates the ChannelRegistry.
 *
 * Sends out notifications to other clients.
 *
 * @param {string} playerId Player ID or game alias
 * @param {string} toRoom New room name (must exist)
 * @param {string} fromRoom Optional. The name of the current room, to avoid
 *    further lookup. (if given, must exist)
 */
ServerChannel.prototype.moveClient = function(playerId, toRoom, fromRoom) {
    var playerObj;
    var toRoomObj, fromRoomObj;
    var oldPlayerList;
    var gameServer;

    playerId = this.registry.lookupClient(playerId);

    if (!fromRoom) fromRoom = this.registry.getClientRoom(playerId);

    // Check for existence of fromRoom:
    if (!fromRoom || !this.gameRooms.hasOwnProperty(fromRoom)) {
        throw new Error('ServerChannel.moveClient: ' +
                        'Player was in invalid room: "' + fromRoom + '"');
    }

    // Check for existence of toRoom:
    if (!toRoom || !this.gameRooms.hasOwnProperty(toRoom)) {
        throw new Error('ServerChannel.moveClient: ' +
                        'Unknown toRoom: "' + toRoom + '"');
    }

    // Delete player from old room:
    playerObj = this.gameRooms[fromRoom].clients.remove(playerId);
    if (!playerObj) {
        throw new Error('ServerChannel.moveClient: ' +
                        'Player "' + playerId +
                        '" not found in room "' + fromRoom + '"');
    }

    toRoomObj = this.gameRooms[toRoom];
    fromRoomObj = this.gameRooms[fromRoom];

    // Add player to new room:
    oldPlayerList = toRoomObj.clients.player.breed();
    toRoomObj.clients.add(playerObj);

    // Update ChannelRegistry:
    this.registry.moveClient(playerId, toRoom);

    // Send updated PLISTs to all involved players.
    // It is important that the following code executes _after_ the player has
    // been registered in the new room.

    gameServer = playerObj.admin ? this.adminServer : this.playerServer;
    gameServer.notifyRoomDisconnection(playerObj, fromRoomObj);
    gameServer.notifyRoomConnection(playerObj, toRoomObj);

    // Old room had onConnect, new one not or has no players.
    // Force clear the player list.
    if (fromRoomObj.acm.notify.onConnect &&
        (!toRoomObj.acm.notify.onConnect || !oldPlayerList.size())) {

        gameServer.socketManager.send(gameServer.msg.create({
            target: 'SETUP',
            to:     playerId,
            text:   'plist',
            reliable:500,
            data:   J.stringify([[], 'replace'])
        }));
    }
};


/**
 * ### ServerChannel.getGameLevel
 *
 * Returns the game level object
 *
 * @param {string} level The name of the game level
 *
 * @return {GameLevel} levelObj The game level object
 *
 * @see GameLevel
 * @see ServerChannel.gameLevels
 */
ServerChannel.prototype.getGameLevel = function(level) {
    var levelObj;
    if ('string' !== typeof level) {
        throw new TypeError('ServerChannel.getGameLevel: level must ' +
                            'be string. Found: ' + level);
    }

    levelObj = this.gameLevels[level];

    if (!levelObj) {
        throw new Error('ServerChannel.getGameLevel: level not found: ' +
                        level);
    }
    return levelObj;
};

/**
 * ### ServerChannel.moveClientToGameLevel
 *
 * Moves a client to the entry room of the chosen game level
 *
 *
 * @param {string} playerId Player ID or game alias
 * @param {string} toLevel New level name (must exist, and must have entry room)
 * @param {string} fromRoom Optional. The name of the current room, to avoid
 *    further lookup. (if given, must exist)
 *
 * @see ServerChannel.moveClient
 */
ServerChannel.prototype.moveClientToGameLevel = function(playerId, toLevel,
                                                         fromRoom) {

    var toLevelObj, toRoom;

    toLevelObj = this.getGameLevel(toLevel);
    toRoom = toLevelObj.getEntryRoom();
    if (!toRoom) {
        throw new Error('ServerChannel.moveClientToGameLevel: level has no ' +
                        'entry room. Level: ' + toLevel);
    }

    return this.moveClient(playerId, toRoom.name, fromRoom);
};

/**
 * ### ServerChannel.placeClient
 *
 * Places a player into a room for the first time
 *
 * Player must not be found in any other room, otherwise
 * an error is raised.
 *
 * The method is used to place newly connecting players in their
 * first room, or reconnecting players in their last room.
 *
 * Unlike `moveClient` this method does not send out notifications.
 *
 * @param {object|Player} playerObj An object representing a player
 * @param {string} inRoom New room ID (must exist)
 *
 * @return {boolean} Whether the placement was valid and performed
 */
ServerChannel.prototype.placeClient = function(playerObj, inRoom) {
    var playerId, fromRoomName, roomObj;
    var e;

    roomObj = this.gameRooms[inRoom];

    if (!roomObj) {
        e = 'ServerChannel.placeClient: room not found: "' + inRoom + '".';
        this.sysLogger.log(e, 'error');
        return false;
    }

    playerId = playerObj.id;
    fromRoomName = this.registry.getClientRoom(playerId);

    // Player must not be found already in any room.
    if (fromRoomName && this.gameRooms[fromRoomName].clients.exist(playerId)) {
        e = 'ServerChannel.placeClient: ' +
            'player already in room: "' + fromRoomName + '"';
        this.sysLogger.log(e, 'error');
        return false;
    }

    // Add player to room.
    roomObj.clients.add(playerObj);

    // Adds a new room in the room stack in Channel Registry unless the client
    // is reconnecting, in which case the new room is the same as the old one.
    this.registry.moveClient(playerId, inRoom);

    return true;
};

/**
 * ### ServerChannel.require
 *
 * Special require statement to share objects with the required files
 *
 * Always adds a reference to the current _channel_ amongst the exported
 * modules.
 *
 * @param {string} path The path to the required file
 * @param {object} exports Optional. Object literals with properties shared
 *   with the required file
 * @param {boolean} nocache If TRUE, deletes the cached path and forces
 *   re-reading from file system. Default: FALSE
 * @return {mixed} The required file
 *
 * @see http://stackoverflow.com/questions/9210542/
 *             node-js-require-cache-possible-to-invalidate
 */
ServerChannel.prototype.require = function(path, exports, nocache) {
    var channel = this;
    // TODO: set it to null instead?
    if (nocache) delete require.cache[require.resolve(path)];
    return (function() {
        module.exports.channel = channel;

        for (var i in exports) {
            if (exports.hasOwnProperty(i)) {
                module.exports[i] = exports[i];
            }
        }
        return require(path);
    })();
};

/**
 * ### ServerChannel.getGameDir
 *
 * Returns the full path to the game directory
 *
 * @see ServerNode.resolveGameDir
 */
ServerChannel.prototype.getGameDir = function() {
    return this.servernode.resolveGameDir(this.gameName);
};

/**
 * ### ServerChannel.hasGameTreatment
 *
 * Returns TRUE, if game has specified treatment
 *
 * @param {string} The treatment to check
 *
 * @see ServerChannel.gameInfo
 */
ServerChannel.prototype.hasGameTreatment = function(t) {
    return !!this.gameInfo.settings[t];
};

/**
 * ### ServerChannel.authorizeSuperUser
 *
 * Returns true if username and password corresponds to channel credentials
 *
 * @ServerChannel.credentials
 */
ServerChannel.prototype.authorizeSuperUser = function(user, pwd) {
    return this.credentials &&
        this.credentials.user === user &&
        this.credentials.pwd === pwd;
};

/**
 * ### ServerChannel.connectBot
 *
 * Creates a bot and put it in a room
 *
 * A reference to the newly created bot is placed in `Channel.bots`.
 *
 * @param {object} options Optional. Bot options with the following fields:
 *
 *   - room (Room):
 *     Optional. {string|object} The room name ('waiting',
 *     'requirements', etc.) or the full room object
 *     in which to place the bot. Default: channel.waitingRoom
 *   - clientType (string):
 *     Optional. Client type of the bot. Default: 'bot'
 *   - setup (object):
 *     Optional. Configuration object to be passed to
 *     `node.setup('nodegame', setup)`. Default: {}.
 *
 * @return {NodeGameClient} The node instance of the new bot
 */
ServerChannel.prototype.connectBot = function(options) {
    var that;
    var clientType;
    var room;
    var id;
    var node;

    that = this;

    // Check inputs.

    options = options || {};

    if ('object' !== typeof options) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options must be object or undefined. Found: ' + options);
    }

    if (options.room) {
        if ('string' === typeof options.room) {
            room = this.gameRooms[options.room];
            if (!room) {
                throw new Error('ServerChannel.connectBot: options.room does ' +
                                'not appear to be a registered room: ' +
                                options.room);
            }
        }
        else if ('object' === typeof options.room) {
            if (!this.gameRooms[options.room.name]) {
                throw new Error('ServerChannel.connectBot: options.room.name ' +
                                'does not appear to be a registered room: ' +
                                options.room.name);
            }
            room = options.room;
        }
        else {
            throw new TypeError('ServerChannel.connectBot: options.room ' +
                                'must be a Room object, a string containing ' +
                                'the name of a room, or undefined. Found: ' +
                                options.room);
        }
    }
    else {
        room = this.waitingRoom;
    }

    if ('undefined' !== typeof options.clientType) {
        if ('string' !== typeof options.clientType) {
            throw new TypeError('ServerChannel.connectBot: options.clientType' +
                                ' must be string or undefined. Found: ' +
                                options.clientType);
        }
        else {
            clientType = options.clientType;
        }
    }
    else {
        clientType = 'bot';
    }

    if (!this.gameInfo.clientTypes[clientType]) {
        throw new Error('ServerChannel.connectBot: client type not found: ' +
                        clientType);
    }

    if ('undefined' !== typeof options.id) {
        if ('string' !== typeof options.id) {
            throw new TypeError('ServerChannel.connectBot: options.id ' +
                                'must be string or undefined. Found: ' +
                                options.id);
        }
        else {
            id = options.id;
        }
    }

    // Create the bot.

    node = ngc.getClient();

    node.log = options.logger || (function() {
        var logger = Logger.get('clients', {name: clientType});
        return function(msg, lvl) { logger.log(msg, lvl); };
    })();

    // Setup must be called before connect.
    node.setup('nodegame', options.setup || {});

    // This code needs to run as soon as the clientId is generated to avoid
    // calling GameRoom.setupGame before the node object is stored.
    node.once('PLAYER_CREATED', function() {
        that.bots[node.player.id] = node;
    });

    // Connect bot to server.
    node.socket.setSocketType('SocketDirect', {
        socket: this.playerServer.socketManager.sockets.direct
    });

    node.connect(null, {
        startingRoom: room.name,
        clientType:   clientType,
        id: id
    });

    return node;
};

/**
 * ### ServerChannel.connectPhantom
 *
 * Create a PhantomJS player connected to the server
 *
 * @param {object} options Optional. Connection options with these fields:
 *
 *   - port (number):
 *     Optional. Port to connect to. Default: this.servernode.port
 *   - gameName (string):
 *     Optional. Game to connect to. Uses the channel name by default. If all
 *     games have names different from the channel name, this is invalid.
 *     Default: this.name
 *   - filePath (string):
 *     Optional. URL suffix for a relative file path, without leading slash.
 *     A trailing slash is required if this is a directory
 *   - queryString (string):
 *     Optional. String of query parameters to append
 *     to the URL. Default: '?clientType=autoplay'
 *   - phantomjsArgs (array):
 *     Optional. Array of strings to give PhantomJS as command line arguments
 *
 * @return {ChildProcess} Handle to the PhantomJS process
 */
ServerChannel.prototype.connectPhantom = function(options) {
    var port, gameName, filePath, queryString, phantomjsArgs, omitGameName;
    var serverdir;
    var url;
    var phantomjs, phPath;
    var auth, clientId, clientPwd, clientObj;
    var logger;
    var i;
    var that;

    that = this;

    // Check inputs.

    options = options || {};

    port = options.port;
    if ('undefined' !== typeof port &&
        'number'    !== typeof port) {
        throw new TypeError('ServerChannel.connectPhantom: ' +
                'port must be number or undefined.');
    }
    port = 'undefined' === typeof port ?
        this.servernode.port : port;

    if ('undefined' === typeof options.omitGameName) {
        omitGameName = !!options.omitGameName;
    }

    gameName = options.gameName;
    if ('string' === typeof gameName) {
        gameName = options.gameName;
    }
    else if ('undefined' === typeof gameName) {
        if (!omitGameName && !this.defaultChannel) {
            gameName = this.gameName
        }
    }
    else {
        throw new TypeError('ServerChannel.connectPhantom: ' +
                'gameName must be string or undefined.');
    }

    filePath = options.filePath;
    if ('undefined' !== typeof filePath &&
        'string'    !== typeof filePath) {
        throw new TypeError('ServerChannel.connectPhantom: ' +
                'filePath must be string or undefined.');
    }
    filePath = 'undefined' === typeof filePath ? '' : filePath;

    queryString = options.queryString;
    if ('undefined' !== typeof queryString &&
        'string'    !== typeof queryString) {
        throw new TypeError('ServerChannel.connectPhantom: ' +
                'queryString must be string or undefined.');
    }
    queryString = 'undefined' === typeof queryString ?
        '?clientType=autoplay' : queryString;

    phantomjsArgs = options.phantomjsArgs;
    if ('undefined' !== typeof phantomjsArgs &&
        !J.isArray(phantomjsArgs)) {
        throw new TypeError('ServerChannel.connectPhantom: ' +
                'phantomjsArgs must be array or undefined.');
    }
    phantomjsArgs = 'undefined' === typeof phantomjsArgs ?  [] : phantomjsArgs;

    if ('string' === typeof options.auth) {
        if (options.auth === 'createNew') {
            if (this.playerServer.generateClientId) {
                clientId = this.playerServer.generateClientId();
            }
            else {
                clientId = this.registry.generateClientId();
            }
            if ('string' !== typeof clientId) {
                throw new Error('ServerChannel.connectPhantom: failed to ' +
                                'create a new client id. Found: ' + clientId);
            }
            this.registry.addClient(clientId, {});
        }
        else if (options.auth === 'nextAvailable') {
            // TODO: for the moment we keep a while loop here,
            // This should be a view on ChannelRegistry.
            i = 0;
            clientObj = this.registry.clients.db[i];

            while (clientObj &&
                   (clientObj.admin ||
                    clientObj.connected || clientObj.disconnected)) {

                clientObj = this.registry.clients.db[++i];
            }

            if (!clientObj) {
                throw new Error('ServerChannel.connectPhantom: no auth ' +
                                'codes available.');
            }
            clientId = clientObj.id;
        }
        else {
            clientId = options.auth
        }
    }
    else if ('number' === typeof options.auth) {
        clientId = options.auth;
    }
    else if ('object' === typeof options.auth) {

        if ('string' !== typeof options.auth.id &&
            'number' !== typeof options.auth.id) {

            throw new TypeError('ServerChannel.connectPhantom: options.' +
                                'auth.id must be string or number. Found: ' +
                                options.auth.id);
        }
        if (options.auth.pwd &&
            'string' !== typeof options.auth.pwd &&
            'number' !== typeof options.auth.pwd) {

            throw new TypeError('ServerChannel.connectPhantom: options.' +
                                'auth.pwd must be string, number or ' +
                                'undefined. Found: ' + options.auth.pwd);
        }
        clientId = options.auth.id;
        clientPwd = options.auth.pwd;
    }
    else if ('undefined' !== typeof options.auth) {
        throw new TypeError('ServerChannel.connectPhantom: options.auth must ' +
                            'be string, number, object or undefined. Found: ' +
                            options.auth);
    }

    // Launch a phantomjs process with a connection to the server.

    // Set up the arguments to phantomjs.

    // Url might or not contain gameName (e.g. not if it is default channel).
    url = 'http://localhost:' + port + '/';
    if (gameName) url += gameName + '/';
    if (clientId) url += 'auth/' + clientId + '/';
    if (clientPwd) url += clientPwd + '/';
    url += filePath + queryString;
    phantomjsArgs.push(this.servernode.rootDir + '/phantomjs/openurl.js');
    phantomjsArgs.push(url);

    // Do not call /phantomjs/bin/phantomjs to avoid double spawn.
    phPath = J.resolveModuleDir('phantomjs', __dirname);
    phPath = require(phPath + '/lib/phantomjs').path;

    // Spawn.
    phantomjs = spawn(phPath, phantomjsArgs);

    phantomjs.stdout.setEncoding('utf8');
    logger = Logger.get('clients', {name: 'phantomjs'});

    phantomjs.stdout.on('data', function(data) {
        logger.log('stdout: ' + data);
    });

    phantomjs.stderr.on('data', function(data) {
        logger.log('stderr: ' + data, 'error');
    });

    phantomjs.on('exit', function(code, signal) {
        // Wait few ms for error to be printed.
        setTimeout(function() {
            logger.log('PhantomJS (PID ' + phantomjs.pid + ') exited');
            if (code !== 0) {
                var msg = 'PhantomJS received non-zero exit code: ' + code +
                          ', Signal: ' + signal;
                logger.log(msg, 'error', { code: code, signal: signal });
                if (that.servernode.debug) {
                    throw Error(msg);
                }
            }

            delete that.phantoms[phantomjs.pid];
        }, 20);
    });

    phantomjs.on('error', function(err) {
        console.error('Error executing phantom at', phPath);
        console.error(err.stack);
    });

    // Add to the global collection.
    this.phantoms[phantomjs.pid] = phantomjs;
    return phantomjs;
};

// Maybe we do not need this api.

// /**
//  * ### ServerChannel.killPhantom
//  *
//  * Sends a SIGHUP signal to all active PhantomJS processes
//  *
//  * @see ServerChannel.connectPhantom
//  */
// ServerChannel.prototype.killAllPhantoms = function() {
//     var phantom;
//     for (phantom in this.phantoms) {
//         if (this.phantoms.hasOwnProperty(phantom)) {
//             console.log('killing ', phantom);
//             process.kill(phantom, 'SIGHUP');
//         }
//     }
// };

// TODO: finish this method. Should destroy all game rooms. clear all players?,
//       keep the waiting room

// ServerChannel.prototype.reboot = function(level) {
//     var that, roomName, waitingLogicId;
//     that = this;
//
//     waitingLogicId = this.waitingRoom.node.player.id;
//
//     // Remove clients from registry, game rooms and disconnect them.
// //    this.registry.clients.each(function(c) {
// //        if (c.id !== waitingLogicId) {
// //            if (c.admin) {
// //
// //                // This is correct but too much...
// //                //that.admin.socket.clients[c.id].disconnect(c.sid);
// //
// //
// //                delete that.admin.socket.clients[c.id].clients[c.sid];
// //            }
// //            else {
// //                // This is correct but too much...
// //                //that.player.socket.clients[c.id].disconnect(c.sid);
// //
// //                that.player.socket.clients[c.id].sio.sockets.
// //                      sockets[c.sid.slice(2)].disconnect();
// //            }
// //        }
// //    });
//
//     // Remove clients from registry, game rooms and disconnect them.
//     this.registry.clients.each(function(c) {
//         if (c.id !== waitingLogicId) {
//             that.registry.removeClient(c.id);
//         }
//     });
//
//
//     setTimeout(function() {
//         var roomName;
//         // Destroy empty game rooms.
//         for (roomName in that.gameRooms) {
//             if (that.gameRooms.hasOwnProperty(roomName)) {
//                 if (roomName !== that.waitingRoom.name) {
//                     that.destroyGameRoom(roomName);
//                 }
//             }
//         }
//     }, 500);
//
//     // Create a brand new Registry.
//     // this.registry = new ChannelRegistry({ name: this.name });
//     return;
// };
