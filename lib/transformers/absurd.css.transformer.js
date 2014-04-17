/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/17/14
 *
 * Transform styles in pages and partials to css
 */
var _           = require('lodash');
var Q           = require('q');
var absurd      = require("absurd");
var Injector    = require('../dependency.injector');

/**
 * Transform the flapjack into a client side module that contains
 * the directive, page/partial controller and html template
 *
 * @param flapjack
 * @param options
 * @returns {*}
 */
var transform = function (flapjack, options) {
    if (!flapjack.styles) { return new Q(); }  // if there are no styles, return null

    // get the styles by injecting the flapjack styles function
    var injector = new Injector(options.init);
    var styles = injector.loadModule(options.moduleName + 'Styles', null, { flapjack: flapjack.styles });

    // now translate the styles to css via absurd
    var deferred = Q.defer();
    absurd(function (api) {
        if (_.isArray(styles)) {
            _.each(styles, function (styleSet) {
                api.add(styleSet);
            })
        }
        else {
            api.add(styles);
        }
    })
        .compile(function (err, css) {
            err ? deferred.reject(err) : deferred.resolve(css);
        });

    return deferred.promise;
};

module.exports = {
    transform: transform
};