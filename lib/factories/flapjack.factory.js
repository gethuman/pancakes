/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Factory method to get flapjacks
 */
var fs      = require('fs');
var path    = require('path');
var _       = require('lodash');

/**
 * Initialize the cache
 * @param injector
 * @constructor
 */
function FlapjackFactory(injector) {
    this.cache = {};
    this.injector = injector;
}

_.extend(FlapjackFactory.prototype, {

    /**
     * Check if is candidate. We will assume that anything with a slash in it
     * is a reference to something on the file system that is a flapjack
     * @param modulePath
     * @param options
     * @returns {boolean}
     */
    isCandidate: function isCandidate(modulePath, options) {
        modulePath = modulePath || '';
        return modulePath.indexOf('/') >= 0 || (options && options.flapjack) || false;
    },

    /**
     * This factory does have a cache, but we don't want to clear it (for now)
     */
    clearCache: function clearCache() {
        this.cache = {};
    },

    /**
     * Find or create a flapjack based on a relative path from the project root
     * @param modulePath
     * @param moduleStack
     * @param options
     * @returns {{}}
     */
    create: function create(modulePath, moduleStack, options) {

        // if flapjack passed in, inject the flapjack and use that without caching anything
        if (options && options.flapjack) {
            return this.injector.injectFlapjack(options.flapjack, moduleStack, options);
        }

        // first check the cache to see if we already loaded it
        if (this.cache[modulePath]) {
            return this.cache[modulePath];
        }

        // if the file doesn't exist throw an error
        var rootDir = this.injector.rootDir;
        var filePath = modulePath;
        if (filePath.indexOf(rootDir) !== 0) { filePath = rootDir + '/' + filePath; }   // add rootDir if not there
        if (!filePath.match(/\.js$/)) { filePath = filePath + '.js'; }                  // add .js if not there
        if (!fs.existsSync(path.normalize(filePath))) {                                                 // if file not there, throw error
            throw new Error('FlapjackFactory got invalid file path: ' + filePath);
        }

        // get the flapjack
        filePath = filePath.substring(0, filePath.length - 3);      // remove the .js
        var flapjack = this.injector.require(filePath);             // require() the module without injecting it
        flapjack = flapjack.server ? flapjack.server : flapjack;    // use the server val if it exists

        // if flapjack is not a function, just return it (i.e. its just a normal require()
        if (!_.isFunction(flapjack)) {
            this.cache[modulePath] = flapjack;
            return flapjack;
        }

        this.cache[modulePath] = this.injector.injectFlapjack(flapjack, moduleStack, options);
        return this.cache[modulePath];
    }
});

// export the class
module.exports = FlapjackFactory;


