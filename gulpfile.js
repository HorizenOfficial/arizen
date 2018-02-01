'use strict';

var gulp         = require('gulp');
var scss         = require('gulp-sass');

gulp.task('scss', function () {
  return gulp.src('./scss/**/*.scss')
    .pipe(scss().on('error', scss.logError))
    .pipe(gulp.dest('./app/resources'));
});

gulp.task('watch', function () {
  gulp.watch('./scss/**/*.scss', ['scss']);
});

gulp.task('build', ['scss']);
