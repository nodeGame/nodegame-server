var nodegame = require('nodegame-client');

module.exports.nodegame = nodegame;

var Ultimatum = require('ultimatum');

var conf = {
  	name: "Ultimatum_Logic",
	url: "http://localhost:5000/ultimatum/admin",
    verbosity: 10
};

nodegame.play(conf, new Ultimatum());