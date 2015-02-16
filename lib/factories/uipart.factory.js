/**
 * Author: Jeff Whelpley
 * Date: 2/15/15
 *
 * If the path has partials, pages or layouts in it,
 * we will use that to try and construct a view object
 * that can then be used by the middleware or transformer
 */
var fs      = require('fs');
var path    = require('path');
var _       = require('lodash');
var delim   = path.normalize('/');
var uiTypes = ['views', 'layouts', 'pages', 'partials'];

/**
 * Initialize the cache
 * @param injector
 * @constructor
 */
function UipartFactory(injector) {
    this.cache = {};
    this.injector = injector;
}

_.extend(UipartFactory.prototype, {

    /**
     * Check if is candidate. We will use the path for this. Must be:
     * app/{common or app name}/[pages|partials|layouts]/{name of file}
     *
     * @param modulePath
     * @returns {boolean}
     */
    isCandidate: function isCandidate(modulePath) {
        modulePath = modulePath || '';
        var pathParts = modulePath.split(delim);
        return (pathParts.length === 4 &&
                pathParts[0] === 'app' &&
                uiTypes.indexOf(pathParts[2]) >= 0);
    },

    /**
     * Remove the cached views
     */
    clearCache: function clearCache() {
        this.cache = {};
    },

    /**
     * Get a UI Part
     * @param modulePath
     * @param options
     * @returns {*}
     */
    getUiPart: function getUiPart(modulePath, options) {
        var rootDir = this.injector.rootDir;
        var tplDir = (options && options.tplDir) || 'dist' + delim + 'tpls';
        var pathParts = modulePath.split(delim);
        var appName = pathParts[1];
        var len = modulePath.length;
        var filePath, fullModulePath, uipart, viewObj;

        // filePath has .js, modulePath does not
        if (modulePath.substring(len - 3) === '.js') {
            filePath = rootDir + delim + modulePath;
            fullModulePath = rootDir + delim + modulePath.substring(0, len - 3);
        }
        else {
            filePath = rootDir + delim + modulePath + '.js';
            fullModulePath = rootDir + delim + modulePath;
        }

        // if exists, get it
        if (fs.existsSync(filePath)) {
            uipart = this.injector.require(fullModulePath);
        }
        // else if in an app folder, try the common folder
        else if (appName !== 'common') {
            fullModulePath = fullModulePath.replace(delim + appName + delim, delim + 'common' + delim);
            uipart = this.injector.require(fullModulePath);
            appName = 'common';
        }

        // if no view, check to see if precompiled in tpl dir
        var viewFile = fullModulePath.replace(
            delim + 'app' + delim + appName + delim,
            delim + tplDir + delim + appName + delim
        );
        if (!uipart.view && fs.existsSync(viewFile + '.js')) {
            viewObj = this.injector.require(viewFile);
            uipart.view = function () {
                return viewObj;
            };
        }

        return uipart;
    },

    /**
     * Find or create a flapjack based on a relative path from the project root
     * @param modulePath
     * @param moduleStack
     * @param options
     * @returns {{}}
     */
    create: function create(modulePath, moduleStack, options) {

        // first check the cache to see if we already loaded it
        if (this.cache[modulePath]) {
            return this.cache[modulePath];
        }

        var uipart = this.getUiPart(modulePath, options);

        // check if parent we want to merge with the parent
        if (uipart.parent) {
            var parts = modulePath.split(delim);
            parts[3] = uipart.parent + '.' + parts[2].substring(0, parts[2].length - 1);
            var parent = this.getUiPart(parts.join(delim), options);
            uipart = _.merge({}, parent, uipart);
            delete uipart.abstract;
        }

        this.cache[modulePath] = uipart;
        return uipart;
    }
});

// export the class
module.exports = UipartFactory;
