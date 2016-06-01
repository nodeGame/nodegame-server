/**
 * # GameLoader
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Loads nodeGame games from file system
 *
 * http://nodegame.org
 */

"use strict";

module.exports = GameLoader;

// ## Global scope

var path = require('path');
var fs = require('fs');

var GameRouter = require('./GameRouter');

var J = require('JSUS').JSUS;
var ngc = require('nodegame-client');
var GameStage = ngc.GameStage;

var serverVersionObj;

/**
 * ## GameLoader constructor
 *
 * Constructs a new instance of GameLoader
 */
function GameLoader(servernode) {
    this.servernode = servernode;

    this.gameRouter = new GameRouter(servernode);

    // Cannot keep a reference to servernode.logger because it gets
    // overwritten later on.

    // Transform server version string to object (used to check dependencies).
    serverVersionObj = version2GameStage(this.servernode.version);
}


// ## GameLoader methods

/**
 * ### GameLoader.addGame
 *
 * Adds a new game to the global collection `info.games`
 *
 * The version of ServerNode is compared against the information in
 * _gameInfo.engines.nodegame_, if found.
 *
 * Aliases will be created, if needed.
 *
 * @param {object} gameInfo A game descriptor, usually from package.json
 * @param {string} gameDir The root directory of the game (with trailing slash)
 *
 * @see ServerNode.addGameDir
 */
GameLoader.prototype.addGame = function(gameInfo, gameDir) {
    var gamePath, reqFail;
    var gameLogicPath, gameLogic, gameClientPath, gameClient;
    var clientTypes, langObject;
    var gameType, gameGame, game, gameName, levels;
    var channel;

    if ('object' !== typeof gameInfo) {
        throw new TypeError('GameLoader.addGame: gameInfo must be object.');
    }
    if ('string' !== typeof gameDir) {
        throw new TypeError('GameLoader.addGame: gameDir must be string.');
    }

    gameName = gameInfo.channelName || gameInfo.name;

    // Check name.
    if ('string' !== typeof gameName) {
        throw new Error('GameLoader.addGame: missing or invalid game name: ' +
                        gameDir + '.');
    }

    // Check if name is unique.
    if (this.servernode.info.games[gameName]) {
        throw new Error('GameLoader.addGame: a game with the same name ' +
                        'already found: ' + gameName + '.');
    }

    // Checking nodeGame server version requirement.
    if (gameInfo.engines) {
        reqFail = gameRequirementsFail(gameInfo.engines.nodegame);
        if (reqFail) {
            throw new Error('GameLoader.addGame: game ' + gameName + ' ' +
                            'requires nodeGame version ' +
                            gameInfo.engines.nodegame  + ' ' +
                            'but found ' + this.servernode.version + '.');
        }
    }

    // Loading settings, setup, and stages.
    gameGame = this.loadGameDir(gameDir);

    // Loading client types.
    clientTypes = this.loadClientTypes(gameDir, gameName);

    // Building language object.
    langObject = this.buildLanguagesObject(gameDir, gameName);

    // Adding game info to global info object.
    this.servernode.info.games[gameName] = {
        dir: gameDir,
        info: gameInfo,
        clientTypes: clientTypes,
        settings: gameGame.settings,
        setup: gameGame.setup,
        stager: gameGame.stager,
        languages: langObject,
        channel: {},
        levels: {},
        alias: []
    };

    // Load channel dir first.
    channel = this.loadChannelDir(gameDir, gameName);

    // Creates a waiting room.
    this.loadWaitRoomDir(gameDir, channel);

    // Loading Auth dir, if any.
    this.loadAuthDir(gameDir, channel);

    // Loading Requirements dir, if any.
    this.loadRequirementsDir(gameDir, channel);

    // Loading levels, if any (nodeGame > 2.x);
    this.loadLevelsDir(gameDir, channel);

    // Tries to load Views file from game directory.
    // this.loadViewsFile(gameDir, gameInfo);

    // Add routes (considering other loaded options: auth, monitor, etc.).
    this.gameRouter.addRoutes(gameDir, gameName,
                              this.servernode.info.games[gameName]);

    // Done.
    this.servernode.logger.info('GameLoader.addGame: added ' +
                                gameName + ': ' + gameDir);
};

/**
 * ### GameLoader.loadLevelsDir
 *
 * Loads the _levels_ dir of the game
 *
 * @param {string} directory The path of the game directory
 *
 * @return {object} An object containing three properties:
 *   'settings', 'stager', and 'setup'.
 *
 * @see GameLoader.addGame
 * @see GameLoader.loadLevel
 */
GameLoader.prototype.loadLevelsDir = function(directory, channel) {
    var i, len, levels, level;
    var levelsPath, levelsPaths, levelConf;
    var logger, gameName;

    logger = this.servernode.logger;
    gameName = channel.gameName;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadLevelsDir: directory must be ' +
                            'string. Game: ' + gameName);
    }
    levelsPath = directory + 'levels/';
    if (!fs.existsSync(levelsPath)) return;

    levelsPaths = fs.readdirSync(levelsPath);

    len = levelsPaths.length
    if (!len) {
        throw new Error('GameLoader.loadLevelsDir: levels dir is empty. ' +
                        'Game: ' + gameName);
    }
    levels = {};
    i = -1;
    for ( ; ++i < len ; ) {
        level = levelsPaths[i];
        levelConf = this.buildLevelConf(levelsPath + level + '/', gameName,
                                        level);
        levels[level] = levelConf;
        this.updateGameInfo(gameName, level, levelConf);
        channel.createGameLevel(levelConf);
    }

    return levels;
};

/**
 * ### GameLoader.loadLevel
 *
 * Loads one of the levels in the _levels_ dir of the game
 *
 * @param {string} directory The path to the level directory
 *
 * @return {object} An object containing three properties:
 *   'settings', 'stager', and 'setup'.
 *
 * @see GameLoader.loadLevel
 */
GameLoader.prototype.buildLevelConf = function(directory, gameName, level) {
    var levelObj, origInfo;
    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadLevel: game: ' + gameName +
                            ': directory must be string. Found: ' +
                            directory);
    }
    // TODO: think about minimal conditions to work.
    levelObj = this.loadGameDir(directory);

    // Merging/cloning from default settings/setup.
    origInfo = this.servernode.getGamesInfo(gameName);
    // J.merge takes care of undefined values.
    levelObj.settings = J.merge(origInfo.settings, levelObj.settings);
    levelObj.setup = J.merge(origInfo.setup, levelObj.setup);

    levelObj.name = level;
    levelObj.waitroom = this.buildWaitRoomConf(directory, gameName, level);
    levelObj.clientTypes = this.loadClientTypes(directory, gameName, level);
    levelObj.requirements = this.buildRequirementsConf(directory, gameName,
                                                       level);
    return levelObj;
};

/**
 * ### GameLoader.loadGameDir
 *
 * Loads the _game_ dir of the game
 *
 * Files game.settings, game.setup, and game.stages will be loaded.
 *
 * If loading a game level, game.settings and game.setup are optional.
 * Otherwise, if missing an error will be thrown.
 *
 * @param {string} directory The path of the game directory
 *
 * @return {object} An object containing three properties:
 *   'settings', 'stager', and 'setup'.
 *
 * @see GameLoader.addGame
 * @see parseGameSettings
 */
GameLoader.prototype.loadGameDir = function(directory, level) {
    var gameName;
    var gameSetupPath, gameSetup;
    var gameSettingsPath, gameSettings, origSettings;
    var gameStagesPath, gameStages;
    var stager;

    if ('string' !== typeof directory) {
        this.doErr('GameLoader.loadGameDir: directory must be string', {
            level: level,
            found: directory,
            type: 'type'
        });
    }

    if (level && 'string' !== typeof level) {
        this.doErr('GameLoader.loadGameDir: level must be string', {
            found: level,
            type: 'type'
        });
    }

    // Settings.
    gameSettingsPath = directory + 'game/game.settings.js';

    // If we are loading a level, settings can be omitted, and the main
    // game.settings are used. If not not omitted, the settings will be
    // mixed-in.
    if (fs.existsSync(gameSettingsPath)) {

        try {
            gameSettings = require(gameSettingsPath);
        }
        catch(e) {
            this.doErr('GameLoader.loadGameDir: an error occurred ' +
                       'while reading game.settings file.', {
                           level: level,
                           err: e,
                           throwErr: true
                       });
        }

        if ('object' !== typeof gameSettings) {
            this.doErr('GameLoader.loadGameDir: invalid settings file, ' +
                       'object expected', {
                           level: level,
                           found: gameSettings
                       });
        }

        if (gameSettings.TIMER) {
            if ('object' !== typeof gameSettings.TIMER) {
                this.doErr('GameLoader.loadGameDir: gameSettings.TIMER ' +
                           'must be object or undefined', {
                               level: level,
                               found: gameSettings.TIMER
                           });
            }
        }
        else {
            gameSettings.TIMER = {};
        }
    }
    else if (!level) {
        this.doErr('GameLoader.loadGameDir: game.settings file not found');
    }

    // Stages.
    gameStagesPath = directory + 'game/game.stages.js';

    try {
        gameStages = require(gameStagesPath);
    }
    catch(e) {
        this.doErr('GameLoader.loadGameDir: an error occurred while reading ' +
                   'game.stages file', {
                       level: level,
                       err: e
                   });

    }

    if ('function' !== typeof gameStages) {
        this.doErr('GameLoader.loadGameDir: game.stages file did not ' +
                   'export a function', {
                       level: level,
                       found: gameStages
                   });
    }

    stager = ngc.getStager();
    gameStages = gameStages(stager, gameSettings);

    // Setup.
    gameSetupPath = directory + 'game/game.setup.js';

    // If we are loading a level, setup can be omitted, and the main
    // game.settings are used. If not not omitted, the settings will be
    // mixed-in.
    if (fs.existsSync(gameSettingsPath)) {

        try {
            gameSetup = require(gameSetupPath);
        }
        catch(e) {
            this.doErr('GameLoader.loadGameDir: an error occurred ' +
                       'while reading game.setup file', {
                           level: level,
                           err: e
                       });
        }

        if ('function' !== typeof gameSetup) {
            this.doErr('GameLoader.loadGameDir: setup file did not ' +
                       'export a function', {
                           level: level,
                           found: gameSetup
                       });
        }

        gameSetup = gameSetup(gameSettings, gameStages);

        if ('object' !== typeof gameSetup) {
            this.doErr('GameLoader.loadGameDir: setup function did ' +
                       'not return a valid object', {
                           level: level,
                           found: gameSetup
                       });
        }
    }
    else if (!level) {
        this.doErr('GameLoader.loadGameDir: game.setup file not found');
    }

    // Parsing the settings object before returning.
    gameSettings = parseGameSettings(gameSettings);

    if ('object' !== typeof gameSettings) {
        this.doErr('GameLoader.loadGameDir: error parsing ' +
                   'treatment object.', {
                       level: level,
                       found: gameSettings
                   });
    }

    return {
        setup: gameSetup,
        settings: gameSettings,
        stager: stager
    };
};

/**
 * ### GameLoader.loadClientTypes
 *
 * Loads client types from _game/client\_types_ directory
 *
 * @param {string} directory The path of the game directory
 *
 * @see GameLoader.addGame
 */
GameLoader.prototype.loadClientTypes = function(directory, gameName, level) {
    var clientTypesDir, fileNames, fileName;
    var clientType, clientTypes, clientTypePath;
    var i, len;
    var logger, errStr;

    if ('string' !== typeof directory) {
        errStr = 'GameLoader.loadClientTypes: directory must be string. ' +
            'Game: ' + gameName;
        if (level) errStr += ' Level: ' + level;
        errStr += '. Found: ' + directory
        throw new TypeError(errStr);
    }

    logger = this.servernode.logger;

    clientTypesDir = directory + 'game/client_types/';

    if (!J.existsSync(clientTypesDir)) {
        errStr = 'GameLoader.loadClientTypes: directory not found. ' +
            'Game: ' + gameName;
        if (level) errStr += '. Level: ' + level;
        errStr += '. Found: ' + directory
        logger.error(errStr);
        return;
    }

    fileNames = fs.readdirSync(clientTypesDir);

    clientTypes = {};

    i = -1, len = fileNames.length;
    for ( ; ++i < len ; ) {
        fileName = fileNames[i];
        // Ignore non-js files, and temporary and hidden files (begin with '.').
        if (path.extname(fileName) === '.js' && fileName.charAt(0) !== '.') {
            clientTypePath = clientTypesDir + fileName;
            if (!fs.statSync(clientTypePath).isDirectory()) {
                try {
                    clientType = require(clientTypePath);
                    clientTypes[fileName.slice(0,-3)] = clientType;
                }
                catch(e) {
                    errStr = 'GameLoader.loadClientTypes: an error occurred ' +
                        'while reading client type: ' + fileName +
                        '. Game: ' + gameName;
                    if (level) errStr += '. Level: ' + level;
                    errStr += '. Err: \n' + e.stack;
                    logger.error(errStr);
                    throw e;
                }
            }
        }
    }

    // Checking if mandatory types are found.
    if (!clientTypes.logic) {
        errStr = 'GameLoader.loadClientTypes: logic type not found. Game: ' +
            gameName;
        if (level) errStr += ('. Level: ' + level);
        throw new Error(errStr);
    }
    if (!clientTypes.player) {
        errStr = 'GameLoader.loadClientTypes: player type not found. Game: ' +
            gameName;
        if (level) errStr += ('. Level: ' + level);
        throw new Error(errStr);
    }

    return clientTypes;
};

/**
 * ### GameLoader.buildLanguagesObject
 *
 * Builds an object containing language objects for a given game directory
 *
 * @param {string} directory The directory of the game.
 * @param {string} gameName The name of the game.
 *
 * @return {object} languages Object of language objects.
 */
GameLoader.prototype.buildLanguagesObject = function(directory, gameName) {
    var ctxPath, langPaths, languages, languageObject;
    var i, len, langFile;

    ctxPath = directory + '/views/contexts/';
    if (!fs.existsSync(ctxPath)) return;

    langPaths = fs.readdirSync(ctxPath);
    languages = {};

    i = -1, len = langPaths.length;
    for ( ; ++i < len ; ) {
        // Only directories.
        if (!fs.lstatSync(ctxPath + langPaths[i]).isDirectory()) continue;

        languageObject = {};

        langFile = ctxPath + langPaths[i] + '/languageInfo.json';
        if (fs.existsSync(langFile)) languageObject = require(langFile);

        languageObject.shortName = langPaths[i];
        languages[languageObject.shortName] = languageObject;
    }
    return languages;
};

/**
 * ### GameLoader.loadChannelDir
 *
 * Loads several files from `channel/` dir
 *
 * Read: _channel.settings.js_, _channel.credentials.js_, _channel.secret.js
 *
 * @param {string} directory The directory of the game.
 * @param {string} gameName The name of the game.
 *
 * @return {ServerChannel} The created channel.
 *
 * @see GameLoader.loadChannelFile
 * @see ServerChannel
 */
GameLoader.prototype.loadChannelDir = function(directory, gameName) {
    var settings, pwdFile, jwtFile;
    var channel;

    // 1. Channel settings.
    settings = this.loadChannelFile(directory, gameName);

    // Save ref. to newly created channel.
    channel = this.servernode.channels[gameName];

    // 2. Credentials.
    pwdFile = directory + 'channel/channel.credentials.js';

    loadSyncAsync(pwdFile, settings, 'loadChannelDir', function(credentials) {
        // TODO: checkings. Add method.
        channel.credentials = credentials;
    });

    // 3. JWT secret.
    jwtFile = directory + 'channel/channel.secret.js';

    loadSyncAsync(jwtFile, settings, 'loadChannelDir', function(secret) {
        // TODO: checkings. Add method.
        channel.secret = secret;
    });

    return channel;
};


/**
 * ### GameLoader.loadChannelFile
 *
 * Loads _channel.settings.js_ from file system and adds channels accordingly
 *
 * Synchronously looks for a file called _channel.settings.js_ at the top
 * level of the specified directory.
 *
 * The file _channel.settings.js_ must export one channel object in the
 * format specified by the _ServerChannel_ constructor. Every channel
 * configuration object can optionally have a _waitingRoom_ object to
 * automatically add a waiting room to the channel.
 *
 * @param {string} directory The directory of the game
 * @param {string} gameName The name of the game
 *
 * @see ServerChannel
 * @see ServerChannel.createWaitingRoom
 * @see ServerNode.addChannel
 */
GameLoader.prototype.loadChannelFile = function(directory, gameName) {
    var channelsFile;
    var channel, waitRoom;
    var i, len;
    var channelConf, waitRoomConf;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadChannelFile: directory must be ' +
                            'string.');
    }

    channelsFile = directory + '/channel/channel.settings.js';

    if (!fs.existsSync(channelsFile)) return;

    channelConf = require(channelsFile);

    // Validate

    if ('object' !== typeof channelConf) {
        throw new TypeError('GameLoader.loadChannelFile:' +
                            'channels must be object. Directory: ' +
                            directory);
    }
    if (channelConf.waitingRoom &&
        'object' !== typeof channelConf.waitingRoom) {

        throw new TypeError('GameLoader.loadChannelFile: waitingRoom ' +
                            'in channel configuration must be object. ' +
                            'Directory: ' + directory);
    }
    waitRoomConf = channelConf.waitingRoom;
    delete channelConf.waitingRoom;

    if (channelConf.name) {
        if ('string' !== channelConf.name) {
            throw new TypeError('GameLoader.loadChannelFile: name ' +
                                'must be string or undefined. ' +
                                'Directory: ' + directory);
        }
    }
    else {
        channelConf.name = gameName;
    }

    channelConf.gameName = gameName;

    channel = this.servernode.addChannel(channelConf);

    if (channel) {

        // Add the list of channels created by the game.
        this.servernode.info.games[gameName].channel = {
            player: channel.playerServer ?
                channel.playerServer.endpoint : null,
            admin: channel.adminServer ?
                channel.adminServer.endpoint : null
        };

        if (waitRoomConf) {

            // We prepend the baseDir parameter, if any.
            // If logicPath is not string we let the WaitingRoom
            // constructor throw an error.
            if ('string' === typeof waitRoomConf.logicPath) {
                waitRoomConf.logicPath = checkLocalPath(
                    directory, 'channel/', waitRoomConf.logicPath);
            }

            waitRoom = channel.createWaitingRoom(waitRoomConf);

            if (!waitRoom) {
                throw new Error('GameLoader.loadChannelFile: could ' +
                                'not add waiting room to channel ' +
                                channel.name);
            }
        }

        // Adding channel alias.
        if (channelConf.alias) {
            this.createGameAlias(channelConf.alias, gameName);
        }

    }
    // Errors in channel creation are already logged.

    return channelConf;
};

/**
 * ### GameLoader.buildWaitRoomConf
 *
 * Loads _waitroom/room.settings.js_ from file system, checks it and returns it
 *
 * Synchronously looks for a file called _waitroom/room.settings.js_ at the top
 * level of the specified directory.
 *
 * @param {string} directory The directory of the game
 * @param {ServerChannel} channel The channel object
 *
 * @return {object} conf The waiting room configuration
 *
 * @see ServerChannel.createWaitingRoom
 */
GameLoader.prototype.buildWaitRoomConf = function(directory, gameName, level) {
    var waitRoomSettingsFile, waitRoomFile, conf, waitRoom;
    var logger, gameName, update, errStr;

    if ('string' !== typeof directory) {
        errStr = 'GameLoader.buildWaitRoomConf: directory must be ' +
            'string. Game: ' + gameName;
        if (level) errStr += '. Level: ' + level;
        errStr += '. Found: ' + directory;
        throw new TypeError(errStr);
    }

    logger = this.servernode.logger;

    waitRoomSettingsFile = directory + 'waitroom/waitroom.settings.js';

    if (!fs.existsSync(waitRoomSettingsFile)) {
        errStr = 'GameLoader.buildWaitRoomConf: file waitroom.settings ' +
            'not found. Game: ' + gameName;
        if (level) errStr += '. Level: ' + level;
        logger.error(errStr);
        return;
    }

    try {
        conf = require(waitRoomSettingsFile);
    }
    catch(e) {
        errStr = 'GameLoader.buildWaitRoomConf: error reading ' +
            'waitroom.settings file. Game: ' + gameName + '.';
        if (level) errStr += ' Level: ' + level;
        errStr += '. Err: \n' + e.stack;
        logger.error(errStr);
        throw e;
    }

    if ('object' !== typeof conf) {
        errStr = 'GameLoader.buildWaitRoomConf: room.settings file ' +
            'must return a configuration object. Game: ' + gameName + '.';
        if (level) errStr += ' Level: ' + level;
        throw new TypeError(errStr);
    }

    if (conf.logicPath) {
        if ('string' === typeof conf.logicPath) {
            errStr = 'GameLoader.buildWaitRoomConf: configuration ' +
                'loaded, but "logicPath" must be undefined or string. ' +
                'Game: ' + gameName + '.';
            if (level) errStr += ' Level: ' + level;
            throw new TypeError(errStr);
        }
        conf.logicPath = checkLocalPath(directory, 'waitroom/', conf.logicPath);
    }
    else {
        waitRoomFile = directory + 'waitroom/waitroom.js';
        if (fs.existsSync(waitRoomFile)) {
            conf.logicPath = waitRoomFile;
        }
    }

    return conf;
};

/**
 * ### GameLoader.loadWaitRoomDir
 *
 * Loads the waiting room configuration and creates the object in channel
 *
 * Synchronously looks for a file called _waitroom/room.settings.js_ at the top
 * level of the specified directory.
 *
 * @param {string} directory The directory of the game
 * @param {ServerChannel} channel The channel object
 *
 * @return {WaitingRoom} waitRoom The created waiting room
 *
 * @see GameLoader.buildWaitRoomConf
 * @see ServerChannel.createWaitingRoom
 */
GameLoader.prototype.loadWaitRoomDir = function(directory, channel) {
    var conf, waitRoom;
    conf = this.buildWaitRoomConf(directory, channel);
    // Add waiting room information to global game object.
    this.updateGameInfo(channel.gameName, { waitroom: conf });
    waitRoom = channel.createWaitingRoom(conf, true);
    if (!waitRoom) {
        throw new Error('GameLoader.loadWaitRoomDir: could not create ' +
                        'waiting room. Game: ' + gameName + '.');
    }
    return waitRoom;
};

/**
 * ### GameLoader.loadAuthDir
 *
 * Reads the `auth/` directory and imports settings from it
 *
 * If a function is found in `auth/auth.js` it calls it with an object
 * containing a sandboxed environment for authorization, clientId
 * generation and clientObject decoration.
 *
 * @param {string} file The path to the configuration file
 * @param {ServerChannel} channel The channel object
 *
 * @see GameLoader.getChannelSandbox
 */
GameLoader.prototype.loadAuthDir = function(directory, channel) {
    var authFile, authSettingsFile, authCodesFile;
    var settings, codes;
    var authObj, sandboxAuth, sandboxIdGen, sandboxDecorate;
    var gameName;
    var logger;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadAuthDir: directory must be ' +
                            'string.');
    }

    gameName = channel.gameName;
    logger = this.servernode.logger;

    // Check if directory exists.
    if (!fs.existsSync(directory + 'auth/')) {
        logger.warn('GameLoader.loadRequirementsDir: channel ' + gameName +
                    ': no auth directory.');1

        // Add information to global game object.
        this.updateGameInfo(gameName, { auth: { enabled: false } });
        return;
    }

    // Auth settings.

    authSettingsFile = directory + 'auth/auth.settings.js';

    if (!fs.existsSync(authSettingsFile)) {
        settings = {
            enabled: true,
            mode: 'auto',
            codes: 'auth.codes'
        };
        logger.warn('GameLoader.loadAuthDir: channel' + gameName +
                    ': no auth settings. Default settings used.');
    }
    else {
        try {
            settings = require(authSettingsFile);
        }
        catch(e) {
            throw new Error('GameLoader.loadAuthDir: cannot read ' +
                            authSettingsFile + ': ' + e.stack);
        }

        if ('object' !== typeof settings) {
            throw new Error('GameLoader.loadAuthDir: invalid settings file: ' +
                            authSettingsFile + ': ' + e.stack);
        }
    }

    // Enable authorization by default.
    if ('undefined' === typeof settings.enabled) settings.enabled = true;

    // Add waiting room information to global game object.
    this.updateGameInfo(gameName, { auth: settings });


    // Exit here if auth is disabled.
    if (!settings.enabled) {
        logger.warn('GameLoader.loadAuthDir: channel ' + gameName +
                    ': authorization disabled in configuration file.');
        return;
    }

    // Auth codes. Can be synchronous or asynchronous.

    authCodesFile = directory + 'auth/' + (settings.codes || 'auth.codes.js');

    if (fs.existsSync(authCodesFile)) {
        try {
            codes = require(authCodesFile)(settings, function(err, codes) {
                if (err) {
                    throw new Error('GameLoader.loadAuthDir: an error ' +
                                    'occurred: ' + err);
                }
                importAuthCodes(channel, codes, authCodesFile);
            });
        }
        catch(e) {
            throw new Error('GameLoader.loadAuthDir: cannot read ' +
                            authCodesFile + ": \n" + e.stack);
        }

        if (codes) importAuthCodes(channel, codes, authCodesFile);
    }

    // Auth file.

    authFile = directory + 'auth/auth.js';

    if (fs.existsSync(authCodesFile)) {
        sandboxAuth = this.getChannelSandbox(channel, 'authorization');
        sandboxIdGen = this.getChannelSandbox(channel, 'clientIdGenerator');
        sandboxDecorate = this.getChannelSandbox(channel, 'clientObjDecorator');

        authObj = {
            authorization: sandboxAuth,
            clientIdGenerator: sandboxIdGen,
            clientObjDecorator: sandboxDecorate
        };

        try {
            require(authFile)(authObj, settings);
        }
        catch(e) {
            throw new Error('GameLoader.loadAuthDir: cannot read ' +
                            authCodesFile + '. ' + e.stack);
        }
    }
};

/**
 * ### GameLoader.buildRequirementsConf
 *
 * Reads the `requirements/` directory and imports settings from it
 *
 * @param {string} file The path to the configuration file
 * @param {ServerChannel} channel The channel object
 *
 * @return {RequirementsRoom} The requirements room (if one is created)
 *
 * @see GameLoader.buildRequirementsConf
 * @see ServerChannel.createRequirementsRoom
 */
GameLoader.prototype.buildRequirementsConf = function(directory, gameName,
                                                      level) {

    var file, settingsFile, settings;
    var logger, gameName;
    var reqFunc, reqObj;
    var errStr;

    if ('string' !== typeof directory) {
        errStr = 'GameLoader.buildRequirementsConf: directory must be ' +
            'string. Game: ' + gameName;
        if (level) errStr += '. Level: ' + level;
        errStr += '. Found: ' + directory;
        throw new TypeError(errStr);
    }

    logger = this.servernode.logger;

    if (!fs.existsSync(directory + 'requirements/')) {
        errStr = 'GameLoader.buildRequirementsConf: no requirements ' +
            'directory. Game: ' + gameName;
        if (level) errStr += '. Level: ' + level;
        logger.warn(errStr);

        // Add information to global game object.
        return { enabled: false };
    }

    // Requirements settings.
    settingsFile = directory + 'requirements/requirements.settings.js';

    if (!fs.existsSync(settingsFile)) {
        settings = { enabled: true };
        errStr = 'GameLoader.buildRequirementsConf: no settings file found. ' +
            'Default settings used. Game: ' + gameName;
        if (level) errStr += '. Level: ' + level;
        logger.warn(errStr);;
    }

    else {
        try {
            settings = require(settingsFile);
        }
        catch(e) {
            errStr = 'GameLoader.buildRequirementsConf: an error occurred ' +
                'while reading settings file. Game: ' + gameName;
            if (level) errStr += '. Level: ' + level;
            errStr += '. Err: \n' + e.stack
            throw new Error(errStr);
        }

        if ('object' !== typeof settings) {
            errStr = 'GameLoader.buildRequirementsConf: invalid ' +
                'settings file. Game: ' + gameName;
            if (level) errStr += ' Level: ' + level;
            throw new Error(errStr);
        }
    }

    // We prepend the baseDir parameter, if any.
    // If logicPath is not string RequirementsRoom constructor throws an error.
    if ('string' === typeof settings.logicPath) {
        settings.logicPath = checkLocalPath(directory, 'requirements/',
                                            settings.logicPath);
    }

    // Enable requirements by default.
    if ('undefined' === typeof settings.enabled) settings.enabled = true;

    // Exit here if requirements is disabled.
    if (!settings.enabled) {
        errStr = 'GameLoader.buildRequirementsConf: requirements checking ' +
            'disabled in configuration file. Game: ' + gameName;
        if (level) errStr += ' Level: ' + level;
        logger.warn(errStr);

        return settings;
    }

    // Requirements file.

    file = directory + 'requirements/requirements.js';

    if (fs.existsSync(file)) {
        reqObj = {};
        reqFunc = new RequirementsSandbox(gameName, reqObj);

        try {
            require(file)(reqFunc, settings);
            reqObj.enabled = true;
        }
        catch(e) {
            errStr = 'GameLoader.buildRequirementsConf: an error occurred ' +
                'while trying to execute requirements file. Game: ' + gameName;
            if (level) errStr += ' Level: ' + level;
            errStr += '. \n' + e.stack;
            throw new Error(errStr);
        }
    }

    // Return final settings.
    return J.merge(settings, reqObj);
};

/**
 * ### GameLoader.loadRequirementsDir
 *
 * Loads the requirements room configuration and creates the object in channel
 *
 * @param {string} file The path to the configuration file
 * @param {ServerChannel} channel The channel object
 *
 * @return {RequirementsRoom} The requirements room (if one is created)
 */
GameLoader.prototype.loadRequirementsDir = function(directory, channel) {
    var conf, reqRoom;
    conf = this.buildRequirementsConf(directory, channel);
    // Add waiting room information to global game object.
    this.updateGameInfo(channel.gameName, { requirements: conf });
    reqRoom = channel.createRequirementsRoom(conf, true);
    if (!reqRoom) {
        throw new Error('GameLoader.loadRequirementsRoomDir: could not ' +
                        'create requirements room. Game: ' + channel.gameName +
                        '.');
    }
    return reqRoom;
};

// TODO: see if we want to add it to prototype.
// Else remove getChannelSandbox also (maybe).

function RequirementsSandbox(gameName, requirementsObj) {
    var errBegin = 'GameLoader.loadRequirementsDir: ' + gameName + ': ';
    this.add = function(cb, params) {
        if ('function' !== typeof cb) {
            throw new TypeError(errBegin + 'requirement must be function.');
        }
        if (params && 'object' !== typeof params) {
            throw new TypeError(errBegin + 'params must be object or ' +
                                'undefined: ', params);
        }
        if (!requirementsObj.requirements) requirementsObj.requirements = [];
        requirementsObj.requirements.push({ cb: cb, params: params });
    };
    this.onSuccess = function(cb) {
        if ('function' !== typeof cb) {
            throw new TypeError(errBegin + 'onSuccess callback must be ' +
                                'function.');
        }
        requirementsObj.onSuccess = cb;
    };
    this.onFailure = function(cb) {
        if ('function' !== typeof cb) {
            throw new TypeError(errBegin + 'onFailure callback must be ' +
                                'function.');
        }
        requirementsObj.onFailure = cb;
    };
    this.setMaxExecutionTime = function(maxTime) {
        if ('number' !== typeof maxTime) {
            throw new TypeError(errBegin + 'max execution time must be ' +
                                'number:' + maxTime + '.');
        }
        requirementsObj.maxExecTime = maxTime;
    };
}

/**
 * ### GameLoader.getChannelSandbox
 *
 * Returns a sandbox function to configure a channel
 *
 * The sandbox is a callback that accepts 1 or 2 parameters, the last
 * one must be a callback and the first one is the name of the server
 * ('player' or 'admin') to which the callback should be applied
 * to. If only the callback is provided, then it is applied to both
 * 'player' and 'admin' servers.
 *
 * @param {string} channelName The name of the game
 * @param {string} method The name of the method in ServerChannel
 * @param {string} methodName Optional The name of the method as diplayed in
 *   error messages.
 *
 * @return {function} The sandbox
 *
 * @see GameLoader.loadAuthDir
 * @see GameLoader.getChannelSandbox
 */
GameLoader.prototype.getChannelSandbox = function(channel, method, methodName) {

    var that, channelName;

    that = this;
    channelName = channel.name;
    methodName = methodName || method;

    return function() {
        var len;
        var callback;
        var errorBegin;
        var servernode;

        servernode = that.servernode;

        errorBegin = 'GameLoader.loadAuthDir: ' + methodName + ' callback: ';

        len = arguments.length;

        if (len > 2) {
            throw new Error(errorBegin +
                            'accepts maximum 2 input parameters, ' +
                            len + ' given. Game: ' + channelName + '.');
        }

        callback = arguments[len-1];

        if ('function' !== typeof callback) {
            throw new TypeError(errorBegin + 'last parameter must be ' +
                                'function. Game: ' + channelName + '.');
        }

        // Channels defined by a game with the channels.js file.
        // Auth callback can modify the authorization only of those.

        // 1 Auth for both admin and player servers.
        if (len === 1) {
            channel.adminServer[method](callback);
            channel.playerServer[method](callback);
        }

        // 1 Auth for one server: admin or player.
        else {

            if (arguments[0] !== 'admin' && arguments[0] !== 'player') {
                throw new TypeError(errorBegin + 'server parameter must ' +
                                    'be either "player" or "admin". ' +
                                    'Given: ' + arguments[0] + '. ' +
                                    'Game: ' + channelName + '.');
            }
            channel[arguments[0] + 'Server'][method](callback);
        }
    };
};

/**
 * ### GameLoader.updateGameInfo
 *
 * Updates information about an existing game
 *
 * @param {string} gameName The name of the game
 * @param {string} level Optional. The name of the level to update. If not
 *    existing it will be added. Important. This parameter can be omitted
 * @param {object} update An object containing properties to mixin.
 */
GameLoader.prototype.updateGameInfo = function(gameName) {
    var gameInfo, update, level;

    if (arguments.length === 2) {
        update = arguments[1];
    }
    // 3 or more.
    else {
        level = arguments[1];
        update = arguments[2];
    }

    if ('string' !== typeof gameName) {
        throw new TypeError('GameLoader.updateGameInfo: gameName must ' +
                            'be string. Found: ' + gameName);
    }
    if ('object' !== typeof update) {
        throw new TypeError('GameLoader.updateGameInfo: update must ' +
                            'be object. Found: ' + update);
    }
    if (level && 'string' !== typeof level) {
        throw new TypeError('GameLoader.updateGameInfo: level must ' +
                            'be string or undefined. Found: ' + level);
    }

    gameInfo = this.servernode.getGamesInfo(gameName);
    if (!gameInfo) {
        throw new Error('GameLoader.updateGameInfo: game not found: ' +
                        gameName + '.');
    }
    if (!level) {
        J.mixin(gameInfo, update);
    }
    else {
        if (!gameInfo.levels[level]) gameInfo.levels[level] = update;
        else J.mixin(gameInfo.levels[level], update);
    }
    return gameInfo;
};

/**
 * ### GameLoader.createGameAlias
 *
 * Adds one or multiple game alias
 *
 * Adds references into the `info.games` and `resourceManager.games` objects.
 *
 * @param {string} alias The name of the alias
 * @param {string} gameName The name of the game
 *
 * @see GameLoader.addGame
 * @see ServerChannel.resourceManager
 */
GameLoader.prototype.createGameAlias = function(alias, gameName) {
    var servernode, gameInfo;
    var i, len;

    if ('string' === typeof alias) {
        alias = [alias];
    }
    if (!J.isArray(alias)) {
        throw new TypeError('GameLoader.createGameAlias: alias' +
                            'must be either string or array.');
    }
    if ('string' !== typeof gameName) {
        throw new TypeError('GameLoader.createGameAlias: gameName must be ' +
                            'string.');
    }

    servernode = this.servernode;
    gameInfo = servernode.getGamesInfo(gameName);
    if (!gameInfo) {
        throw new Error('GameLoader.createGameAlias: game not found: ' +
                        gameName);
    }

    i = -1;
    len = alias.length;
    for ( ; ++i < len ; ) {
        if ('string' !== typeof alias[i]) {
            throw new TypeError(
                'GameLoader.createGameAlias: alias must be string.');
        }
        if (servernode.info.games[alias[i]]) {
            throw new Error('GameLoader.createGameAlias: ' +
                            'alias must be unique: ' + alias[i] +
                            ' (' + gameName + ').');
        }

        // TODO: do not add aliases to the info.games object.
        // (we need to make sure aliases do not clash).
        servernode.info.games[alias[i]] = servernode.info.games[gameName];
        servernode.resourceManager.createAlias(alias[i], gameName);
        gameInfo.alias.push(alias[i]);
    }
};

/**
 * ### GameLoader.doErr
 *
 * Throws and/or logs an error happened while loading a game
 *
 * Adds automatically useful information such as game name, or level name.
 *
 * @param {string} msg
 * @param {object} opts Optional. Options to build and handle the error.
 *    Available options:
 *
 *      - level: the name of the gameLevel where the error happened;
 *      - found: an invalid value found instead of the expected one;
 *      - log: if TRUE, the message will be logged
 *      - err: an Error object to print the stack of
 *      - throwErr: if TRUE, the err value will be thrown instead
 *      - throwIt: if FALSE, the error will NOT be thrown
 *      - type: the type of error to throw. ('type' for TypeError)
 */
GameLoader.prototype.doErr = function(msg, opts) {
    opts = opts || {};
    msg += '. Game: ' + this.channel.gameName;
    if (opts.level) msg += '. Level: ' + opts.level;
    if (opts.found) msg += '. Found: ' + opts.found;
    if (opts.err) msg += '. Err:\n' + opts.err.stack;
    if (opts.log) this.servernode.logger.error(msg);
    if (opts.throwErr) {
        if (!opts.err) {
            throw new Error('GameLoader.doErr: throwErr is true, but no ' +
                            'error given.');
        }
        throw opts.err;
    }
    if (opts.throwIt !== false) {
        if (!opts.errType) throw new Error(msg);
        else if (opts.errType === 'type') throw new TypeError(msg);
        else throw new Error('GameLoader.doErr: unknown type: ' + opts.errType);
    }
};

// ## Helper methods

/**
 * ### checkLocalPath
 *
 * Helper function to specify full path in a game subdir
 *
 * Checks if the file starts with './' and, if so, adds the absolute path
 * to the game directory in front.
 *
 * @param {string} gameDir The absolute path of the game directory
 * @param {string} subDir The name of the game sub directory
 * @param {string} filePath The path of the file in the sub directory
 *
 * @return {string} The updated file path (if local)
 */
function checkLocalPath(gameDir, subDir, filePath) {
    if (filePath.substring(0,2) === './') {
        return path.resolve(gameDir, subDir, filePath);
    }
    return filePath;
}

/**
 * ### version2GameStage
 *
 * Helper function to parse a version string into a GameStage
 *
 * Cannot use GameStage constructor because it does not accept stage = 0
 * Adds always +1 to every component (stage, step, round),
 * so that GameStage.compare does not complain.
 *
 * @param {string} str The version number to parse
 *
 * @see GameStage constructor
 */
function version2GameStage(str) {
    var tokens, stage, step, round;
    var out;
    tokens = str.trim().split('.');
    stage = parseInt(tokens[0], 10) + 1;
    if (isNaN(stage)) return false;
    step  = parseInt(tokens[1], 10) + 1;
    if (isNaN(step)) return false;
    round = parseInt(tokens[2], 10) + 1;
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


/**
 * ### parseGameSettings
 *
 * Parses a game settings object and builds the treatments object
 *
 * If no `treatments` property is defined, one is created with one entry
 * named 'standard'.
 *
 * All properties of the 'standard' treatment are shared with the other
 * settings.
 *
 * @param {object} game The path to a package.json file,
 *   or its content as loaded from `require`
 *
 * @return {object} out The parsed settings object containing treatments
 *
 * @see GameLoader.addGame
 */
function parseGameSettings(settingsObj) {
    var standard, t, out;
    var treatments;
    if ('object' !== typeof settingsObj) {
        throw new TypeError('parseGameSettings: settingsObj must be object.');
    }

    out = {};
    standard = J.clone(settingsObj);
    if (!settingsObj.treatments) {
        out.standard = standard;
        out.standard.treatmentName = 'standard';
        out.standard.name = 'standard';

    }
    else {
        treatments = settingsObj.treatments;
        delete standard.treatments;
        for (t in treatments) {
            if (treatments.hasOwnProperty(t)) {
                out[t] = J.merge(standard, treatments[t]);
                out[t].treatmentName = t;
                out[t].name = t;
            }
        }
    }

    return out;
}

/**
 * ### importAuthCodes
 *
 * Imports an array of authorization codes into the channel registry
 *
 * @param {ServerChannel} channel
 * @param {array} codes The array of codes
 * @param {string} file The name of the file that returned the codes
 *   (used in case of errors)
 *
 */
function importAuthCodes(channel, codes, file) {
    if (!J.isArray(codes)) {
        throw new Error('GameLoader.loadAuthDir: codes file must ' +
                        'return an array of codes, or undefined ' +
                        '(if asynchronous): ' + file + '.');
    }
    channel.registry.importClients(codes);
}

function loadSyncAsync(filepath, settings, method, cb) {
    var result;

    if (fs.existsSync(filepath)) {
        try {
            result = require(filepath)(settings, function(err, result) {
                if (err) {
                    throw new Error('GameLoader.' + method + ': an error ' +
                                    'occurred: ' + err);
                }
                cb(result);
            });
        }
        catch(e) {
            throw new Error('GameLoader.' + method + ': cannot read ' +
                            pwdFile + ": \n" + e.stack);
        }

        if (result) cb(result);
    }
}

// TODO: see if we need it in the future:

 /**
  * ### GameLoader.loadViewsFile
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
// GameLoader.prototype.loadViewsFile = function(directory, gameInfo) {
//     var viewsFile, that, gameName;
//
//     if ('string' !== typeof directory) {
//         throw new TypeError('GameLoader.loadViewsFile: directory must be ' +
//                             'string.');
//     }
//     gameName = gameInfo.name;
//
// // TODO: see if still needed (broken now).
// //
// //     that = this;
// //     viewsFile = directory + 'views/views.js';
// //     fs.exists(viewsFile, function(exists) {
// //          var cb, sb;
// //          if (!exists) return;
// //          cb = require(viewsFile);
// //          if ('function' !== typeof cb) {
// //              throw new TypeError('GameLoader.loadViewsFile: ' +
// //                  'views.js did not ' +
// //                  'return a valid function. Dir: ' + directory);
// //          }
// //          // Execute views function in a sandboxed enviroment.
// //          // A game cannot modify other games settings.
// //          sb = that.servernode.resourceManager
// //               .getSandBox(gameName, directory);
// //          cb(sb, gameInfo.settings);
// //      });
// };
