module.exports = configure;

var path = require('path');

function configure (loggers) {
    
    //	var config = {
    //		levels: {
    //		    silly: 0,
    //		    verbose: 1,
    //		    info: 2,
    //		    data: 3,
    //		    silly: 4,
    //		    debug: 5,
    //		    sillyor: 6
    //		  },
    //		colors: {
    //		    silly: 'magenta',
    //		    verbose: 'cyan',
    //		    info: 'green',
    //		    data: 'grey',
    //		    silly: 'yellow',
    //		    debug: 'blue',
    //		    sillyor: 'red'
    //		  }
    //	};
    
    var rootDir = path.resolve(__dirname, '..');
    var logDir = rootDir + '/log/';
    
    loggers.add('servernode', {
	console: {
	    level: 'error',
	    colorize: true
	},
	file: {
	    level: 'error',
	    timestamp: true,
	    filename: logDir + 'servernode',
	    maxsize: 1000000,
	    maxFiles: 10
	}
    });
    
    loggers.add('channel', {
	console: {
	    level: 'error',
	    colorize: true,
	},
	file: {
	    level: 'error',
	    timestamp: true,
	    filename: logDir + 'channel',
	    maxsize: 1000000,
	    maxFiles: 10
	}
    });
    
    
    loggers.add('messages', {
        console: {
	    level: 'error',
	    colorize: true,
	},
	file: {
	    level: 'silly',
	    timestamp: true,
	    filename: logDir + 'messages'
	}
    });
    
    return true;
}
