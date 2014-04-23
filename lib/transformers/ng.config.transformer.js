/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 *
 */
var Q           = require('q');
var fs          = require('fs');
var _           = require('lodash');
var Injector    = require('../dependency.injector');
var annotHelper = require('../annotation.helper');
var transHelper = require('../transformation.helper');
var utils       = require('../utensils');
var template    = transHelper.getTemplate('ng.config');

var transform = function (flapjack, options) {
    var model = {}, aliases, params, paramInfo;
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
    model.resolveHandlers = {};

    _.each(appInfo.routes, function (route) {
        var fileName = injector.rootDir + '/app/' + appName + '/pages/' + route.name + '.page.js';
        var uipart = fs.existsSync(fileName) ?
            require(fileName) :
            require(injector.rootDir + '/app/common/pages/' + route.name + '.page');

        aliases = annotHelper.getClientAliases(uipart.initialModel) || {};
        aliases = aliases === true ? {} : aliases;
        _.extend(aliases, { Q: '$q' });

        params = annotHelper.getParameters(uipart.initialModel) || {};
        paramInfo = transHelper.getParamInfo(params, aliases) || {};

        model.resolveHandlers[route.name] = {
            params: paramInfo.list,
            convertedParams: paramInfo.converted,
            ngrefs: paramInfo.ngrefs,
            body: transHelper.getModuleBody(uipart.initialModel)
        };
    });

    return new Q(template(model));
};

module.exports = {
    transform: transform
};
