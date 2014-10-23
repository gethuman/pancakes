/**
 * Copyright 2014 GetHuman LLC
 * Author: Masaya Ando
 * Date Created: 6/11/2014
 *
 * Test runner for base.transformer.js
 */

var name = 'base.transformer';
var taste = require('../taste');
var BaseTransformer = taste.target(name);

describe('Unit Test for ' + name, function () {
	var transformDir = __dirname + '/../fixtures/templates';

	describe('BaseTransformer() - Constructor', function () {
		it('should construct a null template', function () {
			var bt = new BaseTransformer(null);
			taste.should.exist(bt);
			bt.should.have.deep.property('template', null);
		});

		it('should construct a template for a given transformer', function () {
			var templateName = 'test.params';
			var bt = new BaseTransformer(null, transformDir, templateName);

			taste.should.exist(bt);
			bt.should.not.equal(null);
			bt.should.have.property('template');
			bt.template.should.be.an.instanceof(Function);
		});

		it('should constructa tempalte for a given transformer (using different tempalte from previous case)', function () {
			var templateName = 'test.simple';
			var bt = new BaseTransformer(null, transformDir, templateName);

			taste.should.exist(bt);
			bt.should.not.equal(null);
			bt.should.have.property('template');
			bt.template.should.be.an.instanceof(Function);
		});
	});

	describe('loadUIPart()', function () {
	    it('should load a UI part with a parent', function () {
	        var filePath = '/app/foo/pages/something.page.js';
			var commonPath = '/app/common/pages/something.page.js';
			var pancakes = {
				requireModule: function (name) {
					if (name === commonPath) {
						return {
							parent: 'other',
							foo: 'choo',
							two: 'moo'
						};
					}
					else {
						return {
							abstract: true,
							two: 'loo',
							three: 'me'
						};
					}
				},
				getRootDir: function () { return ''; }
			};
			var expected = { parent: 'other', foo: 'choo', two: 'moo', three: 'me' };
			var bt = new BaseTransformer(pancakes);
			var actual = bt.loadUIPart('foo', filePath);
			actual.should.deep.equal(expected);
	    });
	});
	
	describe('getAppName()', function () {
		it('should extract an app name from a path', function () {
			var filePath = '/blah/app/foo/pages/something.page.js';
			var ngPrefix = 'gh';
			var expected = 'ghFooApp';

			var bt = new BaseTransformer();
			var actual = bt.getAppName(filePath, ngPrefix);
			actual.should.equal(expected);
		});
	});

	describe('getTemplate()', function () {
	    it('should return a dot template', function () {
	        var bt = new BaseTransformer();
			var template = bt.getTemplate(__dirname + '/../fixtures/templates', 'test.params');
			taste.should.exist(template);
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

			var bt = new BaseTransformer(null);
			var actual = bt.getParamInfo(params, alias);

			actual.should.deep.equal(expected);
		});
	});

	describe('getFilteredParamInfo()', function () {
	    it('should return param info', function () {
			var flapjack = function (one, three, four, $scope) {
				// @module({ "client": { "one": "two" } })

				$scope.blah = one + three + four;
			};
			var expected = {
				converted: ['two', 'three', 'four'],
				list: ['one', 'three', 'four'],
				ngrefs: []
			};
			var bt = new BaseTransformer();
			var actual = bt.getFilteredParamInfo(flapjack, null);
			taste.should.exist(actual);
			actual.should.deep.equal(expected);
	    });
	});

	describe('getModuleBody()', function () {
		it('should return the entire string if it cant find a opening/closing curly in the string', function () {
			var flapjack = 'FooBarBooRamenMunchkinDonutWorldCup';
			var expected = 'FooBarBooRamenMunchkinDonutWorldCup';

			var bt = new BaseTransformer(null);
			var actual = bt.getModuleBody(flapjack);

			actual.should.equal(expected);
		});

		it('should extract everything inside the curly brackets of a module without function declaration', function () {
			var flapjack = 'Everything inside of the curly brackets {GetHuman is frickin awesome} will be extracted';
			var expected = 'GetHuman is frickin awesome';

			var bt = new BaseTransformer(null);
			var actual = bt.getModuleBody(flapjack);

			actual.should.equal(expected);
		});

		it('should replace new line character with a new line + tab character', function () {
			var flapjack = 'function getHuman() {\nvar latePenalty = munchkin(25 Count)}';
			var expected = '\n\tvar latePenalty = munchkin(25 Count)';

			var bt = new BaseTransformer(null);
			var actual = bt.getModuleBody(flapjack);
			actual.should.equal(expected);
		});
	});
});