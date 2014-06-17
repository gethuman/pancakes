/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var taste = require('../../taste');
var name = 'factories/flapjack.factory';
var Factory = taste.target(name);

describe('Unit tests for ' + name, function () {
    
//    describe('isCandidate()', function () {
//        it('should return false if there is NOT a slash in the module path', function () {
//            var factory = new Factory({});
//            var actual = factory.isCandidate('something');
//            actual.should.equal(false);
//        });
//
//        it('should return true if there is a slash', function () {
//            var factory = new Factory({});
//            var actual = factory.isCandidate('something/another');
//            actual.should.equal(true);
//        });
//    });

    describe('injectFlapjack()', function () {
//        it('should simply call the flapjack with no params', function () {
//            var factory = new Factory({});
//            var data = 'hello';
//            var flapjack = function () { return data; };
//            var actual = factory.injectFlapjack(flapjack, null);
//            taste.should.exist(actual);
//            actual.should.equal(data);
//        });
//
//        it('should call flapjack with the instantiated params', function () {
//            var data = 'yoyo';
//            var expected = 'yoyo|yoyo';
//            var flapjack = function (foo, moo) { return foo + '|' + moo; };
//            var injector = {
//                loadModule: function () {
//                    return data;
//                }
//            };
//
//            var factory = new Factory(injector);
//            var actual = factory.injectFlapjack(flapjack, null);
//            taste.should.exist(actual);
//            actual.should.equal(expected);
//        });
//
//        it('should use the param map from the injector', function () {
//            var data = 'some/foo';
//            var flapjack = function (foo) { return foo; };
//            var injector = {
//                loadModule: function (param) {
//                    return param;
//                },
//                aliases: {
//                    foo: data
//                }
//            };
//
//            var factory = new Factory(injector);
//            var actual = factory.injectFlapjack(flapjack, null);
//            taste.should.exist(actual);
//            actual.should.equal(data);
//        });

        it('should use the param map from the annotation', function () {
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

            var factory = new Factory(injector);
            var actual = factory.injectFlapjack(flapjack, null);
            taste.should.exist(actual);
            actual.should.equal(data);
        });
    });
//
//    describe('create()', function () {
//        it('should return an object from cache', function () {
//            var modulePath = 'foo';
//            var data = 'hello';
//
//            var factory = new Factory(null);
//            factory.cache[modulePath] = data;
//
//            var actual = factory.create(modulePath, null);
//            taste.should.exist(actual);
//            actual.should.equal(data);
//        });
//
//        it('should throw an error if the file does not exist', function () {
//            var factory = new Factory({});
//            var fn = function () {
//                factory.create('blah', null);
//            };
//            taste.expect(fn).to.throw(/FlapjackFactory got invalid file path/);
//        });
//
//        it('should return module without injection if not a function', function () {
//            var data = 'factories/test.flapjack.factory';
//            var expected = 'test.flapjack.factory';
//            var injector = {
//                rootDir: __dirname + '/..',
//                require: function (path) {
//                    var parts = path.split('/');
//                    return parts[parts.length - 1];
//                }
//            };
//
//            var factory = new Factory(injector);
//            var actual = factory.create(data, []);
//            taste.should.exist(actual);
//            actual.should.equal(expected);
//            factory.cache[data].should.equal(expected);
//        });
//
//        it('should instantiate and inject a fake real flapjack', function () {
//            var data = 'factories/test.service.factory';
//            var expected = 'foo';
//            var injector = {
//                rootDir: __dirname + '/..',
//                require: function () {
//                    return function (foo) {
//                        return foo;
//                    };
//                },
//                loadModule: function (path) {
//                    var parts = path.split('/');
//                    return parts[parts.length - 1];
//                },
//                aliases: {
//                    foo: 'something/foo'
//                }
//            };
//
//            var factory = new Factory(injector);
//            var actual = factory.create(data, []);
//            taste.should.exist(actual);
//            actual.should.equal(expected);
//            factory.cache[data].should.equal(expected);
//        });
//    });
});