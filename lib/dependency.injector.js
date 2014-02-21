/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * This is the injector that is used to load all modules and services for
 * pancakes apps
 */
var fs = require('fs');
var Q = require('q');
var _ = require('lodash');
var utils = require('./utensils');
var serviceFactory = require('./factories/service.factory');
var modelFactory = require('./factories/model.factory');
var flapjackFactory = require('./factories/flapjack.factory');
var defaultFactory = require('./factories/default.factory');

/**
 * Initialize the injector with input options
 * @param opts
 * @constructor
 */
var DependencyInjector = function (opts) {
    this.rootDir = opts.rootDir || (__dirname + '/../../../');  // project base dir (default is a guess)
    this.require = opts.require || require;                     // we need require from the project
    this.container = opts.container || 'api';                   // resource has diff profiles for diff containers
    this.servicesDir = opts.servicesDir || 'services';          // dir where services reside

    // maps adapter type (ex. persist) to impl (ex. mongo)
    this.adapterMap = _.extend({}, opts.adapterMap, { service: 'default' });

    // we want to keep a map of all mappings from parameter name to relative file location from the project root
    opts.preload = opts.preload || [];
    var preloadDirs = _.isArray(opts.preload) ? opts.preload : [opts.preload];
    preloadDirs.push(this.servicesDir);
    this.paramMap = _.extend({}, this.loadMappings(this.rootDir, preloadDirs), opts.serverParamMap);
};

/**
 * Load individual flapjackes within the given set of directories
 * @param rootDir
 * @param paths
 * @returns {{}} The mappings of param name to location
 */
DependencyInjector.prototype.loadMappings = function (rootDir, paths) {
    var mappings = {}, i, j, fullPath, fileNames, fileName, path;

    if (!paths) {
        return mappings;
    }

    for (i = 0; i < paths.length; i++) {
        path = paths[i];
        fullPath = rootDir + '/' + path;

        // if the directory doesn't exist, then skip to the next loop iteration
        if (!fs.existsSync(fullPath)) {
            continue;
        }

        // loop through all files in this folder
        fileNames = fs.readdirSync(fullPath);

        for (j = 0; j < fileNames.length; j++) {
            fileName = fileNames[j];

            // if it is a javascript file, then save the mapping
            if (utils.isJavaScript(fileName)) {
                mappings[utils.getModuleName(fileName)] = utils.getModulePath(path, fileName);
            }

            // else if we are dealing with a directory, recurse down into the folder
            else if (fs.lstatSync(fullPath + '/' + fileName).isDirectory()) {
                _.extend(mappings, this.loadMappings(rootDir, [path + '/' + fileName]));
            }
        }
    }

    return mappings;
};

/**
 * Load a module using the pancakes injector
 * @param modulePath Path to module
 * @param moduleStack Stack of modules in recursive call (to prevent circular references)
 */
DependencyInjector.prototype.loadModule = function (modulePath, moduleStack) {
    var newModule = {}, i;

    // if module name already in the stack, then circular reference
    moduleStack = moduleStack || [];
    if (moduleStack.indexOf(modulePath) >= 0) {
        throw new Error('Circular reference: ' + JSON.stringify(moduleStack));
    }

    // add the path to the stack so we don't have a circular dependency
    moduleStack.push(modulePath);

    // try to find a factory that can create/get a module for the given path
    var factories = [serviceFactory, flapjackFactory, defaultFactory];
    for (i = 0; i < factories.length; i++) {
        if (factories[i].isCandidate(modulePath)) {
            newModule = factories[i].create(modulePath, moduleStack, this);

            // if the factory successfully created a module, break out of the loop
            if (newModule) {
                break;
            }
        }
    }

    // pop the current item off the stack
    moduleStack.pop();

    // return the new module (or the default {} if no factories found)
    return newModule;
};

// return the class
module.exports = DependencyInjector;
