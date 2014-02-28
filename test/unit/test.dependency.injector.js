/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tets for the dependancy injector
 */
var taste = require('../taste');
var name = 'dependency.injector';
var Injector = taste.target(name);
var injector;

describe('Unit tests for ' + name, function () {
    beforeEach(function () {
        injector = new Injector({
            rootDir: taste.fixturesDir,
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

    describe('loadMappings()', function () {
        it('should return empty object if no mappsings', function () {
            var expected = {};
            var actual = injector.loadMappings(taste.fixturesDir, null);
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
            var actual = injector.loadMappings(taste.fixturesDir, [dir]);
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
            var actual = injector.loadMappings(taste.fixturesDir, dir);
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
            taste.expect(fn).to.throw(/Circular reference/);
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
                rootDir: taste.fixturesDir,
                preload: ['flapjacks']
            });
            var expected = require('../fixtures/flapjacks/simple.module')();
            var actual = injector.loadModule('flapjacks/param.module');
            actual.should.deep.equal(expected);
        });

        it('should load blahService', function (done) {
            injector = new Injector({
                rootDir:    taste.fixturesDir,
                adapterMap: { backend: 'test', repo: 'solr' }
            });
            var actual = injector.loadModule('blahService');
            taste.should.exist(actual, 'Nothing returned from blahService');
            taste.should.exist(actual.create, 'No create method available');

            var data = { something: 'blah' };
            var req = { data: data };
            var promise = actual.create(req);
            taste.eventuallySame(promise, data, done);
        });
    });
});