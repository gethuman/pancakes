/**
 * Author: Jeff Whelpley
 * Date: 2/17/14
 *
 * Co-author: Masaya Ando
 * date: 6/12/2014
 *
 * Unit tests for the main pancakes module
 */
var name     = 'pancakes';
var taste    = require('taste');
var pancakes = taste.target(name);
var path     = require('path');

describe('Unit tests for ' + name, function () {

    afterEach(function () { pancakes.destroy(); });

    describe('requireModule()', function () {
        it('should throw an error if a filePath is not passed in', function () {
            pancakes.init({});
            var fn = function () { pancakes.requireModule('', false); };
            fn.should.throw(Error);
        });
    });

    describe('getRootDir()', function () {
        it('should return the root directory of the injector object', function () {
            pancakes.init({rootDir: 'blah/blah/blah'});

            var rootDir = pancakes.getRootDir();

            rootDir.should.be.a('string');
            rootDir.should.equal('blah/blah/blah');
        });
    });

    describe('cook()', function () {
        it('should throw an error if init is not called yet', function () {
            var fn = function () { pancakes.cook('something'); };
            fn.should.throw(Error);
        });

        it('should load a node_modules lib', function () {
            pancakes.init({});

            var filePath = pancakes.cook('gulp');
            taste.should.exist(filePath);
        });
    });

    describe('clearCache()', function () {
        it('should throw an error if init is not called yet', function () {
            var fn = function () { pancakes.clearCache(); };
            fn.should.throw(Error);
        });

        it('should clear the cache for the injector and factories', function () {
            var opts = {
                servicesDir: 'services',
                rootDir: path.join(__dirname, '../fixtures')
            };

            pancakes.init(opts);
            pancakes.getService('blah');
            pancakes.clearCache();

            var injector = pancakes.getInjector();

            (injector.flapjackFactory).should.have.property('cache');
            (injector.flapjackFactory.cache).should.be.empty;
        });
    });

    describe('getService()', function () {
        it('should get the service for a given resource name', function () {
            var opts = {
                servicesDir: 'services',
                rootDir: path.join(__dirname, '../fixtures')
            };

            pancakes.init(opts);
            pancakes.getService('blah');

            var injector = pancakes.getInjector();
            var cache = injector.flapjackFactory.cache;

            injector.should.have.property('flapjackFactory');
            (injector.flapjackFactory).should.have.property('cache');
            (injector.flapjackFactory).should.have.property('injector');
            cache.should.have.property('services/resources/blah/blah.resource');
            cache.should.have.property('services/resources/blah/blah.backend.service');
        });

        it('should fix the resource name blah.js and get its service', function () {
            var opts = {
                servicesDir: 'services',
                rootDir: path.join(__dirname, '../fixtures')
            };

            pancakes.init(opts);
            pancakes.getService('blah.js');

            var injector = pancakes.getInjector();
            var cache = injector.flapjackFactory.cache;

            injector.should.have.property('flapjackFactory');
            (injector.flapjackFactory).should.have.property('cache');
            (injector.flapjackFactory).should.have.property('injector');
            cache.should.have.property('services/resources/blah/blah.resource');
            cache.should.have.property('services/resources/blah/blah.backend.service');
        });

        it('should fix the resource name blahService.js and get its service', function () {
            var opts = {
                servicesDir: 'services',
                rootDir: path.join(__dirname, '../fixtures')
            };

            pancakes.init(opts);
            pancakes.getService('blahService.js');

            var injector = pancakes.getInjector();
            var cache = injector.flapjackFactory.cache;

            injector.should.have.property('flapjackFactory');
            (injector.flapjackFactory).should.have.property('cache');
            (injector.flapjackFactory).should.have.property('injector');
            cache.should.have.property('services/resources/blah/blah.resource');
            cache.should.have.property('services/resources/blah/blah.backend.service');
        });
    });

    describe('destroy()', function () {
        it('should set the pancakes injector to null', function () {
            pancakes.init({});
            pancakes.destroy();
            var injector = pancakes.getInjector();
            taste.should.not.exist(injector);
        });
    });

    describe('getInjector()', function () {
        it('should return the injector', function () {
            pancakes.init({});
            var injector = pancakes.getInjector();

            taste.should.exist(injector);
            injector.should.have.property('rootDir');
            injector.should.have.property('require');
            injector.should.have.property('container');
            injector.should.have.property('servicesDir');
            injector.should.have.property('debug');
            injector.should.have.property('adapterMap');
            injector.should.have.property('aliases');
            injector.should.have.property('flapjackFactory');
            injector.should.have.property('factories');
        });
    });
});