/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var Q = require('q');
var sinon = require('sinon');
var chai = require('chai');
var sinonChai = require('sinon-chai');
var should = chai.should();
var expect = chai.expect;
var chaiAsPromised  = require("chai-as-promised");
var mochaAsPromised = require("mocha-as-promised");
var serviceFactory = require('../../lib/factories/service.factory');

mochaAsPromised();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Unit tests for service.factory', function () {
    describe('isCandidate()', function () {
        it('should return false if there is a slash', function() {
            var actual = serviceFactory.isCandidate('something/foo');
            expect(actual).to.be.false;
        });
        
        it('should return false if the name does not have Service', function() {
            var actual = serviceFactory.isCandidate('somethinyo');
            expect(actual).to.be.false;
        });
        
        it('should return true if there is no slash and the name contains Service', function() {
            var actual = serviceFactory.isCandidate('someService');
            expect(actual).to.be.true;
        });
    });
    
    describe('getServiceMethod()', function () {
        it('should return a function that returns the end of a promise chain', function(done) {
            var calls = [
                function (input) {
                    return new Q(input + '|one');
                },
                function (input) {
                    return new Q(input + '|two');
                }
            ];
            var serviceMethod = serviceFactory.getServiceMethod(calls);
            serviceMethod.should.be.a('function');

            var expected = 'start|one|two';
            var promise = serviceMethod('start');

            Q.all([
                promise.should.be.fulfilled,
                promise.should.eventually.equal(expected)
            ]).should.notify(done);
        });
    });
    
    describe('putItAllTogether()', function () {
        it('should throw an error if there are no methods', function() {
            var fn = function () {
                serviceFactory.putItAllTogether({ name: 'blah' }, {}, {}, {});
            };
            expect(fn).to.throw(/Resource blah has no methods/);
        });
        
        it('should return an empty object if the adapter has no matching methods', function() {
            var resource = { name: 'blah', methods: ['one', 'two'] };
            var adapter = {};
            var service = serviceFactory.putItAllTogether(resource, adapter, null, null);
            service.should.deep.equal({});
        });
        
        it('should return an object with all the matching adapter methods (no filters)', function(done) {
            var resource = { name: 'blah', methods: ['one', 'two'] };
            var data = 'hello, world';
            var adapter = { one: function () { return data; } };
            var service = serviceFactory.putItAllTogether(resource, adapter, null, null);
            expect(service).to.exist;
            expect(service.one).to.exist;
            service.one.should.be.a('function');

            var promise = service.one();

            Q.all([
                promise.should.be.fulfilled,
                promise.should.eventually.equal(data)
            ]).should.notify(done);
        });

        it('should return an object with all the matching adapter methods (with filters)', function(done) {
            var resource = { name: 'blah', methods: ['one', 'two'] };
            var expected = 'start|before|adapter|after';
            var filters = [{
                one_before: function (input) {
                    return new Q(input + '|before');
                },
                one_after: function (input) {
                    return new Q(input + '|after');
                }
            }];
            var adapter = { one: function (input) { return new Q(input + '|adapter'); } };
            var service = serviceFactory.putItAllTogether(resource, adapter, filters, filters);
            expect(service).to.exist;
            expect(service.one).to.exist;
            service.one.should.be.a('function');

            var promise = service.one('start');

            Q.all([
                promise.should.be.fulfilled,
                promise.should.eventually.equal(expected)
            ]).should.notify(done);
        });
    });

    describe('getServiceInfo()', function () {
        it('should set adapter and service for postService', function() {
            var serviceName = 'postService';
            var adapterMap = { service: 'generic' };
            var expected = { adapterName: 'service', adapterImpl: 'generic', resourceName: 'post' };
            var actual = serviceFactory.getServiceInfo(serviceName, adapterMap);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for postYoService', function() {
            var serviceName = 'postYoService';
            var adapterMap = { service: 'generic' };
            var expected = { adapterName: 'service', adapterImpl: 'generic', resourceName: 'post.yo' };
            var actual = serviceFactory.getServiceInfo(serviceName, adapterMap);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for postPersistService', function() {
            var serviceName = 'postPersistService';
            var adapterMap = { persist: 'test' };
            var expected = { adapterName: 'persist', adapterImpl: 'test', resourceName: 'post' };
            var actual = serviceFactory.getServiceInfo(serviceName, adapterMap);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for postAnotherPersistService', function() {
            var serviceName = 'postAnotherPersistService';
            var adapterMap = { persist: 'test' };
            var expected = { adapterName: 'persist', adapterImpl: 'test', resourceName: 'post.another' };
            var actual = serviceFactory.getServiceInfo(serviceName, adapterMap);
            expect(actual).to.exist;
            actual.should.deep.equal(expected);
        });
    });
    
    describe('getResource()', function () {
        it('should throw error if resource not found', function() {
            var serviceInfo = {};
            var injector = {};
            var fn = function () {
                serviceFactory.getResource(serviceInfo, injector);
            };
            expect(fn).to.throw(/ServiceFactory could not find resource/);
        });

        it('should load the resource module if it is valid', function() {
            var serviceInfo = { resourceName: 'post' };
            var injector = {
                rootDir: __dirname + '/../..',
                servicesDir: 'examples',
                loadModule: sinon.spy()
            };

            serviceFactory.getResource(serviceInfo, injector);
            injector.loadModule.should.have.been.calledWith('examples/resources/post/post.resource');
        });
    });

    describe('checkForDefaultAdapter()', function () {
        it('should not do anything if no resource info', function() {
            var adapterName = 'blah';
            var adapterImpl = 'impl';
            var serviceInfo = { adapterName: adapterName, adapterImpl: adapterImpl };
            var resource = {};
            var adapterMap = {};
            var container = '';

            serviceFactory.checkForDefaultAdapter(serviceInfo, resource, adapterMap, container);
            serviceInfo.adapterName.should.equal(adapterName);
            serviceInfo.adapterImpl.should.equal(adapterImpl);
        });

        it('should change the adapter name if a service and default there', function() {
            var adapterName = 'service';
            var adapterImpl = 'impl';
            var expectedName = 'persist';
            var expectedImpl = 'test';
            var serviceInfo = { adapterName: adapterName, adapterImpl: adapterImpl };
            var resource = { adapters: { api: 'persist' } };
            var adapterMap = { persist: 'test' };
            var container = 'api';

            serviceFactory.checkForDefaultAdapter(serviceInfo, resource, adapterMap, container);
            serviceInfo.adapterName.should.equal(expectedName);
            serviceInfo.adapterImpl.should.equal(expectedImpl);
        });
    });

    describe('getAdapter()', function () {
        it('should throw an error if the file does not exist', function() {
            var serviceInfo = {};
            var injector = {};
            var fn = function () {
                serviceFactory.getAdapter(serviceInfo, injector);
            };
            expect(fn).to.throw(/ServiceFactory could not find adapter/);
        });

        it('should return a loaded simple adapter module', function() {
            var serviceInfo = {
                adapterName: 'persist',
                adapterImpl: 'test',
                resourceName: 'post'
            };
            var injector = {
                rootDir: __dirname + '/../..',
                servicesDir: 'examples',
                loadModule: function (modulePath) {
                    if (modulePath.indexOf('test') >= 0) {
                        return { one: 'one', two: 'two' };
                    }
                    else {
                        return { two: 'override', three: 'three' }
                    }
                }
            };
            var expected = { one: 'one', two: 'two' };
            var adapter = serviceFactory.getAdapter(serviceInfo, injector);
            adapter.should.deep.equal(expected);
        });

        it('should return an adapter with an override', function() {
            var serviceInfo = {
                adapterName: 'search',
                adapterImpl: 'solr',
                resourceName: 'post'
            };
            var injector = {
                rootDir: __dirname + '/../..',
                servicesDir: 'examples',
                loadModule: function (modulePath) {
                    if (modulePath.indexOf('solr') >= 0) {
                        return { one: 'one', two: 'two' };
                    }
                    else {
                        return { two: 'override', three: 'three' }
                    }
                }
            };
            var expected = { one: 'one', two: 'override', three: 'three' };
            var adapter = serviceFactory.getAdapter(serviceInfo, injector);
            adapter.should.deep.equal(expected);
        });
    });

    describe('getFilters()', function () {
        it('should return empty array if no filters', function() {
            var expected = [];
            var actual = serviceFactory.getFilters(null, null);
            actual.should.deep.equal(expected);
        });
        
        it('should load a couple fake filters and return them', function() {
            var filterPaths = ['one', 'two'];
            var injector = {
                servicesDir: 'services',
                loadModule: function (path) {
                    return path;
                }
            };
            var expected = ['services/one', 'services/two'];
            var actual = serviceFactory.getFilters(filterPaths, injector);
            actual.should.deep.equal(expected);
        });
    });

    describe('create', function () {
        it('should return an item from cache if it exists', function() {
            var serviceName = 'someService';
            var data = { something: true };
            serviceFactory.cache[serviceName] = data;
            var service = serviceFactory.create(serviceName, [], {});
            service.should.deep.equal(data);
        });

        it('should load the postPersistService', function() {
            var serviceName = 'postPersistService';
            var injector = {
                adapterMap: { persist: 'test' },
                rootDir: __dirname + '/../..',
                servicesDir: 'examples',
                loadModule: function () {
                    return {
                        methods: ['one', 'two']
                    };
                }
            };
            var expected = {};
            var actual = serviceFactory.create(serviceName, [], injector);
            actual.should.deep.equal(expected);
        });
    });
});

