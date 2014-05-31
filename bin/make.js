#!/usr/bin/env node

/**
 * # nodegame-server make script
 *
 */

if (!process.argv || !process.argv.length) {
    console.log('No input argument. Aborting');
    return;
}

/**
 * Module dependencies.
 */

var program = require('commander'),
smoosh = require('smoosh'),
os = require('os'),
fs = require('fs'),
util = require('util'),
exec = require('child_process').exec,
path = require('path'),
J = require('JSUS').JSUS;

var pkg = require('../package.json'),
version = pkg.version;

var ngcDir = J.resolveModuleDir('nodegame-client');
var JSUSDir = J.resolveModuleDir('JSUS');
var NDDBDir = J.resolveModuleDir('NDDB');
var shelfDir = J.resolveModuleDir('shelf.js');
var ngwindowDir = J.resolveModuleDir('nodegame-window');
var ngwidgetsDir = J.resolveModuleDir('nodegame-widgets');

var build_client = require(ngcDir + 'bin/build.js').build;
var build_client_support = require(ngcDir + 'bin/build.js').build_support;
var build_JSUS = require(JSUSDir + 'bin/build.js').build;
var build_NDDB = require(NDDBDir + 'bin/build.js').build;
var build_shelf = require(shelfDir + 'bin/build.js').build;
var build_ngwindow = require(ngwindowDir + 'bin/build.js').build;
var build_ngwidgets = require(ngwidgetsDir + 'bin/build.js').build;

var rootDir = path.resolve(__dirname, '..');
var buildDir = rootDir + '/public/javascripts/';
var cssDir = rootDir + '/public/stylesheets/';
var libDir = rootDir + '/lib/';
var confDir = rootDir + '/conf/';

var buildDir_client = ngcDir + 'build/';
var buildDir_JSUS = JSUSDir + 'build/';
var buildDir_NDDB = NDDBDir + 'build/';
var buildDir_shelf = shelfDir + 'build/';
var buildDir_ngWindow = ngwindowDir + 'build/';
var buildDir_ngWidgets = ngwidgetsDir + 'build/';



program
    .version(version);

program
    .command('clean')
    .description('Removes all files from build folder')
    .action(function(){
        J.cleandDir(buildDir);
    });



program
    .command('build-client [options]')
    .description('Creates a nodegame-client custom build')
// TODO: keep options update with client, or find a way to use the options
// defined in the client
    .option('-B, --bare', 'bare naked nodegame-client (no dependencies)')
    .option('-J, --JSUS', 'with JSUS')
    .option('-N, --NDDB', 'with NDDB')
    .option('-W, --window', 'with nodeGame-window')
    .option('-w, --widgets', 'with nodeGame-widgets')
    .option('-d, --addons', 'with nodeGame-client addons')
    .option('-s, --shelf', 'with Shelf.js')
    .option('-e, --es5', 'with support for old browsers')
    .option('-a, --all', 'full build of nodeGame-client')
    .option('-C, --clean', 'clean build directory')
    .option('-A, --analyse', 'analyse build')
    .option('-o, --output <file>', 'output file (without .js)')
    .action(function(env, options) {
        if (options.output && path.extname(options.output) === '.js') {
            options.output = path.basename(options.output, '.js');
        }
        options.clean = true;
        build_client(options);
        J.copyFromDir(buildDir_client, buildDir, '.js');
    });

program
    .command('multibuild')
    .description('Builds a set of javascript libraries for nodeGame')
    .action(function(){
        console.log('Multi-build for nodegame-server v.' + version);

        // nodegame-client
        build_client({
            clean: true,
            all: true,
            output: "nodegame-full",
        });
        build_client({
            bare: true,
            output: "nodegame-bare",
        });
        build_client({
            output: "nodegame",
        });
        //              build_client_support({
        //                      all: true,
        //              });

        J.copyFromDir(buildDir_client, buildDir, '.js');

        // JSUS
        build_JSUS({
            lib: ['obj','array','eval','parse','random','time','dom'],
            clean: true,
        });

        J.copyFromDir(buildDir_JSUS, buildDir, '.js');

        // NDDB
        build_NDDB({
            clean: true,
            all: true,
            output: "nddb-full",
        });
        build_NDDB({
            bare: true,
            output: "nddb-bare",
        });
        build_NDDB({
            JSUS: true,
            output: "nddb",
        });

        J.copyFromDir(buildDir_NDDB, buildDir, '.js');

        // Shelf.js
        build_shelf({
            clean: true,
            all: true,
            output: "shelf-full",
        });
        build_shelf({
            lib: ['amplify','cookie'],
            output: "shelf-browser",
        });
        build_shelf({
            lib: ['amplify'],
            output: "shelf-amplify",
        });
        build_shelf({
            lib: ['cookie'],
            output: "shelf-cookie",
        });
        build_shelf({
            lib: ['fs'],
            output: "shelf-fs",
        });

        J.copyFromDir(buildDir_shelf, buildDir, '.js');

        // ng-widgets
        build_ngwidgets({
            all: true,
            clean: true,
        });

        J.copyFromDir(buildDir_ngWidgets, buildDir, '.js');

        // ng-window
        build_ngwindow({
            all: true,
            clean: true,
        });

        J.copyFromDir(buildDir_ngWindow, buildDir, '.js');

        console.log('All javascript files built and copied to public/javascript/');
    });

program
    .command('build-css')
    .description('Copies all stylesheets files  into public/stylesheets/ and builds nodegame.css')
    .option('-o, --output <file>', 'output file (without .css)')
    .option('-A, --analyse', 'analyse build')
    .option('-C, --clean', 'clean CSS directory')
    .action(function(options) {
        var config, runIt, out, smooshed;
      
        // Copy CSS files from submodules.
        copyCSS();

        // Set output name.
        out = options.output || "nodegame";
        if (path.extname(out) === '.css') {
	    out = path.basename(out, '.css');
        }
    
        // Configurations for file smooshing.
        config = {
	    // VERSION: version,
	
	    // Use JSHINT to spot code irregularities.
	    JSHINT_OPTS: {
	        boss: true,
	        forin: true,
	        browser: true,
	    },
	    
	    CSS: {
                // Need the extra slash.
	        DIST_DIR: '/' + cssDir
	    }
        };
        
        config.CSS[out] = [
            cssDir + 'window.css',
            cssDir + 'widgets.css'
        ];
        
	smooshed = smoosh.config(config);

	// Removes all files from the CSS folder.
	if (options.clean) {
	    smooshed.clean();
	}
	    
	// Builds both uncompressed and compressed files.
	smooshed.build();
	    
    	if (options.analyse) {
    	    smooshed.run(); // runs jshint on full build
    	    smooshed.analyze(); // analyzes everything
    	}
            
        console.log('All CSS files copied, and ' + out + '.css created.');

    });


program
    .command('refresh')
    .option('-a, --all', 'copy all js and css files')
    .option('-j, --js-only', 'copy only js files')
    .option('-c, --css-only', 'copy only css files')
    .description('Copies build files (.js) and style files (.css) from submodules into public/')
    .action(function(options) {
        if (!options.all && !options.js && !options.css) {
            options.all = true;
        }

        if (options.all || options.js) {
            try {
                J.copyFromDir(buildDir_client, buildDir, '.js');
            }
            catch(e) {
                console.log('make refresh: could not find nodegame-client directory.');
            }
            try {            
                J.copyFromDir(buildDir_ngWindow, buildDir, '.js');
            }
            catch(e) {
                console.log('make refresh: could not find nodegame-window directory.');
            }
            try {            
                J.copyFromDir(buildDir_ngWidgets, buildDir, '.js');
            }
            catch(e) {
                console.log('make refresh: could not find nodegame-widgets directory.');
            }
            try {
                J.copyFromDir(buildDir_JSUS, buildDir, '.js');
            }
            catch(e) {
                console.log('make refresh: could not find JSUS directory.');
            }
            try {
                J.copyFromDir(buildDir_NDDB, buildDir, '.js');
            }
            catch(e) {
                console.log('make refresh: could not find NDDB directory.');
            }
            try {
                J.copyFromDir(buildDir_shelf, buildDir, '.js');
            }
            catch(e) {
                console.log('make refresh: could not find Shelf.js directory.');
            }
        }

        if (options.all || options.css) {
            copyCSS();            
        }

        console.log('All files copied to public/');
    });

program
    .command('doc')
    .description('Builds documentation files')
    .action(function(){
        console.log('Building documentation for nodegame-server v.' + version);
        // http://nodejs.org/api.html#_child_processes
        var dockerDir = J.resolveModuleDir('docker');
        var command = dockerDir + 'docker -i ' + rootDir + ' index.js lib/ -o ' + rootDir + '/docs/';
        var child = exec(command, function (error, stdout, stderr) {
            util.print(stdout);
            util.print(stderr);
            if (error !== null) {
                console.log('build error: ' + error);
            }
        });
    });

program
    .command('sync <path> [options]')
    .description('Sync the folder with the specified target directory (must exists)')
    .option('-a, --all', 'sync /lib and /conf folders (default)')
    .option('-l, --lib', 'sync the /lib folder')
    .option('-c, --conf', 'sync the /conf folder')
    .action(function(path, options) {

        if ('undefined' === typeof options) {
            options = {};
            options.all = true;
        }

        if (options.all) {
            copyDirTo(confDir, path + '/conf/');
            copyDirTo(libDir, path + '/lib/');
        }

        else if (options.conf) {
            copyDirTo(confDir, path);
        }

        else if (options.lib) {
            copyDirTo(libDir, path);
        }

        console.log('Done.');

    });


function copyDirTo(inputDir, targetDir) {

    if (!targetDir) {
        console.log('You must specify a target directory for the \'sync\' command');
        return;
    }

    targetDir = path.resolve(targetDir);

    if (!fs.existsSync(targetDir)) {
        console.log(targetDir + ' does not exist');
        return false;
    }

    var stats = fs.lstatSync(targetDir);
    if (!stats.isDirectory()) {
        console.log(targetDir + ' is not a directory');
        return false;
    }

    targetDir = targetDir + '/';

    console.log('nodegame-server v.' + version + ': syncing ' + inputDir + ' with ' + targetDir);

    J.copyDirSyncRecursive(inputDir, targetDir);
}

function copyCSS(options) {
    try {            
        J.copyFromDir(ngwindowDir + 'css/', cssDir, '.css');
    }
    catch(e) {
        console.log('make refresh: could not find nodegame-window css directory.');
    }
    try {            
        J.copyFromDir(ngwidgetsDir + 'css/', cssDir, '.css');
    }
    catch(e) {
        console.log('make refresh: could not find nodegame-window css directory.');
    }
}


//Parsing options
program.parse(process.argv);
