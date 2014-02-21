/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Persist filter for sample project
 */
module.exports = function (Q) {
    return {
        create_before: function (req) {
            return new Q(req);
        }
    };
};
