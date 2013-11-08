/**
 * # ServerChannel
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Wrapper class for PlayerServer, AdminServer
 * ---
 */

// ## Global scope

module.exports = ServerChannel;

var AdminServer = require('./servers/AdminServer'),
PlayerServer = require('./servers/PlayerServer'),
GameServer = require('./GameServer');

var ChannelRegistry = require('./ChannelRegistry');

var Logger = require('./Logger');

var J = require('JSUS').JSUS;

var ngc = require('nodegame-client');

var PlayerList = ngc.PlayerList;
var GameRoom = require('./GameRoom');

/**
 * ## ServerChannel Constructor
 *
 * Creates an instance of ServerChannel
 *
 * @param {object} options Configuration object
 * @param {object} sio The socket.io server
 *
 */
function ServerChannel(sio, options) {

    // Unique session id, shared by both Player and Admin Server
    this.session = '' + Math.floor(Math.random()*10000000000000000);

    this.sio = sio;
    this.options = J.clone(options);

    this.name = options.name;

    this.registry = new ChannelRegistry();

    this.admin = null;
    this.player = null;

    this.sysLogger = Logger.get('channel', {name: this.name});

    this.waitingRoom = null;

    this.gameRooms = {};
    this.maxRooms = ('undefined' === typeof options.maxRooms) ? -1 : options.maxRooms;
    
    // Incremental index used when creating
    // game rooms with a default name
    this.autoRoomNo = 0;

    
    // Creating the AdminServer and PlayerServer
    this.createServers();
    
    // Below maybe to remove
    
    // Not used at the moment, maybe later
    // this.memory = {};

    // Maybe to remove
    // this.adminGames = {};

    // Not used, maybe to remove
    // this.subChannels = {};
    // this.maxSubChannels = ('undefined' === typeof options.maxSubChannels) ? -1 : options.maxSubChannels;
}

// ServerChannel methods

/**
 * ### ServerChannel.createServers
 *
 * Creates the AdminServer and the PlayerServer
 *
 * Mixes in default options and user-defined options specified in
 * the constructor
 *
 */
ServerChannel.prototype.createServers = function() {
    var adminOptions, playerOptions;

    adminOptions = {
        channel: this,
        name: '[ADMIN_SERVER]',
        endpoint: this.options.admin,
    };

    this.admin = new AdminServer(adminOptions);

    playerOptions = {
        channel: this,
        name: '[PLAYER_SERVER]',
        endpoint: this.options.player,
    };

    this.player = new PlayerServer(playerOptions);

    // The two servers are aware of each other
    this.admin.setPartner(this.player);
    this.player.setPartner(this.admin);
};

/**
 * ### ServerChannel.listen
 *
 * Puts the AdminServer and PlayerServer on listen mode
 *
 * @return {Boolean} TRUE, if execution is successful
 *
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
 * ### ServerChannel.require
 *
 * Creates a special require enviroment and returns the required object
 *
 * TODO doc
 */
ServerChannel.prototype.require = function(path, exports) {
    var channel = this;
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
        maxRoomsErr = 'Max number of game rooms for ' + this.name + ' reached: ' + this.maxRooms;
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
        } while (conf.name in this.gameRooms);
    }
    // Check for name availibility:
    else if (conf.name in this.gameRooms) {
        throw Error("ServerChannel.createGameRoom: Requested room name '" +
                    conf.name + "' already taken");
    }

    // Check for parent existence:
    if (conf.parentRoom && !(conf.parentRoom in this.gameRooms)) {
        throw Error("ServerChannel.createGameRoom: Nonexistent room '" +
                    conf.parentRoom + "' requested as parent");
    }
    
    if ('undefined' !== typeof conf.channel) {
        this.sysLogger.log("ServerChannel.createGameRoom: channel parameter ignored", 'warn');
    }

    // Adding a reference to this channel.
    conf.channel = this;

    // Construct room (the players will be moved into it explicitly):
    delete conf.clients;
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
        //if (!clients.id) debugger
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
        this.sysLogger.log("Waiting Room for channel '" + this.name + "' already existing.", 'error');
        return false;
    }
    
    if ('undefined' !== typeof conf.channel) {
        this.sysLogger.log("ServerChannel.createWaitingRoom: parameter 'channel' ignored", 'warn');
    }

    if ('undefined' !== typeof conf.name) {
        this.sysLogger.log("ServerChannel.createWaitingRoom: parameter 'name' ignored", 'warn');
    }

    conf.group = "waitingRoom";
    conf.name = "waitingRoom";

    // Adding a reference to this channel.
    conf.channel = this;

    // Construct room (the players will be moved into it explicitly):
    wRoom = new GameRoom(conf);

    // Register room:
    this.waitingRoom = this.gameRooms[conf.name] = wRoom;

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
 * The `options` parameter can contain any of the following fields:
 *  - substituteRoomName (string): Name of the room to move the players to.
 *      If unspecified, the room is deleted only if there are no players in it
 *      or if the `ignorePlayers` flag is true.
 *  - ignoreRunningGame (boolean): Delete the room even if the contained game
 *      hasn't finished. Default: FALSE.
 *  - ignorePlayers (boolean): Delete the room even if there are players inside
 *      of it. Players will be moved to the parent room or the waiting room if
 *      there is no parent. Default: FALSE.
 *
 * @param {string} roomName Name of the room to destroy
 * @param {object} options Optional. Additional parameters.
 *  - substituteRoomName Optional. Name of the room to move
 *   the players to. If null, then the room will not be deleted if it has players.
 *   Default: null
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
        if (roomObj.childRooms.hasOwnProperty(i) && childName in this.gameRooms) {
            // Tell child:
            this.gameRooms[childName].parentRoom = parentRoom;

            // Tell parent:
            if (parentRoom) {
                this.gameRooms[parentRoom].childRooms.push(childName);
            }
        }
    }

    delete this.gameRooms[roomName];

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
        target: 'PCONNECT',
        to:     'ALL',
        data:   playerObj
    });

    pDisconnectMsg = this.player.msg.create({
        target: 'PDISCONNECT',
        to:     'ALL',
        data:   playerObj
    });

    if (this.player.notify.onConnect) {
        // Notify all the  players that a new one just connected
        this.player.socket.broadcast2room(pConnectMsg, toRoomObj, playerId);

        // Send the list of connected players to the new player
        this.player.socket.send(this.player.msg.create({
            target: 'SETUP',
            to:     playerId,
            text:   'plist',
            reliable:500,
            data:   J.stringify([oldPlayerList.db, 'replace'])
        }));

        // "Disconnect" moving player from old room
        this.player.socket.broadcast2room(pDisconnectMsg, this.gameRooms[fromRoom], playerId);
    }
    else {
        this.player.socket.send2roomAdmins(pConnectMsg, toRoomObj);
        this.player.socket.send2roomAdmins(pDisconnectMsg, toRoomObj);
    }
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
 * first room.
 *
 * @param {object|Player} playerObj An object representing a player
 * @param {string} inRoom New room ID (must exist)
 */
ServerChannel.prototype.placePlayer = function(playerObj, inRoom) {
    var playerId, fromRoomName, roomObj;

    playerId = playerObj.id;
    fromRoomName = this.registry.getClientRoom(playerId);

    // Player must not be found already in any room.
    if (fromRoomName && this.gameRooms[fromRoomName].clients.exist(playerId)) {
        throw new Error('ServerChannel.placePlayer: ' +
                        'Player already in room: "' + fromRoomName + '"');
    }

    roomObj = this.gameRooms[inRoom];

    if (!roomObj) {
        throw new Error('ServerChannel.placePlayer: ' +
                        'Unknown room "' + inRoom + '" given as inRoom');
    }

    // Add player to room:
    roomObj.clients.add(playerObj);

    // Update ChannelRegistry:
    this.registry.moveClient(playerId, inRoom);
};



// The following is experimental and not tested. Maybe to be removed

ServerChannel.prototype.createSubChannel = function(options) {

    if (this.maxSubChannels !== -1 && J.size(this.subChannels) >= this.maxSubChannels) {
        var maxSubChannelsErr = 'Max number of subchannel for ' + this.name + ' reached: ' + this.maxSubChannels;
        maxSubChannelsErr += ' . Cannot create another subchannel.';
        this.sysLogger.log(maxSubChannelsErr, 'error');
        return false;
    }

    options = options || {};

    var name = J.uniqueKey(this.subChannels, options.name);

    options.name = name;
    options.admin = options.admin || options.name + '/admin';
    options.player = options.player || options.name + '/player';

    this.subChannels[name] = new ServerChannel(this.sio, options);
    return this.subChannels[name];
};

ServerChannel.prototype.destroySubChannel = function (name, options) {
    if (!name) return;

    if (!this.subChannels[name]) {
        var destroyChannelErr = 'Unexisting subchannel in channel ' + this.name + '. Cannot destroy: ' + name;
        this.sysLogger.log(destroyChannelErr, 'error');
        return false;
    }

    options = options || {};
    // TODO: how to propertly delete a subchannel? redirect, notify players?
    delete this.subChannels[name];
    return true;
};



/**
 * ### ServerChannel.startGame
 *
 * Initializes and start a new game logic on the admin server
 *
 * @param pathToGame {string} The path to the game logic
 * @param options {object} Optional. A configuration object to pass to node.setup
 *
 * @see node.Game
 * @see node.setup
 */
ServerChannel.prototype.startGame = function(pathToGame, options) {
    var node;
    var errString, typeofPathToGame;
    var duplicateCounter, game, gamename; // logicname;
    if (!pathToGame) {
        errString = 'Cannot start an undefined game.';
        this.sysLogger.log(errString, 'error');
        return false;
    }
    typeofPathToGame = typeof pathToGame;
    if ('string' !== typeofPathToGame) {
        errString = 'ServerChannel.startGame requires a string containing the path to the game as first parameter';
        errString += '. Found: ' + typeofPathToGame;
        this.sysLogger.log(errString, 'error');
        return false;
    }

    if (!J.existsSync(pathToGame)) {
        errString = pathToGame + ' does not exist or is it not readable.';
        this.sysLogger.log(errString, 'error');
        return false;
    }

    options = options || {};

    node = ngc.getClient(); 
    duplicateCounter = 1;

    // try {
    node.setup('nodegame', options);
    node.socket.setSocketType('SocketDirect', {
        socket: this.admin.socket.sockets.direct
    });
    node.connect(); // the client got an ID

    game = require(pathToGame)(node, this);

    // TODO: find a nice way of creating player + id for logic games 
    //logicname = game.player || 'GSC-' + Math.floor(Math.random() * 10000000000);
    //node.setup('player', {
    //   id: logicname,
    //    sid: logicname
    //});

    node.setup('plot', game.plot);
    node.setup('game_metadata', game.game_metadata);
    node.setup('game_settings', game.game_settings);
    node.setup('plist', game.plist);

    
    node.game.start();

    gamename = J.uniqueKey(this.adminGames, options.name || game.game_metadata.name);

    this.adminGames[gamename] = node;

    return node;
    //  }
    //  catch(e) {
    //      errString = 'A fatal error has occurred while starting a game on channel: ' + this.name;
    //      errString += '. The following exception was raised: ' + e;
    //      this.sysLogger.log(errString, 'error');
    //      return false;
    //  }
};

