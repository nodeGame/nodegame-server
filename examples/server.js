/**
 * Start File for nodeGame server with conf.
 * 
 * For concrete examples see the the configuration files in the conf directory.
 *  
 */

var ServerNode = require('nodegame-server').ServerNode;

var options = {
	
	// defines an additional configuration directory	
    confDir: './conf',
    
    // configures the ServerNode instance 
    servernode: function (servernode) {
    	servernode.verbosity = 10;
    	servernode.gamesDirs.push('./games');
    	return true;
    },
    
    // configure the logging system
    loggers: function (loggers) {
        // See winston configuration README
        // https://github.com/flatiron/winston/blob/master/README.md
        return true;
    },
    
    // configure the HTTP server
    http: function (http) {
    	// See express web server configuration api
    	// http://expressjs.com/api.html
    	return true;
    },
    
    // configure the Socket.io server
    sio: function (sio) {
    	// See Socket.io configuration wiki
    	// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
    	return true;
    }
}
// Start the server

// Input parameter is optional
var sn = new ServerNode(options);


// ServerNode accepts two additional parameters:
// - an instance of an http Express server
// - an instance of socket.io
// If not passed, they will be created with default settings
var sn = new ServerNode(options);

sn.addChannel({
    name: 'Ultimatum',
    admin: 'ultimatum/admin',
    player: 'ultimatum'
});