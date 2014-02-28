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
            var expected = { data: 'blah', some: 'another', method: method, resource: resource };
            var promise = validateRequestParams(req);
            taste.eventuallySame(promise, expected, done);
        });
    });

    describe('validateAdapterResponse()', function () {
        it('should be rejected if no data or resource', function (done) {
            var res = { data: 'blah' };
            var promise = filters.validateAdapterResponse(res);
            promise.should.be.rejectedWith(/Adapter does not contain data/).and.notify(done);
        });

        it('should return the input data if valid', function (done) {
            var res = {data: 'blah', resource: {} };
            var promise = filters.validateAdapterResponse(res);
            taste.eventuallySame(promise, res, done);
        });
    });

    describe('convertResponseToData()', function () {
        it('should return data if it exists', function (done) {
            var res = { data: { something: true } };
            var promise = filters.convertResponseToData(res);
            taste.eventuallySame(promise, res.data, done);
        });
    });
});