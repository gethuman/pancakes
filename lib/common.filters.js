/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 2/27/14
 *
 * This where we have all the common filters used by the service factory
 */
var Q = require('q');

/**
 * Add the resource and method to the request context
 * @param resource
 * @param method
 * @returns {Function}
 */
var validateRequestParams = function (resource, method) {
    return function (req) {
        req = req || {};

        var deferred = Q.defer();
        var params = resource.params || {};
        var methodParams = params[method] || {};
        var required = methodParams.required || [];
        var optional = methodParams.optional || [];
        var validParams = required.concat(optional);
        var i, param;

        // make sure all the required params are there
        for (i = 0; i < required.length; i++) {
            param = required[i];
            if (!req[param]) {
                deferred.reject('Missing ' + param + '. Required params: ' + JSON.stringify(required));
                return deferred.promise;
            }
        }

        // now loop through the values and error if invalid param in there
        for (var key in req) {
            if (req.hasOwnProperty(key) && validParams.indexOf(key) < 0) {
                deferred.reject(key + ' is not allowed. Valid params: ' + JSON.stringify(validParams));
            }
        }

        // everything good, so set the resource and method on the request
        req.resource = resource;
        req.method = method;

        // check to make sure the params are set up
        deferred.resolve(req);
        return deferred.promise;
    };
};

/**
 * Safetly check to ensure that the adapter properly responded with an object that contains
 * the data (what is actually being returned) as well as the resource
 * @param res
 * @returns {Q}
 */
var validateAdapterResponse = function (res) {
    var deferred = Q.defer();

    if (!res || !res.data || !res.resource) {
        deferred.reject('Adapter does not contain data and/or resource. In your adapter, ' +
            'set data on the request and send the request object in the promise resolve.');
    }
    else {
        deferred.resolve(res);
    }

    return deferred.promise;
};

/**
 * The final response filter will ensure that only data is sent back
 * to the calling client
 * @param res
 * @returns {Q}
 */
var convertResponseToData = function (res) {
    res = res || {};
    return new Q(res.data);
};

// expose the filters
module.exports = {
    validateRequestParams: validateRequestParams,
    validateAdapterResponse: validateAdapterResponse,
    convertResponseToData: convertResponseToData
};
