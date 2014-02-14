/**
 * # servernode.js
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for ServerNode in nodegame-server.
 *
 * @see ServerNode
 *
 * http://www.nodegame.org
 * ---
 */
module.exports = configure;

var path = require('path');

function configure(servernode) {
    
    var rootDir = servernode.rootDir;

    if (!rootDir) {
        servernode.logger.error(
            'configure servernode: rootDir is not configured.');
        return false;
    }

    // TODO: check
    //	servernode.log.msg = false;
    //	servernode.log.sys = false;
    //	servernode.log.folder = rootDir + '/log/';
    //	
    //	servernode.mail = false; // experimental   

    // The name of the server.
    servernode.name = "nodeGame server";

    // Default games directory.
    servernode.defaultGamesDir = rootDir + '/games/';
    
    // Array of games directories. They will be scanned sequentially
    // at loading time, and every subfolder containing a package.json
    // file will be added as a new game.
    // Important: games found in folders down in lower positions of the
    // array can override games defined before.
    servernode.gamesDirs = [servernode.defaultGamesDir];
    
    if (process && process.env.PORT) {
        // If app is running on a cloud service (e.g. Heroku)
        // then the assigned port has to be used.
	servernode.port = process.env.PORT; 
    } 
    else {
        // Port of the HTTP server and the Socket.IO app.
	servernode.port = '8080'; 
    }
    
    // The maximum number of channels allowed. 0 means unlimited.
    servernode.maxChannels = 0;
    
    // The maximum number of listeners allowed. 0 means unlimited.
    // Every channel defines 1 or more game servers, and each defines
    // a certain number of Node.JS listeners.
    servernode.maxListeners = 0;
    
    // Defaults option for a channel
    servernode.defaults.channel = {

        // Which sockets will be enabled.
	sockets: {
	    sio: true,
	    direct: true
	},

        // The HTTP port of the channel.
	port: servernode.port,

        // The log level.
	log: servernode.log,

        // The verbosity level of the channel.
	verbosity: servernode.verbosity,

        // A PLAYER_UPDATE / PCONNECT / PDISCONNECT message will be sent to
        // all clients connected to the PlayerServer endpoint when:
	notifyPlayers: {

	    // A new authorized client connects;
            onConnect: true,

            // A client enters a new stage;
	    onStageUpdate: false,

            // A client changes stageLevel (e.g. INIT, CALLBACK_EXECUTED);
	    onStageLevelUpdate: false,

            // A client is LOADED (this option is needed in combination with
            // the option syncOnLoaded used on the clients). It is much less
            // expensive than setting onStageLevelUpdate = true;
            onStageLoadedUpdate: false
	},

        // All messages exchanged between players will be forwarded to the
        // clients connected to the admin endpoint (ignores the _to_ field).
	forwardAllMessages: true,

        // If TRUE, players can invoke GET commands on admins.
        getFromAdmins: false,

        accessDeniedUrl: '/pages/accessdenied.htm'
    };
    
    // Returns TRUE to signal successful configuration of the server.
    return true;
}
