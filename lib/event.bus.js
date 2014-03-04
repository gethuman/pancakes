/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 1/25/14
 *
 * This is the internal event bus used by pancakes
 */
var EventEmitter    = require('eventemitter2');
var eventBus        = new EventEmitter.EventEmitter2({ wildcard: true });

/**
 * Replace the default error handler with a given callback
 * @param cb
 */
eventBus.errorHandler = function (cb) {
    eventBus.removeAllListeners('error');
    eventBus.on('error', cb);
};

module.exports = eventBus;