/**
 * # AdminServer
 *
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * GameServer for the administrators endpoint.
 *
 * Inherits from `GameServer` and attaches special listeners.
 *
 * AdminServer hides the id of the sender when forwarding msgs
 *
 * SET messages are ignored
 *
 * ---
 *
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
    // extra variables
    this.loop = null;

    // TODO: see if we need this
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

// ## say.HI
// Listens on newly connected players
    this.on(say + 'HI', function(msg) {
        var roomName, room, players, admins, oldAdmins;
        sys.log('Incoming monitor: ' + msg.from);
        debugger
        roomName = that.registry.getClientRoom(msg.from);
        room = that.channel.gameRooms[roomName];
        
        if (!room) {
            sys.log('Could not determine room for incoming monitor: ' + msg.from);
            return;
        }

        // TODO: need to solve the PlayerList init problem

        players = room.clients.player;
        admins = room.clients.admin;
        oldAdmins = admins.breed();
        oldAdmins.remove(msg.from);

        // Notifies other admins that a new one monitor connected.
        that.socket.broadcast2group(that.msg.create({
            target: 'MCONNECT',
            to: 'ALL',
            data: msg.data,
            from: msg.from
        }), admins);

        // Send the list of connected players to the new admin.
        that.socket.send2client(that.msg.create({
            target: 'SETUP',
            to: msg.from,
            text: 'plist',
            data: [players, 'append']
        }));

        // Send the list of connected admins to the new admin.
        that.socket.send2client(that.msg.create({
            target: 'SETUP',
            to: msg.from,
            text: 'mlist',
            data: [oldAdmins, 'append']
        }));

    });

// ### say.TXT
// Listens on say.TXT messages
    this.on(say + 'TXT', function(msg) {
        that.socket.broadcast(msg, msg.from);
        that.socket.forward(that.msg.obfuscate(msg));
    });

// ### say.PLIST
// Listens on say.PLIST messages
    this.on(say + 'PLIST', function(msg) {
        that.socket.broadcast(msg, msg.from);
        that.socket.forward(that.msg.obfuscate(msg));
    });


// ### say.DATA
// Listens on say.DATA messages
    this.on(say + 'DATA', function(msg) {
        that.socket.broadcast(msg, msg.from);
        that.socket.forward(that.msg.obfuscate(msg));
    });

// ### set.DATA
// Listens on set.DATA messages
    this.on(set + 'DATA', function(msg) {
        // Experimental
        if (msg.text === 'LOOP') {
            that.loop = msg.data;
        }
    });

// ### say.PLAYER_UPDATE
// Listens on say.PLAYER_UPDATE messages
    this.on(say + 'PLAYER_UPDATE', function(msg) {
        var newMsg;
        if (msg.data.hasOwnProperty('stage')) {
            newMsg = that.msg.create({
                target: target.STAGE,
                data: msg.data.stage,
                to: msg.to
            });
            that.socket.broadcast(newMsg, msg.from);
            that.socket.forward(that.msg.obfuscate(newMsg));
        }

        if (msg.data.hasOwnProperty('stageLevel')) {
            newMsg = that.msg.create({
                target: target.STAGE_LEVEL,
                data: msg.data.stageLevel,
                from: msg.from,
                to: msg.to
            });
            that.socket.broadcast(newMsg, msg.from);
            that.socket.forward(that.msg.obfuscate(newMsg));
        }
    });

    // Transform in say
    this.on(set + 'PLAYER_UPDATE', function (msg){
        //this.emit(say+'PLAYER_UPDATE', msg);
    });

// ### say.STAGE
// Listens on say.STAGE messages
    this.on(say + 'STAGE', function(msg) {
        that.socket.broadcast(msg, msg.from);
        that.socket.forward(that.msg.obfuscate(msg));
    });

    // Transform in say
    this.on(set + 'STAGE', function (msg){
        //this.emit(say+'STAGE', msg);
    });

// ### say.STAGE_LEVEL
// Listens on say.STAGE_LEVEL messages
    this.on(say + 'STAGE_LEVEL', function(msg) {
        that.socket.broadcast(msg, msg.from);
        that.socket.forward(that.msg.obfuscate(msg));
    });

    // Transform in say
    this.on(set + 'STAGE_LEVEL', function (msg){
        //this.emit(say+'STAGE_LEVEL', msg);
    });


// ### say.REDIRECT
// Forwards a redirect msg (only for admin)
    this.on(say + 'REDIRECT', function(msg) {
        // TODO should this be sent to monitors too ?
        that.socket.forward(that.msg.obfuscate(msg));
    });

// ### say.SETUP
// Forwards a redirect msg (only for admin)
    this.on(say + 'SETUP', function(msg) {
        // TODO should this be sent to monitors too ?
        that.socket.forward(that.msg.obfuscate(msg));
    });

// ### say.GAMECOMMAND
// Forwards a gamecommand msg (only for admin)
    this.on(say + 'GAMECOMMAND', function(msg) {
        // TODO should this be sent to monitors too ?
        that.socket.forward(that.msg.obfuscate(msg));
    });


// ### get.DATA
// Listener on get (Experimental)
//    this.on(get + 'DATA', function (msg) {
//
//        // Ask a random player to send the game;
//        var p = this.pl.getRandom();
//
//
//        if (msg.text === 'LOOP') {
//            that.msg.sendDATA(action.SAY, that.loop, msg.from, 'LOOP');
//        }
//
//        else if (msg.text === 'INFO') {
//            that.msg.sendDATA(action.SAY, that.generateInfo(), msg.from, 'INFO');
//        }
//
//    });

// ### closed
// Listens on admins disconnecting
    this.on('disconnect', function (monitor) {
        var msg;
        sys.log(that.name + ' Disconnected: ' + player.id);
        msg = that.msg.create({
            target: 'MDISCONNECT',
            to: 'ALL',
            data: monitor
        });
        that.socket.send(msg);
    });

// ### shutdown
// Listens on server shutdown
    this.sio.sockets.on("shutdown", function(message) {
        sys.log('Admin server ' + that.name + ' is shutting down');
        // TODO save the state to disk
    });

};
