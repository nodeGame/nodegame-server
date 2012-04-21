// var util = require('util'),
//     should = require('should'),
//     io = require('socket.io-client'),
//     ServerNode = require('./../ServerNode');

// // Define nodeGame Server options.
// var server_options = {
//   name: 'nodeGame Test Server',
//   port: 8080, // for socket.io
//   verbosity: 0,
//   dumpsys: false,
//   dumpmsg: false,
//   mail: false,
//   io: {
//     set: {
//       transports: ['websocket'],
//       'log level': -1,
//       'force new connection': true
//     }
//   },
//   http: {
//   }
// };

// // Create a ServerNode instance and start it.
// var sn = new ServerNode(server_options);

// describe('nodegame-server: ', function(){

//   var socketURL = 'http://localhost:' + server_options.port + '/';

//   var player1 = {'name': 'Player1'};
//   var player2 = {'name': 'Player2'};

// 	describe('Game Server', function(){
		
// 		it('Should broadcast a hello-world message', function(done){
// 			var io_player1 = io.connect(socketURL, server_options.io);
			
			
		

// 		});
		
// 	});

// //   describe('start the web-server', function(){
// // 
// //     it('should return statusCode 200 for the root', function(done){
// //       request(root_url, function(err, res, body){
// //         res.statusCode.should.equal(200);
// //         done();
// //       });
// //     });
// // 
// //     it('should return content-type text/plain for the root', function(done){
// //       request(root_url, function(err, res, body){
// //         res.headers['content-type'].should.equal('text/html; charset=utf-8');
// //         done();
// //       });
// //     });
// // 
// //   });

// });