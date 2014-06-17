/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Example module for the mongo persist adapter
 */
module.exports = function (Q) {

    var BackendAdapter = function () {};

    BackendAdapter.prototype.create = function (req) {
        return new Q(req);
    };

    return BackendAdapter;
};
