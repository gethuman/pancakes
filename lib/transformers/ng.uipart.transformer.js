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
var jeff        = require('jeff-core');
var annotHelper = require('../annotation.helper');
var transHelper = require('../transformation.helper');
var utils       = require('../utensils');
var ngBasic     = require('./ng.basic.transformer');
var template    = transHelper.getTemplate('ng.uipart');

/**
 * Get form element validations
 * @param appName
 * @param flapjack
 */
var getFormElementValidations = function (appName, flapjack) {
    if (!flapjack.clientValidations) { return undefined; }

    var formElementFlapjacks = flapjack.clientValidations();
    var formElements = [];
    _.each(formElementFlapjacks, function (feFlapjack, name) {
        var aliases = annotHelper.getClientAliases(feFlapjack) || {};
        aliases = aliases === true ? {} : aliases;
        _.extend(aliases, { Q: '$q' });

        var params = annotHelper.getParameters(feFlapjack) || {};
        var paramInfo = transHelper.getParamInfo(params, aliases) || {};

        formElements.push({
            name: name,
            appName: appName,
            params: paramInfo.list,
            convertedParams: paramInfo.converted,
            ngrefs: paramInfo.ngrefs,
            body: transHelper.getModuleBody(feFlapjack)
        });
    });

    return formElements;
};

/**
 * Transform the flapjack into a client side module that contains
 * the directive, page/partial controller and html template
 *
 * @param injector
 * @param flapjack
 * @param options
 * @returns {*}
 */
var transform = function (injector, flapjack, options) {
    var model = {}, aliases, params, paramInfo;
    var promises = [];
    var filePath = options.filePath;
    var moduleName = options.moduleName.replace('Page', '').replace('Partial', '');

    // if there is no view, then it means there is no component
    if (!flapjack.view) { return new Q(); }

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
    model.appShortName = appName;

    var lastSlash = filePath.lastIndexOf('/');
    model.pageName = filePath.substring(lastSlash + 1).replace('.page.js', '').replace(appName + '.', '');

    // make the view url generic
    idx = viewUrl.lastIndexOf('/') + 1;
    model.viewUrl = 'templates/' + viewUrl.substring(idx);

    // if it is a partial, we will automatically add a directive
    var moduleNamePascal = utils.getPascalCase(moduleName);
    model.isPartial = options.filePath.match(/^.*\.partial\.js/);
    model.directiveName = options.ngPrefix + moduleNamePascal;
    model.directiveScope = JSON.stringify(flapjack.clientScope);
    model.controllerName = moduleNamePascal + 'Cntl';

    // load the controller
    var controller = flapjack.clientController || function () {};

    aliases = annotHelper.getClientAliases(controller) || {};
    aliases = aliases === true ? {} : aliases;
    _.extend(aliases, { Q: '$q' });

    // get params
    params = annotHelper.getParameters(controller) || {};

    // if partial and there is a partialModel, add it as a param
    if (model.isPartial && flapjack.modifyModel) {
        model.modifyScope = moduleName + 'ModifyScope';
        params.push(model.modifyScope);
        promises.push(ngBasic.transform(injector, flapjack.modifyModel, {
            ngType: 'factory',
            appName: model.appName,
            isClient: true,
            moduleName: model.modifyScope
        }));
    }

    // check to see if some params have aliases, etc.
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

    var deps = {};
    jeff.addShortcutsToScope(deps);

    // to get the view html, we need to hook into the injector
    var view = injector.loadModule(moduleName, null, {
        flapjack: flapjack.view,
        dependencies: deps
    });
    model.viewHtml = jeff.naked(view).toString();
    model.viewHtml = model.viewHtml.replace(/\'/g, '\\\'');

    // if clientValidations exist, then get them
    model.formElements = getFormElementValidations(appName, flapjack);

    promises.push(new Q(template(model)));
    return Q.all(promises);
};

module.exports = {
    getFormElementValidations: getFormElementValidations,
    transform: transform
};