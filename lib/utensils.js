/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Utils for pancakes
 */
var p = require('path');

/**
 * Check the file extension to see if a file is a JS file
 * @param fileName
 * @returns {boolean}
 */
var isJavaScript = function (fileName) {
    fileName = fileName || '';
    return fileName.substring(fileName.length - 3) === '.js';
};

/**
 * Get module name from a full file path. This is done
 * by removing the parent dirs and replacing dot naming
 * with camelCase
 *
 * @param path Full file path to a pancakes module
 * @return {String} The name of the module.
 */
var getCamelCase = function (path) {
    if (!path) {
        return '';
    }

    // clip off everything by after the last slash and the .js
    var delim = p.normalize('/');
    path = path.substring(path.lastIndexOf(delim) + 1);

    if (path.substring(path.length - 3) === '.js') {
        path = path.substring(0, path.length - 3);
    }

    // replace dots with caps
    var parts = path.split('.');
    var i;
    for (i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() +
            parts[i].substring(1);
    }

    // replace dashs with caps
    path = parts.join('');
    parts = path.split('-');
    for (i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
    }

    return parts.join('');
};

/**
 * Get the Pascal Case for a given path
 * @param path
 * @returns {string}
 */
var getPascalCase = function (path) {
    var camelCase = getCamelCase(path);
    return camelCase.substring(0, 1).toUpperCase() + camelCase.substring(1);
};

/**
 * Split up a camel case string into an array of parts where each section
 * that starts with a capital letter is a different element in the array.
 * So, for example, somethingHereOther is split into ['something', 'here', 'other']
 * @param name
 * @returns {Array}
 */
var splitCamelCase = function (name) {

    // first convert to PascalCase so each part starts with a capital letter
    name = name.substring(0, 1).toUpperCase() + name.substring(1);

    // then split into parts
    var parts = name.match(/[A-Z][a-z]+/g);
    var i;
    for (i = 0; i < parts.length; i++) {
        parts[i] = parts[i].toLowerCase();
    }

    return parts;
};

/**
 * Get the module path that will be used with the require
 * @param path
 * @param fileName
 * @returns {string}
 */
var getModulePath = function (path, fileName) {
    if (isJavaScript(fileName)) {
        fileName = fileName.substring(0, fileName.length - 3);
    }

    return path + '/' + fileName;
};

// expose functions
module.exports = {
    isJavaScript: isJavaScript,
    getCamelCase: getCamelCase,
    getPascalCase: getPascalCase,
    splitCamelCase: splitCamelCase,
    getModulePath: getModulePath
};
