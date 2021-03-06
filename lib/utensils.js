/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Utils for pancakes
 */
var Q       = require('q');
var _       = require('lodash');
var path    = require('path');
var delim   = path.normalize('/');
var crcTbl  = null;

/**
 * Check the file extension to see if a file is a JS file
 * @param fileName
 * @returns {boolean}
 */
function isJavaScript(fileName) {
    fileName = fileName || '';
    return fileName.substring(fileName.length - 3) === '.js';
}

/**
 * Get module name from a full file path. This is done
 * by removing the parent dirs and replacing dot naming
 * with camelCase
 *
 * @param filePath Full file path to a pancakes module
 * @return {String} The name of the module.
 */
function getCamelCase(filePath) {
    if (!filePath) {
        return '';
    }

    // clip off everything by after the last slash and the .js
    filePath = filePath.substring(filePath.lastIndexOf(delim) + 1);

    if (filePath.substring(filePath.length - 3) === '.js') {
        filePath = filePath.substring(0, filePath.length - 3);
    }

    // replace dots with caps
    var parts = filePath.split('.');
    var i;
    for (i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() +
            parts[i].substring(1);
    }

    // replace dashs with caps
    filePath = parts.join('');
    parts = filePath.split('-');
    for (i = 1; i < parts.length; i++) {
        parts[i] = parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
    }

    return parts.join('');
}

/**
 * Get the Pascal Case for a given path
 * @param filePath
 * @returns {string}
 */
function getPascalCase(filePath) {
    var camelCase = getCamelCase(filePath);
    return camelCase.substring(0, 1).toUpperCase() + camelCase.substring(1);
}

/**
 * Split up a camel case string into an array of parts where each section
 * that starts with a capital letter is a different element in the array.
 * So, for example, somethingHereOther is split into ['something', 'here', 'other']
 * @param name
 * @returns {Array}
 */
function splitCamelCase(name) {

    // first convert to PascalCase so each part starts with a capital letter
    name = name.substring(0, 1).toUpperCase() + name.substring(1);

    //TODO: bug here if string has two upper case characters right next to each other

    // then split into parts
    var parts = name.match(/[A-Z][a-z]+/g);
    var i;
    for (i = 0; i < parts.length; i++) {
        parts[i] = parts[i].toLowerCase();
    }

    return parts;
}

/**
 * Get the module path that will be used with the require
 * @param filePath
 * @param fileName
 * @returns {string}
 */
function getModulePath(filePath, fileName) {
    if (isJavaScript(fileName)) {
        fileName = fileName.substring(0, fileName.length - 3);
    }

    return filePath + '/' + fileName;
}

/**
 * If a value is a string of json, parse it out into an object
 * @param val
 * @returns {*}
 */
function parseIfJson(val) {
    if (_.isString(val)) {
        val = val.trim();
        if (val.substring(0, 1) === '{' && val.substring(val.length - 1) === '}') {
            try {
                val = JSON.parse(val);
            }
            catch (ex) {
                /* eslint no-console:0 */
                console.log(ex);
            }
        }
    }
    return val;
}

/**
 * Simple function for chaining an array of promise functions. Every function in the
 * promise chain needs to be uniform and accept the same input parameter. This
 * is used for a number of things, but most importantly for the service call chain
 * by API.
 *
 * @param calls Functions that should all take in a value and return a promise or another object
 * @param val The initial value to be passed into the promise chain
 */
function chainPromises(calls, val) {
    if (!calls || !calls.length) { return Q.when(val); }
    return calls.reduce(Q.when, Q.when(val));
}

/**
 * Get a value within given data by traversing the data according to a
 * dot deliminated field. For example, if the data is { foo: { choo: 'some' } }
 * and then the field is foo.choo, the return value would be 'some'.
 *
 * @param data
 * @param field
 * @param defaultValue
 */
function getNestedValue(data, field, defaultValue) {
    if (!data || !field) { return defaultValue; }

    field = field + '';
    var pntr = data;
    var fieldParts = field.split('.');

    var i, fieldPart;
    for (i = 0; i < fieldParts.length; i++) {
        fieldPart = fieldParts[i];
        pntr = pntr[fieldPart];
        if (!pntr) { return pntr; }
    }

    return pntr;
}

/* eslint no-bitwise:0 */

/**
 * This function is run only once to initialize the table
 * @returns {Array}
 */
function makeCRCTable() {
    var c;
    var crcTable = [];
    for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
            /* jslint bitwise: true */
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

/**
 * Generate a checkum for a string
 * @param str
 * @returns {number}
 */
function checksum(str) {
    crcTbl = crcTbl || makeCRCTable();

    /* jslint bitwise: true */
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crcTbl[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
}

// expose functions
module.exports = {
    isJavaScript: isJavaScript,
    getCamelCase: getCamelCase,
    getPascalCase: getPascalCase,
    splitCamelCase: splitCamelCase,
    getModulePath: getModulePath,
    parseIfJson: parseIfJson,
    chainPromises: chainPromises,
    getNestedValue: getNestedValue,
    makeCRCTable: makeCRCTable,
    checksum: checksum
};
