/**
 * Author: Jeff Whelpley
 * Date: 3/3/14
 *
 * Unit tests for the event bus
 */
var name = 'event.bus';
var taste = require('../taste');
var eventBus = taste.target(name);

describe('Unit tests for ' + name, function () {

    beforeEach(function () {
        eventBus.removeAllListeners();
    });

    it('should handle a simple event', function (done) {
        var data = { something: 'other' };

        eventBus.on('some.event', function (actual) {
            actual.should.deep.equal(data);
            done();
        });

        eventBus.on('error', function (err) { done(err); });
        eventBus.emit('some.event', data);
    });

    it('should handle a wild card event', function (done) {
        var data = { something: 'other' };

        eventBus.on('some.*', function (actual) {
            actual.should.deep.equal(data);
            done();
        });

        eventBus.on('error', function (err) { done(err); });
        eventBus.emit('some.event', data);
    });

    it('should handle a wild card event with * in the middle', function (done) {
        var data = { something: 'other' };

        eventBus.on('some.*.other', function (actual) {
            actual.should.deep.equal(data);
            done();
        });

        eventBus.on('error', function (err) { done(err); });
        eventBus.emit('some.event.other', data);
    });

    it('should allow us to override the default error handler', function (done) {
        var data = { something: 'other' };

        eventBus.errorHandler(function (actual) {
            actual.should.deep.equal(data);
            done();
        });

        eventBus.emit('error', data);
    });

});
