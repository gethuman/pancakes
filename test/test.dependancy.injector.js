/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tets for the dependancy injector
 */
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;
var injector = require('../lib/dependancy.injector');

describe('Unit tests for dependancy.injector', function () {
    describe('getModuleName()', function () {
        it('should return empty string if no path', function() {
            var expected = '';
            var actual = injector.getModuleName();
            expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should get a simple all lower case name', function() {
            var path = 'something/blah.js';
            var expected = 'blah';
            var actual = injector.getModuleName(path);
            expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should turn a dot notation name to camelCase', function() {
            var path = 'something/blah.boo.yeah.js';
            var expected = 'blahBooYeah';
            var actual = injector.getModuleName(path);
            expect(actual).to.exist;
            actual.should.equal(expected);
        });
    });

    describe('loadModule()', function () {
        beforeEach(function () {
            injector.resetContext();
        });

        it('should throw an error if the module does not exist', function() {
            var fn = function () {
                injector.loadModule('blah.js');
            };
            expect(fn).to.throw(Error);
        });

        it('should require a module as normal if it is an object without a server param', function() {
            var meta = injector.loadModule('pancakes') || {};
            meta.cook.should.be.a('function');
            meta.init.should.be.a('function');
        });

        it('should load the server param if it exists', function() {
            var testData = { client: { something: 'yes' } };
            injector.context.require = function() {
                return testData;
            };
            var actual = injector.loadModule('something');
            expect(actual).to.exist;
            actual.should.deep.equal(testData);
        });

        it('should return back the flapjack function return obj if no params', function() {
            var testData = { client: { something: 'yes' } };
            injector.context.require = function() {
                return function () {
                    return testData;
                };
            };
            var actual = injector.loadModule('something');
            expect(actual).to.exist;
            actual.should.deep.equal(testData);
        });

        it('should throw an error if there is a circular reference', function() {
            injector.context.preloadedParamMap = { 'aval': 'something/aval' };
            injector.context.require = function() {
                return function (aval) {
                    return '';
                };
            };
            var fn = function () {
                injector.loadModule('blah', null);
            };

            expect(fn).to.throw(/Circular reference/);
        });
        
        it('should use a cached module', function() {
            var expected = { one: 'two' };
            injector.context.preloadedParamMap = { 'aval': 'something/aval' };
            injector.context.cachedModules['something/aval'] = expected;
            injector.context.require = function() {
                return function (aval) {
                    return aval;
                };
            };

            var actual = injector.loadModule('blah', null) || {};
            actual.should.deep.equal(expected);
        });

        //TODO: load actual require for 3rd party module and then some tests for recursive lookup
    });
});