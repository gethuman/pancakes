/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 * 
 * This is the main module for pancakes
 */
var DependencyInjector  = require('./dependency.injector');
var BaseTransformer     = require('./base.transformer');
var utils               = require('./utensils');
var eventBus            = require('./server.event.bus');
var annotationHelper    = require('./annotation.helper');
var apiRouteHandler     = require('./api.route.handler');
var webRouteHandler     = require('./web.route.handler');
var injector, clientPlugin, serverPlugin;

/**
 * For now this is just a passthrough to the injector's init function
 * @param opts
 */
function init(opts) {
    opts = opts || {};

    injector = new DependencyInjector(opts);
    clientPlugin = opts.clientPlugin;
    serverPlugin = opts.serverPlugin;

    if (clientPlugin) { clientPlugin.init(opts); }
    if (serverPlugin) { serverPlugin.init(opts); }

    apiRouteHandler.init({ injector: injector });
    webRouteHandler.init({ injector: injector, clientPlugin: clientPlugin });
}

/**
 * Use the injector require which should be passed in during initialization
 * @param filePath
 * @param refreshFlag
 * @returns {injector.require|*|require}
 */
function requireModule(filePath, refreshFlag) {
    if (refreshFlag) {
        delete injector.require.cache[filePath];
    }
    return injector.require(filePath);
}

/**
 * Simple helper function to get something
 * @param modulePath
 * @param options Optional set of values for the injector such as the flapjack and injectable values
 */
function cook(modulePath, options) {
    return injector.loadModule(modulePath, null, options);
}

/**
 * Get the service for a given resource name
 * @param name
 */
function getService(name) {
    if (name.indexOf('.') >= 0) {
        name = utils.getCamelCase(name);
    }

    if (!name.match(/^.*Service$/)) {
        name += 'Service';
    }

    return cook(name);
}

/**
 * Throw error if pancakes has not been initialized yet
 * @returns {*}
 */
function checkInjector() {
    if (!injector) {
        throw new Error('Pancakes has not yet been initialized. Please call init().');
    }
}

/**
 * Throw error if plugins not initialized
 */
function checkPlugins() {
    checkInjector();

    if (!clientPlugin || !serverPlugin) {
        throw new Error('You must add a valid client and server plugin when you call pancakes.init()');
    }
}

// exported functions
module.exports = {
    init: init,
    requireModule: requireModule,
    cook: cook,
    getService: getService,
    checkInjector: checkInjector,
    checkPlugins: checkPlugins,

    utils: utils,
    eventBus: eventBus,
    getParameters: annotationHelper.getParameters,
    BaseTransformer: BaseTransformer,
    apiRouteHandler: apiRouteHandler,
    webRouteHandler: webRouteHandler,

    destroy:        function () { injector = null; },
    getInjector:    function () { return injector; },
    clearCache:     function () { checkInjector(); injector.clearCache(); },
    getRootDir:     function () { checkInjector(); return injector.rootDir; },
    addApiRoutes:   function (opts) { checkPlugins(); serverPlugin.addApiRoutes(opts); },
    addWebRoutes:   function (opts) { checkPlugins(); serverPlugin.addWebRoutes(opts); }
};