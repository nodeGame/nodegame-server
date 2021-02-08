/**
 * # GameMsgGenerator
 * Copyright(c) 2018 Stefano Balietti
 * MIT Licensed
 *
 * Game messages generator
 *
 * TODO: obfuscate everything? Use SERVER and MONITOR and 'channel name'?
 */

"use strict";

// ## Global scope

module.exports = GameMsgGenerator;

const ngc = require('nodegame-client');
const GameMsg = ngc.GameMsg;
const constants = ngc.constants;


/**
 * ## GameMsgGenerator constructor
 *
 * Creates a new instance of GameMsgGenerator
 *
 * @param {GameServer} gameServer Reference to the Game Server where
 *   the generator is instantiated
 */
function GameMsgGenerator(gameServer) {
    this.session = gameServer.session;
    this.sender = gameServer.name;
    this.stage = null;
}

// ## GameMsgGenerator methods

/**
 * ### GameMsgGenerator.create
 *
 * Primitive for creating any type of game-message
 *
 * Merges a set of default settings with the object passed
 * as input parameter.
 *
 * @param {object} msg A stub of game message
 *
 * @return {GameMsg} The newly created message
 */
GameMsgGenerator.prototype.create = function(msg) {
    var priority;

    if ('undefined' !== typeof msg.priority) {
        priority = msg.priority;
    }
    else if (msg.target === constants.target.GAMECOMMAND ||
             msg.target === constants.target.REDIRECT ||
             msg.target === constants.target.PCONNECT ||
             msg.target === constants.target.PDISCONNECT ||
             msg.target === constants.target.PRECONNECT) {

                priority = 1;
    }
    else {
        priority = 0;
    }

    return new GameMsg({
        session:
            'undefined' !== typeof msg.session ? msg.session : this.session,
        stage: msg.stage || this.stage,
        action: msg.action || constants.action.SAY,
        target: msg.target || constants.target.DATA,
        from: msg.from || this.sender,
        to: 'undefined' !== typeof msg.to ? msg.to : 'SERVER',
        text: 'undefined' !== typeof msg.text ? "" + msg.text : null,
        data: 'undefined' !== typeof msg.data ? msg.data : {},
        priority: priority,
        reliable: msg.reliable || 1
    });
};

/**
 * ### GameMsgGenerator.obfuscate
 *
 * Overwrites the session, stage, and from properties of a game message
 *
 * @param {GameMsg} msg The game message
 *
 * @return {GameMsg} The obfuscated message
 */
GameMsgGenerator.prototype.obfuscate = function(msg) {
    msg.session = this.session;
    msg.stage = this.stage;
    msg.from = this.sender;
    return msg;
};
