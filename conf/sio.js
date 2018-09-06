/**
 * # sio.js
 * Copyright(c) 2018 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Socket.io server in nodegame-server
 */
module.exports = configure;

function configure(sio, servernode) {

    // Possible transports values are the base-names of the files in
    // node_modules/socket.io/lib/transports/.

    //sio.set('transports', ['websocket']);

    // This is good for speeding up IE8:
    //sio.set('transports', ['xhr-polling']);

    return true;
}
