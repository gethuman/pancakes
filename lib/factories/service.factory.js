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
var annotationHelper =  require('../annotation.helper');

/**
 * Simple function to clear the cache
 * @param injector
 * @constructor
 */
var ServiceFactory = function (injector) {
    this.cache = {};
    this.filterCache = {};
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
ServiceFactory.prototype.addEventEmitter = function (calls, eventNameBase, debugParams) {

    // don't do anything if we are not in debug mode
    if (!this.injector.debug && debugParams) {
        return;
    }

    // this is essentially a filter which will send the current request to the event bus
    var name = _.extend({}, eventNameBase, debugParams);
    calls.push(function (req) {
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
    });
};

/**
 * Get the actual filters for a given set of filter names. The filters are cached locally since
 * they are pretty generic.
 *
 * @param filterNames
 * @param moduleStack
 * @returns {{}}
 */
ServiceFactory.prototype.createFilters = function (filterNames, moduleStack) {
    var filters = {};
    var me = this;

    _.each(filterNames, function (name) {
        if (!me.filterCache[name]) {
            var filterPath = me.injector.servicesDir + '/filters/' + name + '.filter';
            me.filterCache[name] = me.injector.loadModule(filterPath, moduleStack);
        }


        filters[name] = me.filterCache[name];
    });

    return filters;
};

/**
 * Get all the before and after filters for a given adapter and method. This is done by looking at both
 * the filter annotations on an adapter method plus the property values. Property values override the
 * annotations because a subclass can then do the filter overrides without implementing the function. So,
 * the precedence is:
 *
 * 1. object's beforeFilters[methodName] and afterFilters[methodName] values (arrays of filter names)
 * 2. the beforeFilters and afterFilters annotations
 * 3. the object's prepend and append values will be added to given sets of filters
 *
 * @param adapter
 * @param method
 * @param moduleStack
 */
ServiceFactory.prototype.getFilters = function (adapter, method, moduleStack) {
    var beforeFilters =
        (adapter.beforeFilters && adapter.beforeFilters[method]) ||
        (adapter.beforeFilters && adapter.beforeFilters.all) ||
        annotationHelper.getAnnotationInfo('beforeFilters', adapter[method], true) || [];
    var afterFilters =
        (adapter.afterFilters && adapter.afterFilters[method]) ||
        (adapter.afterFilters && adapter.afterFilters.all) ||
        annotationHelper.getAnnotationInfo('afterFilters', adapter[method], true) || [];

    var prependBeforeFilters = (adapter.prependBeforeFilters && adapter.prependBeforeFilters[method]) || [];
    var appendBeforeFilters = (adapter.appendBeforeFilters && adapter.appendBeforeFilters[method]) || [];
    var prependAfterFilters = (adapter.prependAfterFilters && adapter.prependAfterFilters[method]) || [];
    var appendAfterFilters = (adapter.appendAfterFilters && adapter.appendAfterFilters[method]) || [];

    beforeFilters = prependBeforeFilters.concat(beforeFilters, appendBeforeFilters);
    afterFilters = prependAfterFilters.concat(afterFilters, appendAfterFilters);

    return {
        beforeFilters: this.createFilters(beforeFilters, moduleStack),
        afterFilters: this.createFilters(afterFilters, moduleStack)
    };
};

/**
 * Take all the objects involved with a service and put them all together. The final service is really
 * just an instance of an adapter with each method enhanced to have various filters added
 *
 * @param serviceInfo
 * @param resource
 * @param adapter
 * @param moduleStack
 * @returns {{}}
 */
ServiceFactory.prototype.putItAllTogether = function (serviceInfo, resource, adapter, moduleStack) {
    var i, method, calls, eventNameBase, filters;
    var methods = resource.methods && resource.methods[serviceInfo.adapterName];
    var me = this;

    if (!methods) {
        throw new Error('Resource ' + resource.name + ' has no methods for ' + serviceInfo.adapterName);
    }

    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        eventNameBase = { resource: serviceInfo.resourceName, adapter: serviceInfo.adapterName, method: method };
        filters = this.getFilters(adapter, method, moduleStack);
        calls = [];

        if (!adapter[method]) {
            continue;
        }

        this.addEventEmitter(calls, eventNameBase, { type: 'service', timing: 'before' });

        // before anything else, we need to init the request with the resource
        calls.push(commonFilters.validateRequestParams(resource, method));

        // This will prevent a jshint error. We actually want to create functions within a loop
        /* jshint loopfunc:true */
        _.each(filters.beforeFilters, function (filter, filterName) {
            me.addEventEmitter(calls, eventNameBase, { type: filterName, timing: 'before' });
            calls.push(filter);
            me.addEventEmitter(calls, eventNameBase, { type: filterName, timing: 'after' });
        });

        // this is the primary target for the service call; after this is the response going out
        this.addEventEmitter(calls, eventNameBase, { type: 'adapter', timing: 'before' });
        calls.push(adapter[method].bind(adapter));  // call the actual adapter method
        this.addEventEmitter(calls, eventNameBase, { type: 'adapter', timing: 'after' });

        // this is a non-debug event that many propagations hang off of
        this.addEventEmitter(calls, eventNameBase, null);

        // do a safety check here to make sure data and resource set
        calls.push(commonFilters.validateAdapterResponse);

        // the after filters will modify the response
        _.each(filters.afterFilters, function (filter, filterName) {
            me.addEventEmitter(calls, eventNameBase, { type: filterName, timing: 'before' });
            calls.push(filter);
            me.addEventEmitter(calls, eventNameBase, { type: filterName, timing: 'after' });
        });

        // service call is now over, so last debug event
        this.addEventEmitter(calls, eventNameBase, { type: 'service', timing: 'after' });

        // create the method on the service based off the chain of calls
        adapter[method] = this.getServiceMethod(calls);
    }

    // so essentially the service is the adapter with each method bulked up to have all the various filters
    return adapter;
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
 *
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

    // if the override exists, use that (if service would just be two parts, else 3)
    var overridePath = '/resources/' + resourceName + '/' + resourceName + '.' +
        (adapterName === 'service' ? adapterName : adapterName + '.service');

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
    var service = this.putItAllTogether(serviceInfo, resource, adapter, moduleStack);

    this.cache[serviceName] = service;
    return service;
};

// expose the class
module.exports = ServiceFactory;

