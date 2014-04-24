/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * Simple app definition with dependencies
 */
var Q           = require('q');
var Injector    = require('../dependency.injector');
var transHelper = require('../transformation.helper');
var utils       = require('../utensils');
var template    = transHelper.getTemplate('ng.app');

var transform = function (flapjack, options) {
    var model = {};
    var filePath = options.filePath;
    var injector = new Injector(options.init);

    // throw error if app not in the path
    var idx = filePath.indexOf('/app/');
    if (idx < 0) { throw new Error('/app/ is not in the path for ui part: ' + filePath); }

    filePath = filePath.substring(idx + 5);
    idx = filePath.indexOf('/');
    var appName = idx > 0 ? filePath.substring(0, idx) : filePath;
    model.appName = utils.getCamelCase(options.ngPrefix + '.' + appName + '.app');

    // get the app info from the app file
    var appInfo = injector.loadModule(options.moduleName, null, { flapjack: flapjack });
    model.routes = JSON.stringify(appInfo.routes) || '[]';
    model.deps = appInfo.clientDependencies || [];
    model.attach = appInfo.attachToClientScope || [];

    return new Q(template(model));
};

module.exports = {
    transform: transform
};