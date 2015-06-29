/**
 * Author: Jeff Whelpley
 * Date: 10/22/14
 *
 *
 */
var taste   = require('taste');
var name    = 'api.route.handler';
var handler = taste.target(name);

describe('Unit tests for ' + name, function () {
    var config = {
        ichi: 1,
        uno: '1',
        one: {
            ni: 2,
            dos: '2',
            two: {
                san: 3,
                tres: '3',
                three: {
                    nothing: undefined,
                    yon: ['coffee', 'cigarette'],
                    quatro: ['manzana', 'naranja', 'uvas'],
                    four: ['apples', 'oranges', 'grapes'],
                    before: ['before1', 'before2'],
                    after: ['after1']
                }
            }
        },
        all: {
            foo: {
                before: 'doo',
                after: 'goo'
            },
            jar: {
                before: 'har',
                after: 'kar'
            },
            ram: {
                before: 'eram',
                after: 'tam'
            }
        }
    };

    describe('traverseFilters()', function () {
        it('should return null if config is not passed in', function () {
            var levels = ['one', 'two', 'three', 'four'];
            var actual = handler.traverseFilters(undefined, levels, 0);
            taste.should.not.exist(actual);
        });

        it('should return null if levelIdx is greater than lastIdx', function () {
            var levelIdx = 4;
            var levels = ['one', 'two', 'three', 'four'];
            var actual = handler.traverseFilters(config, levels, levelIdx);
            taste.should.not.exist(actual);
        });

        it('should traverse the filter config and return all the filters (case 1)', function () {
            var levelIdx = 0;
            var levels = ['one', 'two', 'three', 'four'];
            var expected = ['apples', 'oranges', 'grapes'];
            var actual = handler.traverseFilters(config, levels, levelIdx);

            actual.should.deep.equal(expected);
        });

        it('should traverse the filter config and return all the filters (case 2)', function () {
            var levelIdx = 0;
            var levels = ['one', 'two', 'three', 'quatro'];
            var expected = ['manzana', 'naranja', 'uvas'];
            var actual = handler.traverseFilters(config, levels, levelIdx);
            actual.should.deep.equal(expected);
        });
    });

    describe('getFilters()', function () {
        it('should load filters from a mocked filter config', function () {
            var obj = { panmod: true };
            var injector = {
                loadModule: function (moduleName) {
                    if (moduleName === 'filterConfig') { return config; }
                    else { return obj; }
                }
            };
            handler.init({ injector: injector });

            var expected = { before: [obj, obj], after: [obj] };
            var actual = handler.getFilters('one', 'two', 'three');
            actual.should.deep.equal(expected);
        });
    });

    describe('processApiCall()', function () {
        it('should process an API call', function (done) {
            var obj = { blah: 'booyeah' };
            var injector = {
                loadModule: function () {
                    return {
                        operation1: function () {
                            return obj;
                        }
                    };
                }
            };
            handler.init({ injector: injector });

            var resource = {
                name: 'test',
                adapters: { api: 'persist' }
            };
            var operation = 'operation1';
            var requestParams = {};

            handler.processApiCall(resource, operation, requestParams)
                .then(function (res) {
                    taste.should.exist(res);
                    res.data.should.deep.equal(obj);
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
    });
});