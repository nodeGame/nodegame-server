/**
 * # http.js
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Express server in nodegame-server
 */
module.exports = configure;

// ## Global scope

var express = require('express'),
fs = require('fs'),
J = require('nodegame-client').JSUS;

var mime = require('express').static.mime;

// STE: new.
var bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
errorHandler = require('errorhandler'),
session = require('cookie-session')({ secret: 'secret' });

/**
 * ### ServerNode._configureHTTP
 *
 * Defines standard routes for the HTTP server
 *
 * @param {object} options The object containing the custom settings
 */
function configure(app, servernode) {
    var rootDir, monitorDir, publicDir;
    var resourceManager;
    var basepath;

    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';
    monitorDir = rootDir + '/node_modules/nodegame-monitor/public/';
    basepath = servernode.basepath || '';
    resourceManager = servernode.resourceManager;
debugger
    app.set('views', rootDir + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {layout: false});

    // app.use(express.static(publicDir));

    if (process.env.NODE_ENV === 'development') {
        app.use(errorHandler());
// Ste: was.
//         app.use(errorHandler({
//             dumpExceptions: true,
//             showStack: true
//         }));
    };

    // Ste: was.
//     app.configure('production', function(){
//         app.use(errorHandler());
//     });

    app.enable("jsonp callback");

    app.use(express.cookieParser());
    app.use(express.bodyParser());

    // app.use('/:game', expressJwt({secret: jwtSecret}));
    // app.use(express.json());
    // app.use(express.urlencoded());

    // app.use(express.session({ secret: 'keyboard cat' }));

    // app.use('/javascript);

    function sendFromPublic(type, req, res, headers) {
        var file, mimeType, charset, filePath;
        file = req.params[0];
        if (!file) return;

        // Build path in `public/`.
        file = type + '/' + file;

        // Build headers.
        if (!headers) {
            mimeType = mime.lookup(file);
            charset = mime.charsets.lookup(mimeType);
            headers = { 'Content-Type': mimeType };
            if (charset) headers.charset = charset;
        }

        // If it is not text, it was not cached.
        if (headers['Content-Type'].substring(0,4) !== 'text') {
            filePath = servernode.rootDir + '/public/' + file;
            res.sendfile(filePath);
            return;
        }

        // Already found in `public/` and cached.
        resourceManager.getFromPublic('/', file, function(cachedFile) {

            // File found in public (cached or loaded).
            if (cachedFile) {
                res.send(cachedFile, headers);
            }
            else {
                // Send 404.
                res.send('File not found.', 404);
            }
        });
    }

    app.get(basepath + '/javascripts/*', function(req, res) {
        sendFromPublic('javascripts', req, res, {
            'Content-Type': 'text/javascript',
            'charset': 'utf-8'
        });
    });

    app.get(basepath + '/stylesheets/*', function(req, res) {
        sendFromPublic('stylesheets', req, res, {
            'Content-Type': 'text/css',
            'charset': 'utf-8'
        });
    });


    app.get(basepath + '/images/*', function(req, res) {
        sendFromPublic('images', req, res, {
            'Content-Type': 'image/png'
        });
    });

    app.get(basepath + '/pages/*', function(req, res) {
        sendFromPublic('pages', req, res, {
            'Content-Type': 'text/html',
            'charset': 'utf-8'
        });
    });

    app.get(basepath + '/lib/*', function(req, res) {
        sendFromPublic('lib', req, res);
    });

    app.get(basepath + '/', function(req, res) {
        var q;

        if (J.isEmpty(req.query)) {
            res.render('index', {
                title: 'Yay! Your nodeGame server is running.'
            });
            return
        }

        if (servernode.enableInfoQuery) {

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

        }
    });

    return true;
}
