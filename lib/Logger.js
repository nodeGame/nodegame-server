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
 * @param {object} options Optional. Configuration options
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
     * The name of the logger (might be the name of the channel).
     *
     * @see ServerChannel
     */
    this.name = options.name;

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
 * @param {string} type A string associated with the type of message,
 *    for example: 'in' or 'out'.
 * @param {string} gmString Optional. The gm already stringified.
 *
 * @see GameMsg
 * @see Winston
 */
Logger.prototype.logMsg = function(gm, type, gmString) {
    var level, curLevel;

    curLevel = this.logger.levels[this.logger.level];
    if (curLevel === 0) return;

    // Important! The numeric values are hard-coded and copied from
    if (gm.target === 'DATA') {
        level = 'data';
    }
    else if (curLevel < 3) {
        return;
    }
    else if (gm.action === 'set') {
        level = 'set';
    }
    else if (curLevel < 5) {
        return;
    }
    else if (gm.action === 'get') {
        level = 'get';
    }
    else if (curLevel < 7) {
        return;
    }
    else if (gm.target === 'setup') {
        level = 'setup';
    }
    else if (curLevel < 9) {
        return;
    }
    else if (gm.target !== 'PLAYER_UPDATE' &&
             gm.target !== 'SERVERCOMMAND' &&
             gm.target !== 'ALERT') {

        level = 'game';
    }
    else if (curLevel < 11) {
        return;
    }
    else {
        level = 'all';
    }

    if (!gmString) gmString = JSON.stringify(gm);

//         // Manual clone.
//         meta.id = gm.id;
//         meta.session = gm.session;
//         if (gm.stage && 'object' === typeof gm.stage) {
//             meta.stage = gm.stage.stage + '.' +
//                 gm.stage.step + '.' + gm.stage.round;
//         }
//         else {
//             meta.stage = gm.stage;
//         }
//         meta.action = gm.action;
//         meta.target = gm.target;
//         meta.from = gm.from;
//         meta.to = gm.to;
//         meta.text = gm.text;
//
//         if (meta.data &&
//             'object' === typeof meta.data ||
//             'function' === typeof meta.data) {
//
//             meta.data = JSON.stringify(gm.data);
//         }
//         else {
//             meta.data = gm.data;
//         }
//
//         meta.data = gm.data;
//         meta.priority = gm.priority;
//         meta.reliable = gm.reliable;
//         meta.created = gm.created;
//         meta.forward = gm.forward;

    this.logger.log(level, gmString, {
        channel: this.name,
        type: type
    });
};
