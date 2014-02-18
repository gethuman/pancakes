/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * There is an assumption that only 1 injector is used per runtime. Thus, the variables
 * here are used for everyone
 */
var fs = require('fs');
var lodash = require('lodash');
var annotationHelper = require('./annotation.helper');

// default context values (can be overriden with init() function)
var context = {};
var resetContext = function () {
    context.rootDir = __dirname;
    context.clientParamMap = {};
    context.serverParamMap = {};
    context.cachedModules = {};
    context.preloadedParamMap = {};
    context.require = module.require;
};
resetContext();

/**
 * Get module name from a full file path. This is done
 * by removing the parent dirs and replacing dot naming
 * with camelCase
 *
 * @param path Full file path to a pancakes module
 * @return {String} The name of the module.
 */
var getModuleName = function (path) {
    if (!path) {
        return '';
    }

    // clip off everything by after the last slash and the .js
    path = path.substring(path.lastIndexOf('/') + 1);
    path = path.substring(0, path.length - 3);

    var parts = path.split('.');
    for (var i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() +
            parts[i].substring(1);
    }

    return parts.join('');
};

/**
 * Load a module using the pancakes injector
 * @param modulePath Path to module
 * @param moduleChain Chain of modules in recursive call (to prevent circular references)
 */
var loadModule = function (modulePath, moduleChain) {
    var flapjack = context.require(context.rootDir + '/' + modulePath);
    flapjack = flapjack.server ? flapjack.server : flapjack;  // use the server val if it exists

    // if flapjack is not a function, just return it
    if (!lodash.isFunction(flapjack)) {
        return flapjack;
    }

    // param map is combo of param map set by user, params discovered and current annotation
    var paramMap = lodash.extend({}, context.preloadedParamMap, annotationHelper.getServerParamMap(flapjack));
    var params = annotationHelper.getParameters(flapjack);
    var paramModules = [], newModule;
    moduleChain = moduleChain || [];

    lodash.each(params, function (param) {

        // if mapping exists, switch to the mapping (ex. pancakes -> lib/pancakes)
        if (paramMap[param]) {
            param = paramMap[param];
        }

        // if module name already in the chain, then circular reference
        if (moduleChain.indexOf(param) >= 0) {
            throw new Error('Circular reference: ' + JSON.stringify(moduleChain));
        }

        // check to see if the module is already cached
        if (context.cachedModules[param]) {
            paramModules.push(context.cachedModules[param]);
        }
        // else if no slash, assume it is a simple require (lower case since all in npm are lower case)
        else if (param.indexOf('/') < 0) {
            paramModules.push(context.require(param.toLowerCase()));
        }
        // else let's try and get the module with a recursive call
        else {
            moduleChain.push(param);
            newModule = loadModule(param, moduleChain);
            context.cachedModules[param] = newModule;
            paramModules.push(newModule);
        }
    });

    // at this point, we should have all the parameter modules loaded
    return flapjack.apply(null, paramModules);
};


/**
 * Called to initialize pancakes
 * @dir absolute file path to the project root
 */
var init = function (opts) {
    resetContext();
    lodash.extend(context, opts);

    // if there are preload dirs specified, start loading them!
    if (context.preload) {
        context.preload = lodash.isArray(context.preload) ? context.preload : [context.preload];

        // for each dir, map the files
        lodash.each(context.preload, function (dir) {
            var fullPath = config.rootDir + '/' + dir;
            if (fs.existsSync(fullPath)) {
                var fileNames = fs.readdirSync(fullPath);

                lodash.each(fileNames, function (fileName) {

                    // only do .js files
                    if (fileName.substring(fileName.length - 3) === '.js') {
                        fileName = fileName.substring(0, fileName.length - 3);
                        context.preloadedParamMap[getModuleName(fileName)] = dir + '/' + fileName;
                    }
                });
            }
        });
    }
};

module.exports = {
    context: context,
    resetContext: resetContext,
    getModuleName: getModuleName,
    loadModule: loadModule,
    init: init
};
