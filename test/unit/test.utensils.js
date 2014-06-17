/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the pancakes utils
 */
var taste = require('../taste');
var name = 'utensils';
var utils = taste.target(name);

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
});
