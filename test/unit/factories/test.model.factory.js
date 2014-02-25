/**
 * Author: Jeff Whelpley
 * Date: 2/18/14
 *
 * Unit tests for the client.generator
 */
var taste = require('../../taste');
var name = 'factories/model.factory';
var modelFactory = taste.target(name);

describe('Unit tests for ' + name, function () {
    describe('isCandidate()', function () {
        it('should return false if slash', function () {
            var actual = modelFactory.isCandidate('Something/Blah');
            taste.expect(actual).to.be.false;
        });

        it('should return false if first letter is not capital', function () {
            var actual = modelFactory.isCandidate('blah');
            taste.expect(actual).to.be.false;
        });

        it('should return true if no slash and first letter is cap', function () {
            var actual = modelFactory.isCandidate('Blah');
            taste.expect(actual).to.be.true;
        });
    });

    describe('create()', function () {
        it('should return empty object', function () {
            var expected = {};
            var actual = modelFactory.create('', [], {});
            actual.should.deep.equal(expected);
        });

        it('should return item from cache', function () {
            var name = 'somethin';
            var expected = { blah: true };
            modelFactory.cache[name] = expected;
            var actual = modelFactory.create(name, [], {});
            actual.should.deep.equal(expected);
        });
    });
});