/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * The annotation helper is used to read info about a "flapjack" (a function that can
 * be used by the dependancy injector to create a new module)
 */
var _ = require('lodash');

/**
 * Get any annotation that follows the same format
 * @param name
 * @param fn
 * @param isArray
 * @returns {*}
 */
function getAnnotationInfo(name, fn, isArray) {

    if (!fn) { return null; }

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

    // we want all double quotes in our string
    annotation = annotation.replace(/'/g, '"');

    // parse out the object from the string
    var obj = null;
    try {
        obj = JSON.parse(annotation);
    }
    catch (ex) {
        console.log('Annotation parse error with ' + annotation);
        throw ex;
    }

    if (isArray) {
        obj = obj.data;
    }

    return obj;
}

/**
 * Get a the module info for a particular module in an annotation
 * right under the function declaration
 *
 * @param flapjack The pancakes target module
 * @return {{}}
 */
function getModuleInfo(flapjack) {
    return getAnnotationInfo('module', flapjack, false);
}

/**
 * Get either the client or server param mapping
 * @param name [client|server]
 * @param flapjack
 * @return {{}}
 */
function getAliases(name, flapjack) {
    var moduleInfo = getModuleInfo(flapjack) || {};
    var aliases = moduleInfo[name] || {};
    return aliases === true ? {} : aliases;
}

/**
 * Get the Server param mappings
 * @param flapjack
 * @param options
 * @return {{}}
 */
function getServerAliases(flapjack, options) {
    options = options || {};
    var aliases = getAliases('server', flapjack);
    var serverAliases = options && options.serverAliases;
    return _.extend({}, aliases, serverAliases);
}

/**
 * Get the client param mapping
 * @param flapjack
 * @param options
 * @return {{}}
 */
function getClientAliases(flapjack, options) {
    options = options || {};
    var aliases = getAliases('client', flapjack);
    return _.extend({}, aliases, options.clientAliases);
}

/**
 * Get the function parameters for a given pancakes module
 *
 * @param flapjack The pancakes module
 * @return {Array}
 */
function getParameters(flapjack) {

    if (!_.isFunction(flapjack)) {
        throw new Error('Flapjack not a function ' + JSON.stringify(flapjack));
    }

    var str = flapjack.toString();
    var pattern = /(?:\()([^\)]*)(?:\))/;
    var matches = pattern.exec(str);

    if (matches === null || matches.length < 2) {
        throw new Error('Invalid flapjack: ' + str.substring(0, 200));
    }

    var unfiltered = matches[1].replace(/\s/g, '').split(',');
    var params = [], i;

    for (i = 0; i < unfiltered.length; i++) {
        if (unfiltered[i]) {
            params.push(unfiltered[i]);
        }
    }

    return params;
}

module.exports = {
    getAnnotationInfo: getAnnotationInfo,
    getModuleInfo: getModuleInfo,
    getAliases: getAliases,
    getServerAliases: getServerAliases,
    getClientAliases: getClientAliases,
    getParameters: getParameters
};