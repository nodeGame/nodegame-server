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

//console.log(JSUS)

var J = require('JSUS').JSUS;

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
	
	this.adminGames = {}; 
	
	this.subChannels = {};
	this.maxSubChannels = ('undefined' === typeof options.maxSubChannels) ? -1 : options.maxSubChannels;
	
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
 * @param game {string} The path to the game logic
 * @param options {object} Optional. A configuration object to pass to node.setup
 * 
 * @see node.Game
 * @see node.setup
 */
ServerChannel.prototype.startGame = function(pathToGame, options) {
	options = options || {};
		
	var node = require('nodegame-client'); 
	var duplicateCounter = 1, game, gamename;
	
//	try {
		node.setup('nodegame', options);
		node.socket.setSocketType('SocketDirect', {
			socket: this.admin.socket_manager.sockets.direct
		});
		node.connect();                  
	
		game = require(pathToGame)(node, this);
		node.play(new game());

		gamename = J.uniqueKey(this.adminGames, options.name || game.name);
		
		this.adminGames[gamename] = node;
		
		return node;
//	}
//	catch(e) {
		this.sysLogger.log(e, 'error');
		return false;
//	}
};


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