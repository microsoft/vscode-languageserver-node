/* global __dirname */

var gulp = require('gulp');
var path = require('path');
var tsb = require('gulp-tsb');
var log = require('gulp-util').log;
var rimraf = require('rimraf');

var compilation = tsb.create(path.join(__dirname, 'src', 'tsconfig.json'), true);

var sources = [
	'src/**/*.ts',
	'!src/typings/'
];

gulp.task('build', function() {
	return gulp.src(sources, { base: 'src' })
		.pipe(compilation())
		.pipe(gulp.dest('out'));
});

gulp.task('watch', ['build'], function() {
	log('Watching build sources...');
	gulp.watch(sources, ['build']);
});

gulp.task('clean', function (cb) { 
	rimraf('out', cb);
});

gulp.task('default', ['build']);