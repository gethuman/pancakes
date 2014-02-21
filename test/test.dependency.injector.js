/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Unit tets for the dependancy injector
 */
var Q = require('q');
var sinon = require('sinon');
var chai = require('chai');
var sinonChai = require('sinon-chai');
var should = chai.should();
var expect = chai.expect;
var chaiAsPromised  = require("chai-as-promised");
var mochaAsPromised = require("mocha-as-promised");
var Injector = require('../lib/dependency.injector');

mochaAsPromised();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Unit tests for the dependency.injector', function () {
    /*
    describe('loadMappings()', function () {
        it('should load all the mappings recursively in examples/mappings', function() {
            var injector = new Injector({});
            var dir = 'examples/mappings';
            var expected = {
                oneAnother: 'examples/mappings/one.another',
                two: 'examples/mappings/two',
                three: 'examples/mappings/subdir/three',
                four: 'examples/mappings/subdir/four'
            };
            var actual = injector.loadMappings(__dirname + '/..', [dir]);
            actual.should.deep.equal(expected);
        });
    });
*/
    describe('loadModule()', function () {
        /*
        it('should load a simple module', function() {
            var expected = require('../examples/simple.module')();
            var injector = new Injector({
                rootDir: __dirname + '/..'
            });
            var actual = injector.loadModule('examples/simple.module');
            actual.should.deep.equal(expected);
        });

        it('should load a param module with annotation mapping', function() {
            var expected = require('../examples/simple.module')();
            var injector = new Injector({
                rootDir: __dirname + '/..'
            });
            var actual = injector.loadModule('examples/annotation.module');
            actual.should.deep.equal(expected);
        });
        
        it('should load a param module with config mapping', function () {
            var expected = require('../examples/simple.module')();
            var injector = new Injector({
                rootDir: __dirname + '/..',
                preload: ['examples']
            });
            var actual = injector.loadModule('examples/param.module');
            actual.should.deep.equal(expected);
        });
*/
        it('should load postService', function (done) {
            var injector = new Injector({
                rootDir: __dirname + '/..',
                servicesDir: 'examples',
                adapterMap: { persist: 'test', search: 'solr' }
            });
            var actual = injector.loadModule('postService');
            expect(actual).to.exist;
            expect(actual.create).to.exist;

            var data = { something: 'blah' };
            var promise = actual.create(data);

            Q.all([
                promise.should.be.fulfilled,
                promise.should.eventually.deep.equal(data)
            ]).should.notify(done);
        });
    });
});