/**
 * # Standard Waiting Room for a nodeGame Channel
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Handles incoming connections, setups each client,
 * moves them in a separate game room, and starts the game.
 *
 * @see GameRoom (nodegame-server)
 */
module.exports = function(settings, waitRoom, runtimeConf) {

    // Load the code database.
    var J = require('JSUS').JSUS;

    var node = waitRoom.node;
    var channel = waitRoom.channel;

    var stager = new node.Stager();

    // Parses the settings.
    waitRoom.parseSettings(settings);

    function clientReconnects(p) {
        channel.sysLogger.log('Reconnection in the waiting room.', p);
        node.game.pl.add(p);
        clientConnects(p);
    }

    function clientDisconnects(p) {
        var wRoom, i;

        // Clear timeout in any case.
        waitRoom.clearTimeOut(p.id);

        // Client really disconnected (not moved into another game room).
        if (channel.registry.clients.disconnected.get(p.id)) {
            // Free up the code.
            channel.registry.markValid(p.id);
        }
        wRoom = waitRoom.clients.player;
        for (i = 0; i < wRoom.size(); i++) {
            node.say('PLAYERSCONNECTED', wRoom.db[i].id, wRoom.size());
        }
    }

    // Using self-calling function to put `firstTime` into closure.
    function clientConnects(p) {
        var pList;
        var nPlayers;
        var waitTime;
        var widgetConfig;

        node.remoteSetup('page', p.id, {
            clearBody: true,
            title: { title: 'Welcome!', addToBody: true }
        });

        node.remoteSetup('widgets', p.id, {
            destroyAll: true,
            append: { 'WaitingRoom': {} }
        });

        if (waitRoom.isRoomOpen()) {
            console.log('Client connected to waiting room: ', p.id);

            // Mark code as used.
            channel.registry.markInvalid(p.id);

            pList = waitRoom.clients.player;
            nPlayers = pList.size();


            if (waitRoom.START_DATE) {
                waitTime = new Date(waitRoom.START_DATE).getTime() -
                    (new Date().getTime());
            }
            else if (waitRoom.MAX_WAIT_TIME) {
                waitTime = waitRoom.MAX_WAIT_TIME;
            }
            else {
                waitTime = null; // Widget won't start timer.
            }

            // Send the number of minutes to wait and all waitRoom settings.
            widgetConfig = waitRoom.makeWidgetConfig();
            widgetConfig.waitTime = waitTime;
            node.remoteSetup('waitroom', p.id, widgetConfig);

            console.log('NPL ', nPlayers);

            // Notify all players of new connection.
            node.say('PLAYERSCONNECTED', 'ROOM', nPlayers);

            // Start counting a timeout for max stay in waiting room.
            waitRoom.makeTimeOut(p.id, waitTime);

            // Wait for all players to connect.
            if (nPlayers < waitRoom.POOL_SIZE) return;

            if (waitRoom.EXECUTION_MODE === 'WAIT_FOR_N_PLAYERS') {
                waitRoom.dispatch({
                    action: 'AllPlayersConnected',
                    exit: 0
                });
            }
        }
        else {
            node.say('ROOM_CLOSED', p.id);
        }
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
