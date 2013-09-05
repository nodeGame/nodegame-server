/**
 * # GameWindow
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * GameWindow provides a handy API to interface nodeGame with the 
 * browser window.
 * 
 * Creates a custom root element inside the HTML page, and insert an
 * iframe element inside it.
 * 
 * Dynamic content can be loaded inside the iframe without losing the
 * javascript state inside the page.
 * 
 * Defines a number of pre-defined profiles associated with special
 * configuration of widgets.
 * 
 * Depends on nodegame-client. 
 * GameWindow.Table and GameWindow.List depend on NDDB and JSUS.
 * 
 * Widgets can have custom dependencies, which are checked internally 
 * by the GameWindow engine.
 */
(function (window, node) {
    
    var J = node.JSUS;

    var constants = node.constants;

    var Player = node.Player,
    PlayerList = node.PlayerList,
    GameMsg = node.GameMsg,
    GameMsgGenerator = node.GameMsgGenerator;
    
    var DOM = J.get('DOM');

    if (!DOM) {
        throw new Error('DOM object not found. Aborting');
    }

    GameWindow.prototype = DOM;
    GameWindow.prototype.constructor = GameWindow;

    // Configuration object
    GameWindow.defaults = {};

    // Default settings
    GameWindow.defaults.promptOnleave = true;
    GameWindow.defaults.noEscape = true;
    GameWindow.defaults.cacheDefaults = {
        loadCache:       true,
        storeCacheNow:   false,
        storeCacheLater: false
    };


    /**
     * ## GameWindow constructor
     * 
     * The constructor performs the following operations:
     * 
     *      - creates a root div element (this.root)
     *      - creates an iframe element inside the root element (this.frame)
     *      - defines standard event listeners for showing and hiding elements
     * 
     */
    function GameWindow() {
        var that = this;
	
        if ('undefined' === typeof window) {
	    throw new Error('nodeWindow: no DOM found. Are we in a browser? Aborting.');
        }
        
        if ('undefined' === typeof node) {
	    node.log('nodeWindow: nodeGame not found', 'ERR');
        }
        
        node.log('nodeWindow: loading...');
        
        this.frame = null; // contains an iframe 
        this.mainframe = 'mainframe';
        this.root = null;
        
        this.conf = {};
        
        // ### GameWindow.state
        //
        this.state = constants.is.LOADED;

        // ### GameWindow.areLoading
        // Counts the number of frames currently being loaded
        this.areLoading = 0;

        // ### GameWindow.cache
        // Cache for loaded iframes
        //	
        // Maps URI to a cache object with the following properties:
        //  - `contents` (a string describing the innerHTML or null if not cached),
        //  - optionally 'cacheOnClose' (a bool telling whether to cache the frame when
        //    it is replaced by a new one).
        this.cache = {};

        // ### GameWindow.currentURIs
        // Currently loaded URIs in the internal frames
        //	
        // Maps frame names (e.g. 'mainframe') to the URIs they are showing.
        this.currentURIs = {};

	
        // ### GameWindow.globalLibs
        // Array of strings with the path of the libraries to be loaded in every frame
        this.globalLibs = [];
	
        // ### GameWindow.frameLibs
        // Like `GameWindow.frameLibs`, but contains libraries to be loaded only
        // in specific frames
        this.frameLibs = {};


        this.init();	
    }

    // ## GameWindow methods

    /**
     * ### GameWindow.init
     * 
     * Sets global variables based on local configuration.
     * 
     * Defaults:
     * 
     *      - promptOnleave TRUE
     *      - captures ESC key
     * 
     * @param {object} options Configuration options
     * 
     */
    GameWindow.prototype.init = function (options) {
        options = options || {};
        this.conf = J.merge(GameWindow.defaults, options);
	
        if (this.conf.promptOnleave) {
	    this.promptOnleave();
        }
        else if (this.conf.promptOnleave === false) {
	    this.restoreOnleave();
        }
        
        if (this.conf.noEscape) {
	    this.noEscape();
        }
        else if (this.conf.noEscape === false){
	    this.restoreEscape();
        }
        
    };

    /**
     * ### GameWindow.getElementById
     * 
     * Returns the element with id 'id'. Looks first into the iframe,
     * and then into the rest of the page.
     * 
     * @see GameWindow.getElementsByTagName
     */
    GameWindow.prototype.getElementById = function (id) {
	var el = null; // @TODO: should be init to undefined instead ?
	if (this.frame && this.frame.getElementById) {
	    el = this.frame.getElementById(id);
	}
	if (!el) {
	    el = document.getElementById(id);
	}
	return el; 
    };

    /**
     * ### GameWindow.getElementsByTagName
     * 
     * Returns a list of elements with the given tag name
     *  
     * Looks first into the iframe and then into the rest of the page.
     * 
     * @see GameWindow.getElementById
     * 
     */
    GameWindow.prototype.getElementsByTagName = function (tag) {
	// @TODO: Should that be more similar to GameWindow.getElementById
	return (this.frame) ? this.frame.getElementsByTagName(tag) : document.getElementsByTagName(tag);
    };

    /**
     * ### GameWindow.setup
     * 
     * Setups the page with a predefined configuration of widgets.
     * 
     * @param {string} type The type of page to setup (MONITOR|PLAYER)
     * 
     */
    GameWindow.prototype.setup = function (type){
        var initPage;
        
	if (!this.root) {
	    this.root = document.body;
	    //this.root = this.generateNodeGameRoot();
	}
	
	switch (type) {
	    
	case 'MONITOR':
	    
	    node.widgets.append('NextPreviousState');
	    node.widgets.append('GameSummary');
	    node.widgets.append('StateDisplay');
	    node.widgets.append('StateBar');
	    node.widgets.append('DataBar');
	    node.widgets.append('MsgBar');
	    node.widgets.append('GameBoard');
	    node.widgets.append('ServerInfoDisplay');
	    node.widgets.append('Wall');

	    // Add default CSS
	    if (node.conf.host) {
		this.addCSS(document.body, node.conf.host + '/stylesheets/monitor.css');
	    }
	    
	    break;
	    
	case 'PLAYER':
	    
	    //var maincss = this.addCSS(this.root, 'style.css');
	    this.header     = this.generateHeader();

            if (!document.getElementById('mainframe')) {
                this.addIFrame(this.root,'mainframe');
                this.frame = window.frames[this.mainframe]; // there is no document yet
	        initPage = this.getBlankPage();
	        if (this.conf.noEscape) {
		    // TODO: inject the no escape code here
	        }
	    
	        window.frames[this.mainframe].src = initPage;
	    }

	    node.game.vs    = node.widgets.append('VisualState', this.header);
	    node.game.timer = node.widgets.append('VisualTimer', this.header);
	    //node.game.doneb = node.widgets.append('DoneButton', this.header);
	    node.game.sd    = node.widgets.append('StateDisplay', this.header);

	    node.widgets.append('WaitScreen');

	    // Add default CSS
	    if (node.conf.host) {
		this.addCSS(document.body, node.conf.host + '/stylesheets/player.css');
	    }
	    
	   

	    break;
	    

        case 'SOLO_PLAYER':
	    
            if (!document.getElementById('mainframe')) {
                this.addIFrame(this.root,'mainframe');
                this.frame = window.frames[this.mainframe]; // there is no document yet
	        initPage = this.getBlankPage();
	        if (this.conf.noEscape) {
		    // TODO: inject the no escape code here
		    // not working
		    //this.addJS(initPage, node.conf.host + 'javascripts/noescape.js');
	        }
	        
	        window.frames[this.mainframe].src = initPage;
	    }

            node.widgets.append('WaitScreen');
            
	    // Add default CSS
	    if (node.conf.host) {
		this.addCSS(document.body, node.conf.host + '/stylesheets/player.css');
	    }
	    
	
            
	    break;
	}
	
    };


    /**
     * ### removeLibraries
     *
     * Removes injected scripts from iframe
     *
     * Takes out all the script tags with the className "injectedlib"
     * that were inserted by injectLibraries.
     * 
     * @param {object} frameNode The node object of the iframe
     *
     * @see injectLibraries
     * 
     * @api private
     */
    function removeLibraries (frameNode) {
	var contentDocument = frameNode.contentDocument ? frameNode.contentDocument
	    : frameNode.contentWindow.document;

	var scriptNodes, scriptNodeIdx, scriptNode;

	scriptNodes = contentDocument.getElementsByClassName('injectedlib');
	for (scriptNodeIdx = 0; scriptNodeIdx < scriptNodes.length; ++scriptNodeIdx) {
	    scriptNode = scriptNodes[scriptNodeIdx];
	    scriptNode.parentNode.removeChild(scriptNode);
	}
    }


    /**
     * ### reloadScripts
     *
     * Reloads all script nodes in iframe
     *
     * Deletes and reinserts all the script tags, effectively reloading the scripts.
     * The placement of the tags can change, but the order is kept.
     * 
     * @param {object} frameNode The node object of the iframe
     * 
     * @api private
     */
    function reloadScripts(frameNode) {
        var contentDocument = frameNode.contentDocument ? frameNode.contentDocument
	    : frameNode.contentWindow.document;

        var headNode = contentDocument.getElementsByTagName('head')[0];
        var tag, scriptNodes, scriptNodeIdx, scriptNode;
        var attrIdx, attr;
        
        scriptNodes = contentDocument.getElementsByTagName('script');
        for (scriptNodeIdx = 0; scriptNodeIdx < scriptNodes.length; ++scriptNodeIdx) {
	    // Remove tag:
	    tag = scriptNodes[scriptNodeIdx];
	    tag.parentNode.removeChild(tag);

	    // Reinsert tag for reloading:
	    scriptNode = document.createElement('script');
	    if (tag.innerHTML) scriptNode.innerHTML = tag.innerHTML;
	    for (attrIdx = 0; attrIdx < tag.attributes.length; ++attrIdx) {
		attr = tag.attributes[attrIdx];
		scriptNode.setAttribute(attr.name, attr.value);
	    }
	    headNode.appendChild(scriptNode);
	}
    }


    /**
     * ### injectLibraries
     * 
     * Injects scripts into the iframe
     * 
     * First removes all old injected script tags.
     * Then injects `<script class="injectedlib" src="...">` lines into given
     * iframe object, one for every given library.
     * 
     * @param {object} frameNode The node object of the iframe
     * @param {array} libs An array of strings giving the "src" attribute for the `<script>`
     *                     lines to insert
     * 
     * @api private
     * 
     */
    function injectLibraries(frameNode, libs) {
	var contentDocument = frameNode.contentDocument ? frameNode.contentDocument
	    : frameNode.contentWindow.document;

	var headNode = contentDocument.getElementsByTagName('head')[0];
	var scriptNode;
	var libIdx, lib;

	for (libIdx = 0; libIdx < libs.length; ++libIdx) {
	    lib = libs[libIdx];
	    scriptNode = document.createElement('script');
	    scriptNode.className = 'injectedlib';
	    scriptNode.src = lib;
	    headNode.appendChild(scriptNode);
	}
    }


    /**
     * ### GameWindow.initLibs
     *
     * Specifies the libraries to be loaded automatically in the iframes
     * 
     * This method must be called before any calls to GameWindow.load .
     *
     * @param {array} globalLibs Array of strings describing absolute library paths that
     *    should be loaded in every iframe.
     * @param {object} frameLibs Map from URIs to string arrays (as above) specifying
     *    libraries that should only be loaded for iframes displaying the given URI.
     *    This must not contain any elements that are also in globalLibs.
     *
     */
    GameWindow.prototype.initLibs = function (globalLibs, frameLibs) {
	this.globalLibs = globalLibs || [];
	this.frameLibs = frameLibs || {};
    };


    /**
     * ### GameWindow.preCache
     *
     * Loads the HTML content of the given URIs into the cache
     *
     * @param {array} uris The URIs to cache
     * @param {function} callback The function to call once the caching is done
     *
     */
    GameWindow.prototype.preCache = function(uris, callback) {
	// Don't preload if no URIs are given:
	if (!uris || !uris.length) {
	    if(callback) callback();
	    return;
	}

	var that = this;

	// Keep count of loaded URIs:
	var loadedCount = 0;

	for (var uriIdx = 0; uriIdx < uris.length; ++uriIdx) {
	    var currentUri = uris[uriIdx];

	    // Create an invisible internal frame for the current URI:
	    var iframe = document.createElement('iframe');
	    iframe.style.visibility = 'hidden';
	    var iframeName = 'tmp_iframe_' + uriIdx;
	    iframe.id = iframeName;
	    iframe.name = iframeName;
	    document.body.appendChild(iframe);

	    // Register the onload handler:
	    iframe.onload = (function(uri, thisIframe) {
		return function() {
		    var frameDocumentElement =
			(thisIframe.contentDocument ? thisIframe.contentDocument : thisIframe.contentWindow.document)
			.documentElement;

		    // Store the contents in the cache:
		    that.cache[uri] = { contents: frameDocumentElement.innerHTML,
				        cacheOnClose: false };

		    // Remove the internal frame:
		    document.body.removeChild(thisIframe);

		    // Increment loaded URIs counter:
		    ++ loadedCount;
		    if (loadedCount >= uris.length) {
			// All requested URIs have been loaded at this point.
			if (callback) callback();
		    }
		};
	    })(currentUri, iframe);

	    // Start loading the page:
	    window.frames[iframeName].location = currentUri;
	}
    };


    /**
     * ### handleFrameLoad
     *
     * Handles iframe contents loading
     *
     * A helper method of GameWindow.load .
     * Puts cached contents into the iframe or caches new contents if requested.
     * Handles reloading of script tags and injected libraries.
     * Must be called with `this` set to GameWindow instance.
     *
     * @param {uri} uri URI to load
     * @param {string} frame ID of GameWindow's frame
     * @param {bool} loadCache whether to load from cache
     * @param {bool} storeCache whether to store to cache
     *
     * @see GameWindow.load
     *
     * @api private
     */
    function handleFrameLoad (uri, frame, loadCache, storeCache) {
	var frameNode = document.getElementById(frame);
	var frameDocumentElement =
	    (frameNode.contentDocument ? frameNode.contentDocument : frameNode.contentWindow.document)
	    .documentElement;

	if (loadCache) {
	    // Load frame from cache:
	    frameDocumentElement.innerHTML = this.cache[uri].contents;
	}

	// (Re-)Inject libraries and reload scripts:
	removeLibraries(frameNode);
	if (loadCache) {
	    reloadScripts(frameNode);
	}
	injectLibraries(frameNode, this.globalLibs.concat(uri in this.frameLibs ? this.frameLibs[uri] : []));

	if (storeCache) {
	    // Store frame in cache:
	    this.cache[uri].contents = frameDocumentElement.innerHTML;
	}
    }


    /**
     * ### GameWindow.load
     * 
     * Loads content from an uri (remote or local) into the iframe, 
     * and after it is loaded executes the callback function. 
     * 
     * The third parameter is an options object with the following fields
     * (any fields left out assume the default setting):
     *
     *  - frame (string): The name of the frame in which to load the uri (default: default iframe of the game)
     *  - cache (object): Caching options.  Fields:
     *      * loadMode (string): 'reload' (default; reload page without the cache),
     *                           'cache' (get the page from cache if possible)
     *      * storeMode (string): 'off' (default; don't cache page),
     *                            'onLoad' (cache given page after it is loaded)
     *                            'onClose' (cache given page after it is replaced by a new page)
     * 
     * Warning: Security policies may block this methods, if the 
     * content is coming from another domain.
     * 
     * @param {string} uri The uri to load
     * @param {function} func The callback function to call once the DOM is ready
     * @param {object} opts The options object
     * 
     */
    GameWindow.prototype.load = GameWindow.prototype.loadFrame = function (uri, func, opts) {
        if (!uri) return;
        
        // Default options:
        var frame = this.mainframe;
        var loadCache = GameWindow.defaults.cacheDefaults.loadCache;
        var storeCacheNow = GameWindow.defaults.cacheDefaults.storeCacheNow;
        var storeCacheLater = GameWindow.defaults.cacheDefaults.storeCacheLater;
        
        // Get options:
        if (opts) {
	    if (opts.frame) frame = opts.frame;
            
	    if (opts.cache) {
	        if (opts.cache.loadMode === 'reload') loadCache = false;
	        else if (opts.cache.loadMode === 'cache') loadCache = true;

	        if (opts.cache.storeMode === 'off') {
		    storeCacheNow = false;
		    storeCacheLater = false;
	        }
	        else if (opts.cache.storeMode === 'onLoad') {
		    storeCacheNow = true;
		    storeCacheLater = false;
	        }
	        else if (opts.cache.storeMode === 'onClose') {
		    storeCacheNow = false;
		    storeCacheLater = true;
	        }
	    }
        }

        // Get the internal frame object:
        var iframe = document.getElementById(frame);
        var frameNode;
        var frameDocumentElement;
        // Query readiness (so we know whether onload is going to be called):
        var frameReady = iframe.contentWindow.document.readyState;
        // ...reduce it to a boolean:
        frameReady = (frameReady === 'interactive' || frameReady === 'complete');
        
        // If the last frame requested to be cached on closing, do that:
        var lastURI = this.currentURIs[frame];
        if ((lastURI in this.cache) && this.cache[lastURI].cacheOnClose) {
	    frameNode = document.getElementById(frame);
	    frameDocumentElement =
	        (frameNode.contentDocument ? frameNode.contentDocument : frameNode.contentWindow.document)
	        .documentElement;
            
	    this.cache[lastURI].contents = frameDocumentElement.innerHTML;
        }

        // Create entry for this URI in cache object and store cacheOnClose flag:
        if(!(uri in this.cache)) this.cache[uri] = { contents: null, cacheOnClose: false };
        this.cache[uri].cacheOnClose = storeCacheLater;

        // Disable loadCache if contents aren't cached:
        if(this.cache[uri].contents === null) loadCache = false;

        // Update frame's currently showing URI:
        this.currentURIs[frame] = uri;
        
        this.state = constants.is.LOADING;
        this.areLoading++;  // keep track of nested call to loadFrame
        
        var that = this;
        
        // Add the onload event listener:
        iframe.onload = function() {
	    if (that.conf.noEscape) {
	        
	        // TODO: inject the no escape code here
	        
	        //that.addJS(iframe.document, node.conf.host + 'javascripts/noescape.js');
	        //that.addJS(that.getElementById('mainframe'), node.conf.host + 'javascripts/noescape.js');
	    }
            
	    handleFrameLoad.call(that, uri, frame, loadCache, storeCacheNow);
            
	    that.updateStatus(func, frame);
        };
        
        // Cache lookup:
        if (loadCache) {
	    // Load iframe contents at this point only if the iframe is already "ready"
	    // (see definition of frameReady), otherwise the contents would be cleared
	    // once the iframe becomes ready.  In that case, iframe.onload handles the
	    // filling of the contents.
	    // TODO: Fix code duplication between here and onload function.
	    if (frameReady) {
	        handleFrameLoad.call(this, uri, frame, loadCache, storeCacheNow);
	        
	        // Update status (onload isn't called if frame was already ready):
	        this.updateStatus(func, frame);
	    }
        }
        else {
	    // Update the frame location:
	    window.frames[frame].location = uri;
        }
        
        
        // Adding a reference to nodeGame also in the iframe
        window.frames[frame].window.node = node;
        //		console.log('the frame just as it is');
        //		console.log(window.frames[frame]);
        // Experimental
        //		if (uri === 'blank') {
        //			window.frames[frame].src = this.getBlankPage();
        //			window.frames[frame].location = '';
        //		}
        //		else {
        //			window.frames[frame].location = uri;
        //		}
        
	
    };

    /**
     * ### GameWindow.updateStatus
     * 
     * Cleans up the window state after an iframe has been loaded
     * 
     * The methods performs the following operations:
     * 
     *  - executes a given callback function, 
     *  - decrements the counter of loading iframes
     *  - set the window state as loaded (eventually)
     * 
     * @param {function} A callback function
     * @param {object} The iframe of reference
     * 
     */
    GameWindow.prototype.updateStatus = function(func, frame) {
        // Update the reference to the frame obj
        this.frame = window.frames[frame].document;
        
        if (func) {
	    func.call(node.game); // TODO: Pass the right this reference
	    //node.log('Frame Loaded correctly!');
        }
        
        this.areLoading--;
        
        if (this.areLoading === 0) {
            this.state = constants.is.LOADED;
            node.emit('WINDOW_LOADED');
            
            if (node.game.getStageLevel() >= constants.stageLevels.LOADED) {
                // We must make sure that the step callback is fully executed. 
                // Only the last one to load (between the window and 
                // the callback will emit 'PLAYING'.
                node.emit('PLAYING');
            }
            
        }
        else {
	    node.silly('Attempt to update state, before the window object was loaded');
        }
    };
    
    /**
     * Creates and adds a container div with id 'gn_header' to 
     * the root element. 
     * 
     * If an header element has already been created, deletes it, 
     * and creates a new one.
     * 
     * @TODO: Should be always added as first child
     * 
     */
    GameWindow.prototype.generateHeader = function () {
	if (this.header) {
	    this.header.innerHTML = '';
	    this.header = null;
	}
	
	return this.addElement('div', this.root, 'gn_header');
    };


    // Overriding Document.write and DOM.writeln and DOM.write
    GameWindow.prototype._write = DOM.write;
    GameWindow.prototype._writeln = DOM.writeln;
    /**
     * ### GameWindow.write
     * 
     * Appends a text string, an HTML node or element inside
     * the specified root element. 
     * 
     * If no root element is specified, the default screen is 
     * used.
     * 
     * @see GameWindow.writeln
     * 
     */
    GameWindow.prototype.write = function (text, root) {
	root = root || this.getScreen();
	if (!root) {
	    node.log('Could not determine where writing', 'ERR');
	    return false;
	}
	return this._write(root, text);
    };

    /**
     * ### GameWindow.writeln
     * 
     * Appends a text string, an HTML node or element inside
     * the specified root element, and adds a break element
     * immediately afterwards.
     * 
     * If no root element is specified, the default screen is 
     * used.
     * 
     * @see GameWindow.write
     * 
     */
    GameWindow.prototype.writeln = function (text, root, br) {
	root = root || this.getScreen();
	if (!root) {
	    node.log('Could not determine where writing', 'ERR');
	    return false;
	}
	return this._writeln(root, text, br);
    };


    /**
     * ### GameWindow.toggleInputs
     * 
     * Enables / Disables all input in a container with id @id.
     * If no container with id @id is found, then the whole document is used.
     * 
     * If @op is defined, all the input are set to @op, otherwise, the disabled
     * property is toggled. (i.e. false means enable, true means disable) 
     * 
     */
    GameWindow.prototype.toggleInputs = function (id, op) {
	var container;
	
	if ('undefined' !== typeof id) {
	    container = this.getElementById(id);
	}
	if ('undefined' === typeof container) {
	    container = this.frame.body;
	}
	
	var inputTags = ['button', 'select', 'textarea', 'input'];

	var j=0;
	for (;j<inputTags.length;j++) {
	    var all = container.getElementsByTagName(inputTags[j]);
	    var i=0;
	    var max = all.length;
	    for (; i < max; i++) {
		
		// If op is defined do that
		// Otherwise toggle
		state = ('undefined' !== typeof op) ? op 
		    : all[i].disabled ? false 
		    : true;
		
		if (state) {
		    all[i].disabled = state;
		}
		else {
		    all[i].removeAttribute('disabled');
		}
	    }
	}
    };

    /**
     * Creates a div element with the given id and 
     * tries to append it in the following order to:
     * 
     *      - the specified root element
     *      - the body element
     *      - the last element of the document
     * 
     * If it fails, it creates a new body element, appends it
     * to the document, and then appends the div element to it.
     * 
     * Returns the newly created root element.
     * 
     * @api private
     * 
     */
    GameWindow.prototype._generateRoot = function (root, id) {
	root = root || document.body || document.lastElementChild;
	if (!root) {
	    this.addElement('body', document);
	    root = document.body;
	}
	this.root = this.addElement('div', root, id);
	return this.root;
    };


    /**
     * Creates a div element with id 'nodegame' and returns it.
     * 
     * @see GameWindow._generateRoot()
     * 
     */
    GameWindow.prototype.generateNodeGameRoot = function (root) {
	return this._generateRoot(root, 'nodegame');
    };

    /**
     * Creates a div element with id 'nodegame' and returns it.
     * 
     * @see GameWindow._generateRoot()
     * 
     */
    GameWindow.prototype.generateRandomRoot = function (root, id) {
	return this._generateRoot(root, this.generateUniqueId());
    };

    // Useful

    /**
     * Creates an HTML button element that will emit the specified
     * nodeGame event when clicked and returns it.
     * 
     */
    GameWindow.prototype.getEventButton = function (event, text, id, attributes) {
	if (!event) return;
	var b = this.getButton(id, text, attributes);
	b.onclick = function () {
	    node.emit(event);
	};
	return b;
    };

    /**
     * Adds an EventButton to the specified root element.
     * 
     * If no valid root element is provided, it is append as last element
     * in the current screen.
     * 
     * @see GameWindow.getEventButton
     * 
     */
    GameWindow.prototype.addEventButton = function (event, text, root, id, attributes) {
	if (!event) return;
	if (!root) {
            //			var root = root || this.frame.body;
            //			root = root.lastElementChild || root;
	    root = this.getScreen();
	}
	var eb = this.getEventButton(event, text, id, attributes);
	return root.appendChild(eb);
    };


    //Useful API

    /**
     * Creates an HTML select element already populated with the 
     * of the data of other players.
     * 
     * @TODO: adds options to control which players/servers to add.
     * 
     * @see GameWindow.addRecipientSelector
     * @see GameWindow.addStandardRecipients
     * @see GameWindow.populateRecipientSelector
     * 
     */
    GameWindow.prototype.getRecipientSelector = function (id) {
	var toSelector = document.createElement('select');
	if ('undefined' !== typeof id) {
	    toSelector.id = id;
	}
	this.addStandardRecipients(toSelector);
	return toSelector;
    };

    /**
     * Appends a RecipientSelector element to the specified root element.
     * 
     * Returns FALSE if no valid root element is found.
     * 
     * @TODO: adds options to control which players/servers to add.
     * 
     * @see GameWindow.addRecipientSelector
     * @see GameWindow.addStandardRecipients 
     * @see GameWindow.populateRecipientSelector
     * 
     */
    GameWindow.prototype.addRecipientSelector = function (root, id) {
	if (!root) return false;
	var toSelector = this.getRecipientSelector(id);
	return root.appendChild(toSelector);		
    };

    /**
     * ## GameWindow.addStandardRecipients
     * 
     * Adds an ALL and a SERVER option to a specified select element.
     * 
     * @TODO: adds options to control which players/servers to add.
     * 
     * @param {object} toSelector An HTML `<select>` element 
     * 
     * @see GameWindow.populateRecipientSelector
     */
    GameWindow.prototype.addStandardRecipients = function (toSelector) {
	
	var opt = document.createElement('option');
	opt.value = 'ALL';
	opt.appendChild(document.createTextNode('ALL'));
	toSelector.appendChild(opt);
	
	opt = document.createElement('option');
	opt.value = 'SERVER';
	opt.appendChild(document.createTextNode('SERVER'));
	toSelector.appendChild(opt);
	
    };

    /**
     * Adds all the players from a specified playerList object to a given
     * select element.
     * 
     * @see GameWindow.addStandardRecipients 
     * 
     */
    GameWindow.prototype.populateRecipientSelector = function (toSelector, playerList) {
	if ('object' !==  typeof playerList || 'object' !== typeof toSelector) return;

	this.removeChildrenFromNode(toSelector);
	this.addStandardRecipients(toSelector);
	
	var players, opt;
	
	// check if it is a DB or a PlayerList object
	players = playerList.db || playerList; 
	
	J.each(players, function(p) {
	    opt = document.createElement('option');
	    opt.value = p.id;
	    opt.appendChild(document.createTextNode(p.name || p.id));
	    toSelector.appendChild(opt);
	});
    };

    /**
     * Creates an HTML select element with all the predefined actions
     * (SET,GET,SAY,SHOW*) as options and returns it.
     * 
     * *not yet implemented
     * 
     * @see GameWindow.addActionSelector
     * 
     */
    GameWindow.prototype.getActionSelector = function (id) {
	var actionSelector = document.createElement('select');
	if ('undefined' !== typeof id ) {
	    actionSelector.id = id;
	}
	this.populateSelect(actionSelector, node.actions);
	return actionSelector;
    };

    /**
     * Appends an ActionSelector element to the specified root element.
     * 
     * @see GameWindow.getActionSelector
     * 
     */
    GameWindow.prototype.addActionSelector = function (root, id) {
	if (!root) return;
	var actionSelector = this.getActionSelector(id);
	return root.appendChild(actionSelector);
    };

    /**
     * Creates an HTML select element with all the predefined targets
     * (HI,TXT,DATA, etc.) as options and returns it.
     * 
     * *not yet implemented
     * 
     * @see GameWindow.addActionSelector
     * 
     */
    GameWindow.prototype.getTargetSelector = function (id) {
	var targetSelector = document.createElement('select');
	if ('undefined' !== typeof id ) {
	    targetSelector.id = id;
	}
	this.populateSelect(targetSelector, node.targets);
	return targetSelector;
    };

    /**
     * Appends a Target Selector element to the specified root element.
     * 
     * @see GameWindow.getTargetSelector
     * 
     */
    GameWindow.prototype.addTargetSelector = function (root, id) {
	if (!root) return;
	var targetSelector = this.getTargetSelector(id);
	return root.appendChild(targetSelector);
    };


    /**
     * @experimental
     * 
     * Creates an HTML text input element where a nodeGame state can
     * be inserted. This method should be improved to automatically
     * show all the available states of a game.
     * 
     * @see GameWindow.addActionSelector
     */
    GameWindow.prototype.getStateSelector = function (id) {
	var stateSelector = this.getTextInput(id);
	return stateSelector;
    };

    /**
     * @experimental
     * 
     * Appends a StateSelector to the specified root element.
     * 
     * @see GameWindow.getActionSelector
     * 
     */
    GameWindow.prototype.addStateSelector = function (root, id) {
	if (!root) return;
	var stateSelector = this.getStateSelector(id);
	return root.appendChild(stateSelector);
    };


    // Do we need it?

    /**
     * Overrides JSUS.DOM.generateUniqueId
     * 
     * @experimental
     * @TODO: it is not always working fine. 
     * @TODO: fix doc
     * 
     */
    GameWindow.prototype.generateUniqueId = function (prefix) {
	var id = '' + (prefix || J.randomInt(0, 1000));
	var found = this.getElementById(id);
	
	while (found) {
	    id = '' + prefix + '_' + J.randomInt(0, 1000);
	    found = this.getElementById(id);
	}
	return id;
    };



    // Where to place them?

    /**
     * ### GameWindow.noEscape
     * 
     * Binds the ESC key to a function that always returns FALSE.
     * 
     * This prevents socket.io to break the connection with the
     * server.
     * 
     * @param {object} windowObj Optional. The window container in which binding the ESC key
     */
    GameWindow.prototype.noEscape = function (windowObj) {
	windowObj = windowObj || window;
	windowObj.document.onkeydown = function(e) {
	    var keyCode = (window.event) ? event.keyCode : e.keyCode;
	    if (keyCode === 27) {
		return false;
	    }
	}; 
    };

    /**
     * ### GameWindow.restoreEscape
     * 
     * Removes the the listener on the ESC key.
     * 
     * @param {object} windowObj Optional. The window container in which binding the ESC key
     * @see GameWindow.noEscape()
     */
    GameWindow.prototype.restoreEscape = function (windowObj) {
	windowObj = windowObj || window;
	windowObj.document.onkeydown = null;
    };



    /**
     * ### GameWindow.promptOnleave
     * 
     * Captures the onbeforeunload event, and warns the user
     * that leaving the page may halt the game.
     * 
     * @param {object} windowObj Optional. The window container in which binding the ESC key
     * @param {string} text Optional. A text to be displayed in the alert message. 
     * 
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     * 
     */
    GameWindow.prototype.promptOnleave = function (windowObj, text) {
	windowObj = windowObj || window;
	text = ('undefined' === typeof text) ? this.conf.textOnleave : text; 
	windowObj.onbeforeunload = function(e) {
	    e = e || window.event;
	    // For IE<8 and Firefox prior to version 4
	    if (e) {
		e.returnValue = text;
	    }
	    // For Chrome, Safari, IE8+ and Opera 12+
	    return text;
	};
    };

    /**
     * ### GameWindow.restoreOnleave
     * 
     * Removes the onbeforeunload event listener.
     * 
     * @param {object} windowObj Optional. The window container in which binding the ESC key
     * 
     * @see GameWindow.promptOnleave
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     * 
     */
    GameWindow.prototype.restoreOnleave = function (windowObj) {
	windowObj = windowObj || window;
	windowObj.onbeforeunload = null;
    };

    // Do we need these?

    /**
     * Returns the screen of the game, i.e. the innermost element
     * inside which to display content. 
     * 
     * In the following order the screen can be:
     * 
     *      - the body element of the iframe 
     *      - the document element of the iframe 
     *      - the body element of the document 
     *      - the last child element of the document
     * 
     */
    GameWindow.prototype.getScreen = function() {
	var el = this.frame;
	if (el) {
	    el = this.frame.body || el;
	}
	else {
	    el = document.body || document.lastElementChild;
	}
	return el;
    };

    /**
     * Returns the document element of the iframe of the game.
     * 
     * @TODO: What happens if the mainframe is not called mainframe?
     */
    GameWindow.prototype.getFrame = function() {
	return this.frame = window.frames['mainframe'].document;
    };



    //Expose nodeGame to the global object
    node.window = new GameWindow();
    if ('undefined' !== typeof window) window.W = node.window;
    
})(
    // GameWindow works only in the browser environment. The reference 
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);

// ## Game incoming listeners
// Incoming listeners are fired in response to incoming messages
(function (node, window) {
	
	
    node.on('NODEGAME_GAME_CREATED', function() {
	window.init(node.conf.window);
    });
    
    node.on('HIDE', function(id) {
	var el = window.getElementById(id);
	if (!el) {
	    node.log('Cannot hide element ' + id);
	    return;
	}
	el.style.visibility = 'hidden';    
    });
    
    node.on('SHOW', function(id) {
	var el = window.getElementById(id);
	if (!el) {
	    node.log('Cannot show element ' + id);
	    return;
	}
	el.style.visibility = 'visible'; 
    });
    
    node.on('TOGGLE', function(id) {
	var el = window.getElementById(id);
	if (!el) {
	    node.log('Cannot toggle element ' + id);
	    return;
	}
	if (el.style.visibility === 'visible') {
	    el.style.visibility = 'hidden';
	}
	else {
	    el.style.visibility = 'visible';
	}
    });
	
    // Disable all the input forms found within a given id element
    node.on('INPUT_DISABLE', function(id) {
	window.toggleInputs(id, true);			
    });
    
    // Disable all the input forms found within a given id element
    node.on('INPUT_ENABLE', function(id) {
	window.toggleInputs(id, false);
    });
    
    // Disable all the input forms found within a given id element
    node.on('INPUT_TOGGLE', function(id) {
	window.toggleInputs(id);
    });
    
    node.log('node-window: listeners added');
	
})(
    'undefined' !== typeof node ? node : undefined
 ,  'undefined' !== typeof node.window ? node.window : undefined			
); 
// <!-- ends nodegame-window listener -->
(function(exports) {
	
	/*!
	* Canvas
	* 
	*/ 
	
	exports.Canvas = Canvas;
	
	function Canvas(canvas) {

		this.canvas = canvas;
		// 2D Canvas Context 
		this.ctx = canvas.getContext('2d');
		
		this.centerX = canvas.width / 2;
		this.centerY = canvas.height / 2;
		
		this.width = canvas.width;
		this.height = canvas.height;
		
//		console.log(canvas.width);
//		console.log(canvas.height);		
	}
	
	Canvas.prototype = {
				
		constructor: Canvas,
		
		drawOval: function (settings) {
		
			// We keep the center fixed
			var x = settings.x / settings.scale_x;
			var y = settings.y / settings.scale_y;
		
			var radius = settings.radius || 100;
			//console.log(settings);
			//console.log('X,Y(' + x + ', ' + y + '); Radius: ' + radius + ', Scale: ' + settings.scale_x + ',' + settings.scale_y);
			
			this.ctx.lineWidth = settings.lineWidth || 1;
			this.ctx.strokeStyle = settings.color || '#000000';
			
			this.ctx.save();
			this.ctx.scale(settings.scale_x, settings.scale_y);
			this.ctx.beginPath();
			this.ctx.arc(x, y, radius, 0, Math.PI*2, false);
			this.ctx.stroke();
			this.ctx.closePath();
			this.ctx.restore();
		},
		
		drawLine: function (settings) {
		
			var from_x = settings.x;
			var from_y = settings.y;
		
			var length = settings.length;
			var angle = settings.angle;
				
			// Rotation
			var to_x = - Math.cos(angle) * length + settings.x;
			var to_y =  Math.sin(angle) * length + settings.y;
			//console.log('aa ' + to_x + ' ' + to_y);
			
			//console.log('From (' + from_x + ', ' + from_y + ') To (' + to_x + ', ' + to_y + ')');
			//console.log('Length: ' + length + ', Angle: ' + angle );
			
			this.ctx.lineWidth = settings.lineWidth || 1;
			this.ctx.strokeStyle = settings.color || '#000000';
			
			this.ctx.save();
			this.ctx.beginPath();
			this.ctx.moveTo(from_x,from_y);
			this.ctx.lineTo(to_x,to_y);
			this.ctx.stroke();
			this.ctx.closePath();
			this.ctx.restore();
		},
		
		scale: function (x,y) {
			this.ctx.scale(x,y);
			this.centerX = this.canvas.width / 2 / x;
			this.centerY = this.canvas.height / 2 / y;
		},
		
		clear: function() {
			this.ctx.clearRect(0, 0, this.width, this.height);
			// For IE
			var w = this.canvas.width;
			this.canvas.width = 1;
			this.canvas.width = w;
		}
		
	};
})(node.window);
/**
 * # HTMLRenderer
 * 
 * Renders javascript objects into HTML following a pipeline
 * of decorator functions.
 * 
 * The default pipeline always looks for a `content` property and 
 * performs the following operations:
 * 
 * - if it is already an HTML element, returns it;
 * - if it contains a  #parse() method, tries to invoke it to 
 * 	generate HTML;
 * - if it is an object, tries to render it as a table of 
 *   key:value pairs; 
 * - finally, creates an HTML text node with it and returns it
 * 
 * 
 * Depends on the nodegame-client add-on TriggerManager
 * 
 */

(function(exports, window, node){
	
// ## Global scope	
	
var document = window.document,
	JSUS = node.JSUS;

var TriggerManager = node.TriggerManager;

exports.HTMLRenderer = HTMLRenderer;
exports.HTMLRenderer.Entity = Entity;

/**
 * ## HTMLRenderer constructor
 * 
 * Creates a new instance of HTMLRenderer
 * 
 * @param {object} options A configuration object
 */
function HTMLRenderer (options) {
	
// ## Public properties

// ### TriggerManager.options	
	this.options = options || {};
// ### HTMLRenderer.tm
// TriggerManager instance	
	this.tm = new TriggerManager();
	
	this.init(this.options);
}

//## HTMLRenderer methods

/**
 * ### HTMLRenderer.init
 * 
 * Configures the HTMLRenderer instance
 * 
 * Takes the configuration as an input parameter or 
 * recycles the settings in `this.options`.
 * 
 * The configuration object is of the type
 * 
 * 	var options = {
 * 		returnAt: 'first', // or 'last'
 * 		render: [ myFunc,
 * 				  myFunc2 
 * 		],
 * 	} 
 * 	 
 * @param {object} options Optional. Configuration object
 * 
 */
HTMLRenderer.prototype.init = function (options) {
	options = options || this.options;
	this.options = options;
	
	this.reset();
	
	if (options.returnAt) {
		this.tm.returnAt = options.returnAt;
	}
	
	if (options.pipeline) {
		this.tm.initTriggers(options.pipeline);
	}
};



/**
 * ### HTMLRenderer.reset
 * 
 * Deletes all registered render function and restores the default 
 * pipeline 
 * 
 */
HTMLRenderer.prototype.reset = function () {
	this.clear(true);
	this.addDefaultPipeline();
};

/**
 * ### HTMLRenderer.addDefaultPipeline
 * 
 * Registers the set of default render functions
 * 
 */
HTMLRenderer.prototype.addDefaultPipeline = function() {
	this.tm.addTrigger(function(el){
		return document.createTextNode(el.content);
	});
	
	this.tm.addTrigger(function (el) {
		if (!el) return;
		if (el.content && 'object' === typeof el.content) {
			var div = document.createElement('div');
			for (var key in el.content) {
				if (el.content.hasOwnProperty(key)) {
					var str = key + ':\t' + el.content[key];
					div.appendChild(document.createTextNode(str));
					div.appendChild(document.createElement('br'));
				}
			}
			return div;
		}
	});
	
	this.tm.addTrigger(function (el) { 
		if (!el) return;
		if (el.content && el.content.parse && 'function' === typeof el.content.parse) {
			var html = el.content.parse();
			if (JSUS.isElement(html) || JSUS.isNode(html)) {
				return html;
			}
		}
	});	
	
	this.tm.addTrigger(function (el) { 
		if (!el) return;
		if (JSUS.isElement(el.content) || JSUS.isNode(el.content)) {
			return el.content;
		}
	});
};


/**
 * ### HTMLRenderer.clear
 * 
 * Deletes all registered render functions
 * 
 * @param {boolean} clear TRUE, to confirm the clearing
 * @return {boolean} TRUE, if clearing is successful
 */
HTMLRenderer.prototype.clear = function (clear) {
	return this.tm.clear(clear);
};

/**
 * ### HTMLRenderer.addRenderer
 * 
 * Registers a new render function
 * 
 * @param {function} renderer The function to add
 * @param {number} pos Optional. The position of the renderer in the pipeline
 * @return {boolean} TRUE, if insertion is successful
 */	  
HTMLRenderer.prototype.addRenderer = function (renderer, pos) {
	return this.tm.addTrigger(renderer, pos);
};

/**
 * ### HTMLRenderer.removeRenderer
 * 
 * Removes a render function from the pipeline
 * 
 * @param {function} renderer The function to remove
 * @return {boolean} TRUE, if removal is successful
 */	  
HTMLRenderer.prototype.removeRenderer = function (renderer) {
	return this.tm.removeTrigger(renderer);
};

/**
 * ### HTMLRenderer.render
 * 
 * Runs the pipeline of render functions on a target object
 * 
 * @param {object} o The target object
 * @return {object} The target object after exiting the pipeline
 * 
 * @see TriggerManager.pullTriggers
 */	
HTMLRenderer.prototype.render = function (o) {
	return this.tm.pullTriggers(o);
};

/**
 * ### HTMLRenderer.size
 * 
 * Counts the number of render functions in the pipeline
 * 
 * @return {number} The number of render functions in the pipeline
 */
HTMLRenderer.prototype.size = function () {
	return this.tm.triggers.length;
};

/**
 * # Entity
 * 
 * Abstract representation of an HTML entity
 * 
 */ 

/**
 * ## Entity constructor
 * 
 * Creates a new instace of Entity
 * 
 * @param {object} The object to transform in entity
 */
function Entity (e) {
	e = e || {};
	this.content = ('undefined' !== typeof e.content) ? e.content : '';
	this.className = ('undefined' !== typeof e.style) ? e.style : null;
}
	
})(
	('undefined' !== typeof node) ? node.window || node : module.exports, // Exports
	('undefined' !== typeof window) ? window : module.parent.exports.window, // window
	('undefined' !== typeof node) ? node : module.parent.exports.node // node
);

(function(exports, node){
	
	var JSUS = node.JSUS;
	var NDDB = node.NDDB;

	var HTMLRenderer = node.window.HTMLRenderer;
	var Entity = node.window.HTMLRenderer.Entity;
	
	/*!
	* 
	* List: handle list operation
	* 
	*/
	
	exports.List = List;
	
	List.prototype = new NDDB();
	List.prototype.constructor = List;	
	
	function List (options, data) {
		options = options || {};
		this.options = options;
		
		NDDB.call(this, options, data); 
		
		this.id = options.id || 'list_' + Math.round(Math.random() * 1000);
		
		this.DL = null;
		this.auto_update = this.options.auto_update || false;
		this.htmlRenderer = null; 
		this.lifo = false;
		
		this.init(this.options);
	}
	
	// TODO: improve init
	List.prototype.init = function (options) {
		options = options || this.options;
		
		this.FIRST_LEVEL = options.first_level || 'dl';
		this.SECOND_LEVEL = options.second_level || 'dt';
		this.THIRD_LEVEL = options.third_level || 'dd';
		
		this.last_dt = 0;
		this.last_dd = 0;
		this.auto_update = ('undefined' !== typeof options.auto_update) ? options.auto_update
																		: this.auto_update;
		
		var lifo = this.lifo = ('undefined' !== typeof options.lifo) ? options.lifo : this.lifo;
		
		this.globalCompare = function (o1, o2) {
			if (!o1 && !o2) return 0;
			if (!o2) return 1;
			if (!o1) return -1;

			// FIFO
			if (!lifo) {
				if (o1.dt < o2.dt) return -1;
				if (o1.dt > o2.dt) return 1;
			}
			else {
				if (o1.dt < o2.dt) return 1;
				if (o1.dt > o2.dt) return -1;
			}
			if (o1.dt === o2.dt) {
				if ('undefined' === typeof o1.dd) return -1;
				if ('undefined'=== typeof o2.dd) return 1;
				if (o1.dd < o2.dd) return -1;
				if (o1.dd > o2.dd) return 1;
				if (o1.nddbid < o2.nddbid) return 1;
				if (o1.nddbid > o2.nddbid) return -1;
			}
			return 0;
		}; 
		
		
		this.DL = options.list || document.createElement(this.FIRST_LEVEL);
		this.DL.id = options.id || this.id;
		if (options.className) {
			this.DL.className = options.className;
		}
		if (this.options.title) {
			this.DL.appendChild(document.createTextNode(options.title));
		}
		
		// was
		//this.htmlRenderer = new HTMLRenderer({renderers: options.renderer});
		this.htmlRenderer = new HTMLRenderer({render: options.render});
	};
	
	List.prototype._add = function (node) {
		if (!node) return;
//		console.log('about to add node');
//		console.log(node);
		this.insert(node);
		if (this.auto_update) {
			this.parse();
		}
	};
	
	List.prototype.addDT = function (elem, dt) {
		if ('undefined' === typeof elem) return;
		this.last_dt++;
		dt = ('undefined' !== typeof dt) ? dt: this.last_dt;  
		this.last_dd = 0;
		var node = new Node({dt: dt, content: elem});
		return this._add(node);
	};
	
	List.prototype.addDD = function (elem, dt, dd) {
		if ('undefined' === typeof elem) return;
		dt = ('undefined' !== typeof dt) ? dt: this.last_dt;
		dd = ('undefined' !== typeof dd) ? dd: this.last_dd++;
		var node = new Node({dt: dt, dd: dd, content: elem});
		return this._add(node);
	};
	
	List.prototype.parse = function() {
		this.sort();
		var old_dt = null;
		var old_dd = null;
		
		var appendDT = function() {
			var node = document.createElement(this.SECOND_LEVEL);
			this.DL.appendChild(node);
			old_dd = null;
			old_dt = node;
			return node;
		};
		
		var appendDD = function() {
			var node = document.createElement(this.THIRD_LEVEL);
//			if (old_dd) {
//				old_dd.appendChild(node);
//			}
//			else if (!old_dt) {
//				old_dt = appendDT.call(this);
//			}
//			old_dt.appendChild(node);
			this.DL.appendChild(node);
//			old_dd = null;
//			old_dt = node;
			return node;
		};
		
		// Reparse all every time
		// TODO: improve this
		if (this.DL) {
			while (this.DL.hasChildNodes()) {
				this.DL.removeChild(this.DL.firstChild);
			}
			if (this.options.title) {
				this.DL.appendChild(document.createTextNode(this.options.title));
			}
		}
		
		for (var i=0; i<this.db.length; i++) {
			var el = this.db[i];
			var node;
			if ('undefined' === typeof el.dd) {
				node = appendDT.call(this);
				//console.log('just created dt');
			}
			else {
				node = appendDD.call(this);
			}
//			console.log('This is the el')
//			console.log(el);
			var content = this.htmlRenderer.render(el);
//			console.log('This is how it is rendered');
//			console.log(content);
			node.appendChild(content);		
		}
		
		return this.DL;
	};
	
	List.prototype.getRoot = function() {
		return this.DL;
	};
	
	
	
//	List.prototype.createItem = function(id) {
//		var item = document.createElement(this.SECOND_LEVEL);
//		if (id) {
//			item.id = id;
//		}
//		return item;
//	};
	
	// Cell Class
	Node.prototype = new Entity();
	Node.prototype.constructor = Node;
	
	function Node (node) {
		Entity.call(this, node);
		this.dt = ('undefined' !== typeof node.dt) ? node.dt : null;
		if ('undefined' !== typeof node.dd) {
			this.dd = node.dd;
		}
	}
	
})(
	('undefined' !== typeof node) ? (('undefined' !== typeof node.window) ? node.window : node) : module.parent.exports, 
	('undefined' !== typeof node) ? node : module.parent.exports
);

(function(exports, window, node) {
	
//	console.log('---------')
//	console.log(node.window);
	
	var document = window.document;
	
	/*!
	* 
	* Table: abstract representation of an HTML table
	* 
	*/
	exports.Table = Table;
	exports.Table.Cell = Cell;
	
	// For simple testing
	// module.exports = Table;
	
	var JSUS = node.JSUS;
	var NDDB = node.NDDB;
	var HTMLRenderer = node.window.HTMLRenderer;
	var Entity = node.window.HTMLRenderer.Entity;
	
	
	Table.prototype = JSUS.clone(NDDB.prototype);
	//Table.prototype = new NDDB();
	Table.prototype.constructor = Table;	
	
	Table.H = ['x','y','z'];
	Table.V = ['y','x', 'z'];
	
	Table.log = node.log;
	
	function Table (options, data, parent) {
		options = options || {};
		
		Table.log = options.log || Table.log;
		this.defaultDim1 = options.defaultDim1 || 'x';
		this.defaultDim2 = options.defaultDim2 || 'y';
		this.defaultDim3 = options.defaultDim3 || 'z';
		
		this.table = options.table || document.createElement('table'); 
		this.id = options.id || 'table_' + Math.round(Math.random() * 1000);
		
		this.auto_update = ('undefined' !== typeof options.auto_update) ? options.auto_update : false;
		
		// Class for missing cells
		this.missing = options.missing || 'missing';
		this.pointers = {
						x: options.pointerX || 0,
						y: options.pointerY || 0,
						z: options.pointerZ || 0
		};
		
		this.header = [];
		this.footer = [];
		
		this.left = [];
		this.right = [];
		
		
		NDDB.call(this, options, data, parent);  
		
		// From NDDB
		this.options = this.__options;
	}
  
	// TODO: improve init
	Table.prototype.init = function (options) {
		NDDB.prototype.init.call(this, options);
		
		options = options || this.options;
		if ('undefined' !== typeof options.id) {
			
			this.table.id = options.id;
			this.id = options.id;
		}
		if (options.className) {
			this.table.className = options.className;
		}
		this.initRenderer(options.render);
	};
	
	Table.prototype.initRenderer = function (options) {
		options = options || {};
		this.htmlRenderer = new HTMLRenderer(options);
		this.htmlRenderer.addRenderer(function(el) {
			if ('object' === typeof el.content) {
				var tbl = new Table();
				for (var key in el.content) {
					if (el.content.hasOwnProperty(key)){
						tbl.addRow([key,el.content[key]]);
					}
				}
				return tbl.parse();
			}
		}, 2);		
	};
  
	// TODO: make it 3D
	Table.prototype.get = function (x, y) {
		var out = this;
		if ('undefined' !== typeof x) {
			out = this.select('x','=',x);
		}
		if ('undefined' !== typeof y) {
			out = out.select('y','=',y);
		}

		return out.fetch();
	};
  
	Table.prototype.addClass = function (c) {
		if (!c) return;
		if (c instanceof Array) c = c.join(' ');
		this.forEach(function (el) {
			node.window.addClass(el, c);
		});
		
		if (this.auto_update) {
			this.parse();
		}
		
		return this;
	};

	// Depends on node.window
	Table.prototype.removeClass = function (c) {
		if (!c) return;
		
		var func;
		if (c instanceof Array) {
			func = function(el, c) {
				for (var i=0; i< c.length; i++) {
					node.window.removeClass(el, c[i]);
				}
			};
		}
		else {
			func = node.window.removeClass;
		}
		
		this.forEach(function (el) {
			func.call(this,el,c);
		});
		
		if (this.auto_update) {
			this.parse();
		}
		
		return this;
	};
  
	Table.prototype._addSpecial = function (data, type) {
		if (!data) return;
		type = type || 'header';
		if ('object' !== typeof data) {
			return {content: data, type: type};
		}
		
		var out = [];
		for (var i=0; i < data.length; i++) {
			out.push({content: data[i], type: type});
		} 
		return out;
	};
  

	Table.prototype.setHeader = function (header) {
		this.header = this._addSpecial(header);
	};

	Table.prototype.add2Header = function (header) {
		this.header = this.header.concat(this._addSpecial(header));
	};
  
	Table.prototype.setLeft = function (left) {
		this.left = this._addSpecial(left, 'left');
	};
	
	Table.prototype.add2Left = function (left) {
		this.left = this.left.concat(this._addSpecial(left, 'left'));
	};

	// TODO: setRight  
	//Table.prototype.setRight = function (left) {
	//	this.right = this._addSpecial(left, 'right');
	//};
  
	Table.prototype.setFooter = function (footer) {
		this.footer = this._addSpecial(footer, 'footer');
	};
	
	Table._checkDim123 = function (dims) {
		var t = Table.H.slice(0);
		for (var i=0; i< dims.length; i++) {
			if (!JSUS.removeElement(dims[i],t)) return false;
		}
		return true;
	};
  
	/**
	* Updates the reference to the foremost element in the table. 
	* 
	* @param 
	*/
	Table.prototype.updatePointer = function (pointer, value) {
		if (!pointer) return false;
		if (!JSUS.in_array(pointer, Table.H)) {
			Table.log('Cannot update invalid pointer: ' + pointer, 'ERR');
			return false;
		}
		
		if (value > this.pointers[pointer]) {
			this.pointers[pointer] = value;
			return true;
		}
		
	};
  
	Table.prototype._add = function (data, dims, x, y, z) {
		if (!data) return false;
		if (dims) {
			if (!Table._checkDim123(dims)) {
				Table.log('Invalid value for dimensions. Accepted only: x,y,z.');
				return false;
			}
		}
		else {
			dims = Table.H;
		}
			
		var insertCell = function (content){	
			//Table.log('content');
			//Table.log(x + ' ' + y + ' ' + z);
			//Table.log(i + ' ' + j + ' ' + h);
			
			var cell = {};
			cell[dims[0]] = i; // i always defined
			cell[dims[1]] = (j) ? y+j : y;
			cell[dims[2]] = (h) ? z+h : z;
			cell.content = content;	
			//Table.log(cell);
			this.insert(new Cell(cell));
			this.updatePointer(dims[0],cell[dims[0]]);
			this.updatePointer(dims[1],cell[dims[1]]);
			this.updatePointer(dims[2],cell[dims[2]]);
		};
		
		// By default, only the second dimension is incremented
		x = x || this.pointers[dims[0]]; 
		y = y || this.pointers[dims[1]] + 1;
		z = z || this.pointers[dims[2]];
		
		if ('object' !== typeof data) data = [data]; 
		
		var cell = null;
		// Loop Dim1
		for (var i = 0; i < data.length; i++) {
			//Table.log('data_i');
			//Table.log(data[i]);
			if (data[i] instanceof Array) {
				// Loop Dim2
				for (var j = 0; j < data[i].length; j++) {
				//Table.log(data[i]);
					if (data[i][j] instanceof Array) {
						//Table.log(data[i][j]);
						//Table.log(typeof data[i][j]);
						// Loop Dim3
						for (var h = 0; h < data[i][j].length; h++) {
							//Table.log('Here h');
							insertCell.call(this, data[i][j][h]);
						}
						h=0; // reset h
					}
					else {
						//Table.log('Here j');
						insertCell.call(this, data[i][j]);
					}
				}
				j=0; // reset j
			}
			else {
				//Table.log('Here i');
				insertCell.call(this, data[i]);
			}
		}
		
		//Table.log('After insert');
		//Table.log(this.db);
		
		// TODO: if coming from addRow or Column this should be done only at the end
		if (this.auto_update) {
			this.parse(true);
		}
		
	};
  
	Table.prototype.add = function (data, x, y) {
		if (!data) return;
		var cell = (data instanceof Cell) ? data : new Cell({
			x: x,
			y: y,
			content: data
		});
		var result = this.insert(cell);

		if (result) {
			this.updatePointer('x',x);
			this.updatePointer('y',y);
		}
		return result;
	};
    
	Table.prototype.addColumn = function (data, x, y) {
		if (!data) return false;
		return this._add(data, Table.V, x, y);
	};
  
	Table.prototype.addRow = function (data, x, y) {
		if (!data) return false;
		return this._add(data, Table.H, x, y);
	};
  
	//Table.prototype.bind = function (dim, property) {
		//this.binds[property] = dim;
	//};
  
	// TODO: Only 2D for now
	// TODO: improve algorithm, rewrite
	Table.prototype.parse = function () {
		
		// Create a cell element (td,th...)
		// and fill it with the return value of a
		// render value. 
		var fromCell2TD = function (cell, el) {
			if (!cell) return;
			el = el || 'td';
			var TD = document.createElement(el);
			var content = this.htmlRenderer.render(cell);
			//var content = (!JSUS.isNode(c) || !JSUS.isElement(c)) ? document.createTextNode(c) : c;
			TD.appendChild(content);
			if (cell.className) TD.className = cell.className;
			return TD;
		};
		
		if (this.table) {
			while (this.table.hasChildNodes()) {
				this.table.removeChild(this.table.firstChild);
			}
		}
		
		var TABLE = this.table,
			TR, 
			TD,
			i;
		
		// HEADER
		if (this.header && this.header.length > 0) {
			var THEAD = document.createElement('thead');
			TR = document.createElement('tr');
			// Add an empty cell to balance the left header column
			if (this.left && this.left.length > 0) {
				TR.appendChild(document.createElement('th'));
			}
			for (i=0; i < this.header.length; i++) {
				TR.appendChild(fromCell2TD.call(this, this.header[i],'th'));
			}
			THEAD.appendChild(TR);
			i=0;
			TABLE.appendChild(THEAD);
		}
		
		//console.log(this.table);
		//console.log(this.id);
		//console.log(this.db.length);
		
		// BODY
		if (this.length) {
			var TBODY = document.createElement('tbody');

			this.sort(['y','x']); // z to add first
			var trid = -1;
			// TODO: What happens if the are missing at the beginning ??
			var f = this.first();
			var old_x = f.x;
			var old_left = 0;

			for (i=0; i < this.db.length; i++) {
				//console.log('INSIDE TBODY LOOP');
				//console.log(this.id);
				if (trid !== this.db[i].y) {
					TR = document.createElement('tr');
					TBODY.appendChild(TR);
					trid = this.db[i].y;
					//Table.log(trid);
					old_x = f.x - 1; // must start exactly from the first
					
					// Insert left header, if any
					if (this.left && this.left.length) {
						TD = document.createElement('td');
						//TD.className = this.missing;
						TR.appendChild(fromCell2TD.call(this, this.left[old_left]));
						old_left++;
					}
				}

				// Insert missing cells
				if (this.db[i].x > old_x + 1) {
					var diff = this.db[i].x - (old_x + 1);
					for (var j=0; j < diff; j++ ) {
						TD = document.createElement('td');
						TD.className = this.missing;
						TR.appendChild(TD);
					}
				}
				// Normal Insert
				TR.appendChild(fromCell2TD.call(this, this.db[i]));

				// Update old refs
				old_x = this.db[i].x;
			}
			TABLE.appendChild(TBODY);
		}
		
		
		//FOOTER
		if (this.footer && this.footer.length > 0) {
			var TFOOT = document.createElement('tfoot');
			TR = document.createElement('tr');
			for (i=0; i < this.header.length; i++) {
				TR.appendChild(fromCell2TD.call(this, this.footer[i]));
			}
			TFOOT.appendChild(TR);
			TABLE.appendChild(TFOOT);
		}
		
		return TABLE;
	};
  
	Table.prototype.resetPointers = function (pointers) {
		pointers = pointers || {};
		this.pointers = {
				x: pointers.pointerX || 0,
				y: pointers.pointerY || 0,
				z: pointers.pointerZ || 0
		};
	};
  
  
	Table.prototype.clear = function (confirm) {
		if (NDDB.prototype.clear.call(this, confirm)) {
			this.resetPointers();
		}
	};
  
  // Cell Class
	Cell.prototype = new Entity();
	Cell.prototype.constructor = Cell;
  
	function Cell (cell){
		Entity.call(this, cell);
		this.x = ('undefined' !== typeof cell.x) ? cell.x : null;
		this.y = ('undefined' !== typeof cell.y) ? cell.y : null;
		this.z = ('undefined' !== typeof cell.z) ? cell.z : null;
	}
  
})(
	('undefined' !== typeof node) ? node.window || node : module.exports, // Exports
	('undefined' !== typeof window) ? window : module.parent.exports.window, // window
	('undefined' !== typeof node) ? node : module.parent.exports.node // node
);
