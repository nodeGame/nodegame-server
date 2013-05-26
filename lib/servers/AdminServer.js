/**
 * # AdminServer
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * GameServer for the administrators endpoint.
 * 
 * Inherits from `GameServer` and attaches special listeners.
 * 
 * AdminServer hides the id of the sender when forwarding msgs
 * 
 * SET messages are ignored
 * 
 * ---
 * 
 */

// ## Global scope

module.exports = AdminServer;

var GameServer = require('./../GameServer'),
	GameMsgManager = require('./../GameMsgManager');


var node = require('nodegame-client');

var action =  node.action,
	target = node.target;

var PlayerList = node.PlayerList,
	Player = node.Player;

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
	GameServer.call(this, options);	
	// extra variables
	this.loop = null;
}

//## METHODS

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

/**
 * ## PlayerServer.attachCustomListeners
 * 
 * Implements the abstract method from `GameServer` with listeners
 * specific to the admin endpoint
 * 
 */
AdminServer.prototype.attachCustomListeners = function() {	
	var that = this,
		sys = this.sysLogger,
		say = action.SAY + '.',
		set = action.SET + '.',
		get = action.GET + '.'; 

// LISTENERS	
	
// ## say.HI	
// Listens on newly connected players		
	this.on(say + 'HI', function(msg) {
		
		sys.log('Incoming monitor: ' + msg.from);
		
		// Notify other monitors that a new one connected
		that.pl.each(function(p) {
			that.msg.sendMCONNECT(msg.data, p.id); // or sid?
		});
		
		// Add the player to to the list
		that.pl.add(msg.data);
				
		// Send the list of connected players to new monitor
		that.msg.sendPLIST(that.partner, msg.from);
		
		// Send the list of connected monitors to the new monitor
		that.msg.sendMLIST(that, msg.from);
		
	});

// ### say.TXT    
// Listens on say.TXT messages	
	this.on(say + 'TXT', function(msg) {
		if (that.isValidRecipient(msg.to)) {
			that.msg.forwardTXT (msg.text, msg.to);
			that.msg.sendTXT(msg.from + ' sent MSG to ' + msg.to, 'ALL');
		}
	});

// ### say.DATA    
// Listens on say.DATA messages	
	this.on(say + 'DATA', function(msg) { 
		if (that.isValidRecipient(msg.to)) {
			that.msg.forwardDATA (action.SAY, msg.data, msg.to, msg.text);
			
			// Just Added to inform other monitor / observers. TODO: Check! 
			that.msg.broadcast (msg, msg.from);			

			//that.msg.sendTXT(msg.from + ' sent DATA to ' + msg.to, 'ALL');
		}
	});

// ### set.DATA    
// Listens on set.DATA messages
	this.on(set + 'DATA', function (msg) {
	
		// Experimental
		if (msg.text === 'LOOP') {
			that.loop = msg.data;
		}
		
		
	});

//// ### say.STATE 
//// Listens on say.STATE messages 
//	this.on(say + 'STATE', function(msg) {
//		// Send it to players and other monitors
//		that.msg.forwardSTATE (action.SAY, msg.data, msg.to);
//		that.msg.broadcast(msg, msg.from);
//		//that.msg.sendSTATE (action.SAY,msg.data, msg.to);
//
//	});
//	
//	// Transform in say
//	this.on(set + 'STATE', function (msg){
//		//this.emit(say+'STATE', msg);
//	});

	
// ### say.STAGE 
// Listens on say.STATE messages 
	this.on(say + 'STAGE', function(msg) {
		// Send it to players and other monitors
		that.msg.forwardSTAGE (action.SAY, msg.data, msg.to);
		that.msg.broadcast(msg, msg.from);
	});
	
	// Transform in say
	this.on(set + 'STAGE', function (msg){
		//this.emit(say+'STATE', msg);
	});	
	
// ### get.DATA    
// Listener on get (Experimental)	
	this.on(get + 'DATA', function (msg) {
		
		// Ask a random player to send the game;
		var p = this.pl.getRandom();


		if (msg.text === 'LOOP') {
			that.msg.sendDATA(action.SAY, that.loop, msg.from, 'LOOP');
		}		
		
		else if (msg.text === 'INFO') {
			that.msg.sendDATA(action.SAY, that.generateInfo(), msg.from, 'INFO');
		}
		
	});
	
// ### say.REDIRECT	
// Forwards a redirect msg (only for admin)
	this.on(say + 'REDIRECT', function (msg) {
		// TODO refactor msg
		var msg = that.msg.gmg.sayREDIRECT(msg.data, msg.to);
		that.msg.forward(msg);
	});

// ### say.SETUP	
// Forwards a redirect msg (only for admin)
	this.on(say + 'SETUP', function (msg) {
		msg = that.msg.generator.obfuscate(msg);
		that.msg.forward(msg);
	});	
	
// ### say.SETUP	
// Forwards a gamecommand msg (only for admin)
	this.on(say + 'GAMECOMMAND', function (msg) {
		msg = that.msg.generator.obfuscate(msg);
		that.msg.forward(msg);
	});	
	
// ### closed    
// Listens on players disconnecting 	
    this.on('disconnect', function (monitor) {    	
    	// Notify other monitors that a monitor disconnected
		that.msg.sendMDISCONNECT(monitor);
    });
	
// ### shutdown    
// Listens on server shutdown
	this.sio.sockets.on("shutdown", function(message) {
		sys.log("Server is shutting down.");
		that.pl.clear(true);
		that.msg.sendPLIST(that);
		// <!-- that.msg.forwardPLIST(that); -->
	});
	
};
