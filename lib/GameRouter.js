/**
 * # GameRouter
 * Copyright(c) 2017 Stefano Balietti
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

function GameRouter(channel) {

    /**
     * ### GameRouter.servernode
     *
     * Reference to the ServerNode
     */
    this.servernode = channel.servernode;

    /**
     * ### GameRouter.channel
     *
     * Reference to the ServerChannel
     */
    this.channel = channel;

    // gameDir, gameName, gameInfo,
};

/**
 * ### GameLoader.addRoutes
 *
 * Add routes for the game name (and aliases)
 *
 * @param {string} alias Optional. The name of the alias. Default:
 *   the channel game's name.
 *
 * @see ServerChannel.gameName
 * @see ServerChannel.gameInfo
 */
GameRouter.prototype.addRoutes = function(alias) {
    var servernode, app, resourceManager, channel;
    var basepath, rootDir, publicDir;
    var auth, monitorUri;
    var i, len;
    var gameDir, gameName, gameInfo, name;

    gameInfo = this.channel.gameInfo;
    gameName = this.channel.gameName;

    // Add alias routes (if any and if it is not an alias already).
    // We add alias first so they are available also if this is default channel.
    if (!alias && gameInfo.alias.length) {
        i = -1, len = gameInfo.alias.length;
        for ( ; ++i < len ; ) {
            this.addRoutes(gameInfo.alias[i]);
        }
    }

    servernode = this.servernode;
    channel = this.channel;

    basepath = servernode.basepath || '';
    app = servernode.http;
    resourceManager = servernode.resourceManager;
    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';

    gameDir = gameInfo.dir;

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
                    return replyToClaimId(res, cb, 400, 'operation disabled',
                                          auth.claimIdModifyReply);
                }

                if (!userId || userId.trim() === '') {
                    return replyToClaimId(res, cb, 400, 'no code provided',
                                          auth.claimIdModifyReply);
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
                    return replyToClaimId(res, cb, 200, code.id,
                                          auth.claimIdModifyReply);
                }
                else {
                    return replyToClaimId(res, cb, 400, 'no more codes',
                                          auth.claimIdModifyReply);
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

        // Serving results from data/ directory.
        app.get(name + '/monitor/authsettings/:setting/*',
                function(req, res, next) {

            var setting, file;
            setting = req.params.setting;
            file = req.params[0];
            // Security check.
            if (!file || gameInfo.auth[setting] !== file) {
                res.status(500).send('Invalid request.');
                return;
            }
            serveFileOrDie(req, res, gameInfo, function() {
                if (path.isAbsolute(file)) return file;
                return gameInfo.dir + 'auth/' + file;
            });
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

            var basename, templatePath, templateFound, contextPath, context;

            // File in public (cached or loaded).
            if (cachedFile) {
                res.set(headers);
                res.status(200).send(cachedFile);
                return;
            }

            // FIX HERE.
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

            contextPath = gameInfo.dir + 'views/contexts/' + basename + '.js';

            // Info about previous requests to the template file.
            templateFound = resourceManager.inTemplates(gameName, templatePath);

            // Template not existing.
            if (templateFound === false) {
                res.status(404).send('File not Found');
            }
            // Template existing, render it.
            else if (templateFound === true) {
                renderTemplate(resourceManager, req, res, channel,
                               templatePath, contextPath);
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
                    renderTemplate(resourceManager, req, res, channel,
                                   templatePath, contextPath);
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

/**
 * ### loginSuper
 *
 * Checks if an incoming super-user connection is authorized, if so registers it
 *
 * A super-user is a client that is trying to connect to the monitor/ uri.
 *
 * Authorization is done against the data in channel/channel.credentials.js.
 *
 * An authorized connection receives a cookie with signed JSON web token
 * and it is redirected to the actual monitor/ uri.
 *
 * A connection that is not authorized simply receives a warning message.
 *
 * @param {ServerChannel} Reference to the channel.
 * @param {string} gameName The name of the game
 * @param {string} user The id of the user
 * @param {string} pwd The password for the user
 * @param {object} req The request object from Express
 * @param {object} res The respond object from Express
 *
 * @return {boolean} TRUE if connection is authorized, FALSE otherwise
 *
 * @see createToken
 */
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

/**
 * ### login
 *
 * Checks if an incoming connection is authorized, if so registers it
 *
 * An authorized connection receives a cookie with signed JSON web token
 * and it is redirected to the actual game uri.
 *
 * A connection that is not authorized simply receives a warning message.
 *
 * @param {ServerChannel} Reference to the channel.
 * @param {string} gameName The name of the game
 * @param {string} user The id of the user
 * @param {string} pwd The password for the user
 * @param {object} req The request object from Express
 * @param {object} res The respond object from Express
 *
 * @return {boolean} TRUE if connection is authorized, FALSE otherwise
 *
 * @see createToken
 */
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

/**
 * ### createToken
 *
 * Creates a signed JSON web token
 *
 * @param {string} userId The id of the user
 * @param {object} channel An object containing the channel's secret
 *   the channel's session id
 * @param {object} tokenList An object used to map the tokens to user profiles
 *
 * @return {string} The signed JSON web token
 */
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

/**
 * ### renderTemplate
 *
 * Renders a template and sents it to a client
 *
 * If an error occurs, or file is not found sends a 404 error.
 *
 * @param {ResourceManager} resourceManager Reference to the resource manager
 * @param {object} req The request object from Express
 * @param {object} res The respond object from Express
 * @param {string} templatePath The path to the template file
 * @param {string} contextPath The path to the context file
 */
function renderTemplate(resourceManager, req, res, channel,
                        templatePath, contextPath) {

    var gameName, gameSettings;
    var context, cb;
    var clientId, room, treatmentName;

    gameName = channel.gameName;

    // Build the right settings object to pass to the context callback.
    // By default, it is the 'standard' treatment. If we
    // can locate the client id (via signed cookie), and if the client id
    // is found in a room with a treatment, then use just the settings for
    // that particular treatment.
    treatmentName = 'standard';
    if (req.cookies && req.cookies.nodegame_token) {
        clientId = verifyToken(req.cookies.nodegame_token, channel.secret);
        if (clientId === false) {
            channel.sysLogger.log('GameRouter renderTemplate: failed to ' +
                                  'verify token ' + req.cookies.nodegame_token +
                                  ' in channel ' + gameName, 'error');
        }
        else {
            room = channel.registry.getClientRoom(clientId);
            room = channel.gameRooms[room];
            if (room) treatmentName = room.treatmentName;
        }
    }
    gameSettings = channel.gameInfo.settings[treatmentName];

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
                    throw new TypeError('GameRouter renderTemplate: context  ' +
                                        'callback must be function. Found: ' +
                                        cb);
                }
            }
            catch(e) {
                resourceManager
                    .servernode
                    .logger.error('GameRouter renderTemplate: error loading ' +
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

/**
 * ### buildHeaders
 *
 * Formats the response headers looking up the mime type of the file
 *
 * @param {string} file The name of the file (containing extension) that
 *   that will be sent to a client
 *
 * @return {object} headers The headers with the added 'Content-Type' property
 */
function buildHeaders(file) {
    var mimeType, charset, headers;
    mimeType = mime.lookup(file);
    charset = mime.charsets.lookup(mimeType);
    headers = { 'Content-Type': mimeType };
    if (charset) headers.charset = charset;
    return headers;
}

/**
 * ### replyToClaimId
 *
 * Formats the response to a claim-id a request and sends it as a JSONP
 *
 * @param {object} res The respond object from Express
 * @param {string} cbName The name of of the callback function that will
 *   be executed on the clients upon receiving the response
 * @param {number} responseCode The status of the response, 200 for
 *   for success. It changes how the response objects sends the data
 *   back to client
 * @param {string} codeOrErr The a valid code, or an error string that
 *   will be sent to client
 * @param {function} modReplyCb Optional. A callback that modifies the
 *   reply object before sending it
 */
function replyToClaimId(res, cbName, responseCode, codeOrErr, modReplyCb) {
    var code;
    code = responseCode === 200 ? { code: codeOrErr } : { err: codeOrErr };
    if (modReplyCb) modReplyCb(code);
    console.log('claim id: ' + codeOrErr);
    res.status(responseCode).send(cbName + '(' + JSON.stringify(code) + ')');
}

/**
 * ### getFileFromReq
 *
 * Extracts the file from an incoming request (params[0])
 *
 * If the request is malformed, it sends a 404 error and returns
 *
 * @param {object} req The request object from Express
 * @param {object} res The respond object from Express
 *
 * @return {string|boolean} file The requested file or false, if the
 *   the request was malformed
 *
 * @see getFileFromReq
 */
function getFileFromReq(req, res) {
    var file;
    file = req.params[0];
    if ('' === file || 'undefined' === typeof file) {
        res.status(404).send('No file specified.');
        return false;
    }
    else if (file.lastIndexOf('\/') === (file.length - 1)) {
        // Removing the trailing slash because it creates:
        // Error: ENOTDIR in fetching the file.
        file = file.substring(0, file.length - 1);
    }
    return file;
}

/**
 * ### serveFileOrDie
 *
 * Analizes the request object and sends the requested file or a 404 error
 *
 * @param {object} req The request object from Express
 * @param {object} res The respond object from Express
 * @param {object} gameInfo The game info as in channel
 * @param {function} cb A callback function that adjusts the path to
 *    the requested file (files can be also outside of the game directory)
 *
 * @see getFileFromReq
 */
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

/**
 * ### zipResults
 *
 * Zips all the files in the data/ directory and sends the archive
 *
 * @param {object} req The request object from Express
 * @param {object} res The respond object from Express
 * @param {object} gameInfo The game info as in channel
 */
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
 * ### tryStringify
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
 * ### asyncStringifyAndSend
 *
 * Decycles and strinfies a collection of items, then sends it
 *
 * @param {array} db The collection of items to stringify
 *
 * @return {string} The stringified item, or false if an error occurred
 */
function asyncStringifyAndSend(db, res) {
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

/**
 * ### verifyToken
 *
 * Verifies a signed JSON web token
 *
 * @param {string} token The encrypted token
 * @param {string} secret The secret
 *
 * @return {string|boolean} The signed JSON web token, or
 *   FALSE if an error occurred
 */
function verifyToken(token, secret) {
    try {
        return jwt.verify(token, secret).clientId;
    }
    catch(e) {
        return false;
    }
}
