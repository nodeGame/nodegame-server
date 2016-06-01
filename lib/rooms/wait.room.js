/**
 * # Standard Waiting Room
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Starts new game upon reaching a certain criterium
 *
 * http://nodegame.org
 */
module.exports = function(settings, waitRoom, runtimeConf) {

    // Load the code database.
    var J = require('JSUS').JSUS;

    var node = waitRoom.node;
    var channel = waitRoom.channel;

    var GROUP_SIZE = settings.GROUP_SIZE;
    var POOL_SIZE = settings.POOL_SIZE || GROUP_SIZE;
    var MAX_WAIT_TIME = settings.MAX_WAIT_TIME;
    var ON_TIMEOUT = settings.ON_TIMEOUT;

    var treatments = Object.keys(channel.gameInfo.settings);
    var tLen = treatments.length;

    var timeOuts = {};

    var stager = new node.Stager();

    // decideTreatment: check if string, or use it.
    function decideTreatment(t) {
        if (t === "treatment_rotate") {
            return treatments[(channel.autoRoomNo) % tLen];
        }
        else if ('undefined' === typeof t) {
            return treatments[J.randomInt(-1,tLen-1)];
        }
        return t;
    }

    function makeTimeOut(playerID) {

        timeOuts[playerID] = setTimeout(function() {
            var timeOutData, code;

            channel.sysLogger.log("Timeout has not been cleared!!!");

            channel.registry.checkOut(playerID);

            // See if an access code is defined, if so checkout remotely also.
            code = channel.registry.getClient(playerID);

            timeOutData = {
                over: "Time elapsed!!!",
                exit: code.ExitCode
            };
            node.say("TIME", playerID, timeOutData);

        }, MAX_WAIT_TIME);

    }

    function clearTimeOut(playerID) {
        clearTimeout(timeOuts[playerID]);
        delete timeOuts[playerID];
    }

    function clientReconnects(p) {
        channel.sysLogger.log('Reconnection in the waiting room.', p);

// TODO: check here.

//         node.game.pl.each(function(player) {
//             node.socket.send(node.msg.create({
//                 target: 'PCONNECT',
//                 data: p,
//                 to: player.id
//             }));
//         });

//         // Send currently connected players to reconnecting one.
//         node.socket.send(node.msg.create({
//             target: 'PLIST',
//             // TODO: this sends a bit too much.
//             data: node.game.pl.db,
//             to: p.id
//         }));
        node.game.pl.add(p);
        clientConnects(p);
    }

    function clientDisconnects(p) {
        var wRoom, i;

        // Clear timeout in any case.
        clearTimeOut(p.id);

        // Client really disconnected (not moved into another game room).
        if (channel.registry.clients.disconnected.get(p.id)) {
            // Free up the code.
            channel.registry.markValid(p.id);
        }
        wRoom = waitRoom.clients.player;
        for (i = 0; i < wRoom.size(); i++) {
            node.say("PLAYERSCONNECTED", wRoom.db[i].id, wRoom.size());
        }
    }

    function clientConnects(p) {
        var gameRoom, pList;
        var NPLAYERS;
        var i;
        var timeOutData;
        var treatmentName;
        var nPlayers;

        console.log('Client connected to waiting room: ', p.id);

        // Mark code as used.
        channel.registry.markInvalid(p.id);

        pList = waitRoom.clients.player;
        nPlayers = pList.size();

        node.remoteSetup('page', p.id, {
            clearBody: true,
            title: { title: 'Welcome!', addToBody: true }
        });

        node.remoteSetup('widgets', p.id, {
            destroyAll: true,
            append: { 'WaitingRoom': {} }
        });

        // Send the number of minutes to wait.
        node.remoteSetup('waitroom', p.id, {
            poolSize: POOL_SIZE,
            groupSize: GROUP_SIZE,
            maxWaitTime: MAX_WAIT_TIME,
            onTimeout: ON_TIMEOUT
        });

        console.log('NPL ', nPlayers);

        // Notify all players of new connection.
        node.say("PLAYERSCONNECTED", 'ROOM', nPlayers);

        // Start counting a timeout for max stay in waiting room.
        makeTimeOut(p.id);

        // Wait for all players to connect.
        if (nPlayers < POOL_SIZE) return;

        for (i = 0; i < nPlayers; i++) {
            timeOutData = {
                over: "AllPlayersConnected",
                exit: 0
            };

            node.say("TIME", pList.db[i].id, timeOutData);

            // Clear body.
            node.remoteSetup('page', pList.db[i].id, { clearBody: true });

            // Clear timeout for players.
            clearTimeout(timeOuts[i]);
        }

        // Select a subset of players from pool.
        tmpPlayerList = pList.shuffle().limit(GROUP_SIZE);

        // Decide treatment.
        treatmentName = decideTreatment(settings.CHOSEN_TREATMENT);

        if (waitRoom.gameLevel) {
            gameRoom = channel.gameLevels[waitRoom.gameLevel].createGameRoom({
                clients: tmpPlayerList,
                treatmentName: treatmentName
            });
        }
        else {
            // Create new game room.
            gameRoom = channel.createGameRoom({
                clients: tmpPlayerList,
                treatmentName: treatmentName
            });
        }

        // Setup and start game.
        gameRoom.setupGame();
        gameRoom.startGame(true, []);
    }

    function monitorReconnects(p) {
        node.game.ml.add(p);
    }

    stager.setOnInit(function() {

        // This callback is executed when a player connects to the channel.
        node.on.pconnect(clientConnects);

        // This callback is executed when a player connects to the channel.
        node.on.pdisconnect(clientDisconnects);

        // This callback is executed whenever a player reconnects.
        node.on.preconnect(clientReconnects);

        // This must be done manually for now.
        // (maybe will change in the future).
        node.on.mreconnect(monitorReconnects);

        channel.sysLogger.log('Waiting Room Created');
    });

    stager.setDefaultProperty('publishLevel', 0);

    stager.next('waiting');

    return {
        nodename: 'standard_wroom',
        metadata: {
            name: 'standard_wroom',
            version: '1.0.0'
        },
        plot: stager.getState(),
        debug: settings.debug || false,
        verbosity: 0
    };
};
