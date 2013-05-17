/**
 * # nodeGame
 * 
 * Social Experiments in the Browser
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * nodeGame is a free, open source, event-driven javascript framework for on line, 
 * multiplayer games in the browser.
 * 
 * 
 */

(function (node) {

// ### version	
node.version = '0.6.3';


// ## Objects
/**
 * ### node.log
 * 
 * Standard out
 */	
node.log = function () {};

/**
 * ### node.events
 * 
 * Instance of the EventEmitter class
 * 
 * Takes care of emitting the events and calling the
 * proper listener functions 
 * 
 * @see node.EventEmitter
 */	
node.events = {};
	
/**
 * ### node.msg
 * 
 * Static factory of game messages
 * 
 * @see node.GameMsgGenerator
 */	
node.msg = {};
	

/**
 * ### node.socket
 * 
 * Instantiates the connection to a nodeGame server
 * 
 * @see node.GameSocketClient
 */	
node.socket = node.gsc = {};

/**
 * ### node.session
 * 
 * Contains a reference to all session variables
 * 
 * Session variables can be saved and restored at a later stage
 */
node.session 	= {};

/**
 * ### node.player
 * Instance of node.Player
 * 
 * Contains information about the player
 * 
 * @see node.PlayerList.Player
 */
node.player = {};

/**
 * ### node.game
 * 
 * Instance of node.Game
 * 
 * @see node.Game
 */
node.game = {};


/**
 * ### node.game.memory
 * 
 * Instance of node.GameDB database
 * 
 * @see node.GameDB
 */
node.game.memory = null;


/**
 * ### node.game.state
 * 
 * Keeps track of the state of the game
 * 
 * @see node.GameState
 */
node.game.state = null;


/**
 * ### node.store
 * 
 * Makes the nodeGame session persistent, saving it
 * to the browser local database or to a cookie
 * 
 * @see shelf.js
 */
node.store		= function() {};


/**
 * ### node.setup
 * 
 * Configures a specific feature of nodeGame and and stores 
 * the settings in `node.conf`.
 * 
 * @see Setup
 */
node.setup		= function() {};


/**
 * ### node.conf
 * 
 * A reference to the current nodegame configuration
 * 
 * @see Setup
 */
node.conf = {};

/**
 * ### node.support 
 * 
 * A collection of features that are supported by the current browser
 */
node.support	= {};


// ## Dependencies 
// Load dependencies

if ('object' === typeof module && 'function' === typeof require) {
	// <!-- Node.js -->
	
	require('./lib/modules/log.js');
	require('./lib/modules/variables.js');
	
	require('./init.node.js');
    require('./lib/nodegame.js');

    require('./lib/modules/fs.js');
    require('./lib/modules/setup.js');
	require('./lib/modules/alias.js');
	require('./lib/modules/random.js');
    
    // ### Loading Sockets
    require('./lib/sockets/SocketIo.js');
    require('./lib/sockets/SocketDirect.js');
    
    // ### Loading Event listeners
    require('./listeners/incoming.js');
    require('./listeners/internal.js');
    require('./listeners/outgoing.js');
}
else {
	// <!-- Browser -->
	if ('undefined' !== typeof JSUS) node.JSUS = JSUS;
	if ('undefined' !== typeof NDDB) node.NDDB = NDDB;
	if ('undefined' !== typeof store) node.store = store;
	
	node.support = JSUS.compatibility();
}
	
})('object' === typeof module ? module.exports : (window.node = {}));	

/**
 * # Log
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` logging module
 * 
 * ---
 * 
 */

(function (exports, node) {
	


// ## Logging system

/**
 * ### node.verbosity_levels
 * 
 * ALWAYS, ERR, WARN, INFO, DEBUG
 */  
	node.verbosity_levels = {
			ALWAYS: -(Number.MIN_VALUE + 1), 
			ERR: -1,
			WARN: 0,
			INFO: 1,
			DEBUG: 100,
			NEVER: Number.MIN_VALUE - 1
	};	
	
/**
 *  ### node.verbosity
 *  
 *  The minimum level for a log entry to be displayed as output
 *   
 *  Defaults, only errors are displayed.
 *  
 */
	node.verbosity = node.verbosity_levels.WARN;


 
/**
 * ### node.remoteVerbosity
 *
 *  The minimum level for a log entry to be reported to the server
 *   
 *  Defaults, only errors are displayed.
 */	
	node.remoteVerbosity = node.verbosity_levels.WARN;
		
/**
 * ### node.log
 * 
 * Default nodeGame standard out, override to redirect
 * 
 * Logs entries are displayed to the console if their level is 
 * smaller than `node.verbosity`.
 * 
 * Logs entries are forwarded to the server if their level is
 * smaller than `node.remoteVerbosity`.
 * 
 * @param {string} txt The text to output
 * @param {string|number} level Optional. The verbosity level of this log. Defaults, level = 0
 * @param {string} prefix Optional. A text to display at the beginning of the log entry. Defaults prefix = 'nodeGame: ' 
 * 
 */
	node.log = function (txt, level, prefix) {
		if ('undefined' === typeof txt) return false;
		
		level 	= level || 0;
		prefix 	= ('undefined' === typeof prefix) 	? 'ng> '
													: prefix;
		
		if ('string' === typeof level) {
			level = node.verbosity_levels[level];
		}
		if (node.verbosity > level) {
			console.log(prefix + txt);
		}
//		if (node.remoteVerbosity > level) {
//			var remoteMsg = node.msg.create({
//				target: node.target.LOG,
//				text: level,
//				data: txt,
//				to: 'SERVER'
//			});
//			console.log(txt)
//			node.socket.send(remoteMsg);
//		}
	};

/**
 * ### node.info
 * 
 * Logs an INFO message
 */
	node.info = function (txt, prefix) {
		node.log(txt, node.verbosity_levels.INFO, prefix);
	};

/**
 * ### node.warn
 * 
 * Logs a WARNING message
 */
	node.warn = function (txt, prefix) {
		node.log(txt, node.verbosity_levels.WARN, prefix);
	};

/**
 * ### node.err
 * 
 * Logs an ERROR message
 */
	node.err = function (txt, prefix) {
		node.log(txt, node.verbosity_levels.ERR, prefix);
	};

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # Variables
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` variables and constants module
 * 
 * ---
 * 
 */

(function (exports, node) {
	
	// ## Constants

/**
 * ### node.actions
 * 
 * Collection of available nodeGame actions
 * 
 * The action adds an initial semantic meaning to the
 * message. It specify the nature of requests
 * "Why the message was sent?"
 * 
 * Semantics:
 * 
 * - SET: Store / changes the value of a property in the receiver of the msg
 * - GET: Asks the value value of a property to the receiver of the msg
 * - SAY: Announces a change of state or other global property in the sender of the msg
 * 
 */
	node.action = {};

	node.action.SET = 'set'; 	
	node.action.GET = 'get'; 	
	node.action.SAY = 'say'; 	

/**
 * ### node.target
 * 
 * Collection of available nodeGame targets
 * 
 * The target adds an additional level of semantic 
 * for the message, and specifies the nature of the
 * information carried in the message. 
 * 
 * It answers the question: "What is the content of the message?" 
 */
	node.target = {};


// #### target.DATA
// Generic identifier for any type of data 
	node.target.DATA		= 'DATA';		
	
// #### target.HI
// A client is connecting for the first time
	node.target.HI = 'HI';		

// #### target.HI_AGAIN
// A client re-connects to the server within the same session	
	node.target.HI_AGAIN = 'HI_AGAIN'; 	

// #### target.PCONNECT
// A new client just connected to the player endpoint	
	node.target.PCONNECT = 'PCONNECT';
	
// #### target.PDISCONNECT
// A client that just disconnected from the player endpoint 
	node.target.PDISCONNECT = 'PDISCONNECT';

// #### target.MCONNECT
// A client that just connected to the admin (monitor) endpoint	
	node.target.MCONNECT = 'MCONNECT'; 		

// #### target.MDISCONNECT
// A client just disconnected from the admin (monitor) endpoint 
	node.target.MDISCONNECT = 'MDISCONNECT';

// #### target.PLIST
// The list of clients connected to the player endpoint was updated
	node.target.PLIST = 'PLIST';
	
// #### target.MLIST	
// The list of clients connected to the admin (monitor) endpoint was updated	
	node.target.MLIST = 'MLIST';

// #### target.STATE
// A client notifies his own state
	node.target.STATE = 'STATE';
	
// #### target.STAGE
// A client notifies his own state
	node.target.STAGE = 'STAGE';	
	
// #### target.REDIRECT
// Redirects a client to a new uri
	node.target.REDIRECT = 'REDIRECT'; 

// #### target.SETUP
// Asks a client update its configuration	
	node.target.SETUP = 'SETUP'; 
	
// #### target.GAMECOMMAND
// Ask a client to start/pause/stop/resume the game	
	node.target.GAMECOMMAND = 'GAMECOMMAND'; 	
	
// #### target.JOIN
// Asks a client to join another channel/subchannel/room
	node.target.JOIN = 'JOIN';

// #### target.LOG
// A log entry
	node.target.LOG = 'LOG';

//#### not used targets (for future development)
	
	node.target.TXT 		= 'TXT';	// Text msg
	
	// Still to implement
	node.target.BYE			= 'BYE';	// Force disconnects
	node.target.ACK			= 'ACK';	// A reliable msg was received correctly

	node.target.WARN 		= 'WARN';	// To do.
	node.target.ERR			= 'ERR';	// To do.


/**
 * ### Game commands
 * 
 * - node.gamecommand.start
 * - node.gamecommand.pause
 * - node.gamecommand.resume
 * - node.gamecommand.stop
 */
	node.gamecommand = {	
			start: 'start',
			pause: 'pause',
			resume: 'resume',
			stop: 'stop',
			restart: 'restart',
			goto_stage: 'goto_stage'
	};
		

	

/**
 * ### Direction
 * 
 * Distiguishes between incoming and outgoing messages
 * 
 * - node.IN
 * - node.OUT
 */
	node.IN		= 'in.';
	node.OUT	= 'out.';	


/**
 * ### node.is
 * 
 * Levels associates to the states of the nodeGame engine
 * 
 */	
	node.is = {};

// #### is.UNKNOWN
// A game has not been initialized
	node.is.UNKNOWN = 0;

// #### is.INITIALIZING
// The engine is loading all the modules	
	node.is.INITIALIZING = 1;

// #### is.INITIALIZED
// The engine is fully loaded, but there is still no game	
	node.is.INITIALIZED = 5;	
	
// #### is.GAMELOADED
// The engine is fully loaded, and a game has been loaded	
	node.is.GAMELOADED = 10;	
	
// #### is.DEAD
// An unrecoverable error has occurred	
	node.is.DEAD = -1;		
	
// TODO: remove these	
// #### is.LOADING
// A game is loading	
	node.is.LOADING = 10;		
	
// #### is.LOADED
// A game has been loaded, but the GameWindow object could still require some time	
	node.is.LOADED  = 25;		
	
// #### is.PLAYING
// Everything is ready	
	node.is.PLAYING = 50;		
	
// #### is.DONE
// The player completed the game state	
	node.is.DONE = 100;	
	
	


	
	

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
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
 * ### EventEmitter.global
 * 
 * 
 * Global listeners always active during the game
 * 
 */	
    this.global = this._listeners = {};
    
 /**
  * ### EventEmitter.local
  * 
  * Local listeners erased after every stage update
  * 
  */   
    this.local = this._localListeners = {};

/**
 * ### EventEmitter.history
 * 
 * Database of emitted events
 * 
 * 	@see NDDB
 * 	@see EventEmitter.EventHistory
 * 	@see EventEmitter.store
 * 
 */      
    this.history = new EventHistory();
}

// ## EventEmitter methods

EventEmitter.prototype = {

    constructor: EventEmitter,
	
/**
 * ### EventEmitter.add
 * 
 * Registers a global listener for an event
 * 
 * Listeners registered with this method are valid for the
 * whole length of the game
 * 
 * @param {string} type The event name
 * @param {function} listener The function to fire
 * 
 * @see EventEmitter.addLocal
 */
    add: function (type, listener) {
    	if (!type || !listener) return;
    	if ('undefined' === typeof this.global[type]){
    		this.global[type] = [];
    	}
        node.log('Added Listener: ' + type + ' ' + listener, 'DEBUG');
        this.global[type].push(listener);
    },
    
/**
 * ### EventEmitter.addLocal
 * 
 * Registers a local listener for an event
 * 
 * Listeners registered with this method are valid *only* 
 * for the same game stage (step) in which they have been
 * registered 
 * 
 * @param {string} type The event name
 * @param {function} listener The function to fire
 * 
 * @see EventEmitter.add
 * 
 */
    addLocal: function (type, listener) {
    	if (!type || !listener) return;
    	if ('undefined' === typeof this.local[type]){
            this.local[type] = [];
        }
    	node.log('Added Local Listener: ' + type + ' ' + listener, 'DEBUG');
        this.local[type].push(listener);
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
    	
        
        // Log the event into node.history object, if present
        if (node.conf && node.conf.events) {
        		
        	if (node.conf.events.history) {
	        	var o = {
		        		event: event.type,
		        		//target: node.game,
		        		stage: node.game.stage,
		        		p1: p1,
		        		p2: p2,
		        		p3: p3
		        	};
	        	
	        	this.history.insert(o);
        	}
        	
        	// <!-- Debug
            if (node.conf.events.dumpEvents) {
            	node.log('F: ' + event.type);
            }
        }
        
        
        // Fires global listeners
        if (this.global[event.type] instanceof Array) {
            var listeners = this.global[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
            	listeners[i].call(this.game, p1, p2, p3);
            }
        }
        
        // Fires local listeners
        if (this.local[event.type] instanceof Array) {
            var listeners = this.local[event.type];
            for (var i=0, len=listeners.length; i < len; i++) {
            	listeners[i].call(this.game, p1, p2, p3);
            }
        }
       
    },

/**
 * ### EventEmitter.remove
 * 
 * Deregisters one or multiple event listeners
 * 
 * @param {string} type The event name
 * @param {function} listener Optional. The specific function to deregister 
 * 
 * @return Boolean TRUE, if the removal is successful
 */
	remove: function(type, listener) {
	
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
		
		var r1 = removeFromList(type, listener, this.global);
		var r2 = removeFromList(type, listener, this.local);
	
		return r1 || r2;
	},
    
/**
 * ### EventEmitter.clearStage
 * 
 * Undocumented (for now)
 * 
 * @TODO: This method wraps up clearLocalListeners. To re-design.
 */ 
	clearStage: function(stage) {
		this.clearLocal();
		return true;
	},
    
/**
 * ### EventEmitter.clearLocalListeners
 * 
 * Removes all entries from the local listeners register
 * 
 */
	clearLocal: function() {
		node.log('Cleaning Local Listeners', 'DEBUG');
		for (var key in this.local) {
			if (this.local.hasOwnProperty(key)) {
				this.remove(key, this.local[key]);
			}
		}
		
		this.local = {};
	},
    
/**
 * ### EventEmitter.printAll
 * 
 * Prints to console all the registered functions 
 */
	printAll: function() {
		node.log('nodeGame:\tPRINTING ALL LISTENERS', 'DEBUG');
	    
		for (var i in this.global){
	    	if (this.global.hasOwnProperty(i)){
	    		console.log(i + ' ' + i.length);
	    	}
	    }
		
		for (var i in this.local){
	    	if (this.local.hasOwnProperty(i)){
	    		console.log(i + ' ' + i.length);
	    	}
	    }
	    
	}
	
};


/**
 * # EventHistory
 * 
 */
function EventHistory() {
	
	/**
	 * ### EventHistory.history
	 * 
	 * Database of emitted events
	 * 
	 * 	@see NDDB
	 * 	@see EventEmitter.store
	 * 
	 */      
	this.history = new NDDB();
	    
    this.history.h('stage', function(e) {
    	if (!e) return;
    	var stage = ('object' === typeof e.stage) ? e.stage
    											  : node.game.stage;
    	return node.GameStage.toHash(stage, 'S.s.r');
    });
	    
}

EventHistory.prototype.remit = function(stage, discard, keep) {

	if (!this.history.count()) {
		node.log('no event history was found to remit', 'WARN');
		return false;
	}
			
	node.log('remitting ' + node.events.history.count() + ' events', 'DEBUG');
			
	var hash, db;
	
	if (stage) {
		
		this.history.rebuildIndexes();
		
		hash = new GameStage(session.stage).toHash('S.s.r'); 
		
		if (!this.history.stage) {
			node.log('no old events to re-emit were found during session recovery', 'DEBUG');
			return false; 
		}
		if (!this.history.stage[hash]){
			node.log('the current stage ' + hash + ' has no events to re-emit', 'DEBUG');
			return false; 
		}
		
		db = this.history.stage[hash];
	}
	else {
		db = this.history;
	}
	
	// cleaning up the events to remit
	
	if (discard) {
		db.select('event', 'in', discard).remove();
	}
	
	if (keep) {
		db = db.select('event', 'in', keep);
	}
		
	if (!db.count()){
		node.log('no valid events to re-emit after cleanup', 'DEBUG');
		return false;
	}
	
	var remit = function () {
		node.log('re-emitting ' + db.count() + ' events', 'DEBUG');
		// We have events that were fired at the stage when 
		// disconnection happened. Let's fire them again 
		db.each(function(e) {
			node.emit(e.event, e.p1, e.p2, e.p3);
		});
	};
	
	if (node.game.isReady()) {
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
	
	// the stage in which the listener is
	// allowed to be executed
	this.stage = o.stage || node.game.stage; 	
	
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
 * # GameStage
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Representation of the stage of a game: 
 * 
 * 	`stage`: the higher-level building blocks of a game
 * 	`step`: the sub-unit of a stage
 * 	`round`: the number of repetition for a stage. Defaults round = 1
 * 
 * 
 * @see GameLoop
 * 
 * ---
 * 
 */

(function(exports, node) {
	
// ## Global scope
	
var JSUS = node.JSUS;

// Expose constructor
exports.GameStage = GameStage;




GameStage.defaults = {};

/**
 * ### GameStage.defaults.hash
 * 
 * Default hash string for game-stages
 * 
 * 	@see GameStage.toHash
 */
GameStage.defaults.hash = 'S.s.r';

/**
 * ## GameStage constructor
 * 
 * Creates an instance of a GameStage 
 * 
 * It accepts an object literal or an hash string as defined in `GameStage.defaults.hash`.
 *
 * The stage and step can be either an integer (1-based index) or a string
 * (valid stage/step name).  The round must be an integer.
 * 
 * If no parameter is passed, all the properties of the GameStage 
 * object are set to 0
 * 
 * @param {object|string} gs An object literal | hash string representing the game stage
 * 
 * 	@see GameStage.defaults.hash 
 */
function GameStage(gs) {

// ## Public properties	

/**
 * ### GameStage.stage
 * 
 * The N-th game-block (stage) in the game-loop currently being executed
 * 
 * 	@see GameLoop
 * 
 */	
	this.stage = 0;

/**
 * ### GameStage.step
 * 
 * The N-th game-block (step) nested in the current stage
 * 
 * 	@see GameStage.stage
 * 
 */	
	this.step =	1;

/**
 * ### GameStage.round
 * 
 * The number of times the current stage was repeated 
 * 
 */		
	this.round = 1;

	if ('undefined' === typeof gs) {
		this.stage = 0;
		this.step  = 0;
		this.round = 0;
	}
	else if ('string' === typeof gs) {
		var tokens = gs.split('.');
		var stageNum = parseInt(tokens[0]);
		var stepNum  = parseInt(tokens[1]);
		var roundNum = parseInt(tokens[2]);

		if (tokens[0])
			this.stage = !isNaN(stageNum) ? stageNum : tokens[0];

		if ('undefined' !== typeof tokens[1])
			this.step  = !isNaN(stepNum)  ? stepNum  : tokens[1];

		if ('undefined' !== typeof tokens[2])
			this.round = roundNum;
	}
	else if ('object' === typeof gs) {	
		if ('undefined' !== typeof gs.stage)
			this.stage = gs.stage;

		if ('undefined' !== typeof gs.step)
			this.step  = gs.step;

		if ('undefined' !== typeof gs.round)
			this.round = gs.round;
	}
	
}

/**
 * ## GameStage.toString
 * 
 * Converts the current instance of GameStage to a string
 * 
 * @return {string} out The string representation of the stage of the GameStage
 */
GameStage.prototype.toString = function() {
	var out = this.toHash('S.s.r');
	return out;
};

/**
 * ## GameStage.toHash
 * 
 * Returns a simplified hash of the stage of the GameStage,
 * according to the input string
 * 
 * @param {string} str The hash code
 * @return {string} hash The hashed game stages
 * 
 * @see GameStage.toHash (static)
 */
GameStage.prototype.toHash = function(str) {
	return GameStage.toHash(this, str);
};

/**
 * ## GameStage.toHash (static)
 * 
 * Returns a simplified hash of the stage of the GameStage,
 * according to the input string. 
 * 
 * The following characters are valid to determine the hash string
 * 
 * 	- S: stage
 * 	- s: step
 * 	- r: round
 * 
 * E.g. 
 * 
 * ```javascript
 * 		var gs = new GameStage({
 * 							round: 1,
 * 							stage: 2,
 * 							step: 1
 * 		});
 * 
 * 		gs.toHash('(R) S.s'); // (1) 2.1
 * ```
 * 
 * @param {GameStage} gs The game stage to hash
 * @param {string} str The hash code
 * @return {string} hash The hashed game stages
 */
GameStage.toHash = function(gs, str) {
	if (!gs || 'object' !== typeof gs) return false;
	if (!str || !str.length) return gs.toString();
	
	var hash = '',
		symbols = 'Ssr',
		properties = ['stage', 'step', 'round'];
	
	for (var i = 0; i < str.length; i++) {
		var idx = symbols.indexOf(str[i]); 
		hash += (idx < 0) ? str[i] : gs[properties[idx]];
	}
	return hash;
};

/**
 * ## GameStage.compare (static)
 * 
 * Compares two GameStage objects|hash strings and returns
 * 
 *  - 0 if they represent the same game stage
 *  - a positive number if gs1 is ahead of gs2 
 *  - a negative number if gs2 is ahead of gs1 
 * 
 * The accepted hash string format is the following: 'S.s.r'.
 * Refer to `GameStage.toHash` for the semantic of the characters.
 * 
 * 
 * @param {GameStage|string} gs1 The first GameStage object|string to compare
 * @param {GameStage|string} gs2 The second GameStage object|string to compare
 * 
 * @return {Number} result The result of the comparison
 * 
 * @see GameStage.toHash (static)
 * 
 */
GameStage.compare = function(gs1, gs2) {
	if (!gs1 && !gs2) return 0;
	if (!gs2) return 1;
	if (!gs1) return -1;

	// Convert the parameters to objects, if an hash string was passed
	if ('string' === typeof gs1) gs1 = new GameStage(gs1);
	if ('string' === typeof gs2) gs2 = new GameStage(gs2);
	
	
	// <!--		
	//		console.log('COMPARAING GSs','DEBUG')
	//		console.log(gs1,'DEBUG');
	//		console.log(gs2,'DEBUG');
	// -->
	var result = gs1.stage - gs2.stage;
	
	if (result === 0 && 'undefined' !== typeof gs1.round) {
		result = gs1.round - gs2.round;
		
		if (result === 0 && 'undefined' !== typeof gs1.step) {
			result = gs1.step - gs2.step;
		}
	}
	
	
//	<!-- console.log('EQUAL? ' + result); -->

	
	return result;
};

/**
 * ## GameStage.stringify (static)
 * 
 * Converts an object GameStage-like to its string representation
 * 
 * @param {GameStage} gs The object to convert to string	
 * @return {string} out The string representation of a GameStage object
 */ 
GameStage.stringify = function(gs) {
	if (!gs) return;
	var out = new GameStage(gs).toHash('(r) S.s_i');
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

var GameStage = node.GameStage;

// Exposing constructor
exports.PlayerList = PlayerList;

// Inheriting from NDDB	
PlayerList.prototype = new NDDB();
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
	if (!options.update) options.update = {};
	if ('undefined' === typeof options.update.indexes) {
		options.update.indexes = true;
	}
	
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
	
	// TODO : do the checking automatically
	// We check if the index are not existing already because 
	// it could be that the constructor is called by the breed function
	// and in such case we would duplicate them
	
	if (!this.id) {
		this.i('id', function(p) {
			return p.id;
		});
	}
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
 * ### PlayerList.updatePlayerStage
 * 
 * Updates the value of the `stage` object of a player in the database
 * 
 * @param {number} id The id of the player to update
 * @param {GameStage} stage The new value of the stage property
 * @return {Boolean} TRUE, if update is successful
 * 
 */
PlayerList.prototype.updatePlayerStage = function (id, stage) {
	
	if (!this.exist(id)) {
		node.log('Attempt to access a non-existing player from the the player list ' + player.id, 'WARN');
		return false;	
	}
	
	if ('undefined' === typeof stage) {
		node.log('Attempt to assign to a player an undefined stage', 'WARN');
		return false;
	}
	
	this.select('id', '=', id).first().stage = stage;	

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
	return 'undefined' !== typeof this.id[id];
};

/**
 * ### PlayerList.isStageDone
 * 
 * Checks whether all players in the database are DONE
 * for the specified `GameStage`.
 * 
 * @param {GameStage} stage Optional. The GameStage to check. Defaults stage = node.game.stage
 * @param {Boolean} extended Optional. If TRUE, also newly connected players are checked. Defaults, FALSE
 * @return {Boolean} TRUE, if all the players are DONE with the specified `GameStage`
 * 
 * 		@see `PlayerList.actives`
 * 		@see `PlayerList.checkStage`
 */
PlayerList.prototype.isStageDone = function (stage, extended) {
	
	// <!-- console.log('1--- ' + stage); -->
	stage = stage || node.game.stage;
	// <!-- console.log('2--- ' + stage); -->
	extended = extended || false;
	
	var result = this.map(function(p){
		var gs = new GameStage(p.stage);
		// <!-- console.log('Going to compare ' + gs + ' and ' + stage); -->
		
		// Player is done for his stage
		if (p.stage.is !== node.is.DONE) {
			return 0;
		}
		// The stage of the player is actually the one we are interested in
		if (GameStage.compare(stage, p.stage, false) !== 0) {
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
 * Counts the number of player whose stage is different from 0:0:0
 * 
 * @return {number} result The number of player whose stage is different from 0:0:0
 * 
 */
PlayerList.prototype.actives = function () {
	var result = 0;
	var gs;
	this.each(function(p) {
		gs = new GameStage(p.stage);	
		// <!-- Player is on 0.0.0 stage -->
		if (GameStage.compare(gs, new GameStage()) !== 0) {
			result++;
		}
	});	
	// <!-- node.log('ACTIVES: ' + result); -->
	return result;
};

/**
 * ### PlayerList.checkStage
 * 
 * If all the players are DONE with the specfied stage,
 * emits a `STAGEDONE` event
 * 
 * @param {GameStage} stage Optional. The GameStage to check. Defaults stage = node.game.stage
 * @param {Boolean} extended Optional. If TRUE, also newly connected players are checked. Defaults, FALSE
 * 
 * 		@see `PlayerList.actives`
 * 		@see `PlayerList.isStageDone`
 * 
 */
PlayerList.prototype.checkStage = function (stage, extended) {
	if (this.isStageDone(stage, extended)) {
		node.emit('STAGEDONE');
	}
};

/**
 * ### PlayerList.toString
 * 
 * Returns a string representation of the stage of the 
 * PlayerList
 * 
 * @param {string} eol Optional. End of line separator between players
 * @return {string} out The string representation of the stage of the PlayerList
 */
PlayerList.prototype.toString = function (eol) {
	
	var out = '';
	var EOL = eol || '\n';
	
	this.forEach(function(p) {
    	out += p.id + ': ' + p.name;
    	var stage = new GameStage(p.stage);
    	out += ': ' + stage + EOL;
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
 * 	`admin`: Whether the player is an admin
 * 	`disconnected`: Whether the player has disconnected
 * 
 * Others properties are public and can be changed during the game.
 * 
 *	`name`: An alphanumeric name associated to the player 
 *	`stage`: The current stage of the player as relative to a game
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
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'sid', {
			value: sid,
	    	enumerable: true
		});
	}
	else {
		this.sid = sid;
	}
	
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
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'id', {
			value: id,
	    	enumerable: true
		});
	}
	else {
		this.id = id;
	}
	
/**
 * ### Player.count
 * 
 * The ordinal position of the player in a PlayerList object
 * 
 * 	@see PlayerList
 */		
	var count = pl.count;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'count', {
	    	value: count,
	    	enumerable: true
		});
	}
	else {
		this.count = count;
	}
	
/**
 * ### Player.admin
 * 
 * The admin status of the client
 * 
 */	
	var admin = !!pl.admin;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'admin', {
			value: admin,
	    	enumerable: true
		});
	}
	else {
		this.admin = admin;
	}
	
/**
 * ### Player.disconnected
 * 
 * The connection status of the client
 * 
 */	
	var disconnected = !!pl.disconnected;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'disconnected', {
			value: disconnected,
	    	enumerable: true
		});
	}
	else {
		this.disconnected = disconnected;
	}
	
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
 * ### Player.stage
 * 
 * Reference to the game-stage the player currently is
 * 
 * 	@see node.game.stage
 * 	@see GameStage
 */		
	this.stage = pl.stage || new GameStage();

	
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
	return (this.name || '' ) + ' (' + this.id + ') ' + new GameStage(this.stage);
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
var GameStage = node.GameStage,
	JSUS = node.JSUS;

exports.GameMsg = GameMsg;


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
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'id', {
			value: id,
			enumerable: true
		});
	}
	else {
		this.id = id;
	}

/**
 * ### GameMsg.session
 * 
 * The session id in which the message was generated
 * 
 * @api private
 */	
	var session = gm.session;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'session', {
			value: session,
			enumerable: true
		});
	}
	else {
		this.session = session;
	}

// ## Public properties	

/**
 * ### GameMsg.stage
 * 
 * The game-stage in which the message was generated
 * 
 * 	@see GameStage
 */	
	this.stage = gm.stage;

/**
 * ### GameMsg.action
 * 
 * The action of the message
 * 
 * 	@see node.action
 */		
	this.action = gm.action;
	
/**
 * ### GameMsg.target
 * 
 * The target of the message
 * 
 * 	@see node.target
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
	
	var gs = new GameStage(this.stage);
	
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
 * @TODO: Create an hash method as for GameStage
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
 * # Stager
 *
 * `nodeGame` container and builder of the game sequence
 *
 * ---
 */
(function(exports, node) {

// ## Global scope
exports.Stager = Stager;

var J = node.JSUS;

/**
 * ## Stager constructor
 *
 * Creates a new empty instance of Stager
 */
function Stager() {
	this.clear();
}

// ## Stager methods

/**
 * ### Stager.clear
 *
 * Resets Stager object to initial state
 *
 * Called by the constructor.
 */
Stager.prototype.clear = function() {
	/**
	 * ### Stager.steps
	 *
	 * Step object container
	 *
	 * key: step ID,  value: step object
	 *
	 * @see Stager.addStep
	 */
	this.steps = {};

	/**
	 * ### Stager.stages
	 *
	 * Stage object container
	 *
	 * key: stage ID,  value: stage object
	 *
	 * Stage aliases are stored the same way, with a reference to the original
	 * stage object as the value.
	 *
	 * @see Stager.addStage
	 */
	this.stages = {};


	/**
	 * ### Stager.sequence
	 *
	 * Sequence block container
	 *
	 * Stores the game plan in 'simple mode'.
	 *
	 * @see Stager.gameover
	 * @see Stager.next
	 * @see Stager.repeat
	 * @see Stager.loop
	 * @see Stager.doLoop
	 */
	this.sequence = [];


	/**
	 * ### Stager.generalNextFunction
	 *
	 * General next-stage decider function
	 *
	 * Returns the id of the next game step.
	 * Available only when nodegame is executed in _flexible_ mode.
	 *
	 * @see Stager.registerGeneralNext
	 */
	this.generalNextFunction = null;

	/**
	 * ### Stager.nextFunctions
	 *
	 * Per-stage next-stage decider function
	 *
	 * key: stage ID,  value: callback function
	 *
	 * Stores functions to be called to yield the id of the next game stage
	 * for a specific previous stage.
	 *
	 * @see Stager.registerNext
	 */
	this.nextFunctions = {};
};

/**
 * ### Stager.registerGeneralNext
 *
 * Sets general callback for next stage decision
 *
 * Available only when nodegame is executed in _flexible_ mode.
 * The callback given here is used to determine the next stage.
 *
 * @param {function} func The decider callback.  It should return the name of
 *  the next stage, 'NODEGAME_GAMEOVER' to end the game or false for sequence end.
 */
Stager.prototype.registerGeneralNext = function(func) {
	if ('function' !== typeof func) {
		node.warn("registerGeneralNext didn't receive function parameter");
		return;
	}

	this.generalNextFunction = func;
}

/**
 * ### Stager.registerNext
 *
 * Registers a step-decider callback for a specific stage
 *
 * The function overrides the general callback for the specific stage, 
 * and determines the next stage.
 * Available only when nodegame is executed in _flexible_ mode.
 *
 * @param {string} id The name of the stage after which the decider function will be called
 * @param {function} func The decider callback.  It should return the name of
 *  the next stage, 'NODEGAME_GAMEOVER' to end the game or false for sequence end.
 *  
 * @see Stager.registerGeneralNext
 */
Stager.prototype.registerNext = function(id, func) {
	if ('function' !== typeof func) {
		node.warn("registerNext didn't receive function parameter");
		return;
	}

	if (!this.stages[id]) {
		node.warn('registerNext received nonexistent stage id');
		return;
	}

	this.nextFunctions[id] = func;
}

/**
 * ### Stager.addStep
 *
 * Adds a new step
 *
 * Registers a new game step object.  This must have at least the following fields:
 *
 *  - id (string): The step's name
 *  - cb (function): The step's callback function
 *
 * @param {object} step A valid step object.  Shallowly copied.
 */
Stager.prototype.addStep = function(step) {
	if (!this.checkStepValidity(step)) {
		node.warn('addStep received invalid step');
		return false;
	}

	this.steps[step.id] = step;
	return true;
};

/**
 * ### Stager.addStage
 *
 * Adds a new stage
 *
 * Registers a new game stage object. This must have at least the following fields:
 *
 *  - id (string): The stage's name
 *  - steps (array of strings): The names of the steps that belong to this stage.
 *     These must have been added with the `addStep` method before this call.
 *
 * Alternatively, a step object may be given.  Then that step and a stage
 * containing only that step are added.
 *
 * @param {object} stage A valid stage or step object.  Shallowly copied.
 *
 * @return {boolean} true on success, false on error
 * 
 * @see Stager.addStep
 */
Stager.prototype.addStage = function(stage) {
	// Handle wrapped steps:
	if (this.checkStepValidity(stage)) {
		if (!this.addStep(stage)) return false;
		if (!this.addStage({
			id: stage.id,
			steps: [ stage.id ]
		    })) return false;

		return true;
	}

	if (!this.checkStageValidity(stage)) {
		node.warn('addStage received invalid stage');
		return false;
	}

	this.stages[stage.id] = stage;
	return true;
};

/**
 * ### Stager.gameover
 *
 * Adds gameover block to sequence
 *
 * @return {object} this GameStage object
 */
Stager.prototype.gameover = function() {
	this.sequence.push({ type: 'gameover' });

	return this;
};

/**
 * ### Stager.next
 *
 * Adds stage block to sequence
 *
 * The `id` parameter must have the form 'stageID' or 'stageID AS alias'.
 * stageID must be a valid stage and it (or alias if given) must be unique
 * in the sequence.
 *
 * @param {string} id A valid stage name with optional alias
 *
 * @return {object} this GameStage object on success, null on error
 *
 * @see Stager.addStage
 */
Stager.prototype.next = function(id) {
	var stageName = this.handleAlias(id);

	if (stageName === null) {
		node.warn('next received invalid stage name');
		return null;
	}

	this.sequence.push({
		type: 'plain',
		id: stageName
	});

	return this;
};

/**
 * ### Stager.repeat
 *
 * Adds repeated stage block to sequence
 *
 * @param {string} id A valid stage name with optional alias
 * @param {number} nRepeats The number of repetitions
 *
 * @return {object} this GameStage object on success, null on error
 *
 * @see Stager.addStage
 * @see Stager.next
 */
Stager.prototype.repeat = function(id, nRepeats) {
	var stageName = this.handleAlias(id);

	if (stageName === null) {
		node.warn('repeat received invalid stage name');
		return null;
	}

	this.sequence.push({
		type: 'repeat',
		id: stageName,
		num: nRepeats
	});

	return this;
};

/**
 * ### Stager.loop
 *
 * Adds looped stage block to sequence
 *
 * The given stage will be repeated as long as the `func` callback returns true.
 * If it returns false on the first time, the stage is never executed.
 *
 * @param {string} id A valid stage name with optional alias
 * @param {function} func Callback returning true for repetition
 *
 * @return {object} this GameStage object on success, null on error
 *
 * @see Stager.addStage
 * @see Stager.next
 * @see Stager.doLoop
 */
Stager.prototype.loop = function(id, func) {
	var stageName = this.handleAlias(id);

	if (stageName === null) {
		node.warn('loop received invalid stage name');
		return null;
	}

	this.sequence.push({
		type: 'loop',
		id: stageName,
		cb: func
	});

	return this;
};

/**
 * ### Stager.doLoop
 *
 * Adds alternatively looped stage block to sequence
 *
 * The given stage will be repeated once plus as many times as the `func`
 * callback returns true.
 *
 * @param {string} id A valid stage name with optional alias
 * @param {function} func Callback returning true for repetition
 *
 * @return {object} this GameStage object on success, null on error
 *
 * @see Stager.addStage
 * @see Stager.next
 * @see Stager.loop
 */
Stager.prototype.doLoop = function(id, func) {
	var stageName = this.handleAlias(id);

	if (stageName === null) {
		node.warn('doLoop received invalid stage name');
		return null;
	}

	this.sequence.push({
		type: 'doLoop',
		id: stageName,
		cb: func
	});

	return this;
};

/**
 * ### Stager.getSequence
 *
 * Returns the sequence of stages
 *
 * @param {string} format 'hstages' for an array of human-readable stage descriptions,
 *  'hsteps' for an array of human-readable step descriptions,
 *  'o' for the internal JavaScript object
 *
 * @return {array|object} The stage sequence in requested format. Null on error.
 */
Stager.prototype.getSequence = function(format) {
	var result;
	var seqIdx;
	var seqObj;
	var stepPrefix;
	var gameOver = false;

	switch (format) {
	case 'hstages':
		result = [];

		for (seqIdx in this.sequence) {
			seqObj = this.sequence[seqIdx];

			switch (seqObj.type) {
			case 'gameover':
				result.push('[game over]');
				break;

			case 'plain':
				result.push(seqObj.id);
				break;

			case 'repeat':
				result.push(seqObj.id + ' [x' + seqObj.num + ']');
				break;

			case 'loop':
				result.push(seqObj.id + ' [loop]');
				break;

			case 'doLoop':
				result.push(seqObj.id + ' [doLoop]');
				break;

			default:
				node.warn('unknown sequence object type');
				break;
			}
		}
		break;
	
	case 'hsteps':
		result = [];

		for (seqIdx in this.sequence) {
			seqObj = this.sequence[seqIdx];
			stepPrefix = seqObj.id + '.';

			switch (seqObj.type) {
			case 'gameover':
				result.push('[game over]');
				break;

			case 'plain':
				this.stages[seqObj.id].steps.map(function(stepID) {
					result.push(stepPrefix + stepID);
				});
				break;

			case 'repeat':
				this.stages[seqObj.id].steps.map(function(stepID) {
					result.push(stepPrefix + stepID + ' [x' + seqObj.num + ']');
				});
				break;

			case 'loop':
				this.stages[seqObj.id].steps.map(function(stepID) {
					result.push(stepPrefix + stepID + ' [loop]');
				});
				break;

			case 'doLoop':
				this.stages[seqObj.id].steps.map(function(stepID) {
					result.push(stepPrefix + stepID + ' [doLoop]');
				});
				break;

			default:
				node.warn('unknown sequence object type');
				break;
			}
		}
		break;

	case 'o':
		result = this.sequence;
		break;

	default:
		node.warn('getSequence got invalid format characters');
		return null;
	}

	return result;
};

/**
 * ### Stager.getStepsFromStage
 *
 * Returns the steps of a stage
 *
 * @param {string} id A valid stage name
 *
 * @return {array} The steps in the stage
 */
Stager.prototype.getStepsFromStage = function(id) {
	return this.stages[id].steps;
};

// DEBUG:  Run sequence.  Should be deleted later on.
Stager.prototype.seqTestRun = function(expertMode, firstStage) {
	var seqObj;
	var curStage;
	var stageNum;
	
	console.log('* Commencing sequence test run!');

	if (!expertMode) {
		for (stageNum in this.sequence) {
			seqObj = this.sequence[stageNum];
			console.log('** num: ' + stageNum + ', type: ' + seqObj.type);
			switch (seqObj.type) {
			case 'gameover':
				console.log('* Game Over.');
				return;
				break;

			case 'plain':
				this.stageTestRun(seqObj.id);
				break;

			case 'repeat':
				for (var i = 0; i < seqObj.num; i++) {
					this.stageTestRun(seqObj.id);
				}
				break;

			case 'loop':
				while (seqObj.cb()) {
					this.stageTestRun(seqObj.id);
				}
				break;

			case 'doLoop':
				do {
					this.stageTestRun(seqObj.id);
				} while (seqObj.cb());
				break;

			default:
				node.warn('unknown sequence object type');
				break;
			}
		}
	}
	else {
		// Get first stage:
		if (firstStage) {
			curStage = firstStage;
		}
		else if (this.generalNextFunction) {
			curStage = this.generalNextFunction();
		}
		else {
			curStage = null;
		}

		while (curStage) {
			this.stageTestRun(curStage);

			// Get next stage:
			if (this.nextFunctions[curStage]) {
				curStage = this.nextFunctions[curStage]();
			}
			else if (this.generalNextFunction) {
				curStage = this.generalNextFunction();
			}
			else {
				curStage = null;
			}

			// Check stage validity:
			if (curStage !== null && !this.stages[curStage]) {
				node.warn('next-deciding callback yielded invalid stage');
				curStage = null;
			}
		}
	}
};

// DEBUG:  Run stage.  Should be deleted later on.
Stager.prototype.stageTestRun = function(stageId) {
	var steps = this.stages[stageId].steps;
	var stepId;

	for (var i in steps) {
		stepId = steps[i];
		this.steps[stepId].cb();
	}
};


// ## Stager private methods

/**
 * ### Stager.checkStepValidity
 *
 * Returns whether given step is valid
 *
 * Checks for existence and type correctness of the fields.
 *
 * @param {object} step The step object
 *
 * @return {bool} true for valid step objects, false otherwise
 *
 * @see Stager.addStep
 *
 * @api private
 */
Stager.prototype.checkStepValidity = function(step) {
	if (!step) return false;
	if ('string' !== typeof step.id) return false;
	if ('function' !== typeof step.cb) return false;

	return true;
};

/**
 * ### Stager.checkStepValidity
 *
 * Returns whether given stage is valid
 *
 * Checks for existence and type correctness of the fields.
 * Checks for referenced step existence.
 * Steps objects are invalid.
 *
 * @param {object} stage The stage object
 *
 * @return {bool} true for valid stage objects, false otherwise
 *
 * @see Stager.addStage
 *
 * @api private
 */
Stager.prototype.checkStageValidity = function(stage) {
	if (!stage) return false;
	if ('string' !== typeof stage.id) return false;
	if (!stage.steps && !stage.steps.length) return false;

	// Check whether the referenced steps exist:
	for (var i in stage.steps) {
		if (!this.steps[stage.steps[i]]) return false;
	}

	return true;
};

/**
 * ### Stager.handleAlias
 *
 * Handles stage id and alias strings
 *
 * Takes a string like 'stageID' or 'stageID AS alias' and registers the alias,
 * if existent.
 * Checks whether parameter is valid and unique.
 *
 * @param {string} nameAndAlias The stage-name string
 *
 * @return {string} null on error,
 *  the alias part of the parameter if it exists,
 *  the stageID part otherwise
 *
 * @see Stager.next
 *
 * @api private
 */
Stager.prototype.handleAlias = function(nameAndAlias) {
	var tokens = nameAndAlias.split(' AS ');
	var id = tokens[0].trim();
	var alias = tokens[1] ? tokens[1].trim() : undefined;
	var stageName = alias || id;
	var seqIdx;

	// Check ID validity:
	if (!this.stages[id]) {
		node.warn('handleAlias received nonexistent stage id');
		return null;
	}

	// Check uniqueness:
	for (seqIdx in this.sequence) {
		if (this.sequence[seqIdx].id === stageName) {
			node.warn('handleAlias received non-unique stage name');
			return null;
		}
	}

	// Add alias:
	if (alias) {
		this.stages[alias] = this.stages[id];
		return alias;
	}

	return id;
};

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports,
	'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # GameLoop
 *
 * `nodeGame` container of game-state functions
 *
 * ---
 */
(function(exports, node) {

// ## Global scope
exports.GameLoop = GameLoop;

var Stager = node.Stager;
var GameStage = node.GameStage;

// ## Constants
GameLoop.GAMEOVER = 'NODEGAME_GAMEOVER';
GameLoop.END_SEQ  = 'NODEGAME_END_SEQ';
GameLoop.NO_SEQ   = 'NODEGAME_NO_SEQ';

/**
 * ## GameLoop constructor
 *
 * Creates a new instance of GameLoop
 *
 * Takes a sequence object created with Stager.
 *
 * If the Stager parameter has an empty sequence, flexibile mode is assumed
 * (used by e.g. GameLoop.next).
 *
 * @param {object} plot Optional. The Stager object.
 *
 * @see Stager
 */
function GameLoop(plot) {
	this.plot = plot || null;
}

// ## GameLoop methods

/**
 * ### GameLoop.init
 *
 * Initializes the GameLoop with a plot
 *
 * @param {object} plot The Stager object
 *
 * @see Stager
 */
GameLoop.prototype.init = function(plot) {
	this.plot = plot;
};

/**
 * ### GameLoop.next
 *
 * Returns the next stage in the loop
 *
 * If the step in `curStage` is an integer and out of bounds, that bound is assumed.
 *
 * @param {object} curStage Optional. The GameStage object from which to get
 *  the next one. Defaults to returning the first stage.
 *
 * @return {object} The GameStage describing the next stage
 *
 * @see GameStage
 */
GameLoop.prototype.next = function(curStage) {
	// GameLoop was not correctly initialized
	if (!this.plot) return GameLoop.NO_SEQ;
	
	// Find out flexibility mode:
	var flexibleMode = this.plot.sequence.length === 0;

	var seqIdx, seqObj = null, stageObj;
	var stageNo, stepNo;
	var normStage = null;
	var nextStage = null;

	curStage = new GameStage(curStage);

	if (flexibleMode) {
		if (curStage.stage === 0) {
			// Get first stage:
			if (this.plot.generalNextFunction) {
				nextStage = this.plot.generalNextFunction();
			}

			if (nextStage) {
				return new GameStage({
					stage: nextStage,
					step:  1,
					round: 1
				});
			}

			return GameLoop.END_SEQ;
		}

		// Get stage object:
		stageObj = this.plot.stages[curStage.stage];

		if ('undefined' === typeof stageObj) {
			node.warn('next received nonexistent stage: ' + curStage.stage);
			return null;
		}

		// Find step number:
		if ('number' === typeof curStage.step) {
			stepNo = curStage.step;
		}
		else {
			stepNo = stageObj.steps.indexOf(curStage.step) + 1;
		}
		if (stepNo < 1) {
			node.warn('next received nonexistent step: ' +
					stageObj.id + '.' + curStage.step);
			return null;
		}

		// Handle stepping:
		if (stepNo + 1 <= stageObj.steps.length) {
			return new GameStage({
				stage: stageObj.id,
				step:  stepNo + 1,
				round: 1
			});
		}

		// Get next stage:
		if (this.plot.nextFunctions[stageObj.id]) {
			nextStage = this.plot.nextFunctions[stageObj.id]();
		}
		else if (this.plot.generalNextFunction) {
			nextStage = this.plot.generalNextFunction();
		}

		if (nextStage === GameLoop.GAMEOVER)  {
			return GameLoop.GAMEOVER;
		}
		else if (nextStage) {
			return new GameStage({
				stage: nextStage,
				step:  1,
				round: 1
			});
		}

		return GameLoop.END_SEQ;
	}
	else {
		if (curStage.stage === 0) {
			return new GameStage({
				stage: 1,
				step:  1,
				round: 1
			});
		}

		// Get normalized GameStage:
		normStage = this.normalizeGameStage(curStage);
		if (normStage === null) {
			node.warn('next received invalid stage: ' + curStage);
			return null;
		}
		stageNo  = normStage.stage;
		stepNo   = normStage.step;
		seqObj   = this.plot.sequence[stageNo - 1];
		if (seqObj.type === 'gameover') return GameLoop.GAMEOVER;
		stageObj = this.plot.stages[seqObj.id];

		// Handle stepping:
		if (stepNo + 1 <= stageObj.steps.length) {
			return new GameStage({
				stage: stageNo,
				step:  stepNo + 1,
				round: normStage.round
			});
		}

		// Handle repeat block:
		if (seqObj.type === 'repeat' && normStage.round + 1 <= seqObj.num) {
			return new GameStage({
				stage: stageNo,
				step:  1,
				round: normStage.round + 1
			});
		}

		// Handle looping blocks:
		if ((seqObj.type === 'doLoop' || seqObj.type === 'loop') && seqObj.cb()) {
			return new GameStage({
				stage: stageNo,
				step:  1,
				round: normStage.round + 1
			});
		}

		// Go to next stage:
		if (stageNo < this.plot.sequence.length) {
			// Skip over loops if their callbacks return false:
			while (this.plot.sequence[stageNo].type === 'loop' &&
			       !this.plot.sequence[stageNo].cb()) {
				stageNo++;
				if (stageNo >= this.plot.sequence.length) return GameLoop.END_SEQ;
			}

			return new GameStage({
				stage: stageNo + 1,
				step:  1,
				round: 1
			});
		}

		// No more stages remaining:
		return GameLoop.END_SEQ;
	}
};

/**
 * ### GameLoop.previous
 *
 * Returns the previous stage in the loop
 *
 * Works only in simple mode.
 * Behaves on loops the same as `GameLoop.next`, with round=1 always.
 *
 * @param {object} curStage The GameStage object from which to get the previous one
 *
 * @return {object} The GameStage describing the previous stage
 *
 * @see GameStage
 */
GameLoop.prototype.previous = function(curStage) {
	// GameLoop was not correctly initialized
	if (!this.plot) return GameLoop.NO_SEQ;
	
	var normStage;
	var seqIdx, seqObj = null, stageObj = null;
	var prevSeqObj;
	var stageNo, stepNo, prevStepNo;

	curStage = new GameStage(curStage);

	// Get normalized GameStage:
	normStage = this.normalizeGameStage(curStage);
	if (normStage === null) {
		node.warn('previous received invalid stage: ' + curStage);
		return null;
	}
	stageNo  = normStage.stage;
	stepNo   = normStage.step;
	seqObj   = this.plot.sequence[stageNo - 1];

	// Handle stepping:
	if (stepNo > 1) {
		return new GameStage({
			stage: stageNo,
			step:  stepNo - 1,
			round: curStage.round
		});
	}

	if ('undefined' !== typeof seqObj.id) {
		stageObj = this.plot.stages[seqObj.id];
		// Handle rounds:
		if (curStage.round > 1) {
			return new GameStage({
				stage: stageNo,
				step:  stageObj.steps.length,
				round: curStage.round - 1
			});
		}

		// Handle looping blocks:
		if ((seqObj.type === 'doLoop' || seqObj.type === 'loop') && seqObj.cb()) {
			return new GameStage({
				stage: stageNo,
				step:  stageObj.steps.length,
				round: 1
			});
		}
	}

	// Handle beginning:
	if (stageNo <= 1) {
		return new GameStage({
			stage: 0,
			step:  0,
			round: 0
		});
	}

	// Go to previous stage:
	// Skip over loops if their callbacks return false:
	while (this.plot.sequence[stageNo - 2].type === 'loop' &&
		   !this.plot.sequence[stageNo - 2].cb()) {
		stageNo--;

		if (stageNo <= 1) {
			return new GameStage({
				stage: 0,
				step:  0,
				round: 0
			});
		}
	}

	// Get previous sequence object:
	prevSeqObj = this.plot.sequence[stageNo - 2];

	// Get number of steps in previous stage:
	prevStepNo = this.plot.stages[prevSeqObj.id].steps.length;

	// Handle repeat block:
	if (prevSeqObj.type === 'repeat') {
		return new GameStage({
			stage: stageNo - 1,
			step:  prevStepNo,
			round: prevSeqObj.num
		});
	}

	// Handle normal blocks:
	return new GameStage({
		stage: stageNo - 1,
		step:  prevStepNo,
		round: 1
	});
};

/**
 * ### GameLoop.jump
 *
 * Returns a distant stage in the loop
 *
 * Works with negative delta only in simple mode.
 * Uses `GameLoop.previous` and `GameLoop.next` for stepping.
 * If a sequence end is reached, returns immediately.
 *
 * @param {object} curStage The GameStage object from which to get the offset one
 * @param {number} delta The offset. Negative number for backward stepping.
 *
 * @return {object} The GameStage describing the distant stage
 *
 * @see GameStage
 * @see GameLoop.previous
 * @see GameLoop.next
 */
GameLoop.prototype.jump = function(curStage, delta) {
	if (delta < 0) {
		while (delta < 0) {
			curStage = this.previous(curStage);
			delta++;

			if (!(curStage instanceof GameStage) || curStage.stage === 0) {
				return curStage;
			}
		}
	}
	else {
		while (delta > 0) {
			curStage = this.next(curStage);
			delta--;

			if (!(curStage instanceof GameStage)) {
				return curStage;
			}
		}
	}

	return curStage;
};

/**
 * ### GameLoop.getStage
 *
 * Returns the stage object corresponding to a GameStage
 *
 * @param {object|string} gameStage The GameStage object, or its string representation
 *
 * @return {object|null} The corresponding stage object, or null value 
 * 	if the step was not found
 */
GameLoop.prototype.getStage = function(gameStage) {
	if (!this.plot) return null;
	
	gameStage = new GameStage(gameStage);
	if ('number' === typeof gameStage.stage) {
		return this.plot.stages[this.plot.sequence[gameStage.stage - 1].id];
	}
	else {
		return this.plot.stages[gameStage.stage];
	}
};

/**
 * ### GameLoop.getStep
 *
 * Returns the step object corresponding to a GameStage
 *
 * @param {object|string} gameStage The GameStage object, or its string representation
 *
 * @return {object|null} The corresponding step object, or null value 
 * 	if the step was not found
 */
GameLoop.prototype.getStep = function(gameStage) {
	if (!this.plot) return null;
	
	gameStage = new GameStage(gameStage);
	if ('number' === typeof gameStage.step) {
		return this.plot.steps[this.getStage(gameStage).steps[gameStage.step - 1]];
	}
	else {
		return this.plot.steps[gameStage.step];
	}
};

/**
 * ### GameLoop.normalizeGameStage
 *
 * Converts the GameStage fields to numbers
 *
 * Works only in simple mode.
 *
 * @param {object} gameStage The GameStage object
 *
 * @return {object} The normalized GameStage object; null on error
 *
 * @api private
 */
GameLoop.prototype.normalizeGameStage = function(gameStage) {
	var stageNo, stepNo, seqIdx, seqObj;

	// Find stage number:
	if ('number' === typeof gameStage.stage) {
		stageNo = gameStage.stage;
	}
	else {
		for (seqIdx = 0; seqIdx < this.plot.sequence.length; seqIdx++) {
			if (this.plot.sequence[seqIdx].id === gameStage.stage) {
				break;
			}
		}
		stageNo = seqIdx + 1;
	}
	if (stageNo < 1 || stageNo > this.plot.sequence.length) {
		node.warn('normalizeGameStage received nonexistent stage: ' + gameStage.stage);
		return null;
	}

	// Get sequence object:
	seqObj = this.plot.sequence[stageNo - 1];

	if (seqObj.type === 'gameover') {
		return new GameStage({
			stage: stageNo,
			step:  1,
			round: gameStage.round
		});
	}

	// Get stage object:
	stageObj = this.plot.stages[seqObj.id];

	// Find step number:
	if ('number' === typeof gameStage.step) {
		stepNo = gameStage.step;
	}
	else {
		stepNo = stageObj.steps.indexOf(gameStage.step) + 1;
	}
	if (stepNo < 1) {
		node.warn('normalizeGameStage received nonexistent step: ' +
				stageObj.id + '.' + gameStage.step);
		return null;
	}

	return new GameStage({
		stage: stageNo,
		step:  stepNo,
		round: gameStage.round
	});
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
 * 	@see node.target
 * 	@see node.action
 * 
 * ---
 *
 */
(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameStage = node.GameStage,
	Player = node.Player,
	JSUS = node.JSUS;

var target = node.target,
	action = node.action;

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
 */
GameMsgGenerator.create = function (msg) {

  var gameMsg = {
		session: ('undefined' !== typeof msg.session) ? msg.session : node.socket.session, 
		stage: msg.stage || node.game.stage,
		action: msg.action || action.SAY,
		target: msg.target || target.DATA,
		from: node.player.sid,
		to: ('undefined' !== typeof msg.to) ? msg.to : 'SERVER',
		text: msg.text || null,
		data: msg.data || null,
		priority: msg.priority || null,
		reliable: msg.reliable || 1
  };

  return new GameMsg(gameMsg);

};

//## HI messages

/**
 * ### GameMSgGenerator.createHI
 * 
 * Notice: this is different from the server;
 * 
 * @param {Player} player The player to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createHI = function (player, to, reliable) {
	player = player || node.player;
	if (!player) return false;
	reliable = reliable || 1;
  
	return new GameMsg( {
            			session: node.gsc.session,
            			stage: node.game.stage,
            			action: action.SAY,
            			target: target.HI,
            			from: node.player.sid,
            			to: to,
            			text: new Player(player) + ' ready.',
            			data: player,
            			priority: null,
            			reliable: reliable
	});
};

// ## STATE messages

///**
// * ### GameMSgGenerator.saySTATE
// * 
// * Creates a say.STATE message
// * 
// * Notice: stage is different from node.game.stage
// * 
// * @param {GameStage} stage The game-stage to communicate
// * @param {string} to The recipient of the message
// * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
// * 
// * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
// * 
// * 	@see GameStage
// */
//GameMsgGenerator.saySTATE = function (stage, to, reliable) {
//	return this.createSTATE(action.SAY, stage, to, reliable);
//};
//
///**
// * ### GameMSgGenerator.setSTATE
// * 
// * Creates a set.STATE message
// * 
// * @param {GameStage} stage The game-stage to communicate
// * @param {string} to The recipient of the message
// * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
// * 
// * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
// * 
// * 	@see GameStage
// */
//GameMsgGenerator.setSTATE = function (stage, to, reliable) {
//	return this.createSTATE(action.SET, stage, to, reliable);
//};
//
///**
// * ### GameMSgGenerator.getSTATE
// * 
// * Experimental. Creates a get.STATE message
// * 
// * @param {GameStage} stage The game-stage to communicate
// * @param {string} to The recipient of the message
// * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
// * 
// * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
// * 
// * 	@see GameStage
// */
//GameMsgGenerator.getSTATE = function (stage, to, reliable) {
//	return this.createSTATE(action.GET, stage, to,reliable);
//};
//
///**
// * ### GameMSgGenerator.createSTATE
// * 
// * Creates a STATE message
// * 
// * @param {string} action A nodeGame action (e.g. 'get' or 'set')
// * @param {GameStage} stage The game-stage to communicate
// * @param {string} to Optional. The recipient of the message. Defaults, SERVER
// * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
// * 
// * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
// * 
// * 	@see GameStage
// */
//GameMsgGenerator.createSTATE = function (action, stage, to, reliable) {
//	if (!action || !stage) return false;
//	to = to || 'SERVER';
//	reliable = reliable || 1;
//	return new GameMsg({
//						session: node.gsc.session,
//						stage: node.game.stage,
//						action: action,
//						target: target.STATE,
//						from: node.player.sid,
//						to: to,
//						text: 'New State: ' + GameStage.stringify(stage),
//						data: stage,
//						priority: null,
//						reliable: reliable
//	});
//};

//## PLIST messages

/**
 * ### GameMsgGenerator.sayPLIST
 * 
 * Creates a say.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.sayPLIST = function (plist, to, reliable) {
	return this.createPLIST(action.SAY, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.setPLIST
 * 
 * Creates a set.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.setPLIST = function (plist, to, reliable) {
	return this.createPLIST(action.SET, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.getPLIST
 * 
 * Experimental. Creates a get.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.getPLIST = function (plist, to, reliable) {
	return this.createPLIST(action.GET, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.createPLIST
 * 
 * Creates a PLIST message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to Optional. The recipient of the message. Defaults, SERVER
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 *  @see PlayerList
 */
GameMsgGenerator.createPLIST = function (action, plist, to, reliable) {
	plist = plist || !node.game || node.game.pl;
	if (!action || !plist) return false;
	
	to = to || 'SERVER';
	reliable = reliable || 1;
	
	return new GameMsg({
						session: node.gsc.session, 
						stage: node.game.stage,
						action: action,
						target: target.PLIST,
						from: node.player.sid,
						to: to,
						text: 'List of Players: ' + plist.length,
						data: plist.pl,
						priority: null,
						reliable: reliable
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
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createTXT = function (text, to, reliable) {
	if (!text) return false;
	reliable = reliable || 0;
	
	return new GameMsg({
						session: node.gsc.session,
						stage: node.game.stage,
						action: action.SAY,
						target: target.TXT,
						from: node.player.sid,
						to: to,
						text: text,
						data: null,
						priority: null,
						reliable: reliable
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
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.sayDATA = function (data, to, text, reliable) {
	return this.createDATA(action.SAY, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.setDATA
 * 
 * Creates a set.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.setDATA = function (data, to, text, reliable) {
	return this.createDATA(action.SET, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.getDATA
 * 
 * Experimental. Creates a say.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.getDATA = function (data, to, text, reliable) {
	return this.createDATA(action.GET, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.createDATA
 * 
 * Creates a DATA message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createDATA = function (action, data, to, text, reliable) {
	if (!action) return false;
	reliable = reliable || 1;
	text = text || 'data msg';
	
	return new GameMsg({
						session: node.gsc.session, 
						stage: node.game.stage,
						action: action,
						target: target.DATA,
						from: node.player.sid,
						to: to,
						text: text,
						data: data,
						priority: null,
						reliable: reliable
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
							stage: node.game.stage,
							action: action.SAY,
							target: target.ACK,
							from: node.player.sid,
							to: to,
							text: 'Msg ' + gm.id + ' correctly received',
							data: gm.id,
							priority: null,
							reliable: reliable
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
 * # SocketFactory
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` component responsible for registering and instantiating 
 * new GameSocket clients
 * 
 * Contract: Socket prototypes must implement the following methods:
 * 
 * 	- connect: establish a communication channel with a ServerNode instance
 * 	- send: pushes messages into the communication channel
 * 
 * ---
 * 
 */


(function( exports, node ) {


    // Storage for socket types
    var types = {};

    function checkContract( proto ) {
    	var test = proto;
//    	if (!proto.prototype) {
    		test = new proto();
//    	}
    	
    	if (!test.send) {
    		console.log('no send')
    		return false;
    	}
    	if (!test.connect){
    		console.log('no connect')
    		return false;
    	}
    	
    	return true;
    }
    
    function getTypes() {
    	return types;
    }
    
    function get( type, options ) {
    	var Socket = types[type];    	
    	return (Socket) ? new Socket(options) : null;
    }

    function register( type, proto ) {
    	if (!type || !proto) return;
    	        
        // only register classes that fulfill the contract
        if ( checkContract(proto) ) {
            types[type] = proto;
        }
        else {
        	node.err('cannot register invalid Socket class: ' + type);
        }
    }
    
    // expose the socketFactory methods
    exports.SocketFactory = {
    	checkContract: checkContract,
    	getTypes: getTypes,
    	get: get,
    	register: register
    };
    
    
// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # Socket
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` component responsible for dispatching events and messages 
 * 
 * ---
 * 
 */

(function (exports, node) {

	
exports.Socket = Socket;	
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameStage = node.GameStage,
	Player = node.Player,
	GameMsgGenerator = node.GameMsgGenerator,
	SocketFactory = node.SocketFactory;

var action = node.action;

var buffer,
	session;

function Socket(options) {
	
// ## Private properties

/**
 * ### Socket.buffer
 * 
 * Buffer of queued messages 
 * 
 * @api private
 */ 
	buffer = [];
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'buffer', {
			value: buffer,
			enumerable: true
		});
	}
	else {
		this.buffer = buffer;
	}
	
/**
 * ### Socket.session
 * 
 * The session id shared with the server
 * 
 * This property is initialized only when a game starts
 * 
 */
	session = null;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'session', {
			value: session,
			enumerable: true
		});
	}
	else {
		this.session = session;
	}
	
	this.socket = null;
	
	this.url = null;
}


Socket.prototype.setup = function(options) {
	options = options || {};
	
	if (options.type) {
		this.setSocketType(options.type, options);
	}
	
};

Socket.prototype.setSocketType = function(type, options) {
	var socket =  SocketFactory.get(type, options);
	if (socket) {
		this.socket = socket;
		return true;
	}
	else {
		return false;
	}
};

Socket.prototype.connect = function(url, options) {
	
	if (!this.socket) {
		node.err('cannot connet to ' + url + ' . No open socket.');
		return false;
	}
	
	this.url = url;
	node.log('connecting to ' + url);
	
	this.socket.connect(url, options);
};

Socket.prototype.onDisconnect = function() {
	// Save the current stage of the game
	node.session.store();
	node.log('closed');
};

Socket.prototype.onMessage = function(msg) {
	
	msg = this.secureParse(msg);
	if (!msg) return;
	
	var sessionObj;
	
	// Parsing successful
	if (msg.target === 'HI') {
		
		// replace itself: will change onMessage
		this.attachMsgListeners();
		
		this.startSession(msg)
		
		sessionObj = node.store(msg.session);
		
		if (false) {
		//if (sessionObj) {
			node.session.restore(sessionObj);
			
			msg = node.msg.create({
				action: action.SAY,
				target: 'HI_AGAIN',
				data: node.player
			});
			
			this.send(msg);
			
		}
		else {
			node.store(msg.session, node.session.save());
			
			this.sendHI(node.player, 'ALL');
		}
		
		

   	 } 
};

Socket.prototype.attachMsgListeners = function() {
	this.onMessage = this.onMessageFull;
	node.emit('NODEGAME_READY');
};

Socket.prototype.onMessageFull = function(msg) {
	msg = this.secureParse(msg);
	
	if (msg) { // Parsing successful
		// TODO: improve
		if (node.game.isReady && node.game.isReady()) {
			node.emit(msg.toInEvent(), msg);
		}
		else {
			console.log('BUFFERING')
			node.log('buffering: ' + msg, 'DEBUG');
			buffer.push(msg);
		}
	}
};


Socket.prototype.registerServer = function(msg) {
	// Setting global info
	this.servername = msg.from;
	// Keep serverid = msg.from for now
	this.serverid = msg.from;
};


Socket.prototype.secureParse = secureParse = function (msg) {
	
	var gameMsg;
	try {
		gameMsg = GameMsg.clone(JSON.parse(msg));
		node.info('R: ' + gameMsg);
	}
	catch(e) {
		return logSecureParseError('malformed msg received',  e);
	}
	
	if (this.session && gameMsg.session !== this.session) {
		return logSecureParseError('local session id does not match incoming message session id');
	}
	
	return gameMsg;
};


/**
 * ### Socket.clearBuffer
 * 
 * Emits and removes all the events in the message buffer
 * 
 * @see node.emit
 */
Socket.prototype.clearBuffer = function () {
	var nelem = buffer.length, msg;
	for (var i=0; i < nelem; i++) {
		msg = this.buffer.shift();
		if (msg) {
			node.emit(msg.toInEvent(), msg);
			node.log('Debuffered ' + msg, 'DEBUG');
		}
	}
};


/**
 * ### Socket.startSession
 * 
 * Initializes a nodeGame session
 * 
 * Creates a the player and saves it in node.player, and 
 * stores the session ids in the session object 
 * 
 * @param {GameMsg} msg A game-msg
 * @return {boolean} TRUE, if session was correctly initialized
 * 
 * 	@see node.createPlayer
 */
Socket.prototype.startSession = function (msg) {

	// Store server info
	this.registerServer(msg);
	
	var player = {
			id:		msg.data,	
			sid: 	msg.data
	};
	node.createPlayer(player);
	this.session = msg.session;
	return true;
};

//## SEND methods


/**
* ### Socket.send
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
Socket.prototype.send = function(msg) {
	if (!this.socket) {
		node.err('socket cannot send message. No open socket.');
		return false;
	}
	
	this.socket.send(msg);
	node.info('S: ' + msg);
	return true;
}


/**
* ### Socket.sendHI
* 
* Creates a HI message and pushes it into the socket
*   
* @param {string} from Optional. The message sender. Defaults node.player
* @param {string} to Optional. The recipient of the message. Defaults 'SERVER'
* 
*/
Socket.prototype.sendHI = function (from, to) {
	from = from || node.player;
	to = to || 'SERVER';
	var msg = node.msg.createHI(from, to);
	this.send(msg);
};

/**
 * @TODO: do we need this??
* ### Socket.sendSTAGE
* 
* Creates a STAGE message and pushes it into the socket
* 
* @param {string} action A nodeGame action (e.g. 'get' or 'set')
* @param {GameStage} stage The GameStage object to send
* @param {string} to Optional. The recipient of the message.
*  
*/
//Socket.prototype.sendSTATE = function (action, state, to) {	
//	var msg = node.msg.createSTAGE(action, stage, to);
//	this.send(msg);
//};


/**
* ### Socket.sendSTAGE
* 
* Creates a STAGE message and pushes it into the socket
* 
* @param {string} action A nodeGame action (e.g. 'get' or 'set')
* @param {GameStage} stage The GameStage object to send
* @param {string} to Optional. The recipient of the message.
*  
*/
Socket.prototype.sendSTAGE = function (action, stage, to) {	
	var msg = node.msg.create({
		action: node.action.SAY,
		target: node.target.STAGE,
		data: stage, 
		to: to
	});
	
	this.send(msg);
};

/**
* ### Socket.sendTXT
*
* Creates a TXT message and pushes it into the socket
* 
* @param {string} text Text to send
* @param {string} to Optional. The recipient of the message
*/
Socket.prototype.sendTXT = function(text, to) {	
	var msg = node.msg.createTXT(text,to);
	this.send(msg);
};

/**
* ### Socket.sendDATA
* 
* Creates a DATA message and pushes it into the socket
* 
* @param {string} action Optional. A nodeGame action (e.g. 'get' or 'set'). Defaults 'say'
* @param {object} data An object to exchange
* @param {string} to Optional. The recipient of the message. Defaults 'SERVER'
* @param {string} text Optional. A descriptive text associated to the message.
* 
* @TODO: invert parameter order: first data then action
*/
Socket.prototype.sendDATA = function (action, data, to, text) {
	action = action || GameMsg.say;
	to = to || 'SERVER';
	text = text || 'DATA';
	var msg = node.msg.createDATA(action, data, to, text);
	this.send(msg);
};


// helping methods

var logSecureParseError = function (text, e) {
	text = text || 'Generic error while parsing a game message';
	var error = (e) ? text + ": " + e : text;
	node.log(error, 'ERR');
	node.emit('LOG', 'E: ' + error);
	return false;
}





})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # SocketIo
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Implementation of a remote socket communicating over HTTP 
 * through Socket.IO
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

exports.SocketIo = SocketIo;



function SocketIo(options) {
	this.socket = null;
}

SocketIo.prototype.connect = function(url, options) {
	
	if (!url) {
		node.err('cannot connect to empty url.', 'ERR');
		return false;
	}
	
	var that = this;
	
	this.socket = io.connect(url, options); //conf.io
	
	this.socket.on('connect', function (msg) {
			
	    node.info('socket.io connection open'); 
	    
	    that.socket.on('message', function(msg) {
	    	node.socket.onMessage(msg);
	    });
	    
	});
	
    this.socket.on('disconnect', node.socket.onDisconnect);
    return true;
	
};

SocketIo.prototype.send = function (msg) {
	console.log(msg);
	this.socket.send(msg.stringify());
};


node.SocketFactory.register('SocketIo', SocketIo);


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
 * 2. by stage,
 * 3. by key.
 * 
 * Uses GameStage.compare to compare the stage property of each entry.
 * 
 * 	@see GameBit
 * 	@see GameStage.compare
 * 
 * ---
 * 
 */
(function (exports, node) {

// ## Global scope	
var JSUS = node.JSUS,
	NDDB = node.NDDB;
	
var GameStage = node.GameStage;

// Inheriting from NDDB	
GameDB.prototype = new NDDB();
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
	
	this.c('stage', GameBit.compareState);
	  
	
	if (!this.player) {
		this.h('player', function(gb) {
			return gb.player;
		});
	}
	if (!this.stage) {
		this.h('stage', function(gb) {
			return GameStage.toHash(gb.stage, 'S.s.r');
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
 * @param {GameStage} player Optional. The stage associated to the entry. Defaults, node.game.stage
 * 
 * @return {boolean} TRUE, if insertion was successful
 * 
 * 	@see GameBit
 */
GameDB.prototype.add = function (key, value, player, stage) {
	if (!key) return false;
	
	stage = stage || node.game.stage;
	player = player || node.player;

	this.insert(new GameBit({
						player: player, 
						key: key,
						value: value,
						stage: stage
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
 * - stage GameStage
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
	
	this.stage = options.stage;
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
	return this.player + ', ' + GameStage.stringify(this.stage) + ', ' + this.key + ', ' + this.value;
};

/** 
 * ### GameBit.equals (static)
 * 
 * Compares two GameBit objects
 * 
 * Returns TRUE if the attributes of `player`, `stage`, and `key`
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
 * Sort two game-bits by their stage property
 * 
 * GameStage.compare is used for comparison
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 * 
 * 	@see GameStage.compare
 */
GameBit.compareState = function (gb1, gb2) {
	return GameStage.compare(gb1.stage, gb2.stage);
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

var GameStage = node.GameStage,
	GameMsg = node.GameMsg,
	GameDB = node.GameDB,
	GameLoop = node.GameLoop,
	PlayerList = node.PlayerList,
	Player = node.Player,
	Stager = node.Stager,
	J = node.JSUS;

var action = node.action;

exports.Game = Game;

var name,
	description,
	gameLoop,
	pl,
	ml;
	
Game.levels = {
		UNINITIALIZED: 0, 	// game created, the init function has not been called
		INITIALIZING: 1, 	// executing init
		INITIALIZED: 5, 	// init executed
		READY:	7,		// stages are set
		ONGOING: 50,
		GAMEOVER: 100,		// game complete
		RUNTIME_ERROR: -1
	};

Game.stageLevels = {
	LOADING: 1,
	LOADED: 2,
	PLAYING: 50,
	PAUSING:  55,
	PAUSED: 60,
	RESUMING: 65,
	RESUMED: 70,
	DONE: 100
};

/**
 * ## Game constructor
 * 
 * Creates a new instance of Game
 * 
 * @param {object} settings Optional. A configuration object
 */
function Game (settings) {
	settings = settings || {};

	this.updateGameState(Game.levels.UNINITIALIZED);
	
// ## Private properties

/**
 * ### Game.name
 * 
 * The name of the game
 * 
 * @api private
 */
	name = settings.name || 'A nodeGame game';
	
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'name', {
			value: name,
			enumerable: true
		});
	}
	else {
		this.name = name;
	}

/**
 * ### Game.description
 * 
 * A text describing the game
 * 
 * @api private
 */
	description = settings.description || 'No Description';
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'description', {
			value: description,
			enumerable: true
		});
	}
	else {
		this.description = description;
	}
	
	
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
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'pl', {
			value: pl,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	else {
		this.pl = pl;
	}

/**
 * ### Game.pl
 * 
 * The list of monitor clients connected to the game
 * 
 * The list may be empty, depending on the server settings
 * 
 * @api private
 */
	ml = new PlayerList();
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'ml', {
			value: ml,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	else {
		this.ml = ml;
	}
	
/**
 * ### Game.ready
 * 
 * If TRUE, the nodeGame engine is fully loaded
 * 
 * Shortcut to game.isReady
 * 
 * If the browser does not support the method object setters,
 * this property is disabled, and Game.isReady() should be used
 * instead.
 * 
 * @see Game.isReady();
 * 
 * @api private
 * @deprecated
 * 
 */
	if (node.support.getter) {
		Object.defineProperty(this, 'ready', {
			set: function(){},
			get: this.isReady,
			enumerable: true
		});
	}
	else {
		this.ready = null;
	}



// ## Public properties

/**
 * ### Game.observer
 * 
 * If TRUE, silently observes the game. Defaults, FALSE
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
 * If TRUE, automatically advances to the next state if all the players 
 * have completed the same state
 * 
 * After a successful STAGEDONE event is fired, the client will automatically 
 * goes to the next function in the game-loop without waiting for a STATE
 * message from the server. 
 * 
 * Depending on the configuration settings, it can still perform additional
 * checkings (e.g.wheter the mininum number of players is connected) 
 * before stepping to the next state.
 * 
 * Defaults: true
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
 * to access the screen and displays a message to the player.
 * 
 * Defaults: FALSE
 * 
 */
	this.auto_wait = ('undefined' !== typeof settings.auto_wait) ? settings.auto_wait 
																 : false; 

/**
 * ### Game.solo_mode
 * 
 * If TRUE, automatically advances to the next state upon completion of a state
 * 
 * After a successful DONE event is fired, the client will automatically 
 * goes to the next function in the game-loop without waiting for a STATE
 * message from the server, or checking the STATE of the other players. 
 * 
 * Defaults: FALSE
 * 
 */
	this.solo_mode = ('undefined' !== typeof settings.solo_mode) ? settings.solo_mode 
															 : false;	
	// TODO: check this
	this.minPlayers = settings.minPlayers || 1;
	this.maxPlayers = settings.maxPlayers || 1000;
	

	
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
	

	
/**
 * ### Game.stager
 * 
 * Stage manager 
 * 
 * retrocompatible with gameLoop
 * 
 * @see Stager
 * @api private
 */
	this.gameLoop = this.stager = new GameLoop(settings.stages);
	
	
	this.currentStep = new GameStage();
	this.currentStepObj = null;
	
	// Update the init function if one is passed
	if (settings.init) {
		this.init = function() {
			this.updateGameState(Game.levels.INITIALIZING);
			settings.init.call(node.game);
			this.updateGameState(Game.levels.INITIALIZED);
		}
	}
	

	this.player = null;	


	this.paused = false;
	
} // <!-- ends constructor -->

// ## Game methods

/** 
 * ### Game.init
 * 
 * Initialization function
 * 
 * This function is called as soon as the game is instantiated,
 * i.e. at stage 0.0.0. 
 * 
 * Event listeners defined here stay valid throughout the whole
 * game, unlike event listeners defined inside a function of the
 * gameLoop, which are valid only within the specific function.
 * 
 */
Game.prototype.init = function () {
	this.updateGameState(Game.levels.INITIALIZING);
	this.updateGameState(Game.levels.INITIALIZED);
};

/** 
 * ### Game.gameover
 * 
 * Cleaning up function
 * 
 * This function is called after the last stage of the gameLoop
 * is terminated
 * 
 */
Game.prototype.gameover = function () {};

/**
 * ### Game.start
 * 
 * Starts the game 
 * 
 * Calls the init function, and steps.
 * 
 * Important: it does not use `Game.publishUpdate` because that is
 * just for change of state after the game has started
 * 
 * 
 * @see node.play
 * @see Game.publishStage
 * 
 */
Game.prototype.start = function() {
	// INIT the game
	this.init();
	this.step();
	
	node.log('game started');
};

/**
 * ### Game.pause
 * 
 * Experimental. Sets the game to pause
 * 
 * @TODO: check with Game.ready
 */
Game.prototype.pause = function () {
	this.paused = true;
};

/**
 * ### Game.resume
 * 
 * Experimental. Resumes the game from a pause
 * 
 * @TODO: check with Game.ready
 */
Game.prototype.resume = function () {
	this.paused = false;
};




/**
 * ### Game.step
 * 
 * Executes the next stage / step 
 * 
 * @return {Boolean} FALSE, if the execution encountered an error
 * 
 * @see Game.stager
 * @see Game.currentStage
 * @see Game.execStage
 * 
 * TODO: harmonize return values
 */
Game.prototype.step = function() {
	var nextStep;
	
	nextStep = this.stager.next(this.currentStep);
	
	if ('string' === typeof nextStep) {
		
		if (nextStep === GameLoop.GAMEOVER) {
			node.emit('GAMEOVER');
			return this.gameover(); // can throw Errors
		}
		
		// else do nothing
		return null;
	}
	else {
		// TODO maybe update also in case of string
		this.currentStep = nextStep;
		this.currentStepObj = this.stager.getStep(nextStep);
		return this.execStage(this.currentStepObj);
	}
};

/**
 * ### Game.execStage
 * 
 * Executes the specified stage
 * 
 * @param stage {GameStage} GameStage object to execute
 * 
 */
Game.prototype.execStage = function(stage) {
	var cb, err, res;
	
	cb = stage.cb; 
			
	// Local Listeners from previous stage are erased 
	// before proceeding to next one
	node.events.clearStage(this.currentStep);
			
	this.updateStageLevel('LOADING');
	
			
	try {
		res = cb.call(node.game);
		this.updateStageLevel('LOADED');
		
		// This does not make sense. Basically it waits for the nodegame window to be loaded too
		if (this.isReady()) {
			node.emit('LOADED');
		}
		if (res === false) {
			// A non fatal error occurred
			// log it
		}
		
		return res;
		
	} 
	catch (e) {
		err = 'An error occurred while executing a custom callback'; //  
			
		node.err(err);
		
		if (node.debug) {
			throw new node.NodeGameRuntimeError();
		}
				
		return true;
	}
};

// ERROR, WORKING, etc
Game.prototype.updateGameState = function (state) {
	this.state = state;
	//this.publishUpdate();
};

// PLAYING, DONE, etc.
Game.prototype.updateStageLevel= function (state) {
	this.stageState = state;
	//this.publishUpdate();
};

Game.prototype.publishUpdate = function() {
	// <!-- Important: SAY -->
	if (!this.observer) {
		var stateEvent = node.OUT + action.SAY + '.STATE'; 
		node.emit(stateEvent, this.state, 'ALL'); // SHOULD BE A GAME STATE EVENT
	}
};

/**
 * ### Game.isReady
 * 
 * Returns TRUE if the nodeGame engine is fully loaded
 * 
 * As soon as the nodegame-client library is loaded 
 * `node.game.state` is equal to 0.0.0. In this situation the
 * game will be considered READY unless the nodegame-window 
 * says otherwise
 * 
 * During stepping between functions in the game-loop
 * the flag is temporarily turned to FALSE, and all events 
 * are queued and fired only after nodeGame is ready to 
 * handle them again.
 * 
 * If the browser does not support the method object setters,
 * this property is disabled, and Game.isReady() should be used
 * instead.
 * 
 * @see Game.ready;
 * 
 */
Game.prototype.isReady = function() {
	if (this.state < Game.levels.READY) return false;
	if (this.stageStage === 1) return false;
		
	// Check if there is a gameWindow obj and whether it is loading
	return node.window ? node.window.state >= node.is.LOADED : true;
};



// TODO : MAYBE TO REMOVE THEM

/**
* ### Game.next
* 
* Fetches a state from the game-loop N steps ahead
* 
* Optionally, a parameter can control the number of steps to take
* in the game-loop before returning the state
* 
* @param {number} N Optional. The number of steps to take in the game-loop. Defaults 1
* @return {boolean|GameStage} The next state, or FALSE if it does not exist
* 
* 	@see GameStage
* 	@see Game.gameLoop
*/
Game.prototype.next = function (N) {
	if (!N) return this.gameLoop.next(this.state);
	return this.gameLoop.jump(this.state, Math.abs(N));
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
* @return {boolean|GameStage} The previous state, or FALSE if it does not exist
* 
* 	@see GameStage
* 	@see Game.gameLoop
*/
Game.prototype.previous = function (N) {
	if (!N) return this.gameLoop.previous(this.state);
	return this.gameLoop.jump(this.state, -Math.abs(N));
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
* 	@see GameStage
* 	@see Game.gameLoop
*/
Game.prototype.jumpTo = function (jump) {
	if (!jump) return false;
	var gs = this.gameLoop.jump(this.state, jump);
	if (!gs) return false;
	return this.updateStage(gs);
};

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # GameSession
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` session manager
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	Player = node.Player,
	GameMsgGenerator = node.GameMsgGenerator,
	J = node.JSUS;

//Exposing constructor
exports.GameSession = GameSession;
exports.GameSession.SessionManager = SessionManager;

GameSession.prototype = new SessionManager();
GameSession.prototype.constructor = GameSession; 

function GameSession() {
	SessionManager.call(this);
	
	this.register('player', {
		set: function(p) {
			node.createPlayer(p);
		},
		get: function() {
			return node.player;
		}
	});
	
	this.register('game.memory', {
		set: function(value) {
			node.game.memory.clear(true);
			node.game.memory.importDB(value);
		},
		get: function() {
			return (node.game.memory) ? node.game.memory.fetch() : null;	
		}
	});
	
	this.register('events.history', {
		set: function(value) {
			node.events.history.history.clear(true);
			node.events.history.history.importDB(value);
		},
		get: function() {
			return (node.events.history) ? node.events.history.history.fetch() : null;
		}
	});
	
	
	this.register('game.currentStepObj', {
		set: GameSession.restoreStage
	});
	
	this.register('node.env');
	
}


GameSession.prototype.restoreStage = function(stage) {
		
	try {
		// GOTO STATE
		node.game.execStage(node.gameLoop.getStep(stage));
		
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
		               'STAGEDONE', // maybe not here
		               'out.say.HI'	               
		];
		
		// RE-EMIT EVENTS
		node.events.history.remit(node.game.state, discard);
		node.info('game stage restored');
		return true;
	}
	catch(e) {
		node.err('could not restore game stage. An error has occurred: ' + e);
		return false;
	}

};


/// Session Manager

function SessionManager() {
	this.session = {};
}

SessionManager.getVariable = function(p) {
	J.getNestedValue(p, node);
};

SessionManager.setVariable = function(p, value) {
	J.setNestedValue(p, value, node);
};

SessionManager.prototype.register = function(path, options) {
	if (!path) {
		node.err('cannot add an empty path to session');
		return false;
	}
	
	this.session[path] = {
			
		get: (options && options.get) ? options.get
									  : function() {
										  return J.getNestedValue(path, node);
									  },
									  
		set: (options && options.set) ? options.set 
									  : function(value) {
										  J.setNestedValue(path, value, node);
									  }
		
	};
	
	return true;
};

SessionManager.prototype.unregister = function(path) {
	if (!path) {
		node.err('cannot delete an empty path from session');
		return false;
	}
	if (!this.session[path]) {
		node.err(path + ' is not registered in the session');
		return false;
	}
	
	delete this.session[path];	
	return true;
};

SessionManager.prototype.get = function(path) {
	var session = {};
	
	if (path) {
		 return (this.session[path]) ? this.session[path].get() : undefined;
	}
	else {
		for (var path in this.session) {
			if (this.session.hasOwnProperty(path)) {
				session[path] = this.session[path].get();
			}
		}

		return session;
	}
};

SessionManager.prototype.save = function() {
	var session = {};
	for (var path in this.session) {
		if (this.session.hasOwnProperty(path)) {
			session[path] = {
					value: this.session[path].get(),
					get: this.session[path].get,
					set: this.session[path].set
			};
		}
	}
	return session;
};

SessionManager.prototype.load = function(session) {
	for (var i in session) {
		if (session.hasOwnProperty(i)) {
			this.register(i, session[i]);
		}
	}
};

SessionManager.prototype.clear = function() {
	this.session = {};
};

SessionManager.prototype.restore = function (sessionObj) {
	if (!sessionObj) {
		node.err('cannot restore empty session object');
		return ;
	}
	
	for (var i in sessionObj) {
		if (sessionObj.hasOwnProperty(i)) {
			sessionObj[i].set(sessionObj[i].value);
		}
	}
	
	return true;
};

SessionManager.prototype.store = function() {
	//node.store(node.socket.id, this.get());
};

SessionManager.prototype.store = function() {
	//node.store(node.socket.id, this.get());
};

// Helping functions

//function isReference(value) {
//	var type = typeof(value);
//	if ('function' === type) return true;
//	if ('object' === type) return true;
//	return false;
//}


})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # nodeGame
 * 
 * Social Experiments in the Browser
 * 
 * Copyright(c) 2012 Stefano Balietti MIT Licensed
 * 
 * *nodeGame* is a free, open source, event-driven javascript framework for on
 * line, multiplayer games in the browser.
 * 
 * ---
 * 
 */
(function (exports, node) {
		
	var EventEmitter = node.EventEmitter,
		Socket = node.Socket,
		GameStage = node.GameStage,
		GameMsg = node.GameMsg,
		Game = node.Game,
		Player = node.Player,
		GameSession = node.GameSession,
		J = node.JSUS;		
	
// ## Methods
	
	
/**
 * ### nove.env
 * 
 * Executes a block of code conditionally to nodeGame environment variables  
 * 
 * @param env {string} The name of the environment
 * @param func {function} The callback function to execute
 * @param ctx {object} Optional. The context of execution
 * @param params {array} Optional. An array of additional parameters for the callback
 * 
 */	
	node.env = function (env, func, ctx, params) {
		if (!env || !func || !node.env[env]) return;
		ctx = ctx || node;
		params = params || [];
		func.apply(ctx, params);
	};
	
		
/**
 * ### node.createPlayer
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
	node.createPlayer = function (player) {
		
		player = new Player(player);
		
		if (node.conf && node.conf.player) {			
			var pconf = node.conf.player;
			for (var key in pconf) {
				if (pconf.hasOwnProperty(key)) {
					if (J.inArray(key, ['id', 'sid', 'ip'])) {
						continue;
					} 
					
					// Cannot be overwritten properties previously 
					// set in other sessions (recovery)
//						if (player.hasOwnProperty(key)) {
//							continue;
//						}
					if (node.support.defineProperty) {
						Object.defineProperty(player, key, {
					    	value: pconf[key],
					    	enumerable: true
						});
					}
					else {
						player[key] = pconf[key];
					}
				}
			}
		}
		
		
		if (node.support.defineProperty) {
			Object.defineProperty(node, 'player', {
		    	value: player,
		    	enumerable: true
			});
		}
		else {
			node.player = player;
		}
		
		node.emit('PLAYER_CREATED', player);
		
		return player;
	};	
	
/**
 * ### node.connect
 * 
 * Establishes a connection with a nodeGame server
 * 
 * @param {object} conf A configuration object
 * @param {object} game The game object
 */		
	node.connect = function (url) {	
		if (node.socket.connect(url)) {
			node.emit('NODEGAME_CONNECTED');
		}
	};	

	
/**
 * ### node.play
 * 
 * Starts a game
 * 
 * @param {object} conf A configuration object
 * @param {object} game The game object
 */	
	node.play = function(game) {	
		
		node.setup.game(game);
		
		node.game.start();
	};
	
/**
 * ### node.replay
 * 
 * Moves the game stage to 1.1.1
 * 
 * @param {boolean} rest TRUE, to erase the game memory before update the game stage
 */	
	node.replay = function (reset) {
		if (reset) node.game.memory.clear(true);
		node.game.execStage(node.gameLoop.getStep("1.1.1"));
	};	
	
	
/**
 * ### node.emit
 * 
 * Emits an event locally
 *
 * @param {string} event The name of the event to emit
 * @param {object} p1 Optional. A parameter to be passed to the listener
 * @param {object} p2 Optional. A parameter to be passed to the listener
 * @param {object} p3 Optional. A parameter to be passed to the listener
 */	
	node.emit = function (event, p1, p2, p3) {	
		node.events.emit(event, p1, p2, p3);
	};	
	
/**
 * ### node.say
 * 
 * Sends a DATA message to a specified recipient
 * 
 * @param {mixed} data The content of the DATA message
 * @param {string} what The label associated to the message
 * @param {string} whom Optional. The recipient of the message
 *  
 */	
	node.say = function (data, what, whom) {
		node.events.emit('out.say.DATA', data, whom, what);
	};
	
/**
 * ### node.set
 * 
 * Stores a key-value pair in the server memory
 * 
 * 
 * 
 * @param {string} key An alphanumeric (must not be unique)
 * @param {mixed} The value to store (can be of any type)
 * 
 */
	node.set = function (key, value) {
		// TODO: parameter to say who will get the msg
		node.events.emit('out.set.DATA', value, null, key);
	};
	

/**
 * ### node.get
 * 
 * Sends a GET message to a recipient and listen to the reply 
 * 
 * @param {string} key The label of the GET message
 * @param {function} func The callback function to handle the return message
 */	
	node.get = function (key, func) {
		if (!key || !func) return;
		
		node.events.emit('out.get.DATA', key);
		
		var listener = function(msg) {
			if (msg.text === key) {
				func.call(node.game, msg.data);
				node.events.remove('in.say.DATA', listener);
			}
		};
		
		node.on('in.say.DATA', listener);
	};

/**
 * ### node.on
 * 
 * Registers an event listener
 * 
 * Listeners registered before a game is started, e.g. in
 * the init function of the game object, will stay valid 
 * throughout the game. Listeners registered after the game 
 * is started will be removed after the game has advanced
 * to its next stage. 
 * 
 * @param {string} event The name of the event
 * @param {function} listener The callback function
 */	
	node.on = function (event, listener) {
		
		if (!event) { 
			node.err('undefined event'); 
			return;
		}
		if ('function' !== typeof listener) { 
			node.err('callback must be of time function'); 
			return;
		}
		
		// It is in the init function;
		if (!node.game || !node.game.currentStepObj || (GameStage.compare(node.game.currentStepObj, new GameStage(), true) === 0 )) {
			node.events.add(event, listener);
		}
		else {
			node.events.addLocal(event, listener);
		}
	};

/**
 * ### node.once
 * 
 * Registers an event listener that will be removed 
 * after its first invocation
 * 
 * @param {string} event The name of the event
 * @param {function} listener The callback function
 * 
 * @see node.on
 * @see node.off
 */		
	node.once = function (event, listener) {
		if (!event || !listener) return;
		node.on(event, listener);
		node.on(event, function(event, listener) {
			node.events.remove(event, listener);
		});
	};
	
/**
 * ### node.off
 * 
 * Deregisters one or multiple event listeners
 * 
 * @param {string} event The name of the event
 * @param {function} listener The callback function
 * 
 * @see node.on
 * @see node.EventEmitter.remove
 */			
	node.off = node.removeListener = function (event, func) {
		return node.events.remove(event, func);
	};

	
	
/**
 * ### node.redirect
 * 
 * Redirects a player to the specified url
 * 
 * Works only if it is a monitor client to send
 * the message, i.e. players cannot redirect each 
 * other.
 * 
 * Examples
 *  
 * 	// Redirect to http://mydomain/mygame/missing_auth
 * 	node.redirect('missing_auth', 'xxx'); 
 * 
 *  // Redirect to external urls
 *  node.redirect('http://www.google.com');
 * 
 * @param {string} url the url of the redirection
 * @param {string} who A player id or 'ALL'
 * @return {boolean} TRUE, if the redirect message is sent
 */	
	node.redirect = function (url, who) {
		if (!url || !who) return false;
		
		var msg = node.msg.create({
			target: node.target.REDIRECT,
			data: url,
			to: who
		});
		node.socket.send(msg);
		return true;
	};
	
	node.info(node.version + ' loaded');
	
	
	// Creating the objects
	// <!-- object commented in index.js -->
	node.events = new EventEmitter();

	node.msg	= node.GameMsgGenerator;	
	
	node.session = new GameSession();
	
	node.socket = node.gsc = new Socket();
	
	node.game = new Game();
	
	
})(
		this
	, 	'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # Setup
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` configuration module
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameState = node.GameState,
	Player = node.Player,
	Game = node.Game,
	GameMsgGenerator = node.GameMsgGenerator,
	J = node.JSUS;

// TODO: check this
var frozen = false;

/**
 * ### node.setup
 * 
 * Setups the nodeGame object
 * 
 * Configures a specific feature of nodeGame and and stores 
 * the settings in `node.conf`.
 * 
 * See the examples folder for all available configuration options.
 * 
 * @param {string} property The feature to configure
 * @param {mixed} options The value of the option to configure
 * @return{boolean} TRUE, if configuration is successful
 * 
 * @see node.setup.register
 * 
 */	
	node.setup = function(property, options) {
		if (frozen) {
			node.err('nodeGame configuration is frozen. No modification allowed.');
			return false;
		}
		
		if (property === 'register') {
			node.warn('cannot setup property "register"');
			return false;
		}
		
		if (!node.setup[property]) {
			node.warn('no such property to configure: ' + property);
			return false;
		}
		
		var result = node.setup[property].call(exports, options);
		
		if (property !== 'nodegame') {
			node.conf[property] = result;
		}
		
		return true;
	};
	
/**
 * ### node.setup.register
 * 
 * Registers a configuration function
 * 
 * @param {string} property The feature to configure
 * @param {mixed} options The value of the option to configure
 * @return{boolean} TRUE, if configuration is successful
 * 
 * @see node.setup
 */	
	node.setup.register = function(property, func) {
		if (!property || !func) {
			node.err('cannot register empty setup function');
			return false;
		}
		
		if (property === 'register') {
			node.err('cannot overwrite register function');
			return false;
		}
		
		node.setup[property] = func;
		return true;
	};	

// ## Configuration functions	

// ### node.setup.nodegame
// Runs all the registered configuration functions	
// Matches the keys of the configuration objects with the name of the registered 
// functions and executes them. If no match is found, the configuration function 
// will set the default values
	node.setup.register('nodegame', function(options) {
		for (var i in node.setup) {
			if (node.setup.hasOwnProperty(i)) {
				if (i !== 'register' && i !== 'nodegame') {
					node.conf[i] = node.setup[i].call(exports, options[i]);
				}
			}
		}
		
		
	});
	
// ### node.setup.socket	
// Configures the socket connection to the nodegame-server
// @see node.Socket
// @see node.SocketFactory
	node.setup.register('socket', function(conf) {
		if (!conf) return;
		node.socket.setup(conf);
		return conf;
	});

// ### node.setup.host
// Sets the uri of the host
// If no value is passed, it will try to set the host from the window object
// in the browser enviroment. 
	node.setup.register('host', function(host) {		
		// URL
		if (!host) {
			if ('undefined' !== typeof window) {
				if ('undefined' !== typeof window.location) {
					host = window.location.href;
				}
			}
		}
			
		if (host) {
			var tokens = host.split('/').slice(0,-2);
			// url was not of the form '/channel'
			if (tokens.length > 1) {
				host = tokens.join('/');
			}
			
			// Add a trailing slash if missing
			if (host.lastIndexOf('/') !== host.length) {
				host = host + '/';
			}
		}
		
		return host;
	});
	
// ### node.setup.verbosity
// Sets the verbosity level for nodegame	
	node.setup.register('verbosity', function(level){
		if ('undefined' !== typeof level) {
			node.verbosity = level;
		}
		return level;
	});
	
// ### node.setup.env	
// Defines global variables to be stored in `node.env[myvar]`	
	node.setup.register('env', function(conf){
		if ('undefined' !== typeof conf) {
			for (var i in conf) {
				if (conf.hasOwnProperty(i)) {
					node.env[i] = conf[i];
				}
			}
		}
		
		return conf;
	});

// ### node.setup.events
// Configure the EventEmitter object
// @see node.EventEmitter
	node.setup.register('events', function(conf){
		conf = conf || {};
		if ('undefined' === typeof conf.history) {
			conf.history = false;
		}
		
		if ('undefined' === typeof conf.dumpEvents) {
			conf.dumpEvents = false;
		}
		
		return conf;
	});
	
// ### node.setup.window
// Configure the node.window object, if existing
// @see GameWindow
	node.setup.register('window', function(conf){
		if (!node.window) {
			node.warn('node.window not found, cannot configure it.');
			return;
		}
		conf = conf || {};
		if ('undefined' === typeof conf.promptOnleave) {
			conf.promptOnleave = false;
		}
		
		if ('undefined' === typeof conf.noEscape) {
			conf.noEscape = true;
		}
		
		node.window.init(conf);
		
		return conf;
	});
	
	
// ### node.setup.game
// Creates the `node.game` object
// The input parameter can be either an object (function) or 
// a stringified object (function)
	node.setup.register('game', function(game) {
		if (!game) return {};
		
		// Trying to parse the string, maybe it
		// comes from a remote setup
		if ('string' === typeof game) {
			game = J.parse(game);
			
			if ('function' !== typeof game) {
				node.err('Error while parsing the game object/string');
				return false;
			}
		}
		
		if ('function' === typeof game) {
			// creates the object
			game = new game();
		}
		
		node.game = new Game(game);
		node.emit('NODEGAME_GAME_CREATED');
		return node.game;
	});
		
// ### node.setup.player
// Creates the `node.player` object
// @see node.Player
// @see node.createPlayer
	node.setup.register('player', node.createPlayer);


/**
 * ### node.remoteSetup
 * 
 * Sends a setup configuration to a connected client
 * 
 * @param {string} property The feature to configure
 * @param {mixed} options The value of the option to configure
 * @param {string} to The id of the remote client to configure
 * 
 * @return{boolean} TRUE, if configuration is successful
 *
 * @see node.setup
 */	
	node.remoteSetup = function (property, options, to) {
		if (!property) {
			node.err('cannot send remote setup: empty property');
			return false;
		}
		if (!to) {
			node.err('cannot send remote setup: empty recipient');
			return false;
		}
		var msg = node.msg.create({
			target: node.target.SETUP,
			to: to,
			text: property,
			data: options
		});
		
		return node.socket.send(msg);
	};
		

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # Alias
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` aliasing module
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	Player = node.Player,
	GameMsgGenerator = node.GameMsgGenerator,
	J = node.JSUS;


//## Aliases	


/**
 * ### node.alias
 * 
 * Creates event listeners aliases
 * 
 * This method creates a new property to the `node.on` object named
 * after the alias. The alias can be used as a shortcut to register
 * to new listeners on the given events.
 * 
 * 
 * ```javascript
 * 	node.alias('myAlias', ['in.say.DATA', 'myEvent']);
 * 
 * 	node.on.myAlias(function(){ console.log('myEvent or in.say.DATA'); };
 * ```	
 * 
 * @param {string} alias The name of alias
 * @param {string|array} The events under which the listeners will be registered to
 */	
	node.alias = function(alias, events) {
		if (!alias || !events) { 
			node.err('undefined alias or events'); 
			return; 
		}
		if (!J.isArray(events)) events = [events];
		
		J.each(events, function(){
			node.on[alias] = function(func) {
				node.on(event, function(msg){
					func.call(node.game, msg);
				});
			};
		});
	};	
				
	
/**
 *  ### node.DONE
 * 
 * Emits locally a DONE event
 * 
 * The DONE event signals that the player has terminated a game stage, 
 * and that it is ready to advance to the next one.
 * 
 * @param {mixed} param Optional. An additional parameter passed along
 */
	node.DONE = function (param) {
		node.emit("DONE", param);
	};

/**
 *  ### node.TXT
 * 
 *  Emits locally a TXT event
 *  
 *  The TXT event signals that a text message needs to be delivered
 *  to a recipient.
 *  
 *  @param {string} text The text of the message
 *  @param {string} to The id of the recipient
 */	
	node.TXT = function (text, to) {
		node.emit('out.say.TXT', text, to);
	};			
	
// ### node.on.txt	
	node.alias('txt', 'in.say.TXT');
	
// ### node.on.data	
	node.alias('data', ['in.say.DATA', 'in.set.DATA']);
	
// ### node.on.state	
	node.alias('state', 'in.set.STATE');
	
// ### node.on.stage	
	node.alias('stage', 'in.set.STAGE');	
	
// ### node.on.plist	
	node.alias('plist', ['in.set.PLIST', 'in.say.PLIST']);
 		
	node.onTXT = function(func) {
		if (!func) return;
		node.on("", function(msg) {
			func.call(node.game,msg);
		});
	};
	
	node.onDATA = function(text, func) {
		if (!text || !func) return;
		
		node.on('in.say.DATA', function(msg) {
			if (msg.text === text) {
				func.call(node.game, msg);
			}
		});
		
		node.on('in.set.DATA', function(msg) {
			if (msg.text === text) {
				func.call(node.game, msg);
			}
		});
	};
	
	node.onSTATE = function(func) {
		node.on("in.set.STATE", function(msg) {
			func.call(node.game, msg);
		});
	};
	
	node.onSTAGE = function(func) {
		node.on("in.set.STAGE", function(msg) {
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
		


})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # Setup
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` random operation module
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameState = node.GameState,
	Player = node.Player,
	GameMsgGenerator = node.GameMsgGenerator,
	J = node.JSUS;
//## Extra

node.random = {};

/**
* ### node.random.emit
* 
* Emits an event after a random time interval between 0 and maxWait 
* 
* @param {string} event The name of the event
* @param {number} maxWait Optional. The maximum time (in milliseconds)
* 	to wait before emitting the event. to Defaults, 6000
*/	
	node.random.emit = function (event, maxWait){
		maxWait = maxWait || 6000;
		setTimeout(function(event) {
			node.emit(event);
		}, Math.random() * maxWait, event);
	};

/**
* ### node.random.exec 
* 
* Executes a callback function after a random time interval between 0 and maxWait 
* 
* @param {function} The callback function to execute
* @param {number} maxWait Optional. The maximum time (in milliseconds) 
* 	to wait before executing the callback. to Defaults, 6000
*/	
	node.random.exec = function (func, maxWait) {
		maxWait = maxWait || 6000;
		setTimeout(function(func) {
			func.call();
		}, Math.random() * maxWait, func);
	};	


})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
// # Incoming listeners
// Incoming listeners are fired in response to incoming messages
(function (node) {

	if (!node) {
		console.log('nodeGame not found. Cannot add incoming listeners');
		return false;
	}
	
	var GameMsg = node.GameMsg,
		GameStage = node.GameStage,
		PlayerList = node.PlayerList,
		Player = node.Player,
		J = node.JSUS;
	
	var action = node.action,
		target = node.target;
	
	var say = action.SAY + '.',
		set = action.SET + '.',
		get = action.GET + '.',
		IN  = node.IN;

	
/**
 * ## in.say.PCONNECT
 * 
 * Adds a new player to the player list from the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.pl 
 */
	node.on( IN + say + 'PCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.pl.add(new Player(msg.data));
		node.emit('UPDATED_PLIST');
		node.game.pl.checkStage();
	});	
	
/**
 * ## in.say.PDISCONNECT
 * 
 * Removes a player from the player list based on the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.pl 
 */
	node.on( IN + say + 'PDISCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.pl.remove(msg.data.id);
		node.emit('UPDATED_PLIST');
		node.game.pl.checkStage();
	});	

/**
 * ## in.say.MCONNECT
 * 
 * Adds a new monitor to the monitor list from the data contained in the message
 * 
 * @emit UPDATED_MLIST
 * @see Game.ml 
 */
	node.on( IN + say + 'MCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.ml.add(new Player(msg.data));
		node.emit('UPDATED_MLIST');
	});	
		
/**
 * ## in.say.MDISCONNECT
 * 
 * Removes a monitor from the player list based on the data contained in the message
 * 
 * @emit UPDATED_MLIST
 * @see Game.ml 
 */
	node.on( IN + say + 'MDISCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.ml.remove(msg.data.id);
		node.emit('UPDATED_MLIST');
	});		
			

/**
 * ## in.say.PLIST
 * 
 * Creates a new player-list object from the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.pl 
 */
node.on( IN + say + 'PLIST', function (msg) {
	if (!msg.data) return;
	node.game.pl = new PlayerList({}, msg.data);
	node.emit('UPDATED_PLIST');
});	
	
/**
 * ## in.say.MLIST
 * 
 * Creates a new monitor-list object from the data contained in the message
 * 
 * @emit UPDATED_MLIST
 * @see Game.pl 
 */
node.on( IN + say + 'MLIST', function (msg) {
	if (!msg.data) return;
	node.game.ml = new PlayerList({}, msg.data);
	node.emit('UPDATED_MLIST');
});	
	
/**
 * ## in.get.DATA
 * 
 * Experimental feature. Undocumented (for now)
 */ 
node.on( IN + get + 'DATA', function (msg) {
	if (msg.text === 'LOOP'){
		node.socket.sendDATA(action.SAY, node.game.gameLoop, msg.from, 'GAME');
	}
	// <!-- We could double emit
	// node.emit(msg.text, msg.data); -->
});

/**
 * ## in.set.STATE
 * 
 * Adds an entry to the memory object 
 * 
 */
node.on( IN + set + 'STATE', function (msg) {
	node.game.memory.add(msg.text, msg.data, msg.from);
});

/**
 * ## in.set.DATA
 * 
 * Adds an entry to the memory object 
 * 
 */
node.on( IN + set + 'DATA', function (msg) {
	node.game.memory.add(msg.text, msg.data, msg.from);
});

/**
 * ## in.say.STAGE
 * 
 * Updates the game stage or updates a player's state in
 * the player-list object
 *
 * If the message is from the server, it updates the game stage,
 * else the stage in the player-list object from the player who
 * sent the message is updated 
 * 
 *  @emit UPDATED_PLIST
 *  @see Game.pl 
 */
	node.on( IN + say + 'STAGE', function (msg) {

		if (node.socket.serverid && msg.from === node.socket.serverid) {
//			console.log(node.socket.serverid + ' ---><--- ' + msg.from);
//			console.log('NOT EXISTS');
		}
		
		if (node.game.pl.exist(msg.from)) {			
			node.game.pl.updatePlayerStage(msg.from, msg.data);
			node.emit('UPDATED_PLIST');
			node.game.pl.checkStage();
		}
		// <!-- Assume this is the server for now
		// TODO: assign a string-id to the server -->
		else {
			node.game.execStage(node.gameLoop.getStep(msg.data));
		}
	});
	
/**
 * ## in.say.REDIRECT
 * 
 * Redirects to a new page
 * 
 * @see node.redirect
 */
node.on( IN + say + 'REDIRECT', function (msg) {
	if (!msg.data) return;
	if ('undefined' === typeof window || !window.location) {
		node.log('window.location not found. Cannot redirect', 'err');
		return false;
	}

	window.location = msg.data; 
});	


/**
 * ## in.say.SETUP
 * 
 * Setups a features of nodegame
 * 
 * @see node.setup
 */
node.on( IN + say + 'SETUP', function (msg) {
	if (!msg.text) return;
	node.setup(msg.text, msg.data);
	
});	


/**
 * ## in.say.GAMECOMMAND
 * 
 * Setups a features of nodegame
 * 
 * @see node.setup
 */
node.on( IN + say + 'GAMECOMMAND', function (msg) {
	if (!msg.text) return;
	if (!node.gamecommand[msg.text]) return;
	node.emit('NODEGAME_GAMECOMMAND_' + msg.text,msg.data);
});	

/**
 * ## in.say.JOIN
 * 
 * Invites the client to leave the current channel and joining another one
 * 
 * It differs from `REDIRECT` messages because the client 
 * does not leave the page, it just switches channel. 
 * 
 */
node.on( IN + say + 'JOIN', function (msg) {
	if (!msg.text) return;
	//node.socket.disconnect();
	node.connect(msg.text);
});	

	node.log('incoming listeners added');
	
})('undefined' !== typeof node ? node : module.parent.exports); 
// <!-- ends incoming listener -->
// # Outgoing listeners
// Outgoing listeners are fired when messages are sent

(function (node) {

	if (!node) {
		console.log('nodeGame not found. Cannot add outgoing listeners');
		return false;
	}
	
	var GameMsg = node.GameMsg,
		GameState = node.GameState;
	
	var action = node.action,
		target = node.target;
	
	var say = action.SAY + '.',
		set = action.SET + '.',
		get = action.GET + '.',
		OUT  = node.OUT;
	
/**
 * ## out.say.STAGE
 * 
 * Sends out a STAGE message to the specified recipient
 * 
 * TODO: check with the server 
 * The message is for informative purpose
 * 
 */
node.on( OUT + say + 'STAGE', function (stage, to) {
	node.socket.sendSTAGE(action.SAY, stage, to);
});	
	
/**
 * ## out.say.STATE
 * 
 * Sends out a STATE message to the specified recipient
 * 
 * TODO: check with the server 
 * The message is for informative purpose
 * 
 */
node.on( OUT + say + 'STATE', function (state, to) {
	node.socket.sendSTATE(action.SAY, state, to);
});	

/**
 * ## out.say.TXT
 * 
 * Sends out a TXT message to the specified recipient
 */
node.on( OUT + say + 'TXT', function (text, to) {
	node.socket.sendTXT(text,to);
});

/**
 * ## out.say.DATA
 * 
 * Sends out a DATA message to the specified recipient
 */
node.on( OUT + say + 'DATA', function (data, to, key) {
	node.socket.sendDATA(action.SAY, data, to, key);
});

/**
 * ## out.set.STATE
 * 
 * Sends out a STATE message to the specified recipient
 * 
 * TODO: check with the server 
 * The receiver will update its representation of the state
 * of the sender
 */
node.on( OUT + set + 'STATE', function (state, to) {
	node.socket.sendSTATE(action.SET, state, to);
});

/**
 * ## out.set.DATA
 * 
 * Sends out a DATA message to the specified recipient
 * 
 * The sent data will be stored in the memory of the recipient
 * 
 * @see node.GameDB
 */
node.on( OUT + set + 'DATA', function (data, to, key) {
	node.socket.sendDATA(action.SET, data, to, key);
});

/**
 * ## out.get.DATA
 * 
 * Issues a DATA request
 * 
 * Experimental. Undocumented (for now)
 */
node.on( OUT + get + 'DATA', function (data, to, key) {
	node.socket.sendDATA(action.GET, data, to, data);
});
	
node.log('outgoing listeners added');

})('undefined' !== typeof node ? node : module.parent.exports); 
// <!-- ends outgoing listener -->
// # Internal listeners

// Internal listeners are not directly associated to messages,
// but they are usually responding to internal nodeGame events, 
// such as progressing in the loading chain, or finishing a game stage 

(function (node) {

	if (!node) {
		console.log('nodeGame not found. Cannot add internal listeners');
		return false;
	}
	
	var action = node.action,
		target = node.target;
	
	var GameMsg = node.GameMsg,
		GameStage = node.GameStage,
		Game = node.Game;
	
	var say = action.SAY + '.',
		set = action.SET + '.',
		get = action.GET + '.',
		IN  = node.IN,
		OUT = node.OUT;
	
/**
 * ## STAGEDONE
 * 
 * Fired when all the players in the player list are DONE
 */ 
node.on('STAGEDONE', function() {
	
	// In single player mode we ignore when all the players have completed the stage
	if (node.game.solo_mode) {
		return;
	}
	
	// <!-- If we go auto -->
	if (node.game.auto_step && !node.game.observer) {
		node.log('We play AUTO', 'DEBUG');
		var morePlayers = ('undefined' !== typeof node.game.minPlayers) ? node.game.minPlayers - node.game.pl.count() : 0 ;
		node.log('Additional player required: ' + morePlayers > 0 ? MorePlayers : 0, 'DEBUG');
		
		if (morePlayers > 0) {
			node.emit(OUT + say + target.TXT, morePlayers + ' player/s still needed to play the game');
			node.log(morePlayers + ' player/s still needed to play the game');
		}
		// TODO: differentiate between before the game starts and during the game
		else {
			node.emit(OUT + say + target.TXT, node.game.minPlayers + ' players ready. Game can proceed');
			node.log(node.game.pl.count() + ' players ready. Game can proceed');
			node.game.step();
		}
	}
	else {
		node.log('Waiting for monitor to step', 'DEBUG');
	}
});

/**
 * ## DONE
 * 
 * Updates and publishes that the client has successfully terminated a stage 
 * 
 * If a DONE handler is defined in the game-loop, it will executes it before
 * continuing with further operations. In case it returns FALSE, the update
 * process is stopped. 
 * 
 * @emit BEFORE_DONE
 * @emit WAITING...
 */
node.on('DONE', function(p1, p2, p3) {
	
	// Execute done handler before updating stage
	var ok = true;
	
	var done = node.game.currentStepObj.done;
	
	if (done) ok = done.call(node.game, p1, p2, p3);
	if (!ok) return;
	node.game.updateStageLevel(Game.stageLevels.DONE)
	
	// Call all the functions that want to do 
	// something before changing stage
	node.emit('BEFORE_DONE');
	
	if (node.game.auto_wait) {
		if (node.window) {	
			node.emit('WAITING...');
		}
	}
	node.game.publishUpdate();
	
	if (node.game.solo_mode) {
		node.game.step();
	}
});

/**
 * ## WINDOW_LOADED
 * 
 * Checks if the game is ready, and if so fires the LOADED event
 *
 * @emit BEFORE_LOADING
 * @emit LOADED
 */
node.on('WINDOW_LOADED', function() {
	if (node.game.ready) node.emit('LOADED');
});

/**
 * ## GAME_LOADED
 * 
 * Checks if the window was loaded, and if so fires the LOADED event
 *
 * @emit BEFORE_LOADING
 * @emit LOADED
 */
node.on('GAME_LOADED', function() {
	if (node.game.ready) node.emit('LOADED');
});

/**
 * ## LOADED
 * 
 * 
 */
node.on('LOADED', function() {
	node.emit('BEFORE_LOADING');
	node.game.updateStageLevel('PLAYING');
	//TODO: the number of messages to emit to inform other players
	// about its own stage should be controlled. Observer is 0 
	//node.game.publishUpdate();
	node.socket.clearBuffer();
	
});


/**
 * ## LOADED
 * 
 * 
 */
node.on('NODEGAME_GAMECOMMAND_' + node.gamecommand.start, function(options) {
	
	
	node.emit('BEFORE_GAMECOMMAND', node.gamecommand.start, options);
	
	if (node.game.currentStepObj.stage !== 0) {
		node.err('Game already started. Use restart if you want to start the game again');
		return;
	}
	
	node.game.start();
	
	
});


node.log('internal listeners added');
	
})('undefined' !== typeof node ? node : module.parent.exports); 
// <!-- ends outgoing listener -->