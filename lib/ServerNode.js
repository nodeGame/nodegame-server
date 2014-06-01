/**
 * # ServerNode
 * Copyright(c) 2014 Stefano Balietti
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
var GameStage = require('nodegame-client').GameStage;

var serverVersionObj;

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
     * ## ServerNode.version
     *
     * The software version of the server as a string
     */
    this.version = require(this.rootDir + '/package.json').version;

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
     * Object containing references to all the existing channels
     *
     * @see ServerChannel
     */
    this.channels = {};

    /**
     * ## ServerNode.rooms
     *
     * Object containing references to all existing game rooms in all channels
     *
     * @see GameRoom
     */
    this.rooms = {};

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
     * ## ServerNode.asyncQueue
     *
     * Object containing callbacks to be executed if no operation is in progress
     */
    this.asyncQueue = J.getQueue();

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

    // Transform server version string to object (used to check dependencies).
    serverVersionObj = version2GameStage(this.version);

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
        // the the output is nicely formatted.
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
        that.logger.error('ServerNode caught an exception: ' + err);
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
 * If the configuration object is missing or invalid, channel creation
 * is aborted.
 *
 * @param {object} options The configuration for the channel
 * @return {ServerChannel|boolean} channel The newly created channel, or
 *   FALSE if an error occurs
 *
 * @see ServerChannel
 */
ServerNode.prototype.addChannel = function(options) {
    var cname, channelOptions, channel, ok;

    if ('object' !== typeof options) {
        throw new TypeError('ServerNode.addChannel: options must be object.');
    }

    if ('string' === typeof options.player) {
        options.player = { endpoint: options.player };
    }

    if ('object' !== typeof options.player) {
        throw new TypeError('ServerNode.addChannel: ' +
                            'options.player must be string or object.');
    }

    if ('string' === typeof options.admin) {
        options.admin = { endpoint: options.admin };
    }

    if ('object' !== typeof options.admin) {
        throw new TypeError('ServerNode.addChannel: ' +
                            'options.admin must be string or object.');
    }

    if (this.maxChannels && J.size(this.channels) >= this.maxChannels) {
        this.logger.error('ServerNode.addChannel: Maximum number of channels ' +
                          'already reached: ' + this.maxChannels);
        return false;
    }

    // Pre-parse user defined configuration options.
    channelOptions = ServerChannel.parseOptions(J.clone(options));
    // Merge user-defined options with defaults.
    channelOptions = J.merge(this.defaults.channel, channelOptions);


    if ('string' !== typeof channelOptions.name) {
        throw new Error('ServerNode.addChannel: channel name must be string.');
    }

    // TODO: better check the merged object.

    cname = channelOptions.name;

    // Creating the channel.
    channel = new ServerChannel(channelOptions, this, this.sio);
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
    J.each(paths, function(dir) {
        var qKey;
        if (!J.existsSync(dir)) {
            that.logger.error('ServerNode.loadGames: game directory not ' +
                              'found: ' + dir);
            return;
        }
        // Register operation in the queue.
        qKey = that.asyncQueue.add(dir);
        // Go inside, and check every file to see if it is a game directory.
        fs.readdir(dir, function(err, files) {
            if (err) {
                // Remove async operation from queue.
                that.asyncQueue.remove(qKey);
                that.logger.error('ServerNode.loadGames: an error occurred ' +
                                 'while trying to read ' + dir);
                throw err;
            }
            if (dir.substr(-1) !== '/') {
                dir += '/';
            }
            // Check every file.
            J.each(files, function(game) {
                var gameDir, qKeyGame;
                gameDir = dir + game;
                // Register operation in the queue.
                qKeyGame = that.asyncQueue.add(gameDir);
                // Get file stats.
                fs.stat(gameDir, function(err, stats) {
                    if (err) {
                        that.asyncQueue.remove(qKeyGame);
                        that.logger.error('ServerNode.loadGames: an error ' +
                                 'occurred while trying to read ' + dir);
                        return;
                    }

                    // It is a folder, try to add it as a game.
                    if (stats.isDirectory()) {
                        that.addGameDir(gameDir);
                    }
                    that.asyncQueue.remove(qKeyGame);
                });
            });
            // Remove async operation from queue.
            that.asyncQueue.remove(qKey);
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
    var gamePath, gameSettingsPath, gameSettingsObj, res;
    if ('string' !== typeof gameDir) {
        throw new TypeError('ServerNode.addGameDir: gameDir must be string.');
    }

    gameDir = path.resolve(gameDir) + '/';

    // Reading package.json
    gamePath = gameDir + 'package.json';
    try {
        game = require(gamePath);
    }
    catch(e) {
        this.logger.error('ServerNode.addGameDir: an error occurred while ' +
                          'trying to read ' + gamePath + '.');
        throw e;
    }

    // Reading game.settings.js
    gameSettingsPath = gameDir + 'server/game.settings.js';
    try {
        gameSettings = require(gameSettingsPath);
    }
    catch(e) {
        this.logger.error('ServerNode.addGameDir: an error occurred while ' +
                          'trying to read ' + gameSettingsPath + '.');
        //throw e;
        return
    }
    gameSettings = this.parseGameSettings(gameSettings);

    if (!gameSettings) {
        throw new Error('SeverNode.addGameDir: invalid settings file: ' +
                        gameSettingsPath + '.');
    }

    // Ready to add the game.
    this.addGame(game, gameSettings, gameDir);
};

/**
 * ### ServerNode.addGame
 *
 * Adds a new game to the global collection `info.games`
 *
 * The version of ServerNode is compared against the information in
 * _gameInfo.engines.nodegame_, if found.
 *
 * @param {object} gameInfo A game descriptor, usually from package.json
 * @param {object} treatments Game treatments, usually from game.settings.js
 * @param {string} gameDir The root directory of the game (with trailing slash)
 *
 * @see ServerNode.addGameDir
 * @see ServerNode.parseGameSettings
 */
ServerNode.prototype.addGame = function(gameInfo, treatments, gameDir) {
    var gamePath, reqFail, req;
    var gameLogicPath, gameLogic, gameClientPath, gameClient;
    var treatment, i, len;

    if ('object' !== typeof gameInfo) {
        throw new TypeError('ServerNode.addGame: gameInfo must be object.');
    }
    if ('object' !== typeof treatments) {
        throw new TypeError('ServerNode.addGame: treatments must be object.');
    }
    if ('string' !== typeof gameDir) {
        throw new TypeError('ServerNode.addGame: gameDir must be string.');
    }

    // Check name.
    if ('string' !== typeof gameInfo.name) {
        throw new Error('ServerNode.addGame: missing or invalid game name: ' +
                        gameDir + '.');
    }

    // Checking nodeGame server version requirement.
    if (gameInfo.engines && gameInfo.engines.nodegame) {

        req = gameInfo.engines.nodegame;

        // * skips the check.
        if (req.trim() !== '*') {

            // Trick: we compare version numbers using the GameStage class.
            if (req.indexOf(">=") !== -1) {
                req = req.split(">=")[1];
                req = version2GameStage(req);
                reqFail = !req || GameStage.compare(req, serverVersionObj) > 0;
            }
            else if (req.indexOf(">") !== -1) {
                req = req.split(">")[1];
                req = version2GameStage(req);
                reqFail = !req || GameStage.compare(req, serverVersionObj) > -1;
            }
            else {
                req = version2GameStage(req);
                reqFail = !req || GameStage.compare(req, serverVersionObj) !== 0;
            }

            if (reqFail) {
                throw new Error('ServerNode.addGame: game ' + gameInfo.name + ' ' +
                                'requires nodeGame version ' +
                                gameInfo.engines.nodegame  + ' ' +
                                'but found ' + this.version + '.');
            }
        }
    }

    // Require Logic and Client files for each treatment, if specified.
    for (t in treatments) {
        if  (treatments.hasOwnProperty(t)) {
            treatment = treatments[t];

            // Logic.
            if (treatment.logicPath) {
                if ('string' !== typeof treatment.logicPath) {
                    throw new TypeError('ServerNode.addGame: ' +
                                        'game ' + gameInfo.name + ' ' +
                                        'treatment ' + t + ': logicPath ' +
                                        'must be string.');
                }


                gameLogicPath = gameDir + 'server/' + treatment.logicPath;
                try {
                    gameLogic = require(gameLogicPath);
                }
                catch(e) {
                    this.logger.error('ServerNode.addGame: an error occurred ' +
                                      'while trying to read ' +
                                      gameLogicPath + '.');
                    throw e;
                }
                treatment.logicPath = gameLogicPath;
            }

            // Client.
            if (treatment.clientPath) {
                if ('string' !== typeof treatment.clientPath) {
                    throw new TypeError('ServerNode.addGame: ' +
                                        'game ' + gameInfo.name + ' ' +
                                        'treatment ' + t + ': clientPath ' +
                                        'must be string.');
                }

                gameClientPath = gameDir + 'server/' + treatment.clientPath;
                try {
                    gameClient = require(gameClientPath);
                }
                catch(e) {
                    this.logger.error('ServerNode.addGame: an error occurred ' +
                                      'while trying to read ' +
                                      gameClientPath + '.');
                    throw e;
                }
                treatment.clientPath = gameClientPath;
            }
        }

    }

    // Adding game info to global info object.
    this.info.games[gameInfo.name] = {
        dir: gameDir,
        info: gameInfo,
        treatments: treatments
    };
    this.logger.info('ServerNode.addGame: ' + gameInfo.name + ': ' + gameDir);

    // Adding game alias.
    if (gameInfo.alias) {
        if ('string' === typeof gameInfo.alias) {
            gameInfo.alias = [gameInfo.alias];
        }
        if (!J.isArray(gameInfo.alias)) {
             throw new TypeError('ServerNode.addGame: game.alias ' +
                                 'must be either string or array.');
        }

        i = -1, len = gameInfo.alias.length;
        for ( ; ++i < len ; ) {
            if ('string' !== typeof game.alias[i]) {
                throw new TypeError('ServerNode.addGame: alias must be string.');
            }
            this.info.games[gameInfo.alias[i]] = this.info.games[gameInfo.name];
        }
    }
};

/**
 * ### ServerNode.parseGameSettings
 *
 * Parses a game setting object and builds a treatments object
 *
 * @param {object} game The path to a package.json file,
 *   or its content as loaded from `require`
 *
 * @see ServerNode.addGame
 */
ServerNode.prototype.parseGameSettings = function(gameSettingsObj) {
    var standard, t, tmp, out;
    if ('object' !== typeof gameSettingsObj) {
        throw new TypeError('ServerNode.parseGameSettings: gameSettingsObj ' +
                            'must be object.');
    }

    out = {};

    if ('undefined' === typeof gameSettingsObj.treatments) {
        out.standard = J.clone(gameSettingsObj);
    }
    else {
        treatments = gameSettingsObj.treatments;
        delete gameSettingsObj.treatments;
        out.standard = J.clone(gameSettingsObj);

        for (t in treatments) {
            if (treatments.hasOwnProperty(t)) {
                tmp = J.clone(gameSettingsObj);
                J.mixout(tmp, treatments[t]);
                out[t] = tmp;
            }
        }
    }
    return out;
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

/**
 * ### ServerNode.getGamesInfo
 *
 * Returns an object containing information about registered games
 *
 * The returned object has the following structure:
 * {
 *   game1: {
 *     name:  game1,
 *     alias: [alias1, alias2, ...],
 *     descr: "Description",
 *     treatments: {
 *       standard: {
 *         option1: ...,
 *         option2: ...
 *       },
 *       customTreatment1: {
 *         option1: ...
 *         option2: ...
 *       },
 *       ...
 *     }
 *   },
 *   game2: { ... },
 *   ...
 * }
 *
 * @param {string} gameName Optional. If set, only info about this game is
 *   returned
 * @return {object} The games info structure. See above for details.
 */
ServerNode.prototype.getGamesInfo = function(gameName) {
    if (gameName && 'string' !== typeof gameName) {
        throw new TypeError('ServerNode.getGamesInfo: gameName must be string.');
    }
    return gameName ? this.info.games[gameName] : this.info.games;
};

/**
 * ### ServerNode.resolveGameDir
 *
 * Returns the absolute path of the specified game or alias
 *
 * @param {string} gameName The requested game name or alias
 * @return {string|null} The absolute path to the game directory,
 *   or NULL if not found
 */
ServerNode.prototype.resolveGameDir = function(gameName) {
    if ('string' !== typeof gameName) {
        throw new TypeError('ServerNode.resolveGameDir: gameName must ' +
                            'be string.');
    }

    return this.info.games[gameName] ? 
        this.info.games[gameName].dir + '/' : null;
};

/**
 * ### ServerNode.ready
 *
 * Executes the specified callback once the server is fully loaded
 *
 * @param {function} cb The callback to execute
 *
 * @see Queue.onReady
 */
ServerNode.prototype.ready = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('ServerNode.ready: cb must be function.');
    }
    this.asyncQueue.onReady(cb);
};

// ## Helper Methods

/**
 * ### version2GameStage
 *
 * Helper function to parse a version string into a GameStage
 *
 * Cannot use GameStage constructor because it does not accept stage = 0
 *
 * @param {string} str The version number to parse
 * @param {object} An object emulating a _GameStage_
 *
 * @see GameStage constructor
 */
function version2GameStage(str) {
    var tokens, stage, step, round;
    var out;
    tokens = str.trim().split('.');
    stage = parseInt(tokens[0], 10);
    if (isNaN(stage)) return false;
    step  = parseInt(tokens[1], 10);
    if (isNaN(step)) return false;
    round = parseInt(tokens[2], 10);
    if (isNaN(round)) return false;
    return {
        stage: stage, step: step, round: round
    }
}


// Probably to remove...

// // TODO: think about it...
// ServerNode.prototype.getGameObj = function(gameName, treatment, target, options) {
//     var gameInfo, gameObj;
//     if ('string' !== typeof gameName) {
//         throw new TypeError('ServerNode.getGameObj: gameName must be string.');
//     }
//     if ('string' !== typeof treatment) {
//         throw new TypeError('ServerNode.getGameObj: treatment must be string.');
//     }
//     if ('string' !== typeof target) {
//         throw new TypeError('ServerNode.getGameObj: target must be string.');
//     }
//     if (target !== 'client' && target !== 'logic') {
//         throw new TypeError('ServerNode.getGameObj: target must be either ' +
//                             '"client" or "logic".');
//     }
//     if (options && 'object' !== typeof options) {
//         throw new TypeError('ServerNode.getGameObj: options must be either ' +
//                             'undefined or object.');
//     }
// 
//     gameInfo = this.getGamesInfo(gameName);
//     if (!gameInfo) {
//         throw new TypeError('ServerNode.getGameObj: game not found: ' +
//                             gameName + '.');
//     }
// 
//     if (!gameInfo.treatments[treatment]) {
//          throw new TypeError('ServerNode.getGameObj: treatment not found in ' +
//                              'game ' + gameName + ': ' + treatment + '.');
//     }
// 
//     if (options) {
//         options = J.merge(gameInfo.treatments[treatment], options);
//     }
//     gameObj = gameInfo.treatments[treatment][target]();
// 
// };