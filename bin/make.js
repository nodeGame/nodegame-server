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
    pkg = require('../package.json'),
    version = pkg.version;

var build_client = require('./../node_modules/nodegame-client/bin/build.js').build;
var build_JSUS = require('./../node_modules/nodegame-client/node_modules/JSUS/bin/build.js').build;
var build_NDDB = require('./../node_modules/nodegame-client/node_modules/NDDB/bin/build.js').build;
var build_shelf = require('./../node_modules/nodegame-client/node_modules/shelf.js/bin/build.js').build;

var buildDir =  __dirname + '/../public/javascripts/';

var buildDir_client = './../node_modules/nodegame-client/build/';
var buildDir_JSUS = './../node_modules/nodegame-client/node_modules/JSUS/build/';
var buildDir_NDDB = './../node_modules/nodegame-client/node_modules/NDDB/build/';
var buildDir_shelf = './../node_modules/nodegame-client/node_modules/shelf.js/build/';

var copyFromDirectory = function(dirIn, dirOut, ext) {
	ext = ext || '.js';
	dirOut = dirOut || buildDir;
	fs.readdir(dirIn, function(err, files){
		if (err) {
			console.log(err);
			throw new Error;
		}
		for (var i in files) {
			if (path.extname(files[i]) === ext) {
				copyFile(dirIn + files[i], dirOut + files[i]);
			}
		}
	});
};

//https://github.com/jprichardson/node-fs-extra/blob/master/lib/copy.js
var copyFile = function(srcFile, destFile, cb) {
    var fdr, fdw;
    fdr = fs.createReadStream(srcFile);
    fdw = fs.createWriteStream(destFile);
    fdr.on('end', function() {
    	if (cb) return cb(null);
    });
    return fdr.pipe(fdw);
};

var deleteIfExist = function(file) {
	file = file || filename;
	if (path.existsSync(file)) {
		var stats = fs.lstatSync(file);
		if (stats.isDirectory()) {
			fs.rmdir(file, function (err) {
				if (err) throw err;  
			});
		}
		else {
			fs.unlink(file, function (err) {
				if (err) throw err;  
			});
		}
		
	}
};

var cleanBuildDir = function(dir, ext) {
	ext = ext || '.js';
	dir = dir || buildDir;
	if (dir[dir.length] !== '/') dir = dir + '/';
	fs.readdir(dir, function(err, files) {
	    files.filter(function(file) { return path.extname(file) ===  ext; })
	         .forEach(function(file) { deleteIfExist(dir + file); });
	    
	    console.log('Build directory cleaned');
	});
}

program
  .version(version);

program  
	.command('clean')
	.description('Removes all files from build folder')
	.action(function(){
		cleanBuildDir();
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
		copyFromDirectory(buildDir_client, buildDir);
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
		
		copyFromDirectory(buildDir_client);
		
		// JSUS
		build_JSUS({
			clean: true,
		});

		copyFromDirectory(buildDir_JSUS);
		
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
		

		copyFromDirectory(buildDir_NDDB);
		
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
		

		copyFromDirectory(buildDir_shelf);
		
		console.log('All javascript files built and copied in /public/javascript/');
});

program
	.command('doc')
	.description('Builds documentation files')
	.action(function(){
		console.log('Building documentation for nodegame-server v.' + version);
		// http://nodejs.org/api.html#_child_processes
		var root =  __dirname + '/../';
		var command = root + 'node_modules/.bin/docker -i ' + root + ' index.js lib/ -o ' + root + 'docs/';
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