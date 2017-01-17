/**
 * # GameRouter
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Adds game routes depending on game settings.
 *
 * http://nodegame.org
 */

"use strict";

var fs = require('fs');
var path = require('path');
var jwt = require('jsonwebtoken');
var url = require('url');

var express = require('express');
var mime = express.static.mime;
var View = express.View;

var monitorDir = require('nodegame-monitor').publicDirPath;

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
    var servernode, app, resourceManager, channel;
    var basepath, rootDir, publicDir;
    var auth, monitorUri;
    var i, len;
    var name;

    // Add alias routes (if any and if it is not an alias already).
    // We add alias first so they are available also if this is default channel.
    if (!alias && gameInfo.alias.length) {
        i = -1, len = gameInfo.alias.length;
        for ( ; ++i < len ; ) {
            this.addRoutes(gameDir, gameName, gameInfo, gameInfo.alias[i]);
        }
    }

    servernode = this.servernode;

    basepath = servernode.basepath || '';
    channel = servernode.channels[gameName];
    app = servernode.http;
    resourceManager = servernode.resourceManager;
    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';

    if ((servernode.getDefaultChannel() === gameName) && !alias) {
        name = basepath;
    }
    else {
        name = basepath + '/' + (alias || gameName);
    }

    // Adding the public directory of the game to the static directories
    // http://stackoverflow.com/questions/5973432/
    //  setting-up-two-different-static-directories-in-node-js-express-framework
    if (!gameInfo.channel.cacheMaxAge) {
        app.use(express.static(gameDir + 'public'));
    }
    else {
        app.use(express.static(gameDir + 'public', {
            maxAge: gameInfo.channel.cacheMaxAge
        }));
    }
    // app.use(express.static(gameDir + 'public'));

    // Auth.
    if (gameInfo.auth && gameInfo.auth.enabled) {

        auth = gameInfo.auth;

        // claimId
        if (auth.claimId) {

            app.get(name + '/claimid/*', function(req, res, next) {
                var userId, valid, code, tmp;
                var cb;
                cb = req.query.callback || 'callback';
                userId = req.query.id;

                // Send it.
                res.set('Content-Type', 'application/javascript');
                res.set('Charset', 'utf-8');

                // Claim Id can be disabled while the game runs, check again!
                if (!auth.claimId) {
                    return replyToClaimId(res, cb, 400, 'operation disabled');
                }

                if (!userId || userId.trim() === '') {
                    return replyToClaimId(res, cb, 400, 'no code provided');
                }

                if ('function' === typeof auth.claimIdValidateRequest) {
                    valid = auth.claimIdValidateRequest(req.query, req.headers);

                    if (valid !== true) {
                        return replyToClaimId(res, cb, 400, valid || 'error');
                    }
                }

                // Ask the channel for next available code.
                code = channel.registry.claimId(userId);

                if (code) {
                    if ('function' === typeof auth.claimIdPostProcess) {
                        auth.claimIdPostProcess(code, req.query,
                                                req.headers);
                    }
                    return replyToClaimId(res, cb, 200, code.id);
                }
                else {
                    return replyToClaimId(res, cb, 400, 'no more codes');
                }

            });
        }

        // TODO: Monitor route was before auth, now moved in alias-if.

        app.get(name + '/auth/*', function(req, res, next) {
            var userId, pwd, tmp;
            tmp = req.params[0].split('/');
            userId = tmp[0];
            pwd = tmp[1];
            login(channel, name, userId, pwd, res, req);
        });

        // If not alias, add monitor route and
        // optimize auth check for alias and not alias.
        if (!alias) {

            app.get(name + '/monitor/auth/*', function(req, res) {
                var userId, pwd, tmp;
                tmp = req.params[0].split('/');
                userId = tmp[0];
                pwd = tmp[1];
                loginSuper(channel, name, userId, pwd, res, req);
            });

            app.get(name + '/*', function(req, res, next) {
                if (req.params[0] &&
                    req.params[0].substring(0,8) === 'monitor/') {

                    if (!req.cookies ||
                        !superTokens[req.cookies.nodegame_token]) {

                        res.status(403).send(unauthMsg);
                        return;
                    }
                }
                // Check if a cookie is set correctly.
                else if (!req.cookies || !tokens[req.cookies.nodegame_token]) {
                    res.status(403).send(unauthMsg);
                    return;
                }
                // Auth OK.
                next();
            });
        }
        else {
            app.get(name + '/*', function(req, res, next) {
                if (!req.cookies || !tokens[req.cookies.nodegame_token]) {
                    res.status(403).send(unauthMsg);
                    return;
                }
                // Auth OK.
                next();
            });
        }

    }

    // Monitor (no monitor in aliases).

    if (!alias) {
        monitorUri = name + '/monitor/index.htm?channel=' +
            gameInfo.channel.adminServer.endpoint;

        // If channel can read servernode properties.
        if (servernode.acm.read[gameName]) {

            // Serving server logs.
            app.get(name + '/monitor/servernode/logs/*', function(req, res) {
                serveFileOrDie(req, res, gameInfo, function(file) {
                    return servernode.logDir + '/' + file;
                });
            });
        }

        // Serving results from data/ directory.
        app.get(name + '/monitor/data/*', function(req, res, next) {
            serveFileOrDie(req, res, gameInfo, function(file) {
                return gameInfo.dir + 'data/' + file;
            });
        });

        // Serving results from data/ directory.
        app.get(name + '/monitor/memorydb/*', function(req, res, next) {
            var i, len, roomName, room;
            var out, outStr;

            out = [];
            for (roomName in channel.gameRooms) {
                if (channel.gameRooms.hasOwnProperty(roomName)) {
                    room = channel.gameRooms[roomName];
                    if (room.roomType === 'Game') {
                        out = out.concat(room.getMemoryDb());
                    }
                }
            }
            // Stringify fails if there are cycle (it shouldn't anyway).
            outStr = tryStringify(out);
            if (outStr === false) asyncStringifyAndSend(out, res);
            else res.status(200).send(outStr);
        });

        app.get(name + '/monitor/*', function(req, res, next) {
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

            // Build path to file.
            filePath = path.resolve(monitorDir + file);

            res.sendFile(filePath);
        });

        app.get(name + '/monitor', function(req, res) {
            res.redirect(monitorUri);
        });
    }

    // Game. (default index.htm).
    app.get(name + '/*', function(req, res) {
        var filePath, file, cachedFile;
        var jadeTemplate, jsonContext, contextPath, langPath, pageName;
        var cachedFile, cachedView, headers;

        file = req.params[0];
        if ('' === file || 'undefined' === typeof file) {
            file = 'index.htm';
        }

        // Build filePath to file in public directory.
        filePath = gameInfo.dir + 'public/' + file;

        // TODO: move after refactoring.
        // Send JSON data as JSONP if there is a callback query parameter:
        if (file.match(/\.json$/) && req.query.callback) {
            // Load file contents:
            fs.readFile(filePath, 'utf8', function(err, data) {
                var callback;

                if (err) {
                    res.status(404).json({error: 'file not found'});
                    return;
                }

                // Send it:
                res.set('Content-Type', 'application/javascript');
                res.set('Charset', 'utf-8');
                res.status(200).send(req.query.callback + '(' + data + ');');
            });

            return;
        }

        // Build headers.
        headers = buildHeaders(file);

        // If it is not text, it was not cached.
        if (headers['Content-Type'].substring(0,4) !== 'text') {
            res.sendFile(filePath);
            return;
        }

        // Already found in `public/` and cached.
        resourceManager.getFromPublic(gameName, file, function(cachedFile) {

            // File in public (cached or loaded).
            if (cachedFile) {
                res.set(headers);
                res.status(200).send(cachedFile);
                return;
            }

            // FIX HERE.

            var basename, templatePath, templateFound, contextPath, context;
            // console.log('NNNNNOT in public: ', file);

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
            templateFound = resourceManager.inTemplates(gameName, templatePath);

            // Template not existing.
            if (templateFound === false) {
                res.status(404).send('File not Found');
            }
            // Template existing, render it.
            else if (templateFound === true) {
                renderTemplate(resourceManager, req, res, gameName,
                               templatePath, contextPath, gameInfo.settings);
            }
            // Do not know if exists or not, check and render it.
            else {

                fs.exists(templatePath, function(exists) {
                    if (!exists) {
                        resourceManager.inTemplates(gameName, templatePath,
                                                    false);

                        res.status(404).send('File not found');
                        return;
                    }
                    resourceManager.inTemplates(gameName, templatePath, true);
                    renderTemplate(resourceManager, req, res, gameName,
                                   templatePath,
                                   contextPath, gameInfo.settings);
                });
            }
        });

            // Check if it is a view.
//            resourceManager.getFromViews(gameName, file, function(view) {
//
//                // View found.
//                if (view) {
//                    res.send(view);
//                }
//                else {
//                    res.send(404);
//                }
//            }, gameInfo.settings, req.headers);
//        });


    });

    app.get(name, function(req, res) {
        res.redirect(name + '/');
    });
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
        redirectUri = gameName + '/monitor/';
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
        redirectUri = gameName + '/';
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
    expire = 60*60*5;
    // We are sending the profile in the token.
    token = jwt.sign(profile, secret, { expiresIn: expire});

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
                res.status(404).send('File not Found');
                return;
            }
            resourceManager.cacheContextCallback(gameName, contextPath, cb);
            context = cb(gameSettings, req.headers);
        }
        // Render anyway, with or without context.
        res.render(templatePath, context);
    });
}

function buildHeaders(file) {
    var mimeType, charset, headers;
    mimeType = mime.lookup(file);
    charset = mime.charsets.lookup(mimeType);
    headers = { 'Content-Type': mimeType };
    if (charset) headers.charset = charset;
    return headers;
}

function replyToClaimId(res, cb, responseCode, codeOrErr) {
    var str;
    if (responseCode === 200) {
        str = JSON.stringify({ code: codeOrErr });
    }
    else {
        str = JSON.stringify({ err: codeOrErr });
    }
    console.log('claim id: ' + codeOrErr);
    res.status(responseCode).send(cb + '(' + str + ')');
}

function getFileFromReq(req, res) {
    var file;
    file = req.params[0];
    if ('' === file || 'undefined' === typeof file) {
        res.status(404).send('No file specified.');
        return;
    }
    else if (file.lastIndexOf('\/') === (file.length - 1)) {
        // Removing the trailing slash because it creates:
        // Error: ENOTDIR in fetching the file.
        file = file.substring(0, file.length - 1);
    }
    return file;
}

function serveFileOrDie(req, res, gameInfo, cb) {
    var filePath, file;

    file = getFileFromReq(req, res);
    if (!file) return;

    if (file === '*') {
        zipResults(req, res, gameInfo);
        return;
    }

    // Build path to file.
    filePath = cb(file);

    fs.exists(filePath, function(exists) {
        if (!exists) {
            res.status(404).send('File not found: ' + file);
            return;
        }
        else {
            res.sendFile(filePath);
        }
    });
}

function zipResults(req, res, gameInfo) {
    var archiver, archive;

    archiver = require('archiver');
    archive = archiver('zip');

    archive.on('error', function(err) {
        res.status(500).send({error: err.message});
    });

    res.attachment(gameInfo.info.name + '-data_' +
                   new Date().toISOString() + '.zip');
    archive.pipe(res);
    archive.directory(gameInfo.dir + 'data/', 'data/');
    archive.finalize();
}

/**
 * ## tryStringify
 *
 * Try to stringify an object (should not have cycles)
 *
 * @param {mixed} o The item to stringify
 *
 * @return {string} The stringified item, or false if an error occurred
 */
function tryStringify(i) {
    try {
        i = JSON.stringify(i);
    }
    catch(e) {
        return false;
    }
    return i;
}


/**
 * ## asyncStringifyAndSend
 *
 * Decycles and strinfies a collection of items, then sends it
 *
 * @param {array} db The collection of items to stringify
 *
 * @return {string} The stringified item, or false if an error occurred
 */
function asyncStringifyAndSend(db, res) {
    var NDDB = require('NDDB').NDDB;
    setTimeout(function() {
        var i, len, out;
        i = -1, len = db.length;
        out = new Array(len);
        for ( ; ++i < len ; ) {
            out[i] = JSON.decycle(db[i]);
        }
        res.status(200).send(out);
    });
}
