/**
 * # servernode.js
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for ServerNode in nodegame-server
 * ---
 */
module.exports = configure;

var path = require('path');

function configure(servernode) {
    
    var rootDir = servernode.rootDir;

    if (!rootDir) {
        servernode.logger.error('configure servernode: rootDir is not configured.');
        return false;
    }

    servernode.name = "nodeGame server";
    servernode.verbosity = 10;
    
    //	servernode.log.msg = false;
    //	servernode.log.sys = false;
    //	servernode.log.folder = rootDir + '/log/';
    //	
    //	servernode.mail = false; // experimental   

    servernode.defaultGamesDir = rootDir + '/games/';
    servernode.gamesDirs = [servernode.defaultGamesDir];
    
    if (process && process.env.PORT) {
        // if app is running on heroku then the assigned port has to be used.
	servernode.port = process.env.PORT; 
    } else {
        // port of the express server and sio
	servernode.port = '8080'; 
    }
    
    
    servernode.maxChannels = 0; // unlimited
    
    servernode.maxListeners = 0; // unlimited
    
    servernode.defaults.channel = {
	sockets: {
	    sio: true,
	    direct: true
	},
	port: servernode.port,
	log: servernode.log,
	verbosity: servernode.verbosity,
	notifyPlayers: {
	    onConnect: true,
	    onStageUpdate: true,
	    onStageLevelUpdate: false,
        onStageLoadedUpdate: true
	},
	forwardAllMessages: true,
    };
    
    return true;
}
