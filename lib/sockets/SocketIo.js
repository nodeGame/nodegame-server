/**
 * # SocketIo
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Handles network connections
 * 
 * ---
 * 
 */

// Global scope

module.exports = SocketIo;

var GameMsg = require('nodegame-client').GameMsg;


  
/**
 * ## SocketIo constructor
 * 
 * Creates an instance of SocketIo
 * 
 * @param {GameServer} server A GameServer instance
 */
function SocketIo(game_server) {
	
    this.game_server = game_server;
    this.sio = game_server.sio;
    this.channel = null;
}


//## METHODS

SocketIo.prototype.attachListeners = function() {
    var that = this;
	
    this.channel = this.sio.of(this.game_server.endpoint).on('connection',
		function(socket) {
			// Register the socket as a class variable
	
			that.game_server.socket.registerClient(socket.id, that);
			
			// Send Welcome Msg and notify others
			that.game_server.welcomeClient(socket.id);

			socket.on('message', function(msg) {
				that.game_server.onMessage(msg);
			});

			socket.on('disconnect', function() {
				that.game_server.onDisconnect(socket.id, socket);
			});
	});

	this.sio.sockets.on("shutdown", that.game_server.onShutdown);
	
	
};



SocketIo.prototype.send = function(gameMsg) {
    var to = gameMsg.to, client,
        rel = gameMsg.reliable,
        msg = gameMsg.stringify();
    
    if (to === 'SERVER' || to === null) {
	this.game_server.sysLogger.log('Trying to send msg to nobody: ' + to, 'ERR');
	return false;
    }
    
    // Broadcast
    if (to === 'ALL') {
	if (rel) {
	    this.channel.json.send(msg);
	} 
	else {
	    this.channel.volatile.json.send(msg);
	}
	this.game_server.sysLogger.log('Msg ' + gameMsg.toSMS() + ' broadcasted to ' + to);
	this.game_server.msgLogger.log('B', gameMsg);
    }
    // Send to a specific client
    else {
	client = this.channel.sockets[to]; 
	
	if (client) {
	    if (rel) {
		client.json.send(msg);
	    }
	    else {
		client.volatile.json.send(msg);
	    }
	    this.game_server.sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ' + to);
	    this.game_server.msgLogger.log('S', gameMsg);
	}
	else {
	    this.game_server.sysLogger.log('Msg not sent. Unexisting recipient: ' + to, 'ERR');
	    return false;
	}
    }
    return true;
};



