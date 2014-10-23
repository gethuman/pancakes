/**
 * Author: Jeff Whelpley
 * Date: 3/3/14
 *
 * This factory will expose internal pancakes objects as well as pancakes
 * collections for injection
 */
var _               = require('lodash');
var fs              = require('fs');
var path            = require('path');
var utils           = require('../utensils');
var eventBus        = require('../server.event.bus');

/**
 * Constructor doesn't currently do anything
 * @constructor
 */
function InternalObjectFactory(injector) {
    this.injector = injector;
    this.internalObjects = {
        resources: true,
        reactors: true,
        adapters: true,
        appConfigs: true,
        eventBus: eventBus,
        chainPromises: utils.chainPromises
    };
}

_.extend(InternalObjectFactory.prototype, {

    /**
     * Load all resources into an object that can be injected
     * @returns {{}}
     */
    loadResources: function loadResources() {
        var resources = {};
        var resourcesDir = path.join(this.injector.rootDir, this.injector.servicesDir + '/resources');


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
    },

    /**
     * Load all adapters into an object that can be injected
     * @returns {{}}
     */
    loadAdapters: function loadAdapters() {
        var adapters = {};
        var adaptersDir = path.join(this.injector.rootDir, this.injector.servicesDir + '/adapters');

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
    },

    /**
     * Load all reactors into an object that can be injected
     * @returns {{}}
     */
    loadReactors: function loadReactors() {
        var reactors = {};
        var reactorsDir = path.join(this.injector.rootDir, this.injector.servicesDir + '/reactors');

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
    },

    /**
     * Load all app configs into an object that can be injected
     * @returns {{}}
     */
    loadAppConfigs: function loadAppConfigs() {
        var appConfigs = {};
        var appDir = path.join(this.injector.rootDir, '/app');

        if (!fs.existsSync(appDir)) {
            return appConfigs;
        }

        var me = this;
        var appNames = fs.readdirSync(appDir);

        _.each(appNames, function (appName) {
            appConfigs[appName] = me.injector.loadModule('app/' + appName + '/' + appName + '.app');
        });

        return appConfigs;
    },

    /**
     * Only candidate if matches one of the internal objects
     * @param objectName
     * @returns {boolean}
     */
    isCandidate: function isCandidate(objectName) {
        return this.internalObjects[objectName];
    },

    /**
     * No cache, so does nothing, but needed for interface
     */
    clearCache: function clearCache() {},

    /**
     * Very simply use require to get the object
     * @param objectName
     * @returns {{}}
     */
    create: function create(objectName) {

        // for resources we need to load them the first time they are referenced
        if (objectName === 'resources' && this.internalObjects[objectName] === true) {
            this.internalObjects[objectName] = this.loadResources();
        }

        // for reactors we need to load them the first time they are referenced
        else if (objectName === 'reactors' && this.internalObjects[objectName] === true) {
            this.internalObjects[objectName] = this.loadReactors();
        }

        // for reactors we need to load them the first time they are referenced
        else if (objectName === 'appConfigs' && this.internalObjects[objectName] === true) {
            this.internalObjects[objectName] = this.loadAppConfigs();
        }

        // for adapters we need to load them the first time they are referenced
        else if (objectName === 'adapters' && this.internalObjects[objectName] === true) {
            this.internalObjects[objectName] = this.loadAdapters();
        }

        return this.internalObjects[objectName];
    }
});

// export the class
module.exports = InternalObjectFactory;
