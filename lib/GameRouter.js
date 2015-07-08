/**
 * # GameRouter
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Adds game routes depending on game settings.
 *
 * http://nodegame.org
 */

var fs = require('fs');
var jwt = require('jsonwebtoken');
var url = require('url');

var express = require('express');
var mime = express.static.mime;
var View = express.View;

// expressJwt = require('express-jwt');

var unauthMsg = 'Sorry, but your connection is ' +
    '<strong>not</strong> authorized.';

module.exports = GameRouter;

// TODO: see if we should move them in constructor.
var tokens = {};
var superTokens = {};

function GameRouter(servernode) {
    this.servernode = servernode;
};

/**
 * ### GameLoader.addRoutes
 *
 * Add routes for the game name (and aliases)
 *
 * @param {string} gameDir The path to the root directory
 * @param {string} gameName The name of the game (or its alias)
 * @param {object} gameInfo Object containing info about the game (auth, etc.)
 * @param {boolean} alias Optional. TRUE, if gameName is an alias, so that
 *   aliases will not be added again.
 */
GameRouter.prototype.addRoutes = function(gameDir, gameName, gameInfo, alias) {
    var servernode, app, resourceManager;
    var rootDir, monitorDir, publicDir;
    var monitorUri;
    var i, len;
    var name;

    servernode = this.servernode;

    channel = servernode.channels[gameName];
    app = servernode.http;
    resourceManager = servernode.resourceManager;
    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';
    monitorDir = rootDir + '/node_modules/nodegame-monitor/public/';

    name = alias || gameName;

    // Adding the public directory of the game to the static directories
    // http://stackoverflow.com/questions/5973432/
    //  setting-up-two-different-static-directories-in-node-js-express-framework
    app.use(express.static(gameDir + 'public'));

    // Auth.
    if (gameInfo.auth && gameInfo.auth.enabled) {

        app.get('/' + name + '/monitor/auth/*', function(req, res) {
            var userId, pwd;
            userId = req.params[0];
            pwd = req.params[1];
            loginSuper(channel, name, userId, pwd, res, req);
        });

        app.get('/' + name + '/auth/*', function(req, res, next) {
            var userId, pwd;
            userId = req.params[0];
            pwd = req.params[1];
            login(channel, name, userId, pwd, res, req);
        });

        app.get('/' + name + '/*', function(req, res, next) {

            if (req.params[0] && req.params[0].substring(0,8) === 'monitor/') {
                if (!req.cookies || !superTokens[req.cookies.nodegame_token]) {
                    res.send(unauthMsg);
                    return;
                }
            }
            // Check if a cookie is set correctly.
            else if (!req.cookies || !tokens[req.cookies.nodegame_token]) {
                res.send(unauthMsg);
                return;
            }
            // Auth OK.
            next();
        });
    }

    // Monitor.

    monitorUri = '/' + name + '/monitor/index.htm?channel=' +
        gameInfo.channel.admin;

    app.get('/' + name + '/monitor/*', function(req, res, next) {
        var userId, pwd;
        var filePath, file, cachedFile;
        var search;

        file = req.params[0];
        if ('' === file || 'undefined' === typeof file) {
            search = url.parse(req.url, true).search;
            if (search) res.redirect(monitorUri + '&' + search.substring(1))
            else res.redirect(monitorUri);
            return;
        }

        else if (file.lastIndexOf('\/') === (file.length - 1)) {
            // Removing the trailing slash because it creates:
            // Error: ENOTDIR in fetching the file.
            file = file.substring(0, file.length - 1);
        }

        // Already found in `public/` and cached.
        cachedFile = resourceManager.inPublic(gameName, file);
        if (cachedFile) {
            res.send(cachedFile);
            return;
        }

        // Build path to file.
        filePath = monitorDir + file;

        // Checks if exists in 'public/' or as view.
        fs.exists(filePath, function(exists) {
            var basename, templatePath, templateFound, contextPath, context;

            // Exists in public, cache it, serve it.
            if (exists) {
                fs.readFile(filePath, 'utf8', function(err, data) {
                    // Cache it.
                    resourceManager.inPublic(gameName, file, data);
                    res.send(data);
                });
                return;
            }
            else {
                res.send('File not Found', 404);
            }
        });
    });

    app.get('/' + name + '/monitor', function(req, res) {
        res.redirect(monitorUri);
    });

    // Game. (default index.htm).
    app.get('/' + name + '/*', function(req, res) {
        var gameSettings, filePath, file, cachedFile;
        var jadeTemplate, jsonContext, contextPath, langPath, pageName;
        var cachedFile, cachedView, headers;

        file = req.params[0];
        if ('' === file || 'undefined' === typeof file) {
            file = 'index.htm';
        }

        gameSettings = gameInfo.settings;

        // Build filePath to file in public directory.
        filePath = gameInfo.dir + 'public/' + file;

        // TODO: move after refactoring.
        // Send JSON data as JSONP if there is a callback query parameter:
        if (file.match(/\.json$/) && req.query.callback) {
            // Load file contents:
            fs.readFile(filePath, 'utf8', function(err, data) {
                var callback;

                if (err) {
                    res.json({error: 'file not found'}, 404);
                    return;
                }

                // Send it:
                res.header('Content-Type', 'application/javascript');
                res.header('Charset', 'utf-8');
                res.send(req.query.callback + '(' + data + ');');
            });

            return;
        }

        // Build headers.
        if (!headers) {
            mimeType = mime.lookup(filePath);
            charset = mime.charsets.lookup(mimeType);
            headers = { 'Content-Type': mimeType };
            if (charset) headers.charset = charset;
        }

        // Already found in `public/` and cached.
        resourceManager.getFromPublic(gameName, file, function(cachedFile) {

            // File in public (cached or loaded).
            if (cachedFile) {
                res.send(cachedFile, headers);
                return;
            }

            // If it is not text/html send 404.
            if (headers['Content-Type'] !== 'text/html') {
                res.send(404);
                return;
            }

            // Check if it is a view.
            resourceManager.getFromViews(gameName, file, function(
                template, contextCb) {

                // TODO.

                if (template) {
                    res.send(cached);
                }
                else {
                    res.send(404);
                }
            });
        });


    });

    app.get('/' + name, function(req, res) {
        res.redirect('/' + name + '/');
    });

    // Add alias routes (if any and if it is not an alias already).
    if (!alias && gameInfo.alias.length) {
        i = -1, len = gameInfo.alias.length;
        for ( ; ++i < len ; ) {
            this.addRoutes(gameDir, gameName, gameInfo, gameInfo.alias[i]);
        }
    }
};

// ## Helper Methods.

function loginSuper(channel, gameName, user, pwd, res, req) {
    var authorized, token;
    var search, redirectUri;

    authorized = channel.authorizeSuperUser(user, pwd);

    if (authorized) {
        token = createToken(user, channel, superTokens);
        res.cookie('nodegame_token', token, {
            path: '/',
            httpOnly: true
        });
        redirectUri = '/' + gameName + '/monitor/';
        search = url.parse(req.url, true).search;
        if (search) redirectUri += search;
        res.redirect(redirectUri);
        return true;
    }

    res.send('Wrong user/pwd.');
    return false;
}

function login(channel, gameName, user, pwd, res, req) {
    var authorized, token;
    var search, redirectUri;

    authorized = channel.registry.authorize({ id: user, pwd: pwd });

    if (authorized) {
        token = createToken(user, channel, tokens);
        res.cookie('nodegame_token', token, {
            path: '/',
            httpOnly: true
        });
        redirectUri = '/' + gameName + '/';
        search = url.parse(req.url, true).search;
        if (search) redirectUri += search;
        res.redirect(redirectUri);
        return true;
    }

    res.send('Wrong user/pwd.');
    return false;
}

function createToken(userId, channel, tokenList) {
    var profile, secret, expire, token;
    profile = {
        clientId: userId,
        session: channel.session
    };

    secret = channel.secret;
    expire = 60*5;
    // We are sending the profile in the token.
    token = jwt.sign(profile, secret, { expiresInMinutes: expire});

    // Store the token somewhere.
    tokenList[token] = profile;

    return token;
}

function renderTemplate(resourceManager, req, res, gameName, templatePath,
                        contextPath, gameSettings) {

    var context, cb;

    // Context is retrieved from cache,
    // and can be modified by user-defined callbacks.
    context = resourceManager.getContext(gameName, contextPath, gameSettings,
                               req.headers);

    if (context) {
        res.render(templatePath, context);
        return;
    }

    fs.exists(contextPath, function(exists) {
        if (exists) {
            try {
                cb = require(contextPath);
                if ('function' !== typeof cb) {
                    throw new TypeError('renderTemplate: context callback ' +
                                        'must be function.');
                }
            }
            catch(e) {
                servernode.logger.error('renderTemplate: error loading ' +
                                        'context file: ' + contextPath +
                                        ' ' + e.stack);
                // TODO: Log error.
                // TODO: Mark file as non-existing ?
                res.send(404);
                return;
            }
            resourceManager.cacheContextCallback(gameName, contextPath, cb);
            context = cb(gameSettings, req.headers);
        }
        // Render anyway, with or without context.
        res.render(templatePath, context);
    });
}
