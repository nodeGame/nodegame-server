/**
 * #  nodeGame ServerNodeRegistry
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Creates an HTTP server, and loads a Socket.io instance 
 * 
 * ---
 * 
 */

// ## Global scope

module.exports = ServerNodeRegistry;

var util = require('util'),
    fs = require('fs'),
    path = require('path');

var J = require('nodegame-client').JSUS;



/**
 * ## ServerNodeRegistry Constructor
 * 
 * Creates a new ServerNodeRegistry instance. 
 * 
 * @param {object} options The configuration object
 */
function ServerNodeRegistry (options) {
	
	this.instances = {};
	
	
}

//## ServerNodeRegistry methods

