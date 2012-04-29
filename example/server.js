/**
 * Start File for nodeGame server with conf.
 */

var ServerNode = require('../ServerNode');

var options = {
    name: "nodeGame Server",
    port: 8080,
    verbosity: 10,
    dumpsys: false,
    dumpmsg: false,
    mail: false,
    io: { 
        set: {
            transports: ['websocket'],
            'log level': -1
        }
    },
    http: {}
};



// ServerNode accepts two additional parameters:
// - an instance of an http Express server
// - an instance of socket.io
// If not passed, they will be created with default settings
var sn = new ServerNode(options);

sn.addChannel({
    name: 'Ultimatum',
    admin: 'ultimatum/admin',
    player: 'ultimatum'
});