/**
 * unit test for debug.handler
 */
var name    = 'debug.handler';
var taste   = require('taste');
var target  = taste.target(name);

/* eslint no-console:0 */
describe('unit ' + name, function () {
    describe('debugHandler()', function () {
        it('should write eventData to the console', function () {
            var log = console.log;
            console.log = taste.spy();

            target({
                name: { one: 'one', two: 'two' },
                payload: { three: 'three', four: { five: 'five' } }
            });

            console.log.should.have.been.callCount(8);

            console.log = log;
        });
    });
});