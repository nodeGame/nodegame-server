/**
 * # nodeGame
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * ### nodeGame: Web Experiments in the Browser
 * 
 * nodeGame is a free, open source, event-driven javascript framework for on line, 
 * multiplayer games in the browser.
 * 
 * 
 */

(function (node) {

node.version = '0.7.5';

/**
 *  ## node.verbosity
 *  
 *  The minimum level for a log entry to be displayed as output.
 *   
 *  Defaults, only errors are displayed.
 *  
 */
node.verbosity = 0;
node.verbosity_levels = {
		// <!-- It is not really always... -->
		ALWAYS: -(Number.MIN_VALUE+1), 
		ERR: -1,
		WARN: 0,
		INFO: 1,
		DEBUG: 100
};

/**
 * ## node.log
 * 
 * Default nodeGame standard out, override to redirect
 * 
 * Default behavior is to output a text in the form: `nodeGame: some text`.
 * 
 * Logs entries are displayed only if their verbosity level is 
 * greater than `node.verbosity`
 * 
 * @param {string} txt The text to output
 * @param {string|number} level Optional. The verbosity level of this log. Defaults, level = 0
 * @param {string} prefix Optional. A text to display at the beginning of the log entry. Defaults prefix = 'nodeGame: ' 
 * 
 */
node.log = function (txt, level, prefix) {
	if ('undefined' === typeof txt) return false;
	
	level 	= level || 0;
	prefix 	= ('undefined' === typeof prefix) 	? 'nodeGame: '
												: prefix;
	if ('string' === typeof level) {
		level = node.verbosity_levels[level];
	}
	if (node.verbosity > level) {
		console.log(prefix + txt);
	}
};

// <!-- It will be overwritten later -->
node.game 		= {};
node.gsc 		= {};
node.session 	= {};
node.player 	= {};
node.memory 	= {};

// <!-- Load the auxiliary library if available in the browser -->
if ('undefined' !== typeof JSUS) node.JSUS = JSUS;
if ('undefined' !== typeof NDDB) node.NDDB = NDDB;
if ('undefined' !== typeof store) node.store = store;

// <!-- if node
if ('object' === typeof module && 'function' === typeof require) {
    require('./init.node.js');
    require('./nodeGame.js');
}
// end node -->
	
})('object' === typeof module ? module.exports : (window.node = {}));	
/**
 * # EventEmitter
 * 
 * Event emitter engine for `nodeGame`
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Keeps a register of events and function listeners.
 * 
 * ---
 *  
 */
(function (exports, node) {
		
// ## Global scope	
	
var NDDB = node.NDDB;

exports.EventEmitter = EventEmitter;

/**
 * ## EventEmitter constructor
 * 
 * Creates a new instance of EventEmitter
 */
function EventEmitter() {

// ## Public properties	
	
/**
 * ### EventEmitter._listeners
 * 
 * Global listeners always active during the game
 * 
 */	
    this._listeners = {};
    
 /**
  * ### EventEmitter._localListeners
  * 
  * Local listeners erased after every state update
  * 
  */   
    this._localListeners = {};

/**
 * ### EventEmitter.history
 * 
 * Database of emitted events
 * 
 * 	@see NDDB
 * 	@see EventEmitter.store
 * 
 */      
    this.history = new NDDB({
    	update: {
    		indexes: true,
    }});
    
    this.history.h('state', function(e) {
    	if (!e) return;
    	var state = ('object' === typeof e.state) ? e.state
    											  : node.game.state;
    	return node.GameState.toHash(state, 'S.s.r');
    });
 
/**
 * ### EventEmitter.store
 * 
 * If TRUE all emitted events are saved in the history database
 * 
 * 	@see EventEmitter.history
 */       
    this.store = true; // by default
}

// ## EventEmitter methods

EventEmitter.prototype = {

    constructor: EventEmitter,
	
/**
 * ### EventEmitter.addListener
 * 
 * Registers a global listener for an event
 * 
 * Listeners registered with this method are valid for the
 * whole length of the game
 * 
 * @param {string} type The event name
 * @param {function} listener The function to fire
 * 
 * @see EventEmitter.addLocalListener
 */
    addListener: function (type, listener) {
    	if (!type || !listener) return;
    	if ('undefined' === typeof this._listeners[type]){
    		this._listeners[type] = [];
    	}
        node.log('Added Listener: ' + type + ' ' + listener, 'DEBUG');
        this._listeners[type].push(listener);
    },
    
/**
 * ### EventEmitter.addLocalListener
 * 
 * Registers a local listener for an event
 * 
 * Listeners registered with this method are valid *only* 
 * for the same game state (step) in which they have been
 * registered 
 * 
 * @param {string} type The event name
 * @param {function} listener The function to fire
 * 
 * @see EventEmitter.addListener
 * 
 */
    addLocalListener: function (type, listener) {
    	if (!type || !listener) return;
    	if ('undefined' === typeof this._localListeners[type]){
            this._localListeners[type] = [];
        }
    	node.log('Added Local Listener: ' + type + ' ' + listener, 'DEBUG');
        this._localListeners[type].push(listener);
    },

/**
 * ### EventEmitter.emit
 * 
 * Fires all the listeners associated with an event
 * 
 * @param event {string|object} The event name or an object of the type
 * 
 * 		{ type: 'myEvent',
 * 		  target: this, } // optional
 * 
 * @param {object} p1 Optional. A parameter to be passed to the listener
 * @param {object} p2 Optional. A parameter to be passed to the listener
 * @param {object} p3 Optional. A parameter to be passed to the listener
 * 
 * @TODO accepts any number of parameters
 */
    emit: function(event, p1, p2, p3) { // Up to 3 parameters
    	if (!event) return;
    	
    	if ('string' === typeof event) {
            event = { type: event };
        }
        if (!event.target){
            event.target = this;
        }
        
        if (!event.type) {  //falsy
            throw new Error("Event object missing 'type' property.");
        }
    	// <!-- Debug
        // console.log('Fired ' + event.type); -->
        
        // Log the event into node.history object, if present
        if (this.store) {
        	var o = {
	        		event: event.type,
	        		//target: node.game,
	        		state: node.state,
	        		p1: p1,
	        		p2: p2,
	        		p3: p3,
	        	};
        	
        	this.history.insert(o);
        }
        
        
        // Fires global listeners
        if (this._listeners[event.type] instanceof Array) {
            var listeners = this._listeners[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
            	listeners[i].call(this.game, p1, p2, p3);
            }
        }
        
        // Fires local listeners
        if (this._localListeners[event.type] instanceof Array) {
            var listeners = this._localListeners[event.type];
            for (var i=0, len=listeners.length; i < len; i++) {
            	listeners[i].call(this.game, p1, p2, p3);
            }
        }
       
    },

/**
 * ### EventEmitter.removeListener
 * 
 * Deregister an event, or an event listener
 * 
 * @param {string} type The event name
 * @param {function} listener Optional. The specific function to deregister 
 * 
 * @return Boolean TRUE, if the removal is successful
 */
	removeListener: function(type, listener) {
	
		function removeFromList(type, listener, list) {
	    	//<!-- console.log('Trying to remove ' + type + ' ' + listener); -->
	    	
	        if (list[type] instanceof Array) {
	        	if (!listener) {
	        		delete list[type];
	        		//console.log('Removed listener ' + type);
	        		return true;
	        	}
	        	
	            var listeners = list[type];
	            var len=listeners.length;
	            for (var i=0; i < len; i++) {
	            	//console.log(listeners[i]);
	            	
	                if (listeners[i] == listener) {
	                    listeners.splice(i, 1);
	                    node.log('Removed listener ' + type + ' ' + listener, 'DEBUG');
	                    return true;
	                }
	            }
	        }
	        
	        return false;
		}
		
		var r1 = removeFromList(type, listener, this._listeners);
		var r2 = removeFromList(type, listener, this._localListeners);
	
		return r1 || r2;
	},
    
/**
 * ### EventEmitter.clearState
 * 
 * Undocumented (for now)
 * 
 * @TODO: This method wraps up clearLocalListeners. To re-design.
 */ 
	clearState: function(state) {
		this.clearLocalListeners();
		return true;
	},
    
/**
 * ### EventEmitter.clearLocalListeners
 * 
 * Removes all entries from the local listeners register
 * 
 */
	clearLocalListeners: function() {
		node.log('Cleaning Local Listeners', 'DEBUG');
		for (var key in this._localListeners) {
			if (this._localListeners.hasOwnProperty(key)) {
				this.removeListener(key, this._localListeners[key]);
			}
		}
		
		this._localListeners = {};
	},
    
/**
 * ### EventEmitter.printAllListeners
 * 
 * Prints to console all the registered functions 
 */
	printAllListeners: function() {
		node.log('nodeGame:\tPRINTING ALL LISTENERS', 'DEBUG');
	    
		for (var i in this._listeners){
	    	if (this._listeners.hasOwnProperty(i)){
	    		console.log(i + ' ' + i.length);
	    	}
	    }
		
		for (var i in this._localListeners){
	    	if (this._listeners.hasOwnProperty(i)){
	    		console.log(i + ' ' + i.length);
	    	}
	    }
	    
}
};

/**
 * # Listener
 * 
 * Undocumented (for now)
 */

function Listener (o) {
	var o = o || {};
	
	// event name
	this.event = o.event; 					
	
	// callback function
	this.listener = o.listener; 			
	
	// events with higher priority are executed first
	this.priority = o.priority || 0; 	
	
	// the state in which the listener is
	// allowed to be executed
	this.state = o.state || node.state || undefined; 	
	
	// for how many extra steps is the event 
	// still valid. -1 = always valid
	this.ttl = ('undefined' !== typeof o.ttl) ? o.ttl : -1; 
	
	// function will be called with
	// target as 'this'		
	this.target = o.target || undefined;	
};
	 
// ## Closure

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameState
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Representation of the state of a game: 
 * 
 * 	`state`: the higher-level building blocks of a game
 * 	`step`: the sub-unit of a state
 * 	`round`: the number of repetition for a state. Defaults round = 1
 * 	`is`: the *load-lavel* of the game as expressed in `GameState.iss`
 * 	`paused`: TRUE if the game is paused
 * 
 * 
 * @see GameLoop
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
var JSUS = node.JSUS;

// Expose constructor
exports.GameState = GameState;

/**
 * ### GameState.iss
 *  
 * Numeric representation of the state of the nodeGame engine 
 * the game
 *  
 */
GameState.iss = {};
GameState.iss.UNKNOWN = 0; 		// Game has not been initialized
GameState.iss.LOADING = 10;		// The game is loading
GameState.iss.LOADED  = 25;		// Game is loaded, but the GameWindow could still require some time
GameState.iss.PLAYING = 50;		// Everything is ready
GameState.iss.DONE = 100;		// The player completed the game state

GameState.defaults = {};

/**
 * ### GameState.defaults.hash
 * 
 * Default hash string for game-states
 * 
 * 	@see GameState.toHash
 */
GameState.defaults.hash = 'S.s.r.i.p';

/**
 * ## GameState constructor
 * 
 * Creates an instance of a GameState 
 * 
 * It accepts an object literal or an hash string as defined in `GameState.defaults.hash`.
 * 
 * If no parameter is passed, all the properties of the GameState 
 * object are set to 0
 * 
 * @param {object|string} gs An object literal | hash string representing the game state
 * 
 * 	@see GameState.defaults.hash 
 */
function GameState (gs) {

// ## Public properties	

/**
 * ### GameState.state
 * 
 * The N-th game-block (state) in the game-loop currently being executed
 * 
 * 	@see GameLoop
 * 
 */	
	this.state = 	0;

/**
 * ### GameState.step
 * 
 * The N-th game-block (step) nested in the current state
 * 
 * 	@see GameState.state
 * 
 */	
	this.step = 	0;

/**
 * ### GameState.round
 * 
 * The number of times the current state was repeated 
 * 
 */		
	this.round = 	0;
	
/**
 * ### GameState.is
 * 
 * 
 * 
 * 	@see GameState.iss
 * 
 */		
	this.is = 		GameState.iss.UNKNOWN;
	
/**
 * ### GameState.paused
 * 
 * TRUE if the game is paused
 * 
 */		
	this.paused = 	false;
	
	if ('string' === typeof gs) {
		var tokens = gs.split('.');		
		this.state = 	('undefined' !== typeof tokens[0]) ? Number(tokens[0]) : undefined;
		this.step = 	('undefined' !== typeof tokens[1]) ? Number(tokens[1]) : undefined;
		this.round = 	('undefined' !== typeof tokens[2]) ? Number(tokens[2]) : undefined;
		this.is = 		('undefined' !== typeof tokens[3]) ? Number(tokens[3]) : GameState.iss.UNKNOWN;
		this.paused = 	(tokens[4] === '1') ? true : false;
	}
	else if ('object' === typeof gs) {	
		this.state = 	gs.state;
		this.step = 	gs.step;
		this.round = 	gs.round;
		this.is = 		(gs.is) ? gs.is : GameState.iss.UNKNOWN;
		this.paused = 	(gs.paused) ? gs.paused : false;
	}
	
}

/**
 * ## GameState.toString
 * 
 * Converts the current instance of GameState to a string
 * 
 * @return {string} out The string representation of the state of the GameState
 */
GameState.prototype.toString = function () {
	var out = this.toHash('(r) S.s');
	if (this.paused) {
		out += ' [P]';
	}
	return out;
};

/**
 * ## GameState.toHash
 * 
 * Returns a simplified hash of the state of the GameState,
 * according to the input string
 * 
 * @param {string} str The hash code
 * @return {string} hash The hashed game states
 * 
 * @see GameState.toHash (static)
 */
GameState.prototype.toHash = function (str) {
	return GameState.toHash(this, str);
};

/**
 * ## GameState.toHash (static)
 * 
 * Returns a simplified hash of the state of the GameState,
 * according to the input string. 
 * 
 * The following characters are valid to determine the hash string
 * 
 * 	- S: state
 * 	- s: step
 * 	- r: round
 * 	- i: is
 * 	- P: paused
 * 
 * E.g. 
 * 
 * ```javascript
 * 		var gs = new GameState({
 * 							round: 1,
 * 							state: 2,
 * 							step: 1,
 * 							is: 50,
 * 							paused: false,
 * 		});
 * 
 * 		gs.toHash('(R) S.s'); // (1) 2.1
 * ```
 * 
 * @param {GameState} gs The game state to hash
 * @param {string} str The hash code
 * @return {string} hash The hashed game states
 */
GameState.toHash = function (gs, str) {
	if (!gs || 'object' !== typeof gs) return false;
	if (!str || !str.length) return gs.toString();
	
	var hash = '',
		symbols = 'Ssrip',
		properties = ['state', 'step', 'round', 'is', 'paused'];
	
	for (var i = 0; i < str.length; i++) {
		var idx = symbols.indexOf(str[i]); 
		hash += (idx < 0) ? str[i] : Number(gs[properties[idx]]);
	}
	return hash;
};

/**
 * ## GameState.compare (static)
 * 
 * Compares two GameState objects|hash strings and returns
 * 
 *  - 0 if they represent the same game state
 *  - a positive number if gs1 is ahead of gs2 
 *  - a negative number if gs2 is ahead of gs1 
 * 
 * If the strict parameter is set, also the `is` property is compared,
 * otherwise only `round`, `state`, and `step`
 * 
 * The accepted hash string format is the following: 'S.s.r.i.p'.
 * Refer to `GameState.toHash` for the semantic of the characters.
 * 
 * 
 * @param {GameState|string} gs1 The first GameState object|string to compare
 * @param {GameState|string} gs2 The second GameState object|string to compare
 * @param {Boolean} strict If TRUE, also the `is` attribute is checked
 * 
 * @return {Number} result The result of the comparison
 * 
 * @see GameState.toHash (static)
 * 
 */
GameState.compare = function (gs1, gs2, strict) {
	if (!gs1 && !gs2) return 0;
	if (!gs2) return 1;
	if (!gs1) return -1;

	strict = strict || false;

	// Convert the parameters to objects, if an hash string was passed
	if ('string' === typeof gs1) gs1 = new GameState(gs1);
	if ('string' === typeof gs2) gs2 = new GameState(gs2);
	
	
	// <!--		
	//		console.log('COMPARAING GSs','DEBUG')
	//		console.log(gs1,'DEBUG');
	//		console.log(gs2,'DEBUG');
	// -->
	var result = gs1.state - gs2.state;
	
	if (result === 0 && 'undefined' !== typeof gs1.round) {
		result = gs1.round - gs2.round;
		
		if (result === 0 && 'undefined' !== typeof gs1.step) {
			result = gs1.step - gs2.step;
			
			if (strict && result === 0 && 'undefined' !== typeof gs1.is) {
				result = gs1.is - gs2.is;
			}
		}
	}
	
	
//	<!-- console.log('EQUAL? ' + result); -->

	
	return result;
};

/**
 * ## GameState.stringify (static)
 * 
 * Converts an object GameState-like to its string representation
 * 
 * @param {GameState} gs The object to convert to string	
 * @return {string} out The string representation of a GameState object
 */ 
GameState.stringify = function (gs) {
	if (!gs) return;
	var out = new GameState(gs).toHash('(r) S.s_i');
	if (gs.paused) out += ' [P]';
	return out;
}; 

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # PlayerList
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Stores a collection of `Player` objects and offers methods
 * to perform operation on them
 * 
 * ---
 * 
 */

(function (exports, node) {


// ## Global scope
	
// Setting up global scope variables 
var	JSUS = node.JSUS,
	NDDB = node.NDDB;

var GameState = node.GameState;

// Exposing constructor
exports.PlayerList = PlayerList;

// Inheriting from NDDB	
PlayerList.prototype = JSUS.clone(NDDB.prototype);
PlayerList.prototype.constructor = PlayerList;


/**
 * ## PlayerList.array2Groups (static)
 * 
 * Transforms an array of array (of players) into an
 * array of PlayerList instances and returns it.
 * 
 * The original array is modified.
 * 
 * @param {Array} array The array to transform
 * @return {Array} array The array of `PlayerList` objects
 * 
 */
PlayerList.array2Groups = function (array) {
	if (!array) return;
	for (var i = 0; i < array.length; i++) {
		array[i] = new PlayerList({}, array[i]);
	};
	return array;
};

/**
 * ## PlayerList constructor
 *
 * Creates an instance of PlayerList.
 * 
 * The instance inherits from NDDB, an contains an internal 
 * database for storing the players 
 * 
 * @param {object} options Optional. Configuration options for the instance
 * @param {object} db Optional. An initial set of players to import 
 * @param {PlayerList} parent Optional. A parent object for the instance
 * 
 * @api public
 * 
 * 		@see NDDB constructor
 */

function PlayerList (options, db, parent) {
	options = options || {};
	if (!options.log) options.log = node.log;
	NDDB.call(this, options, db, parent);
  
	this.globalCompare = function (pl1, pl2) {
	  
		if (pl1.id === pl2.id) {
			return 0;
		}
		else if (pl1.count < pl2.count) {
			return 1;
		}
		else if (pl1.count > pl2.count) {
			return -1;
		}
		else {
			node.log('Two players with different id have the same count number', 'WARN');
			return 0;
		}
	};
};

// ## PlayerList methods

/**
 * ### PlayerList.add 
 * 
 * Adds a new player to the database
 * 
 * Before insertion, objects are checked to be valid `Player` objects.
 * 
 * @param {Player} player The player object to add to the database
 * @return {Boolean} TRUE, if the insertion was successful
 * 
 */
PlayerList.prototype.add = function (player) {
	// <!-- Check if the object contains the minimum requisite to act as Player -->
	if (!player || !player.sid || !player.id) {
		node.log('Only instance of Player objects can be added to a PlayerList', 'ERR');
		return false;
	}

	// <!-- Check if the id is unique -->
	if (this.exist(player.id)) {
		node.log('Attempt to add a new player already in the player list: ' + player.id, 'ERR');
		return false;
	}
	
	this.insert(player);
	player.count = player.nddbid;
	
	return true;
};

/**
 * ### PlayerList.remove
 * 
 * Removes a player from the database based on its id
 * 
 * If no id is passed, removes all currently selected 
 * players
 * 
 * Notice: this operation cannot be undone
 * 
 * @param {number} id The id of the player to remove
 * @return {Boolean} TRUE, if a player is found and removed successfully 
 * 
 * 		@see `PlayerList.pop`
 * 
 */
PlayerList.prototype.remove = function (id) {
	if (!id) {
		// fallback on NDDB.remove
		return NDDB.prototype.remove.call(this);
	}
		
	var p = this.select('id', '=', id);
	if (p.length) {
		p.remove();
		return true;
	}

	node.log('Attempt to remove a non-existing player from the the player list. id: ' + id, 'ERR');
	return false;
};

/**
 * ### PlayerList.get 
 * 
 * Retrieves a player with a given id and returns it
 * 
 * Displays a warning if more than one player is found with the same id
 * 
 * @param {number} id The id of the player to retrieve
 * @return {Player|Boolean} The player with the speficied id, or FALSE if no player was found
 * 
 * 		@see `PlayerList.pop`	
 * 
 */
PlayerList.prototype.get = function (id) {	
	if (!id) return false;
	
	var p = this.select('id', '=', id);
	
	if (p.count() > 0) {
		if (p.count() > 1) {
			node.log('More than one player found with id: ' + id, 'WARN');
			return p.fetch();
		}
		return p.first();
	}
	
	node.log('Attempt to access a non-existing player from the the player list. id: ' + id, 'ERR');
	return false;
};

/**
 * ### PlayerList.pop 
 * 
 * Retrieves a player with a given id, removes it from the database,
 * and returns it
 * 
 * Displays a warning if more than one player is found with the same id
 * 
 * @param {number} id The id of the player to retrieve
 * @return {Player|Boolean} The player with the speficied id, or FALSE if no player was found  
 * 
 * 		@see `PlayerList.remove`
 */
PlayerList.prototype.pop = function (id) {	
	if (!id) return false;
	
	var p = this.get(id);
	
	// <!-- can be either a Player object or an array of Players -->
	if ('object' === typeof p) {
		this.remove(id);
		return p;
	}
	
	return false;
};

/**
 * ### PlayerLIst.getAllIDs
 * 
 * Fetches all the id of the players in the database and
 * returns them into an array
 * 
 * @return {Array} The array of id of players
 * 
 */
PlayerList.prototype.getAllIDs = function () {	
	return this.map(function(o){return o.id;});
};

/**
 * ### PlayerList.updatePlayerState
 * 
 * Updates the value of the `state` object of a player in the database
 * 
 * @param {number} id The id of the player to update
 * @param {GameState} state The new value of the state property
 * @return {Boolean} TRUE, if update is successful
 * 
 */
PlayerList.prototype.updatePlayerState = function (id, state) {
	
	if (!this.exist(id)) {
		node.log('Attempt to access a non-existing player from the the player list ' + player.id, 'WARN');
		return false;	
	}
	
	if ('undefined' === typeof state) {
		node.log('Attempt to assign to a player an undefined state', 'WARN');
		return false;
	}
	
	this.select('id', '=', id).first().state = state;	

	return true;
};

/**
 * ### PlayerList.exist
 * 
 * Checks whether at least one player with a given player exists
 * 
 * @param {number} id The id of the player
 * @return {Boolean} TRUE, if a player with the specified id was found
 */
PlayerList.prototype.exist = function (id) {
	return (this.select('id', '=', id).count() > 0) ? true : false;
};

/**
 * ### PlayerList.isStateDone
 * 
 * Checks whether all players in the database are DONE
 * for the specified `GameState`.
 * 
 * @param {GameState} state Optional. The GameState to check. Defaults state = node.state
 * @param {Boolean} extended Optional. If TRUE, also newly connected players are checked. Defaults, FALSE
 * @return {Boolean} TRUE, if all the players are DONE with the specified `GameState`
 * 
 * 		@see `PlayerList.actives`
 * 		@see `PlayerList.checkState`
 */
PlayerList.prototype.isStateDone = function (state, extended) {
	
	// <!-- console.log('1--- ' + state); -->
	state = state || node.state;
	// <!-- console.log('2--- ' + state); -->
	extended = extended || false;
	
	var result = this.map(function(p){
		var gs = new GameState(p.state);
		// <!-- console.log('Going to compare ' + gs + ' and ' + state); -->
		
		// Player is done for his state
		if (p.state.is !== GameState.iss.DONE) {
			return 0;
		}
		// The state of the player is actually the one we are interested in
		if (GameState.compare(state, p.state, false) !== 0) {
			return 0;
		}
		
		return 1;
	});
	
	var i;
	var sum = 0;
	for (i=0; i<result.length;i++) {
		sum = sum + Number(result[i]);
	}
	
	var total = (extended) ? this.length : this.actives(); 
// <!--
//		console.log('ISDONE??')
//		console.log(total + ' ' + sum);
// -->	
	return (sum === total) ? true : false;
};

/**
 * ### PlayerList.actives
 * 
 * Counts the number of player whose state is different from 0:0:0
 * 
 * @return {number} result The number of player whose state is different from 0:0:0
 * 
 */
PlayerList.prototype.actives = function () {
	var result = 0;
	var gs;
	this.each(function(p) {
		gs = new GameState(p.state);	
		// <!-- Player is on 0.0.0 state -->
		if (GameState.compare(gs, new GameState()) !== 0) {
			result++;
		}
	});	
	// <!-- node.log('ACTIVES: ' + result); -->
	return result;
};

/**
 * ### PlayerList.checkState
 * 
 * If all the players are DONE with the specfied state,
 * emits a `STATEDONE` event
 * 
 * @param {GameState} state Optional. The GameState to check. Defaults state = node.state
 * @param {Boolean} extended Optional. If TRUE, also newly connected players are checked. Defaults, FALSE
 * 
 * 		@see `PlayerList.actives`
 * 		@see `PlayerList.isStateDone`
 * 
 */
PlayerList.prototype.checkState = function (state, extended) {
	if (this.isStateDone(state, extended)) {
		node.emit('STATEDONE');
	}
};

/**
 * ### PlayerList.toString
 * 
 * Returns a string representation of the state of the 
 * PlayerList
 * 
 * @param {string} eol Optional. End of line separator between players
 * @return {string} out The string representation of the state of the PlayerList
 */
PlayerList.prototype.toString = function (eol) {
	
	var out = '';
	var EOL = eol || '\n';
	
	this.forEach(function(p) {
    	out += p.id + ': ' + p.name;
    	var state = new GameState(p.state);
    	out += ': ' + state + EOL;
	});
	return out;
};

/**
 * ### PlayerList.getNGroups
 * 
 * Creates N random groups of players
 * 
 * @param {number} N The number of groups
 * @return {Array} Array containing N `PlayerList` objects 
 * 
 * 		@see `JSUS.getNGroups`
 */
PlayerList.prototype.getNGroups = function (N) {
	if (!N) return;
	var groups = JSUS.getNGroups(this.db, N);
	return PlayerList.array2Groups(groups);
};	

/**
 * ### PlayerList.getGroupsSizeN
 * 
 * Creates random groups of N players
 * 
 * @param {number} N The number player per group
 * @return {Array} Array containing N `PlayerList` objects 
 * 
 * 		@see `JSUS.getGroupsSizeN`
 */
PlayerList.prototype.getGroupsSizeN = function (N) {
	if (!N) return;
	var groups = JSUS.getGroupsSizeN(this.db, N);
	return PlayerList.array2Groups(groups);
};	

/**
 * ### PlayerList.getRandom
 * 
 * Returns a set of N random players 
 * 
 * @param {number} N The number of random players to include in the set. Defaults N = 1
 * @return {Player|Array} A single player object or an array of
 */
PlayerList.prototype.getRandom = function (N) {	
	if (!N) N = 1;
	if (N < 1) {
		node.log('N must be an integer >= 1', 'ERR');
		return false;
	}
	this.shuffle();
	
	if (N == 1) {
		return this.first();
	}
	
	return this.limit(N).fetch();
};

/**
 * # Player Class
 * 
 * A Player object is a wrapper object for a number of properties 
 * to associate to a player during the game. 
 * 
 * Some of the properties are `private` and can never be changed 
 * after an instance of a Player has been created. Defaults one are:
 * 
 * 	`sid`: The Socket.io session id associated to the player
 * 	`id`: The nodeGame session id associate to the player
 * 	`count`: The id of the player within a PlayerList object
 * 
 * Others properties are public and can be changed during the game.
 * 
 *	`name`: An alphanumeric name associated to the player 
 *	`state`: The current state of the player as relative to a game
 *	`ip`: The ip address of the player
 * 
 * All the additional properties in the configuration object passed 
 * to the constructor are also created as *private* and cannot be further
 * modified during the game. 
 * 
 * For security reasons, non-default properties cannot be `function`, and 
 * cannot overwrite any previously existing property.
 * 
 * ---
 * 
 */


// Expose Player constructor
exports.Player = Player;

/**
 * ## Player constructor
 * 
 * Creates an instance of Player
 * 
 * @param {object} pl The object literal representing the player
 * 
 * 
 */
function Player (pl) {
	pl = pl || {};
	
// ## Private properties
	
/**
 * ### Player.sid
 * 
 * The session id received from the nodeGame server 
 * 
 */	
	var sid = pl.sid;
	Object.defineProperty(this, 'sid', {
		value: sid,
    	enumerable: true,
	});
	
/**
 * ### Player.id
 * 
 * The nodeGame session id associate to the player 
 * 
 * Usually it is the same as the Socket.io id, but in 
 * case of reconnections it can change
 * 
 */	
	var id = pl.id || sid;
	Object.defineProperty(this, 'id', {
		value: id,
    	enumerable: true,
	});
	
/**
 * ### Player.count
 * 
 * The ordinal position of the player in a PlayerList object
 * 
 * 	@see PlayerList
 */		
	var count = pl.count;
	Object.defineProperty(this, 'count', {
    	value: count,
    	enumerable: true,
	});
	
// ## Player public properties

/**
 * ### Player.ip
 * 
 * The ip address of the player
 * 
 * Note: this can change in mobile networks
 * 
 */		
 	this.ip = pl.ip;
 
/**
 * ### Player.name
 * 
 * An alphanumeric name associated with the player
 * 
 */	 
	this.name = pl.name;
	
/**
 * ### Player.state
 * 
 * Reference to the game-state the player currently is
 * 
 * 	@see node.game.state
 * 	@see GameState
 */		
	this.state = pl.state || new GameState();

	
// ## Extra properties
// Non-default properties are all added as private
// For security reasons, they cannot be of type function, and they 
// cannot overwrite any previously defined variable
	for (var key in pl) {
		if (pl.hasOwnProperty(key)) {
			if ('function' !== typeof pl[key]) {
				if (!this.hasOwnProperty(key)) {
					this[key] = pl[key];
				}
			}
		}
	}
}

// ## Player methods

/**
 * ### Player.toString
 * 
 * Returns a string representation of a player
 * 
 * @return {string} The string representation of a player
 */
Player.prototype.toString = function() {
	return this.name + ' (' + this.id + ') ' + new GameState(this.state);
};
		
// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameMsg
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` exchangeable data format
 * 
 * ---
 */
(function (exports, node) {

// ## Global scope	
var GameState = node.GameState,
	JSUS = node.JSUS;

exports.GameMsg = GameMsg;

/**
 * ### GameMsg.actions
 * 
 * Collection of available nodeGame actions
 * 
 * The action adds an initial semantic meaning to the
 * message. It specify the nature of requests
 * "Why the message was sent?"
 * 
 */
GameMsg.actions = {};

GameMsg.actions.SET 		= 'set'; 	// Changes properties of the receiver
GameMsg.actions.GET 		= 'get'; 	// Ask a properties of the receiver
GameMsg.actions.SAY			= 'say'; 	// Announce properties of the sender

/**
 * ### GameMsg.targets
 * 
 * Collection of available nodeGame targets
 * 
 * The target adds an additional level of semantic 
 * for the message, and specifies the nature of the
 * information carried in the message. 
 * 
 * It answers the question: "What is the content of the message?" 
 */
GameMsg.targets = {};
GameMsg.targets.HI			= 'HI';		// Introduction
GameMsg.targets.HI_AGAIN	= 'HI_AGAIN'; // CLient reconnects
GameMsg.targets.STATE		= 'STATE';	// STATE
GameMsg.targets.PLIST 		= 'PLIST';	// PLIST
GameMsg.targets.TXT 		= 'TXT';	// Text msg
GameMsg.targets.DATA		= 'DATA';	// Contains a data-structure in the data field

GameMsg.targets.REDIRECT	= 'REDIRECT'; // redirect a client to a new address

GameMsg.targets.ACK			= 'ACK';	// A reliable msg was received correctly

GameMsg.targets.WARN 		= 'WARN';	// To do.
GameMsg.targets.ERR			= 'ERR';	// To do.

GameMsg.IN					= 'in.';	// Prefix for incoming msgs
GameMsg.OUT					= 'out.';	// Prefix for outgoing msgs


/**
 * ### GameMSg.clone (static)
 * 
 * Returns a perfect copy of a game-message
 * 
 * @param {GameMsg} gameMsg The message to clone
 * @return {GameMsg} The cloned messaged
 * 
 * 	@see JSUS.clone
 */
GameMsg.clone = function (gameMsg) {	
	return new GameMsg(gameMsg);
};


/**
 * ## GameMsg constructor
 * 
 * Creates an instance of GameMsg
 */
function GameMsg (gm) {
	gm = gm || {};
	
// ## Private properties

/**
 * ### GameMsg.id
 * 
 * A randomly generated unique id
 * 
 * @api private
 */	
	var id = gm.id || Math.floor(Math.random()*1000000);
	Object.defineProperty(this, 'id', {
		value: id,
		enumerable: true,
	});

/**
 * ### GameMsg.session
 * 
 * The session id in which the message was generated
 * 
 * @api private
 */	
	var session = gm.session;
	Object.defineProperty(this, 'session', {
		value: session,
		enumerable: true,
	});

// ## Public properties	

/**
 * ### GameMsg.state
 * 
 * The game-state in which the message was generated
 * 
 * 	@see GameState
 */	
	this.state = gm.state;

/**
 * ### GameMsg.action
 * 
 * The action of the message
 * 
 * 	@see GameMsg.actions
 */		
	this.action = gm.action;
	
/**
 * ### GameMsg.target
 * 
 * The target of the message
 * 
 * 	@see GameMsg.targets
 */	
	this.target = gm.target;
	
/**
 * ### GameMsg.from
 * 
 * The id of the sender of the message
 * 
 * 	@see Player.id
 */		
	this.from = gm.from;

/**
 * ### GameMsg.to
 * 
 * The id of the receiver of the message
 * 
 * 	@see Player.id
 * 	@see node.player.id
 */		
	this.to = gm.to;

/**
 * ### GameMsg.text
 * 
 * An optional text adding a description for the message
 */		
	this.text = gm.text; 
	
/**
 * ### GameMsg.data
 * 
 * An optional payload field for the message
 */			
	this.data = gm.data;
	
/**
 * ### GameMsg.priority
 * 
 * A priority index associated to the message
 */	
	this.priority = gm.priority;
	
/**
 * ### GameMsg.reliable
 * 
 * Experimental. Disabled for the moment
 * 
 * If set, requires ackwnoledgment of delivery
 * 
 */	
	this.reliable = gm.reliable;

/**
 * ### GameMsg.created
 * 
 * A timestamp of the date of creation
 */		
	this.created = JSUS.getDate();
	
/**
 * ### GameMsg.forward
 * 
 * If TRUE, the message is a forward. 
 * 
 * E.g. between nodeGame servers
 */	
	this.forward = 0;
};

/**
 * ### GameMsg.stringify
 * 
 * Calls JSON.stringify on the message
 * 
 * @return {string} The stringified game-message
 * 
 * 	@see GameMsg.toString
 */
GameMsg.prototype.stringify = function () {
	return JSON.stringify(this);
};


/**
 * ### GameMsg.toString
 * 
 * Creates a human readable string representation of the message
 * 
 * @return {string} The string representation of the message
 * 	@see GameMsg.stringify
 */
GameMsg.prototype.toString = function () {
	
	var SPT = ",\t";
	var SPTend = "\n";
	var DLM = "\"";
	
	var gs = new GameState(this.state);
	
	var line = this.created + SPT;
		line += this.id + SPT;
		line += this.session + SPT;
		line += this.action + SPT;
		line += this.target + SPT;
		line +=	this.from + SPT;
		line += this.to + SPT;
		line += DLM + this.text + DLM + SPT;
		line += DLM + this.data + DLM + SPT; // maybe to remove
		line += this.reliable + SPT;
		line += this.priority + SPTend;
		
	return line;
};

/**
 * ### GameMSg.toSMS
 * 
 * Creates a compact visualization of the most important properties
 * 
 * @return {string} A compact string representing the message 
 * 
 * @TODO: Create an hash method as for GameState
 */
GameMsg.prototype.toSMS = function () {
	
	var parseDate = /\w+/; // Select the second word;
	var results = parseDate.exec(this.created);

	var line = '[' + this.from + ']->[' + this.to + ']\t';
	line += '|' + this.action + '.' + this.target + '|'+ '\t';
	line += ' ' + this.text + ' ';
	
	return line;
};

/**
 * ### GameMsg.toInEvent
 * 
 * Hashes the action and target properties of an incoming message
 * 
 * @return {string} The hash string
 * 	@see GameMsg.toEvent 
 */
GameMsg.prototype.toInEvent = function() {
	return 'in.' + this.toEvent();
};

/**
 * ### GameMsg.toOutEvent
 * 
 * Hashes the action and target properties of an outgoing message
 * 
 * @return {string} The hash string
 *  @see GameMsg.toEvent
 */
GameMsg.prototype.toOutEvent = function() {
	return 'out.' + this.toEvent();
};

/**
 * ### GameMsg.toEvent
 * 
 * Hashes the action and target properties of the message
 * 
 * @return {string} The hash string
 */
GameMsg.prototype.toEvent = function () {
	return this.action + '.' + this.target;
}; 

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameLoop
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` container of game-state functions, and parameters
 * 
 * ---
 * 
 */
(function (exports, node) {
	
// ## Global scope
var GameState = node.GameState,
	JSUS = node.JSUS;

exports.GameLoop = GameLoop;

/**
 * ### limits
 * 
 * Array containing the boundary limits of the game-loop
 * 
 * @api private
 */
var limits = [];

/**
 * ## GameLoop constructor
 * 
 * Creates a new instance of GameLoop
 * 
 * Takes as input parameter an object like
 * 
 *	{ 1:
 *		{
 *			state: myFunc,
 *			rounds: numRounds, // optional, defaults 1
 *		},
 *	 2:
 *		{
 *			state: myNestedState,
 *			rounds: numRounds, // optional, defaults 1
 *		},	
 * 		// any arbitray number of state-objects is allowed
 * 	}
 * 
 * From the above example, the value of the `state` property 
 * can be a function or a nested state object (with internal steps). 
 * For example
 * 
 * 	myFunc = function() {};
 * 
 * 	myNestedState = {
 * 			1: {
 * 				state: myFunc2,
 * 			}
 * 			2: {
 * 				state: myFunc3,
 * 			}
 * 	}
 * 
 * @param {object} loop Optional. An object containing the loop functions
 * 
 */
function GameLoop (loop) {
	// ### Public variables
	
/**
 * ### GameLoop.loop
 * 
 * The transformed loop container
 */
	this.loop = loop || {};

	for (var key in this.loop) {
		if (this.loop.hasOwnProperty(key)) {
			
			// Transform the loop obj if necessary.
			// When a state executes only one step,
			// it is allowed to pass directly the name of the function.
			// So such function must be incapsulated in a obj here.
			var loop = this.loop[key].state;
			if ('function' === typeof loop) {
				var o = JSUS.clone(this.loop[key]);
				this.loop[key].state = {1: o};
			}
			
			var steps = JSUS.size(this.loop[key].state)
			
			var round = this.loop[key].rounds || 1;
			limits.push({rounds: round, steps: steps});
		}
	}
	
/**
 * ### GameLoop.length
 * 
 * The total number of states + steps in the game-loop
 */
	Object.defineProperty(this, 'length', {
    	set: function(){},
    	get: function(){
    		return this.steps2Go(new GameState());
    	},
    	configurable: true
	});	
}

// ## GameLoop methods

/**
 * ### GameLoop.exist
 * 
 * Returns TRUE, if a gameState exists in the game-loop
 * 
 * @param {GameState} gameState The game-state to check
 */
GameLoop.prototype.exist = function (gameState) {
	if (!gameState) return false;
	gameState = new GameState(gameState);
	
	if (typeof(this.loop[gameState.state]) === 'undefined') {
		node.log('Unexisting state: ' + gameState.state, 'WARN');
		return false;
	}
	
	if (typeof(this.loop[gameState.state]['state'][gameState.step]) === 'undefined'){
		node.log('Unexisting step: ' + gameState.step, 'WARN');
		return false;
	}
	// States are 1 based, arrays are 0-based => -1
	if (gameState.round > limits[gameState.state-1]['rounds']) {
		node.log('Unexisting round: ' + gameState.round + 'Max round: ' + limits[gameState.state]['rounds'], 'WARN');
		return false;
	}
		
	return true;
};

/**
 * ### GameLoop.next
 * 
 * Returns the next state in the loop
 * 
 * An optional input parameter can control the state from which 
 * to compute the next state
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.state
 * @return {GameState|boolean} The next game-state, or FALSE if it does not exist
 * 
 */
GameLoop.prototype.next = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.state;
	
	// Game has not started yet, do it!
	if (gameState.state === 0) {
		return new GameState({
							 state: 1,
							 step: 1,
							 round: 1
		});
	}
	
	if (!this.exist(gameState)) {
		node.log('No next state of non-existing state: ' + gameState, 'WARN');
		return false;
	}
	
	var idxLimit = Number(gameState.state)-1; // 0 vs 1 based
	
	if (limits[idxLimit]['steps'] > gameState.step){
		var newStep = Number(gameState.step)+1;
		return new GameState({
			state: gameState.state,
			step: newStep,
			round: gameState.round
		});
	}
	
	if (limits[idxLimit]['rounds'] > gameState.round){
		var newRound = Number(gameState.round)+1;
		return new GameState({
			state: gameState.state,
			step: 1,
			round: newRound
		});
	}
	
	if (limits.length > gameState.state){		
		var newState = Number(gameState.state)+1;
		return new GameState({
			state: newState,
			step: 1,
			round: 1
		});
	}
	
	// No next state: game over
	return false; 
};

/**
 * ### GameLoop.previous
 * 
 * Returns the previous state in the loop
 * 
 * An optional input parameter can control the state from which 
 * to compute the previous state
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.state
 * @return {GameState|boolean} The previous game-state, or FALSE if it does not exist
 */
GameLoop.prototype.previous = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.state;
	
	if (!this.exist(gameState)) {
		node.log('No previous state of non-existing state: ' + gameState, 'WARN');
	}
	
	var idxLimit = Number(gameState.state)-1; // 0 vs 1 based
	
	if (gameState.step > 1){
		var oldStep = Number(gameState.step)-1;
		return new GameState({
			state: gameState.state,
			step: oldStep,
			round: gameState.round
		});
	}
	else if (gameState.round > 1){
		var oldRound = Number(gameState.round)-1;
		var oldStep = limits[idxLimit]['steps'];
		return new GameState({
			state: gameState.state,
			step: oldStep,
			round: oldRound
		});
	}
	else if (gameState.state > 1){
		var oldRound = limits[idxLimit-1]['rounds'];
		var oldStep = limits[idxLimit-1]['steps'];
		var oldState = idxLimit;
		return new GameState({
			state: oldState,
			step: oldStep,
			round: oldRound
		});
	}
	
	// game init
	return false; 
};

/**
 * ### GameLoop.getName
 * 
 * Returns the name associated with a game-state
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.state
 * @return {string|boolean} The name of the game-state, or FALSE if state does not exists
 */
GameLoop.prototype.getName = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.state;
	if (!this.exist(gameState)) return false;
	return this.loop[gameState.state]['state'][gameState.step]['name'];
};

/**
 * ### GameLoop.getFunction
 * 
 * Returns the function associated with a game-state
 * 
 * @param {GameState} gameState The reference game-state
 * @return {object|boolean} The function of the game-state, or FALSE if state does not exists
 */
GameLoop.prototype.getFunction = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.state;
	if (!this.exist(gameState)) return false;
	return this.loop[gameState.state]['state'][gameState.step]['state'];
};

/**
 * ### GameLoop.getAllParams
 * 
 * Returns all the parameters associated with a game-state
 * 
 * @param {GameState} gameState The reference game-state
 * @return {object|boolean} The state object, or FALSE if state does not exists
 */
GameLoop.prototype.getAllParams = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.state;
	if (!this.exist(gameState)) return false;
	return this.loop[gameState.state]['state'][gameState.step];
};

/**
 * ### GameLoop.jumpTo
 * 
 * Returns a state N steps away from the reference state
 * 
 * A negative value for N jumps backward in the game-loop, 
 * and a positive one jumps forward in the game-loop
 * 
 * @param {GameState} gameState The reference game-state
 * @param {number} N The number of steps to jump
 * @return {GameState|boolean} The "jumped-to" game-state, or FALSE if it does not exist
 */
GameLoop.prototype.jumpTo = function (gameState, N) {
	if (!this.exist(gameState)) return false;
	if (!N) return gameState;
	
	var func = (N > 0) ? this.next : this.previous;
	
	for (var i=0; i < Math.abs(N); i++) {
		gameState = func.call(this, gameState);
		if (!gameState) return false;
	}
	return gameState;
};

/**
 * ### GameLoop.steps2Go
 * 
 * Computes the total number steps left to the end of the game.
 * 
 * An optional input parameter can control the starting state
 * for the computation
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.state
 * @return {number} The total number of steps left
 */
GameLoop.prototype.steps2Go = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.state;
	var count = 0;
	while (gameState) { 
		count++;
		gameState = this.next(gameState);
	}
	return count;
};

GameLoop.prototype.toArray = function() {
	var state = new GameState();
	var out = [];
	while (state) { 
		out.push(state.toString());
		var state = this.next(state);
	}
	return out;
};

/**
 * 
 * ### GameLoop.indexOf
 * 
 * Returns the ordinal position of a state in the game-loop 
 * 
 * All steps and rounds in between are counted.
 * 
 * @param {GameState} gameState The reference game-state
 * @return {number} The state index in the loop, or -1 if it does not exist
 * 
 * 	@see GameLoop.diff
 */
GameLoop.prototype.indexOf = function (state) {
	if (!state) return -1;
	return this.diff(state, new GameState());
};

/**
 * ### GameLoop.diff
 * 
 * Returns the distance in steps between two states in the game-loop 
 * 
 * All steps and rounds in between are counted.
 * 
 * It works under the assumption that state1 comes first than state2
 * in the game-loop.
 * 
 * @param {GameState} state1 The reference game-state
 * @param {GameState} state2 Optional. The second state for comparison. Defaults node.state
 * 
 * @return {number} The state index in the loop, or -1 if it does not exist
 * 
 * @TODO: compute also negative distances
 */
GameLoop.prototype.diff = function (state1, state2) {
	if (!state1) return false;
	state1 = new GameState(state1) ;
	
	if (!state2) {
		if (!node.state) return false;
		state2 = node.state
	}
	else {
		state2 = new GameState(state2) ;
	}
	
	
	var idx = 0;
	while (state2) {
		if (GameState.compare(state1, state2) === 0){
			return idx;
		}
		state2 = this.next(state2);
		idx++;
	}
	return -1;
};
	
// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameMsgGenerator
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` component rensponsible creating messages 
 * 
 * Static factory of objects of type `GameMsg`.
 * 
 * All message are reliable, but TXT messages.
 * 
 * 	@see GameMSg
 * 	@see GameMsg.targets
 * 	@see GameMsg.actions
 * 
 * ---
 *
 */
(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameState = node.GameState,
	Player = node.Player,
	JSUS = node.JSUS;

exports.GameMsgGenerator = GameMsgGenerator; 

/**
 * ## GameMsgGenerator constructor
 * 
 * Creates an instance of GameMSgGenerator
 * 
 */
function GameMsgGenerator () {}

// ## General methods

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
GameMsgGenerator.create = function (msg) {

  var base = {
		session: node.gsc.session, 
		state: node.state,
		action: GameMsg.actions.SAY,
		target: GameMsg.targets.DATA,
		from: node.player.sid,
		to: 'SERVER',
		text: null,
		data: null,
		priority: null,
		reliable: 1,
  };

  msg = JSUS.merge(base, msg);
  return new GameMsg(msg);

};

//## HI messages

/**
 * ### GameMSgGenerator.createHI
 * 
 * Notice: this is different from the server;
 * 
 * @param {Player} player The player to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createHI = function (player, to, reliable) {
	player = player || node.player;
	if (!player) return false;
	reliable = reliable || 1;
  
	return new GameMsg( {
            			session: node.gsc.session,
            			state: node.state,
            			action: GameMsg.actions.SAY,
            			target: GameMsg.targets.HI,
            			from: node.player.sid,
            			to: to,
            			text: new Player(player) + ' ready.',
            			data: player,
            			priority: null,
            			reliable: reliable,
	});
};

// ## STATE messages

/**
 * ### GameMSgGenerator.saySTATE
 * 
 * Creates a say.STATE message
 * 
 * Notice: state is different from node.state
 * 
 * @param {GameState} state The game-state to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 */
GameMsgGenerator.saySTATE = function (state, to, reliable) {
	return this.createSTATE(GameMsg.SAY, state, to, reliable);
};

/**
 * ### GameMSgGenerator.setSTATE
 * 
 * Creates a set.STATE message
 * 
 * @param {GameState} state The game-state to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 */
GameMsgGenerator.setSTATE = function (state, to, reliable) {
	return this.createSTATE(GameMsg.SET, state, to, reliable);
};

/**
 * ### GameMSgGenerator.getSTATE
 * 
 * Experimental. Creates a get.STATE message
 * 
 * @param {GameState} state The game-state to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 */
GameMsgGenerator.getSTATE = function (state, to, reliable) {
	return this.createSTATE(GameMsg.GET, state, to,reliable);
};

/**
 * ### GameMSgGenerator.createSTATE
 * 
 * Creates a STATE message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {GameState} state The game-state to communicate
 * @param {string} to Optional. The recipient of the message. Defaults, SERVER
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 * 	@see GameMsg.actions
 */
GameMsgGenerator.createSTATE = function (action, state, to, reliable) {
	if (!action || !state) return false;
	to = to || 'SERVER';
	reliable = reliable || 1;
	return new GameMsg({
						session: node.gsc.session,
						state: node.state,
						action: action,
						target: GameMsg.targets.STATE,
						from: node.player.sid,
						to: to,
						text: 'New State: ' + GameState.stringify(state),
						data: state,
						priority: null,
						reliable: reliable
	});
};

//## PLIST messages

/**
 * ### GameMSgGenerator.sayPLIST
 * 
 * Creates a say.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.sayPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.SAY, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.setPLIST
 * 
 * Creates a set.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.setPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.SET, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.getPLIST
 * 
 * Experimental. Creates a get.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.getPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.GET, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.createPLIST
 * 
 * Creates a PLIST message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to Optional. The recipient of the message. Defaults, SERVER
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameMsg.actions
 *  @see PlayerList
 */
GameMsgGenerator.createPLIST = function (action, plist, to, reliable) {
	plist = plist || !node.game || node.game.pl;
	if (!action || !plist) return false;
	
	to = to || 'SERVER';
	reliable = reliable || 1;
	
	return new GameMsg({
						session: node.gsc.session, 
						state: node.state,
						action: action,
						target: GameMsg.targets.PLIST,
						from: node.player.sid,
						to: to,
						text: 'List of Players: ' + plist.length,
						data: plist.pl,
						priority: null,
						reliable: reliable,
	});
};

// ## TXT messages

/**
 * ### GameMSgGenerator.createTXT
 * 
 * Creates a say.TXT message
 * 
 * TXT messages are always of action 'say'
 * 
 * @param {string} text The text to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createTXT = function (text, to, reliable) {
	if (!text) return false;
	reliable = reliable || 0;
	
	return new GameMsg({
						session: node.gsc.session,
						state: node.state,
						action: GameMsg.actions.SAY,
						target: GameMsg.targets.TXT,
						from: node.player.sid,
						to: to,
						text: text,
						data: null,
						priority: null,
						reliable: reliable,
	});
};


// ## DATA messages

/**
 * ### GameMSgGenerator.sayDATA
 * 
 * Creates a say.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.sayDATA = function (data, to, text, reliable) {
	return this.createDATA(GameMsg.actions.SAY, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.setDATA
 * 
 * Creates a set.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.setDATA = function (data, to, text, reliable) {
	return this.createDATA(GameMsg.actions.SET, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.getDATA
 * 
 * Experimental. Creates a say.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.getDATA = function (data, to, text, reliable) {
	return this.createDATA(GameMsg.actions.GET, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.createDATA
 * 
 * Creates a DATA message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknoledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createDATA = function (action, data, to, text, reliable) {
	if (!action) return false;
	reliable = reliable || 1;
	text = text || 'data msg';
	
	return new GameMsg({
						session: node.gsc.session, 
						state: node.state,
						action: action,
						target: GameMsg.targets.DATA,
						from: node.player.sid,
						to: to,
						text: text,
						data: data,
						priority: null,
						reliable: reliable,
	});
};

// ## ACK messages

/**
 * ### GameMSgGenerator.setACK
 * 
 * Experimental. Undocumented (for now)
 * 
 */
GameMsgGenerator.createACK = function (gm, to, reliable) {
	if (!gm) return false;
	reliable = reliable || 0;
	
	var newgm = new GameMsg({
							session: node.gsc.session, 
							state: node.state,
							action: GameMsg.actions.SAY,
							target: GameMsg.targets.ACK,
							from: node.player.sid,
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


// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameSocketClient
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` component rensponsible for dispatching events and messages 
 * 
 * ---
 * 
 */

(function (exports, node, io) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameState = node.GameState,
	Player = node.Player,
	GameMsgGenerator = node.GameMsgGenerator;

var buffer,
	session;
	

exports.GameSocketClient = GameSocketClient;

/**
 * ## GameSocketClient constructor
 * 
 * Creates a new instance of GameSocketClient
 * 
 * @param {object} options Optional. A configuration object
 */
function GameSocketClient (options) {
	options = options || {};
	
// ## Private properties
	
/**
 * ### GameSocketClient.buffer
 * 
 * Buffer of queued messages 
 * 
 * @api private
 */ 
	buffer = [];
	Object.defineProperty(this, 'buffer', {
		value: buffer,
		enumerable: true,
	});
	
/**
 * ### GameSocketClient.session
 * 
 * The session id shared with the server
 * 
 * This property is initialized only when a game starts
 * 
 */
	session = null;
	Object.defineProperty(this, 'session', {
		value: session,
		enumerable: true,
	});
	
// ## Public properties
	
/**
 * ### GameSocketClient.io
 * 
 * 
 */	
	this.io 		= null;
/**
 * ### GameSocketClient.url
 * 
 */		
	this.url 		= null;
	
/**
 * ### GameSocketClient.servername
 * 
 */	
	this.servername = null;

}

// ## GameSocketClient methods

/**
 * ### GameSocketClient.getSession
 * 
 * Searches the node.session object for a saved session matching the passed 
 * game-message
 * 
 * If found, the session object will have the following a structure
 * 
 *	var session = {
 * 		id: 	node.gsc.session,
 * 		player: node.player,
 * 		memory: node.game.memory,
 * 		state: 	node.game.state,
 * 		game: 	node.game.name,
 * 		history: undefined,
 * 	};	
 * 
 * 
 * @param {GameMsg} msg A game-msg
 * @return {object|boolean} A session object, or FALSE if not was not found
 * 
 * 	@see node.session
 */
GameSocketClient.prototype.getSession = function (msg) {
	if (!msg) return false;
	
	var session = false;
	if ('function' === typeof node.session)	{
		session = node.session(msg.session);
	}
	
	// TODO: check if session is still valid
	return (session) ? session : false;
};

/**
 * ### GameSocketClient.startSession
 * 
 * Initializes a nodeGame session
 * 
 * Creates a the player and saves it in node.player, and stores the session ids
 * in the session object (GameSocketClient.session)
 * 
 * @param {GameMsg} msg A game-msg
 * @return {boolean} TRUE, if session was correctly initialized
 * 
 * 	@see GameSocketClient.createPlayer
 */
GameSocketClient.prototype.startSession = function (msg) {
	var player = {
			id:		msg.data,	
			sid: 	msg.data,
	};
	this.createPlayer(player);
	session = msg.session;
	return true;
};

/**
 * ### GameSocketClient.restoreSession
 * 
 * Restores a session object
 * 
 * @param {object} session A session object as loaded by GameSocketClient.getSession
 * 
 * 
 * 	@emit NODEGAME_RECOVERY
 * 	@emit LOADED
 * 
 * 	@see GameSocketClient.createPlayer
 * 	@see node.session
 */
GameSocketClient.prototype.restoreSession = function (sessionObj, sid) {
	if (!sessionObj) return;
	
	var log_prefix = 'nodeGame session recovery: ';
	
	node.log('Starting session recovery ' + sid, 'INFO', log_prefix);
	node.emit('NODEGAME_RECOVERY', sid);
	
	sid = sid || sessionObj.player.sid;
	
	this.session = sessionObj.id;
	
	// Important! The new socket.io ID
	session.player.sid = sid;

	this.createPlayer(session.player);
	node.game.memory = session.memory;
	node.goto(session.state);
	
	if (!sessionObj.history) {
		node.log('No event history was found to recover', 'WARN', log_prefix);
		return true;
	}
	
	node.log('Recovering ' + session.history.length + ' events', 'DEBUG', log_prefix);
	
	node.events.history.import(session.history);
	var hash = new GameState(session.state).toHash('S.s.r'); 
	if (!node.events.history.state) {
		node.log('No old events to re-emit were found during session recovery', 'DEBUG', log_prefix);
		return true; 
	}
	if (!node.events.history.state[hash]){
		node.log('The current state ' + hash + ' has no events to re-emit', 'DEBUG', log_prefix);
		return true; 
	}
	
	var discard = ['LOG', 
	               'STATECHANGE',
	               'WINDOW_LOADED',
	               'BEFORE_LOADING',
	               'LOADED',
	               'in.say.STATE',
	               'UPDATED_PLIST',
	               'NODEGAME_READY',
	               'out.say.STATE',
	               'out.set.STATE',
	               'in.say.PLIST',
	               'STATEDONE', // maybe not here
	               'out.say.HI',
		               
	];
	
	var to_remit = node.events.history.state[hash];
	to_remit.select('event', 'in', discard).remove();
	
	if (!to_remit.length){
		node.log('The current state ' + hash + ' has no valid events to re-emit', 'DEBUG', log_prefix);
		return true;
	}
	
	var remit = function () {
		node.log('Re-emitting ' + to_remit.length + ' events', 'DEBUG', log_prefix);
		// We have events that were fired at the state when 
		// disconnection happened. Let's fire them again 
		to_remit.each(function(e) {
			// Falsy, should already been discarded
			if (!JSUS.in_array(e.event, discard)) {
				node.emit(e.event, e.p1, e.p2, e.p3);
			}
		});
	};
	
	if (node.game.ready) {
		remit.call(node.game);
	}
	else {
		node.on('LOADED', function(){
			remit.call(node.game);
		});
	}
	
	return true;
};

/**
 * ### GameSocketClient.createPlayer
 * 
 * Mixes in default properties for the player object and
 * additional configuration variables from node.conf.player
 * 
 * Writes the node.player object
 * 
 * Properties: `id`, `sid`, `ip` can never be overwritten.
 * 
 * Properties added as local configuration cannot be further
 * modified during the game. 
 * 
 * Only the property `name`, can be changed.
 * 
 */
GameSocketClient.prototype.createPlayer = function (player) {	
	player = new Player(player);
	
	if (node.conf && node.conf.player) {			
		var pconf = node.conf.player;
		for (var key in pconf) {
			if (pconf.hasOwnProperty(key)) {
				if (JSUS.in_array(key, ['id', 'sid', 'ip'])) {
					continue;
				} 
				
				// Cannot be overwritten properties previously 
				// set in other sessions (recovery)
//				if (player.hasOwnProperty(key)) {
//					continue;
//				}
				
				Object.defineProperty(player, key, {
			    	value: pconf[key],
			    	enumerable: true,
				});
			}
		}
	}
	
	Object.defineProperty(node, 'player', {
    	value: player,
    	enumerable: true,
	});

	return player;
};

/**
 * ### GameSocketClient.connect
 * 
 * Initializes the connection to a nodeGame server
 * 
 * 
 * 
 * @param {object} conf A configuration object
 */
GameSocketClient.prototype.connect = function (conf) {
	conf = conf || {};
	if (!conf.url) {
		node.log('cannot connect to empty url.', 'ERR');
		return false;
	}
	
	this.url = conf.url;
	
	node.log('connecting to ' + conf.url);
	this.io = io.connect(conf.url, conf.io);
    this.attachFirstListeners(this.io);
    return this.io;
};

// ## I/O Functions


var logSecureParseError = function (text, e) {
	text = text || 'Generic error while parsing a game message';
	var error = (e) ? text + ": " + e : text;
	node.log(error, 'ERR');
	node.emit('LOG', 'E: ' + error);
	return false;
}

/**
 * ### GameSocketClient.secureParse
 * 
 * Parse the message received in the Socket
 * 
 * @param {object|GameMsg} msg The game-message to parse
 * @return {GameMsg|boolean} The parsed GameMsg object, or FALSE if an error occurred
 *  
 */
GameSocketClient.prototype.secureParse = function (msg) {
	
	var gameMsg;
	try {
		gameMsg = GameMsg.clone(JSON.parse(msg));
	}
	catch(e) {
		return logSecureParseError('Malformed msg received',  e);
	}
	
	if (this.session && gameMsg.session !== this.session) {
		return logSecureParseError('Local session id does not match incoming message session id');
	}
	
	return gameMsg;
};

/**
 * ### GameSocketClient.clearBuffer
 * 
 * Emits and removes all the events in the message buffer
 * 
 * 	@see node.emit
 */
GameSocketClient.prototype.clearBuffer = function () {
	var nelem = buffer.length;
	for (var i=0; i < nelem; i++) {
		var msg = this.buffer.shift();
		node.emit(msg.toInEvent(), msg);
		node.log('Debuffered ' + msg, 'DEBUG');
	}
};

/**
 * ### GameSocketClient.attachFirstListeners
 *
 * Initializes the socket to wait for a HI message from the server
 * 
 * Nothing is done until the SERVER send an HI msg. All the others msgs will
 * be ignored otherwise.
 * 
 * @param {object} socket The socket.io socket
 */
GameSocketClient.prototype.attachFirstListeners = function (socket) {
	
	var that = this;
	
	socket.on('connect', function (msg) {
		var connString = 'nodeGame: connection open';
	    node.log(connString); 
	    
	    socket.on('message', function (msg) {	
	    	
	    	var msg = that.secureParse(msg);
	    	
	    	if (msg) { // Parsing successful
				if (msg.target === 'HI') {

					// Setting global info
					that.servername = msg.from;
					// Keep serverid = msg.from for now
					that.serverid = msg.from;
					
					var sessionObj = that.getSession(msg);
					
					if (sessionObj) {
						that.restoreSession(sessionObj, socket.id);
						
						// Get Ready to play
						that.attachMsgListeners(socket, msg.session);
						
						var msg = node.msg.create({
							action: GameMsg.actions.SAY,
							target: 'HI_AGAIN',
							data: node.player,
						});
//							console.log('HI_AGAIN MSG!!');
//							console.log(msg);
						that.send(msg);
						
					}
					else {
						that.startSession(msg);
						// Get Ready to play
						that.attachMsgListeners(socket, msg.session);
						
						// Send own name to SERVER
						that.sendHI(node.player, 'ALL');
					}
					

					// Ready to play
					node.emit('out.say.HI');
			   	 } 
	    	}
	    });
	    
	});
	
    socket.on('disconnect', function() {
    	// Save the current state of the game
    	node.session.store();
    	node.log('closed');
    });
};

/**
 * ### GameSocketClient.attachMsgListeners
 * 
 * Attaches standard message listeners
 * 
 * This method is called after the client has received a valid HI message from
 * the server, and a session number has been issued
 * 
 * @param {object} socket The socket.io socket
 * @param {number} session The session id issued by the server
 * 
 * @emit NODEGAME_READY
 */
GameSocketClient.prototype.attachMsgListeners = function (socket, session) {   
	var that = this;
	
	node.log('Attaching FULL listeners');
	socket.removeAllListeners('message');
		
	socket.on('message', function(msg) {
		var msg = that.secureParse(msg);
		
		if (msg) { // Parsing successful
			// Wait to fire the msgs if the game state is loading
			if (node.game && node.game.ready) {	
				node.emit(msg.toInEvent(), msg);
			}
			else {
				node.log('Buffering: ' + msg, 'DEBUG');
				buffer.push(msg);
			}
		}
	});
	
	node.emit('NODEGAME_READY');
};

// ## SEND methods

/**
 * ### GameSocketClient.sendHI
 * 
 * Creates a HI message and pushes it into the socket
 *   
 * @param {string} from Optional. The message sender. Defaults node.player
 * @param {string} to Optional. The recipient of the message. Defaults 'SERVER'
 * 
 */
GameSocketClient.prototype.sendHI = function (from, to) {
	from = from || node.player;
	to = to || 'SERVER';
	var msg = node.msg.createHI(from, to);
	this.send(msg);
};

/**
 * ### GameSocketClient.sendSTATE
 * 
 * Creates a STATE message and pushes it into the socket
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {GameState} state The GameState object to send
 * @param {string} to Optional. The recipient of the message.
 * 
 * 	@see GameMsg.actions
 */
GameSocketClient.prototype.sendSTATE = function (action, state, to) {	
	var msg = node.msg.createSTATE(action, state, to);
	this.send(msg);
};

/**
 * ### GameSocketClient.sendTXT
 *
 * Creates a TXT message and pushes it into the socket
 * 
 * @param {string} text Text to send
 * @param {string} to Optional. The recipient of the message
 */
GameSocketClient.prototype.sendTXT = function(text, to) {	
	var msg = node.msg.createTXT(text,to);
	this.send(msg);
};

/**
 * ### GameSocketClient.sendDATA
 * 
 * Creates a DATA message and pushes it into the socket
 * 
 * @param {string} action Optional. A nodeGame action (e.g. 'get' or 'set'). Defaults 'say'
 * @param {object} data An object to exchange
 * @param {string} to Optional. The recipient of the message. Defaults 'SERVER'
 * @param {string} text Optional. A descriptive text associated to the message.
 * 
 * 	@see GameMsg.actions
 * 
 * @TODO: invert parameter order: first data then action
 */
GameSocketClient.prototype.sendDATA = function (action, data, to, text) {
	action = action || GameMsg.say;
	to = to || 'SERVER';
	text = text || 'DATA';
	var msg = node.msg.createDATA(action, data, to, text);
	this.send(msg);
};

/**
 * ### GameSocketClient.send
 * 
 * Pushes a message into the socket.
 * 
 * The msg is actually received by the client itself as well.
 * 
 * @param {GameMsg} The game message to send
 * 
 * 	@see GameMsg
 * 
 * @TODO: Check Do volatile msgs exist for clients?
 */
GameSocketClient.prototype.send = function (msg) {

	// if (msg.reliable) {
		this.io.send(msg.stringify());
	// }
	// else {
	// this.io.volatile.send(msg.stringify());
	// }
	node.log('S: ' + msg);
	node.emit('LOG', 'S: ' + msg.toSMS());
};

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
  , 'undefined' != typeof io ? io : module.parent.exports.io
);
/**
 * # GameDB
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * ### Provides a simple, lightweight NO-SQL database for nodeGame
 * 
 * Entries are stored as GameBit messages.
 * 
 * It automatically creates three indexes.
 * 
 * 1. by player,
 * 2. by state,
 * 3. by key.
 * 
 * Uses GameState.compare to compare the state property of each entry.
 * 
 * 	@see GameBit
 * 	@see GameState.compare
 * 
 * ---
 * 
 */
(function (exports, node) {

// ## Global scope	
var JSUS = node.JSUS,
	NDDB = node.NDDB;
	
var GameState = node.GameState;

// Inheriting from NDDB	
GameDB.prototype = JSUS.clone(NDDB.prototype);
GameDB.prototype.constructor = GameDB;


// Expose constructors
exports.GameDB = GameDB;
exports.GameBit = GameBit;

/**
 * ## GameDB constructor 
 *
 * Creates an instance of GameDB
 * 
 * @param {object} options Optional. A configuration object
 * @param {array} db Optional. An initial array of items to import into the database
 * @param {NDDB|GameDB} parent Optional. A reference to the parent database
 * 
 * 	@see NDDB constructor 
 */

function GameDB (options, db, parent) {
	options = options || {};
	
	
	if (!options.update) options.update = {};
	// Auto build indexes by default
	options.update.indexes = true;
	
	NDDB.call(this, options, db, parent);
	
	this.c('state', GameBit.compareState);
	  
	
	if (!this.player) {
		this.h('player', function(gb) {
			return gb.player;
		});
	}
	if (!this.state) {
		this.h('state', function(gb) {
			return GameState.toHash(gb.state, 'S.s.r');
		});
	}  
	if (!this.key) {
		this.h('key', function(gb) {
			return gb.key;
		});
	}
	
}

// ## GameDB methods

/**
 * ### GameDB.add
 * 
 * Creates a GameBit and adds it to the database
 * 
 * @param {string} key An alphanumeric id for the entry
 * @param {mixed} value Optional. The value to store
 * @param {Player} player Optional. The player associated to the entry. Defaults, node.player
 * @param {GameState} player Optional. The state associated to the entry. Defaults, node.game.state
 * 
 * @return {boolean} TRUE, if insertion was successful
 * 
 * 	@see GameBit
 */
GameDB.prototype.add = function (key, value, player, state) {
	if (!key) return false;
	
	state = state || node.game.state;
	player = player || node.player;

	this.insert(new GameBit({
						player: player, 
						key: key,
						value: value,
						state: state,
	}));

	return true;
};

/**
 * # GameBit
 * 
 * ### Container of relevant information for the game
 * 
 *  ---
 *  
 * A GameBit unit always contains the following properties
 * 
 * - state GameState
 * - player Player
 * - key 
 * - value
 * - time 
 */

// ## GameBit methods

/**
 * ### GameBit constructor
 * 
 * Creates a new instance of GameBit
 */
function GameBit (options) {
	
	this.state = options.state;
	this.player = options.player;
	this.key = options.key;
	this.value = options.value;
	this.time = (Date) ? Date.now() : null;
};


/**
 * ### GameBit.toString
 * 
 * Returns a string representation of the instance of GameBit
 * 
 * @return {string} string representation of the instance of GameBit
 */
GameBit.prototype.toString = function () {
	return this.player + ', ' + GameState.stringify(this.state) + ', ' + this.key + ', ' + this.value;
};

/** 
 * ### GameBit.equals (static)
 * 
 * Compares two GameBit objects
 * 
 * Returns TRUE if the attributes of `player`, `state`, and `key`
 * are identical. 
 *  
 * If the strict parameter is set, also the `value` property 
 * is used for comparison
 *  
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * @param {boolean} strict Optional. If TRUE, compares also the `value` property
 * 
 * @return {boolean} TRUE, if the two objects are equals
 * 
 * 	@see GameBit.comparePlayer
 * 	@see GameBit.compareState
 * 	@see GameBit.compareKey
 * 	@see GameBit.compareValue
 */
GameBit.equals = function (gb1, gb2, strict) {
	if (!gb1 || !gb2) return false;
	strict = strict || false;
	if (GameBit.comparePlayer(gb1, gb2) !== 0) return false;
	if (GameBit.compareState(gb1, gb2) !== 0) return false;
	if (GameBit.compareKey(gb1, gb2) !== 0) return false;
	if (strict && gb1.value && GameBit.compareValue(gb1, gb2) !== 0) return false;
	return true;	
};

/**
 * ### GameBit.comparePlayer (static)
 * 
 * Sort two game-bits by player numerical id
 * 
 * Returns a numerical id that can assume the following values
 * 
 * - `-1`: the player id of the second game-bit is larger 
 * - `1`: the player id of the first game-bit is larger
 * - `0`: the two gamebits belong to the same player
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 */
GameBit.comparePlayer = function (gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (gb1.player === gb2.player) return 0;

	if (gb1.player > gb2.player) return 1;
	return -1;
};

/**
 * ### GameBit.compareState (static)
 * 
 * Sort two game-bits by their state property
 * 
 * GameState.compare is used for comparison
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 * 
 * 	@see GameState.compare
 */
GameBit.compareState = function (gb1, gb2) {
	return GameState.compare(gb1.state, gb2.state);
};

/**
 * ### GameBit.compareKey (static)
 * 
 * 	Sort two game-bits by their key property 
 * 
 * Returns a numerical id that can assume the following values
 * 
 * - `-1`: the key of the first game-bit comes first alphabetically  
 * - `1`: the key of the second game-bit comes first alphabetically 
 * - `0`: the two gamebits have the same key
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 */
GameBit.compareKey = function (gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (gb1.key === gb2.key) return 0;
	if (gb1.key < gb2.key) return -1;
	return 1;
};

/**
 * ### GameBit.compareValue (static)
 *  
 * Sorts two game-bits by their value property
 * 
 * Uses JSUS.equals for equality. If they differs, 
 * further comparison is performed, but results will be inaccurate
 * for objects. 
 * 
 * Returns a numerical id that can assume the following values
 * 
 * - `-1`: the value of the first game-bit comes first alphabetically / numerically
 * - `1`: the value of the second game-bit comes first alphabetically / numerically 
 * - `0`: the two gamebits have identical value properties
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 * 
 * 	@see JSUS.equals
 */
GameBit.compareValue = function (gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (JSUS.equals(gb1.value, gb2.value)) return 0;
	if (gb1.value > gb2.value) return 1;
	return -1;
};	

// ## Closure
	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # Game
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 *
 * Wrapper class for a `GameLoop` object and functions to control the game flow
 * 
 * Defines a number of event listeners, diveded in
 * 	
 * - incoming,
 * - outgoing,
 * - internal 
 *  
 *  ---
 *  
 */
	
(function (exports, node) {
	
// ## Global scope
	
var GameState = node.GameState,
	GameMsg = node.GameMsg,
	GameDB = node.GameDB,
	PlayerList = node.PlayerList,
	GameLoop = node.GameLoop,
	JSUS = node.JSUS;


exports.Game = Game;

var name,
	description,
	gameLoop,
	pl;
	

/**
 * ## Game constructor
 * 
 * Creates a new instance of Game
 * 
 * @param {object} settings Optional. A configuration object
 */
function Game (settings) {
	settings = settings || {};

// ## Private properties

/**
 * ### Game.name
 * 
 * The name of the game
 * 
 * @api private
 */
	name = settings.name || 'A nodeGame game';
	Object.defineProperty(this, 'name', {
		value: name,
		enumerable: true,
	});

/**
 * ### Game.description
 * 
 * A text describing the game
 * 
 * @api private
 */
	description = settings.description || 'No Description';
	Object.defineProperty(this, 'description', {
		value: description,
		enumerable: true,
	});

/**
 * ### Game.gameLoop
 * 
 * An object containing the game logic 
 * 
 * @see GameLoop
 * @api private
 */
	gameLoop = new GameLoop(settings.loops);
	Object.defineProperty(this, 'gameLoop', {
		value: gameLoop,
		enumerable: true,
	});

/**
 * ### Game.pl
 * 
 * The list of players connected to the game
 * 
 * The list may be empty, depending on the server settings
 * 
 * @api private
 */
	pl = new PlayerList();
	Object.defineProperty(this, 'pl', {
		value: pl,
		enumerable: true,
		configurable: true,
		writable: true,
	});

/**
 * ### Game.ready
 * 
 * If TRUE, the nodeGame engine is fully loaded
 * 
 * During stepping between functions in the game-loop
 * the flag is temporarily turned to FALSE, and all events 
 * are queued and fired only after nodeGame is ready to 
 * handle them again.
 * 
 * @api private
 */
	Object.defineProperty(this, 'ready', {
		set: function(){},
		get: function(){
			if (this.state.is < GameState.iss.LOADED) return false;
			
			// Check if there is a gameWindow obj and whether it is loading
			if (node.window) {	
				return (node.window.state >= GameState.iss.LOADED) ? true : false;
			}
			return true;
		},
		enumerable: true,
	});



// ## Public properties

/**
 * ### Game.observer
 * 
 * If TRUE, silently observes the game. Defaults FALSE
 * 
 * An nodeGame observer will not send any automatic notification
 * to the server, but it will just *observe* the game played by
 * other clients.
 * 
 */
	this.observer = ('undefined' !== typeof settings.observer) ? settings.observer 
		   													: false;

/**
 * ### Game.auto_step
 * 
 * If TRUE, automatically advances to the next state
 * 
 * After a successful DONE event is fired, the client will automatically 
 * goes to the next function in the game-loop without waiting for a STATE
 * message from the server. 
 * 
 * Depending on the configuration settings, it can still perform additional
 * checkings (e.g.wheter the mininum number of players is connected) 
 * before stepping to the next state.
 * 
 */
	this.auto_step = ('undefined' !== typeof settings.auto_step) ? settings.auto_step 
															 : true;

/**
 * ### Game.auto_wait
 * 
 * If TRUE, fires a WAITING... event immediately after a successful DONE event
 * 
 * Under default settings, the WAITING... event temporarily prevents the user
 * to access the screen and displays a message to the player
 */
	this.auto_wait = ('undefined' !== typeof settings.auto_wait) ? settings.auto_wait 
																 : false; 
	
	this.minPlayers = settings.minPlayers || 1;
	this.maxPlayers = settings.maxPlayers || 1000;
	
	// TODO: Check this
	this.init = settings.init || this.init;


/**
 * ### Game.memory
 * 
 * A storage database for the game
 * 
 * In the server logic the content of SET messages are
 * automatically inserted in this object
 * 
 * 	@see node.set
 */
	this.memory = new GameDB();
	
	this.player = null;	
	this.state = new GameState();
	
	
	var that = this,
		say = GameMsg.actions.SAY + '.',
		set = GameMsg.actions.SET + '.',
		get = GameMsg.actions.GET + '.',
		IN  = GameMsg.IN,
		OUT = GameMsg.OUT;

// ## Game incoming listeners
// Incoming listeners are fired in response to incoming messages
	var incomingListeners = function() {
	
/**
 * ### in.get.DATA
 * 
 * Experimental feature. Undocumented (for now)
 */ 
	node.on( IN + get + 'DATA', function (msg) {
		if (msg.text === 'LOOP'){
			node.gsc.sendDATA(GameMsg.actions.SAY, this.gameLoop, msg.from, 'GAME');
		}
		// <!-- We could double emit
		// node.emit(msg.text, msg.data); -->
	});

/**
 * ### in.set.STATE
 * 
 * Adds an entry to the memory object 
 * 
 */
	node.on( IN + set + 'STATE', function (msg) {
		that.memory.add(msg.text, msg.data, msg.from);
	});

/**
 * ### in.set.DATA
 * 
 * Adds an entry to the memory object 
 * 
 */
	node.on( IN + set + 'DATA', function (msg) {
		that.memory.add(msg.text, msg.data, msg.from);
	});

/**
 * ### in.say.STATE
 * 
 * Updates the game state or updates a player's state in
 * the player-list object
 *
 * If the message is from the server, it updates the game state,
 * else the state in the player-list object from the player who
 * sent the message is updated 
 * 
 *  @emit UPDATED_PLIST
 *  @see Game.pl 
 */
	node.on( IN + say + 'STATE', function (msg) {
//		console.log('updateState: ' + msg.from + ' -- ' + new GameState(msg.data), 'DEBUG');
//		console.log(that.pl.length)
		
		//console.log(node.gsc.serverid + 'AAAAAA');
		if (node.gsc.serverid && msg.from === node.gsc.serverid) {
//			console.log(node.gsc.serverid + ' ---><--- ' + msg.from);
//			console.log('NOT EXISTS');
		}
		
		if (that.pl.exist(msg.from)) {
			//console.log('EXIST')
			
			that.pl.updatePlayerState(msg.from, msg.data);
			node.emit('UPDATED_PLIST');
			that.pl.checkState();
		}
		// <!-- Assume this is the server for now
		// TODO: assign a string-id to the server -->
		else {
			//console.log('NOT EXISTS')
			that.updateState(msg.data);
		}
	});

/**
 * ### in.say.PLIST
 * 
 * Creates a new player-list object from the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.pl 
 */
	node.on( IN + say + 'PLIST', function (msg) {
		if (!msg.data) return;
		that.pl = new PlayerList({}, msg.data);
		node.emit('UPDATED_PLIST');
		that.pl.checkState();
	});
	
/**
 * ### in.say.REDIRECT
 * 
 * Redirects to a new page
 * 
 * @emit REDIRECTING...
 * @see node.redirect
 */
	node.on( IN + say + 'REDIRECT', function (msg) {
		if (!msg.data) return;
		if ('undefined' === typeof window || !window.location) {
			node.log('window.location not found. Cannot redirect', 'err');
			return false;
		}
		node.emit('REDIRECTING...', msg.data);
		window.location = msg.data; 
	});	
	
}(); // <!-- ends incoming listener -->

// ## Game outgoing listeners
// Incoming listeners are fired in response to outgoing messages
var outgoingListeners = function() {
	
/** 
 * ### out.say.HI
 * 
 * Updates the game-state of the game upon connection to a server
 * 
 */
	node.on( OUT + say + 'HI', function() {
		// Enter the first state
		if (that.auto_step) {
			that.updateState(that.next());
		}
		else {
			// The game is ready to step when necessary;
			that.state.is = GameState.iss.LOADED;
			node.gsc.sendSTATE(GameMsg.actions.SAY, that.state);
		}
	});

/**
 * ### out.say.STATE
 * 
 * Sends out a STATE message to the specified recipient
 * 
 * TODO: check with the server 
 * The message is for informative purpose
 * 
 */
	node.on( OUT + say + 'STATE', function (state, to) {
		node.gsc.sendSTATE(GameMsg.actions.SAY, state, to);
	});	

/**
 * ### out.say.TXT
 * 
 * Sends out a TXT message to the specified recipient
 */
	node.on( OUT + say + 'TXT', function (text, to) {
		node.gsc.sendTXT(text,to);
	});

/**
 * ### out.say.DATA
 * 
 * Sends out a DATA message to the specified recipient
 */
	node.on( OUT + say + 'DATA', function (data, to, key) {
		node.gsc.sendDATA(GameMsg.actions.SAY, data, to, key);
	});

/**
 * ### out.set.STATE
 * 
 * Sends out a STATE message to the specified recipient
 * 
 * TODO: check with the server 
 * The receiver will update its representation of the state
 * of the sender
 */
	node.on( OUT + set + 'STATE', function (state, to) {
		node.gsc.sendSTATE(GameMsg.actions.SET, state, to);
	});

/**
 * ### out.set.DATA
 * 
 * Sends out a DATA message to the specified recipient
 * 
 * The sent data will be stored in the memory of the recipient
 * 
 * 	@see Game.memory
 */
	node.on( OUT + set + 'DATA', function (data, to, key) {
		node.gsc.sendDATA(GameMsg.actions.SET, data, to, key);
	});

/**
 * ### out.get.DATA
 * 
 * Issues a DATA request
 * 
 * Experimental. Undocumented (for now)
 */
	node.on( OUT + get + 'DATA', function (data, to, key) {
		node.gsc.sendDATA(GameMsg.actions.GET, data, to, data);
	});
	
}(); // <!-- ends outgoing listener -->
	
// ## Game internal listeners
// Internal listeners are not directly associated to messages,
// but they are usually responding to internal nodeGame events, 
// such as progressing in the loading chain, or finishing a game state 
var internalListeners = function() {
	
/**
 * ### STATEDONE
 * 
 * Fired when all the 
 */ 
	node.on('STATEDONE', function() {
		// <!-- If we go auto -->
		if (that.auto_step && !that.observer) {
			node.log('We play AUTO', 'DEBUG');
			var morePlayers = ('undefined' !== that.minPlayers) ? that.minPlayers - that.pl.length : 0 ;
			node.log('Additional player required: ' + morePlayers > 0 ? MorePlayers : 0, 'DEBUG');
			
			if (morePlayers > 0) {
				node.emit('OUT.say.TXT', morePlayers + ' player/s still needed to play the game');
				node.log(morePlayers + ' player/s still needed to play the game');
			}
			// TODO: differentiate between before the game starts and during the game
			else {
				node.emit('OUT.say.TXT', this.minPlayers + ' players ready. Game can proceed');
				node.log(pl.length + ' players ready. Game can proceed');
				that.updateState(that.next());
			}
		}
		else {
			node.log('Waiting for monitor to step', 'DEBUG');
		}
	});

/**
 * ### DONE
 * 
 * Updates and publishes that the client has successfully terminated a state 
 * 
 * If a DONE handler is defined in the game-loop, it will executes it before
 * continuing with further operations. In case it returns FALSE, the update
 * process is stopped. 
 * 
 * @emit BEFORE_DONE
 * @emit WAITING...
 */
	node.on('DONE', function(p1, p2, p3) {
		
		// Execute done handler before updatating state
		var ok = true;
		var done = that.gameLoop.getAllParams(that.state).done;
		
		if (done) ok = done.call(that, p1, p2, p3);
		if (!ok) return;
		that.state.is = GameState.iss.DONE;
		
		// Call all the functions that want to do 
		// something before changing state
		node.emit('BEFORE_DONE');
		
		if (that.auto_wait) {
			if (node.window) {	
				node.emit('WAITING...');
			}
		}
		that.publishState();	
	});

/**
 * ### PAUSE
 * 
 * Sets the game to PAUSE and publishes the state
 * 
 */
	node.on('PAUSE', function(msg) {
		that.state.paused = true;
		that.publishState();
	});

/**
 * ### WINDOW_LOADED
 * 
 * Checks if the game is ready, and if so fires the LOADED event
 * 
 * @emit BEFORE_LOADING
 * @emit LOADED
 */
	node.on('WINDOW_LOADED', function() {
		if (that.ready) node.emit('LOADED');
	});

/**
 * ### GAME_LOADED
 * 
 * Checks if the window was loaded, and if so fires the LOADED event
 * 
 * @emit BEFORE_LOADING
 * @emit LOADED
 */
	node.on('GAME_LOADED', function() {
		if (that.ready) node.emit('LOADED');
	});

/**
 * ### LOADED
 * 
 * 
 */
	node.on('LOADED', function() {
		node.emit('BEFORE_LOADING');
		that.state.is =  GameState.iss.PLAYING;
		//TODO: the number of messages to emit to inform other players
		// about its own state should be controlled. Observer is 0 
		//that.publishState();
		node.gsc.clearBuffer();
		
	});
	
}(); // <!-- ends internal listener -->
} // <!-- ends constructor -->

// ## Game methods

/**
 * ### Game.pause
 * 
 * Experimental. Sets the game to pause
 * 
 * @TODO: check with Game.ready
 */
Game.prototype.pause = function () {
	this.state.paused = true;
};

/**
 * ### Game.resume
 * 
 * Experimental. Resumes the game from a pause
 * 
 * @TODO: check with Game.ready
 */
Game.prototype.resume = function () {
	this.state.paused = false;
};

/**
 * ### Game.next
 * 
 * Fetches a state from the game-loop N steps ahead
 * 
 * Optionally, a parameter can control the number of steps to take
 * in the game-loop before returning the state
 * 
 * @param {number} N Optional. The number of steps to take in the game-loop. Defaults 1
 * @return {boolean|GameState} The next state, or FALSE if it does not exist
 * 
 * 	@see GameState
 * 	@see Game.gameLoop
 */
Game.prototype.next = function (N) {
	if (!N) return this.gameLoop.next(this.state);
	return this.gameLoop.jumpTo(this.state, Math.abs(N));
};

/**
 * ### Game.previous
 * 
 * Fetches a state from the game-loop N steps back
 * 
 * Optionally, a parameter can control the number of steps to take
 * backward in the game-loop before returning the state
 * 
 * @param {number} times Optional. The number of steps to take in the game-loop. Defaults 1
 * @return {boolean|GameState} The previous state, or FALSE if it does not exist
 * 
 * 	@see GameState
 * 	@see Game.gameLoop
 */
Game.prototype.previous = function (N) {
	if (!N) return this.gameLoop.previous(this.state);
	return this.gameLoop.jumpTo(this.state, -Math.abs(N));
};

/**
 * ### Game.jumpTo
 * 
 * Moves the game forward or backward in the game-loop
 * 
 * Optionally, a parameter can control the number of steps to take
 * in the game-loop before executing the next function. A negative 
 * value jumps backward in the game-loop, and a positive one jumps
 * forward in the game-loop
 * 
 * @param {number} jump  The number of steps to take in the game-loop
 * @return {boolean} TRUE, if the game succesfully jumped to the desired state
 * 
 * 	@see GameState
 * 	@see Game.gameLoop
 */
Game.prototype.jumpTo = function (jump) {
	if (!jump) return false;
	var gs = this.gameLoop.jumpTo(this.state, jump);
	if (!gs) return false;
	return this.updateState(gs);
};

/**
 * ### Game.publishState
 * 
 * Notifies internal listeners, the server and other connected clients 
 * of the current game-state
 * 
 * If the *observer* flag is set, external notification is inhibited, 
 * but the STATECHANGE event is emitted anyway 
 * 
 * @emit STATECHANGE
 * 
 * @see GameState
 * @see	Game.observer
 */
Game.prototype.publishState = function() {
	// <!-- Important: SAY -->
	if (!this.observer) {
		var stateEvent = GameMsg.OUT + GameMsg.actions.SAY + '.STATE'; 
		node.emit(stateEvent, this.state, 'ALL');
	}
	
	node.emit('STATECHANGE');
	
	node.log('New State = ' + new GameState(this.state), 'DEBUG');
};

/**
 * ### Game.updateState
 * 
 * Updates the game to the specified game-state
 * 
 * @param {GameState} state The state to load and run
 * 
 * @emit BEFORE_LOADING
 * @emit LOADED
 * @emit TXT
 */
Game.prototype.updateState = function (state) {
	
	node.log('New state is going to be ' + new GameState(state), 'DEBUG');
	
	if (this.step(state) !== false) {
		this.paused = false;
		this.state.is =  GameState.iss.LOADED;
		if (this.ready) {
			node.emit('LOADED');
		}
	}		
	else {
		node.log('Error in stepping', 'ERR');
		// TODO: implement sendERR
		node.emit('TXT','State was not updated');
	}
};

/**
 * ### Game.step
 * 
 * Retrieves from the game-loop and executes the function for the 
 * specified game-state
 * 
 * @param {GameState} gameState Optional. The GameState to run
 * @return {Boolean} FALSE, if the execution encountered an error
 * 
 * 	@see Game.gameLoop
 * 	@see GameState
 */
Game.prototype.step = function (gameState) {
	
	gameState = gameState || this.next();
	if (gameState) {
		
		var func = this.gameLoop.getFunction(gameState);
		
		// Experimental: node.window should load the func as well
//			if (node.window) {
//				var frame = this.gameLoop.getAllParams(gameState).frame;
//				node.window.loadFrame(frame);
//			}
		
		
		
		if (func) {

			// For NDDB EventEmitter
			//console.log('HOW MANY LISTENERS???');
			//console.log(node._ee._listeners.count());
			
			// Local Listeners from previous state are erased 
			// before proceeding to next one
			node._ee.clearState(this.state);
			
			// For NDDB EventEmitter
			//console.log(node._ee._listeners.count());
			
			gameState.is = GameState.iss.LOADING;
			this.state = gameState;
		
			// This could speed up the loading in other client,
			// but now causes problems of multiple update
			this.publishState();
					
			return func.call(node.game);
		}
	}
	return false;
};

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # nodeGame
 * 
 * Copyright(c) 2012 Stefano Balietti MIT Licensed
 * 
 * ### nodeGame: Web Experiments in the Browser
 * 
 * *nodeGame* is a free, open source, event-driven javascript framework for on
 * line, multiplayer games in the browser.
 */
(function (node) {
	
	// Declaring variables
	// //////////////////////////////////////////
		
	var EventEmitter = node.EventEmitter;
	var GameSocketClient = node.GameSocketClient;
	var GameState = node.GameState;
	var GameMsg = node.GameMsg;
	var Game = node.Game;
	var Player = node.Player;
	var GameSession = node.GameSession;
	
	
	// Adding constants directly to node
	// ////////////////////////////////////////
	
	node.actions 	= GameMsg.actions;
	node.IN 		= GameMsg.IN;
	node.OUT 		= GameMsg.OUT;
	node.targets 	= GameMsg.targets;		
	node.states 	= GameState.iss;
	
	// Creating EventEmitter
	// /////////////////////////////////////////
	
	var ee = node.events = node._ee = new EventEmitter();


	// Creating objects
	// /////////////////////////////////////////
	
	node.msg		= node.GameMsgGenerator;	
	node.socket = node.gsc = new GameSocketClient();

	node.game 		= null;
	node.player 	= null;
	
	Object.defineProperty(node, 'state', {
    	get: function() {
    		return (node.game) ? node.game.state : false;
    	},
    	configurable: false,
    	enumerable: true,
	});
	
	node.env = function (env, func, ctx, params) {
		if (!env || !func || !node.env[env]) return;
		ctx = ctx || node;
		params = params || [];
		func.apply(ctx, params);
	};
	
	// Adding methods
	// /////////////////////////////////////////
	
	/**
	 * Parses the a node configuration object and add default and missing
	 * values. Stores the final configuration in node.conf.
	 * 
	 */
	node._analyzeConf = function (conf) {
		if (!conf) {
			node.log('Invalid configuration object found.', 'ERR');
			return false;
		}
		
		// URL
		if (!conf.host) {
			if ('undefined' !== typeof window) {
				if ('undefined' !== typeof window.location) {
					var host = window.location.href;
				}
			}
			else {
				var host = conf.url;
			}
			if (host) {
				var tokens = host.split('/').slice(0,-2);
				// url was not of the form '/channel'
				if (tokens.length > 1) {
					conf.host = tokens.join('/');
				}
			}
		}
		
		
		// Add a trailing slash if missing
		if (conf.host && conf.host.lastIndexOf('/') !== host.length) {
			conf.host = conf.host + '/';
		}
		
		// VERBOSITY
		if ('undefined' !== typeof conf.verbosity) {
			node.verbosity = conf.verbosity;
		}
		
		
		// Environments
		if ('undefined' !== typeof conf.env) {
			for (var i in conf.env) {
				if (conf.env.hasOwnProperty(i)) {
					node.env[i] = conf.env[i];
				}
			}
		}
		
		this.conf = conf;
		return conf;
	};
	
	
	node.on = function (event, listener) {
		// It is in the init function;
		if (!node.state || (GameState.compare(node.state, new GameState(), true) === 0 )) {
			ee.addListener(event, listener);
			// node.log('global');
		}
		else {
			ee.addLocalListener(event, listener);
			// node.log('local');
		}
	};
	
	node.once = function (event, listener) {
		node.on(event, listener);
		node.on(event, function(event, listener) {
			ee.removeListener(event, listener);
		});
	};
	
	node.removeListener = function (event, func) {
		return ee.removeListener(event, func);
	};
	
	// TODO: create conf objects
	node.play = function (conf, game) {	
		node._analyzeConf(conf);
		
		// node.socket.connect(conf);
		
		node.game = new Game(game);
		node.emit('NODEGAME_GAME_CREATED');
		
		
		// INIT the game
		node.game.init.call(node.game);
		node.socket.connect(conf); // was node.socket.setGame(node.game);
		
		node.log('game loaded...');
		node.log('ready.');
	};	
	
// node.observe = function (conf, game) {
// node._analyzeConf(conf);
//		
// var game = game || {loops: {1: {state: function(){}}}};
// node.socket = that.gsc = new GameSocketClient(conf);
//		
// node.game = that.game = new Game(game, that.gsc);
// node.socket.setGame(that.game);
//		
// node.on('NODEGAME_READY', function(){
//			
// // Retrieve the game and set is as observer
// node.get('LOOP', function(game) {
//				
// // alert(game);
// // console.log('ONLY ONE');
// // console.log(game);
// // var game = game.observer = true;
// // node.game = that.game = game;
// //
// // that.game.init();
// //
// // that.gsc.setGame(that.game);
// //
// // node.log('nodeGame: game loaded...');
// // node.log('nodeGame: ready.');
// });
// });
		
		
// node.onDATA('GAME', function(data){
// alert(data);
// console.log(data);
// });
		
// node.on('DATA', function(msg){
// console.log('--------->Eh!')
// console.log(msg);
// });
// };
	
	node.emit = function (event, p1, p2, p3) {	
		ee.emit(event, p1, p2, p3);
	};	
	
	node.say = function (data, what, whom) {
		ee.emit('out.say.DATA', data, whom, what);
	};
	
	/**
	 * Set the pair (key,value) into the server
	 * 
	 * @value can be an object literal.
	 * 
	 * 
	 */
	node.set = function (key, value) {
		// TODO: parameter to say who will get the msg
		ee.emit('out.set.DATA', value, null, key);
	};
	
	
	node.get = function (key, func) {
		ee.emit('out.get.DATA', key);
		
		var listener = function(msg) {
			if (msg.text === key) {
				func.call(node.game, msg.data);
				ee.removeListener('in.say.DATA',listener);
			}
			// ee.printAllListeners();
		};
		
		node.on('in.say.DATA', listener);
	};
	
	node.replay = function (reset) {
		if (reset) node.game.memory.clear(true);
		node.goto(new GameState({state: 1, step: 1, round: 1}));
	}
	
	node.goto = function (state) {
		node.game.updateState(state);
	};
	
	node.redirect = function (url, who) {
		if (!url || !who) return false;
		
		var msg = node.msg.create({
			target: node.targets.REDIRECT,
			data: url,
			to: who,
		});
		node.socket.send(msg);
		return true;
	};
	
	// *Aliases*
	//
	// Conventions:
	//
	// - Direction:
	// 'in' for all
	//
	// - Target:
	// DATA and TXT are 'say' as default
	// STATE and PLIST are 'set' as default
	
	
	// Sending
		
	
// this.setSTATE = function(action,state,to){
// var stateEvent = GameMsg.OUT + action + '.STATE';
// fire(stateEvent,action,state,to);
// };
	
	// Receiving
	
	// Say
	
	node.onTXT = function(func) {
		node.on("in.say.TXT", function(msg) {
			func.call(node.game,msg);
		});
	};
	
	node.onDATA = function(text, func) {
		node.on('in.say.DATA', function(msg) {
			if (text && msg.text === text) {
				func.call(node.game,msg);
			}
		});
		
		node.on('in.set.DATA', function(msg) {
			func.call(node.game,msg);
		});
	};
	
	// Set
	
	node.onSTATE = function(func) {
		node.on("in.set.STATE", function(msg) {
			func.call(node.game, msg);
		});
	};
	
	node.onPLIST = function(func) {
		node.on("in.set.PLIST", function(msg) {
			func.call(node.game, msg);
		});
		
		node.on("in.say.PLIST", function(msg) {
			func.call(node.game, msg);
		});
	};
	
	node.DONE = function (text) {
		node.emit("DONE",text);
	};
	
	node.TXT = function (text, to) {
		node.emit('out.say.TXT', text, to);
	};	
	
	
	node.random = {};
	
	// Generates event at RANDOM timing in milliseconds
	// if timing is missing, default is 6000
	node.random.emit = function (event, timing){
		var timing = timing || 6000;
		setTimeout(function(event) {
			node.emit(event);
		}, Math.random()*timing, event);
	};
	
	node.random.exec = function (func, timing) {
		var timing = timing || 6000;
		setTimeout(function(func) {
			func.call();
		}, Math.random()*timing, func);
	};
		
	node.log(node.version + ' loaded', 'ALWAYS');
	
})('undefined' != typeof node ? node : module.parent.exports);
