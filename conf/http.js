/**
 * # http.js
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Express server in nodegame-server
 * ---
 */
module.exports = configure;

// ## Global scope

var util = require('util'),
fs = require('fs'),
path = require('path'),
express = require('express'),
J = require('nodegame-client').JSUS,
nodemailer = require('nodemailer');

/**
 * ### ServerNode._configureHTTP
 *
 * Defines standard routes for the HTTP server
 *
 * @param {object} options The object containing the custom settings
 */
function configure(app, servernode) {
    var rootDir;
    var gameCachePublic = {};
    var gameCacheTemplate = {};
    var gameCacheContext = {};

    rootDir = servernode.rootDir;

    function verifyGameRequest(req, res) {
        var gameInfo;
        gameInfo = servernode.info.games[req.params.game];

        if (!gameInfo) {
            res.send('Resource ' + req.params.game + ' is not available.');
            return false;
        }

        if (!gameInfo.dir) {
            res.send('Resource ' + req.params.game +
                     ' is not configured properly: missing game directory.');
            return false;
        }

        return gameInfo;
    }

    function sendFromPublic(type, req, res) {
        var path, i;
        if (!req.params.file) return;
        if (req.params.file.lastIndexOf('\/') === (req.params.file.length-1)) {
            req.params.file = req.params.file.substring(0,req.params.file.length-1);
        }

        // Build path to file.
        path = rootDir + '/public/' + type + '/' + req.params.file;
        // Send file.
        res.sendfile(path);
    }

    // TODO: COMMENT
    function createAndServe(langPath, pageName, file,
                            gameInfo, contextPath, res) {
        var jadeTemplate, jsonContext;

        langPath = file.split('/')[1] + '/';
        pageName = file.split('/')[2].split('.')[0];

        jadeTemplate = gameInfo.dir + 'view/templates/' + pageName +
            '.jade';

        contextPath = gameInfo.dir + 'view/context/' + langPath +
            pageName + '.json';
        try {
            jsonContext = require(contextPath);
        }
        catch (e) {
            // redirect to 'page not found'
            res.sendfile(gameInfo.dir + 'public/notFound.html'); //TODO: INSERT PROPER FILE
            return;

        }
        res.render(jadeTemplate, jsonContext);
    }

    function renderTemplate(res, gameName, templatePath, contextPath, 
                            gameCacheContext) {
        var context;
        debugger
        context = gameCacheContext[gameName][contextPath];

        if (context) {
            // TODO can modify context.
            res.render(templatePath, context);
            return;
        }
            
        fs.exists(contextPath, function(exists) {
            if (exists) {
                try {
                    context = require(contextPath);
                }
                catch(e) {
                    // TODO: Log error.
                    // TODO: Mark file as non-existig ?
                    // TODO: INSERT PROPER FILE.
                    res.sendfile(gameInfo.dir + 'public/notFound.html');
                    return;
                }
                gameCacheContext[gameName][contextPath] = context;
            }
            // Render anyway, with or without context.
            res.render(templatePath, context);
        });        
    }

    app.use(express.cookieParser());

    app.configure('development', function(){
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    });

    app.configure('production', function(){
        app.use(express.errorHandler());
    });

    app.enable("jsonp callback");

    app.get('/', function(req, res) {
        var q;
        if (J.isEmpty(req.query)) {
            res.render('index', {
                title: 'Yay! Your nodeGame server is running.'
            });
        }

        q = req.query.q;

        if (!q) {
            res.send('Query must start with q=XXX');
        }

        switch(q) {
        case 'info':
            //console.log(servernode.info);
            res.send(servernode.info);
            break;

        case 'channels':
            //console.log(servernode.info);
            res.send(servernode.info.channels);
            break;

        case 'games':
            //console.log(servernode.info);
            res.send(servernode.info.games);
            break;
        default:
            res.send('Unknown query received.');
        }
    });

    app.get('/error/:type', function(req, res) {
        var type = req.params.type;
        res.render('error/' + type);
    });

    app.get('/images/:file', function(req, res) {
        sendFromPublic('images', req, res);
    });

    app.get('/javascripts/:file', function(req, res) {
        sendFromPublic('javascripts', req, res);
    });

    app.get('/stylesheets/:file', function(req, res) {
        sendFromPublic('stylesheets', req, res);
    });

    app.get('/pages/:file', function(req, res) {
        sendFromPublic('pages', req, res);
    });

    // Serves game files or default game index file: index.htm.
    app.get('/:game/*', function(req, res) {
        var gameName, gameInfo, filePath, file;
        var jadeTemplate, jsonContext, contextPath, langPath, pageName;

        gameInfo = verifyGameRequest(req, res);
        if (!gameInfo) return;

        gameName = req.params.game;
        file = req.params[0];

        // TODO: place in a proper place.
        if (!gameCachePublic[gameName]) gameCachePublic[gameName] = {};
        if (!gameCacheTemplate[gameName]) gameCacheTemplate[gameName] = {};
        if (!gameCacheContext[gameName]) gameCacheContext[gameName] = {};

        if ('' === file || 'undefined' === typeof file) {
            file = 'index.htm';
        }
        else if (file.lastIndexOf('\/') === (file.length-1)) {
            // Removing the trailing slash because it creates:
            // Error: ENOTDIR in fetching the file.
            file = file.substring(0, file.length-1);
        }

        // TODO: fix this.
        // Executes callback if one has been defined for this file.
        if (app.gameHooks) {
            for (i = 0; i < app.gameHooks.length; ++i) {
                if (app.gameHooks[i].file === file) {
                    app.gameHooks[i].callback(req, res);
                    return;
                }
            }
        }
        
        // Build filePath to file in public directory.
        filePath = gameInfo.dir + 'public/' + file;
        console.log(file);

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

        // If file is in public/ serve it immediately (cached by Express).
        if (gameCachePublic[gameName] && gameCachePublic[gameName][file]) {
            // Send file (if it is a directory it is not sent).
            res.sendfile(filePath);
            return;
        }

        // If exists in 'public/', cache it and serve it.
        fs.exists(filePath, function(exists) {
            var basename, templatePath, contextPath, context;
            if (exists) {
                fs.readFile(filePath, 'utf8', function(err, data) {
                    gameCachePublic[gameName][file] = true;
                    res.sendfile(filePath);
                });
                return;
            }
            debugger
            // Check if it a template.
            basename = file.substr(0, file.lastIndexOf('.'));
            templatePath = gameInfo.dir + 'views/templates/' + 
                basename + '.jade';
            contextPath = gameInfo.dir + 'views/contexts/' + 
                basename + '.json';
            
            // Template not existing.
            if (gameCacheTemplate[gameName][templatePath] === false) {
                res.sendfile(gameInfo.dir + 'public/notFound.html');
            }
            // Template existing, render it.
            else if (gameCacheTemplate[gameName][templatePath] === true) {
                renderTemplate(res, gameName, templatePath, contextPath, 
                               gameCacheContext);
            }
            // Do not know if exists or not, check and render it.
            else if ('undefined' === typeof gameCacheTemplate[gameName][templatePath]) {

                fs.exists(templatePath, function(exists) {
                    debugger
                    if (!exists) {
                        gameCacheTemplate[gameName][templatePath] = false;
                        res.sendfile(gameInfo.dir + 'public/notFound.html');
                        return;
                    }
                    gameCacheTemplate[gameName][templatePath] = true;
                    renderTemplate(res, gameName, templatePath, contextPath, 
                                   gameCacheContext);
                });
            }
        });

        return;



        // Instantiate templates, if needed and available.
        // `html/templates/page.jade` holds the template and
        // `html/context/lang/page.json` holds the context to instantiate
        // the page requested by `html/lang/page*`.
        if (file.match(/^[^\/]*\/.*$/)) {
            // Check whether existance of page has been assertained before.
            if ('undefined' === typeof gameCachePublic[filePath]) {
                fs.exists(filePath, function(exists) {
                    gameCachePublic[filePath] = exists;
                    if (exists) {
                        res.sendfile(filePath);
                    }
                    else {
                        createAndServe(langPath, pageName, file, gameInfo,
                            contextPath, res);
                    }
                });
                return;
            }
            // If it is known that page doesn't exist, render it from template.
            if (!gameCachePublic[filePath]) {
                createAndServe(langPath, pageName, file, gameInfo, contextPath,
                    res);
                return;
            }
        }

        // Send file (if it is a directory it is not sent).
        //res.sendfile(path.basename(filePath), {root: path.dirname(filePath)});
        res.sendfile(filePath);

    });

    app.get('/:game', function(req, res) {
        res.redirect('/' + req.params.game + '/');
    });

    app.configure(function(){
        app.set('views', rootDir + '/views');
        app.set('view engine', 'jade');
        app.set('view options',{layout: false});
        app.use(express.static(rootDir + '/public'));
    });

    return true;
}
