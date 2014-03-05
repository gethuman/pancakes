/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 1/25/14
 *
 * This is the internal event bus used by pancakes
 */
var _               = require('lodash');
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

/**
 * Listen to multiple events
 * @param options
 * @param cb
 */
eventBus.addHandlers = function (options, cb) {
    if (_.isString(options)) {
        eventBus.on(options, cb);
        return;
    }

    // get all the options
    options = options || {};
    var resources = options.resources || ['*'];
    var adapters = options.adapters || ['*'];
    var methods = options.methods || ['*'];
    var types = options.types || ['service', 'adapter', 'filter'];
    var timings = options.timings || ['before', 'after'];

    // for each possible variation add a handler
    _.each(resources, function (resource) {
        _.each(adapters, function (adapter) {
            _.each (methods, function (method) {

                // if we are debugging, add specific handlers
                if (options.types || options.timings) {
                    _.each(types, function (type) {
                        _.each(timings, function (timing) {
                            eventBus.on(resource + '.' + adapter + '.' + method + '.' + type + '.' + timing, cb);
                        });
                    });
                }
                // else just add the higher level handlers
                else {
                    eventBus.on(resource + '.' + adapter + '.' + method, cb);
                }
            })
        })
    });
};

// expose bus
module.exports = eventBus;