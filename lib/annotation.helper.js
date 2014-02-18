/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * The annotation helper is used to read info about a "flapjack" (a function that can
 * be used by the dependancy injector to create a new module)
 */


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
    getModuleInfo: getModuleInfo,
    getParamMap: getParamMap,
    getServerParamMap: getServerParamMap,
    getClientParamMap: getClientParamMap,
    getParameters: getParameters
};