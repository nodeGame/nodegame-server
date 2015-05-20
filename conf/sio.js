/**
 * # sio.js
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Socket.io server in nodegame-server
 */
module.exports = configure;

function configure(sio, servernode) {

    // Log level not existing.
    //sio.set('log level', -1);

    // Not existing in 1.3.5
    // sio.enable('browser client etag');


    // Possible transports values are the base-names of the files in
    // node_modules/socket.io/lib/transports/.

    //sio.set('transports', ['websocket']);

    // This is good for speeding up IE8:
    //sio.set('transports', ['xhr-polling']);

    return true;
}
