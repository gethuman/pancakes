/**
 * Author: Jeff Whelpley
 * Date: 2/18/14
 *
 * This module is responsibile for all the client side code generation for pancakes
 */
var fs = require('fs');
var dot = require('dot');
var lodash = require('lodash');
var annotationHelper = require('./annotation.helper');
var utils = require('./utensils');
var templates = {};

// preload templates
var encoding = { encoding: 'utf8' };
var templateFiles = fs.readdirSync(__dirname + '/../templates');
lodash.each(templateFiles, function (fileName) {
    var file = fs.readFileSync(__dirname + '/../templates/' + fileName, encoding);
    templates[fileName] = dot.template(file);
});

/**
 * Get the core logic within a module without the function declaration,
 * parameters, etc. Essentially everything inside the curly brackets.
 * @param flapjack The pancakes module
 * @return {String}
 */
var getModuleBody = function (flapjack) {
    var str = flapjack.toString();
    var openingCurly = str.indexOf('{');
    var closingCurly = str.lastIndexOf('}');

    // if can't find the opening or closing curly, just return the entire string
    if (openingCurly < 0 || closingCurly < 0) {
        return str;
    }

    return str.substring(openingCurly + 1, closingCurly);
};

/**
 * Convert a flapjack (pancakges module) into another module format
 * @param flapjack The pancakes module
 * @param moduleName The name of the module
 * @param options Contains user options for what they want generated
 * @returns {string} The generate client module as a string
 */
var renderTemplate = function (flapjack, moduleName, options) {
    options = options || {};
    options.appName = options.appName || 'commonApp';
    options.output = options.output || 'angular';
    options.type = options.type || 'factory';

    var templateName = options.output + '.' + options.type + '.template';
    var paramMapping = annotationHelper.getClientParamMap(flapjack);
    var params = annotationHelper.getParameters(flapjack);
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

    return templates[templateName]({
        appName: options.appName,
        moduleType: options.type,
        moduleName: moduleName,
        params: paramList,
        convertedParams: convertedParams,
        body: getModuleBody(flapjack)
    });
};

/**
 * Given a flapjack, see if a client version should and can be generated
 * @param filePath The name of the file where this flapjack came from
 * @param options Values from the gulp/grunt plugin
 * @returns {string} Null if client could not or should not be generated, else the client module as a string
 */
var generateClient = function (filePath, options) {
    var moduleInfo;
    var isClientModule = false;
    var flapjack = require(filePath);

    // if the module is split client/server
    if (!lodash.isFunction(flapjack) && flapjack.client) {
        flapjack = flapjack.client;
        isClientModule = true;
    }
    else {
        moduleInfo = annotationHelper.getModuleInfo(flapjack) || {};
        isClientModule = moduleInfo.client;
    }

    if (isClientModule) {
        var moduleName = utils.getModuleName(filePath);
        return renderTemplate(flapjack, moduleName, options);
    }

    return null;
};

// modules to export
module.exports = {
    getModuleBody: getModuleBody,
    renderTemplate: renderTemplate,
    generateClient: generateClient
};