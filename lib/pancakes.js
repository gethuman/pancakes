/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var moduleTransformer = require('./transformers/module.transformer');
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
 * @param options Optional set of values for the injector such as the flapjack and injectable values
 */
var cook = function (modulePath, options) {
    if (!injector) {
        throw new Error('Pancakes has not yet been initialized. Please call init().');
    }

    return injector.loadModule(modulePath, null, options);
};

/**
 * Clear the cache for the injector and factories
 * @returns {*}
 */
var clearCache = function () {
    if (!injector) {
        throw new Error('Pancakes has not yet been initialized. Please call init().');
    }

    return injector.clearCache();
};

/**
 * Get the service for a given resource name
 * @param name
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
    clearCache: clearCache,
    transformModule: moduleTransformer.transform,
    getService: getService
};
