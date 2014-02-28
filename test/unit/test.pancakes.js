/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tests for the main pancakes module
 */
var name = 'pancakes';
var taste = require('../taste');
var pancakes = taste.target(name);

describe('Unit tests for ' + name, function () {
    it('should throw error if init not called yet', function () {
        var fn = function () {
            pancakes.cook('something');
        };
        taste.expect(fn).to.throw(/Pancakes has not yet been initialized/);
    });

    it('should load a node_modules lib', function () {
        pancakes.init({});
        var Q = pancakes.cook('q');
        taste.should.exist(Q);
    });

    //TODO: more higher level use cases with various types of injection objects
});