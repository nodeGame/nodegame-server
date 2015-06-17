/**
 * # GameLoader
 * Copyright(c) 2015 Stefano Balietti
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
 * ### GameLoader.updateGameInfo
 *
 * Updates information about an existing game
 *
 * @param {string} gameName The name of the game
 * @param {object} update An object containing properties to mixin
 */
GameLoader.prototype.updateGameInfo = function(gameName, update) {
    var gameInfo;
    if ('string' !== typeof gameName) {
        throw new TypeError('GameLoader.updateGameInfo: gameName must ' +
                            'be string.');
    }
    if ('object' !== typeof update) {
        throw new TypeError('GameLoader.updateGameInfo: update must ' +
                            'be object.');
    }

    gameInfo = this.servernode.info.games[gameName];
    if (!gameInfo) {
        throw new TypeError('GameLoader.updateGameInfo: game not found: ' +
                            gameName + '.');
    }

    J.mixin(gameInfo, update);
    return gameInfo;
};

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
    var gameType, gameGame, game, gameName;
    var channel;

    if ('object' !== typeof gameInfo) {
        throw new TypeError('GameLoader.addGame: gameInfo must be object.');
    }
    if ('string' !== typeof gameDir) {
        throw new TypeError('GameLoader.addGame: gameDir must be string.');
    }

    gameName = gameInfo.name;

    // Check name.
    if ('string' !== typeof gameName) {
        throw new Error('GameLoader.addGame: missing or invalid game name: ' +
                        gameDir + '.');
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
    gameGame = this.loadGameGameDir(gameDir);

    // Loading client types.
    clientTypes = this.loadClientTypes(gameDir);

    // Building language object.
    langObject = this.buildLanguagesObject(gameDir);

    // Adding game info to global info object.
    this.servernode.info.games[gameName] = {
        dir: gameDir,
        info: gameInfo,
        clientTypes: clientTypes,
        settings: gameGame.settings,
        setup: gameGame.setup,
        stager: gameGame.stager,
        languages: langObject,
        channels: {}
    };

    // Load server dir first (channels, etc.).
    channel = this.loadChannelDir(gameDir, gameName);

    // Creates a waiting room.
    this.loadWaitRoomDir(gameDir, channel);

    // Loading Auth dir, if any.
    this.loadAuthDir(gameDir, channel);

    // Loading Requirements dir, if any.
    this.loadRequirementsDir(gameDir, channel);

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
 * ### GameLoader.loadGameGameDir
 *
 * Loads the _game_ dir of the game
 *
 * @param {string} directory The path of the game directory
 *
 * @return {object} An object containing three properties:
 *   'settings', 'stager', and 'setup'.
 *
 * @see GameLoader.addGame
 * @see parseGameSettings
 */
GameLoader.prototype.loadGameGameDir = function(directory) {
    var gameSetupPath, gameSetup;
    var gameSettingsPath, gameSettings;
    var gameStagesPath, gameStages;
    var stager;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadGameGameDir: directory must be ' +
                            'string.');
    }

    // Settings.
    gameSettingsPath = directory + 'game/game.settings.js';

    try {
        gameSettings = require(gameSettingsPath);
    }
    catch(e) {
        throw new Error('GameLoader.loadGameGameDir: cannot read ' +
                        gameSettingsPath + '.');
    }

    if ('object' !== typeof gameSettings) {
        throw new Error('SeverNode.loadGameGameDir: invalid settings file: ' +
                        gameSettingsPath + '.');
    }

    // Stages.
    gameStagesPath = directory + 'game/game.stages.js';

    try {
        gameStages = require(gameStagesPath);
    }
    catch(e) {
        throw new Error('GameLoader.loadGameGameDir: cannot read ' +
                        gameStagesPath + '.');
    }

    if ('function' !== typeof gameStages) {
        throw new Error('SeverNode.loadGameGameDir: stages file did not ' +
                        'export a valid function: ' + gameStagesPath + '.');
    }

    stager = ngc.getStager();
    gameStages = gameStages(stager, gameSettings);

    // Setup.
    gameSetupPath = directory + 'game/game.setup.js';

    try {
        gameSetup = require(gameSetupPath);
    }
    catch(e) {
        throw new Error('GameLoader.loadGameGameDir: cannot read ' +
                        gameSetupPath + '.');
    }

    if ('function' !== typeof gameSetup) {
        throw new Error('SeverNode.loadGameGameDir: setup file did not ' +
                        'export a valid function: ' + gameSetupPath + '.');
    }

    gameSetup = gameSetup(gameSettings, gameStages);

    if ('object' !== typeof gameSetup) {
        throw new Error('SeverNode.loadGameGameDir: setup function did  ' +
                        'not return a valid object: ' + gameSetupPath + '.');
    }

    // Parsing the settings object before returning.
    gameSettings = parseGameSettings(gameSettings);

    if ('object' !== typeof gameSettings) {
        throw new Error('SeverNode.loadGameGameDir: error parsing ' +
                        'treatment object: ' + gameSettingsPath + '.');
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
GameLoader.prototype.loadClientTypes = function(directory) {
    var clientTypesDir, fileNames, fileName;
    var clientType, clientTypes, clientTypePath;
    var i, len;
    var logger;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadClientTypes: directory must be ' +
                            'string.');
    }

    logger = this.servernode.logger;

    clientTypesDir = directory + 'game/client_types/';

    if (!J.existsSync(clientTypesDir)) {
        logger.error('GameLoader.loadClientTypes: game directory not ' +
                     'found: ' + dir);
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
                    logger.error('GameLoader.loadClientTypes: cannot ' +
                                 'read ' + clientTypePath + '.');
                    throw e;
                }
            }
        }
    }

    // Checking if mandatory types are found.
    if (!clientTypes.logic) {
        throw new Error('GameLoader.loadClientTypes: logic type not found.');
    }
    if (!clientTypes.player) {
        throw new Error('GameLoader.loadClientTypes: player type not found.');
    }

    return clientTypes;
};

/**
 * ### GameLoader.buildLanguagesObject
 *
 * Builds an object containing language objects for a given game directory
 *
 * @param {string} directory The directory of the game.
 * @return {object} languages Object of language objects.
 */
GameLoader.prototype.buildLanguagesObject = function(directory) {
    var ctxPath, langPaths, languages, languageObject;
    var i, len, langFile;

    ctxPath = directory + '/views/contexts/';
    if (!fs.existsSync(ctxPath)) return;

    langPaths = fs.readdirSync(ctxPath);
    languages = {};

    i = -1, len = langPaths.length;
    for ( ; ++i < len ; ) {
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

    if (!channelConf.name) channelConf.name = gameName;
    channelConf.gameName = gameName;

    channel = this.servernode.addChannel(channelConf);

    if (channel) {

        // Add the list of channels created by the game.
        this.servernode.info.games[gameName].channels[channel.name] = {
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
 * ### GameLoader.loadWaitRoomDir
 *
 * Loads _waitroom/room.settings.js_ from file system and acts accordingly
 *
 * Synchronously looks for a file called _waitroom/room.settings.js_ at the top
 * level of the specified directory.
 *
 * @param {string} directory The directory of the game
 * @param {ServerChannel} channel The channel object
 *
 * @return {WaitingRoom} waitRoom The created waiting room
 *
 * @see ServerChannel.createWaitingRoom
 */
GameLoader.prototype.loadWaitRoomDir = function(directory, channel) {
    var waitRoomSettingsFile, waitRoomFile, conf, waitRoom;
    var logger, gameName;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadWaitRoomDir: directory must be ' +
                            'string.');
    }
    logger = this.servernode.logger;
    gameName = channel.gameName;

    waitRoomSettingsFile = directory + 'waitroom/waitroom.settings.js';

    if (!fs.existsSync(waitRoomSettingsFile)) {
        logger.error('GameLoader.loadWaitRoomDir: waitroom.settings.js ' +
                     'not found. Game: ' + gameName + '.');
        return;
    }

    try {
        conf = require(waitRoomSettingsFile);
    }
    catch(e) {
        logger.error('GameLoader.loadWaitRoomDir: error reading ' +
                     'waitroom.settings file. Game: ' + gameName + '.');
        throw e;
    }

    if ('object' !== typeof conf) {
        throw new TypeError('GameLoader.loadWaitRoomDir: room.settings file ' +
                            'must return a configuration object.');
    }

    if (conf.logicPath) {
        if ('string' === typeof conf.logicPath) {
            throw new TypeError('GameLoader.loadWaitRoomDir: configuration ' +
                                'loaded, but "logicPath" must be undefined ' +
                                'or string.');
        }
        conf.logicPath = checkLocalPath(directory, 'waitroom/', conf.logicPath);
    }
    else {
        waitRoomFile = directory + 'waitroom/waitroom.js';
        if (fs.existsSync(waitRoomFile)) {
            conf.logicPath = waitRoomFile;
        }
    }

    // Add waiting room information to global game object.
    this.updateGameInfo(gameName, { waitroom: conf });

    waitRoom = channel.createWaitingRoom(conf);

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
                            authSettingsFile + '.');
        }

        if ('object' !== typeof settings) {
            throw new Error('GameLoader.loadAuthDir: invalid settings file: ' +
                            authSettingsFile + '.');
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
                importAuthCodes.call(this, gameName, codes, authCodesFile);
            });
        }
        catch(e) {
            throw new Error('GameLoader.loadAuthDir: cannot read ' +
                            authCodesFile + ": \n" + e);
        }

        if (codes) importAuthCodes.call(this, gameName, codes, authCodesFile);
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
                            authCodesFile + '. ' + e);
        }
    }
};

/**
 * ### GameLoader.loadRequirementsDir
 *
 * Reads the `requirements/` directory and imports settings from it
 *
 * @param {string} file The path to the configuration file
 * @param {ServerChannel} channel The channel object
 *
 * @return {RequirementsRoom} The requirements room (if one is created)
 */
GameLoader.prototype.loadRequirementsDir = function(directory, channel) {
    var file, settingsFile, settings;
    var logger, gameName;
    var reqFunc, reqObj;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadRequirementsDir: directory ' +
                            'must be string.');
    }

    gameName = channel.gameName;
    logger = this.servernode.logger;

    // Requirements settings.
    settingsFile = directory + 'requirements/requirements.settings.js';

    if (!fs.existsSync(settingsFile)) {
        settings = { enabled: true };
        logger.warn('GameLoader.loadRequirementsDir: channel' + gameName +
                    ': no settings file found. Default settings used.');
    }

    else {
        try {
            settings = require(settingsFile);
        }
        catch(e) {
            throw new Error('GameLoader.loadRequirementsDir: cannot read ' +
                            settingsFile + '.');
        }

        if ('object' !== typeof settings) {
            throw new Error('GameLoader.loadRequirementsDir: invalid ' +
                            'settings file: ' + settingsFile + '.');
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
        logger.warn('GameLoader.loadRequirementsDir: channel ' + gameName +
                    ': requirements checking disabled in configuration file.');

        // Add information to global game object.
        this.updateGameInfo(gameName, { requirements: settings });
        return;
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
            throw new Error('GameLoader.loadRequirementsDir: channel ' +
                            gameName + ' cannot read ' + file +
                            '. \n' + e.stack);
        }
    }

    // Add information to global game object.
    this.updateGameInfo(gameName, {
        requirements: J.merge(settings, reqObj)
    });

    // Create requirements room in channel.
    return channel.createRequirementsRoom(J.merge(reqObj, settings));
};

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
        var callback, channel, server;
        var gameChannelNames;
        var errorBegin;
        var servernode;

        servernode = that.servernode;

        errorBegin = 'GameLoader.loadAuthDir: ' + methodName + ' callback: ';

        len = arguments.length;

        if (len > 2) {
            throw new Error(errorBegin +
                            'accepts maximum 2 input parameters, ' +
                            len + ' given. Channel: ' + channelName + '.');
        }

        callback = arguments[len-1];

        if ('function' !== typeof callback) {
            throw new TypeError(errorBegin + 'last parameter must be ' +
                                'function. Channel: ' + channelName + '.');
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
                                    'Channel: ' + channelName + '.');
            }

            channel[arguments[0]][method](callback);
        }
    };
};

/**
 * ### GameLoader.createGameAlias
 *
 * Adds one or multiple game alias
 *
 * Adds references into the `info.games` and `pager.games` objects.
 *
 * @param {string} alias The name of the alias
 * @param {string} gameName The name of the game
 *
 * @see GameLoader.addGame
 * @see ServerChannel.pager
 */
GameLoader.prototype.createGameAlias = function(alias, gameName) {
    var servernode;
    var i, len;

    var servernode = this.servernode;

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
    if (!servernode.info.games[gameName]) {
        throw new Error('GameLoader.createGameAlias: game not found:' +
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

        servernode.info.games[alias[i]] = servernode.info.games[gameName];
        servernode.pager.createAlias(alias[i], gameName);
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


/**
 * ### parseGameSettings
 *
 * Parses a game settings object and builds the treatments object
 *
 * The treatment object always includes a 'standard' treatment plus
 * any other treatment specified in the 'settings' object.
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
    out.standard = J.clone(settingsObj);

    if ('undefined' !== typeof settingsObj.treatments) {
        treatments = settingsObj.treatments;
        delete out.standard.treatments;
        for (t in treatments) {
            if (treatments.hasOwnProperty(t)) {
                out[t] = J.merge(out.standard, treatments[t]);
                out[t].treatmentName = t;
            }
        }
    }

    // Add standard name.
    out.standard.name = 'standard';

    return out;
}

/**
 * ### importAuthCodes
 *
 * Imports an array of authorization codes into the channel registry
 *
 * @param {string} gameName the name of the channel
 * @param {array} codes The array of codes
 * @param {string} file The name of the file that returned the codes
 *   (used in case of errors)
 *
 */
function importAuthCodes(channelName, codes, file) {
    if (!J.isArray(codes)) {
        throw new Error('GameLoader.loadAuthDir: codes file must ' +
                        'return an array of codes, or undefined ' +
                        '(if asynchronous): ' + file + '.');
    }
    this.servernode.channels[channelName].registry.importClients(codes);
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
                            pwdFile + ": \n" + e);
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
// //          sb = that.servernode.pager.getSandBox(gameName, directory);
// //          cb(sb, gameInfo.settings);
// //      });
// };
