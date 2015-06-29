/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit test for the annotation helper
 */
var taste   = require('taste');
var name    = 'annotation.helper';
var helper  = taste.target(name);

/* eslint no-console:0 */
describe('Unit tests for ' + name, function () {

    describe('getAnnotationInfo()', function () {
        it('should return null if no annotation found', function () {
            var fn = function () {};

            var actual = helper.getAnnotationInfo('module', fn);
            taste.should.not.exist(actual);
            taste.expect(actual).to.be.null;
        });

        it('should return an array', function () {
            var fn = function () {
                // @something(["one", "two", "three"])
            };
            var expected = ['one', 'two', 'three'];
            var actual = helper.getAnnotationInfo('something', fn, true);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('getModuleInfo()', function () {

        it('should throw an error if there is invalid JSON', function () {
            var log = console.log;
            console.log = taste.spy();
            var flapjack = function () {
                // @module({ invalid json here })
            };
            var fn = function () {
                helper.getModuleInfo(flapjack);
            };
            fn.should.throw(SyntaxError);
            console.log = log;
        });

        it('should return back parsed JSON in annotation', function () {
            var flapjack = function () {
                // @module({ "something": { "one": "two" } })
            };
            var expected = { something: { one: 'two' }};
            var actual = helper.getModuleInfo(flapjack);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('getAliases()', function () {
        it('should get parameter map for given part', function () {
            var flapjack = function () {
                // @module({ "something": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = helper.getAliases('something', flapjack);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('getServerAliases()', function () {
        it('should get server parameter map', function () {
            var flapjack = function () {
                // @module({ "server": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = helper.getServerAliases(flapjack);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('getClientAliases()', function () {
        it('should get server parameter map', function () {
            var flapjack = function () {
                // @module({ "client": { "one": "two" } })
            };
            var expected = { one: 'two' };
            var actual = helper.getClientAliases(flapjack);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('getParameters()', function () {
        it('should get flapjack parameters in an array', function () {
            var flapjack = function (one, two, three) { return one + two + three; };
            var expected = ['one', 'two', 'three'];
            var actual = helper.getParameters(flapjack);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should get parameters from multiple lines', function () {
            var flapjack = function (one, two,
                                     three) {
                return one + two + three;
            };
            var expected = ['one', 'two', 'three'];
            var actual = helper.getParameters(flapjack);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });
});
