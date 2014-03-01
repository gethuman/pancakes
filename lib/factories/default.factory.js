/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This factory is used by the injector as a default failsafe at the end
 * of the chain. Whatever is in the modulePath is simply passed into
 * the Node.js require() to see what we get.
 */

/**
 * This factory doesn't do much
 * @param injector
 * @constructor
 */
var DefaultFactory = function (injector) {
    this.injector = injector;
};

/**
 * Check if is candidate
 * @param modulePath
 * @returns {boolean}
 */
DefaultFactory.prototype.isCandidate = function (modulePath) {
    return modulePath;
};

/**
 * Very simply use require to get the object
 * @param modulePath
 * @returns {{}}
 */
DefaultFactory.prototype.create = function (modulePath) {
    return this.injector.require(modulePath.toLowerCase());
};

// export the class
module.exports = DefaultFactory;