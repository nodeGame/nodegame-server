/**
 * # ServerNode
 * Copyright(c) 2019 Stefano Balietti <ste@nodegame.org>
 * MIT Licensed
 *
 * Creates the nodeGame server
 *
 * Creates an HTTP server, and loads a Socket.io app, and scans the games
 * directories.
 *
 * http://nodegame.org
 */

"use strict";

// ## Global scope

module.exports = ServerNode;

var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    socket_io = require('socket.io'),
    winston = require('winston');

var ServerChannel = require('./ServerChannel');
var ResourceManager = require('./ResourceManager');
var GameLoader = require('./GameLoader');

var J = require('JSUS').JSUS;

// Express server.
var exp, http;
exp = express();

/**
 * ## ServerNode constructor
 *
 * Creates a new ServerNode instance.
 *
 * @param {object} opts The configuration object
 */
function ServerNode(opts) {

    opts = opts || {};

    /**
     * ### ServerNode.defaultConfDir
     *
     * The directory of execution of the server
     */
    this.rootDir = path.resolve(__dirname, '..');


    // Creates the http or https server (must be after rootDir is set).
    this.createServer(opts);

    /**
     * ### ServerNode.http
     *
     * The server
     */
    this.http = exp;

    /**
     * ### ServerNode.port
     *
     * Default port for server
     */
    this.port = 8080;

    /**
     * ### ServerNode.version
     *
     * The software version of the server as a string
     */
    this.version = require(path.resolve(this.rootDir, 'package.json')).version;

    /**
     * ### ServerNode.nodeGameVersion
     *
     * The official release version of nodeGame
     *
     * This includes all other modules, and it is passed by the launcher.
     *
     * Default: ServerNode.version
     */
    this.nodeGameVersion = opts.nodeGameVersion || this.version;

    /**
     * ### ServerNode.modulesVersion
     *
     * Versions of all nodegame submodules
     *
     * This includes all other modules, and it is passed by the launcher.
     *
     * Default: ServerNode.version
     */
    this.modulesVersion =
        require(path.join(this.rootDir, 'bin', 'info.js')).modulesVersion;

    /**
     * ### ServerNode.defaultConfDir
     *
     * The directory from which the default configuration files are located
     *
     * @see ServerNode.rootDir
     */
    this.defaultConfDir = path.join(this.rootDir, 'conf');

    /**
     * ### ServerNode.channels
     *
     * Object containing references to all the existing channels
     *
     * @see ServerChannel
     */
    this.channels = {};

    /**
     * ### ServerNode.defaultChannel
     *
     * The name of the default channel (will be served from '/')
     *
     * @see ServerChannel
     */
    this.defaultChannel = null;

    /**
     * ### ServerNode._defaultChannel
     *
     * The name of the default channel as specified by options
     *
     * Needs to be distinguished at load time.
     */
    this._defaultChannel = opts.defaultChannel || null;

    /**
     * ### ServerNode.homePage
     *
     * Configuration for nodeGame home page
     *
     * The home page is a tiled screen for accessing the games.
     *
     * This variable is inited in conf/servernode.js, and it gets automatically
     * disabled if _defaultChannel is set.
     */
    this.homePage = null;

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
     * Games actually include also aliases.
     *
     * @see ServerNode.loadGames
     */
    this.info = {
        channels: {},
        games: {},
        aliases: {}
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
     *
     * Does not print anything.
     */
    this.logger = winston;
    if (opts.logLevel) {
        if (opts.logLevel !== 'error' &&
            opts.logLevel !== 'warn' &&
            opts.logLevel !== 'info' &&
            opts.logLevel !== 'verbose' &&
            opts.logLevel !== 'debug' &&
            opts.logLevel !== 'silly') {

            throw new Error('ServerNode constructor: invalid logLevel: ' +
                            opts.logLevel);
        }
    }
    this.logger.level = opts.logLevel || 'warn';

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
     * ### ServerNode.gameLoader
     *
     * Object responsible to load the games from the file system.
     */
    this.gameLoader = new GameLoader(this);

    /**
     * ### ServerNode.page
     *
     * Loading, caching of static resources and templates from file system.
     */
    this.resourceManager = new ResourceManager(this);

    /**
     * ### ServerNode.logDir
     *
     * Log directory
     */
    this.logDir = path.join(this.rootDir, 'log');

    /**
     * ### ServerNode.lastError
     *
     * Last error caught by error manager
     */
    this.lastError = null;

    /**
     * ### ServerNode.acm
     *
     * Access control from channels on servernode
     *
     * Important! Currently, acm is not enforced, all channels have access
     * to ServerNode and can modify it. Do not rely on this in production!
     *
     * @experimental
     */
    this.acm = {
        read: {},
        modify: {}
    };

    // Loading configurations.
    this.init(opts || {});
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
    var that, requirementsChannel;

    that = this;

    process.on('uncaughtException', function(err) {
        if (that.debug) {
            that.terminatePhantoms();
            throw err;
        }
        else {
            that.logger.error("ServerNode caught an exception: \n" + err.stack);
            that.lastError = err;
        }
    });


    // Loading default config files.
    this.logger.verbose('ServerNode.init: loading default conf files');
    if (options.logDir) this.logDir = path.resolve(options.logDir);
    this.loadConfFile(path.join(this.defaultConfDir, 'loggers.js'),
                      this.configureLoggers);
    this.logger = winston.loggers.get('servernode');
    this.loadConfDir(this.defaultConfDir, { loggers: false });

    // Loading user configuration files
    if (options.confDir) {
        this.logger.verbose('ServerNode.init: loading user conf files');
        // We load the loggers configuration file first, so that
        // the the output is nicely formatted.
        this.loadConfFile(path.join(options.confDir, 'loggers.js'),
                          this.configureLoggers);
        this.logger = winston.loggers.get('servernode');
        this.loadConfDir(options.confDir, {loggers: false});
    }

    this.logger.verbose('ServerNode.init: starting HTTP server');
    http.listen(this.port);

    // Mix in options with configuration files.
    this.logger.verbose('ServerNode.init: loading in-line options');
    if (options.loggers) this.configureLoggers(options.loggers);
    if (options.servernode) this.configure(options.servernode);
    if (options.http) this.configureHTTP(options.http);
    if (options.sio) this.configureSIO(options.sio);

// TODO: Think about how to handle SIGXXX signals.

//     process.on('SIGHUP', function() {
//         console.log('Got SIGHUP signal');
//         process.exit(0);
//     });
   //  process.on('SIGINT', function() {
   //      console.log('ServeNode: CTRL-C are you sure? Type CTRL-D');
   //      // throw new Error();
   //      process.exit(1);
   //  });

    process.on('SIGTERM', function() {
        that.terminatePhantoms();
    });

    // Loading games.
    this.logger.verbose('ServerNode.init: loading games');

    // After we finish scanning the game directories, we must have at least
    // a game.
    this.asyncQueue.onReady(function() {
        var str;
        // TODO: there is still some async loading, this is fired too early,
        // there are no channels. Removed for now.
        return;
        if (J.isEmpty(that.channels)) {
            str = 'ServerNode.init: no channel loaded, please check the ' +
                '"games" folder';
            if (that.defaultChannel) {
                str += ' or remove the default channel option ("' +
                    that.defaultChannel + '"). If not intended, ' +
                    'type Ctrl-C to exit';
            }
            // Making sure it is printed last.
            setTimeout(function() { that.logger.warn(str); }, 200);
        }
    });
    this.loadGames(this.gamesDirs);

    // Done.
    this.logger.verbose('ServerNode.init: up and running on port ' + this.port);
};

/**
 * ### SeverNode.terminatePhantoms
 *
 * Terminates PhantomJS children by sending SIGTERM to every single one of them.
 */
ServerNode.prototype.terminatePhantoms = function() {
    var chanIdx, pjsIdx;
    var chan, pjs;
    for (chanIdx in this.channels) {
        if (this.channels.hasOwnProperty(chanIdx)) {
            chan = this.channels[chanIdx];
            for (pjsIdx in chan.phantoms) {
                if (chan.phantoms.hasOwnProperty(pjsIdx)) {
                    pjs = chan.phantoms[pjsIdx];
                    pjs.kill('SIGTERM');
                }
            }
        }
    }
};

/**
 * ### ServerNode.addChannel
 *
 * Creates a nodeGame channel with the specified configuration
 *
 * If the configuration object is missing or invalid, channel creation
 * is aborted.
 *
 * @param {object} options The configuration for the channel
 *
 * @return {ServerChannel|boolean} channel The newly created channel, or
 *   FALSE if an error occurs
 *
 * @see ServerChannel
 */
ServerNode.prototype.addChannel = function(options) {
    var channelName, channelOptions, channel, ok, defaultChannel, setDef;

    if ('object' !== typeof options) {
        throw new TypeError('ServerNode.addChannel: options must be ' +
                            'object. Found: ' + options);
    }
    if ('string' !== typeof options.name || options.name.trim() === '') {
        throw new TypeError('ServerNode.addChannel: options.name must ' +
                            'be a non-empty string. Found: ' + options.name);
    }

    // Check, adapt options for server channels, or throw error.
    checkServerOptions('playerServer', options, this.channels);
    checkServerOptions('adminServer', options, this.channels);

    if (this.maxChannels && J.size(this.channels) >= this.maxChannels) {
        this.logger.error('ServerNode.addChannel: maximum number of channels ' +
                          'reached: ' + this.maxChannels);
        return false;
    }

    // Channel name.
    if (!options.name) options.name = options.gameName;
    if ('string' !== typeof options.name) {
        throw new Error('ServerNode.addChannel: channel name must be ' +
                        'string. Found: ' + options.name);
    }

    channelName = options.name;

    // TODO: do we need to delete?
    // delete options.defaultChannel;

    // TODO: better check the merged object.
    // Pre-parse user defined configuration options
    channelOptions = ServerChannel.parseOptions(J.clone(options));
    // Merge user-defined options with defaults.
    channelOptions = J.merge(this.defaults.channel, channelOptions);

    // Creating the channel.
    channel = new ServerChannel(channelOptions, this, this.sio);
    ok = channel.listen();

    if (!ok) {
        this.logger.error('ServerNode.addChannel: channel could ' +
                          'not be added: ' + channelName);
        return false;
    }

    // Store references.
    channelOptions.open = true;
    this.info.channels[channelName] = channelOptions;
    this.channels[channelName] = channel;

    // Set default channel if:
    //  - Specified in channel.settings (deprecated);
    //  - Set by launcher option --default.
    if (options.defaultChannel) {
        this.logger.warn('***Deprecation Warning*** channel.settings.js ' +
                         'option defaultChannel is deprecated. Launch ' +
                         'nodegame with option: --default ' + channelName);
        setDef = true;
    }
    // Remove reference to --default.
    if (this._defaultChannel === channelName) {
        this._defaultChannel = null;
        setDef = true;
    }
    if (setDef) this.setDefaultChannel(channelName);

    // Add the channel to the Resource Manager.
    this.resourceManager.addGame(channelName);

    this.logger.info('ServerNode.addChannel: channel added correctly: ' +
                     channelName);

    // TODO: check this!
    this.acm.read[channelName] = true;
    this.acm.modify[channelName] = true;

    return channel;
};

/**
 * ### ServerNode.loadGames
 *
 * Loads the games from the file systems
 *
 * Scans the directories listed in `this.gamesDirs`.
 *
 * @param {array} paths Array of paths to scan
 *
 * @see ServerNode.addGame
 */
ServerNode.prototype.loadGames = function(paths) {
    var that;
    if (!J.isArray(paths)) {
        throw new TypeError('ServerNode.loadGames: paths must be array. Found' +
                           paths);
    }
    // We add to the queue that we are looking for games.
    this.asyncQueue.add('ServerNode.loadGames');
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
            if (dir.substr(-1) !== '/') dir += '/';
            // Check every file.
            J.each(files, function(game) {
                var gameDir, qKeyGame;
                // Ignore hidden folders beginning with dot.
                if (game.charAt(0) === '.') return;
                gameDir = dir + game;
                // Register operation in the queue.
                qKeyGame = that.asyncQueue.add(gameDir);
                // Get file stats.
                fs.stat(gameDir, function(err, stats) {
                    if (err) {
                        that.logger.error('ServerNode.loadGames: cannot read ' +
                                          gameDir);
                        that.asyncQueue.remove(qKeyGame);
                        return;
                    }
                    // It is a folder, try to add it as a game.
                    // If successful, it creates a new channel.
                    // TODO: there is still some async loading, removing from
                    // asyncQueue too early. Check!
                    if (stats.isDirectory()) that.addGameDir(gameDir);
                    that.asyncQueue.remove(qKeyGame);
                });
            });
            // Remove async operation from queue.
            that.asyncQueue.remove(qKey);
        });
    });
    // This way we fire onReady when there are no games.
    this.asyncQueue.remove('ServerNode.loadGames');
};

/**
 * ### ServerNode.addGameDir
 *
 * Scans a directory for games folders (must contain a package.json file)
 *
 * @param {string} gameDir The path to a directory containing a nodeGame game
 *
 * @see GameLoader.addGame
 */
ServerNode.prototype.addGameDir = function(gameDir, force) {
    var gameInfo, gameSettings, gamePath, channelName;

    if ('string' !== typeof gameDir) {
        throw new TypeError('ServerNode.addGameDir: gameDir must be string. ' +
                            'Found: ' + gameDir);
    }

    gameDir = path.resolve(gameDir);

    // Reading package.json
    gamePath = path.join(gameDir, 'package.json');

    try {
        gameInfo = require(gamePath);
    }
    catch(e) {
        this.logger.error('ServerNode.addGameDir: cannot read ' + gamePath);
        throw e;
    }

    if (this.defaultChannel && !force) {
        channelName  = gameInfo.channelName || gameInfo.name;
        if (channelName !== this.defaultChannel) {
            this.logger.warn('ServerNode.addGameDir: skipping ' +
                             'non-default channel: ' + channelName);
            return;
        }
    }

    // Ready to add the game.
    this.gameLoader.addGame(gameInfo, gameDir);
};

/**
 * ### ServerNode.createGameAlias
 *
 * Adds one or multiple game alias
 *
 * Adds references into `info.games`, `info.aliases`, and inside
 * `info.games[gameName].alias`.
 *
 * @param {string|array} alias The name of the alias/es
 * @param {string} gameName The name of the game
 * @param {boolean} force If TRUE, the alias will
 *   be set even if already existing. Default: FALSE
 *
 * @see ResourceManager.createAlias
 */
ServerNode.prototype.createGameAlias = function(alias, gameName, force) {
    var i, len;

    if ('string' === typeof alias) {
        alias = [alias];
    }
    if (!J.isArray(alias)) {
        throw new TypeError('ServerNode.createGameAlias: alias' +
                            'must be either string or array. Found: ' + alias);
    }
    if ('string' !== typeof gameName) {
        throw new TypeError('ServerNode.createGameAlias: gameName must be ' +
                            'string. Found: ' + gameName);
    }
    if (!this.info.games[gameName]) {
        throw new Error('ServerNode.createGameAlias: game not found:' +
                        gameName);
    }
    i = -1;
    len = alias.length;
    for ( ; ++i < len ; ) {
        // This calls does type and uniqueness checkings.
        this.resourceManager.createAlias(alias[i], gameName, force);
        // Alias OK. Make a copy in the info.games object,
        // and push into the alias array.
        this.info.games[alias[i]] = this.info.games[gameName];
        this.info.games[gameName].alias.push(alias[i]);
        // Store the reference in the aliases object.
        this.info.aliases[alias[i]] = gameName;
    }
};

// /**
//  * ### ServerNode.loadChannelsFile
//  *
//  * Loads _channels.js_ from file system and adds channels accordingly
//  *
//  * Synchronously looks for a file called _channels.js_ at the top
//  * level of the specified directory.
//  *
//  * The file _channels.js_ must export an array containing channels object
//  * in the format specified by the _ServerChannel_ constructor. Every channel
//  * configuration object can optionally have a _waitingRoom_ object to
//  * automatically add a waiting room to the channel.
//  *
//  * @param {string} directory The path in which _channels.js_ will be searched
//  *
//  * @see ServerNode.addChannel
//  * @see ServerChannel
//  * @see ServerChannel.createWaitingRoom
//  *
//  * @TODO: Do we still need this method?
//  */
// ServerNode.prototype.loadChannelsFile = function(directory, gameName) {
//     var channelsFile;
//     var conf, channel, waitRoom;
//     var i, len;
//     var channelConf, waitRoomConf;
//
//     if ('string' !== typeof directory) {
//         throw new TypeError('ServerNode.loadChannelsFile: directory ' +
//                             'must be string');
//     }
//
//     channelsFile = directory + 'channels.js';
//
//     if (!fs.existsSync(channelsFile)) return;
//
//     conf = require(channelsFile);
//
//     if (!J.isArray(conf)) {
//         throw new TypeError('ServerNode.loadChannelsFile: channels file ' +
//                             'must return an array of channels');
//     }
//
//     // Validate,
//     i = -1;
//     len = conf.length;
//     for ( ; ++i < len ; ) {
//
//         channelConf = conf[i];
//
//         if ('object' !== typeof channelConf) {
//             throw new TypeError('ServerNode.loadChannelsFile:' +
//                                 'channels must be object. Directory: ' +
//                                 directory);
//         }
//         if (channelConf.waitingRoom &&
//             'object' !== typeof channelConf.waitingRoom) {
//
//             throw new TypeError('ServerNode.loadChannelsFile: waitingRoom ' +
//                                 'in channel configuration must be object. ' +
//                                 'Directory: ' + directory);
//         }
//         waitRoomConf = channelConf.waitingRoom;
//         delete channelConf.waitingRoom;
//
//         channel = this.addChannel(channelConf);
//         if (channel) {
//             // Add the list of channels created by the game.
//             this.info.games[gameName].channels[channel.name] = true;
//
//             if (waitRoomConf) {
//
//                 // We prepend the baseDir parameter, if any.
//                 // If logicPath is not string we let the WaitingRoom
//                 // constructor throw an error.
//                 if ('string' === typeof waitRoomConf.logicPath) {
//                     waitRoomConf.logicPath =
//                         directory + 'server/' + waitRoomConf.logicPath;
//                 }
//
//                 waitRoom = channel.createWaitingRoom(waitRoomConf);
//
//                 if (!waitRoom) {
//                     throw new Error('ServerNode.loadChannelsFile: could ' +
//                                     'not add waiting room to channel ' +
//                                     channel.name);
//                 }
//             }
//         }
//     }
// };

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
    return func(this.http, this);
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
    return func(winston.loggers, this.logDir + path.sep);
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
 * For documentation refer to the comments inside each configuration file.
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
        throw new TypeError('ServerNode.loadConfDir: dir must be string.' +
                           'Found: ' + dir);
    }
    if (mask && 'object' !== typeof mask) {
        throw new TypeError('ServerNode.loadConfDir: mask must be object or ' +
                            'undefined. Found: ' + mask);
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
        sio: true
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
        throw new TypeError('ServerNode.loadConfFile: file must be string.' +
                           'Found: ' + file);
    }
    if ('function' !== typeof cb) {
        throw new TypeError('ServerNode.loadConfFile: cb must be function.' +
                            'Found: ' + cb);
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

    this.logger.debug('ServerNode.loadConfFile: loaded ' + file)
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
 *     clientTypes: {
 *        logic: function() { ... },
 *        player: function() { ...},
 *     },
 *     settings: {
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
 *
 * @return {object} The games info structure. See above for details.
 */
ServerNode.prototype.getGamesInfo = function(gameName) {
    if (gameName && 'string' !== typeof gameName) {
        throw new TypeError('ServerNode.getGamesInfo: gameName must ' +
                            'be string or undefined. Found: ' + gameName);
    }
    return gameName ? this.info.games[gameName] : this.info.games;
};

/**
 * ### ServerNode.resolveGameDir
 *
 * Returns the absolute path of the specified game or alias
 *
 * @param {string} gameName The requested game name or alias
 *
 * @return {string|null} The absolute path to the game directory,
 *   or NULL if not found
 */
ServerNode.prototype.resolveGameDir = function(gameName) {
    if ('string' !== typeof gameName) {
        throw new TypeError('ServerNode.resolveGameDir: gameName must ' +
                            'be string. Found: ' + gameName);
    }
    return this.info.games[gameName] ?
        this.info.games[gameName].dir : null;
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
        throw new TypeError('ServerNode.ready: cb must be function. Found: ' +
                           cb);
    }
    this.asyncQueue.onReady(cb);
};

/**
 * ### ServerNode.createServer
 *
 * Creates a new instance of http or https server
 *
 * @param {object} opts Configuration options (same as constructor). Looks
 *   for `opts.ssl`, that can be object or boolean. If object, it must
 *   contain the properties:
 *
 *        - `key`: the private key
 *        - `cert`: the certificate
 *
 *    If boolean, files:
 *
 *        - `private.key`
 *        - `certificate.pem`
 *
 *   are loaded from the nodegame-server/ssl/ directory.
 *
 * @see http
 */
ServerNode.prototype.createServer = function(opts) {
    var key, cert;

    if (http) {
        throw new Error('ServerNode.createServer: server already running');
    }

    // Load default key and certificate if requested.
    if ('boolean' === typeof opts.ssl && opts.ssl) {
        opts.ssl = {};

        key = this.rootDir + '/ssl/private.key';
        if (!fs.existsSync(key)) {
            throw new Error('Servernode.createServer: ssl option equal to ' +
                            'true, but ssl/private.key not found');
        }
        cert = this.rootDir + '/ssl/certificate.pem';
        if (!fs.existsSync(cert)) {
            throw new Error('Servernode.createServer: ssl option equal to ' +
                            'true, but ssl/certificate.pem not found');
        }

        opts.ssl.key = fs.readFileSync(key, 'utf8');
        opts.ssl.cert = fs.readFileSync(cert, 'utf8');
    }

    // Create http or ssl server.
    if ('object' === typeof opts.ssl) {
        if ('string' !== typeof opts.ssl.key) {
            throw new TypeError('Servernode.createServer: ssl.key must be ' +
                                'string. Found: ' + opts.ssl.key);
        }
        if ('string' !== typeof opts.ssl.cert) {
            throw new TypeError('Servernode.createServer: ssl.cert must be ' +
                                'string. Found: ' + opts.ssl.cert);
        }

        http = require('https').createServer(opts.ssl, exp);
    }
    else {
        http = require('http').createServer(exp);
    }
};

/**
 * ### ServerNode.getDefaultChannel
 *
 * Returns the name of the default channel, if any
 *
 * @return {string} The name of the default channel
 */
ServerNode.prototype.getDefaultChannel = function() {
    return this.defaultChannel;
};

/**
 * ### ServerNode.setDefaultChannel
 *
 * Sets the default channel
 *
 * Channel must be already existing. Once set it cannot be changed.
 *
 * @param {string} The name of the default channel
 */
ServerNode.prototype.setDefaultChannel = function(channelName) {
    var ch;
    if ('string' !== typeof channelName) {
        throw new TypeError('ServerNode.setDefaultChannel: channelName must ' +
                            'be string. Found: ' + channelName);
    }
    if (this.homePage && this.homePage.enabled) {
        this.info.games[channelName].errored = true;
        throw new Error('ServerNode.setDefaultChannel: cannot set channel ' +
                        channelName + ' as default. ServerNode has ' +
                        'home page enabled');
    }
    ch = this.channels[channelName]
    if (!ch) {
        throw new Error('ServerNode.setDefaultChannel: channel not found ' +
                        channelName);
    }
    // The default channel may be set via inline options.
    // Or via channel.settings.js (legacy).
    if (this.defaultChannel) {
        if (this.defaultChannel !== channelName) {
            throw new Error('ServerNode.setDefaultChannel: default channel ' +
                            'cannot be changed after it has been set. ' +
                            'Current default channel: ' + this.defaultChannel +
                            '. New: ' + channelName);
        }
        this.logger.warn('ServerNode.setDefaultChannel: channel already ' +
                         'default: ' + channelName);
    }
    this.defaultChannel = channelName;
    // This is important, it is not set before with inline options.
    ch.defaultChannel = true;
};

// ## Helper Methods

/**
 * ## checkServerOptions
 *
 * Makes sure the server options are well-formed and contain a valid endpoint
 *
 * Notice: modifies the options object, if necessary, or throws an error
 * if configuration cannot be adapted.
 *
 * Sets default endpoint if missing (gameName and gameName/admin), and
 * checks that endpoints are not already in use.
 *
 * @param {string} type The type of server: playerServer or adminServer
 * @param {object} options The options object to validate
 * @param {object} channels The list of already added channels.
 *
 * @see ServerNode.info.channels
 */
function checkServerOptions(type, options, channels) {
    var endpoint, c, err;

    endpoint = type === 'adminServer' ? options.name + '/admin' : options.name;

    // Validate options object, and set default endpoint if undefined.
    if ('undefined' === typeof options[type]) {
        options[type] = { endpoint: endpoint };
    }
    else if ('string' === typeof options[type]) {
        options[type] = { endpoint: options[type] };
    }
    else if ('object' === typeof options[type]) {
        if ('undefined' === options[type].endpoint) {
            options[type].endpoint = endpoint;
        }
        else if ('string' !== typeof options[type].endpoint) {
            throw new TypeError('ServerNode.addChannel: options.' + type +
                                '.endpoint must be string or undefined.' +
                                'Found: ' + options[type].endpoint);
        }
    }
    else {
        throw new TypeError('ServerNode.addChannel: options.' + type +
                            'must be string, object, or undefined. Found: ' +
                            options[type]);
    }

    // See if admin and player server have the same endpoint.
    endpoint = options[type].endpoint;
    if (type === 'adminServer') {
        if (endpoint === options.playerServer ||
            ('object' === typeof options.playerServer &&
             endpoint === options.playerServer.endpoint)) {

            err = true;
        }
    }
    else {
        if (endpoint === options.adminServer ||
            ('object' === typeof options.adminServer &&
             endpoint === options.adminServer.endpoint)) {

            err = true;
        }
    }

    if (err) {
        throw new Error('ServerNode.addChannel: player and admin servers ' +
                        'cannot have same endpoint: ' + endpoint);
    }

    // See if an endpoint with the same name is already in use.
    for (c in channels) {
        if (channels.hasOwnProperty(c)) {
            if (channels[c].adminServer.endpoint === ('/' + endpoint) ||
                channels[c].playerServer.endpoint === ('/' + endpoint)) {

                throw new Error('ServerNode.addChannel: options.' + type +
                                '.endpoint already existing: ' + endpoint);
            }
        }
    }
}
