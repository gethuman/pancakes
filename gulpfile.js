/**
 * Author: Jeff Whelpley
 * Date: 2/9/14
 *
 * Build file for Pancakes
 */
var gulp    = require('gulp');
var taste   = require('taste');

taste.init({
    gulp:       gulp,
    rootDir:    __dirname + '/lib',
    loadModule: require
});

gulp.task('default', ['jshint', 'test']);


