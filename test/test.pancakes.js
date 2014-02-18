/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tests for the main pancakes module
 */
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;
var pancakes = require('../lib/pancakes');
var injector = require('../lib/dependency.injector');

describe('Unit tests for pancakes', function () {
    beforeEach(function () {
        injector.resetContext();
    });

    describe('init()', function () {
        it('should initialize the injector', function() {
            pancakes.init({ one: 'two' });
            injector.context.should.have.property('one', 'two');
        });
    });

    describe('cook()', function () {
        it('should call loadModule on the injector', function() {
            var testData = { client: { something: 'yes' } };
            injector.context.require = function() {
                return function () {
                    return testData;
                };
            };
            var actual = pancakes.cook('something');
            expect(actual).to.exist;
            actual.should.deep.equal(testData);
        });
    });
});