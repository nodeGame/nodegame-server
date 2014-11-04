/**
 * # PageManager.js
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles caching, and templating options for each game
 * ---
 */
module.exports = PageManager;

var jade = require('jade');

var games = {};

/**
 * ## PageManager
 *
 * Constructs a new instance of PageManager
 */
function PageManager() {}

// ## Methods

/**
 * ### PageManager.addGame
 *
 * Setup an empty data structure for holding game info
 *
 * @param {string} gameName The name of the game as it appears in http requests
 */
PageManager.prototype.addGame = function(gameName) {
    if ('string' !== typeof gameName) {
        throw new Error('PageManager.addGame: gameName must be string.');
    }
    games[gameName] = {
        cachePublic: {},
        cachePublicFile: {},
        cacheTemplate: {},
        cacheTemplateFile: {},
        cacheContext: {},
        contextCallbacks: {}
    };
};

/**
 * ### PageManager.inPublic
 *
 * Returns TRUE if a file was previously found in `/public/`
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 *
 * @return {boolean} TRUE, if previously found
 */
PageManager.prototype.inPublic = function(gameName, path) {
    return !!games[gameName] && games[gameName].cachePublic[path];
};

/**
 * ### PageManager.inTemplates
 *
 * Returns TRUE if a file was previously found in `/views/templates/`
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/templates/`
 *
 * @return {boolean} TRUE, if previously found
 */
PageManager.prototype.inTemplates = function(gameName, path) {
    return !!games[gameName] && games[gameName].cacheTemplate[path];
};

/**
 * ### PageManager.addToPublic
 *
 * Registers a file path as _found_ in `/public/`
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 */
PageManager.prototype.addToPublic = function(gameName, path) {
    games[gameName].cachePublic[path] = true;
};

/**
 * ### PageManager.addToTemplates
 *
 * Registers a file path as _found_ in `/views/templates/`
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/templates/`
 */
PageManager.prototype.addToTemplates = function(gameName, path) {
    games[gameName].cacheTemplate[path] = true;
};

/**
 * ### PageManager.cachePublic
 *
 * Stores in memory a copy of the content of a file found in `/public/`
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 * @param {string} file The content of the file
 */
PageManager.prototype.cachePublic = function(gameName, path, file) {
    games[gameName].cachePublicFile[path] = file;
};

/**
 * ### PageManager.cacheTemplate
 *
 * Stores in memory a copy of the content of a file found in `/public/`
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/templates/`
 * @param {string} template The content of the template file
 */
PageManager.prototype.cacheTemplate = function(gameName, path, template) {
    games[gameName].cacheTemplateFile[path] = template;
};

/**
 * ### PageManager.cacheContext
 *
 * Stores in memory a copy of a fully instantiated context object
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/templates/`
 * @param {object} context The context object
 *
 * @see PageManager.getContext
 */
PageManager.prototype.cacheContext = function(gameName, path, context) {
    games[gameName].cacheContext[path] = context;
};

/**
 * ### PageManager.cacheContextCallback
 *
 * Stores in memory a copy of a context callback
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/contexts/`
 * @param {function} cb The context callback
 */
PageManager.prototype.cacheContextCallback = function(gameName, path, cb) {
    games[gameName].contextCallbacks[path] = cb;
};

/**
 * ### PageManager.getContext
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
PageManager.prototype.getContext = function(gameName, contextPath,
                                            gameSettings, headers) {
    var context, cb;
    if (!games[gameName]) return null;
    cb = games[gameName].contextCallbacks[contextPath];
    if (!cb) return null;
    context = cb(gameSettings, headers);
    return context;
};

/**
 * ### PageManager.getSandBox
 *
 * Returns a object containing only safe methods
 *
 * Useful when you need to give game developer access to the page manager,
 * and you need to maintain game separation.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 *
 * @return {object} A sandboxed version of the page manager
 */
PageManager.prototype.getSandBox = function(gameName) {
    var sb = {};
    sb.modifyContext = function(contextPath, cb) {
        var context, cb;
        if ('string' !== typeof contextPath) {
            throw new TypeError('PageManager.modifyContext: contextPath ' +
                                'must be string.');
        }
        if ('function' !== typeof cb) {
            throw new TypeError('PageManager.modifyContext: cb must be ' +
                                'function.');
        }
        games[gameName].contextCallbacks[contextPath] = cb;
    };
    return sb;
};
