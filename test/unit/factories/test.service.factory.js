/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var Q = require('q');
var taste = require('../../taste');
var name = 'factories/service.factory';
var factory = taste.target(name);

describe('Unit tests for ' + name, function () {
    
    describe('isCandidate()', function () {
        it('should return false if there is a slash', function () {
            var actual = factory.isCandidate('something/foo');
            actual.should.equal(false);
        });
        
        it('should return false if the name does not have Service', function () {
            var actual = factory.isCandidate('somethinyo');
            actual.should.equal(false);
        });
        
        it('should return true if there is no slash and the name contains Service', function () {
            var actual = factory.isCandidate('someService');
            actual.should.equal(true);
        });
    });
    
    describe('getServiceMethod()', function () {
        it('should return a function that returns the end of a promise chain', function (done) {
            var calls = [
                function (input) {
                    return new Q(input + '|one');
                },
                function (input) {
                    return new Q(input + '|two');
                }
            ];
            var serviceMethod = factory.getServiceMethod(calls);
            serviceMethod.should.be.a('function');

            var expected = 'start|one|two';
            var promise = serviceMethod('start');

            taste.all([
                promise.should.be.fulfilled,
                promise.should.eventually.equal(expected)
            ], done);
        });
    });
    
    describe('putItAllTogether()', function () {
        it('should throw an error if there are no methods', function () {
            var fn = function () {
                factory.putItAllTogether({}, { name: 'blah' }, {}, {}, {});
            };
            taste.expect(fn).to.throw(/Resource blah has no methods/);
        });
        
        it('should return an empty object if the adapter has no matching methods', function () {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] } };
            var adapter = {};
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, null, null);
            service.should.deep.equal({});
        });
        
        it('should return an object with all the matching adapter methods (no filters)', function (done) {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] } };
            var data = 'hello, world';
            var adapter = { one: function () { return { resource: resource, data: data }; } };
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, null, null);
            taste.should.exist(service, 'Service does not exist');
            taste.should.exist(service.one, 'Service does not have a method called one');
            service.one.should.be.a('function');

            var promise = service.one();
            taste.eventuallySame(promise, data, done);
        });

        it('should return an object with all the matching adapter methods (with filters)', function (done) {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] }, params: { one: { optional: ['data'] }} };
            var expected = 'start|something|another|adapter|lastOne';
            var filters = {
                beforeFilters: [
                    { name: 'applySomething', all: true },
                    { name: 'applyAnother', all: true }
                ],
                afterFilters: [
                    { name: 'lastOne', all: true }
                ],
                applySomething: function (req) {
                    req.data += '|something';
                    return new Q(req);
                },
                applyAnother: function (req) {
                    req.data += '|another';
                    return new Q(req);
                },
                lastOne: function (res) {
                    res.data += '|lastOne';
                    return new Q(res);
                }
            };
            var adapter = { one: function (req) {
                req.data += '|adapter';
                return new Q(req);
            }};
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, filters);
            taste.should.exist(service, 'Service does not exist');
            taste.should.exist(service.one, 'Service does not have a method called one');
            service.one.should.be.a('function');

            var promise = service.one({ data: 'start' });
            taste.eventuallySame(promise, expected, done);
        });
    });

    describe('getServiceInfo()', function () {
        it('should set adapter and service for blahService', function () {
            var serviceName = 'blahService';
            var adapterMap = { service: 'generic' };
            var expected = { adapterName: 'service', adapterImpl: 'generic', resourceName: 'blah' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for blahYoService', function () {
            var serviceName = 'blahYoService';
            var adapterMap = { service: 'generic' };
            var expected = { adapterName: 'service', adapterImpl: 'generic', resourceName: 'blah.yo' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for blahBackendService', function () {
            var serviceName = 'blahBackendService';
            var adapterMap = { backend: 'test' };
            var expected = { adapterName: 'backend', adapterImpl: 'test', resourceName: 'blah' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for blahAnotherBackendService', function () {
            var serviceName = 'blahAnotherBackendService';
            var adapterMap = { backend: 'test' };
            var expected = { adapterName: 'backend', adapterImpl: 'test', resourceName: 'blah.another' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });
    
    describe('getResource()', function () {
        it('should throw error if resource not found', function () {
            var fn = function () {
                factory.getResource({}, [], {});
            };
            taste.expect(fn).to.throw(/ServiceFactory could not find resource/);
        });

        it('should load the resource module if it is valid', function () {
            var serviceInfo = { resourceName: 'blah' };
            var injector = {
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                loadModule: taste.spy()
            };

            factory.getResource(serviceInfo, [], injector);
            injector.loadModule.should.have.been.calledWith('services/resources/blah/blah.resource');
        });
    });

    describe('checkForDefaultAdapter()', function () {
        it('should not do anything if no resource info', function () {
            var adapterName = 'blah';
            var adapterImpl = 'impl';
            var serviceInfo = { adapterName: adapterName, adapterImpl: adapterImpl };
            var resource = {};
            var adapterMap = {};
            var container = '';

            factory.checkForDefaultAdapter(serviceInfo, resource, adapterMap, container);
            serviceInfo.adapterName.should.equal(adapterName);
            serviceInfo.adapterImpl.should.equal(adapterImpl);
        });

        it('should change the adapter name if a service and default there', function () {
            var adapterName = 'service';
            var adapterImpl = 'impl';
            var expectedName = 'backend';
            var expectedImpl = 'test';
            var serviceInfo = { adapterName: adapterName, adapterImpl: adapterImpl };
            var resource = { adapters: { api: 'backend' } };
            var adapterMap = { backend: 'test' };
            var container = 'api';

            factory.checkForDefaultAdapter(serviceInfo, resource, adapterMap, container);
            serviceInfo.adapterName.should.equal(expectedName);
            serviceInfo.adapterImpl.should.equal(expectedImpl);
        });
    });

    describe('getAdapter()', function () {
        it('should throw an error if the file does not exist', function () {
            var fn = function () {
                factory.getAdapter({}, {}, [], {});
            };
            taste.expect(fn).to.throw(/ServiceFactory could not find adapter/);
        });

        it('should return a loaded simple adapter module', function () {
            var serviceInfo = {
                adapterName: 'backend',
                adapterImpl: 'test',
                resourceName: 'post'
            };
            var injector = {
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                loadModule: function (modulePath) {
                    if (modulePath.indexOf('test') >= 0) {
                        return function () { this.one = 'one'; this.two = 'two'; };
                    }
                    else {
                        return function () { this.two = 'override'; this.three = 'three'; };
                    }
                }
            };
            var expected = new function () { this.one = 'one'; this.two = 'two'; };
            var adapter = factory.getAdapter(serviceInfo, {}, [], injector);
            adapter.should.deep.equal(expected);
        });

        it('should return an adapter with an override', function () {
            var serviceInfo = {
                adapterName: 'repo',
                adapterImpl: 'solr',
                resourceName: 'blah'
            };
            var injector = {
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                loadModule: function (modulePath) {
                    if (modulePath.indexOf('solr') >= 0) {
                        return function () { this.one = 'one'; this.two = 'two'; };
                    }
                    else {
                        return function () { this.two = 'override'; this.three = 'three'; };
                    }
                }
            };
            var expected = new function () { this.two = 'override'; this.three = 'three' };
            var adapter = factory.getAdapter(serviceInfo, {}, [], injector);
            adapter.should.deep.equal(expected);
        });
    });

    describe('getFilters()', function () {
        it('should return empty object if no filters', function () {
            var injector = {
                loadModule: function () { return null; }
            };
            var expected = {};
            var actual = factory.getFilters({}, [], injector);
            actual.should.deep.equal(expected);
        });

        it('should load a couple fake filters and return them', function () {
            var serviceInfo = {
                adapterName: 'backend',
                resourceName: 'blah'
            };
            var data = { something: true };
            var injector = {
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                loadModule: function () {
                    return data;
                }
            };
            var actual = factory.getFilters(serviceInfo, [], injector);
            actual.should.deep.equal(data);
        });
    });

    describe('create', function () {
        it('should return an item from cache if it exists', function () {
            var serviceName = 'someService';
            var data = { something: true };
            factory.cache[serviceName] = data;
            var service = factory.create(serviceName, [], {});
            service.should.deep.equal(data);
        });

        it('should load the blahBackendService', function () {
            var serviceName = 'blahBackendService';
            var injector = {
                adapterMap: { backend: 'test' },
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                loadModule: function (name) {
                    if (name.indexOf('blah.resource') >= 0) {
                        return {
                            methods: { backend: ['one', 'two'] }
                        };
                    }
                    else {
                        return function () { this.blah = 123; };
                    }
                }
            };
            var expected = {};
            var actual = factory.create(serviceName, [], injector);
            actual.should.deep.equal(expected);
        });
    });
});

