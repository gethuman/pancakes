/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Factory method to get flapjacks
 */
var fs = require('fs');
var _ = require('lodash');
var annotations = require('../annotation.helper');

/**
 * Initialize the cache
 * @param injector
 * @constructor
 */
var FlapjackFactory = function (injector) {
    this.cache = {};
    this.injector = injector;
};

/**
 * Check if is candidate. We will assume that anything with a slash in it
 * is a reference to something on the file system that is a flapjack
 * @param modulePath
 * @returns {boolean}
 */
FlapjackFactory.prototype.isCandidate = function (modulePath) {
    modulePath = modulePath || '';
    return modulePath.indexOf('/') >= 0;
};

/**
 * Given a flapjack load all the params and instantiated it
 *
 * @param flapjack
 * @param moduleStack
 * @returns {*}
 */
FlapjackFactory.prototype.injectFlapjack = function (flapjack, moduleStack) {

    // param map is combo of param map set by user, params discovered and current annotation
    var aliases = _.extend({}, this.injector.aliases, annotations.getServerAliases(flapjack));
    var params = annotations.getParameters(flapjack);
    var paramModules = [];
    var me = this;

    // loop through the params so we can collect the object that will be injected
    _.each(params, function (param) {

        // if mapping exists, switch to the mapping (ex. pancakes -> lib/pancakes)
        if (aliases[param]) {
            param = aliases[param];
        }

        // recursively load the module for the parameter and add it to the array
        paramModules.push(me.injector.loadModule(param, moduleStack));
    });

    // call the flapjack function passing in the array of modules as parameters
    return flapjack.apply(null, paramModules);
};

/**
 * Find or create a flapjack based on a relative path from the project root
 * @param modulePath
 * @param moduleStack
 * @returns {{}}
 */
FlapjackFactory.prototype.create = function (modulePath, moduleStack) {

    // first check the cache to see if we already loaded it
    if (this.cache[modulePath]) {
        return this.cache[modulePath];
    }

    // if the file doesn't exist throw an error
    var filePath = this.injector.rootDir + '/' + modulePath;
    if (!fs.existsSync(filePath + '.js')) {
        throw new Error('FlapjackFactory got invalid file path: ' + filePath);
    }

    // get the flapjack
    var flapjack = this.injector.require(this.injector.rootDir + '/' + modulePath);
    flapjack = flapjack.server ? flapjack.server : flapjack;  // use the server val if it exists

    // if flapjack is not a function, just return it
    if (!_.isFunction(flapjack)) {
        this.cache[modulePath] = flapjack;
        return flapjack;
    }

    var injectedFlapjack = this.injectFlapjack(flapjack, moduleStack);
    this.cache[modulePath] = injectedFlapjack;

    return injectedFlapjack;
};

// export the class
module.exports = FlapjackFactory;


