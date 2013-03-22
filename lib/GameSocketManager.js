/**
 * # GameSocketManager
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Game socket manager: registers of all open sockets and 
 * connected clients
 * 
 * ---
 * 
 */

// Global scope

module.exports = GameSocketManager;

var Logger = require('./Logger'),
	GameMsgGenerator = require('./GameMsgGenerator');

  
/**
 * ## GameSocketManager constructor
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
	this.clients = {};
}

// ## METHODS

/**
 * GameSocketManager.registerSocket
 * 
 * Registers a new type of socket
 * 
 * @param {string} name The name of the socket
 * @param {object} socket The connection socket
 * 
 */
GameSocketManager.prototype.registerSocket = function(name, socket) {
	this.sockets[name] = socket;
};

/**
 * GameSocketManager.registerClient
 * 
 * Matches a client to a socket
 * 
 * @param client {string} The id of the client
 * @param socket {object} The socket through which the client is connected
 * 
 */
GameSocketManager.prototype.registerClient = function(client, socket) {
	this.clients[client] = socket;
};

/**
 * ### GameSocketManager.send
 * 
 * Low level primitive to send a game message
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameSocketManager.prototype.send = function (gameMsg) {
	
	var to = gameMsg.to;

	// Broadcast
	if (to === 'ALL') {
		for (var i in this.sockets) {
			if (this.sockets.hasOwnProperty(i)) {
				this.sockets[i].send(gameMsg);
			}
		}
	}
	// Send to a specific client
	else {
		
		var socket = this.clients[to]; 
		
		if (!socket) {
			this.sysLogger.log('Msg not sent. Unexisting recipient: ' + to, 'ERR');
			return false;
		}
		
		socket.send(gameMsg);
	}
	
	return true;
};



/**
 * ### GameSocketManager.broadcast
 * 
 * Broadcasts a game message to all the clients connected, 
 * sender excluded
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameSocketManager.prototype.broadcast = function (gameMsg, from) {
	
	from = from || gameMsg.from;

	for (var client in this.clients) {
		if (this.clients.hasOwnProperty(client)) {
			if (client != from) {
				// <!-- this.log.log(client + ' different ' + from); --!>
				gameMsg.to = client;
				this.send(gameMsg);
			}
		}
	}
};
