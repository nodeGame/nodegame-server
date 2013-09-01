/**
 * # GameServer
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * Parses incoming messagages and emits correspondings events.
 *
 * Keeps track of connected players, recently disconnected players.
 *
 * Contains abstract methods that are instantiated by two classes
 * that inherits this class: `AdminServer`, and `PlayerServer`.
 *
 * ---
 *
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

    // TODO probably to remove. The ChannelRegistry has the playerlist now
    this.pl = new PlayerList();

    // List of players who have disconnected recently
    this.disconnected = new PlayerList();

    this.partner = null;

    if (options.memory) {
        this.memory = new GameDB();
    }
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

    var socket_count = 0;
    if (this.user_options.sockets) {
        if (this.user_options.sockets.sio) {
            var sio = new SocketIo(this);
            sio.attachListeners();
            this.socket.registerSocket('sio', sio);
            socket_count++;
        }

        if (this.user_options.sockets.direct) {
            var direct = new SocketDirect(this);
            this.socket.registerSocket('direct', direct);
            socket_count++;
        }

    }

    if (!socket_count) {
        this.sysLogger.log('', 'No open sockets on');
    }

    this.attachCustomListeners();

};

/**
 * ### GameServer.secureParse
 *
 * Verifies that an incoming message is valid
 *
 * First, tries to cast a object into a `GameMsg` object,
 * and then checks if the sender exists.
 *
 * Logs the outcome of the operation.
 *
 * @param {object} msg The object to cast to `GameMSg`
 * @return {boolean|GameMsg} The parsed game message or FALSE is the msg is invalid
 */
GameServer.prototype.secureParse = function(msg) {
    var gameMsg;
    try {
        gameMsg = GameMsg.clone(JSON.parse(msg));
        this.msgLogger.log('R', gameMsg);
        return gameMsg;
    } catch (e) {
        this.sysLogger.log('error', "Malformed msg received: " + e);
        return false;
    }
    // TODO check in the registry
    if (!this.pl.exist(msg.from)) {
        this.sysLogger.log('error', "Received msg from unknown client: " + msg.from);
        return false;
    }

};

GameServer.prototype.onMessage = function(msg) {
    msg = this.secureParse(msg);

    if (msg) { // Parsing Successful
        this.sysLogger.log(msg.toEvent() + ' ' + msg.from + '-> ' + msg.to);
        this.emit(msg.toEvent(), msg);
    }
};


GameServer.prototype.onDisconnect = function(client, socket) {
    var player;
    player = this.pl.pop(client);
    this.disconnected.add(player);

    this.sysLogger.log(player + " disconnected");

    // Notify all server
    this.emit('disconnect', player);
};

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
 *
 * @return {boolean} TRUE on success
 */
GameServer.prototype.onConnect = function(socketId, socketObj) {
    var res, clientObj, clientId;
    
    clientObj = {
        sid: socketId
    }; 
    
    if (this.ADMIN_SERVER) {
        clientObj.admin = true;
    }

    // this.decorateClient(handshakeData);
    
    //if (this.authorizeClient(clientObj)) {
    //    this.sysLogger.log('Unauthorized connection ' + connectionId);
    //    return;
    //}
    
    clientId = this.registry.addClient(clientObj);

    if (!clientId) {
        return false;
    }

    // TODO: check here. Both methods were called  with socketId
    this.socket.registerClient(clientId, socketObj);
    this.channel.placePlayer(clientObj, this.channel.waitingRoom.name);

    this.welcomeClient(clientId);
    
    return true;
};


/**
 * ### GameServer.welcomeClient
 *
 * Send a HI msg to the client, and log its arrival
 *
 * @param {string} client The id of the freshly connected client
 */
GameServer.prototype.welcomeClient = function(clientID) {
    var connStr;
    connStr = "Welcome <" + clientID + ">";
    this.sysLogger.log(connStr);
    this.socket.send(this.msg.create({
        target: 'HI',
        to: clientID,
        data: clientID,
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


