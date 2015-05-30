/**
 * # http.js
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Express server in nodegame-server
 */
module.exports = configure;

// ## Global scope

var util = require('util'),
fs = require('fs'),
path = require('path'),
express = require('express'),
J = require('nodegame-client').JSUS,
jwt = require('jsonwebtoken'),
expressJwt = require('express-jwt');


var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(
  function(username, password, done) {
debugger

    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));


/**
 * ### ServerNode._configureHTTP
 *
 * Defines standard routes for the HTTP server
 *
 * @param {object} options The object containing the custom settings
 */
function configure(app, servernode) {
    var rootDir;
    var pager;

    rootDir = servernode.rootDir;
    pager = servernode.pager;

    var jwtSecret = 'your secret or public key';

    app.configure(function() {
        app.set('views', rootDir + '/views');
        app.set('view engine', 'jade');
        app.set('view options', {layout: false});
        app.use(express.static(rootDir + '/public'));
    });

    app.configure('development', function(){
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack: true
        }));
    });

    app.configure('production', function(){
        app.use(express.errorHandler());
    });

    app.enable("jsonp callback");

    app.use(express.cookieParser());
    app.use('/:game', expressJwt({secret: jwtSecret}));

    // app.use(express.json());
    // app.use(express.urlencoded());

    app.use(express.session({ secret: 'keyboard cat' }));
    app.use(passport.initialize());
    app.use(passport.session());

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
        var path, i, file;
        file = req.params.file;
        if (!file) return;
        if (file.lastIndexOf('\/') === (file.length - 1)) {
            file = file.substring(0, file.length - 1);
        }

        // Build path to file.
        path = rootDir + '/public/' + type + '/' + file;
        // Send file.
        res.sendfile(path);
    }

    function renderTemplate(req, res, gameName, templatePath, contextPath,
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

    app.post('/login',
             passport.authenticate('local'),
             function(req, res) {
                 debugger

                 // If this function gets called, authentication was successful.
                 // `req.user` contains the authenticated user.
                 res.redirect('/users/' + req.user.username);
             });

 //   app.post('/login',
 //            passport.authenticate('local', { successRedirect: '/',
 //                                             failureRedirect: '/login',
 //                                             failureFlash: true })
 //           );

    app.get('/auth/:game/:userid/:pwd', function(req, res) {
        var gameName, gameInfo;
        var userId, pwd;

        console.log('auth GET');

        gameInfo = verifyGameRequest(req, res);
        if (!gameInfo) return;

        if (!gameInfo.auth.enabled) {
            res.send('No authorization needed.');
            return;
        }

        gameName = req.params.game;

        gameSettings = gameInfo.settings;

        // if (gameInfo.auth.enabled

        userId = req.params.userid;

        if ('undefined' === typeof userId) {
            res.send('Missing username.');
        }

        var profile = {
            userId: userId
        };

        // we are sending the profile in the token
        var token = jwt.sign(profile, jwtSecret, { expiresInMinutes: 60*5 });
        res.header('Content-Type', 'application/javascript');
        res.header('Charset', 'utf-8');
        res.send(req.query.callback + '("' + token + '");');
        //res.json({token: token});
    });

    // Serves game files or default game index file: index.htm.
    app.get('/:game/*', function(req, res) {
        var gameName, gameInfo, gameSettings, filePath, file;
        var jadeTemplate, jsonContext, contextPath, langPath, pageName;

        gameInfo = verifyGameRequest(req, res);
        if (!gameInfo) return;

        debugger
        if (gameInfo.auth.enabled) {

            // check
        }

        gameName = req.params.game;
        file = req.params[0];

        gameSettings = gameInfo.settings;

        if ('' === file || 'undefined' === typeof file) {
            file = 'index.htm';
        }
        else if (file.lastIndexOf('\/') === (file.length - 1)) {
            // Removing the trailing slash because it creates:
            // Error: ENOTDIR in fetching the file.
            file = file.substring(0, file.length - 1);
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
                renderTemplate(req, res, gameName, templatePath, contextPath,
                               gameSettings);
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
                    renderTemplate(req, res, gameName, templatePath,
                                   contextPath, gameSettings);
                });
            }
        });
    });

    app.get('/:game', function(req, res) {
        res.redirect('/' + req.params.game + '/');
    });

    return true;
}
