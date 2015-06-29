/**
 *
 * Copyright 2014 GetHuman LLC
 * Author: Masaya Ando
 * Date: 6/12/2014
 *
 * Description: Test cases for internal.object.factory.js
 *
 */
var name = 'factories/internal.object.factory';
var taste = require('taste');
var path = require('path');
var InternalObjectFactory = taste.target(name);
var DependencyInjector = require('../../../lib/dependency.injector');
var fixturesDir = path.join(__dirname, '../../fixtures');

describe('Unit tests for ' + name, function () {

    describe('InternalObjectFactory() - Constructor', function () {
        it('should construct a InternalObjectFactory with a given injector', function () {
            var injector = {foo: 'bar', world: 'cup'};
            var iof = new InternalObjectFactory(injector);

            iof.should.exist;
            iof.should.have.deep.property('injector.foo', 'bar');
            iof.should.have.deep.property('injector.world', 'cup');
            iof.should.have.deep.property('internalObjects.resources', true);
            iof.should.have.deep.property('internalObjects.reactors', true);
            iof.should.have.deep.property('internalObjects.adapters', true);
        });
    });

    describe('loadResources()', function () {
        it('should return an empty object if the resource directory does not exist', function () {
            var injector = {
                rootDir: path.join(__dirname, 'blah/blah/blah'),
                serviceDir: 'foobar'
            };
            var iof = new InternalObjectFactory(injector);

            (iof.loadResources()).should.be.empty;
        });

        it('should load all resources into an object that can be injected', function () {
            var opts = {
                rootDir: fixturesDir,
                servicesDir: 'services'
            };
            var expected = {
                blah: {
                    name: 'blah',
                    methods: {
                        backend: ['create', 'update', 'remove', 'find'],
                        repo: ['create', 'update', 'remove', 'find']
                    },
                    adapters: {api: 'backend', webserver: 'repo', batch: 'backend'},
                    params: {create: {optional: ['data']}}
                },
                foo: {},
                man: {}
            };

            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);
            var actual = iof.loadResources();

            iof.should.exist;
            actual.should.deep.equal(expected);
        });
    });

    describe('loadAdapters()', function () {
        it('should return an empty object if the adapter directory does not exist', function () {
            var injector = {
                rootDir: path.join(__dirname, 'chris/jeff/adam'),
                servicesDir: 'services'

            };
            var iof = new InternalObjectFactory(injector);

            (iof.loadAdapters()).should.be.empty;
        });

        it('should load all adapters into an object that can be injected', function () {
            var opts = {
                rootDir: fixturesDir,
                servicesDir: 'services',
                adapterMap: {backend: 'test', repo: 'solr'}
            };

            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);
            var actual = iof.loadAdapters();

            iof.should.exist;
            (actual.TestBackendAdapter).should.be.an.instanceof(Function);
            (actual.SolrRepoAdapter).should.be.empty;

        });
    });

    describe('loadReactors()', function () {
        it('should return an empty object if the reactor directory does not exist', function () {
            var injector = {
                rootDir: path.join(__dirname, 'supercalafragalisticexpialadoshus')
            };
            var iof = new InternalObjectFactory(injector);

            iof.should.exist;
            (iof.loadReactors()).should.be.empty;
        });

        it('should load all reactors into an object that can be injected', function () {
            var opts = {
                rootDir: fixturesDir,
                servicesDir: 'services'
            };

            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);

            var actual = iof.loadReactors();

            iof.should.exist;
            actual.should.be.an.Object;
            actual.should.contain.keys('ramen');
            (actual.ramen).should.be.an.instanceof(Function);
        });
    });


    describe('loadAppConfigs()', function () {
        it('should return an empty object if the app config directory does not exist', function () {
            var injector = {
                rootDir: path.join(__dirname, 'supercalafragalisticexpialadoshus')
            };
            var iof = new InternalObjectFactory(injector);

            iof.should.exist;
            (iof.loadAppConfigs()).should.be.empty;
        });

        it('should load all app configs into an object that can be injected', function () {
            var opts = {
                rootDir: fixturesDir,
                servicesDir: 'services'
            };

            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);

            var actual = iof.loadAppConfigs();

            iof.should.exist;
            actual.should.be.an.Object;
            actual.should.contain.keys('testapp');
            (actual.testapp).should.be.an('Object');
        });
    });

    describe('isCandidate()', function () {
        it('should return the boolean value of an object if there is a match in internalObjects', function () {
            var iof = new InternalObjectFactory();
            (iof.isCandidate('resources')).should.be.true;
        });
    });

    describe('clearCache()', function () {
        it('should not do anything but to fulfill the interface requirement', function () {
            var iof = new InternalObjectFactory();
            taste.should.not.exist(iof.clearCache());
        });
    });

    describe('create()', function () {
        it('should return undefined if the objectName is not found in the internalObjects', function () {
            var opts = {rootDir: 'somewhere'};
            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);
            var actual = iof.create('blahblahblah');

            taste.should.not.exist(actual);
        });

        it('should load the resources captured inside the injector', function () {
            var opts = {
                rootDir: fixturesDir,
                serviceDir: 'services'
            };
            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);

            var expected = {
                blah: {
                    name: 'blah',
                    methods: {
                        backend: ['create', 'update', 'remove', 'find'],
                        repo: ['create', 'update', 'remove', 'find']
                    },
                    adapters: {api: 'backend', webserver: 'repo', batch: 'backend'},
                    params: {create: {optional: ['data']}}
                },
                foo: {},
                man: {}
            };

            var actual = iof.create('resources');
            actual.should.deep.equal(expected);
        });

        it('should load the reactors captured inside the injector', function () {
            var opts = {
                rootDir: fixturesDir,
                serviceDir: 'services',
                adapterMap: {backend: 'test', repo: 'solr'}
            };
            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);

            var actual = iof.create('reactors');

            iof.should.exist;
            actual.should.be.an.Object;
            actual.should.contain.keys('ramen');
            (actual.ramen).should.be.an.instanceof(Function);
        });

        it('should load the adapters captured inside the injector', function () {
            var opts = {
                rootDir: fixturesDir,
                serviceDir: 'services',
                adapterMap: {backend: 'test', repo: 'solr'}
            };

            var injector = new DependencyInjector(opts);
            var iof = new InternalObjectFactory(injector);

            var actual = iof.create('adapters');

            iof.should.exist;
            (actual.TestBackendAdapter).should.be.an.instanceof(Function);
            taste.should.not.exist(actual.SolrRep);
        });
    });
});
