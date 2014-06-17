/**
 * Author: Jeff Whelpley
 * Date: 2/24/14
 *
 * Fixture for filter example
 */
module.exports = function (Q) {

    var BackendFilters = function () {
        this.beforeFilters = [
            { name: 'in1', all: true },
            { name: 'in2', all: true }
        ];

        this.afterFilters = [
            { name: 'out1', all: true },
            { name: 'out2', all: true }
        ];
    };

    BackendFilters.prototype.in1 = function (req) {
        return new Q(req);
    };

    BackendFilters.prototype.in2 = function (req) {
        return new Q(req);
    };

    BackendFilters.prototype.out1 = function (res) { return new Q(res); };
    BackendFilters.prototype.out2 = function (res) { return new Q(res); };

    return BackendFilters;
};