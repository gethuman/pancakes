/**
 * Author: Jeff Whelpley
 * Date: 1/13/15
 *
 * Simply a way of exposing plugin adapters to the DI
 */
var _ = require('lodash');

/**
 * Initialize the cache
 * @param injector
 * @constructor
 */
function AdapterFactory(injector) {
    if (!injector.adapters) { return; }
    var me = this;

    this.adapterMap = {};
    _.each(injector.adapterMap, function (adapterName, adapterType) {
        var adapter = injector.adapters[adapterName];
        if (adapter) {
            me.adapterMap[adapterType + 'adapter'] = adapter;
        }
    });
}

_.extend(AdapterFactory.prototype, {

    /**
     * Is candidate if name in the map
     * @param name
     */
    isCandidate: function isCandidate(name) {
        return !!this.adapterMap[name.toLowerCase()];
    },

    /**
     * Return the adapter
     * @param name
     */
    create: function create(name) {
        return this.adapterMap[name.toLowerCase()];
    }
});

// expose the class
module.exports = AdapterFactory;