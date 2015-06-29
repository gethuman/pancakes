/**
 * Author: Jeff Whelpley
 * Date: 3/5/14
 *
 * This is the default handler used for events when debugging.
 */
var _ = require('lodash');

/* eslint no-console:0 */
module.exports = function debugHandler(eventData) {
    var dt = new Date();
    var len = 20;
    var pad = ' ';

    console.log('\nevent at ' + dt);
    console.log('  event name');

    /* jshint newcap:false */
    _.each(eventData.name, function (val, key) {
        console.log('    ' + key + Array(len + 1 - key.length).join(pad) + val);
    });

    console.log('  event data');
    _.each(eventData.payload, function (val, key) {
        var arrLen = (len + 1 - key.length) || 5;

        if (_.isObject(val)) {
            console.log('    ' + key);
            _.each(val, function (subVal, subKey) {
                var subArrLen = (len + 1 - subKey.length) || 5;
                subVal = _.isObject(subVal) ? JSON.stringify(subVal) : subVal;
                console.log('        ' + subKey + Array(subArrLen).join(pad) + subVal);
            });
        }
        else {
            console.log('    ' + key + Array(arrLen).join(pad) + val);
        }
    });
};