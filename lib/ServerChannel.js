/**
 * # ServerChannel
 * Copyright(c) 2015 Stefano Balietti
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

var Logger = require('./Logger');

var J = require('JSUS').JSUS;

var spawn = require('child_process').spawn;

var ngc = require('nodegame-client');
var PlayerList = ngc.PlayerList;

var GameRoom = require('./GameRoom');
var WaitingRoom = require('./WaitingRoom');
var RequirementsRoom = require('./RequirementsRoom');

/**
 * ### ServerChannel.parseOptions
 *
 * Parses configuration options for player and admin server
 *
 * Each server (player and admin) needs a separate configuration object.
 * However servernode _addChannel_ method receive a single object.
 *
 * The object must have the _admin_ and _player_ properties, as two objects.
 * All the properties that are the first level in the main configuration object,
 * and that are not found in _admin_ or _player_ will be inherited.
 *
 * @param {object} options Configuration options
 * @return {object} out Parsed configuration object
 */
ServerChannel.parseOptions = function(options) {
    var adminOptions, playerOptions, out, tmp;

    // Options are mixed in.
    adminOptions = options.admin;
    playerOptions = options.player;
    delete options.admin;
    delete options.player;

    out = J.clone(options);
    J.mixin(adminOptions, out);
    tmp = J.clone(options);
    J.mixout(playerOptions, out);

    out.admin = adminOptions;
    out.player = playerOptions;

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
     */
    this.options = ServerChannel.parseOptions(options);

    /**
     * ### ServerChannel.name
     *
     * The name of the channel
     */
    this.name = options.name;

    /**
     * ### ServerChannel.gameName
     *
     * The name of the game associated with the channel
     */
    this.gameName = options.gameName;

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
     * ### ServerChannel.session
     *
     * Secret string used to sign channels' json tokens
     */
    this.secret = 'my secret';

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
     * ### ServerChannel.waitingRoom
     *
     * The waiting room for the channel.
     *
     * @see ServerChannel.createWaitingRoom
     */
    this.waitingRoom = null;

    /**
     * ### ServerChannel.requirementsRoom
     *
     * The requirements room for the channel.
     *
     * @see ServerChannel.createRequirementsRoom
     */
    this.waitingRoom = null;

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
    options.admin.name = options.admin.name || '[ADMIN_SERVER]';
    options.player.name = options.player.name || '[PLAYER_SERVER]';

    // Actually creates the servers.
    this.adminServer = new AdminServer(options.admin, this);
    this.playerServer = new PlayerServer(options.player, this);

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
    var i, playerIds;
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
        playerIds = clients.id.getAllKeys();
        for (i in playerIds) {
            if (playerIds.hasOwnProperty(i)) {
                this.movePlayer(playerIds[i], newRoom.name);
            }
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
 * If a waiting room is already existing an error will be thrown.
 *
 * @param {object} settings Config object
 *
 * @return {WaitingRoom} The waiting room
 *
 * @see WaitingRoom
 * @see createRoom
 */
ServerChannel.prototype.createWaitingRoom = function(settings) {
    var room;
    if (this.waitingRoom) {
        this.sysLogger.log("Waiting Room for channel '" + this.name +
                           "' already existing.", 'error');
        return false;
    }
    room = createRoom.call(this, 'Waiting', settings);
    // Add additional reference for convenience.
    this.waitingRoom = room;
    return room;
};

/**
 * ### ServerChannel.createRequirementsRoom
 *
 * Creates the requirements room and stores a reference in channel
 *
 * If a requirements room is already existing an error will be thrown.
 *
 * @param {object} settings Config object
 *
 * @return {RequirementsRoom} The requirements room
 *
 * @see RequirementsRoom
 * @see createRoom
 */
ServerChannel.prototype.createRequirementsRoom = function(settings) {
    var room;
    if (this.requirementsRoom) {
        this.sysLogger.log("Requirements Room for channel '" + this.name +
                           "' already existing.", 'error');
        return false;
    }
    room = createRoom.call(this, 'Requirements', settings);
    // Add additional reference for convenience.
    this.requirementsRoom = room;
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
                        this.movePlayer(i, substituteRoomName);
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
 * ### ServerChannel.movePlayer
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
ServerChannel.prototype.movePlayer = function(playerId, toRoom, fromRoom) {
    var playerObj;
    var toRoomObj, fromRoomObj;
    var oldPlayerList;
    var gameServer;

    playerId = this.registry.lookupClient(playerId);

    if (!fromRoom) fromRoom = this.registry.getClientRoom(playerId);

    // Check for existence of fromRoom:
    if (!fromRoom || !this.gameRooms.hasOwnProperty(fromRoom)) {
        throw new Error('ServerChannel.movePlayer: ' +
                        'Player was in invalid room: "' + fromRoom + '"');
    }

    // Check for existence of toRoom:
    if (!toRoom || !this.gameRooms.hasOwnProperty(toRoom)) {
        throw new Error('ServerChannel.movePlayer: ' +
                        'Unknown toRoom: "' + toRoom + '"');
    }

    // Delete player from old room:
    playerObj = this.gameRooms[fromRoom].clients.remove(playerId);
    if (!playerObj) {
        throw new Error('ServerChannel.movePlayer: ' +
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
    gameServer.notifyRoomDisconnection(playerObj.id, fromRoomObj);
    gameServer.notifyRoomConnection(playerObj.id, toRoomObj);

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

    return true;
};

/**
 * ### ServerChannel.placePlayer
 *
 * Places a player into a room for the first time
 *
 * Player must not be found in any other room, otherwise
 * an error is raised.
 *
 * The method is used to place newly connecting players in their
 * first room, or reconnecting players in their last room.
 *
 * Unlike `movePlayer` this method does not send out notifications.
 *
 * @param {object|Player} playerObj An object representing a player
 * @param {string} inRoom New room ID (must exist)
 *
 * @return {boolean} Whether the placement was valid and performed
 */
ServerChannel.prototype.placePlayer = function(playerObj, inRoom) {
    var playerId, fromRoomName, roomObj;
    var e;

    roomObj = this.gameRooms[inRoom];

    if (!roomObj) {
        e = 'ServerChannel.placePlayer: room not found: "' + inRoom + '".';
        this.sysLogger.log(e, 'error');
        return false;
    }

    playerId = playerObj.id;
    fromRoomName = this.registry.getClientRoom(playerId);

    // Player must not be found already in any room.
    if (fromRoomName && this.gameRooms[fromRoomName].clients.exist(playerId)) {
        e = 'ServerChannel.placePlayer: ' +
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
    if (nocache) delete require.cache[path];
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
 * ### ServerChannel.resolveGameDir
 *
 * Shortcut to `Servernode.resolveGameDir`
 *
 * Useful when it is not possible to expose the whole servernode object
 *
 * TODO: servernode should be private here.
 *
 * @see ServerNode.resolveGameDir
 */
ServerChannel.prototype.resolveGameDir = function(gameName) {
    return this.servernode.resolveGameDir(gameName);
};

/**
 * ### ServerChannel.connectBot
 *
 * Create a bot and put it in a room
 *
 * @param {object} options Bot options with the following fields:
 *
 *   - clientType (string):
 *     Optional. Client type of the bot. Default: 'bot'
 *   - room (GameRoom):
 *     The game room in which to put the bot initially
 *   - loadGame (boolean):
 *     Optional. Whether to load a game file. The remaining fields are only
 *     used if this is TRUE. Default: TRUE
 *   - botPath (string):
 *     Optional. Relative path to the game file. Default: Value in the
 *     game settings for the given treatment and client type
 *   - gameName (string):
 *     Optional. Name of the game. Default: room.gameName
 *   - treatmentName (string):
 *     Optional. Name of the treatment. Default: room.treatmentName
 *
 * @param {object} mixinConf Optional. Additional options to pass to the node
 *   instance of the room. Overrides the returned game configuration from the
 *   require statement.
 *
 * @return {object} The node instance of the new bot
 */
ServerChannel.prototype.connectBot = function(options, mixinConf) {
    var that;
    var bot, botPath;
    var loadGame;
    var clientType;
    var settings;
    var gameName;
    var game;
    var treatmentName;
    var node;

    that = this;

    // Check inputs.

    if ('object' !== typeof options) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options must be object.');
    }

    if (!options.room instanceof GameRoom) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options.room must be GameRoom.');
    }

    if ('undefined' !== typeof options.clientType &&
        'string'    !== typeof options.clientType) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options.clientType must be string or undefined.');
    }
    clientType = options.clientType || 'bot';

    if ('undefined' !== typeof options.botPath &&
        'string'    !== typeof options.botPath) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options.botPath must be string or undefined.');
    }

    if ('undefined' !== typeof options.loadGame &&
        'boolean'   !== typeof options.loadGame) {

        throw new TypeError('ServerChannel.connectBot: ' +
                'options.loadGame must be boolean or undefined.');
    }
    loadGame = 'undefined' === typeof options.loadGame ?
        true : options.loadGame;

    if ('undefined' !== typeof options.gameName &&
        'string'    !== typeof options.gameName) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options.gameName must be string or undefined.');
    }

    if ('undefined' !== typeof options.treatmentName &&
        'string'    !== typeof options.treatmentName) {
        throw new TypeError('ServerChannel.connectBot: ' +
                'options.treatmentName must be string or undefined.');
    }

    // Create the bot.

    node = ngc.getClient();

    node.log = options.logger || (function() {
        var logger = Logger.get('clients', {name: clientType});
        return function(msg, lvl) { logger.log(msg, lvl); };
    })();

    if (loadGame) {
        gameName = options.gameName || options.room.gameName;
        if (!gameName) {
            throw new TypeError('ServerChannel.connectBot: ' +
                    'options.gameName or options.room.gameName ' +
                    'must exist if options.loadGame is true.');
        }
        treatmentName = options.treatmentName || options.room.treatmentName;
        if (!treatmentName) {
            throw new TypeError('ServerChannel.connectBot: ' +
                    'options.treatmentName or options.room.treatmentName ' +
                    'must exist if options.loadGame is true.');
        }

        game = this.servernode.getGamesInfo(gameName);

        // If not given, look up the path of the given type.
        if (options.botPath) {
            // Prepend the path to the game directory.
            botPath = this.servernode.resolveGameDir(gameName) +
                options.botPath;
        }
        else {
            botPath = options.botPath ||
                game.treatments[treatmentName].gamePaths[clientType];
        }

        settings = game.treatments[treatmentName];

        // Require bot.
        bot = require(botPath)(node, options.room, treatmentName, settings);

        if ('object' !== typeof bot) {
            throw new Error('ServerChannel.connectBot: botPath "' +
                    botPath + '" did not return a valid game object.');
        }

        // Mixin-in nodeGame options.
        if (mixinConf) {
            J.mixin(bot, mixinConf);
        }

        // Setup must be called before connect.
        node.setup('nodegame', bot);
    }

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
        startingRoom: options.room.name,
        clientType:   clientType
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
 *
 * @see ServerChannel.killAllPhantoms
 */
ServerChannel.prototype.connectPhantom = function(options) {
    var port, gameName, filePath, queryString, phantomjsArgs;
    var serverdir;
    var url;
    var phantomjs, phPath;
    var logger;
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

    gameName = options.gameName;
    if ('undefined' !== typeof gameName &&
        'string'    !== typeof gameName) {
        throw new TypeError('ServerChannel.connectPhantom: ' +
                'gameName must be string or undefined.');
    }
    gameName = 'undefined' === typeof gameName ? this.name : gameName;

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

    // Launch a phantomjs process with a connection to the server.

    // Set up the arguments to phantomjs.
    serverdir = this.servernode.rootDir;
    url = 'http://localhost:' + port + '/' + gameName +
          '/' + filePath + queryString;
    phantomjsArgs.push(serverdir + '/phantomjs/openurl.js');
    phantomjsArgs.push(url);

    // Do not call /phantomjs/bin/phantomjs to avoid double spawn.
    phPath = require(serverdir + '/node_modules/phantomjs/lib/phantomjs').path;
    // Spawn.
    phantomjs = spawn(phPath, phantomjsArgs);

    phantomjs.stdout.setEncoding('utf8');
    logger = Logger.get('clients', {name: 'phantomjs'});

    phantomjs.stdout.on('data', function(text) {
        logger.log(text);
    });

    phantomjs.on('exit', function(code) {
        // Wait few ms for error to be printed.
        setTimeout(function() {
            logger.log('PhantomJS (PID ' + phantomjs.pid + ') exited');
            if (code !== 0) {
                var msg = 'PhantomJS received non-zero exit code: ' + arguments;
                logger.log(msg);
                console.log(msg);
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

ServerChannel.prototype.reboot = function(level) {
    var that, roomName, waitingLogicId;
    that = this;

    waitingLogicId = this.waitingRoom.node.player.id;

    // Remove clients from registry, game rooms and disconnect them.
//    this.registry.clients.each(function(c) {
//        if (c.id !== waitingLogicId) {
//            if (c.admin) {
//
//                // This is correct but too much...
//                //that.admin.socket.clients[c.id].disconnect(c.sid);
//
//
//                delete that.admin.socket.clients[c.id].clients[c.sid];
//            }
//            else {
//                // This is correct but too much...
//                //that.player.socket.clients[c.id].disconnect(c.sid);
//
//                that.player.socket.clients[c.id].sio.sockets.
//                      sockets[c.sid.slice(2)].disconnect();
//            }
//        }
//    });

    // Remove clients from registry, game rooms and disconnect them.
    this.registry.clients.each(function(c) {
        if (c.id !== waitingLogicId) {
            that.registry.removeClient(c.id);
        }
    });


    setTimeout(function() {
        var roomName;
        // Destroy empty game rooms.
        for (roomName in that.gameRooms) {
            if (that.gameRooms.hasOwnProperty(roomName)) {
                if (roomName !== that.waitingRoom.name) {
                    that.destroyGameRoom(roomName);
                }
            }
        }
    }, 500);

    // Create a brand new Registry.
    // this.registry = new ChannelRegistry({ name: this.name });
    return;
};


// ## Helper functions

/**
 * ### createRoom
 *
 * Primitive for creating a Waiting or Requirements room
 *
 * @param {string} type 'Waiting' or 'Requirements'
 * @param {object} settings The settings for the constructor of the room
 *
 * @return {RequirementsRoom|WaitingRoom} room The created room
 */
function createRoom(type, settings) {
    var room, conf;
    settings = settings || {};
    if ('object' !== typeof settings) {
        throw new TypeError('ServerChannel.create' + type + 'Room: settings ' +
                            'must be object or undefined.');
    }

    conf = {};
    conf.group = type + 'Room';
    conf.name = settings.name || type.toLowerCase();

    if (this.gameRooms[conf.name]) {
        throw new Error('ServerChannel.create' + type + 'Room: room name ' +
                        'already taken: ' + conf.name + '.');
    }

    conf.logicPath = settings.logicPath;

    delete settings.logicPath;
    delete settings.name;

    // Adding a reference to this channel.
    conf.channel = this;

    // Adding settings.
    conf.settings = settings;

    // Construct room (the players will be moved into it explicitly):
    if (type === 'Waiting') {
        room = new WaitingRoom(conf);
    }
    else {
        room = new RequirementsRoom(conf);
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
}


// Code to look for a room in case waitingRoom and requirementRoom are
// not poart of this.gameRooms
// if (!roomObj) {
//     if (this.waitingRoom && this.waitingRoom.name === room) {
//         roomObj = this.waitingRoom;
//     }
//     else if (this.requirementsRoom &&
//              this.requirementsRoom.name === room) {
//
//         roomObj = this.requirementsRoom;
//     }
//     else {
//         throw new Error('ServerChannel.destroyGameRoom: trying to ' +
//                         'destroy a unexisting room: ' + room + '.');
//     }
// }
