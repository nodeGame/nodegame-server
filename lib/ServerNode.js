/**
 * # ServerNode
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Creates the server node for nodeGame
 *
 * Creates an HTTP server, and loads a Socket.io app, and scans the games
 * directories.
 *
 * http://nodegame.org
 */

"use strict";

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
var PageManager = require('./PageManager');

var J = require('JSUS').JSUS;
var GameStage = require('nodegame-client').GameStage;

var serverVersionObj;

// Create Express server
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
     * ### ServerNode.http
     *
     * The server
     */
    this.http = http;

    /**
     * ### ServerNode.defaultConfDir
     *
     * The directory of execution of the server
     */
    this.rootDir = path.resolve(__dirname, '..');

    /**
     * ### ServerNode.version
     *
     * The software version of the server as a string
     */
    this.version = require(this.rootDir + '/package.json').version;

    /**
     * ### ServerNode.defaultConfDir
     *
     * The directory from which the default configuration files are located
     *
     * @see ServerNode.rootDir
     */
    this.defaultConfDir = this.rootDir + '/conf';

    /**
     * ### ServerNode.channels
     *
     * Object containing references to all the existing channels
     *
     * @see ServerChannel
     */
    this.channels = {};

    /**
     * ### ServerNode.rooms
     *
     * Object containing references to all existing game rooms in all channels
     *
     * @see GameRoom
     */
    this.rooms = {};

    /**
     * ### ServerNode.info
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
     * ### ServerNode.defaults
     *
     * Defaults settings for the server and the channels
     *
     * Will be populated by the configure function.
     */
    this.defaults = {};

    /**
     * ### ServerNode.gamesDirs
     *
     * Array of directories that will be sequentially scanned for games
     */
    this.gamesDirs = [];

    /**
     * ### ServerNode.scannedGamesDirs
     *
     * Keeps tracks of games directories already scanned and of the outcome
     */
    this.scannedGamesDirs = {};

    /**
     * ### ServerNode.logger
     *
     * Default logger before any configuration is loaded.
     */
    this.logger = winston;

    /**
     * ### ServerNode.debug
     *
     * If TRUE, errors will be thrown, otherwise caught and logged.
     */
    this.debug = false;

    /**
     * ### ServerNode.asyncQueue
     *
     * Object containing callbacks to be executed if no operation is in progress
     */
    this.asyncQueue = J.getQueue();

    /**
     * ### ServerNode.sio
     *
     * The Socket.IO app of the server.
     *
     * The app is shared with all the channels.
     */
    this.sio = socket_io.listen(http);

    // see http://nodejs.org/docs/latest/
    //            api/events.html#events_emitter_setmaxlisteners_n
    this.sio.sockets.setMaxListeners(0);

    /**
     * ### ServerNode.page
     *
     * The page manager to add game specific settings to template rendering
     */
    this.pager = new PageManager();

    /**
     * ### ServerNode.logDir
     *
     * Log directory
     */
    this.logDir = this.rootDir + '/log';

    // Loading configurations.
    this.init(options || {});
}

// ## ServerNode methods

/**
 * ### ServerNode.init
 *
 * Loads all configuration options, start error manager, and loads games.
 *
 * @param {object} options Optional. Additional options passed overriding
 *   defaults
 *
 * @see ServerNode.loadGames
 */
ServerNode.prototype.init = function(options) {
    var that;

    // Transform server version string to object (used to check dependencies).
    serverVersionObj = version2GameStage(this.version);

    // Loading default config files.
    this.logger.info('ServerNode.init: loading default configuration files.');
    if (options.logDir) this.logDir = path.resolve(options.logDir);
    this.loadConfFile(this.defaultConfDir + '/loggers.js',
                      this.configureLoggers);
    this.logger = winston.loggers.get('servernode');
    this.loadConfDir(this.defaultConfDir, {loggers: false});

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
    this.logger.info('ServerNode.init: up and running on port ' +
                     this.port + '.');
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
        this.logger.error(
                'ServerNode.addChannel: channel could not be added: ' +
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
                that.logger.error('ServerNode.loadGames: cannot read ' + dir);
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
                        that.logger.error('ServerNode.loadGames: cannot read ' +
                                          dir);
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
    var game, gameSettings, gamePath, gameSettingsPath, gameSettingsObj, res;
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
        this.logger.error('ServerNode.addGameDir: cannot read ' + gamePath);
        throw e;
    }

    // Reading game.settings.js
    gameSettingsPath = gameDir + 'server/game.settings.js';
    try {
        gameSettings = require(gameSettingsPath);
    }
    catch(e) {
        this.logger.error('ServerNode.addGameDir: cannot read ' +
                          gameSettingsPath);
        //throw e;
        return;
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
    var gamePath, reqFail;
    var gameLogicPath, gameLogic, gameClientPath, gameClient;
    var langObject;
    var gameType, game;
    var treatment, t, i, len;

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

    if (gameInfo.engines) {
        reqFail = gameRequirementsFail(gameInfo.engines.nodegame);
        if (reqFail) {
            throw new Error('ServerNode.addGame: game ' + gameInfo.name + ' ' +
                            'requires nodeGame version ' +
                            gameInfo.engines.nodegame  + ' ' +
                            'but found ' + this.version + '.');
        }
    }

    // Require all specified game files for each treatment.
    for (t in treatments) {
        if (treatments.hasOwnProperty(t)) {
            treatment = treatments[t];


            if ('object' !== typeof treatment.gamePaths) {
                throw new Error('ServerNode.addGame: gamePaths must be ' +
                                'object. Game: ' + gameInfo.name + '. ' +
                                'Treatment: ' + t + '.');
            }

            if ('string' !== typeof treatment.gamePaths.logic) {
                throw new Error('ServerNode.addGame: gamePaths.logic must ' +
                                'be string. Game: ' + gameInfo.name + '. ' +
                                'Treatment: ' + t + '.');
            }

            for (gameType in treatment.gamePaths) {
                if (treatment.gamePaths.hasOwnProperty(gameType)) {
                    gamePath = treatment.gamePaths[gameType];


                    if ('string' !== typeof gamePath) {
                        throw new TypeError('ServerNode.addGame: ' +
                                            'game ' + gameInfo.name + ' ' +
                                            'treatment ' + t + ': ' + gameType +
                                            ' path must be string.');
                    }

                    gamePath = gameDir + 'server/' + gamePath;
                    try {
                        game = require(gamePath);
                    }
                    catch(e) {
                        this.logger.error('ServerNode.addGame: cannot read ' +
                                          gamePath + '.');
                        throw e;
                    }
                    treatment.gamePaths[gameType] = gamePath;
                }
            }
        }
    }

    // Building language object.
    langObject = this.buildLanguagesObject(gameDir);

    // Adding game info to global info object.
    this.info.games[gameInfo.name] = {
        dir: gameDir,
        info: gameInfo,
        treatments: treatments,
        languages: langObject,
        channels: {}
    };

    // Adding the public directory of the game to the static directories
    // http://stackoverflow.com/questions/5973432/
    //  setting-up-two-different-static-directories-in-node-js-express-framework
    this.http.use(gameInfo.name + '/public',
                  express.static(gameDir + 'public'));

    // Tries to load Channels file from game directory.
    this.loadChannelsFile(gameDir, gameInfo.name);

    // Loading Auth dir, if any.
    this.loadAuthDir(gameDir, gameInfo.name);

    // Tries to load Views file from game directory.
    this.loadViewsFile(gameDir, gameInfo);

    // Adding game alias.
    if (gameInfo.alias) {
        if ('string' === typeof gameInfo.alias) {
            gameInfo.alias = [gameInfo.alias];
        }
        if (!J.isArray(gameInfo.alias)) {
             throw new TypeError('ServerNode.addGame: game.alias ' +
                                 'must be either string or array.');
        }

        i = -1;
        len = gameInfo.alias.length;
        for ( ; ++i < len ; ) {
            if ('string' !== typeof gameInfo.alias[i]) {
                throw new TypeError(
                        'ServerNode.addGame: alias must be string.');
            }
            this.info.games[gameInfo.alias[i]] = this.info.games[gameInfo.name];
        }
    }

    this.logger.info('ServerNode.addGame: ' + gameInfo.name + ': ' + gameDir);
};

/**
 * ### ServerNode.loadChannelsFile
 *
 * Loads _channels.js_ from file system and adds channels accordingly
 *
 * Synchronously looks for a file called _channels.js_ at the top
 * level of the specified directory.
 *
 * The file _channels.js_ must export an array containing channels object
 * in the format specified by the _ServerChannel_ constructor. Every channel
 * configuration object can optionally have a _waitingRoom_ object to
 * automatically add a waiting room to the channel.
 *
 * @param {string} directory The path in which _channels.js_ will be looked for
 *
 * @see ServerNode.addChannel
 * @see ServerChannel
 * @see ServerChannel.createWaitingRoom
 */
ServerNode.prototype.loadChannelsFile = function(directory, gameName) {
    var channelsFile;
    var conf, channel, waitRoom;
    var i, len;
    var channelConf, waitRoomConf;

    if ('string' !== typeof directory) {
        throw new TypeError('ServerNode.loadChannelsFile: directory myst be ' +
                            'string.');
    }

    channelsFile = directory + 'channels.js';

    if (!fs.existsSync(channelsFile)) return;

    conf = require(channelsFile);

    if (!J.isArray(conf)) {
        throw new TypeError('ServerNode.loadChannelsFile: channels file ' +
                            'must return an array of channels.');
    }

    // Validate,
    i = -1;
    len = conf.length;
    for ( ; ++i < len ; ) {

        channelConf = conf[i];

        if ('object' !== typeof channelConf) {
            throw new TypeError('ServerNode.loadChannelsFile:' +
                                'channels must be object. Directory: ' +
                                directory);
        }
        if (channelConf.waitingRoom &&
            'object' !== typeof channelConf.waitingRoom) {

            throw new TypeError('ServerNode.loadChannelsFile: waitingRoom ' +
                                'in channel configuration must be object. ' +
                                'Directory: ' + directory);
        }
        waitRoomConf = channelConf.waitingRoom;
        delete channelConf.waitingRoom;

        channel = this.addChannel(channelConf);
        if (channel) {
            // Add the list of channels created by the game.
            this.info.games[gameName].channels[channel.name] = true;

            if (waitRoomConf) {

                // We prepend the baseDir parameter, if any.
                // If logicPath is not string we let the WaitingRoom
                // constructor throw an error.
                if ('string' === typeof waitRoomConf.logicPath) {
                    waitRoomConf.logicPath =
                        directory + 'server/' + waitRoomConf.logicPath;
                }

                waitRoom = channel.createWaitingRoom(waitRoomConf);

                if (!waitRoom) {
                    throw new Error('ServerNode.loadChannelsFile: could ' +
                                    'not add waiting room to channel ' +
                                    channel.name);
                }
            }
        }
    }
};


/**
 * ### ServerNode.loadViewsFile
 *
 * Loads _views.js_ from file system and adds channels accordingly
 *
 * Asynchronously looks for a file called _channels.js_ at the top
 * level of the specified directory.
 *
 * The file _channels.js_ must export an array containing channels object
 * in the format specified by the _ServerChannel_ constructor. Every channel
 * configuration object can optionally have a _waitingRoom_ object to
 * automatically add a waiting room to the channel.
 *
 * @param {string} directory The path in which _views.js_ will be looked for
 *
 * TODO: views.js file is not loaded anymore because all context are dynamics.
 *
 * @experimental
 * @see PageManager
 */
ServerNode.prototype.loadViewsFile = function(directory, gameInfo) {
    var viewsFile, that, gameName;

    if ('string' !== typeof directory) {
        throw new TypeError('ServerNode.loadViewsFile: directory myst be ' +
                            'string.');
    }
    gameName = gameInfo.name;

    // Prepare data structure for game.
    this.pager.addGame(gameName);

// TODO: see if still needed (broken now).
//
//     that = this;
//     viewsFile = directory + 'views/views.js';
//     fs.exists(viewsFile, function(exists) {
//          var cb, sb;
//          if (!exists) return;
//          cb = require(viewsFile);
//          if ('function' !== typeof cb) {
//              throw new TypeError('ServerNode.loadViewsFile: ' +
//                  'views.js did not ' +
//                  'return a valid function. Dir: ' + directory);
//          }
//          // Execute views function in a sandboxed enviroment.
//          // A game cannot modify other games settings.
//          sb = that.pager.getSandBox(gameName, directory);
//          cb(sb, gameInfo.settings);
//      });
};

/**
 * ### ServerNode.buildLanguagesObject
 *
 * Builds an object containing language objects for a given game directory
 *
 * @param {string} directory The directory of the game.
 * @return {object} languages Object of language objects.
 */
ServerNode.prototype.buildLanguagesObject = function(directory) {
    var ctxPath, langPaths, languages, pathIndex, languageObject;

    ctxPath = directory + '/views/contexts/';
    if (!fs.existsSync(ctxPath)) return;

    langPaths = fs.readdirSync(ctxPath);

    languages = {};
    for (pathIndex in langPaths) {
        if (langPaths.hasOwnProperty(pathIndex)) {
            languageObject = {};
            if (fs.existsSync(ctxPath + langPaths[pathIndex] +
                              '/languageInfo.json')) {

                languageObject = require(ctxPath + langPaths[pathIndex] +
                                         '/languageInfo.json');
            }

            languageObject.shortName = langPaths[pathIndex];
            languages[languageObject.shortName] = languageObject;
        }
    }
    return languages;
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
    var treatments;
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
                out[t].name = t;
            }
        }
    }

    // Add standard name.
    out.standard.name = 'standard';

    return out;
};

/**
 * ### ServerNode.configureHTTP
 *
 * Configure express server hook
 *
 * Accepts a callback function that receives the express app
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
 * Accepts a callback function that receives the socket.io app
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
 * Configure winston loggers hook
 *
 * Accepts a callback function that receives `winston.loggers` and
 * `this.logDir` as parameters. The callback function should return TRUE if
 * configuration is successful.
 *
 * @param {function} func The function that will configure the loggers
 * @return {boolean} The return value of the callback function
 */
ServerNode.prototype.configureLoggers = function(func) {
    return func(winston.loggers, this.logDir + '/');
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
 * @param {function} func The function that will configure the ServerNode
 *
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
 * - `loggers.js` configuring the Wiston logging service
 *
 * For documentation refer to the comments  inside each configuration file.
 *
 * The method keeps track of which directories are already been scanned
 * and they will not scanned again, unless the force flag is set to TRUE.
 *
 * @param {string} dir The path to the configuration directory
 * @param {mask} object Optional. An object defining which configuration
 *   files are allowed to be loaded. Default: all files are loaded
 * @param {boolean} force Optional. Force to rescan a directory even if this was
 *    already loaded. Default: FALSE
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
        throw new Error('ServerNode.loadConfFile: conf file did not export a ' +
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

ServerNode.prototype.loadAuthDir = function(directory, gameName) {
    var authFile, that;

    if ('string' !== typeof directory) {
        throw new TypeError('ServerNode.loadAuthDir: directory myst be ' +
                            'string.');
    }

    that = this;
    authFile = directory + 'auth/auth.js';

    fs.exists(authFile, function(exists) {
        var authObj, sandboxAuth, sandboxClientIdGen;

        if (!exists) return;

        sandboxAuth = that.getChannelSandbox(gameName, 'authorization', 'Auth');
        sandboxClientIdGen = that.getChannelSandbox(gameName,
                                                    'clientIdGenerator',
                                                    'clientId Generator');
        authObj = {
            authorization: sandboxAuth,
            clientIdGenerator: sandboxClientIdGen
        };

        require(authFile)(authObj);

    });
};

ServerNode.prototype.getChannelSandbox =
        function(gameName, method, methodName) {

    var that = this;

    return function() {
        var len;
        var authCb, channel, server;
        var gameChannelNames;
        var errorBegin;

        errorBegin = 'ServerNode.loadAuthDir: ' + methodName + ' callback: ';

        len = arguments.length;

        if (len > 3) {
            throw new Error(errorBegin +
                            'accepts maximum 3 input parameters, ' +
                            len + ' given. Game: ' + gameName + '.');
        }

        authCb = arguments[len-1];

        if ('function' !== typeof authCb) {
            throw new TypeError(errorBegin + 'must be a function.');
        }

        // Channels defined by a game with the channels.js file.
        // Auth callback can modify the authorization only of those.
        gameChannelNames = that.info.games[gameName].channels;

        // 1 Auth for all servers of all channels.
        if (len === 1) {
            for (channel in gameChannelNames) {
                if (gameChannelNames.hasOwnProperty(channel)) {
                    that.channels[channel].admin[method](authCb);
                    that.channels[channel].player[method](authCb);
                }
            }
        }

        // 1 Auth for one channel, 1 or both servers
        else {

            if ('string' !== typeof arguments[0]) {
                throw new TypeError(errorBegin + 'channel parameter must be ' +
                                    'string. Game: ' + gameName + '.');
            }
            // Retrieve the channel name.
            channel = gameChannelNames[arguments[0]];

            // Check if the channel belongs to the game.
            if ('undefined' === typeof channel) {
                throw new TypeError(errorBegin + 'channel is not existing or ' +
                                    'it does not belong to the game: ' +
                                    channel + '. Game: ' + gameName + '.');
            }

            // Retrieve the channel object.
            channel = that.channels[arguments[0]];

            // 1 Auth for a specific channel.
            if (len === 2) {
                channel.admin[method](authCb);
                channel.player[method](authCb);
            }
            // 1 Auth for a specific server of a specific channel.
            else {
                if (arguments[1] !== 'admin' && arguments[1] !== 'player') {
                    throw new TypeError(errorBegin + 'server parameter must ' +
                                        'be either "player" or "admin". ' +
                                        'Game: ' + gameName + '.');
                }

                channel[arguments[1]][method](authCb);
            }
        }
    };
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
        throw new TypeError(
                'ServerNode.getGamesInfo: gameName must be string.');
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

// ## Helper methods

/**
 * ### version2GameStage
 *
 * Helper function to parse a version string into a GameStage
 *
 * Cannot use GameStage constructor because it does not accept stage = 0
 *
 * @param {string} str The version number to parse
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
    };
}

/**
 * ### gameRequirementsFail
 *
 * Helper function that checks if game requirements are fullfilled
 *
 * @param {mixed} req The game requirements from `package.json`
 *
 * @return {boolean} TRUE, if check fails
 *
 * @see GameStage constructor
 */
function gameRequirementsFail(req) {
    var reqFail;

    // * skips the check.
    if (!req || req.trim() === '*') return false;

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

    return reqFail;
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
