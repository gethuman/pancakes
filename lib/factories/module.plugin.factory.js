/**
 * Author: Jeff Whelpley
 * Date: 1/19/15
 *
 * This factory is used to instantiate from a module plugin
 */
var _       = require('lodash');
var fs      = require('fs');
var path    = require('path');
var delim   = path.normalize('/');
var utils   = require('../utensils');

/**
 * Initialize the cache
 * @param injector
 * @param modulePlugins
 * @constructor
 */
function ModulePluginFactory(injector, modulePlugins) {
    this.cache = {};
    this.injector = injector;
    this.serverModules = this.loadModulePlugins(modulePlugins);
}

_.extend(ModulePluginFactory.prototype, {

    /**
     * Loop through each plugin and add each module to a map
     * @param modulePlugins
     */
    loadModulePlugins: function loadModulePlugins(modulePlugins) {
        var serverModules = {};
        var me = this;

        // add modules from each plugin to the serverModules map
        _.each(modulePlugins, function (modulePlugin) {
            _.extend(serverModules, me.loadModules(modulePlugin.rootDir, modulePlugin.serverModuleDirs));
        });

        return serverModules;
    },

    /**
     * Recursively go through dirs and add modules to a server modules map that is returned
     * @param rootDir
     * @param paths
     * @returns {*}
     */
    loadModules: function loadModules(rootDir, paths) {
        var serverModules = {};
        var me = this;

        // return empty object if no rootDir or paths
        if (!rootDir || !paths) { return serverModules; }

        // loop through paths and load all modules in those directories
        _.each(paths, function (relativePath) {
            var fullPath = path.normalize(rootDir + delim + relativePath);

            // if the directory doesn't exist, then skip to the next loop iteration
            if (fs.existsSync(fullPath)) {

                _.each(fs.readdirSync(fullPath), function (fileName) {

                    // if it is a javascript file and it DOES NOT end in .service.js, then save the mapping
                    if (utils.isJavaScript(fileName) && !fileName.match(/^.*\.service\.js$/)) {
                        var nameLower = utils.getCamelCase(fileName).toLowerCase();
                        var fullFilePath = path.normalize(fullPath + '/' + fileName);

                        // there are 2 diff potential aliases for any given server module
                        serverModules[nameLower + 'fromplugin'] = serverModules[nameLower] = require(fullFilePath);
                    }

                    // else if we are dealing   with a directory, recurse down into the folder
                    else if (fs.lstatSync(path.join(fullPath, fileName)).isDirectory()) {
                        _.extend(serverModules, me.loadModules(rootDir, [relativePath + '/' + fileName]));
                    }

                });
            }
        });

        return serverModules;
    },

    /**
     * Check if is candidate. We will assume that anything with a slash in it
     * is a reference to something on the file system that is a flapjack
     * @param modulePath
     * @returns {boolean}
     */
    isCandidate: function isCandidate(modulePath) {

        // the 'FromPlugin' suffix is used when a project wants to override a plugin module
        if (modulePath === /.*FromPlugin/) {
            modulePath = modulePath.substring(0, modulePath.length - 10);
        }
        modulePath = modulePath.toLowerCase();

        return !!this.serverModules[modulePath];
    },

    /**
     * Clear the cache of instantiated modules from plugins
     */
    clearCache: function clearCache() {
        this.cache = {};
    },

    /**
     * Find or create a flapjack based on a relative path from the project root
     * @param modulePath
     * @param moduleStack
     * @param options
     * @returns {{}}
     */
    create: function create(modulePath, moduleStack, options) {

        // the 'FromPlugin' suffix is used when a project wants to override a plugin module
        if (modulePath === /.*FromPlugin/) {
            modulePath = modulePath.substring(0, modulePath.length - 10);
        }
        modulePath = modulePath.toLowerCase();

        // first check the cache to see if we already loaded it
        if (this.cache[modulePath]) {
            return this.cache[modulePath];
        }

        // if module not in server modules, return null
        var flapjack = this.serverModules[modulePath];
        if (!flapjack) {
            return null;
        }

        // switch to server if exists
        flapjack = flapjack.server ? flapjack.server : flapjack;

        // if flapjack is not a function, just return it (i.e. its just a normal require()
        if (!_.isFunction(flapjack)) {
            this.cache[modulePath] = flapjack;
            return flapjack;
        }

        this.cache[modulePath] = this.injector.injectFlapjack(flapjack, moduleStack, options);
        return this.cache[modulePath];
    }
});

// export the factory
module.exports = ModulePluginFactory;