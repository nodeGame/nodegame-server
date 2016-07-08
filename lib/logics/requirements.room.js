/**
 * # Standard Requirements Room
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Validates the requirements of incoming connections
 *
 * http://nodegame.org
 * ---
 */
module.exports = function(settings, room, runtimeConf) {
    var node = room.node;
    var channel = room.channel;
    var registry = channel.registry;

    // Creates a stager object to define the game stages.
    var stager = new node.Stager();

    var nextRoom;
    if ('undefined' === typeof settings.nextRoom) {
        // This should be safe, because waitRoom is created before.
        if (channel.waitingRoom) {
            nextRoom = channel.waitingRoom.name;
        }
        else {
            throw new Error('requirements.room: no nextRoom provided, and ' +
                            'no waiting room found.');
        }

    }
    else if ('string' === typeof settings.nextRoom &&
             settings.nextRoom !== '') {

        nextRoom = settings.nextRoom;
    }
    else {
        throw new TypeError('requirements.room: nextRoom must be undefined ' +
                            'or non-empty string. Found: ' + settings.nextRoom);
    }

    function connectingPlayer(player) {
        console.log('Player connected to Requirements room.', player.id);

        setTimeout(function() {

            node.remoteSetup('page', player.id, {
                clearBody: true,
                title: { title: 'Welcome!', addToBody: true }
            });

            node.remoteSetup('widgets', player.id, {
                append: { 'Requirements': {
                    root: 'widgets_div',
                    sayResults: true
                } }
            });
            node.remoteSetup('requirements', player.id, settings);

        }, 500);
    }

    // Define stager.

    stager.setOnInit(function init() {
        var that = this;

        node.on.preconnect(function(player) {
            console.log('Player re-connected to Requirements room.');
            node.game.pl.add(player);
            connectingPlayer(player);
        });

        node.on.pconnect(connectingPlayer);

        node.on.pdisconnect(function(player) {
            console.log('Player disconnected from Requirements room: ' +
                        player.id);
        });

        // Results of the requirements check.
        node.on.data('requirements', function(msg) {
            console.log('requirements');
            console.log(msg.data);
            if (msg.data.success) {
                // Mark client as requirements passed.
                registry.updateClient(msg.from, {apt: true});

                 setTimeout(function() {
                     channel.moveClient(msg.from, nextRoom);
                 }, 1000);
            }
        });

    });

    stager.setDefaultProperty('publishLevel', 0);

    stager.next({
        id: 'requirements',
        cb: function() {
            console.log('Requirements room created: ' + channel.name);
        }
    });

    // Return the game.
    game = {};

    game.metadata = {
        name: 'Requirements check room',
        description: 'Validates clients requirements.',
        version: '0.3.0'
    };

    game.debug = settings.debug || false;
    game.plot = stager.getState();
    game.nodename = 'requirements';
    game.verbosity = 0;
    return game;
};
