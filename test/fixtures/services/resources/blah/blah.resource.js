/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Example of a resource file for posts
 */
module.exports = function () {
    return {
        name: 'blah',
        methods: {
            backend:    ['create', 'update', 'remove', 'find'],
            repo:       ['create', 'update', 'remove', 'find']
        },
        adapters: {
            api:        'backend',
            webserver:  'repo',
            batch:      'backend'
        },
        params: {
            create:     { optional: ['data'] }
        }
    };
};