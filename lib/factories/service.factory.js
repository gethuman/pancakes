/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This is where services are generated
 */
var Q =             require('q');
var _ =             require('lodash');
var fs =            require('fs');
var p =             require('path');
var utils =         require('../utensils');
var eventBus =      require('../server.event.bus');
var debugHandler =  require('../debug.handler');

/**
 * Simple function to clear the cache
 * @param injector
 * @constructor
 */
function ServiceFactory(injector) {
    this.cache = {};
    this.injector = injector || {};

    // if we are in debug mode, then add the debug handler
    var pattern = this.injector.debugPattern || '*.*.*.*.*';
    var handler = this.injector.debugHandler || debugHandler;
    if (this.injector.debug) {
        eventBus.on(pattern, handler);
    }
}

_.extend(ServiceFactory.prototype, {

    /**
     * Candidate if no slash and the modulePath ends in 'Service'
     * @param modulePath
     * @returns {boolean}
     */
    isCandidate: function isCandidate(modulePath) {
        modulePath = modulePath || '';
        var len = modulePath.length;
        return modulePath.indexOf('/') < 0 && len > 7 &&
            modulePath.substring(modulePath.length - 7) === 'Service';
    },

    /**
     * Simply empty the service cache
     */
    clearCache: function clearCache() {
        this.cache = {};
    },

    /**
     * Create a new service (or pull it from cache if it already exists)
     *
     * @param serviceName
     * @param moduleStack
     * @returns {{}}
     */
    create: function create(serviceName, moduleStack) {

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
    },

    /**
     * Figure out information about the service based on the module path and the adapter map
     *
     * @param serviceName
     * @param adapterMap
     * @returns {{}}
     */
    getServiceInfo: function getServiceInfo(serviceName, adapterMap) {
        var serviceInfo = { serviceName: serviceName };
        var serviceParts = utils.splitCamelCase(serviceName);  // turn oneTwoThree into ['one', 'two', 'three']
        var nbrParts = serviceParts.length;

        // first check to see if the second to last part is an adapter
        serviceInfo.adapterName = serviceParts[nbrParts - 2];  // NOTE: last item in array is 'Service'
        if (adapterMap[serviceInfo.adapterName]) {
            serviceInfo.resourceName = serviceParts.slice(0, nbrParts - 2).join('.');
        }
        // if not, it means we are dealing with a straight service (ex. postService)
        else {
            serviceInfo.adapterName = 'service';
            serviceInfo.resourceName = serviceParts.slice(0, nbrParts - 1).join('.');
        }

        serviceInfo.adapterImpl = adapterMap[serviceInfo.adapterName];

        return serviceInfo;
    },

    /**
     * Get a resource based on the
     * @param serviceInfo
     * @param moduleStack
     * @returns {{}} A resource object
     */
    getResource: function getResource(serviceInfo, moduleStack) {
        var resourceName = serviceInfo.resourceName;
        var resourcePath = '/resources/' + resourceName + '/' + resourceName + '.resource';
        return this.loadIfExists(resourcePath, moduleStack, 'Could not find resource file');
    },

    /**
     * Get a adapter based on the service info and what exists on the file system
     *
     * @param serviceInfo
     * @param resource
     * @param moduleStack
     */
    getAdapter: function getAdapter(serviceInfo, resource, moduleStack) {
        var adapterName = serviceInfo.adapterName;

        // if adapter name is 'service' and there is a default, switch to the default
        if (adapterName === 'service' && resource.adapters[this.injector.container]) {
            adapterName = serviceInfo.adapterName = resource.adapters[this.injector.container];
            serviceInfo.adapterImpl = this.injector.adapterMap[adapterName];
            serviceInfo.serviceName = utils.getCamelCase(serviceInfo.resourceName + '.' +
                serviceInfo.adapterName + '.service');
        }

        // if that doesn't work, we will assume the adapter is in the current codebase, so go get it
        var overridePath = '/resources/' + serviceInfo.resourceName + '/' + serviceInfo.resourceName + '.' +
            (adapterName === 'service' ? adapterName : adapterName + '.service');
        var adapterPath = '/adapters/' + adapterName + '/' +
            serviceInfo.adapterImpl + '.' + adapterName + '.adapter';

        // if override exists, use that one, else use the lower level adapter
        var Adapter =
            this.loadIfExists(overridePath, moduleStack, null) ||
            this.injector.adapters[serviceInfo.adapterImpl] ||
            this.loadIfExists(adapterPath, moduleStack, null);

        // if still no adapter found, then there is an issue
        if (!Adapter) {
            throw new Error('ServiceFactory could not find adapter ' + adapterName +
            ' paths ' + overridePath + ' and ' + adapterPath);
        }

        return new Adapter(resource);
    },

    /**
     * Load a module if it exists
     * @param path
     * @param moduleStack
     * @param errMsg
     * @returns {*}
     */
    loadIfExists: function loadIfExists(path, moduleStack, errMsg) {
        var servicesDir = this.injector.servicesDir;
        var servicesFullPath = this.injector.rootDir + '/' + servicesDir;

        // if the file doesn't exist, either throw an error (if msg passed in), else just return null
        if (!fs.existsSync(p.join(servicesFullPath, path + '.js'))) {
            if (errMsg) {
                throw new Error(errMsg + ' ' + servicesFullPath + path + '.js');
            }
            else {
                return null;
            }
        }

        // else load the module
        return this.injector.loadModule(servicesDir + path, moduleStack);
    },

    /**
     * Take all the objects involved with a service and put them all together. The final service is really
     * just an instance of an adapter with each method enhanced to have various filters added
     *
     * @param serviceInfo
     * @param resource
     * @param adapter
     * @returns {{}}
     */
    putItAllTogether: function putItAllTogether(serviceInfo, resource, adapter) {
        var me = this;
        var debug = this.injector.debug;

        // loop through the methods
        _.each(resource.methods[serviceInfo.adapterName], function (method) {
            if (!adapter[method]) {
                return;
            }

            // we are going to monkey patch the target method on the adapter, so save the original method
            var origMethod = adapter[method].bind(adapter);
            var eventNameBase = {
                resource: serviceInfo.resourceName,
                adapter: serviceInfo.adapterName,
                method: method
            };

            // create the new service function
            adapter[method] = function (req) {
                req = req || {};

                // clean out request
                _.each(req, function (value, name) {
                    if (value && value === 'undefined') {
                        delete req[name];
                    }
                });

                // add event for data before anything happens (used only for debugging)
                if (debug) { me.emitEvent(req, eventNameBase, { type: 'service', timing: 'before' }); }

                // first validate the request
                return me.validateRequestParams(req, resource, method, serviceInfo.adapterName)
                    .then(function () {

                        // add event before calling the original method (used only for debugging)
                        if (debug) { me.emitEvent(req, eventNameBase, { type: 'service', timing: 'before' }); }

                        // call the original target method on the adapter
                        return origMethod(req);
                    })
                    .then(function (res) {

                        // emit event after origin method called; this is what most
                        // reactors key off of (can be disabled with noemit flag)
                        if (!req.noemit && !req.multi && method !== 'find') {
                            var payload = {
                                caller: req.caller,
                                inputId: req._id,
                                targetId: req.targetId,
                                inputData: req.data,
                                data: res
                            };
                            me.emitEvent(payload, eventNameBase, null);
                        }

                        // return the response that will go back to the calling client
                        return res;
                    });
            };
        });

        // so essentially the service is the adapter with each method bulked up with some extra stuff
        return adapter;
    },

    /**
     * This is used to get an mock filter which will be sending out events
     * @param payload
     * @param eventNameBase
     * @param debugParams
     */
    emitEvent: function emitEvent(payload, eventNameBase, debugParams) {

        // create a copy of the payload so that nothing modifies the original object
        try {
            payload = JSON.parse(JSON.stringify(payload));
        }
        catch (err) {
            /* eslint no-console:0 */
            console.log('issue parsing during emit ' + JSON.stringify(eventNameBase));
        }

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
    },

    /**
     * Used within a service to validate the input params
     * @param req
     * @param resource
     * @param method
     * @param adapter
     * @returns {*}
     */
    validateRequestParams: function validateRequestParams(req, resource, method, adapter) {
        req = req || {};

        var params = resource.params || {};
        var methodParams = _.extend({}, params[method], params[adapter + '.' + method] );
        var requiredParams = methodParams.required || [];
        var eitherorParams = methodParams.eitheror || [];
        var optional = methodParams.optional || [];
        var eitherorExists, param;
        var err, reqObj;

        // make sure all the required params are there
        for (var i = 0; i < requiredParams.length; i++) {
            param = requiredParams[i];

            if (req[param] === undefined || req[param] === null) {
                reqObj = _.extend({}, req);
                delete reqObj.resource;
                err = new Error('Invalid request');
                err.code = 'invalid_request_error';
                err.message = resource.name + ' ' + method + ' missing ' + param +
                    '. Required params: ' + JSON.stringify(requiredParams) +
                    ' req is: ' + JSON.stringify(reqObj);
                return Q.reject(err);
            }
        }

        // make sure at least one of the eitheror params are there
        if (eitherorParams.length) {
            eitherorExists = false;

            _.each(eitherorParams, function (eitherorParam) {
                if (req[eitherorParam]) { eitherorExists = true; }
            });

            if (!eitherorExists) {
                delete req.caller;
                delete req.resource;
                err = new Error('Invalid request');
                err.code = 'invalid_request_error';
                err.message = resource.name + ' ' + method +
                    ' must have one of the following params: ' + JSON.stringify(eitherorParams) +
                    ' request is ' + JSON.stringify(req);
                return Q.reject(err);
            }
        }

        // now loop through the values and error if invalid param in there; also do JSON parsing if an object
        var validParams = requiredParams.concat(eitherorParams, optional,
            ['lang', 'caller', 'resource', 'method', 'auth', 'noemit']);
        for (var key in req) {
            if (req.hasOwnProperty(key)) {
                if (validParams.indexOf(key) < 0) {
                    delete req.caller;
                    delete req.resource;
                    err = new Error('Invalid request');
                    err.code = 'invalid_request_error';
                    err.message = 'For ' + resource.name + ' ' + method + ' the key ' +
                        key + ' is not allowed. Valid params: ' + JSON.stringify(validParams) +
                        ' request is ' + JSON.stringify(req);
                    return Q.reject(err);
                }
            }
        }

        // no errors, so return resolved promise
        return new Q();
    }
});

// expose the class
module.exports = ServiceFactory;

