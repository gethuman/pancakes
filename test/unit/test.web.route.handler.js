/**
 * Author: Jeff Whelpley
 * Date: 10/22/14
 *
 *
 */
var taste   = require('taste');
var name    = 'web.route.handler';
var handler = taste.target(name);
var path    = require('path');

describe('Unit tests for ' + name, function () {
    var injector1 = {
        rootDir: path.join(__dirname, '../fixtures'),
        loadModule: function () {
            return { foo: { routes: [
                { name: 'foo.home', urls: ['/'] },
                { name: 'post', urls: ['/{slug}/_{urlId}'] }
            ]}};
        }
    };

    describe('convertUrlPatternToRegex()', function () {
        it('should create a regular expression for a given URL', function () {
            var pattern = '/{slug}/_{urlId}';
            var expected = /^\/[^\\/]+\/_[^\\/]+$/;
            var actual = handler.convertUrlPatternToRegex(pattern);
            actual.should.deep.equal(expected);
        });
    });

    describe('getTokenValuesFromUrl()', function () {
        it('should extract tokens from a URL', function () {
            var pattern = '/{slug}/_{urlId}';
            var url = '/blah-is-cool/_3b';
            var expected = { slug: 'blah-is-cool', urlId: '3b' };
            var actual = handler.getTokenValuesFromUrl(pattern, url);
            actual.should.deep.equal(expected);
        });
    });

    describe('getRoutes()', function () {
        it('should get an array of routeInfo objects', function () {
            handler.init({ injector: injector1 });
            var expected = [
                { name: 'foo.home', urlPattern: '/' },
                { name: 'post', urlPattern: '/{slug}/_{urlId}' }
            ];

            var appName = 'foo';
            var actual = handler.getRoutes(appName);
            actual.length.should.equal(2);
            actual[0].urlPattern.should.equal(expected[0].urlPattern);
            actual[1].urlPattern.should.equal(expected[1].urlPattern);
        });
    });

    describe('getRouteInfo()', function () {
        it('should get route info', function () {
            handler.init({ injector: injector1 });
            var appName = 'foo';
            var urlRequest = '/blah/_34';
            var routeInfo = handler.getRouteInfo(appName, urlRequest, {}, 'en');
            routeInfo.url.should.equal(urlRequest);
        });

        it('should throw a 404 error if no path found', function () {
            handler.init({ injector: injector1 });
            var appName = 'foo';
            var urlRequest = '/blahasd';
            var fn = function () {
                handler.getRouteInfo(appName, urlRequest, {}, 'en');
            };
            taste.expect(fn).to.throw(/^404:/);
        });
    });

    describe('getInitialModel()', function () {
        it('should return empty object if no model on the page', function () {
            handler.getInitialModel({}, {}).should.eventually.deep.equal({});
        });
    });
});