/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * Helper functions used by the transformers
 */
var fs              = require('fs');
var path            = require('path');
var _               = require('lodash');
var dot             = require('dot');
var delim           = path.normalize('/');
var templateCache   = {};

// universally set strip to false for dot templates (i.e. respect whitespace)
dot.templateSettings.strip = false;

/**
 * Load the UI part
 * @param appName
 * @param filePath
 * @returns {injector.require|*|require}
 */
function loadUIPart(appName, filePath) {
    var idx = filePath.indexOf(delim + appName + delim);
    var modulePath = filePath.substring(idx - 3);
    return this.pancakes.cook(modulePath);
}

/**
 * Get the name of the app from the file path (common by default)
 * @param filePath
 * @param defaultAppName
 * @returns {*}
 */
function getAppName(filePath, defaultAppName) {
    defaultAppName = defaultAppName || 'common';

    if (!filePath) { return defaultAppName; }
    var idx = filePath.indexOf(delim + 'app' + delim);
    if (idx < 0) { return defaultAppName; }

    filePath = filePath.substring(idx + 5);

    idx = filePath.indexOf(delim);
    return idx > 0 ? filePath.substring(0, idx) : filePath;
}

/**
 * Get the app name used when declaring angular modules
 * @param prefix
 * @param appName
 * @returns {String}
 */
function getAppModuleName(prefix, appName) {
    return this.getCamelCase(prefix + '.' + appName + '.app');
}

/**
 * Get a dot template
 * @param transformDir
 * @param templateName
 * @param clientType
 */
function setTemplate(transformDir, templateName, clientType) {
    clientType = clientType ? (clientType + '.') : '';

    if (templateCache[templateName]) {
        this.template = templateCache[templateName];
    }
    else {
        var fileName = transformDir + '/' + clientType + templateName + '.template';

        if (fs.existsSync(path.normalize(fileName))) {
            var file = fs.readFileSync(path.normalize(fileName));
            this.template = templateCache[templateName] = dot.template(file);
        }
        else {
            throw new Error('No template at ' + fileName);
        }
    }
}

/**
 * Take a list of params and create an object that contains the param list
 * and converted values which will be used in templates
 *
 * @param params
 * @param aliases
 * @returns {{converted: Array, list: Array}}
 */
function getParamInfo(params, aliases) {
    var paramInfo = { converted: [], list: [], ngrefs: [] };

    _.each(params, function (param) {
        var mappedVal = aliases[param] || param;
        if (mappedVal === 'angular') {
            paramInfo.ngrefs.push(param);
        }
        else {
            paramInfo.list.push(param);
            paramInfo.converted.push(mappedVal);
        }
    });

    return paramInfo;
}

/**
 * Get the parameter info for a given flajack
 * @param flapjack
 * @param options
 * @returns {*|{converted: Array, list: Array}|{}}
 */
function getFilteredParamInfo(flapjack, options) {
    if (!flapjack) { return {}; }

    var aliases = this.getClientAliases(flapjack, options);
    var params = this.getParameters(flapjack) || [];
    params = params.filter(function (param) {
        return ['$scope', 'defaults', 'initialModel'].indexOf(param) < 0;
    });

    return this.getParamInfo(params, aliases) || {};
}

/**
 * Get the core logic within a module without the function declaration,
 * parameters, etc. Essentially everything inside the curly brackets.
 * @param flapjack The pancakes module
 * @return {String}
 */
function getModuleBody(flapjack) {
    if (!flapjack) { return ''; }

    var str = flapjack.toString();
    var openingCurly = str.indexOf('{');
    var closingCurly = str.lastIndexOf('}');

    // if can't find the opening or closing curly, just return the entire string
    if (openingCurly < 0 || closingCurly < 0) {
        return str;
    }

    var body = str.substring(openingCurly + 1, closingCurly);
    return body.replace(/\n/g, '\n\t');
}

// expose functions
module.exports = {
    loadUIPart: loadUIPart,
    getAppName: getAppName,
    getAppModuleName: getAppModuleName,
    setTemplate: setTemplate,
    getParamInfo: getParamInfo,
    getFilteredParamInfo: getFilteredParamInfo,
    getModuleBody: getModuleBody
};