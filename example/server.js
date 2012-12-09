/**
 * Start File for nodeGame server with conf.
 */

var ServerNode = require('../index').ServerNode;

var sn = new ServerNode();

sn.addChannel({
    name: 'Ultimatum',
    admin: 'ultimatum/admin',
    player: 'ultimatum'
});


var ultimatum = require('./games/ultimatum/server/logic.js');
sn.startGame('ultimatum', ultimatum);

