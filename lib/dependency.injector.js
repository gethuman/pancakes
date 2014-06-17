/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * This is the injector that is used to load all modules and services for
 * pancakes apps
 */
var fs = require('fs');
var p = require('path');
var _ = require('lodash');
var utils = require('./utensils');
var InternalObjFactory = require('./factories/internal.object.factory');
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
 * Called to clear out the cache
 */
DependencyInjector.prototype.clearCache = function () {
    _.each(this.factories, function (factory) {
        factory.clearCache();   
    });
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
    this.flapjackFactory = new FlapjackFactory(this);

    return [
        new InternalObjFactory(this),
        new ServiceFactory(this),
        new ModelFactory(this),
        this.flapjackFactory,
        new DefaultFactory(this)
    ];
};

/**
 * Add aliases for the short names of the adapters (i.e. persistAdapter instead of mongoPersistAdapter)
 * as well as anything set by the user either through their own alias mappings or the preloaded dirs
 *
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
 * Based on a given directory, get the mappings of camelCase name for a given file
 * to the file's relative path from the app root.
 *
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
        if (!fs.existsSync(p.normalize(fullPath))) {
            continue;
        }

        // loop through all files in this folder
        fileNames = fs.readdirSync(p.normalize(fullPath));

        for (j = 0; j < fileNames.length; j++) {
            fileName = fileNames[j];

            // if it is a javascript file and it DOES NOT end in .service.js, then save the mapping
            if (utils.isJavaScript(fileName) && !fileName.match(/^.*\.service\.js$/)) {
                name = utils.getCamelCase(fileName);
                val = utils.getModulePath(path, fileName);
                mappings[name] = val;
                mappings[name.substring(0, 1).toUpperCase() + name.substring(1)] = val;  // store PascalCase as well
            }

            // else if we are dealing with a directory, recurse down into the folder
            else if (fs.lstatSync(p.join(fullPath, fileName)).isDirectory()) {
                _.extend(mappings, this.loadMappings(rootDir, [path + '/' + fileName]));
            }
        }
    }

    return mappings;
};

// return the class
module.exports = DependencyInjector;

/**
 * Load a module using the pancakes injector. The injector relies on a number of factories to do the actual
 * injection. The first factory that can handle a given modulePath input attempts to generate an object
 * or return something from cache that can then be returned back to the caller.
 *
 * @param modulePath Path to module
 * @param moduleStack Stack of modules in recursive call (to prevent circular references)
 * @param options Optional values used by some factories
 */
DependencyInjector.prototype.loadModule = function (modulePath, moduleStack, options) {
    var newModule, i;
    options = options || {};

    // if modulePath is null return null
    if (!modulePath) { 
        return null; 
    }
    
    // if actual flapjack sent in as the module path then switch things around so modulePath name is unique
    if (_.isFunction(modulePath)) {
        options.flapjack = modulePath;
        modulePath = 'module-' + (new Date()).getTime();
    }
    // if we already have a flapjack, make the modulePath unique per the options
    else if (options.flapjack) {
        modulePath = (options.app || 'common') + '.' + modulePath + '.' + (options.type || 'default');
    }
    // else we need to get code from the file system, so check to see if we need to switch a mapped name to its path
    else if (this.aliases[modulePath]) {
        modulePath = this.aliases[modulePath];
    }
    // if module name already in the stack, then circular reference
    moduleStack = moduleStack || [];


    if (moduleStack.indexOf(modulePath) >= 0) {
        throw new Error('Circular reference since ' + modulePath + ' is in ' + JSON.stringify(moduleStack));
    }
    // add the path to the stack so we don't have a circular dependency
    moduleStack.push(modulePath);

    // try to find a factory that can create/get a module for the given path

    for (i = 0; this.factories && i < this.factories.length; i++) {
        if (this.factories[i].isCandidate(modulePath, options)) {
            newModule = this.factories[i].create(modulePath, moduleStack, options);
            break;
        }
    }

    // pop the current item off the stack
    moduleStack.pop();

    // return the new module (or the default {} if no factories found)
    return newModule;
};
