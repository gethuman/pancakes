/**
 * Author: Jeff Whelpley
 * Date: 10/19/14
 *
 * This module is used to handle API calls. All pancakes plugins that deal
 * with middleware (i.e. hapi, express, koa, etc.) will call this.
 */
var _           = require('lodash');
var utensils    = require('./utensils');
var injector;

/**
 * Initialize the handler with the dependency injector
 * @param opts
 */
function init(opts) {
    injector = opts.injector;
}

/**
 * Recurse through the filter config to get the right filter values
 * @param config
 * @param levels
 * @param levelIdx
 * @returns {*}
 */
function traverseFilters(config, levels, levelIdx) {
    var lastIdx = levels.length - 1;
    var val, filters;

    if (!config || levelIdx > lastIdx) { return null; }

    val = config[levels[levelIdx]];


    if (levelIdx === lastIdx) {
        if (val) {
            return val;
        }
        else {
            return config.all;
        }
    }
    else {
        filters = traverseFilters(val, levels, levelIdx + 1);
        if (!filters) {
            filters = traverseFilters(config.all, levels, levelIdx + 1);
        }
        return filters;
    }
}

/**
 * Get before and after filters based on the current request and the filter config
 * @param resourceName
 * @param adapterName
 * @param operation
 * @returns {{}}
 */
function getFilters(resourceName, adapterName, operation) {
    var filterConfig = injector.loadModule('filterConfig');
    var filters = { before: [], after: [] };

    if (!filterConfig) { return filters; }

    var levels = [resourceName, adapterName, operation, 'before'];
    filters.before = (traverseFilters(filterConfig, levels, 0) || []).map(function (name) {
        return injector.loadModule(name + 'Filter');
    });

    levels = [resourceName, adapterName, operation, 'after'];
    filters.after = (traverseFilters(filterConfig, levels, 0) || []).map(function (name) {
        return injector.loadModule(name + 'Filter');
    });

    return filters;
}

/**
 * Process an API call. This method is called from the server plugin. Basically, the server
 * plugin is in charge of taking the API request initially and translating the input values
 * from the web framework specific format to the pancakes format. Then the server plugin
 * calls this method with the generic pancancakes values.
 *
 * @param resource
 * @param operation
 * @param requestParams
 */
function processApiCall(resource, operation, requestParams) {
    var service = injector.loadModule(utensils.getCamelCase(resource.name + '.service'));
    var adapterName = resource.adapters.api;

    // remove the keys that start with onBehalfOf
    _.each(requestParams, function (val, key) {
        if (key.indexOf('onBehalfOf') === 0) { delete requestParams[key]; }
    });

    // hack fix for when _id not filled in
    if (requestParams._id === '{_id}') {
        delete requestParams._id;
    }

    // loop through request values and parse json
    for (var key in requestParams) {
        if (requestParams.hasOwnProperty(key)) {
            requestParams[key] = utensils.parseIfJson(requestParams[key]);
        }
    }

    var filters = getFilters(resource.name, adapterName, operation);
    return utensils.chainPromises(filters.before, requestParams)
        .then(function (filteredRequest) {
            requestParams = filteredRequest;
            return service[operation](requestParams);
        })
        .then(function (data) {
            return utensils.chainPromises(filters.after, {
                caller:     requestParams.caller,
                lang:       requestParams.lang,
                resource:   resource,
                inputData:  requestParams.data,
                data:       data
            });
        });
}

// expose functions
module.exports = {
    init: init,
    processApiCall: processApiCall,
    getFilters: getFilters,
    traverseFilters: traverseFilters
};


