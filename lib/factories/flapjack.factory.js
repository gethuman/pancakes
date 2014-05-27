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
 * @param options
 * @returns {boolean}
 */
FlapjackFactory.prototype.isCandidate = function (modulePath, options) {
    modulePath = modulePath || '';
    return modulePath.indexOf('/') >= 0 || (options && options.flapjack) || false;
};

/**
 * This factory does have a cache, but we don't want to clear it (for now)
 */
FlapjackFactory.prototype.clearCache = function () {
    this.cache = {};
};

/**
 * Given a flapjack load all the params and instantiated it
 *
 * @param flapjack
 * @param moduleStack
 * @param dependencies
 * @returns {*}
 */
FlapjackFactory.prototype.injectFlapjack = function (flapjack, moduleStack, dependencies) {

    // param map is combo of param map set by user, params discovered and current annotation
    var aliases = _.extend({}, this.injector.aliases, annotations.getServerAliases(flapjack));
    var params = annotations.getParameters(flapjack);
    var deps = dependencies || {};
    var paramModules = [];
    var me = this;

    // loop through the params so we can collect the object that will be injected
    _.each(params, function (param) {

        // if mapping exists, switch to the mapping (ex. pancakes -> lib/pancakes)
        if (aliases[param]) {
            param = aliases[param];
        }

        // either get the module from the input dependencies or recursively call inject
        try
        {
            paramModules.push(deps[param] || me.injector.loadModule(param, moduleStack));
        }
        catch (ex) {
            var errMsg = ex.stack || ex;
            throw new Error('While injecting function, ran into invalid parameter.\nparam: ' + param +
                '\nstack: ' + JSON.stringify(moduleStack) + '\nfunction: ' +
                flapjack.toString().substring(0, 100) + '...\nerror: ' + errMsg);
        }
    });

    // call the flapjack function passing in the array of modules as parameters
    return flapjack.apply(null, paramModules);
};

/**
 * Find or create a flapjack based on a relative path from the project root
 * @param modulePath
 * @param moduleStack
 * @param options
 * @returns {{}}
 */
FlapjackFactory.prototype.create = function (modulePath, moduleStack, options) {

    // if flapjack passed in, inject the flapjack and use that without caching anything
    if (options && options.flapjack) {
        return this.injectFlapjack(options.flapjack, moduleStack, options.dependencies);
    }

    // remove .js from the modulePath
    modulePath = modulePath.replace(/\.js$/, '');

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

    return (this.cache[modulePath] = this.injectFlapjack(flapjack, moduleStack));
};

// export the class
module.exports = FlapjackFactory;


