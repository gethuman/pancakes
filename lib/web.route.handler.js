/**
 * Author: Jeff Whelpley
 * Date: 10/19/14
 *
 * Common functions used by all server plugins
 */
var Q        = require('q');
var _        = require('lodash');
var lruCache = require('lru-cache');
var utensils = require('./utensils');

var defaultPageCache = lruCache({ max: 100, maxAge: 60000 });
var routeInfoCache = {};
var appRouteCache = {};
var injector, clientPlugin, appConfigs;
var regexSlash = /\//g;
//var regexCapture = /\{.+}/g; // like {varName}

/**
 * Initialize the handler with the dependency injector
 * @param opts
 */
function init(opts) {
    injector = opts.injector;
    clientPlugin = opts.clientPlugin;
    appConfigs = injector.loadModule('appConfigs');
}

/**
 * Convert a segment of URL to a regex pattern for full URL casting below
 * @param segment
 * @returns string A segment as a URL pattern string
 */
function convertUrlSegmentToRegex(segment) {

    // if it has this format "{stuff}" - then it's regex-y
    var beginIdx = segment.indexOf('{');
    var endIdx = segment.indexOf('}');

    if (beginIdx < 0) {
        return segment;
    }

    // if capturing regex and trim trailing "}"
    // this could be a named regex {id:[0-9]+} or just name {companySlug}
    var pieces = segment.split(':');
    if (pieces.length === 2) {
        return '(' + pieces[1].substring(0, pieces[1].length - 1) + ')';
    }
    else if (pieces.length === 1) {
        return segment.substring(0, beginIdx) + '[a-zA-Z0-9\\-_~]+' + segment.substring(endIdx + 1);
    }
    else {
        throw new Error('Weird URL segment- don\'t know how to parse! ' + segment);
    }
}

/***
 * Convert a pattern from the database into a legit regex pattern
 * @param pattern
 */
function convertUrlPatternToRegex(pattern) {

    // pattern = pattern.replace(new RegExp('{[a-zA-Z0-9\\-_~]*}', 'gi'), '[a-zA-Z0-9\\-_~]+');

    // let's try a different way...
    // first, ui-router doesn't allow use of fwd slash in URL patterns because it's THE separator:
    var segments = pattern.split('/');
    var convertedSegments = segments.map(function (segment) {
        return convertUrlSegmentToRegex(segment); // so let's just convert each segment separately
    });
    pattern = convertedSegments.join('/');

    pattern = pattern.replace(regexSlash, '\\/');
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
    var tokenValues = {},
        urlSegments = url.split('/');

    pattern.split('/').forEach(function (segment, idx) {

        // this has this form {stuff}, so let's dig
        var beginIdx = segment.indexOf('{');
        var endIdx = segment.indexOf('}');
        var endLen = segment.length - endIdx - 1;
        var urlSegment = urlSegments[idx];

        if (beginIdx > -1) {

            // peel off the { and } at the ends
            segment = segment.substring(beginIdx + 1, endIdx);

            var pieces = segment.split(':');
            if (pieces.length === 2 || pieces.length === 1) {
                tokenValues[pieces[0]] = urlSegment.substring(beginIdx, urlSegment.length - endLen);
            }
        } // else no token to grab
    });

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
    if (appRouteCache[appName]) { return appRouteCache[appName]; }      // if route info already cached, return that

    var appConfig = appConfigs[appName];
    var routes = [];

    _.each(appConfig.routes, function (route) {                 // loop through routes in the .app file
        _.each(route.urls, function (urlPattern) {              // create separate routeInfo for each URL

            var urlRegex = convertUrlPatternToRegex(urlPattern);
            routes.push(_.extend({
                urlPattern:     urlPattern,
                urlRegex:       urlRegex,
                layout:         route.layout || appConfig.defaultLayout || appName,
                wrapper:        route.wrapper || appConfig.defaultWrapper || 'server.page',
                strip:          route.strip || appConfig.defaultStrip || true,
                contentType:    route.contentType,
                data:           route.data || appConfig.data,
                serverOnly:     appConfig.serverOnly
            }, route));
        });
    });

    appRouteCache[appName] = routes;
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
    var cacheKey = appName + '||' + lang + '||' + urlRequest;
    var cachedRouteInfo = routeInfoCache[cacheKey];
    if (cachedRouteInfo) {
        cachedRouteInfo.query = query;  // query shouldn't be cached
        return cachedRouteInfo;
    }

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
    var initModelDeps = {
        appName:    routeInfo.appName,
        tokens:     routeInfo.tokens,
        routeInfo:  routeInfo,
        defaults:   page.defaults,
        currentScope: {}
    };

    // if no model, just return empty object
    if (!page.model) {
        return Q.when({});
    }
    // if function, inject and the returned value is the model
    else if (_.isFunction(page.model)) {
        return Q.when(injector.loadModule(page.model, null, { dependencies: initModelDeps }));
    }
    else {
        throw new Error(routeInfo.name + ' page invalid model() format: ' + page.model);
    }
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
    var serverOnly = !!routeInfo.query.server;
    var page = injector.loadModule('app/' + appName + '/pages/' + routeInfo.name + '.page');

    // get the callbacks
    var serverPreprocessing = callbacks.serverPreprocessing || function () { return false; };
    var appAddToModel = callbacks.addToModel || function () {};
    var pageCacheService = callbacks.pageCacheService || defaultPageCache;
    var initialModel, cacheKey;

    return getInitialModel(routeInfo, page)
        .then(function (model) {
            initialModel = model || {};

            // if the server pre-processing returns true, then return without doing anything
            // this is because the pre-processor sent a reply to the user already
            if (serverPreprocessing(routeInfo, page, model)) {
                return true;
            }

            //TODO: may be weird edge cases with this. need to test more to ensure performance and uniqueness
            // but note that we have an hour default timeout for the redis cache just in case
            // and we have the redis LRU config set up so the least recently used will get pushed out
            cacheKey = utensils.checksum(routeInfo.lang + '||' + routeInfo.appName + '||' +
                routeInfo.url + '||' + JSON.stringify(model));

            return pageCacheService.get({ key: cacheKey });
        })
        .then(function (cachedPage) {
            if (cachedPage === true) { return null; }
            if (cachedPage && !serverOnly) { return cachedPage; }

            // allow the app level to modify the model before rendering
            appAddToModel(initialModel, routeInfo);

            // finally use the client side plugin to do the rendering
            return clientPlugin.renderPage(routeInfo, page, initialModel);
        })
        .then(function (renderedPage) {
            if (!serverOnly) {
                pageCacheService.set({ key: cacheKey, value: renderedPage });
            }

            return renderedPage;
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
    setDefaults: setDefaults,
    getInitialModel: getInitialModel
};
