/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * The annotation helper is used to read info about a "flapjack" (a function that can
 * be used by the dependancy injector to create a new module)
 */

/**
 * Get any annotation that follows the same format
 * @param name
 * @param fn
 * @param isArray
 * @returns {*}
 */
var getAnnotationInfo = function (name, fn, isArray) {

    if (!fn) {
        return null;
    }

    var str = fn.toString();
    var rgx = new RegExp('(?:@' + name + '\\()(.*)(?:\\))');

    var matches = rgx.exec(str);

    if (!matches || matches.length < 2) {
        return null;
    }

    var annotation = matches[1];
    if (isArray) {
        annotation = '{ "data": ' + annotation + '}';
    }

    var obj = JSON.parse(annotation);
    if (isArray) {
        obj = obj.data;
    }

    return obj;
};

/**
 * Get a the module info for a particular module in an annotation
 * right under the function declaration
 *
 * @param flapjack The pancakes target module
 * @return {{}}
 */
var getModuleInfo = function (flapjack) {
    return getAnnotationInfo('module', flapjack, false);
};

/**
 * Get either the client or server param mapping
 * @param name [client|server]
 * @param flapjack
 * @return {{}}
 */
var getAliases = function (name, flapjack) {
    var moduleInfo = getModuleInfo(flapjack) || {};
    return moduleInfo[name] || {};
};

/**
 * Get the Server param mappings
 * @param flapjack
 * @return {{}}
 */
var getServerAliases = function (flapjack) {
    return getAliases('server', flapjack);
};

/**
 * Get the client param mapping
 * @param flapjack
 * @return {{}}
 */
var getClientAliases = function (flapjack) {
    return getAliases('client', flapjack);
};

/**
 * Get the function parameters for a given pancakes module
 *
 * @param flapjack The pancakes module
 * @return {Array}
 */
var getParameters = function (flapjack) {
    var str = flapjack.toString();
    var pattern = /(?:\()([^\)]*)(?:\))/;
    var matches = pattern.exec(str);
    var unfiltered = matches[1].replace(/\s/g, '').split(',');
    var params = [], i;

    for (i = 0; i < unfiltered.length; i++) {
        if (unfiltered[i]) {
            params.push(unfiltered[i]);
        }
    }

    return params;
};

module.exports = {
    getAnnotationInfo: getAnnotationInfo,
    getModuleInfo: getModuleInfo,
    getAliases: getAliases,
    getServerAliases: getServerAliases,
    getClientAliases: getClientAliases,
    getParameters: getParameters
};