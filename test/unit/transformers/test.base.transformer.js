/**
 * Copyright 2014 GetHuman LLC
 * Author: Masaya Ando
 * Date Created: 6/11/2014
 *
 * Test runner for base.transformer.js
 */
var name                = 'transformers/base.transformer';
var taste               = require('taste');
var transformer         = taste.target(name);
var _                   = require('lodash');
var annotationHelper    = taste.target('annotation.helper');
var utensils            = taste.target('utensils');
var path                = require('path');

describe('Unit Test for ' + name, function () {
    var transformDir = path.join(__dirname, '../../fixtures/templates');
    describe('loadUIPart()', function () {
        it('should load a UI part with a parent', function () {
            var filePath = '/app/foo/pages/something.page.js';
            var commonPath = '/app/common/pages/something.page.js';
            var obj = {parent: 'other', foo: 'choo', two: 'moo', three: 'me'};
            var pancakes = {
                requireModule: function (moduleName) {
                    if (moduleName === commonPath) {
                        return {
                            parent: 'other',
                            foo: 'choo',
                            two: 'moo'
                        };
                    }
                    else {
                        return {
                            'abstract': true,
                            two: 'loo',
                            three: 'me'
                        };
                    }
                },
                getRootDir: function () {
                    return '';
                },
                cook: function () {
                    return obj;
                }
            };
            var context = {pancakes: pancakes};
            var expected = obj;
            var actual = transformer.loadUIPart.call(context, 'foo', filePath);
            actual.should.deep.equal(expected);
        });
    });

    describe('getAppName()', function () {
        it('should extract an app name from a path', function () {
            var filePath = '/blah/app/foo/pages/something.page.js';
            var expected = 'foo';
            var actual = transformer.getAppName(filePath);
            actual.should.equal(expected);
        });
    });

    describe('getAppModuleName()', function () {
        it('should get an app module name', function () {
            var prefix = 'gh';
            var appName = 'foo';
            var context = {getCamelCase: utensils.getCamelCase};
            var expected = 'ghFooApp';
            var actual = transformer.getAppModuleName.call(context, prefix, appName);
            actual.should.equal(expected);
        });
    });

    describe('setTemplate()', function () {
        it('should set a dot template', function () {
            var context = {};
            transformer.setTemplate.call(context, transformDir, 'test.params');
            taste.should.exist(context.template);
        });
    });

    describe('getParamInfo()', function () {
        it('should convert a list of params and return an object with converted values', function () {
            var params = ['foo', 'bar', 'boo', 'donut'];
            var alias = {
                donut: 'munchkins'
            };

            var expected = {
                converted: ['foo', 'bar', 'boo', 'munchkins'],
                list: ['foo', 'bar', 'boo', 'donut'],
                ngrefs: []
            };

            var actual = transformer.getParamInfo(params, alias);
            actual.should.deep.equal(expected);
        });
    });

    describe('getFilteredParamInfo()', function () {
        it('should return param info', function () {
            var flapjack = function (one, three, four, $scope) {
                // @module({ "client": { "one": "two" } })

                $scope.blah = one + three + four;
            };
            var context = _.extend({getParamInfo: transformer.getParamInfo}, annotationHelper);
            var expected = {
                converted: ['two', 'three', 'four'],
                list: ['one', 'three', 'four'],
                ngrefs: []
            };
            var actual = transformer.getFilteredParamInfo.call(context, flapjack, null);
            taste.should.exist(actual);
            actual.should.deep.equal(expected);
        });
    });

    describe('getModuleBody()', function () {
        it('should return the entire string if it cant find a opening/closing curly in the string', function () {
            var flapjack = 'FooBarBooRamenMunchkinDonutWorldCup';
            var expected = 'FooBarBooRamenMunchkinDonutWorldCup';
            var actual = transformer.getModuleBody(flapjack);
            actual.should.equal(expected);
        });

        it('should extract everything inside the curly brackets of a module without function declaration', function () {
            var flapjack = 'Everything inside of the curly brackets {GetHuman is frickin awesome} will be extracted';
            var expected = 'GetHuman is frickin awesome';
            var actual = transformer.getModuleBody(flapjack);
            actual.should.equal(expected);
        });

        it('should replace new line character with a new line + tab character', function () {
            var flapjack = 'function getHuman() {\nvar latePenalty = munchkin(25 Count)}';
            var expected = '\n\tvar latePenalty = munchkin(25 Count)';
            var actual = transformer.getModuleBody(flapjack);
            actual.should.equal(expected);
        });
    });
});