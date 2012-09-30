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

var ServerLog = require('./ServerLog'),
	GameMsgManager = require('./GameMsgManager');

var GameState 	= require('nodegame-client').GameState,
	GameMsg 	= require('nodegame-client').GameMsg,
	PlayerList 	= require('nodegame-client').PlayerList,
	Player 		= require('nodegame-client').Player;
	GameDB 		= require('nodegame-client').GameDB;

var log;

/**
 * ## GameServer Constructor
 * 
 * Creates a new instance of GameServer
 * 
 * @param {object} options Configuration object
 */
function GameServer(options) {
	EventEmitter.call(this);
	
	this.serverid = Math.random()*1000000000;

	this.options = options;
	this.user_options = options.user_options;
	
	this.io = options.io;
	this.channel = '/' + options.channel;
	this.socket = null; // to be init after a connection is created
	this.parent = options.parent;
	this.name = this.user_options.name;

	log = this.log = new ServerLog({
		name : '[' + this.parent + ' - ' + this.name + ']',
		dumpmsg : ('undefined' === typeof this.user_options.dumpmsg) ? false : this.user_options.dumpmsg,
		dumpsys : ('undefined' === typeof this.user_options.dumpsys) ? true : this.user_options.dumpsys,
		verbosity : ('undefined' === typeof this.user_options.verbosity) ? 1 : this.user_options.verbosity
	});
	
	this.server = options.server;

	this.gmm = new GameMsgManager(this);

	this.pl = new PlayerList();
	
	// List of players who have disconnected recently
	this.disconnected = new PlayerList();

	this.partner = null;
	
	if (options.memory) {
		this.memory = new GamedB();
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
	this.attachListeners();
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
		log.msg('R, ' + gameMsg);
		return gameMsg;
	} catch (e) {
		log.log("Malformed msg received: " + e, 'ERR');
		return false;
	}

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
	var that = this;

	log.log('Listening for connections');

	
	// Debugging. Do not delete
	
//	this.server.sockets.on('connection', function (socket) {
//		console.log('Connected Global ' + socket.id);
//	  
//		
//		socket.on('message', function (data) {
//			console.log('I received a global msg ' + data);
//		});
//	});
	
	this.channel = this.server.of(this.channel).on('connection',
		function(socket) {
			// Register the socket as a class variable
			that.socket = socket;

			//console.log('Connected Channel ' + socket.id);
			
			// Send Welcome Msg and notify others
			that.welcomeClient(socket.id);

			socket.on('message', function(message) {

				var msg = that.secureParse(message);

				if (msg) { // Parsing Successful
					// that.log.log('JUST RECEIVED P ' + util.inspect(msg));

					var target = (this.target === GameMsg.targets.DATA) ? this.text : this.target;
					
					// TODO: KEEP THE
					// FORWADING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ?
					// that.gmm.forward(msg);
					
					log.log(that.name + ' About to emit ' + msg.toEvent());
					log.log(msg.toEvent() + ' ' + msg.from + '-> ' + msg.to);
					
					that.emit(msg.toEvent(), msg);
				}
			});

			socket.on('disconnect', function() {
				
				console.log('DISCONNECTED');
				var player = that.pl.pop(socket.id);
				that.disconnected.add(player);
				
				var txt = player + " disconnected";
				that.gmm.sendTXT(txt, 'ALL');
				log.log(txt);
				
				
				// Notify all server
				that.emit('closed', socket.id);
			});

	});

	// <!-- TODO: Check this --!>
	this.server.sockets.on("shutdown", function(message) {
		log.log("Server is shutting down.");
		that.pl.clear(true);
		that.gmm.sendPLIST(that);
		log.close();
	});
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
	log.log(connStr);
	this.gmm.sendHI(connStr, client);
};


/**
 * ### GameServer.getConnections
 * 
 * Returns an array containing the ids of all the connected clients
 * 
 * @return {Array} clientids The array containing the ids of all the connected clients
 */
GameServer.prototype.getConnections = function() {

	var clientids = [];
	for ( var i in this.channel.sockets) {
		if (this.channel.sockets.hasOwnProperty(i)) {
			clientids.push(i);
			log(i);
		}
	}
	return clientids;
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
	if (to !== null && to !== 'SERVER') {
		return true;
	}
	return false;
};

/**
 * ### GameServer.checkSync
 * 
 * @experimental
 * 
 * @return {Boolean}
 */
GameServer.prototype.checkSync = function() {
	//<!-- TODO: complete function checkSync --!>
	return true;
};
