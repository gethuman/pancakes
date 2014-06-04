/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var DependencyInjector = require('./dependency.injector');
var utils = require('./utensils');
var eventBus = require('./event.bus');
var annotationHelper = require('./annotation.helper');
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
 * Use the injector require which should be passed in during initialization
 * @param filePath
 * @returns {injector.require|*|require}
 */
var requireModule = function (filePath) {
    return injector.require(filePath);
};

/**
 * Get the injector root dir that was passed in during initialization
 * @returns {injector.rootDir|*}
 */
var getRootDir = function () {
    return injector.rootDir;
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
    requireModule: requireModule,
    getRootDir: getRootDir,
    cook: cook,
    init: init,
    clearCache: clearCache,
    getService: getService,
    getParameters: annotationHelper.getParameters,
    utils: utils,
    eventBus: eventBus
};
