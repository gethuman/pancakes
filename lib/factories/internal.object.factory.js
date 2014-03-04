/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 3/3/14
 *
 *
 */
var eventBus = require('../event.bus');

/**
 * Constructor doesn't currently do anything
 * @constructor
 */
var InternalObjectFactory = function () {};

/**
 * Only candidate if matches one of the internal objects
 * @param objectName
 * @returns {boolean}
 */
InternalObjectFactory.prototype.isCandidate = function (objectName) {
    return objectName === 'eventBus';
};

