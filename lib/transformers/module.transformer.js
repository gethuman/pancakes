/**
 * Author: Jeff Whelpley
 * Date: 2/18/14
 *
 * This module is responsibile for all the client side code generation for pancakes
 */
var utils = require('./../utensils');

/**
 * Given a flapjack, transform into another form. Typically into a client module.
 *
 * @param filePath The name of the file where this flapjack came from
 * @param options Values from the gulp/grunt plugin
 */
var transform = function (filePath, options) {

    // set default options values used by all transformers
    options = options || {};
    options.filePath = filePath;
    options.ngPrefix = options.ngPrefix || 'gh';            // used for app name and directive names
    options.clientType = options.clientType || 'ng';        // angular by default
    options.transformer = options.transformer || 'basic';   // basic is really just a function wrapper
    options.ngType = options.ngType || 'factory';           // factory most common for angular modules
    options.appName = options.appName || 'ghCommonApp';     // use common app by default
    options.moduleName = utils.getCamelCase(filePath);

    var flapjack = require(filePath);
    var transformer = require('./' +
        options.clientType + '.' + options.transformer + '.transformer');

    return transformer.transform(flapjack, options);
};

// functions to export
module.exports = {
    transform: transform
};