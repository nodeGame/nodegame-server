#!/usr/bin/env node

/**
 * # nodegame-client build script
 * 
 */

/**
 * Export build
 */

module.exports.build = build;

var smoosh = require('smoosh'),
    path = require('path'),
    pkg = require('../package.json'),
    version = pkg.version;


function build(options) {

	if (!options.bare && !options.JSUS && !options.NDDB && !options.shelf && !options.all && !options.cycle) {
		options.standard = true;
	}
	
	var out = options.output || "nodegame-client";
	
	if (path.extname(out) === '.js') {
		out = path.basename(out, '.js');
	}
	
	console.log('Building nodeGame-client v.' + version + ' with:');

	// Defining variables

	var re = new RegExp('node_modules.+');

	var rootDir = __dirname + '/../';
	var distDir =  rootDir + 'build/';

	// nodegame-client
	var ng_client = [
	 	rootDir + "index.js",
	 // lib
	 	rootDir + "lib/EventEmitter.js",
	 	rootDir + "lib/GameState.js",
	 	rootDir + "lib/PlayerList.js",
	 	rootDir + "lib/GameMsg.js",
	 	rootDir + "lib/GameLoop.js",
	 	rootDir + "lib/GameMsgGenerator.js",
	 	rootDir + "lib/GameSocketClient.js",
	 	rootDir + "lib/GameDB.js",
	 	rootDir + "lib/Game.js", 
	 // nodeGame
	  rootDir + "nodeGame.js",
	];

	// ng-addons
	var ng_addons = [           
	 	rootDir + "addons/GameTimer.js",
	 	rootDir + "addons/TriggerManager.js",
	 	rootDir + "addons/GameSession.js",
	//  rootDir + "node_modules/nodegame-client/addons/WaitingRoom.js",
	];

	// jsus
	var ng_jsus = [
		rootDir + "node_modules/JSUS/jsus.js",
		rootDir + "node_modules/JSUS/lib/array.js",
		rootDir + "node_modules/JSUS/lib/dom.js",
		rootDir + "node_modules/JSUS/lib/eval.js",
		rootDir + "node_modules/JSUS/lib/obj.js",
		rootDir + "node_modules/JSUS/lib/random.js",
		rootDir + "node_modules/JSUS/lib/time.js",
		rootDir + "node_modules/JSUS/lib/parse.js",
	];

	// nddb
	var ng_nddb = [
		rootDir + "node_modules/NDDB/nddb.js",           
	];

	// nodegame-window
	var ng_window = [
		rootDir + "node_modules/nodegame-window/GameWindow.js",
		rootDir + "node_modules/nodegame-window/Canvas.js",
		rootDir + "node_modules/nodegame-window/HTMLRenderer.js",
		rootDir + "node_modules/nodegame-window/List.js",
		rootDir + "node_modules/nodegame-window/Table.js",
	]; 
		
	 // nodegame-widgets
	var ng_widgets = [
		rootDir + "node_modules/nodegame-widgets/ChernoffFaces.js",
		rootDir + "node_modules/nodegame-widgets/Controls.js",
		rootDir + "node_modules/nodegame-widgets/DataBar.js",
		rootDir + "node_modules/nodegame-widgets/DynamicTable.js",
		rootDir + "node_modules/nodegame-widgets/EventButton.js",
		rootDir + "node_modules/nodegame-widgets/GameBoard.js",
		rootDir + "node_modules/nodegame-widgets/GameSummary.js",
		rootDir + "node_modules/nodegame-widgets/GameTable.js",
		rootDir + "node_modules/nodegame-widgets/MsgBar.js",
		rootDir + "node_modules/nodegame-widgets/NDDBBrowser.js",
		rootDir + "node_modules/nodegame-widgets/NextPreviousState.js",
		rootDir + "node_modules/nodegame-widgets/ServerInfoDisplay.js",
		rootDir + "node_modules/nodegame-widgets/StateBar.js",
		rootDir + "node_modules/nodegame-widgets/StateDisplay.js",
		rootDir + "node_modules/nodegame-widgets/VisualState.js",
		rootDir + "node_modules/nodegame-widgets/VisualTimer.js",
		rootDir + "node_modules/nodegame-widgets/WaitScreen.js",
		rootDir + "node_modules/nodegame-widgets/Wall.js",
	];

	var ng_es5 = [
	          	  rootDir + "node_modules/es5-shim/es5-shim.js",       
	          	  ];

	//shelf.js
	var ng_shelf = [
	  rootDir + "node_modules/shelf.js/build/shelf.js",
	];
	
	// CREATING build array
	var files = [];

	// 0. ES5-shim
	if (options.es5 || options.all) {
		if (!path.existsSync(rootDir + "node_modules/es5-shim/")) {
			console.log('  - ERR: es5-shim not found!');
		}
		else {
			console.log('  - es5-shim');
			files = files.concat(ng_es5);
		}
		
	}
	
	// 0. Shelf.js
	if (options.shelf || options.all) {
		if (!path.existsSync(rootDir + "node_modules/shelf.js/")) {
			console.log('  - ERR: shelf.js not found!');
		}
		else {
			var shelfjs_build = rootDir + 'node_modules/shelf.js/build/shelf.js';
			var shelfjs_make = rootDir + 'node_modules/shelf.js/bin/build.js';
			// Build custom shelf.js if not existing
			if (!path.existsSync(shelfjs_build)) {
				console.log('building custom Shelf.js')
				var buildShelf = require(shelfjs_make);
				buildShelf.build({cycle: true});
			}
			
			console.log('  - shelf.js');
			files = files.concat(ng_shelf);
		}
	}
	
	
	// 1. JSUS
	if (options.JSUS || options.all || options.standard) {
		console.log('  - JSUS');
		files = files.concat(ng_jsus);
	}

	// 2. NDDB
	if (options.NDDB || options.all || options.standard) {
		console.log('  - NDDB');
		files = files.concat(ng_nddb);
	}
	 
	// 3. nodegame-client core: always built
	console.log('  - nodegame-client core');
	files = files.concat(ng_client);

	// 4. nodegame-client addons
	if (options.addons || options.all || options.standard) {
		console.log('  - nodegame-client addons');
		files = files.concat(ng_addons);
	}

	// 5. nodegame-window
	if (options.window || options.all) {
		if (!path.existsSync(rootDir + "node_modules/nodegame-window/")) {
			console.log('  - ERR: nodegame-window not found!');
		}
		else {
			console.log('  - nodegame-window');
			files = files.concat(ng_window);
		}
		
	}

	//5. nodegame-widgets
	if (options.widgets || options.all) {
		if (!path.existsSync(rootDir + "node_modules/nodegame-widgets/")) {
			console.log('  - ERR: nodegame-widgets not found!');
		}
		else {
			console.log('  - nodegame-widgets');
			files = files.concat(ng_widgets);
		}
	}

	console.log("\n");
	
	// Configurations for file smooshing.
	var config = {
	    // VERSION : "0.0.1",
	    
	    // Use JSHINT to spot code irregularities.
	    JSHINT_OPTS: {
	        boss: true,
	        forin: true,
	        browser: true,
	    },
	    
	    JAVASCRIPT: {
	        DIST_DIR: '/' + distDir,
	    }
	};
	
	config.JAVASCRIPT[out] = files;

	var run_it = function(){
	    // Smooshing callback chain
	    // More information on how it behaves can be found in the smoosh Readme https://github.com/fat/smoosh
	    var smooshed = smoosh
	    	.config(config) // hand over configurations made above
	    	// .clean() // removes all files out of the nodegame folder
	    	.build(); // builds both uncompressed and compressed files
	        
    	if (options.analyse) {
    		smooshed.run(); // runs jshint on full build
    		smooshed.analyze(); // analyzes everything
    	}

	    console.log('nodeGame-client build created!');
	}

	run_it();
}