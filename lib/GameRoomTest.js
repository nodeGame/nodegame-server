GameRoom = require('./GameRoom');
ServerChannel = require('./ServerChannel');

var chan = new ServerChannel(23, {name: 'channely'});
var room = new GameRoom({name: 'roomA', logicPath: 'nonexistent', channel: chan});

room.startGame();
