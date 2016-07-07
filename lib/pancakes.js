/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var DependencyInjector  = require('./dependency.injector');
var transformerFactory  = require('./transformers/transformer.factory');
var baseTransformer     = require('./transformers/base.transformer');
var utils               = require('./utensils');
var eventBus            = require('./server.event.bus');
var annotationHelper    = require('./annotation.helper');
var apiRouteHandler     = require('./api.route.handler');
var webRouteHandler     = require('./web.route.handler');
var _                   = require('lodash');
var fs                  = require('fs');
var path                = require('path');
var injector, clientPlugin, serverPlugin, container;

/**
 * For now this is just a passthrough to the injector's init function
 * @param opts
 */
function init(opts) {
    opts = opts || {};

    // include pancakes instance into options that we pass to plugins
    opts.pluginOptions = opts.pluginOptions || {};
    opts.pluginOptions.pancakes = exports;

    injector = new DependencyInjector(opts);
    var ClientPlugin = opts.clientPlugin;
    var ServerPlugin = opts.serverPlugin;

    if (ClientPlugin) { clientPlugin = new ClientPlugin(opts); }
    if (ServerPlugin) { serverPlugin = new ServerPlugin(opts); }

    apiRouteHandler.init({ injector: injector });
    webRouteHandler.init({ injector: injector, clientPlugin: clientPlugin, rootDir: opts.rootDir });
}

/**
 * Convenience function for apps to use. Calls init after
 * setting some values.
 *
 * @param opts
 */
function initContainer(opts) {
    var apps, appDir;

    container = opts.container;

    // if batch, preload that dir
    container === 'batch' ?
        opts.preload.push('batch') :
        opts.preload.push('middleware');

    if (container === 'webserver') {
        appDir = path.join(opts.rootDir, '/app');
        apps = fs.readdirSync(appDir);
        _.each(apps, function (app) {
            opts.preload = opts.preload.concat([
                'app/' + app + '/filters',
                'app/' + app + '/utils'
            ]);
        });
    }

    init(opts);
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

/**
 * Use the transformer factory to find a transformer and return the generated code
 * @param flapjack
 * @param pluginOptions
 * @param runtimeOptions
 * @returns {*}
 */
function transform(flapjack, pluginOptions, runtimeOptions) {
    var name = runtimeOptions.transformer;
    var transformer = transformerFactory.getTransformer(name, clientPlugin, pluginOptions);
    var options = _.extend({}, pluginOptions, runtimeOptions);
    return transformer.transform(flapjack, options);
}

// exported functions
module.exports = exports = {
    init:           init,
    initContainer:  initContainer,
    requireModule:  requireModule,
    cook:           cook,
    getService:     getService,
    checkInjector:  checkInjector,
    checkPlugins:   checkPlugins,
    transform:      transform,

    utils:              utils,
    eventBus:           eventBus,
    annotations:        annotationHelper,
    apiRouteHandler:    apiRouteHandler,
    webRouteHandler:    webRouteHandler,
    baseTransformer:    baseTransformer,

    getContainer:   function () { return container; },
    destroy:        function () { injector = null; },
    getInjector:    function () { return injector; },
    clearCache:     function () { checkInjector(); injector.clearCache(); },
    exists:         function (filePath) { checkInjector(); return injector.exists(filePath); },
    getRootDir:     function () { checkInjector(); return injector.rootDir; },
    addApiRoutes:   function (opts) { checkPlugins(); serverPlugin.addApiRoutes(opts); },
    addWebRoutes:   function (opts) { checkPlugins(); serverPlugin.addWebRoutes(opts); },
    processRoute:   function (opts) { checkPlugins(); serverPlugin.processRoute(opts); }
};