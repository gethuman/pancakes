/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This factory is used to generate a model class which has the following characteristics:
 * 1. Holds data for model
 * 2. Static access to associated service functions
 * 3. Additional helper functions from the resource file (or something similar) available after newing an object
 */
var cache = {};

var isCandidate = function (modulePath) {
    modulePath = modulePath || '';
    var firstLetter = modulePath.substring(0, 1);
    return modulePath.indexOf('/') < 0 && firstLetter === firstLetter.toUpperCase();
};

/**
 * Create
 * @param modulePath
 * @returns {{}}
 */
var create = function (modulePath) {

    // first check the cache to see if we already loaded it
    if (cache[modulePath]) {
        return cache[modulePath];
    }


    // get the service associated with this module
    // also get the resource (with helper functions in it)


    return {};
};

module.exports = {
    cache: cache,
    isCandidate: isCandidate,
    create: create
};

