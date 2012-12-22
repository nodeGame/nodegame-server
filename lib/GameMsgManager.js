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

var node = require('nodegame-client');

var GameState = node.GameState,
	GameMsg = node.GameMsg;

var action = node.action;



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
	
	this.sysLogger = server.sysLogger;
	this.msgLogger = server.msgLogger;
	
	this.gmg = this.generator = new GameMsgGenerator(this.session, server.name, new GameState());	// TODO: Check what is best to init
	
	this.socket_manager = this.server.socket_manager;
	
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
	this.socket_manager.send(gameMsg);
};


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
		this.sysLogger.log('Attempt to send HI to nobody');
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
 * @param {GameServer} server The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPLIST = function (server, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var plMsg = this.gmg.createPLIST(action.SAY, server.pl, to);
	this.send(plMsg);
};

/**
 * ### GameMsgManager.sendMLIST
 * 
 * Retrieves the monitor list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} server The player list container 
 * @param {string} to The recipient of the MLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.sendMLIST = function (server, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var mlMsg = this.gmg.createMLIST(action.SAY, server.pl, to);
	this.send(mlMsg);
};

/**
 * ### GameMsgManager.sendPCONNECT
 * 
 * Send a notification that a new client connected either 
 * to the specified recipient or to all connected clients
 * 
 * @param {Player} player The player client that just connected
 * @param {string} to The recipient of the PCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPCONNECT = function (player, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var pconnMsg = this.gmg.createPCONNECT(action.SAY, player, to);
	this.send(pconnMsg);
};

/**
 * ### GameMsgManager.sendPDISCONNECT
 * 
 * Send a notification that a client disconnected either 
 * to the specified recipient or to all connected clients
 * 
 * @param {Player} player The player client that just disconnected
 * @param {string} to The recipient of the PDISCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendPDISCONNECT = function (player, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var pdisconnMsg = this.gmg.createPDISCONNECT(action.SAY, player, to);
	this.send(pdisconnMsg);
};


/**
 * ### GameMsgManager.sendMCONNECT
 * 
 * Send a notification that a new monitor client connected either 
 * to the specified recipient or to all connected clients
 * 
 * @param {Player} monitor The monitor client that just connected
 * @param {string} to The recipient of the MCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendMCONNECT = function (monitor, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var mconnMsg = this.gmg.createMCONNECT(action.SAY, monitor, to);
	this.send(mconnMsg);
};

/**
 * ### GameMsgManager.sendMDISCONNECT
 * 
 * Send a notification that a monitor client disconnected either 
 * to the specified recipient or to all connected clients
 * 
 * @param {Player} monitor The monitor client that just disconnected
 * @param {string} to The recipient of the MDISCONNECT msg. Defaults 'ALL'
 */
GameMsgManager.prototype.sendMDISCONNECT = function (monitor, to) {
	to = to || 'ALL';
	// TODO: set/get/say choose carefully
	var mdisconnMsg = this.gmg.createMDISCONNECT(action.SAY, monitor, to);
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
 * ### GameMsgManager.broadcast
 * 
 * Broadcasts a game message to all the clients connected
 * 
 * @param {GameMsg} gameMsg The game message to send
 */
GameMsgManager.prototype.broadcast = function (gameMsg, from) {
	this.socket_manager.broadcast(gameMsg, from);
};

// ### Forwarding messages
// The following methods send messages to the clients connected to the 
// partner server.


/**
 * ### GameMsgManager.forwardHI
 * 
 * Creates and sends an HI message to the given recipient in the partner server
 * 
 * @param {string} text A text associated to the HI message
 * @param {string} to The recipient of the HI message
 */
GameMsgManager.prototype.forwardHI = function (text, to) {
	if (!to) {
		this.log.log('Attempt to forward HI to nobody');
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
 * @param {GameServer} server The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.forwardPLIST = function (server, to) {
	to = to || 'ALL';
	var plMsg = this.gmg.sayPLIST(server.pl, to);
	this.forward(plMsg);
};

/**
 * ### GameMsgManager.forwardPDISCONNECT
 * 
 * Retrieves the player list from the specified GameServer object and
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} server The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.forwardPDISCONNECT = function (player, to) {
	to = to || 'ALL';
	var msg = this.gmg.createPDISCONNECT(action.SAY, player, to);
	this.forward(msg);
};

/**
 * ### GameMsgManager.forwardPCONNECT
 * 
 * Sends 
 * sends it either to the specified recipient or to all connected clients
 * 
 * @param {GameServer} server The player list container 
 * @param {string} to The recipient of the PLIST. Defaults 'ALL'
 */
GameMsgManager.prototype.forwardPCONNECT = function (player, to) {
	to = to || 'ALL';
	var msg = this.gmg.createPCONNECT(action.SAY, player, to);
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
	// gameMsg.from = this.server.name;
	// --!>
	
	gameMsg.forward = 1;
	
	if (gameMsg.to === 'SERVER' || gameMsg === null || gameMsg.to === undefined) {
		gameMsg.to = 'ALL';
	}	
	
	this.server.partner.msg.send(gameMsg);

	this.msgLogger.log('F', gameMsg);
	this.sysLogger.log('Msg ' + gameMsg.toSMS() + ' forwarded to ' + this.server.partner.name);
};
