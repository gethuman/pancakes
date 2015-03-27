/**
 * Author: Jeff Whelpley
 * Date: 3/3/14
 *
 * Unit tests for the event bus
 */
var name     = 'server.event.bus';
var taste    = require('taste');
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

    describe('errorHandler()', function () {
        it('should allow us to override the default error handler', function (done) {
            var data = { something: 'other' };

            eventBus.errorHandler(function (actual) {
                actual.should.deep.equal(data);
                done();
            });

            eventBus.emit('error', data);
        });
    });

    describe('addHandlers()', function () {
        it('should throw an error if the options is empty', function () {
            var options = {};
            var fn = function () {
                eventBus.addHandlers(options);
            };
            fn.should.throw('Must have resources, adapters and methods specified in addHandlers');
        });

        it('should throw an error if the options is empty', function () {
            var options = {
                resource:   [],
                adapters:   [],
                methods:    []
            };
            var fn = function () {
                eventBus.addHandlers(options);
            };
            fn.should.throw('Must have resources, adapters and methods specified in addHandlers');
        });

        it('should listen to a event if the option is a string', function () {
            var data    = { Get: 'Human' };
            var options = 'foo.*.boo';

            eventBus.addHandlers(options, function (actual) {
                actual.should.deep.equal(data);
            });

            eventBus.emit('foo.is.boo', data);
        });

        it('should listen to an event if the option is an array', function () {
            var data    = { Haiku: 'Friday' };
            var options = [ 'rainday.ramen', 'world.cup', 'robin.*.persie'];

            eventBus.addHandlers(options, function (actual) {
                actual.should.deep.equal(data);
            });

            eventBus.emit('rainday.ramen', data);
            eventBus.emit('world.cup', data);
            eventBus.emit('robin.van.persie', data);
        });


        it('should listen to multiple events in options', function () {
            var data    = { something: 'awesome' };
            var options = {
                resources:  ['blah'],
                adapters:   ['foo'],
                methods:    ['bar', 'boo']
            };

            eventBus.addHandlers(options, function (actual) {
                actual.should.deep.equal(data);
            });

            eventBus.emit('blah.foo.bar', data);
            eventBus.emit('blah.foo.boo', data);
        });
    });
});