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

var AdminServer = require('./AdminServer'),
	PlayerServer = require('./PlayerServer'),
	GameServer = require('./GameServer');


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
	this.options = options;
		
	this.name = options.name;
	
	this.admin = null;
	this.player = null;

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
	 	parent:	this.name,
	 	user_options: J.extend({name: 'A'}, J.clone(this.options))
	};
	
	this.admin = new AdminServer(adminOptions);

// PlayerServer	
	var playerOptions = {
	   sio: this.sio,
	   endpoint: this.options.player,
	   parent: 	this.name,
	   user_options: J.extend({name: 'P'}, J.clone(this.options))
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
	//try {
		this.admin.listen();
		this.player.listen();
		return true;
	//}
	//catch(e) {
		return false;
	//}
};
