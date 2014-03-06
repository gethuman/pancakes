/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 3/3/14
 *
 *
 */
var eventBus = require('../event.bus');
var utils = require('../utensils');

/**
 * Constructor doesn't currently do anything
 * @constructor
 */
var InternalObjectFactory = function (injector) {
    this.injector = injector;
    this.internalObjects = ['eventBus', 'pancakeUtensils'];
};

/**
 * Only candidate if matches one of the internal objects
 * @param objectName
 * @returns {boolean}
 */
InternalObjectFactory.prototype.isCandidate = function (objectName) {
    return this.internalObjects.indexOf(objectName) >= 0;
};

/**
 * Very simply use require to get the object
 * @param objectName
 * @returns {{}}
 */
InternalObjectFactory.prototype.create = function (objectName) {

    if (objectName === 'eventBus') {
        return eventBus;
    }
    else if (objectName === 'pancakeUtensils') {
        return utils;
    }

    return null;
};

// export the class
module.exports = InternalObjectFactory;