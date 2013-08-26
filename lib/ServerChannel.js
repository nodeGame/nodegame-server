/**
 * # ServerChannel
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Wrapper class for PlayerServer, AdminServer
 * 
 * ---
 * 
 */

// ## Global scope

module.exports = ServerChannel;

var AdminServer = require('./servers/AdminServer'),
    PlayerServer = require('./servers/PlayerServer'),
    GameServer = require('./GameServer');

var ChannelRegistry = require('./ChannelRegistry');

var Logger = require('./Logger');

var J = require('JSUS').JSUS;

var PlayerList = require('nodegame-client').PlayerList;

/**
 * ## ServerChannel Constructor
 * 
 * Creates an instance of ServerChannel
 * 
 * @param {object} options Configuration object
 * @param {object} sio The socket.io server
 * 
 */
function ServerChannel(sio, options) {

    // Unique session id, shared by both Player and Admin Server
    this.session = '' + Math.floor(Math.random()*10000000000000000);

    this.sio = sio;
    this.options = J.clone(options);

    this.name = options.name;
    
    this.registry = new ChannelRegistry();

    this.admin = null;
    this.player = null;
	
    this.adminGames = {}; 
    
    this.subChannels = {};
    this.maxSubChannels = ('undefined' === typeof options.maxSubChannels) ? -1 : options.maxSubChannels;
    
    this.sysLogger = Logger.get('channel', {name: this.name});
	
    this.createServers();
}

// ServerChannel methods

/**
 * ### ServerChannel.createServers
 * 
 * Creates the AdminServer and the PlayerServer
 * 
 * Mixes in default options and user-defined options specified in
 * the constructor 
 * 
 */
ServerChannel.prototype.createServers = function() {
    var adminOptions, playerOptions;
    
    adminOptions = {
        channel: this,
        name: '[ADMIN_SERVER]',
        endpoint: this.options.admin,
    };
    
    this.admin = new AdminServer(adminOptions);
    
    playerOptions = {
        channel: this,
        name: '[PLAYER_SERVER]',
        endpoint: this.options.player,
    };
		
    this.player = new PlayerServer(playerOptions);
	
    // The two servers are aware of each other	
    this.admin.setPartner(this.player);
    this.player.setPartner(this.admin);
};

/**
 * ### ServerChannel.listen
 * 
 * Puts the AdminServer and PlayerServer on listen mode
 * 
 * @return {Boolean} TRUE, if execution is successful
 * 
 */
ServerChannel.prototype.listen = function() {
    try {
	this.admin.listen();
	this.player.listen();
	return true;
    }
    catch(e) {
	this.sysLogger.log(e, 'error');
	return false;
    }
};


/**
 * ### ServerChannel.startGame
 * 
 * Initializes and start a new game logic on the admin server
 * 
 * @param pathToGame {string} The path to the game logic
 * @param options {object} Optional. A configuration object to pass to node.setup
 * 
 * @see node.Game
 * @see node.setup
 */
ServerChannel.prototype.startGame = function(pathToGame, options) {
    var node;
    var errString, typeofPathToGame;
    var duplicateCounter, game, gamename;
    if (!pathToGame) {
        errString = 'Cannot start an undefined game.';
        this.sysLogger.log(errString, 'error');
        return false;
    }
    typeofPathToGame = typeof pathToGame;
    if ('string' !== typeofPathToGame) {
        errString = 'ServerChannel.startGame requires a string containing the path to the game as first parameter';
        errString += '. Found: ' + typeofPathToGame;
        this.sysLogger.log(errString, 'error');
        return false;
    }

    if (!J.existsSync(pathToGame)) {
        errString = pathToGame + ' does not exists or is it not readable.';
        this.sysLogger.log(errString, 'error');
        return false;
    }

    options = options || {};

    node = require('nodegame-client'); 
    duplicateCounter = 1;

    //	try {
    node.setup('nodegame', options);
    node.socket.setSocketType('SocketDirect', {
        socket: this.admin.socket.sockets.direct
    });
    node.connect();                  

    game = require(pathToGame)(node, this);
    node.setup('plot', game.plot);
    node.setup('game_metadata', game.game_metadata);
    node.setup('game_settings', game.game_settings);
    node.setup('plist', game.plist);
    node.play();

    gamename = J.uniqueKey(this.adminGames, options.name || game.game_metadata.name);

    this.adminGames[gamename] = node;

    return node;
    //	}
    //	catch(e) {
    //		errString = 'A fatal error has occurred while starting a game on channel: ' + this.name;
    //		errString += '. The following exception was raised: ' + e;
    //		this.sysLogger.log(errString, 'error');
    //		return false;
    //	}
};


/**
 * ### ServerChannel.require
 * 
 * Creates a special require enviroment and returns the required object
 *
 * TODO doc
 */
ServerChannel.prototype.require = function(path, exports) {
    var channel = this;
    return (function() {
        module.exports.channel = channel;

	for (var i in exports) {
	    if (exports.hasOwnProperty(i)) {
		module.exports[i] = exports[i];
	    }
	}
        return require(path);
    })();
};


ServerChannel.prototype.createGameRoom = function(conf) {
    var pl, logic, tmp, errStr;
    if ('object' !== typeof conf) {
        errStr = 'ServerChannel.createGameRoom expects an object' +
            ', ' + typeof conf + ' received.';
        this.sysLogger.log(errStr, 'error');
        return false;
    }

    if (conf.players instanceof PlayerList !== true) {
        errStr = 'ServerChannel.createGameRoom expects a valid PlayerList object.';
        this.sysLogger.log(errStr, 'error');
        return false;
    }

    if (conf.logic && 'object' !== typeof conf.logic ) {
        errStr = 'ServerChannel.createGameRoom expects a valid object for the logic.';
        this.sysLogger.log(errStr, 'error');
        return false;
    }

    // check player existing , here or in registry ?

    pl = conf.players;
    logic = conf.logic;
};


// The following is experimental and not tested. Maybe to be removed

ServerChannel.prototype.createSubChannel = function(options) {
	
	if (this.maxSubChannels !== -1 && J.size(this.subChannels) >= this.maxSubChannels) {
		var maxSubChannelsErr = 'Max number of subchannel for ' + this.name + ' reached: ' + this.maxSubChannels;
			maxSubChannelsErr += ' . Cannot create another subchannel.';
		this.sysLogger.log(maxSubChannelsErr, 'error');
		return false;
	}
	
	options = options || {};
	
	var name = J.uniqueKey(this.subChannels, options.name);
	
	options.name = name;
	options.admin = options.admin || options.name + '/admin';
	options.player = options.player || options.name + '/player';
	
	this.subChannels[name] = new ServerChannel(this.sio, options);
	return this.subChannels[name];
};

ServerChannel.prototype.destroySubChannel = function (name, options) {
	if (!name) return;
	
	if (!this.subChannels[name]) {
		var destroyChannelErr = 'Unexisting subchannel in channel ' + this.name + '. Cannot destroy: ' + name;
		this.sysLogger.log(destroyChannelErr, 'error');
		return false;
	}
	
	options = options || {};
	// TODO: how to propertly delete a subchannel? redirect, notify players?
	delete this.subChannels[name];
	return true;
};
