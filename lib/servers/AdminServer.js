/**
 * # AdminServer
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * GameServer for the administrators endpoint
 *
 * Inherits from `GameServer` and attaches special listeners.
 *
 * AdminServer removes the real client id of admin clients.
 *
 * SET messages are ignored.
 */

"use strict";

// ## Global scope

module.exports = AdminServer;

var GameServer = require('./../GameServer'),
    GameRoom = require('./../GameRoom');
var Logger = require('./../Logger');

var ngc = require('nodegame-client');

var action = ngc.constants.action,
    target = ngc.constants.target;

var PlayerList = ngc.PlayerList,
    Player = ngc.Player;

var J = ngc.JSUS;

AdminServer.prototype.__proto__ = GameServer.prototype;
AdminServer.prototype.constructor = AdminServer;

/**
 * ## AdminServer constructor
 *
 * Creates an instance of AdminServer
 *
 * @param {object} options The configuration object
 */
function AdminServer(options, channel) {
    GameServer.call(this, options, channel);
    this.ADMIN_SERVER = true;
}

// ## AdminServer methods

/**
 * ### AdminServer.generateInfo
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
 * ### AdminServer.attachCustomListeners
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

    this.on('connecting', function(clientObj) {
        var roomName, room, players, admins, oldAdmins, clientId, socketId;

        clientId = clientObj.id;
        socketId = clientObj.sid;
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
            data:   clientObj,
            from:   clientId
        }), oldAdmins);

        // Send the list of connected players to the new admin.
        that.socket.send2client(that.msg.create({
            target: 'SETUP',
            to:     clientId,
            text:   'plist',
            data:   [players.db, 'append']
        }));

        // Send the list of connected admins to the new admin.
        that.socket.send2client(that.msg.create({
            target: 'SETUP',
            to:     clientId,
            text:   'mlist',
            data:   [oldAdmins.db, 'append']
        }));
    });

    // TODO: cleanup code, maybe merge with connecting. Maybe the room/roomName
    // could be passed as parameter.
    this.on('re-connecting', function(clientObj) {
        var msg, room, roomName, clientId, socketId;

        clientId = clientObj.id;
        socketId = clientObj.sid;
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
            data:   clientObj,
            from:   clientId
        });

        // Unlike connect msgs, reconnect msgs are sent always just to admins.
        // Admins decides what to do with it.
        that.socket.broadcast2group(msg, room.clients.admin, clientId);
    });

    // ### say.PLIST
    // Listens on say.PLIST messages.
    this.on(say + 'PLIST', this.standardAdminMsg);

    // ### say.PCONNECT
    // Listens on say.PCONNECT messages.
    this.on(say + 'PCONNECT', this.standardAdminMsg);

    // ### say.DATA
    // Listens on say.DATA messages.
    this.on(say + 'DATA', this.standardAdminMsg);

    // ### say.TXT
    // Listens on say.TXT messages.
    this.on(say + 'TXT', this.standardAdminMsg);

    // ### say.REDIRECT
    // Forwards a redirect msg (only for admin).
    this.on(say + 'REDIRECT', this.standardAdmin2PlayerMsg);

    // ### say.SETUP
    // Forwards a redirect msg (only for admin).
    this.on(say + 'SETUP', this.standardAdmin2PlayerMsg);

    // ### say.GAMECOMMAND
    // Forwards a gamecommand msg (only for admin).
    this.on(say + 'GAMECOMMAND', this.standardAdminMsg);

    // ### say.ALERT
    // Forwards a gamecommand msg (only for admin).
    this.on(say + 'ALERT', this.standardAdmin2PlayerMsg);

    // ### say.SERVERCOMMAND
    // Re-emits a servercommand msg (only for admin).
    this.on(say + 'SERVERCOMMAND', function(msg) {
        that.emit('SERVERCOMMAND_' + msg.text, msg.data, msg.from);
    });

    // ### set.LANG
    // Forwards a set language msg (only for admin).
    this.on(set + 'LANG', this.standardAdmin2PlayerMsg);

    // ### get.SERVERCOMMAND
    // Re-emits a servercommand msg (only for admin).
    this.on(get + 'SERVERCOMMAND', function(msg) {
        that.emit('SERVERCOMMAND_' + msg.text, msg.data, msg.from);
    });

    // ### get.SERVERCOMMAND_ROOMCOMMAND
    // Executes a command (startGame, pauseGame etc.) on a GameRoom.
    this.on('SERVERCOMMAND_ROOMCOMMAND', function(data, from) {
        var rc;
        var roomObj;

        // Look up room
        if (!that.servernode.rooms.hasOwnProperty(data.roomId)) {
            sys.log('AdminServer.on.SERVERCOMMAND_ROOMCOMMAND: data has ' +
                    'invalid room field.', 'error');
            return;
        }
        roomObj = that.servernode.rooms[data.roomId];

        // Check data fields:
        rc = GameRoom.checkParams(data.doLogic, data.clients, data.force);
        if (rc !== null) {
            sys.log('AdminServer.on.SERVERCOMMAND_ROOMCOMMAND: data has an ' +
                    'invalid field: ' + rc + '.', 'error');
            return;
        }

        if (data.type === 'SETUP') {
            roomObj.setupGame(undefined,
                              data.doLogic, data.clients, data.force);
        }
        else if (data.type === 'START') {
            roomObj.startGame(data.doLogic, data.clients, data.force);
        }
        else if (data.type === 'PAUSE') {
            roomObj.pauseGame(data.doLogic, data.clients, data.force);
        }
        else if (data.type === 'RESUME') {
            roomObj.resumeGame(data.doLogic, data.clients, data.force);
        }
        else if (data.type === 'STOP') {
            roomObj.stopGame(data.doLogic, data.clients, data.force);
        }
        else {
            sys.log('AdminServer.on.SERVERCOMMAND_ROOMCOMMAND: data has ' +
                    'invalid type field.', 'error');
            return;
        }
    });

    // ### get.SERVERCOMMAND_STARTBOT
    // Starts a bot on the server using PhantomJS.
    this.on('SERVERCOMMAND_STARTBOT', function(data, from) {
        that.channel.connectPhantom(data);
    });

    // ### get.SERVERCOMMAND_INFO
    // Sends information about the server.
    this.on('SERVERCOMMAND_INFO', function(data, from) {
        var replyData;
        var channel, chanObj;
        var room, roomObj;

        if (data.type === 'CHANNELS') {
            // Fill replyData with channel info:
            replyData = J.clone(that.servernode.info.channels);

            if (data.extraInfo) {
                for (channel in replyData) {
                    if (replyData.hasOwnProperty(channel) &&
                        that.servernode.channels.hasOwnProperty(channel)) {

                        chanObj = that.servernode.channels[channel];
                        replyData[channel].nGameRooms =
                            J.size(chanObj.gameRooms);
                        replyData[channel].nConnClients =
                            J.size(chanObj.registry.getConnected());
                        replyData[channel].nConnAdmins =
                            J.size(chanObj.registry.getConnectedAdmins());
                        replyData[channel].nConnPlayers =
                            J.size(chanObj.registry.getConnectedPlayers());
                        replyData[channel].nDisconnClients =
                            J.size(chanObj.registry.getDisconnected());
                        replyData[channel].nDisconnAdmins =
                            J.size(chanObj.registry.getDisconnectedAdmins());
                        replyData[channel].nDisconnPlayers =
                            J.size(chanObj.registry.getDisconnectedPlayers());
                    }
                }
            }

            that.socket.send2client(that.msg.create({
                text: 'INFO_CHANNELS',
                data: replyData,
                to:   from
            }));
        }
        else if (data.type === 'ROOMS') {
            if (!that.servernode.channels.hasOwnProperty(data.channel)) {
                sys.log('AdminServer.on.SERVERCOMMAND_INFO.ROOMS: data has ' +
                        'invalid channel field.', 'error');
                return;
            }

            // Fill replyData with room info:
            replyData = [];

            chanObj = that.servernode.channels[data.channel];
            for (room in chanObj.gameRooms) {
                if (chanObj.gameRooms.hasOwnProperty(room)) {
                    roomObj = chanObj.gameRooms[room];

                    replyData.push({
                        name:     room,
                        id:       roomObj.id,
                        nClients: J.size(roomObj.clients.db),
                        nPlayers: J.size(roomObj.clients.player.db),
                        nAdmins:  J.size(roomObj.clients.admin.db)
                    });
                    // TODO: connected/disconnected etc.
                }
            }

            that.socket.send2client(that.msg.create({
                text: 'INFO_ROOMS',
                data: replyData,
                to:   from
            }));
        }
        else if (data.type === 'CLIENTS') {
            // Get room object:
            if (!that.servernode.rooms.hasOwnProperty(data.roomId)) {
                sys.log('AdminServer.on.SERVERCOMMAND_INFO.CLIENTS: data has ' +
                        'invalid roomId field.', 'error');
                return;
            }
            roomObj = that.servernode.rooms[data.roomId];

            // Fill replyData with client info:
            // TODO: Send only specific client data, not everything;
            //       send _paused_ field
            replyData = {
                clients: roomObj.clients.db,
                logicId: roomObj.node.player.id
            };

            that.socket.send2client(that.msg.create({
                text: 'INFO_CLIENTS',
                data: replyData,
                to:   from
            }));
        }
        else if (data.type === 'GAMES') {
            replyData = that.servernode.getGamesInfo();

            that.socket.send2client(that.msg.create({
                text: 'INFO_GAMES',
                data: replyData,
                to:   from
            }));
        }

        // TODO: CLIENTS (admins or players),
        //       SERVERCONF,
        //       UPTIME
    });

    // ### get.DATA
    // Listener on get.
    // Important: the ID is not obfuscated.
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
            that.socket.broadcast2all(msg);
        }
        else if (msg.to === 'CHANNEL') {
            that.socket.broadcast2ownChannel(msg);
        }
        else if (msg.to === 'ROOM') {
            that.socket.broadcast2ownRoom(msg);
        }
        else if (msg.to === 'CHANNEL_X') {
            that.socket.broadcast2channel(msg, msg._to);
        }
        else if (msg.to === 'ROOM_X') {
            that.socket.broadcast2room(msg, msg._to);
        }
        else {

            if (msg.to === 'SERVER') {
                // Send to admins in the room:
                roomName =
                    msg._roomName || that.registry.getClientRoom(msg.from);
                room = that.channel.gameRooms[roomName];

                if (!room) {
                    sys.log('AdminServer.on.get.DATA: Could not determine ' +
                            'room of msg sender: ' + msg.from, 'error');
                    return;
                }

                admins = room.clients.admin;
                that.socket.broadcast2group(msg, admins);
            }
            else {
                // Send to single recipient.
                that.socket.send2client(msg);
            }
        }
    });


    // ### set.DATA
    // Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        // Experimental
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


};



/**
 * ### AdminServer.standardAdminMsg
 *
 * Handles incoming messages to the Admin Server
 *
 * Evaluates the _to_ field and calls the right methods from the socket manager.
 *
 * It is used for the following targets: PLIST, PCONNECT, DATA, TXT.
 *
 * Note: it still possible to send messages to admin by specifying the direct
 * the client-id of the recipient.
 *
 * @param {GameMsg} msg The incoming game message
 *
 * @see SocketManager
 */
AdminServer.prototype.standardAdminMsg = function(msg) {
    var originalFrom;
    var room, roomName;
    var admins;

    // TODO: Obfuscate just for players.
    originalFrom = msg.from;
    msg = this.msg.obfuscate(msg);

    if (msg.to === 'ALL') {
        this.socket.broadcast2all(msg, originalFrom);
    }
    else if (msg.to === 'CHANNEL') {
        this.socket.broadcast2ownChannel(msg, originalFrom);
    }
    else if (msg.to === 'ROOM') {
        this.socket.broadcast2ownRoom(msg, originalFrom);
    }
    else if (msg.to === 'CHANNEL_X') {
        this.socket.broadcast2channel(msg, msg._to, originalFrom);
    }
    else if (msg.to === 'ROOM_X') {
        this.socket.broadcast2room(msg, msg._to, originalFrom);
    }
    else {

        if (msg.to === 'SERVER') {
            // Send to admins in the room:
            roomName =
                msg._roomName || this.registry.getClientRoom(originalFrom);
            room = this.channel.gameRooms[roomName];

            if (!room) {
                this.sysLogger.log('AdminServer.on.say.DATA: Could not ' +
                        'determine room of msg sender: ' + originalFrom,
                        'error');
                return;
            }
            admins = room.clients.admin;
            this.socket.broadcast2group(msg, admins, originalFrom);
        }
        else {
            // Send to single recipient.
            this.socket.send2client(msg);
        }
    }
};

/**
 * ### AdminServer.standardAdmin2PlayerMsg
 *
 * Handles incoming messages to the Admin Server directeed to players only.
 *
 * Evaluates the _to_ field and calls the right methods from the socket manager.
 *
 * It is used for the following targets: REDIRECT, GAMECOMMAND, ALERT, SETUP.
 *
 * Note: it still possible to send messages to admin by specifying the direct
 * the client-id of the recipient.
 *
 * @param {GameMsg} msg The incoming game message
 *
 * @see SocketManager
 */
AdminServer.prototype.standardAdmin2PlayerMsg = function(msg) {
    var originalFrom;
    var roomName, room;

    if (msg.to === 'SERVER') {
        this.sysLogger.log('AdminServer.on.' + msg.toEvent() +
                ': "SERVER" is not a valid recipient.', 'error');
        return;
    }

    originalFrom = msg.from;
    msg = this.msg.obfuscate(msg);

    if (msg.to === 'ALL') {
        this.socket.send2allPlayers(msg);
    }
    else {

        roomName = msg._roomName || this.registry.getClientRoom(originalFrom);
        room = this.channel.gameRooms[roomName];

        if (!room) {
            this.sysLogger.log('AdminServer.on.' + msg.toEvent() +
                    ': Could not determine room of msg sender: ' +
                    originalFrom, 'error');
            return;
        }

        if (msg.to === 'CHANNEL') {
            this.socket.send2channelPlayers(msg, room.channel);
        }
        else if (msg.to === 'ROOM') {
            this.socket.send2roomPlayers(msg, room);
        }
        else if (msg.to === 'CHANNEL_X') {
            this.socket.send2channelPlayers(msg, msg._to);
        }
        else if (msg.to === 'ROOM_X') {
            this.socket.send2roomPlayers(msg, msg._to);
        }
        else {
            // Send to single recipient (could be admin too).
            this.socket.send2client(msg);
        }
    }
};
