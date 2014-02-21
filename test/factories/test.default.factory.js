/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var sinon = require('sinon');
var chai = require('chai');
var sinonChai = require('sinon-chai');
var should = chai.should();
var expect = chai.expect;
var defaultFactory = require('../../lib/factories/default.factory');
chai.use(sinonChai);

describe('Unit tests for default.factory', function () {
    describe('isCandidate()', function () {
        it('should aways return what is sent in', function() {
            var data = 'blah'
            var actual = defaultFactory.isCandidate(data) || '';
            actual.should.equal(data);
        });
    });

    describe('create()', function () {
        it('should call require on the input injector', function() {
            var injector = {
                require: sinon.spy()
            };
            var modulePath = 'blah';

            defaultFactory.create(modulePath, null, injector);
            injector.require.should.have.been.calledWith(modulePath);
        });
    });
});