/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This factory is used by the injector as a default failsafe at the end
 * of the chain. Whatever is in the modulePath is simply passed into
 * the Node.js require() to see what we get.
 */
var _ = require('lodash');

/**
 * This factory doesn't do much
 * @param injector
 * @constructor
 */
function DefaultFactory(injector) {
    this.injector = injector;
}

_.extend(DefaultFactory.prototype, {

    /**
     * Check if is candidate
     * @param modulePath
     * @returns {boolean}
     */
    isCandidate: function isCandidate(modulePath) {
        return modulePath;
    },

    /**
     * No cache, so does nothing, but needed for interface
     */
    clearCache: function clearCache() {},

    /**
     * Very simply use require to get the object
     * @param modulePath
     * @returns {{}}
     */
    create: function create(modulePath) {
        try {
            return this.injector.require(modulePath.toLowerCase());
        }
        catch (ex) {
            /* eslint no-console:0 */
            console.log(ex.stack);
            return null;
        }
    }
});

// export the class
module.exports = DefaultFactory;