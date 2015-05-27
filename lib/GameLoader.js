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
var express = require('express');

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
    this.logger = this.servernode.logger;

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
    var gameType, gameGame, game, gameName;
    var treatment, t;

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
    this.servernode.info.games[gameInfo.name] = {
        dir: gameDir,
        info: gameInfo,
        clientTypes: clientTypes,
        settings: gameGame.settings,
        setup: gameGame.setup,
        stager: gameGame.stager,
        languages: langObject,
        channels: {}
    };

    // Adding the public directory of the game to the static directories
    // http://stackoverflow.com/questions/5973432/
    //  setting-up-two-different-static-directories-in-node-js-express-framework
    this.servernode.http.use(gameName + '/public',
                             express.static(gameDir + 'public'));

    // Tries to load Channels file from game directory.
    this.loadChannelsFile(gameDir, gameName);

    // Creates a waiting room.
    this.loadWaitRoomDir(gameDir, gameName);

    // Loading Auth dir, if any.
    this.loadAuthDir(gameDir, gameName);

    // Tries to load Views file from game directory.
    this.loadViewsFile(gameDir, gameInfo);

    // Done.
    this.logger.info('GameLoader.addGame: added ' + gameName + ': ' + gameDir);
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

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadClientTypes: directory must be ' +
                            'string.');
    }

    clientTypesDir = directory + 'game/client_types/';

    if (!J.existsSync(clientTypesDir)) {
        this.logger.error('GameLoader.loadClientTypes: game directory not ' +
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
                    this.logger.error('GameLoader.loadClientTypes: cannot ' +
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
 * ### GameLoader.loadWaitRoomDir
 *
 * Loads _waitroom/room.settings.js_ from file system and acts accordingly
 *
 * Synchronously looks for a file called _waitroom/room.settings.js_ at the top
 * level of the specified directory.
 *
 * @param {string} directory The directory of the game..
 *
 * @see GameLoader.addChannel
 * @see ServerChannel
 * @see ServerChannel.createWaitingRoom
 */
GameLoader.prototype.loadWaitRoomDir = function(directory, gameName) {
    var waitRoomSettingsFile, waitRoomFile, conf, waitRoom;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadWaitRoomDir: directory must be ' +
                            'string.');
    }

    waitRoomSettingsFile = directory + 'waitroom/waitroom.settings.js';

    if (!fs.existsSync(waitRoomSettingsFile)) {
        this.logger.error('GameLoader.loadWaitRoomDir: waitroom.settings.js ' +
                          'not found. Game: ' + gameName + '.');
        return;
    }

    try {
        conf = require(waitRoomSettingsFile);
    }
    catch(e) {
        this.logger.error('GameLoader.loadWaitRoomDir: error reading ' +
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
        if (conf.logicPath.substring(0,3) === './') {
            conf.logicPath = directory + 'waitroom/' + conf.logicPath;
        }
    }
    else {
        waitRoomFile = directory + 'waitroom/waitroom.js';
        if (fs.existsSync(waitRoomFile)) {
            conf.logicPath = waitRoomFile;
        }
    }

    waitRoom = this.servernode.channels[gameName].createWaitingRoom(conf);

    if (!waitRoom) {
        throw new Error('GameLoader.loadWaitRoomDir: could not create ' +
                        'waiting room. Game: ' + gameName + '.');
    }
};

/**
 * ### GameLoader.loadChannelsFile
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
 * @see GameLoader.addChannel
 * @see ServerChannel
 * @see ServerChannel.createWaitingRoom
 */
GameLoader.prototype.loadChannelsFile = function(directory, gameName) {
    var channelsFile;
    var conf, channel, waitRoom;
    var i, len;
    var channelConf, waitRoomConf;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadChannelsFile: directory must be ' +
                            'string.');
    }

    channelsFile = directory + '/server/channels.js';

    if (!fs.existsSync(channelsFile)) return;

    conf = require(channelsFile);

    if (!J.isArray(conf)) {
        throw new TypeError('GameLoader.loadChannelsFile: channels file ' +
                            'must return an array of channels.');
    }

    // Validate,
    i = -1;
    len = conf.length;
    for ( ; ++i < len ; ) {

        channelConf = conf[i];

        if ('object' !== typeof channelConf) {
            throw new TypeError('GameLoader.loadChannelsFile:' +
                                'channels must be object. Directory: ' +
                                directory);
        }
        if (channelConf.waitingRoom &&
            'object' !== typeof channelConf.waitingRoom) {

            throw new TypeError('GameLoader.loadChannelsFile: waitingRoom ' +
                                'in channel configuration must be object. ' +
                                'Directory: ' + directory);
        }
        waitRoomConf = channelConf.waitingRoom;
        delete channelConf.waitingRoom;

        channelConf.gameName = gameName;

        channel = this.servernode.addChannel(channelConf);

        if (channel) {
            // Add the list of channels created by the game.
            this.servernode.info.games[gameName].channels[channel.name] = true;

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
                    throw new Error('GameLoader.loadChannelsFile: could ' +
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
    }
};


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
GameLoader.prototype.loadViewsFile = function(directory, gameInfo) {
    var viewsFile, that, gameName;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadViewsFile: directory must be ' +
                            'string.');
    }
    gameName = gameInfo.name;

// TODO: see if still needed (broken now).
//
//     that = this;
//     viewsFile = directory + 'views/views.js';
//     fs.exists(viewsFile, function(exists) {
//          var cb, sb;
//          if (!exists) return;
//          cb = require(viewsFile);
//          if ('function' !== typeof cb) {
//              throw new TypeError('GameLoader.loadViewsFile: ' +
//                  'views.js did not ' +
//                  'return a valid function. Dir: ' + directory);
//          }
//          // Execute views function in a sandboxed enviroment.
//          // A game cannot modify other games settings.
//          sb = that.servernode.pager.getSandBox(gameName, directory);
//          cb(sb, gameInfo.settings);
//      });
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
    var ctxPath, langPaths, languages, pathIndex, languageObject;

    ctxPath = directory + '/views/contexts/';
    if (!fs.existsSync(ctxPath)) return;

    langPaths = fs.readdirSync(ctxPath);

    languages = {};
    // TODO: Use for loop, not for in.
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
 * ### GameLoader.loadAuthDir
 *
 * Reads the `auth/` directory and imports settings from it
 *
 * If a function is found in `auth/auth.js` it calls it with an object
 * containing a sandboxed environment for authorization, clientId
 * generation and clientObject decoration.
 *
 * @param {string} file The path to the configuration file
 * @param {string} gameName The name of the game
 *
 * @see GameLoader.loadConfDir
 * @see GameLoader.getChannelSandbox
 */
GameLoader.prototype.loadAuthDir = function(directory, gameName) {
    var authFile, authSettingsFile, authCodesFile, that;
    var settings, codes;
    var authObj, sandboxAuth, sandboxClientIdGen, sandboxDecorate;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadAuthDir: directory must be ' +
                            'string.');
    }

    that = this;

    // Auth settings.

    authSettingsFile = directory + 'auth/auth.settings.js';

    if (!fs.existsSync(authSettingsFile)) {
        settings = {
            enabled: true,
            mode: 'auto',
            codes: 'auth.codes'
        };
        this.logger.warn('Channel ' + gameName + ': no auth settings. ' +
                         'Default settings used.');
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

    if (!settings.enabled) {
        this.logger.warn('Channel ' + gameName + ': authorization disabled ' +
                         'in configuration file.');
        return;
    }

    // Auth codes. Can be synchronous or asynchronous.

    authCodesFile = directory + 'auth/' + (settings.codes || 'auth.codes.js');

    if (fs.existsSync(authCodesFile)) {
        debugger
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
                            authCodesFile + '. ' + e);
        }

        if (codes) importAuthCodes.call(this, gameName, codes, authCodesFile);
    }

    // Auth file.

    authFile = directory + 'auth/auth.js';

    if (fs.existsSync(authCodesFile)) {

        sandboxAuth = that.getChannelSandbox(gameName, 'authorization', 'Auth');
        sandboxClientIdGen = that.getChannelSandbox(gameName,
                                                    'clientIdGenerator',
                                                    'clientId Generator');
        sandboxDecorate = that.getChannelSandbox(gameName,
                                                 'clientObjDecorator');

        authObj = {
            authorization: sandboxAuth,
            clientIdGenerator: sandboxClientIdGen,
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
 * ### GameLoader.getChannelSandbox
 *
 * Returns a sandbox function to configure a channel
 *
 * @param {string} gameName The name of the game
 * @param {string} method The name of the method in ServerChannel
 * @param {string} methodName Optional The name of the method as diplayed in
 *   error messages.
 *
 * @return {function} The sandbox
 *
 * @see GameLoader.loadAuthDir
 * @see GameLoader.getChannelSandbox
 */
GameLoader.prototype.getChannelSandbox =
    function(gameName, method, methodName) {

    var that = this;
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

        if (len > 3) {
            throw new Error(errorBegin +
                            'accepts maximum 3 input parameters, ' +
                            len + ' given. Game: ' + gameName + '.');
        }

        callback = arguments[len-1];

        if ('function' !== typeof callback) {
            throw new TypeError(errorBegin + 'last parameter ' +
                                'must be function. Game: ' + gameName + '.');
        }

        // Channels defined by a game with the channels.js file.
        // Auth callback can modify the authorization only of those.
        gameChannelNames = servernode.info.games[gameName].channels;

        // 1 Auth for all servers of all channels.
        if (len === 1) {
            for (channel in gameChannelNames) {
                if (gameChannelNames.hasOwnProperty(channel)) {
                    servernode.channels[channel].admin[method](callback);
                    servernode.channels[channel].player[method](callback);
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
            channel = servernode.channels[arguments[0]];

            // 1 Auth for a specific channel.
            if (len === 2) {
                channel.admin[method](callback);
                channel.player[method](callback);
            }
            // 1 Auth for a specific server of a specific channel.
            else {
                if (arguments[1] !== 'admin' && arguments[1] !== 'player') {
                    throw new TypeError(errorBegin + 'server parameter must ' +
                                        'be either "player" or "admin". ' +
                                        'Game: ' + gameName + '.');
                }

                channel[arguments[1]][method](callback);
            }
        }
    };
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
