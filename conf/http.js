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
    var pageExistCache = {};


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

    //    var cookieSessions = function(name) {
    //        return function(req, res, next) {
    //            req.session = req.signedCookies[name] || {};
    //
    //            res.on('header', function(){
    //                res.signedCookie(name, req.session, { signed: true });
    //            });
    //
    //            next();
    //        }
    //    }
    //

    //    app.get('/count', function(req, res){
    //        req.session.count = req.session.count || 0;
    //        var n = req.session.count++;
    //        res.send('viewed ' + n + ' times\n');
    //    })
    //

    //    app.use(express.cookieParser());
    //    app.use(express.session({secret: 'This is a secret'}));
    //    app.use(app.router);
    //app.set('strict routing', false);

    //    app.get('/cookie/:name', function(req, res) {
    //        // res.cookie('name', 'value', {expires: new Date() + 90000000, maxAge: 90000000000});
    //        //res.cookie('name', req.params.name)
    //        req.session.name = req.params.name;
    //        res.send('<p>To see who you are go <a href="/name">here</a></p>');
    //    })
    //
    //    app.get('/name', function(req, res) {
    //        res.send('<p>You are ' + req.session.name + '</p>');
    ////        res.clearCookie('name');
    ////        res.send('<p>You are ' + req.cookies.name + '</p>');
    //    })
    //

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
        var gameInfo, filepath, file;
        var jadeTemplate, jsonContext, contextPath, langPath, pageName;

        gameInfo = verifyGameRequest(req, res);
        if (!gameInfo) return;

        file = req.params[0];

        if ('' === file || 'undefined' === typeof file) {
            file = 'index.htm';
        }
        else {
            if (file.match(/server\//)){
                res.json({error: 'access denied'}, 403);
                return;
            }
            // Removing the trailing slash because it creates:
            // Error: ENOTDIR in fetching the file.
            if (file.lastIndexOf('\/') === (file.length-1)) {
                file = file.substring(0, file.length-1);
            }
        }

        file = 'public/' + file;

        // Build filepath to file.
        filepath = gameInfo.dir + file;

        // Executes callback if one has been defined for this file.
        if (app.gameHooks) {
            for (i = 0; i < app.gameHooks.length; ++i) {
                if (app.gameHooks[i].file === file) {
                    app.gameHooks[i].callback(req, res);
                    return;
                }
            }
        }

        // Send JSON data as JSONP if there is a callback query parameter:
        if (file.match(/\.json$/) && req.query.callback) {
            // Load file contents:
            fs.readFile(filepath, 'utf8', function(err, data) {
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

        // Instantiate templates, if needed and available.
        // `html/templates/page.jade` holds the template and
        // `html/context/lang/page.json` holds the context to instantiate
        // the page requested by `html/lang/page*`.
        if (file.match(/^[^\/]*\/.*$/)) {
            // Check whether existance of page has been assertained before.
            if ('undefined' === typeof pageExistCache[filepath]) {
                fs.exists(filepath, function(exists) {
                    pageExistCache[filepath] = exists;
                    if (exists) {
                        res.sendfile(filepath);
                    }
                    else {
                        createAndServe(langPath, pageName, file, gameInfo,
                            contextPath, res);
                    }
                });
                return;
            }
            // If it is known that page doesn't exist, render it from template.
            if (!pageExistCache[filepath]) {
                createAndServe(langPath, pageName, file, gameInfo, contextPath,
                    res);
                return;
            }
        }

        // Send file (if it is a directory it is not sent).
        //res.sendfile(path.basename(filepath), {root: path.dirname(filepath)});
        res.sendfile(filepath);

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
