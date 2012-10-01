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
function ServerNode (options) {

    if (!options) {
        throw new Error('No configuration found to create a server. Aborting');
    }
    
    this.rootDir = path.resolve(__dirname, '..');
    this.defaultGamesDir = this.rootDir + '/games/';
    
    this.options = options;
    
    this.options.mail 		= ('undefined' !== typeof options.mail) ? options.mail : false;
    this.options.dumpmsg 	= ('undefined' !== typeof options.dumpmsg) ? options.dumpmsg : false;
    this.options.dumpsys 	= ('undefined' !== typeof options.dumpsys) ? options.dumpsys : true;
    this.options.verbosity 	= ('undefined' !== typeof options.verbosity) ? options.verbosity : 1;
    
    if (process.env.PORT){
        this.port = process.env.PORT; // if app is running on heroku then the assigned port has to be used.
    } else {
        this.port = options.port || '80'; // port of the express server and sio
    }
    
    this.maxChannels = options.maxChannels;
    this.channels = [];
    
    this.info = {};
    this.info.channels = {};
    this.info.games = {};
    
    this.gamesDirs = [this.defaultGamesDir];
    if (this.options.gamesDirs) {
    	if ('string' === typeof this.options.gamesDirs) {
    		this.gamesDirs.push(this.options.gamesDirs);
    	}
    	else if (J.isArray(this.options.gamesDirs)) {
    		this.gamesDirs = this.gamesDirs.concat(this.options.gamesDirs);
    	}
    	else {
    		console.log('Invalid option found for gamesDirs');
    	}
    }
    
    // configure server
    try {
    	var conf_server = require('../conf/servernode.js');
        this.configure(conf_server);
    }
    catch(e) {
    	console.log('An error was raised while loading the configuration files of nodeGame-server.');
    	console.log(e);
    	throw new Error(e);
    }   
    
    this.listen();

    this.loadGames();
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
    
    app.listen(this.port);
    this.server = socket_io.listen(app);
    
    try {
    	var http_conf = require('../conf/http.js');
        this.configureHTTP(http_conf);
    }
    catch(e) {
    	console.log('An error was raised while loading the configuration files of Express server.');
    	console.log(e);
    	throw new Error(e);
    }
    
    try { 
        var sio_conf = require('../conf/sio.js');
        this.configureSIO(sio_conf);
    }
    catch(e) {
    	console.log('An error was raised while loading the configuration files of Socket.io app.');
    	console.log(e);
    	throw new Error(e);
    }
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
        console.log('Options are not correctly defined for the channel. Aborting');
        return false;
    }
    
    var cname = options.name;
    // <!-- Some options must not be overwritten -->
    var options = J.extend(this.options, options);
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
    	console.log(e);
    }
    	
    if (!ok) {
        console.log('Channel could not be added: ' + options.name);
        return false;
    }
    
    this.info.channels[cname] = J.merge(options, {open: true});
    
    this.channels.push(channel);
    console.log('Channel added correctly: ' + options.name);

    return channel;
};

ServerNode.prototype.addGameDir = function (gameDir) {
	var that = this;
//	console.log(gameDir);
	fs.readdir(gameDir, function(err, game_files) {
		//console.log(game_files);
		// an error occurred
		if (err) {
			console.log(err);
			throw new Error;
		}
		
		if (J.in_array('package.json', game_files)) {
			var gamePath = path.resolve(gameDir + '/package.json');
			that.addGame(gamePath, gameDir);
		
		} else {
			console.log('No package.json file found in ' + gameDir);
		}
	});
};

ServerNode.prototype.addGame = function(game, gameDir) {
	if (!game) {
		console.log('Cannot add empty game');
		return false;
	}
	var gamePath = '';
	// Try to require it
	if ('string' === typeof game) {
		gamePath = game;
		//console.log(gamePath);
		try {
			game = require(gamePath);
		}
		catch(e) {
			console.log('An error occurred while parsing ' + gamePath);
			var error = new Error(e);
			console.log(error);
			return false;
		}
	}
	// Parses it
	if ('object' !== typeof game) {
		console.log('Could not parse game ' + game);
		return false;
	}
	// Check name
	if (!game.name) {
		console.log('Cannot add a game without name');
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
	
	console.log('New game added. ' + game.name + ': ' + gamePath);
	
	return true;
}


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
        console.log('Options are not correctly defined for the waiting room. Aborting');
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
//        console.log('Channel added correctly: ' + options.name);
//    }
//    else {
//        console.log('Channel could not be added: ' + options.name);
//    }
// --!>    
    
    return wroom;
};


/**
 * ### ServerNode.loadGames
 * 
 * Loads the games from the file systems
 * 
 */
ServerNode.prototype.loadGames = function () {
	console.log('nodeGame: Loading games...');
	var that = this;
	// scan
	var games  = [];
	if (!this.gamesDirs || !this.gamesDirs.length) {
		return games;
	}
	
	
	J.each(this.gamesDirs, function(dir){
		if (!path.existsSync(dir)) {
			console.log('Game directory not found: ' + dir);
			return;
		}
			
		fs.readdir(dir, function(err, files){
			if (err) {
				console.log(err);
				throw new Error;
			}
			if (dir.substr(-1) !== '/') {
				dir+= '/';
			}
			J.each(files, function (game) {
				var gameDir = dir + game;
				//console.log(gameDir);
				// get file stats
				fs.stat(gameDir, function (err, stats) {

					// an error occurred
					if (err) {
						console.log(err);
						throw new Error;
					}

					// it is a folder
					if (!stats.isDirectory()) return;
						
					that.addGameDir(gameDir);
						
						//console.log(game_files);
//						if (J.in_array('package.json', game_files)) {
//							var gamePath = path.resolve(gameDir + '/package.json');
//							that.addGame();
//							
//							fs.stat(gameDir + '/server', function (err, stats) {
//
//								// an error occurred
//								if (err) {
////									console.log('server directory not found or not readable: ' + gameDir + '/server');
////									console.log(err);
////									throw new Error;
//									return;
//								}
//								
//								// it is a folder
//								if (!stats.isDirectory()) return;
//									
//								doesFileExists(gameDir + '/server/http.js', function(){
//									
//								});
									
//							});
//						}
						
					
				});
				
			});
			
		});
	});

};

/**
 * ## ServerNode.configureHTTP
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
		console.log('configureHTTP requires a valid callback function as parameter.');
		return false;
	}
	return func(app, this);
};

/**
 * ## ServerNode.configureSIO
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
		console.log('configureSIO requires a valid callback function as parameter.');
		return false;
	}
	return func(this.server, this);
};

/**
 * ## ServerNode.configure
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
		console.log('configure requires a callable function as parameter.');
		return false;
	}
	return func(this);
};

// ## ServerNode helper functions

/**
 * ### doesFileExists
 * 
 * Checks whether a file exists under the given path
 * and executes the callback with a boolean parameter
 * 
 * @param {string} path The path to verify
 * @param {object} callback The callback function
 * 
 */
var doesFileExists = function (path, callback) {	
    fs.stat(path, function (err, stats) { 
        callback((err) ? false : true);
    });
};

/**
 * ### configureMe
 * 
 * Configures a generic socket.io-like object.
 * 
 * Takes in input a configuration object whose property names
 * are from the set ['set', 'enable', 'disable'] and executes
 * the appropriate function on the first parameter. 
 * 
 * @param {object} obj The object to configure 
 * @param {object} options The object containing the configuration 
 * 
 * @see https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
 */
var configureMe = function (obj, options) {
    if (!options || !obj) return;
    
    for (var i in options) {
        if (options.hasOwnProperty(i)) {
            if (i === 'set') {
                for (var j in options[i]) {
                    if (options[i].hasOwnProperty(j)) {
                        obj.set(j, options[i][j]);
                    }
                }
            }
            else if (i === 'enable') {
                obj.enable(options[i]);
            }
            else if (i === 'disable') {
                obj.disable(options[i]);
            }
        }
    }
};
