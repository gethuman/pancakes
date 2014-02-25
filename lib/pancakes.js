/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var clientGenerator = require('./client.generator');
var DependencyInjector = require('./dependency.injector');
var injector;

/**
 * For now this is just a passthrough to the injector's init function
 * @param opts
 */
var init = function (opts) {
    injector = new DependencyInjector(opts);
};

/**
 * Simple helper function to get something
 * @param modulePath
 */
var cook = function (modulePath) {
    if (!injector) {
        throw new Error('Pancakes has not yet been initialized. Please call init().');
    }

    return injector.loadModule(modulePath, null);
};

// exported functions
module.exports = {
    cook: cook,
    init: init,
    generateClient: clientGenerator.generateClient
};
