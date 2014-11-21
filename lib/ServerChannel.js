/**
 * # ServerChannel
 * Copyright(c) 2014 Stefano Balietti
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

// ## Global scope

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
    this.admin = null;

    /**
     * ### ServerChannel.player
     *
     * The player server
     *
     * @see GameServer
     * @see PlayerServer
     */
    this.player = null;

    /**
     * ### ServerChannel.waitingRoom
     *
     * The default game room for the channel.
     *
     * @see ServerChannel.createWaitingRoom
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
     * node instances of bots inside the channel
     */
    this.bots = {};

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
    this.admin = new AdminServer(options.admin, this);
    this.player = new PlayerServer(options.player, this);

    // The two servers are aware of each other.
    this.admin.setPartner(this.player);
    this.player.setPartner(this.admin);
};

/**
 * ### ServerChannel.listen
 *
 * Puts the AdminServer and PlayerServer on listen mode
 *
 * @return {Boolean} TRUE, if both servers are turned on successfully
 */
ServerChannel.prototype.listen = function() {
    try {
        this.admin.listen();
        this.player.listen();
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
    return newRoom;
};

/**
 * ### ServerChannel.createWaitingRoom
 *
 * @param {object} conf Config object, acceptable by GameRoom constructor
 *
 * @return {GameRoom} The waiting room
 *
 * @see GameRoom
 */
ServerChannel.prototype.createWaitingRoom = function(conf) {
    var wRoom;
    conf = conf || {};

    if (this.waitingRoom) {
        this.sysLogger.log("Waiting Room for channel '" + this.name +
                           "' already existing.", 'error');
        return false;
    }

    if ('undefined' !== typeof conf.channel) {
        this.sysLogger.log("ServerChannel.createWaitingRoom: parameter " +
                           "'channel' ignored", 'warn');
    }

    if ('undefined' !== typeof conf.name) {
        this.sysLogger.log("ServerChannel.createWaitingRoom: parameter " +
                           "'name' ignored", 'warn');
    }

    conf.group = conf.group || "waitingRoom";
    conf.name = conf.name || "waitingRoom";

    // Adding a reference to this channel.
    conf.channel = this;

    // Construct room (the players will be moved into it explicitly):
    wRoom = new WaitingRoom(conf);

    // Register room:
    this.waitingRoom = this.gameRooms[conf.name] = wRoom;

    wRoom.setupGame();
    wRoom.startGame();

    return wRoom;
};


/**
 * ### ServerChannel.destroyGameRoom
 *
 * Destroys a GameRoom
 *
 * The child-rooms of the destroyed room are reparented to the destroyed room's
 * parent.
 * The room is only destroyed if it's empty or if a valid substitute room is
 * given to move the players to.
 *
 * @param {string} roomName Name of the room to destroy
 * @param {object} options Optional. Additional parameters.
 *
 *   - substituteRoomName (string):
 *     Optional. Name of the room to move the players to.
 *     If null, then the room will not be deleted if it has players unless
 *     `ignorePlayers` is true. Default: null
 *   - ignoreRunningGame (boolean):
 *     Optional. Delete the room even if the contained game hasn't finished.
 *     Default: FALSE
 *   - ignorePlayers (boolean):
 *     Optional. Delete the room even if there are players inside of it.
 *     Players will be moved to the parent room or the waiting room if there is
 *     no parent. Default: FALSE
 *
 * @return {boolean} Whether the room was destroyed successfully
 *
 * @see GameRoom
 */
ServerChannel.prototype.destroyGameRoom = function(roomName, options) {
    var i;
    var roomObj;
    var clientObjs;
    var parentRoom;
    var childName;
    var substituteRoomName, ignoreRunningGame, ignorePlayers;
    var socket;

    // Get parameters:
    options = options || {};
    substituteRoomName = options.substituteRoomName || null;
    ignoreRunningGame = !!options.ignoreRunningGame;
    ignorePlayers = !!options.ignorePlayers;

    if (!(roomName in this.gameRooms)) {
        return false;
    }

    roomObj = this.gameRooms[roomName];

    // Check whether the game in the room is still running:
    // TODO: test this
    if (!ignoreRunningGame &&
            roomObj.node.game.getStateLevel() <
            ngc.constants.stateLevels.GAMEOVER) {
        return false;
    }

    // Find out where to move the remaining players:
    clientObjs = roomObj.clients.id.getAllKeyElements();
    // TODO: Check whether there are any _players_ (non-admins) left
    if (!J.isEmpty(clientObjs)) {
        if (substituteRoomName) {
            if (!(substituteRoomName in this.gameRooms)) {
                return false;
            }
        }
        else if (ignorePlayers) {
            // Move players to parent or waiting room:
            if (roomObj.parentRoom in this.gameRooms) {
                substituteRoomName = roomObj.parentRoom;
            }
            else if (this.waitingRoom) {
                substituteRoomName = this.waitingRoom.name;
            }
            else {
                throw new Error('ServerChannel.destroyGameRoom: trying to ' +
                        'destroy a room with players but without parent or ' +
                        'waiting room.');
            }
        }
        else {
            return false;
        }

        // Move players into substitute room and remove admins:
        for (i in clientObjs) {
            if (clientObjs.hasOwnProperty(i)) {
                if (clientObjs[i].admin) {
                    // Move player:
                    this.movePlayer(i, substituteRoomName);
                }
                else {
                    // Disconnect admin:
                    // TODO: test this
                    socket = this.admin.socket.clients[i];
                    socket.disconnect(clientObjs[i].sid);
                }
            }
        }
    }

    // Remove from parent's list of children:
    parentRoom = roomObj.parentRoom;
    if (parentRoom && parentRoom in this.gameRooms) {
        J.removeElement(roomName, this.gameRooms[parentRoom].children);
    }
    else {
        parentRoom = null;
    }

    // Give orphan rooms to their grandparent:
    for (i in roomObj.childRooms) {
        childName = roomObj.childRooms[i];
        if (roomObj.childRooms.hasOwnProperty(i) &&
            childName in this.gameRooms) {
            // Tell child:
            this.gameRooms[childName].parentRoom = parentRoom;

            // Tell parent:
            if (parentRoom) {
                this.gameRooms[parentRoom].childRooms.push(childName);
            }
        }
    }

    // Remove room references.
    delete this.gameRooms[roomName];
    delete this.servernode.rooms[roomName];

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
 * @param {string} playerId Player ID or game alias
 * @param {string} toRoom New room ID (must exist)
 */
ServerChannel.prototype.movePlayer = function(playerId, toRoom) {
    var fromRoom;
    var playerObj;
    var toRoomObj;
    var oldPlayerList;
    var pConnectMsg, pDisconnectMsg;
    var filteredPlayers;

    playerId = this.registry.lookupClient(playerId);

    fromRoom = this.registry.getClientRoom(playerId);

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

    // Add player to new room:
    oldPlayerList = toRoomObj.clients.player.breed();
    toRoomObj.clients.add(playerObj);

    // Update ChannelRegistry:
    this.registry.moveClient(playerId, toRoom);

    // Send updated PLISTs to all involved players.
    // It is important that the following code executes _after_ the player has
    // been registered in the new room.

    pConnectMsg = this.player.msg.create({
        target: 'PCONNECT'
    });

    pDisconnectMsg = this.player.msg.create({
        target: 'PDISCONNECT'
    });

    if (this.player.notify.onConnect) {
        // Notify all the  players that a new one just connected
        pConnectMsg.data = {id: playerObj.id};
        this.player.socket.broadcast2room(pConnectMsg, toRoomObj, playerId);

        // Send the list of connected players to the new player
        filteredPlayers = oldPlayerList.fetchSubObj('id');
        this.player.socket.send(this.player.msg.create({
            target: 'SETUP',
            to:     playerId,
            text:   'plist',
            reliable:500,
            data:   J.stringify([filteredPlayers, 'replace'])
        }));

        // "Disconnect" moving player from old room
        pDisconnectMsg.data = {id: playerObj.id};
        this.player.socket.broadcast2room(pDisconnectMsg,
                                          this.gameRooms[fromRoom], playerId);
    }
    else {
        pConnectMsg.data = playerObj;
        this.player.socket.send2roomAdmins(pConnectMsg, toRoomObj);
        pDisconnectMsg.data = playerObj;
        this.player.socket.send2roomAdmins(pDisconnectMsg, toRoomObj);
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
 * @param {object|Player} playerObj An object representing a player
 * @param {string} inRoom New room ID (must exist)
 *
 * @return {boolean} Whether the placement was valid and performed
 */
ServerChannel.prototype.placePlayer = function(playerObj, inRoom) {
    var playerId, fromRoomName, roomObj, sameRoom;
    var e;

    roomObj = this.gameRooms[inRoom];

    if (!roomObj) {
        e = 'ServerChannel.placePlayer: ' +
            'room not found: "' + inRoom + '".';
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
        socket: this.player.socket.sockets.direct
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
       Optional. Port to connect to. Default: this.servernode.port
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
    var port, gameName, filePath, queryString, phantomjsArgs;
    var serverdir;
    var url;
    var phantomjs;
    var logger;

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

    // Spawn the process, listen on its stdout.
    phantomjs = spawn(serverdir + '/node_modules/phantomjs/bin/phantomjs',
        phantomjsArgs);
    phantomjs.stdout.setEncoding('utf8');
    logger = Logger.get('clients', {name: 'phantomjs'});
    phantomjs.stdout.on('data', function(text) {
        logger.log(text);
    });

    return phantomjs;
};



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
