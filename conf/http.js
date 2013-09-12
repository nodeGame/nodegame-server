/**
 * # http.js
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Express server in nodegame-server
 *
 * ---
 */

// ## Global scope

module.exports = configure;

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
function configure (app, servernode) {
    var rootDir;
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
    app.configure('development', function(){
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    });

    app.configure('production', function(){
        app.use(express.errorHandler());
    });

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

    app.get('/javascripts/:file', function(req, res) {
        var path;
        if (!req.params.file) return;
        if (req.params.file.lastIndexOf('\/') === (req.params.file.length-1)) {
            req.params.file = req.params.file.substring(0,req.params.file.length-1);
        }

        // Build path to file.
        path = rootDir + '/public/javascripts/' + req.params.file;
        // Send file.
        res.sendfile(path);
    });

    app.get('/stylesheets/:file', function(req, res) {
        var path;
        if (!req.params.file) return;
        if (req.params.file.lastIndexOf('\/') === (req.params.file.length-1)) {
            req.params.file = req.params.file.substring(0,req.params.file.length-1);
        }

        // Build path to file.
        path = rootDir + '/public/stylesheets/' + req.params.file;
        // Send file.
        res.sendfile(path);
    });

    // Serves game files or default game index file: index.htm.
    app.get('/:game/*', function(req, res) {
        var gameInfo, path, file;

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

        // Build path to file.
        path = gameInfo.dir + '/'  + file;

        // Send file (if it is a directory it is not sent).
        res.sendfile(path);
    });

    app.get('/:game', function(req, res) {
        res.redirect('/' + req.params.game + '/');
    });

    app.configure(function(){
        app.set('views', rootDir + '/views');
        app.set('view engine', 'jade');
        app.use(express.static(rootDir + '/public'));
    });

    return true;
};

