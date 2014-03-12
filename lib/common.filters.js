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
        var eitheror = methodParams.eitheror || [];
        var optional = methodParams.optional || [];
        var i, param, eitherorExists;

        // make sure all the required params are there
        for (i = 0; i < required.length; i++) {
            param = required[i];
            if (!req[param]) {
                deferred.reject('Missing ' + param + '. Required params: ' + JSON.stringify(required));
                return deferred.promise;
            }
        }

        // make sure at least one of the eitheror params are there
        if (eitheror.length > 0) {
            eitherorExists = false;
            for (i = 0; i < eitheror.length; i++) {
                param = eitheror[i];
                if (req[param]) {
                    eitherorExists = true;
                    break;
                }
            }

            if (!eitherorExists) {
                deferred.reject('Must have one of the following params: ' + JSON.stringify(eitheror));
                return deferred.promise;
            }
        }

        // now loop through the values and error if invalid param in there
        var validParams = required.concat(eitheror, optional, ['lang', 'caller', 'resource', 'method']);
        for (var key in req) {
            if (req.hasOwnProperty(key) && validParams.indexOf(key) < 0) {
                deferred.reject(key + ' is not allowed. Valid params: ' + JSON.stringify(validParams));
            }
        }

        // everything good, so set the resource and method on the request
        req.resource = resource;
        req.method = method;

        // if data exists, save it in the inputData field so available after data gets overridden
        if (req.data) {
            req.inputData = req.data;
        }

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

    if (!res) {
        deferred.reject('Adapter resolved without returning anything. In your adapter, ' +
            'set data on the request and send the request object in the promise resolve.');
    }
    else if (res.data === undefined) {
        deferred.reject('Adapter did not set data in the response. In your adapter, ' +
            'set data on the request and send the request object in the promise resolve.');
    }
    else if (!res.resource) {
        deferred.reject('Adapter response does not have the resource. In your adapter, ' +
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
