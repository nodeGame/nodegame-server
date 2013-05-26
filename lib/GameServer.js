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

var GameMsgManager = require('./GameMsgManager'),
	Logger = require('./Logger');

var GameSocketManager = require('./GameSocketManager'),
	SocketIo = require('./sockets/SocketIo'),
	SocketDirect = require('./sockets/SocketDirect');

var GameMsg 	= require('nodegame-client').GameMsg,
	PlayerList 	= require('nodegame-client').PlayerList,
	Player 		= require('nodegame-client').Player,
	GameDB 		= require('nodegame-client').GameDB;
		
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
	
	this.serverid = Math.random()*1000000000;

	this.options = options;
	this.user_options = options.user_options;
	
	this.endpoint = '/' + options.endpoint;
	
	this.channel = options.channel;
	this.name = options.name;

	this.sio = options.sio; // socket_io.listen(app);
	
	this.sysLogger = Logger.get('channel', {name: this.name});
	this.msgLogger = Logger.get('messages', {name: this.name});
	
	this.socket_manager = new GameSocketManager(this);
	this.msg = new GameMsgManager(this);
	
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
 * and viceversa. 
 * 
 * @param {object} node The partner server
 */
GameServer.prototype.setPartner = function(node) {
	this.partner = node;
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
			this.socket_manager.registerSocket('sio', sio);
			socket_count++;
		}
		
		if (this.user_options.sockets.direct) {
			var direct = new SocketDirect(this);
			this.socket_manager.registerSocket('direct', direct);
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
 * Tries to cast a JSON object into a `GameMsg` object 
 * and logs the outcome of the operation. 
 * 
 * On success, returns the parsed game message, otherwise
 * returns FALSE.
 * 
 * 
 * @param {object} msg The object to cast to `GameMSg`
 * @return {boolean|GameMsg} The parsed game message or FALSE is an error occurred 
 */
GameServer.prototype.secureParse = function(msg) {
	
	try {
		var gameMsg = GameMsg.clone(JSON.parse(msg));
		this.msgLogger.log('R', gameMsg);
		return gameMsg;
	} catch (e) {
		this.sysLogger.log('error', "Malformed msg received: " + e);
		return false;
	}

};

// TODO: CHeck, is it still used? Sockets seems to circumvent it
GameServer.prototype.onConnect = function(client, socket) {
	this.socket_manager.registerClient(client, socket);
	// Send Welcome Msg and notify others
	this.welcomeClient(client);
};


GameServer.prototype.onMessage = function(msg) {
	msg = this.secureParse(msg);

	if (msg) { // Parsing Successful	
		this.sysLogger.log(msg.toEvent() + ' ' + msg.from + '-> ' + msg.to);
		this.emit(msg.toEvent(), msg);
	}
};


GameServer.prototype.onDisconnect = function(client, socket) {
	var player = this.pl.pop(client);
	this.disconnected.add(player);
	
	var txt = player + " disconnected";
	this.sysLogger.log(txt);
	
	
	// Notify all server
	this.emit('disconnect', player);
};

GameServer.prototype.onShutdown = function() {
	this.sysLogger.log("Server is shutting down.");
	this.pl.clear(true);
	this.msg.sendPLIST(that);
	// send MLIST?
//	that.log.close();
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
	this.socket_manager.attachListeners();
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
 * ### GameServer.welcomeClient
 * 
 * Send a HI msg to the client, and log its arrival
 * 
 * @param {string} client The id of the freshly connected client
 */
GameServer.prototype.welcomeClient = function(client) {
	var connStr = "Welcome <" + client + ">";
	this.sysLogger.log(connStr);
	this.msg.sendHI(connStr, client);
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
GameServer.prototype.isValidRecipient = function (to) {
	return (to) ? true : false;
};
