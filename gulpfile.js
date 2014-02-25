/**
 * Author: Jeff Whelpley
 * Date: 2/9/14
 *
 * Build file for Pancakes
 */
var gulp        = require('gulp');
var mocha       = require('gulp-mocha');
var jshint      = require('gulp-jshint');
var watch       = require('gulp-watch');

var alljs = ['test/**/*.js', 'lib/**/*.js'];

gulp.task('jshint', function () {
    return gulp.src(alljs)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('test', function () {
    return gulp.src('test/unit/**/*.js')
        .pipe(mocha({
            growl: true,
            ui: 'bdd',
            reporter: 'progress',
            timeout: 5000,
            require: 'test/setup'
        }));
});

gulp.task('watch', function (){
    gulp.watch(['test/**/*.js', 'lib/**/*.js'], ['jshint', 'test']);
});

gulp.task('default', ['jshint', 'test']);


