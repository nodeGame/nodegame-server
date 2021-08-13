/**
 * # ResourceManager
 * Copyright(c) 2019 Stefano Balietti
 * MIT Licensed
 *
 * Handles loading, caching of static resources and templates from file system
 *
 * TODO: check the whole class.
 */

"use strict";

module.exports = ResourceManager;

var fs = require('fs');
var jade = require('jade');
var path = require('path');
var games = {};

// TODO: support different template engines.

/**
 * ## ResourceManager constructor
 *
 * Constructs a new instance of ResourceManager
 *
 * @param {ServerNode} servernode Instance of servernode
 */
function ResourceManager(servernode) {

    this.servernode = servernode;

    // Testing.
    this.games = games;

    // Adding servernode resources caching.
    this.addGame('/', servernode.rootDir + path.sep);
}

// ## ResourceManager methods

/**
 * ### ResourceManager.addGame
 *
 * Setup an empty data structure for holding game info
 *
 * @param {string} gameName The name of the game as it appears in http requests
 * @param {string} rootDir The path of the root directory of the game
 */
ResourceManager.prototype.addGame = function(gameName, rootDir) {
    if ('string' !== typeof gameName) {
        throw new TypeError('ResourceManager.addGame: ' +
                            'gameName must be string. Found: ' + gameName);
    }
    if (rootDir && 'string' !== typeof rootDir) {
        throw new Error('ResourceManager.addGame: rootDir must ' +
                        'be string or undefined. Found: ' + rootDir);
    }
    if (!rootDir) {
        rootDir = this.servernode.resolveGameDir(gameName);
        if (!rootDir) {
            throw new Error('ResourceManager.addGame: rootDir not specified ' +
                            'and could not resolve it. Game: ' + gameName);
        }
    }

    // Game name is duplicated so that alias have access to the original one.
    games[gameName] = {
        rootDir: rootDir,
        cachePublic: {},
        cacheTemplate: {},
        cacheContext: {},
        contextCallbacks: {},
        name: gameName
    };
};

/**
 * ### ResourceManager.createAlias
 *
 * Creates an alias for a cached game
 *
 * @param {string} alias The name of the alias
 * @param {string} gameName The name of the game
 * @param {boolean} force If TRUE, the alias will
 *   be set even if already existing. Default: FALSE
 */
ResourceManager.prototype.createAlias = function(alias, gameName, force) {
    if ('string' !== typeof alias) {
        throw new TypeError('ResourceManager.createAlias: alias ' +
                            'must be string. Found: ' + alias);
    }
    if ('string' !== typeof gameName) {
        throw new TypeError('ResourceManager.createAlias: ' +
                            'gameName must be string. Found: ' + gameName);
    }
    if (!games[gameName]) {
        throw new Error('ResourceManager.createAlias: ' +
                        'game not found: ' + gameName + '.');
    }
    if (games[alias] && !force) {
        throw new Error('ResourceManager.createAlias: ' +
                        'alias already existing: ' + alias + '. Games: ' +
                        gameName + ' & ' + games[alias].name);
    }
    games[alias] = games[gameName];
};

/**
 * ### ResourceManager.getFromPublic
 *
 * Returns the content of a file from a game's public directory
 *
 * If the requested resource was previously cached, it executes the callback
 * immediately, otherwise it tries to load it from file system and cache it,
 * if the caching option is enabled.
 *
 * Trailing slash is always removed.
 *
 * @param {string} alias The name of the alias
 * @param {string} gameName The name of the game
 * @param {function} cb Callback to execute with the content of
 *   the requested file, or `null` if file is not found.
 */
ResourceManager.prototype.getFromPublic = function(gameName, file, cb) {
    var cachedFile, filePath;
    var that;

    if (file.lastIndexOf('\/') === (file.length - 1)) {
        // Removing the trailing slash because it creates:
        // Error: ENOTDIR in fetching the file.
        file = file.substring(0, file.length - 1);
    }

    cachedFile = games[gameName].cachePublic[file];

    // File was previously found and cached.
    if (cachedFile) {
        cb(cachedFile);
        return;
    }
    // File was previously looked up and not found.
    else if (cachedFile === false) {
        cb(null);
        return;
    }

    // Build filePath to file in public directory.
    filePath = path.join(games[gameName].rootDir, 'public', file);

    that = this;
    // Checks if exists in 'public/' or as view.
    fs.exists(filePath, function(exists) {
        // Exists in public, cache it, serve it.
        if (exists) {
            fs.readFile(filePath, 'utf8', function(err, data) {
                // Cache it.
                if (that.cacheEnabled) that.inPublic(gameName, file, data);
                cb(data);
            });
        }
        else {
            if (that.cacheEnabled) that.inPublic(gameName, file, false);
            cb(null);
        }
    });
};

/**
 * ### ResourceManager.getFromViews
 *
 * Returns the content of a file from a game's public directory
 *
 * If the requested resource was previously cached, it executes the callback
 * immediately, otherwise it tries to load it from file system and cache it,
 * if the caching option is enabled.
 *
 * Trailing slash is always removed.
 *
 * @param {string} alias The name of the alias
 * @param {string} gameName The name of the game
 * @parm {function} cb Callback to execute with the content of
 *   the requested template and context function
 */


// TODO: Fix.
ResourceManager.prototype.getFromViews = function(gameName, file, cb,
                                                  gameSettings, headers) {

    var basename, gameDir;
    var templatePath, contextPath;
    var cachedTemplate, cachedContextCb;
    var view, context;
    var that;

    if (file.lastIndexOf('\/') === (file.length - 1)) {
        // Removing the trailing slash because it creates:
        // Error: ENOTDIR in fetching the file.
        file = file.substring(0, file.length - 1);
    }

    // Check if it a template.
    basename = file.substr(0, file.lastIndexOf('.'));
    gameDir = games[gameName].rootDir;

    // Instantiate templates, if available.
    // `html/templates/page.jade` holds the template and
    // `html/contexts/xx/xx/page.js` holds the context callback
    // to instantiate the page requested by `xx/xx/page*`.

    // Matches: xx/xx/xx/xx/xx/
    if (basename.match(/^[^\/]*\/.*$/)) {
        templatePath = path.join(gameDir, 'views', 'templates',
                                 (basename.split(path.sep)[1] + '.jade'));
    }
    else {
        templatePath = path.join(gameDir, 'views', 'templates',
                                 (basename + '.jade'));
    }

    contextPath = path.join(gameDir, 'views', 'contexts', (basename + '.js'));

    // Info about previous requests to the template file.
    // templateFound = pager.inTemplates(gameName, templatePath);

    // Get from cache.
    cachedTemplate = games[gameName].cacheTemplate[templatePath];
    cachedContextCb = games[gameName].contextCallbacks[contextPath];

    // Template not existing.
    if (cachedTemplate === false) {
        cb(null);
        return;
    }

    // cachedTemplate and cachedContextCb are loaded together
    // so we can check either to know whether they have been loaded once.

    // Template existing (cached), and context callback existing or not.
    if (cachedTemplate) {
        if (cachedContextCb) context = contextCb(gameSettings, headers);
        view = jade.render(cachedTemplate, context);
        cb(view);
        return;
    }

    that = this;
    fs.exists(templatePath, function(exists) {
        if (!exists) {
            if (that.cacheEnabled) {
                that.inTemplates(gameName, templatePath, false);
            }
            cb(null);
        }
        else {
            fs.readFile(templatePath, 'utf8', function(err, data) {

                // Cache it.
                if (that.cacheEnabled) {
                    that.inTemplates(gameName, templatePath, data);
                }

                fs.exists(contextPath, function(exists) {
                    var logger;

                    if (!exists) {
                        if (that.cacheEnabled) {
                            games[gameName]
                                .contextCallbacks[contextPath] = false;
                        }
                    }
                    else {
                        // Function or FALSE (on error).
                        // Errors caught by the function.
                        logger = that.servernode.logger;
                        cachedContextCb = loadContextCallback(contextPath,
                                                              logger);

                        if (that.cacheEnabled) {
                            games[gameName].contextCallbacks[contextPath] =
                                cachedContextCb;
                        }
                    }

                    if (cachedContextCb) {
                        context = cachedContextCb(gameSettings, headers);
                    }

                    // TODO: If there is no callback we could cache the
                    // output of the rendered template.
                    view = jade.render(data, context, function(a) {
                        // console.log(a)

                        // Context callback might be existing or not.
                        cb(a);
                    });

                });

            });
        }
    });
};

/**
 * ### ResourceManager.inPublic
 *
 * Sets/Gets whether a file was previously found in `/public/`
 *
 * If `found` is specified, it stores the value.
 * Else returns the value, TRUE if previously found, FALSE, otherwise.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 * @param {boolean|undefined} found The state
 *
 * @return {boolean|undefined} TRUE, if previously found, FALSE, if not found,
 *   undefined if no previous record was set
 */
ResourceManager.prototype.inPublic = function(gameName, path, found) {
    if ('undefined' === typeof found) return games[gameName].cachePublic[path];
    games[gameName].cachePublic[path] = found;
    return found;
};

/**
 * ### ResourceManager.inTemplates
 *
 * Sets/Gets whether a file was previously found in `/public/`
 *
 * If `found` is specified, it stores the value.
 * Else returns the value, TRUE if previously found, FALSE, otherwise.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 * @param {boolean|undefined} found The state
 *
 * @return {boolean|undefined} TRUE, if previously found, FALSE, if not found,
 *   undefined if no previous record was set
 */
ResourceManager.prototype.inTemplates = function(gameName, path, found) {
    if ('undefined' === typeof found) {
        return games[gameName].cacheTemplate[path];
    }
    games[gameName].cacheTemplate[path] = found;
    return found;
};

/**
 * ### ResourceManager.cacheContext
 *
 * Stores in memory a copy of a fully instantiated context object
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/templates/`
 * @param {object} context The context object
 *
 * @see ResourceManager.getContext
 */
ResourceManager.prototype.cacheContext = function(gameName, path, context) {
    games[gameName].cacheContext[path] = context;
};

/**
 * ### ResourceManager.cacheContextCallback
 *
 * Stores in memory a copy of a context callback
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/contexts/`
 * @param {function} cb The context callback
 */
ResourceManager.prototype.cacheContextCallback = function(gameName, path, cb) {
    games[gameName].contextCallbacks[path] = cb;
};

/**
 * ### ResourceManager.getContext
 *
 * Returns a context object instantiated from a context callback
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} contextPath The path to the file in `/views/contexts/`
 * @param {object} gameSettings Game settings to pass to the context callback
 * @param {object} headers Headers of the connection to pass to the
 *   context callback
 *
 * @return {object} context The fully instantiated context object
 */
ResourceManager.prototype.getContext = function(gameName, contextPath,
                                                gameSettings, headers) {
    var context, cb;
    if (!games[gameName]) return null;
    cb = games[gameName].contextCallbacks[contextPath];
    if (!cb) return null;
    context = cb(gameSettings, headers);
    return context;
};

/**
 * ### ResourceManager.getSandBox
 *
 * Returns a object containing only safe methods
 *
 * Useful when you need to give game developer access to the resource manager,
 * and you need to maintain game separation.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} gamePath The path to game directory
 *
 * @return {object} A sandboxed version of the resource manager
 */
ResourceManager.prototype.getSandBox = function(gameName, gamePath) {
    var sb = {};
    sb.modifyContext = function(contextPath, cb) {
        var fullPath;
        if ('string' !== typeof contextPath) {
            throw new TypeError('ResourceManager.modifyContext: contextPath ' +
                                'must be string. Found: ' + contextPath);
        }
        if ('function' !== typeof cb) {
            throw new TypeError('ResourceManager.modifyContext: cb must be ' +
                                'function. Found: ' + cb);
        }
        fullPath = path.join(gamePath, 'views', 'contexts', contextPath);
        games[gameName].contextCallbacks[fullPath] = cb;
    };
    return sb;
};


// ## Helper methods.

/**
 * ### loadContextCallback
 *
 * Loads the context callback from file system and catches errors
 *
 * @param {string} contextPath The path to load
 * @param {Logger} logger The ServerNode logger
 *
 * @return {function|boolean} The context callback or FALSE in case of error
 */
function loadContextCallback(contextPath, logger) {
    var cb;
    try {
        cb = require(contextPath);
        if ('function' !== typeof cb) {
            throw new TypeError('loadContextCallback: context callback ' +
                                'must be function. Found: ' + cb + '. Path: ' +
                                contextPath);
        }
    }
    catch(e) {
        logger.error('loadContextCallback: error loading ' +
                     'context file: ' + contextPath + ' ' + e.stack);
        return false;
    }
    return cb;
}
