/**
 * # loggers.js
 * Copyright(c) 2021 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Winston.js in nodegame-server
 */

module.exports = configure;

const path = require('path');
const winston = require('winston');

// Variable loggers is winston.loggers.
function configure(loggers, logDir) {
    let format = winston.format;
    let logLevel = winston.level;
    let transports = winston.transports;

    const logFormatter = format.printf((info) => {
        let { timestamp, level, stack, message } = info;
        message = stack || message;
        return `${timestamp} ${level}: ${message}`;
    });

    let consoleFormat = format.combine(format.colorize(), format.simple(),
                                       format.timestamp(), logFormatter);

    // ServerNode.
    loggers.add('servernode', {
        // format: format.errors({ stack: true }),
        transports: [
            new transports.Console({
                level: logLevel,
                // colorize: true
                format: consoleFormat
            }),
            new transports.File({
                level: logLevel,
                timestamp: true,
                filename: path.join(logDir, 'servernode.log'),
                maxsize: 1000000,
                maxFiles: 10
            })
        ]

    });

    // Channel.
    loggers.add('channel', {
        format: format.errors({ stack: true }),
        transports: [
            new transports.Console({
                level: logLevel,
                // colorize: true
                format: consoleFormat
            }),
            new transports.File({
                level: logLevel,
                timestamp: true,
                filename: path.join(logDir, 'channels.log'),
                maxsize: 1000000,
                maxFiles: 10
            })
       ]
    });

    // Messages.
    // Make custom levels and only File transports for messages.
    let msgLogger = loggers.add('messages', {
        format: format.errors({ stack: true }),
        transports: [
            new transports.File({
                timestamp: true,
                maxsize: 1000000,
                filename: path.join(logDir, 'messages.log')
            })
        ]
    });

    // Clients.
    loggers.add('clients', {
        format: format.errors({ stack: true }),
        transports: [
            new transports.Console({
                level: logLevel,
                // colorize: true
                format: consoleFormat
            }),
            new transports.File({
                level: 'silly',
                timestamp: true,
                filename: path.join(logDir, 'clients.log')
            })
       ]
    });

    return true;
}
