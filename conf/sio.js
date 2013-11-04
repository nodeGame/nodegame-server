/**
 * # sio.js
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Socket.io server in nodegame-server
 * ---
 */
module.exports = configure;

function configure (sio, servernode) {
    sio.enable('browser client etag');
    sio.set('log level', -1);
    return true;
}