/**
 * #  nodeGame ServerNode
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Creates an HTTP server, and loads a Socket.io instance 
 * 
 * ---
 * 
 */

// ## Global scope

module.exports = ServerNode;

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    express = require('express'),
    socket_io = require('socket.io'),
    winston = require('winston'),
	nodemailer = require('nodemailer');

var ServerChannel = require('./ServerChannel');

var J = require('nodegame-client').JSUS;


// ### Create Express server
var app = express.createServer();


/**
 * ## ServerNode Constructor
 * 
 * Creates a new ServerNode instance. 
 * 
 * @param {object} options The configuration object
 */
function ServerNode (sn, http, sio) {
	
    this.rootDir = path.resolve(__dirname, '..');
    
    this.channels = [];
    
    this.info = {};
    this.info.channels = {};
    this.info.games = {};
    
    this.defaults = {};
    this.log = {};
    
    winston.info('Starting HTTP server...');
    this.listen();
    winston.info('HTTP server started.');
    
    
    winston.info('Loading configuration files...');
    this.loadConfDir(this.rootDir + '/conf');
    winston.info('Done.');
    
    app.listen(this.port);
    
    // ### Mix in options with configuration files
    winston.info('Loading in-line options...');
    if (sn) this.configure(sn);
    if (http) this.configureHTTP(http);
    if (sio) this.configureSIO(sio);
    winston.info('Done.');    
    
    // ### Loading games
    winston.info('Loading games...');
    this.loadGames(this.gamesDirs);
    winston.info('Done.');  
}

//## ServerNode methods

/**
 * ### ServerNode.listen
 * 
 * Puts Socket.io listening on the HTTP server
 * 
 * @see ServerNode.configureHTTP
 * @see ServerNode.configureIO
 * 
 */
ServerNode.prototype.listen = function () {
    this.server = socket_io.listen(app);
};

/**
 * ### ServerNode.addChannel
 * 
 * Creates a nodeGame channel with the specified configuration.
 * If the configuration object is missing, channel creation is aborted
 * 
 * @param {object} options The object containing the custom settings
 * @return {ServerChannel|boolean} channel The nodeGame channel, or FALSE if an error occurs 
 */
ServerNode.prototype.addChannel = function (options) {

    if (!options) {
        winston.error('Options are not correctly defined for the channel. Aborting');
        return false;
    }
    
    if (this.maxChannels && this.channels.length >= this.maxChannels) {
    	winston.error('Sorry, but maximum number of channels already reached: ' + this.maxChannels);
    	return false;
    }
    
    var cname = options.name;
    // <!-- Some options must not be overwritten -->
    var options = J.extend(this.defaults.channel, options);
    
    if (cname){
        options.name = cname;
    }
    
    // <!-- TODO merge global options with local options -->
   
    var channel, ok; 
    try {
    	channel = new ServerChannel(options, this.server, this.io);
    	ok = channel.listen();
    }
    catch(e) {
    	winston.error(e);
    }
    	
    if (!ok) {
        winston.error('Channel could not be added: ' + options.name);
        return false;
    }
    
    this.info.channels[cname] = J.merge(options, {open: true});
    
    this.channels.push(channel);
    winston.info('Channel added correctly: ' + options.name);

    return channel;
};



/**
 * ### ServerNode.addWaitingRoom
 * 
 * @experimental
 * 
 * Creates a waiting room for a specific game channel, according 
 * to the specified configuration.
 * 
 * If the configuration object is missing, waiting room creation is aborted
 * 
 * @param {object} options The object containing the custom settings
 * @return {WaitingRoom} channel The nodeGame channel 
 */
ServerNode.prototype.addWaitingRoom = function (options) {

    if (!options) {
        winston.error('Options are not correctly defined for the waiting room. Aborting');
        return false;
    }
       
    var wroom;

// <!--    
//    var cname = options.name;
//    // Some options must not be overwritten
//    var options = J.extend(this.options, options);
//    if (cname){
//        options.name = cname;
//    }
//    
//    // TODO merge global options with local options
//    var channel = new ServerChannel(options, this.server, this.io);
//    // TODO return false in case of error in creating the channel
//    var ok = channel.listen();
//    
//    if (ok) {
//        this.channels.push(channel);
//        winston.error('Channel added correctly: ' + options.name);
//    }
//    else {
//        winston.error('Channel could not be added: ' + options.name);
//    }
// --!>    
    
    return wroom;
};


/**
 * ### ServerNode.addGameDir
 * 
 * Scans a directory for games folders
 * 
 * @param {string} gameDir The path to a directory containing nodeGame games
 * 
 * @see ServerNode.addGame
 */
ServerNode.prototype.addGameDir = function (gameDir) {
	var that = this;
//	winston.log(gameDir);
	fs.readdir(gameDir, function(err, game_files) {
		//winston.log(game_files);
		// an error occurred
		if (err) {
			winston.error(err);
			throw new Error;
		}
		
		if (J.in_array('package.json', game_files)) {
			var gamePath = path.resolve(gameDir + '/package.json');
			that.addGame(gamePath, gameDir);
		
		} else {
			winston.warn('No package.json file found in ' + gameDir);
		}
	});
};

/**
 * ### ServerNode.addGame
 * 
 * Adds a new game to the global collection `info.games`
 * 
 * If a configuration directory is found inside the game directory, `loadConfDir` is invoked.
 * 
 * 
 * @param {object|string} game The path to a package.json file, or its content as loaded from `require`
 * @param {string} gameDir Optional. The directory containing the game
 * 
 * @see ServerNode.loadConfDir
 */
ServerNode.prototype.addGame = function(game, gameDir) {
	if (!game) {
		winston.error('Cannot add empty game');
		return false;
	}
	var gamePath = '';
	// Try to require it
	if ('string' === typeof game) {
		gamePath = game;
		//winston.log(gamePath);
		try {
			game = require(gamePath);
		}
		catch(e) {
			winston.error('An error occurred while parsing ' + gamePath);
			var error = new Error(e);
			winston.error(error);
			return false;
		}
	}
	// Parses it
	if ('object' !== typeof game) {
		winston.error('Could not parse game ' + game);
		return false;
	}
	// Check name
	if (!game.name) {
		winston.error('Cannot add a game without name');
		return false;
	}
	
	gameDir = gameDir || path.dirname(gamePath);
	
	this.info.games[game.name] = {
			dir: path.resolve(gameDir),
			path: gamePath,
			status: 0,
			game: game,
	};
	
	if (game.alias) {
		if (!J.isArray(game.alias)) {
			game.alias = [game.alias];
		}
		for (var i=0; i < game.alias.length; i++) {
			this.info.games[game.alias[i]] = this.info.games[game.name];
		}
	}
	
	this.loadConfDir(gameDir + '/server/conf');
	
	winston.info('New game added. ' + game.name + ': ' + gamePath);
	
	return true;
};

/**
 * ### ServerNode.loadGames
 * 
 * Loads the games from the file systems
 * 
 * Scans the directories listed in this.gameDirs, looking for 
 * package.json files.
 * 
 * @see ServerNode.addGame
 * 
 */
ServerNode.prototype.loadGames = function (paths) {

	
	var that = this;

	if (!paths || !paths.length) {
		console.log('no paths');
		return;
	}
	
	console.log(typeof paths);
	
	console.log(paths);
	
	
	J.each(paths, function(dir){
		if (!path.existsSync(dir)) {
			winston.error('Game directory not found: ' + dir);
			return;
		}
			
		fs.readdir(dir, function(err, files){
			if (err) {
				winston.error(err);
				throw new Error;
			}
			if (dir.substr(-1) !== '/') {
				dir+= '/';
			}
			J.each(files, function (game) {
				var gameDir = dir + game;
				//winston.log(gameDir);
				// get file stats
				fs.stat(gameDir, function (err, stats) {

					// an error occurred
					if (err) {
						winston.error(err);
						throw new Error;
					}

					// it is a folder
					if (!stats.isDirectory()) return;
						
					that.addGameDir(gameDir);
				});
				
			});
			
		});
	});

};

/**
 * ### ServerNode.configureHTTP
 * 
 * Configure express server hook
 * 
 * Accepts a callback function to receives the express app 
 * object as first parameter. The callback function should 
 * return TRUE if configuration is successful.
 * 
 * @param {function} The function that will configure the express server
 * @param {ServerNode} The current instance of ServerNode
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configureHTTP = function (func) {
	if ('function' !== typeof func) {
		winston.error('configureHTTP requires a valid callback function as parameter.');
		return false;
	}
	return func(app, this);
};

/**
 * ### ServerNode.configureSIO
 * 
 * Configure socket.io hook
 * 
 * Accepts a callback function to receives the socket.io app 
 * object as first parameter. The callback function should 
 * return TRUE if configuration is successful.
 * 
 * @param {function} The function that will configure the socket.io app
 * @param {ServerNode} The current instance of ServerNode
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configureSIO = function (func) {
	if ('function' !== typeof func) {
		winston.error('configureSIO requires a valid callback function as parameter.');
		return false;
	}
	return func(this.server, this);
};

/**
 * ### ServerNode.configure
 * 
 * Configure ServerNode hook
 * 
 * Accepts a callback function to receives the current ServerNode
 * instance as first parameter. The callback function should 
 * return TRUE if configuration is successful.
 * 
 * @param {function} The function that will configure the socket.io app
 * @param {ServerNode} The current instance of ServerNode
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configure = function (func) {
	if ('function' !== typeof func) {
		winston.error('configure requires a callable function as parameter.');
		return false;
	}
	return func(this);
};

/**
 * ### ServerNode.loadConfDir
 * 
 * Scan a directory for configuration files and runs them
 * 
 * Looks for `servernode.js`, `http.js`, `sio.js` to configure the behavior
 * of, respectively, the current ServerNode, Express HTTP, and Socket.io servers.
 * 
 * Refer to documentation for the content of the configuration files
 * 
 * @param {string} dir The path to the configuration directory
 * 
 * @see ServerNode.configure
 * @see ServerNode.configureHTTP
 * @see ServerNode.confiureSIO
 */
ServerNode.prototype.loadConfDir = function (dir) {
	if (!dir) return false;
	
	dir = path.resolve(dir);
	
	var conf, result, file;
	
	// ServerNode
	file = dir + '/servernode.js';
	if (path.existsSync(file)) {
		try {
	    	conf = require(file);
	        result = this.configure(conf);
	        if (result) {
	        	winston.info('ServerNode file loaded correctly: ' + file);
	        }
	        else {
	        	winston.warn('A non-fatal error occurred while loading the ServerNode configuration file: ' + file);
	        }	      
	    }
	    catch(e) {
	    	winston.error('A fatal error was raised while loading the configuration files of nodeGame-server: ' + file);
	    	winston.error(e);
	    	throw new Error(e);
	    }
	}
       
	// Express HTTP server
	file = dir + '/http.js';
	if (path.existsSync(file)) {
		try {
	    	conf = require(file);
	        result = this.configureHTTP(conf);
	        if (result) {
	        	winston.info('HTTP server configuration file loaded correctly: ' + file);
	        }
	        else {
	        	winston.warn('A non-fatal error occurred while loading HTTP server configuration file: ' + file);
	        }
	    }
	    catch(e) {
	    	winston.error('A fatal error was raised while loading the configuration files of the HTTP server: ' + file);
	    	winston.error(e);
	    	throw new Error(e);
	    }
	}
    
	// Socket.io
	file = dir + '/sio.js';
	if (path.existsSync(file)) {
    	try { 
            conf = require(dir + '/sio.js');
            result = this.configureSIO(conf);
            if (result) {
	        	winston.info('Socket.io configuration file loaded correctly: ' + file);
	        }
	        else {
	        	winston.warn('A non-fatal error occurred while loading Socket.io configuration file: ' + file);
	        }
        }
        catch(e) {
        	winston.error('A fatal error was raised while loading the configuration files of Socket.io app: ' + file);
        	winston.error(e);
        	throw new Error(e);
        }
    }
    
};


//
///**
//* ## ServerNode.
//* 
//* Overwrites default configuration with the values taken
//* from the configuration object.
//* 
//* For full configuration use ServerNode.configure
//* 
//* @see ServerNode.configure
//* 
//*/
//ServerNode.prototype.overrideOptions = function (options) {
//	
//	if ('undefined' !== typeof options.name) this.name = options.name;
//	if ('undefined' !== typeof options.verbosity) this.verbosity = options.verbosity;
//	
//	if ('undefined' !== typeof options.mail) this.mail = options.mail;
//	
//	if (options.log) {
//		if ('undefined' !== typeof options.log.dumpmsg) this.log.dumpmsg = options.log.dumpmsg;
//		if ('undefined' !== typeof options.log.dumpsys) this.log.dumpsys = options.log.dumpsys;
//	}
//	
//  if (options.port) this.port = options.port;
//  
//  if (options.gamesDirs) {
//  	if ('string' === typeof options.gamesDirs) {
//  		this.gamesDirs.push(options.gamesDirs);
//  	}
//  	else if (J.isArray(options.gamesDirs)) {
//  		this.gamesDirs = this.gamesDirs.concat(options.gamesDirs);
//  	}
//  	else {
//  		winston.warn('Invalid option found for gamesDirs');
//  	}
//  }
//};