/**
 * # Logger
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles the log stream to file and to stdout
 */

"use strict";

// ## Global scope

var util = require('util'),
fs = require('fs'),
path = require('path'),
winston = require('winston');

var J = require('JSUS').JSUS;

module.exports = LoggerManager;

function LoggerManager() {}

LoggerManager.get = function(logger, options) {
    return new Logger(logger, options);
};

/**
 * ## Logger constructor
 *
 * Creates an instance of Logger
 *
 * @param {object} options The configuration options for the SeverLog
 */
function Logger(logger, options) {
    options = options || {};

    this.logger = winston.loggers.get(logger);

    this.name = options.name;
    this.level = options.level || 'silly';
    this.verbosity = options.verbosity || 0;
}

//## Logger methods


/**
 * ### Logger.log
 *
 * Logs a string to stdout and / or to file depending on configuration
 *
 * @param {string} text The string to log
 * @param {string|Number} level The log level for this log
 */
Logger.prototype.log = function(text, level) {

    level = level || 'info';

    //	if ('string' === typeof level) {
    //		level = ServerLog.verbosity_levels[level];
    //	}

    if (this.name) {
    	//this.logger.log(level, this.name, text);
    	this.logger.log(level, text, {name: this.name});
    }
    else {
        this.logger.log(level, text);
    }
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
