/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This is where services are generated
 */
var Q =             require('q');
var _ =             require('lodash');
var fs =            require('fs');
var utils =         require('../utensils');
var eventBus =      require('../event.bus');
var debugHandler =  require('../debug.handler');

/**
 * Simple function to clear the cache
 * @param injector
 * @constructor
 */
var ServiceFactory = function (injector) {
    this.cache = {};
    this.injector = injector || {};

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
 * Create a new service (or pull it from cache if it already exists)
 *
 * @param serviceName
 * @param moduleStack
 * @returns {{}}
 */
ServiceFactory.prototype.create = function (serviceName, moduleStack) {

    // if the service already exists in cache, then just return it right away
    if (this.cache[serviceName]) {
        return this.cache[serviceName];
    }

    // get all the parts of the service
    var serviceInfo = this.getServiceInfo(serviceName, this.injector.adapterMap);
    var resource = this.getResource(serviceInfo, moduleStack);
    var adapter = this.getAdapter(serviceInfo, resource, moduleStack);

    // check the cache again because the service name may change if it is a default
    if (this.cache[serviceInfo.serviceName]) {
        return this.cache[serviceInfo.serviceName];
    }

    // construct the service, save it to cache and return it
    var service = this.putItAllTogether(serviceInfo, resource, adapter);
    this.cache[serviceInfo.serviceName] = service;
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
    var serviceInfo = { serviceName: serviceName };
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
    var resourceName = serviceInfo.resourceName;
    var resourcePath = '/resources/' + resourceName + '/' + resourceName + '.resource';
    return this.loadIfExists(resourcePath, moduleStack, 'Could not find resource file');
};

/**
 * Get a adapter based on the service info and what exists on the file system
 *
 * @param serviceInfo
 * @param resource
 * @param moduleStack
 */
ServiceFactory.prototype.getAdapter = function (serviceInfo, resource, moduleStack) {
    var adapterName = serviceInfo.adapterName;

    // if adapter name is 'service' and there is a default, switch to the default
    if (adapterName === 'service' && resource.adapters[this.injector.container]) {
        adapterName = serviceInfo.adapterName = resource.adapters[this.injector.container];
        serviceInfo.adapterImpl = this.injector.adapterMap[adapterName];
        serviceInfo.serviceName = utils.getCamelCase(serviceInfo.resourceName + '.' + serviceInfo.adapterName + '.service');
    }

    var overridePath = '/resources/' + serviceInfo.resourceName + '/' + serviceInfo.resourceName + '.' +
        (adapterName === 'service' ? adapterName : adapterName + '.service');
    var adapterPath = '/adapters/' + adapterName + '/' + serviceInfo.adapterImpl + '.' + adapterName + '.adapter';

    // if override exists, use that one, else use the lower level adapter
    var Adapter =
        this.loadIfExists(overridePath, moduleStack, null) ||
        this.loadIfExists(adapterPath, moduleStack, null);

    if (!Adapter) {
        throw new Error('ServiceFactory could not find adapter ' + adapterName);
    }

    return new Adapter(resource);
};

/**
 * Load a module if it exists
 * @param path
 * @param moduleStack
 * @param errMsg
 * @returns {*}
 */
ServiceFactory.prototype.loadIfExists = function (path, moduleStack, errMsg) {
    var servicesDir = this.injector.servicesDir;
    var servicesFullPath = this.injector.rootDir + '/' + servicesDir;

    // if the file doesn't exist, either throw an error (if msg passed in), else just return null
    if (!fs.existsSync(servicesFullPath + path + '.js')) {
        if (errMsg) {
            throw new Error(errMsg + ' ' + servicesFullPath + path);
        }
        else {
            return null;
        }
    }

    // else load the module
    return this.injector.loadModule(servicesDir + path, moduleStack);
};

/**
 * Take all the objects involved with a service and put them all together. The final service is really
 * just an instance of an adapter with each method enhanced to have various filters added
 *
 * @param serviceInfo
 * @param resource
 * @param adapter
 * @returns {{}}
 */
ServiceFactory.prototype.putItAllTogether = function (serviceInfo, resource, adapter) {
    var me = this;
    var debug = this.injector.debug;

    // loop through the methods
    _.each(resource.methods[serviceInfo.adapterName], function (method) {
        if (!adapter[method]) {
            return;
        }

        var origMethod = adapter[method].bind(adapter);
        var eventNameBase = { resource: serviceInfo.resourceName, adapter: serviceInfo.adapterName, method: method };

        // create the new service function
        adapter[method] = function (req) {
            var deferred = Q.defer();

            // add event for data before anything happens (used only for debugging)
            if (debug) { me.emit(req, eventNameBase, { type: 'service', timing: 'before' }); }

            // validate the input params
            req = me.validateRequestParams(req, resource, method);

            // add event before calling the original method (used only for debugging)
            if (debug) { me.emit(req, eventNameBase, { type: 'service', timing: 'before' }); }

            // call the original method
            origMethod(req)
                .then(function (res) {

                    // emit event after origin method called; this is what most propagators key off of
                    var payload = { caller: req.caller, inputData: req.data, data: res };
                    me.emit(payload, eventNameBase, null);

                    // return the response from the original method
                    deferred.resolve(res);
                });

            return deferred.promise;
        };
    });

    // so essentially the service is the adapter with each method bulked up with some extra stuff
    return adapter;
};

/**
 * This is used to get an mock filter which will be sending out events
 * @param payload
 * @param eventNameBase
 * @param debugParams
 */
ServiceFactory.prototype.emit = function (payload, eventNameBase, debugParams) {

    // create a copy of the payload so that nothing modifies the original object
    payload = JSON.parse(JSON.stringify(payload));

    // we don't want to emit the potentially huge resource file
    if (payload && payload.resource) {
        delete payload.resource;
    }

    // create the event data and emit the event
    var name = _.extend({}, eventNameBase, debugParams);
    var eventData = {
        name: name,
        payload: payload
    };
    var eventName = name.resource + '.' + name.adapter + '.' + name.method;
    eventName += debugParams ? '.' + name.type + '.' + name.timing : '';
    eventBus.emit(eventName, eventData);
};

/**
 * Used within a service to validate the input params
 * @param req
 * @param resource
 * @param method
 * @returns {*}
 */
ServiceFactory.prototype.validateRequestParams = function (req, resource, method) {
    req = req || {};

    var params = resource.params || {};
    var methodParams = params[method] || {};
    var requiredParams = methodParams.required || [];
    var eitherorParams = methodParams.eitheror || [];
    var optional = methodParams.optional || [];
    var eitherorExists;

    // make sure all the required params are there
    _.each(requiredParams, function (param) {
        if (!req[param]) {
            throw new Error(method + ' missing ' + param + '. Required params: ' + JSON.stringify(requiredParams));
        }
    });

    // make sure at least one of the eitheror params are there
    if (eitherorParams.length) {
        eitherorExists = false;

        _.each(eitherorParams, function (param) {
            if (req[param]) { eitherorExists = true; }
        });

        if (!eitherorExists) {
            throw new Error(method + ' must have one of the following params: ' + JSON.stringify(eitherorParams));
        }
    }

    // now loop through the values and error if invalid param in there; also do JSON parsing if an object
    var validParams = requiredParams.concat(eitherorParams, optional, ['lang', 'caller', 'resource', 'method']);
    for (var key in req) {
        if (req.hasOwnProperty(key)) {
            if (validParams.indexOf(key) < 0) {
                throw new Error('For ' + method + ' the key ' + key + ' is not allowed. Valid params: ' + JSON.stringify(validParams));
            }

            req[key] = this.parseIfJson(req[key]);
        }
    }

    //return the request
    return req;
};

/**
 * If a value is a string of json, parse it out into an object
 * @param val
 * @returns {*}
 */
ServiceFactory.prototype.parseIfJson = function (val) {
    if (_.isString(val)) {
        val = val.trim();
        if (val.substring(0, 1) === '{' && val.substring(val.length - 1) === '}') {
            val = JSON.parse(val);
        }
    }
    return val;
};

// expose the class
module.exports = ServiceFactory;

