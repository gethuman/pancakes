/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Example of a resource file for posts
 */
module.exports = function () {
    return {
        name: 'posts',
        methods: ['create', 'update', 'remove', 'find'],
        adapters: {
            api:        'persist',
            webserver:  'api',
            batch:      'persist'
        }
    };
};