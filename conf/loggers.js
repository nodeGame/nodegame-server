/**
 * # loggers.js
 * Copyright(c) 2020 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Winston.js in nodegame-server
 */

module.exports = configure;

const path = require('path');
const winston = require('winston');

// Variable loggers is winston.loggers.
function configure(loggers, logDir) {
    let logLevel = winston.level;

    // ServerNode.
    loggers.add('servernode', {
        console: {
            level: logLevel,
            colorize: true
        },
        file: {
            level: logLevel,
            timestamp: true,
            filename: path.join(logDir, 'servernode.log'),
            maxsize: 1000000,
            maxFiles: 10
        }
    });

    // Channel.
    loggers.add('channel', {
        console: {
            level: logLevel,
            colorize: true,
        },
        file: {
            level: logLevel,
            timestamp: true,
            filename: path.join(logDir, 'channels.log'),
            maxsize: 1000000,
            maxFiles: 10
        }
    });

    // Messages.
    // Make custom levels and only File transports for messages.
    let msgLogger = loggers.add('messages');
    msgLogger.remove(winston.transports.Console);
    msgLogger.add(winston.transports.File, {
        timestamp: true,
        maxsize: 1000000,
        filename: path.join(logDir, 'messages.log')
    });

    // Do not change, or logging might be affected.
    // Logger.js hardcodes the values for speed.
    msgLogger.setLevels({
        // Log none.
        none: 0,
        // All DATA msgs.
        data: 1,
        // All SET and DATA msgs.
        set: 3,
        // All SET, GET and DATA msgs.
        get: 5,
        // All SETUP, SET, GET and DATA msgs.
        setup: 7,
        // All messages, but **not** PLAYER_UPDATE, SERVERCOMMAND and ALERT.
        game: 9,
        // All messages.
        all: 11
    });

    // Set default logging level for messages.
    msgLogger.level = 'all';

    // Clients.
    loggers.add('clients', {
        console: {
            level: logLevel,
            colorize: true,
        },
        file: {
            level: 'silly',
            timestamp: true,
            filename: path.join(logDir, 'clients.log')
        }
    });

    return true;
}
