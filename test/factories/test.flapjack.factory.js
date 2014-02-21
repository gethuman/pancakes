/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;
var flapjackFactory = require('../../lib/factories/flapjack.factory');

describe('Unit tests for flapjack.factory', function () {
    describe('isCandidate()', function () {
        it('should return false if there is NOT a slash in the module path', function() {
            var actual = flapjackFactory.isCandidate('something');
            expect(actual).to.be.false;
        });

        it('should return true if there is a slash', function() {
            var acutal = flapjackFactory.isCandidate('something/another');
            expect(acutal).to.be.true;
        });
    });

    describe('injectFlapjack()', function () {
        it('should simply call the flapjack with no params', function() {
            var data = 'hello';
            var flapjack = function () { return data; };
            var actual = flapjackFactory.injectFlapjack(flapjack, null, {});
            expect(actual).to.exist;
            actual.should.equal(data);
        });

        it('should call flapjack with the instantiated params', function() {
            var data = 'yoyo';
            var expected = 'yoyo|yoyo';
            var flapjack = function (foo, moo) { return foo + '|' + moo; };
            var injector = {
                loadModule: function () {
                    return data;
                }
            };
            var actual = flapjackFactory.injectFlapjack(flapjack, null, injector);
            expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should use the param map from the injector', function() {
            var data = 'some/foo';
            var flapjack = function (foo) { return foo; };
            var injector = {
                loadModule: function (param) {
                    return param;
                },
                paramMap: {
                    foo: data
                }
            };
            var actual = flapjackFactory.injectFlapjack(flapjack, null, injector);
            expect(actual).to.exist;
            actual.should.equal(data);
        });

        it('should use the param map from the annotation', function() {
            var data = 'some/foo';
            var flapjack = function (foo) {
                // @module({ "server": { "foo": "some/foo" } })
                return foo;
            };
            var injector = {
                loadModule: function (param) {
                    return param;
                }
            };
            var actual = flapjackFactory.injectFlapjack(flapjack, null, injector);
            expect(actual).to.exist;
            actual.should.equal(data);
        });
    });

    describe('create()', function () {
        it('should return an object from cache', function() {
            var modulePath = 'foo';
            var data = 'hello';

            flapjackFactory.cache[modulePath] = data;
            var actual = flapjackFactory.create(modulePath, null, null);
            expect(actual).to.exist;
            actual.should.equal(data);
        });

        it('should throw an error if the file does not exist', function() {
            var fn = function () {
                flapjackFactory.create('blah', null, {});
            };
            expect(fn).to.throw(/FlapjackFactory got invalid file path/);
        });

        it('should return module without injection if not a function', function() {
            var data = 'factories/test.flapjack.factory';
            var expected = 'test.flapjack.factory';
            var injector = {
                rootDir: __dirname + '/..',
                require: function (path) {
                    var parts = path.split('/');
                    return parts[parts.length - 1];
                }
            };
            var actual = flapjackFactory.create(data, [], injector);
            expect(actual).to.exist;
            actual.should.equal(expected);
            flapjackFactory.cache[data].should.equal(expected);
        });

        it('should instantiate and inject a fake real flapjack', function() {
            var data = 'factories/test.service.factory';
            var expected = 'foo';
            var injector = {
                rootDir: __dirname + '/..',
                require: function () {
                    return function (foo) {
                        return foo;
                    }
                },
                loadModule: function(path) {
                    var parts = path.split('/');
                    return parts[parts.length - 1];
                },
                paramMap: {
                    foo: 'something/foo'
                }
            };
            var actual = flapjackFactory.create(data, [], injector);
            expect(actual).to.exist;
            actual.should.equal(expected);
            flapjackFactory.cache[data].should.equal(expected);
        });
    });
});