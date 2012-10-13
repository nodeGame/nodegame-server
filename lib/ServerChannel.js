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

var util = require('util'),
	nodemailer = require('nodemailer');

var AdminServer = require('./AdminServer'),
	PlayerServer = require('./PlayerServer'),
	GameServer = require('./GameServer'),
	ServerLog = require('./ServerLog');


var J = require('nodegame-client').JSUS;


/**
 * ## ServerChannel Constructor
 * 
 * Creates an instance of ServerChannel
 * 
 * @param {object} options Configuration object
 * @param {object} server The HTTP server
 * 
 */
function ServerChannel (server, options) {
	
	this.options = options;
	this.server = server;
		
	this.name = options.name;
		
	this.adminChannel = options.admin;
	this.playerChannel = options.player;

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

	console.log(this.name);
	console.log(ServerChannel.name)
	
// AdminServer	
	var adminOptions = {
	 	server: 	this.server,
	 	channel: 	this.adminChannel,
	 	parent:		this.name,
	 	user_options: J.extend({name: 'A'}, J.clone(this.options))
	};
	
	this.adminServer = new AdminServer(adminOptions);

// PlayerServer	
	var playerOptions = {
	   server: 	this.server,
	   channel: this.playerChannel,
	   parent: 	this.name,
	   user_options: J.extend({name: 'P'}, J.clone(this.options))
	};
		
	this.playerServer = new PlayerServer(playerOptions);
	
// The two servers are aware of each other	
	this.adminServer.setPartner(this.playerServer);
	this.playerServer.setPartner(this.adminServer);
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
		this.adminServer.listen();
		this.playerServer.listen();
		return true;
	}
	catch(e) {
		return false;
	}
};
