/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var clientGenerator = require('./client.generator');
var DependencyInjector = require('./dependency.injector');
var utils = require('./utensils');
var injector, resources;

/**
 * For now this is just a passthrough to the injector's init function
 * @param opts
 */
var init = function (opts) {
    injector = new DependencyInjector(opts);
    resources = null;
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

/**
 * Get the service for a given resource name
 * @param name
 * @returns {}
 */
var getService = function (name) {
    if (name.indexOf('.') >= 0) {
        name = utils.getCamelCase(name);
    }

    if (!name.match(/^.*Service$/)) {
        name += 'Service';
    }

    return cook(name);
};

// exported functions
module.exports = {
    cook: cook,
    init: init,
    generateClient: clientGenerator.generateClient,
    getService: getService
};
