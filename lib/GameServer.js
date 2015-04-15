/**
 * # GameServer
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Parses incoming messagages and emits correspondings events
 *
 * Contains abstract methods that are instantiated by two classes
 * that inherits this class: `AdminServer`, and `PlayerServer`.
 */

"use strict";

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
 * ### GameServer.codes
 *
 * Success and error numerical codes. For internal use only.
 */
GameServer.codes = {
    OPERATION_OK: 0,
    DUPLICATED_CLIENT_ID: -1,
    ROOM_NOT_FOUND: -2,
    INVALID_CLIENT_ID: -3
};

/**
 * ## GameServer constructor
 *
 * Creates a new instance of GameServer
 *
 * @param {object} options Configuration object
 */
function GameServer(options, channel) {
    EventEmitter.call(this);
    this.setMaxListeners(0);

    /**
     * ### GameServer.options
     *
     * Reference to the user options defined in the server channel
     */
    this.options = options;

    /**
     * ### GameServer.channel
     *
     * Reference to the _ServerChannel_ in which the game server is created
     *
     * @see ServerChannel
     */
    this.channel = channel;

    /**
     * ### GameServer.servernode
     *
     * Reference to the _ServerNode_
     *
     * @see ServerNode
     */
    this.servernode = this.channel.servernode;

    /**
     * ### GameServer.registry
     *
     * Reference to _ChannelRegistry_ inside the server channel
     *
     * @see GameServer.channel
     * @see ChannelRegistry
     */
    this.registry = channel.registry;

    /**
     * ### GameServer.session
     *
     * The session ID as created by the channel.
     */
    this.session = channel.session;

    /**
     * ### GameServer.endpoint
     *
     * The endpoint under which the server is reachable
     */
    this.endpoint = '/' + options.endpoint;

    /**
     * ### GameServer.name
     *
     * The name of the server
     */
    this.name = options.name;

    /**
     * ### GameServer.serverid
     *
     * A random id for the server
     */
    this.serverid = '' + Math.random()*1000000000;

    /**
     * ### GameServer.sysLogger
     *
     * Logger of system events
     */
    this.sysLogger = Logger.get('channel', {name: this.name});

    /**
     * ### GameServer.msgLogger
     *
     * Logger of incoming / outgoing game messages
     */
    this.msgLogger = Logger.get('messages', {name: this.name});

    /**
     * ### GameServer.socket
     *
     * Socket manager for the server
     *
     * @see SocketManager
     */
    this.socketManager = new SocketManager(this);

    /**
     * ### GameServer.msg
     *
     * Game message generator
     *
     * @see GameMsgGenerator
     */
    this.msg = new GameMsgGenerator(this);

    /**
     * ### GameServer.partner
     *
     * The partner game server (Admin or Player)
     *
     * @see AdminServer
     * @see PlayerServer
     */
    this.partner = null;

    /**
     * ### GameServer.sio
     *
     * Reference to the Socket.io App in the ServerNode
     *
     * @see ServerNode
     * @see ServerChannel
     */
    this.sio = channel.sio;

    /**
     * ### GameServer.authCb
     *
     * An authorization callback
     */
    this.authCb = null;

    /**
     * ### GameServer.accessDeniedUrl
     *
     * The url of the page to which unauthorized clients will be redirected
     */
    this.accessDeniedUrl = options.accessDeniedUrl;

    /**
     * ### GameServer.generateClientId
     *
     * Client IDs generator callback.
     */
    this.generateClientId = null;


    /**
     * ### GameServer.enableReconnections
     *
     * If TRUE, clients will be matched with previous game history based on
     * the clientId found in their cookies.
     */
    this.enableReconnections = !!options.enableReconnections;

}

// ## GameServer methods

/**
 * ### GameServer.setPartner
 *
 * Sets a twin server, i.e. AdminServer for PlayerServer and viceversa
 *
 * @param {object} server The partner server
 */
GameServer.prototype.setPartner = function(server) {
    this.partner = server;
};

/**
 * ### GameServer.listen
 *
 * Attaches standard, and custom listeners
 */
GameServer.prototype.listen = function() {
    var sio, direct, socket_count;
    socket_count = 0;

    if (this.options.sockets) {
        // Open Socket.IO
        if (this.options.sockets.sio) {
            sio = new SocketIo(this);
            sio.attachListeners();
            this.socketManager.registerSocket(sio);
            socket_count++;
        }
        // Open Socket Direct
        if (this.options.sockets.direct) {
            direct = new SocketDirect(this);
            this.socketManager.registerSocket(direct);
            socket_count++;
        }

    }
    if (!socket_count) {
        this.sysLogger.log('No open sockets', 'warn');
    }
    this.attachListeners();
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
 * - verifies that _from_, _action_, and _target_ are non-empty strings,
 * - checks if the sender exists.
 *
 * Logs the outcome of the operation.
 *
 * _to_ and _from_ are validated separately.
 *
 * @param {string} msgString A string to transform in `GameMSg`
 * @return {boolean|GameMsg} The parsed game message, or FALSE
 *   if the msg is invalid or from an unknown sender.
 *
 * @see GameServer.validateRecipient
 * @see GameServer.validateSender
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

    if (gameMsg.from.trim() === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.from is empty.', 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.target) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.target is not string.', 'error');
        return false;
    }

    if (gameMsg.target.trim() === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.target is empty.', 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.action) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.action is not string.', 'error');
        return false;
    }

    if (gameMsg.action.trim() === '') {
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

    return gameMsg;
};

/**
 * ### GameServer.onMessage
 *
 * Parses an incoming string into a GameMsg, and emits it as an event.
 *
 * This method must be called by a socket to notify an incoming message.
 *
 * @param {string} msg The string representing a game message.
 *
 * @see GameServer.secureParse
 * @see GameServer.validateRecipient
 */
GameServer.prototype.onMessage = function(msg) {
    var i, recipientList;
    var origSession, origStage, origFrom;

    msg = this.secureParse(msg);
    if (!msg) return;
    msg = this.validateRecipient(msg);
    if (!msg) return;
    msg = this.validateSender(msg);
    if (!msg) return;

    // Parsing successful, and recipient validated.

    // If gameMsg.to is an array, validate and send to each element separately.
    if (Object.prototype.toString.call(msg.to) === '[object Array]') {
        recipientList = msg.to;
        for (i in recipientList) {
            if (recipientList.hasOwnProperty(i)) {
                msg.to = recipientList[i];
                msg = this.validateRecipient(msg);
                if (!msg) continue;

                this.sysLogger.log(msg.toEvent() + ' ' + msg.from +
                                   '-> ' + msg.to);

                // Save properties that might be changed by the
                // obfuscation in the emit handler.
                origSession = msg.session;
                origStage = msg.stage;
                origFrom = msg.from;

                this.emit(msg.toEvent(), msg);

                // Restore the properties.
                msg.session = origSession;
                msg.stage = origStage;
                msg.from = origFrom;
            }
        }
    }
    else {
        this.sysLogger.log(msg.toEvent() + ' ' + msg.from +
                           '-> ' + msg.to);
        this.emit(msg.toEvent(), msg);
    }
};

/**
 * ### GameServer.onDisconnect
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
debugger
    client = this.registry.clients.sid.get(sid);
    if (!client) {
        throw new Error('GameServer.onDisconnect: client has invalid sid.');
    }

    // Remove client from its room:
    roomName = this.registry.getClientRoom(client.id);
    room = this.channel.gameRooms[roomName];
    if (!room) {
        // This can happen with transports different from websockets.
        // They can trigger another disconnect event after first disconnect.
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
 * ### GameServer.onShutdown
 *
 * Callback when the server is shut down
 *
 * TODO: implement it
 */
GameServer.prototype.onShutdown = function() {
    this.sysLogger.log("GameServer is shutting down.");

    // TODO save state to disk
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
 * @param {string} socketId The id of the socket connection
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {object} headers The connection headers passed by the Socket
 * @param {string} clientType The type of the client (player, bot, etc.)
 * @param {string} startingRoom Optional. The name of the room in which
 *   the client is to be placed. Default: Waiting room
 *
 * @return {boolean} TRUE on success
 *
 * @see GameServer.handleReconnectingClient
 * @see GameServer.handleConnectingClient
 */
GameServer.prototype.onConnect = function(
    socketId, socketObj, headers, clientType, startingRoom) {

    var res, clientId;
    var cookies, disconnected, returningRoom;
    var newConnection, invalidSessionCookie;

    newConnection = true;
    invalidSessionCookie = false;

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

    // Get default clientType.
    if (!clientType) {
        if (this.ADMIN_SERVER) clientType = 'admin';
        else clientType = 'player';
    }

    // Authorization check, if an authorization function is defined.
    if (this.authCb) {
        res = this.authCb(this, {
            headers: headers,
            cookies: cookies,
            startingRoom: startingRoom,
            clientType: clientType
        });
        if (!res) {
            // Warns and disconnect client if auth failed.
            this.disposeUnauthorizedClient(socketId, socketObj);
            return false;
        }
    }

    // Disconnected clients can connect using stored credentials.
    if (this.enableReconnections) {
        // If session cookie matches current session id, and a player
        // cookie is found, then it is likely that the player is
        // reconnecting. Notice that the following cases can happen
        // too:
        //
        //   - session cookie is lost, but player cookie is found. In
        //       this case, if the _generateClientId_ function is
        //       defined, the client can still be authenticated with
        //       his old cookie.
        //    - cookie player is found session cookie is
        //       mismatched. It could be a a new session, re-using the
        //       same client ids. In this case, it will be treated as
        //       a new connection, but the _generateClientId_ function
        //       should be aware of the issue.
        //
        if (cookies.session === this.channel.session && cookies.player) {
            res = this.handleReconnectingClient(cookies.player, socketId,
                                                socketObj, clientType,
                                                cookies, headers);

            // If reconnection failed, it will be treated as a new connection.
            newConnection = res !== GameServer.codes.OPERATION_OK;
            invalidSessionCookie =
                res === GameServer.codes.DUPLICATED_CLIENT_ID;
        }
    }

    // New connection.
    if (newConnection) {
        // New connection can internally call the reconnection routine, if it
        // detects that the client was reconnecting (for instance, by looking
        // at other cookies, or at the headers).
        res = this.handleConnectingClient(socketId, socketObj, headers, cookies,
                                          invalidSessionCookie,
                                          clientType, startingRoom);
    }

    // In case of failure, dispose of the client.
    if (res !== GameServer.codes.OPERATION_OK) {
        // Warns and disconnect client if auth failed.
        this.disposeUnauthorizedClient(socketId, socketObj);
    }

    return res === GameServer.codes.OPERATION_OK;
};



/**
 * ### GameServer.handleReconnectingClient
 *
 * Handles a reconnecting client.
 *
 * @param {string} clientId The id of the freshly connected client
 * @param {string} socketId The id of the socket connection
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {string} clientType The type of the client (player, bot, etc.)
 * @param {object} headers Optional. The connection headers passed by the Socket
 * @param {object} cookies Optional. An object containing the cookies, if any

 * @return {number} A numeric code describing the outcome of the operation.
 *
 * @see GameServer.codes
 */
GameServer.prototype.handleReconnectingClient = function(
    clientId, socketId, socketObj, clientType, cookies, headers) {

    var sys, client, returningRoom;
    var clientObj, decorClientObj;

    sys = this.sysLogger;

    // TODO: we need two operations to check existence and accessing it.
    // PlayerList API should be changed.
    if (!this.registry.clients.exist(clientId)) {
        sys.log('GameServer.handleReconnectingClient: Reconnecting ' +
                (this.ADMIN_SERVER ? 'admin' : 'player' ) + ' with ' +
                'invalid cookie: ' + clientId, 'error');

        // TODO: the error code is not a good description,
        // but it will trigger the desired reaction: a new connection.
        return GameServer.codes.DUPLICATED_CLIENT_ID;
    }
    client = this.registry.clients.get(clientId);

    // clientId must be already marked as disconnected.
    if (!client.disconnected) {
        sys.log('GameServer.handleReconnectingClient: Reconnecting ' +
                (this.ADMIN_SERVER ? 'admin' : 'player' ) + ' that ' +
                'was not marked as disconnected: ' + clientId, 'warn');

        // TODO: Ste: Mark disconnected and try to resume the connection.
        var gameMsg = {to: clientId}; // needs a game msg. TODO: update.
        var globalLookup = false;
        var oldInfo = this.socketManager.resolveClientAndSocket(gameMsg,
                                                                globalLookup);


        if (!oldInfo.success) {
            // TODO: check what to do here.
            // The client will be treated as a new connection, but a
            // warning will be sent.
            return GameServer.codes.DUPLICATED_CLIENT_ID;
        }
        // Force disconnection from old socket.
        this.onDisconnect(oldInfo.sid, oldInfo.socket);
    }

    // Mark the client connected (necessary to do updates).
    this.registry.markConnected(clientId);

    // Updates the socket id of the client in the registry,
    // otherwise the welcomeClient will fail.
    this.registry.updateClient(clientId, { sid: socketId });

    returningRoom = this.registry.getClientRoom(clientId);

    // The old room must be still existing.
    if (!this.channel.gameRooms[returningRoom]) {
        sys.log('GameServer.handleReconnectingClient: ' +
                'Room no longer existing for re-connecting ' +
                (this.ADMIN_SERVER ? 'admin' : 'player' ) + ': ' +
                clientId, 'error');

        this.socketManager.send(this.msg.create({
            target: ngc.constants.target.ALERT,
            to: clientId,
            text: 'The game room you are looking for is not ' +
                'existing any more. You will be redirected to ' +
                'main waiting room.'
        }));

        return GameServer.codes.ROOM_NOT_FOUND;
    }

    // All checks passed. Approved reconnection.

    // Creating one client object.
    clientObj = {
        id: clientId,
        sid: socketId,
        admin: this.ADMIN_SERVER || false,
        clientType: clientType
    };

    // Here the clientObj can be altered by a user-defined callback.
    // This part is repeated for connecting and reconnecting, if a change
    // is made here, it should be ported there too.
    // There are actually minor differences on the parameters passed.
    if (this.decorateClientObj) {
        // Manually clone clientObj.
        decorClientObj = {
            id: clientObj.id,
            sid: clientObj.sid,
            admin: clientObj.admin,
            clientType: clientObj.clientType
        };
        this.decorateClientObj(decorClientObj, {
            headers: headers,
            cookies: cookies,
            validSessionCookie: false,
            socketObj: socketObj,
            socketId: socketId,
            room: returningRoom
        });
        // Some properties cannot be changed.
        if (decorClientObj.id !== clientObj.id ||
            decorClientObj.sid !== clientObj.sid ||
            decorClientObj.admin !== clientObj.admin) {

            throw new Error('GameServer.handleConnection: ' +
                            'decorateClientObj cannot alter properties: ' +
                            'id, sid, admin.');
        }
        clientObj = decorClientObj;
    }

    // Officially register the client in the socket manager.
    this.socketManager.registerClient(clientId, socketObj);

    // Placing the player in the returning room.
    if (!this.channel.placePlayer(clientObj, returningRoom)) {
        return GameServer.codes.ROOM_NOT_FOUND;
    }

    // Notify the client of its ID.
    this.welcomeClient(clientId, socketId);

    // Let Admin and Player Server handle the new connection.
    this.emit('re-connecting', clientObj);

    return GameServer.codes.OPERATION_OK;
};

/**
 * ### GameServer.handleConnectingClient
 *
 * Handles a client (supposedly) connecting for the first time to the channel
 *
 * If a custom client id generator function is defined, and if the id returned
 * is already existing, then `handleReconnectingClient` is called.
 *
 * @param {string} socketId The id of the socket connection
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {object} headers The connection headers passed by the Socket
 * @param {object} cookies An object containing the cookies, if any
 * @param {boolean} invalidSessionCookie A flag that says if cookies _player_
 *   and _session_ are (supposedly) valid.
 * @param {string} clientType The type of the client (player, bot, etc.)
 * @param {string} startingRoom Optional. The name of the room in which
 *    the client is to be placed. Default: Waiting room
 *
 * @return {number} A numeric code describing the outcome of the operation.
 *
 * @see GameServer.codes
 * @see GameServer.handleReconnectingClient
 */
GameServer.prototype.handleConnectingClient = function(
    socketId, socketObj, headers, cookies,
    invalidSessionCookie, clientType, startingRoom) {

    var sys;
    var clientId, clientObj, decorClientObj, res;

    clientId = null;
    sys = this.sysLogger;

    // A new ID can be generated automatically, or through a custom cb.
    if (this.generateClientId) {
        clientId = this.generateClientId(this, {
            headers: headers,
            cookies: cookies,
            validSessionCookie: !invalidSessionCookie,
            socketObj: socketObj,
            socketId: socketId,
            room: startingRoom
        });

        // If clientId is not string (for a failure or because the custom
        // id generator function did no accept the connection) the connection
        // is disposed, exactly as it was not authorized.
        if ('string' !== typeof clientId) {
            sys.log('GameServer.handleConnectingClient: generateClientId ' +
                    'did not return a valid id for incoming ' +
                    (this.ADMIN_SERVER ? 'admin' : 'player' ), 'error');

            return GameServer.codes.INVALID_CLIENT_ID;
        }

        // If the authorization function returned an id that actually
        // already exists we need to try to handle as a reconnection.
        // If it is existing, but not disconnected an error will be raised.
        // If it is existing and disconnected, but its room is not found
        // anymore, a new id will be issued.
        if (this.registry.clients.exist(clientId)) {
            res = this.handleReconnectingClient(clientId, socketId, socketObj);
            if (res === GameServer.codes.OPERATION_OK) {
                return res;
            }

            if (res === GameServer.codes.DUPLICATED_CLIENT_ID) {
                sys.log('GameServer.handleConnectingClient: ' +
                        'generateClientId function return duplicated ' +
                        (this.ADMIN_SERVER ? 'admin' : 'player' ) +
                        ' id.', 'error');

                return res;
            }

            if (res === GameServer.codes.ROOM_NOT_FOUND) {
                // clientId will be reset below.
                clientId = null;
            }
        }
    }

    if (clientId === null) {
        clientId = this.registry.generateClientId();

        // Duplicated code from above.
        if ('string' !== typeof clientId) {
            sys.log('GameServer.handleConnectingClient: generateClientId ' +
                    'did not return a valid id for incoming ' +
                    (this.ADMIN_SERVER ? 'admin' : 'player' ), 'error');

            return GameServer.codes.INVALID_CLIENT_ID;
        }
    }

    // Creating one client object.
    clientObj = {
        id: clientId,
        sid: socketId,
        admin: this.ADMIN_SERVER || false,
        clientType: clientType
    };

    // Here the clientObj can be altered by a user-defined callback.
    // This part is repeated for connecting and reconnecting, if a change
    // is made here, it should be ported there too.
    if (this.decorateClientObj) {
        // Manually clone clientObj.
        decorClientObj = {
            id: clientObj.id,
            sid: clientObj.sid,
            admin: clientObj.admin,
            clientType: clientObj.clientType
        };
        this.decorateClientObj(decorClientObj, {
            headers: headers,
            cookies: cookies,
            validSessionCookie: !invalidSessionCookie,
            socketObj: socketObj,
            socketId: socketId,
            room: startingRoom
        });
        // Some properties cannot be changed.
        if (decorClientObj.id !== clientObj.id ||
            decorClientObj.sid !== clientObj.sid ||
            decorClientObj.admin !== clientObj.admin) {

            throw new Error('GameServer.handleConnection: ' +
                            'decorateClientObj cannot alter properties: ' +
                            'id, sid, admin.');
        }
        clientObj = decorClientObj;
    }

    // Adds the client to the registry.
    this.registry.addClient(clientId, clientObj);

    // Officially register the client in the socket manager.
    this.socketManager.registerClient(clientId, socketObj);

    // Put the connecting client in the waiting room or the startingRoom.
    startingRoom = startingRoom || this.channel.waitingRoom.name;
    if (!this.channel.placePlayer(clientObj, startingRoom)) {
        return GameServer.codes.ROOM_NOT_FOUND;
    }

    // Notify the client of its ID.
    this.welcomeClient(clientId, socketId);


    // TODO: remove comments
    // TODO: in some cases it could be allowed. And in any case
    // The authorization function could handle it better.
    // This is probably a duplicated connection. Not allowed for the moment.
    if (invalidSessionCookie) {
//         this.socketManager.send(this.msg.create({
//             target: ngc.constants.target.ALERT,
//             to: clientId,
//             text: 'An invalid session cookie has been found. ' +
//                 'This will be considered as a new connection.'
//         }));
    }

    // Let each Admin and Player Server registering the new connection.
    this.emit('connecting', clientObj);

    return GameServer.codes.OPERATION_OK;
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
    this.socketManager.send(this.msg.create({
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
    var to, connStr;
    to = 'unauthorized_client';

    connStr = "Unauthorized client. Socket id: <" + socketId + ">";
    this.sysLogger.log(connStr, 'warn');

    // We need to send an HI message in any case because otherwise
    // the client will discard the messages.
    socketObj.send(this.msg.create({
        target: ngc.constants.target.HI,
        to: ngc.constants.UNAUTH_PLAYER,
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
 * Sets the authorization function called on every new connection
 *
 * When called, the function receives two parameters:
 *
 * - the channel parameter
 * - an object literal with more information, such as cookies and other headers
 *
 * @param {function} cb The callback function
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
 * Sets the function decorating client objects
 *
 * By default a client object contains the following keys: "id",
 * "sid", "admin", and "clientType". This function can add as many
 * other properties as needed. However, "id", "sid", and "admin" can
 * never be modified.
 *
 * The callback function receives two parameters:
 *
 *   - the standard client object
 *   - an object literal with more information, such as headers and cookies
 *
 * @param {function} cb The callback function
 */
GameServer.prototype.clientIdGenerator = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.clientIdGenerator: cb must be ' +
                            'function.');
    }
    this.generateClientId = cb;
};

/**
 * ### GameServer.clientIdGenerator
 *
 * Sets the function assigning new client IDs upon new connections.
 *
 * The callback function receives two parameters:
 *
 * - the channel parameter
 * - an object literal with more information, such as client ids, and cookies
 *
 * @param {function} cb The callback function
 */
GameServer.prototype.clientObjDecorator = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.clientObjDecorator: cb must be ' +
                            'function.');
    }
    this.decorateClientObj = cb;
};

/**
 * ### GameServer.getAccessDeniedUrl
 *
 * Returns the url for unauthorized access to the server.
 *
 * @return {string|null} The url to the access denied page, if defined
 */
GameServer.prototype.getAccessDeniedUrl = function() {
    return this.accessDeniedUrl;
};

/**
 * ### GameServer.validateRecipient
 *
 * Validates the _to_ field of a game msg
 *
 * The original object is modified. The _to_ field will be adjusted according to
 * the permissions currently granted to the sender of the message.
 *
 * The syntattic validitity of the _GameMsg_ object should be checked before
 * invoking this method, which evaluates the semantic meaning of the _to_
 * field.
 *
 * @param {GameMsg} gameMsg The message to validate
 *
 * @return {GameMsg|false} The validated/updated game msg, or FALSE, if invalid
 */
GameServer.prototype.validateRecipient = function(gameMsg) {
    var server, errStr, opts;
    var _name, _to, _originalTo;

    errStr = '';
    opts = this.options;
    server = this.ADMIN_SERVER ? 'Admin' : 'Player';

    if ('string' === typeof gameMsg.to) {
        if (gameMsg.to.trim() === '') {
            this.sysLogger.log(server + 'Server.validateRecipient: ' +
                               'msg.to is empty.', 'error');
            return false;
        }

        // TODO: avoid cascading and use else if instead.

        if (gameMsg.to === 'ALL' && !opts.canSendTo.all) {
            errStr += 'ALL/';
            gameMsg.to = 'CHANNEL';
        }

        if (gameMsg.to === 'CHANNEL' && !opts.canSendTo.ownChannel) {
            errStr += 'CHANNEL/';
            gameMsg.to = 'ROOM';
        }

        if (gameMsg.to === 'ROOM' && !opts.canSendTo.ownRoom) {
            this.sysLogger.log(server + 'Server.validateRecipient: ' +
                               'sending to "' + errStr +
                               'ROOM" is not allowed.', 'error');
            return false;
        }

        if ((gameMsg.to.lastIndexOf('CHANNEL_', 0) === 0)) {

            if (!opts.canSendTo.anyChannel) {

                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   'sending to "CHANNEL_" is not allowed.',
                                   'error');
                return false;
            }

            // Extract channel name from _to_ field.
            _name = gameMsg.to.substr(8);
            // Fetch channel object.
            _to = this.channel.servernode.channels[_name];
            if (!_to) {
                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   gameMsg.to + ' points to an unexisting ' +
                                   'channel.', 'error');
                return false;
            }

            // Encapsulate validated channel data in the message.
            gameMsg._originalTo = gameMsg.to;
            gameMsg._to = _to;
            gameMsg.to = 'CHANNEL_X';
        }
        if ((gameMsg.to.lastIndexOf('ROOM_', 0) === 0)) {

            if (!opts.canSendTo.anyRoom) {

                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   'sending to "ROOM_" is not allowed.',
                                   'error');
                return false;
            }
            // Extract room id from _to_ field.
            _name = gameMsg.to.substr(5);
            // Fetch channel object.
            _to = this.channel.servernode.rooms[_name];

            if (!_to) {
                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   gameMsg.to + ' points to an unexisting ' +
                                   'room.', 'error');
                return false;
            }

            // Encapsulate validated channel data in the message.
            gameMsg._originalTo = gameMsg.to;
            gameMsg._to = _to;
            gameMsg.to = 'ROOM_X';
        }
        // Otherwise it's either SERVER (always allowed) or a client ID, which
        // will be checked at a later point.

    }
    else if (Object.prototype.toString.call(gameMsg.to) === '[object Array]') {

        if (gameMsg.to.length > opts.maxMsgRecipients) {
            this.sysLogger.log(server + 'Server.validateRecipient: ' +
                               'number of recipients exceeds limit. ' +
                               gameMsg.to.length + '>' +
                               opts.maxNumRecipients, 'error');
            return false;
        }

    }
    else {
        this.sysLogger.log(server + 'Server.validateRecipient: ' +
                           'msg.to is neither string nor array.', 'error');
        return false;
    }
    return gameMsg;
};

/**
 * ### GameServer.validateSender
 *
 * Validates the _from_ field of a game msg
 *
 * The original object is modified. The _from_ field remains unchanged, but
 * adds the room name of the sender under __roomName_, the name
 * of the channel under __channelName_, and the socket id under __sid_.
 *
 * The syntattic validitity of the _GameMsg_ object should be checked before
 * invoking this method, which evaluates only if the sender exists.
 *
 * @param {GameMsg} gameMsg The message to validate
 *
 * @return {GameMsg|false} The validated/updated game msg, or FALSE, if invalid
 */
GameServer.prototype.validateSender = function(gameMsg) {
    var server, errStr, opts;
    var _room;

    errStr = '';
    opts = this.options;
    server = this.ADMIN_SERVER ? 'Admin' : 'Player';

    if ('string' !== typeof gameMsg.from) {
        this.sysLogger.log(server + 'Server.validateSender: msg.from must be ' +
                           'string.', 'error');
        return false;
    }

    _room = this.channel.registry.getClientRoom(gameMsg.from);

    if (!_room) {
        this.sysLogger.log(server + 'Server.validateSender: sender was not ' +
                           'found in any room: ' + gameMsg.toEvent() + ' - ' +
                           gameMsg.from + '.', 'error');
        return false;
    }

    gameMsg._roomName = _room;
    gameMsg._channelName = this.channel.gameRooms[_room].channel.name;
    gameMsg._sid = this.channel.registry.getClients()[gameMsg.from].sid;
    return gameMsg;
};

/**
 * ### GameServer.attachListeners
 *
 * Attaches listeners shared by both servers.
 */
GameServer.prototype.attachListeners = function() {
    var that = this,
    sys = this.sysLogger,
    action = ngc.constants.action,
    say = action.SAY + '.',
    set = action.SET + '.',
    get = action.GET + '.';

    // #### get.LANG
    // It sends the object of language objects for the game back to the client.
    this.on(get + 'LANG', function(msg) {
        var room, roomName;
        var response, serverName;

        if (msg.to === 'SERVER') {

            // Get the room of the player to infer the game.
            roomName = msg._roomName || that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                serverName = that.ADMIN_SERVER ? 'Admin' : 'Player';
                sys.log(serverName + '.on.get.LANG: Could not determine room ' +
                        'of sender: ' + msg.from, 'error');
                return;
            }

            response = that.msg.create({
                target: 'LANG',
                from: 'SERVER',
                to: msg.from,
                data: that.servernode.info.games[room.gameName].languages
            });

            that.socketManager.send2client(response);
        }
    });
};
