/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Example module for hte mongo persist adapter
 */
module.exports = function (Q) {
    var beforeFilters = ['adapters/persist/in.persist.filter'];
    var afterFilters = ['adapters/persist/out.persist.filter'];

    var create = function (req) {
        return new Q(req);
    };

    return {
        beforeFilters: beforeFilters,
        afterFilters: afterFilters,
        create: create
    };
};
