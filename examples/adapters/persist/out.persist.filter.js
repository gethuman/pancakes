/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Output persist filter
 */
module.exports = function (Q) {
    return {
        create_after: function (req) {
            return new Q(req);
        }
    };
};

