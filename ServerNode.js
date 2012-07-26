/**
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * 
 * 
 * ###  nodeGame server node
 * Creates an HTTP server, and loads a Socket.io instance 
 * according to the input configuration.
 * 
 */

// ### Load dependencies and expose constructor


module.exports = ServerNode;


var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    express = require('express'),
    socket_io = require('socket.io'),
	nodemailer = require('nodemailer');

var ServerChannel = require('./ServerChannel');

var JSUS = require('nodegame-client').JSUS;


// ### Configure Application 

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


/**
 * ## ServerNode Constructor
 * 
 * Creates a new ServerNode instance. 
 * 
 * @param {object} options The configuration object
 */
function ServerNode (options) {

    if (!options) {
        throw new Error('No configuration found to create a server. Aborting');
    }
    this.options = options;
    
    this.options.mail 		= ('undefined' !== typeof options.mail) ? options.mail : false;
    this.options.dumpmsg 	= ('undefined' !== typeof options.dumpmsg) ? options.dumpmsg : false;
    this.options.dumpsys 	= ('undefined' !== typeof options.dumpsys) ? options.dumpsys : true;
    this.options.verbosity 	= ('undefined' !== typeof options.verbosity) ? options.verbosity : 1;
    
    if (process.env.PORT){
        this.port = process.env.PORT; // if app is running on heroku then the assigned port has to be used.
    } else {
        this.port = options.port || '80'; // port of the express server and sio
    }
    
    this.maxChannels = options.maxChannels;
    this.channels = [];
    
    this.listen();
}


/**
 * ## ServerNode.listen
 * 
 * Puts Socket.io listening on the HTTP server
 * 
 * @see ServerNode.configureHTTP
 * @see ServerNode.configureIO
 * 
 */
ServerNode.prototype.listen = function () {
    
    app.listen(this.port);

    this.server = socket_io.listen(app);
    
    this.configureHTTP(this.options.http);
    this.configureIO(this.options.io);
};

/**
 * ## ServerNode.configureHTTP
 * 
 * Defines standard routes for the HTTP server
 * 
 * @param {object} options The object containing the custom settings
 */
ServerNode.prototype.configureHTTP = function (options) {

    var that = this;

    app.get('/', function(req, res){
        res.render('index', {
            title: 'Yay! Your nodeGame server is running.'
        });
    });

    app.get('/:game/*', function(req, res){

// In the following order:
//    	
//	1. Checks if file exists the folder the scientist has created (EXTERNAL)
//	2. Check if file exists in the nodegame-server folder (INTERNAL)

        if(req.params[0].match(/server\//)){
            res.json({error: 'access denied'}, 403);
            
        } else {
            var externalFilePath = __dirname.replace(/node\_modules.+/i, '') + 'games/' + req.params.game + '/' + req.params[0];

            doesFileExists(externalFilePath, function(exists){
                if(exists){
                    res.sendfile(externalFilePath);
                } else {
                    var includedFilePath = __dirname + '/games/' + req.params.game + '/' + req.params[0];
                    res.sendfile(includedFilePath);
                }
            });
        }
    });
};

/**
 * ## ServerNode.configureIO
 * 
 * Configures the internal socket io server with the default
 * settings, and then adds user defined options
 *  
 * @param {object} options The object containing the custom settings
 */
ServerNode.prototype.configureIO = function (options) {
    this.server.enable('browser client etag');
    this.server.set('log level', -1);
    configureMe(this.server, options);
};

/**
 * ## ServerNode.addChannel
 * 
 * Creates a nodeGame channel with the specified configuration.
 * If the configuration object is missing, channel creation is aborted
 * 
 * @param {object} options The object containing the custom settings
 * @return {ServerChannel} channel The nodeGame channel 
 */
ServerNode.prototype.addChannel = function (options) {

    if (!options) {
        console.log('Options are not correctly defined for the channel. Aborting');
        return;
    }
    
    var cname = options.name;
    // <!-- Some options must not be overwritten -->
    var options = JSUS.extend(this.options, options);
    if (cname){
        options.name = cname;
    }
    
    // <!-- TODO merge global options with local options -->
    var channel = new ServerChannel(options, this.server, this.io);
    // <!-- TODO return false in case of error in creating the channel -->
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

/**
 * ## ServerNode.addWaitingRoom
 * 
 * @experimental
 * 
 * Creates a waiting room for a specific game channel, according 
 * to the specified configuration.
 * 
 * If the configuration object is missing, waiting room creation is aborted
 * 
 * @param {object} options The object containing the custom settings
 * @return {WaitingRoom} channel The nodeGame channel 
 */
ServerNode.prototype.addWaitingRoom = function (options) {

    if (!options) {
        console.log('Options are not correctly defined for the waiting room. Aborting');
        return false;
    }
       
    var wroom;

// <!--    
//    var cname = options.name;
//    // Some options must not be overwritten
//    var options = JSUS.extend(this.options, options);
//    if (cname){
//        options.name = cname;
//    }
//    
//    // TODO merge global options with local options
//    var channel = new ServerChannel(options, this.server, this.io);
//    // TODO return false in case of error in creating the channel
//    var ok = channel.listen();
//    
//    if (ok) {
//        this.channels.push(channel);
//        console.log('Channel added correctly: ' + options.name);
//    }
//    else {
//        console.log('Channel could not be added: ' + options.name);
//    }
// --!>    
    
    return wroom;
};

// ## ServerNode helper functions


/**
 * ### doesFileExists
 * 
 * Checks whether a file exists under the given path
 * and executes the callback with a boolean parameter
 * 
 * @param {string} path The path to verify
 * @param {object} callback The callback function
 * 
 */
var doesFileExists = function (path, callback) {	
    fs.stat(path, function (err, stats) { 
        callback((err) ? false : true);
    });
};


/**
 * ### configureMe
 * 
 * Configures a generic socket.io-like object.
 * 
 * Takes in input a configuration object whose property names
 * are from the set ['set', 'enable', 'disable'] and executes
 * the appropriate function on the first parameter. 
 * 
 * @param {object} obj The object to configure 
 * @param {object} options The object containing the configuration 
 * 
 * @see https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
 */
var configureMe = function (obj, options) {
    if (!options || !obj) return;
    
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
