var	util = require('util'), 
		should = require('should'),
		io = require('socket.io-client'),
		ServerNode = require('./../ServerNode');
		
var socketURL = 'http://localhost:8080';

// Define nodeGame Server options.
var server_options = {
  name: 'nodeGame Test Server',
  port: 8080, // for socket.io
  verbosity: 0,
  dumpsys: false,
  dumpmsg: false,
  mail: false,
  io: {
    set: {
      transports: ['websocket'],
      'log level': -1,
      'force new connection': true
    }
  },
  http: {
  }
};

// Create a ServerNode instance and start it.
var sn = new ServerNode(server_options);

var player1 = io.connect(socketURL, server_options.io);

player1.on('connect', function(data){
	
});