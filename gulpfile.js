var gulp = require('gulp-help')(require('gulp')),
    $ = require('gulp-load-plugins')({ lazy: true }),
    rollup = require('rollup').rollup,
    rollupTypescript = require('rollup-plugin-typescript'),
    rollupNodeResolve = require('rollup-plugin-node-resolve'),
    runSequence = require('run-sequence')
    ;

gulp.task('build', 'Build application', function (done) {
    return runSequence(
        'compile:src',
        'replace',
        done
    );
});

gulp.task('compile:watch', 'Watch sources', function () {
    gulp.watch(['./app/**/*.ts', './app/**/*.html'], ['compile:src', 'replace']);
});

gulp.task('compile:src', 'Compile typescript for library', function() {
  return rollup({
    entry: 'app/app.ts',
    plugins: [
      rollupTypescript(),
      rollupNodeResolve({ jsnext: true })
    ]
  }).then(function (bundle) {
    return bundle.write({
      format: 'iife',
      moduleName: 'app',
      dest: 'dist/app.js',
      sourceMap: true
    });
  });
});

gulp.task('replace', function () {
    return gulp.src(['app/*.html'])
        .pipe($.htmlReplace({
            'js': ['app.js']
        }))
        .pipe(gulp.dest('dist'))
        ;
});