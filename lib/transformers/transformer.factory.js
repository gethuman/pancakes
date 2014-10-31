/**
 * Author: Jeff Whelpley
 * Date: 10/23/14
 *
 * The purpose of this module is to find and/or generate a transformer
 */
var _                   = require('lodash');
var annotationHelper    = require('../annotation.helper.js');
var utensils            = require('../utensils');
var baseTransformer     = require('./base.transformer');
var cache = {};

/**
 * Generate a transformer object based off the input params
 * @param name
 * @param transformerFns
 * @param templateDir
 * @param pluginOptions
 */
function generateTransformer(name, transformerFns, templateDir, pluginOptions) {

    var Transformer = function () {};
    var transformer = new Transformer();

    // add function mixins to the transformer
    _.extend(transformer, transformerFns, baseTransformer, annotationHelper, utensils, pluginOptions);

    // add reference to the template function
    transformer.setTemplate(templateDir, name, pluginOptions.clientType);

    // each transformer can reference each other
    transformer.transformers = cache;

    // return the transformer
    return transformer;
}

/**
 * Get a particular transformer from cache or generate it
 * @param name
 * @param clientPlugin
 * @param pluginOptions
 */
function getTransformer(name, clientPlugin, pluginOptions) {

    // if in cache, just return it
    if (cache[name]) { return cache[name]; }

    var transformers = clientPlugin.transformers;
    var templateDir = clientPlugin.templateDir;

    // if no transformer, throw error
    if (!transformers[name]) { throw new Error('No transformer called ' + name); }

    // generate all the transformers
    _.each(transformers, function (transformer, transformerName) {
        cache[transformerName] = generateTransformer(transformerName, transformer, templateDir, pluginOptions);
    });

    // return the specific one that was requested
    return cache[name];
}

// expose functions
module.exports = {
    getTransformer: getTransformer,
    generateTransformer: generateTransformer
};
