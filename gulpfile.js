var gulp = require('gulp-help')(require('gulp')),
    $ = require('gulp-load-plugins')({ lazy: true }),
    del = require('del'),
    fs = require('fs'),
    moment = require('moment'),
    karma = require('karma'),
    rollup = require('rollup').rollup,
    rollupTypescript = require('rollup-plugin-typescript'),
    rollupNodeResolve = require('rollup-plugin-node-resolve'),
    webpack = require('webpack'),
    webpackStream = require('webpack-stream'),
    webpackConfig = require('./webpack.config'),
    webpackTestConfig = require('./webpack.test.config'),
    runSequence = require('run-sequence'),
    argv = require('yargs').argv;
;



// gulp.task('compile:watch', 'Watch sources', function () {
//     gulp.watch(['./app/**/*.ts', './app/**/*.html'], ['compile:src', 'replace']);
// });

// gulp.task('compile:src', 'Compile typescript for library', function() {
//   return rollup({
//     entry: 'app/app.ts',
//     plugins: [
//       rollupTypescript(),
//       rollupNodeResolve({ jsnext: true })
//     ]
//   }).then(function (bundle) {
//     return bundle.write({
//       format: 'iife',
//       moduleName: 'app',
//       dest: 'dist/app.js',
//       sourceMap: true
//     });
//   });
// });

// gulp.task('replace', function () {
//     return gulp.src(['app/*.html'])
//         .pipe($.htmlReplace({
//             'js': ['app.js']
//         }))
//         .pipe(gulp.dest('dist'))
//         ;
// });

var package = require('./package.json');
var webpackBanner = package.name + " v" + package.version + " | (c) 2016 Matt Mazzola " + package.license;
var gulpBanner = "/*! " + webpackBanner + " */\n";

gulp.task('build', 'Build for release', function (done) {
    return runSequence(
        'clean:dist',
        'compile:src',
        // 'compile:ts',
        'min',
        // 'header',
        done
    );
});

gulp.task('build:app', 'Build application', function (done) {
    return runSequence(
        'clean:demo',
        'compile:app',
        'replace',
        done
    );
});

gulp.task('test', 'Runs all tests', function (done) {
    return runSequence(
        'clean:tmp',
        'compile:spec',
        'test:js',
        done
    );
});

gulp.task('ghpages', 'Deploy documentation to gh-pages', ['nojekyll'], function () {
    return gulp.src(['./docs/**/*'], {
        dot: true
    })
        .pipe(ghPages({
            force: true,
            message: 'Update ' + moment().format('LLL')
        }));
});

gulp.task("docs", 'Compile documentation from src code', function () {
    return gulp
        .src(["src/**/*.ts"])
        .pipe(typedoc({
            mode: 'modules',
            includeDeclarations: true,

            // Output options (see typedoc docs)
            out: "./docs",
            json: "./docs/json/" + package.name + ".json",

            // TypeDoc options (see typedoc docs)
            ignoreCompilerErrors: true,
            version: true
        }))
        ;
});

gulp.task('nojekyll', 'Add .nojekyll file to docs directory', function (done) {
    fs.writeFile('./docs/.nojekyll', '', function (error) {
        if (error) {
            throw error;
        }

        done();
    });
});

gulp.task('compile:app', 'Compile app', function () {
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
            dest: 'demo/app.js',
            sourceMap: true
        });
    });
});

gulp.task('compile:src', 'Compile typescript for library', function () {
    return rollup({
        entry: 'src/perceptron-visualizer.ts',
        plugins: [
            rollupTypescript(),
            rollupNodeResolve({ jsnext: true })
        ]
    }).then(function (bundle) {
        return bundle.write({
            format: 'umd',
            moduleName: 'perceptronvisualizer',
            dest: 'dist/perceptron-visualizer.js',
            sourceMap: true
        });
    });
});

// gulp.task('compile:ts', 'Compile source files', function () {
//     webpackConfig.plugins = [
//         new webpack.BannerPlugin(webpackBanner)
//     ];

//     return gulp.src(['typings/**/*.d.ts', './src/**/*.ts'])
//         .pipe(webpackStream(webpackConfig))
//         .pipe(gulp.dest('./dist'));
// });

gulp.task('replace', function () {
    return gulp.src(['app/*.html'])
        .pipe($.htmlReplace({
            'js': ['app.js']
        }))
        .pipe(gulp.dest('demo'))
        ;
});

gulp.task('min', 'Minify build files', function () {
    return gulp.src(['!./dist/*.min.js', './dist/models.js'])
        .pipe($.uglify({
            preserveComments: 'license'
        }))
        .pipe($.rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('clean:demo', 'Clean demo folder', function () {
    return del([
        './dist/**/*'
    ]);
});

gulp.task('clean:dist', 'Clean dist folder', function () {
    return del([
        './dist/**/*'
    ]);
});

gulp.task('clean:tmp', 'Clean tmp folder', function () {
    return del([
        './tmp/**/*'
    ]);
});

gulp.task('compile:spec', 'Compile spec tests', function () {
    return gulp.src(['./test/test.spec.ts'])
        .pipe(webpackStream(webpackTestConfig))
        .pipe(gulp.dest('./tmp'));
});

gulp.task('test:js', 'Run spec tests', function (done) {
    new karma.Server.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: argv.debug ? false : true,
        captureTimeout: argv.timeout || 60000
    }, done);
});