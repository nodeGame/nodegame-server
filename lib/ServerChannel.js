/**
 * # ServerChannel
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Wrapper class for PlayerServer, AdminServer
 * 
 * ---
 * 
 */

// ## Global scope

module.exports = ServerChannel;

var AdminServer = require('./servers/AdminServer'),
	PlayerServer = require('./servers/PlayerServer'),
	GameServer = require('./GameServer'),
	Logger = require('./Logger');

var J = require('nodegame-client').JSUS;


/**
 * ## ServerChannel Constructor
 * 
 * Creates an instance of ServerChannel
 * 
 * @param {object} options Configuration object
 * @param {object} sio The socket.io server
 * 
 */
function ServerChannel (sio, options) {
	this.sio = sio;
	this.options = J.clone(options);
		
	this.name = options.name;
	
	this.admin = null;
	this.player = null;
	
	this.sysLogger = Logger.get('channel', {name: this.name});
	
	this.createServers();
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

	
// AdminServer	
	var adminOptions = {
	 	sio: this.sio,
	 	endpoint: this.options.admin,
	 	channel: this.name,
	 	name: 'admin',
	 	user_options: this.options
	};
	
	this.admin = new AdminServer(adminOptions);

// PlayerServer	
	var playerOptions = {
	   sio: this.sio,
	   endpoint: this.options.player,
	   channel: this.name,
	   name: 'player',
	   user_options: this.options
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
 * ### ServerChannel.startGame
 * 
 * Initializes and start a new game logic on the admin server
 * 
 * @param game {object} A game object
 * @param options {object} Optional. A configuration object to pass to node.setup
 * 
 * @see node.Game
 * @see node.setup
 */
ServerChannel.prototype.startGame = function(game, options) {
	options = options || {};
		
	var node = require('nodegame-client'); 
	
//	try {
		node.setup('nodegame', options);
		
		node.socket.setSocketType('SocketDirect', {
			socket: this.admin.socket_manager.sockets.direct
		});
		
		node.connect();                  
		node.play(new game());

		return node;
//	}
//	catch(e) {
		this.sysLogger.log(e, 'error');
		return false;
//	}
};

