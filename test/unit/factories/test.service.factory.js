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
            var factory = new Factory({});
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
    
    describe('addEventEmitter()', function () {
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
            var calls = [];
            var eventNameBase = { resource: 'src', adapter: 'adptr', method: 'meth' };
            var factory = new Factory({});
            factory.addEventEmitter(calls, eventNameBase, null);

            var data = { hello: 'world' };
            var expected = { data: data, resource: 'srcResource' };
            bus.on('src.adptr.meth', function (eventData) {
                taste.should.exist(eventData);
                eventData.payload.should.deep.equal(expected);
                done();
            });

            calls[0]({ data: data });
        });

        it('should add an event for debug params', function (done) {
            var calls = [];
            var eventNameBase = { resource: 'src', adapter: 'adptr', method: 'meth' };
            var debugParams = { type: 'blah', timing: 'after' };
            var factory = new Factory({ debug: true });
            factory.addEventEmitter(calls, eventNameBase, debugParams);

            var data = { hello: 'world' };
            var expected = { data: data, resource: 'srcResource' };
            bus.on('src.adptr.meth.blah.after', function (eventData) {
                taste.should.exist(eventData);
                eventData.payload.should.deep.equal(expected);
                done();
            });

            calls[0]({ data: data });
        });
    });

    describe('createFilters()', function () {
        it('should load a set of filters', function () {
            var factory = new Factory({
                servicesDir: 'services',
                loadModule: function () {
                    return function (req) { return new Q(req); };
                }
            });
            var filters = factory.createFilters(['filter1', 'filter2', 'filter3']);

            taste.should.exist(filters);
            filters.should.have.property('filter1').that.is.a('function');
        });
    });

    describe('getFilters()', function () {
        it('should use the property filters if they exist', function () {
            var factory = new Factory({});
            factory.createFilters = taste.spy();

            var adapter = {
                beforeFilters: { foo: ['one', 'two', 'three'] },
                prependBeforeFilters: { foo: ['zero' ]},
                appendBeforeFilters: { foo: ['four' ]}
            };
            var method = 'foo';
            factory.getFilters(adapter, method, null);
            factory.createFilters.should.have.been.calledWith(['zero', 'one', 'two', 'three', 'four']);
        });

        it('should use the method annotations', function () {
            var factory = new Factory({});
            factory.createFilters = taste.spy();

            var adapter = {
                prependBeforeFilters: { foo: ['zero' ]},
                appendBeforeFilters: { foo: ['four' ]},
                foo: function () {
                    // @beforeFilters(["two", "three"])
                }
            };
            var method = 'foo';
            factory.getFilters(adapter, method, null);
            factory.createFilters.should.have.been.calledWith(['zero', 'two', 'three', 'four']);
        });
    });

    describe('putItAllTogether()', function () {
        var factory = new Factory({});

        it('should throw an error if there are no methods', function () {
            var fn = function () {
                factory.putItAllTogether({}, { name: 'blah' }, {}, {});
            };
            taste.expect(fn).to.throw(/Resource blah has no methods/);
        });
        
        it('should return an empty object if the adapter has no matching methods', function () {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] } };
            var adapter = {};
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, {});
            service.should.deep.equal({});
        });
        
        it('should return an object with all the matching adapter methods (no filters)', function (done) {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] } };
            var data = 'hello, world';
            var adapter = { one: function () { return { resource: resource, data: data }; } };
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, {});
            taste.should.exist(service, 'Service does not exist');
            taste.should.exist(service.one, 'Service does not have a method called one');
            service.one.should.be.a('function');

            var promise = service.one();
            taste.eventuallySame(promise, { resource: resource, data: data }, done);
        });

        it('should return an object with all the matching adapter methods (with filters)', function (done) {
            var serviceInfo = { adapterName: 'somethin' };
            var resource = { name: 'blah', methods: { somethin: ['one', 'two'] }, params: { one: { optional: ['data'] }} };
            var expected = {
                resource: resource,
                inputData: 'start',
                method: 'one',
                data: 'start|something|another|adapter|lastOne'
            };

            factory.filterCache = {
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

            var adapter = {
                beforeFilters: { all: ['applySomething', 'applyAnother'] },
                afterFilters: { all: ['lastOne'] },
                one: function (req) {
                    req.data += '|adapter';
                    return new Q(req);
                }
            };
            var service = factory.putItAllTogether(serviceInfo, resource, adapter, null);
            taste.should.exist(service, 'Service does not exist');
            taste.should.exist(service.one, 'Service does not have a method called one');
            service.one.should.be.a('function');

            var promise = service.one({ data: 'start' });
            taste.eventuallySame(promise, expected, done);
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
});

