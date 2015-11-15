/**
 * # Logger
 * Copyright(c) 2015 Stefano Balietti
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

/**
 * ## LoggerManager constructor
 *
 * Creates an instance of LoggerManager
 */
function LoggerManager() {}

/**
 * ## LoggerManager.get
 *
 * Returns a new Logger object with given name and options
 *
 * Available loggers: 'server', 'channel', 'clients', 'messages'.
 *
 * @param {string} logger The name of the logger, e.g. 'channel'
 * @param {object} options Optional. Configuration option. An important
 *   options is the name of the logger, which will be added to every log entry
 *
 * @return {Logger} The logger object
 *
 * @see Logger
 */
LoggerManager.get = function(logger, options) {
    return new Logger(logger, options);
};

/**
 * ## Logger constructor
 *
 * Creates an instance of Logger
 *
 * @param {object} options The configuration options for the Logger
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
 * @param {object} meta Additional meta-data written to be written
 */
Logger.prototype.log = function(text, level, meta) {
    level = level || 'info';
    meta = meta || {};

    if (this.name) {
        meta.name = this.name;
    }

    this.logger.log(level, text, meta);
};
