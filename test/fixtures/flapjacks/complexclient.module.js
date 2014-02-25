/**
 * Author: Jeff Whelpley
 * Date: 2/18/14
 *
 * Sample client module
 */
module.exports = {
    client: function ($scope, $window) {
        // @module({ "client": true })

        var msg = $scope && $window ? '' : '';
        return {
            main: 'hello, world' + msg
        };
    }
};