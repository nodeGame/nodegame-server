/**
 * # PlayerServer
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * GameServer for the players endpoint.
 *
 * Inherits from `GameServer` and attaches special listeners.
 *
 * PlayerServer passes the id of the sender when forwarding msgs
 *
 * ---
 *
 * Technical notes:
 *
 * Forward must be done always after a SEND, because it can modifies the .to
 * and .forward properties of the message.
 *
 *
 */

// # Global scope

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
function PlayerServer(options) {
    GameServer.call(this, options);

    this.notify = this.user_options.notifyPlayers || {};
    this.forwardAll = ('undefined' === typeof this.user_options.forwardAllMessages) ?
        true : this.user_options.forwardAllMessages;
}

// ## PlayerServer methods

/**
 * ### PlayerServer.attachCustomListeners
 *
 * Implements the abstract method from `GameServer` with listeners
 * specific to the players endpoint
 *
 */
PlayerServer.prototype.attachCustomListeners = function() {
    var that = this,
        sys = this.sysLogger,
        say = action.SAY + '.',
        set = action.SET + '.',
        get = action.GET + '.';

// ## LISTENERS

// ### say.HI
// Listens on newly connected players
    this.on('connecting', function(clientId, socketId) {
        var room, roomName, players, admins, oldPlayers;
        sys.log('Incoming player: ' + clientId);
        roomName = that.registry.getClientRoom(clientId);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.connecting: Could not determine room for incoming player: ' + clientId, 'error');
            return;
        }

        players = room.clients.player;
        admins = room.clients.admin;
        oldPlayers = players.breed();
        oldPlayers.remove(clientId);

        pConnectMsg = that.msg.create({
            target: 'PCONNECT',
            to:     'ALL',
            data:   {
                id: clientId,
                sid: socketId
            },
            from: clientId
        });

        // The player list is shared among player-clients only if the server
        // setup allows it.
        if (that.notify.onConnect) {
            // Notify all the connected players that a new one just connected.
            that.socket.broadcast2group(pConnectMsg, oldPlayers);

            // Send the list of connected players to the new player
            that.socket.send2client(that.msg.create({
                target: 'SETUP',
                to:     clientId,
                text:   'plist',
                data:   J.stringify([oldPlayers.db, 'append'])
            }));
        }
        
        // Notifies the monitors that a new player connected.
        that.socket.send2group(pConnectMsg, admins);
    });

// ### say.HI_AGAIN
// Listens on reconnecting players
//    this.on(say + 'HI_AGAIN', function(msg) {
//        var player, pConnectMsg;
//        sys.log('Returning PLAYER: ' + msg.from);
//        player = that.disconnected.pop(msg.data.id);
//
//        if (player) {
//            // Update the socket id with the old id
//            that.socket.id = player.id;
//
//            that.emit(say + 'HI', msg);
//        }
//        else {
//            sys.log('Received HI_AGAIN message, but player was not in the disconnected list: ' + msg.from);
//        }
//
//    });

// ### say.TXT
// Listens on say.TXT messages
    this.on(say + 'TXT', function(msg) {
        if (that.forwardAll) {
            that.socket.broadcast(msg, msg.from);
        }
        else {
            // TODO: "broadcast2players"
        }
    });

// ### say.DATA
// Listens on say.DATA messages
    this.on(say + 'DATA', function(msg) {
        if (that.forwardAll) {
            // TODO: handle msg.to == specific ID
            that.socket.broadcast(msg, msg.from);
        }
        else {
            // TODO: handle msg.to == 'SERVER'
            // TODO: "broadcast2players"
        }
    });

// ### set.DATA
// Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        // Creates a copy of monitors' memory object here
        // if a local memory object is present
        //if (that.partner.memory) {
        //    that.partner.memory.add(msg.text, msg.data, msg.from);
        //}

        var room, roomName;
        roomName = that.registry.getClientRoom(msg.to);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.set.DATA: Could not determine room of sender: ' + msg.to, 'error');
            return;
        }

        that.socket.send2roomAdmins(msg, room);
    });



// ### say.PLAYER_UPDATE
// Listens on say.PLAYER_UPDATE messages
// TODO
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        // TODO: if it is not sent, the observer does not get informed
        // about player change but a client gets back its own msg, too

        var room, roomName;

        if ((that.notify.onStageUpdate && msg.data.hasOwnProperty('stage')) ||
            (that.notify.onStageLevelUpdate && msg.data.hasOwnProperty('stageLevel'))) {

            that.socket.broadcast(msg, msg.from);
        }
        else {
            roomName = that.registry.getClientRoom(msg.to);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.PLAYER_UPDATE: Could not determine room of sender: ' + msg.to, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
        }
    });

// ### say.STAGE
// Listens on say.STAGE messages
    this.on(say + 'STAGE', function(msg) {
        // TODO: should registry's Player object get updated?

        var room, roomName;

        if (that.notify.onStageUpdate) {
            that.socket.broadcast(msg, msg.from);
        }
        else {
            roomName = that.registry.getClientRoom(msg.to);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.STAGE: Could not determine room of sender: ' + msg.to, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
        }
    });

// ### say.STAGE_LEVEL
// Listens on say.STAGE_LEVEL messages
    this.on(say + 'STAGE_LEVEL', function(msg) {
        // TODO: should registry's Player object get updated?

        //msg.to = 'ALL';

        var room, roomName;

        if (that.notify.onStageUpdate) {
            that.socket.broadcast(msg, msg.from);
        }
        else {
            roomName = that.registry.getClientRoom(msg.to);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.STAGE_LEVEL: Could not determine room of sender: ' + msg.to, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
        }
    });

// ### get.DATA
// Listener on get (Experimental)
    this.on(get + 'DATA', function (msg) {
        //console.log(this.pl);
        //console.log('HERE P!!!');
        // Ask a random player to send the game;
        // var p = this.pl.getRandom();
        // that.msg.sendDATA('get', 'ABC', msg.from, msg.txt);

    });

// ### disconnect
// Listens on players disconnecting
    this.on('disconnect', function (player) {
        var msg, playerName, roomName, room;

        playerName = player.id + ' (sid: ' + player.sid + ')';
        sys.log(that.name + ' client disconnected: ' + playerName);

        msg = that.msg.create({
            target: 'PDISCONNECT',
            to: 'ALL',
            data: player
        });

        if (that.notify.onConnect) {
            that.socket.send(msg);
        }
        else {
            roomName = that.registry.getClientRoom(msg.to);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.disconnect: Could not determine room for disconnecting player: ' + msg.to, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
        }
    });

// ### shutdown
// Listens on server shutdown
    this.sio.sockets.on("shutdown", function(message) {
        sys.log('Player server ' + that.name + ' is shutting down');
        // TODO save the state to disk
    });
};

