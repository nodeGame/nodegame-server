/**
 * # GameTimer
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Creates a controllable timer object for nodeGame 
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
exports.GameTimer = GameTimer;

JSUS = node.JSUS;

/**
 * ### GameTimer status levels
 * Numerical levels representing the state of the GameTimer
 * 
 * 	@see GameTimer.status
 */
GameTimer.STOPPED = -5
GameTimer.PAUSED = -3;
GameTimer.UNINITIALIZED = -1;
GameTimer.INITIALIZED = 0;
GameTimer.LOADING = 3;
GameTimer.RUNNING = 5;
	
/**
 * ## GameTimer constructor
 * 
 * Creates an instance of GameTimer
 * 
 * @param {object} options. Optional. A configuration object
 */	
function GameTimer (options) {
	options = options || {};

// ## Public properties

/**
 * ### GameTimer.status
 * 
 * Numerical index representing the current the state of the GameTimer object
 * 
 */
	this.status = GameTimer.UNINITIALIZED;	
	
/**
 * ### GameTimer.options
 * 
 * The current settings for the GameTimer
 * 
 */	
	this.options = options;

/**
 * ### GameTimer.timer
 * 
 * The ID of the javascript interval
 * 
 */	
	this.timer = null; 		

/**
 * ### GameTimer.timeLeft
 * 
 * Milliseconds left before time is up
 * 
 */	
	this.timeLeft = null;
	
/**
 * ### GameTimer.timePassed
 * 
 * Milliseconds already passed from the start of the timer
 * 
 */	
	this.timePassed = 0;

/**
 * ### GameTimer.update
 * 
 * The frequency of update for the timer (in milliseconds)
 * 
 */	
	this.update = 1000;	
	
/**
 * ### GameTimer.timeup
 * 
 * Event string or function to fire when the time is up
 * 
 * 	@see GameTimer.fire
 */		
	this.timeup = 'TIMEUP';	
	
/**
 * ### GameTimer.hooks
 * 
 * Array of hook functions to fire at every update
 * 
 * The array works as a LIFO queue
 * 
 * 	@see GameTimer.fire
 */	
	this.hooks = [];
	
	this.init();
	// TODO: remove into a new addon
	this.listeners();
};

// ## GameTimer methods

/**
 * ### GameTimer.init
 * 
 * Inits the GameTimer
 * 
 * Takes the configuration as an input parameter or 
 * recycles the settings in `this.options`.
 * 
 * The configuration object is of the type
 * 
 * 	var options = {
 * 		milliseconds: 4000, // The length of the interval
 * 		update: 1000, // How often to update the time counter. Defaults every 1sec
 * 		timeup: 'MY_EVENT', // An event ot function to fire when the timer expires
 * 		hooks: [ myFunc, // Array of functions or events to fire at every update
 * 				'MY_EVENT_UPDATE', 
 * 				{ hook: myFunc2,
 * 				  ctx: that, }, 	
 * 				], 
 * 	} 
 * 	// Units are in milliseconds 
 * 
 * @param {object} options Optional. Configuration object
 * 
 * 	@see GameTimer.addHook
 */
GameTimer.prototype.init = function (options) {
	options = options || this.options;
	this.status = GameTimer.UNINITIALIZED;
	if (this.timer) clearInterval(this.timer);
	this.milliseconds = options.milliseconds || 0;
	this.timeLeft = this.milliseconds;
	this.timePassed = 0;
	this.update = options.update || 1000;
	this.timeup = options.timeup || 'TIMEUP'; // event to be fire when timer is expired
	// TODO: update and milliseconds must be multiple now
	if (options.hooks) {
		for (var i=0; i < options.hooks.length; i++){
			this.addHook(options.hooks[i]);
		}
	}
	
	this.status = GameTimer.INITIALIZED;
};


/**
 * ### GameTimer.fire
 * 
 * Fires a registered hook
 * 
 * If it is a string it is emitted as an event, 
 * otherwise it called as a function.
 * 
 * @param {mixed} h The hook to fire
 * 
 */
GameTimer.prototype.fire = function (h) {
	if (!h && !h.hook) return;
	var hook = h.hook || h;
	if ('function' === typeof hook) {
		var ctx = h.ctx || node.game;
		hook.call(ctx);
	}
	else {
		node.emit(hook);
	}	
};
	
/**
 * ### GameTimer.start
 * 
 * Starts the timer
 * 
 * Updates the status of the timer and calls `setInterval`
 * At every update all the registered hooks are fired, and 
 * time left is checked. 
 * 
 * When the timer expires the timeup event is fired, and the
 * timer is stopped
 * 
 * 	@see GameTimer.status
 * 	@see GameTimer.timeup
 * 	@see GameTimer.fire 
 * 
 */
GameTimer.prototype.start = function() {
	this.status = GameTimer.LOADING;
	// fire the event immediately if time is zero
	if (this.options.milliseconds === 0) {
		node.emit(this.timeup);
		return;
	}

	var that = this;
	this.timer = setInterval(function() {
		that.status = GameTimer.RUNNING;
		node.log('interval started: ' + that.timeLeft, 'DEBUG', 'GameTimer: ');
		that.timePassed = that.timePassed + that.update;
		that.timeLeft = that.milliseconds - that.timePassed;
		// Fire custom hooks from the latest to the first if any
		for (var i = that.hooks.length; i > 0; i--) {
			that.fire(that.hooks[(i-1)]);
		}
		// Fire Timeup Event
		if (that.timeLeft <= 0) {
			// First stop the timer and then call the timeup
			that.stop();
			that.fire(that.timeup);
			node.log('time is up: ' + that.timeup, 'DEBUG', 'GameTimer: ');
		}
		
	}, this.update);
};
	
/**
 * ### GameTimer.addHook
 * 
 * 
 * Add an hook to the hook list after performing conformity checks.
 * The first parameter hook can be a string, a function, or an object
 * containing an hook property.
 */
GameTimer.prototype.addHook = function (hook, ctx) {
	if (!hook) return;
	var ctx = ctx || node.game;
	if (hook.hook) {
		ctx = hook.ctx || ctx;
		var hook = hook.hook;
	}
	this.hooks.push({hook: hook, ctx: ctx});
};

/**
 * ### GameTimer.pause
 * 
 * Pauses the timer
 * 
 * If the timer was running, clear the interval and sets the
 * status property to `GameTimer.PAUSED`
 * 
 */
GameTimer.prototype.pause = function() {
	if (this.status > 0) {
		this.status = GameTimer.PAUSED;
		//console.log('Clearing Interval... pause')
		clearInterval(this.timer);
	}
};	

/**
 * ### GameTimer.resume
 * 
 * Resumes a paused timer
 * 
 * If the timer was paused, restarts it with the current configuration
 * 
 * 	@see GameTimer.restart
 */
GameTimer.prototype.resume = function() {
	if (this.status !== GameTimer.PAUSED) return; // timer was not paused
	var options = JSUS.extend({milliseconds: this.milliseconds - this.timePassed}, this.options);
	this.restart(options);
};	

/**
 * ### GameTimer.stop
 * 
 * Stops the timer
 * 
 * If the timer was paused or running, clear the interval, sets the
 * status property to `GameTimer.STOPPED`, and reset the time passed
 * and time left properties
 * 
 */
GameTimer.prototype.stop = function() {
	if (this.status === GameTimer.UNINITIALIZED) return;
	if (this.status === GameTimer.INITIALIZED) return;
	if (this.status === GameTimer.STOPPED) return;
	this.status = GameTimer.STOPPED;
	clearInterval(this.timer);
	this.timePassed = 0;
	this.timeLeft = null;
};	

/**
 * ### GameTimer.restart
 * 
 * Restarts the timer
 *  
 * Uses the input parameter as configuration object, 
 * or the current settings, if undefined 
 *  
 * @param {object} options Optional. A configuration object
 *  
 * 	@see GameTimer.init
 */
GameTimer.prototype.restart = function (options) {
	this.init(options);
	this.start();
};

/**
 * ### GameTimer.listeners
 * 
 * Experimental. Undocumented (for now)
 * 
 */
GameTimer.prototype.listeners = function () {
	var that = this;
// <!--	
//		node.on('GAME_TIMER_START', function() {
//			that.start();
//		}); 
//		
//		node.on('GAME_TIMER_PAUSE', function() {
//			that.pause();
//		});
//		
//		node.on('GAME_TIMER_RESUME', function() {
//			that.resume();
//		});
//		
//		node.on('GAME_TIMER_STOP', function() {
//			that.stop();
//		});
	
//		node.on('DONE', function(){
//			console.log('TIMER PAUSED');
//			that.pause();
//		});
	
	// TODO: check what is right behavior for this
//		node.on('WAITING...', function(){
//			that.pause();
//		});
// -->
	
};

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * 
 * # TriggerManager: 
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Manages a collection of trigger functions to be called sequentially
 *  
 * ## Note for developers
 * 
 * Triggers are functions that operate on a common object, and each 
 * sequentially adds further modifications to it. 
 * 
 * If the TriggerManager were a beauty saloon, the first trigger function
 * would wash the hair, the second would cut the washed hair, and the third
 * would style it. All these operations needs to be done sequentially, and
 * the TriggerManager takes care of handling this process.
 * 
 * If `TriggerManager.returnAt` is set equal to `TriggerManager.first`, 
 * the first trigger function returning a truthy value will stop the process
 * and the target object will be immediately returned. In these settings,
 * if a trigger function returns `undefined`, the target is passed to the next
 * trigger function. 
 * 
 * Notice: TriggerManager works as a *LIFO* queue, i.e. new trigger functions
 * will be executed first.
 * 
 * ---
 * 
 */

(function(exports, node){

// ## Global scope
	
exports.TriggerManager = TriggerManager;

TriggerManager.first = 'first';
TriggerManager.last = 'last';



/**
 * ## TriggerManager constructor
 * 
 * Creates a new instance of TriggerManager
 * 
 */
function TriggerManager (options) {
// ## Public properties
	
	
/**
 * ### TriggerManager.triggers
 * 
 * Array of trigger functions 
 * 
 */
this.triggers = [];
	
// ## Public properties

/**
 * ### TriggerManager.options
 * 
 * Reference to current configuration
 * 
 */	
	this.options = options || {};

/**
 * ### TriggerManager.returnAt
 * 
 * Controls the behavior of TriggerManager.pullTriggers
 * 
 * By default it is equal to `TriggerManager.first`
 */	
	var returnAt = TriggerManager.first;
	Object.defineProperty(this, 'returnAt', {
		set: function(at){
			if (!at || (at !== TriggerManager.first && at !== TriggerManager.last)) {
				node.log('Invalid returnAt type: ' + at);
				return false;
			}
			returnAt = at;
			return at;
		},
		get: function(){
			return returnAt;
		},
		configurable: true,
		enumerable: true
	});

/**
 * ### TriggerManager.length
 * 
 * The number of registered trigger functions
 * 
 */
	Object.defineProperty(this, 'length', {
		set: function(){},
		get: function(){
			return this.triggers.length;
		},
		configurable: true
	});
	
	this.init();
};

// ## TriggerManager methods

/**
 * ### TriggerManager.init
 * 
 * Configures the TriggerManager instance
 * 
 * Takes the configuration as an input parameter or 
 * recycles the settings in `this.options`.
 * 
 * The configuration object is of the type
 * 
 * 	var options = {
 * 		returnAt: 'first', // or 'last'
 * 		triggers: [ myFunc,
 * 					myFunc2 
 * 		],
 * 	} 
 * 	 
 * @param {object} options Optional. Configuration object
 * 
 */
TriggerManager.prototype.init = function (options) {
	this.options = options || this.options;
	if (this.options.returnAt === TriggerManager.first || this.options.returnAt === TriggerManager.last) {
		this.returnAt = this.options.returnAt;
	}
	this.resetTriggers();
};

/**
 * ### TriggerManager.initTriggers
 * 
 * Adds a collection of trigger functions to the trigger array
 * 
 * @param {function|array} triggers An array of trigger functions or a single function 
 */
TriggerManager.prototype.initTriggers = function (triggers) {
	if (!triggers) return;
	if (!(triggers instanceof Array)) {
		triggers = [triggers];
	}
	for (var i=0; i< triggers.length; i++) {
		this.triggers.push(triggers[i]);
	}
  };
	
/**
 * ### TriggerManager.resetTriggers
 *   
 * Resets the trigger array to initial configuration
 *   
 * Delete existing trigger functions and re-add the ones
 * contained in `TriggerManager.options.triggers`
 * 
 */
TriggerManager.prototype.resetTriggers = function () {
	this.triggers = [];
	this.initTriggers(this.options.triggers);
};

/**
 * ### TriggerManager.clear
 * 
 * Clears the trigger array
 * 
 * Requires a boolean parameter to be passed for confirmation
 * 
 * @param {boolean} clear TRUE, to confirm clearing
 * @return {boolean} TRUE, if clearing was successful
 */
TriggerManager.prototype.clear = function (clear) {
	if (!clear) {
		node.log('Do you really want to clear the current TriggerManager obj? Please use clear(true)', 'WARN');
		return false;
	}
	this.triggers = [];
	return clear;
};
	
/**
 * ### TriggerManager.addTrigger
 * 
 * Pushes a trigger into the trigger array
 * 
 * @param {function} trigger The function to add
 * @param {number} pos Optional. The index of the trigger in the array
 * @return {boolean} TRUE, if insertion is successful
 */	  
TriggerManager.prototype.addTrigger = function (trigger, pos) {
	if (!trigger) return false;
	if (!('function' === typeof trigger)) return false;
	if (!pos) {
		this.triggers.push(trigger);
	}
	else {
		this.triggers.splice(pos, 0, trigger);
	}
	return true;
};
	  
/**
 * ### TriggerManager.removeTrigger
 * 
 * Removes a trigger from the trigger array
 * 
 * @param {function} trigger The function to remove
 * @return {boolean} TRUE, if removal is successful
 */	  
TriggerManager.prototype.removeTrigger = function (trigger) {
	if (!trigger) return false;
	for (var i=0; i< this.triggers.length; i++) {
		if (this.triggers[i] == trigger) {
			return this.triggers.splice(i,1);
		}
	}  
	return false;
};

/**
 * ### TriggerManager.pullTriggers
 * 
 * Fires the collection of trigger functions on the target object
 * 
 * Triggers are fired according to a LIFO queue, i.e. new trigger
 * functions are fired first.
 * 
 * Depending on the value of `TriggerManager.returnAt`, some trigger
 * functions may not be called. In fact a value is returned 
 * 
 * 	- 'first': after the first trigger returns a truthy value
 * 	- 'last': after all triggers have been executed
 * 
 * If no trigger is registered the target object is returned unchanged
 * 
 * @param {object} o The target object
 * @return {object} The target object after the triggers have been fired
 * 
 */	
TriggerManager.prototype.pullTriggers = function (o) {
	if ('undefined' === typeof o) return;
	if (!this.length) return o;
	
	for (var i = this.triggers.length; i > 0; i--) {
		var out = this.triggers[(i-1)].call(this, o);
		if ('undefined' !== typeof out) {
			if (this.returnAt === TriggerManager.first) {
				return out;
			}
		}
	}
	// Safety return
	return ('undefined' !== typeof out) ? out : o;
};

// <!-- old pullTriggers
//TriggerManager.prototype.pullTriggers = function (o) {
//	if (!o) return;
//	
//	for (var i = triggersArray.length; i > 0; i--) {
//		var out = triggersArray[(i-1)].call(this, o);
//		if (out) {
//			if (this.returnAt === TriggerManager.first) {
//				return out;
//			}
//		}
//	}
//	// Safety return
//	return o;
//}; 
//-->


/**
 * ### TriggerManager.size
 * 
 * Returns the number of registered trigger functions
 * 
 * Use TriggerManager.length instead 
 * 
 * @deprecated
 */
TriggerManager.prototype.size = function () {
	return this.triggers.length;
};
	

// ## Closure	
})(
	('undefined' !== typeof node) ? node : module.exports
  , ('undefined' !== typeof node) ? node : module.parent.exports
);
/**
 * # GameSession
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Addon to save and load the nodeGame session in the browser
 * 
 *  @see node.store
 *  
 * ---
 * 
 */

(function (node) {
	
	// ## Global scope
	
	var JSUS = node.JSUS,
		NDDB = node.NDDB,
		store = node.store;

	var prefix = 'nodegame_';

/**
 * ## node.session
 *
 * Loads a nodeGame session
 *
 * If no parameter is passed it will return the current session.
 * Else, it will try to load a session with the given id. 
 *
 * This method interact with the `node.store` object that provides
 * lower level capabilities to write to a persistent support (e.g. 
 * the browser localStorate).
 * 
 * @param {number} sid Optional. The session id to load
 * @return {object} The session object
 * 
 *  @see node.store
 * 
 */
	node.session = function (sid) {
				
		// Returns the current session
		if (!sid) {
			var session = {
					id: 	node.gsc.session,
					player: node.player,
					memory: node.game.memory,
					state: 	node.game.state,
					game: 	node.game.name,
					history: undefined
			};
			
			// If we saved the emitted events, add them to the
			// session object
			if (node.events.history || node.events.history.length) {
				session.history = node.events.history.fetch();
			}
			
			return session;
		}
		
		if (!node.session.isEnabled()) {
			return false;
		}
		
		// Tries to return a stored session
		return node.store(prefix + sid);
	};

/**
 * ## node.session.isEnabled
 * 
 * TRUE, if the session can be saved to a persistent support
 * 
 */	
	node.session.isEnabled = function() {
		return (node.store) ? node.store.isPersistent() : false;
	};
	

/**
 * ## node.session.store
 * 
 * Stores the current session to a persistent medium
 * 
 * @return {boolean} TRUE, if session saving was successful
 */	
	node.session.store = function() {
		if (!node.session.isEnabled()) {
			node.log('Could not save the session');
			return false;
		}
		
		var session = node.session();
		var sid = session.id;
		node.store(prefix + sid, session);
		node.log('Session saved with id ' + sid);
		return true;
	}
	
// <!--	
//	node.session.restore = function (sessionObj, sid) {
//		
//		if (!sessionObj) return false;
//		if (!sessionObj.player) return false;
//		if (!sessionObj.state) return false;
//		
//		sid = sid || sessionObj.player.sid;
//		if (!sid) return false;
//		
//		var player = {
//				id: 	sessionObj.player.id,
//				sid: 	sid,
//				name:	node.gsc.name,
//		};
//	
//		that.createPlayer(player);
//		
//		node.gsc.session 	= sessionObj.id;
//		node.game.memory 	= sessionObj.memory;
//		
//		node.goto(session.state);	
//		
//		return true;
//		
//	};
// -->

// ## Closure	
})('undefined' != typeof node ? node : module.parent.exports);
/**
 * ## WaitingRoom
 * 
 * Holds a list of players and starts one or more games based on a 
 * list of criteria. 
 *  
 */

(function(exports, node){
	
	if (!node.TriggerManager) {
		throw new Error('node.TriggerManager not found. Aborting');
	}
	
	function Group(options) {
		options = options || {}
		
		this.players = options.players;
	}
	
//	if (!node.Group) {
//		throw new Error('node.TriggerManager not found. Aborting');
//	}
	
	var J = node.JSUS;
	
	
	exports.WaitingRoom = WaitingRoom;
	
	WaitingRoom.prototype = new node.TriggerManager();
	WaitingRoom.prototype.constructor = WaitingRoom;
	
	WaitingRoom.defaults = {};
	

	
	function WaitingRoom (options) {
		node.TriggerManager.call(this, options);
		
		
		node.pool = new node.PlayerList();
		node.game.room = {};
		
		var that = this;

		var pullTriggers = function() {
			console.log('CAPTURED')
			var groups  = that.pullTriggers();

			if (!groups) return;
			if (!J.isArray(groups)) groups = [groups];
			
			var i, name, count = 0;
			for (i = 0; i< groups.length; i++) {
				name = groups[i].name || count++;
				node.game.room[name] = new Game(groups[i]);
				node.game.room[name].step();
			}
		};
		
		var onConnectFunc = function() {
			//console.log('added')
			node.onPLIST(function(){
				pullTriggers();
			});
		};
		
		var onConnect;
		Object.defineProperty(this, 'onConnect', {
			set: function(value) {
				if (value === false) {
					node.removeListener('in.say.PLIST', pullTriggers);
					node.removeListener('in.set.PLIST', pullTriggers);
				}
				else if (value === true) {
					node.onPLIST(pullTriggers);
				}
				onConnect = value;
				
			},
			get: function() {
				return onConnect;
			},
			configurable: true
		});
		
		var onTimeout, onTimeoutTime;
		Object.defineProperty(this, 'onTimeout', {
			set: function(value) {
				if (!value) {
					clearTimeout(onTimeout);
					onTimeoutTime = value;
					onTimeout = false;
				}
				else if ('numeric' === typeof value) {
				
					if (onTimeout) {
						clearTimeout(onTimeout);
					}
					onTimeoutTime = value;
					onTimeout = setTimeout(pullTriggers);
				}
			},
			get: function() {
				return onTimeoutTime;
			},
			configurable: true
		});
		
		var onInterval, onIntervalTime;
		Object.defineProperty(this, 'onInterval', {
			set: function(value) {
				if (!value) {
					clearInterval(onInterval);
					onIntervalTime = value;
					onInterval = false;
				}
				else if ('numeric' === typeof value) {
				
					if (onInterval) {
						clearInterval(onInterval);
					}
					onInterval = setInterval(pullTriggers);
					onIntervalTime = value;
				}
			},
			get: function() {
				return onIntervalTime;
			},
			configurable: true
		});
		
		
		this.init(options);
	}

	
	WaitingRoom.prototype.init = function (options) {
		options = options || {};
		
		this.onConnect = options.onConnect || true;
		this.onTimeout = options.onTimeout || false;
		this.onInterval = options.onInterval || false;
		
		
		this.addTrigger(function(){
			return new Group({
				players: node.pool,
				game: options.loops
			});
		});
		
		if (options.minPlayers && options.maxPlayers) {
			this.addTrigger(function(){
				if (node.pool.length < options.minPlayers) {
					return false;
				}
				if (node.pool.length > options.maxPlayers) {
					// Take N = maxPlayers random player
					var players = node.pool.shuffle().limit(options.maxPlayers);
					return new Group({
						players: players,
						game: options.loops
					});
					
				}
				
				return new Group({
					players: node.pool,
					game: options.loops
				});
			});
		}
		
		if (options.minPlayers) {
			this.addTrigger(function(){
				if (node.pool.length < options.minPlayers) {
					return false;
				}
				
				return new Group({
					players: node.pool,
					game: options.loops
				});
			});
		}
		
		if (options.maxPlayers) {
			this.addTrigger(function(){
				if (node.pool.length > options.maxPlayers) {
					// Take N = maxPlayers random player
					var players = node.pool.shuffle().limit(options.maxPlayers);
					return new Group({
						players: players,
						game: options.loops
					});
					
				}
			});
		}
		
		if (options.nPlayers) {
			this.addTrigger(function(){
				if (node.pool.length === options.nPlayers) {
					// Take N = maxPlayers random player
					return new Group({
						players: node.pool,
						game: options.loops
					});
					
				}
			});
		}
		
	};
	
	
	WaitingRoom.prototype.criteria = function (func, pos) {
		this.addTrigger(func, pos);
	};
	
	
	/**
	 * ## WaitingRoom.setInterval
	 * 
	 * Set the update interval
	 * 
	 */
	WaitingRoom.prototype.setInterval = function(interval) {
		if (!interval) clearInterval(this.interval);
		if (this.interval) clearInterval(this.interval);
		this.interval = setInterval(this.pullTriggers, interval);
	};
	
	
})(
	('undefined' !== typeof node) ? node : module.exports
  , ('undefined' !== typeof node) ? node : module.parent.exports
);