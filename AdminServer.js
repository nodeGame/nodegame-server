/**
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * GameServer for the administrators endpoint.
 * 
 * Inherits from `GameServer` and attaches special listeners.
 * 
 * AdminServer hides the id of the sender when forwarding msgs
 * AdminServer transform all SET messages in SAY messages when forwarding them
 * 
 */
 
module.exports = AdminServer;

var util = require('util'),
	EventEmitter = require('events').EventEmitter;

var ServerLog = require('./ServerLog'),
	GameServer = require('./GameServer'),
	GameMsgManager = require('./GameMsgManager');


var Utils = require('nodegame-client').Utils,
	GameState = require('nodegame-client').GameState,
	GameMsg = require('nodegame-client').GameMsg;

var PlayerList = require('nodegame-client').PlayerList,
	Player = require('nodegame-client').Player;

AdminServer.prototype.__proto__ = GameServer.prototype;
AdminServer.prototype.constructor = AdminServer;

/**
 * ## AdminServer Constructor
 * 
 * Creates an instance of AdminServer
 * 
 * @param {object} options The configuration object
 */
function AdminServer(options) {
	GameServer.call(this,options);	
	// extra variables
	this.loop = null;
}

/**
 * ## PlayerServer.attachCustomListeners
 * 
 * Implements the abstract method from `GameServer` with listeners
 * specific to the admin endpoint
 * 
 */
AdminServer.prototype.attachCustomListeners = function() {	
	var that = this;
	var log = this.log;
	var say = GameMsg.actions.SAY + '.';
	var set = GameMsg.actions.SET + '.';
	var get = GameMsg.actions.GET + '.'; 

// Listener on newly connected players		
	this.on(say+'HI', function(msg) {
		
		log.log('Incoming admin: ' + msg.from);
		
		// Add the player to to the list
		that.pl.add(msg.data);
		// Tell everybody a new player is connected;
		var connected = new Player(msg.data) + ' connected.';
		this.gmm.sendTXT(connected,'ALL');
		
		// Send the list of connected players
		that.gmm.sendPLIST(that.partner, msg.from);
	});

// Listener on TXT messages	
	this.on(say+'TXT', function(msg) {
		if (that.isValidRecipient(msg.to)) {
			that.gmm.forwardTXT (msg.text, msg.to);
			that.gmm.sendTXT(msg.from + ' sent MSG to ' + msg.to, 'ALL');
		}
	});

// Listener on say DATA messages	
	this.on(say+'DATA', function(msg) { 
		if (that.isValidRecipient(msg.to)) {
			that.gmm.forwardDATA (GameMsg.actions.SAY, msg.data, msg.to, msg.text);
			
			// Just Added to inform other monitor / observers. TODO: Check! 
			that.gmm.broadcast (msg, msg.from);
			
			that.gmm.sendTXT(msg.from + ' sent DATA to ' + msg.to, 'ALL');
		}
	});

// Listener on set DATA messages
	this.on(set+'DATA', function (msg) {
	
		// Experimental
		if (msg.text === 'LOOP') {
			that.loop = msg.data;
		}
		
		
	});

// Listener on STATE messages   
	this.on(say+'STATE', function(msg){
		if (!that.checkSync) {
			that.gmm.sendTXT('**Not possible to change state: some players are not ready**', msg.from);
		}
		else {
			//that.log.log('----------------onSTATE.ADMIN: ' + util.inspect(msg));
			// Send it to players and other monitors
			that.gmm.forwardSTATE (GameMsg.actions.SAY,msg.data, msg.to);
			that.gmm.broadcast(msg, msg.from);
			//that.gmm.sendSTATE (GameMsg.actions.SAY,msg.data, msg.to);
		}
	});
	
	// Transform in say
	this.on(set+'STATE', function (msg){
		//this.emit(say+'STATE', msg);
	});


 // Listener on Get (Experimental)	
	this.on(get+'DATA', function (msg) {
		//console.log('HERE A!!!');
		
		// Ask a random player to send the game;
		var p = this.pl.getRandom();


		if (msg.text === 'LOOP') {
			that.gmm.sendDATA(GameMsg.actions.SAY, that.loop, msg.from, 'LOOP');
		}		
		
		if (msg.text === 'INFO') {
			that.gmm.sendDATA(GameMsg.actions.SAY, that.generateInfo(), msg.from, 'INFO');
		}
		
	});
	

	
	

	
	// <!-- TODO: Check if the methods for closed and shutdown (copied from PlayerServer) apply here --!>    
    this.on('closed', function(id) {
//      	log.log(that.name + ' ----------------- Got Closed ' + id);
//    	that.pl.remove(id);
    	// TODO: Check this. This influence the player list of observers!
    	//that.gmm.sendPLIST(that);
    	//that.gmm.forwardPLIST(that);
    });
	
	// <!-- TODO: Check this. This influence the player list of observers! --!>
	this.server.sockets.on("shutdown", function(message) {
		log.log("Server is shutting down.");
		that.pl.clear(true);
		that.gmm.sendPLIST(that);
		// <!-- that.gmm.forwardPLIST(that); -->
		log.close();
	});
	
};

/**
 * ## AdminServer.generateInfo
 * 
 * Creates an object containing general information (e.g. number of 
 * players, and admin connected), about the state of the GameServer
 * 
 * @return {object} info The info about the state of the GameServer
 */
AdminServer.prototype.generateInfo = function(){
	var info = {
				name: this.name,
				status: 'OK',
				nplayers: this.partner.pl.length,
				nadmins: this.pl.length,
	};
						
	return info;		
};
