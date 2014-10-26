var util = require('util'),
    should = require('should'),
    request = require('request'),
    ServerNode = require('./../index.js').ServerNode;

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
      'log level': -1
    }
  },
  http: {
  }
};

// Create a ServerNode instance and start it.
var sn = new ServerNode(server_options);

describe('nodegame-server: ', function(){

  var root_url = 'http://127.0.0.1:' + server_options.port + '/';

  describe('start the web-server', function(){

    it('should return statusCode 200 for the root', function(done){
      request(root_url, function(err, res, body){
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should return content-type text/plain for the root', function(done){
      request(root_url, function(err, res, body){
        res.headers['content-type'].should.equal('text/html; charset=utf-8');
        done();
      });
    });

    it('should return statusCode 200 for player.css', function(done){
      request(root_url + 'stylesheets/player.css', function(err, res, body){
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should return content-type text/css for player.css', function(done){
      request(root_url + 'stylesheets/player.css', function(err, res, body){
        res.headers['content-type'].should.equal('text/css; charset=UTF-8');
        done();
      });
    });

    it('should return statusCode 200 for monitor.css', function(done){
      request(root_url + 'stylesheets/monitor.css', function(err, res, body){
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should return content-type text/css for monitor.css', function(done){
      request(root_url + 'stylesheets/monitor.css', function(err, res, body){
        res.headers['content-type'].should.equal('text/css; charset=UTF-8');
        done();
      });
    });

    it('should return statusCode 200 for nodegame.js', function(done){
      request(root_url + 'javascripts/nodegame.js', function(err, res, body){
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should return content-type text/javascript for nodegame.js', function(done){
      request(root_url + 'javascripts/nodegame.js', function(err, res, body){
        res.headers['content-type'].should.equal('application/javascript');
        done();
      });
    });

  });
});
