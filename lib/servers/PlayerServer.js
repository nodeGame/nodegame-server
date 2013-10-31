/**
 * # PlayerServer
 *
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * GameServer for the players endpoint.
 *
 * Inherits from `GameServer` and attaches special listeners.
 *
 * PlayerServer passes the id of the sender when forwarding msgs
 *
 * ---
 */

// TODO: Restrict sending messages from players within room only.
//       Using directly given client IDs they can send to other players only.

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

    // ## notify
    // Configuration object governing message passing between players. 
    // By default, players are *not* notified of the activities of other players,
    // such as (connection, disconnection, entering a new stage). By changing
    // the value of the properties of this object it is possible to send out
    // notifications of the following types:
    // 
    // - onConnect: sends PCONNECT, and PDISCONNECT
    // - onStageUpdate: sends PLAYER_UPDATE (player enters a new stage / step)
    // - onStageLevelUpdate: sends PLAYER_UPDATE (player update the state within
    //     a stage: from LOADING to DONE)
    this.notify = this.user_options.notifyPlayers || {};
    
    // ## forwardAll
    // If TRUE all DATA and TXT messages (regardless to the recipient) 
    // will be forwarded to the admins. Defaults, FALSE.
    this.forwardAll = this.user_options.forwardAllMessages || false;

    // ## getFromAdmins
    // If TRUE players will be able to send GET messages to admins and get
    // back the result. Defaults, FALSE.
    this.getFromAdmins = this.user_options.getFromAdmins || false;
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

    // ### connecting
    // Listens on newly connected players
    this.on('connecting', function(clientId, socketId) {
        var room, roomName, players, admins, oldPlayers;
        var pConnectMsg;
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
                // data:   J.stringify(oldPlayers.db)
                data:   J.stringify([oldPlayers.db, 'append'])
            }));
        }
        
        // Notifies the monitors that a new player connected.
        that.socket.send2group(pConnectMsg, admins);
    });


    // TODO: cleanup code, maybe merge with connecting. Maybe the room/roomName
    // could be passed as parameter.
    this.on('re-connecting', function(clientId, socketId) {
        var room, roomName, players, admins, oldPlayers;
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
            to:     'ALL',
            data:   {
                id: clientId,
                sid: socketId
            },
            from: clientId
        });
        
        // Unlike connect msgs, reconnect msgs are sent always just to admins.
        // Admins decides what to do with it.
        
        // Notifies the monitors that a new player connected.
        that.socket.send2group(pConnectMsg, admins);
    });

    // ### say.TXT
    // Listens on say.TXT messages
    this.on(say + 'TXT', function(msg) {
        var roomName, room;

        if (msg.to === 'ALL') {  // maybe 'ROOM'?
            that.socket.broadcast(msg);
        }
        else {
            if (msg.to === 'SERVER' || that.forwardAll) {
                // Send to admins in sender's room:

                roomName = that.registry.getClientRoom(msg.from);
                room = that.channel.gameRooms[roomName];

                if (!room) {
                    sys.log('PlayerServer.on.say.TXT: Could not determine ' + 
                            'room of msg sender: ' + msg.from, 'error');
                    return;
                }

                that.socket.send2roomAdmins(msg, room);
            }

            if (msg.to !== 'SERVER') {
                // Send to receiving player:
                that.socket.send2client(msg);
            }
        }
    });

    // ### say.DATA
    // Listens on say.DATA messages
    this.on(say + 'DATA', function(msg) {
        var roomName, room;

        if (msg.to === 'ALL') {  // maybe 'ROOM'?
            that.socket.broadcast(msg);
        }
        else {
            if (msg.to === 'SERVER' || that.forwardAll) {
                // Send to admins in sender's room:

                roomName = that.registry.getClientRoom(msg.from);
                room = that.channel.gameRooms[roomName];

                if (!room) {
                    sys.log('PlayerServer.on.say.DATA: Could not determine ' +
                            'room of msg sender: ' + msg.from, 'error');
                    return;
                }

                that.socket.send2roomAdmins(msg, room);
            }

            if (msg.to !== 'SERVER') {
                // Send to receiving player:
                that.socket.send2client(msg);
            }
        }
    });

    // ### set.DATA
    // Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        var room, roomName;
        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('PlayerServer.on.set.DATA: Could not determine room of ' +
                    'sender: ' + msg.from, 'error');
            return;
        }

        that.socket.send2roomAdmins(msg, room);
    });

    // ### say.PLAYER_UPDATE
    // Listens on say.PLAYER_UPDATE messages
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        var room, roomName;

        // StateLevel is never passed to other players.
        if ((that.notify.onStageUpdate && msg.text === 'stage') ||
            (that.notify.onStageLevelUpdate && msg.text === 'stageLevel')) {

            that.socket.broadcast(msg, msg.from);
        }
        else {
            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.PLAYER_UPDATE: Could not ' +
                        'determine room of sender: ' + msg.from, 'error');
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
            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.STAGE: Could not determine room ' +
                        'of sender: ' + msg.from, 'error');
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
            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                sys.log('PlayerServer.on.say.STAGE_LEVEL: Could not ' +
                        'determine room of sender: ' + msg.from, 'error');
                return;
            }

            that.socket.send2roomAdmins(msg, room);
        }
    });

    // ### get.DATA
    // Listener on get (Experimental)
    this.on(get + 'DATA', function (msg) {
        var room, roomName
        var players, oldPlayers;
        
        // TODO: refactor, too many if. 
        // Maybe we need new methods in SocketManager
        if (msg.to === 'ALL') {
            if (that.getFromAdmins) {
                that.socket.broadcast(msg, msg.from);
            }
            else {
                
                roomName = that.registry.getClientRoom(msg.from);
                room = that.channel.gameRooms[roomName];
                
                if (!room) {
                    sys.log('PlayerServer.on.get.DATA: Could not determine ' + 
                            'room of sender: ' + msg.from, 'error');
                    return;
                }

                players = room.clients.players;
                oldPlayers = players.breed();
                players.id.remove(msg.from);
                
                that.socket.send2group(msg, oldAdmins);
            }
        }
        else if (msg.to === 'SERVER') {
            if (!that.getFromAdmins) return;

            roomName = that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];
            
            if (!room) {
                sys.log('PlayerServer.on.get.DATA: Could not determine room ' +
                        'of sender: ' + msg.from, 'error');
                return;
            }
            
            that.socket.send2roomAdmins(msg, room);
        }
        // Msg to a specific client.
        // TODO check that the client is in the same game room.
        else {
            that.socket.send2client(msg);
        }
        
    });

    // ### disconnect
    // Listens on players disconnecting
    this.on('disconnect', function (player, room) {
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

    // ### shutdown
    // Listens on server shutdown
    this.sio.sockets.on("shutdown", function(message) {
        sys.log('Player server ' + that.name + ' is shutting down');
        // TODO save the state to disk
    });
};
