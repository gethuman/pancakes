/**
 * Author: Jeff Whelpley
 * Date: 2/18/14
 *
 * Unit tests for the client.generator
 */
var taste = require('taste');
var name = 'factories/model.factory';
var Factory = taste.target(name);
var fixturesDir = __dirname + '/../../fixtures';

describe('Unit tests for ' + name, function () {
    var injector = {
        rootDir: fixturesDir,
        servicesDir: 'services',
        loadModule: function () { return 'hello, world'; }
    };

    describe('Constructor and getResources()', function () {
        it('should return an empty object if the services dir is invalid', function () {
            injector = { rootDir: 'blah', servicesDir: 'foo' };
            var expected = {};
            var factory = new Factory(injector);
            factory.resources.should.deep.equal(expected);
        });

        it('should load all the resources in the fixtures', function () {
            injector = {
                rootDir: fixturesDir,
                servicesDir: 'services',
                loadModule: function () { return 'hello, world'; }
            };

            var factory = new Factory(injector);
            taste.should.exist(factory, 'ModelFactory does not exist');
            taste.should.exist(factory.resourceNames, 'ModelFactory resources do not exist');
            factory.resourceNames.should.be.an('Object');
            Object.keys(factory.resourceNames).length.should.equal(3);
        });
    });

    describe('isCandidate()', function () {
        it('should return false if no model', function () {
            var factory = new Factory(injector);
            taste.expect(factory.isCandidate('Nono')).to.be.false;
        });

        it('should return true if model', function () {
            var factory = new Factory(injector);
            taste.expect(factory.isCandidate('Blah')).to.be.true;
        });
    });

    describe('getModel()', function () {
        it('should return model instance with save and remove', function () {
            var service = {
                create: function () { return 'create'; },
                update: function () { return 'update'; },
                remove: function () { return 'remove'; }
            };
            var factory = new Factory(injector);
            var Model = factory.getModel(service, {});
            var model = new Model({ something: true });
            taste.should.exist(model.save);
            model.save().should.equal('create');
            model._id = '123';
            model.save().should.equal('update');
            taste.should.exist(model.remove);
            model.remove().should.equal('remove');
        });
    });

    describe('create()', function () {
        it('should return null if an invalid resource', function () {
            var factory = new Factory(injector);
            taste.expect(factory.create('Nono')).to.be.null;
        });

        it('should return an item from cache', function () {
            var factory = new Factory(injector);
            var data = { hello: 'world' };
            var name = 'SomeName';
            factory.cache[name] = data;
            var actual = factory.create(name);
            actual.should.deep.equal(data);
        });

        it('should get class that has service functions', function () {
            injector = {
                rootDir: fixturesDir,
                servicesDir: 'services',
                loadModule: function (path) {
                    if (path === 'blahService') {
                        return {
                            create: function (val) { return val; },
                            update: function (val) { return val; }
                        };
                    }
                    else {
                        return {
                            mixins: {
                                something: function (val) { return this.title + val; }
                            }
                        };
                    }
                }
            };

            var factory = new Factory(injector);
            var Model = factory.create('Blah');
            taste.should.exist(Model, 'Model does not exist');
            taste.should.exist(Model.create, 'Model create does not exist');
            taste.should.exist(Model.update, 'Model update does not exist');

            Model.create.should.be.a('Function');
            Model.update.should.be.a('Function');

            var data = { anewthing: 'yes' };
            var actual = Model.create(data);
            actual.should.deep.equal(data);
        });

        it('should take data and use a mixin when newing it up', function () {
            injector = {
                rootDir: fixturesDir,
                servicesDir: 'services',
                loadModule: function (path) {
                    if (path === 'blahService') {
                        return {
                            create: function (val) { return val; },
                            update: function (val) { return val; }
                        };
                    }
                    else {
                        return {
                            mixins: {
                                something: function (val) { return this.title + val; }
                            }
                        };
                    }
                }
            };

            var factory = new Factory(injector);
            var Model = factory.create('Blah');
            var model = new Model({ title: 'yo', details: 'word' });
            taste.should.exist(model, 'Model instance does not exist');
            taste.should.exist(model.title, 'Model title does not exist');
            taste.should.exist(model.details, 'Model detilas does not exist');
            taste.should.exist(model.something, 'Model somethings mixin does not exist');
            model.title.should.equal('yo');

            var expected = 'yomom';
            var actual = model.something('mom');
            actual.should.equal(expected);
        });
    });
});