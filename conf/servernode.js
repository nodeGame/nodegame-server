module.exports = configure;


function configure (servernode) {
	
	var rootDir = path.resolve(__dirname, '..');
    
	servernode.name = "nodeGame server";
	servernode.verbosity = 0;
	
	servernode.log = {};
	servernode.log.msg = false;
	servernode.log.sys = false;
	
	
	
    
	servernode.mail = false;
	

	servernode.defaultGamesDir = rootDir + '/games/';
	servernode.gamesDirs = [this.defaultGamesDir];
    
	if (process && process.env.PORT){
		servernode.port = process.env.PORT; // if app is running on heroku then the assigned port has to be used.
	} else {
		servernode.port = '80'; // port of the express server and sio
	}
	 
	
	servernode.maxChannels = 0; // unlimited
	
	servernode.maxListeners = 0; // unlimited
	
	servernode.defaults.channel = {};
	
	
	
	return true;
}