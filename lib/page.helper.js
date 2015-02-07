/**
 * Author: Jeff Whelpley
 * Date: 2/6/15
 *
 * Page helper this should be kept in sync with the client side PageHelper
 */
var utils = require('./utensils');

function PageHelper(routeHelper) {
    this.routeHelper = routeHelper;
    this.apps = {};
    this.clientRegistrations = [];
}

/**
 * Register a function with the page helper
 * @param appName
 * @param routeName
 * @param funcName
 * @param func
 */
PageHelper.prototype.register = function register(appName, routeName, funcName, func) {

    // app and route name could be dot notation, so make them camel case
    appName = utils.getCamelCase(appName);
    routeName = utils.getCamelCase(routeName);

    // make sure object is initialized
    this.apps[appName] = this.apps[appName] || {};
    this.apps[appName][routeName] = this.apps[appName][routeName] || {};

    var routeHelper = this.routeHelper;
    var apps = this.apps;

    // we wrap the input function so we can add the routeHandler to the input options
    function handler(opts) {
        opts.routeHelper = routeHelper;
        return func(opts);
    }

    // this is used by the client generator to replicate these functions
    this.clientRegistrations.push({
        appName: appName,
        routeName: routeName,
        funcName: funcName,
        func: func.toString()
    });

    // set handler in the object in case the user calls it dynamically
    this.apps[appName][routeName][funcName] = handler;

    // and add a convenience function name for example pageHelper.formatUrlAnswersPost(opts)
    var name = utils.getCamelCase([funcName, appName, routeName].join('.'));
    this[name] = handler;

    // also since many times the route name is unique, pageHelper.formatUrlPost()
    name = utils.getCamelCase([funcName, routeName].join('.'));
    this[name] = handler;

    // finally if just call the function name, let them pass in the appName and routeName
    // pageHelper.formatUrl(appName, routeName, opts);
    this[funcName] = function (appName, routeName, opts) {
        return apps[appName][routeName][funcName](opts);
    };
};

// export the class to be instantiated
module.exports = PageHelper;
