/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 2/27/14
 *
 * Testing the common filters
 */
var name = 'common.filters';
var taste = require('../taste');
var filters = taste.target(name);

describe('Unit tests for ' + name, function () {
    describe('parseIfJson()', function () {
        it('should return back a normal string', function () {
            var data = 'something';
            var actual = filters.parseIfJson(data);
            actual.should.equal(data);
        });

        it('should return back a normal object', function () {
            var data = { some: 'obj' };
            var actual = filters.parseIfJson(data);
            actual.should.deep.equal(data);
        });

        it('should parse JSON in a string to an object', function () {
            var input = '{ "some": "thing" } ';
            var expected = { some: 'thing' };
            var actual = filters.parseIfJson(input);
            actual.should.deep.equal(expected);
        });
    });

    describe('validateRequestParams()', function () {
        it('should return just the resource and method if no params listed', function (done) {
            var method = 'test';
            var resource = { test: true };
            var validateRequestParams = filters.validateRequestParams(resource, method);
            var expected = { resource: { test: true }, method: 'test' };
            var actual = validateRequestParams();
            taste.eventuallySame(actual, expected, done);
        });

        it('should be rejected if missing a required param', function (done) {
            var method = 'create';
            var resource = { params: { create: { required: ['zzz'] }}};
            var validateRequestParams = filters.validateRequestParams(resource, method);
            var req = { data: 'blah' };
            var promise = validateRequestParams(req);
            promise.should.be.rejectedWith(/Missing zzz/).and.notify(done);
        });

        it('should be rejected if has a value in the request that is not valid', function (done) {
            var method = 'create';
            var resource = {};
            var validateRequestParams = filters.validateRequestParams(resource, method);
            var req = { data: 'blah' };
            var promise = validateRequestParams(req);
            promise.should.be.rejectedWith(/data is not allowed/).and.notify(done);
        });

        it('should return back data with resource and method if all valid', function (done) {
            var method = 'create';
            var resource = { params: { create: { required: ['data'], optional: ['some'] }}};
            var validateRequestParams = filters.validateRequestParams(resource, method);
            var req = { data: 'blah', some: 'another' };
            var expected = { data: 'blah', inputData: 'blah', some: 'another', method: method, resource: resource };
            var promise = validateRequestParams(req);
            taste.eventuallySame(promise, expected, done);
        });
    });

    describe('validateAdapterResponse()', function () {
        it('should be rejected if nothing passed in', function (done) {
            var promise = filters.validateAdapterResponse();
            promise.should.be.rejectedWith(/Adapter resolved without returning anything/).and.notify(done);
        });

        it('should be rejected if no data', function (done) {
            var res = { resource: 'blah' };
            var promise = filters.validateAdapterResponse(res);
            promise.should.be.rejectedWith(/Adapter did not set data in the response/).and.notify(done);
        });

        it('should be rejected if no resource', function (done) {
            var res = { data: 'blah' };
            var promise = filters.validateAdapterResponse(res);
            promise.should.be.rejectedWith(/Adapter response does not have the resource/).and.notify(done);
        });

        it('should return the input data if valid', function (done) {
            var res = {data: 'blah', resource: {} };
            var promise = filters.validateAdapterResponse(res);
            taste.eventuallySame(promise, res, done);
        });
    });
});