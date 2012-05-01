module.exports = ServerNode;


/////////// Load dependencies ///////////

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    express = require('express'),
    socket_io = require('socket.io');

var EventEmitter = require('events').EventEmitter;
var nodemailer = require('nodemailer');

var ServerChannel = require('./ServerChannel');

var JSUS = require('nodegame-client').JSUS;


////////// Configure Application ///////////

var app = express.createServer();

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


function ServerNode (options) {

    if (!options) {
        throw new Error('No configuration found to create a server. Aborting');
    }
    this.options = options;
    this.options.mail = ('undefined' !== typeof options.mail) ? options.mail : false;
    this.options.dumpmsg = ('undefined' !== typeof options.dumpmsg) ? options.dumpmsg : false;
    this.options.dumpsys = ('undefined' !== typeof options.dumpsys) ? options.dumpsys : true;
    this.options.verbosity = ('undefined' !== typeof options.verbosity) ? options.verbosity : 1;
    
    if(process.env.PORT){
        this.port = process.env.PORT; // if app is running on heroku then the assigned port has to be used.
    } else {
        this.port = options.port || '80'; // port of the express server and sio
    }
    
    this.maxChannels = options.maxChannels;
    this.channels = [];
    
    this.listen();
}

ServerNode.prototype.createHTTPServer = function (options) {
    
    return app.listen(options.port);

};

ServerNode.prototype.listen = function (http, io) {
    
    // this.io = io || require('socket.io');
    app.listen(this.port);

    // this.server = this.io.listen(this.http);
    this.server = socket_io.listen(app);
    
    this.configureHTTP(this.options.http);
    this.configureIO(this.options.io);
};

ServerNode.prototype._configure = function (obj, options) {
    if (!options) return;
    //var keywords = ['set', 'enable', 'disable'];
    for (var i in options) {
        if (options.hasOwnProperty(i)) {
            if (i === 'set') {
                for (var j in options[i]) {
                    if (options[i].hasOwnProperty(j)) {
                        obj.set(j, options[i][j]);
                    }
                }
            }
            else if (i === 'enable') {
                obj.enable(options[i]);
            }
            else if (i === 'disable') {
                obj.disable(options[i]);
            }
        }
    }
};

ServerNode.prototype.configureIO = function (options) {
    this.server.enable('browser client etag');
    this.server.set('log level', -1);
    this._configure(this.server, options);
};

// Define Routes

ServerNode.prototype.configureHTTP = function (options) {

    var that = this;

    app.get('/', function(req, res){
        res.render('index', {
            title: 'Yay! Your nodeGame server is running.'
        });
    });

    app.get('/:game/:file', function(req, res){

        // check if file exists the folder the scientist has created. EXTERNAL
        // check if file exists in the nodegame-server folder. INTERNAL

        var externalFilePath = __dirname.replace(/node\_modules.+/i, '') + 'games/' + req.params.game + '/' + req.params.file;

        doesFileExists(externalFilePath, function(exists){
            if(exists){
                res.sendfile(externalFilePath);
            } else {
                var includedFilePath = __dirname + '/games/' + req.params.game + '/' + req.params.file;
                res.sendfile(includedFilePath);
            }
        });
    });

    app.get('*', function(req, res){

        var externalFilePath = __dirname.replace(/node\_modules.+/i, '') + 'games/' + req.url;

        doesFileExists(externalFilePath, function(exists){
            if(exists){
                res.sendfile(externalFilePath);
            } else {
                var includedFilePath = __dirname + '/games/' + req.url;
                res.sendfile(includedFilePath);
            }
        });

    });

};

ServerNode.prototype.addChannel = function (options) {

    if (!options) {
        console.log('Options are not correctly defined for the channel. Aborting');
        return;
    }
    
    var cname = options.name;
    // Some options must not be overwritten
    var options = JSUS.extend(this.options, options);
    if (cname){
        options.name = cname;
    }
    
    // TODO merge global options with local options
    var channel = new ServerChannel(options, this.server, this.io);
    // TODO return false in case of error in creating the channel
    var ok = channel.listen();
    
    if (ok) {
        this.channels.push(channel);
        console.log('Channel added correctly: ' + options.name);
    }
    else {
        console.log('Channel could not be added: ' + options.name);
    }
    
    return channel;
};



////////// Helpers ///////////

var doesFileExists = function(path, callback){
    fs.stat(path, function(err, stats){

        if(err){
            callback(false);
        } else {
            callback(true);
        }

    });
};
