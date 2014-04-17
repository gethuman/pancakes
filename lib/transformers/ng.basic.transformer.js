/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * This is used to transform a pancakes flapjack module into an Angular
 * util (i.e. Angular service via factory()
 */
var Q           = require('q');
var _           = require('lodash');
var annotHelper = require('../annotation.helper');
var transHelper = require('../transformation.helper');
var template    = transHelper.getTemplate('ng.basic');

/**
 * Transform flapjack into a client util module
 *
 * @param flapjack
 * @param options
 * @returns {*}
 */
var transform = function (flapjack, options) {
    if (!template || !flapjack || !options) { return new Q(); }

    // if flapjack is not a function but has client function, use that
    var moduleInfo;
    if (!_.isFunction(flapjack) && flapjack.client) {
        flapjack = flapjack.client;
    }
    // else if dealing with factory and no client annotation, return resolved promise (i.e. server side code)
    else if (options.ngType === 'factory') {
        moduleInfo = annotHelper.getModuleInfo(flapjack) || {};
        if (!moduleInfo.client) { return new Q(); }
    }

    var aliases = annotHelper.getClientAliases(flapjack) || {};
    var params = annotHelper.getParameters(flapjack) || {};
    var paramInfo = transHelper.getParamInfo(params, aliases) || {};
    var model = {
        ngType: options.ngType,
        appName: options.appName,
        moduleName: options.moduleName,
        params: paramInfo.list,
        convertedParams: paramInfo.converted,
        ngrefs: paramInfo.ngrefs,
        body: transHelper.getModuleBody(flapjack)
    };

    return new Q(template(model));
};

// only 1 function in this module
module.exports = {
    transform: transform
};
