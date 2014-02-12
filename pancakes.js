/**
 * Author: Jeff Whelpley
 * Date: 1/29/14
 *
 * This is the main module for pancakes
 */
var lodash  = require('lodash');
var dot     = require('dot');
var fs      = require('fs');

/**
 * Regular expressions to get certain annotations
 */
var regexs = {
    module: /(?:@module\()(.*)(?:\))/,
    server: /(?:@server\()(.*)(?:\))/,
    client: /(?:@client\()(.*)(?:\))/
};

/**
 * Load a template into memory
 */
var getTemplate = function (name) {
    var encoding = { encoding: 'utf8' };
    var file = fs.readFileSync(__dirname + '/templates/' + name + '.template', encoding);
    return dot.template(file);
};

/**
 * These are the templates we can use. We can move these into
 * separate modules in the future
 */
var templates = {
    angular: {
        factory: getTemplate('angular.factory')
    }
};

/**
 * Get a particular annotation for a given module string
 * @param name The name of the annotation [module|server|client]
 * @param flapjack The pancakes target module
 * @return {{}}
 */
var getAnnotation = function (name, flapjack) {
    var str = lodash.isString(flapjack) ? flapjack: flapjack.toString();
    var matches = regexs[name].exec(str);

    if (!matches || matches.length < 2) {
        return null;
    }

    var annotation = matches[1];
    return JSON.parse(annotation);
};

/**
 * Get the function parameters for a given pancakes module
 * @param flapjack The pancakes module
 * @return {Array}
 */
var getParameters = function (flapjack) {
    var str = lodash.isString(flapjack) ? flapjack: flapjack.toString();
    var pattern = /(?:\()(.*)(?:\))/;
    var matches = pattern.exec(str);

    if (!matches || matches.length < 2) {
        return null;
    }

    var unfiltered = matches[1].replace(/ /g, '').split(',');
    var params = [];

    lodash.each(unfiltered, function (param) {
        if (param) {
            params.push(param);
        }
    });

    return params;
};

/**
 * Get the core logic within a module without the function declaration,
 * parameters, etc. Essentially everything inside the curly brackets.
 * @param flapjack The pancakes module
 * @return {String}
 */
var getModuleBody = function (flapjack) {
    var str = lodash.isString(flapjack) ? flapjack: flapjack.toString();
    var openingCurly = str.indexOf('{');
    var closingCurly = str.lastIndexOf('}');
    return str.substring(openingCurly + 1, closingCurly);
};

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
 * Convert a flapjack (pancakges module) into another module format
 * @param flapjack The pancakes module
 * @param options Contains info about how to do the conversion
 */
var convertModule = function (flapjack, options) {
    var str = lodash.isString(flapjack) ? flapjack: flapjack.toString();
    var paramMapping = getAnnotation('client', str) || {};
    var params = getParameters(str);
    var paramList = [];
    var convertedParams = {};
    var mappedVal;

    // loop through the params to see if we need to change any
    lodash.each(params, function (param) {
        mappedVal = paramMapping[param];
        if (mappedVal) {
            convertedParams[param] = mappedVal;
            param = mappedVal;
        }

        if (param !== 'angular') {
            paramList.push(param);
        }
    });

    return templates.angular.factory({
        appName: 'ghUtils',
        moduleType: 'factory',
        moduleName: options.moduleName,
        params: paramList,
        convertedParams: convertedParams,
        body: getModuleBody(str)
    });
};

var rootDir = '';
var cachedModules = {};

/**
 * Called to initialize pancakes
 * @dir absolute file path to the project root
 */
var init = function (dir) {
    rootDir = dir;
};

/**
 * Load a module using the pancakes injector
 * @param modulePath Path to module
 * @param moduleChain Chain of modules in recursive call (to prevent circular references)
 */
var loadModule = function (modulePath, moduleChain) {
    var flapjack = require(rootDir + '/' + modulePath);
    var str = flapjack.toString();
    var paramMapping = getAnnotation('server', str) || {};
    var params = getParameters(str);
    var paramModules = [];
    moduleChain = moduleChain || [];

    lodash.each(params, function (param) {

        // if there is a param mapping, get the mapping value
        if (paramMapping[param]) {
            param = paramMapping[param];
        }
        // else the module is external so we can just require it
        else {
            cachedModules[param] = require(param);
        }

        // if module name already in the chain, then circular reference
        if (moduleChain.indexOf(param) >= 0) {
            throw new Exception('Circular reference: ' + JSON.stringify(moduleChain));
        }

        // check to see if the module is already cached
        if (cachedModules[param]) {
            paramModules.push(cachedModules[param]);
        }
        // else let's try and get the module with a recursive call
        else {
            moduleChain.push(param);
            paramModules.push(loadModule(param, moduleChain));
        }
    });

    // at this point, we should have all the parameter modules loaded
    return flapjack.apply(null, paramModules);
};

/**
 * Simple helper function to get a module
 * @param modulePath
 */
var cook = function (modulePath) {
    return loadModule(modulePath, null);
};

// exported functions
module.exports = {
    getAnnotation: getAnnotation,
    getParameters: getParameters,
    getModuleName: getModuleName,
    convertModule: convertModule,
    init: init,
    loadModule: loadModule,
    cook: cook
};
