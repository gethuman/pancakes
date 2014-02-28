/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 2/24/14
 *
 * Fixture for testing with overrides
 */
var Q = require('q');

module.exports = function () {
    var BlahOverride = function () {};

    BlahOverride.prototype.create = function (req) {
        return new Q(req);
    };

    return BlahOverride;
};