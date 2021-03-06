'use strict';

process.env.NODE_ENV = 'production';

// Spawn Process
var yargs = require('yargs');
var chalk = require('chalk');
var fs = require('fs-extra');
var path = require('path');
var url = require('url');
var webpack = require('webpack');
var paths = require('../config/paths');
var heroCliConfig = require('../config/hero-config.json');
var checkRequiredFiles = require('../lib/checkRequiredFiles');
var FileSizeReporter = require('../lib/FileSizeReporter');
var printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;

var pgk = require('../package.json');
var commandName = Object.keys(pgk.bin)[0];

function showUsage() {
    var argv = require('yargs')
        .usage('Usage: ' + commandName + ' build <options>')
        // .command('count', 'Count the lines in a file')
        .example(commandName + ' start -e dev', 'Start the server using the dev configuration')
        .option('e', {
            demandOption: true,
            // default: '/etc/passwd',
            describe: 'Environment name of the configuration when start the server\n ' +
                      'Available value refer to \n\n' +
                      '<you-project-path>/' + heroCliConfig.heroCliConfig + '\n\nor you can add attribute environment names to attribute [' + heroCliConfig.environmentKey + '] in that file',
            type: 'string'
        })
        .option('s', {
            // demandOption: false,
            describe: 'build pakcage without dependecies like hero-js or webcomponents, just code in <you-project-path>/src folder'
        })
        .option('m', {
            // demandOption: false,
            describe: 'build without sourcemap'
        })
        .nargs('e', 1)
        .help('h')
        .epilog('copyright 2017')
        .argv;

    var s = fs.createReadStream(argv.file);

    var lines = 0;

    s.on('data', function (buf) {
        lines += buf.toString().match(/\n/g).length;
    });

    s.on('end', function () {
        console.log(lines);
    });

    process.exit(1);
}

if (yargs.argv.h || yargs.argv.e === undefined || (typeof yargs.argv.e === 'boolean')) {
    showUsage();
}
global.argv = yargs.argv;

var config = require('../config/webpack.config.prod');
// Warn and crash if required files are missing

if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
    process.exit(1);
}

// Print out errors
function printErrors(summary, errors) {
    console.log(chalk.red(summary));
    console.log();
    errors.forEach(err => {
        console.log(err.message || err);
        console.log();
    });
}

// Create the production build and print the deployment instructions.
function build() {
    console.log('Creating an optimized production build...');
    webpack(config).run((err, stats) => {
        if (err) {
            printErrors('Failed to compile.', [err]);
            process.exit(1);
        }

        if (stats.compilation.errors.length) {
            printErrors('Failed to compile.', stats.compilation.errors);
            process.exit(1);
        }

        if (process.env.ESLINT_WARNING_MAX &&
            stats.compilation.warnings.length > parseInt(process.env.ESLINT_WARNING_MAX, 10)) {
            printErrors('Failed to compile. When process.env.ESLINT_WARNING_MAX is set, warnings total size should not greater than ' + process.env.ESLINT_WARNING_MAX + ' Otherwise treated as failures.', stats.compilation.warnings);
            process.exit(1);
        }

        console.log(chalk.green('Compiled successfully.'));
        console.log();

        console.log('File sizes after gzip:');
        console.log();
        printFileSizesAfterBuild(stats);
        console.log();

        var appPackage  = require(paths.appPackageJson);
        var publicUrl = paths.publicUrl;
        var publicPath = config.output.publicPath;
        var publicPathname = url.parse(publicPath).pathname;
        var buildFolder = path.relative(process.cwd(), paths.appBuild);

        if (publicUrl && publicUrl.indexOf('.github.io/') !== -1) {
      // "homepage": "http://user.github.io/project"
            console.log('The project was built assuming it is hosted at ' + chalk.green(publicPathname) + '.');
            console.log('You can control this with the ' + chalk.green('homepage') + ' field in your '  + chalk.cyan('package.json') + '.');
            console.log();
            console.log('The ' + chalk.cyan('build') + ' folder is ready to be deployed.');
            console.log('To publish it at ' + chalk.green(publicUrl) + ', run:');
      // If script deploy has been added to package.json, skip the instructions
            if (typeof appPackage.scripts.deploy === 'undefined') {
                console.log();
                console.log('  ' + chalk.cyan('npm') +  ' install --save-dev gh-pages');
                console.log();
                console.log('Add the following script in your ' + chalk.cyan('package.json') + '.');
                console.log();
                console.log('    ' + chalk.dim('// ...'));
                console.log('    ' + chalk.yellow('"scripts"') + ': {');
                console.log('      ' + chalk.dim('// ...'));
                console.log('      ' + chalk.yellow('"predeploy"') + ': ' + chalk.yellow('"npm run build",'));
                console.log('      ' + chalk.yellow('"deploy"') + ': ' + chalk.yellow('"gh-pages -d build"'));
                console.log('    }');
                console.log();
                console.log('Then run:');
            }
            console.log();
            console.log('  ' + chalk.cyan('npm') +  ' run deploy');
            console.log();
        } else if (publicPath !== '/') {
      // "homepage": "http://mywebsite.com/project"
            console.log('The project was built assuming it is hosted at ' + chalk.green(publicPath) + '.');
            console.log('You can control this with the ' + chalk.green('homepage') + ' field in your '  + chalk.cyan('package.json') + '.');
            console.log();
            console.log('The ' + chalk.cyan('build') + ' folder is ready to be deployed.');
            console.log();
        } else {
            if (publicUrl) {
        // "homepage": "http://mywebsite.com"
                console.log('The project was built assuming it is hosted at ' + chalk.green(publicUrl) +  '.');
                console.log('You can control this with the ' + chalk.green('homepage') + ' field in your '  + chalk.cyan('package.json') + '.');
                console.log();
            } else {
        // no homepage
                console.log('The project was built assuming it is hosted at the server root.');
                console.log('To override this, specify the ' + chalk.green('homepage') + ' in your '  + chalk.cyan('package.json') + '.');
                console.log('For example, add this to build it for GitHub Pages:');
                console.log();
                console.log('  ' + chalk.green('"homepage"') + chalk.cyan(': ') + chalk.green('"http://www.dianrong.com/myapp"') + chalk.cyan(','));
                console.log();
            }

            console.log('The ' + chalk.cyan(buildFolder) + ' folder is ready to be deployed.');
            console.log('You may serve it with a static server:');
            console.log();
            console.log(`  ${chalk.cyan('npm')} install -g serve`);
            console.log(`  ${chalk.cyan('serve')} -s build`);
            console.log();
        }
    });
}

function copyPublicFolder() {
    fs.copySync(paths.appPublic, paths.appBuild, {
        dereference: true,
        filter: file => file !== paths.appHtml
    });
}

// Remove all content but keep the directory so that
// if you're in it, you don't end up in Trash
fs.emptyDirSync(paths.appBuild);

// Start the webpack build
build();

// Merge with the public folder
copyPublicFolder();
