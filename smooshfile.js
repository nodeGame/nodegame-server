// Load the smoosh npm packet.
var smoosh = require('smoosh');

var re = new RegExp('node_modules.+');
var m = re.exec(__dirname);

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
        DIST_DIR: '/' + __dirname + '/public/javascripts',
        
        "nodegame": [
        
            // JSUS
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/jsus.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/array.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/dom.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/eval.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/obj.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/random.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/time.js",
            __dirname + "/node_modules/nodegame-client/node_modules/JSUS/lib/parse.js",
            
            // NDDB
            __dirname + "/node_modules/nodegame-client/node_modules/NDDB/nddb.js",
            
            // nodegame-client
            
            // index
            __dirname + "/node_modules/nodegame-client/index.js",
            
            // lib
            
            __dirname + "/node_modules/nodegame-client/lib/EventEmitter.js",
            __dirname + "/node_modules/nodegame-client/lib/GameState.js",
            __dirname + "/node_modules/nodegame-client/lib/PlayerList.js",
            __dirname + "/node_modules/nodegame-client/lib/GameMsg.js",
            __dirname + "/node_modules/nodegame-client/lib/GameLoop.js",
            __dirname + "/node_modules/nodegame-client/lib/GameMsgGenerator.js",
            __dirname + "/node_modules/nodegame-client/lib/GameSocketClient.js",
            __dirname + "/node_modules/nodegame-client/lib/GameDB.js",
            __dirname + "/node_modules/nodegame-client/lib/Game.js",
            
            // nodeGame
            __dirname + "/node_modules/nodegame-client/nodeGame.js",
            
            // addons
            
            __dirname + "/node_modules/nodegame-client/addons/GameTimer.js",
            __dirname + "/node_modules/nodegame-client/addons/TriggerManager.js",
            __dirname + "/node_modules/nodegame-client/addons/GameSession.js",

	        // nodegame-window
            __dirname + "/node_modules/nodegame-window/GameWindow.js",
            __dirname + "/node_modules/nodegame-window/Canvas.js",
            __dirname + "/node_modules/nodegame-window/HTMLRenderer.js",
            __dirname + "/node_modules/nodegame-window/List.js",
            __dirname + "/node_modules/nodegame-window/Table.js",
            
            // nodegame-widgets
            __dirname + "/node_modules/nodegame-widgets/ChernoffFaces.js",
            __dirname + "/node_modules/nodegame-widgets/Controls.js",
            __dirname + "/node_modules/nodegame-widgets/DataBar.js",
            __dirname + "/node_modules/nodegame-widgets/DynamicTable.js",
            __dirname + "/node_modules/nodegame-widgets/EventButton.js",
            __dirname + "/node_modules/nodegame-widgets/GameBoard.js",
            __dirname + "/node_modules/nodegame-widgets/GameSummary.js",
            __dirname + "/node_modules/nodegame-widgets/GameTable.js",
            __dirname + "/node_modules/nodegame-widgets/MsgBar.js",
            __dirname + "/node_modules/nodegame-widgets/NDDBBrowser.js",
            __dirname + "/node_modules/nodegame-widgets/NextPreviousState.js",
            __dirname + "/node_modules/nodegame-widgets/ServerInfoDisplay.js",
            __dirname + "/node_modules/nodegame-widgets/StateBar.js",
            __dirname + "/node_modules/nodegame-widgets/StateDisplay.js",
            __dirname + "/node_modules/nodegame-widgets/VisualState.js",
            __dirname + "/node_modules/nodegame-widgets/VisualTimer.js",
            __dirname + "/node_modules/nodegame-widgets/WaitScreen.js",
            __dirname + "/node_modules/nodegame-widgets/Wall.js",
            
        ],
    }
};

var run_it = function(){
    // Smooshing callback chain
    // More information on how it behaves can be found in the smoosh Readme https://github.com/fat/smoosh
    smoosh
        .config(config) // hand over configurations made above
        // .clean() // removes all files out of the nodegame folder
        .run() // runs jshint on full build
        .build() // builds both uncompressed and compressed files
        .analyze(); // analyzes everything

    console.log('nodegame.js created');
}

run_it();