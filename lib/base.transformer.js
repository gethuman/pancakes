/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * Helper functions used by the transformers
 */
var fs = require('fs');
var p = require('path');
var _ = require('lodash');
var dot = require('dot');
var annotationHelper = require('./annotation.helper');
var templateCache = {};

// universally set strip to false for dot templates (i.e. respect whitespace)
dot.templateSettings.strip = false;

/**
 * Constructor will get the template for a given transformer
 * @param transformDir
 * @param transformerName
 * @constructor
 */
var BaseTransformer = function (transformDir, transformerName) {
    this.template = this.getTemplate(transformDir, transformerName);
};

// expose annotation helper methods through base class
_.extend(BaseTransformer.prototype, annotationHelper);

/**
 * Get a dot template
 * @param transformDir
 * @param templateName
 */
BaseTransformer.prototype.getTemplate = function (transformDir, templateName) {
    if (templateCache[templateName]) { return templateCache[templateName]; }

    var fileName = transformDir + '/' + templateName + '.template';

    if (fs.existsSync(p.normalize(fileName))) {
        var file = fs.readFileSync(p.normalize(fileName));
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
BaseTransformer.prototype.getParamInfo = function (params, aliases) {
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
BaseTransformer.prototype.getModuleBody = function (flapjack) {
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

// expose the class
module.exports = BaseTransformer;