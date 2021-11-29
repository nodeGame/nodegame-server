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

    // const msgFormatter = format.printf((info) => {
    //     let { timestamp, level, message } = info;
    //     message = stack || message;
    //     return `${timestamp} ${level}: ${message}`;
    // });

    let consoleFormat = format.combine(format.colorize(), format.simple(),
                                       format.timestamp(), logFormatter);

    let msgFormat = format.combine(format.simple());

    // ServerNode.
    loggers.add('servernode', {
        format: winston.format.simple(),
        transports: [
            new transports.Console({
                level: logLevel,
                // colorize: true
                format: consoleFormat
            }),
            new transports.File({
                format: winston.format.simple(),
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
        // format: winston.format.simple(),
        // format: format.errors({ stack: true }),
        transports: [
            new transports.Console({
                level: logLevel,
                // colorize: true
                format: consoleFormat
            }),
            new transports.File({
                format: winston.format.simple(),
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
    loggers.add('messages', {
        levels: {
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
        },
        transports: [
            new transports.File({
                level: 'all',
                timestamp: true,
                maxsize: 1000000,
                filename: path.join(logDir, 'messages.log'),
                format: msgFormat
            })
        ]
    });

    // Clients.
    loggers.add('clients', {
        // format: format.errors({ stack: true }),
        transports: [
            new transports.Console({
                level: logLevel,
                // colorize: true
                format: consoleFormat
            }),
            new transports.File({
                // format: consoleFormat,
                format: winston.format.simple(),
                level: 'silly',
                timestamp: true,
                filename: path.join(logDir, 'clients.log')
            })
       ]
    });

    return true;
}
