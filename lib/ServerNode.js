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
 * ## ServerNode constructor
 *
 * Creates a new ServerNode instance.
 *
 * @param {object} options The configuration object
 */
function ServerNode(options) {

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
     * ## ServerNode.debug
     *
     * If TRUE, errors will be thrown, otherwise caught and logged.
     */
    this.debug = false;

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

    // Loading configurations.
    this.init(options || {});
}

//## ServerNode methods

/**
 * ## ServerNode.init
 *
 * Loads all configuration options, start error manager, and loads games.
 *
 * @param {object} Optional. Additional options passed overriding defaults.
 *
 * @see ServerNode.loadGames
 */
ServerNode.prototype.init = function(options) {
    var that;

    // Loading default config files.
    this.logger.info('ServerNode.init: loading default configuration files.');
    this.loadConfFile(this.defaultConfDir + '/loggers.js', 
                      this.configureLoggers);
    this.logger = winston.loggers.get('servernode');
    this.loadConfDir(this.defaultConfDir, {loggers: false});

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
        this.logger.info('ServerNode.init: loading user configuration files.');
        // We load the loggers configuration file first, so that
        //  the the output is nicely formatted.
        this.loadConfFile(options.confDir + '/loggers.js', 
                          this.configureLoggers);
        this.logger = winston.loggers.get('servernode');
        this.loadConfDir(options.confDir, {loggers: false});
    }

    this.logger.info('ServerNode.init: starting HTTP server.');
    http.listen(this.port);

    // Mix in options with configuration files.
    this.logger.info('ServerNode: loading in-line options.');
    if (options.loggers) this.configureLoggers(options.loggers);
    if (options.servernode) this.configure(options.servernode);
    if (options.http) this.configureHTTP(options.http);
    if (options.sio) this.configureSIO(options.sio);

    // Start error manager.
    this.logger.info('ServerNode.init: starting error manager.');
    that = this;
    process.on('uncaughtException', function(err) {
        that.logger.error('Caught exception: ' + err);
        if (that.debug) {
            throw err;
        }
    });

    // Loading games.
    this.logger.info('ServerNode.init: loading games.');
    this.loadGames(this.gamesDirs);

    // Done.
    this.logger.info('ServerNode.init: up and running on port ' + this.port + '.');
};

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
        this.logger.error('ServerNode.addChannel: Maximum number of channels ' +
                          'already reached: ' + this.maxChannels);
        return false;
    }

    cname = options.name;
    channelOptions = J.merge(this.defaults.channel, options);

    if (cname) {
        channelOptions.name = cname;
    }
    
    // Creating the channel.
    channel = new ServerChannel(this.sio, channelOptions, this);
    ok = channel.listen();

    if (!ok) {
        this.logger.error('ServerNode.addChannel: channel could not be added: ' +
                          channelOptions.name);
        return false;
    }

    this.info.channels[cname] = J.merge(channelOptions, {open: true});

    this.channels[cname] = channel;
    this.logger.info('ServerNode.addChannel: channel added correctly: ' +
                     channelOptions.name);

    return channel;
};

/**
 * ### ServerNode.loadGames
 *
 * Loads the games from the file systems
 *
 * Scans the directories listed in this.gameDirs, looking for
 * package.json files.
 *
 * @param {array} paths Array of paths to scan
 *
 * @see ServerNode.addGame
 */
ServerNode.prototype.loadGames = function(paths) {
    var that;
    if (!J.isArray(paths)) {
        throw new TypeError('ServerNode.loadGames: paths must be array.');
    }
    that = this;

    // Here we scan folders that contains games directories.
    J.each(paths, function(dir){
        if (!J.existsSync(dir)) {
            that.logger.error('ServerNode.loadGames: game directory not ' +
                              'found: ' + dir);
            return;
        }
        // Go inside, and check every file to see if it is a game directory.
        fs.readdir(dir, function(err, files){
            if (err) {
                that.logger.error('ServerNode.loadGames: an error occurred ' +
                                 'while trying to read ' + dir);
                throw err;
            }
            if (dir.substr(-1) !== '/') {
                dir += '/';
            }
            // Check every file.
            J.each(files, function(game) {
                var gameDir = dir + game;

                // Get file stats.
                fs.stat(gameDir, function(err, stats) {
                    
                    if (err) {
                        that.logger.error('ServerNode.loadGames: an error ' +
                                 'occurred while trying to read ' + dir);
                        return;
                    }

                    // It is a folder, try to add it as a game.
                    if (stats.isDirectory()) {
                        that.addGameDir(gameDir);
                    }
                });

            });

        });
    });

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
    if ('string' !== typeof gameDir) {
        throw new TypeError('ServerNode.addGameDir: gameDir must be string.');
    }
    fs.readdir(gameDir, function(err, game_files) {
        var gamePath;

        if (err) {
            that.logger.error('ServerNode.addGameDir: an error occurred.');
            throw new Error(err);
        }

        if (J.in_array('package.json', game_files)) {
            gamePath = path.resolve(gameDir + '/package.json');
            that.addGame(gamePath, gameDir);
        } 
        else {
            that.logger.warn('ServerNode.addGameDir: no package.json file ' +
                             'found in ' + gameDir);
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
    var gamePath, i;
    if ('string' !== typeof game && 'object' !== typeof game) {
        throw new TypeError('ServerNode.addGame: game must be string or ' +
                            'object.');
    }
    gamePath = '';
    // If string, try to require it.
    if ('string' === typeof game) {
        gamePath = game;
     
        try {
            game = require(gamePath);
        }
        catch(e) {
            this.logger.error('ServerNode.addGame: an error occurred while ' +
                              'trying to parse ' + gamePath);
            throw e;
        }
    }
    // Check name.
    if ('undefined' === typeof game.name || game.name === null) {
        throw new Error('ServerNode.addGame: cannot add game without name.');
    }

    gameDir = gameDir || path.dirname(gamePath);

    // Adding game info to global info object.
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
        for (i = 0; i < game.alias.length; i++) {
            this.info.games[game.alias[i]] = this.info.games[game.name];
        }
    }

    // TODO: maybe this is to remove. A game should be able to modify
    // only its own params.
    this.loadConfDir(gameDir + '/server/conf');

    this.logger.info('ServerNode: new game added. ' + game.name +
                     ': ' + gamePath);
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
 * ### ServerNode.loadConfDir
 *
 * Scan a directory for configuration files and runs them
 *
 * Looks for the following files:
 *
 * - `servernode.js` configuring the ServerNode object
 * - `http.js` configuring the HTTP Express server
 * - `sio.js` configuring the Socket.io server
 * - 'loggers.js'cconfiguring the Wiston logging service
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
 * @see ServerNode.loadConfFile
 * @see ServerNode.configure
 * @see ServerNode.configureHTTP
 * @see ServerNode.confiureSIO
 * @see ServerNode.confiureLoggers
 */
ServerNode.prototype.loadConfDir = function(dir, mask, force) {
    var localMask, file;

    if ('string' !== typeof dir) {
        throw new TypeError('ServerNode.loadConfDir: dir must be string.');
    }
    if (mask && 'object' !== typeof mask) {
        throw new TypeError('ServerNode.loadConfDir: mask must be object or ' +
                            'undefined.');
    }

    force = force || false;
    dir = path.resolve(dir);

    if (!force && this.scannedGamesDirs[dir]) {
        this.logger.warn('Duplicated conf directory found. Use the "force" ' +
                         'flag to scan it again: ' + dir);
        return;
    }

    localMask = {
        loggers: true,
        servernode: true,
        http: true,
        sio: true,
    };

    mask = (mask) ? J.merge(localMask, mask) : localMask;

    if (mask.loggers) {
        file = dir + '/loggers.js';
        if (J.existsSync(file)) {
            this.loadConfFile(file, this.configureLoggers);
        }
    }
    if (mask.servernode) {
        file = dir + '/servernode.js';
        if (J.existsSync(file)) {
            this.loadConfFile(file, this.configure);
        }
    }
    if (mask.http) {
        file = dir + '/http.js';
        if (J.existsSync(file)) {
            this.loadConfFile(file, this.configureHTTP);
        }
    }
    if (mask.sio) {
        file = dir + '/sio.js';
        if (J.existsSync(file)) {
            this.loadConfFile(file, this.configureSIO);
        }
    }

    this.scannedGamesDirs[dir] = mask;
};

/**
 * ### ServerNode.loadConfFile
 *
 * Opens a nodeGame configuration file and executes a callback on its export
 *
 * Generic helper function. Requires a callback function as second parameter,
 * that passes the correct objects to the configurator function.
 *
 * Always refer to documentation for the content of the configuration files.
 *
 * @param {string} file The path to the configuration file
 * @param {function} cb The callback function (e.g. ServerNode.configureHTTP) 
 *
 * @see ServerNode.loadConfDir
 * @see ServerNode.configure
 * @see ServerNode.configureHTTP
 * @see ServerNode.confiureSIO
 * @see ServerNode.confiureLoggers
 */
ServerNode.prototype.loadConfFile = function(file, cb) {
    var conf, result;
    
    if ('string' !== typeof file) {
        throw new TypeError('ServerNode.loadConfFile: file must be string.');
    }
    if ('function' !== typeof cb) {
        throw new TypeError('ServerNode.loadConfFile: cb must be function.');
    }
    
    file = path.resolve(file);

    if (!J.existsSync(file)) {
        throw new Error('ServerNode.loadConfFile: conf file not existing ' +
                        'or not readable: ' + file);
    }

    // Requiring configuration function (can throw errors).
    conf = require(file);

    if ('function' !== typeof conf) {
        throw new Error('ServerNode.loadConfFile: conf file dit not export a ' +
                        'function: ' + file);
    }

    // The configuration function is called internally by _cb_ that takes
    // care of passing the right parameters to it.
    result = cb.call(this, conf);

    if (result) {
        this.logger.info('ServerNode.loadConfFile: conf file loaded ' + 
                         'correctly: ' + file);
    }
    else {
        this.logger.warn('ServerNode.loadConfFile: a non-fatal error ' +
                         'occurred while loading conf file: ' + file);
    }
};