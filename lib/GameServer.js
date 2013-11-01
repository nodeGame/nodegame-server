/**
 * # GameServer
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Parses incoming messagages and emits correspondings events.
 *
 * Contains abstract methods that are instantiated by two classes
 * that inherits this class: `AdminServer`, and `PlayerServer`.
 * ---
 */

// ## Global scope

module.exports = GameServer;

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

util.inherits(GameServer, EventEmitter);

var Logger = require('./Logger');

var SocketManager = require('./SocketManager'),
    GameMsgGenerator = require('./GameMsgGenerator'),
    SocketIo = require('./sockets/SocketIo'),
    SocketDirect = require('./sockets/SocketDirect');

var ngc = require('nodegame-client');

var GameMsg = ngc.GameMsg,
    PlayerList = ngc.PlayerList,
    Player = ngc.Player,
    GameDB = ngc.GameDB;

/**
 * ## GameServer Constructor
 *
 * Creates a new instance of GameServer
 *
 * @param {object} options Configuration object
 */
function GameServer(options) {
    EventEmitter.call(this);
    this.setMaxListeners(0);

    this.channel = options.channel;
    this.session = options.channel.session;
    this.sio = options.channel.sio; 
    this.user_options = options.channel.options;
    this.endpoint = '/' + options.endpoint;
    this.name = options.name;
    this.serverid = '' + Math.random()*1000000000;

    this.registry = options.channel.registry;

    this.sysLogger = Logger.get('channel', {name: this.name});
    this.msgLogger = Logger.get('messages', {name: this.name});

    this.socket = new SocketManager(this);
    this.msg = new GameMsgGenerator(this);

    this.partner = null;
}

// ## METHODS

/**
 * ### GameServer.setPartner
 *
 * Sets a twin server, i.e. AdminServer for PlayerServer
 * and viceversa
 *
 * @param {object} server The partner server
 */
GameServer.prototype.setPartner = function(server) {
    this.partner = server;
};

/**
 * ### GameServer.listen
 *
 * Attaches standard and custom listeners to the server.
 *
 */
GameServer.prototype.listen = function() {
    var sio, direct, socket_count;
    socket_count = 0;
    
    if (this.user_options.sockets) {
        if (this.user_options.sockets.sio) {
            sio = new SocketIo(this);
            sio.attachListeners();
            this.socket.registerSocket(sio);
            socket_count++;
        }

        if (this.user_options.sockets.direct) {
            direct = new SocketDirect(this);
            this.socket.registerSocket(direct);
            socket_count++;
        }

    }
    if (!socket_count) {
        this.sysLogger.log('No open sockets', 'warn');
    }
    this.attachCustomListeners();
};

/**
 * ### GameServer.secureParse
 *
 * Verifies that an incoming message is valid
 *
 * First, tries to parse a string into a `GameMsg` object,
 * and then checks if the sender exists.
 *
 * Logs the outcome of the operation.
 *
 * @param {string} msgString A string to transform in `GameMSg`
 * @return {boolean|GameMsg} The parsed game message, or FALSE
 *   if the msg is invalid or from an unknown sender.
 */
GameServer.prototype.secureParse = function(msgString) {
    var gameMsg;
    try {
        gameMsg = GameMsg.clone(JSON.parse(msgString));
        this.msgLogger.log(gameMsg);
    } catch (e) {
        this.sysLogger.log('Malformed msg received: ' + e, 'error');
        return false;
    }
    // Checking if the FROM field is known.
    if (!this.channel.registry.clients.exist(gameMsg.from)) {
        this.sysLogger.log('GameServer.secureParse: Received msg from ' +
                           'unknown client: ' + gameMsg.from, 'error');
        return false;
    }
    return gameMsg;
};

GameServer.prototype.onMessage = function(msg) {
    msg = this.secureParse(msg);

    if (msg) { // Parsing Successful
        this.sysLogger.log(msg.toEvent() + ' ' + msg.from + '-> ' + msg.to);
        this.emit(msg.toEvent(), msg);
    }
};

/**
 * ## GameServer.onDisconnect
 *
 * Handles client disconnections
 *
 * This method is called by a Socket (Direct or SIO) when
 * it detects the client's disconnection
 *
 * @param {string} sid The socket id of the client
 * @param {Socket} socket The sockect object 
 */
GameServer.prototype.onDisconnect = function(sid, socket) {
    var client, roomName, room, res;

    client = this.registry.clients.sid.get(sid);
    if (!client) {
        throw new Error('GameServer.onDisconnect: client has invalid sid.');
    }

    // Remove client from its room:
    roomName = this.registry.getClientRoom(client.id);
    room = this.channel.gameRooms[roomName];
    if (!room) {
        throw new Error(
                'GameServer.onDisconnect: Could not determine room for ' +
                'disconnecting ' + (this.ADMIN_SERVER ? 'admin' : 'player') + 
                ': ' + client.id, 'error');
    }
    room.clients.remove(client.id);

    this.registry.markDisconnected(client.id);

    // Emit so that it can be handled different by Admin and Player Server.
    this.emit('disconnect', client, room);
};

/**
 * ## GameServer.onShutdown
 *
 * Callback when the server is shut down
 *
 * TODO: implement it
 */
GameServer.prototype.onShutdown = function() {
    this.sysLogger.log("Server is shutting down.");
    // TODO save state to disk
};

/**
 * ### GameServer.attachListeners
 *
 * Creates a Socket.io room and starts listening for
 * incoming messages.
 *
 * Valid messages are then converted to events and fired.
 *
 */
GameServer.prototype.attachListeners = function() {
    this.sysLogger.log('Listening for connections');
    this.socket.attachListeners();
};

/**
 * ### GameServer.attachCustomListeners
 *
 * Abstract method that will be overwritten by
 * inheriting classes.
 *
 */
GameServer.prototype.attachCustomListeners = function() {};



/**
 * ### GameServer.onConnect
 *
 * Send a HI msg to the client, and log its arrival
 *
 * @param {string} client The id of the freshly connected client
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {object} headers An object containing information about the connection
 * @param {string} startingRoom Optional.
 *   The name of the room in which the client is to be placed.
 *   Default: Waiting room
 *
 * @return {boolean} TRUE on success
 */
GameServer.prototype.onConnect = function(socketId, socketObj, headers, startingRoom) {
    var res, clientObj, clientId;

    var cookies, disconnected, returningRoom;
    
    var sys;
    sys = this.sysLogger;
 
    console.log(headers);
    console.log(headers ? typeof headers.cookie : 'no headers');
    
    if (headers && headers.cookie) {
        // Kudos to:
        // http://commandlinefanatic.com/cgi-bin/showarticle.cgi?article=art013
        cookies  = headers.cookie.split( ';' ).map( function( x ) { return x.trim().split( '=' ); } ).reduce( 
            function( a, b ) { a[ b[ 0 ] ] = b[ 1 ]; return a; }, {});
    }
    else {
        cookies = {};
    }

    clientObj = {
        sid: socketId,
        admin: this.ADMIN_SERVER
    }; 
    
    // TODO: place auth in the correct place;
    //if (this.authorizeClient(clientObj)) {
    //    this.sysLogger.log('Unauthorized connection ' + connectionId);
    //    return;
    //}

    // See if it is a reconnecting player.
    if (cookies.session === this.channel.session) {
        
        if (cookies.player) {
            disconnected = this.registry.getDisconnected();
            
            if (!disconnected[cookies.player]) {
                console.log('AAAH! Reconnecting player that did not disconnect.');
                // TODO: do something with it;
                return;
            }
            debugger
            console.log('Returning player');
            clientId = cookies.player;
            this.registry.markConnected(clientId);

            // Updates the socket id of the client in the registry, 
            // otherwise the welcomeClient will fail.
            this.registry.updateClient(clientId, { sid: socketId });
            
            returningRoom = this.registry.getClientRoom(clientId);

            if (!this.channel.gameRooms[returningRoom]) {
                sys.log('GameServer.onConnect: Room no longer existing for ' + 
                        're-connecting ' + 
                        (this.ADMIN_SERVER ? 'admin' : 'player' ) + ': ' + 
                        clientId, 'error');

                // TODO: handle the case;
                return;
            }
            
            clientObj.id = clientId;

            // Officially register the client in the socket manager.
            this.socket.registerClient(clientId, socketObj);

            // Player is probably still in the his last waitingRoom
            // Put the connecting client in the waiting room.
            // this.channel.placePlayer(clientObj, returningRoom);
            
            // Notify the client of its ID.
            this.welcomeClient(clientId, socketId);
            
            // Let each Admin and Player Server registering the new connection.
            this.emit('re-connecting', clientId, socketId);
        }
    }
    
    // New connection.
    else {

        clientId = this.registry.addClient(clientObj);

        if (!clientId) {
            // TODO: handle the case;
            return false;
        }

        // Officially register the client in the socket manager.
        this.socket.registerClient(clientId, socketObj);

        // Put the connecting client in the waiting room.
        startingRoom = startingRoom || this.channel.waitingRoom.name;
        this.channel.placePlayer(clientObj, startingRoom);

        // Notify the client of its ID.
        this.welcomeClient(clientId, socketId);

        // Let each Admin and Player Server registering the new connection.
        this.emit('connecting', clientId, socketId);
    }

    return true;
};


/**
 * ### GameServer.welcomeClient
 *
 * Send a HI msg to the client, and log its arrival
 *
 * @param {string} client The id of the freshly connected client
 */
GameServer.prototype.welcomeClient = function(clientId, socketId) {
    var connStr;
    connStr = "Welcome <" + clientId + ">";
    this.sysLogger.log(connStr);
    this.socket.send(this.msg.create({
        target: 'HI',
        to: clientId,
        data: {
            id: clientId,
            sid: socketId,
            admin: this.ADMIN_SERVER
        },
        text: connStr
    }));

};

/**
 * ### GameServer.isValidRecipient
 *
 * Checks whether a string is a valid recipient
 * for sending a game message
 *
 * @param {string} to The recipient to check
 * @return {Boolean} TRUE, if the string is a valid recipient
 */
GameServer.prototype.isValidRecipient = function(to) {
    return (to) ? true : false;
};


/**
 * ### GameServer.getPlayerList
 *
 * Returns the list of players currently connected
 *
 * @return {array} The player list object
 *
 * @see node.PlayerList
 */
GameServer.prototype.getPlayerList = function() {
    return this.pl.db;
};