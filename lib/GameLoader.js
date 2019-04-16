/**
 * # GameLoader
 * Copyright(c) 2019 Stefano Balietti
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

var J = require('JSUS').JSUS;
var ngc = require('nodegame-client');
var GameStage = ngc.GameStage;

var ngt = require('nodegame-game-template');

var serverVersionObj;

/**
 * ## GameLoader constructor
 *
 * Constructs a new instance of GameLoader
 *
 * @param {ServerNode} servernode The ServerNode instance
 */
function GameLoader(servernode) {

    /**
     * ### GameLoader.servernode
     *
     * Reference to the ServerNode
     */
    this.servernode = servernode;

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
    var reqFail, clientTypes, langObject, gameName, gameConf;
    var channel, dataDir;

    if ('object' !== typeof gameInfo) {
        throw new TypeError('GameLoader.addGame: gameInfo must be object. '
                            + 'Found: ' + gameInfo);
    }
    if ('string' !== typeof gameDir) {
        throw new TypeError('GameLoader.addGame: gameDir must be string.' +
                            'Found: ' + gameDir);
    }

    gameName = gameInfo.channelName || gameInfo.name;

    // Check name.
    if ('string' !== typeof gameName) {
        throw new Error('GameLoader.addGame: missing or invalid game name: ' +
                        gameDir);
    }

    // Check if name is unique.
    if (this.servernode.info.games[gameName]) {
        throw new Error('GameLoader.addGame: a game with the same name ' +
                        'already found: ' + gameName);
    }

    // Checking nodeGame server version requirement.
    if (gameInfo.engines) {
        reqFail = gameRequirementsFail(gameInfo.engines.nodegame);
        if (reqFail) {
            throw new Error('GameLoader.addGame: game ' + gameName + ' ' +
                            'requires nodeGame version ' +
                            gameInfo.engines.nodegame  + ' ' +
                            'but found ' + this.servernode.version);
        }
    }

    // Loading settings, setup, and stages.
    gameConf = this.loadGameDir(gameDir, gameName);

    // Loading client types.
    clientTypes = this.loadClientTypes(gameDir, gameName);

    // Building language object.
    langObject = this.buildLanguagesObject(gameDir, gameName);

    // Adding game info to global info object.
    this.servernode.info.games[gameName] = {
        dir: gameDir,
        info: gameInfo,
        clientTypes: clientTypes,
        // At this point settings is as it is in game.settings.
        settings: gameConf.settings,
        setup: gameConf.setup,
        stager: gameConf.stager,
        languages: langObject,
        channel: {},
        levels: {},
        alias: []
    };


    // Create game data/ directory if not existing.
    dataDir = path.resolve(gameDir, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
        this.servernode.logger.info('GameLoader.addGame: created empty data' +
                                    path.sep + ' dir for game: ' + gameName);
    }
    // Reusing dataDir.
    // Create game data/ directory if not existing.
    dataDir = path.resolve(gameDir, 'log');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
        this.servernode.logger.info('GameLoader.addGame: created empty log' +
                                    path.sep + ' dir for game: ' + gameName);
    }

    // Load channel dir first. This calls ServerNode.addChannel.
    channel = this.loadChannelDir(gameDir, gameName);

    // Loading levels, if any.
    this.loadLevelsDir(gameDir, channel);

    // After all levels are loaded, we can make the treatments
    // in the main settings object.
    this.parseSettings(gameName);

    // We add all treatment names.
    this.servernode.info.games[gameName].treatmentNames =
        Object.keys(this.servernode.info.games[gameName].settings);

    // Creates a waiting room.
    this.loadWaitRoomDir(gameDir, channel);

    // Loading Auth dir, if any.
    this.loadAuthDir(gameDir, channel);

    // Loading Requirements dir, if any.
    this.loadRequirementsDir(gameDir, channel);

    // Tries to load Views file from game directory.
    // this.loadViewsFile(gameDir, gameInfo);

    // Add routes (considering other loaded options: auth, monitor, etc.).
    channel.addRoutes();

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
    var levelsPath, levelsPaths, levelPath, levelConf;
    var logger, gameName;

    logger = this.servernode.logger;
    gameName = channel.gameName;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadLevelsDir: directory must be ' +
                            'string. Game: ' + gameName);
    }
    levelsPath = path.join(directory, 'levels');
    if (!fs.existsSync(levelsPath)) return;

    levelsPaths = fs.readdirSync(levelsPath);

    len = levelsPaths.length;
    if (!len) {
        throw new Error('GameLoader.loadLevelsDir: levels dir is empty. ' +
                        'Game: ' + gameName);
    }
    levels = {};
    i = -1;
    for ( ; ++i < len ; ) {
        level = levelsPaths[i];
        levelPath = path.join(levelsPath, level);
        if (fs.statSync(levelPath).isDirectory()) {
            levelConf = this.buildLevelConf(levelPath,
                                            gameName,
                                            level);
            levels[level] = levelConf;
            this.updateGameInfo(gameName, level, levelConf);
            channel.createGameLevel(levelConf);
        }
    }

    return levels;
};

/**
 * ### GameLoader.buildLevelConf
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
    var levelObj;
    if ('string' !== typeof directory) {
        this.doErr('GameLoader.loadLevel: game: directory must be string', {
            game: gameName,
            level: level,
            found: directory
        });
    }

    // This builds an object with already settings parsed as treatments.
    levelObj = this.loadGameDir(directory, gameName, level);

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
 * If loading a game level, game.settings and game.setup will be merged
 * with default values. Therefore, they can be missing in the level folder.
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
GameLoader.prototype.loadGameDir = function(directory, gameName, level) {
    var gamePath, gameSetupPath, gameSetup;
    var gameSettingsPath, gameSettings;
    var gameStagesPath, gameStages;
    var origInfo, stager;

    if ('string' !== typeof directory) {
        this.doErr('GameLoader.loadGameDir: directory must be string', {
            game: gameName,
            level: level,
            found: directory,
            type: 'type'
        });
    }

    if (level && 'string' !== typeof level) {
        this.doErr('GameLoader.loadGameDir: level must be string', {
            game: gameName,
            found: level,
            type: 'type'
        });
    }

    // Used to merge/clone from default settings/setup.
    origInfo = this.servernode.getGamesInfo(gameName);

    gamePath = path.join(directory, 'game');

    // Settings.
    gameSettingsPath = path.join(gamePath, 'game.settings.js');

    // If we are loading a level, settings can be omitted, and the main
    // game.settings are used. If not not omitted, the settings will be
    // mixed-in.
    if (fs.existsSync(gameSettingsPath)) {

        try {
            gameSettings = require(gameSettingsPath);
        }
        catch(e) {
            this.doErr('GameLoader.loadGameDir: an error occurred ' +
                       'while reading game.settings file', {
                           game: gameName,
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
                               game: gameName,
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
        this.doErr('GameLoader.loadGameDir: game.settings file not found', {
            game: gameName
        });
    }

    // Merging global options.
    if (level) gameSettings = J.merge(origInfo.settings, gameSettings);

    // Stages.
    gameStagesPath = path.join(gamePath, 'game.stages.js');

    try {
        gameStages = require(gameStagesPath);
    }
    catch(e) {
        this.doErr('GameLoader.loadGameDir: an error occurred while reading ' +
                   'game.stages file', {
                       game: gameName,
                       level: level,
                       err: e
                   });

    }

    if ('function' !== typeof gameStages) {
        this.doErr('GameLoader.loadGameDir: game.stages file did not ' +
                   'export a function', {
                       game: gameName,
                       level: level,
                       found: gameStages
                   });
    }

    // TODO: returned gameStages is now undefined because the function
    // just mofidies the stager, so the next call to setup receives
    // an undefined object. Check.
    stager = ngc.getStager();
    gameStages = gameStages(stager, gameSettings);

    // Setup.
    gameSetupPath = path.join(gamePath, 'game.setup.js');

    // If we are loading a level, setup can be omitted, and the main
    // game.settings are used. If not not omitted, the settings will be
    // mixed-in.
    if (fs.existsSync(gameSetupPath)) {

        try {
            gameSetup = require(gameSetupPath);
        }
        catch(e) {
            this.doErr('GameLoader.loadGameDir: an error occurred ' +
                       'while reading game.setup file', {
                           game: gameName,
                           level: level,
                           err: e
                       });
        }

        if ('function' !== typeof gameSetup) {
            this.doErr('GameLoader.loadGameDir: setup file did not ' +
                       'export a function', {
                           game: gameName,
                           level: level,
                           found: gameSetup
                       });
        }

        // TODO: gameStages is undefined.
        gameSetup = gameSetup(gameSettings, gameStages, directory, level);

        if ('object' !== typeof gameSetup) {
            this.doErr('GameLoader.loadGameDir: setup function did ' +
                       'not return a valid object', {
                           game: gameName,
                           level: level,
                           found: gameSetup
                       });
        }
    }
    else if (!level) {
        this.doErr('GameLoader.loadGameDir: game.setup file not found', {
            log: 'warn',
            throwIt: false
        });
    }

    // Mixin-in global setup options. We do not merge the setup!
    if (level) J.mixin(gameSetup, origInfo.setup);

    return {
        setup: gameSetup,
        settings: gameSettings,
        stager: stager
    };
};


/**
 * ### GameLoader.parseSettings
 *
 * Look up the settings of a game or a level and parses them into treatments
 *
 * Modifies the values inside the `servernode.info.games` object.
 *
 * @param {string} gameName The name of the game
 * @param {string} level Optional. The name of the game level
 *
 * @return {object} settings The parsed settings
 */
GameLoader.prototype.parseSettings = function(gameName, level) {
    var info, settings;
    info = this.servernode.info.games[gameName];
    if (!info) {
        this.doErr('GameLoader.parseSettings: game not found', {
            game: gameName,
            level: level
        });
    }

    if (level) {
        info = info.levels[level];
        if (!info) {
            this.doErr('GameLoader.parseTreatments: level not found', {
                game: gameName,
                level: level
            });
        }
    }

    // Parse settings into treatments.
    settings = parseGameSettings(info.settings);

    if ('object' !== typeof settings) {
        this.doErr('GameLoader.parseSettings: an error occurred while ' +
                   'parsing the settings object', {
                       game: gameName,
                       level: level,
                       found: settings
                   });
    }

    // Replace old settings with parsed ones.
    info.settings = settings;
    return settings;
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
    var logger;

    if ('string' !== typeof directory) {
        this.doErr('GameLoader.loadClientTypes: directory must be string', {
            game: gameName,
            level: level,
            found: directory,
            type: 'type'
        });
    }

    logger = this.servernode.logger;

    clientTypesDir = path.join(directory, 'game', 'client_types');

    if (!fs.existsSync(clientTypesDir)) {
        this.doErr('GameLoader.loadClientTypes: directory not found', {
            game: gameName,
            level: level,
            found: directory,
            throwIt: false
        });
        return;
    }

    fileNames = fs.readdirSync(clientTypesDir);

    clientTypes = {};

    i = -1, len = fileNames.length;
    for ( ; ++i < len ; ) {
        fileName = fileNames[i];
        // Ignore non-js files, and temporary and hidden files (begin with '.').
        if (path.extname(fileName) === '.js' && fileName.charAt(0) !== '.') {
            clientTypePath = path.join(clientTypesDir, fileName);
            if (!fs.statSync(clientTypePath).isDirectory()) {
                try {
                    clientType = require(clientTypePath);
                    clientTypes[fileName.slice(0,-3)] = clientType;
                }
                catch(e) {
                    this.doErr('GameLoader.loadClientTypes: an error ' +
                               'occurred while reading client type: ' +
                               fileName, {
                                   game: gameName,
                                   level: level,
                                   err: e,
                                   throwErr: true
                               });
                }
            }
        }
    }

    // Checking if mandatory types are found.
    if (!clientTypes.logic) {
        this.doErr('GameLoader.loadClientTypes: logic type not found', {
            game: gameName,
            level: level
        });
    }
    if (!clientTypes.player) {
        this.doErr('GameLoader.loadClientTypes: player type not found', {
            game: gameName,
            level: level
        });
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

    ctxPath = path.join(directory, 'views', 'contexts');
    if (!fs.existsSync(ctxPath)) return;

    langPaths = fs.readdirSync(ctxPath);
    languages = {};

    i = -1, len = langPaths.length;
    for ( ; ++i < len ; ) {
        // Only directories.
        if (!fs.lstatSync(path.join(ctxPath, langPaths[i])).isDirectory()) {
            continue;
        }
        languageObject = {};

        langFile = path.join(ctxPath, langPaths[i], 'languageInfo.json');
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
    var settings, pwdFile, jwtFile, res;
    var channelPath, channel;

    // 1. Channel settings.
    settings = this.loadChannelFile(directory, gameName);

    // Save ref. to newly created channel.
    channel = this.servernode.channels[gameName];
    channelPath = path.join(directory, 'channel');

    // 2. Credentials.
    pwdFile = path.join(channelPath, 'channel.credentials.js');
    res = loadSyncAsync(pwdFile, settings, 'loadChannelDir', function(credtls) {
        channel._loadingCredentials = null;
        if ('object' !== typeof credtls) {
            throw new TypeError('GameLoader.loadChannelDir: credentials ' +
                                'callback did no return an object. Found: ' +
                                typeof credtls);
        }
        if ('string' !== typeof credtls.user || credtls.user.trim() === '') {
            throw new TypeError('GameLoader.loadChannelDir: credentials ' +
                                'callback did not return a valid user: ' +
                                credtls.user);
        }
        if ('string' !== typeof credtls.pwd || credtls.pwd.trim() === '') {
            throw new TypeError('GameLoader.loadChannelDir: credentials ' +
                                'callback did not return a valid pwd: ' +
                                credtls.pwd);
        }
        channel.credentials = credtls;
    });
    // If a file was found, but crendentials are not set it was async.
    if (res && !channel.credentials) channel._loadingCredentials = true;

    // 3. JWT secret.
    jwtFile = path.join(channelPath, 'channel.secret.js');

    res = loadSyncAsync(jwtFile, settings, 'loadChannelDir', function(secret) {
        channel._loadingSecret = null;
        if ('string' !== typeof secret || secret.trim() === '') {
            throw new TypeError('GameLoader.loadChannelDir: secret ' +
                                'callback did not return a valid secret: ' +
                                secret);
        }
        channel.secret = secret;
    });
    // If a file was found, but secret is not set it was async.
    if (res && !channel.secret) channel._loadingSecret = true;

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
    var dataDir, channelsFile, channel, channelConf;
    var sn, roomNo;

    if ('string' !== typeof directory) {
        this.doErr('GameLoader.loadChannelFile: directory must be string', {
            game: gameName,
            found: directory,
            type: 'type'
        });
    }

    channelsFile = path.join(directory, 'channel', 'channel.settings.js');

    if (!fs.existsSync(channelsFile)) {
        this.doErr('GameLoader.loadChannelFile: channel' + path.sep +
                   'channel.settings.js not found or not readable',
                   { game: gameName });
        return;
    }

    channelConf = require(channelsFile);

    // Validate

    if ('object' !== typeof channelConf) {
        this.doErr('GameLoader.loadChannelFile: channels must be object', {
            found: channelConf,
            game: gameName,
            type: 'type'
        });
    }

// TODO: check waitingRoom conf removed.
//    var waitRoomConf;
//    if (channelConf.waitingRoom &&
//        'object' !== typeof channelConf.waitingRoom) {
//
//        throw new TypeError('GameLoader.loadChannelFile: waitingRoom ' +
//                            'in channel configuration must be object. ' +
//                            'Directory: ' + directory);
//    }
//    waitRoomConf = channelConf.waitingRoom;
//    delete channelConf.waitingRoom;

    if (channelConf.name) {
        if ('string' !== typeof channelConf.name ||
            channelConf.name.trim() === '') {

            this.doErr('GameLoader.loadChannelFile: name must be ' +
                       'a non-empty string or undefined', {
                           game: gameName,
                           found: channelConf.name,
                           type: 'type'
                       });
        }
    }
    else {
        channelConf.name = gameName;
    }

    dataDir = path.join(directory, 'data');

    if ('undefined' === typeof channelConf.roomCounter) {
        channelConf.roomCounter = loadRoomNo(dataDir) + 1;
    }
    else if ('number' !== typeof channelConf.roomCounter ||
             channelConf.roomCounter < 0) {

        this.doErr('GameLoader.loadChannelFile: roomCounter must be ' +
                   'a number > 0 or undefined', {
                       game: gameName,
                       found: channelConf.roomCounter,
                       type: 'type'
                   });
    }
    else {
        roomNo = loadRoomNo(dataDir);
        if (roomNo >= channelConf.roomCounter) {
            this.doErr('GameLoader.loadChannelFile: roomCounter must be ' +
                       'greater than last room number found in "data' +
                       path.sep + '" dir (' + roomNo + ')', {
                           game: gameName,
                           found: channelConf.roomCounter,
                           type: 'type'
                       });
        }
    }

    if ('undefined' !== typeof channelConf.roomCounterChars) {
        if ('number' !== channelConf.roomCounterChars ||
            (channelConf.roomCounterChars >= 0 &&
             channelConf.roomCounterChars <= 12)) {

            this.doErr('GameLoader.loadChannelFile: roomCounterChars must be ' +
                       'undefined or number between 0 and 12', {
                           game: gameName,
                           found: channelConf.roomCounterChars,
                           type: 'type'
                       });
        }
    }

    // TODO: would be nice to have a separator, but this makes things a bit more
    // complicated when loading the last room number.
//     if ('undefined' !== typeof channelConf.roomCounterSeparator) {
//         channelConf.roomCounterSeparator += '';
//         if (channelConf.roomCounterSeparator.length !== 1) {
//             this.doErr('GameLoader.loadChannelFile: roomCounterSeparator ' +
//                        'must be only one character', {
//                            game: gameName,
//                            found: channelConf.roomCounterSeparator
//                        });
//         }
//     }

    channelConf.gameName = gameName;

    sn = this.servernode;
    channel = sn.addChannel(channelConf);

    if (channel) {

        // Was:
        // Add the list of channels created by the game.
//         sn.info.games[gameName].channel = {
//             player: channel.playerServer ?
//                 channel.playerServer.endpoint : null,
//             admin: channel.adminServer ?
//                 channel.adminServer.endpoint : null
//         };

        sn.info.games[gameName].channel = channelConf;

        // TODO: check this was removed.

//         if (waitRoomConf) {
//
//             // We prepend the baseDir parameter, if any.
//             // If logicPath is not string we let the WaitingRoom
//             // constructor throw an error.
//             if ('string' === typeof waitRoomConf.logicPath) {
//                 waitRoomConf.logicPath = checkLocalPath(
//                     directory, 'channel/', waitRoomConf.logicPath);
//             }
//
//             waitRoom = channel.createWaitingRoom(waitRoomConf);
//
//             if (!waitRoom) {
//                 throw new Error('GameLoader.loadChannelFile: could ' +
//                                 'not add waiting room to channel ' +
//                                 channel.name);
//             }
//         }

        // Adding channel alias.
        if (channelConf.alias) sn.createGameAlias(channelConf.alias, gameName);

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
    var waitRoomPath, waitRoomSettingsFile, waitRoomFile, conf;

    if ('string' !== typeof directory) {
        this.doErr('GameLoader.buildWaitRoomConf: directory must be ' +
                   'string', {
                       game: gameName,
                       level: level,
                       found: directory,
                       type: 'type'
                   });
    }

    waitRoomPath = path.join(directory, 'waitroom');
    waitRoomSettingsFile = path.join(waitRoomPath, 'waitroom.settings.js');

    if (!fs.existsSync(waitRoomSettingsFile)) {
        ///////////////////////////////////////////////////////
        // Experimental code for levels without waitroom conf.
        this.doErr('GameLoader.buildWaitRoomConf: file waitroom.settings ' +
                   'not found', {
                       game: gameName,
                       level: level,
                       log: 'warn',
                       throwIt: !level // Experimental: was always true.
                   });
        // Important! The main waitRoom has not been loaded yet, so levels
        // cannot copy settings from there.
        return;
    }
    try {
        conf = require(waitRoomSettingsFile);
    }
    catch(e) {
        this.doErr('GameLoader.buildWaitRoomConf: error reading ' +
                   'waitroom.settings file', {
                       game: gameName,
                       level: level,
                       err: e,
                       throwErr: true
                   });
    }

    if ('object' !== typeof conf) {
        this.doErr('GameLoader.buildWaitRoomConf: room.settings file ' +
                   'must return a configuration object', {
                       game: gameName,
                       level: level,
                       found: conf,
                       type: 'type'
                   });
    }

    if (conf.logicPath) {
        if ('string' !== typeof conf.logicPath) {
            this.doErr('GameLoader.buildWaitRoomConf: configuration ' +
                       'loaded, but "logicPath" must be undefined or string', {
                           game: gameName,
                           level: level,
                           found: conf.logicPath,
                           type: 'type'
                       });
        }
        conf.logicPath = checkLocalPath(
            path.join(waitRoomPath, conf.logicPath));
    }
    else {
        waitRoomFile = path.join(waitRoomPath, 'waitroom.js');
        if (fs.existsSync(waitRoomFile)) conf.logicPath = waitRoomFile;
    }

    return conf;
};

/**
 * ### GameLoader.loadWaitRoomDir
 *
 * Loads the waiting room configuration and creates the object in channel
 *
 * Synchronously looks for a file called _waitroom/room.settings.js_
 * at the top level of the specified directory.
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
    conf = this.buildWaitRoomConf(directory, channel.gameName);
    // Add waiting room information to global game object.
    this.updateGameInfo(channel.gameName, { waitroom: conf });
    waitRoom = channel.createWaitingRoom(conf, true);
    if (!waitRoom) {
        throw new Error('GameLoader.loadWaitRoomDir: could not create ' +
                        'waiting room. Game: ' + channel.gameName);
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
 * @see importAuthCodes
 * @see GameLoader.getChannelSandbox
 */
GameLoader.prototype.loadAuthDir = function(directory, channel) {
    var authDir, authFile, authSettingsFile;
    var settings, codes, asyncCodes;
    var authObj, sandboxAuth, sandboxIdGen, sandboxDecorate;
    var gameName;
    var logger;

    if ('string' !== typeof directory) {
        throw new TypeError('GameLoader.loadAuthDir: directory must be ' +
                            'string. Found: ' + directory);
    }

    gameName = channel.gameName;
    logger = this.servernode.logger;

    authDir = path.join(directory, 'auth');

    // Check if directory exists.
    if (!fs.existsSync(authDir)) {
        logger.warn('GameLoader.loadAuthDir: channel ' + gameName +
                    ': no auth directory.');

        // Add information to global game object.
        this.updateGameInfo(gameName, { auth: { enabled: false } });
        return;
    }

    // Auth settings.

    authSettingsFile = path.join(authDir, 'auth.settings.js');

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
                    ': authorization disabled in configuration file');
        return;
    }

    // We must have credentials and secret (set or loading).

    if (!channel.secret) {
        if (!channel._loadingSecret) {
            throw new Error('GameLoader.loadAuthDir: channel "' + gameName +
                            '": auth is enabled, but file "channel.secret.js"' +
                            ' not found. Check the channel' + path.sep +
                            ' directory');
        }
        else {
            logger.warn('GameLoader.loadAuthDir: channel ' + gameName +
                        ': auth is enabled, but "secret" still loading');
        }
    }
    if (!channel.credentials) {
        if (!channel._loadingCredentials) {
            throw new Error('GameLoader.loadAuthDir: channel "' + gameName +
                            '": auth is enabled, but file ' +
                            '"channel.credentials.js" not found. ' +
                            'Check the channel' +
                            path.sep + ' directory');
        }
        else {
            logger.warn('GameLoader.loadAuthDir: channel ' + gameName +
                        ': auth is enabled, but "credentials" still loading');
        }

    }

    // Auth codes. Can be synchronous or asynchronous.

    // Transform relative to absolute paths.
    if (settings.codes && !path.isAbsolute(settings.codes)) {
        settings.codes = path.join(authDir, settings.codes);
    }
    else {
        settings.codes = ngt.resolve('auth/auth.codes.js');
        settings.defaultCodes = true;
    }

    // TODO: only with custom auth.codes.js.
    if (fs.existsSync(settings.codes)) {

        // Inject authDir into settings (will be removed by importAuthCodes).
        settings.authDir = authDir;

        try {
            codes = require(settings.codes)(settings, function(err, codes) {
                if (err) {
                    throw new Error('GameLoader.loadAuthDir: channel ' +
                                    gameName + ' an error occurred: ' + err);
                }
                importAuthCodes(channel, codes, settings);
                if (asyncCodes) {
                    channel.servernode.asyncQueue.remove(asyncCodes);
                }
            });
        }
        catch(e) {
            throw new Error('GameLoader.loadAuthDir: channel ' + gameName +
                            ' an error occurred trying to import the codes:' +
                            "\n" + e.stack);
        }

        if (codes) {
            importAuthCodes(channel, codes, settings);
        }
        else {
            asyncCodes = gameName + '_codes';
            channel.servernode.asyncQueue.add(asyncCodes);
        }
    }

    // Auth file.

    // TODO: do we still need this sandbox? Do we need another file?
    authFile = path.join(directory, 'auth', 'auth.js');
    if (fs.existsSync(authFile)) {
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
            throw new Error('GameLoader.loadAuthDir: channel ' + gameName +
                            ' cannot read ' + authFile + '. ' + e.stack);
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
    var reqDirPath, reqFunc, reqObj;

    if ('string' !== typeof directory) {
        this.doErr('GameLoader.buildRequirementsConf: directory must be ' +
                   'string', {
                       game: gameName,
                       level: level,
                       found: directory,
                       type: 'type'
                   });
    }

    reqDirPath = path.join(directory, 'requirements');
    if (!fs.existsSync(reqDirPath)) {
        this.doErr('GameLoader.buildRequirementsConf: no requirements ' +
                   'directory', {
                       game: gameName,
                       level: level,
                       log: 'warn',
                       throwIt: false
                   });

        // Add information to global game object.
        return { enabled: false };
    }

    // Requirements settings.
    settingsFile = path.join(reqDirPath, 'requirements.settings.js');

    if (!fs.existsSync(settingsFile)) {
        settings = { enabled: true };
        this.doErr('GameLoader.buildRequirementsConf: no settings file ' +
                   'found. Default settings used', {
                       game: gameName,
                       level: level,
                       log: 'warn',
                       throwIt: false
                   });
    }
    else {
        try {
            settings = require(settingsFile);
        }
        catch(e) {
            this.doErr('GameLoader.buildRequirementsConf: an error occurred ' +
                       'while reading settings file', {
                           game: gameName,
                           level: level,
                           err: e
                       });
        }

        if ('object' !== typeof settings) {
            this.doErr('GameLoader.buildRequirementsConf: invalid ' +
                       'settings file', {
                           game: gameName,
                           level: level,
                           found: settings
                       });
        }
    }

    // We prepend the baseDir parameter, if any.
    // If logicPath is not string RequirementsRoom constructor throws an error.
    if ('string' === typeof settings.logicPath) {
        settings.logicPath = checkLocalPath(path.join(reqDirPath,
                                                      settings.logicPath));
    }

    // Enable requirements by default.
    if ('undefined' === typeof settings.enabled) settings.enabled = true;

    // Exit here if requirements is disabled.
    if (!settings.enabled) {
        this.doErr('GameLoader.buildRequirementsConf: requirements checking ' +
                   'disabled in configuration file', {
                       game: gameName,
                       level: level,
                       log: 'warn',
                       throwIt: false
                   });

        return settings;
    }

    // Requirements file.

    file = path.join(reqDirPath, 'requirements.js');
    if (!fs.existsSync(file)) {
        file = ngt.resolve('requirements/requirements.js');
    }

    reqObj = {};
    reqFunc = new RequirementsSandbox(gameName, reqObj);

    // TODO: move try-catch in self-exec function?
    try {
        require(file)(reqFunc, settings);
        reqObj.enabled = true;
    }
    catch(e) {
        this.doErr('GameLoader.buildRequirementsConf: an error occurred ' +
                   'while trying to execute requirements file', {
                       game: gameName,
                       level: level,
                       err: e
                   });
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
    conf = this.buildRequirementsConf(directory, channel.gameName);
    // Add waiting room information to global game object.
    this.updateGameInfo(channel.gameName, { requirements: conf });
    reqRoom = channel.createRequirementsRoom(conf, true);
    if (!reqRoom) {
        throw new Error('GameLoader.loadRequirementsRoomDir: could not ' +
                        'create requirements room. Game: ' + channel.gameName);
    }
    return reqRoom;
};

// TODO: see if we want to add it to prototype.
// Else remove getChannelSandbox also (maybe).

function RequirementsSandbox(gameName, requirementsObj) {
    var errBegin;
    errBegin = 'GameLoader.loadRequirementsDir: ' + gameName + ': ';
    this.add = function(cb, params) {
        if ('function' !== typeof cb) {
            throw new TypeError(errBegin + 'requirement must be function. ' +
                               'Found: ' + cb);
        }
        if (!requirementsObj.requirements) requirementsObj.requirements = [];
        requirementsObj.requirements.push({ cb: cb, params: params });
    };
    this.onSuccess = function(cb) {
        if ('function' !== typeof cb) {
            throw new TypeError(errBegin + 'onSuccess callback must be ' +
                                'function. Found: ' + cb);
        }
        requirementsObj.onSuccess = cb;
    };
    this.onFailure = function(cb) {
        if ('function' !== typeof cb) {
            throw new TypeError(errBegin + 'onFailure callback must be ' +
                                'function. Found: ' + cb);
        }
        requirementsObj.onFailure = cb;
    };
    this.setMaxExecutionTime = function(maxTime) {
        if ('number' !== typeof maxTime) {
            throw new TypeError(errBegin + 'max execution time must be ' +
                                'number. Found: ' + maxTime);
        }
        requirementsObj.maxExecTime = maxTime;
    };
    this.gameName = gameName;
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
                            len + ' given. Game: ' + channelName);
        }

        callback = arguments[len-1];

        if ('function' !== typeof callback) {
            throw new TypeError(errorBegin + 'last parameter must be ' +
                                'function. Game: ' + channelName);
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
                                    'Game: ' + channelName);
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
                        gameName);
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

// /**
//  * ### GameLoader.createGameAlias
//  *
//  * Adds one or multiple game alias
//  *
//  * Adds references into the `info.games` and `resourceManager.games` objects.
//  *
//  * @param {string} alias The name of the alias
//  * @param {string} gameName The name of the game
//  *
//  * @see GameLoader.addGame
//  * @see ServerChannel.resourceManager
//  */
// GameLoader.prototype.createGameAlias = function(alias, gameName) {
//     var servernode, gameInfo;
//     var i, len;
//
//     if ('string' === typeof alias) {
//         alias = [alias];
//     }
//     if (!J.isArray(alias)) {
//         throw new TypeError('GameLoader.createGameAlias: alias' +
//                             'must be either string or array.');
//     }
//     if ('string' !== typeof gameName) {
//         throw new TypeError('GameLoader.createGameAlias: gameName must be ' +
//                             'string.');
//     }
//
//     servernode = this.servernode;
//     gameInfo = servernode.getGamesInfo(gameName);
//     if (!gameInfo) {
//         throw new Error('GameLoader.createGameAlias: game not found: ' +
//                         gameName);
//     }
//
//     i = -1;
//     len = alias.length;
//     for ( ; ++i < len ; ) {
// //         if ('string' !== typeof alias[i]) {
// //             throw new TypeError(
// //                 'GameLoader.createGameAlias: alias must be string.');
// //         }
// //         if (servernode.info.games[alias[i]]) {
// //             throw new Error('GameLoader.createGameAlias: ' +
// //                             'alias must be unique: ' + alias[i] +
// //                             ' (' + gameName + ').');
// //         }
// //
// //         // TODO: do not add aliases to the info.games object.
// //         // (we need to make sure aliases do not clash).
// //         servernode.info.games[alias[i]] = servernode.info.games[gameName];
// //         servernode.resourceManager.createAlias(alias[i], gameName);
// //         gameInfo.alias.push(alias[i]);
//
//
//     }
// };

/**
 * ### GameLoader.doErr
 *
 * Throws and/or logs an error happened while loading a game
 *
 * Adds automatically useful information such as game name, or level name.
 *
 * @param {string} msg The error message
 * @param {object} opts Optional. Options to build and handle the error.
 *    Available options:
 *
 *      - game: the name of the game where the error happened;
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
    if (opts.game) msg += '. Game: ' + opts.game;
    if (opts.level) msg += '. Level: ' + opts.level;
    if (opts.found) msg += '. Found: ' + opts.found;
    if (opts.err) msg += '. Err:\n' + opts.err.stack;
    if (opts.log !== false && opts.log !== null) {
        if ('undefined' === typeof opts.log || opts.log === 'err') {
            this.servernode.logger.error(msg);
        }
        else if (opts.log === 'warn') {
            this.servernode.logger.warn(msg);
        }
        else {
            throw new Error('GameLoader.doErr: invalid value for opts.log: ' +
                            opts.log + '. Msg: ' + msg);
        }
    }
    if (opts.throwErr) {
        if (!opts.err) {
            throw new Error('GameLoader.doErr: throwErr is true, but no ' +
                            'error given. Msg: ' + msg);
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
        reqFail = !req || GameStage.compare(req, serverVersionObj) < 0;
    }
    else if (req.indexOf(">") !== -1) {
        req = req.split(">")[1];
        req = version2GameStage(req);
        reqFail = !req || GameStage.compare(req, serverVersionObj) < 1;
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
        throw new TypeError('parseGameSettings: settingsObj must be object. ' +
                            'Found: ' + settingsObj);
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
                if ('string' !== typeof treatments[t].description ||
                    treatments[t].description.trim() === '') {
                    // TODO: change warning into error in v5.
                    console.log('***Deprecation warning v4.3.0+: ' +
                                'all treatments must have a description. ' +
                                'Treatment: ' + t + '***');
                }
            }
        }
    }

    return out;
}

/**
 * ### loadSyncAsync
 *
 * Requires a file and executes sync or async
 *
 * Required file must return a function that is executed immediately.
 * The function can return a value immediately, and in this case a callback
 * is executed on the return value, or use the async callback.
 *
 * @param {string} filepath The path to the file to require
 * @param {object} settings Object to pass the required callback
 * @param {string} method The name of the method calling loadSyncAsync
 * @param {function} cb The callback to execute sync or async
 *
 * @return {boolean} TRUE, if the file was found and executed without errors
 *
 * @see GameLoader.loadAuthDir
 */
function loadSyncAsync(filepath, settings, method, cb) {
    var result, timeout;

    if (fs.existsSync(filepath)) {
        try {
            result = require(filepath)(settings, function(err, result) {
                if (timeout) clearTimeout(timeout);
                if (err) {
                    throw new Error('GameLoader.' + method + ': an error ' +
                                    'occurred: ' + err);
                }
                cb(result);
            });
        }
        catch(e) {
            throw new Error('GameLoader.' + method + ': cannot read ' +
                            filepath + ": \n" + e.stack);
        }

        if ('undefined' !== typeof result) {
            cb(result);
        }
        else {
            timeout = setTimeout(function() {
                throw new Error('GameLoader.' + method + ': timed-out: ' +
                                filepath);
            }, 30000);
        }
        return true;
    }
    return false;
}

/**
 * ### importAuthCodes
 *
 * Imports an array of authorization codes into the channel registry
 *
 * @param {ServerChannel} channel
 * @param {array} codes The array of codes
 * @param {object} settings The auth settings
 *
 * @see GameLoader.loadAuthDir
 */
function importAuthCodes(channel, codes, settings) {
    var authDir, outFile, outFileBak;

    channel.registry.importClients(codes);

    authDir = settings.authDir;
    if (settings.dumpCodes !== false) {
        outFile = settings.outFile || 'codes.imported.csv';
        if (!path.isAbsolute(outFile)) {
            outFile = path.join(settings.authDir, outFile);
        }
        outFileBak = outFile + '.bak';

        fs.rename(outFile, outFileBak, function() {
            var NDDB, db;
            NDDB = require('NDDB').NDDB;
            db = new NDDB();
            db.importDB(codes);
            // Async function. Throws errors.
            db.save(outFile);
        });
    }

    // Not needed anymore.
    delete settings.authDir;
}

/**
 * ### loadRoomNo
 *
 * Checks the data/ folder for subfolders and extract the max room number
 *
 * Subfolders are of type 'roomX', where X is a number
 *
 * @param {string} dataDir The data directory to check
 *
 * @return {number} The max room number
 */
function loadRoomNo(dataDir) {
    var files, file, tokens, roomNum, maxRoomNum;
    var i, len;

    maxRoomNum = 0;

    files = fs.readdirSync(dataDir);

    i = -1, len = files.length;
    for ( ; ++i < len ; ) {
        file = path.join(dataDir, files[i]);
        if (fs.lstatSync(file).isDirectory()) {
            tokens = file.split('room');
            roomNum = parseInt(tokens[1], 10);
            if (roomNum > maxRoomNum) maxRoomNum = roomNum;
        }
    }
    return maxRoomNum;
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
