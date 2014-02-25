/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tets for the dependancy injector
 */
var taste = require('../taste');
var name = 'dependency.injector';
var Injector = taste.target(name);

describe('Unit tests for ' + name, function () {

    describe('loadMappings()', function () {
        it('should load all the mappings recursively in fixtures/mappings', function() {
            var injector = new Injector({
                rootDir: taste.fixturesDir
            });
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
    });

    describe('loadModule()', function () {

        it('should load a simple module', function() {
            var expected = require('../fixtures/flapjacks/simple.module')();
            var injector = new Injector({
                rootDir: taste.fixturesDir
            });
            var actual = injector.loadModule('flapjacks/simple.module');
            actual.should.deep.equal(expected);
        });

        it('should load a param module with annotation mapping', function() {
            var expected = require('../fixtures/flapjacks/simple.module')();
            var injector = new Injector({
                rootDir: taste.fixturesDir
            });
            var actual = injector.loadModule('flapjacks/annotation.module');
            actual.should.deep.equal(expected);
        });
        
        it('should load a param module with config mapping', function () {
            var expected = require('../fixtures/flapjacks/simple.module')();
            var injector = new Injector({
                rootDir: taste.fixturesDir,
                preload: ['flapjacks']
            });
            var actual = injector.loadModule('flapjacks/param.module');
            actual.should.deep.equal(expected);
        });

        it('should load blahService', function (done) {
            var injector = new Injector({
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                adapterMap: { backend: 'test', repo: 'solr' }
            });
            var actual = injector.loadModule('blahService');
            taste.expect(actual).to.exist;
            taste.expect(actual.create).to.exist;

            var data = { something: 'blah' };
            var promise = actual.create(data);

            taste.all([
                promise.should.be.fulfilled,
                promise.should.eventually.deep.equal(data)
            ], done);
        });
    });
});