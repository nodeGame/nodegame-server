/**
 * # loggers.js
 * Copyright(c) 2017 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Winston.js in nodegame-server
 */

module.exports = configure;

var path = require('path');
var winston = require('winston');

// Variable loggers is winston.loggers.
function configure(loggers, logDir) {
    var msgLogger;

    // ServerNode.
    loggers.add('servernode', {
        console: {
            level: 'error',
            colorize: true
        },
        file: {
            level: 'error',
            timestamp: true,
            filename: logDir + 'servernode.log',
            maxsize: 1000000,
            maxFiles: 10
        }
    });

    // Channel.
    loggers.add('channel', {
        console: {
            level: 'error',
            colorize: true,
        },
        file: {
            level: 'error',
            timestamp: true,
            filename: logDir + 'channels.log',
            maxsize: 1000000,
            maxFiles: 10
        }
    });

    // Messages.
    // Make custom levels and only File transports for messages.
    msgLogger = loggers.add('messages');
    msgLogger.remove(winston.transports.Console);
    msgLogger.add(winston.transports.File, {
        level: 'foobar',
        timestamp: true,
        maxsize: 1000000,
        filename: logDir + 'messages.log'
    });
    msgLogger.setLevels({
        error: 0,
        bar: 1,
        baz: 2,
        foobar: 3
    });

    // Clients.
    loggers.add('clients', {
        console: {
            level: 'error',
            colorize: true,
        },
        file: {
            level: 'silly',
            timestamp: true,
            filename: logDir + 'clients.log'
        }
    });

    return true;
}
