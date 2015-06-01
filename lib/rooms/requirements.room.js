/**
 * # Standard Waiting Room for a nodeGame Channel
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Handles incoming connections, matches them, sets the Burden-share game
 * in each client, move them in a separate gaming room, and start the game.
 */
module.exports = function(settings, waitRoom, runtimeConf) {

    var node = room.node;
    var channel = room.channel;

    var registry = room.channel.servernode.channels.burdenshare.registry;

    // Creates a stager object to define the game stages.
    var stager = new node.Stager();

    // Functions

    var pinged = {};

    function init() {
        var that = this;

        node.on.preconnect(function(player) {
            console.log('Player connected to Requirements room.');
            node.game.pl.add(player);
            node.remoteCommand('start', player.id);
        });

        node.on.pconnect(function(player) {
            var room;
            console.log('Player connected to Requirements room.');

            // room = registry.

            node.remoteSetup(

            node.remoteCommand('start', player.id);
        });

        node.on.pdisconnect(function(player) {
            console.log('Player disconnected from Requirements room: ' +
                        player.id);
        });

        // Results of the requirements check.
        node.on.data('requirements', function(msg) {
            console.log('requirements');
            console.log(msg.data);
        });

        // In case a user is using the feedback form display the action.
        node.on.data('FEEDBACK', function(msg) {
            console.log('Feedback received.');
            console.log(msg.data);
        });
    }

    stager.addStage({
        id: 'requirements',
        cb: function() {

            node.on('get.MTID', function(msg) {
                var mtid, errUri, code;

                console.log('MTID');

                pinged[msg.from] = {};

                // Test Speed here.
                var ping, count, LIMIT, totalTime, pingMore;

                count = 1;
                LIMIT = 10;
                pingMore = true;
                pingId = 'ping_' + msg.from;

                ping = function() {
                    node.get('PING', function(msg) {
                        if (pingMore) {
                            if (++count >= LIMIT) {
                                pingMore = false;
                            }
                            ping();
                        }
                        else {
                            totalTime = node.timer.getTimeSince(pingId);
                            console.log('-----> Total time: ' + totalTime);
                        }
                    }, msg.from);
                };

                node.timer.setTimestamp(pingId);
                ping();

                // M-Turk id
                mtid = msg.data;

                if ('string' !== typeof mtid) {
                    return {
                        success: false,
                        msg: 'Malformed or empty code received.'
                    };
                }

                code = registry.lookupClient(mtid);

                if (!code) {
                    // errUri = '/ultimatum/unauth.html?id=' + mtid + '&err0=1';
                    // node.redirect(errUri, msg.data.id);
                    return {
                        success: false,
                        msg: 'Code not found: ' + mtid
                    };
                }

                code = registry.getClient(mtid);

                // usage is for LOCAL check, IsUsed for MTURK
                if ((code.valid === false) && !code.disconnected) {
                    return {
                        success: false,
                        msg: 'Code already in use: ' + mtid
                    };
                }

                return {
                    success: true,
                    msg: 'Code validated.',
                    gameLink: '/burdenshare/html/informedConsent.html'
                    // gameLink: '/burdenHR/index.htm'
                };
            });
        }
    });

    // Define stager.

    stager.setOnInit(init);

    stager
        .init()
        .next('requirements');

    // Return the game.
    game = {};

    game.metadata = {
        name: 'Requirements check room for Burde-Sharing-Control-AMT',
        description: 'Validates players entry codes with an internal database.',
        version: '0.1'
    };

    // Throws errors if true.
    game.debug = true;

    game.plot = stager.getState();

    game.nodename = 'requirements';

    // game.verbosity = 100;

    return game;
};
