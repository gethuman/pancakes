/**
 * Author: Jeff Whelpley
 * Date: 2/21/14
 *
 * Example of a module using annotations
 */
module.exports = function (simpleModule) {
    // @module({ "server": { "simpleModule": "flapjacks/simple.module" }})

    return simpleModule;
};
