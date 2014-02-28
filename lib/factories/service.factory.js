/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This is where services are generated
 */
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var commonFilters = require('../common.filters');
var utils = require('../utensils');
var cache = {};

/**
 * Simple function to clear the cache
 */
var clearCache = function () {
    cache = {};
};

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
 *
 * @param calls
 * @returns {Function}
 */
var getServiceMethod = function (calls) {
    return function (req) {
        return calls.reduce(Q.when, new Q(req));
    };
};

/**
 * Take all the objects involved with a service and put them all together
 * @param serviceInfo
 * @param resource
 * @param adapter
 * @param filters
 * @returns {{}}
 */
var putItAllTogether = function (serviceInfo, resource, adapter, filters) {
    var service = {};
    var i, method, calls, beforeFilters, afterFilters;

    if (!resource.methods || !resource.methods[serviceInfo.adapterName]) {
        throw new Error('Resource ' + resource.name + ' has no methods for ' + serviceInfo.adapterName);
    }

    var methods = resource.methods[serviceInfo.adapterName];

    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        calls = [];
        beforeFilters = filters && filters.beforeFilters;
        afterFilters = filters && filters.afterFilters;

        if (!adapter[method]) {
            continue;
        }

        // before anything else, we need to init the request with the resource
        calls.push(commonFilters.validateRequestParams(resource, method));

        // This will prevent a jshint error. We actually want to create functions within a loop
        /* jshint loopfunc:true */
        _.each(beforeFilters, function (filterInfo) {
            if (filterInfo[method] || filterInfo.all) {
                calls.push(filters[filterInfo.name]);
            }
        });

        // this is the primary target for the service call; after this is the response going out
        var fn = adapter[method];
        fn.bind(adapter);
        calls.push(fn);

        // do a safety check here to make sure data and resource set
        calls.push(commonFilters.validateAdapterResponse);

        // the after filters will modify the response
        _.each(afterFilters, function (filterInfo) {
            if (filterInfo[method] || filterInfo.all) {
                calls.push(filters[filterInfo.name]);
            }
        });

        // final thing is to only return the data at the end of the service call (if it exists)
        calls.push(commonFilters.convertResponseToData);

        // create the method on the service based off the chain of calls
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
    if (adapterMap[serviceInfo.adapterName]) {
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
 * @param moduleStack
 * @param injector
 * @returns {{}} A resource object
 */
var getResource = function (serviceInfo, moduleStack, injector) {
    var servicesDir = injector.servicesDir;
    var servicesFullPath = injector.rootDir + '/' + servicesDir;
    var resourceName = serviceInfo.resourceName;

    var resourcePath = '/resources/' + resourceName + '/' + resourceName + '.resource';
    if (!fs.existsSync(servicesFullPath + resourcePath + '.js')) {
        throw new Error('ServiceFactory could not find resource for ' + servicesFullPath + resourcePath);
    }

    return injector.loadModule(servicesDir + resourcePath, moduleStack);
};

/**
 * Switch the adapterName if it is 'service' and there is a default adapter in the resource file
 * @param serviceInfo
 * @param resource
 * @param moduleStack
 * @param injector
 * @returns {{}} The default service if it exists
 */
var checkForDefaultAdapter = function (serviceInfo, resource, moduleStack, injector) {
    if (serviceInfo.adapterName === 'service' &&
        resource.adapters && resource.adapters[injector.container]) {

        serviceInfo.adapterName = resource.adapters[injector.container];
        serviceInfo.adapterImpl = injector.adapterMap[serviceInfo.adapterName];

        // return the default object
        var dotNotationName = serviceInfo.resourceName + '.' + serviceInfo.adapterName + '.service';
        var defaultServiceName = utils.getModuleName(dotNotationName);

        return injector.loadModule(defaultServiceName);
    }

    return null;
};

/**
 * Get a adapter based on the service info and what exists on the file system
 * @param serviceInfo
 * @param resource
 * @param moduleStack
 * @param injector
 */
var getAdapter = function (serviceInfo, resource, moduleStack, injector) {
    var servicesDir = injector.servicesDir;
    var servicesFullPath = injector.rootDir + '/' + servicesDir;
    var adapterName = serviceInfo.adapterName;
    var adapterImpl = serviceInfo.adapterImpl;
    var resourceName = serviceInfo.resourceName;
    var Adapter;

    // error if the adapter or resource doesn't exist
    var adapterPath = '/adapters/' + adapterName + '/' + adapterImpl + '.' + adapterName + '.adapter';
    if (!fs.existsSync(servicesFullPath + adapterPath + '.js')) {
        throw new Error('ServiceFactory could not find adapter for ' + adapterPath);
    }

    // if the override exists, use that
    var overridePath = '/resources/' + resourceName + '/' + resourceName + '.' + adapterName + '.override';
    if (fs.existsSync(servicesFullPath + overridePath + '.js')) {
        Adapter = injector.loadModule(servicesDir + overridePath, moduleStack);
    }
    // else just use the lower level adapter
    else {
        Adapter = injector.loadModule(servicesDir + adapterPath, moduleStack);
    }

    return new Adapter(resource);
};

/**
 * Get filters for a given set of paths
 *
 * @param serviceInfo
 * @param moduleStack
 * @param injector
 * @returns {{}}
 */
var getFilters = function (serviceInfo, moduleStack, injector) {
    var adapter = serviceInfo.adapterName;
    var resource = serviceInfo.resourceName;
    var services = injector.servicesDir;
    var adapterPath = services + '/adapters/' + adapter + '/' + adapter + '.filters';
    var resourcePath = services + '/resources/' + resource + '/' + resource + '.filters';
    var filters = {};

    if (fs.existsSync(injector.rootDir + '/' + adapterPath + '.js')) {
        _.extend(filters, injector.loadModule(adapterPath, moduleStack));
    }

    if (fs.existsSync(injector.rootDir + '/' + resourcePath + '.js')) {
        _.extend(filters, injector.loadModule(resourcePath, moduleStack));
    }

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
    var resource = getResource(serviceInfo, moduleStack, injector);

    // check to see if we need to use the default adapter and the associated default service
    var defaultService = checkForDefaultAdapter(serviceInfo, resource, moduleStack, injector);
    if (defaultService) {
        cache[serviceName] = defaultService;
        return defaultService;
    }

    var adapter = getAdapter(serviceInfo, resource, moduleStack, injector);
    var filters = getFilters(serviceInfo, moduleStack, injector);
    var service = putItAllTogether(serviceInfo, resource, adapter, filters);

    cache[serviceName] = service;
    return service;
};

// expose all functions for testing reasons
module.exports = {
    cache: cache,
    clearCache: clearCache,
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

