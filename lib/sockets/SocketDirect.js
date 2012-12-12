/**
 * # SocketDirect
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Handles direct connection by shared object
 * 
 * ---
 * 
 */

// Global scope

module.exports = SocketDirect;

var GameState = require('nodegame-client').GameState,
	GameMsg = require('nodegame-client').GameMsg;


  
/**
 * ## GameSocketManager Constructor
 * 
 * Creates an instance of GameSocketManager.
 * 
 * @param {GameServer} server A GameServer instance
 */
function SocketDirect(game_server) {
	
	this.game_server = game_server;
	this.clients = {};
}

SocketDirect.prototype.generateID = function() {
	
	return Math.random() * 1000000000000000000;
};



//## METHODS

SocketDirect.prototype.connect = function(client) {
	
	var id = this.generateID();
	
	this.game_server.gmm.socket_manager.register(id, client);
	this.game_server.welcomeClient(id);
};

SocketDirect.prototype.message = function(msg) {
	this.game_server.onMessage(msg);
};

SocketDirect.prototype.disconnect = function(client) {
	delete this.clients[client];
};


SocketDirect.prototype.attachListeners = function() {

};


SocketDirect.prototype.send = function(gameMsg) {
	for (var i in this.clients) {
		if (this.clients.hasOwnProperty(i)) {
			this.clients[i].message(gameMsg);
		}
	}
};



