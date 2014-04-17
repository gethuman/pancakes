/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * This transformer used to generate an API client for angular which means a local service and model
 * classes. This does not generate any aggregation services (use ng.aggregator.transformer for that)
 */
var Q           = require('q');
var _           = require('lodash');
var Injector    = require('../dependency.injector');
var transHelper = require('../transformation.helper');
var utils       = require('../utensils');
var template    = transHelper.getTemplate('ng.apiclient');

/**
 * Check to see if input is a resource file and then generate off of info in that
 * @param flapjack
 * @param options
 */
var transform = function (flapjack, options) {
    var moduleName = options.moduleName;
    var injector = new Injector(options.init);

    // if module name doesn't end in 'Resource' then there is likely an issue
    if (!moduleName.match(/^.*Resource$/)) {
        throw Error('Invalid module for generating api client: ' + moduleName);
    }

    var resource = injector.loadModule(moduleName, null, { flapjack: flapjack });
    var methods = {};

    // if no api or browser restapi, then return null since we will skip
    if (!resource.api || resource.adapters.browser !== 'restapi') {
        return new Q();
    }

    // loop through API routes and create method objects for the template
    _.each(resource.api, function (urlMappings, httpMethod) {
        _.each(urlMappings, function (methodName, url) {
            methods[methodName] = {
                httpMethod: httpMethod,
                url: url
            };
        });
    });

    var model = {
        appName: options.appName,
        serviceName: utils.getCamelCase(resource.name + '.service'),
        modelName: utils.getPascalCase(resource.name),
        methods: methods
    };

    return new Q(template(model));
};

module.exports = {
    transform: transform
};
