/**
 * # loggers.js
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Winston.js in nodegame-server
 */

module.exports = configure;

var path = require('path');

function configure(loggers, logDir) {

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

    loggers.add('messages', {
        console: {
            level: 'error',
            colorize: true,
        },
        file: {
            level: 'silly',
            timestamp: true,
            filename: logDir + 'messages.log'
        }
    });

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
