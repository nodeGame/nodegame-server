/**
 * # GameSocketManager
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Game message manager: creates and sends typed game message to single
 * or grouped recipients
 * 
 * ---
 * 
 */

// Global scope

module.exports = GameSocketManager;

var Logger = require('./Logger'),
	GameMsgGenerator = require('./GameMsgGenerator');

var GameState = require('nodegame-client').GameState,
	GameMsg = require('nodegame-client').GameMsg;


  
/**
 * ## GameSocketManager Constructor
 * 
 * Creates an instance of GameSocketManager.
 * 
 * @param {GameServer} server A GameServer instance
 */
function GameSocketManager(server) {
	
	this.server = server;
	
	this.sockets = {};
}

GameSocketManager.prototype.send = function(gameMsg) {
	for (var i in this.sockets) {
		if (this.sockets.hasOwnProperty(i)) {
			this.sockets[i].send(gameMsg);
		}
	}
};

GameSocketManager.prototype.register = function(id, socket) {
	this.sockets[id] = socket;
};




// ## METHODS
