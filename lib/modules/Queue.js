/**
 * # Queue
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles a simple queue of operations
 *
 * http://nodegame.org
 * ---
 */

// ## Global scope

module.exports = Queue;

var J = require('JSUS').JSUS;

function Queue() {
 
    /**
     * ## Queue.queue
     *
     * The list of functions waiting to be executed.
     */
    this.queue = [];

    /**
     * ## Queue.inProgress
     *
     * The list of operations ids currently in progress. 
     */
    this.inProgress = {};
}

/**
 * ### Queue.isReady
 *
 * Returns TRUE if no operation is in progress
 *
 * @return {boolean} TRUE, if no operation is in progress
 */
Queue.prototype.isReady = function() {
    return J.isEmpty(this.inProgress);
};

/**
 * ### Queue.ready
 *
 * Executes the specified callback once the server is fully loaded
 *
 * @param {function} cb The callback to execute
 */
Queue.prototype.onReady = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('Queue.onReady: cb must be function.');
    }
    if (J.isEmpty(this.inProgress)) {
        cb();
    }
    else {
        this.queue.push(cb);
    }
};

/**
 * ### Queue.add
 *
 * Adds an item to the _inProgress_ index
 *
 * @param {string} key A tentative key name
 * @return {string} The unique key to be used to unregister the operation
 */
Queue.prototype.add = function(key) {
    if (key && 'string' !== typeof key) {
        throw new Error('Queue.add: key must be string.');
    }
    key = J.uniqueKey(this.inProgress, key);
    if ('string' !== typeof key) {
        throw new Error('Queue.add: an error occurred ' +
                        'generating unique key.');
    }
    this.inProgress[key] = key;
    return key;    
};

/**
 * ### Queue.remove
 *
 * Remove a specified key from the _inProgress_ index
 *
 * @param {string} key The key to remove from the _inProgress_ index.
 */
Queue.prototype.remove = function(key) {
    if ('string' !== typeof key) {
        throw new Error('Queue.remove: key must be string.');
    }
    delete this.inProgress[key];
    if (J.isEmpty(this.inProgress)) {
        this.executeAndClear()
    }
};

/**
 * ### Queue.executeAndClear
 *
 * Executes sequentially all callbacks, and removes them from the queue
 */
Queue.prototype.executeAndClear = function() {
    var i, len;
    i = -1, len = this.queue.length;
    for ( ; ++i < len ; ) {
        this.queue[i]();
    }
};