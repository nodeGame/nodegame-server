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
 * @param {boolean} FALSE, if an error occurs
 */
GameSocketManager.prototype.send = function(gameMsg) {
	
    var to = gameMsg.to;
    var smoothExec = true;
    var socket, res, oneFail;

    // Broadcasting a msg
    if (to === 'ALL') {
	for (var i in this.sockets) {
	    if (this.sockets.hasOwnProperty(i)) {
		res = this.sockets[i].send(gameMsg);
                if (!res) {
		    this.sysLogger.log('An error occurred while sending a message to ALL. client:' + i, 'ERR');
                    oneFail = false;
                }
	    }
	}
        return smoothExec;
    }
    
    // Sending a msg to a specific client
    else {
	
	socket = this.clients[to]; 
	
	if (!socket) {
	    this.sysLogger.log('Msg not sent. Unexisting recipient: ' + to, 'ERR');
	    return false;
	}
	
	res = socket.send(gameMsg);
        if (!res) {
	    this.sysLogger.log('An error occurred while sending a message to ' + to, 'ERR');
        }
        return res;
    }
	
};



/**
 * ### GameSocketManager.broadcast
 * 
 * Broadcasts a game message to all the clients connected, 
 * sender excluded
 * 
 * @param {GameMsg} gameMsg The game message to send
 * @return {boolean} FALSE is an error occurs
 */
GameSocketManager.prototype.broadcast = function(gameMsg, from) {
	
	var client,
        smoothExec = true,
        from = from || gameMsg.from;

	for (client in this.clients) {
		if (this.clients.hasOwnProperty(client)) {
			if (client != from) {  // TODO: change back to '!==' once 'from' is string again
				// <!-- this.log.log(client + ' different ' + from); --!>
				gameMsg.to = client;
				smoothExec = smoothExec && this.send(gameMsg);
			}
		}
	}

    return smoothExec;
};


/**
 * ### GameMsgManager.forward
 * 
 * Low level primitive to forward messages
 * 
 * @param {GameMsg} gameMsg The game message to forward
 */
GameSocketManager.prototype.forward = function(gameMsg) {

    // <!--
    // Create a copy of the msg and prepare the attributes
    // var gameMsg = new GameMsg(gameMsg);
    // gameMsg.from = this.server.name;
    // --!>
    
    gameMsg.forward = 1;
    
    if (gameMsg.to === 'SERVER' || gameMsg === null || gameMsg.to === undefined) {
	gameMsg.to = 'ALL';
    }	
    
    this.server.partner.socket.send(gameMsg);

    this.msgLogger.log('F', gameMsg);
    this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' forwarded to ' + this.server.partner.name);
};


