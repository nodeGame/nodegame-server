/**
 * # http.js
 * Copyright(c) 2020 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for Express server in nodegame-server
 */
module.exports = configure;

// ## Global scope

const express = require('express');
const path = require('path');
const J = require('nodegame-client').JSUS;

const mime = require('express').static.mime;

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');

// var session = require('cookie-session')({ secret: 'secret' });

/**
 * ### configure
 *
 * Defines standard routes for the HTTP server
 *
 * @param {object} options The object containing the custom settings
 */
function configure(app, servernode) {

    let rootDir = servernode.rootDir;
    let publicDir = path.join(rootDir, 'public');
    let basepath = servernode.basepath || '';
    let resourceManager = servernode.resourceManager;

    app.set('views', path.resolve(rootDir, 'views'));
    app.set('view engine', 'jade');
    app.set('view options', {layout: false});


    if (process.env.NODE_ENV === 'development') {
        app.use(express.static(publicDir));
        app.use(errorHandler());
    }
    else {
        app.use(express.static(publicDir, { maxAge: 3600000 }));
    }

    app.disable('x-powered-by');
    app.enable("jsonp callback");

    app.use(cookieParser());
    // app.use(bodyParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    function sendFromPublic(type, req, res, headers) {
        let file = req.params[0];
        if (!file) return;

        // Build path in `public/`.
        file = path.join(type, file);

        let mimeType, charset, filePath;

        // Build headers.
        if (!headers) {
            mimeType = mime.lookup(file);
            charset = mime.charsets.lookup(mimeType);
            headers = { 'Content-Type': mimeType };
            if (charset) headers.charset = charset;
        }

        // If it is not text, it was not cached.
        if (headers['Content-Type'].substring(0,4) !== 'text') {
            filePath = path.resolve(publicDir, file);
            res.sendFile(filePath);
            return;
        }

        // Already found in `public/` and cached.
        resourceManager.getFromPublic('/', file, function(cachedFile) {

            // File found in public (cached or loaded).
            if (cachedFile) {
                res.set(headers);
                res.status(200).send(cachedFile);
            }
            else {
                // Send 404.
                res.status(404).send('File not found.');
            }
        });
    }

    app.get(basepath + '/javascripts/*', function(req, res) {
        sendFromPublic('javascripts', req, res, {
            'Content-Type': 'text/javascript',
            'charset': 'utf-8'
        });
    });

    app.get(basepath + '/sounds/*', function(req, res) {
        sendFromPublic('sounds', req, res, {
            'Content-Type': 'sound/ogg'
        });
    });

    app.get(basepath + '/stylesheets/*', function(req, res) {
        sendFromPublic('stylesheets', req, res, {
            'Content-Type': 'text/css',
            'charset': 'utf-8'
        });
    });


    app.get(basepath + '/images/*', function(req, res) {
        sendFromPublic('images', req, res, {
            'Content-Type': 'image/png'
        });
    });

    app.get(basepath + '/pages/*', function(req, res) {
        sendFromPublic('pages', req, res, {
            'Content-Type': 'text/html',
            'charset': 'utf-8'
        });
    });

    app.get(basepath + '/lib/*', function(req, res) {
        sendFromPublic('lib', req, res);
    });

    app.get(basepath + '/', function(req, res, next) {

        // Must be first.
        if (req.query) {
            let q = req.query.q;
            if (q) {
                if (!servernode.enableInfoQuery) {
                    res.status(403).end();
                    return;
                }

                let game = req.query.game;
                game = servernode.channels[game];

                switch(q) {
                case 'info':
                    res.status(200).send(servernode.info);
                    break;

                case 'channels':
                    // res.header("Access-Control-Allow-Origin", "*");
                    // res.header("Access-Control-Allow-Headers",
                    //            "X-Requested-With");
                    res.status(200).send(servernode.info.channels);
                    break;

                case 'games':
                    res.status(200).send(servernode.info.games);
                    break;

                case 'waitroom':
                    if (!game) {
                        // TODO: Return info for all games or
                        // take into account default channel.
                        res.status(400).send("You must specify a valid game.");
                    }
                    else {
                        let level = req.query.level;
                        if (level) {
                            game = game.gameLevels[level];
                            if (!game) {
                                res.status(400).send("Level not found: " +
                                                     level);
                                break;
                            }
                        }

                        let room = game.waitingRoom;

                        if (!room) {
                            res.status(400)
                               .send("Channel/level has no waitroom.");
                        }
                        else {
                            let nPlayers = room.clients.playerConnected.size();
                            res.status(200).send({
                                nPlayers: nPlayers,
                                open: room.isRoomOpen()
                            });
                        }
                    }
                    break;

                // @experimental
                case 'clients':
                    if (!game) {
                        res.status(400).send("You must specify a valid game.");
                    }
                    else {
                        let nClients = game.registry.clients.connectedPlayer;
                        nClients = nClients.size();
                        res.status(200).send({ nClients: nClients });
                    }
                    break;

                // @experimental
                case 'highscore':
                    if (!game) {
                        res.status(400).send("You must specify a valid game.");
                    }
                    else {
                        res.status(200).send({ highscore: game.highscore });
                    }
                    break;

                default:
                    res.status(400).send('Unknown query received.');
                }
                return;
            }
        }

        if (servernode.defaultChannel) {
            next();
            return;
        }

        if (servernode.homePage === false ||
            servernode.homePage.enabled === false) {

            res.render('index_simple', {
                title: 'Yay! nodeGame server is running.'
            });
        }
        else {
            let gamesObj = servernode.info.games;
            let listOfGames = J.keys(gamesObj);
            // Remove aliases.
            let filteredGames = listOfGames.filter(function(name) {
                return (!gamesObj[name].disabled && !gamesObj[name].errored &&
                        (!gamesObj[name].alias ||
                         gamesObj[name].alias.indexOf(name) === -1));
            });
            if (J.isArray(servernode.homePage.cardsOrder)) {
                filteredGames =
                    servernode.homePage.cardsOrder.filter(function(name) {
                        if (filteredGames.indexOf(name) !== -1) return true;
                        servernode.logger.error('homePage.cardsOrder ' +
                                                'game not found: ' + name);
                    });
            }
            else {
                filteredGames.sort();
            }

            let games = [];
            let colors = servernode.homePage.colors;

            let i = 0;
            for (let j = 0; j < filteredGames.length; j++) {
                let name = filteredGames[j];
                if (i >= colors.length) i = 0;
                let color = colors[i];
                // Mixout name and description from package.json
                // if not in card, or if no card is defined.
                let card = J.mixout(gamesObj[name].info.card || {}, {
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    description: gamesObj[name].info.description
                });
                games.push({
                    name: card.name,
                    color: color,
                    url: card.url,
                    description: card.description,
                    publication: card.publication,
                    wiki: card.wiki,
                    icon: card.icon
                });
                i++;
            }
            let externalCards = servernode.homePage.externalCards;
            if (externalCards && externalCards.length) {
                for (let j = 0; j < externalCards.length; j++) {
                    externalCards[j].color = colors[i++];
                    externalCards[j].external = true;
                    games.push(externalCards[j]);
                }
            }
            res.render('homepage', {
                title: servernode.homePage.title,
                games: games,
                nodeGameCard: servernode.homePage.nodeGameCard,
                footerContent: servernode.homePage.footerContent,
                logo: servernode.homePage.logo
            });
        }



    });

    return true;
}
