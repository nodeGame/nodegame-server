GameRoom = require('../lib/GameRoom');
ServerChannel = require('../lib/ServerChannel');

var chan = new ServerChannel(23, {name: 'channely'});
var room = new GameRoom({name: 'roomA', logicPath: 'nonexistent', channel: chan});

room.startGame();
