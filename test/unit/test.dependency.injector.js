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
        injector = new Injector({ rootDir: taste.fixturesDir });
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
                four: 'mappings/subdir/four'
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
                four: 'mappings/subdir/four'
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
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                adapterMap: { backend: 'test', repo: 'solr' }
            });
            var actual = injector.loadModule('blahService');
            taste.should.exist(actual);
            taste.should.exist(actual.create);

            var data = { something: 'blah' };
            var promise = actual.create(data);

            taste.all([
                promise.should.be.fulfilled,
                promise.should.eventually.deep.equal(data)
            ], done);
        });
    });
});