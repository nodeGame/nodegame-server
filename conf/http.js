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

/**
 * ### ServerNode._configureHTTP
 *
 * Defines standard routes for the HTTP server
 *
 * @param {object} options The object containing the custom settings
 */
function configure(app, servernode) {
    var rootDir, monitorDir, publicDir;
    var pager;

    rootDir = servernode.rootDir;
    publicDir = rootDir + '/public/';
    monitorDir = rootDir + '/node_modules/nodegame-monitor/public/';
    pager = servernode.pager;


    app.set('views', rootDir + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {layout: false});

    // app.use(express.static(publicDir));

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
    app.use(express.bodyParser());

    // app.use('/:game', expressJwt({secret: jwtSecret}));
    // app.use(express.json());
    // app.use(express.urlencoded());

    // app.use(express.session({ secret: 'keyboard cat' }));

    // app.use('/javascript);

    function sendFromPublic(type, req, res, headers) {
        var filePath, file, cachedFile;
        var headers, mimeType, charset;
        file = req.params[0];
        if (!file) return;
        if (file.lastIndexOf('\/') === (file.length - 1)) {
            file = file.substring(0, file.length - 1);
        }
        // Build path to file.
        filePath = rootDir + '/public/' + type + '/' + file;

        // Build headers.
        if (!headers) {
            mimeType = mime.lookup(filePath);
            charset = mime.charsets.lookup(type);
            headers = { 'Content-Type': type };
            if (charset) headers.charset = charset;
        }

        // Already found in `public/` and cached.
        cachedFile = pager.inPublic('/', filePath);
        if (cachedFile) {
            console.log('SSSSSSServing cached file: ', file);
            res.send(cachedFile, headers);
            return;
        }

        // Checks if exists in 'public/' or as view.
        fs.exists(filePath, function(exists) {
            var basename, templatePath, templateFound, contextPath, context;

            // Exists in public, cache it, serve it.
            if (exists) {
                fs.readFile(filePath, 'utf8', function(err, data) {
                    // Cache it.
                    pager.inPublic('/', filePath, data);
                    console.log('SSSSSSServing NNNEW file: ', file);
                    res.send(data, headers);
                });
                return;
            }
            console.log('NNNNNOT in public: ', file);
            res.send('File not Found', 404);
        });
    }

    app.get('/javascripts/*', function(req, res) {
        sendFromPublic('javascripts', req, res, {
            'Content-Type': 'text/javascript',
            'charset': 'utf-8'
        });
    });

    app.get('/stylesheets/*', function(req, res) {
        sendFromPublic('stylesheets', req, res, {
            'Content-Type': 'stylesheet',
            'charset': 'utf-8'
        });
    });

    app.get('/pages/*', function(req, res) {
        sendFromPublic('pages', req, res, {
            'Content-Type': 'html',
            'charset': 'utf-8'
        });
    });

    app.get('/lib/*', function(req, res) {
        sendFromPublic('lib', req, res);
    });

    if (servernode.enableInfoQuery) {

        app.get('/', function(req, res) {
            var q;

            if (J.isEmpty(req.query)) {
                res.render('index', {
                    title: 'Yay! Your nodeGame server is running.'
                });
                return
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
    }



    return true;
}
