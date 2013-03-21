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
	
	this.clients[id] = client;
	
	this.game_server.socket_manager.registerClient(id, this);
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


SocketDirect.prototype.send = function(msg) {
	
	var to = msg.to,
		rel = msg.reliable;
		

	if (to === 'SERVER' || to === null) {
		this.game_server.sysLogger.log('Trying to send msg to nobody: ' + to, 'ERR');
		return false;
	}
	
	var gameMsg;
	try {
		gameMsg = JSON.stringify(msg);
	}
	catch(e) {
		this.game_server.sysLogger.log('An error has occurred. Cannot send message: ' + msg);
		return false;
	}
	
	
	// Broadcast
	if (to === 'ALL') {
		
		for (var i in this.clients) {
			if (this.clients.hasOwnProperty(i)) {
				// no self-send 
				if (i !== msg.from) {
					this.clients[i].message(gameMsg);
				}
				
			}
		}
		
		this.game_server.sysLogger.log('Msg ' + msg.toSMS() + ' broadcasted to ' + to);
		this.game_server.msgLogger.log('B', msg);
	}
	// Send to a specific client
	else {
		var client = this.clients[to]; 
		
		if (client) {
			
			client.message(gameMsg);
			
			this.game_server.sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + to);
			this.game_server.msgLogger.log('S', msg);
		}
		else {
			this.game_server.sysLogger.log('msg not sent. Unexisting recipient: ' + to, 'ERR');
		}
	}
	
	
};

