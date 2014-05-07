/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 3/3/14
 *
 *
 */
var _ = require('lodash');
var fs = require('fs');
var eventBus = require('../event.bus');
var utils = require('../utensils');

/**
 * Constructor doesn't currently do anything
 * @constructor
 */
var InternalObjectFactory = function (injector) {
    this.injector = injector;
    this.internalObjects = {
        eventBus: eventBus,
        utensils: utils,
        resources: true,
        reactors: true,
        adapters: true
    };
};

/**
 * Load all resources into an object that can be injected
 * @returns {{}}
 */
InternalObjectFactory.prototype.loadResources = function () {
    var resources = {};
    var resourcesDir = this.injector.rootDir + '/' + this.injector.servicesDir + '/resources';

    if (!fs.existsSync(resourcesDir)) {
        return resources;
    }

    var me = this;
    var resourceNames = fs.readdirSync(resourcesDir);

    _.each(resourceNames, function (resourceName) {
        if (resourceName.substring(resourceName.length - 3) !== '.js') {  // only dirs, not js files
            resources[resourceName] = me.injector.loadModule(utils.getCamelCase(resourceName + '.resource'));
        }
    });

    return resources;
};

/**
 * Load all adapters into an object that can be injected
 * @returns {{}}
 */
InternalObjectFactory.prototype.loadAdapters = function () {
    var adapters = {};
    var adaptersDir = this.injector.rootDir + '/' + this.injector.servicesDir + '/adapters';

    if (!fs.existsSync(adaptersDir)) {
        return adapters;
    }

    var me = this;
    var adapterNames = fs.readdirSync(adaptersDir);

    _.each(adapterNames, function (adapterName) {
        if (adapterName.substring(adapterName.length - 3) !== '.js') {  // only dirs, not js files
            var adapterImpl = me.injector.adapterMap[adapterName];
            adapterName = utils.getPascalCase(adapterImpl + '.' + adapterName + '.adapter');
            adapters[adapterName] = me.injector.loadModule(adapterName);
        }
    });

    return adapters;
};

/**
 * Load all reactors into an object that can be injected
 * @returns {{}}
 */
InternalObjectFactory.prototype.loadReactors = function () {
    var reactors = {};
    var reactorsDir = this.injector.rootDir + '/' + this.injector.servicesDir + '/reactors';

    if (!fs.existsSync(reactorsDir)) {
        return reactors;
    }

    var me = this;
    var reactorNames = fs.readdirSync(reactorsDir);

    _.each(reactorNames, function (reactorName) {
        reactorName = reactorName.substring(0, reactorName.length - 3);
        reactors[reactorName] = me.injector.loadModule(utils.getCamelCase(reactorName));
    });

    return reactors;
};

/**
 * Only candidate if matches one of the internal objects
 * @param objectName
 * @returns {boolean}
 */
InternalObjectFactory.prototype.isCandidate = function (objectName) {
    return this.internalObjects[objectName];
};

/**
 * No cache, so does nothing, but needed for interface
 */
InternalObjectFactory.prototype.clearCache = function () {};

/**
 * Very simply use require to get the object
 * @param objectName
 * @returns {{}}
 */
InternalObjectFactory.prototype.create = function (objectName) {

    // for resources we need to load them the first time they are referenced
    if (objectName === 'resources' && this.internalObjects[objectName] === true) {
        this.internalObjects[objectName] = this.loadResources();
    }

    // for reactors we need to load them the first time they are referenced
    else if (objectName === 'reactors' && this.internalObjects[objectName] === true) {
        this.internalObjects[objectName] = this.loadReactors();
    }

    // for adapters we need to load them the first time they are referenced
    else if (objectName === 'adapters' && this.internalObjects[objectName] === true) {
        this.internalObjects[objectName] = this.loadAdapters();
    }

    return this.internalObjects[objectName];
};

// export the class
module.exports = InternalObjectFactory;