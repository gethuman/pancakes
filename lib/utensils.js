/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Utils for pancakes
 */



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
var getModuleName = function (path) {
    if (!path) {
        return '';
    }

    // clip off everything by after the last slash and the .js
    path = path.substring(path.lastIndexOf('/') + 1);
    path = path.substring(0, path.length - 3);

    var parts = path.split('.');
    var i;
    for (i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() +
            parts[i].substring(1);
    }

    return parts.join('');
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

/**
 * Split up a camel case string into an array of parts where each section
 * that starts with a capital letter is a different element in the array.
 * So, for example, somethingHereOther is split into ['something', 'here', 'other']
 * @param name
 * @returns {Array}
 */
var splitCamelCase = function (name) {

    // first convert to PascalCase
    name = name.substring(0, 1).toUpperCase() + name.substring(1);
    var parts = name.match(/[A-Z][a-z]+/g);
    var i;
    for (i = 0; i < parts.length; i++) {
        parts[i] = parts[i].toLowerCase();
    }

    return parts;
};

module.exports = {
    isJavaScript: isJavaScript,
    getModuleName: getModuleName,
    getModulePath: getModulePath,
    splitCamelCase: splitCamelCase
};
