/**
 * # PlayerServer
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * GameServer for the players endpoint
 *
 * Inherits from `GameServer` and attaches special listeners.
 */

"use strict";

// ## Global scope

module.exports = PlayerServer;

var GameServer = require('./../GameServer');

var ngc = require('nodegame-client');

var PlayerList = ngc.PlayerList,
Player = ngc.Player,
J = ngc.JSUS;

var action = ngc.constants.action;

PlayerServer.prototype.__proto__ = GameServer.prototype;
PlayerServer.prototype.constructor = PlayerServer;

/**
 * ## PlayerServer constructor
 *
 * Creates a new instance of PlayerServer
 *
 * @param {object} options A configuration object
 */
function PlayerServer(options, channel) {
    GameServer.call(this, options, channel);

    // ### PlayerServer.ADMIN_SERVER
    // Flag to distinguish from Admin Server at execution time.
    this.ADMIN_SERVER = false;

    /**
     * ### PlayerServer.acm
     *
     * Action control management
     */
    this.acm = {};

    // #### PlayerServer.acm.notify
    // Configuration object governing message passing between players.
    // By default, players are *not* notified of the activities of other
    // players, such as (connection, disconnection, entering a new stage). By
    // changing the value of the properties of this object it is possible to
    // send out notifications of the following types:
    //
    // - onConnect: sends PCONNECT, and PDISCONNECT
    // - onStageUpdate: sends PLAYER_UPDATE (player enters a new stage / step)
    // - onStageLevelUpdate: sends PLAYER_UPDATE (player update the state within
    //     a stage: from LOADING to DONE)
    this.acm.notify = this.options.notify || {};

    // #### PlayerServer.acm.forwardAll
    // If TRUE all DATA and TXT messages (regardless to the recipient)
    // will be forwarded to the admins. Default: FALSE
    this.acm.forwardAll = this.options.forwardAllMessages || false;

    // #### PlayerServer.acm.getFromAdmins
    // If TRUE players will be able to send GET messages to admins and get
    // back the result. Default: FALSE
    this.acm.getFromAdmins = this.options.getFromAdmins || false;
}

// ## PlayerServer methods

/**
 * ### PlayerServer.attachCustomListeners
 *
 * Implements `GameServer.attachCustomListeners`
 */
PlayerServer.prototype.attachCustomListeners = function() {
    var that = this,
    sys = this.sysLogger,
    say = action.SAY + '.',
    set = action.SET + '.',
    get = action.GET + '.';

    // #### connecting
    // Listens on newly connected players
    this.on('connecting', function(clientObj, roomName) {
        var room, clientId;
        clientId = clientObj.id;
        room = that.channel.gameRooms[roomName];
        that.notifyRoomConnection(clientId, room);
    });

    // #### re-connecting
    // TODO: cleanup code, maybe merge with connecting.
    this.on('re-connecting', function(clientObj, roomName) {
        var room, admins, clientId;
        var pConnectMsg;

        clientId = clientObj.id;
        room = that.channel.gameRooms[roomName];
        admins = room.clients.admin;

        pConnectMsg = that.msg.create({
            target: 'PRECONNECT',
            data:   clientObj,
            from:   clientId
        });

        // Unlike connect msgs, reconnect msgs are sent always just to admins.
        // Admins decides what to do with it.

        // Notifies the monitors that a new player connected.
        that.socketManager.send2group(pConnectMsg, admins);
    });

    // #### say.TXT
    // Listens on say.TXT messages.
    this.on(say + 'TXT', this.standardPlayerMsg);

   // #### say.DATA
    // Listens on say.DATA messages.
    this.on(say + 'DATA', this.standardPlayerMsg);


    // #### set.DATA
    // Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        var room, roomName;

        roomName = msg._roomName || that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.set.DATA: Could not determine room of ' +
                    'sender: ' + msg.from, 'error');
            return;
        }

        that.socketManager.send2roomAdmins(msg, room);
    });

    // #### say.PLAYER_UPDATE
    // Listens on say.PLAYER_UPDATE messages
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        var room, roomName;
        roomName = msg._roomName || that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.say.PLAYER_UPDATE: Could not ' +
                    'determine room of sender: ' + msg.from, 'error');
            return;
        }

        // StateLevel is never passed to other players.
        if ((room.acm.notify.onStageUpdate && msg.text === 'stage') ||
            (msg.text === 'stageLevel' && (room.acm.notify.onStageLevelUpdate ||
              (room.acm.notify.onStageLoadedUpdate &&
               msg.data.stageLevel === ngc.constants.stageLevels.LOADED)))) {

            that.socketManager.broadcast2room(msg, room, msg.from);
        }
        else {

            that.socketManager.send2roomAdmins(msg, room);
        }
    });

    // #### say.STAGE
    // Listens on say.STAGE messages
    this.on(say + 'STAGE', function(msg) {
        // TODO: should registry's Player object get updated?
        var room, roomName;

        roomName = msg._roomName || that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.say.STAGE: Could not ' +
                    'determine room of sender: ' + msg.from, 'error');
            return;
        }

        if (room.acm.notify.onStageUpdate) {
            that.socketManager.broadcast2room(msg, room, msg.from);
        }
        else {
            that.socketManager.send2roomAdmins(msg, room);
        }
    });

    // #### say.STAGE_LEVEL
    // Listens on say.STAGE_LEVEL messages
    this.on(say + 'STAGE_LEVEL', function(msg) {
        // TODO: should registry's Player object get updated?
        var room, roomName;

        roomName = msg._roomName || that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.say.STAGE_LEVEL: Could not ' +
                    'determine room of sender: ' + msg.from, 'error');
            return;
        }

        if (room.acm.notify.onStageUpdate) {
            that.socketManager.broadcast2room(msg, room, msg.from);
        }
        else {
            that.socketManager.send2roomAdmins(msg, room);
        }
    });

    // #### get.DATA
    // Listener on get.
    // It ignores ALL, CHANNEL, CHANNEL_X, ROOM_X recipients.
    this.on(get + 'DATA', function(msg) {
        var room, roomName;
        var players, oldPlayers;

        if (J.isEmpty(msg.text)) {
            sys.log('PlayerServer.on.get.DATA: discarded invalid msg without ' +
                    'label.', 'error');
            return;
        }

        if (msg.text.split('.') > 1) {
            sys.log('PlayerServer.on.get.DATA: discarded invalid msg with ' +
                    '"." character in the label.', 'error');
            return;
        }

        roomName = msg._roomName || that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.get.DATA: Could not determine ' +
                    'room of sender: ' + msg.from, 'error');
            return;
        }

        if (msg.to === 'ROOM') {
            if (room.acm.getFromAdmins) {
                that.socketManager.broadcast2room(msg, room, msg.from);
            }
            else {

                players = room.clients.players;
                oldPlayers = players.breed();
                players.id.remove(msg.from);

                that.socketManager.send2group(msg, oldPlayers);
            }
        }

        else if (msg.to === 'SERVER') {

            if (!room.acm.getFromAdmins) return;

            that.socketManager.send2roomAdmins(msg, room);
        }

        else {
            // Msg to a specific client (might be in another room).
            that.socketManager.send2client(msg);
        }

    });

    // #### disconnect
    // Listens on players disconnecting
    this.on('disconnect', function(player, room) {
        var playerName;
        playerName = player.id + ' (sid: ' + player.sid + ')';
        sys.log(that.name + ' client disconnected: ' + playerName);

        that.notifyRoomDisconnection(player.id, room);
    });

    // #### shutdown
    // Listens on server shutdown
    this.sio.sockets.on('shutdown', function(message) {
        sys.log('Player server ' + that.name + ' is shutting down');
        // TODO save the state to disk.
    });
};

/**
 * ### PlayerServer.standardPlayerMsg
 *
 * Handles incoming messages to the Player Server
 *
 * Evaluates the _to_ field and calls the right methods from the socket manager.
 *
 * It is used for the following targets: DATA, TXT.
 *
 * Note: it still possible to send messages to admin by specifying the direct
 * the client-id of the recipient.
 *
 * @param {GameMsg} msg The incoming game message
 *
 * @see SocketManager
 */
PlayerServer.prototype.standardPlayerMsg = function(msg) {
    var roomName, room, channel;

    if (msg.to === 'ALL') {
        this.socketManager.broadcast2all(msg);
    }
    else if (msg.to === 'CHANNEL') {
        this.socketManager.broadcast2ownChannel(msg);
    }
    else if (msg.to === 'ROOM') {
        this.socketManager.broadcast2ownRoom(msg);
    }
    else if (msg.to === 'CHANNEL_X') {
        this.socketManager.broadcast2channel(msg, msg._to);
    }
    else if (msg.to === 'ROOM_X') {
        this.socketManager.broadcast2room(msg, msg._to);
    }
    else {
        roomName = msg._roomName || this.registry.getClientRoom(msg.from);
        room = this.channel.gameRooms[roomName];
        if (!room) {
            sys.log('PlayerServer.on.' + msg.toEvent() + ': Could not ' +
                    'determine room of msg sender: ' + msg.from, 'error');
            return;
        }

        if (msg.to === 'SERVER' || room.acm.forwardAll) {
            // Send to admins in sender's room.
            this.socketManager.send2roomAdmins(msg, room);
        }

        if (msg.to !== 'SERVER') {
            // Send to receiving player.
            this.socketManager.send2client(msg);
        }
    }
};

/**
 * ## PlayerServer.notifyRoomConnection
 *
 * Implements GameServer.notifyRoomConnection
 */
PlayerServer.prototype.notifyRoomConnection = function(clientId, roomObj) {
    var players, admins, oldPlayers, filteredPlayers;
    var pConnectMsg;

    players = roomObj.clients.player;
    admins = roomObj.clients.admin;
    oldPlayers = players.breed();
    oldPlayers.id.remove(clientId);

    pConnectMsg = this.msg.create({
        target: 'PCONNECT',
        from:    clientId,
        data:    { id:  clientId }
    });

    // Send notification to other players (if allowed).
    if (roomObj.acm.notify.onConnect && oldPlayers.db.length) {

        this.socketManager.broadcast2group(pConnectMsg, oldPlayers);

        // Send the current player list to the new player.
        filteredPlayers = oldPlayers.fetchSubObj('id');
        this.socketManager.send2client(this.msg.create({
            target: 'SETUP',
            to:     clientId,
            text:   'plist',
            data:   J.stringify([filteredPlayers, 'replace'])
        }));
    }
    // Send notification to admin (always).
    this.socketManager.send2group(pConnectMsg, admins);
};

/**
 * ## PlayerServer.notifyRoomDisconnection
 *
 * Implements GameServer.notifyRoomDisconnection
 */
PlayerServer.prototype.notifyRoomDisconnection = function(clientId, roomObj) {
    var pDisconnectMsg;

    pDisconnectMsg = this.msg.create({
        target: 'PDISCONNECT',
        data: { id: clientId }
    });

     // Notify players and admins of disconnection in old room.
    if (roomObj.acm.notify.onConnect) {
        this.socketManager.broadcast2room(pDisconnectMsg, roomObj, clientId);
    }
    // Notify only admins of disconnection in old room.
    else {
        this.socketManager.send2roomAdmins(pDisconnectMsg, roomObj);
    }
};
