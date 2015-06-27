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
var express = require('express');
var jwt = require('jsonwebtoken');
var url = require('url');

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
    var servernode, app, pager;
    var rootDir, monitorDir, publicDir;
    var monitorUri;
    var i, len;
    var name;

    servernode = this.servernode;

    channel = servernode.channels[gameName];
    app = servernode.http;
    pager = servernode.pager;
    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';
    monitorDir = rootDir + '/node_modules/nodegame-monitor/public/';

    name = alias || gameName;

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
        var path, file;
        var search;

        if (!gameInfo.auth.enabled) {
            // res.send('No authorization needed.');
            // return;
        }

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

        // Build path to file.
        path = monitorDir + file;
        // Send file.
        res.sendfile(path);
    });

    app.get('/' + name + '/monitor', function(req, res) {
        res.redirect(monitorUri);
    });

    // Game. (default index.htm).
    app.get('/' + name + '/*', function(req, res) {
        var gameSettings, filePath, file;
        var jadeTemplate, jsonContext, contextPath, langPath, pageName;

        file = req.params[0];
        if ('' === file || 'undefined' === typeof file) {
            file = 'index.htm';
        }
        else if (file.lastIndexOf('\/') === (file.length - 1)) {
            // Removing the trailing slash because it creates:
            // Error: ENOTDIR in fetching the file.
            file = file.substring(0, file.length - 1);
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

        // If file was served already from public/ serve it
        // immediately (cached by Express).
        if (pager.inPublic(gameName, file)) {
            // Send file (if it is a directory it is not sent).
            res.sendfile(filePath);
            return;
        }

        // Checks if exists in 'public/' or as view.
        fs.exists(filePath, function(exists) {
            var basename, templatePath, templateFound, contextPath, context;

            // Exists in public, cache it, serve it.
            if (exists) {
                fs.readFile(filePath, 'utf8', function(err, data) {
                    // Mark existing.
                    pager.inPublic(gameName, file, true);
                    res.sendfile(filePath);
                });
                return;
            }

            // Check if it a template.
            basename = file.substr(0, file.lastIndexOf('.'));

            // Instantiate templates, if available.
            // `html/templates/page.jade` holds the template and
            // `html/contexts/xx/xx/page.js` holds the context callback
            // to instantiate the page requested by `xx/xx/page*`.

            // Matches: xx/xx/xx/xx/xx/
            if (basename.match(/^[^\/]*\/.*$/)) {
                templatePath = gameInfo.dir + 'views/templates/' +
                    basename.split('/')[1] + '.jade';
            }
            else {
                templatePath = gameInfo.dir + 'views/templates/' +
                    basename + '.jade';
            }

            contextPath = gameInfo.dir + 'views/contexts/' +
                basename + '.js';

            // Info about previous requests to the template file.
            templateFound = pager.inTemplates(gameName, templatePath);

            // Template not existing.
            if (templateFound === false) {
                res.send('File not Found', 404);
            }
            // Template existing, render it.
            else if (templateFound === true) {
                renderTemplate(pager, req, res, gameName,
                               templatePath, contextPath, gameSettings);
            }
            // Do not know if exists or not, check and render it.
            else {

                fs.exists(templatePath, function(exists) {
                    if (!exists) {
                        pager.inTemplates(gameName, templatePath, false);
                        res.send('File not Found', 404);
                        return;
                    }
                    pager.inTemplates(gameName, templatePath, true);
                    renderTemplate(pager, req, res, gameName, templatePath,
                                   contextPath, gameSettings);
                });
            }
        });
    });

    app.get('/' + name, function(req, res) {
        res.redirect('/' + name + '/');
    });

    // Adding the public directory of the game to the static directories
    // http://stackoverflow.com/questions/5973432/
    //  setting-up-two-different-static-directories-in-node-js-express-framework
    app.use(name + '/public', express.static(gameDir + 'public'));

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
        console.log('setting cookie');
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
        console.log('setting cookie');
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

function renderTemplate(pager, req, res, gameName, templatePath, contextPath,
                        gameSettings) {

    var context, cb;

    // Context is retrieved from cache,
    // and can be modified by user-defined callbacks.
    context = pager.getContext(gameName, contextPath, gameSettings,
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
                    throw new TypeError('ContextCallback must be ' +
                                        'function.');
                }
            }
            catch(e) {
                servernode.logger.error('Error loading context file: ' +
                                        contextPath + ' ' + e);
                // TODO: Log error.
                // TODO: Mark file as non-existing ?
                res.send('File not Found', 404);
                return;
            }
            pager.cacheContextCallback(gameName, contextPath, cb);
            context = cb(gameSettings, req.headers);
        }
        // Render anyway, with or without context.
        res.render(templatePath, context);
    });
}
