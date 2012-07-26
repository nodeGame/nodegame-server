/**
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * GameServer for the players endpoint.
 * 
 * Inherits from `GameServer` and attaches special listeners.
 * 
 * PlayerServer passes the id of the sender when forwarding msgs
 * 
 */

module.exports = PlayerServer;

var util 			= require('util'),
	EventEmitter 	= require('events').EventEmitter;

var ServerLog 		= require('./ServerLog'),
	GameServer 		= require('./GameServer'),
	GameMsgManager 	= require('./GameMsgManager');


var GameState 	= require('nodegame-client').GameState,
	GameMsg 	= require('nodegame-client').GameMsg,
	PlayerList	= require('nodegame-client').PlayerList,
	Player 		= require('nodegame-client').Player;

PlayerServer.prototype.__proto__ = GameServer.prototype;
PlayerServer.prototype.constructor = PlayerServer;

/**
 * ## PlayerServer constructor
 *
 * Creates a new instance of PlayerServer
 * 
 * @param {object} options A configuration object 
 */
function PlayerServer(options) {
	GameServer.call(this, options);
}

/**
 * ## PlayerServer.attachCustomListeners
 * 
 * Implements the abstract method from `GameServer` with listeners
 * specific to the players endpoint
 * 
 */
PlayerServer.prototype.attachCustomListeners = function() {
	var that = this;
	var log = this.log;
	var say = GameMsg.actions.SAY + '.';
	var set = GameMsg.actions.SET + '.';
	var get = GameMsg.actions.GET + '.'; 

// Listener on newly connected players	
    this.on(say + 'HI', function(msg) {
    	
		log.log('Incoming player: ' + msg.from);
    	that.pl.add(msg.data);
    	
        // <!-- TODO: check if we need to do it -->
        // Send the list of players to all the clients
    	that.gmm.sendPLIST(that); 
    	
    	// Send the current player list to monitors
        that.gmm.forwardPLIST(that);
	});
    
// Listener on reconnecting players    
    this.on(say + 'HI_AGAIN', function(msg) {
    	
		log.log('Returning PLAYER: ' + msg.from);
		var player = that.disconnected.pop(msg.data.id);
				
		if (player) {
			
			// Update the socket id with the old id
			that.socket.id = player.id;

			// <!-- TODO: check if we need to do it -->
			// Send the list of players to all the clients
	    	that.gmm.sendPLIST(that); 
	    	
	    	// Send PL to monitors
	        that.gmm.forwardPLIST(that);
		}
		else {
			log.log('Received HI_AGAIN message, but player was not in the disconnected list: ' + msg.from);
		}
		
	});

// Listener on TXT messages	
    this.on(say + 'TXT', function(msg) {
		// <!-- TODO: maybe checked before? --!>
    	if (that.isValidRecipient(msg.to)){
			// <!-- that.gmm.send(msg); --!>
			that.gmm.broadcast(msg);
		}
	});

// Listener on say DATA messages			
    this.on(say + 'DATA', function(msg) {
		// <!-- TODO: maybe checked before? --!>
    	if (that.isValidRecipient(msg.to)){
			that.gmm.send(msg);
		}
	});
	
// Listener on set DATA messages
    this.on(set + 'DATA', function(msg) {
    	
		// Personal msg
		// TODO: maybe checked before?
    	if (that.isValidRecipient(msg.to)){
			that.gmm.send(msg);
		}
		else {
			
			// Creates a copy of monitors' memory object here
			// if a local memory object is present			
			if (that.partner.memory) {
				that.partner.memory.add(msg.text, msg.data, msg.from);
			}
			
			that.gmm.forward (msg);
		}
	});	
	
 
// Listener on STATE messages   
    this.on(say + 'STATE', function(msg) {
		
		if (that.pl.exist(msg.from)){
			// <!-- Do we need this? --!>
			that.pl.updatePlayerState(msg.from, msg.data);

			// TODO: if it is not send, the observer does not get informed
			// about change of state.
			// but a client get back its own msg too
			that.gmm.send(msg);
			// Should be:
			//that.gmm.broadcast(msg)
			
			// This may break things
			that.gmm.forward(msg);
			
			// TODO: re-enable this when the transition to pure STATE msgs is complete
			//that.gmm.sendPLIST(that);
			
			//that.gmm.forwardPLIST(that);
		}
	});	
    

    
    
// Listener on Get (Experimental)
    this.on(get + 'DATA', function (msg) {
    	//console.log(this.pl);
		//console.log('HERE P!!!');
		// Ask a random player to send the game;
		// var p = this.pl.getRandom();
		// that.gmm.sendDATA('get', 'ABC', msg.from, msg.txt);
	});
    
// Listener on player disconnects   
    this.on('closed', function(id) {
      	log.log(that.name + ' ----------------- Got Closed ' + id);
    	
      	// Should be already removed
      	//that.pl.remove(id);
      	
    	that.gmm.sendPLIST(that);
    	that.gmm.forwardPLIST(that);
    });
	
// Listener on server shutdown <!-- TODO: Check this --!>
	this.server.sockets.on("shutdown", function(message) {
		log.log("Server is shutting down.");
		that.pl.clear(true);
		that.gmm.sendPLIST(that);
		that.gmm.forwardPLIST(that);
		log.close();
	});
};
