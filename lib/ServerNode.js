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


// ### Configure Application 

var rootDir = path.resolve(__dirname, '..'),
	defaultGamesDir = rootDir + '/games/';

var app = express.createServer();

app.configure(function(){
    app.set('views', rootDir + '/views');
    app.set('view engine', 'jade');
    app.use(express.static(rootDir + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

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
    
    this.gamesDirs = [defaultGamesDir];
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
    
    
    
    this.loadGames();
    this.listen();
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
    
    this.configureHTTP(this.options.http);
    this.configureIO(this.options.io);
};



/**
 * ### ServerNode.configureHTTP
 * 
 * Defines standard routes for the HTTP server
 * 
 * @param {object} options The object containing the custom settings
 */
ServerNode.prototype.configureHTTP = function (options) {

	var that = this;
	
//	app.all('*', requireAuthentication, loadUser);

    app.get('/', function(req, res) {
    	console.log(req.query);
    	if (J.isEmpty(req.query)) {
    		res.render('index', {
                title: 'Yay! Your nodeGame server is running.'
            });
    	}
        
    	if (!req.query.q) {
    		res.send('Query must start with q=XXX');
    	}
    	var q = req.query.q;
    	
    	if (q === "info") {
    		//console.log(that.info);
    		res.send(that.info);
    	}
    	
    	if (q === "channels") {
    		//console.log(that.info);
    		res.send(that.info.channels);
    	}
    	
    	if (q === "games") {
    		//console.log(that.info);
    		res.send(that.info.games);
    	}
    	
    	res.send('Unknown query received.');
    });
    
    app.get('/redirect', function(req, res) {
    	var body;
    	var url = 'http://www.google.com';
    	
    	res.redirect(url);

    });

    app.get('/test', function(req, res) {
    	var body;
    	var url = 'http://www.google.com';
    	
    	res.redirect(url);

    });
    
    app.get('/:game/*', function(req, res){

// In the following order:
//    	
//	1. Checks if file exists the folder the scientist has created (EXTERNAL)
//	2. Check if file exists in the nodegame-server folder (INTERNAL)

        if(req.params[0].match(/server\//)){
            res.json({error: 'access denied'}, 403);
            
        } else {
            var externalFilePath = rootDir.replace(/node\_modules.+/i, '') + 'games/' + req.params.game + '/' + req.params[0];

            doesFileExists(externalFilePath, function(exists){
                if(exists){
                    res.sendfile(externalFilePath);
                } else {
                    var includedFilePath = rootDir + '/games/' + req.params.game + '/' + req.params[0];
                    res.sendfile(includedFilePath);
                }
            });
        }
    });
    
    configureMe(app, options);

};

/**
 * ### ServerNode.configureIO
 * 
 * Configures the internal socket io server with the default
 * settings, and then adds user defined options
 *  
 * @param {object} options The object containing the custom settings
 */
ServerNode.prototype.configureIO = function (options) {
    this.server.enable('browser client etag');
    this.server.set('log level', -1);
    configureMe(this.server, options);
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

ServerNode.prototype.addGame = function(game) {
	if (!game) {
		console.log('Cannot add empty game');
		return false;
	}
	var gamePath = '';
	// Try to require it
	if ('string' === typeof game) {
		gamePath = game;
		try {
			game = require(gamePath);
		}
		catch(e) {
			console.log('An error occurred while parsing ' + gamePath);
			console.log(e);
			return false;
		}
	}
	// Parses it
	if ('object' !== typeof game) {
		console.log('Cannot parse game');
		return false;
	}
	// Check name
	if (!game.name) {
		console.log('Cannot add a game without name');
		return false;
	}
	
	this.info.games[game.name] = {
			path: gamePath,
			status: 0,
			game: game,
	};
	
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
			console.log('Game directory not found: ' + dir) {
				continue;
			}
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
				
					fs.readdir(gameDir, function(err, game_files) {
						//console.log(game_files);
						// an error occurred
						if (err) {
							console.log(err);
							throw new Error;
						}
						
						//console.log(game_files);
						if (J.in_array('package.json', game_files)) {
							var gamePath = path.resolve(gameDir + '/package.json');
							that.addGame(gamePath);
						}
					});
					
				});
				
			});
			
		});
	});

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
	
}

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
