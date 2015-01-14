/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * This factory is used to generate a model class which has the following characteristics:
 * 1. Holds data for model
 * 2. Static access to associated service functions
 * 3. Additional helper functions from the resource file (or something similar) available after newing an object
 */
var fs      = require('fs');
var path    = require('path');
var _       = require('lodash');
var utils   = require('../utensils');

/**
 * Initialize the cache
 * @param injector
 * @constructor
 */
function ModelFactory(injector) {
    this.cache = {};
    this.injector = injector;
    this.resourceNames = this.getResourceNames();
    this.resources = {};
}

_.extend(ModelFactory.prototype, {

    /**
     * Get all the resources into memory
     * @returns {{}}
     */
    getResourceNames: function getResourceNames() {
        var resourceNames = {};
        var resourcesDir = this.injector.rootDir + '/' + this.injector.servicesDir + '/resources';

        if (!fs.existsSync(path.normalize(resourcesDir))) {
            return resourceNames;
        }

        var names = fs.readdirSync(path.normalize(resourcesDir));
        _.each(names, function (name) {
            if (name.substring(name.length - 3) !== '.js') {  // only dirs, not js files
                resourceNames[utils.getPascalCase(name)] = utils.getCamelCase(name);
            }
        });

        return resourceNames;
    },

    /**
     * Only return true if model name exists in resource lookup
     * @param modelName
     * @returns {boolean}
     */
    isCandidate: function isCandidate(modelName) {
        return modelName && this.resourceNames[modelName] ? true : false;
    },

    /**
     * Empty the model cache
     */
    clearCache: function clearCache() {
        this.cache = {};
    },

    /**
     * Get a model based on a service and resource
     * @param service
     * @param mixins
     * @returns {Model}
     */
    getModel: function getModel(service, mixins) {

        // model constructor takes in data and saves it along with the model mixins
        var Model = function (data) {
            _.extend(this, data, mixins);
        };

        if (service.save) {
            Model.prototype.save = function () {
                if (this._id) {
                    return service.save({ where: { _id: this._id }, data: this });
                }
                else {
                    return service.save({ data: this });
                }
            };
        }
        else if (service.create && service.update) {
            Model.prototype.save = function () {
                if (this._id) {
                    return service.update({ where: { _id: this._id }, data: this });
                }
                else {
                    return service.create({ data: this });
                }
            };
        }

        if (service.remove) {
            Model.prototype.remove = function () {
                return service.remove({ where: { _id: this._id } });
            };
        }

        // the service methods are added as static references on the model
        _.each(service, function (method, methodName) {
            Model[methodName] = function () {
                return service[methodName].apply(service, arguments);
            };
        });

        return Model;
    },

    /**
     * Create a model
     * @param modulePath
     * @param moduleStack
     */
    create: function create(modulePath, moduleStack) {

        // first check the cache to see if we already loaded it
        if (this.cache[modulePath]) {
            return this.cache[modulePath];
        }

        // try to get the resource for this module
        var resource;
        if (this.resources[modulePath]) {
            resource = this.resources[modulePath];
        }
        else if (this.resourceNames[modulePath]) {
            resource = this.injector.loadModule(this.resourceNames[modulePath] + 'Resource');
        }
        else {
            return null;
        }

        // get the service for this model
        var serviceName = modulePath.substring(0, 1).toLowerCase() + modulePath.substring(1) + 'Service';
        var service = this.injector.loadModule(serviceName, moduleStack);

        // save the model to cache and return it
        var Model = this.getModel(service, resource.mixins);
        this.cache[modulePath] = Model;
        return Model;
    }
});

// expose the class
module.exports = ModelFactory;

