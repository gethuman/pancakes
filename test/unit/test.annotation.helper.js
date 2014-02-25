/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit test for the annotation helper
 */
var taste = require('../taste');
var name = 'annotation.helper';
var annotationHelper = taste.target(name);

describe('Unit tests for ' + name, function () {

    describe('getModuleInfo()', function () {
        it('should return null if no annotation found', function () {
            var flapjack = function () {};
            var actual = annotationHelper.getModuleInfo(flapjack);
            taste.expect(actual).to.be.null;
        });

        it('should throw an error if there is invalid JSON', function () {
            var flapjack = function () {
                // @module({ invalid json here })
            };
            var fn = function () {
                annotationHelper.getModuleInfo(flapjack);
            };
            taste.expect(fn).to.throw(SyntaxError);
        });

        it('should return back parsed JSON in annotation', function () {
            var flapjack = function () {
                // @module({ "something": { "one": "two" } })
            };
            var expected = { something: { one: 'two' }};
            var actual = annotationHelper.getModuleInfo(flapjack);
            taste.expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getParamMap()', function () {
        it('should get parameter map for given part', function () {
            var flapjack = function () {
                // @module({ "something": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = annotationHelper.getParamMap('something', flapjack);
            taste.expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getServerParamMap()', function () {
        it('should get server parameter map', function () {
            var flapjack = function () {
                // @module({ "server": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = annotationHelper.getServerParamMap(flapjack);
            taste.expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getClientParamMap()', function () {
        it('should get server parameter map', function () {
            var flapjack = function () {
                // @module({ "client": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = annotationHelper.getClientParamMap(flapjack);
            taste.expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getParameters()', function () {
        it('should get flapjack parameters in an array', function () {
            var flapjack = function (one, two, three) { return one + two + three; };
            var expected = ['one', 'two', 'three'];
            var actual = annotationHelper.getParameters(flapjack);
            taste.expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });
});



