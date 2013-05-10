var ChannelRegistry = require('./ChannelRegistry').ChannelRegistry;

chReg = new ChannelRegistry();

chReg.addPlayer('11');
chReg.addPlayer('13');
chReg.addPlayer('17');
chReg.removePlayer('13');
chReg.movePlayer('11', 'roomA');
chReg.movePlayer('17', 'roomB');
chReg.movePlayer('17', 'roomB1');
chReg.registerGameAlias('P1', '11');
chReg.registerGameAlias('P2', '17');
chReg.registerGameAlias('VeryDeepAlias', 'DeepAlias');
chReg.registerGameAlias('DeepAlias', 'P1');
chReg.registerGameAlias('GameToRoomAlias', 'HERO');
chReg.registerRoomAlias('roomA', 'HERO', 'P1');
chReg.registerRoomAlias('roomB', 'HERO', '17');

console.log(chReg);
console.log();

chReg.movePlayer('11');
chReg.movePlayer('17');
chReg.movePlayer('17');
console.log(chReg);
