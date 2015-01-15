/**
 * Author: Jeff Whelpley
 * Date: 10/19/14
 *
 * Common functions used by all server plugins
 */
var Q        = require('q');
var _        = require('lodash');
var fs       = require('fs');
var lruCache = require('lru-cache');
//var newrelic = require('newrelic');

var routeInfoCache = lruCache({ max: 100, maxAge: 60000 });
var appRoutes = {};
var injector, clientPlugin, appConfigs;

/**
 * Initialize the handler with the dependency injector
 * @param opts
 */
function init(opts) {
    injector = opts.injector;
    clientPlugin = opts.clientPlugin;
    appConfigs = injector.loadModule('appConfigs');
}

/***
 * Convert a pattern from the database into a legit regex pattern
 * @param pattern
 */
function convertUrlPatternToRegex(pattern) {
    pattern = pattern.replace(new RegExp('{[a-zA-Z0-9\\-_~]*}', 'gi'), '[a-zA-Z0-9\\-_~]+');
    pattern = pattern.replace(/\//g, '\\/');
    pattern = '^' + pattern + '$';
    return new RegExp(pattern);
}

/**
 * Use a given pattern to extract tokens from a given URL
 * @param pattern
 * @param url
 * @returns {{}}
 */
function getTokenValuesFromUrl(pattern, url) {
    var tokenValues = {};
    var idx;
    var tokenName;
    var tokenValue;

    while (true)
    {
        idx = pattern.indexOf('{');
        if (idx < 0) {
            break;
        }

        url = url.substring(idx);
        pattern = pattern.substring(idx + 1);

        idx = pattern.indexOf('}');

        if (idx < 0) {
            break;
        }

        tokenName = pattern.substring(0, idx);

        if (idx === (pattern.length - 1)) {
            pattern = '';
        }
        else {
            pattern = pattern.substring(idx + 1);
        }

        idx = url.indexOf('/');
        idx = idx < 0 ? url.length : idx;

        if (pattern && url.indexOf(pattern) >= 0) {
            idx = Math.min(idx, url.indexOf(pattern));
        }

        tokenValue = url.substring(0, idx);
        url = url.substring(idx);

        tokenValues[tokenName] = tokenValue;
    }

    return tokenValues;
}

/**
 * Get array of routes for app. This is essentially information from
 * the main app config file that is the root dir of each app (i.e. in
 * the {projectRoot}/app/{appName}/{appName}.app.js file)
 *
 * @param appName
 * @returns [] Array of routeInfo objects
 */
function getRoutes(appName) {
    if (appRoutes[appName]) { return appRoutes[appName]; }      // if route info already cached, return that

    var appConfig = appConfigs[appName];
    var routes = [];

    _.each(appConfig.routes, function (route) {                 // loop through routes in the .app file
        _.each(route.urls, function (urlPattern) {              // create separate routeInfo for each URL
            routes.push(_.extend({
                urlPattern:     urlPattern,
                urlRegex:       convertUrlPatternToRegex(urlPattern),
                layout:         route.layout || appConfig.defaultLayout || appName,
                wrapper:        route.wrapper || appConfig.defaultWrapper || 'server.page',
                strip:          route.strip || appConfig.defaultStrip || true,
                contentType:    route.contentType,
                data:           route.data || appConfig.data,
                serverOnly:     appConfig.serverOnly
            }, route));
        });
    });

    appRoutes[appName] = routes;
    return routes;
}

/**
 * Get info for particular route
 * @param appName
 * @param urlRequest
 * @param query
 * @param lang
 * @returns {{}} The routeInfo for a particular request
 */
function getRouteInfo(appName, urlRequest, query, lang) {

    // if route info already in cache, return it
    var cacheKey = appName + '||' + urlRequest + '||' + JSON.stringify(query);
    if (routeInfoCache[cacheKey]) { return routeInfoCache[cacheKey]; }

    // get the routes and then find the info that matches the current URL
    var url = urlRequest.toLowerCase();
    var i, route, routeInfo;
    var routes = getRoutes(appName);
    if (routes) {

        // loop through routes trying to find the one that matches
        for (i = 0; i < routes.length; i++) {
            route = routes[i];

            // if there is a match, save the info to cache and return it
            if (route.urlRegex.test(url)) {
                routeInfo = _.extend({
                    appName:    appName,
                    lang:       lang,
                    url:        urlRequest,
                    query:      query,
                    tokens:     getTokenValuesFromUrl(route.urlPattern, urlRequest)
                }, route);

                routeInfoCache[cacheKey] = routeInfo;
                return routeInfo;
            }
        }
    }

    // if we get here, then no route found, so throw 404 error
    throw new Error('404: ' + appName + ' ' + urlRequest + ' is not a valid request');
}

/**
 * Get a particular page
 * @param appName
 * @param pageName
 * @returns {*|Object}
 */
function getPage(appName, pageName) {
    var pagePath = injector.rootDir + '/app/' + appName + '/pages/' + pageName + '.page';
    var page = fs.existsSync(pagePath + '.js') ?
        require(pagePath) :
        require(pagePath.replace('/' + appName + '/', '/common/'));

    // if the page has a parent, combine them so the page "inherits" from the parent
    if (page.parent) {
        var parent = require(injector.rootDir + '/app/common/pages/' + page.parent + '.page');
        page = _.merge({}, parent, page);
        delete page.abstract;
    }

    return page;
}

/**
 * If a default value doesn't exist in the model, set it
 * @param model
 * @param defaults
 */
function setDefaults(model, defaults) {
    if (!defaults) { return; }

    _.each(defaults, function (value, key) {
        if (model[key] === undefined) {
            model[key] = value;
        }
    });
}

/**
 * Get the initial model for a given page
 * @param routeInfo
 * @param page
 */
function getInitialModel(routeInfo, page) {

    //return newrelic.createTracer('web.route.handler::getInitialModel', function () {
        var initModelDeps = {
            appName:    routeInfo.appName,
            tokens:     routeInfo.tokens,
            routeInfo:  routeInfo,
            defaults:   page.defaults,
            currentScope: {}
        };
        //var promises = [];
        //var names = [];

        // if no model, just return empty object
        if (!page.model) {
            return new Q({});
        }
        // if function, inject and the returned value is the model
        else if (_.isFunction(page.model)) {
            return injector.loadModule(page.model, null, { dependencies: initModelDeps });
        }

        // for now we will comment this out; doing objects at the page level is a little tricky due
        // to the fact we have to resolve on the model for the UI Router
        // we can do it but will need more work on the initialModel generator

        // if an object, we need to loop through it
        //else if (_.isObject(page.model)) {
        //
        //    // put all the object names and values in arrays (injecting any functions)
        //    _.each(page.model, function (val, name) {
        //        names.push(name);
        //        _.isFunction(val) ?
        //            promises.push(injector.loadModule(val, null, { dependencies: initModelDeps })) :
        //            promises.push(Q.when(val));
        //    });
        //
        //    // resolve all promises (i.e. object values)
        //    return Q.all(promises)
        //        .then(function (res) {
        //
        //            // now create one model object to return based on the resolved value
        //            var model = {};
        //            for (var i = 0; i < res.length; i++) {
        //                model[names[i]] = res[i];
        //            }
        //
        //            return model;
        //        });
        //}

        else {
            throw new Error(routeInfo.name + ' page invalid model() format: ' + page.model);
        }
    //})();
}

/**
 * This function is called by the server plugin when we have a request and we need to
 * process it. The plugin should handle translating the server platform specific values
 * into our routeInfo
 *
 * @param routeInfo
 * @param callbacks
 */
function processWebRequest(routeInfo, callbacks) {
    var appName = routeInfo.appName;
    var page = getPage(appName, routeInfo.name);

    // get the callbacks
    var serverPreprocessing = callbacks.serverPreprocessing || function () { return false; };
    var appAddToModel = callbacks.addToModel || function () {};

    return getInitialModel(routeInfo, page)
        .then(function (model) {
            model = model || {};

            //return newrelic.createTracer('web.route.handler::processWebRequest', function () {

                // if the server pre-processing returns true, then return without doing anything
                // this is because the pre-processor sent a reply to the user already
                if (serverPreprocessing(routeInfo, page, model)) { return null; }

                // allow the app level to modify the model before rendering
                appAddToModel(model, routeInfo);

                // finally use the client side plugin to do the rendering
                return clientPlugin.renderPage(routeInfo, page, model);

            //})();
        });
}

// expose functions for testing
module.exports = {
    init: init,
    getRouteInfo: getRouteInfo,
    getRoutes: getRoutes,
    getTokenValuesFromUrl: getTokenValuesFromUrl,
    convertUrlPatternToRegex: convertUrlPatternToRegex,
    processWebRequest: processWebRequest,
    getPage: getPage,
    setDefaults: setDefaults,
    getInitialModel: getInitialModel
};
