/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * The annotation helper is used to read info about a "flapjack" (a function that can
 * be used by the dependancy injector to create a new module)
 */


/**
 * Get module name from a full file path. This is done
 * by removing the parent dirs and replacing dot naming
 * with camelCase
 *
 * @param path Full file path to a pancakes module
 * @return {String} The name of the module.
 */
var getModuleName = function (path) {
    if (!path) {
        return '';
    }

    // clip off everything by after the last slash and the .js
    path = path.substring(path.lastIndexOf('/') + 1);
    path = path.substring(0, path.length - 3);

    var parts = path.split('.');
    for (var i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() +
            parts[i].substring(1);
    }

    return parts.join('');
};

/**
 * Get a the module info for a particular module in an annotation
 * right under the function declaration
 *
 * @param flapjack The pancakes target module
 * @return {{}}
 */
var getModuleInfo = function (flapjack) {
    var str = flapjack.toString();
    var matches = /(?:@module\()(.*)(?:\))/.exec(str);

    if (!matches || matches.length < 2) {
        return null;
    }

    var annotation = matches[1];
    return JSON.parse(annotation);
};

/**
 * Get either the client or server param mapping
 * @param name [client|server]
 * @param flapjack
 * @return {{}}
 */
var getParamMap = function (name, flapjack) {
    var moduleInfo = getModuleInfo(flapjack) || {};
    return moduleInfo[name] || {};
};

/**
 * Get the Server param mappings
 * @param flapjack
 * @return {{}}
 */
var getServerParamMap = function (flapjack) {
    return getParamMap('server', flapjack);
};

/**
 * Get the client param mapping
 * @param flapjack
 * @return {{}}
 */
var getClientParamMap = function (flapjack) {
    return getParamMap('client', flapjack);
};

/**
 * Get the function parameters for a given pancakes module
 *
 * @param flapjack The pancakes module
 * @return {Array}
 */
var getParameters = function (flapjack) {
    var str = flapjack.toString();
    var pattern = /(?:\()(.*)(?:\))/;
    var matches = pattern.exec(str);

    if (!matches || matches.length < 2) {
        return null;
    }

    var unfiltered = matches[1].replace(/ /g, '').split(',');
    var params = [], i;

    for (i = 0; i < unfiltered.length; i++) {
        if (unfiltered[i]) {
            params.push(unfiltered[i]);
        }
    }

    return params;
};

module.exports = {
    getModuleName: getModuleName,
    getModuleInfo: getModuleInfo,
    getParamMap: getParamMap,
    getServerParamMap: getServerParamMap,
    getClientParamMap: getClientParamMap,
    getParameters: getParameters
};