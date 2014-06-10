/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 2/10/14
 *
 * This is a wrapper for all libs needed for testing
 */
var Q               = require('q');
var sinon           = require('sinon');
var chai            = require('chai');
var sinonChai       = require('sinon-chai');
var chaiAsPromised  = require('chai-as-promised');
var mochaAsPromised = require('mocha-as-promised');
var path            = require('path');

mochaAsPromised();
chai.use(sinonChai);
chai.use(chaiAsPromised);

/**
 * Used to wrap all promises
 * @param promises
 * @param done Optional param if it exists, will do notify at end
 * @returns {*|Promise.<Array.<Object>>}
 */
var all = function (promises, done) {
    return done ? Q.all(promises).should.notify(done) : Q.all(promises);
};

/**
 * Shorthand for just making sure a promise eventually equals a value
 * @param promise
 * @param expected
 * @param done
 */
var eventuallySame = function (promise, expected, done) {
    all([
        promise.should.be.fulfilled,
        promise.should.eventually.deep.equal(expected)
    ], done);
};

var target = function (relativePath) {
    return require('../lib/' + relativePath);
};

module.exports = {
    all: all,
    eventuallySame: eventuallySame,
    target: target,
    fixturesDir: __dirname + '/fixtures',
    delim: path.normalize('/'),

    spy:    sinon.spy,
    expect: chai.expect,
    should: chai.should()
};




