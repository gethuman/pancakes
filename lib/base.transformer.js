/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * Helper functions used by the transformers
 */
var fs                  = require('fs');
var path                = require('path');
var _                   = require('lodash');
var dot                 = require('dot');
var annotationHelper    = require('./annotation.helper');
var utensils            = require('./utensils');
var templateCache = {};

// universally set strip to false for dot templates (i.e. respect whitespace)
dot.templateSettings.strip = false;

/**
 * Constructor will get the template for a given transformer
 * @param pancakes
 * @param transformDir
 * @param transformerName
 * @constructor
 */
var BaseTransformer = function (pancakes, transformDir, transformerName) {
    this.pancakes = pancakes;
    this.template = this.getTemplate(transformDir, transformerName);
};

// expose annotation helper methods through base class
_.extend(BaseTransformer.prototype, annotationHelper, {

    /**
     * Load the UI part
     * @param appName
     * @param filePath
     * @returns {injector.require|*|require}
     */
    loadUIPart: function loadUIPart(appName, filePath) {
        var isPartial = filePath.match(/^.*\.partial\.js/);
        var commonPath = filePath.replace(path.normalize('/' + appName + '/'), path.normalize('/common/'));

        // get a reference to the node module for the UI part first
        var uipart = fs.existsSync(filePath) ?
            this.pancakes.requireModule(filePath, false) :
            this.pancakes.requireModule(commonPath, false);

        // if the UI part has a parent, we need to merge it in
        if (uipart.parent) {
            var type = isPartial ? 'partial' : 'page';
            var parentPath = this.pancakes.getRootDir() +
                '/app/common/' + type + 's/' + uipart.parent + '.' + type;
            var parent = this.pancakes.requireModule(path.normalize(parentPath), false);
            uipart = _.merge({}, parent, uipart);
            delete uipart.abstract;
        }

        return uipart;
    },

    /**
     * Get the name of the app from the file path
     * @param filePath
     * @param ngPrefix
     * @returns {*}
     */
    getAppName: function getAppName(filePath, ngPrefix) {
        var delim = path.normalize('/');
        var idx = filePath.indexOf(delim + 'app' + delim);
        if (idx < 0) { throw new Error('/app/ is not in the path: ' + filePath); }

        filePath = filePath.substring(idx + 5);

        idx = filePath.indexOf(delim);
        var appName = idx > 0 ? filePath.substring(0, idx) : filePath;
        return utensils.getCamelCase(ngPrefix + '.' + appName + '.app');
    },

    /**
     * Get a dot template
     * @param transformDir
     * @param templateName
     */
    getTemplate: function getTemplate(transformDir, templateName) {
        if (templateCache[templateName]) { return templateCache[templateName]; }

        var fileName = transformDir + '/' + templateName + '.template';

        if (fs.existsSync(path.normalize(fileName))) {
            var file = fs.readFileSync(path.normalize(fileName));
            return (templateCache[templateName] = dot.template(file));
        }

        return null;
    },

    /**
     * Take a list of params and create an object that contains the param list
     * and converted values which will be used in templates
     *
     * @param params
     * @param aliases
     * @returns {{converted: Array, list: Array}}
     */
    getParamInfo: function getParamInfo(params, aliases) {
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
    },

    /**
     * Get the parameter info for a given flajack
     * @param flapjack
     * @param options
     * @returns {*|{converted: Array, list: Array}|{}}
     */
    getFilteredParamInfo: function getFilteredParamInfo(flapjack, options) {
        var aliases = this.getClientAliases(flapjack, options);
        var params = this.getParameters(flapjack) || [];
        params = params.filter(function (param) { return param !== '$scope'; });
        return this.getParamInfo(params, aliases) || {};
    },

    /**
     * Get the core logic within a module without the function declaration,
     * parameters, etc. Essentially everything inside the curly brackets.
     * @param flapjack The pancakes module
     * @return {String}
     */
    getModuleBody: function getModuleBody(flapjack) {
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
});

// expose the class
module.exports = BaseTransformer;