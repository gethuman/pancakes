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
        resources: true
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
 * Only candidate if matches one of the internal objects
 * @param objectName
 * @returns {boolean}
 */
InternalObjectFactory.prototype.isCandidate = function (objectName) {
    return this.internalObjects[objectName];
};

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

    return this.internalObjects[objectName];
};

// export the class
module.exports = InternalObjectFactory;