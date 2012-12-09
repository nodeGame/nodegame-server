/**
 * # GameMsgManager
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

module.exports = GameMsgManager;

var Logger = require('./Logger'),
	GameMsgGenerator = require('./GameMsgGenerator');

var GameState = require('nodegame-client').GameState,
	GameMsg = require('nodegame-client').GameMsg;


function Eventer() {
	this.clients = {};
};

Eventer.prototype.register = function(client, socket) {
	this.clients[clients] = socket;
};

Eventer.prototype.send = function(gameMsg) {
	var to = gameMsg.to,
		event = msg.toInEvent();

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
  
/**
 * ## GameMsgManager Constructor
 * 
 * Creates an instance of GameMsgManager.
 * 
 * @param {GameServer} server A GameServer instance
 */
function GameMsgManager(server) {
	
	this.name = server.name || 'GenericSender';
	this.session = Math.floor(Math.random()*10000);
	
	this.server = server;
	
	this.ee = new Eventer();
	
	this.sysLogger = server.sysLogger;
	this.msgLogger = server.msgLogger;
	
	this.gmg = new GameMsgGenerator(this.session, server.name, new GameState());	// TODO: Check what is best to init
}

// ## METHODS


/**
 * ### GameMsgManager.send
 * 
 * Low level primitive to send a game message
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameMsgManager.prototype.send = function (gameMsg) {
	
	this.socket.send(gameMsg);
	return;
	
	var to = gameMsg.to,
		rel = gameMsg.reliable,
		msg = gameMsg.stringify();
	
	if (to === 'SERVER' || to === null) {
		this.sysLogger.log('Trying to send msg to nobody: ' + to, 'ERR');
		return false;
	}
	
	this.socket.send(gameMsg);
	
	// Broadcast
	if (to === 'ALL') {
		this.ee.emit(gameMsg);
		
		this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' broadcasted to ' + to);
		this.msgLogger.log('B', gameMsg);
	}
	// Send to a specific client
	else {
		
		
		
		this.ee.emit(gameMsg);
		
		
//		var client = this.server.channel.sockets[to]; 
//		
//		if (client) {
//			if (rel) {
//				client.json.send(msg);
//			}
//			else {
//				client.volatile.json.send(msg);
//			}
//			this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ' + to);
//			this.msgLogger.log('S', gameMsg);
//		}
//		else {
//			this.sysLogger.log('Msg not sent. Unexisting recipient: ' + to, 'ERR');
//		}
	}
};