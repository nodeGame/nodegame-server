/**
 * # GameMsgGenerator
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Game messages generator
 * 
 * ---
 * 
 */

// ## Global scope

module.exports = GameMsgGenerator; 

var GameState 	= require('nodegame-client').GameState,
	GameMsg 	= require('nodegame-client').GameMsg,
	Player		= require('nodegame-client').Player
	J			= require('JSUS');

var SAY = GameMsg.actions.SAY,
	GET = GameMsg.actions.GET,
	SET = GameMsg.actions.SET;


function GameMsgGenerator (session,sender,state) {	
	this.session = session;
	this.sender = sender;
	this.state = state;
};

/**
 * ### GameMsgGenerator.create 
 * 
 * Primitive for creating any type of game-message
 * 
 * Merges a set of default settings with the object passed
 * as input parameter
 * 
 * 	@see JSUS.merge
 */
GameMsgGenerator.prototype.create = function (msg) {

  var base = {
		session: this.session, 
		state: this.state,
		action: GameMsg.actions.SAY,
		target: GameMsg.targets.DATA,
		from: this.sender,
		to: 'SERVER',
		text: null,
		data: null,
		priority: null,
		reliable: 1,
  };

  msg = J.merge(base, msg);
  return new GameMsg(msg);

};

// HI
GameMsgGenerator.prototype.createHI = function(text, to, reliable) {

	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
  
	return new GameMsg({
            			session: this.session,
            			state: this.state,
            			action: SAY,
            			target: GameMsg.targets.HI,
            			from: this.sender,
            			to: to,
            			text: text,
            			data: to,
            			priority: null,
            			reliable: reliable,
  });


};

// REDIRECT

GameMsgGenerator.prototype.sayREDIRECT = function (url, to, reliable) {
	return this.createREDIRECT(SAY, url, to, reliable);
};

GameMsgGenerator.prototype.createREDIRECT = function (action, url, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
		
	return new GameMsg({
						session: this.session,
						state: this.state,
						action: action,
						target: GameMsg.targets.REDIRECT,
						from: this.sender,
						to: to,
						text: 'Redirect',
						data: url,
						priority: null,
						reliable: reliable,
	});
};

// STATE

GameMsgGenerator.prototype.saySTATE = function (state, to, reliable) {
	return this.createSTATE(SAY, state, to,reliable);
};

GameMsgGenerator.prototype.setSTATE = function (state, to, reliable) {
	return this.createSTATE(SET, state, to,reliable);
};

GameMsgGenerator.prototype.getSTATE = function (state, to, reliable) {
	return this.createSTATE(GET, state, to,reliable);
};

GameMsgGenerator.prototype.createSTATE = function (action, state, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session,
						state: this.state,
						action: action,
						target: GameMsg.targets.STATE,
						from: this.sender,
						to: to,
						text: 'New State: ' + GameState.stringify(state),
						data: state,
						priority: null,
						reliable: reliable,
	});
};


// PLIST

GameMsgGenerator.prototype.sayPLIST = function (plist, to, reliable) {
	return this.createPLIST(SAY, plist, to,reliable);
};

GameMsgGenerator.prototype.setPLIST = function (plist, to, reliable) {
	return this.createPLIST(SET, plist, to,reliable);
};

GameMsgGenerator.prototype.getPLIST = function (plist, to, reliable) {
	return this.createPLIST(GET, plist, to, reliable);
};

GameMsgGenerator.prototype.createPLIST = function (action, plist, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.PLIST,
						from: this.sender,
						to: to,
						text: 'List of Players: ' + plist.length,
						data: plist.db,
						priority: null,
						reliable: reliable,
	});
};

// MLIST

GameMsgGenerator.prototype.sayMLIST = function (mlist, to, reliable) {
	return this.createMLIST(SAY, mlist, to,reliable);
};

GameMsgGenerator.prototype.setMLIST = function (mlist, to, reliable) {
	return this.createMLIST(SET, mlist, to,reliable);
};

GameMsgGenerator.prototype.getMLIST = function (mlist, to, reliable) {
	return this.createMLIST(GET, mlist, to, reliable);
};

GameMsgGenerator.prototype.createMLIST = function (action, mlist, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.MLIST,
						from: this.sender,
						to: to,
						text: 'List of Monitors: ' + mlist.length,
						data: mlist.db,
						priority: null,
						reliable: reliable,
	});
};


// PCONNECT


GameMsgGenerator.prototype.createPCONNECT = function (action, player, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.PCONNECT,
						from: this.sender,
						to: to,
						text: 'New player connected ' + new Player(player),
						data: player,
						priority: null,
						reliable: reliable,
	});
};

// PDISCONNECT

GameMsgGenerator.prototype.createPDISCONNECT = function (action, player, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.PDISCONNECT,
						from: this.sender,
						to: to,
						text: 'Player disconnected: ' + new Player(player),
						data: player,
						priority: null,
						reliable: reliable,
	});
};


// MCONNECT


GameMsgGenerator.prototype.createMCONNECT = function (action, player, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.MCONNECT,
						from: this.sender,
						to: to,
						text: 'New monitor connected: ' + new Player(player),
						data: player,
						priority: null,
						reliable: reliable,
	});
};

// MDISCONNECT

GameMsgGenerator.prototype.createMDISCONNECT = function (action, player, to, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.MDISCONNECT,
						from: this.sender,
						to: to,
						text: 'Monitor disconnected: ' + new Player(player),
						data: player,
						priority: null,
						reliable: reliable,
	});
};


// TXT

GameMsgGenerator.prototype.createTXT = function (text, to, reliable) {
	
	reliable = reliable || 0;
	
	return new GameMsg({
						session: this.session,
						state: this.state,
						action: SAY,
						target: GameMsg.targets.TXT,
						from: this.sender,
						to: to,
						text: text,
						data: null,
						priority: null,
						reliable: reliable,
	});
	
	
};

// DATA

GameMsgGenerator.prototype.sayDATA = function (data, to, text, reliable) {
	return this.createDATA(SAY, data, to, text, reliable);
};

GameMsgGenerator.prototype.setDATA = function (data, to, text, reliable) {
	return this.createDATA(SET, data, to, text, reliable);
};

GameMsgGenerator.prototype.getDATA = function (data, to, text, reliable) {
	return this.createDATA(GET, data, to, text, reliable);
};

GameMsgGenerator.prototype.createDATA = function (action, data, to, text, reliable) {
	
	reliable = ('undefined' !== typeof reliable) ? reliable : 1;
	text = text || 'data';
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.DATA,
						from: this.sender,
						to: to,
						text: text,
						data: data,
						priority: null,
						reliable: reliable,
	});
};

// ACK

GameMsgGenerator.prototype.createACK = function (gm, to, reliable) {
	
	reliable = reliable || 0;
	
	var newgm = new GameMsg({
							session: this.session, 
							state: this.state,
							action: SAY,
							target: GameMsg.targets.ACK,
							from: this.sender,
							to: to,
							text: 'Msg ' + gm.id + ' correctly received',
							data: gm.id,
							priority: null,
							reliable: reliable,
	});
	
	if (gm.forward) {
		newgm.forward = 1;
	}
	
	return newgm;
}; 
