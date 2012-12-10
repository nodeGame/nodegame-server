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

	this.sysLogger = server.sysLogger;
	this.msgLogger = server.msgLogger;
	
	
	this.sockets = {};
}

// ## METHODS

GameSocketManager.prototype.register = function(name, socket) {
	this.sockets[name] = socket;
};

/**
 * ### GameSocketManager.send
 * 
 * Low level primitive to send a game message
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameSocketManager.prototype.send = function (gameMsg, socket) {
	
	var to = gameMsg.to,
		event = gameMsg.toInEvent();

	if (to === 'SERVER' || to === null) {
		this.sysLogger.log('Trying to send msg to nobody: ' + to, 'ERR');
		return false;
	}
	
	// Broadcast
	if (to === 'ALL') {
		for (var i in this.clients) {
			if (this.clients.hasOwnProperty(i)) {
				this.clients[i].emit(event, gameMsg);
			}
		}
		
		this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' broadcasted to ' + to);
		this.msgLogger.log('B', gameMsg);
	}
	// Send to a specific client
	else {
		
		var client = this.clients[to]; 
		
		if (!client) {
			this.sysLogger.log('Msg not sent. Unexisting recipient: ' + to, 'ERR');
			return false;
		}
		
		client.emit(event, gameMsg);
		
		this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ' + to);
		this.msgLogger.log('S', gameMsg);
	}
	
	return true;
};