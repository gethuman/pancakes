/**
 * Author: Jeff Whelpley
 * Date: 2/20/14
 *
 * Unit tests for the service factory
 */
var Q       = require('q');
var taste   = require('../../taste');
var name    = 'factories/service.factory';
var Factory = taste.target(name);
var bus     = taste.target('event.bus');

describe('Unit tests for ' + name, function () {

    describe('parseIfJson()', function () {
        it('should return back a normal string', function () {
            var data = 'something';
            var factory = new Factory({});
            var actual = factory.parseIfJson(data);
            actual.should.equal(data);
        });

        it('should return back a normal object', function () {
            var data = { some: 'obj' };
            var factory = new Factory({});
            var actual = factory.parseIfJson(data);
            actual.should.deep.equal(data);
        });

        it('should parse JSON in a string to an object', function () {
            var input = '{ "some": "thing" } ';
            var expected = { some: 'thing' };
            var factory = new Factory({});
            var actual = factory.parseIfJson(input);
            actual.should.deep.equal(expected);
        });
    });

    describe('validateRequestParams()', function () {
        it('should return an empty object if no params sent in', function (done) {
            var method = 'test';
            var resource = { test: true };
            var factory = new Factory({});
            var promise = factory.validateRequestParams(null, resource, method);
            taste.eventuallySame(promise, undefined, done);
        });

        it('should be rejected if missing a required param', function () {
            var method = 'create';
            var resource = { params: { create: { required: ['zzz'] }}};
            var factory = new Factory({});
            var req = { data: 'blah' };
            var promise = factory.validateRequestParams(req, resource, method);
            promise.should.be.rejected;
        });

        it('should be rejected if has a value in the request that is not valid', function () {
            var method = 'create';
            var resource = {};
            var factory = new Factory({});
            var req = { data: 'blah' };
            var promise = factory.validateRequestParams(req, resource, method);
            promise.should.be.rejected;
        });

        it('should return back data if all valid', function (done) {
            var method = 'create';
            var resource = { params: { create: { required: ['data'], optional: ['some'] }}};
            var factory = new Factory({});
            var req = { data: 'blah', some: 'another' };
            var promise = factory.validateRequestParams(req, resource, method);
            taste.eventuallySame(promise, undefined, done);
        });
    });

    describe('emit()', function () {
        var oldLog;

        before(function () {
            oldLog = console.log;
            console.log = function () {};
        });

        after(function () {
            console.log = oldLog;
        });

        afterEach(function () {
            bus.removeAllListeners();
        });

        it('should add an event for the event base', function (done) {
            var eventNameBase = { resource: 'src', adapter: 'adptr', method: 'meth' };
            var factory = new Factory({});
            var req = { hello: 'world' };
            var expected = { hello: 'world' };

            bus.on('src.adptr.meth', function (eventData) {
                taste.should.exist(eventData);
                eventData.payload.should.deep.equal(expected);
                done();
            });

            factory.emit(req, eventNameBase, null);
        });

        it('should add an event for debug params', function (done) {
            var eventNameBase = { resource: 'src', adapter: 'adptr', method: 'meth' };
            var debugParams = { type: 'blah', timing: 'after' };
            var factory = new Factory({ debug: true });
            var req = { hello: 'world' };
            var expected = { hello: 'world' };

            bus.on('src.adptr.meth.blah.after', function (eventData) {
                taste.should.exist(eventData);
                eventData.payload.should.deep.equal(expected);
                done();
            });

            factory.emit(req, eventNameBase, debugParams);
        });
    });

    describe('putItAllTogether()', function () {
        var factory = new Factory({});

        afterEach(function () {
            bus.removeAllListeners();
        });

        it('should return an object with all the matching adapter methods', function (done) {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] } };
            var data = 'hello, world';
            var adapter = { one: function () { return new Q(data); } };
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, {});
            taste.should.exist(service, 'Service does not exist');
            taste.should.exist(service.one, 'Service does not have a method called one');
            service.one.should.be.a('function');

            var promise = service.one();
            taste.eventuallySame(promise, data, done);
        });

        it('should emit an event once the adapter method returns', function (done) {
            var serviceInfo = { resourceName: 'blah', adapterName: 'somethin' };
            var resource = {
                name: 'blah',
                methods: { somethin: ['one', 'two'] },
                params: { one: { required: ['data'] } }
            };
            var data = 'hello, world';
            var inputData = { data: { someparam: 'one' } };
            var adapter = { one: function () { return new Q(data); } };
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, {});
            taste.should.exist(service, 'Service does not exist');
            taste.should.exist(service.one, 'Service does not have a method called one');
            service.one.should.be.a('function');

            bus.on('blah.somethin.one', function (eventData) {
                eventData.payload.should.deep.equal({ inputData: inputData.data, data: data });
                done();
            });

            service.one(inputData);
        });
    });

    describe('loadIfExists()', function () {
        it('should throw an error if does not exist and error passed in', function () {
            var factory = new Factory({});
            var fn = function () {
                factory.loadIfExists('blah/asdf/asdfs', {}, 'some err msg here');
            };
            taste.expect(fn).to.throw(/some err msg here/);
        });

        it('should return null if not exist and no error passed in', function () {
            var factory = new Factory();
            var actual = factory.loadIfExists('blah/asdf/asdfs', {}, null);
            taste.expect(actual).to.be.null;
        });

        it('should load the module if it exists', function () {
            var data = { some: 'data' };
            var injector = {
                servicesDir: 'services',
                rootDir: __dirname + '/../../fixtures',
                loadModule: function () { return data; }
            };
            var factory = new Factory(injector);
            var actual = factory.loadIfExists('/resources/blah/blah.repo.service', {}, null);
            actual.should.deep.equal(data);
        });
    });

    describe('getAdapter()', function () {
        it('should throw an error if the file does not exist', function () {
            var factory = new Factory({});
            var fn = function () {
                factory.getAdapter({}, {}, []);
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
            var Something = function () { this.one = 'one'; this.two = 'two'; };
            var expected = new Something();
            var factory = new Factory(injector);
            var adapter = factory.getAdapter(serviceInfo, { methods: {} }, []);
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
            var Something = function () { this.two = 'override'; this.three = 'three'; };
            var expected = new Something();
            var factory = new Factory(injector);
            var adapter = factory.getAdapter(serviceInfo, { methods: {} }, []);
            adapter.should.deep.equal(expected);
        });
    });

    describe('getResource()', function () {
        it('should throw error if resource not found', function () {
            var factory = new Factory({});
            var fn = function () {
                factory.getResource({}, []);
            };
            taste.expect(fn).to.throw(/Could not find resource file/);
        });

        it('should load the resource module if it is valid', function () {
            var serviceInfo = { resourceName: 'blah' };
            var injector = {
                rootDir: taste.fixturesDir,
                servicesDir: 'services',
                loadModule: taste.spy()
            };

            var factory = new Factory(injector);
            factory.getResource(serviceInfo, []);
            injector.loadModule.should.have.been.calledWith('services/resources/blah/blah.resource');
        });
    });

    describe('getServiceInfo()', function () {
        var factory = new Factory({});

        it('should set adapter and service for blahService', function () {
            var serviceName = 'blahService';
            var adapterMap = { service: 'generic' };
            var expected = { serviceName: 'blahService', adapterName: 'service', adapterImpl: 'generic', resourceName: 'blah' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for blahYoService', function () {
            var serviceName = 'blahYoService';
            var adapterMap = { service: 'generic' };
            var expected = { serviceName: 'blahYoService', adapterName: 'service', adapterImpl: 'generic', resourceName: 'blah.yo' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for blahBackendService', function () {
            var serviceName = 'blahBackendService';
            var adapterMap = { backend: 'test' };
            var expected = { serviceName: 'blahBackendService', adapterName: 'backend', adapterImpl: 'test', resourceName: 'blah' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });

        it('should set adapter and service for blahAnotherBackendService', function () {
            var serviceName = 'blahAnotherBackendService';
            var adapterMap = { backend: 'test' };
            var expected = { serviceName: 'blahAnotherBackendService', adapterName: 'backend', adapterImpl: 'test', resourceName: 'blah.another' };
            var actual = factory.getServiceInfo(serviceName, adapterMap);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('create', function () {
        it('should return an item from cache if it exists', function () {
            var serviceName = 'someService';
            var data = { something: true };
            var factory = new Factory({});
            factory.cache[serviceName] = data;
            var service = factory.create(serviceName, []);
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
            var expected = { blah: 123 };
            var factory = new Factory(injector);
            var actual = factory.create(serviceName, []);
            actual.should.deep.equal(expected);
        });
    });

    describe('isCandidate()', function () {
        var factory = new Factory({});

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
});

