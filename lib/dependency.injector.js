/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * This is the injector that is used to load all modules and services for
 * pancakes apps
 */
var fs = require('fs');
var _ = require('lodash');
var utils = require('./utensils');
var ServiceFactory = require('./factories/service.factory');
var ModelFactory = require('./factories/model.factory');
var FlapjackFactory = require('./factories/flapjack.factory');
var DefaultFactory = require('./factories/default.factory');

/**
 * Initialize the injector with input options
 * @param opts
 * @constructor
 */
var DependencyInjector = function (opts) {
    this.rootDir = opts.rootDir || (__dirname + '/../../..');   // project base dir (default is a guess)
    this.require = opts.require || require;                     // we need require from the project
    this.container = opts.container || 'api';                   // resource has diff profiles for diff containers
    this.servicesDir = opts.servicesDir || 'services';          // dir where services reside
    this.debug = opts.debug || false;                           // debug mode will have us firing more events
    this.debugPattern = opts.debugPattern;                      // by default if debug on, we view EVERYTHING
    this.debugHandler = opts.debugHandler;                      // function used when debug event occurs
    this.adapterMap = this.loadAdapterMap(opts);                // mappings from adapter type to impl
    this.aliases = this.loadAliases(opts);                      // mapping of names to locations
    this.factories = this.loadFactories();                      // load all the factories
};

/**
 * Load the adapter map (ex. maps persist to mongo, search to elasticsearch, etc.)
 * @param opts
 * @returns {{}}
 */
DependencyInjector.prototype.loadAdapterMap = function (opts) {
    var defaultMap = { service: 'default' };
    var adapterMap = {};
    _.extend(adapterMap, opts.adapterMap, defaultMap);
    return adapterMap;
};

/**
 * Load all the factories
 * @returns {Array}
 */
DependencyInjector.prototype.loadFactories = function () {
    return [
        new ServiceFactory(this),
        new ModelFactory(this),
        new FlapjackFactory(this),
        new DefaultFactory(this)
    ];
};

/**
 * Add aliases for the short names of the adapters (i.e. persistAdapter instead of mongoPersistAdapter)
 * as well as anything set by the user either through their own alias mappings or the preloaded dirs
 * @param opts
 * @returns {*}
 */
DependencyInjector.prototype.loadAliases = function (opts) {
    opts.preload = opts.preload || [];
    var preloadDirs = _.isArray(opts.preload) ? opts.preload : [opts.preload];
    preloadDirs.push(this.servicesDir);
    var aliases = _.extend({}, this.loadMappings(this.rootDir, preloadDirs), opts.aliases);

    // we also want to point the shorter adapter names to the same objects
    _.each(this.adapterMap, function (impl, type) {
        var fullName = utils.getCamelCase(impl + '.' + type + '.adapter');
        var shortName = utils.getPascalCase(type + '.adapter');
        if (aliases[fullName]) {
            aliases[shortName] = aliases[fullName];
        }
    });

    return aliases;
};

/**
 * Load individual flapjackes within the given set of directories
 * @param rootDir
 * @param paths
 * @returns {{}} The mappings of param name to location
 */
DependencyInjector.prototype.loadMappings = function (rootDir, paths) {
    var mappings = {}, i, j, fullPath, fileNames, fileName, path, name, val;

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
                name = utils.getCamelCase(fileName);
                val = utils.getModulePath(path, fileName);
                mappings[name] = val;
                mappings[name.substring(0, 1).toUpperCase() + name.substring(1)] = val;  // store PascalCase as well
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
    var newModule, i;

    // check to see if we need to switch a mapped name to its path
    if (this.aliases[modulePath]) {
        modulePath = this.aliases[modulePath];
    }

    // if module name already in the stack, then circular reference
    moduleStack = moduleStack || [];

    if (moduleStack.indexOf(modulePath) >= 0) {
        throw new Error('Circular reference: ' + JSON.stringify(moduleStack));
    }

    // add the path to the stack so we don't have a circular dependency
    moduleStack.push(modulePath);

    // try to find a factory that can create/get a module for the given path
    for (i = 0; this.factories && i < this.factories.length; i++) {
        if (this.factories[i].isCandidate(modulePath)) {
            newModule = this.factories[i].create(modulePath, moduleStack);
            break;
        }
    }

    // pop the current item off the stack
    moduleStack.pop();

    // return the new module (or the default {} if no factories found)
    return newModule;
};

// return the class
module.exports = DependencyInjector;
