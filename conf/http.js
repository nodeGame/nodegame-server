/**
 * # http.js
 * Copyright(c) 2016 Stefano Balietti
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

var bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
errorHandler = require('errorhandler');

// var session = require('cookie-session')({ secret: 'secret' });

/**
 * ### configure
 *
 * Defines standard routes for the HTTP server
 *
 * @param {object} options The object containing the custom settings
 */
function configure(app, servernode) {
    var rootDir, publicDir;
    var resourceManager;
    var basepath;

    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';
    basepath = servernode.basepath || '';
    resourceManager = servernode.resourceManager;

    app.set('views', rootDir + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {layout: false});


    if (process.env.NODE_ENV === 'development') {
        app.use(express.static(publicDir));
        app.use(errorHandler());
    }
    else {
        app.use(express.static(publicDir, { maxAge: 3600000 }));
    }

    app.disable('x-powered-by');

    app.enable("jsonp callback");

    app.use(cookieParser());
    // app.use(bodyParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

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
            res.sendFile(filePath);
            return;
        }

        // Already found in `public/` and cached.
        resourceManager.getFromPublic('/', file, function(cachedFile) {

            // File found in public (cached or loaded).
            if (cachedFile) {
                res.set(headers);
                res.status(200).send(cachedFile);
            }
            else {
                // Send 404.
                res.status(404).send('File not found.');
            }
        });
    }

    app.get(basepath + '/javascripts/*', function(req, res) {
        sendFromPublic('javascripts', req, res, {
            'Content-Type': 'text/javascript',
            'charset': 'utf-8'
        });
    });

    app.get(basepath + '/sounds/*', function(req, res) {
        sendFromPublic('sounds', req, res, {
            'Content-Type': 'sound/ogg'
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

    app.get(basepath + '/', function(req, res, next) {
        var q, games = [];
        var colors = ['light-blue', 'teal', 'green', 'amber', 'deep-orange'];

        if (servernode.defaultChannel) {
            next();
            return;
        }

        if (J.isEmpty(req.query)) {
            /*
            res.render('index_simple', {
                title: 'nodeGame server is running.'
            });
            */
            var i = 0;
            for (var property in resourceManager.games) {
                if (resourceManager.games.hasOwnProperty(property) &&
                    property.length > 2 && property != 'experiment') {
                    games.push({
                        name: property,
                        color: colors[i]
                    });
                    i++;
                }
            }
            res.render('index_menu', {
                title: 'Select a game: ',
                games: games
            });

            return
        }

        if (servernode.enableInfoQuery) {

            q = req.query.q;
            if (!q) {
                res.status(400).send('Query must start with q=XXX');
                return;
            }

            switch(q) {
            case 'info':
                //console.log(servernode.info);
                res.status(200).send(servernode.info);
                break;

            case 'channels':
                //console.log(servernode.info);
                res.status(200).send(servernode.info.channels);
                break;

            case 'games':
                //console.log(servernode.info);
                res.status(200).send(servernode.info.games);
                break;
            default:
                res.status(400).send('Unknown query received.');
            }
        }
        else {
            res.status(403).end();
        }
    });

    return true;
}
