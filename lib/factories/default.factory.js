/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This factory is used by the injector as a default failsafe at the end
 * of the chain. Whatever is in the modulePath is simply passed into
 * the Node.js require() to see what we get.
 */

/**
 * Check if is candidate
 * @param modulePath
 * @returns {boolean}
 */
var isCandidate = function (modulePath) {
    return modulePath;
};

/**
 * Very simply use require to get the object
 * @param modulePath
 * @param moduleStack
 * @param injector
 * @returns {{}}
 */
var create = function (modulePath, moduleStack, injector) {
    return injector.require(modulePath.toLowerCase());
};

module.exports = {
    isCandidate: isCandidate,
    create: create
};