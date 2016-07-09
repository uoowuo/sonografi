var gulp = require('gulp');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var browserify = require('browserify');
var source = require('vinyl-source-stream');


// Execute everything by default
gulp.task('default', ['static', 'js'], function() {});

// Recompile files as they change
gulp.task('watch', function() {

    gulp.watch(['./src/app.js', './src/classes/**/*.js'], ['js']);
    gulp.watch(['./src/index.html', './src/styles/**/*.css', './src/models/**/*.*'], ['static']);
});

// Copy static files
gulp.task('static', function() {

    return gulp.src(
        [
            './src/index.html',
            './src/audio/**/*/',
            './src/images/**/*/',
            './src/models/**/*/',
            './src/styles/**/*/'
        ],
        {base: './src'}
    )
        .pipe(gulp.dest('dist'));
});

// Compile JS
gulp.task('js', function() {

    browserify('./src/app.js')
        .transform('babelify', {presets: ['es2015']})
        .bundle()
        .pipe(source('app.js'))
        .pipe(gulp.dest('./dist/'));
});