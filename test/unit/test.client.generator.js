/**
 * Author: Jeff Whelpley
 * Date: 2/18/14
 *
 * Unit tests for the client.generator
 */
var taste = require('../taste');
var name = 'client.generator';
var clientGenerator = taste.target(name);

describe('Unit tests for ' + name, function () {

    describe('getModuleBody()', function () {
        it('should return back the input if invalid', function () {
            var data = 'blah';
            var actual = clientGenerator.getModuleBody(data);
            taste.expect(actual).to.exist;
            actual.should.equal(data);
        });

        it('should return back the body for a module', function () {
            var flapjack = function () { return 2; };
            var expected = ' return 2; ';
            var actual = clientGenerator.getModuleBody(flapjack);
            taste.expect(actual).to.exist;
            actual.should.equal(expected);
        });
    });

    describe('renderTemplate()', function () {
        it('should return back simple template with no changes', function () {
            var flapjack = function () {};
            var options = { output: 'test', type: 'simple' };
            var expected = 'hello';
            var actual = clientGenerator.renderTemplate(flapjack, 'jeff', options);
            taste.expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should set the module name and body', function () {
            var flapjack = function () { return 2; };
            var options = { output: 'test', type: 'setname' };
            var expected = 'jeff return 2; ';
            var actual = clientGenerator.renderTemplate(flapjack, 'jeff', options);
            taste.expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should set the param list without mapping', function () {
            var flapjack = function (one, two, three) { return one + two + three; };
            var options = { output: 'test', type: 'params' };
            var expected = 'one,two,three';
            var actual = clientGenerator.renderTemplate(flapjack, 'jeff', options);
            taste.expect(actual).to.exist;
            actual.should.equal(expected);
        });

        it('should set the param list with mappings', function () {
            var flapjack = function (one, two, three) {
                // @module({ "client": { "two": "different" } })
                return one + two + three;
            };
            var options = { output: 'test', type: 'params' };
            var expected = 'one,different,three';
            var actual = clientGenerator.renderTemplate(flapjack, 'jeff', options);
            taste.expect(actual).to.exist;
            actual.should.equal(expected);
        });
    });

    describe('generateClient()', function () {
        it('should throw error if module does not exist', function () {
            var fn = function () {
                clientGenerator.generateClient('blah.js', null);
            };
            taste.expect(fn).to.throw(/Cannot find module/);
        });

        it('should return null if module is not a client module', function () {
            var actual = clientGenerator.generateClient('./utensils', null);
            taste.expect(actual).to.be.null;
        });

        it('should return module if split client/server', function () {
            var clientModulePath = taste.fixturesDir + '/flapjacks/complexclient.module';
            var options = {
                appName: 'testCommonApp',
                output: 'angular',
                type: 'factory'
            };
            var actual = clientGenerator.generateClient(clientModulePath, options);
            taste.expect(actual).to.exist;
            actual.should.match(/hello, world/);
        });

        it('should load our sample client module', function () {
            var clientModulePath = taste.fixturesDir + '/flapjacks/client.module';
            var options = {
                appName: 'testCommonApp',
                output: 'angular',
                type: 'factory'
            };
            var actual = clientGenerator.generateClient(clientModulePath, options);
            taste.expect(actual).to.exist;
            actual.should.match(/hello, world/);
        });
    });
});