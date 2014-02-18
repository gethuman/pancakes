/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit test for the annotation helper
 */
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;
var annotationHelper = require('../lib/annotation.helper');

describe('Unit tests for annotation.helper', function () {
    describe('getModuleName()', function () {
        it('should return empty string if no path', function() {
            var expected = '';
            var actual = annotationHelper.getModuleName();
            expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should get a simple all lower case name', function() {
            var path = 'something/blah.js';
            var expected = 'blah';
            var actual = annotationHelper.getModuleName(path);
            expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should turn a dot notation name to camelCase', function() {
            var path = 'something/blah.boo.yeah.js';
            var expected = 'blahBooYeah';
            var actual = annotationHelper.getModuleName(path);
            expect(actual).to.exist;
            actual.should.equal(expected);
        });
    });

    describe('getModuleInfo()', function () {
        it('should return null if no annotation found', function() {
            var flapjack = function () {};
            var actual = annotationHelper.getModuleInfo(flapjack);
            expect(actual).to.be.null;
        });

        it('should throw an error if there is invalid JSON', function() {
            var flapjack = function () {
                // @module({ invalid json here })
            };
            var fn = function () {
                annotationHelper.getModuleInfo(flapjack);
            };
            expect(fn).to.throw(SyntaxError);
        });

        it('should return back parsed JSON in annotation', function() {
            var flapjack = function () {
                // @module({ "something": { "one": "two" } })
            };
            var expected = { something: { one: 'two' }};
            var actual = annotationHelper.getModuleInfo(flapjack);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getParamMap()', function () {
        it('should get parameter map for given part', function() {
            var flapjack = function () {
                // @module({ "something": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = annotationHelper.getParamMap('something', flapjack);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getServerParamMap()', function () {
        it('should get server parameter map', function() {
            var flapjack = function () {
                // @module({ "server": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = annotationHelper.getServerParamMap(flapjack);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getClientParamMap()', function () {
        it('should get server parameter map', function() {
            var flapjack = function () {
                // @module({ "client": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = annotationHelper.getClientParamMap(flapjack);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('getParameters()', function () {
        it('should get flapjack parameters in an array', function() {
            var flapjack = function (one, two, three) {};
            var expected = ['one', 'two', 'three'];
            var actual = annotationHelper.getParameters(flapjack);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });
});


