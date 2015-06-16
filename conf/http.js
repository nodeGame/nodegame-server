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
J = require('nodegame-client').JSUS;

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

    app.use(express.static(publicDir));

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

    return true;
}
