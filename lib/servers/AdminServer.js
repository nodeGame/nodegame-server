/**
 * # AdminServer
 *
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
 *
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
 * ## PlayerServer.attachCustomListeners
 *
 * Implements the abstract method from `GameServer` with listeners
 * specific to the admin endpoint
 *
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


// ### say.TXT
// Listens on say.TXT messages
    this.on(say + 'TXT', function(msg) {
        that.socket.broadcast(msg, msg.from);
    });

// ### say.PLIST
// Listens on say.PLIST messages
    this.on(say + 'PLIST', function(msg) {
        var origFrom = msg.from;
        that.socket.broadcast(that.msg.obfuscate(msg), origFrom);
    });


// ### say.DATA
// Listens on say.DATA messages
    this.on(say + 'DATA', function(msg) {
        var origFrom = msg.from;
        that.socket.broadcast(that.msg.obfuscate(msg), origFrom);
    });

// ### set.DATA
// Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        // Experimental
    });

// ### say.PLAYER_UPDATE
// Listens on say.PLAYER_UPDATE messages
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        var newMsg;
        if (msg.text === 'stage') {
            newMsg = that.msg.create({
                target: target.STAGE,
                data: msg.data.stage,
                to: msg.to
            });
            that.socket.broadcast(that.msg.obfuscate(newMsg), msg.from);
        }

        if (msg.text === 'stageLevel') {
            newMsg = that.msg.create({
                target: target.STAGE_LEVEL,
                data: msg.data.stageLevel,
                from: msg.from,
                to: msg.to
            });
            that.socket.broadcast(that.msg.obfuscate(newMsg), msg.from);
        }
    });

    // Transform in say
    this.on(set + 'PLAYER_UPDATE', function (msg){
        //this.emit(say+'PLAYER_UPDATE', msg);
    });

// ### say.STAGE
// Listens on say.STAGE messages
    this.on(say + 'STAGE', function(msg) {
        var origFrom = msg.from;
        that.socket.broadcast(that.msg.obfuscate(msg), origFrom);
    });

    // Transform in say
    this.on(set + 'STAGE', function (msg){
        //this.emit(say+'STAGE', msg);
    });

// ### say.STAGE_LEVEL
// Listens on say.STAGE_LEVEL messages
    this.on(say + 'STAGE_LEVEL', function(msg) {
        var origFrom = msg.from;
        that.socket.broadcast(that.msg.obfuscate(msg), origFrom);
    });

    // Transform in say
    this.on(set + 'STAGE_LEVEL', function (msg){
        //this.emit(say+'STAGE_LEVEL', msg);
    });


// ### say.REDIRECT
// Forwards a redirect msg (only for admin)
    this.on(say + 'REDIRECT', function(msg) {
        var roomName, room;
        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];
        
        if (!room) {
            sys.log('AdminServer.on.say.REDIRECT: Could not determine room of msg sender: ' + msg.from, 'error');
            return;
        }

        that.socket.send2roomPlayers(that.msg.obfuscate(msg), room);
    });

// ### say.SETUP
// Forwards a redirect msg (only for admin)
    this.on(say + 'SETUP', function(msg) {
        var roomName, room;
        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];
        
        if (!room) {
            sys.log('AdminServer.on.say.SETUP: Could not determine room of msg sender: ' + msg.from, 'error');
            return;
        }

        that.socket.send2client(that.msg.obfuscate(msg));
    });

// ### say.GAMECOMMAND
// Forwards a gamecommand msg (only for admin)
    this.on(say + 'GAMECOMMAND', function(msg) {
        var roomName, room;
        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];
        
        if (!room) {
            sys.log('AdminServer.on.say.GAMECOMMAND: Could not determine room of msg sender: ' + msg.from, 'error');
            return;
        }

        that.socket.send2client(that.msg.obfuscate(msg));
    });


// ### get.DATA
// Listener on get
    this.on(get + 'DATA', function (msg) {
        // TODO
    });

// ### disconnect
// Listens on admins disconnecting
    this.on('disconnect', function (monitor) {
        var msg, monitorName, roomName, room;

        monitorName = monitor.id + ' (sid: ' + monitor.sid + ')';
        sys.log(that.name + ' client disconnected: ' + monitorName);
        msg = that.msg.create({
            target: 'MDISCONNECT',
            from: monitor.id,
            data: monitor
        });

        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];

        if (!room) {
            sys.log('AdminServer.on.disconnect: Could not determine room for disconnecting monitor: ' + msg.from, 'error');
            return;
        }

        that.socket.send2roomAdmins(msg, room);
    });

// ### shutdown
// Listens on server shutdown
    this.sio.sockets.on("shutdown", function(message) {
        sys.log('Admin server ' + that.name + ' is shutting down');
        // TODO save the state to disk
    });

};
