/**
 * unit test for module.plugin.factory
 */
var name    = 'factories/module.plugin.factory';
var taste   = require('taste');
var Factory = taste.target(name);
var path    = require('path');
var fixturesDir = path.join(__dirname, '../../fixtures');

describe('unit ' + name, function () {
    describe('loadModules()', function () {
        it('should return an object with util modules', function () {
            var factory = new Factory({});
            var actual = factory.loadModules(fixturesDir, ['utils']);
            actual.fixtureutil1.should.be.a('Function');
            actual.fixtureutil2.should.be.a('Function');
            actual.fixtureutil1fromplugin.should.be.a('Function');
            actual.fixtureutil2fromplugin.should.be.a('Function');
        });
    });

    describe('loadModulePlugins()', function () {
        it('should load modules from plugins', function () {
            var modulePlugins = [{
                rootDir: fixturesDir,
                serverModuleDirs: ['utils']
            }];
            var factory = new Factory({});
            var actual = factory.loadModulePlugins(modulePlugins);
            actual.fixtureutil1.should.be.a('Function');
            actual.fixtureutil2.should.be.a('Function');
            actual.fixtureutil1fromplugin.should.be.a('Function');
            actual.fixtureutil2fromplugin.should.be.a('Function');
        });
    });

    describe('isCandidate()', function () {
        it('should find a FromPlugin module', function () {
            var modulePlugins = [{
                rootDir: fixturesDir,
                serverModuleDirs: ['utils']
            }];
            var modulePath = 'fixtureUtil1FromPlugin';
            var factory = new Factory({}, modulePlugins);
            var expected = true;
            var actual = factory.isCandidate(modulePath);
            actual.should.equal(expected);
        });
    });

    describe('clearCache()', function () {
        it('should clear the cache without error', function () {
            var factory = new Factory({});
            factory.clearCache();
        });
    });

    describe('create', function () {
        it('it should create a pancakes module from a plugin', function () {
            var injector = {
                injectFlapjack: taste.spy()
            };
            var modulePlugins = [{
                rootDir: fixturesDir,
                serverModuleDirs: ['utils']
            }];
            var modulePath = 'fixtureUtil1FromPlugin';
            var factory = new Factory(injector, modulePlugins);
            factory.create(modulePath);
            injector.injectFlapjack.should.have.callCount(1);
        });
    });
});