/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var taste           = require('taste');
var name            = 'factories/default.factory';
var DefaultFactory  = taste.target(name);

describe('Unit tests for ' + name, function () {
    describe('isCandidate()', function () {
        it('should aways return what is sent in', function () {
            var data = 'blah';
            var defaultFactory = new DefaultFactory({});
            var actual = defaultFactory.isCandidate(data) || '';
            actual.should.equal(data);
        });
    });

    describe('create()', function () {
        it('should call require on the input injector', function () {
            var injector = {
                require: taste.spy()
            };
            var modulePath = 'blah';

            var defaultFactory = new DefaultFactory(injector);
            defaultFactory.create(modulePath, null);
            injector.require.should.have.been.calledWith(modulePath);
        });
    });
});