/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the pancakes utils
 */
var taste   = require('taste');
var name    = 'utensils';
var utils   = taste.target(name);
var Q       = require('q');

describe('Unit tests for ' + name, function () {

    describe('isJavaScript()', function () {
        it('should return true if file ends in .js', function () {
            var actual = utils.isJavaScript('something.js');
            actual.should.equal(true);
        });

        it('should return false if file not .js', function () {
            var actual = utils.isJavaScript('blah.txt');
            actual.should.equal(false);
        });
    });

    describe('getCamelCase()', function () {
        it('should return empty string if no path', function () {
            var expected = '';
            var actual = utils.getCamelCase();
            actual.should.equal(expected);
        });

        it('should get a simple all lower case name', function () {
            var path = 'something' + taste.delim + 'blah.js';
            var expected = 'blah';
            var actual = utils.getCamelCase(path);
            taste.should.exist(actual);
            actual.should.equal(expected);
        });

        it('should turn a dot notation name to camelCase', function () {
            var path = 'something' + taste.delim + 'blah.boo.yeah.js';
            var expected = 'blahBooYeah';
            var actual = utils.getCamelCase(path);
            taste.should.exist(actual);
            actual.should.equal(expected);
        });
    });

    describe('getPascalCase()', function () {
        it('should turn a dot notation to PascalCase', function () {
            var path = 'something' + taste.delim + 'blah.boo.yeah.js';
            var expected = 'BlahBooYeah';
            var actual = utils.getPascalCase(path);
            taste.should.exist(actual);
            actual.should.equal(expected);
        });
    });

    describe('splitCamelCase()', function () {
        it('should split a camel case string into an array', function () {
            var name = 'thisIsAtThing';
            var expected = ['this', 'is', 'at', 'thing'];
            var actual = utils.splitCamelCase(name);
            actual.should.deep.equal(expected);
        });
    });

    describe('getModulePath()', function () {
        it('should simply combine path and filename for non-js', function () {
            var path = 'foo';
            var fileName = 'choo';
            var expected = 'foo/choo';
            var actual = utils.getModulePath(path, fileName) || '';
            actual.should.equal(expected);
        });

        it('should combine path and file and remove .js', function () {
            var path = 'foo';
            var fileName = 'choo.js';
            var expected = 'foo/choo';
            var actual = utils.getModulePath(path, fileName) || '';
            actual.should.equal(expected);
        });
    });

    describe('splitCamelCase()', function () {
        it('should convert camel case to array parts', function () {
            var camelCase = 'oneTwoThree';
            var expected = ['one', 'two', 'three'];
            var actual = utils.splitCamelCase(camelCase) || [];
            actual.should.deep.equal(expected);
        });
    });

    describe('parseIfJson()', function () {
        it('should return back a normal string', function () {
            var data = 'something';
            var actual = utils.parseIfJson(data);
            actual.should.equal(data);
        });

        it('should return back a normal object', function () {
            var data = { some: 'obj' };
            var actual = utils.parseIfJson(data);
            actual.should.deep.equal(data);
        });

        it('should parse JSON in a string to an object', function () {
            var input = '{ "some": "thing" } ';
            var expected = { some: 'thing' };
            var actual = utils.parseIfJson(input);
            actual.should.deep.equal(expected);
        });
    });

    describe('chainPromises()', function () {
        it('should return null promise if null passed in', function (done) {
            var actual = utils.chainPromises(null, null);
            taste.eventuallyEqual(actual, null, done);
        });

        it('should return object if no calls', function (done) {
            var data = { blah: 'blah' };
            var actual = utils.chainPromises([], data);
            taste.eventuallyEqual(actual, data, done);
        });

        it('should chain together multiple calls', function (done) {
            var func1 = function (req) {
                req.val += '|func1';
                return new Q(req);
            };
            var func2 = function (req) {
                req.val += '|func2';
                return new Q(req);
            };
            var req = { val: 'original' };
            var expected = { val: 'original|func1|func2' };
            var actual = utils.chainPromises([func1, func2], req);
            taste.eventuallyEqual(actual, expected, done);
        });
    });

    describe('getNestedValue()', function () {
        it('should return undefined if no value found', function () {
            var data = { foo: 'val' };
            var field = 'blah.ma';
            var actual = utils.getNestedValue(data, field);
            taste.should.not.exist(actual);
        });

        it('should find a value with a basic field', function () {
            var data = { foo: 'val' };
            var field = 'foo';
            var expected = 'val';
            var actual = utils.getNestedValue(data, field);
            actual.should.equal(expected);
        });

        it('should fined a nested value', function () {
            var data = { foo: { choo: { moo: 'val' } } };
            var field = 'foo.choo.moo';
            var expected = 'val';
            var actual = utils.getNestedValue(data, field);
            actual.should.equal(expected);
        });
    });
});
