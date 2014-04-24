/**
 * Copyright 2014 GetHuman LLC
 * Author: Jeff Whelpley
 * Date: 4/15/14
 *
 * This will translate a pancake page or partial into the angular client
 * equivalent. The final output will contain a contro
 */
var Q           = require('q');
var _           = require('lodash');
var Injector    = require('../dependency.injector');
var annotHelper = require('../annotation.helper');
var transHelper = require('../transformation.helper');
var utils       = require('../utensils');
var template    = transHelper.getTemplate('ng.uipart');

/**
 * Transform the flapjack into a client side module that contains
 * the directive, page/partial controller and html template
 *
 * @param flapjack
 * @param options
 * @returns {*}
 */
var transform = function (flapjack, options) {
    var model = {}, aliases, params, paramInfo = {};
    var filePath = options.filePath;
    var moduleName = options.moduleName.replace('Page', '').replace('Partial', '');
    var injector = new Injector(options.init);

    // if there is no clientView, then it means there is no client component
    if (!flapjack.clientView) { return new Q(); }

    // error if file not under the app folder
    var idx = filePath.indexOf('/app/');
    if (idx < 0) { throw new Error('/app/ is not in the path for ui part: ' + filePath); }

    // get the url from the path (everything after /app/)
    var viewUrl = filePath.substring(idx + 5);
    viewUrl = viewUrl.replace('.partial.js', '').replace('.page.js', '');

    // get the app name from the path
    idx = viewUrl.indexOf('/');
    var appName = idx > 0 ? viewUrl.substring(0, idx) : viewUrl;
    model.appName = utils.getCamelCase(options.ngPrefix + '.' + appName + '.app');

    // make the view url generic
    idx = viewUrl.lastIndexOf('/') + 1;
    model.viewUrl = 'templates/' + viewUrl.substring(idx);

    // if it is a partial, we will automatically add a directive
    var moduleNamePascal = utils.getPascalCase(moduleName);
    model.isPartial = options.filePath.match(/^.*\.partial\.js/);
    model.directiveName = options.ngPrefix + moduleNamePascal;
    model.controllerName = moduleNamePascal + 'Cntl';

    // load the controller
    var controller = flapjack.clientController || function () {};

    aliases = annotHelper.getClientAliases(controller) || {};
    aliases = aliases === true ? {} : aliases;
    _.extend(aliases, { Q: '$q' });

    params = annotHelper.getParameters(controller) || {};
    paramInfo = transHelper.getParamInfo(params, aliases) || {};

    model.params = paramInfo.list || [];
    model.convertedParams = paramInfo.converted || [];
    model.ngrefs = paramInfo.ngrefs;
    model.body = transHelper.getModuleBody(controller);

    // make sure $scope is in the param list if it isn't already
    if (model.params.indexOf('$scope') < 0) {
        model.params.push('$scope');
        model.convertedParams.push('$scope');
    }

    // to get the view html, we need to hook into the injector
    model.viewHtml = injector.loadModule(moduleName, null, {
        flapjack: flapjack.clientView,
        app: appName,
        type: 'view'
    });
    model.viewHtml = model.viewHtml.replace(/\'/g, '\\\'');

    return new Q(template(model));
};

module.exports = {
    transform: transform
};