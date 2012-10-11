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

var util = require('util');

var GameMsgGenerator = require('./GameMsgGenerator');

var GameState = require('nodegame-client').GameState,
	GameMsg = require('nodegame-client').GameMsg;

var logger;

/**
 * ## GameMsgManager Constructor
 * 
 * Creates an instance of GameMsgManager.
 * 
 * @param {GameServer} node A GameServer instance
 */
function GameMsgManager(node) {
	
	this.name = node.name || 'GenericSender';
	this.session = Math.floor(Math.random()*10000);
	this.currentState =  node.currentState || new GameState(); // TODO: Check what is best to init
	
	this.node = node;
	this.server = node.server;
	this.socket = node.socket;
	
	logger = this.log = node.log;
	
	this.gmg = new GameMsgGenerator(this.session,this.name,this.currentState);	// TODO: Check what is best to init
}

// ## METHODS

/**
 * ### GameMsgManager.sendHI
 * 
 * Creates and send an HI message to the given recipient
 * 
 * @param {string} text A text associated to the HI message
 * @param {string} to The recipient of the HI message
 */
GameMsgManager.prototype.sendHI = function (text, to) {
	if (!to) {
		logger.log('Attempt to send HI to nobody');
		return;
	}
	var msg = this.gmg.createHI(text,to);
	this.send(msg); 
};

/**
 * ### GameMsgManager.sendTXT
 * 
 * Creates and send a TXT message to the given recipient
 * 
 * @param {string} text A The text of the message
 * @param {string} to The recipient of the TXT message
 */
GameMsgManager.prototype.sendTXT = function (text,to) {
	// <!-- TODO: to = to || 'ALL'; --!>
	var msg = this.gmg.createTXT(text,to);
	this.send(msg); 
};

/**
 * ### GameMsgManager.sendPLIST
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} node The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPLIST = function (node, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var plMsg = this.gmg.createPLIST(GameMsg.actions.SAY, node.pl, to);
	this.send(plMsg);
};

/**
 * ### GameMsgManager.sendPCONNECT
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {Player} player The player client that just connected
 * @param {string} to The recipient of the PCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPCONNECT = function (player, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var pconnMsg = this.gmg.createPCONNECT(GameMsg.actions.SAY, player, to);
	this.send(pconnMsg);
};

/**
 * ### GameMsgManager.sendPDISCONNECT
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {Player} player The player client that just disconnected
 * @param {string} to The recipient of the PDISCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPDISCONNECT = function (player, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var pdisconnMsg = this.gmg.createPDISCONNECT(GameMsg.actions.SAY, player, to);
	this.send(pdisconnMsg);
};


/**
 * ### GameMsgManager.sendMCONNECT
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {Player} monitor The monitor client that just connected
 * @param {string} to The recipient of the MCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPCONNECT = function (monitor, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var mconnMsg = this.gmg.createMCONNECT(GameMsg.actions.SAY, monitor, to);
	this.send(mconnMsg);
};

/**
 * ### GameMsgManager.sendMDISCONNECT
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {Player} monitor The monitor client that just disconnected
 * @param {string} to The recipient of the MDISCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPDISCONNECT = function (monitor, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var mdisconnMsg = this.gmg.createMDISCONNECT(GameMsg.actions.SAY, monitor, to);
	this.send(mdisconnMsg);
};



/**
 * ### GameMsgManager.sendSTATE
 * 
 * Creates a STATE message consistent with input parameters and sends it
 * either to the specified recipient or to 'ALL'
 * 
 * @param {string} action The action type associated to the message (set/get/say)
 * @param {GameState} state The state to send 
 * @param {string} to The recipient of the STATE message. Defaults 'ALL'
 */
GameMsgManager.prototype.sendSTATE = function (action, state, to) {
	to = to || 'ALL';
	// <!-- TODO: set/get/say choose carefully --!>
	var stateMsg = this.gmg.createSTATE(action, state, to);
	this.send(stateMsg);
};

/**
 * ### GameMsgManager.sendDATA
 * 
 * Creates a DATA message consistent with input parameters and sends it
 * either to the specified recipient or to 'ALL'
 * 
 * @param {string} action The action type associated to the message (set/get/say)
 * @param {object|string} data The data to transfer
 * @param {string} to The recipient of the DATA message. Defaults 'ALL'
 * @param {string} text A text associated to the DATA message
 */
GameMsgManager.prototype.sendDATA = function (action, data, to, text) {
	to = to || 'ALL';
	var dataMsg = this.gmg.createDATA(action, data, to, text);
	this.send(dataMsg);
};

// <!--
//
//GameMsgManager.prototype.sendGAME = function (action, data, to, text) {
//	var to = to || 'ALL';
//	var gameMsg = this.gmg.createGAME(action, data, to, text);
//	this.send(dataMsg);
//};
// --!>

/**
 * ### GameMsgManager.send
 * 
 * Low level primitive to send a game message
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameMsgManager.prototype.send = function (gameMsg) {
	
	var to = gameMsg.to,
		rel = gameMsg.reliable,
		msg = gameMsg.stringify();
	
	if (to === 'SERVER' || to === null) {
		logger.log('Trying to send msg to nobody: ' + to, 'ERR');
		return false;
	}
	
	// Broadcast
	if (to === 'ALL') {
		if (rel) {
			this.node.channel.json.send(msg);
		} 
		else {
//			var v =  this.node.channel;
//			for (var i in v) {
//				if (v.hasOwnProperty(i)){
//					log(v[i]);
//				}
//			}
			this.node.channel.volatile.json.send(msg);
			//this.node.channel.broadcast.volatile.json.send(msg);
		}
		logger.log('Msg ' + gameMsg.toSMS() + ' broadcasted to ' + to);
		logger.msg('B, ' + gameMsg);
	}
	// Send to a specific client
	else {
		var client = this.node.channel.sockets[to]; 
		
		if (client) {
			if (rel) {
				client.json.send(msg);
			}
			else {
				client.volatile.json.send(msg);
			}
			logger.log('Msg ' + gameMsg.toSMS() + ' sent to ' + to);
			logger.msg('S, ' + gameMsg);
		}
		else {
			logger.log('Msg not sent. Unexisting recipient: ' + to, 'ERR');
		}
	}
};

/**
 * ### GameMsgManager.broadcast
 * 
 * Broadcasts a game message to all the clients connected
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameMsgManager.prototype.broadcast = function (gameMsg) {
	
	var from = gameMsg.from;

	for (var client in this.node.channel.sockets) {
		if (this.node.channel.sockets.hasOwnProperty(client)) { 
			if (client !== from) {
				// <!-- logger.log(client + ' different ' + from); --!>
				gameMsg.to = client;
				this.send(gameMsg);
			}
			// <!-- 
			//log(this.node.channel.sockets[client]);
			//this.node.channel.sockets[client].send(msg);
			// --!>
		}
	}
};

// ### Forwarding messages
// The following methods send messages to the clients connected to the 
// partner node.


/**
 * ### GameMsgManager.forwardHI
 * 
 * Creates and sends an HI message to the given recipient in the partner node
 * 
 * @param {string} text A text associated to the HI message
 * @param {string} to The recipient of the HI message
 */
GameMsgManager.prototype.forwardHI = function (text, to) {
	if (!to) {
		logger.log('Attempt to forward HI to nobody');
		return;
	}
		
	var msg = this.gmg.createHI(text,to);
	this.forward(msg); 
};

/**
 * ### GameMsgManager.forwardTXT
 * 
 * 
 * @param {string} text A text associated to the HI message
 * @param {string} to The recipient of the HI message
 */
GameMsgManager.prototype.forwardTXT = function (text, to) {
	var msg = this.gmg.createTXT(text,to);
	this.forward(msg); 
};

/**
 * ### GameMsgManager.forwardPLIST
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} node The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.forwardPLIST = function (node, to) {
	to = to || 'ALL';
	var plMsg = this.gmg.sayPLIST(node.pl, to);
	this.forward(plMsg);
};

/**
 * ### GameMsgManager.forwardPDISCONNECT
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} node The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.forwardPDISCONNECT = function (player, to) {
	to = to || 'ALL';
	var msg = this.gmg.createPDISCONNECT(GameMsg.actions.SAY, player, to);
	this.forward(msg);
};

/**
 * ### GameMsgManager.forwardPCONNECT
 * 
 * Sends 
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} node The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.forwardPCONNECT = function (player, to) {
	to = to || 'ALL';
	var msg = this.gmg.createPCONNECT(GameMsg.actions.SAY, player, to);
	this.forward(msg);
};


/**
 * ### GameMsgManager.forwardSTATE
 * 
 * Creates a STATE message consistent with input parameters and forwards it
 * either to the specified recipient or to 'ALL'
 * 
 * @param {string} action The action type associated to the message (set/get/say)
 * @param {GameState} state The state to send 
 * @param {string} to The recipient of the STATE message. Defaults 'ALL' 
 */
GameMsgManager.prototype.forwardSTATE = function (action, state, to) {
	to = to || 'ALL';
	var stateMsg = this.gmg.createSTATE(action, state, to);
	this.forward(stateMsg);
};

/**
 * ### GameMsgManager.forwardDATA
 * 
 * Creates a DATA message consistent with input parameters and sends it
 * either to the specified recipient or to 'ALL'
 * 
 * @param {string} action The action type associated to the message (set/get/say)
 * @param {object|string} data The data to transfer
 * @param {string} to The recipient of the DATA message. Defaults 'ALL'
 * @param {string} text A text associated to the DATA message
 */
GameMsgManager.prototype.forwardDATA = function (action, data, to, text) {
	to = to || 'ALL';
	var dataMsg = this.gmg.createDATA(action, data, to, text);
	this.forward(dataMsg);
};

/**
 * ### GameMsgManager.forward
 * 
 * Low level primitive to forward messages
 * 
 * @param {GameMsg} gameMsg The game message to forward
 */
GameMsgManager.prototype.forward = function (gameMsg) {

	// <!--
	// Create a copy of the msg and prepare the attributes
	// var gameMsg = new GameMsg(gameMsg);
	// gameMsg.from = this.node.name;
	// --!>
	
	gameMsg.forward = 1;
	
	if (gameMsg.to === 'SERVER' || gameMsg === null || gameMsg.to === undefined) {
		gameMsg.to = 'ALL';
	}	
	
	this.node.partner.gmm.send(gameMsg);

	logger.msg('F, ' + gameMsg);
	logger.log('Msg ' + gameMsg.toSMS() + ' forwarded to ' + this.node.partner.name);
};
