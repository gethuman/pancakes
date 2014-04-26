/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/8/14
 *
 * Used for generating views
 */
var fs =    require('fs');
var _ =     require('lodash');
var jeff =  require('jeff-core');

/**
 * Initialize the view factory
 * @param injector
 * @constructor
 */
var ViewFactory = function (injector) {
    this.injector = injector;
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

    function serverPartial (partialName, model) {
        var nameInAppDir = me.injector.rootDir + '/app/' + appName + '/partials/' + partialName + '.partial';
        var nameInCommonDir = me.injector.rootDir + '/app/common/partials/' + partialName + '.partial';
        var partial;

        // if in app dir, else in common dir
        if (fs.existsSync(nameInAppDir + '.js')) { partial = require(nameInAppDir); }
        else                                     { partial = require(nameInCommonDir); }

        // if partialModel on partial, modify the model
        if (partial.partialModel) {
            var partialModel = me.injector.loadModule(partial.partialModel, moduleStack);
            partialModel(model);
        }

        // we will need to inject the partial in recursive fashion
        dependencies = dependencies || {};
        dependencies.model = model;
        dependencies.serverPartial = serverPartial;     // need recursive reference for partials that have partials

        var opts = { flapjack: partial.serverView, dependencies: dependencies, app: appName, type: 'view' };
        return me.injector.loadModule(partialName, moduleStack, opts);
    }

    return serverPartial;
};

/**
 * Create the view
 * @param modulePath
 * @param moduleStack
 * @param options
 */
ViewFactory.prototype.create = function (modulePath, moduleStack, options) {
    var deps = options.dependencies || {};
    jeff.addShortcutsToScope(deps);

    deps.clientPartial = function (name, attrs) {
        attrs = attrs || {};
        attrs['gh-' + name] = null;
        return jeff.elems.div(attrs);
    };

    // the serverPartial method is used to get partials
    deps.serverPartial = this.getServerPartial(options.app, options.dependencies, moduleStack);

    // get the injected view using the flapjack factory
    var injectedView = this.injector.flapjackFactory.injectFlapjack(options.flapjack, moduleStack, deps);
    return jeff.naked(injectedView);  // wrap in naked in case array returned
};

// expose the class
module.exports = ViewFactory;