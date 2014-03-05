/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This is where services are generated
 */
var Q =     require('q');
var _ =     require('lodash');
var fs =    require('fs');

var commonFilters =     require('../common.filters');
var utils =             require('../utensils');
var eventBus =          require('../event.bus');
var debugHandler =      require('../debug.handler');

/**
 * Simple function to clear the cache
 * @param injector
 * @constructor
 */
var ServiceFactory = function (injector) {
    this.cache = {};
    this.injector = injector;

    // if we are in debug mode, then add the debug handler
    var pattern = this.injector.debugPattern || '*.*.*.*.*';
    var handler = this.injector.debugHandler || debugHandler;
    if (this.injector.debug) {
        eventBus.on(pattern, handler);
    }
};

 /**
 * Candidate if no slash and the modulePath ends in 'Service'
 * @param modulePath
 * @returns {boolean}
 */
ServiceFactory.prototype.isCandidate = function (modulePath) {
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
ServiceFactory.prototype.getServiceMethod = function (calls) {
    return function (req) {
        return calls.reduce(Q.when, new Q(req));
    };
};

/**
 * This is used to get an mock filter which will be sending out events
 * @param calls
 * @param eventNameBase
 * @param debugParams
 */
ServiceFactory.prototype.addEventEmitterToCalls = function (calls, eventNameBase, debugParams) {
    var name = _.extend({}, eventNameBase, debugParams);

    var evtEmitter = function (req) {
        var payload = JSON.parse(JSON.stringify(req));  // copy of data for event
        payload.resource = name.resource + 'Resource';  // passing around the resource data is a waste so don't
        var eventData = {
            name: name,
            payload: payload
        };
        var eventName = name.resource + '.' + name.adapter + '.' + name.method;
        eventName += debugParams ? '.' + name.type + '.' + name.timing : '';
        eventBus.emit(eventName, eventData);
        return new Q(req);
    };

    // basically only add the emitter if in debug mode or this is not for debug purposes
    if (this.injector.debug || !debugParams) {
        calls.push(evtEmitter);
    }
};

/**
 * Take all the objects involved with a service and put them all together
 * @param serviceInfo
 * @param resource
 * @param adapter
 * @param filters
 * @returns {{}}
 */
ServiceFactory.prototype.putItAllTogether = function (serviceInfo, resource, adapter, filters) {
    var service = {};
    var i, method, calls, eventNameBase;
    var me = this;

    if (!resource.methods || !resource.methods[serviceInfo.adapterName]) {
        throw new Error('Resource ' + resource.name + ' has no methods for ' + serviceInfo.adapterName);
    }

    var methods = resource.methods[serviceInfo.adapterName];

    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        eventNameBase = { resource: serviceInfo.resourceName, adapter: serviceInfo.adapterName, method: method };
        calls = [];

        if (!adapter[method]) {
            continue;
        }

        this.addEventEmitterToCalls(calls, eventNameBase, { type: 'service', timing: 'before' });

        // before anything else, we need to init the request with the resource
        calls.push(commonFilters.validateRequestParams(resource, method));

        // This will prevent a jshint error. We actually want to create functions within a loop
        /* jshint loopfunc:true */
        _.each(filters.beforeFilters, function (filterInfo) {
            if (filterInfo[method] || filterInfo.all) {
                me.addEventEmitterToCalls(calls, eventNameBase, { type: filterInfo.name, timing: 'before' });
                calls.push(filters[filterInfo.name].bind(filters));
                me.addEventEmitterToCalls(calls, eventNameBase, { type: filterInfo.name, timing: 'after' });
            }
        });

        // this is the primary target for the service call; after this is the response going out
        this.addEventEmitterToCalls(calls, eventNameBase, { type: 'adapter', timing: 'before' });
        calls.push(adapter[method].bind(adapter));
        this.addEventEmitterToCalls(calls, eventNameBase, { type: 'adapter', timing: 'after' });
        this.addEventEmitterToCalls(calls, eventNameBase, null);

        // do a safety check here to make sure data and resource set
        calls.push(commonFilters.validateAdapterResponse);

        // the after filters will modify the response
        _.each(filters.afterFilters, function (filterInfo) {
            if (filterInfo[method] || filterInfo.all) {
                me.addEventEmitterToCalls(calls, eventNameBase, { type: filterInfo.name, timing: 'before' });
                calls.push(filters[filterInfo.name].bind(filters));
                me.addEventEmitterToCalls(calls, eventNameBase, { type: filterInfo.name, timing: 'after' });
            }
        });

        // final thing is to only return the data at the end of the service call (if it exists)
        calls.push(commonFilters.convertResponseToData);
        this.addEventEmitterToCalls(calls, eventNameBase, { type: 'service', timing: 'after' });

        // create the method on the service based off the chain of calls
        service[method] = this.getServiceMethod(calls);
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
ServiceFactory.prototype.getServiceInfo = function (serviceName, adapterMap) {
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
 * @returns {{}} A resource object
 */
ServiceFactory.prototype.getResource = function (serviceInfo, moduleStack) {
    var servicesDir = this.injector.servicesDir;
    var servicesFullPath = this.injector.rootDir + '/' + servicesDir;
    var resourceName = serviceInfo.resourceName;

    var resourcePath = '/resources/' + resourceName + '/' + resourceName + '.resource';
    if (!fs.existsSync(servicesFullPath + resourcePath + '.js')) {
        throw new Error('ServiceFactory could not find resource for ' + servicesFullPath + resourcePath);
    }

    return this.injector.loadModule(servicesDir + resourcePath, moduleStack);
};

/**
 * Switch the adapterName if it is 'service' and there is a default adapter in the resource file
 * @param serviceInfo
 * @param resource
 * @param moduleStack
 * @returns {{}} The default service if it exists
 */
ServiceFactory.prototype.checkForDefaultAdapter = function (serviceInfo, resource, moduleStack) {
    if (serviceInfo.adapterName === 'service' &&
        resource.adapters && resource.adapters[this.injector.container]) {

        serviceInfo.adapterName = resource.adapters[this.injector.container];
        serviceInfo.adapterImpl = this.injector.adapterMap[serviceInfo.adapterName];

        // return the default object
        var dotNotationName = serviceInfo.resourceName + '.' + serviceInfo.adapterName + '.service';
        var defaultServiceName = utils.getCamelCase(dotNotationName);

        return this.injector.loadModule(defaultServiceName, moduleStack);
    }

    return null;
};

/**
 * Get a adapter based on the service info and what exists on the file system
 * @param serviceInfo
 * @param resource
 * @param moduleStack
 */
ServiceFactory.prototype.getAdapter = function (serviceInfo, resource, moduleStack) {
    var servicesDir = this.injector.servicesDir;
    var servicesFullPath = this.injector.rootDir + '/' + servicesDir;
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
        Adapter = this.injector.loadModule(servicesDir + overridePath, moduleStack);
    }
    // else just use the lower level adapter
    else {
        Adapter = this.injector.loadModule(servicesDir + adapterPath, moduleStack);
    }

    return new Adapter(resource);
};

/**
 * Get filters for a given set of paths
 *
 * @param serviceInfo
 * @param moduleStack
 */
ServiceFactory.prototype.getFilters = function (serviceInfo, moduleStack) {
    var adapter = serviceInfo.adapterName;
    var resource = serviceInfo.resourceName;
    var rootDir = this.injector.rootDir;
    var services = this.injector.servicesDir;
    var Filters;

    // try to get the override resource filters
    var path = rootDir + '/' + services + '/resources/' + resource + '/' + resource + '.' + adapter + '.filters.js';
    var name = utils.getPascalCase(path);
    if (fs.existsSync(path)) {
        Filters = this.injector.loadModule(name, moduleStack);
        return new Filters();
    }

    // else get the adapter level filters if the resource one doesn't exist
    path = rootDir + '/' + services + '/adapters/' + adapter + '/' + adapter + '.filters.js';
    name = utils.getPascalCase(path);
    if (fs.existsSync(path)) {
        Filters = this.injector.loadModule(name, moduleStack);
        return new Filters();
    }

    // empty object if no filters exist
    return {};
};

/**
 * Create a new service (or pull it from cache if it already exists)
 *
 * @param serviceName
 * @param moduleStack
 * @returns {{}}
 */
ServiceFactory.prototype.create = function (serviceName, moduleStack) {

    if (this.cache[serviceName]) {
        return this.cache[serviceName];
    }

    var serviceInfo = this.getServiceInfo(serviceName, this.injector.adapterMap);
    var resource = this.getResource(serviceInfo, moduleStack);

    // check to see if we need to use the default adapter and the associated default service
    var defaultService = this.checkForDefaultAdapter(serviceInfo, resource, moduleStack);
    if (defaultService) {
        this.cache[serviceName] = defaultService;
        return defaultService;
    }

    var adapter = this.getAdapter(serviceInfo, resource, moduleStack);
    var filters = this.getFilters(serviceInfo, moduleStack);
    var service = this.putItAllTogether(serviceInfo, resource, adapter, filters);

    this.cache[serviceName] = service;
    return service;
};

// expose the class
module.exports = ServiceFactory;

