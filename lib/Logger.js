/**
 * # Logger
 * Copyright(c) 2017 Stefano Balietti
 * MIT Licensed
 *
 * Interface to Winston.js loggers
 *
 * @see Winston
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
 * @param {string} logger The name of the logger, e.g. 'channel'
 * @param {object} options Optional. The configuration options for the Logger
 */
function Logger(logger, options) {
    options = options || {};

    /**
     * ### Logger.logger
     *
     * The Winston logger
     *
     * @see Winston
     */
    this.logger = winston.loggers.get(logger);

    /**
     * ### Logger.name
     *
     * The name of the logger
     *
     * For example, the name of the channel
     */
    this.name = options.name;

    // TODO: do we still need this?
    // this.level = options.level || 'silly';
    // this.verbosity = options.verbosity || 0;

    // Set the appropriate log function.
    if (logger === 'messages') this.log = this.logMsg;
    else this.log = this.logText;
}

// ## Logger methods.

/**
 * ### Logger.logText
 *
 * Default log function for text
 *
 * Logs to stdout and / or to file depending on configuration.
 *
 * @param {string|mixed} text The string to log. If not a string,
 *   it is stringified
 * @param {string|number} level The log level for this log
 * @param {object} meta Additional meta-data to be logged. `meta.name`
 *   is automatically added, if the logger has a name.
 *
 * @see Winston
 */
Logger.prototype.logText = function(text, level, meta) {
    if ('string' !== typeof text) text = JSON.stringify(text);
    meta = meta || {};
    if (this.name) meta.name = this.name;
    this.logger.log(level || 'info', text, meta);
};

/**
 * ### Logger.logMsg
 *
 * Log function for game messages
 *
 * Logs a game message as Winston metadata, and add the `name` attribute
 * containing the name of the logger (if any).
 *
 * Logs to stdout and / or to file depending on configuration.
 *
 * @param {GameMsg} gm The game message
 * @param {string} text A string associated with the message,
 *    usually 'in' or 'out'.
 *
 * @see GameMsg
 * @see Winston
 */
Logger.prototype.logMsg = function(gm, text) {
    var meta;
    meta = {};
    if (this.name) meta.name = this.name;

    // Manual clone.
    meta.id = gm.id;
    meta.session = gm.session;
    if (gm.stage && 'object' === typeof gm.stage) {
        meta.stage = gm.stage.stage + '.' +
            gm.stage.step + '.' + gm.stage.round;
    }
    else {
        meta.stage = gm.stage;
    }
    meta.action = gm.action;
    meta.target = gm.target;
    meta.from = gm.from;
    meta.to = gm.to;
    meta.text = gm.text;
    if (meta.data &&
        'object' === typeof meta.data || 'function' === typeof meta.data) {

        meta.data = JSON.stringify(gm.data);
    }
    else {
        meta.data = gm.data;
    }
    meta.priority = gm.priority;
    meta.reliable = gm.reliable;
    meta.created = gm.created;
    meta.forward = gm.forward;

    this.logger.log('info', text, meta);
};
