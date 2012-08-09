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
	EventEmitter = require('events').EventEmitter,
	nodemailer = require('nodemailer');

var AdminServer = require('./AdminServer'),
	PlayerServer = require('./PlayerServer'),
	GameServer = require('./GameServer'),
	ServerLog = require('./ServerLog'),
	GameMsgGenerator = require('./GameMsgGenerator');


var GameState = require('nodegame-client').GameState,
	GameMsg = require('nodegame-client').GameMsg,
	JSUS = require('nodegame-client').JSUS,
	PlayerList = require('nodegame-client').PlayerList,
	Player = require('nodegame-client').Player;


/**
 * ## ServerChannel Constructor
 * 
 * Creates an instance of ServerChannel
 * 
 * @param {object} options Configuration object
 * @param {object} server The HTTP server
 * @param {object} io The Socket.io server
 * 
 */
function ServerChannel (options, server, io) {
	
	this.options = options;
	this.server = server;
	this.io = io;
		
	this.name = options.name;
	
	if (options.mail) {
		nodemailer.sendmail = true;
		nodemailer.send_mail({sender: this.name, 
	        				  to: options.mail.to,
					          subject: options.mail.subject,
					          body: "MAIL. For now you cannot change this..."}, // TODO allow for custom body
			    function(error, success){
	            console.log("Message "+(success?"sent":"failed"));
	        });
	}
	
	this.adminChannel = options.admin;
	this.playerChannel = options.player;
	
	this.port = options.port;
		
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
	 	io: 		this.io,
	 	server: 	this.server,
	 	channel: 	this.adminChannel,
	 	parent:		this.name,
	 	user_options: JSUS.extend({name: 'A'}, JSUS.clone(this.options))
	};
	
	this.adminServer = new AdminServer(adminOptions);

// PlayerServer	
	var playerOptions = {
	   io: 		this.io,
	   server: 	this.server,
	   channel: this.playerChannel,
	   parent: 	this.name,
	   user_options: JSUS.extend({name: 'P'}, JSUS.clone(this.options))
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
