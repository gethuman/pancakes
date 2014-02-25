/**
 * Author: Jeff Whelpley
 * Date: 2/24/14
 *
 * Fixture for filter example
 */
module.exports = function (Q) {

    var beforeFilters = [
        { name: 'in1', all: true },
        { name: 'in2', all: true }
    ];

    var afterFilters = [
        { name: 'out1', all: true },
        { name: 'out2', all: true }
    ];

    var in1 = function (req) { return new Q(req); };
    var in2 = function (req) { return new Q(req); };
    var out1 = function (res) { return new Q(res); };
    var out2 = function (res) { return new Q(res); };

    return {
        beforeFilters: beforeFilters,
        afterFilters: afterFilters,
        in1: in1,
        in2: in2,
        out1: out1,
        out2: out2
    };
};