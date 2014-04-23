/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/8/14
 *
 * Used for generating views
 */
var fs =    require('fs');
var _ =     require('lodash');
var jeff =  require('jeff');

/**
 * Initialize the view factory
 * @param injector
 * @constructor
 */
var ViewFactory = function (injector) {
    this.injector = injector;
    this.partialsCache = {};
};

/**
 * As a matter of
 * @param viewName
 * @param options
 * @returns {boolean}
 */
ViewFactory.prototype.isCandidate = function (viewName, options) {
    return options && options.type === 'view';
};

/**
 * No cache, so does nothing, but needed for interface
 */
ViewFactory.prototype.clearCache = function () {};

/**
 * Used to dive into a partial
 * @param appName
 * @param dependencies
 * @param moduleStack
 */
ViewFactory.prototype.getServerPartial = function (appName, dependencies, moduleStack) {
    var me = this;

    // this is what will be called within one view to get a partial
    return function (partialName, model) {
        var cacheKey = appName + '||' + partialName;
        var nameInAppDir = me.injector.rootDir + '/app/' + appName + '/partials/' + partialName + '.partial';
        var nameInCommonDir = me.injector.rootDir + '/app/common/partials/' + partialName + '.partial';
        var partial;

        // if in cache, us that else try app dir and then finally the common dir
        if (me.partialsCache[cacheKey]) { partial = me.partialsCache[cacheKey]; }
        else if (fs.existsSync(nameInAppDir + '.js')) { partial = require(nameInAppDir); }
        else { partial = require(nameInCommonDir); }

        // save the ref to cache (this will avoid touching the file system in subsequent calls)
        me.partialsCache[cacheKey] = partial;

        // we will need to inject the partial in recursive fashion
        dependencies = dependencies || {};
        dependencies.parentModel = model;
        var opts = { flapjack: partial.serverView, dependencies: dependencies, app: appName, type: 'view' };
        return me.injector.loadModule(partialName, moduleStack, opts);
    };
};

/**
 * Create the view
 * @param modulePath
 * @param moduleStack
 * @param options
 */
ViewFactory.prototype.create = function (modulePath, moduleStack, options) {
    var deps = _.extend({}, options.dependencies, {
        serverPartial: this.getServerPartial(options.app, options.dependencies, moduleStack),
        clientPartial: function (name, attrs) {
            attrs = attrs || {};
            attrs['gh-' + name] = null;
            return jeff.elems.div(attrs);
        }
    });

    // we have to add all jeff methods to dependencies so they can be injected in
    jeff.addShortcutsToScope(deps);

    // get the injected view using the flapjack factory
    var injectedView = this.injector.flapjackFactory.injectFlapjack(options.flapjack, moduleStack, deps);
    return jeff.naked(injectedView);  // wrap in naked in case array returned
};

// expose the class
module.exports = ViewFactory;