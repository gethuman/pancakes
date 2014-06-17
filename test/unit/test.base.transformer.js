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

 	describe('BaseTransformer() - Constructor', function () {
 		it('should construct a null template', function () {
 			var bt = new BaseTransformer();
 			bt.should.exist;
 			bt.should.have.deep.property('template', null);
 		});

 		it('should construct a template for a given transformer', function () {
 			var transformDir 	= __dirname + '/../fixtures/templates';
 			var templateName = 'test.params';
 			var bt = new BaseTransformer(transformDir, templateName);
 			bt.should.exist;
 			bt.should.not.be.null;
 			bt.should.ownProperty('template');
 			(bt.template).should.be.an.instanceof(Function);
  	});

 		it('should constructa tempalte for a given transformer (using different tempalte from previous case)', function () {
  			var transformDir = __dirname + '/../fixtures/templates';
  			var templateName = 'test.simple';
  			var bt = new BaseTransformer(transformDir, templateName);

 			bt.should.exist;
 			bt.should.not.be.null;
 			bt.should.ownProperty('template');
 			(bt.template).should.be.an.instanceof(Function);
  		});
 	});

 	describe('getParamInfo()', function () {
 		it('should convert a list of params and return an object with converted values', function () {
 			var params = ['foo', 'bar', 'boo', 'ramen', 'donut'];
 			var alias = {
 				ramen: 'angular',
 				donut: 'munchkins'
 			};

 			var expected = {
 				converted: ['foo', 'bar', 'boo', 'munchkins'],
 				list: ['foo', 'bar', 'boo', 'donut'],
 				ngrefs: ['ramen']
 			};

 			var bt = new BaseTransformer();
 			var actual = bt.getParamInfo(params, alias);

 			actual.should.deep.equal(expected);
 		});
 	});

 	describe('getModuleBody()', function () {
 		it('should return the entire string if it cant find a opening/closing curly in the string', function () {
 			var flapjack = 'FooBarBooRamenMunchkinDonutWorldCup';
 			var expected = 'FooBarBooRamenMunchkinDonutWorldCup';
 			
 			var bt = new BaseTransformer();
 			var actual = bt.getModuleBody(flapjack);

 			actual.should.equal(expected);
 		});

 		it('should extract everything inside the curly brackets of a module without function declaration', function () {
 			var flapjack = 'Everything inside of the curly brackets {GetHuman is frickin awesome} will be extracted';
 			var expected = 'GetHuman is frickin awesome';

 			var bt = new BaseTransformer();
 			var actual = bt.getModuleBody(flapjack);

 			actual.should.equal(expected);
 		});

 		it('should replace new line character with a new line + tab character', function () {
 			var flapjack = 'function getHuman() {\nvar latePenalty = munchkin(25 Count)}';
 			var expected = '\n\tvar latePenalty = munchkin(25 Count)';

 			var bt = new BaseTransformer();
 			var actual = bt.getModuleBody(flapjack);
 			actual.should.equal(expected);
 		});
 	});
 });