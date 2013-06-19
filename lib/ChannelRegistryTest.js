var ChannelRegistry = require('./ChannelRegistry').ChannelRegistry;

chReg = new ChannelRegistry();

var pid1 = chReg.addClient({id:'222'});
var pid2 = chReg.addClient({id:'225'});
var pid3 = chReg.addClient({id:'17'});
var pid4 = chReg.addClient({id:'1', admin:true});
var pid5 = chReg.addClient({id:'404', disconnected:true});
chReg.removeClient(pid3);
chReg.moveClient(pid1, 'roomA');
chReg.moveClient(pid2, 'roomB');
chReg.moveClient(pid2, 'roomB1');
chReg.moveClient(pid4, 'roomA');
chReg.moveClientBack(pid4);
chReg.registerGameAlias('P1', pid1);
chReg.registerGameAlias('P2', pid2);
chReg.registerGameAlias('VeryDeepAlias', 'DeepAlias');
chReg.registerGameAlias('DeepAlias', 'P1');
chReg.registerGameAlias('GameToRoomAlias', 'HERO');
chReg.registerGameAlias('RecursionA', 'RecursionB');
chReg.registerGameAlias('RecursionB', 'RecursionA');
chReg.registerRoomAlias('roomA', 'HERO', 'P1');
chReg.registerRoomAlias('roomB', 'HERO', pid2);

console.log('All IDs: ' + chReg.getIds());
console.log(chReg.lookupClient('VeryDeepAlias') === pid1);
console.log(chReg.lookupClient('VeryDeepAlias', 'roomB1') === pid1);
console.log(chReg.lookupClient('GameToRoomAlias') === null);
console.log(chReg.lookupClient('GameToRoomAlias', 'roomA') === pid1);
console.log(chReg.lookupClient('GameToRoomAlias', 'roomB') === pid2);
console.log(chReg.lookupClient('RecursionA') === null);
console.log();
console.log('IDs in room "roomA": ' + chReg.getRoomIds('roomA'));

/*
console.log(chReg);
console.log();

chReg.removeClient(pid1);
chReg.removeClient('P2');
console.log(chReg);
*/
