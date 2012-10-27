#!/usr/bin/env node

/**
 * # nodegame-server make script
 * 
 */

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

var build_client = require(ngcDir + 'bin/build.js').build;
var build_client_support = require(ngcDir + 'bin/build.js').build_support;
var build_JSUS = require(JSUSDir + 'bin/build.js').build;
var build_NDDB = require(NDDBDir + 'bin/build.js').build;
var build_shelf = require(shelfDir + 'bin/build.js').build;

var rootDir = path.resolve(__dirname, '..');
var buildDir = rootDir + '/public/javascripts/';

var buildDir_client = ngcDir + 'build/';
var buildDir_JSUS = JSUSDir + 'build/';
var buildDir_NDDB = NDDBDir + 'build/';
var buildDir_shelf = shelfDir + 'build/';



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
		build_client_support({
			all: true,
		});
		
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
		
		console.log('All javascript files built and copied in public/javascript/');
});

program
	.command('doc')
	.description('Builds documentation files')
	.action(function(){
		console.log('Building documentation for nodegame-server v.' + version);
		// http://nodejs.org/api.html#_child_processes
		var dockerDir = J.resolveModuleDir('docker');
		var command = dockerDir + 'docker -i ' + rootDir + ' index.js lib/ -o ' + rootDir + 'docs/';
		var child = exec(command, function (error, stdout, stderr) {
			util.print(stdout);
			util.print(stderr);
			if (error !== null) {
				console.log('build error: ' + error);
			}
		});
});

//Parsing options
program.parse(process.argv);