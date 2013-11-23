/**
 * # GameServer
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

    /**
     * ## GameServer.channel
     *
     * Reference to the _ServerChannel_ in which the game server is created 
     *
     * @see ServerChannel
     */
    this.channel = options.channel;

    /**
     * ## GameServer.servernode
     *
     * Reference to the _ServerNode_
     *
     * @see ServerNode
     */
    this.servernode = this.channel.servernode;

    /**
     * ## GameServer.registry
     *
     * Reference to _ChannelRegistry_ inside the server channel
     *
     * @see GameServer.channel
     * @see ChannelRegistry
     */
    this.registry = options.channel.registry;

    /**
     * ## GameServer.session
     *
     * The session ID as created by the channel.
     */
    this.session = options.channel.session;

    /**
     * ## GameServer.endpoint
     *
     * The endpoint under which the server is reachable 
     */
    this.endpoint = '/' + options.endpoint;

    /**
     * ## GameServer.name
     *
     * The name of the server  
     */
    this.name = options.name;

    /**
     * ## GameServer.serverid
     *
     * A random id for the server
     */
    this.serverid = '' + Math.random()*1000000000;

    /**
     * ## GameServer.sysLogger
     *
     * Logger of system events 
     */
    this.sysLogger = Logger.get('channel', {name: this.name});

    /**
     * ## GameServer.msgLogger
     *
     * Logger of incoming / outgoing game messages 
     *
     */
    this.msgLogger = Logger.get('messages', {name: this.name});

    /**
     * ## GameServer.socket
     *
     * Socket manager for the server 
     *
     * @see SocketManager
     */
    this.socket = new SocketManager(this);

    /**
     * ## GameServer.msg
     *
     * Game message generator
     *
     * @see GameMsgGenerator
     */
    this.msg = new GameMsgGenerator(this);

    /**
     * ## GameServer.user_options
     *
     * Reference to the user options defined in the server channel 
     */
    this.user_options = options.channel.options;

    /**
     * ## GameServer.partner
     *
     * The partner game server (Admin or Player) 
     *
     * @see AdminServer
     * @see PlayerServer
     */
    this.partner = null;

    /**
     * ## GameServer.sio
     *
     * Reference to the Socket.io App in the ServerNode 
     *
     * @see ServerNode
     * @see ServerChannel
     */
    this.sio = options.channel.sio;

    /**
     * ## GameServer.authCb
     *
     * An authorization callback
     */
    this.authCb = null;

    /**
     * ## GameServer.accessDeniedUrl
     *
     * The url of the page to which unauthorized clients will be redirected
     */
    this.accessDeniedUrl = options.accessDeniedUrl;

    /**
     * ## GameServer.generateClientId
     *
     * Client IDs generator callback.
     */
    this.generateClientId = null;

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
 * Attaches standard, and custom listeners to player and admin servers.
 */
GameServer.prototype.listen = function() {
    var sio, direct, socket_count;
    socket_count = 0;
    
    if (this.user_options.sockets) {
        // Open Socket.IO
        if (this.user_options.sockets.sio) {
            sio = new SocketIo(this);
            sio.attachListeners();
            this.socket.registerSocket(sio);
            socket_count++;
        }
        // Open Socket Direct
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
 * Performs the following operations:
 *
 * - tries to parse a string into a `GameMsg` object,
 * - verifies that _to_,  _from_, _action_, and _target_ are non-empty strings,
 * - checks if the sender exists.
 *
 * Logs the outcome of the operation.
 *
 * @param {string} msgString A string to transform in `GameMSg`
 * @return {boolean|GameMsg} The parsed game message, or FALSE
 *   if the msg is invalid or from an unknown sender.
 */
GameServer.prototype.secureParse = function(msgString) {
    var gameMsg, server;

    server = this.ADMIN_SERVER ? 'Admin' : 'Player';

    try {
        gameMsg = GameMsg.clone(JSON.parse(msgString));
        this.msgLogger.log(gameMsg);
    } 
    catch(e) {
        this.sysLogger.log(server + 'Server.secureParse: malformed msg ' +
                           'received: ' + e, 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.from) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.from is not string.', 'error');
        return false;
    }

    if (gameMsg.from === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.from is empty.', 'error');
        return false;
    }
    
    if ('string' !== typeof gameMsg.to) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.to is not string.', 'error');
        return false;
    }
    
    if (gameMsg.to === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.to is empty.', 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.target) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.target is not string.', 'error');
        return false;
    }
    
    if (gameMsg.target === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.target is empty.', 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.action) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.action is not string.', 'error');
        return false;
    }
    
    if (gameMsg.action === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.action is empty.', 'error');
        return false;
    }

    // Checking if the FROM field is known.
    if (!this.channel.registry.clients.exist(gameMsg.from)) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg from ' +
                           'unknown client: ' + gameMsg.from, 'error');
        return false;
    }

    // TODO: check the .to field to (SERVER,ALL,ROOM should be valid too)

    return gameMsg;
};

/**
 * ## GameServer.onMessage
 *
 * Parses an incoming string into a GameMsg, and emits it as an event.
 *
 * This method must be called by a socket to notify an incoming message.
 *
 * @param {string} msg The string representing a game message.
 */
GameServer.prototype.onMessage = function(msg) {
    msg = this.secureParse(msg);

    if (msg) { 
        // Parsing Successful.
        this.sysLogger.log(msg.toEvent() + ' ' + msg.from + '-> ' + msg.to);
        this.emit(msg.toEvent(), msg);
    }
};

/**
 * ## GameServer.onDisconnect
 *
 * Handles client disconnections
 *
 * This method is called by a socket (Direct or SIO) when
 * it detects the client's disconnection.
 *
 * @param {string} sid The socket id of the client
 * @param {Socket} socket The sockect object
 *
 * @emit disconnect
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
 * Abstract method that will be overwritten by inheriting classes
 */
GameServer.prototype.attachCustomListeners = function() {};

/**
 * ### GameServer.onConnect
 *
 * Send a HI msg to the client, and log its arrival
 *
 * This method is called by a socket upon receiving a new connection.
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
GameServer.prototype.onConnect = function(
    socketId, socketObj, headers, startingRoom) {
    
    var res, clientObj, clientId;
    var cookies, disconnected, returningRoom;
    var newConnection, invalidSessionCookie;
    var sys;

    sys = this.sysLogger;
    newConnection = true;
    invalidSessionCookie = false;

    // This method could be split up in sub-methods, but a series of if/else
    // is still the most efficient implementation. In case the code increases
    // more inside the method, dividing in sub-methods could be a good idea.

    if (headers && headers.cookie) {
        // Kudos to:
        // http://commandlinefanatic.com/cgi-bin/showarticle.cgi?article=art013
        cookies = headers.cookie.split(';')
            .map(
                function(x) { 
                    return x.trim().split('=');
                })
            .reduce( 
                function(a,b) {
                    a[ b[ 0 ] ] = b[ 1 ]; 
                    return a;
                }, {});
    }
    else {
        cookies = {};
    }
    debugger
    // Authorization check, if an authorization function is defined.
    if (this.authCb) {
        if (!this.authCb(headers, cookies, startingRoom)) {
            // Warns and disconnect client if auth failed.
            this.disposeUnauthorizedClient(socketId, socketObj);
            return false;
        }
    }

    clientObj = {
        sid: socketId,
        admin: this.ADMIN_SERVER || false
    }; 

    // Performs the following checks:
    // 1- cookie.player found,
    // 2- id was previously marked as disconnected,
    // 3- old room is still existing.
    if (cookies.session === this.channel.session) {
        if (cookies.player) {
            clientId = cookies.player;
            disconnected = this.registry.getDisconnected();
            
            // 2- id was previously marked as disconnected.
            if (!disconnected[cookies.player]) {
                sys.log('GameServer.onConnect: Reconnecting ' + 
                        (this.ADMIN_SERVER ? 'admin' : 'player' ) + ' that ' +
                        'was not marked as disconnected: ' + clientId, 'error');

                // The client will be treated as a new connection, but a
                // warning will be sent.
                invalidSessionCookie = true;
            }
            else {
                this.registry.markConnected(clientId);

                // Updates the socket id of the client in the registry, 
                // otherwise the welcomeClient will fail.
                this.registry.updateClient(clientId, { sid: socketId });
                
                returningRoom = this.registry.getClientRoom(clientId);

                // 3- old room is still existing.
                if (!this.channel.gameRooms[returningRoom]) {
                    sys.log('GameServer.onConnect: Room no longer existing ' + 
                            'for re-connecting ' + 
                            (this.ADMIN_SERVER ? 'admin' : 'player' ) + ': ' + 
                            clientId, 'error');

                    this.socket.send(this.msg.create({
                        target: ngc.constants.target.ALERT,
                        to: clientId,
                        text: 'The game room you are looking for is not ' +
                            'existing any more. You will be redirected to ' +
                            'main waiting room.'
                    }));
                    
                }

                // All checks passed. Approved reconnection.
                else {
            
                    clientObj.id = clientId;

                    // Officially register the client in the socket manager.
                    this.socket.registerClient(clientId, socketObj);
                    
                    // TODO: is fine to place a reconnecting player here?
                    this.channel.placePlayer(clientObj, returningRoom);

                    // Notify the client of its ID.
                    this.welcomeClient(clientId, socketId);
                    
                    // Let Admin and Player Server handle the new connection.
                    this.emit('re-connecting', clientId, socketId);
                    
                    // Block the execution in the method.
                    newConnection = false; 
                }
            }
        }
    }
    
    // New connection.
    if (newConnection) {        
        // A new ID can be generated automatically, or through a custom cb.
        if (this.generateClientId) {
            clientId = this.generateClientId(headers, cookies, 
                                             !invalidSessionCookie,
                                             this.registry.getClients(), {
                                                 headers: headers,
                                                 socketObj: socketObj,
                                                 socketId: socketId,
                                                 room: startingRoom
                                             });
        }
        else {
            clientId = this.registry.generateClientId();
        }

        // If clientId is not string (for a failure or because the custom
        // id generator function did no accept the connection) the connection
        // is disposed, exactly as it was not authorized.
        if ('string' !== typeof clientId) {
            sys.log('GameServer.onConnect: registry.addClient did not return a ' + 
                    'valid id for incoming ' + 
                    (this.ADMIN_SERVER ? 'admin' : 'player' ), 'error');

             // Warns and disconnect client if auth failed.
            this.disposeUnauthorizedClient(socketId, socketObj);
            return false;
        }

        // Adds the client to the registry.
        this.registry.addClient(clientId, clientObj);
            
        // Officially register the client in the socket manager.
        this.socket.registerClient(clientId, socketObj);

        // Put the connecting client in the waiting room or the startingRoom.
        startingRoom = startingRoom || this.channel.waitingRoom.name;
        this.channel.placePlayer(clientObj, startingRoom);

        // Notify the client of its ID.
        this.welcomeClient(clientId, socketId);
        
        // TODO: in some cases it could be allowed. And in any case
        // The authorization function could handle it better.
        // This is probably a duplicated connection. Not allowed for the moment.
        if (invalidSessionCookie) {       
            this.socket.send(this.msg.create({
                target: ngc.constants.target.ALERT,
                to: clientId,
                text: 'An invalid session cookie has been found. ' +
                    'This will be considered as a new connection.'
            }));
        }

        // Let each Admin and Player Server registering the new connection.
        this.emit('connecting', clientId, socketId);
    }

    return true;
};


/**
 * ### GameServer.welcomeClient
 *
 * Sends a HI msg to the client, and logs its arrival
 *
 * @param {string} clientId The id of the connecting client
 * @param {string} socketId The socket id of the connecting client
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
 * ### GameServer.disposeUnauthorizedClient
 *
 * Sends a sequence of HI, REDIRECT messages
 *
 * Cannot send ALERT because it gets destroyed by the REDIRECT.
 *
 * @param {string} socketObj The socket id of the connection
 * @param {string} socketObj The socket (IO, Direct) object
 */
GameServer.prototype.disposeUnauthorizedClient = function(socketId, socketObj) {
    var to;
    to = 'unauthorized_client';

    connStr = "Unauthorized client. Socket id: <" + socketId + ">";
    this.sysLogger.log(connStr, 'warn');
                 
    // We need to send an HI message in any case because otherwise
    // the client will discard the messages.
    socketObj.send(this.msg.create({
        target: ngc.constants.target.HI,
        to: 'unauthorized_client',
        data: {
            id: to,
            sid: socketId
        }
    }), socketId);

    // Redirects the client.
    socketObj.send(this.msg.create({
        target: ngc.constants.target.REDIRECT,
        to: to,
        data: this.getAccessDeniedUrl()
    }), socketId);
};

/**
 * ### GameServer.authorization
 *
 * Specifies an authorization function that will called on every new connection
 *
 * The callback receives three parameters:
 *  - the array of headers, 
 *  - an object literals with the cookies sent by the client, 
 *  - the name of therequested room (if specified).
 *
 * @param {function} cb The authorization callback function
 */
GameServer.prototype.authorization = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.authorization: cb must be function.');
    }
    this.authCb = cb;
};

/**
 * ### GameServer.clientIdGenerator
 *
 * Set the function for assigning new client IDs upon new connections.
 *
 * The callback receives three parameters:
 *  - the array of headers, 
 *  - an object literal with the cookies sent by the client,
 *  - an object mapping all existing client ids,
 *  - an object literal with more information
 *
 * @param {function} cb The authorization callback function
 */
GameServer.prototype.clientIdGenerator = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.clientIdGenerator: cb must be ' +
                            'function.');
    }
    this.generateClientId = cb;
};

/**
 * ### GameServer.getAccessDenisedUrl
 *
 * Returns the url for unauthorized access to the server.
 */
GameServer.prototype.getAccessDeniedUrl = function() {
    return this.accessDeniedUrl;
};
