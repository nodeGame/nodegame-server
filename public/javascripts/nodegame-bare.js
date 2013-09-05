/**
 * # nodeGame
 *
 * Social Experiments in the Browser
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * nodeGame is a free, open source, event-driven javascript framework for on line,
 * multiplayer games in the browser.
 */
(function (exports) {

    if ('undefined' !== typeof JSUS) exports.JSUS = JSUS;
    if ('undefined' !== typeof NDDB) exports.NDDB = NDDB;
    if ('undefined' !== typeof store) exports.store = store;
    exports.support = JSUS.compatibility();        
    
})('object' === typeof module ? module.exports : (window.node = {}));
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

(function (node) {

    // ## Constants

    var k = node.constants = {};

    // ### version	
    k.version = '1.0.0-beta';



    /**
     * ### node.verbosity_levels
     * 
     * ALWAYS, ERR, WARN, INFO, DEBUG
     */  
    k.verbosity_levels = {
	ALWAYS: -(Number.MIN_VALUE + 1), 
	ERR: -1,
	WARN: 0,
	INFO: 1,
	SILLY: 10,
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
    k.verbosity = k.verbosity_levels.WARN;
    
    /**
     * ### node.remoteVerbosity
     *
     *  The minimum level for a log entry to be reported to the server
     *   
     *  Defaults, only errors are displayed.
     */	
    k.remoteVerbosity = k.verbosity_levels.WARN;



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
    k.action = {};

    k.action.SET = 'set';
    k.action.GET = 'get';
    k.action.SAY = 'say';

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
    k.target = {};


    // #### target.DATA
    // Generic identifier for any type of data
    k.target.DATA = 'DATA';

    // #### target.HI
    // A client is connecting for the first time
    k.target.HI = 'HI';

    // #### target.HI_AGAIN
    // A client re-connects to the server within the same session
    k.target.HI_AGAIN = 'HI_AGAIN';

    // #### target.PCONNECT
    // A new client just connected to the player endpoint
    k.target.PCONNECT = 'PCONNECT';

    // #### target.PDISCONNECT
    // A client that just disconnected from the player endpoint
    k.target.PDISCONNECT = 'PDISCONNECT';

    // #### target.MCONNECT
    // A client that just connected to the admin (monitor) endpoint
    k.target.MCONNECT = 'MCONNECT';

    // #### target.MDISCONNECT
    // A client just disconnected from the admin (monitor) endpoint
    k.target.MDISCONNECT = 'MDISCONNECT';

    // #### target.PLIST
    // The list of clients connected to the player endpoint was updated
    k.target.PLIST = 'PLIST';

    // #### target.MLIST
    // The list of clients connected to the admin (monitor) endpoint was updated
    k.target.MLIST = 'MLIST';

    // #### target.PLAYER_UPDATE
    // A client updates his Player object
    k.target.PLAYER_UPDATE = 'PLAYER_UPDATE';

    // #### target.STATE
    // A client notifies his own state
    k.target.STATE = 'STATE';

    // #### target.STAGE
    // A client notifies his own stage
    k.target.STAGE = 'STAGE';

    // #### target.STAGE_LEVEL
    // A client notifies his own stage level
    k.target.STAGE_LEVEL = 'STAGE_LEVEL';

    // #### target.REDIRECT
    // Redirects a client to a new uri
    k.target.REDIRECT = 'REDIRECT';

    // #### target.SETUP
    // Asks a client update its configuration
    k.target.SETUP = 'SETUP';

    // #### target.GAMECOMMAND
    // Ask a client to start/pause/stop/resume the game
    k.target.GAMECOMMAND = 'GAMECOMMAND';

    // #### target.JOIN
    // Asks a client to join another channel/subchannel/room
    k.target.JOIN = 'JOIN';

    // #### target.LOG
    // A log entry
    k.target.LOG = 'LOG';

    //#### not used targets (for future development)

    k.target.TXT  = 'TXT';    // Text msg

    // Still to implement
    k.target.BYE  = 'BYE';    // Force disconnects
    k.target.ACK  = 'ACK';    // A reliable msg was received correctly

    k.target.WARN = 'WARN';   // To do.
    k.target.ERR  = 'ERR';    // To do.


    /**
     * ### Game commands
     *
     * - node.gamecommand.start
     * - node.gamecommand.pause
     * - node.gamecommand.resume
     * - node.gamecommand.stop
     */
    k.gamecommand = {
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
    k.IN  = 'in.';
    k.OUT = 'out.';


    // TODO node.is is basically replaced by Game.stateLevels


    /**
     * ### node.is
     *
     * Levels associated to the states of the nodeGame engine
     *
     * @deprecated
     */
    k.is = {};

    // #### is.UNKNOWN
    // A game has not been initialized
    k.is.UNKNOWN = 0;

    // #### is.INITIALIZING
    // The engine is loading all the modules
    k.is.INITIALIZING = 1;

    // #### is.INITIALIZED
    // The engine is fully loaded, but there is still no game
    k.is.INITIALIZED = 5;

    // #### is.GAMELOADED
    // The engine is fully loaded, and a game has been loaded
    k.is.GAMELOADED = 10;

    // #### is.DEAD
    // An unrecoverable error has occurred
    k.is.DEAD = -1;

    // TODO: remove these
    // #### is.LOADING
    // A game is loading
    k.is.LOADING = 10;

    // #### is.LOADED
    // A game has been loaded, but the GameWindow object could still require some time
    k.is.LOADED  = 25;

    // #### is.PLAYING
    // Everything is ready
    k.is.PLAYING = 50;

    // #### is.DONE
    // The player completed the game state
    k.is.DONE = 100;




    /**
     * ### node.stateLevels
     *
     * Levels associated with the states of the Game
     */
    k.stateLevels = {
        UNINITIALIZED:  0,  // creating the game object
        STARTING:       1,  // starting the game
        INITIALIZING:   2,  // calling game's init
        INITIALIZED:    5,  // init executed
        STAGE_INIT:    10,  // calling stage's init
        STEP_INIT:     20,  // calling step's init
        PLAYING_STEP:  30,  // executing step
        FINISHING:     40,  // calling game's gameover
        GAMEOVER:     100,  // game complete
        RUNTIME_ERROR: -1
    };


    /**
     * ### node.stageLevels
     *
     * Levels associated with the states of the stages of the Game
     */
    k.stageLevels = {
        UNINITIALIZED:  0,
        INITIALIZING:   1,  // executing init
        INITIALIZED:    5,  // init executed
        LOADING:       30,
        LOADED:        40,
        PLAYING:       50,
        PAUSING:       55,
        PAUSED:        60,
        RESUMING:      65,
        RESUMED:       70,
        DONE:         100
    };

    /**
     * ### node.UNDEFINED_PLAYER
     *
     * Undefined player ID
     */
    k.UNDEFINED_PLAYER = -1;

})('undefined' != typeof node ? node : module.exports);

/**
 * # Stepping Rules
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * ---
 */
(function (exports, parent) {

    exports.stepRules = {};
    
    // Renaming parent to node, so that functions can be executed
    // context-less in the browser too.
    var node = parent;

    // ## SYNC_STEP
    // Player waits that all the clients have terminated the
    // current step before going to the next
    exports.stepRules.SYNC_STEP = function(stage, myStageLevel, pl, game) {
        return myStageLevel === node.constants.stageLevels.DONE &&
            pl.isStepDone(stage);
    };

    // ## SOLO
    // Player proceeds to the next step as soon as the current one
    // is DONE, regardless to the situation of other players
    exports.stepRules.SOLO = function(stage, myStageLevel, pl, game) {
        return myStageLevel === node.constants.stageLevels.DONE;
    };

    // ## WAIT
    // Player waits for explicit step command
    exports.stepRules.WAIT = function(stage, myStageLevel, pl, game) {
        return false;
    };

    // ## SYNC_STAGE
    // Player can advance freely within the steps of one stage,
    // but has to wait before going to the next one
    exports.stepRules.SYNC_STAGE = function(stage, myStageLevel, pl, game) {
        var iamdone = myStageLevel === node.constants.stageLevels.DONE;
        console.log();
        console.log('*** myStageLevel: ' + myStageLevel + ' (iamdone: ' + iamdone + ')');
        console.log('*** stepsToNextStage: ' + game.plot.stepsToNextStage(stage));
        console.log('*** isStepDone [upTo]: ' + pl.isStepDone(stage, true));
        if (game.plot.stepsToNextStage(stage) > 1) {
            return iamdone;
        }
        else {
            // if next step is going to be a new stage, wait for others
            return iamdone && pl.isStepDone(stage, true);
        }
    };

    // ## Closure
})(
    'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # Stager
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * `nodeGame` container of game-state functions, and parameters
 *
 * ---
 *
 */
(function (exports, parent) {

// ## Global scope
    var J = parent.JSUS;

    parent.NodeGameRuntimeError = NodeGameRuntimeError;
    parent.NodeGameStageCallbackError = NodeGameStageCallbackError;
    parent.NodeGameMisconfiguredGameError = NodeGameMisconfiguredGameError;
    parent.NodeGameIllegalOperationError = NodeGameIllegalOperationError;

    /*
     * ### NodeGameRuntimeError
     *
     * An error occurred during the execution of nodeGame
     */
    function NodeGameRuntimeError(msg) {
        //Error.apply(this, arguments);
        this.msg = msg;
        this.stack = (new Error()).stack;
        throw new Error('Runtime: ' + msg);
    }

    NodeGameRuntimeError.prototype = new Error();
    NodeGameRuntimeError.prototype.constructor = NodeGameRuntimeError;
    NodeGameRuntimeError.prototype.name = 'NodeGameRuntimeError';


    /*
     * ### NodeGameStageCallbackError
     *
     * An error occurred during the execution of one of the stage callbacks
     */
    function NodeGameStageCallbackError(msg) {
        //Error.apply(this, arguments);
        this.msg = msg;
        this.stack = (new Error()).stack;
        throw 'StageCallback: ' + msg;
    }

    NodeGameStageCallbackError.prototype = new Error();
    NodeGameStageCallbackError.prototype.constructor = NodeGameStageCallbackError;
    NodeGameStageCallbackError.prototype.name = 'NodeGameStageCallbackError';


    /*
     * ### NodeGameMisconfiguredGameError
     *
     * An error occurred during the configuration of the Game
     */
    function NodeGameMisconfiguredGameError(msg) {
        //Error.apply(this, arguments);
        this.msg = msg;
        this.stack = (new Error()).stack;
        throw 'MisconfiguredGame: ' + msg;
    }

    NodeGameMisconfiguredGameError.prototype = new Error();
    NodeGameMisconfiguredGameError.prototype.constructor = NodeGameMisconfiguredGameError;
    NodeGameMisconfiguredGameError.prototype.name = 'NodeGameMisconfiguredGameError';


    /*
     * ### NodeGameIllegalOperationError
     *
     * An error occurred during the configuration of the Game
     */
    function NodeGameIllegalOperationError(msg) {
        //Error.apply(this, arguments);
        this.msg = msg;
        this.stack = (new Error()).stack;
        throw 'IllegalOperation: ' + msg;
    }

    NodeGameIllegalOperationError.prototype = new Error();
    NodeGameIllegalOperationError.prototype.constructor = NodeGameIllegalOperationError;
    NodeGameIllegalOperationError.prototype.name = 'NodeGameIllegalOperationError';

    if (J.isNodeJS()) {
	// TODO fix this
        //process.on('uncaughtException', function (err) {
        //    node.err('Caught exception: ' + err);
        //    if (node.debug) {
        //        throw err;
        //    }
        //});
    }
    else {
//        window.onerror = function(msg, url, linenumber) {
//            console.log(node, msg);
//            node.err(url + ' ' + linenumber + ': ' + msg);
//            return !node.debug;
//        };
    }

// ## Closure
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
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
(function (exports, parent) {

    // ## Global scope

    var NDDB = parent.NDDB,
    GameStage = parent.GameStage;

    exports.EventEmitter = EventEmitter;
    exports.EventEmitterManager = EventEmitterManager;

    /**
     * ## EventEmitter constructor
     *
     * creates a new instance of EventEmitter
     */
    function EventEmitter(name, node) {

        this.node = node;

        // ## Public properties

        this.name = 'undefined' !== typeof name ? name : 'EE';

        /**
         * ### EventEmitter.listeners
         *
         *
         * Event listeners collection
         *
         */
        this.events = {};

        /**
         * ### EventEmitter.history
         *
         * Database of emitted events
         *
         * @see NDDB
         * @see EventEmitter.EventHistory
         * @see EventEmitter.store
         *
         */
        this.history = new EventHistory(this.node);
    }

    // ## EventEmitter methods

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
    EventEmitter.prototype.on = function (type, listener) {
        if ('string' !== typeof type) {
            throw TypeError('EventEmitter.on: type must be a string');
        }
        if ('function' !== typeof listener) {
            throw TypeError('EventEmitter.remove: listener must be a function');
        }

        if (!this.events[type]) {
            // Optimize the case of one listener. Don't need the extra array object.
            this.events[type] = listener;
        }
        else if (typeof this.events[type] === 'object') {
            // If we've already got an array, just append.
            this.events[type].push(listener);
        }
        else {
            // Adding the second element, need to change to array.
            this.events[type] = [this.events[type], listener];
        }

        this.node.silly('ee.' + this.name + ' added listener: ' + type + ' ' + listener);
    };

    /**
     * ### EventEmitter.once
     *
     * Registers an event listener that will be removed
     * after its first invocation
     *
     * @param {string} event The name of the event
     * @param {function} listener The callback function
     *
     * @see EventEmitter.on
     * @see EventEmitter.off
     */
    EventEmitter.prototype.once = function(type, listener) {
        var node = this.node;
        function g() {
            this.remove(type, g);
            listener.apply(node.game, arguments);
        }
        this.on(type, g);
    };





    /**
     * ### EventEmitter.emit
     *
     * Fires all the listeners associated with an event
     *
     * The first parameter be the name of the event as _string_,
     * followed by any number of parameters that will be passed to the
     * handler callback.
     *
     */
    EventEmitter.prototype.emit = function() {

        var handler, len, args, i, listeners, type, ctx, node;

        type = arguments[0];
        handler = this.events[type];

        if ('undefined' === typeof handler) return false;

        node = this.node;
        ctx = node.game;

        // <!-- Debug
        if (this.node.conf.events.dumpEvents) {
            this.node.log('F: ' + type);
        }

        if ('function' === typeof handler) {

            switch (arguments.length) {
                // fast cases
            case 1:
                handler.call(ctx);
                break;
            case 2:
                handler.call(ctx, arguments[1]);
                break;
            case 3:
                handler.call(ctx, arguments[1], arguments[2]);
                break;
            case 4:
                handler.call(ctx, arguments[1], arguments[2], arguments[3]);
                break;

            default:
                // slower
                len = arguments.length;
                args = new Array(len - 1);
                for (i = 1; i < len; i++) {
                    args[i - 1] = arguments[i];
                }
                handler.apply(ctx, args);
            }
        }
        else if ('object' === typeof handler) {
            len = arguments.length;
            args = new Array(len - 1);
            for (i = 1; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            listeners = handler.slice();
            len = listeners.length;

            for (i = 0; i < len; i++) {
                listeners[i].apply(node.game, args);
            }
        }


        // Log the event into node.history object, if present
        if (node.conf && node.conf.events && node.conf.events.history) {
            this.history.insert({
                stage: node.game.getCurrentGameStage(),
                args: arguments
            });
        }
    };

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
    EventEmitter.prototype.remove = function(type, listener) {

        var listeners, len, i, type, node;
        node = this.node;

        if ('string' !== typeof type) {
            throw TypeError('EventEmitter.remove (' + this.name + '): type must be a string');
        }

        if (!this.events[type]) {
            node.warn('EventEmitter.remove (' + this.name + '): unexisting event ' + type);
            return false;
        }

        if (!listener) {
            delete this.events[type];
            node.silly('Removed listener ' + type);
            return true;
        }

        if (listener && 'function' !== typeof listener) {
            throw TypeError('EventEmitter.remove (' + this.name + '): listener must be a function');
        }


        if ('function' === typeof this.events[type] ) {
            if (listeners == listener) {
                listeners.splice(i, 1);
                node.silly('ee.' + this.name + ' removed listener: ' + type + ' ' + listener);
                return true;
            }
        }
        else {
            // array
            listeners = this.events[type];
            len = listeners.length;
            for (i = 0; i < len; i++) {
                if (listeners[i] == listener) {
                    listeners.splice(i, 1);
                    node.silly('ee.' + this.name + 'removed listener: ' + type + ' ' + listener);
                    return true;
                }
            }
        }

        node.warn('EventEmitter.remove (' + this.name + '): no listener-match found for event ' + type);
        return false;
    };

    /**
     * ### EventEmitter.printAll
     *
     * Removes all registered event listeners
     */
    EventEmitter.prototype.clear =  function() {
        this.events = {};
    };

    /**
     * ### EventEmitter.printAll
     *
     * Prints to console all the registered functions
     */
    EventEmitter.prototype.printAll =  function() {
        for (var i in this.events) {
            if (this.events.hasOwnProperty(i)) {
                console.log(i + ': ' + i.length ? i.length : 1 + ' listener/s');
            }
        }
    };


    /**
     * # EventEmitterManager
     *
     */
    function EventEmitterManager(node) {

        this.node = node;

        this.ee = {};
        this.createEE('ng');
        this.createEE('game');
        this.createEE('stage');
        this.createEE('step');

        this.createEEGroup('game', 'step', 'stage', 'game');
        this.createEEGroup('stage', 'stage', 'game');
    };

    EventEmitterManager.prototype.createEEGroup = function(groupName) {
        var len, that, args;
        len = arguments.length, that = this;

        if (!len) {
            throw new Error('EEGroup needs a name and valid members');
        }
        if (len === 1) {
            throw new Error('EEGroup needs at least one member');
        }

        // Checking if each ee exist
        for (i = 1; i < len; i++) {
            if ('string' !== typeof arguments[i]) {
                throw new TypeError('EventEmitter name must be a string');
            }
            if (!this.ee[arguments[i]]) {
                throw new Error('non-existing EventEmitter in group ' + groupName + ': ' + arguments[i]);
            }
        }

        // copying the args obj into an array;
        args = new Array(len - 1);
        for (i = 1; i < len; i++) {
            args[i - 1] = arguments[i];
        }

        switch (len) {
            // fast cases
        case 2:
            this[groupName] = this.ee[args[0]];
            break;
        case 3:
            this[groupName] = {
                emit: function() {
                    that.ee[args[0]].emit(arguments);
                    that.ee[args[1]].emit(arguments);
                },
                on: this.ee[args[0]].on,
                once: this.ee[args[1]].once,
                clear: function() {
                    that.ee[args[0]].clear();
                    that.ee[args[1]].clear();
                },
                remove: function() {
                    that.ee[args[0]].remove(arguments);
                    that.ee[args[1]].remove(arguments);
                },
                printAll: function() {
                    that.ee[args[0]].printAll();
                    that.ee[args[1]].printAll();
                }
            };
            break;
        case 4:
            this[groupName] = {
                emit: function() {
                    that.ee[args[0]].emit(arguments);
                    that.ee[args[1]].emit(arguments);
                    that.ee[args[2]].emit(arguments);
                },
                on: this.ee[args[0]].on,
                once: this.ee[args[1]].once,
                clear: function() {
                    that.ee[args[0]].clear();
                    that.ee[args[1]].clear();
                    that.ee[args[2]].clear();
                },
                remove: function() {
                    that.ee[args[0]].remove(arguments);
                    that.ee[args[1]].remove(arguments);
                    that.ee[args[2]].remove(arguments);
                },
                printAll: function() {
                    that.ee[args[0]].printAll();
                    that.ee[args[1]].printAll();
                    that.ee[args[2]].printAll();
                }
            };
            break;
        default:
            // slower
            len = args.len;
            this[groupName] = {
                emit: function() {
                    for (i = 0; i < len; i++) {
                        that.ee[args[i]].emit(arguments);
                    }
                },
                on: this.ee[args[0]].on,
                once: this.ee[args[1]].once,
                clear: function() {
                    for (i = 0; i < len; i++) {
                        that.ee[args[i]].clear();
                    }

                },
                remove: function() {
                    for (i = 0; i < len; i++) {
                        that.ee[args[i]].remove(arguments);
                    }
                },
                printAll: function() {
                    for (i = 0; i < len; i++) {
                        that.ee[args[i]].printAll();
                    }
                }
            };
        }
        return this[groupName];
    };


    EventEmitterManager.prototype.createEE = function(name) {
        this.ee[name] = new EventEmitter(name, this.node);
        this[name] = this.ee[name];
        return this.ee[name];
    };

    EventEmitterManager.prototype.destroyEE = function(name) {
        var ee;
        ee = this.ee[name];
        if (!ee) {
            this.node.warn('cannot destroy undefined EventEmitter');
            return false;
        }
        delete this[name];
        delete this.ee[name];
    };


    EventEmitterManager.prototype.clear = function() {
        for (i in this.ee) {
            if (this.ee.hasOwnProperty(i)) {
                this.ee[i].clear();
            }
        }
    };


    EventEmitterManager.prototype.emit = function() {
        var i, event;
        event = arguments[0];
        if ('undefined' === typeof event) {
            this.node.warn('cannot emit undefined event');
            return false;
        }

        for (i in this.ee) {
            if (this.ee.hasOwnProperty(i)) {
                this.ee[i].emit.apply(this.ee[i], arguments);
            }
        }
    };

    EventEmitterManager.prototype.remove = function(event, listener) {
        var i;

        if ('string' !== typeof event) {
            this.node.err('EventEmitterManager.remove: event must be string.');
            return false;
        }

        if (listener && 'function' !== typeof listener) {
            this.node.err('EventEmitterManager.remove: listener must be function.');
            return false;
        }

        for (i in this.ee) {
            if (this.ee.hasOwnProperty(i)) {
                this.ee[i].remove(event, listener);
            }
        }
    };

    /**
     * # EventHistory
     *
     */
    function EventHistory(node) {
        
        this.node = node;

        /**
         * ### EventHistory.history
         *
         * Database of emitted events
         *
         * @see NDDB
         * @see EventEmitter.store
         *
         */
        this.history = new NDDB();

        this.history.h('stage', function(e) {
            var stage;
            if (!e) return;
            stage = ('object' === typeof e.stage) ? e.stage : this.node.game.stage;
            return node.GameStage.toHash(stage, 'S.s.r');
        });

    }

    EventHistory.prototype.remit = function(stage, discard, keep) {
        var hash, db, remit, node;
        node = this.node;
        if (!this.history.count()) {
            node.log('no event history was found to remit', 'WARN');
            return false;
        }

        node.silly('remitting ' + node.events.history.count() + ' events');

        if (stage) {

            this.history.rebuildIndexes();

            hash = new GameStage(session.stage).toHash('S.s.r');

            if (!this.history.stage) {
                node.silly('no old events to re-emit were found during session recovery');
                return false;
            }
            if (!this.history.stage[hash]){
                node.silly('the current stage ' + hash + ' has no events to re-emit');
                return false;
            }

            db = this.history.stage[hash];
        }
        else {
            db = this.history;
        }

        // cleaning up the events to remit
        // @TODO NDDB commands have changed, update
        if (discard) {
            db.select('event', 'in', discard).remove();
        }

        if (keep) {
            db = db.select('event', 'in', keep);
        }

        if (!db.count()){
            node.silly('no valid events to re-emit after cleanup');
            return false;
        }

        remit = function () {
            node.silly('re-emitting ' + db.count() + ' events');
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
 *  `stage`: the higher-level building blocks of a game
 *  `step`: the sub-unit of a stage
 *  `round`: the number of repetition for a stage. Defaults round = 1
 *
 *
 * @see GamePlot
 *
 * ---
 *
 */

(function(exports, parent) {

// ## Global scope

// Expose constructor
exports.GameStage = GameStage;

GameStage.defaults = {};

/**
 * ### GameStage.defaults.hash
 *
 * Default hash string for game-stages
 *
 *  @see GameStage.toHash
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
 * @see GameStage.defaults.hash
 */
function GameStage(gs) {

// ## Public properties

/**
 * ### GameStage.stage
 *
 * The N-th game-block (stage) in the game-plot currently being executed
 *
 * @see GamePlot
 *
 */
    this.stage = 0;

/**
 * ### GameStage.step
 *
 * The N-th game-block (step) nested in the current stage
 *
 *  @see GameStage.stage
 *
 */
    this.step = 1;

/**
 * ### GameStage.round
 *
 * The number of times the current stage was repeated
 *
 */
    this.round = 1;

    if (!gs || 'undefined' === typeof gs) {
        this.stage = 0;
        this.step  = 0;
        this.round = 0;
    }
    else if ('string' === typeof gs) {
        var tokens = gs.split('.');
        var stageNum = parseInt(tokens[0], 10);
        var stepNum  = parseInt(tokens[1], 10);
        var roundNum = parseInt(tokens[2], 10);

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
    return this.toHash('S.s.r');
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
 *  - S: stage
 *  - s: step
 *  - r: round
 *
 * E.g.
 *
 * ```javascript
 *      var gs = new GameStage({
 *          round: 1,
 *          stage: 2,
 *          step: 1
 *      });
 *
 *      gs.toHash('(R) S.s'); // (1) 2.1
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
    var result;
    if ('undefined' === typeof gs1 && 'undefined' === typeof gs2) return 0;
    if ('undefined' === typeof gs2) return 1;
    if ('undefined' === typeof gs1) return -1;

    // Convert the parameters to objects, if an hash string was passed
    if ('string' === typeof gs1) gs1 = new GameStage(gs1);
    if ('string' === typeof gs2) gs2 = new GameStage(gs2);

    result = gs1.stage - gs2.stage;

    if (result === 0 && 'undefined' !== typeof gs1.round) {
        result = gs1.round - gs2.round;

        if (result === 0 && 'undefined' !== typeof gs1.step) {
            result = gs1.step - gs2.step;
        }
    }
    
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
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
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

(function (exports, parent) {

    // ## Global scope

    // Exposing constructor
    exports.PlayerList = PlayerList;

    // Setting up global scope variables
    var J = parent.JSUS,
        NDDB = parent.NDDB,
        GameStage = parent.GameStage,
        Game = parent.Game,
        NodeGameRuntimeError = parent.NodeGameRuntimeError;

    var stageLevels = parent.constants.stageLevels;
    var stateLevels = parent.constants.stateLevels;


    // Inheriting from NDDB
    PlayerList.prototype = new NDDB();
    PlayerList.prototype.constructor = PlayerList;

    /**
     * ### PlayerList.comparePlayers
     *
     * Comparator functions between two players
     *
     * @param {Player} p1 The first player
     * @param {Player} p2 The second player
     * @return {number} The result of the comparison
     *
     * @see NDDB.globalCompare
     */
    PlayerList.comparePlayers = function (p1, p2) {
        if (p1.id === p2.id) return 0;
        if (p1.count < p2.count) return 1;
        if (p1.count > p2.count) return -1;
        return 0;
    };

    /**
     * ## PlayerList constructor
     *
     * Creates an instance of PlayerList
     *
     * The class inherits his prototype from `node.NDDB`.
     *
     * It indexes players by their _id_.
     *
     * @param {object} options Optional. Configuration object
     * @param {array} db Optional. An initial set of players to import
     * @param {PlayerList} parent Optional. A parent object for the instance
     *
     * @see NDDB.constructor
     */
    function PlayerList (options, db) {
        options = options || {};
        
        // Updates indexes on the fly.
        if (!options.update) options.update = {};
        if ('undefined' === typeof options.update.indexes) {
            options.update.indexes = true;
        }
        // Indexing the players by id.
        // We need to add this option for the NDDB constructor,
        // so that will be able to index all the players passed 
        // in the db parameter
        if (!options.I) options.I = {};
        if ('undefined' === typeof options.I.id) {
            options.I.id =  function(p) { return p.id; };
        }

// Probably we don't need this
//        // Indexing the players by sid.
//        if ('undefined' === typeof options.I.sid) {
//            options.I.sid =  function(p) { return p.sid; };
//        }

        // We check if the index are not existing already because
        // it could be that the constructor is called by the breed function
        // and in such case we would duplicate them.
        // We need keep this beside the option setup above, because otherwise
        // PlayerList.exist will fail.
        if (!this.id) {
            this.index('id', function(p) {
                return p.id;
            });
        }

// Probably we don't need this
//        if (!this.sid) {
//            this.index('sid', function(p) {
//                return p.id;
//            });
//        }

        // Invoking NDDB constructor.
        NDDB.call(this, options, db);
        
        // Assigns a global comparator function.
        this.globalCompare = PlayerList.comparePlayers;


        // Not sure if we need it now
        //  if (!this.stage) {
        //      this.hash('stage', function(p) {
        //          return p.stage.toHash();
        //      }
        //  }

        // The internal counter that will be used to assing the `count`
        // property to each inserted player
        this.pcounter = this.db.length || 0;
    }

    // ## PlayerList methods

    /**
     * ### PlayerList.importDB
     *
     * Adds an array of players to the database at once
     *
     * Overrides NDDB.importDB
     *
     * @param {array} pl The array of player to import at once
     */
    PlayerList.prototype.importDB = function (pl) {
        var i;
        if (!pl) return;
        for (i = 0; i < pl.length; i++) {
            this.add(pl[i]);
        }
    };

    /**
     * ### PlayerList.add
     *
     * Adds a new player to the database
     *
     * Before insertion, objects are checked to be valid `Player` objects,
     * that is they must have a unique player id. Objects will then
     * automatically casted to type Player.
     *
     * The `count` property is added to the player object, and
     * the internal `pcounter` variable is incremented.
     *
     * @param {Player} player The player object to add to the database
     * @return {player} The inserted player
     */
    PlayerList.prototype.add = function (player) {
        if (!(player instanceof Player)) {
            if (!player || 'undefined' === typeof player.id) {
                throw new NodeGameRuntimeError(
                        'PlayerList.add: player.id was not given');
            }
            player = new Player(player);
        }

        if (this.exist(player.id)) {
            throw new NodeGameRuntimeError(
                    'PlayerList.add: Player already exists (id ' + player.id + ')');
        }
        
        this.insert(player);
        player.count = this.pcounter;
        this.pcounter++;

        return player;
    };

    /**
     * ### PlayerList.get
     *
     * Retrieves a player with the given id
     *
     * @param {number} id The id of the player to retrieve
     * @return {Player} The player with the speficied id
     */
    PlayerList.prototype.get = function (id) {
        var player;
        if ('undefined' === typeof id) {
            throw new NodeGameRuntimeError(
                    'PlayerList.get: id was not given');

        }
        player = this.id.get(id);
        if (!player) {
            throw new NodeGameRuntimeError(
                    'PlayerList.get: Player not found (id ' + id + ')');
        }
        return player;
    };

    /**
     * ### PlayerList.remove
     *
     * Removes the player with the given id
     *
     * Notice: this operation cannot be undone
     *
     * @param {number} id The id of the player to remove
     * @return {object} The removed player object
     */
    PlayerList.prototype.remove = function (id) {
        var player;
        if ('undefined' === typeof id) {
            throw new NodeGameRuntimeError(
                'PlayerList.remove: id was not given');
        }
        player = this.id.pop(id);
        if (!player) {
            throw new NodeGameRuntimeError(
                'PlayerList.remove: Player not found (id ' + id + ')');
        }
        return player;
    };

    // ### PlayerList.pop
    // @deprecated
    // TODO remove after transition is complete
    PlayerList.prototype.pop = PlayerList.prototype.remove;

    /**
     * ### PlayerList.exist
     *
     * Checks whether a player with the given id already exists
     *
     * @param {number} id The id of the player
     * @return {boolean} TRUE, if a player with the specified id is found
     */
    PlayerList.prototype.exist = function (id) {
        return this.id.get(id) ? true : false;
    };

    /**
     * ### PlayerList.updatePlayer
     *
     * Updates the state of a player
     *
     * @param {number} id The id of the player
     * @param {object} playerState An update with fields to update in the player
     * @return {object} The updated player object
     */
    PlayerList.prototype.updatePlayer = function (id, playerState) {
        // TODO: check playerState

        if (!this.exist(id)) {
            throw new NodeGameRuntimeError(
                    'PlayerList.updatePlayer: Player not found (id ' + id + ')');
        }

        if ('undefined' === typeof playerState) {
            throw new NodeGameRuntimeError(
                'PlayerList.updatePlayer: Attempt to assign to a player an undefined playerState');
        }

        return this.id.update(id, playerState);
    };

    /**
     * ### PlayerList.updatePlayerStage
     *
     * Updates the value of the `stage` object of a player
     *
     * @param {number} id The id of the player
     * @param {GameStage} stage The new stage object
     * @return {object} The updated player object
     *
     * @deprecated
     */
    PlayerList.prototype.updatePlayerStage = function (id, stage) {

        if (!this.exist(id)) {
            throw new NodeGameRuntimeError(
                    'PlayerList.updatePlayerStage: Player not found (id ' + id + ')');
        }

        if ('undefined' === typeof stage) {
            throw new NodeGameRuntimeError(
                'PlayerList.updatePlayerStage: Attempt to assign to a player an undefined stage');
        }

        return this.id.update(id, {
            stage: stage
        });
    };

    /**
     * ### PlayerList.updatePlayerStageLevel
     *
     * Updates the value of the `stageLevel` object of a player
     *
     * @param {number} id The id of the player
     * @param {number} stageLevel The new stageLevel
     * @return {object} The updated player object
     *
     * @deprecated
     */
    PlayerList.prototype.updatePlayerStageLevel = function (id, stageLevel) {
        if (!this.exist(id)) {
            throw new NodeGameRuntimeError(
                    'PlayerList.updatePlayerStageLevel: Player not found (id ' + id + ')');
        }

        if ('undefined' === typeof stageLevel) {
            throw new NodeGameRuntimeError(
                'PlayerList.updatePlayerStageLevel: Attempt to assign to a player an undefined stage');
        }

        return this.id.update(id, {
            stageLevel: stageLevel
        });
    };

    /**
     * ### PlayerList.isStepDone
     *
     * Checks whether all players have terminated the specified game step
     *
     * A stage is considered _DONE_ if all players that are found playing
     * that game step have the property `stageLevel` equal to `Game.stageLevels.DONE`.
     *
     * Players at other steps are ignored.
     *
     * If no player is found at the desired step, it returns TRUE.
     *
     * @param {GameStage} gameStage The GameStage of reference
     * @param {boolean} upTo Optional. If TRUE, all players in the stage up to the
     *  given step are checked. Defaults, FALSE.
     *
     * @return {boolean} TRUE, if all checked players have terminated the stage
     */
    PlayerList.prototype.isStepDone = function (gameStage, upTo) {
        var p, i, cmp;

        if (!gameStage) return false;

        upTo = !!upTo;

        for (i = 0; i < this.db.length; i++) {
            p = this.db[i];
            cmp = GameStage.compare(gameStage, p.stage);

            if (upTo) {
                // Check players in current stage up to the reference step:

                // Player in another stage
                if (gameStage.stage !== p.stage.stage) {
                    continue;
                }

                // Player after given step
                if (cmp < 0) {
                    continue;
                }
                // Player before given step
                else if (cmp > 0) {
                    return false;
                }

            }
            else {
                // Just check players in current step:

                // Player in another step
                if (cmp !== 0) {
                    continue;
                }
            }

            // Player not done with his step
            if (p.stageLevel !== stageLevels.DONE) {
                return false;
            }
        }

        return true;
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
        var out = '', EOL = eol || '\n', stage;
        this.forEach(function(p) {
            out += p.id + ': ' + p.name;
            stage = new GameStage(p.stage);
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
     * @see JSUS.getNGroups
     */
    PlayerList.prototype.getNGroups = function (N) {
        if (!N) return;
        var groups = J.getNGroups(this.db, N);
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
     * @see JSUS.getGroupsSizeN
     */
    PlayerList.prototype.getGroupsSizeN = function (N) {
        if (!N) return;
        var groups = J.getGroupsSizeN(this.db, N);
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
            throw new NodeGameRuntimeError(
                    'PlayerList.getRandom: N must be an integer >= 1');
        }
        this.shuffle();
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
     *  `sid`: The Socket.io session id associated to the player
     *  `id`: The nodeGame session id associate to the player
     *  `count`: The id of the player within a PlayerList object
     *  `admin`: Whether the player is an admin
     *  `disconnected`: Whether the player has disconnected
     *
     * Others properties are public and can be changed during the game.
     *
     *  `name`: An alphanumeric name associated to the player
     *  `stage`: The current stage of the player as relative to a game
     *  `ip`: The ip address of the player
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
     */
    function Player (player) {
        var key;

        if (!player || !player.id) {
            throw new TypeError('Player: invalid player parameter');
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
        this.id = player.id;

        /**
         * ### Player.sid
         *
         * The session id received from the nodeGame server
         *
         */
        this.sid = player.sid;


        /**
         * ### Player.count
         *
         * The ordinal position of the player in a PlayerList object
         *
         * @see PlayerList
         */
        this.count = player.count;

        /**
         * ### Player.admin
         *
         * The admin status of the client
         *
         */
        this.admin = !!player.admin;

        /**
         * ### Player.disconnected
         *
         * The connection status of the client
         *
         */
        this.disconnected = !!player.disconnected;

        // ## Player public properties

        /**
         * ### Player.ip
         *
         * The ip address of the player
         *
         * Note: this can change in mobile networks
         *
         */
        this.ip = player.ip;

        /**
         * ### Player.name
         *
         * An alphanumeric name associated with the player
         *
         */
        this.name = player.name;

        /**
         * ### Player.stage
         *
         * Reference to the game-stage the player currently is
         *
         * @see node.game.stage
         * @see GameStage
         */
        this.stage = player.stage || new GameStage();

        /**
         * ### Player.stageLevel
         *
         * The current stage level of the player in the game
         *
         * @see node.stageLevels
         */
        this.stageLevel = player.stageLevel || stageLevels.UNINITIALIZED;

        /**
         * ### Player.stateLevel
         *
         * The current state level of the player in the game
         *
         * @see node.stateLevels
         */
        this.stateLevel = player.stateLevel || stateLevels.UNINITIALIZED;


        /**
         * ## Extra properties
         *
         * Non-default properties are all added as private
         *
         * For security reasons, they cannot be of type function, and they
         * cannot overwrite any previously defined variable
         */
        for (key in player) {
            if (player.hasOwnProperty(key)) {
                if ('function' !== typeof player[key]) {
                    if (!this.hasOwnProperty(key)) {
                        this[key] = player[key];
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
 ,  'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # GameMsg
 *
 * Copyright(c) 2013 Stefano Balietti
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
     *  @see JSUS.clone
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
         *      @see GameStage
         */
        this.stage = gm.stage;

        /**
         * ### GameMsg.action
         *
         * The action of the message
         *
         *      @see node.action
         */
        this.action = gm.action;

        /**
         * ### GameMsg.target
         *
         * The target of the message
         *
         *      @see node.target
         */
        this.target = gm.target;

        /**
         * ### GameMsg.from
         *
         * The id of the sender of the message
         *
         *      @see Player.id
         */
        this.from = gm.from;

        /**
         * ### GameMsg.to
         *
         * The id of the receiver of the message
         *
         *      @see Player.id
         *      @see node.player.id
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
    }

    /**
     * ### GameMsg.stringify
     *
     * Calls JSON.stringify on the message
     *
     * @return {string} The stringified game-message
     *
     *  @see GameMsg.toString
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
     *  @see GameMsg.stringify
     */
    GameMsg.prototype.toString = function () {
        var SPT, TAB, DLM, line, UNKNOWN, tmp;
        SPT = ",\t";
        TAB = "\t";
        DLM = "\"";
        UNKNOWN = "\"unknown\"\t";
        line  = this.created + SPT;
        line += this.id + SPT;
        line += this.session + SPT;
        line += this.action + SPT;
        line += this.target ? this.target.length < 6  ? this.target + SPT + TAB : this.target + SPT : UNKNOWN;
        line += this.from ? this.from.length < 6  ? this.from + SPT + TAB : this.from + SPT : UKNOWN;
        line += this.to ? this.to.length < 6  ? this.to + SPT + TAB : this.to + SPT : UNKNOWN;
        if (!this.text) {
            line += "\"no text\"" + SPT;
        }
        else {
            tmp = this.text.toString();
            if (tmp.length > 9) { 
                line += DLM + tmp.substr(0,9) + "..." + DLM + SPT;
            }
            else if (tmp.length < 6) {
                line += DLM + tmp + DLM + SPT + TAB;
            }
            else {
                line += DLM + tmp + DLM + SPT;
            }
        }
        if (!this.data) {
            line += "\"no data\"" + SPT;
        }
        else {
            tmp = this.data.toString();
            if (tmp.length > 9) { 
                line += DLM + tmp.substr(0,9) + "..." + DLM + SPT;
            }
            else if (tmp.length < 6) {
                line += DLM + tmp + DLM + SPT + TAB;
            }
            else {
                line += DLM + tmp + DLM + SPT;
            }
        }
        line += new GameStage(this.stage) + SPT;
        line += this.reliable + SPT;
        line += this.priority;
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
     *  @see GameMsg.toEvent
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
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # Stager
 *
 * `nodeGame` container and builder of the game sequence
 *
 * ---
 */
(function(exports, parent) {

    // ## Global scope
    exports.Stager = Stager;

    var stepRules = parent.stepRules;

    /**
     * ## Stager constructor
     *
     * Creates a new instance of Stager
     *
     * @param {object} stateObj Optional. State to initialize the new Stager
     *  object with. See `Stager.setState`.
     *
     * @see Stager.setState
     */
    function Stager(stateObj) {
        if (stateObj) {
            this.setState(stateObj);
        }
        else {
            this.clear();
        }
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


        /**
         * ### Stager.defaultStepRule
         *
         * Default step-rule function
         *
         * This function decides whether it is possible to proceed to the next
         * step/stage. If a step/stage object defines a `steprule` property,
         * then that function is used instead.
         *
         * @see Stager.setDefaultStepRule
         * @see Stager.getDefaultStepRule
         * @see GamePlot.getStepRule
         */
        this.setDefaultStepRule();


        /**
         * ### Stager.defaultGlobals
         *
         * Defaults of global variables
         *
         * This map holds the default values of global variables. These values are
         * overridable by more specific version in step and stage objects.
         *
         * @see Stager.setDefaultGlobals
         * @see GamePlot.getGlobal
         */
        this.defaultGlobals = {};

        /**
         * ### Stager.defaultProperties
         *
         * Defaults of properties
         *
         * This map holds the default values of properties. These values are
         * overridable by more specific version in step and stage objects.
         *
         * @see Stager.setDefaultProperties
         * @see GamePlot.getProperty
         */
        this.defaultProperties = {};

        /**
         * ### Stager.onInit
         *
         * Initialization function
         *
         * This function is called as soon as the game is instantiated,
         * i.e. at stage 0.0.0.
         *
         * Event listeners defined here stay valid throughout the whole
         * game, unlike event listeners defined inside a function of the
         * gamePlot, which are valid only within the specific function.
         */
        this.onInit = null;

        /**
         * ### Stager.onGameover
         *
         * Cleaning up function
         *
         * This function is called after the last stage of the gamePlot
         * is terminated.
         */
        this.onGameover = null;

        return this;
    };

    /**
     * ### Stager.registerGeneralNext
     *
     * Sets general callback for next stage decision
     *
     * Available only when nodegame is executed in _flexible_ mode.
     * The callback given here is used to determine the next stage.
     *
     * @param {function|null} func The decider callback.  It should return the name of
     *  the next stage, 'NODEGAME_GAMEOVER' to end the game or FALSE for sequence end.
     *  NULL can be given to signify non-existence.
     *
     * @return {boolean} TRUE on success, FALSE on error
     */
    Stager.prototype.registerGeneralNext = function(func) {
        if (func !== null && 'function' !== typeof func) {
            this.log('Stager.registerGeneralNext: expecting a function as parameter.');
            return false;
        }

        this.generalNextFunction = func;
        return true;
    };

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
     *  the next stage, 'NODEGAME_GAMEOVER' to end the game or FALSE for sequence end.
     *
     * @return {boolean} TRUE on success, FALSE on error
     *
     * @see Stager.registerGeneralNext
     */
    Stager.prototype.registerNext = function(id, func) {
        if ('function' !== typeof func) {
            this.log('Stager.registerNext: expecting a function as parameter.');
            return false;
        }

        if (!this.stages[id]) {
            this.log('Stager.registerNext: received nonexistent stage id');
            return false;
        }

        this.nextFunctions[id] = func;
        return true;
    };

    /**
     * ### Stager.setDefaultStepRule
     *
     * Sets the default step-rule function
     *
     * @param {function} steprule Optional. The step-rule function.
     *   If not given, the initial default is restored.
     *
     * @see Stager.defaultStepRule
     *
     * @return {boolean} TRUE on success, FALSE on error
     */
    Stager.prototype.setDefaultStepRule = function(steprule) {
        if (steprule) {
            if ('function' !== typeof steprule) {
                throw new Error('Stager.setDefaultStepRule: expecting a function as parameter.');
            }

            this.defaultStepRule = steprule;
        }
        else {
            // Initial default:
            this.defaultStepRule = stepRules.SOLO;
        }

        return true;
    };

    /**
     * ### Stager.getDefaultStepRule
     *
     * Returns the default step-rule function
     *
     * @return {function} The default step-rule function
     */
    Stager.prototype.getDefaultStepRule = function() {
        return this.defaultStepRule;
    };

    /**
     * ### Stager.setDefaultGlobals
     *
     * Sets the default globals
     *
     * @param {object} defaultGlobals The map of default global variables
     *
     * @return {boolean} TRUE on success, FALSE on error
     *
     * @see Stager.defaultGlobals
     * @see GamePlot.getGlobal
     */
    Stager.prototype.setDefaultGlobals = function(defaultGlobals) {
        if (!defaultGlobals || 'object' !== typeof defaultGlobals) {
            this.log('Stager.setDefaultGlobals: expecting an object as parameter.');
            return false;
        }

        this.defaultGlobals = defaultGlobals;
        return true;
    };

    /**
     * ### Stager.getDefaultGlobals
     *
     * Returns the default globals
     *
     * @return {object} The map of default global variables
     *
     * @see Stager.defaultGlobals
     * @see GamePlot.getGlobal
     */
    Stager.prototype.getDefaultGlobals = function() {
        return this.defaultGlobals;
    };

    /**
     * ### Stager.setDefaultProperties
     *
     * Sets the default properties
     *
     * @param {object} defaultProperties The map of default properties
     *
     * @return {boolean} TRUE on success, FALSE on error
     *
     * @see Stager.defaultProperties
     * @see GamePlot.getProperty
     */
    Stager.prototype.setDefaultProperties = function(defaultProperties) {
        if (!defaultProperties || 'object' !== typeof defaultProperties) {
            throw new Error('Stager.setDefaultProperties: expecting an object as parameter.');
            return false;
        }

        this.defaultProperties = defaultProperties;
        return true;
    };

    /**
     * ### Stager.getDefaultProperties
     *
     * Returns the default properties
     *
     * @return {object} The map of default properties
     *
     * @see Stager.defaultProperties
     * @see GamePlot.getProperty
     */
    Stager.prototype.getDefaultProperties = function() {
        return this.defaultProperties;
    };

    /**
     * ### Stager.setOnInit
     *
     * Sets onInit function
     *
     * @param {function|null} func The onInit function.
     *  NULL can be given to signify non-existence.
     *
     * @return {boolean} TRUE on success, FALSE on error
     *
     * @see Stager.onInit
     */
    Stager.prototype.setOnInit = function(func) {
        if (func !== null && 'function' !== typeof func) {
            throw new Error('Stager.setOnInit: expecting a function as parameter.');
            return false;
        }

        this.onInit = func;
        return true;
    };

    /**
     * ### Stager.getOnInit
     *
     * Gets onInit function
     *
     * @return {function|null} The onInit function.
     *  NULL signifies non-existence.
     *
     * @see Stager.onInit
     */
    Stager.prototype.getOnInit = function(func) {
        return this.onInit;
    };

    /**
     * ### Stager.setOnGameover
     *
     * Sets onGameover function
     *
     * @param {function|null} func The onGameover function.
     *  NULL can be given to signify non-existence.
     *
     * @return {boolean} TRUE on success, FALSE on error
     *
     * @see Stager.onGameover
     */
    Stager.prototype.setOnGameover = function(func) {
        if (func !== null && 'function' !== typeof func) {
            throw new Error('Stager.setOnGameover: expecting a function as parameter.');
            return false;
        }

        this.onGameover = func;
        return true;
    };

    /**
     * ### Stager.setOnGameOver
     *
     * Alias for `setOnGameover`
     *
     * A rescue net in case of human error.
     *
     * @see Stager.setOnGameover
     */
    Stager.prototype.setOnGameOver = Stager.prototype.setOnGameover;

    /**
     * ### Stager.getOnGameover
     *
     * Gets onGameover function
     *
     * @return {function|null} The onGameover function.
     *  NULL signifies non-existence.
     *
     * @see Stager.onGameover
     */
    Stager.prototype.getOnGameover = function(func) {
        return this.onGameover;
    };

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
     *
     * @return {boolean} TRUE on success, FALSE on error
     */
    Stager.prototype.addStep = function(step) {
        if (!this.checkStepValidity(step)) {
            throw new Error('Stager.addStep: invalid step received.');
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
     * @return {boolean} TRUE on success, FALSE on error
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
            throw new Error('Stager.addStage: invalid stage received.');
            return false;
        }

        this.stages[stage.id] = stage;
        return true;
    };

    /**
     * ### Stager.init
     *
     * Resets sequence
     *
     * @return {Stager} this object
     */
    Stager.prototype.init = function() {
        this.sequence = [];

        return this;
    };

    /**
     * ### Stager.gameover
     *
     * Adds gameover block to sequence
     *
     * @return {Stager} this object
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
     * @return {Stager|null} this object on success, NULL on error
     *
     * @see Stager.addStage
     */
    Stager.prototype.next = function(id) {
        var stageName = this.handleAlias(id);

        if (stageName === null) {
            throw new Error('Stager.next: invalid stage name received.');
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
     * @return {Stager|null} this object on success, NULL on error
     *
     * @see Stager.addStage
     * @see Stager.next
     */
    Stager.prototype.repeat = function(id, nRepeats) {
        var stageName = this.handleAlias(id);

        if (stageName === null) {
            throw new Error('Stager.repeat: received invalid stage name.');
            return null;
        }

        if ('number' !== typeof nRepeats) {
            throw new Error('Stager.repeat: received invalid number of repetitions.');
            return null;
        }

        this.sequence.push({
            type: 'repeat',
            id: stageName,
            num: nRepeats
        });

        return this;
    };


    function addLoop(type, id, func) {
        var stageName = this.handleAlias(id);

        if (stageName === null) {
            throw new Error('Stager.' + type + ': received invalid stage name.');
            return null;
        }

        if ('undefined' === typeof func) {
            func = function() { return true; };
        }

        if ('function' !== typeof func) {
            throw new Error('Stager.' + type + ': received invalid callback.');
            return null;
        }

        this.sequence.push({
            type: type,
            id: stageName,
            cb: func
        });

        return this;
    };


    /**
     * ### Stager.loop
     *
     * Adds looped stage block to sequence
     *
     * The given stage will be repeated as long as the `func` callback returns TRUE.
     * If it returns FALSE on the first time, the stage is never executed.
     *
     * If no callback function is specified the loop is repeated indefinetely.
     *
     * @param {string} id A valid stage name with optional alias
     * @param {function} func Optional. Callback returning TRUE for repetition. Defaults,
     *   a function that returns always TRUE.
     *
     * @return {Stager|null} this object on success, NULL on error
     *
     * @see Stager.addStage
     * @see Stager.next
     * @see Stager.doLoop
     */
    Stager.prototype.loop = function(id, func) {
        return addLoop.call(this, 'loop', id, func);
    };

    /**
     * ### Stager.doLoop
     *
     * Adds alternatively looped stage block to sequence
     *
     * The given stage will be repeated once plus as many times as the `func`
     * callback returns TRUE.
     *
     * @param {string} id A valid stage name with optional alias
     * @param {function} func Optional. Callback returning TRUE for repetition. Defaults,
     *   a function that returns always TRUE.
     *
     * @return {Stager|null} this object on success, NULL on error
     *
     * @see Stager.addStage
     * @see Stager.next
     * @see Stager.loop
     */
    Stager.prototype.doLoop = function(id, func) {
        return addLoop.call(this, 'doLoop', id, func);
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
     * @return {array|object|null} The stage sequence in requested format. NULL on error.
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
                if (this.sequence.hasOwnProperty(seqIdx)) {
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
                        throw new Error('Stager.getSequence: unknown sequence object type.');
                        return null;
                    }
                }
            }
            break;

        case 'hsteps':
            result = [];

            for (seqIdx in this.sequence) {
                if (this.sequence.hasOwnProperty(seqIdx)) {
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
                        throw new Error('Stager.getSequence: unknown sequence object type.');
                        return null;
                    }
                }
            }
            break;

        case 'o':
            result = this.sequence;
            break;

        default:
            throw new Error('Stager.getSequence: invalid format.');
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
     * @return {array|null} The steps in the stage. NULL on invalid stage.
     */
    Stager.prototype.getStepsFromStage = function(id) {
        if (!this.stages[id]) return null;
        return this.stages[id].steps;
    };

    /**
     * ### Stager.setState
     *
     * Sets the internal state of the Stager
     *
     * The passed state object can have the following fields:
     * steps, stages, sequence, generalNextFunction, nextFunctions, defaultStepRule,
     * defaultGlobals, defaultProperties, onInit, onGameover.
     * All fields are optional.
     *
     * This function calls the corresponding functions to set these fields, and
     * performs error checking.
     *
     * If updateRule is 'replace', the Stager is cleared before applying the state.
     *
     * @param {object} stateObj The Stager's state
     * @param {string} updateRule Optional. Whether to 'replace' (default) or
     *  to 'append'.
     *
     * @see Stager.getState
     */
    Stager.prototype.setState = function(stateObj, updateRule) {
        var idx;
        var stageObj;
        var seqObj;

        // Clear previous state:
        if (!updateRule || updateRule === 'replace') {
            this.clear();
        }
        else if(updateRule !== 'append') {
            throw new Error('Stager.setState: invalid updateRule.');
        }

        if (!stateObj) {
            throw new Error('Stager.setState: invalid stateObj.');
        }

        // Add steps:
        for (idx in stateObj.steps) {
            if (stateObj.steps.hasOwnProperty(idx)) {
                if (!this.addStep(stateObj.steps[idx])) {
                    throw new Error('Stager.setState: invalid steps.');
                }
            }
        }

        // Add stages:
        // first, handle all non-aliases (key of `stages` entry is same as `id` field of its value)
        for (idx in stateObj.stages) {
            stageObj = stateObj.stages[idx];
            if (stateObj.stages.hasOwnProperty(idx) && stageObj.id === idx) {
                if (!this.addStage(stageObj)) {
                    throw new Error('Stager.setState: invalid stages.');
                }
            }
        }
        // second, handle all aliases (key of `stages` entry is different from `id` field of its value)
        for (idx in stateObj.stages) {
            stageObj = stateObj.stages[idx];
            if (stateObj.stages.hasOwnProperty(idx) && stageObj.id !== idx) {
                this.stages[idx] = this.stages[stageObj.id];
            }
        }

        // Add sequence blocks:
        if (stateObj.hasOwnProperty('sequence')) {
            for (idx = 0; idx < stateObj.sequence.length; idx++) {
                seqObj = stateObj.sequence[idx];

                switch (seqObj.type) {
                case 'gameover':
                    this.gameover();
                    break;

                case 'plain':
                    if (!this.next(seqObj.id)) {
                        throw new Error('Stager.setState: invalid sequence.');
                    }
                    break;

                case 'repeat':
                    if (!this.repeat(seqObj.id, seqObj.num)) {
                        throw new Error('Stager.setState: invalid sequence.');
                    }
                    break;

                case 'loop':
                    if (!this.loop(seqObj.id, seqObj.cb)) {
                        throw new Error('Stager.setState: invalid sequence.');
                    }
                    break;

                case 'doLoop':
                    if (!this.doLoop(seqObj.id, seqObj.cb)) {
                        throw new Error('Stager.setState: invalid sequence.');
                    }
                    break;

                default:
                    // Unknown type:
                    throw new Error('Stager.setState: invalid sequence.');
                }
            }
        }

        // Set general next-decider:
        if (stateObj.hasOwnProperty('generalNextFunction')) {
            if (!this.registerGeneralNext(stateObj.generalNextFunction)) {
                throw new Error('Stager.setState: invalid general next-decider.');
            }
        }

        // Set specific next-deciders:
        for (idx in stateObj.nextFunctions) {
            if (stateObj.nextFunctions.hasOwnProperty(idx)) {
                if (!this.registerNext(idx, stateObj.nextFunctions[idx])) {
                    throw new Error('Stager.setState: invalid specific next-deciders.');
                }
            }
        }

        // Set default step-rule:
        if (stateObj.hasOwnProperty('defaultStepRule')) {
            if (!this.setDefaultStepRule(stateObj.defaultStepRule)) {
                throw new Error('Stager.setState: invalid default step-rule.');
            }
        }

        // Set default globals:
        if (stateObj.hasOwnProperty('defaultGlobals')) {
            if (!this.setDefaultGlobals(stateObj.defaultGlobals)) {
                throw new Error('Stager.setState: invalid default globals.');
            }
        }

        // Set default properties:
        if (stateObj.hasOwnProperty('defaultProperties')) {
            if (!this.setDefaultProperties(stateObj.defaultProperties)) {
                throw new Error('Stager.setState: invalid default properties.');
            }
        }

        // Set onInit:
        if (stateObj.hasOwnProperty('onInit')) {
            if (!this.setOnInit(stateObj.onInit)) {
                throw new Error('Stager.setState: invalid onInit.');
            }
        }

        // Set onGameover:
        if (stateObj.hasOwnProperty('onGameover')) {
            if (!this.setOnGameover(stateObj.onGameover)) {
                throw new Error('Stager.setState: invalid onGameover.');
            }
        }
    };

    /**
     * ### Stager.getState
     *
     * Returns the internal state of the Stager
     *
     * Fields of returned object:
     * steps, stages, sequence, generalNextFunction, nextFunctions, defaultStepRule,
     * defaultGlobals, defaultProperties, onInit, onGameover.
     *
     * @return {object} The Stager's state
     *
     * @see Stager.setState
     */
    Stager.prototype.getState = function() {
        return {
            steps:               this.steps,
            stages:              this.stages,
            sequence:            this.sequence,
            generalNextFunction: this.generalNextFunction,
            nextFunctions:       this.nextFunctions,
            defaultStepRule:     this.defaultStepRule,
            defaultGlobals:      this.defaultGlobals,
            defaultProperties:   this.defaultProperties,
            onInit:              this.onInit,
            onGameover:          this.onGameover
        };
    };

    /**
     * ### Stager.extractStage
     *
     * Returns a minimal state package containing one or more stages
     *
     * The returned package consists of a `setState`-compatible object with the
     * `steps` and `stages` properties set to include the given stages.
     * The `sequence` is optionally set to a single `next` block for the stage.
     *
     * @param {string|array} id Valid stage name(s)
     * @param {boolean} useSeq Optional. Whether to generate a singleton sequence.
     *  TRUE by default.
     *
     * @return {object|null} The state object on success, NULL on error
     *
     * @see Stager.setState
     */
    Stager.prototype.extractStage = function(ids, useSeq) {
        var result = {
            steps: {}, stages: {}, sequence: []
        };
        var stepIdx, stepId;
        var stageId;
        var stageObj;
        var idArray, idIdx;

        if (ids instanceof Array) {
            idArray = ids;
        }
        else if ('string' === typeof ids) {
            idArray = [ ids ];
        }
        else return null;

        useSeq = (useSeq === false) ? false : true;  // undefined (default) -> true

        for (idIdx in idArray) {
            if (idArray.hasOwnProperty(idIdx)) {
                id = idArray[idIdx];

                stageObj = this.stages[id];

                if (!stageObj) return null;

                // Add step objects:
                for (stepIdx in stageObj.steps) {
                    if (stageObj.steps.hasOwnProperty(stepIdx)) {
                        stepId = stageObj.steps[stepIdx];
                        result.steps[stepId] = this.steps[stepId];
                    }
                }

                // Add stage object:
                stageId = stageObj.id;
                result.stages[stageId] = stageObj;

                // If given id is alias, also add alias:
                if (stageId !== id) result.stages[id] = stageObj;

                // Add mini-sequence:
                if (useSeq) {
                    result.sequence.push({
                        type: 'plain',
                        id: stageId
                    });
                }
            }
        }

        return result;
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
     * @return {bool} TRUE for valid step objects, FALSE otherwise
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
     * @return {bool} TRUE for valid stage objects, FALSE otherwise
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
            if (stage.steps.hasOwnProperty(i)) {
                if (!this.steps[stage.steps[i]]) return false;
            }
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
     * @return {string|null} NULL on error,
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
            throw new Error('Stager.handleAlias: received nonexistent stage id.');
            return null;
        }

        // Check uniqueness:
        for (seqIdx in this.sequence) {
            if (this.sequence.hasOwnProperty(seqIdx) &&
                this.sequence[seqIdx].id === stageName) {
                throw new Error('Stager.handleAlias: received non-unique stage name.');
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
 * # GamePlot
 *
 * `nodeGame` container of game-state functions
 *
 * ---
 */
(function(exports, parent) {

    // ## Global scope
    exports.GamePlot = GamePlot;

    var Stager = parent.Stager;
    var GameStage = parent.GameStage;
    var J = parent.JSUS;

    var NodeGameMisconfiguredGameError = parent.NodeGameMisconfiguredGameError,
    NodeGameRuntimeError = parent.NodeGameRuntimeError;
    // ## Constants
    GamePlot.GAMEOVER = 'NODEGAME_GAMEOVER';
    GamePlot.END_SEQ  = 'NODEGAME_END_SEQ';
    GamePlot.NO_SEQ   = 'NODEGAME_NO_SEQ';

    /**
     * ## GamePlot constructor
     *
     * Creates a new instance of GamePlot
     *
     * Takes a sequence object created with Stager.
     *
     * If the Stager parameter has an empty sequence, flexibile mode is assumed
     * (used by e.g. GamePlot.next).
     *
     * @param {Stager} stager Optional. The Stager object.
     *
     * @see Stager
     */
    function GamePlot(stager) {
        this.init(stager);
        this.log = console.log;
    }

    // ## GamePlot methods

    /**
     * ### GamePlot.init
     *
     * Initializes the GamePlot with a stager
     *
     * @param {Stager} stager Optional. The Stager object.
     *
     * @see Stager
     */
    GamePlot.prototype.init = function(stager) {
        if (stager) {
            if ('object' !== typeof stager) {
                throw new NodeGameMisconfiguredGameError(
                    'GamePlot.init: called with invalid stager');
            }
            this.stager = stager;
        }
        else {
            this.stager = null;
        }
    };
    
    /**
     * ### GamePlot.next
     *
     * Returns the next stage in the stager
     *
     * If the step in `curStage` is an integer and out of bounds, that bound is assumed.
     *
     * @param {GameStage} curStage Optional. The GameStage object from which to get
     *  the next one. Defaults to returning the first stage.
     *
     * @return {GameStage|string} The GameStage describing the next stage
     *
     * @see GameStage
     */
    GamePlot.prototype.next = function(curStage) {
        // GamePlot was not correctly initialized
        if (!this.stager) return GamePlot.NO_SEQ;

        // Find out flexibility mode:
        var flexibleMode = this.stager.sequence.length === 0;

        var seqIdx, seqObj = null, stageObj;
        var stageNo, stepNo;
        var normStage = null;
        var nextStage = null;

        curStage = new GameStage(curStage);

        if (flexibleMode) {
            if (curStage.stage === 0) {
                // Get first stage:
                if (this.stager.generalNextFunction) {
                    nextStage = this.stager.generalNextFunction();
                }

                if (nextStage) {
                    return new GameStage({
                        stage: nextStage,
                        step:  1,
                        round: 1
                    });
                }

                return GamePlot.END_SEQ;
            }

            // Get stage object:
            stageObj = this.stager.stages[curStage.stage];

            if ('undefined' === typeof stageObj) {
                throw new NodeGameRunTimeError('GamePlot.next: received nonexistent stage: ' + curStage.stage);
            }

            // Find step number:
            if ('number' === typeof curStage.step) {
                stepNo = curStage.step;
            }
            else {
                stepNo = stageObj.steps.indexOf(curStage.step) + 1;
            }
            if (stepNo < 1) {
                throw new NodeGameRunTimeError('GamePlot.next: received nonexistent step: ' +
                          stageObj.id + '.' + curStage.step);
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
            if (this.stager.nextFunctions[stageObj.id]) {
                nextStage = this.stager.nextFunctions[stageObj.id]();
            }
            else if (this.stager.generalNextFunction) {
                nextStage = this.stager.generalNextFunction();
            }

            // If next-deciding function returns GamePlot.GAMEOVER,
            // consider it game over.
            if (nextStage === GamePlot.GAMEOVER)  {
                return GamePlot.GAMEOVER;
            }
            else if (nextStage) {
                return new GameStage({
                    stage: nextStage,
                    step:  1,
                    round: 1
                });
            }

            return GamePlot.END_SEQ;
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
                throw new ('next received invalid stage: ' + curStage);
                return null;
            }
            stageNo  = normStage.stage;
            stepNo   = normStage.step;
            seqObj   = this.stager.sequence[stageNo - 1];
            if (seqObj.type === 'gameover') return GamePlot.GAMEOVER;
            stageObj = this.stager.stages[seqObj.id];

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
            if (stageNo < this.stager.sequence.length) {
                // Skip over loops if their callbacks return false:
                while (this.stager.sequence[stageNo].type === 'loop' &&
                       !this.stager.sequence[stageNo].cb()) {
                    stageNo++;
                    if (stageNo >= this.stager.sequence.length) return GamePlot.END_SEQ;
                }

                // Handle gameover:
                if (this.stager.sequence[stageNo].type === 'gameover') {
                    return GamePlot.GAMEOVER;
                }

                return new GameStage({
                    stage: stageNo + 1,
                    step:  1,
                    round: 1
                });
            }

            // No more stages remaining:
            return GamePlot.END_SEQ;
        }
    };

    /**
     * ### GamePlot.previous
     *
     * Returns the previous stage in the stager
     *
     * Works only in simple mode.
     * Behaves on loops the same as `GamePlot.next`, with round=1 always.
     *
     * @param {GameStage} curStage The GameStage object from which to get the previous one
     *
     * @return {GameStage} The GameStage describing the previous stage
     *
     * @see GameStage
     */
    GamePlot.prototype.previous = function(curStage) {
        // GamePlot was not correctly initialized
        if (!this.stager) return GamePlot.NO_SEQ;

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
        seqObj   = this.stager.sequence[stageNo - 1];

        // Handle stepping:
        if (stepNo > 1) {
            return new GameStage({
                stage: stageNo,
                step:  stepNo - 1,
                round: curStage.round
            });
        }

        if ('undefined' !== typeof seqObj.id) {
            stageObj = this.stager.stages[seqObj.id];
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
        while (this.stager.sequence[stageNo - 2].type === 'loop' &&
               !this.stager.sequence[stageNo - 2].cb()) {
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
        prevSeqObj = this.stager.sequence[stageNo - 2];

        // Get number of steps in previous stage:
        prevStepNo = this.stager.stages[prevSeqObj.id].steps.length;

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
     * ### GamePlot.jump
     *
     * Returns a distant stage in the stager
     *
     * Works with negative delta only in simple mode.
     * Uses `GamePlot.previous` and `GamePlot.next` for stepping.
     * If a sequence end is reached, returns immediately.
     *
     * @param {GameStage} curStage The GameStage object from which to get the offset one
     * @param {number} delta The offset. Negative number for backward stepping.
     *
     * @return {GameStage|string} The GameStage describing the distant stage
     *
     * @see GameStage
     * @see GamePlot.previous
     * @see GamePlot.next
     */
    GamePlot.prototype.jump = function(curStage, delta) {
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
     * ### GamePlot.stepsToNextStage
     *
     * Returns the number of steps until the beginning of the next stage
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     *
     * @return {number|null} The number of steps to go, minimum 1. NULL on error.
     */
    GamePlot.prototype.stepsToNextStage = function(gameStage) {
        var stageObj, stepNo;

        gameStage = new GameStage(gameStage);
        if (gameStage.stage === 0) return 1;
        stageObj = this.getStage(gameStage);
        if (!stageObj) return null;

        if ('number' === typeof gameStage.step) {
            stepNo = gameStage.step;
        }
        else {
            stepNo = stageObj.steps.indexOf(gameStage.step) + 1;
            // If indexOf returned -1, stepNo is 0 which will be caught below.
        }

        if (stepNo < 1 || stepNo > stageObj.steps.length) return null;

        return 1 + stageObj.steps.length - stepNo;
    };

    /**
     * ### GamePlot.stepsToPreviousStage
     *
     * Returns the number of steps back until the end of the previous stage
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     *
     * @return {number|null} The number of steps to go, minimum 1. NULL on error.
     */
    GamePlot.prototype.stepsToPreviousStage = function(gameStage) {
        var stageObj, stepNo;

        gameStage = new GameStage(gameStage);
        stageObj = this.getStage(gameStage);
        if (!stageObj) return null;

        if ('number' === typeof gameStage.step) {
            stepNo = gameStage.step;
        }
        else {
            stepNo = stageObj.steps.indexOf(gameStage.step) + 1;
            // If indexOf returned -1, stepNo is 0 which will be caught below.
        }

        if (stepNo < 1 || stepNo > stageObj.steps.length) return null;

        return stepNo;
    };

    /**
     * ### GamePlot.getStage
     *
     * Returns the stage object corresponding to a GameStage
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     *
     * @return {object|null} The corresponding stage object, or NULL
     *  if the step was not found
     */
    GamePlot.prototype.getStage = function(gameStage) {
        var stageObj;

        if (!this.stager) return null;
        gameStage = new GameStage(gameStage);
        if ('number' === typeof gameStage.stage) {
            stageObj = this.stager.sequence[gameStage.stage - 1];
            return stageObj ? this.stager.stages[stageObj.id] : null;
        }
        else {
            return this.stager.stages[gameStage.stage] || null;
        }
    };

    /**
     * ### GamePlot.getStep
     *
     * Returns the step object corresponding to a GameStage
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     *
     * @return {object|null} The corresponding step object, or NULL
     *  if the step was not found
     */
    GamePlot.prototype.getStep = function(gameStage) {
        var stageObj;

        if (!this.stager) return null;
        gameStage = new GameStage(gameStage);
        if ('number' === typeof gameStage.step) {
            stageObj = this.getStage(gameStage);
            return stageObj ? this.stager.steps[stageObj.steps[gameStage.step - 1]] : null;
        }
        else {
            return this.stager.steps[gameStage.step] || null;
        }
    };

    /**
     * ### GamePlot.getStepRule
     *
     * Returns the step-rule function corresponding to a GameStage
     *
     * If gameStage.stage = 0, it returns a function that always returns TRUE.
     *
     * Otherwise, the order of lookup is:
     *
     * 1. `steprule` property of the step object
     *
     * 2. `steprule` property of the stage object
     *
     * 3. default step-rule of the Stager object
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     *
     * @return {function|null} The step-rule function. NULL on error.
     */
    GamePlot.prototype.getStepRule = function(gameStage) {
        var stageObj, stepObj, rule;

        gameStage = new GameStage(gameStage);

        if (gameStage.stage === 0) {
            return function() { return false; };
        }
        
        stageObj = this.getStage(gameStage);
        stepObj  = this.getStep(gameStage);

        if (!stageObj || !stepObj) {
            // TODO is this an error?
            return null;
        }
        
        // return a step-defined rule
        if ('string' === typeof stepObj.steprule) {
            rule =  node.stepRules.get(stepObj.steprule);        
        }
        else if ('function' === typeof stepObj.steprule) {
            rule = stepObj.steprule;
        }    
        if ('function' === typeof rule) return rule;

        // return a stage-defined rule
        if ('string' === typeof stageObj.steprule) {
            rule =  node.stepRules.get(stageObj.steprule);        
        }
        else if ('function' === typeof stageObj.steprule) {
            rule = stageObj.steprule;
        }    
        if ('function' === typeof rule) return rule;

        // Default rule
        // TODO: Use first line once possible (serialization issue):
        //return this.stager.getDefaultStepRule();
        return this.stager.defaultStepRule;
    };

    /**
     * ### GamePlot.getGlobal
     *
     * Looks up the value of a global variable
     *
     * Looks for definitions of a global variable in
     *
     * 1. the globals property of the step object of the given gameStage,
     *
     * 2. the globals property of the stage object of the given gameStage,
     *
     * 3. the defaults, defined in the Stager.
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     * @param {string} globalVar The name of the global variable
     *
     * @return {mixed|null} The value of the global variable if found,
     *   NULL otherwise.
     */
    GamePlot.prototype.getGlobal = function(gameStage, globalVar) {
        var stepObj, stageObj;
        var stepGlobals, stageGlobals, defaultGlobals;
        
        gameStage = new GameStage(gameStage);

        // Look in current step:
        stepObj = this.getStep(gameStage);
        if (stepObj) {
            stepGlobals = stepObj.globals;
            if (stepGlobals && stepGlobals.hasOwnProperty(globalVar)) {
                return stepGlobals[globalVar];
            }
        }

        // Look in current stage:
        stageObj = this.getStage(gameStage);
        if (stageObj) {
            stageGlobals = stageObj.globals;
            if (stageGlobals && stageGlobals.hasOwnProperty(globalVar)) {
                return stageGlobals[globalVar];
            }
        }

        // Look in Stager's defaults:
        if (this.stager) {
            defaultGlobals = this.stager.getDefaultGlobals();
            if (defaultGlobals && defaultGlobals.hasOwnProperty(globalVar)) {
                return defaultGlobals[globalVar];
            }
        }

        // Not found:
        return null;
    };

    /**
     * ### GamePlot.getProperty
     *
     * Looks up the value of a property
     *
     * Looks for definitions of a property in
     *
     * 1. the step object of the given gameStage,
     *
     * 2. the stage object of the given gameStage,
     *
     * 3. the defaults, defined in the Stager.
     *
     * @param {GameStage|string} gameStage The GameStage object,
     *  or its string representation
     * @param {string} property The name of the property
     *
     * @return {mixed|null} The value of the property if found, NULL otherwise.
     */
    GamePlot.prototype.getProperty = function(gameStage, property) {
        var stepObj, stageObj;
        var defaultProps;

        gameStage = new GameStage(gameStage);

        // Look in current step:
        stepObj = this.getStep(gameStage);
        if (stepObj && stepObj.hasOwnProperty(property)) {
            return stepObj[property];
        }

        // Look in current stage:
        stageObj = this.getStage(gameStage);
        if (stageObj && stageObj.hasOwnProperty(property)) {
            return stageObj[property];
        }

        // Look in Stager's defaults:
        if (this.stager) {
            defaultProps = this.stager.getDefaultProperties();
            if (defaultProps && defaultProps.hasOwnProperty(property)) {
                return defaultProps[property];
            }
        }

        // Not found:
        return null;
    };


    /**
     * ### GamePlot.isReady
     *
     * Returns whether the stager has any content
     *
     * @return {boolean} FALSE if stager is empty, TRUE otherwise
     */
    GamePlot.prototype.isReady = function() {
        return this.stager &&
            (this.stager.sequence.length > 0 ||
             this.stager.generalNextFunction !== null ||
             !J.isEmpty(this.stager.nextFunctions));
    };

    /**
     * ### GamePlot.getName
     *
     * TODO: To remove once transition is complete
     * @deprecated
     */
    GamePlot.prototype.getName = function(gameStage) {
        var s = this.getStep(gameStage);
        return s ? s.name : s;
    };

    /**
     * ### GamePlot.getAllParams
     *
     * TODO: To remove once transition is complete
     * @deprecated
     */
    GamePlot.prototype.getAllParams = GamePlot.prototype.getStep;

    /**
     * ### GamePlot.normalizeGameStage
     *
     * Converts the GameStage fields to numbers
     *
     * Works only in simple mode.
     *
     * @param {GameStage} gameStage The GameStage object
     *
     * @return {GameStage|null} The normalized GameStage object; NULL on error
     *
     * @api private
     */
    GamePlot.prototype.normalizeGameStage = function(gameStage) {
        var stageNo, stepNo, seqIdx, seqObj;

        if (!gameStage || 'object' !== typeof gameStage) return null;

        // Find stage number:
        if ('number' === typeof gameStage.stage) {
            stageNo = gameStage.stage;
        }
        else {
            for (seqIdx = 0; seqIdx < this.stager.sequence.length; seqIdx++) {
                if (this.stager.sequence[seqIdx].id === gameStage.stage) {
                    break;
                }
            }
            stageNo = seqIdx + 1;
        }
        if (stageNo < 1 || stageNo > this.stager.sequence.length) {
            node.warn('normalizeGameStage received nonexistent stage: ' + gameStage.stage);
            return null;
        }

        // Get sequence object:
        seqObj = this.stager.sequence[stageNo - 1];
        if (!seqObj) return null;

        if (seqObj.type === 'gameover') {
            return new GameStage({
                stage: stageNo,
                step:  1,
                round: gameStage.round
            });
        }

        // Get stage object:
        stageObj = this.stager.stages[seqObj.id];
        if (!stageObj) return null;

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

        // Check round property:
        if ('number' !== typeof gameStage.round) return null;

        return new GameStage({
            stage: stageNo,
            step:  stepNo,
            round: gameStage.round
        });
    };

    // ## Closure
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
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
 *      @see GameMSg
 *      @see node.target
 *      @see node.action
 *
 * ---
 *
 */
(function (exports, parent) {

    // ## Global scope
    
    exports.GameMsgGenerator = GameMsgGenerator;

    var GameMsg = parent.GameMsg,
    GameStage = parent.GameStage,
    constants = parent.constants;

    /**
     * ## GameMsgGenerator constructor
     *
     * Creates an instance of GameMSgGenerator
     *
     */
    function GameMsgGenerator (node) {
        this.node = node;
    }

    // ## General methods

    /**
     * ### GameMsgGenerator.create
     *
     * Primitive for creating a new GameMsg object
     *
     * Decorates an input object with all the missing properties
     * of a full GameMsg object
     *
     * @param {object} Optional. The init object
     * @return {GameMsg} The full GameMsg object
     *
     * @see GameMsg
     */
    GameMsgGenerator.prototype.create = function (msg) {
        var gameStage, node;
        node = this.node;

        if (msg.stage) {
            gameStage = msg.stage;
        }
        else {
            gameStage = node.game ? node.game.getCurrentGameStage() : new GameStage('0.0.0');
        }

        return new GameMsg({
            session: 'undefined' !== typeof msg.session ? msg.session : node.socket.session,
            stage: gameStage,
            action: msg.action || constants.action.SAY,
            target: msg.target || constants.target.DATA,
            from: node.player ? node.player.id : node.UNDEFINED_PLAYER, // TODO change to id
            to: 'undefined' !== typeof msg.to ? msg.to : 'SERVER',
            text: msg.text || null,
            data: msg.data || null,
            priority: msg.priority || null,
            reliable: msg.reliable || 1
        });

    };

    // ## Closure
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
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
 *  - connect: establish a communication channel with a ServerNode instance
 *  - send: pushes messages into the communication channel
 *
 * ---
 *
 */


(function(exports) {

    // Storage for socket types
    var types = {};

    function checkContract( proto ) {
        var test;
        test = new proto();
        if (!test.send) return false;
        if (!test.connect) return false;

        return true;
    }

    function getTypes() {
        return types;
    }

    function get( node, type, options ) {
        var Socket = types[type];
        return (Socket) ? new Socket(node, options) : null;
    }

    function register( type, proto ) {
        if (!type || !proto) return;

        // only register classes that fulfill the contract
        if ( checkContract(proto) ) {
            types[type] = proto;
        }
        else {
            throw new Error('Cannot register invalid Socket class: ' + type);
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

(function (exports, parent) {


    exports.Socket = Socket;

    // ## Global scope

    var GameMsg = parent.GameMsg,
    SocketFactory = parent.SocketFactory,
    J = parent.JSUS;

    var action = parent.action;
    
    function Socket(node, options) {

        // ## Private properties

        /**
         * ### Socket.buffer
         *
         * Buffer of queued messages
         *
         * @api private
         */
        this.buffer = [];


        /**
         * ### Socket.session
         *
         * The session id shared with the server
         *
         * This property is initialized only when a game starts
         *
         */
        this.session = null;


        /**
         * ### Socket.user_options
         *
         * Contains the options that will be passed to the `connect` method
         *
         * The property is set by `node.setup.socket`
         *
         * @see node.setup
         */
        this.user_options = {};

        this.socket = null;

        this.url = null;

        this.node = node;
    }


    Socket.prototype.setup = function(options) {
        var type;
        options = options ? J.clone(options) : {};
        type = options.type;
        delete options.type;
        this.user_options = options;
        if (type) {
            this.setSocketType(type, options);
        }
    };

    Socket.prototype.setSocketType = function(type, options) {
        this.socket = SocketFactory.get(this.node, type, options); // returns null on error
        return this.socket;
    };

    Socket.prototype.connect = function(uri, options) {
        var humanReadableUri = uri || 'local server';
        if (!this.socket) {
            this.node.err('Socket.connet: cannot connet to ' + humanReadableUri + ' . No open socket.');
            return false;
        }

        this.url = uri;
        this.node.log('connecting to ' + humanReadableUri + '.');

        this.socket.connect(uri, 'undefined' !== typeof options ? options : this.user_options);
    };

    Socket.prototype.onDisconnect = function() {
        // Save the current stage of the game
        this.node.session.store();
        this.node.log('closed');

    };

    Socket.prototype.onMessage = function(msg) {
        msg = this.secureParse(msg);
        if (!msg) return;

        var sessionObj;

        // Parsing successful
        if (msg.target === 'HI') {

            // replace itself: will change onMessage
            this.attachMsgListeners();
            
            // This will emit on PLAYER_CREATED
            // If listening on PLAYER_CREATED, functions can be
            // executed before the HI 
            this.startSession(msg);

            sessionObj = this.node.store(msg.session);

            // TODO: recover this branch
            if (false) {
                //if (sessionObj) {
                this.node.session.restore(sessionObj);

                msg = this.node.msg.create({
                    target: 'HI_AGAIN',
                    data: this.node.player
                });

                this.send(msg);

            }
            else {
                this.node.store(msg.session, this.node.session.save());

                // NEW: not necessary with modifications to GameServer
                // send HI to ALL
//                this.send(this.node.msg.create({
//                    target: 'HI',
//                    to: 'ALL',
//                    data: this.node.player
//                }));

            }

        }
    };

    Socket.prototype.attachMsgListeners = function() {
        this.onMessage = this.onMessageFull;
        this.node.emit('NODEGAME_READY');
    };

    Socket.prototype.onMessageFull = function(msg) {
        msg = this.secureParse(msg);
        if (msg) { // Parsing successful
            // message with high priority are executed immediately
            if (msg.priority > 0 || this.node.game.isReady && this.node.game.isReady()) {
                this.node.emit(msg.toInEvent(), msg);
            }
            else {
                this.node.silly('B: ' + msg);
                this.buffer.push(msg);
            }
        }
    };


    Socket.prototype.registerServer = function(msg) {
        // Setting global info
        this.servername = msg.from;
        // Keep serverid = msg.from for now
        this.serverid = msg.from;
    };


    Socket.prototype.secureParse = function (msg) {
        var gameMsg;
        try {
            gameMsg = GameMsg.clone(JSON.parse(msg));
            this.node.info('R: ' + gameMsg);
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
     * ### Socket.shouldClearBuffer
     *
     * Clears buffer conditionally
     *
     * @see this.node.emit
     */
    Socket.prototype.shouldClearBuffer = function () {
        if (this.node.game.isReady && this.node.game.isReady()) {
            this.clearBuffer();
        }
    };

    /**
     * ### Socket.clearBuffer
     *
     * Emits and removes all the events in the message buffer
     *
     * @see node.emit
     */
    Socket.prototype.clearBuffer = function () {
        var nelem, msg, i;
        nelem = this.buffer.length;
        for (i = 0; i < nelem; i++) {
            msg = this.buffer.shift();
            if (msg) {
                this.node.emit(msg.toInEvent(), msg);
                this.node.silly('D: ' + msg);
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
     * @see node.createPlayer
     */
    Socket.prototype.startSession = function (msg) {
        // Store server info
        this.registerServer(msg);

        this.node.createPlayer(msg.data);
        this.session = msg.session;
        return true;
    };

    /**
     * ### Socket.send
     *
     * Pushes a message into the socket.
     *
     * The msg is actually received by the client itself as well.
     *
     * @param {GameMsg} The game message to send
     *
     * @see GameMsg
     *
     * @TODO: Check Do volatile msgs exist for clients?
     */
    Socket.prototype.send = function(msg) {
        if (!this.socket) {
            this.node.err('Socket.send: cannot send message. No open socket.');
            return false;
        }

        if (msg.from === this.node.UNDEFINED_PLAYER) {
            this.node.err('Socket.send: cannot send message. Player undefined.');
            return false;
        }
        
        // TODO: add conf variable node.emitOutMsg
        if (this.node.debug) {
            this.node.emit(msg.toOutEvent(), msg);
        }
        
        this.socket.send(msg);
        this.node.info('S: ' + msg);
        return true;
    };

    // helping methods

    var logSecureParseError = function (text, e) {
        text = text || 'Generic error while parsing a game message';
        var error = (e) ? text + ": " + e : text;
        this.node.log(error, 'ERR');
        this.node.emit('LOG', 'E: ' + error);
        return false;
    };

})(
    'undefined' != typeof node ? node : module.exports
 ,  'undefined' != typeof node ? node : module.parent.exports
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

    // TODO io will be undefined in Node.JS because module.parents.exports.io does not exists

    // ## Global scope

    var GameMsg = node.GameMsg,
    Player = node.Player,
    GameMsgGenerator = node.GameMsgGenerator;

    exports.SocketIo = SocketIo;

    function SocketIo(node, options) {
        this.node = node;
        this.socket = null;
    }

    SocketIo.prototype.connect = function(url, options) {
        var node, socket;
        node = this.node;

        if (!url) {
            node.err('cannot connect to empty url.', 'ERR');
            return false;
        }

        socket = io.connect(url, options); //conf.io
        socket.on('connect', function(msg) {
            node.info('socket.io connection open');
            socket.on('message', function(msg) {
                node.socket.onMessage(msg);
            });
        });

        socket.on('disconnect', function() {
            node.socket.onDisconnect.call(node.socket);
        });

        this.socket = socket;

        return true;

    };

    SocketIo.prototype.send = function(msg) {
        this.socket.send(msg.stringify());
    };

    node.SocketFactory.register('SocketIo', SocketIo);

})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports,
    'undefined' != typeof io ? io : require('socket.io-client') 
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
(function (exports, parent) {

    // ## Global scope	
    var JSUS = parent.JSUS,
    NDDB = parent.NDDB,
    GameStage = parent.GameStage;

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
     * 
     * @see NDDB constructor
     */
    function GameDB(options, db) {
	options = options || {};

	if (!options.update) options.update = {};
	// Auto build indexes by default
	options.update.indexes = true;
	
	NDDB.call(this, options, db);
	
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

        this.node = options.shared ? (options.shared.node ? options.shared.node : null) : null;
	
    }

    // ## GameDB methods

    /**
     * ## GameDB.syncWithNode
     *
     * If set, automatically adds property to newly inserted items
     *
     * Adds `node.player` and `node.game.getCurrentGameStage()`
     *
     * @param {NodeGameClient} A NodeGameClient instance
     */
    GameDB.prototype.syncWithNode = function(node) {
        if ('object' !== typeof node) {
            throw new Error('GameDB.syncWithNode: invalid parameter received');
        }
        this.node = node;
    }
    
    /**
     * ### GameDB.add
     * 
     * Creates a GameBit and adds it to the database
     * 
     * @param {string} key An alphanumeric id for the entry
     * @param {mixed} value Optional. The value to store
     * @param {Player} player Optional. The player associated to the entry
     * @param {GameStage} player Optional. The stage associated to the entry
     * 
     * @return {boolean} TRUE, if insertion was successful
     * 
     * 	@see GameBit
     */
    GameDB.prototype.add = function(key, value, player, stage) {
        if (!key) {
            this.log("GameDB.add: Missing mandatory attribute 'key'.", 'ERR');
            return false;
        }
        
        if (this.node) {
            if ('undefined' === typeof player) {
                player = node.player;
            }
            if ('undefined' === typeof stage) {
                stage = node.game.getCurrentGameStage();
            }
        }
            
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
    function GameBit(options) {
	
	this.stage = options.stage;
	this.player = options.player;
	this.key = options.key;
	this.value = options.value;
	this.time = (Date) ? Date.now() : null;
    }


    /**
     * ### GameBit.toString
     * 
     * Returns a string representation of the instance of GameBit
     * 
     * @return {string} string representation of the instance of GameBit
     */
    GameBit.prototype.toString = function() {
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
    GameBit.equals = function(gb1, gb2, strict) {
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
    GameBit.comparePlayer = function(gb1, gb2) {
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
    GameBit.compareState = function(gb1, gb2) {
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
    GameBit.compareKey = function(gb1, gb2) {
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
    GameBit.compareValue = function(gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (JSUS.equals(gb1.value, gb2.value)) return 0;
	if (gb1.value > gb2.value) return 1;
	return -1;
    };	

    // ## Closure
    
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # Game
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * Wrapper class for a `GamePlot` object and functions to control the game flow
 *
 *  ---
 */
(function(exports, parent) {

    // ## Global scope

    // Exposing Game constructor
    exports.Game = Game;

    var GameStage = parent.GameStage,
    GameDB = parent.GameDB,
    GamePlot = parent.GamePlot,
    PlayerList = parent.PlayerList,
    Stager = parent.Stager;
    
    var constants = parent.constants;

    /**
     * ## Game constructor
     *
     * Creates a new instance of Game
     *
     * @param {NodeGameClient} node. A valid NodeGameClient object
     * @param {object} settings Optional. A configuration object
     */
    function Game(node, settings) {

        this.node = node;

        this.setStateLevel(constants.stateLevels.UNINITIALIZED, true);
        this.setStageLevel(constants.stageLevels.UNINITIALIZED, true);

        settings = settings || {};

        // ## Private properties

        /**
         * ### Game.metadata
         *
         * The game's metadata
         *
         * Contains following properties:
         * name, description, version, session
         *
         * @api private
         */
        this.metadata = {
            name:        settings.name || 'A nodeGame game',
            description: settings.description || 'No Description',
            version:     settings.version || '0',
            session:     settings.session || '0'
        };

        /**
         * ### Game.settings
         *
         * The game's settings
         *
         * Contains following properties:
         *
         *  - observer: If TRUE, silently observes the game. Default: FALSE
         *
         *  - auto_wait: If TRUE, fires a WAITING... event immediately after
         *     a successful DONE event. Default: FALSE
         *
         *  - minPlayers: Default: 1
         *
         *  - maxPlayers: Default: 1000
         *
         * @api private
         */
        this.settings = {
            observer:   !!settings.observer,
            minPlayers: settings.minPlayers || 1,
            maxPlayers: settings.maxPlayers || 1000
        };

        /**
         * ### Game.pl
         *
         * The list of players connected to the game
         *
         * The list may be empty, depending on the server settings
         *
         * @api private
         */
        this.pl = new PlayerList({
            log: this.node.log,
            logCtx: this.node
        });

        /**
         * ### Game.ml
         *
         * The list of monitor clients connected to the game
         *
         * The list may be empty, depending on the server settings
         *
         * @api private
         */
        this.ml = new PlayerList({
            log: this.node.log,
            logCtx: this.node
        });


        // ## Public properties

        /**
         * ### Game.memory
         *
         * A storage database for the game
         *
         * In the server logic the content of SET messages are
         * automatically inserted in this object
         *
         * @see NodeGameClient.set
         */
        this.memory = new GameDB({
            log: this.node.log,
            logCtx: this.node,
            shared: { node: this.node }
        });

        /**
         * ### Game.plot
         *
         * The Game Plot
         *
         * @see GamePlot
         * @api private
         */
        this.plot = new GamePlot(new Stager(settings.stages), node);


        // TODO: check how to init
        this.setCurrentGameStage(new GameStage(), true);


        this.paused = false;

        this.setStateLevel(constants.stateLevels.STARTING);
    } // <!-- ends constructor -->

    // ## Game methods

    /**
     * ### Game.start
     *
     * Starts the game
     *
     * Calls the init function, and steps.
     *
     * Important: it does not use `Game.publishUpdate` because that is
     * just for change of state after the game has started
     */
    Game.prototype.start = function() {
        var onInit, rc, node;
        node = this.node;

        if (node.player.placeholder) {
            throw new node.NodeGameMisconfiguredGameError(
                'game.start called without a player.');
        }

        if (this.getStateLevel() >= constants.stateLevels.INITIALIZING) {
            node.warn('game.start called on a running game.');
            return false;
        }

        // Check for the existence of stager contents:
        if (!this.plot.isReady()) {
            throw new node.NodeGameMisconfiguredGameError(
                'game.start called, but plot is not ready.');
        }

        // INIT the game
        if (this.plot && this.plot.stager) {
            onInit = this.plot.stager.getOnInit();
            if (onInit) {
                this.setStateLevel(constants.stateLevels.INITIALIZING);
                node.emit('INIT');
                onInit.call(node.game);
            }
        }
        this.setStateLevel(constants.stateLevels.INITIALIZED);

        this.setCurrentGameStage(new GameStage());
        rc = this.step();

        node.log('game started.');

        return rc;
    };

    
    /**
     * ### Game.restart
     *
     * Moves the game stage to 1.1.1
     *
     * @param {boolean} rest TRUE, to erase the game memory before update the game stage
     *
     * TODO: should we send a message to connected players as well,
     * or give an option to send it?
     * 
     * @experimental
     */
    Game.prototype.restart = function (reset) {
        if (reset) this.memory.clear(true);
        this.execStep(this.plot.getStep("1.1.1"));
    };




    /**
     * ### Game.gameover
     *
     * Ends the game
     *
     * Calls the gameover function, sets levels.
     */
    Game.prototype.gameover = function() {
        var onGameover, node;
        node = this.node;

        if (this.getStateLevel() >= constants.stateLevels.FINISHING) {
            node.warn('game.gameover called on a finishing game');
            return;
        }

        node.emit('GAMEOVER');

        // Call gameover callback, if it exists:
        if (this.plot && this.plot.stager) {
            onGameover = this.plot.stager.getOnGameover();
            if (onGameover) {
                this.setStateLevel(constants.stateLevels.FINISHING);

                onGameover.call(node.game);
            }
        }

        this.setStateLevel(constants.stateLevels.GAMEOVER);
        this.setStageLevel(constants.stageLevels.DONE);
    };

    /**
     * ### Game.pause
     *
     * Experimental. Sets the game to pause
     *
     * @TODO: check with Game.ready
     */
    Game.prototype.pause = function() {
        this.paused = true;
    };

    /**
     * ### Game.resume
     *
     * Experimental. Resumes the game from a pause
     *
     * @TODO: check with Game.ready
     */
    Game.prototype.resume = function() {
        this.paused = false;
    };


    /**
     * ### Game.shouldStep
     *
     * Execute the next stage / step, if allowed
     *
     * @return {boolean|null} FALSE, if the execution encounters an error
     *   NULL, if stepping is disallowed
     *
     * @see Game.step
     */
    Game.prototype.shouldStep = function() {
        var stepRule;
        stepRule = this.plot.getStepRule(this.getCurrentGameStage());

        if ('function' !== typeof stepRule) {
            throw new this.node.NodeGameMisconfiguredGameError("step rule is not a function");
        }
        
        if (stepRule(this.getCurrentGameStage(), this.getStageLevel(), this.pl, this)) {
            return this.step();
        }
        else {
            return null;
        }
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
     * @see Game.execStep
     *
     * TODO: harmonize return values
     */
    Game.prototype.step = function() {
        var nextStep, curStep;
        var nextStepObj, nextStageObj;
        var ev, node;
        node = this.node;

        if (this.getStateLevel() < constants.stateLevels.INITIALIZED) {
            throw new node.NodeGameMisconfiguredGameError(
                'game.step called before game.start');
        }
        
        curStep = this.getCurrentGameStage();
        nextStep = this.plot.next(curStep);
        node.silly('Next stage ---> ' + nextStep);

        // Listeners from previous step are cleared in any case
        node.events.ee.step.clear();

        // Emit buffered messages:
        node.socket.shouldClearBuffer();

        if ('string' === typeof nextStep) {
            if (nextStep === GamePlot.GAMEOVER) {
                this.gameover();
                // Emit buffered messages:
                node.socket.shouldClearBuffer();
                node.emit('GAME_OVER');
                return null;
            }

            // else do nothing
            return null;
        }
        else {
            // TODO maybe update also in case of string

            node.emit('STEPPING');

            // stageLevel needs to be changed, otherwise it stays DONE
            // for a short time in the new game stage:
            this.setStageLevel(constants.stageLevels.UNINITIALIZED);
            this.setCurrentGameStage(nextStep);

            // If we enter a new stage (including repeating the same stage)
            // we need to update a few things:
            if (this.plot.stepsToNextStage(curStep) === 1) {
                nextStageObj = this.plot.getStage(nextStep);
                if (!nextStageObj) return false;

                // clear the previous stage listeners
                node.events.ee.stage.clear();

                // Execute the init function of the stage, if any:
                if (nextStageObj.hasOwnProperty('init')) {
                    this.setStateLevel(constants.stateLevels.STAGE_INIT);
                    this.setStageLevel(constants.stageLevels.INITIALIZING);
                    nextStageObj.init.call(node.game);
                }

                // Load the listeners for the stage, if any:
                for (ev in nextStageObj.on) {
                    if (nextStageObj.on.hasOwnProperty(ev)) {
                        node.events.ee.stage.on(ev, nextStageObjs.on[ev]);
                    }
                }
            }

            nextStepObj = this.plot.getStep(nextStep);
            if (!nextStepObj) return false;

            // Execute the init function of the step, if any:
            if (nextStepObj.hasOwnProperty('init')) {
                this.setStateLevel(constants.stateLevels.STEP_INIT);
                this.setStageLevel(constants.stageLevels.INITIALIZING);
                nextStepObj.init.call(node.game);
            }

            this.setStateLevel(constants.stateLevels.PLAYING_STEP);
            this.setStageLevel(constants.stageLevels.INITIALIZED);

            // Load the listeners for the step, if any:
            for (ev in nextStepObj.on) {
                if (nextStepObj.on.hasOwnProperty(ev)) {
                    node.events.ee.step.on(ev, nextStepObjs.on[ev]);
                }
            }
            
            // Emit buffered messages:
            node.socket.shouldClearBuffer();
            return this.execStep(this.getCurrentStep());
        }
    };

    /**
     * ### Game.execStep
     *
     * Executes the specified stage object
     *
     * @TODO: emit an event "executing stage", so that other methods get notified
     *
     * @param stage {object} Full stage object to execute
     *
     */
    Game.prototype.execStep = function(stage) {
        var cb, res, node;
        node = this.node;
        
        if (!stage || 'object' !== typeof stage) {
            throw new node.NodeGameRuntimeError('game.execStep requires a valid object');
        }

        cb = stage.cb;

        this.setStageLevel(constants.stageLevels.LOADING);

        try {
            res = cb.call(node.game);
        }
        catch (e) {
            if (node.debug) throw e;
            node.err('An error occurred while executing a custom callback');
            throw new node.NodeGameRuntimeError(e);
        }

        this.setStageLevel(constants.stageLevels.LOADED);
        node.emit('STEP_CALLBACK_EXECUTED');
        if (res === false) {
            // A non fatal error occurred
            node.err('A non fatal error occurred while executing the callback of stage ' + this.getCurrentGameStage());
        }
        
        // TODO node.is is probably going to change
        if (!node.window || node.window.state == node.constants.is.LOADED) {
            // If there is a node.window, we must make sure that the DOM of the page
            // is fully loaded. Only the last one to load (between the window and 
            // the callback will emit 'PLAYING'.
            // @see GameWindow.updateStatus
            node.emit('PLAYING');
        }

        return res;
    };

    Game.prototype.getStateLevel = function() {
        return this.node.player.stateLevel;
    };

    Game.prototype.getStageLevel = function() {
        return this.node.player.stageLevel;
    };

    Game.prototype.getCurrentStep = function() {
        return this.plot.getStep(this.getCurrentGameStage());
    };

    Game.prototype.getCurrentGameStage = function() {
        return this.node.player.stage;
    };

    // ERROR, WORKING, etc
    Game.prototype.setStateLevel = function(stateLevel, silent) {
        var node;
        node = this.node;
        if ('number' !== typeof stateLevel) {
            throw new node.NodeGameMisconfiguredGameError(
                'setStateLevel called with invalid parameter: ' + stateLevel);
        }

        node.player.stateLevel = stateLevel;
        // TODO do we need to publish this kinds of update?
        //if (!silent) this.publishUpdate();
    };

    // PLAYING, DONE, etc.
    // Publishes update only if value actually changed.
    Game.prototype.setStageLevel = function(stageLevel, silent) {
        var node;
        node = this.node;
        if ('number' !== typeof stageLevel) {
            throw new node.NodeGameMisconfiguredGameError(
                'setStageLevel called with invalid parameter: ' + stageLevel);
        }
        if (!silent) this.publishStageLevelUpdate(stageLevel);
        node.player.stageLevel = stageLevel;
    };

    Game.prototype.setCurrentGameStage = function(gameStage, silent) {        
        gameStage = new GameStage(gameStage);
        if (!silent) this.publishGameStageUpdate(gameStage);
        this.node.player.stage = gameStage;
    };

    Game.prototype.publishStageLevelUpdate = function(newStageLevel) {
        var node;
        node = this.node;
        // Publish update:
        if (!this.settings.observer && node.player.stageLevel !== newStageLevel) {
            node.socket.send(node.msg.create({
                target: constants.target.PLAYER_UPDATE,
                data: { stageLevel: newStageLevel },
                to: 'ALL'
            }));
        }
    };

    Game.prototype.publishGameStageUpdate = function(newGameStage) {
        var node;
        node = this.node;
        // Publish update:
        if (!this.settings.observer && node.player.stage !== newGameStage) {
            node.socket.send(node.msg.create({
                target: constants.target.PLAYER_UPDATE,
                data: { stage: newGameStage },
                to: 'ALL'
            }));
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
     * During stepping between functions in the game-plot
     * the flag is temporarily turned to FALSE, and all events
     * are queued and fired only after nodeGame is ready to
     * handle them again.
     *
     * If the browser does not support the method object setters,
     * this property is disabled, and Game.isReady() should be used
     * instead.
     *
     * TODO check whether the conditions are adequate
     *
     */
    Game.prototype.isReady = function() {
        var node, stageLevel, stateLevel;
        stateLevel = this.getStateLevel();
        stageLevel = this.getStageLevel();
        node = this.node;


        switch (stateLevel) {
        case constants.stateLevels.UNINITIALIZED:
        case constants.stateLevels.INITIALIZING:
        case constants.stateLevels.STAGE_INIT:
        case constants.stateLevels.STEP_INIT:
        case constants.stateLevels.FINISHING:
            return false;

        case constants.stateLevels.PLAYING_STEP:
            switch (stageLevel) {
            case constants.stageLevels.LOADING:
            case constants.stageLevels.PAUSING:
            case constants.stageLevels.RESUMING:
                return false;
            }
        }

        // TODO: make node.window use other than the .is constant
        // Check if there is a gameWindow obj and whether it is loading
        return node.window ? node.window.state >= constants.is.LOADED : true;
    };

    // ## Closure
})(
    'undefined' != typeof node ? node : module.exports
 ,  'undefined' != typeof node ? node : module.parent.exports
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

    function GameSession(node) {
        SessionManager.call(this);

        this.node = node;

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
            set: GameSession.restoreStage,
            get: function() {
                return node.game.getCurrentStep();
            }
        });

        this.register('node.env');

    }


    GameSession.prototype.restoreStage = function(stage) {

        try {
            // GOTO STATE
            node.game.execStage(node.plot.getStep(stage));

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
            node.events.history.remit(node.game.getStateLevel(), discard);
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
            for (path in this.session) {
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
    //    var type = typeof(value);
    //    if ('function' === type) return true;
    //    if ('object' === type) return true;
    //    return false;
    //}


})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # GroupManager
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` group manager
 * 
 * ---
 * 
 */
(function (exports, node) {
	
// ## Global scope
	var J = node.JSUS;

	exports.GroupManager = GroupManager;

    function GroupManager() {
        // TODO GroupManager
    }

    // Here follows previous implementation of GroupManager, called RMatcher - scarcely commented.
    // RMatcher is not the same as a GroupManager, but does something very useful:
    // It assigns elements to groups based on a set of preferences

    // elements: what you want in the group
    // pools: array of array. it is set of preferences (elements from the first array will be used first

    // Groups.rowLimit determines how many unique elements per row



    exports.RMatcher = RMatcher;

    //J = require('nodegame-client').JSUS;

    function RMatcher (options) {
        this.groups = [];
        this.maxIteration = 10;
        this.doneCounter = 0;
    }

    RMatcher.prototype.init = function (elements, pools) {
        var i, g;
        for (i = 0; i < elements.length; i++) {
            g = new Group();
            g.init(elements[i], pools[i]);
            this.addGroup(g);
        }
        this.options = {
            elements: elements,
            pools: pools
        };
    };

    RMatcher.prototype.addGroup = function (group) {
        if (!group) return;
        this.groups.push(group);
    };

    RMatcher.prototype.match = function() {
        var i;
        // Do first match
        for (i = 0 ; i < this.groups.length ; i++) {
            this.groups[i].match();
            if (this.groups[i].matches.done) {
                this.doneCounter++;
            }
        }

        if (!this.allGroupsDone()) {
            this.assignLeftOvers();
        }

        if (!this.allGroupsDone()) {
            this.switchBetweenGroups();
        }

        return J.map(this.groups, function (g) { return g.matched; });
    };

    RMatcher.prototype.invertMatched = function() {

        var tmp, elements = [], inverted = [];
        J.each(this.groups, function(g) {
            elements = elements.concat(g.elements);
            tmp = g.invertMatched();
            for (var i = 0; i < tmp.length; i++) {
                inverted[i] = (inverted[i] || []).concat(tmp[i]);
            }
        });

        return { 
            elements: elements,
            inverted: inverted
        };
    };


    RMatcher.prototype.allGroupsDone = function() {
        return this.doneCounter === this.groups.length;
    };

    RMatcher.prototype.tryOtherLeftOvers = function (g) {
        var group, groupId;
        var order = J.seq(0, (this.groups.length-1));
        order = J.shuffle(order);
        for (var i = 0 ; i < order.length ; i++) {
            groupId = order[i];
            if (groupId === g) continue;
            group = this.groups[groupId];
            leftOver = [];
            if (group.leftOver.length) {
                group.leftOver = this.groups[g].matchBatch(group.leftOver);

                if (this.groups[g].matches.done) {
                    this.doneCounter++;
                    return true;
                }
            }

        }
    };

    RMatcher.prototype.assignLeftOvers = function() {
        var g, i;
        for (i = 0 ; i < this.groups.length ; i++) {
            g = this.groups[i];
            // Group is full
            if (!g.matches.done) {
                this.tryOtherLeftOvers(i);
            }

        }
    };

    RMatcher.prototype.collectLeftOver = function() {
        return J.map(this.groups, function(g) { return g.leftOver; });
    };


    RMatcher.prototype.switchFromGroup = function (fromGroup, toGroup, fromRow, leftOvers) {
        var toRow, j, n, x, h, switched;
        for (toRow = 0; toRow < fromGroup.elements.length; toRow++) {

            for (j = 0; j < leftOvers.length; j++) {
                for (n = 0; n < leftOvers[j].length; n++) {

                    x = leftOvers[j][n]; // leftover n from group j

                    if (fromGroup.canSwitchIn(x, toRow)) {
                        for (h = 0 ; h < fromGroup.matched[toRow].length; h++) {
                            switched = fromGroup.matched[toRow][h];

                            if (toGroup.canAdd(switched, fromRow)) {
                                fromGroup.matched[toRow][h] = x;
                                toGroup.addToRow(switched, fromRow);
                                leftOvers[j].splice(n,1);

                                if (toGroup.matches.done) {


//								console.log('is done')
//								console.log(toGroup);
//								console.log('is done')

                                    this.doneCounter++;
                                }
                                return true;
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     *
     * @param {integer} g Group index
     * @param {integer} row Row index
     */
    RMatcher.prototype.trySwitchingBetweenGroups = function (g, row) {
        var lo = this.collectLeftOver();
        var toGroup = this.groups[g];
        var i, fromGroup;
        // Tries with all, even with the same group, that is why is (g + 1)
        for (i = (g + 1) ; i < (this.groups.length + g + 1) ; i++) {
            fromGroup = this.groups[i % this.groups.length];

            if (this.switchFromGroup(fromGroup, toGroup, row, lo)) {
                if (toGroup.matches.done) return;
            }
        }

        return false;
    };



    RMatcher.prototype.switchBetweenGroups = function() {
        var i, g, j, h, diff;
        for ( i = 0; i < this.groups.length ; i++) {
            g = this.groups[i];
            // Group has free elements
            if (!g.matches.done) {
                for ( j = 0; j < g.elements.length; j++) {
                    diff = g.rowLimit - g.matched[j].length;
                    if (diff) {
                        for (h = 0 ; h < diff; h++) {
                            this.trySwitchingBetweenGroups(i, j);
                            if (this.allGroupsDone()) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    };


////////////////// GROUP

    function Group() {

        this.elements = [];
        this.matched = [];

        this.leftOver = [];
        this.pointer = 0;

        this.matches = {};
        this.matches.total = 0;
        this.matches.requested = 0;
        this.matches.done = false;

        this.rowLimit = 3;

        this.noSelf = true;

        this.pool = [];

        this.shuffle = true;
        this.stretch = true;
    }

    Group.prototype.init = function (elements, pool) {
        this.elements = elements;
        this.pool = J.clone(pool);

        for (var i = 0; i < this.pool.length; i++) {
            if (this.stretch) {
                this.pool[i] = J.stretch(this.pool[i], this.rowLimit);
            }
            if (this.shuffle) {
                this.pool[i] = J.shuffle(this.pool[i]);
            }
        }

        if (!elements.length) {
            this.matches.done = true;
        }
        else {
            for (i = 0 ; i < elements.length ; i++) {
                this.matched[i] = [];
            }
        }

        this.matches.requested = this.elements.length * this.rowLimit;
    };


    /**
     * The same as canAdd, but does not consider row limit
     */
    Group.prototype.canSwitchIn = function (x, row) {
        // Element already matched
        if (J.in_array(x, this.matched[row])) return false;
        // No self
        if (this.noSelf && this.elements[row] === x) return false;

        return true;
    };


    Group.prototype.canAdd = function (x, row) {
        // Row limit reached
        if (this.matched[row].length >= this.rowLimit) return false;

        return this.canSwitchIn(x, row);
    };

    Group.prototype.shouldSwitch = function (x, fromRow) {
        if (!this.leftOver.length) return false;
        if (this.matched.length < 2) return false;
//	var actualLeftOver = this.leftOver.length;
        return true;

    };

// If there is a hole, not in the last position, the algorithm fails
    Group.prototype.switchIt = function () {

        for (var i = 0; i < this.elements.length ; i++) {
            if (this.matched[i].length < this.rowLimit) {
                this.completeRow(i);
            }
        }

    };

    Group.prototype.completeRow = function (row, leftOver) {
        leftOver = leftOver || this.leftOver;
        var clone = leftOver.slice(0);
        for (var i = 0 ; i < clone.length; i++) {
            for (var j = 0 ; j < this.elements.length; j++) {
                if (this.switchItInRow(clone[i], j, row)){
                    leftOver.splice(i,1);
                    return true;
                }
                this.updatePointer();
            }
        }
        return false;
    };


    Group.prototype.switchItInRow = function (x, toRow, fromRow) {
        if (!this.canSwitchIn(x, toRow)) {
            //console.log('cannot switch ' + x + ' ' + toRow)
            return false;
        }
        //console.log('can switch: ' + x + ' ' + toRow + ' from ' + fromRow)
        // Check if we can insert any of the element of the 'toRow'
        // inside the 'toRow'
        for (var i = 0 ; i < this.matched[toRow].length; i++) {
            var switched = this.matched[toRow][i];
            if (this.canAdd(switched, fromRow)) {
                this.matched[toRow][i] = x;
                this.addToRow(switched, fromRow);
                return true;
            }
        }

        return false;
    };

    Group.prototype.addToRow = function(x, row) {
        this.matched[row].push(x);
        this.matches.total++;
        if (this.matches.total === this.matches.requested) {
            this.matches.done = true;
        }
    };

    Group.prototype.addIt = function(x) {
        var counter = 0, added = false;
        while (counter < this.elements.length && !added) {
            if (this.canAdd(x, this.pointer)) {
                this.addToRow(x, this.pointer);
                added = true;
            }
            this.updatePointer();
            counter++;
        }
        return added;
    };


    Group.prototype.matchBatch = function (pool) {
        var leftOver = [];
        for (var i = 0 ; i < pool.length ; i++) {
            if (this.matches.done || !this.addIt(pool[i])) {
                // if we could not add it as a match, it becomes leftover
                leftOver.push(pool[i]);
            }
        }
        return leftOver;
    };

    Group.prototype.match = function (pool) {
        pool = pool || this.pool;
//	console.log('matching pool');
//	console.log(pool)
        if (!J.isArray(pool)) {
            pool = [pool];
        }
        // Loop through the pools: elements in lower
        // indexes-pools have more chances to be used
        var leftOver;
        for (var i = 0 ; i < pool.length ; i++) {
            leftOver = this.matchBatch(pool[i]);
            if (leftOver.length) {
                this.leftOver = this.leftOver.concat(leftOver);
            }
        }

        if (this.shouldSwitch()) {
            this.switchIt();
        }
    };

    Group.prototype.updatePointer = function () {
        this.pointer = (this.pointer + 1) % this.elements.length;
    };

    Group.prototype.summary = function() {
        console.log('elements: ', this.elements);
        console.log('pool: ', this.pool);
        console.log('left over: ', this.leftOver);
        console.log('hits: ' + this.matches.total + '/' + this.matches.requested);
        console.log('matched: ', this.matched);
    };

    Group.prototype.invertMatched = function () {
        return J.transpose(this.matched);
    };

    // Testing functions

    var numbers = [1,2,3,4,5,6,7,8,9];

    function getElements() {

        var out = [],
            n = J.shuffle(numbers);
        out.push(n.splice(0, J.randomInt(0,n.length)));
        out.push(n.splice(0, J.randomInt(0,n.length)));
        out.push(n);

        return J.shuffle(out);
    }



    function getPools() {
        var n = J.shuffle(numbers);
        out = [];

        var A = n.splice(0, J.randomInt(0, (n.length / 2)));
        var B = n.splice(0, J.randomInt(0, (n.length / 2)));
        var C = n;

        var A_pub = A.splice(0, J.randomInt(0, A.length));
        A = J.shuffle([A_pub, A]);

        var B_pub = B.splice(0, J.randomInt(0, B.length));
        B = J.shuffle([B_pub, B]);

        var C_pub = C.splice(0, J.randomInt(0, C.length));
        C = J.shuffle([C_pub, C]);

        return J.shuffle([A,B,C]);
    }
//console.log(getElements())
//console.log(getPools())





    function simulateMatch(N) {

        for (var i = 0 ; i < N ; i++) {

            var rm = new RMatcher(),
                elements = getElements(),
                pools = getPools();

//		console.log('NN ' , numbers);
//		console.log(elements);
//		console.log(pools)
            rm.init(elements, pools);

            var matched = rm.match();

            if (!rm.allGroupsDone()) {
                console.log('ERROR');
                console.log(rm.options.elements);
                console.log(rm.options.pools);
                console.log(matched);
            }

            for (var j = 0; j < rm.groups.length; j++) {
                var g = rm.groups[j];
                for (var h = 0; h < g.elements.length; h++) {
                    if (g.matched[h].length !== g.rowLimit) {
                        console.log('Wrong match: ' +  h);

                        console.log(rm.options.elements);
                        console.log(rm.options.pools);
                        console.log(matched);
                    }
                }
            }
        }

    }

//simulateMatch(1000000000);

//var myElements = [ [ 1, 5], [ 6, 9 ], [ 2, 3, 4, 7, 8 ] ];
//var myPools = [ [ [ ], [ 1,  5, 6, 7] ], [ [4], [ 3, 9] ], [ [], [ 2, 8] ] ];

//4.07A 25
//4.77C 25
//4.37B 25
//5.13B 25 [08 R_16]
//0.83A 25 [09 R_7]
//3.93A 25 [09 R_23]
//1.37A 25 [07 R_21]
//3.30C 25
//4.40B 25
//
//25
//
//389546331863136068
//B
//
//// submissions in r 26
//
//3.73A 26 [05 R_25]
//2.40C 26
//undefinedC 26 [05 R_25]
//4.37C 26 [06 R_19]
//6.07A 26 [06 R_19]
//undefinedB 26 [06 R_18]
//4.33C 26 [05 R_25]
//undefinedC 26 [08 R_19]
//4.40B 26
//
//
//26
//
//19868497151402574894
//A
//
//27
//
//5688413461195617580
//C
//20961392604176231
//B





//20961392604176200	SUB	A	1351591619837
//19868497151402600000	SUB	A	1351591620386
//5688413461195620000	SUB	A	1351591652731
//2019166870553500000	SUB	B	1351591653043
//389546331863136000	SUB	B	1351591653803
//1886985572967670000	SUB	C	1351591654603
//762387587655923000	SUB	C	1351591654648
//1757870795266120000	SUB	B	1351591655960
//766044637969952000	SUB	A	1351591656253

//var myElements = [ [ 3, 5 ], [ 8, 9, 1, 7, 6 ], [ 2, 4 ] ];
//var myPools = [ [ [ 6 ], [ 9, 7 ] ], [ [], [ 8, 1, 5, 4 ] ], [ [], [ 2, 3 ] ] ];

//var myElements = [ [ '13988427821680113598', '102698780807709949' ],
//  [],
//  [ '15501781841528279951' ] ]
//
//var myPools = [ [ [ '13988427821680113598', '102698780807709949' ] ],
//  [ [] ],
//   [ [ '15501781841528279951' ] ] ]
//
//
//var myRM = new RMatcher();
//myRM.init(myElements, myPools);
//
//var myMatch = myRM.match();
//
//
//for (var j = 0; j < myRM.groups.length; j++) {
//	var g = myRM.groups[j];
//	for (var h = 0; h < g.elements.length; h++) {
//		if (g.matched[h].length !== g.rowLimit) {
//			console.log('Wrong match: ' + j + '-' + h);
//
//			console.log(myRM.options.elements);
//			console.log(myRM.options.pools);
////			console.log(matched);
//		}
//	}
//}

//if (!myRM.allGroupsDone()) {
//	console.log('ERROR')
//	console.log(myElements);
//	console.log(myPools);
//	console.log(myMatch);
//
//	console.log('---')
//	J.each(myRM.groups, function(g) {
//		console.log(g.pool);
//	});
//}

//console.log(myElements);
//console.log(myPools);
//console.log('match')
//console.log(myMatch);

//console.log(myRM.invertMatched());
//console.log(J.transpose(myMatch));
//
//console.log(myRM.doneCounter);

//var poolA = [ [1, 2], [3, 4], ];
//var elementsA = [7, 1, 2, 4];
//
//var poolB = [ [5], [6], ];
//var elementsB = [3 , 8];
//
//var poolC = [ [7, 8, 9] ];
//var elementsC = [9, 5, 6, ];
//
//var A, B, C;
//
//A = new Group();
//A.init(elementsA, poolA);
//
//B = new Group();
//B.init(elementsB, poolB);
//
//C = new Group();
//C.init(elementsC, poolC);
//
//
//rm.addGroup(A);
//rm.addGroup(B);
//rm.addGroup(C);
//
//rm.match();
//

//  [ [ [ 2, 1, 4 ], [ 2, 3, 4 ], [ 1, 4, 3 ], [ 1, 2, 3 ] ],
//  [ [ 5, 6, 9 ], [ 5, 6, 7 ] ],
//  [ [ 8, 6, 5 ], [ 9, 8, 7 ], [ 9, 7, 8 ] ] ]


//console.log(rm.allGroupsDone())

//console.log(g.elements);
//console.log(g.matched);





// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports,
	'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # RoleMapper
 * 
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` manager of player ids and aliases
 * 
 * ---
 * 
 */
(function (exports, parent) {
    
    // ## Global scope
    var J = parent.JSUS;

    exports.RoleMapper = RoleMapper;

    function RoleMapper() {
        // TODO RoleMapper
    }


    // ## Closure
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

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

(function (exports, parent) {

    // ## Exposing Class
    exports.NodeGameClient = NodeGameClient;

    var EventEmitterManager = parent.EventEmitterManager,
    EventEmitter = parent.EventEmitter,
    GameMsgGenerator = parent.GameMsgGenerator,
    Socket = parent.Socket,
    GameStage = parent.GameStage,
    GameMsg = parent.GameMsg,
    Game = parent.Game,
    Player = parent.Player,
    GameSession = parent.GameSession,
    J = parent.JSUS;

    function NodeGameClient() {

        /**
         * ### node.verbosity_levels
         *
         * ALWAYS, ERR, WARN, INFO, DEBUG
         */
        this.verbosity_levels = {
            ALWAYS: -(Number.MIN_VALUE + 1),
            ERR: -1,
            WARN: 0,
            INFO: 1,
            SILLY: 10,
            DEBUG: 100,
            NEVER: Number.MIN_VALUE - 1
        };

        /**
         *  ### node.verbosity
         *
         *  The minimum level for a log entry to be displayed as output
         *
         *  Defaults, only errors are displayed.
         */
        this.verbosity = this.verbosity_levels.WARN;

        /**
         *  ### node.nodename
         *
         *  The name of this node, used in logging output
         *
         *  Defaults, 'ng'
         */
        this.nodename = 'ng';

        /**
         * ### node.remoteVerbosity
         *
         *  The minimum level for a log entry to be reported to the server
         *
         *  Defaults, only errors are displayed.
         */
        this.remoteVerbosity = this.verbosity_levels.WARN;

        /**
         * ### node.events
         *
         * Instance of the EventEmitter class
         *
         * Takes care of emitting the events and calling the
         * proper listener functions
         *
         * @see EventEmitter
         */
        this.events = new EventEmitterManager(this);

        /**
         * ### node.msg
         *
         * Factory of game messages
         *
         * @see GameMsgGenerator
         */
        this.msg = new GameMsgGenerator(this);


        /**
         * ### node.socket
         *
         * Instantiates the connection to a nodeGame server
         *
         * @see GameSocketClient
         */
        this.socket = new Socket(this);

        /**
         * ### node.session
         *
         * Contains a reference to all session variables
         *
         * Session variables can be saved and restored at a later stage
         */
        this.session = new GameSession(this);

        /**
         * ### node.player
         * Instance of node.Player
         *
         * Contains information about the player
         *
         * @see PlayerList.Player
         */
        this.player = { placeholder: true };

        /**
         * ### node.game
         *
         * Instance of node.Game
         *
         * @see Game
         */
        this.game = new Game(this);


        /**
         * ### node.store
         *
         * Makes the nodeGame session persistent, saving it
         * to the browser local database or to a cookie
         *
         * @see shelf.js
         */
        this.store = function() {};

        /**
         * ### node.conf
         *
         * A reference to the current nodegame configuration
         *
         * @see NodeGameClient.setup
         */
        this.conf = {};

        /**
         * ### node.support
         *
         * A collection of features that are supported by the current browser
         */
        this.support = {};

        // ## Configuration functions

        /**
         * ### node.setup.nodegame
         *
         * Runs all the registered configuration functions
         *
         * Matches the keys of the configuration objects with the name of the registered
         * functions and executes them. If no match is found, the configuration function
         * will set the default values.
         */
        this.registerSetup('nodegame', function(options) {
            options = options || {};
            for (var i in this.setup) {
                if (this.setup.hasOwnProperty(i)) {
                    if (i !== 'register' && i !== 'nodegame') {
                        this.conf[i] = this.setup[i].call(this, options[i]);
                    }
                }
            }
        });

        /**
         * ### node.setup.socket
         *
         * Configures the socket connection to the nodegame-server
         *
         * @see node.Socket
         * @see node.SocketFactory
         */
        this.registerSetup('socket', function(conf) {
            if (!conf) return;
            this.socket.setup(conf);
            return conf;
        });

        /**
         * ### node.setup.host
         *
         * Sets the uri of the host
         *
         * If no value is passed, it will try to set the host from the window object
         * in the browser enviroment.
         */
        this.registerSetup('host', function(host) {
            var tokens;
            // URL
            if (!host) {
                if ('undefined' !== typeof window) {
                    if ('undefined' !== typeof window.location) {
                        host = window.location.href;
                    }
                }
            }

            if (host) {
                tokens = host.split('/').slice(0,-2);
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

        /**
         * ### node.setup.verbosity
         *
         * Sets the verbosity level for nodegame
         */
        this.registerSetup('verbosity', function(level) {
            if ('undefined' !== typeof level) {
                this.verbosity = level;
            }
            return level;
        });

        /**
         * ### node.setup.nodename
         *
         * Sets the name for nodegame
         */
        this.registerSetup('nodename', function(newName) {
            newName = newName || 'ng';
            if ('string' !== typeof newName) {
                throw new TypeError('node.nodename must be of type string');
            }
            this.nodename = newName;
            return newName;
        });

        /**
         * ### node.setup.debug
         *
         * Sets the debug flag for nodegame
         */
        this.registerSetup('debug', function(enable) {
            enable = enable || false;
            if ('boolean' !== typeof enable) {
                throw new TypeError('node.debug must be of type boolean');
            }
            this.debug = enable;
            return enable;
        });

        /**
         * ### node.setup.env
         *
         * Defines global variables to be stored in `node.env[myvar]`
         */
        this.registerSetup('env', function(conf) {
            if ('undefined' !== typeof conf) {
                for (var i in conf) {
                    if (conf.hasOwnProperty(i)) {
                        this.env[i] = conf[i];
                    }
                }
            }

            return conf;
        });

        /**
         * ### node.setup.events
         *
         * Configure the EventEmitter object
         *
         * @see node.EventEmitter
         */
        this.registerSetup('events', function(conf) {
            conf = conf || {};
            if ('undefined' === typeof conf.history) {
                conf.history = false;
            }

            if ('undefined' === typeof conf.dumpEvents) {
                conf.dumpEvents = false;
            }

            return conf;
        });

        /**
         * ### node.setup.window
         *
         * Configure the node.window object, if existing
         *
         * @see GameWindow
         */
        this.registerSetup('window', function(conf) {
            if (!this.window) {
                this.warn('node.window not found, cannot configure it.');
                return;
            }
            conf = conf || {};
            if ('undefined' === typeof conf.promptOnleave) {
                conf.promptOnleave = false;
            }

            if ('undefined' === typeof conf.noEscape) {
                conf.noEscape = true;
            }

            this.window.init(conf);

            return conf;
        });


        /**
         * ### node.setup.game_settings
         *
         * Sets up `node.game.settings`
         */
        this.registerSetup('game_settings', function(settings) {
            if (!this.game) {
                this.warn("register('game_settings') called before node.game was initialized");
                throw new node.NodeGameMisconfiguredGameError("node.game non-existent");
            }

            if (settings) {
                J.mixin(this.game.settings, settings);
            }

            return this.game.settings;
        });

        /**
         * ### node.setup.game_metadata
         *
         * Sets up `node.game.metadata`
         */
        this.registerSetup('game_metadata', function(metadata) {
            if (!this.game) {
                this.warn("register('game_metadata') called before node.game was initialized");
                throw new node.NodeGameMisconfiguredGameError("node.game non-existent");
            }

            if (metadata) {
                J.mixin(this.game.metadata, metadata);
            }

            return this.game.metadata;
        });

        /**
         * ### node.setup.player
         *
         * Creates the `node.player` object
         *
         * @see node.Player
         * @see node.createPlayer
         */
        this.registerSetup('player', function(player) {
            if (!player) {
                return null;
            }

            return this.createPlayer(player);
        });

        /**
         * ### node.setup.plot
         *
         * Creates the `node.game.plot` object
         *
         * @param {object} stagerState Stager state which is passed to `Stager.setState`
         * @param {string} updateRule Optional. Whether to 'replace' (default) or
         *  to 'append'.
         *
         * @see node.game.plot
         * @see Stager.setState
         */
        this.registerSetup('plot', function(stagerState, updateRule) {
            if (!this.game) {
                this.warn("register('plot') called before node.game was initialized");
                throw new node.NodeGameMisconfiguredGameError("node.game non-existent");
            }

            stagerState = stagerState || {};

            if (!this.game.plot) {
                this.game.plot = new GamePlot();
            }

            if (!this.game.plot.stager) {
                this.game.plot.stager = new Stager();
            }

            this.game.plot.stager.setState(stagerState, updateRule);

            return this.game.plot;
        });

        /**
         * ### node.setup.plist
         *
         * Updates the player list in Game
         *
         * @param {PlayerList} playerList The new player list
         * @param {string} updateRule Optional. Whether to 'replace' (default) or
         *  to 'append'.
         *
         * @see node.game.plot
         * @see Stager.setState
         */
        this.registerSetup('plist', function(playerList, updateRule) {
            updatePlayerList.call(this, 'pl', playerList, updateRule);
        });

        /**
         * ### this.setup.mlist
         *
         * TODO: merge with plist
         * Updates the monitor list in Game
         *
         * @param {PlayerList} monitorList The new monitor list
         * @param {string} updateRule Optional. Whether to 'replace' (default) or
         *  to 'append'.
         *
         * @see this.game.plot
         * @see Stager.setState
         */
        this.registerSetup('mlist', function(monitorList, updateRule) {
            updatePlayerList.call(this, 'ml', monitorList, updateRule);
        });

        // Utility for setup.plist and setup.mlist:
        function updatePlayerList(dstListName, srcList, updateRule) {
            var dstList;

            if (!this.game) {
                this.warn('updatePlayerList called before node.game was initialized');
                throw new this.NodeGameMisconfiguredGameError('node.game non-existent');
            }

            if (dstListName === 'pl')      dstList = this.game.pl;
            else if (dstListName === 'ml') dstList = this.game.ml;
            else {
                this.warn('updatePlayerList called with invalid dstListName');
                throw new this.NodeGameMisconfiguredGameError("invalid dstListName");
            }

            if (!dstList) {
                this.warn('updatePlayerList called before this.game was initialized');
                throw new this.NodeGameMisconfiguredGameError('dstList non-existent');
            }

            if (srcList) {
                if (!updateRule || updateRule === 'replace') {
                    dstList.clear(true);
                }
                else if (updateRule !== 'append') {
                    throw new this.NodeGameMisconfiguredGameError(
                        "register('plist') got invalid updateRule");
                }

                // automatic cast from Object to Player
                dstList.importDB(srcList);
            }

            return dstList;
        }


        // ALIAS


        // ### node.on.txt
        this.alias('txt', 'in.say.TXT');

        // ### node.on.data
        this.alias('data', ['in.say.DATA', 'in.set.DATA']);

        // ### node.on.state
        this.alias('state', 'in.set.STATE');

        // ### node.on.stage
        this.alias('stage', 'in.set.STAGE');

        // ### node.on.plist
        this.alias('plist', ['in.set.PLIST', 'in.say.PLIST']);

        // ### node.on.pconnect
        this.alias('pconnect', 'in.say.PCONNECT', function(msg) {
            return msg.data;
        });


        // LISTENERS

        this.addDefaultIncomingListeners();
        this.addDefaultInternalListeners();
    }

    // ## Closure
})(
    'undefined' != typeof node ? node : module.exports
 ,  'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # Log
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * `nodeGame` logging module
 *
 * ---
 */
(function (exports, parent) {

    var NGC = parent.NodeGameClient;
    var constants = parent.constants;

    /**
     * ### NodeGameClient.log
     *
     * Default nodeGame standard out, override to redirect
     *
     * Logs entries are displayed to the console if their level is
     * smaller than `this.verbosity`.
     *
     * TODO: Logs entries are forwarded to the server if their level is
     * smaller than `this.remoteVerbosity`.
     *
     * @param {string} txt The text to output
     * @param {string|number} level Optional. The verbosity level of this log. Defaults, level = 0
     * @param {string} prefix Optional. A text to display at the beginning of the log entry. Defaults 'ng> '
     *
     */
    NGC.prototype.log = function (txt, level, prefix) {
        if ('undefined' === typeof txt) return false;

        level  = level || 0;
        prefix = ('undefined' === typeof prefix) ? this.nodename + '> ' : prefix;

        if ('string' === typeof level) {
            level = this.verbosity_levels[level];
        }
        if (this.verbosity > level) {
            console.log(prefix + txt);
        }
        // if (this.remoteVerbosity > level) {
        //     var remoteMsg = this.msg.create({
        //         target: this.target.LOG,
        //         text: level,
        //         data: txt,
        //         to: 'SERVER'
        //     });
        //     console.log(txt)
        //     this.socket.send(remoteMsg);
        // }
    };

    /**
     * ### NodeGameClient.info
     *
     * Logs an INFO message
     */
    NGC.prototype.info = function (txt, prefix) {
        prefix = this.nodename + (prefix ? '|' + prefix : '') + '> info - ';
        this.log(txt, this.verbosity_levels.INFO, prefix);
    };

    /**
     * ### NodeGameClient.warn
     *
     * Logs a WARNING message
     */
    NGC.prototype.warn = function (txt, prefix) {
        prefix = this.nodename + (prefix ? '|' + prefix : '') + '> warn - ';
        this.log(txt, this.verbosity_levels.WARN, prefix);
    };

    /**
     * ### NodeGameClient.err
     *
     * Logs an ERROR message
     */
    NGC.prototype.err = function (txt, prefix) {
        prefix = this.nodename + (prefix ? '|' + prefix : '') + '> error - ';
        this.log(txt, this.verbosity_levels.ERR, prefix);
    };

    /**
     * ### NodeGameClient.debug
     *
     * Logs a DEBUG message
     */
    NGC.prototype.silly = function (txt, prefix) {
        prefix = this.nodename + (prefix ? '|' + prefix : '') + '> silly - ';
        this.log(txt, this.verbosity_levels.SILLY, prefix);
    };

})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
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

(function(exports, node) {

    // ## Global scope

    var GameMsg = node.GameMsg,
    Player = node.Player,
    Game = node.Game,
    GamePlot = node.GamePlot,
    Stager = node.Stager,
    GameMsgGenerator = node.GameMsgGenerator,
    J = node.JSUS;

    var NGC = node.NodeGameClient;

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
     * Accepts any number of extra parameters that are passed to the callback
     * function.
     *
     * See the examples folder for all available configuration options.
     *
     * @param {string} property The feature to configure
     * @return {boolean} TRUE, if configuration is successful
     *
     * @see node.setup.register
     */
    NGC.prototype.setup = function(property) {
        var res;

        if ('string' !== typeof property) {
            throw new Error('node.setup: expects a string as first parameter.');
        }

        if (frozen) {
            throw new Error('nodeGame configuration is frozen. No modification allowed.');
        }

        if (property === 'register') {
            throw new Error('cannot setup property "register"');
        }

        if (!this.setup[property]) {
            throw new Error('no such property to configure: ' + property);
        }
        
        // Setup the property using rest of arguments:
        res = this.setup[property].apply(this, Array.prototype.slice.call(arguments, 1));

        if (property !== 'nodegame') {
            this.conf[property] = res;
        }

        return true;
    };

    /**
     * ### node.setup.register
     *
     * Registers a configuration function
     *
     * An incoming event listener in.say.SETUP is added automatically.
     *
     * @param {string} property The feature to configure
     * @param {mixed} options The value of the option to configure
     * @return{boolean} TRUE, if configuration is successful
     *
     * @see node.setup
     */
    NGC.prototype.registerSetup = function(property, func) {
        if (!property || !func) {
            this.err('cannot register empty setup function');
            return false;
        }
        this.setup[property] = func;
        return true;
    };

    /**
     * ### node.remoteSetup
     *
     * Sends a setup configuration to a connected client
     *
     * Accepts any number of extra parameters that are sent as option values.
     *
     * @param {string} property The feature to configure
     * @param {string} to The id of the remote client to configure
     *
     * @return{boolean} TRUE, if configuration is successful
     *
     * @see node.setup
     * @see JSUS.stringifyAll
     */
    NGC.prototype.remoteSetup = function(property, to) {
        var msg, payload;

        if (!property) {
            this.err('cannot send remote setup: empty property');
            return false;
        }
        if (!to) {
            this.err('cannot send remote setup: empty recipient');
            return false;
        }

        payload = J.stringifyAll(Array.prototype.slice.call(arguments, 2));

        if (!payload) {
            this.err('an error occurred while stringifying payload for remote setup');
            return false;
        }

        msg = this.msg.create({
            target: this.target.SETUP,
            to: to,
            text: property,
            data: payload
        });

        return this.socket.send(msg);
    };


  
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports,
    'undefined' != typeof io ? io : module.parent.exports.io
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


    var NGC = node.NodeGameClient;


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
     * @param {string|array} events The event/s under which the listeners will be registered to
     * @param {function} cb Optional. If set the return value will be passed as parameter
     *   of the emitted event
     */	
    NGC.prototype.alias = function(alias, events, cb) {
	var that;
        if (!alias || !events) { 
	    this.err('undefined alias or events'); 
	    return; 
	}
	if (!J.isArray(events)) events = [events];
	that = this;
	J.each(events, function(event) {
	    that.on[alias] = function(func) {
		that.on(event, (cb) ? 
			function() {
			    func.call(that.game, cb.apply(that.game, arguments));
			}
			: function() {
			    func.apply(that.game, arguments);
			}
		       );
                
	    };
	});
    };	
    
    



})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);
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

(function (exports, parent) {
    
    var NGC = parent.NodeGameClient;

    /**
     * ### node.connect
     *
     * Establishes a connection with a nodeGame server
     *
     * @param {string} uri Optional. The uri to connect to
     */
    NGC.prototype.connect = function (uri, options) {
        if (this.socket.connect(uri, options)) {
            this.emit('NODEGAME_CONNECTED');
        }
    };

})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # Player related functions
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * ---
 *
 */

(function (exports, parent) {

    var NGC = parent.NodeGameClient,
    Player = parent.Player,
    constants = parent.constants;

    /**
     * ### NodeGameClient.createPlayer
     *
     * Creates player
     */
    NGC.prototype.createPlayer = function (player) {
        if (this.player &&
            this.player.stateLevel > constants.stateLevels.STARTING &&
            this.player.stateLevel !== constants.stateLevels.GAMEOVER) {
            throw new this.NodeGameIllegalOperationError(
                'createPlayer: cannot create player while game is running');
        }

        player = new Player(player);
        player.stateLevel = this.player.stateLevel;
        player.stageLevel = this.player.stageLevel;

        // Overwrite existing 'current' player:
        if (this.player && this.player.id) {
            this.game.pl.remove(this.player.id);
        }

        this.player = this.game.pl.add(player);

        this.emit('PLAYER_CREATED', this.player);

        return this.player;
    };


})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # NodeGameClient Events Handling  
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * ---
 *
 */

(function (exports, parent) {


    var NGC = parent.NodeGameClient;
    
    var GameStage = parent.GameStage;
    
    /**
     * ### NodeGameClient.getCurrentEventEmitter
     *
     * Returns the last active event emitter obj
     *
     * TODO: finish the method
     *
     * TODO: add proper doc
     *
     * @param {EventEmitter} The current event emitter obj
     */
    NGC.prototype.getCurrentEventEmitter = function() {
        // NodeGame default listeners
        if (!this.game || !this.game.getCurrentGameStage()) {
            return this.events.ee.ng;
        }

        // It is a game init function
        if ((GameStage.compare(this.game.getCurrentGameStage(), new GameStage()) === 0 )) {
            return this.events.ee.game;
        }

        // TODO return the stage ee

        // It is a game step function
        else {
            return this.events.ee.step;
        }
    };

    /**
     * ### NodeGameClient.emit
     *
     * Emits an event locally on all registered event handlers
     *
     * The first parameter be the name of the event as _string_,
     * followed by any number of parameters that will be passed to the
     * handler callback.
     *
     * @see EventEmitterManager.emit
     */
    NGC.prototype.emit = function () {
        this.events.emit.apply(this.events, arguments);
    };

    /**
     * ### NodeGameClient.on
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
    NGC.prototype.on = function (event, listener) {
        var ee;
        ee = this.getCurrentEventEmitter();
        ee.on(event, listener);
    };

    /**
     * ### NodeGameClient.once
     *
     * Registers an event listener that will be removed
     * after its first invocation
     *
     * @param {string} event The name of the event
     * @param {function} listener The callback function
     *
     * @see NodeGameClient.on
     * @see NodeGameClient.off
     */
    NGC.prototype.once = function (event, listener) {
        var ee, cbRemove;
        // This function will remove the event listener
        // and itself.
        cbRemove = function() {
            ee.remove(event, listener);
            ee.remove(event, cbRemove);
        };
        ee = this.getCurrentEventEmitter();
        ee.on(event, listener);
        ee.on(event, cbRemove);
    };

    /**
     * ### NodeGameClient.off
     *
     * Deregisters one or multiple event listeners
     *
     * @param {string} event The name of the event
     * @param {function} listener The callback function
     *
     * @see NodeGameClient.on
     * @see NodeGameClient.EventEmitter.remove
     */
    NGC.prototype.off  = function (event, func) {
        return this.events.remove(event, func);
    };


})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # NodeGameClient: SAY, SET, GET, DONE
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * ---
 *
 */

(function (exports, parent) {


    var NGC = parent.NodeGameClient;

    /**
     * ### NodeGameClient.say
     *
     * Sends a DATA message to a specified recipient
     *
     * @param {string} text The label associated to the message
     * @param {string} to Optional. The recipient of the message. Defaults, 'SERVER'
     * @param {mixed} data Optional. The content of the DATA message
     *
     */
    NGC.prototype.say = function (label, to, payload) {
        var msg;

        if ('undefined' === typeof label) {
            this.err('cannot say empty message');
            return false;
        }

        msg = this.msg.create({
            target: this.constants.target.DATA,
            to: to || 'SERVER',
            text: label,
            data: payload
        });
        debugger
        this.socket.send(msg);
    };

    /**
     * ### NodeGameClient.set
     *
     * Stores a key-value pair in the server memory
     *
     *
     *
     * @param {string} key An alphanumeric (must not be unique)
     * @param {mixed} The value to store (can be of any type)
     *
     */
    NGC.prototype.set = function (key, value, to) {
        var msg;

        if ('undefined' === typeof key) {
            this.err('cannot set undefined key');
            return false;
        }

        msg = this.msg.create({
            action: this.constants.action.SET,
            target: this.constants.target.DATA,
            to: to || 'SERVER',
            reliable: 1,
            text: key,
            data: value
        });
        // @TODO when refactoring is finished, emit this event.
        // By default there nothing should happen, but people could listen to it
        //this.emit('out.set.DATA', msg);
        this.socket.send(msg);
    };


    /**
     * ### NodeGameClient.get
     *
     * Sends a GET message to a recipient and listen to the reply
     *
     * @param {string} key The label of the GET message
     * @param {function} cb The callback function to handle the return message
     *
     * Experimental. Undocumented (for now)
     */
    NGC.prototype.get = function (key, cb, to) {
        var msg, g, ee;

        if ('undefined' === typeof key) {
            this.err('cannot get empty key');
            return false;
        }

        if ('function' !== typeof cb) {
            this.err('this.get requires a valid callback function');
            return false;
        }

        msg = this.msg.create({
            action: this.constants.action.GET,
            target: this.constants.target.DATA,
            to: to || 'SERVER',
            reliable: 1,
            text: key
        });

        // @TODO when refactoring is finished, emit this event.
        // By default there nothing should happen, but people could listen to it
        //this.events.emit('out.get.DATA', msg);

        ee = this.getCurrentEventEmitter();

        function g(msg) {
            if (msg.text === key) {
                cb.call(this.game, msg.data);
                ee.remove('in.say.DATA', g);
            }
        };

        ee.on('in.say.DATA', g);
    };

    /**
     * ### NodeGameClient.done
     *
     * Emits a DONE event
     *
     * A DONE event signals that the player has completed
     * a game step. After a DONE event the step rules are
     * evaluated.
     *
     * Accepts any number of input parameters that will be
     * passed to `emit`.
     *
     * @see NodeGameClient.emit
     * @emits DONE
     */
    NGC.prototype.done = function() {
        var args, len;
        switch(arguments.length) {

        case 0:
            this.emit('DONE');
            break;
        case 1:
            this.emit('DONE', arguments[0]);
            break;
        case 2:
            this.emit('DONE', arguments[0], arguments[1]);
            break;
        default:

            len = arguments.length;
            args = new Array(len - 1);
            for (i = 1; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            this.emit.apply('DONE', args);
        }
    };

})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # NodeGameClient Events Handling  
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * ---
 *
 */

(function (exports, parent) {


    var NGC = parent.NodeGameClient;
    
    /**
     * ### NodeGameClient.redirect
     *
     * Redirects a player to the specified url
     *
     * Works only if it is a monitor client to send
     * the message, i.e. players cannot redirect each
     * other.
     *
     * Examples
     *
     *  // Redirect to http://mydomain/mygame/missing_auth
     *  node.redirect('missing_auth', 'xxx');
     *
     *  // Redirect to external urls
     *  node.redirect('http://www.google.com');
     *
     * @param {string} url the url of the redirection
     * @param {string} who A player id or 'ALL'
     * @return {boolean} TRUE, if the redirect message is sent
     */
    NGC.prototype.redirect = function (url, who) {
        var msg;
        if ('string' !== typeof url) {
            this.err('redirect requires a valid string');
            return false;
        }
        if ('undefined' === typeof who) {
            this.err('redirect requires a valid recipient');
            return false;
        }
        msg = this.msg.create({
            target: this.target.REDIRECT,
            data: url,
            to: who
        });
        this.socket.send(msg);
        return true;
    };

    /**
     * ### NodeGameClient.remoteCommand
     *
     * Executes a game command on a client
     *
     * Works only if it is a monitor client to send
     * the message, i.e. players cannot send game commands
     * to each others
     *
     * @param {string} command The command to execute
     * @param {string} to The id of the player to command
     * @return {boolean} TRUE, if the game command is sent
     */
    NGC.prototype.remoteCommand = function (command, to, options) {
        var msg;
        if (!command) {
            this.err('remoteCommand requires a valid command');
            return false;
        }
        if ('undefined' === typeof to) {
            this.err('remoteCommand requires a valid recipient');
            return false;
        }

        msg = this.msg.create({
            target: this.target.GAMECOMMAND,
            text: command,
            data: options,
            to: to
        });
        return this.socket.send(msg);
    };

})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

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

(function (exports, parent) {
    
    var NGC = parent.NodeGameClient
    
    //## Extra
    
    /**
     * ### node.env
     *
     * Executes a block of code conditionally to nodeGame environment variables
     *
     * @param env {string} The name of the environment
     * @param func {function} The callback function to execute
     * @param ctx {object} Optional. The context of execution
     * @param params {array} Optional. An array of additional parameters for the callback
     *
     */
    NGC.prototype.env = function (env, func, ctx, params) {
        if (!env || !func || !this.env[env]) return;
        ctx = ctx || node;
        params = params || [];
        func.apply(ctx, params);
    };

    /**
     * ### NodeGameClient.randomEmit
     *
     * Emits an event after a random time interval between 0 and maxWait
     *
     * @param {string} event The name of the event
     * @param {number} maxWait Optional. The maximum time (in milliseconds)
     *   to wait before emitting the event. to Defaults, 6000
     */
    NGC.prototype.randomEmit = function (event, maxWait){
        maxWait = maxWait || 6000;
        setTimeout(function(event) {
            node.emit(event);
        }, Math.random() * maxWait, event);
    };

    /**
     * ### NodeGameClient.randomExec
     *
     * Executes a callback function after a random time interval between 0 and maxWait
     *
     * @param {function} The callback function to execute
     * @param {number} maxWait Optional. The maximum time (in milliseconds)
     *   to wait before executing the callback. to Defaults, 6000
     */
    NGC.prototype.randomExec = function (func, maxWait) {
        maxWait = maxWait || 6000;
        setTimeout(function(func) {
            func.call();
        }, Math.random() * maxWait, func);
    };

    /**
     * ###  NodeGameClient.play
     *
     * Starts a game
     *
     * @deprecated use game.start directly
     */
    NGC.prototype.play = function() {
        this.game.start();
    };

    /**
     * ### NodeGameClient.replay
     *
     * Moves the game stage to 1.1.1
     *
     * @param {boolean} rest TRUE, to erase the game memory before update the game stage
     *
     * @deprecated use game.start directly
     * also this.plot is wrong
     */
    NGC.prototype.replay = function (reset) {
        if (reset) this.game.memory.clear(true);
        this.game.execStep(this.plot.getStep("1.1.1"));
    };


})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);

// # Incoming listeners
// Incoming listeners are fired in response to incoming messages
(function (exports, parent) {

    var NGC = parent.NodeGameClient;

    var GameMsg = parent.GameMsg,
        GameSage = parent.GameStage,
        PlayerList = parent.PlayerList,
        Player = parent.Player,
        J = parent.JSUS;

    var action = parent.constants.action,
        target = parent.constants.target;

    var say = action.SAY + '.',
        set = action.SET + '.',
        get = action.GET + '.',
        IN = parent.constants.IN;

    /**
     * ## NodeGameClient.addDefaultIncomingListeners
     *
     * Adds a battery of event listeners for incoming messages 
     *
     * If executed once, it requires a force flag to re-add the listeners
     *
     * @param {boolean} TRUE, to force re-adding the listeners
     * @return {boolean} TRUE on success
     */
    NGC.prototype.addDefaultIncomingListeners = function(force) {
        var node = this;

        if (node.incomingAdded && !force) {
            node.err('Default incoming listeners already added once. Use the force flag to re-add.');
            return false;
        }
        
        /**
         * ## in.say.PCONNECT
         *
         * Adds a new player to the player list from the data contained in the message
         *
         * @emit UPDATED_PLIST
         * @see Game.pl
         */
        node.events.ng.on( IN + say + 'PCONNECT', function (msg) {
            if (!msg.data) return;
            node.game.pl.add(new Player(msg.data));
            node.emit('UPDATED_PLIST');
        });

        /**
         * ## in.say.PDISCONNECT
         *
         * Removes a player from the player list based on the data contained in the message
         *
         * @emit UPDATED_PLIST
         * @see Game.pl
         */
        node.events.ng.on( IN + say + 'PDISCONNECT', function (msg) {
            if (!msg.data) return;
            node.game.pl.remove(msg.data.id);
            node.emit('UPDATED_PLIST');
        });

        /**
         * ## in.say.MCONNECT
         *
         * Adds a new monitor to the monitor list from the data contained in the message
         *
         * @emit UPDATED_MLIST
         * @see Game.ml
         */
        node.events.ng.on( IN + say + 'MCONNECT', function (msg) {
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
        node.events.ng.on( IN + say + 'MDISCONNECT', function (msg) {
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
        node.events.ng.on( IN + say + 'PLIST', function (msg) {
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
        node.events.ng.on( IN + say + 'MLIST', function (msg) {
            if (!msg.data) return;
            node.game.ml = new PlayerList({}, msg.data);
            node.emit('UPDATED_MLIST');
        });

        /**
         * ## in.get.DATA
         *
         * Experimental feature. Undocumented (for now)
         */
        node.events.ng.on( IN + get + 'DATA', function (msg) {
            if (msg.text === 'LOOP'){
                node.socket.sendDATA(action.SAY, node.game.plot, msg.from, 'GAME');
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
        node.events.ng.on( IN + set + 'STATE', function (msg) {
            node.game.memory.add(msg.text, msg.data, msg.from);
        });

        /**
         * ## in.set.DATA
         *
         * Adds an entry to the memory object
         *
         */
        node.events.ng.on( IN + set + 'DATA', function (msg) {
            node.game.memory.add(msg.text, msg.data, msg.from);
        });

        /**
         * ## in.say.PLAYER_UPDATE
         *
         * Updates the player's state in the player-list object
         *
         * @emit UPDATED_PLIST
         * @see Game.pl
         */
        node.events.ng.on( IN + say + 'PLAYER_UPDATE', function (msg) {
            node.game.pl.updatePlayer(msg.from, msg.data);
            node.emit('UPDATED_PLIST');
            node.game.shouldStep();
        });

        /**
         * ## in.say.STAGE
         *
         * Updates the game stage
         */
        node.events.ng.on( IN + say + 'STAGE', function (msg) {
            var stageObj;
            if (!msg.data) {
                node.warn('Received in.say.STAGE msg with empty stage');
                return;
            }
            stageObj = node.game.plot.getStep(msg.data);
            
            if (!stageObj) {
                node.err('Received in.say.STAGE msg with invalid stage');
                return;
            }
            // TODO: renable when it does not cause problems.
            // At the moment the AdminServer sends this kind of msg
            // each time an admin publishes its own state
            //node.game.execStep(stageObj);
        });

        /**
         * ## in.say.STAGE_LEVEL
         *
         * Updates the stage level
         */
        node.events.ng.on( IN + say + 'STAGE_LEVEL', function (msg) {
            //node.game.setStageLevel(msg.data);
        });

        /**
         * ## in.say.REDIRECT
         *
         * Redirects to a new page
         *
         * @see node.redirect
         */
        node.events.ng.on( IN + say + 'REDIRECT', function (msg) {
            if (!msg.data) return;
            if ('undefined' === typeof window || !window.location) {
                node.err('window.location not found. Cannot redirect');
                return false;
            }

            window.location = msg.data;
        });


        /**
         * ## in.say.SETUP
         *
         * Setups a features of nodegame
         *
         * Unstrigifies the payload before calling `node.setup`
         *
         * @see node.setup
         * @see JSUS.parse
         */
        node.events.ng.on( IN + say + 'SETUP', function (msg) {
console.log('* SETUP * ', msg);
            if (!msg.text) return;
            var feature = msg.text,
            payload = ('string' === typeof msg.data) ? J.parse(msg.data) : msg.data;

            if (!payload) {
                node.err('error while parsing incoming remote setup message');
                return false;
            }
            node.setup.apply(node, [feature].concat(payload));
        });


        /**
         * ## in.say.GAMECOMMAND
         *
         * Setups a features of nodegame
         *
         * @see node.setup
         */
        node.events.ng.on( IN + say + 'GAMECOMMAND', function (msg) {
console.log('* GAMECOMMAND * ', msg);
            if (!msg.text || !parent.constants.gamecommand[msg.text]) {
                node.err('unknown game command received: ' + msg.text);
                return;
            }
            node.emit('NODEGAME_GAMECOMMAND_' + msg.text, msg.data);
        });

        /**
         * ## in.say.JOIN
         *
         * Invites the client to leave the current channel and joining another one
         *
         * It differs from `REDIRECT` messages because the client
         * does not leave the page, it just switches channel.
         *
         * @experimental
         */
        node.events.ng.on( IN + say + 'JOIN', function (msg) {
            if (!msg.text) return;
            //node.socket.disconnect();
            node.connect(msg.text);
        });

        node.incomingAdded = true;
        node.silly('incoming listeners added');
        return true;
    };

    
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);
// <!-- ends incoming listener -->

// # Internal listeners

// Internal listeners are not directly associated to messages,
// but they are usually responding to internal nodeGame events, 
// such as progressing in the loading chain, or finishing a game stage 

(function (exports, parent) {
    
    var NGC = parent.NodeGameClient;

    var GameMsg = parent.GameMsg,
    GameSage = parent.GameStage,
    PlayerList = parent.PlayerList,
    Player = parent.Player,
    J = parent.JSUS,
    constants = parent.constants;
    
    var action = constants.action,
    target = constants.target;

    var say = action.SAY + '.',
    set = action.SET + '.',
    get = action.GET + '.',
    OUT = constants.OUT;

    /**
     * ## NodeGameClient.addDefaultInternalListeners
     *
     * Adds a battery of event listeners for internal events 
     *
     * If executed once, it requires a force flag to re-add the listeners
     *
     * @param {boolean} TRUE, to force re-adding the listeners
     * @return {boolean} TRUE on success
     */
    NGC.prototype.addDefaultInternalListeners = function(force) {
        var node = this;
        if (this.internalAdded && !force) {
            this.err('Default internal listeners already added once. Use the force flag to re-add.');
            return false;
        }

        /**
         * ## DONE
         * 
         * Updates and publishes that the client has successfully terminated a stage 
         * 
         * If a DONE handler is defined in the game-plot, it will executes it before
         * continuing with further operations. In case it returns FALSE, the update
         * process is stopped. 
         * 
         * @emit BEFORE_DONE
         *
         */
        this.events.ng.on('DONE', function() {
	    
            // Execute done handler before updating stage
            var ok = true,
            done = node.game.getCurrentStep().done;
            
            if (done) ok = done.apply(node.game, J.obj2Array(arguments));
            if (!ok) return;
            node.game.setStageLevel(constants.stageLevels.DONE)
	    
            // Call all the functions that want to do 
            // something before changing stage
            node.emit('BEFORE_DONE');
	    
            // Step forward, if allowed
            node.game.shouldStep();
        });

        /**
         * ## PLAYING
         * 
         * @emit BEFORE_PLAYING 
         */
        this.events.ng.on('PLAYING', function() {
            node.game.setStageLevel(constants.stageLevels.PLAYING);
            //TODO: the number of messages to emit to inform other players
            // about its own stage should be controlled. Observer is 0 
            //node.game.publishUpdate();
            node.socket.clearBuffer();	
            node.emit('BEFORE_PLAYING');
        });


        /**
         * ## NODEGAME_GAMECOMMAND: start
         * 
         */
        this.events.ng.on('NODEGAME_GAMECOMMAND_' + constants.gamecommand.start, function(options) {
	    
            node.emit('BEFORE_GAMECOMMAND', constants.gamecommand.start, options);
	    
            if (node.game.getCurrentStep() && node.game.getCurrentStep().stage !== 0) {
	        node.err('Game already started. Use restart if you want to start the game again');
	        return;
            }
	    
            node.game.start();	
        });

        this.incomingAdded = true;
        this.silly('internal listeners added');
        return true;
    }
})(
    'undefined' != typeof node ? node : module.exports,
    'undefined' != typeof node ? node : module.parent.exports
);
// <!-- ends internal listener -->

/**
 * Exposing the node object
 */
(function () {

    var tmp = new window.node.NodeGameClient();
    JSUS.mixin(tmp, window.node)
    window.node = tmp;

})();