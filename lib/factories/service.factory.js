/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This is where services are generated
 */
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var utils = require('../utensils');
var cache = {};

/**
 * Candidate if no slash and the modulePath ends in 'Service'
 * @param modulePath
 * @returns {boolean}
 */
var isCandidate = function (modulePath) {
    modulePath = modulePath || '';
    var len = modulePath.length;
    return modulePath.indexOf('/') < 0 && len > 7 &&
        modulePath.substring(modulePath.length - 7) === 'Service';
};

/**
 * This small function is needed in order to create a closure around calls
 * which is dynamically generated for each loop in putItAllTogether()
 * @param calls
 * @returns {Function}
 */
var getServiceMethod = function (calls) {
    return function (req) {
        return calls.reduce(Q.when, Q(req));
    };
};

/**
 * Take all the objects involved with a service and put them all together
 * @param resource
 * @param adapter
 * @param beforeFilters
 * @param afterFilters
 * @returns {{}}
 */
var putItAllTogether = function (resource, adapter, beforeFilters, afterFilters) {
    var service = {};
    var i, method, calls;

    if (!resource.methods) {
        throw new Error('Resource ' + resource.name + ' has no methods');
    }

    for (i = 0; i < resource.methods.length; i++) {
        method = resource.methods[i];
        calls = [];


        if (!adapter[method]) {
            continue;
        }

        _.each(beforeFilters, function (filter) {
            if (filter[method + '_before']) {
                calls.push(filter[method + '_before']);
            }
        });

        calls.push(adapter[method]);

        _.each(afterFilters, function (filter) {
            if (filter[method + '_after']) {
                calls.push(filter[method + '_after']);
            }
        });

        service[method] = getServiceMethod(calls);
    }

    return service;
};

/**
 * Figure out information about the service based on the module path and the adapter map
 *
 * @param serviceName
 * @param adapterMap
 * @returns {{}}
 */
var getServiceInfo = function (serviceName, adapterMap) {
    var serviceInfo = {};
    var serviceParts = utils.splitCamelCase(serviceName);  // turn oneTwoThree into ['one', 'two', 'three']
    var nbrParts = serviceParts.length;

    // first check to see if the second to last part is an adapter
    serviceInfo.adapterName = serviceParts[nbrParts - 2];  // NOTE: last item in array is 'Service'
    if (adapterMap[serviceInfo.adapterName]){
        serviceInfo.resourceName = serviceParts.slice(0, nbrParts - 2).join('.');
    }
    // if not, it means we are dealing with a straight service (ex. postService)
    else
    {
        serviceInfo.adapterName = 'service';
        serviceInfo.resourceName = serviceParts.slice(0, nbrParts - 1).join('.');
    }

    serviceInfo.adapterImpl = adapterMap[serviceInfo.adapterName];

    return serviceInfo;
};

/**
 * Get a resource based on the
 * @param serviceInfo
 * @param injector
 * @returns {{}} A resource object
 */
var getResource = function (serviceInfo, injector) {
    var servicesDir = injector.servicesDir;
    var servicesFullPath = injector.rootDir + '/' + servicesDir;
    var resourceName = serviceInfo.resourceName;

    var resourcePath = '/resources/' + resourceName + '/' + resourceName + '.resource';
    if (!fs.existsSync(servicesFullPath + resourcePath + '.js')) {
        throw new Error('ServiceFactory could not find resource for ' + resourcePath);
    }

    return injector.loadModule(servicesDir + resourcePath);
};

/**
 * Switch the adapterName if it is 'service' and there is a default adapter in the resource file
 * @param serviceInfo
 * @param adapterMap
 * @param resource
 * @param container
 */
var checkForDefaultAdapter = function (serviceInfo, resource, adapterMap, container) {
    if (serviceInfo.adapterName === 'service' &&
        resource.adapters && resource.adapters[container]) {


        serviceInfo.adapterName = resource.adapters[container];
        serviceInfo.adapterImpl = adapterMap[serviceInfo.adapterName];
    }
};

/**
 * Get a adapter based on the service info and what exists on the file system
 * @param serviceInfo
 * @param injector
 * @returns {{}} An adapter object
 */
var getAdapter = function (serviceInfo, injector) {
    var servicesDir = injector.servicesDir;
    var servicesFullPath = injector.rootDir + '/' + servicesDir;
    var adapterName = serviceInfo.adapterName;
    var adapterImpl = serviceInfo.adapterImpl;
    var resourceName = serviceInfo.resourceName;

    // error if the adapter or resource doesn't exist
    var adapterPath = '/adapters/' + adapterName + '/' + adapterImpl + '.' + adapterName + '.adapter';
    if (!fs.existsSync(servicesFullPath + adapterPath + '.js')) {
        throw new Error('ServiceFactory could not find adapter for ' + adapterPath);
    }

    // get the adapter
    var adapter = injector.loadModule(servicesDir + adapterPath);

    // if the override exists, add it to the adapter
    var overridePath = '/resources/' + resourceName + '/' + resourceName + '.' + adapterName + '.override';
    if (fs.existsSync(servicesFullPath + overridePath + '.js')) {
        _.extend(adapter, injector.loadModule(servicesDir + overridePath));
    }

    return adapter;
};

/**
 * Get filters for a given set of paths
 *
 * @param filterPaths
 * @param injector
 * @returns {Array}
 */
var getFilters = function (filterPaths, injector) {
    var filters = [];

    _.each(filterPaths, function (path) {
        filters.push(injector.loadModule(injector.servicesDir + '/' + path));
    });

    return filters;
};

/**
 * Create a new service (or pull it from cache if it already exists)
 *
 * @param serviceName
 * @param moduleStack
 * @param injector
 * @returns {{}}
 */
var create = function (serviceName, moduleStack, injector) {

    if (cache[serviceName]) {
        return cache[serviceName];
    }

    var serviceInfo = getServiceInfo(serviceName, injector.adapterMap);
    var resource = getResource(serviceInfo, injector);

    // check to see if we need to use the default adapter
    checkForDefaultAdapter(serviceInfo, resource, injector.adapterMap, injector.container);

    var adapter = getAdapter(serviceInfo, injector);
    var beforeFilters = getFilters(adapter.beforeFilters, injector);
    var afterFilters = getFilters(adapter.afterFilters, injector);
    var service = putItAllTogether(resource, adapter, beforeFilters, afterFilters);

    cache[serviceName] = service;
    return service;
};

// expose all functions for testing reasons
module.exports = {
    cache: cache,
    isCandidate: isCandidate,
    getServiceMethod: getServiceMethod,
    putItAllTogether: putItAllTogether,
    getServiceInfo: getServiceInfo,
    getResource: getResource,
    checkForDefaultAdapter: checkForDefaultAdapter,
    getAdapter: getAdapter,
    getFilters: getFilters,
    create: create
};

