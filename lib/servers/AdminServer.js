/**
 * # AdminServer
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * GameServer for the administrators endpoint.
 *
 * Inherits from `GameServer` and attaches special listeners.
 *
 * AdminServer removes the real client id of admin clients.
 *
 * SET messages are ignored
 * ---
 */

// ## Global scope

module.exports = AdminServer;

var GameServer = require('./../GameServer');

var ngc = require('nodegame-client');

var action = ngc.constants.action,
    target = ngc.constants.target;

var PlayerList = ngc.PlayerList,
    Player = ngc.Player;

var J = ngc.JSUS;

AdminServer.prototype.__proto__ = GameServer.prototype;
AdminServer.prototype.constructor = AdminServer;

/**
 * ## AdminServer Constructor
 *
 * Creates an instance of AdminServer
 *
 * @param {object} options The configuration object
 */
function AdminServer(options) {
    GameServer.call(this, options);
    this.ADMIN_SERVER = true;
}

//## METHODS

/**
 * ## AdminServer.generateInfo
 *
 * Creates an object containing general information (e.g. number of
 * players, and admin connected), about the state of the GameServer
 *
 * @return {object} info The info about the state of the GameServer
 */
AdminServer.prototype.generateInfo = function() {
    return {
        name: this.name,
        status: 'OK',
        nplayers: this.partner.getPlayerList().length,
        nadmins: this.pl.length
    };
};

/**
 * ## AdminServer.attachCustomListeners
 *
 * Implements `GameServer.attachCustomListeners`
 */
AdminServer.prototype.attachCustomListeners = function() {
    var that = this,
        sys = this.sysLogger,
        say = action.SAY + '.',
        set = action.SET + '.',
        get = action.GET + '.';

    var registry = this.registry;

    // LISTENERS

    this.on('connecting', function(clientId, socketId) {
        var roomName, room, players, admins, oldAdmins;
        sys.log('Incoming monitor: ' + clientId);
        roomName = that.registry.getClientRoom(clientId);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.connecting: Could not determine room ' +
                    'for incoming monitor: ' + clientId, 'error');
            return;
        }

        players = room.clients.player;
        admins = room.clients.admin;
        oldAdmins = admins.breed();
        oldAdmins.id.remove(clientId);

        // Notifies other admins that a new one monitor connected.
        that.socket.send2group(that.msg.create({
            target: 'MCONNECT',
            to: 'ALL',
            data: {
                id: clientId,
                sid: socketId
            },
            from: clientId
        }), oldAdmins);

        // Send the list of connected players to the new admin.
        that.socket.send2client(that.msg.create({
            target: 'SETUP',
            to: clientId,
            text: 'plist',
            data: [players.db, 'append']
        }));

        // Send the list of connected admins to the new admin.
        that.socket.send2client(that.msg.create({
            target: 'SETUP',
            to: clientId,
            text: 'mlist',
            data: [oldAdmins.db, 'append']
        }));
    });

    // TODO: cleanup code, maybe merge with connecting. Maybe the room/roomName
    // could be passed as parameter.
    this.on('re-connecting', function(clientId, socketId) {
        var msg, room, roomName;
        sys.log('Returning admin: ' + clientId);
        roomName = that.registry.getClientRoom(clientId);
        room = that.channel.gameRooms[roomName];
        if (!room) {
            sys.log('AdminServer.on.re-connecting: Could not determine room ' +
                    'for returning admin: ' + clientId, 'error');
            return;
        }

        msg = that.msg.create({
            target: 'MRECONNECT',
            to:     'ALL',
            data:   {
                id: clientId,
                sid: socketId
            },
            from: clientId
        });

        // Unlike connect msgs, reconnect msgs are sent always just to admins.
        // Admins decides what to do with it.
        that.socket.broadcast2group(msg, room.clients.admin, clientId);
    });


    // ### say.TXT
    // Listens on say.TXT messages
    this.on(say + 'TXT', function(msg) {
        // TODO: update.
        that.socket.broadcast(msg, msg.from);
    });

    // ### say.PLIST
    // Listens on say.PLIST messages
    this.on(say + 'PLIST', function(msg) {
        var origFrom, room, roomName;

        origFrom = msg.from;

        // TODO: Obfuscate just for players
        if (!msg.to) {
            sys.log('AdminServer.on.say.PLIST: Invalid "to" field "' +
                    msg.to + '"', 'error');
            return;
        }
        
        roomName = that.registry.getClientRoom(origFrom);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.say.PLIST: Could not determine ' +
                    'room of msg sender: ' + origFrom, 'error');
            return;
        }
        originalFrom = msg.from;
        msg = that.msg.obfuscate(msg);

        if (msg.to === 'ALL') { // MAYBE ROOM?
            that.socket.broadcast2room(msg, room, originalFrom);
        }
        else {
            if (msg.to === 'SERVER') {
                // Send to admins in the room:
                admins = room.clients.admin;
                that.socket.broadcast2group(msg, admins, origFrom);
            }

            if (msg.to !== 'SERVER') {
                // Send to receiving player:
                that.socket.send2client(that.msg.obfuscate(msg));
            }
        }
    });

    // ### say.PCONNECT
    // Listens on say.PCONNECT messages:
    // This type of messages could be sent by an admin programmtically.
    this.on(say + 'PCONNECT', function(msg) {
        var origFrom, room, roomName;

        origFrom = msg.from;

        // TODO: Obfuscate just for players
        if (!msg.to) {
            sys.log('AdminServer.on.say.PCONNECT: Invalid "to" field "' +
                    msg.to + '"', 'error');
            return;
        }
        
        roomName = that.registry.getClientRoom(origFrom);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.say.PCONNECT: Could not determine ' +
                    'room of msg sender: ' + origFrom, 'error');
            return;
        }
        originalFrom = msg.from;
        msg = that.msg.obfuscate(msg);

        if (msg.to === 'ALL') { // MAYBE ROOM?
            that.socket.broadcast2room(msg, room, originalFrom);
        }
        else {
            if (msg.to === 'SERVER') {
                // Send to admins in the room:
                admins = room.clients.admin;
                that.socket.broadcast2group(msg, admins, origFrom);
            }

            if (msg.to !== 'SERVER') {
                // Send to receiving player:
                that.socket.send2client(that.msg.obfuscate(msg));
            }
        }
    });


    // ### say.DATA
    // Listens on say.DATA messages
    this.on(say + 'DATA', function(msg) {
        var origFrom;
        var room, roomName;

        origFrom = msg.from;

        // TODO: Obfuscate just for players

        if (!msg.to) {
            sys.log('AdminServer.on.say.DATA: Invalid "to" field "' +
                    msg.to + '"', 'error');
            return;
        }


        roomName = that.registry.getClientRoom(origFrom);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.say.DATA: Could not determine ' +
                    'room of msg sender: ' + origFrom, 'error');
            return;
        }
        originalFrom = msg.from;
        msg = that.msg.obfuscate(msg);

        if (msg.to === 'ALL') { // MAYBE ROOM?
            that.socket.broadcast2room(msg, room, originalFrom);
        }
        else {
            if (msg.to === 'SERVER') {
                // Send to admins in the room:
                admins = room.clients.admin;
                that.socket.broadcast2group(msg, admins, origFrom);
            }

            if (msg.to !== 'SERVER') {
                // Send to receiving player:
                that.socket.send2client(that.msg.obfuscate(msg));
            }
        }

    });

    // ### set.DATA
    // Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        // Experimental
    });

    // ### say.PLAYER_UPDATE
    // Listens on say.PLAYER_UPDATE messages
//    this.on(say + 'PLAYER_UPDATE', function(msg) {
//        var newMsg;
//        if (msg.text === 'stage') {
//            newMsg = that.msg.create({
//                target: target.STAGE,
//                data: msg.data.stage,
//                to: msg.to
//            });
//            that.socket.broadcast(that.msg.obfuscate(newMsg), msg.from);
//        }
//
//        if (msg.text === 'stageLevel') {
//            newMsg = that.msg.create({
//                target: target.STAGE_LEVEL,
//                data: msg.data.stageLevel,
//                from: msg.from,
//                to: msg.to
//            });
//            that.socket.broadcast(that.msg.obfuscate(newMsg), msg.from);
//        }
//    });

//    // ### say.STAGE
//    // Listens on say.STAGE messages
//    this.on(say + 'STAGE', function(msg) {
//        var origFrom = msg.from;
//        that.socket.broadcast(that.msg.obfuscate(msg), origFrom);
//    });
//
//    // Transform in say
//    this.on(set + 'STAGE', function(msg){
//        //this.emit(say+'STAGE', msg);
//    });
//
//    // ### say.STAGE_LEVEL
//    // Listens on say.STAGE_LEVEL messages
//    this.on(say + 'STAGE_LEVEL', function(msg) {
//        var origFrom = msg.from;
//        that.socket.broadcast(that.msg.obfuscate(msg), origFrom);
//    });
//
//    // Transform in say
//    this.on(set + 'STAGE_LEVEL', function(msg){
//        //this.emit(say+'STAGE_LEVEL', msg);
//    });


    // ### say.REDIRECT
    // Forwards a redirect msg (only for admin)
    this.on(say + 'REDIRECT', function(msg) {
        var roomName, room;

        if (msg.to === 'SERVER') {
            sys.log('AdminServer.on.say.REDIRECT: Are you kidding me? You ' +
                    'cannot redirect the server.', 'error');
            return;
        }

        if (msg.to === 'ALL') {
            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('AdminServer.on.say.REDIRECT: Could not determine ' +
                        'room of msg sender: ' + msg.from, 'error');
                return;
            }

            that.socket.send2roomPlayers(that.msg.obfuscate(msg), room);
        }
        else {
            that.socket.send2client(that.msg.obfuscate(msg));
        }

    });

    // ### say.SETUP
    // Forwards a redirect msg (only for admin)
    this.on(say + 'SETUP', function(msg) {
        var roomName, room;

        if (msg.to === 'SERVER') {
            sys.log('AdminServer.on.say.SETUP: remote server setup is ' +
                    'not supported at the moment.', 'error');
            return;
        }

        if (msg.to === 'ALL') {
            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('AdminServer.on.say.SETUP: Could not determine ' +
                        'room of msg sender: ' + msg.from, 'error');
                return;
            }
            // It is not possible to setup other Admins.
            that.socket.send2roomPlayers(that.msg.obfuscate(msg), room);
        }
        else {
            that.socket.send2client(that.msg.obfuscate(msg));
        }
    });

    // ### say.GAMECOMMAND
    // Forwards a gamecommand msg (only for admin)
    this.on(say + 'GAMECOMMAND', function(msg) {
        var roomName, room, originalFrom;

        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.say.GAMECOMMAND: Could not determine ' +
                    'room of msg sender: ' + msg.from, 'error');
            return;
        }
        originalFrom = msg.from;
        msg = that.msg.obfuscate(msg);

        if (msg.to === 'ALL') {
            that.socket.broadcast2room(msg, room, originalFrom);
        }
        else {
            that.socket.send2client(msg);
        }
    });

    // ### say.SERVERCOMMAND
    // Re-emits a servercommand msg (only for admin)
    this.on(say + 'SERVERCOMMAND', function(msg) {
        that.emit('SERVERCOMMAND_' + msg.text, msg.data, msg.from);
    });

    // ### get.SERVERCOMMAND
    // Re-emits a servercommand msg (only for admin)
    this.on(get + 'SERVERCOMMAND', function(msg) {
        that.emit('SERVERCOMMAND_' + msg.text, msg.data, msg.from);
    });

    // ### get.SERVERCOMMAND_INFO
    // Sends information about the server
    this.on('SERVERCOMMAND_INFO', function(data, from) {
        var replyData;
        var chanObj;

        if (data.type === 'CHANNELS') {
            // Fill replyData with channel info:
            replyData = J.clone(that.servernode.info.channels);

            if (data.extraInfo) {
                for (channel in replyData) {
                    if (replyData.hasOwnProperty(channel) &&
                        that.servernode.channels.hasOwnProperty(channel)) {

                        chanObj = that.servernode.channels[channel];
                        replyData[channel].nGameRooms      = J.size(chanObj.gameRooms);
                        replyData[channel].nConnClients    = J.size(chanObj.registry.getConnected());
                        replyData[channel].nConnAdmins     = J.size(chanObj.registry.getConnectedAdmins());
                        replyData[channel].nConnPlayers    = J.size(chanObj.registry.getConnectedPlayers());
                        replyData[channel].nDisconnClients = J.size(chanObj.registry.getDisconnected());
                        replyData[channel].nDisconnAdmins  = J.size(chanObj.registry.getDisconnectedAdmins());
                        replyData[channel].nDisconnPlayers = J.size(chanObj.registry.getDisconnectedPlayers());
                    }
                }
            }

            that.socket.send2client(that.msg.create({
                text: 'INFO_CHANNELS',
                data: replyData,
                to: from
            }));
        }
        // TODO: ROOMS (all rooms in a channel),
        //       CLIENTS (admins or players),
        //       SERVERCONF,
        //       UPTIME
    });

     // ### say.ALERT
    // Forwards a gamecommand msg (only for admin)
    this.on(say + 'ALERT', function(msg) {
        var roomName, room, originalFrom;

        if (msg.to === 'SERVER') {
            sys.log('AdminServer.on.say.ALERT: Are you kidding me? ' +
                    'You cannot ALERT the server.', 'error');
            return;
        }

        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.say.ALERT: Could not determine ' +
                    'room of msg sender: ' + msg.from, 'error');
            return;
        }
        originalFrom = msg.from;
        msg = that.msg.obfuscate(msg);

        if (msg.to === 'ALL') {
            // It is not possible to Alert other Admins.
            that.socket.send2roomPlayers(msg, room);
        }
        else {
            that.socket.send2client(msg);
        }
    });


    // ### get.DATA
    // Listener on get
    this.on(get + 'DATA', function(msg) {
        var room, roomName;
        var admins, oldAdmins;

        if (J.isEmpty(msg.text)) {
            sys.log('AdminServer.on.get.DATA: discarded invalid msg without ' +
                    'label.', 'error');
            return;
        }

        if (msg.text.split('.') > 1) {
            sys.log('AdminServer.on.get.DATA: discarded invalid msg with "." ' +
                    'character in the label.', 'error');
            return;
        }

        if (msg.to === 'ALL') {
            that.socket.broadcast(msg, msg.from);
        }
        else if (msg.to === 'SERVER') {
            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('AdminServer.on.get.DATA: Could not determine room ' +
                        'of sender: ' + msg.from, 'error');
                return;
            }

            admins = room.clients.admin;
            oldAdmins = admins.breed();
            oldAdmins.id.remove(msg.from);

            // TODO: Check here: is obfuscate OK?
            that.socket.send2group(that.msg.obfuscate(msg), oldAdmins);
        }
        // Msg to a specific client.
        else {
            that.socket.send2client(msg);
        }
    });

    // ### disconnect
    // Listens on admins disconnecting
    this.on('disconnect', function(monitor, room) {
        var msg, monitorName;

        monitorName = monitor.id + ' (sid: ' + monitor.sid + ')';
        sys.log(that.name + ' client disconnected: ' + monitorName);

        msg = that.msg.create({
            target: 'MDISCONNECT',
            from: monitor.id,
            data: monitor
        });

        that.socket.send2roomAdmins(msg, room);
    });

    // ### shutdown
    // Listens on server shutdown
    this.sio.sockets.on("shutdown", function(msg) {
        sys.log('Admin server ' + that.name + ' is shutting down.');
        // TODO save the state to disk.
    });

};
