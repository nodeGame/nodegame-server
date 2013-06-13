/**
 * # PlayerServer
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * GameServer for the players endpoint.
 * 
 * Inherits from `GameServer` and attaches special listeners.
 * 
 * PlayerServer passes the id of the sender when forwarding msgs
 * 
 * ---
 * 
 * Technical notes:
 * 
 * Forward must be done always after a SEND, because it can modifies the .to
 * and .forward properties of the message.
 * 
 * 
 */

// # Global scope

module.exports = PlayerServer;

var GameServer = require('./../GameServer');

var ngc = require('nodegame-client');

var PlayerList = ngc.PlayerList,
    Player = ngc.Player;

var action = ngc.action;

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
    
    this.notify = this.user_options.notifyPlayers || {};
    this.forwardAll = ('undefined' === typeof this.user_options.forwardAllMessages) ?
	true : this.user_options.forwardAllMessages;
	
}

// ## PlayerServer methods

/**
 * ### PlayerServer.attachCustomListeners
 * 
 * Implements the abstract method from `GameServer` with listeners
 * specific to the players endpoint
 * 
 */
PlayerServer.prototype.attachCustomListeners = function() {
    var that = this,
        sys = this.sysLogger,
        say = action.SAY + '.',
        set = action.SET + '.',	
        get = action.GET + '.';

// ## LISTENERS	
	
// ### say.HI 
// Listens on newly connected players	
    this.on(say + 'HI', function(msg) {
        var pConnectMsg;
        sys.log('Incoming player: ' + msg.from);
        pConnectMsg = that.msg.create({
            target: 'PCONNECT',
                    to: 'ALL',
                    data: msg.data
        });

        if (that.notify.onConnect) {
            // Notify all the  players that a new one just connected
            that.socket.broadcast(pConnectMsg, msg.from);
        }

        if (that.notify.onConnect) {
            // Send the list of connected players to the new player
            that.socket.send(that.msg.create({
                target: 'SETUP',
                to: msg.from,
                text: 'plist',
                data: [that.getPlayerList(), 'append']
            }));			
        }

        // Add the player to to the list
        that.pl.add(msg.data);

        // Send the list of connected players to the monitors
        that.socket.forward(pConnectMsg);

    });

// ### say.HI_AGAIN    
// Listens on reconnecting players    
    this.on(say + 'HI_AGAIN', function(msg) {
    	var player, pConnectMsg;
	sys.log('Returning PLAYER: ' + msg.from);
	player = that.disconnected.pop(msg.data.id);
				
	if (player) {			
	    // Update the socket id with the old id
	    that.socket.id = player.id;
	    
	    that.emit(say + 'HI', msg);
	}
	else {
	    sys.log('Received HI_AGAIN message, but player was not in the disconnected list: ' + msg.from);
	}
	
    });
    
// ### say.TXT    
// Listens on say.TXT messages	
    this.on(say + 'TXT', function(msg) {
	this.socket.broadcast(msg, msg.from);
	if (this.forwardAll) {
	    this.msg.forward(msg);
	}
    });

// ### say.DATA    
// Listens on say.DATA messages			
    this.on(say + 'DATA', function(msg) {
	this.socket.broadcast(msg, msg.from);
	if (this.forwardAll) {
	    this.msg.forward(msg);
	}
    });

// ### set.DATA    
// Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {

	// Creates a copy of monitors' memory object here
	// if a local memory object is present			
	if (that.partner.memory) {
	    that.partner.memory.add(msg.text, msg.data, msg.from);
	}
	that.socket.forward(msg);
	
    });	
	


// ### say.STAGE
// Listens on say.STAGE messages
    this.on(say + 'STAGE', function(msg) {

        if (that.pl.exist(msg.from)){
            // <!-- Do we need this? --!>
            that.pl.updatePlayerStage(msg.from, msg.data);

            // TODO: if it is not send, the observer does not get informed
            // about change of stage.
            // but a client get back its own msg too

            if (that.notify.onStageUpdate) {
                that.socket.broadcast(msg, msg.from);
            }

            // Should be:
            //that.msg.broadcast(msg)

            // This may break things
            that.socket.forward(msg);
        }
    });

// ### say.STAGE_LEVEL
// Listens on say.STAGE_LEVEL messages
    this.on(say + 'STAGE_LEVEL', function(msg) {

        if (that.pl.exist(msg.from)){
            that.pl.updatePlayerStageLevel(msg.from, msg.data);

            // TODO: if it is not send, the observer does not get informed
            // about change of stage.
            // but a client get back its own msg too

            msg.to = 'ALL';

            if (that.notify.onStageLevelUpdate) {
		that.socket.broadcast(msg, msg.from)
		// Ste 9.6.2013: was
                //that.msg.send(msg);
            }

            that.socket.forward(msg);
        }
    });

// ### get.DATA    
// Listener on get (Experimental)
    this.on(get + 'DATA', function (msg) {

    	//console.log(this.pl);
		//console.log('HERE P!!!');
		// Ask a random player to send the game;
		// var p = this.pl.getRandom();
		// that.msg.sendDATA('get', 'ABC', msg.from, msg.txt);

    });

// ### closed    
// Listens on players disconnecting   
    this.on('disconnect', function (player) {
	var msg;
      	sys.log(that.name + ' Disconnected: ' + player.id);

    	msg = that.msg.create({
	    target: 'PDISCONNECT',
	    to: 'ALL',
	    data: player
	});

      	if (that.notify.onConnect) {
      	    that.socket.send(msg);
      	}
 
    	that.socket.forward(msg);
    });

// ### shutdown    
// Listens on server shutdown
    this.sio.sockets.on("shutdown", function(message) {
	sys.log('Player server ' + that.name + ' is shutting down');
	// TODO save the state to disk
    });
};

