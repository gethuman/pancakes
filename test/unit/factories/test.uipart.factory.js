/**
 * Author: Jeff Whelpley
 * Date: 2/15/15
 *
 * Testing the UI part factory
 */
var name    = 'factories/uipart.factory';
var taste   = require('taste');
var path    = require('path');
var Factory = taste.target(name);
var factory = new Factory({
    rootDir: path.join(__dirname, '../../fixtures'),
    require: require
});

describe('Unit tests for ' + name, function () {
    describe('isCandidate()', function () {
        it('should be a candidate if pages', function () {
            var filePath = 'app/common/pages/something.page';
            var expected = true;
            var actual = factory.isCandidate(filePath);
            actual.should.equal(expected);
        });

        it('should not be a candidate if some other path', function () {
            var filePath = 'app/common/styles/something.style';
            var expected = false;
            var actual = factory.isCandidate(filePath);
            actual.should.equal(expected);
        });
    });

    describe('create()', function () {
        it('should create a uipart', function () {
            var uipart = factory.create('app/another/partials/one.partial');
            taste.should.exist(uipart);
        });

        it('should create another uipart', function () {
            var uipart = factory.create('app/another/partials/two.partial');
            taste.should.exist(uipart);

            var expected = {
                tag: 'div',
                text: 'hello, world'
            };
            var actual = uipart.view();
            actual.should.deep.equal(expected);
        });
    });
});