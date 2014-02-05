/**
 * # Example of Launcher file for nodeGame Server
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Start File for nodeGame server with conf.
 * 
 * Last update 05/02/2014
 */

// Load the Node.js path object.
var path = require('path');

var ServerNode = require('nodegame-server').ServerNode;

var options = {
	
	// defines an additional configuration directory	
    confDir: './conf',
    
    // configures the ServerNode instance 
    servernode: function(servernode) {
    	servernode.verbosity = 10;
    	servernode.gamesDirs.push('./games');
    	return true;
    },
    
    // configure the logging system
    loggers: function(loggers) {
        // See winston configuration README
        // https://github.com/flatiron/winston/blob/master/README.md
        return true;
    },
    
    // configure the HTTP server
    http: function(http) {
    	// See express web server configuration api
    	// http://expressjs.com/api.html
    	return true;
    },
    
    // configure the Socket.io server
    sio: function(sio) {
    	// See Socket.io configuration wiki
    	// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
    	return true;
    }
}
// Start the server

// Input parameter is optional
var sn = new ServerNode(options);

// Add the game channel.
var ultimatum = sn.addChannel({
    name: 'ultimatum',
    admin: 'ultimatum/admin',
    player: 'ultimatum',
    verbosity: 100,
    // If TRUE, players can invoke GET commands on admins.
    getFromAdmins: true,
    // Unauthorized clients will be redirected here. 
    // (defaults: "/pages/accessdenied.htm")
    accessDeniedUrl: '/ultimatum/unauth.htm'
});

// Creates the room that will spawn the games for the channel.
var logicPath = path.resolve('./mygames/ultimatum/server/game.room.js');
var gameRoom = ultimatum.createWaitingRoom({
    logicPath: logicPath,
    name: 'gameRoom'
});

// The game room will spawn sub-games as soon as enough players arrive.

// Exports the whole ServerNode.
module.exports = sn;