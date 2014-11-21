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

    // ### PlayerServer.notify
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
    this.notify = this.options.notify || {};

    // ### PlayerServer.forwardAll
    // If TRUE all DATA and TXT messages (regardless to the recipient)
    // will be forwarded to the admins. Default: FALSE
    this.forwardAll = this.options.forwardAllMessages || false;

    // ### PlayerServer.getFromAdmins
    // If TRUE players will be able to send GET messages to admins and get
    // back the result. Default: FALSE
    this.getFromAdmins = this.options.getFromAdmins || false;

    // ### PlayerServer.ADMIN_SERVER
    // Flag to distinguish from Admin Server at execution time.
    this.ADMIN_SERVER = false;
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
    this.on('connecting', function(clientObj) {
        var room, roomName, players, admins, oldPlayers, clientId, socketId;
        var filteredPlayers;
        var pConnectMsg;

        clientId = clientObj.id;
        socketId = clientObj.sid;
        sys.log('Incoming player: ' + clientId);
        roomName = that.registry.getClientRoom(clientId);
        room = that.channel.gameRooms[roomName];
        if (!room) {
            sys.log('PlayerServer.on.connecting: Could not determine room ' +
                    'for incoming player: ' + clientId, 'error');
            return;
        }

        players = room.clients.player;
        admins = room.clients.admin;
        oldPlayers = players.breed();
        oldPlayers.id.remove(clientId);

        pConnectMsg = that.msg.create({
            target: 'PCONNECT',
            from:   clientId
        });

        // The player list is shared among player-clients only if the server
        // setup allows it.
        if (that.notify.onConnect && oldPlayers.db.length > 0) {
            // Notify all the connected players that a new one just connected.
            pConnectMsg.data = {
                id:  clientId
            };
            that.socket.broadcast2group(pConnectMsg, oldPlayers);

            // Send the ids and sids of connected players to the new player.
            filteredPlayers = oldPlayers.fetchSubObj('id');
            that.socket.send2client(that.msg.create({
                target: 'SETUP',
                to:     clientId,
                text:   'plist',
                data:   J.stringify([filteredPlayers, 'append'])
            }));
        }
        // Notifies the monitors that a new player connected.
        pConnectMsg.data = clientObj;
        that.socket.send2group(pConnectMsg, admins);
    });

    // #### re-connecting
    // TODO: cleanup code, maybe merge with connecting. Maybe the room/roomName
    // could be passed as parameter.
    this.on('re-connecting', function(clientObj) {
        var room, roomName, players, admins, oldPlayers, clientId, socketId;
        var pConnectMsg;

        clientId = clientObj.id;
        socketId = clientObj.sid;
        sys.log('Returning player: ' + clientId);
        roomName = that.registry.getClientRoom(clientId);
        room = that.channel.gameRooms[roomName];
        if (!room) {
            sys.log('PlayerServer.on.re-connecting: Could not determine room ' +
                    'for returning player: ' + clientId, 'error');
            return;
        }

        players = room.clients.player;
        admins = room.clients.admin;
        oldPlayers = players.breed();
        oldPlayers.id.remove(clientId);

        pConnectMsg = that.msg.create({
            target: 'PRECONNECT',
            data:   clientObj,
            from:   clientId
        });

        // Unlike connect msgs, reconnect msgs are sent always just to admins.
        // Admins decides what to do with it.

        // Notifies the monitors that a new player connected.
        that.socket.send2group(pConnectMsg, admins);
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

        that.socket.send2roomAdmins(msg, room);
    });

    // #### say.PLAYER_UPDATE
    // Listens on say.PLAYER_UPDATE messages
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        var room, roomName;

        // StateLevel is never passed to other players.
        if ((that.notify.onStageUpdate && msg.text === 'stage') ||
            (msg.text === 'stageLevel' && (that.notify.onStageLevelUpdate ||
              (that.notify.onStageLoadedUpdate &&
               msg.data.stageLevel === ngc.constants.stageLevels.LOADED)))) {

            that.socket.broadcast2ownRoom(msg, msg.from);
        }
        else {
            roomName = msg._roomName || that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.PLAYER_UPDATE: Could not ' +
                        'determine room of sender: ' + msg.from, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
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

        if (that.notify.onStageUpdate) {
            that.socket.broadcast2room(msg, room, msg.from);
        }
        else {
            that.socket.send2roomAdmins(msg, room);
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

        if (that.notify.onStageUpdate) {
            that.socket.broadcast2room(msg, room, msg.from);
        }
        else {
            that.socket.send2roomAdmins(msg, room);
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

        if (msg.to === 'ROOM') {
            if (that.getFromAdmins) {
                that.socket.broadcast2ownRoom(msg, msg.from);
            }
            else {
                roomName =
                    msg._roomName || that.registry.getClientRoom(msg.from);
                room = that.channel.gameRooms[roomName];

                if (!room) {
                    sys.log('PlayerServer.on.get.DATA: Could not determine ' +
                            'room of sender: ' + msg.from, 'error');
                    return;
                }

                players = room.clients.players;
                oldPlayers = players.breed();
                players.id.remove(msg.from);

                that.socket.send2group(msg, oldPlayers);
            }
        }

        else if (msg.to === 'SERVER') {
            if (!that.getFromAdmins) return;

            roomName = msg._roomName || that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.get.DATA: Could not determine room ' +
                        'of sender: ' + msg.from, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
        }

        else {
            // Msg to a specific client (might be in another room).
            that.socket.send2client(msg);
        }

    });



    // #### disconnect
    // Listens on players disconnecting
    this.on('disconnect', function(player, room) {
        var msg, playerName;

        playerName = player.id + ' (sid: ' + player.sid + ')';
        sys.log(that.name + ' client disconnected: ' + playerName);

        msg = that.msg.create({
            target: 'PDISCONNECT',
            from: player.id,
            to: 'ALL',
            data: player
        });
        if (that.notify.onConnect) {
            that.socket.send2room(msg, room);
        }
        else {
            that.socket.send2roomAdmins(msg, room);
        }
    });

    // #### shutdown
    // Listens on server shutdown
    this.sio.sockets.on("shutdown", function(message) {
        sys.log('Player server ' + that.name + ' is shutting down');
        // TODO save the state to disk
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
        this.socket.broadcast2all(msg);
    }
    else if (msg.to === 'CHANNEL') {
        this.socket.broadcast2ownChannel(msg);
    }
    else if (msg.to === 'ROOM') {
        this.socket.broadcast2ownRoom(msg);
    }
    else if (msg.to === 'CHANNEL_X') {
        this.socket.broadcast2channel(msg, msg._to);
    }
    else if (msg.to === 'ROOM_X') {
        this.socket.broadcast2room(msg, msg._to);
    }
    else {
        if (msg.to === 'SERVER' || this.forwardAll) {
            // Send to admins in sender's room:

            roomName = msg._roomName || this.registry.getClientRoom(msg.from);
            room = this.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.' + msg.toEvent() + ': Could not ' +
                        'determine room of msg sender: ' + msg.from, 'error');
                return;
            }

            this.socket.send2roomAdmins(msg, room);
        }

        if (msg.to !== 'SERVER') {
            // Send to receiving player:
            this.socket.send2client(msg);
        }
    }
};
