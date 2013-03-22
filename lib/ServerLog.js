/**
 * # ServerLog
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * Handles the log stream to file and to stdout
 * 
 * ---
 * 
 */
 
// ## Global scope

var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	winston = require('winston'),
	loggers = new winston.Container();

var J = require('JSUS').JSUS;

ServerLog.verbosity_levels = require('nodegame-client').verbosity_levels;

//console.log(ServerLog.verbosity_levels);

module.exports = ServerLog;

var defaultLogDir = __dirname + './../log';

var myCustomLevels = {
	    levels: {
	      foo: 0,
	      bar: 1,
	      baz: 2,
	      foobar: 3
	    },
	    colors: {
	      foo: 'blue',
	      bar: 'green',
	      baz: 'yellow',
	      foobar: 'red'
	    }
	  };

/**
 * ## ServerLog constructor
 * 
 * Creates an instance of ServerLog
 * 
 * @param {object} options The configuration options for the SeverLog
 */
function ServerLog (options) {
	
	this.name = options.name || 'ServerLog';
	this.verbosity = ('undefined' !== typeof options.verbosity) ? options.verbosity : 1;
//	this.dumpmsg = ('undefined' !== typeof options.msg) ? options.dumpmsg : false;
//	this.dumpsys = ('undefined' !== typeof options.sys) ? options.dumpsys : true;
	this.logdir = path.normalize(options.logdir || defaultLogDir);
	this.logdir = path.resolve(this.logdir);
		
	//this.checkLogDir();
	
	this.sysfile = path.normalize(options.sysfile || this.logdir + '/syslog');
	this.msgfile = path.normalize(options.msgfile || this.logdir + '/messages');
	
	loggers.add('msg', {
	    console: {
	    	level: 'silly',
	    	colorize: true,
	    },
	    file: {
	    	level: 'silly',
	    	timestamp: true,
	    	filename: this.msgfile,
	    },
	});
	
	loggers.add('sys', {
	    console: {
	    	level: 'silly',
	    	colorize: true,
	    },
	    file: {
	    	level: 'silly',
	    	timestamp: true,
	    	filename: this.sysfile,
	    },
	});
	
	this.sysLogger = loggers.get('sys');
	this.msgLogger = loggers.get('msg');

};


//## ServerLog methods



/**
 * ### ServerLog.log
 * 
 * Logs a string to stdout and to file, depending on
 * the current log-level and the  configuration options 
 * for the current ServerLog instance
 * 
 * @param {string} text The string to log
 * @param {string|Number} level The log level for this log 
 * 
 */
ServerLog.prototype.log = function (text, level) {
	
	level = level || 0;
	
	if ('string' === typeof level) {
		level = ServerLog.verbosity_levels[level];
	}
	
	this.sysLogger.info(text, this.name);
	
	
	
//	if (this.verbosity > level) {
//		this.console(text);
//		if (this.logSysStream) {
//			this.sys(text,level);
//		}
//	}
};



/**
 * ### ServerLog.msg
 * 
 * Dumps a game message to game messages file, as defined in the
 * constructor
 * 
 * @param {GameMSg} gameMsg The game message to dump
 * 
 */
ServerLog.prototype.msg = function(gameMsg) {	
	//if (!this.logMsgStream) return;
	//this.logMsgStream.write(this.name + ',\t' + gameMsg);
	
	this.msgLogger.info(gameMsg, this.name);
};

/**
 * ### ServerLog.sys
 * 
 * Dumps a string to the syslog file, as defined in the constructor
 * 
 * @param {string} text The text to dump
 * 
 */ 
ServerLog.prototype.sys = function(text) {
	//if (!this.logSysStream) return;	
	//text = J.getDate() + ', ' + this.name + ' ' + text;
	//this.logSysStream.write(text + '\n');	
	
	this.sysLogger.info(text, this.name);
	
};

///**
//* ### ServerLog.checkLogDir
//* 
//* Creates the log directory if not existing
//* 
//*/
//ServerLog.prototype.checkLogDir = function() {
//	// skip warning for node 8
//	if ('undefined' !== typeof fs.existsSync) {
//		if (!fs.existsSync(this.logdir)) {
//			fs.mkdirSync(this.logdir, 0755);
//		}
//	}
//	else if (!path.existsSync(this.logdir)) {
//		fs.mkdirSync(this.logdir, 0755);
//	}
//};


///**
//* ### ServerLog.console
//* 
//* Fancifies the output to console
//* 
//* @param {object|string} data The text to log
//* @param {string} type A flag that determines the color of the output
//*/
//ServerLog.prototype.console = function(data, type){
//	
//	var ATT = '0;32m'; // green text;
//	
//	switch (type) {
//		
//		case 'ERR':
//			ATT = '0;31m'; // red text;
//			break;
//			
//		case 'WARN':
//			ATT = '0;37m'; // gray text;
//			break;
//	}
//		
//	util.log("\033[" + ATT + this.name + '\t' + data.toString() + "\033[0m");
//};
//
///**
// * ### ServerLog.close
// * 
// * Closes open output streams
// */
//ServerLog.prototype.close = function() {
//	if (this.logSysStream) this.logSysStream.close();
//	if (this.logMsgStream) this.logMsgStream.close();
//};
