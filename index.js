/**
 * # nodeGame-server
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Server component for nodeGame
 *
 * http://www.nodegame.org
 */
exports.ServerNode = require('./lib/ServerNode.js');

// Exposing submodules.
exports.express = require('express');
exports.winston = require('winston');
exports.sio = require('socket.io');
