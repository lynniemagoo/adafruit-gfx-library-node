'use strict';

/*****************************************************************************
 * This code lifted from example defined in this blog.
 * https://blog.devgenius.io/async-method-chaining-in-node-8c24c8c3a28d
 *****************************************************************************/
class Thenable {
    constructor() {
        // this is the beginning of the chain
        this._queue = Promise.resolve();
    }

    // Let's define the 'then' function we have been using
    // Now this object can do what Promises do!
    then(callback) {
        callback(this._queue);
    }

    // Schedule a callback into the task queue
    // Basically builds the following:
    // o.then(o => o.then(o => o.then(o =>o.then(Promise.resolve())))
    _chain(callback) {
        return this._queue = this._queue.then(callback);
    }
}

module.exports = Thenable;