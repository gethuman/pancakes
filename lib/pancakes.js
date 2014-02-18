/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var injector = require('./dependency.injector');
var clientGenerator = require('./client.generator');

/**
 * For now this is just a passthrough to the injector's init function
 * @param opts
 */
var init = function init (opts) {
    injector.init(opts);
};

/**
 * Simple helper function to get a module
 * @param modulePath
 */
var cook = function (modulePath) {
    return injector.loadModule(modulePath, null);
};

// exported functions
module.exports = {
    cook: cook,
    init: init,
    generateClient: clientGenerator.generateClient
};
