/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tets for the dependancy injector
 */
var taste       = require('taste');
var path        = require('path');
var name        = 'dependency.injector';
var pancakes    = require('../../lib/pancakes');
var fixturesDir = path.join(__dirname, '../fixtures');
var Injector    = taste.target(name);
var injector;

describe('Unit tests for ' + name, function () {

    beforeEach(function () {
        injector = new Injector({
            rootDir: fixturesDir,
            preload: 'flapjacks',
            adapterMap: {
                backend: 'test'
            }
        });
    });

    describe('constructor', function () {
        it('should add short adapter names to alias list', function () {
            taste.should.exist(injector.aliases, 'Aliases do not exist');
            taste.should.exist(injector.aliases.testBackendAdapter, 'testBackendAdapter does not exist');
            taste.should.exist(injector.aliases.BackendAdapter, 'backendAdapter does not exist');
            injector.aliases.testBackendAdapter.should.deep.equal(injector.aliases.BackendAdapter);
        });
    });

    describe('clearCache()', function () {
        it('should clear out the cache of DependencyInjector.factories', function () {
            pancakes.init({
                rootDir: fixturesDir,
                servicesDir: 'services',
                clientPlugin: function () {},
                serverPlugin: function () {}
            });
            pancakes.getService('blah');
            var pancakesInjector = pancakes.getInjector();
            pancakesInjector.clearCache();
            pancakesInjector.should.have.property('flapjackFactory');
            (pancakesInjector.flapjackFactory.cache).should.be.empty;
        });
    });

    describe('loadMappings()', function () {
        it('should return empty object if no mappsings', function () {
            var expected = {};
            var actual = injector.loadMappings(fixturesDir, null);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should load all the mappings recursively in fixtures/mappings', function () {
            var dir = 'mappings';
            var expected = {
                oneAnother: 'mappings/one.another',
                two: 'mappings/two',
                three: 'mappings/subdir/three',
                four: 'mappings/subdir/four',
                OneAnother: 'mappings/one.another',
                Two: 'mappings/two',
                Three: 'mappings/subdir/three',
                Four: 'mappings/subdir/four'
            };
            var actual = injector.loadMappings(fixturesDir, [dir]);
            actual.should.deep.equal(expected);
        });

        it('should ignore path that does not exist', function () {
            var dir = ['mappings', 'asdfasd'];
            var expected = {
                oneAnother: 'mappings/one.another',
                two: 'mappings/two',
                three: 'mappings/subdir/three',
                four: 'mappings/subdir/four',
                OneAnother: 'mappings/one.another',
                Two: 'mappings/two',
                Three: 'mappings/subdir/three',
                Four: 'mappings/subdir/four'
            };
            var actual = injector.loadMappings(fixturesDir, dir);
            actual.should.deep.equal(expected);
        });
    });

    describe('loadModule()', function () {

        it('should throw error with circular dependency', function () {
            var modulePath = 'blah';
            var moduleStack = [modulePath];
            var fn = function () {
                injector.loadModule(modulePath, moduleStack);
            };
            fn.should.throw(/Circular reference/);
        });

        it('should load a simple module', function () {
            var expected = require('../fixtures/flapjacks/simple.module')();
            var actual = injector.loadModule('flapjacks/simple.module');
            actual.should.deep.equal(expected);
        });

        it('should load a simple module from the param name', function () {
            var expected = require('../fixtures/flapjacks/simple.module')();
            var actual = injector.loadModule('simpleModule');
            actual.should.deep.equal(expected);
        });

        it('should load a param module with annotation mapping', function () {
            var expected = require('../fixtures/flapjacks/simple.module')();
            var actual = injector.loadModule('flapjacks/annotation.module');
            actual.should.deep.equal(expected);
        });

        it('should load a param module with config mapping', function () {
            injector = new Injector({
                rootDir: fixturesDir,
                preload: ['flapjacks']
            });
            var expected = require('../fixtures/flapjacks/simple.module')();
            var actual = injector.loadModule('flapjacks/param.module');
            actual.should.deep.equal(expected);
        });

        it('should load blahService', function (done) {
            injector = new Injector({
                rootDir:    fixturesDir,
                adapterMap: { backend: 'test', repo: 'solr' }
            });
            var actual = injector.loadModule('blahService');

            taste.should.exist(actual, 'Nothing returned from blahService');
            taste.should.exist(actual.create, 'No create method available');

            var data = { something: 'blah' };
            var req = { data: data };
            var promise = actual.create(req);

            taste.all([
                promise.should.be.fulfilled,
                promise.should.eventually.have.property('data').that.deep.equals(data)
            ], done);
        });
    });

    //
    //describe('injectFlapjack()', function () {
    //    it('should simply call the flapjack with no params', function () {
    //        var factory = new Factory({});
    //        var data = 'hello';
    //        var flapjack = function () { return data; };
    //        var actual = factory.injectFlapjack(flapjack, null);
    //        taste.should.exist(actual);
    //        actual.should.equal(data);
    //    });
    //
    //    it('should call flapjack with the instantiated params', function () {
    //        var data = 'yoyo';
    //        var expected = 'yoyo|yoyo';
    //        var flapjack = function (foo, moo) { return foo + '|' + moo; };
    //        var injector = {
    //            loadModule: function () {
    //                return data;
    //            }
    //        };
    //
    //        var factory = new Factory(injector);
    //        var actual = factory.injectFlapjack(flapjack, null);
    //        taste.should.exist(actual);
    //        actual.should.equal(expected);
    //    });
    //
    //    it('should use the param map from the injector', function () {
    //        var data = 'some/foo';
    //        var flapjack = function (foo) { return foo; };
    //        var injector = {
    //            loadModule: function (param) {
    //                return param;
    //            },
    //            aliases: {
    //                foo: data
    //            }
    //        };
    //
    //        var factory = new Factory(injector);
    //        var actual = factory.injectFlapjack(flapjack, null);
    //        taste.should.exist(actual);
    //        actual.should.equal(data);
    //    });
    //
    //    it('should use the param map from the annotation', function () {
    //        var data = 'some/foo';
    //        var flapjack = function (foo) {
    //            // @module({ "server": { "foo": "some/foo" } })
    //            return foo;
    //        };
    //        var injector = {
    //            loadModule: function (param) {
    //                return param;
    //            }
    //        };
    //
    //        var factory = new Factory(injector);
    //        var actual = factory.injectFlapjack(flapjack, null);
    //        taste.should.exist(actual);
    //        actual.should.equal(data);
    //    });
    //});

});