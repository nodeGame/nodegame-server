var nodegame = require('../node_modules/nodegame-server/node_modules/nodegame-client');
module.exports.nodegame = nodegame;

var Ultimatum = require('ultimatum');

var conf = {
  	name: "Ultimatum_Logic",
	url: "/ultimatum/admin"
    // verbosity: 0
    // verbosity: 10
};

nodegame.play(conf, new Ultimatum());