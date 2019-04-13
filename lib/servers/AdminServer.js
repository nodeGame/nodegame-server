/**
 * # AdminServer
 * Copyright(c) 2019 Stefano Balietti <ste@nodegame.org>
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

var path = require('path');

var GameServer = require('./../GameServer'),
    GameRoom = require('./../rooms/GameRoom');
var Logger = require('./../Logger');

var fs = require('fs');
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

    this.on('connecting', function(clientObj, roomName) {
        var room, clientId, str;

        clientId = clientObj.id;
        room = that.channel.gameRooms[roomName];

        // Log connection.
        str = 'Incoming ' + (room.type === 'Garage' ? 'monitor: ' : 'logic: ');
        sys.log(str + clientId);

        that.notifyRoomConnection(clientObj, room);
    });

    // TODO: cleanup code, maybe merge with connecting.
    this.on('re-connecting', function(clientObj, roomName) {
        var msg, room, roomName, clientId, str;

        clientId = clientObj.id;
        room = that.channel.gameRooms[roomName];

        // Log re-connection.
        str = 'Returning ' + (room.type === 'Garage' ? 'monitor: ' : 'logic: ');
        sys.log(str + clientId);

        msg = that.msg.create({
            target: 'MRECONNECT',
            data:   clientObj,
            from:   clientId
        });

        // Unlike connect msgs, reconnect msgs are sent always just to admins.
        // Admins decides what to do with it.
        that.socketManager.broadcast2group(msg, room.clients.admin, clientId);
    });

    // ### disconnect
    // Listens on admins disconnecting
    this.on('disconnect', function(clientObj, room) {
        var clientName, room, type;
        clientName = clientObj.id + ' (sid: ' + clientObj.sid + ')';

        // Log connection.
        type = room.type === 'Garage' ? 'monitor' : 'logic';
        sys.log(that.name + ' ' + type + ' disconnected: ' + clientName);

        that.notifyRoomDisconnection(clientObj, room);
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

    // ### get.SERVERCOMMAND_DISCONNECT
    // Disconnects a client from server
    this.on('SERVERCOMMAND_DISCONNECT', function(data, from) {
        var id, socket, channel, server;

        if ('object' !== typeof data) {
            sys.log('AdminServer.on.SERVERCOMMAND_DISCONNECT: wrong data ' +
                    'parameter : ' + data, 'error');
            return;
        }

        if ('string' !== typeof data.id || 'string' !== typeof data.sid) {

            sys.log('AdminServer.on.SERVERCOMMAND_DISCONNECT: data.id ' +
                    'anda data.sid must be string : ' + data.id, 'error');
            return;
        }

        // Fetching the channel of the client to disconnect
        // (default: this channel).
        channel = 'string' === typeof data.channel ?
            data.channel : that.channel;

        // Player or Admin server (default 'player').
        if ('admin' === typeof data.server ||
            'player' === typeof data.server) {

            server = data.server;
        }
        else {
            server = 'player';
        }

        id = data.id;
        sys.log('AdminServer.on.SERVERCOMMAND_DISCONNECT: disconnecting ', id);

        socket = channel[server + 'Server'].socketManager.clients[id];

        if (!socket) {
            sys.log('AdminServer.on.SERVERCOMMAND_DISCONNECT: could not ' +
                    'find socket for client: ' + id, 'error');
            return;
        }

        socket.disconnect(data.sid);
        sys.log('AdminServer.on.SERVERCOMMAND_DISCONNECT: disconnected ', id);
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
                    'invalid field: ' + rc, 'error');
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

    // @experimental
    // ### get.SERVERCOMMAND_UPDATE_SETTINGS
    this.on('SERVERCOMMAND_UPDATE_SETTINGS', function(data, from) {
        var room, p, settings;
        if ('object' !== typeof data.update) {
            sys.log('AdminServer.on.SERVERCOMMAND_UPDATE_SETTINGS: update ' +
                    'must be object. Found: ' + data.update, 'error');
            return;
        }
        settings = that.servernode.info.games[that.name];
        if (data.type === 'waitroom') {
            // TODO: get room id for security.
            // room = that.servernode.rooms[data.roomId];
            // if (!room) {
            //   sys.log('AdminServer.on.SERVERCOMMAND_UPDATE_SETTINGS: room ' +
            // 'not found: ' + data.roomId, 'error');
            //    return;
            // }
            room = that.channel.waitingRoom;
            for (p in data.update) {
                if (data.update.hasOwnProperty(p)) {
                    room.update(p, data.update[p]);
                }
            }
            // This is because monitor gets them from here.
            // TODO: check settings mixed in.
            J.mixin(settings.waitroom, data.update);

            if (!data.levels) return;

            // TODO: continue here.
            // for (p in data.levels) {
            //     if (data.update.hasOwnProperty(p)) {
            //        room.update(p, data.update[p]);
            //     }
            // }

        }
        else if (data.type === 'settings') {
            settings = settings.settings;
            if (data.treatment) {
                if (!settings[data.treatment]) {
                    sys.log('AdminServer.on.SERVERCOMMAND_UPDATE_SETTINGS: ' +
                            'treatment not found:' + data.treatment, 'error');
                    return;
                }
                // TODO: check settings mixed in.
                J.mixin(settings[data.treatment], data.update);
            }
            else {
                // Update all treatments.
                for (p in settings) {
                    if (settings.hasOwnProperty(p)) {
                        J.mixin(settings[p], data.update);
                    }
                }
            }
        }
        else if (data.type) {
            sys.log('AdminServer.on.SERVERCOMMAND_UPDATE_SETTINGS: unknown ' +
                    'type: ' + data.type, 'error');
            return;
        }
    });

    // @experimental
    // ### get.SERVERCOMMAND_JOINROOM
    this.on('SERVERCOMMAND_JOINROOM', function(data, from) {
        var origRoom, newRoom;

        if (data.roomId) {
            newRoom = that.servernode.rooms[data.roomId];
        }
        else if (data.roomName) {
            newRoom = that.channel.gameRooms[data.roomName];
        }

        if (!newRoom) {
            sys.log('AdminServer.on.SERVERCOMMAND_JOINROOM: room not found: ' +
                    data.roomId || data.roomName, 'error');
            return;
        }

        origRoom = that.registry.getClientRoom(from);

        if (origRoom) {
            that.channel.moveClient(from, newRoom.name);
        }
        else {
            that.channe.placeClient(from, newRoom.name);
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
        var dataDir;
        var replyData;
        var channel;
        var channelName, chanObj;
        var room, roomObj, tmp;
        var gameName, gamesInfo, p, logicObj;

        if (data.type === 'CHANNELS') {
            // Fill replyData with channel info:
            replyData = J.clone(that.servernode.info.channels);

            if (data.extraInfo) {
                for (channelName in replyData) {
                    if (replyData.hasOwnProperty(channelName) &&
                        that.servernode.channels.hasOwnProperty(channelName)) {

                        chanObj = that.servernode.channels[channelName];
                        replyData[channelName] = chanObj.getLiveInfo();
                        replyData[channelName].name = channelName;
                        if (that.channel.name === channelName) {
                            replyData[channelName].ownChannel = true;
                        }
                    }
                }
            }

            that.socketManager.send2client(that.msg.create({
                text: 'INFO_CHANNELS',
                data: replyData,
                to:   from
            }));
        }
        else if (data.type === 'ROOMS') {
            if (!that.servernode.channels.hasOwnProperty(data.channel)) {
                sys.log('AdminServer.on.SERVERCOMMAND_INFO.ROOMS: ' +
                        'data.channel is invalid. Found: ' +
                        data.channel, 'error');
                return;
            }
            chanObj = that.servernode.channels[data.channel];

            // Fill replyData with room info:
            replyData = [];

            for (room in chanObj.gameRooms) {
                if (chanObj.gameRooms.hasOwnProperty(room)) {
                    roomObj = chanObj.gameRooms[room];
                    tmp = {
                        name:       room,
                        id:         roomObj.id,
                        type:       roomObj.roomType,
                        roomOpen:   roomObj.roomOpen,
                        nClients:   J.size(roomObj.clients.db),
                        nPlayers:   J.size(roomObj.clients.player.db),
                        nAdmins:    J.size(roomObj.clients.admin.db),
                        // For example, the Garage room has no logic.
                        logicStage: roomObj.node ?
                            roomObj.node.player.stage : 'N/A'
                    };
                    // TODO: connected/disconnected etc.

                    // Add sequence if it is a game room.
                    if (roomObj.roomType === 'Game') {
                        tmp.sequence = roomObj.node.game.plot.stager.sequence;
                        tmp.treatmentName = roomObj.treatmentName;
                    }
                    replyData.push(tmp);
                }
            }

            that.socketManager.send2client(that.msg.create({
                text: 'INFO_ROOMS',
                data: {
                    rooms: replyData,
                    channel: chanObj.getLiveInfo()
                },
                to:   from
            }));
        }
        else if (data.type === 'CLIENTS') {
          //   if (!that.servernode.channels.hasOwnProperty(data.channel)) {
          //       sys.log('AdminServer.on.SERVERCOMMAND_INFO.CLIENTS: ' +
          //               'data.channel is invalid. Found: ' +
          //               data.channel, 'error');
          //       return;
          //   }
          //   chanObj = that.servernode.channels[data.channel];

            // Get room object.
            if (!that.servernode.rooms.hasOwnProperty(data.roomId)) {
                sys.log('AdminServer.on.SERVERCOMMAND_INFO.CLIENTS: ' +
                        'data.roomId is invalid. Found: ' +
                        data.roomId, 'error');
                return;
            }
            roomObj = that.servernode.rooms[data.roomId];

            // Fill replyData with client info:
            // TODO: Send only specific client data, not everything;
            //       send _paused_ field
            replyData = {
                clients: roomObj.clients.db,
                nClients: J.size(roomObj.clients.db),
                nPlayers: J.size(roomObj.clients.player.db),
                nAdmins: J.size(roomObj.clients.admin.db)
            };

            logicObj = roomObj.node;
            // Some rooms, e.g. GarageRoom, have no logic.
            if (logicObj) {
                // TODO: paused is not in registry. Should it?
                replyData.logic = {
                    stage: logicObj.player.stage,
                    stageLevel: logicObj.player.stageLevel,
                    stateLevel: logicObj.player.stateLevel,
                    id: logicObj.player.id,
                    sid: logicObj.player.sid,
                    admin: true,
                    paused: logicObj.game.paused,
                    clientType: 'logic',
                    lang: logicObj.player.lang
                };
            }

            that.socketManager.send2client(that.msg.create({
                text: 'INFO_CLIENTS',
                data: replyData,
                to:   from
            }));
        }
        else if (data.type === 'GAMES') {
            gamesInfo = that.servernode.getGamesInfo();
            replyData = {};

            // Substitute the clientType functions with their keys.
            for (gameName in gamesInfo) {
                if (gamesInfo.hasOwnProperty(gameName)) {
                    replyData[gameName] = {};
                    for (p in gamesInfo[gameName]) {
                        if (gamesInfo[gameName].hasOwnProperty(p)) {
                            // Do not send dir for now.
                            if (p === 'dir') continue;
                            if (p === 'clientTypes' || p === 'levels') {
                                tmp = Object.keys(gamesInfo[gameName][p]);
                            }
                            else if (p === 'setup' ||
                                     p === 'requirements' ||
                                     p === 'waitroom' ||
                                     p === 'settings') {

                                tmp = tryStringify(gamesInfo[gameName][p]);
                            }
                            else {
                                tmp = gamesInfo[gameName][p];
                            }

                            replyData[gameName][p] = tmp;

                            // Remove extra requirements info for widget.
                            if (p === 'requirements') {
                                delete replyData[gameName][p].requirements;
                            }
                        }
                    }
                }
            }

            that.socketManager.send2client(that.msg.create({
                text: 'INFO_GAMES',
                data: replyData,
                to:   from
            }));
        }
        else if (data.type === 'RESULTS') {
            dataDir = that.channel.getGameDir() + 'data';

            replyData = {
                lastModified: null,
                files: []
            };
            traverseDirectory(dataDir, function(filePath, stat) {
                var d;
                // Save last modification date.
                d = Date.parse(stat.mtime);
                if (!replyData.lastModified || d > replyData.lastModified) {
                    replyData.lastModified = d;
                }
                replyData.files.push([
                    { file: filePath.replace(dataDir + '/','') },
                    { mtime: stat.mtime }
                ]);
            }, function() {
                // Convert date and send.
                that.socketManager.send2client(that.msg.create({
                    text: 'INFO_RESULTS',
                    data: replyData,
                    to:   from
                }));
            });
        }
        else if (data.type === 'AUTH') {
            channel = that.channel;
            dataDir = channel.getGameDir() + 'data';

            replyData = {
                settings: channel.gameInfo.auth,
                totalPlayerIds: channel.registry.clients.player.size()
            };

            if (replyData.settings.claimId) {
                // TODO: update if claimId procedure changes in AdminServer.
                replyData.claimedId = channel.registry.clients.nddb_pointer;
            }

            that.socketManager.send2client(that.msg.create({
                text: 'INFO_AUTH',
                data: replyData,
                to:   from
            }));

        }
        else if (data.type === 'LOGS') {
            dataDir = that.servernode.logDir;
            replyData = [];
            traverseDirectory(dataDir, function(filePath, stat) {
                if (path.extname(filePath) === '.log') {
                    replyData.push(path.basename(filePath));
                }
            }, function() {
                that.socketManager.send2client(that.msg.create({
                    text: 'INFO_LOGS',
                    data: replyData,
                    to:   from
                }));
            }, 1);
        }
        else if (data.type === 'VERSIONS') {
            this.socketManager.send2client(that.msg.create({
                text: 'INFO_VERSIONS',
                data: {
                    modules: this.servernode.modulesVersion,
                    server: this.servernode.version,
                    nodegame: this.servernode.nodeGameVersion
                },
                to: from
            }));
        }

        // TODO: CLIENTS (admins or players),
        //       SERVERCONF,
        //       UPTIME
    });

    // ### get.SERVERCOMMAND_WAITROOMCOMMAND
    // Listener to `WAITROOMCOMMAND` to OPEN, CLOSE and DISPATCH waitRoom
   this.on('SERVERCOMMAND_WAITROOMCOMMAND', function(data, from) {
       var room;

       room = that.servernode.rooms[data.roomId];
       // open close wait room
       if (data.type === 'CLOSE') {
           room.closeRoom();
       }
       else if (data.type === 'OPEN') {
           room.openRoom();
       }
       // dispatch a new game
       else if (data.type === 'DISPATCH') {
           room.dispatch({
               msg: { over: 'Monitor dispatched game.' },
               numberOfGames: data.numberOfGames,
               groupSize: data.groupSize,
               chosenTreatment: data.chosenTreatment
           });
       }
       else if (data.type === 'PLAYWITHBOTS') {
           room.dispatchWithBots(data.justConnect);
       }
       else {
           sys.log(that.name + ' unkwnon WAITROOMCOMMAND: ' + data.type,
           'warn');
       }
    });

    // ### get.GAMECOMMAND
    // Listener on get.GAMECOMMAND
    // Important: the ID is not obfuscated.
    this.on(get + 'GAMECOMMAND', this.standardGetMsg);

    // ### get.DATA
    // Listener on get.DATA
    // Important: the ID is not obfuscated.
    this.on(get + 'DATA', this.standardGetMsg);


    // ### set.DATA
    // Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        // Experimental
    });

    // ### shutdown
    // Listens on server shutdown
    this.sio.sockets.on("shutdown", function(msg) {
        sys.log('Admin server ' + that.name + ' is shutting down.');
        // TODO save the state to disk.
    });

    // TODO: monitors and admins connected remotely are not updated.
    // It could be set as an option, and should be considered also in
    // HostRoom, where, currently, some properties (like stage) are linked.
    // ### say.PLAYER_UPDATE
    // Listens on say.PLAYER_UPDATE messages
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        var clientObj;
        clientObj = that.registry.getClient(msg.from);
        if (!clientObj) {
            sys.log('Admin server ' + that.name + ' PLAYER_UPDATE msg from ' +
                    'unknwon client: ' + msg.from, 'error');
            return;
        }
        clientObj[msg.text] = msg.data[msg.text];
     });

// ## Old code.

//    // ### say.STAGE
//    // Listens on say.STAGE messages
//    this.on(say + 'STAGE', function(msg) {
//        var origFrom = msg.from;
//        that.socketManager.broadcast(that.msg.obfuscate(msg), origFrom);
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
//        that.socketManager.broadcast(that.msg.obfuscate(msg), origFrom);
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
        this.socketManager.broadcast2all(msg, originalFrom);
    }
    else if (msg.to === 'CHANNEL') {
        this.socketManager.broadcast2ownChannel(msg, originalFrom);
    }
    else if (msg.to === 'ROOM') {
        this.socketManager.broadcast2ownRoom(msg, originalFrom);
    }
    else if (msg.to === 'CHANNEL_X') {
        this.socketManager.broadcast2channel(msg, msg._to, originalFrom);
    }
    else if (msg.to === 'ROOM_X') {
        this.socketManager.broadcast2room(msg, msg._to, originalFrom);
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
            this.socketManager.broadcast2group(msg, admins, originalFrom);
        }
        else {
            // Experimental code.
            //////////////////////////////////////////////////////
            if (msg.to === 'MONITOR') {
                // Making sure it exists.
                // TODO: remove all this after we are sure.
                var monitorId;
                monitorId = this.channel.garageRoom;
                if (monitorId) monitorId = monitorId.clients.db[0];
                if (monitorId) {
                    monitorId = monitorId.id;
                    msg.to = monitorId;
                    msg._room = this.channel.garageRoom.id;
                }
            }
            /////////////////////////////////////////////////////

            // Send to single recipient.
            this.socketManager.send2client(msg);
        }
    }
};

/**
 * ### AdminServer.standardAdmin2PlayerMsg
 *
 * Handles incoming messages to the Admin Server directed to players only.
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
        this.socketManager.send2allPlayers(msg);
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
            this.socketManager.send2channelPlayers(msg, room.channel);
        }
        else if (msg.to === 'ROOM') {
            this.socketManager.send2roomPlayers(msg, room);
        }
        else if (msg.to === 'CHANNEL_X') {
            this.socketManager.send2channelPlayers(msg, msg._to);
        }
        else if (msg.to === 'ROOM_X') {
            this.socketManager.send2roomPlayers(msg, msg._to);
        }
        else {
            // Send to single recipient (could be admin too).
            this.socketManager.send2client(msg);
        }
    }
};

/**
 * ### AdminServer.standardGetMsg
 *
 * Handles incoming GET messages to the Admin Server
 *
 * Special restrictions applies to the `text` field of the message:
 *   - must be a non-empty string
 *   - cannot contains the dot (.) character
 *
 * Evaluates the _to_ field and calls the right methods from the socket manager.
 *
 * Note: it still possible to send messages to admin by specifying the direct
 * the client-id of the recipient.
 *
 * @param {GameMsg} msg The incoming game message
 *
 * @see SocketManager
 */
AdminServer.prototype.standardGetMsg = function(msg) {
    var room, roomName;
    var admins, oldAdmins;

    if ('string' !== typeof msg.text || msg.text.trim() === '') {
        this.sysLogger.log('AdminServer.on.get.DATA: discarded invalid ' +
                           'msg without label.', 'error');
        return;
    }

    if (msg.text.split('.') > 1) {
        this.sysLogger.log('AdminServer.on.get.DATA: discarded invalid ' +
                           'msg with "." character in the label.', 'error');
        return;
    }

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

        if (msg.to === 'SERVER') {
            // Send to admins in the room:
            roomName =
                msg._roomName || this.registry.getClientRoom(msg.from);
            room = this.channel.gameRooms[roomName];

            if (!room) {
                sys.log('AdminServer.on.get.DATA: Could not determine ' +
                        'room of msg sender: ' + msg.from, 'error');
                return;
            }

            admins = room.clients.admin;
            this.socketManager.broadcast2group(msg, admins);
        }
        else {
            // Send to single recipient.
            this.socketManager.send2client(msg);
        }
    }
};

/**
 * ## AdminServer.notifyRoomConnection
 *
 * Implements GameServer.notifyRoomConnection
 */
AdminServer.prototype.notifyRoomConnection = function(clientObj, roomObj) {
    var players, admins, oldAdmins, clientId;

    clientId = clientObj.id;
    players = roomObj.clients.player;
    admins = roomObj.clients.admin;

    if (admins.db.length > 1) {

        oldAdmins = admins.breed();
        oldAdmins.id.remove(clientId);

        // Notifies other admins that a new one monitor connected.
        this.socketManager.send2group(this.msg.create({
            target: 'MCONNECT',
            data:   { id: clientId },
            from:   clientId
        }), oldAdmins);

        // Send the list of connected admins to the new admin.
        this.socketManager.send2client(this.msg.create({
            target: 'SETUP',
            to:     clientId,
            text:   'mlist',
            data:   [oldAdmins.db, 'replace']
        }));
    }
    // TODO: send only if non-empty?
    // Send the list of connected players to the new admin.
    this.socketManager.send2client(this.msg.create({
        target: 'SETUP',
        to:     clientId,
        text:   'plist',
        data:   [players.db, 'replace']
    }));
};

/**
 * ## AdminServer.notifyRoomDisconnection
 *
 * Implements GameServer.notifyRoomDisconnection
 */
AdminServer.prototype.notifyRoomDisconnection = function(clientObj, roomObj) {
    var msg;
    msg = this.msg.create({
        target: 'MDISCONNECT',
        data: { id: clientObj.id }
    });
    // TODO: send only there are other admins?
    this.socketManager.send2roomAdmins(msg, roomObj);
};

// # Helper methods

/**
 * ## traverseDirectory
 *
 * Applies callback to each file in directory recursively
 *
 * The first time is called without the depth parameter.
 *
 * Maximum depth of recursion is equal to 10.
 *
 * @param {string} directory The directory to explore
 * @param {function} callback The callback to apply to each path
 * @param {function} done The callback to apply when all files in
 *    all directories have been scanned.
 * @param {number} limit Optional. How many nested directory to scan.
 *    Default: 10
 */
function traverseDirectory(directory, callback, done, limit) {
    var attemptDone, pending;
    var depth, limit;

    limit = limit || 10;
    depth = 0;

    // Start with one directory pending (e.g. data/).
    pending = 1;

    attemptDone = function(filePath, stat) {
        if (!filePath) {
            done();
        }
        else {
            callback(filePath, stat);
            if (--pending <= 0) done();
        }
    };

    function recurse(directory, depth) {
        if (depth >= limit) {
            attemptDone();
            return;
        }
        fs.readdir(directory, function(err, files) {
            // TODO: if directory does not exist, an
            // error will be thrown.
            files.forEach(function(file) {
                var filePath;
                // Ignore hidden files/dirs.
                if (file.charAt(0) === '.') return;
                filePath = directory + '/' + file;
                // Every file must be processed.
                pending++;
                fs.stat(filePath, function(err, stat) {
                    // Recurse.
                    if (stat && stat.isDirectory()) {
                        recurse(filePath, depth + 1);
                    }
                    else {
                        attemptDone(filePath, stat);
                    }
                });
            });
            // Directory scanned (was a file in previous scan).
            pending--;
        });
    }

    recurse(directory, depth);
}


/**
 * ## tryStringify
 *
 * Try to stringify an object (should not have cycles)
 *
 * @param {mixed} i The item to stringify
 *
 * @return {string} The stringified item, or a stringified object
 *    containing an error property.
 */
function tryStringify(i) {
    try {
        i = J.stringifyAll(i, 2);
    }
    catch(e) {
        i = J.stringify({
            error: 'object contains cycles and cannot be sent.'
        });
    }
    return i;
}
