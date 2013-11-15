/**
 * # ServerNode
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Creates the server node for nodeGame.
 *
 * Creates an HTTP server, and loads a Socket.io app, and scans the games
 * directories.
 *
 * http://nodegame.org
 * ---
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

var J = require('JSUS').JSUS;

// ### Create Express server
var http = express.createServer();

/**
 * ## ServerNode Constructor
 *
 * Creates a new ServerNode instance.
 *
 * @param {object} options The configuration object
 */
function ServerNode(options) {
    options = options || {};

    /**
     * ## ServerNode.defaultConfDir
     *
     * The directory of execution of the server
     */
    this.rootDir = path.resolve(__dirname, '..');

    /**
     * ## ServerNode.defaultConfDir
     *
     * The directory from which the default configuration files are located 
     *
     * @see ServerNode.rootDir
     */
    this.defaultConfDir = this.rootDir + '/conf';

    // TODO: @deprecated. To remove when ServerNode.startGame is removed
    this.logics = {};

    /**
     * ## ServerNode.channels
     *
     * Object containing all the existing channels indexed by their name
     *
     * @see ServerChannel
     */
    this.channels = {};

    /**
     * ## ServerNode.info
     *
     * Object containing global information about games and channels
     *
     * @see ServerNode.loadGames
     */
    this.info = {
        channels: {},
        games: {}
    };
    
    /**
     * ## ServerNode.defaults
     *
     * Defaults settings for the server and the channels 
     *
     * Will be populated by the configure function.
     */
    this.defaults = {};

    /**
     * ## ServerNode.gamesDirs
     *
     * Array of directories that will be sequentially scanned for games 
     */    
    this.gamesDirs = [];

    /**
     * ## ServerNode.scannedGamesDirs
     *
     * Keeps tracks of games directories already scanned and of the outcome
     */
    this.scannedGamesDirs = {};

    /**
     * ## ServerNode.logger
     *
     * Default logger before any configuration is loaded.
     */
    this.logger = winston;

    /**
     * ## ServerNode.sio
     *
     * The Socket.IO app of the server. 
     *
     * The app is shared with all the channels.
     */
    this.sio = socket_io.listen(http);

    // see http://nodejs.org/docs/latest/api/events.html#events_emitter_setmaxlisteners_n
    this.sio.sockets.setMaxListeners(0);

    // Loading default config files
    this.logger.info('loading default configuration files.');
    this.loadConfFile(this.defaultConfDir + '/loggers.js', this.configureLoggers);
    this.logger = winston.loggers.get('servernode');
    this.loadConfDir(this.defaultConfDir, {loggers: false});
    this.logger.info('done.');

    // Setting the log directory as specified by the user
    // this is not working, because one file is still saved under the old location and
    // this creates a crash at the 10th restart of the server. Also this does not redirect
    // the stream for channel and messages.
    //    if (options.logDir) {
    //          if (this.logger.transports && this.logger.transports.file) {
    //                  this.logger.transports.file.dirname = path.resolve(options.logDir);
    //          }
    //    }

    // Loading user configuration files
    if (options.confDir) {
        this.logger.info('loading user configuration files.');
        // We load the loggers configuration file first, so that the the output is
        // nicely formatted
        this.loadConfFile(options.confDir + '/loggers.js', this.configureLoggers);
        this.logger = winston.loggers.get('servernode');
        this.loadConfDir(options.confDir, {loggers: false});
        this.logger.info('done.');
    }


    this.logger.info('starting HTTP server.');
    http.listen(this.port);
    this.logger.info('HTTP server started.');

    // ### Mix in options with configuration files
    this.logger.info('loading in-line options.');
    if (options.loggers) this.configureLoggers(options.loggers);
    if (options.servernode) this.configure(options.servernode);
    if (options.http) this.configureHTTP(options.http);
    if (options.sio) this.configureSIO(options.sio);
    this.logger.info('done.');

    // ### Loading games
    this.logger.info('loading games.');
    this.loadGames(this.gamesDirs);
    this.logger.info('nodegame-server up and running on port ' + this.port);
}

//## ServerNode methods

/**
 * ### ServerNode.addChannel
 *
 * Creates a nodeGame channel with the specified configuration.
 * If the configuration object is missing, channel creation is aborted
 *
 * @param {object} options The object containing the custom settings
 * @return {ServerChannel|boolean} channel The nodeGame channel,
 *   or FALSE if an error occurs
 */
ServerNode.prototype.addChannel = function(options) {
    var cname, channelOptions, channel, ok;

    if ('object' !== typeof options) {
        throw new TypeError('ServerNode.addChannel: options must be object.');
    }

    if (this.maxChannels && J.size(this.channels) >= this.maxChannels) {
        this.logger.error('Maximum number of channels already reached: ' +
                          this.maxChannels);
        return false;
    }

    cname = options.name;
    channelOptions = J.merge(this.defaults.channel, options);

    if (cname) {
        channelOptions.name = cname;
    }

    try {
        channel = new ServerChannel(this.sio, channelOptions, this);
        ok = channel.listen();
    }
    catch(e) {
        this.logger.error(e);
    }

    if (!ok) {
        this.logger.error('Channel could not be added: ' + channelOptions.name);
        return false;
    }

    this.info.channels[cname] = J.merge(channelOptions, {open: true});

    this.channels[cname] = channel;
    this.logger.info('Channel added correctly: ' + channelOptions.name);

    return channel;
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
ServerNode.prototype.addGameDir = function(gameDir) {
    var that = this;
    //  this.logger.log(gameDir);
    fs.readdir(gameDir, function(err, game_files) {
        // An error occurred.
        if (err) {
            that.logger.error(err);
            throw new Error();
        }

        if (J.in_array('package.json', game_files)) {
            var gamePath = path.resolve(gameDir + '/package.json');
            that.addGame(gamePath, gameDir);

        } else {
            that.logger.warn('No package.json file found in ' + gameDir);
        }
    });
};

/**
 * ### ServerNode.addGame
 *
 * Adds a new game to the global collection `info.games`
 *
 * If a configuration directory is found inside the game directory,
 * `loadConfDir` is invoked.
 *
 * @param {object|string} game The path to a package.json file,
 *   or its content as loaded from `require`
 * @param {string} gameDir Optional. The directory containing the game
 *
 * @see ServerNode.loadConfDir
 *
 * TODO: a game should not be able to change global parameters of the server
 */
ServerNode.prototype.addGame = function(game, gameDir) {
    if (!game) {
        this.logger.error('Cannot add empty game');
        return false;
    }
    var gamePath = '';
    // Try to require it
    if ('string' === typeof game) {
        gamePath = game;
        //this.logger.log(gamePath);
        try {
            game = require(gamePath);
        }
        catch(e) {
            this.logger.error('An error occurred while parsing ' + gamePath);
            var error = new Error(e);
            this.logger.error(error);
            return false;
        }
    }
    // Parses it
    if ('object' !== typeof game) {
        this.logger.error('Could not parse game ' + game);
        return false;
    }
    // Check name
    if (!game.name) {
        this.logger.error('Cannot add a game without name');
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

    this.logger.info('New game added. ' + game.name + ': ' + gamePath);

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
 * @param {string} paths Array of paths to scan
 *
 * @see ServerNode.addGame
 *
 */
ServerNode.prototype.loadGames = function(paths) {
    if (!paths || !paths.length) return false;
    var that = this;

    J.each(paths, function(dir){
        if (!J.existsSync(dir)) {
            that.logger.error('Game directory not found: ' + dir);
            return;
        }

        fs.readdir(dir, function(err, files){
            if (err) {
                that.logger.error(err);
                throw new Error();
            }
            if (dir.substr(-1) !== '/') {
                dir+= '/';
            }
            J.each(files, function(game) {
                var gameDir = dir + game;
                //that.logger.log(gameDir);
                // get file stats
                fs.stat(gameDir, function(err, stats) {

                    // an error occurred
                    if (err) {
                        that.logger.error(err);
                        throw new Error();
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
 * ### ServerNode.startGame
 *
 * Initializes and starts a new game logic on the specified channel
 *
 * @param {string} channel The name of the channel
 * @param {object} game A game object
 * @param {object} options Optional. A configuration object to pass to node.setup
 *
 * @see ServerChannel.startGame
 * @see node.Game
 * @see node.setup
 *
 * @TODO: remove and leave only ServerChannel.startGame. this.logics must be removed from other places too
 */
ServerNode.prototype.startGame = function(channel, game, options) {
    if (!channel || !this.channels[channel]) {
        this.logger.error('cannot start game. Invalid channel.');
        return false;
    }
    if (!game) {
        this.logger.error('cannot start game. Invalid game.');
        return false;
    }

    options = options || {};
    var name = options.name || channel,
    logic = this.channels[channel].startGame(game, options);

    if (logic) {
        this.logics[name] = logic;
    }
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
 * @param {function} func The function that will configure the express server
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configureHTTP = function(func) {
    return func(http, this);
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
 * @param {function} func The function that will configure the socket.io app
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configureSIO = function(func) {
    return func(this.sio, this);
};

/**
 * ### ServerNode.configureLoggers
 *
 * Configure ServerNode hook
 *
 * Accepts a callback function to receives the current ServerNode
 * instance as first parameter. The callback function should
 * return TRUE if configuration is successful.
 *
 * @param {function} func The function that will configure the socket.io app
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configureLoggers = function(func) {
    return func(winston.loggers);
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
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configure = function(func) {
    return func(this);
};


/**
 * ### ServerNode.loadConfFile
 *
 * Opens a nodeGame configuration file and executes a callback on its export
 *
 * Generic helper function. Requires a callback function as second parameter,
 * that passes the correct objects to the configurator function.
 *
 * Always refer to documentation for the content of the configuration files
 *
 * @param {string} file The path to the configuration file
 * @param {function} cb The matching callback function
 *
 * @see ServerNode.configure
 * @see ServerNode.configureHTTP
 * @see ServerNode.confiureSIO
 * @see ServerNode.confiureLoggers
 *
 */
ServerNode.prototype.loadConfFile = function(file, cb) {
    var conf, result;

    if (!file || !cb) return false;
    file = path.resolve(file);

    if (!J.existsSync(file)) {
        this.logger.silly('An error has occurred. Could not open conf file: ' +
                          file);
        return false;
    }

    //try {
    conf = require(file);

    if ('function' !== typeof conf) {
        this.logger.warn('No valid configurator function found in ' + file);
        return false;
    }

    result = cb.call(this, conf);
    if (result) {
        this.logger.info('Conf file loaded correctly: ' + file);
    }
    else {
        this.logger.warn('A non-fatal error occurred while loading configuration file: ' + file);
    }
    //    }
    //    catch(e) {
    //          this.logger.error('A fatal error was raised while loading configuration file: ' + file);
    //          this.logger.error(e);
    //          throw new Error(e);
    //    }

};


/**
 * ### ServerNode.loadConfDir
 *
 * Scan a directory for configuration files and runs them
 *
 * Looks for the following files:
 *
 *  - `servernode.js` configuring the ServerNode object
 *  - `http.js` configuring the HTTP Express server
 *  - `sio.js` configuring the Socket.io server
 *  - 'loggers.js'cconfiguring the Wiston logging service
 *
 * For documentation refer to the comments  inside each configuration file.
 *
 * The method keeps track of which directories are already been scanned
 * and they will not scanned again, unless the force flag is set to TRUE.
 *
 * @param {string} dir The path to the configuration directory
 * @param {mask} object Optional. An object defining which configuration
 *   files are allowed to be loaded. Defaults, all files are loaded.
 * @param {force} Optional. Force to rescan a directory even if this was
 *    already loaded. Defaults, FALSE.
 *
 * @see ServerNode.configure
 * @see ServerNode.configureHTTP
 * @see ServerNode.confiureSIO
 */
ServerNode.prototype.loadConfDir = function(dir, mask, force) {
    if (!dir) return false;
    force = force || false;
    dir = path.resolve(dir);

    if (!force && this.scannedGamesDirs[dir]) {
        this.logger.warn('Duplicated conf directory found. Use the "force" ' +
                         'flag to scan it again: ' + dir);
        return;
    }

    var localMask = {
        loggers: true,
        servernode: true,
        http: true,
        sio: true,
    };

    mask = (mask) ? J.merge(localMask, mask)
        : localMask;

    if (mask.loggers) {
        this.loadConfFile(dir + '/loggers.js', this.configureLoggers);
    }
    if (mask.servernode) {
        this.loadConfFile(dir + '/servernode.js', this.configure);
    }
    if (mask.http) {
        this.loadConfFile(dir + '/http.js', this.configureHTTP);
    }
    if (mask.sio) {
        this.loadConfFile(dir + '/sio.js', this.configureSIO);
    }

    this.scannedGamesDirs[dir] = mask;

};