/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * Helper functions used by the transformers
 */
var fs = require('fs');
var _ = require('lodash');
var dot = require('dot');
var templateCache = {};

// universally set strip to false for dot templates (i.e. respect whitespace)
dot.templateSettings.strip = false;

/**
 * Get a dot template
 * @param templateName
 */
var getTemplate = function (templateName) {
    if (templateCache[templateName]) { return templateCache[templateName]; }

    var fileName = __dirname + '/transformers/' + templateName + '.template';
    if (fs.existsSync(fileName)) {
        var file = fs.readFileSync(fileName);
        return (templateCache[templateName] = dot.template(file));
    }

    return null;
};

/**
 * Take a list of params and create an object that contains the param list
 * and converted values which will be used in templates
 *
 * @param params
 * @param aliases
 * @returns {{converted: Array, list: Array, ngrefs: Array}}
 */
var getParamInfo = function (params, aliases) {
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
};


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

    var body = str.substring(openingCurly + 1, closingCurly);
    return body.replace(/\n/g, '\n\t');
};

/**
 * If extension passed in, change the file path extension
 *
 * @param filePath
 * @param extension
 */
var changeFilePathExtension = function (filePath, extension) {
    if (!extension) { return filePath; }

    var idx = filePath.lastIndexOf('.');
    if (idx < 1) { return filePath; }

    return filePath.substring(0, idx) + '.' + extension;
};

// expose functions
module.exports = {
    getTemplate: getTemplate,
    getParamInfo: getParamInfo,
    getModuleBody: getModuleBody,
    changeFilePathExtension: changeFilePathExtension
};