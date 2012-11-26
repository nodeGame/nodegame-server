// nodegame-widgets

(function (node) {

node.Widget = Widget;	
	
function Widget() {
	this.root = null;
}

Widget.prototype.dependencies = {};

Widget.prototype.defaults = {};

Widget.prototype.defaults.fieldset = {
	legend: 'Widget'
};


Widget.prototype.listeners = function () {};

Widget.prototype.getRoot = function () {
	return this.root;
};

Widget.prototype.getValues = function () {};

Widget.prototype.append = function () {};

Widget.prototype.init = function () {};

Widget.prototype.getRoot = function () {};

Widget.prototype.listeners = function () {};

Widget.prototype.getAllValues = function () {};

Widget.prototype.highlight = function () {};

})(
	// Widgets works only in the browser environment.
	('undefined' !== typeof node) ? node : module.parent.exports.node
);
/**
 * 
 * # nodegame-widgets
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 */
(function (window, node) {

	var J = node.JSUS;
	
function Widgets() {
	this.widgets = {};
	this.root = node.window.root || document.body;
}

/**
 * ### Widgets.register
 * 
 * Registers a new widget in the collection
 * 
 * A name and a prototype class must be provided. All properties
 * that are presetn in `node.Widget`, but missing in the prototype
 * are added. 
 * 
 * Registered widgets can be loaded with Widgets.get or Widgets.append.
 * 
 * @param {string} name The id under which registering the widget
 * @param {function} w The widget to add
 * @return {object|boolean} The registered widget, or FALSE if an error occurs
 * 
 */
Widgets.prototype.register = function (name, w) {
	if (!name || !w) {
		node.err('Could not register widget: ' + name, 'nodegame-widgets: ');
		return false;
	}
	
	// Add default properties to widget prototype
	for (var i in node.Widget.prototype) {
		if (!w[i] && !w.prototype[i] && !(w.prototype.__proto__ && w.prototype.__proto__[i])) {
			w.prototype[i] = J.clone(node.Widget.prototype[i]);
		}
	}
	
	this.widgets[name] = w;
	return this.widgets[name];
};

/**
 * ### Widgets.get
 * 
 * Retrieves, instantiates and returns the specified widget
 * 
 * It can attach standard javascript listeners to the root element of
 * the widget if specified in the options.
 * 
 * The dependencies are checked, and if the conditions are not met, 
 * returns FALSE.
 * 
 * @param {string} w_str The name of the widget to load
 * @param {options} options Optional. Configuration options to be passed to the widgets
 * 
 * @see Widgets.add
 * 
 * @TODO: add supports for any listener. Maybe requires some refactoring.
 * @TODO: add example.
 * 
 */
Widgets.prototype.get = function (w_str, options) {
	if (!w_str) return;
	var that = this;
	options = options || {};
	
	
	function createListenerFunction (w, e, l) {
		if (!w || !e || !l) return;
		w.getRoot()[e] = function() {
			l.call(w); 
		};
	};
	
	function attachListeners (options, w) {
		if (!options || !w) return;
		var isEvent = false;
		for (var i in options) {
			if (options.hasOwnProperty(i)) {
				isEvent = J.in_array(i, ['onclick', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onload', 'onunload', 'onmouseover']);  
				if (isEvent && 'function' === typeof options[i]) {
					createListenerFunction(w, i, options[i]);
				}
			}			
		};
	};
	
	var wProto = J.getNestedValue(w_str, this.widgets);
	var widget;
	
	if (!wProto) {
		node.err('widget ' + w_str + ' not found.', 'node-widgets: ');
		return;
	}
	
	node.info('registering ' + wProto.name + ' v.' +  wProto.version, 'node-widgets: ');
	
	if (!this.checkDependencies(wProto)) return false;
	
	// Add missing properties to the user options
	J.mixout(options, J.clone(wProto.defaults));
	
	try {
		widget = new wProto(options);
		// Re-inject defaults
		widget.defaults = options;
		
		// Call listeners
		widget.listeners.call(widget);
		
		// user listeners
		attachListeners(options, widget);
	}
	catch (e) {
		throw new Error('Error while loading widget ' + wProto.name + ': ' + e);
	}
	return widget;
};

/**
 * ### Widgets.append
 * 
 * Appends a widget to the specified root element. If no root element
 * is specified the widget is append to the global root. 
 * 
 * The first parameter can be string representing the name of the widget or 
 * a valid widget already loaded, for example through Widgets.get. 
 * In the latter case, dependencies are checked, and it returns FALSE if
 * conditions are not met.
 * 
 * It automatically creates a fieldset element around the widget if 
 * requested by the internal widget configuration, or if specified in the
 * options parameter.
 * 
 * @param {string} w_str The name of the widget to load
 * @param {object} root. The HTML element to which appending the widget
 * @param {options} options Optional. Configuration options to be passed to the widgets
 * @return {object|boolean} The requested widget, or FALSE is an error occurs
 * 
 * @see Widgets.get
 * 
 */
Widgets.prototype.append = Widgets.prototype.add = function (w, root, options) {
	if (!w) return;
	var that = this;
	
	function appendFieldset(root, options, w) {
		if (!options) return root;
		var idFieldset = options.id || w.id + '_fieldset';
		var legend = options.legend || w.legend;
		return W.addFieldset(root, idFieldset, legend, options.attributes);
	};
	
	
	// Init default values
	root = root || this.root;
	options = options || {};

	// Check if it is a object (new widget)
	// If it is a string is the name of an existing widget
	// In this case a dependencies check is done
	if ('object' !== typeof w) w = this.get(w, options);
	if (!w) return false;	
	
	// options exists and options.fieldset exist
	root = appendFieldset(root, options.fieldset || w.defaults.fieldset, w);
	w.append(root);

	return w;
};

/**
 * ### Widgets.checkDependencies
 * 
 * Checks if all the dependencies are already loaded
 * 
 * Dependencies are searched for in the following objects
 * 
 *  	- window
 *  	- node
 *  	- this.widgets
 *  	- node.window
 * 
 * TODO: Check for version and other constraints.
 * 
 * @param {object} The widget to check
 * @param {boolean} quiet Optional. If TRUE, no warning will be raised. Defaults FALSE
 * @return {boolean} TRUE, if all dependencies are met
 */ 
Widgets.prototype.checkDependencies = function (w, quiet) {
	if (!w.dependencies) return true;
	
	var errMsg = function (w, d) {
		var name = w.name || w.id;// || w.toString();
		node.log(d + ' not found. ' + name + ' cannot be loaded.', 'ERR');
	};
	
	var parents = [window, node, this.widgets, node.window];
	
	var d = w.dependencies;
	for (var lib in d) {
		if (d.hasOwnProperty(lib)) {
			var found = false;
			for (var i=0; i<parents.length; i++) {
				if (J.getNestedValue(lib, parents[i])) {
					var found = true;
					break;
				}
			}
			if (!found) {	
				if (!quiet) errMsg(w, lib);
				return false;
			}
		
		}
	}
	return true;
};

//Expose Widgets to the global object
node.widgets = new Widgets();
	
})(
	// Widgets works only in the browser environment.
	('undefined' !== typeof window) ? window : module.parent.exports.window,
	('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
(function (node) {

	node.widgets.register('WaitScreen', WaitScreen);
	
// ## Defaults
	
	WaitScreen.defaults = {};
	WaitScreen.defaults.id = 'waiting';
	WaitScreen.defaults.fieldset = false;
	
// ## Meta-data
	
	WaitScreen.name = 'WaitingScreen';
	WaitScreen.version = '0.3.2';
	WaitScreen.description = 'Show a standard waiting screen';
	
	function WaitScreen (options) {
		this.id = options.id;
		
		this.text = 'Waiting for other players to be done...';
		this.waitingDiv = null;
	}
	
	WaitScreen.prototype.append = function (root) {
		return root;
	};
	
	WaitScreen.prototype.getRoot = function () {
		return this.waitingDiv;
	};
	
	WaitScreen.prototype.listeners = function () {
		var that = this;
		node.on('WAITING...', function (text) {
			if (!that.waitingDiv) {
				that.waitingDiv = node.window.addDiv(document.body, that.id);
			}
			
			if (that.waitingDiv.style.display === 'none'){
				that.waitingDiv.style.display = '';
			}			
		
			that.waitingDiv.innerHTML = text || that.text;
			node.game.pause();
		});
		
		// It is supposed to fade away when a new state starts
		node.on('LOADED', function(text) {
			if (that.waitingDiv) {
				
				if (that.waitingDiv.style.display === '') {
					that.waitingDiv.style.display = 'none';
				}
			// TODO: Document.js add method to remove element
			}
		});
		
	}; 
})(node);
(function (node) {
	
	
	node.widgets.register('D3', D3);
	node.widgets.register('D3ts', D3ts);
	
	D3.prototype.__proto__ = node.Widget.prototype;
	D3.prototype.constructor = D3;

// ## Defaults
	
	D3.defaults = {};
	D3.defaults.id = 'D3';
	D3.defaults.fieldset = {
		legend: 'D3 plot'
	};

	
// ## Meta-data
	
	D3.name = 'D3';
	D3.version = '0.1';
	D3.description = 'Real time plots for nodeGame with d3.js';
	
// ## Dependencies
	
	D3.dependencies = {
		d3: {},	
		JSUS: {}
	};
	
	function D3 (options) {
		this.id = options.id || D3.id;
		this.event = options.event || 'D3';
		this.svg = null;
		
		var that = this;
		node.on(this.event, function (value) {
			that.tick.call(that, value); 
		});
	}
	
	D3.prototype.append = function (root) {
		this.root = root;
		this.svg = d3.select(root).append("svg");
		return root;
	};
	
	D3.prototype.tick = function () {};
	
// # D3ts
	
	
// ## Meta-data
	
	D3ts.id = 'D3ts';
	D3ts.name = 'D3ts';
	D3ts.version = '0.1';
	D3ts.description = 'Time series plot for nodeGame with d3.js';
	
// ## Dependencies	
	D3ts.dependencies = {
		D3: {},	
		JSUS: {}
	};
	
	D3ts.prototype.__proto__ = D3.prototype;
	D3ts.prototype.constructor = D3ts;
	
	D3ts.defaults = {};
	
	D3ts.defaults.width = 400;
	D3ts.defaults.height = 200;
	
	D3ts.defaults.margin = {
    	top: 10, 
    	right: 10, 
    	bottom: 20, 
    	left: 40 
	};
	
	D3ts.defaults.domain = {
		x: [0, 10],
		y: [0, 1]
	};
	
    D3ts.defaults.range = {
    	x: [0, D3ts.defaults.width],
    	y: [D3ts.defaults.height, 0]
    };
	
	function D3ts (options) {
		D3.call(this, options);
		
		
		var o = this.options = JSUS.merge(D3ts.defaults, options);
		
		var n = this.n = o.n;
		
	    this.data = [0];
	    
	    this.margin = o.margin;
	    
		var width = this.width = o.width - this.margin.left - this.margin.right;
		var height = this.height = o.height - this.margin.top - this.margin.bottom;

		// identity function
		var x = this.x = d3.scale.linear()
		    .domain(o.domain.x)
		    .range(o.range.x);

		var y = this.y = d3.scale.linear()
		    .domain(o.domain.y)
		    .range(o.range.y);

		// line generator
		this.line = d3.svg.line()
		    .x(function(d, i) { return x(i); })
		    .y(function(d, i) { return y(d); });
	}
	
	D3ts.prototype.init = function (options) {
		//D3.init.call(this, options);
		
		console.log('init!');
		var x = this.x,
			y = this.y,
			height = this.height,
			width = this.width,
			margin = this.margin;
		
		
		// Create the SVG and place it in the middle
		this.svg.attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


		// Line does not go out the axis
		this.svg.append("defs").append("clipPath")
		    .attr("id", "clip")
		  .append("rect")
		    .attr("width", width)
		    .attr("height", height);

		// X axis
		this.svg.append("g")
		    .attr("class", "x axis")
		    .attr("transform", "translate(0," + height + ")")
		    .call(d3.svg.axis().scale(x).orient("bottom"));

		// Y axis
		this.svg.append("g")
		    .attr("class", "y axis")
		    .call(d3.svg.axis().scale(y).orient("left"));

		this.path = this.svg.append("g")
		    .attr("clip-path", "url(#clip)")
		  .append("path")
		    .data([this.data])
		    .attr("class", "line")
		    .attr("d", this.line);		
	};
	
	D3ts.prototype.tick = function (value) {
		this.alreadyInit = this.alreadyInit || false;
		if (!this.alreadyInit) {
			this.init();
			this.alreadyInit = true;
		}
		
		var x = this.x;
		
		console.log('tick!');
	
		// push a new data point onto the back
		this.data.push(value);

		// redraw the line, and slide it to the left
		this.path
	    	.attr("d", this.line)
	    	.attr("transform", null);

		// pop the old data point off the front
		if (this.data.length > this.n) {
		
	  		this.path
	  			.transition()
	  			.duration(500)
	  			.ease("linear")
	  			.attr("transform", "translate(" + x(-1) + ")");
	  		
	  		this.data.shift();
	  	  
		}
	};
	
})(node);
(function (node) {
	
	node.widgets.register('NDDBBrowser', NDDBBrowser);
	
	var JSUS = node.JSUS,
		NDDB = node.NDDB,
		TriggerManager = node.TriggerManager;

// ## Defaults
	
	NDDBBrowser.defaults = {};
	NDDBBrowser.defaults.id = 'nddbbrowser';
	NDDBBrowser.defaults.fieldset = false;
	
// ## Meta-data
	
	NDDBBrowser.name = 'NDDBBrowser';
	NDDBBrowser.version = '0.1.2';
	NDDBBrowser.description = 'Provides a very simple interface to control a NDDB istance.';
	
// ## Dependencies
	
	NDDBBrowser.dependencies = {
		JSUS: {},
		NDDB: {},
		TriggerManager: {}
	};
	
	function NDDBBrowser (options) {
		this.options = options;
		this.nddb = null;
		
		this.commandsDiv = document.createElement('div');
		this.id = options.id;
		if ('undefined' !== typeof this.id) {
			this.commandsDiv.id = this.id;
		}
		
		this.info = null;
		this.init(this.options);
	}
	
	NDDBBrowser.prototype.init = function (options) {
		
		function addButtons() {
			var id = this.id;
			node.window.addEventButton(id + '_GO_TO_FIRST', '<<', this.commandsDiv, 'go_to_first');
			node.window.addEventButton(id + '_GO_TO_PREVIOUS', '<', this.commandsDiv, 'go_to_previous');
			node.window.addEventButton(id + '_GO_TO_NEXT', '>', this.commandsDiv, 'go_to_next');
			node.window.addEventButton(id + '_GO_TO_LAST', '>>', this.commandsDiv, 'go_to_last');
			node.window.addBreak(this.commandsDiv);
		}
		function addInfoBar() {
			var span = this.commandsDiv.appendChild(document.createElement('span'));
			return span;
		}
		
		
		addButtons.call(this);
		this.info = addInfoBar.call(this);
		
		this.tm = new TriggerManager();
		this.tm.init(options.triggers);
		this.nddb = options.nddb || new NDDB({auto_update_pointer: true});
	};
	
	NDDBBrowser.prototype.append = function (root) {
		this.root = root;
		root.appendChild(this.commandsDiv);
		return root;
	};
	
	NDDBBrowser.prototype.getRoot = function (root) {
		return this.commandsDiv;
	};
	
	NDDBBrowser.prototype.add = function (o) {
		return this.nddb.insert(o);
	};
	
	NDDBBrowser.prototype.sort = function (key) {
		return this.nddb.sort(key);
	};
	
	NDDBBrowser.prototype.addTrigger = function (trigger) {
		return this.tm.addTrigger(trigger);
	};
	
	NDDBBrowser.prototype.removeTrigger = function (trigger) {
		return this.tm.removeTrigger(trigger);
	};
	
	NDDBBrowser.prototype.resetTriggers = function () {
		return this.tm.resetTriggers();
	};
	
	NDDBBrowser.prototype.listeners = function() {
		var that = this;
		var id = this.id;
		
		function notification (el, text) {
			if (el) {
				node.emit(id + '_GOT', el);
				this.writeInfo((this.nddb.nddb_pointer + 1) + '/' + this.nddb.length);
			}
			else {
				this.writeInfo('No element found');
			}
		}
		
		node.on(id + '_GO_TO_FIRST', function() {
			var el = that.tm.pullTriggers(that.nddb.first());
			notification.call(that, el);
		});
		
		node.on(id + '_GO_TO_PREVIOUS', function() {
			var el = that.tm.pullTriggers(that.nddb.previous());
			notification.call(that, el);
		});
		
		node.on(id + '_GO_TO_NEXT', function() {
			var el = that.tm.pullTriggers(that.nddb.next());
			notification.call(that, el);
		});

		node.on(id + '_GO_TO_LAST', function() {
			var el = that.tm.pullTriggers(that.nddb.last());
			notification.call(that, el);
			
		});
	};
	
	NDDBBrowser.prototype.writeInfo = function (text) {
		if (this.infoTimeout) clearTimeout(this.infoTimeout);
		this.info.innerHTML = text;
		var that = this;
		this.infoTimeout = setTimeout(function(){
			that.info.innerHTML = '';
		}, 2000);
	};
	
	
})(node);
(function (node) {
	
	node.widgets.register('DataBar', DataBar);
	
// ## Defaults
	DataBar.defaults = {};
	DataBar.defaults.id = 'databar';
	DataBar.defaults.fieldset = {	
		legend: 'Send DATA to players'
	};
	
// ## Meta-data
	DataBar.name = 'Data Bar';
	DataBar.version = '0.3';
	DataBar.description = 'Adds a input field to send DATA messages to the players';
		
	function DataBar (options) {
		this.bar = null;
		this.root = null;
		this.recipient = null;
	}
	
	
	DataBar.prototype.append = function (root) {
		
		var sendButton, textInput, dataInput;
		
		sendButton = W.addButton(root);
		W.writeln('Text');
		textInput = W.addTextInput(root, 'data-bar-text');
		W.writeln('Data');
		dataInput = W.addTextInput(root, 'data-bar-data');
		
		this.recipient = W.addRecipientSelector(root);
		
		var that = this;
		
		sendButton.onclick = function() {
			
			var to, data, text;
			
			to = that.recipient.value;
			text = textInput.value;
			data = dataInput.value;
			
			node.log('Parsed Data: ' + JSON.stringify(data));
			
			node.say(data, text, to);
		};
		
		node.on('UPDATED_PLIST', function() {
			node.window.populateRecipientSelector(that.recipient, node.game.pl);
		});
		
		return root;
		
	};
	
})(node);
(function (node) {
	
	node.widgets.register('ServerInfoDisplay', ServerInfoDisplay);	

// ## Defaults
	
	ServerInfoDisplay.defaults = {};
	ServerInfoDisplay.defaults.id = 'serverinfodisplay';
	ServerInfoDisplay.defaults.fieldset = {
			legend: 'Server Info',
			id: 'serverinfo_fieldset'
	};		
	
// ## Meta-data
	
	ServerInfoDisplay.name = 'Server Info Display';
	ServerInfoDisplay.version = '0.3';
	
	function ServerInfoDisplay (options) {	
		this.id = options.id;
		
		
		this.root = null;
		this.div = document.createElement('div');
		this.table = null; //new node.window.Table();
		this.button = null;
		
	}
	
	ServerInfoDisplay.prototype.init = function (options) {
		var that = this;
		if (!this.div) {
			this.div = document.createElement('div');
		}
		this.div.innerHTML = 'Waiting for the reply from Server...';
		if (!this.table) {
			this.table = new node.window.Table(options);
		}
		this.table.clear(true);
		this.button = document.createElement('button');
		this.button.value = 'Refresh';
		this.button.appendChild(document.createTextNode('Refresh'));
		this.button.onclick = function(){
			that.getInfo();
		};
		this.root.appendChild(this.button);
		this.getInfo();
	};
	
	ServerInfoDisplay.prototype.append = function (root) {
		this.root = root;
		root.appendChild(this.div);
		return root;
	};
	
	ServerInfoDisplay.prototype.getInfo = function() {
		var that = this;
		node.get('INFO', function (info) {
			node.window.removeChildrenFromNode(that.div);
			that.div.appendChild(that.processInfo(info));
		});
	};
	
	ServerInfoDisplay.prototype.processInfo = function(info) {
		this.table.clear(true);
		for (var key in info) {
			if (info.hasOwnProperty(key)){
				this.table.addRow([key,info[key]]);
			}
		}
		return this.table.parse();
	};
	
	ServerInfoDisplay.prototype.listeners = function () {
		var that = this;
		node.on('NODEGAME_READY', function(){
			that.init();
		});
	}; 
	
})(node);
(function (node) {
	

	// TODO: handle different events, beside onchange
	
	node.widgets.register('Controls', Controls);	
	
// ## Defaults
	
	var defaults = { id: 'controls' };
	
	Controls.defaults = defaults;
	
	Controls.Slider = SliderControls;
	Controls.jQuerySlider = jQuerySliderControls;
	Controls.Radio	= RadioControls;
	
	// Meta-data
	
	Controls.name = 'Controls';
	Controls.version = '0.2';
	Controls.description = 'Wraps a collection of user-inputs controls.';
		
	function Controls (options) {
		this.options = options;
		this.id = options.id;
		this.root = null;
		
		this.listRoot = null;
		this.fieldset = null;
		this.submit = null;
		
		this.changeEvent = this.id + '_change';
		
		this.init(options);
	}

	Controls.prototype.add = function (root, id, attributes) {
		// TODO: node.window.addTextInput
		//return node.window.addTextInput(root, id, attributes);
	};
	
	Controls.prototype.getItem = function (id, attributes) {
		// TODO: node.window.addTextInput
		//return node.window.getTextInput(id, attributes);
	};
	
	Controls.prototype.init = function (options) {

		this.hasChanged = false; // TODO: should this be inherited?
		if ('undefined' !== typeof options.change) {
			if (!options.change){
				this.changeEvent = false;
			}
			else {
				this.changeEvent = options.change;
			}
		}
		this.list = new node.window.List(options);
		this.listRoot = this.list.getRoot();
		
		if (!options.features) return;
		if (!this.root) this.root = this.listRoot;
		this.features = options.features;
		this.populate();
	};
	
	Controls.prototype.append = function (root) {
		this.root = root;
		var toReturn = this.listRoot;
		this.list.parse();
		root.appendChild(this.listRoot);
		
		if (this.options.submit) {
			var idButton = 'submit_' + this.id;
			if (this.options.submit.id) {
				idButton = this.options.submit.id;
				delete this.options.submit.id;
			}
			this.submit = node.window.addButton(root, idButton, this.options.submit, this.options.attributes);
			
			var that = this;
			this.submit.onclick = function() {
				if (that.options.change) {
					node.emit(that.options.change);
				}
			};
		}		
		
		return toReturn;
	};
	
	Controls.prototype.parse = function() {
		return this.list.parse();
	};
	
	Controls.prototype.populate = function () {
		var that = this;
		
		for (var key in this.features) {
			if (this.features.hasOwnProperty(key)) {
				// Prepare the attributes vector
				var attributes = this.features[key];
				var id = key;
				if (attributes.id) {
					id = attributes.id;
					delete attributes.id;
				}
							
				var container = document.createElement('div');
				// Add a different element according to the subclass instantiated
				var elem = this.add(container, id, attributes);
								
				// Fire the onChange event, if one defined
				if (this.changeEvent) {
					elem.onchange = function() {
						node.emit(that.changeEvent);
					};
				}
				
				if (attributes.label) {
					node.window.addLabel(container, elem, null, attributes.label);
				}
				
				// Element added to the list
				this.list.addDT(container);
			}
		}
	};
	
	Controls.prototype.listeners = function() {	
		var that = this;
		// TODO: should this be inherited?
		node.on(this.changeEvent, function(){
			that.hasChanged = true;
		});
				
	};

	Controls.prototype.refresh = function() {
		for (var key in this.features) {	
			if (this.features.hasOwnProperty(key)) {
				var el = node.window.getElementById(key);
				if (el) {
//					node.log('KEY: ' + key, 'DEBUG');
//					node.log('VALUE: ' + el.value, 'DEBUG');
					el.value = this.features[key].value;
					// TODO: set all the other attributes
					// TODO: remove/add elements
				}
				
			}
		}
		
		return true;
	};
	
	Controls.prototype.getAllValues = function() {
		var out = {};
		for (var key in this.features) {	
			if (this.features.hasOwnProperty(key)) {
				var el = node.window.getElementById(key);
				if (el) {
//					node.log('KEY: ' + key, 'DEBUG');
//					node.log('VALUE: ' + el.value, 'DEBUG');
					out[key] = Number(el.value);
				}
				
			}
		}
		
		return out;
	};
	
	Controls.prototype.highlight = function (code) {
		return node.window.highlight(this.listRoot, code);
	};
	
	// Sub-classes
	
	// Slider 
	
	SliderControls.prototype.__proto__ = Controls.prototype;
	SliderControls.prototype.constructor = SliderControls;
	
	SliderControls.id = 'slidercontrols';
	SliderControls.name = 'Slider Controls';
	SliderControls.version = '0.2';
	
	SliderControls.dependencies = {
		Controls: {}
	};
	
	
	function SliderControls (options) {
		Controls.call(this, options);
	}
	
	SliderControls.prototype.add = function (root, id, attributes) {
		return node.window.addSlider(root, id, attributes);
	};
	
	SliderControls.prototype.getItem = function (id, attributes) {
		return node.window.getSlider(id, attributes);
	};
	
	// jQuerySlider
    
    jQuerySliderControls.prototype.__proto__ = Controls.prototype;
    jQuerySliderControls.prototype.constructor = jQuerySliderControls;
    
    jQuerySliderControls.id = 'jqueryslidercontrols';
    jQuerySliderControls.name = 'Experimental: jQuery Slider Controls';
    jQuerySliderControls.version = '0.13';
    
    jQuerySliderControls.dependencies = {
        jQuery: {},
        Controls: {}
    };
    
    
    function jQuerySliderControls (options) {
        Controls.call(this, options);
    }
    
    jQuerySliderControls.prototype.add = function (root, id, attributes) {
        var slider = jQuery('<div/>', {
			id: id
		}).slider();
	
		var s = slider.appendTo(root);
		return s[0];
	};
	
	jQuerySliderControls.prototype.getItem = function (id, attributes) {
		var slider = jQuery('<div/>', {
			id: id
			}).slider();
		
		return slider;
	};


    ///////////////////////////

	
	
	

	
	// Radio
	
	RadioControls.prototype.__proto__ = Controls.prototype;
	RadioControls.prototype.constructor = RadioControls;
	
	RadioControls.id = 'radiocontrols';
	RadioControls.name = 'Radio Controls';
	RadioControls.version = '0.1.1';
	
	RadioControls.dependencies = {
		Controls: {}
	};
	
	function RadioControls (options) {
		Controls.call(this,options);
		this.groupName = ('undefined' !== typeof options.name) ? options.name : 
																node.window.generateUniqueId(); 
		//alert(this.groupName);
	}
	
	RadioControls.prototype.add = function (root, id, attributes) {
		//console.log('ADDDING radio');
		//console.log(attributes);
		// add the group name if not specified
		// TODO: is this a javascript bug?
		if ('undefined' === typeof attributes.name) {
//			console.log(this);
//			console.log(this.name);
//			console.log('MODMOD ' + this.name);
			attributes.name = this.groupName;
		}
		//console.log(attributes);
		return node.window.addRadioButton(root, id, attributes);	
	};
	
	RadioControls.prototype.getItem = function (id, attributes) {
		//console.log('ADDDING radio');
		//console.log(attributes);
		// add the group name if not specified
		// TODO: is this a javascript bug?
		if ('undefined' === typeof attributes.name) {
//			console.log(this);
//			console.log(this.name);
//			console.log('MODMOD ' + this.name);
			attributes.name = this.groupName;
		}
		//console.log(attributes);
		return node.window.getRadioButton(id, attributes);	
	};
	
	// Override getAllValues for Radio Controls
	RadioControls.prototype.getAllValues = function() {
		
		for (var key in this.features) {
			if (this.features.hasOwnProperty(key)) {
				var el = node.window.getElementById(key);
				if (el.checked) {
					return el.value;
				}
			}
		}
		return false;
	};
	
})(node);
(function (node) {
	
	node.widgets.register('VisualState', VisualState);
	
	var GameState = node.GameState,
		JSUS = node.JSUS,
		Table = node.window.Table;
	
// ## Defaults
	
	VisualState.defaults = {};
	VisualState.defaults.id = 'visualstate';
	VisualState.defaults.fieldset = { 
		legend: 'State',
		id: 'visualstate_fieldset'
	};	
	
// ## Meta-data
	
	VisualState.name = 'Visual State';
	VisualState.version = '0.2.1';
	VisualState.description = 'Visually display current, previous and next state of the game.';
	
// ## Dependencies
	
	VisualState.dependencies = {
		JSUS: {},
		Table: {}
	};
	
	
	function VisualState (options) {
		this.id = options.id;
		this.gameLoop = node.game.gameLoop;
		
		this.root = null;		// the parent element
		this.table = new Table();
	}
	
	VisualState.prototype.getRoot = function () {
		return this.root;
	};
	
	VisualState.prototype.append = function (root, ids) {
		var that = this;
		var PREF = this.id + '_';
		root.appendChild(this.table.table);
		this.writeState();
		return root;
	};
		
	VisualState.prototype.listeners = function () {
		var that = this;
		node.on('STATECHANGE', function() {
			that.writeState();
		}); 
	};
	
	VisualState.prototype.writeState = function () {
		var state = false;
		var pr = false;
		var nx = false;
		
		var miss = '-';
		
		if (node.game && node.game.state) {
			state = this.gameLoop.getName(node.game.state) || miss;
			pr = this.gameLoop.getName(node.game.previous()) || miss;
			nx = this.gameLoop.getName(node.game.next()) || miss;
		}
		else {
			state = 'Uninitialized';
			pr = miss;
			nx = miss;
		}
		this.table.clear(true);

		this.table.addRow(['Previous: ', pr]);
		this.table.addRow(['Current: ', state]);
		this.table.addRow(['Next: ', nx]);
	
		var t = this.table.select('y', '=', 2);
		t.addClass('strong');
		t.select('x','=',0).addClass('underline');
		this.table.parse();
	};
	
})(node);
(function (node) {

	var Table = node.window.Table,
		GameState = node.GameState;
	
	node.widgets.register('StateDisplay', StateDisplay);	

// ## Defaults
	
	StateDisplay.defaults = {};
	StateDisplay.defaults.id = 'statedisplay';
	StateDisplay.defaults.fieldset = { legend: 'State Display' };		
	
// ## Meta-data
	
	StateDisplay.name = 'State Display';
	StateDisplay.version = '0.4.1';
	StateDisplay.description = 'Display basic information about player\'s status.';
	
	function StateDisplay (options) {
		
		this.id = options.id;
				
		this.root = null;
		this.table = new Table();
	}
	
	// TODO: Write a proper INIT method
	StateDisplay.prototype.init = function () {};
	
	StateDisplay.prototype.getRoot = function () {
		return this.root;
	};
	
	
	StateDisplay.prototype.append = function (root) {
		var that = this;
		var PREF = this.id + '_';
		
		var idFieldset = PREF + 'fieldset';
		var idPlayer = PREF + 'player';
		var idState = PREF + 'state'; 
			
		var checkPlayerName = setInterval(function(idState,idPlayer) {
			if (node.player && node.player.id) {
				clearInterval(checkPlayerName);
				that.updateAll();
			}
		}, 100);
	
		root.appendChild(this.table.table);
		this.root = root;
		return root;
		
	};
	
	StateDisplay.prototype.updateAll = function() {
		var state = node.game ? new GameState(node.game.state) : new GameState(),
			id = node.player ? node.player.id : '-';
			name = node.player && node.player.name ? node.player.name : '-';
			
		this.table.clear(true);
		this.table.addRow(['Name: ', name]);
		this.table.addRow(['State: ', state.toString()]);
		this.table.addRow(['Id: ', id]);
		this.table.parse();
		
	};
	
	StateDisplay.prototype.listeners = function () {
		var that = this;
		var say = node.actions.SAY + '.';
		var set = node.actions.SET + '.';
		var get = node.actions.GET + '.'; 
		var IN =  node.IN;
		var OUT = node.OUT;
		
		node.on('STATECHANGE', function() {
			that.updateAll();
		}); 
	}; 
	
})(node);
(function (node) {

	var GameState = node.GameState,
		PlayerList = node.PlayerList,
		Table = node.window.Table,
		HTMLRenderer = node.window.HTMLRenderer;
	
	node.widgets.register('DynamicTable', DynamicTable);
	
	
	DynamicTable.prototype = new Table();
	DynamicTable.prototype.constructor = Table;	
	
	
	DynamicTable.id = 'dynamictable';
	DynamicTable.name = 'Dynamic Table';
	DynamicTable.version = '0.3.1';
	
	DynamicTable.dependencies = {
		Table: {},
		JSUS: {},
		HTMLRenderer: {}
	};
	
	function DynamicTable (options, data) {
		//JSUS.extend(node.window.Table,this);
		Table.call(this, options, data);
		this.options = options;
		this.id = options.id;
		this.name = options.name || 'Dynamic Table';
		this.fieldset = { legend: this.name,
							id: this.id + '_fieldset'
		};
		
		this.root = null;
		this.bindings = {};
		this.init(this.options);
	}
	
	DynamicTable.prototype.init = function (options) {
		this.options = options;
		this.name = options.name || this.name;
		this.auto_update = ('undefined' !== typeof options.auto_update) ? options.auto_update : true;
		this.replace = options.replace || false;
		this.htmlRenderer = new HTMLRenderer({renderers: options.renderers});
		this.c('state', GameState.compare);
		this.setLeft([]);
		this.parse(true);
	};
		
	DynamicTable.prototype.bind = function (event, bindings) {
		if (!event || !bindings) return;
		var that = this;

		node.on(event, function(msg) {
			
			if (bindings.x || bindings.y) {
				// Cell
				var func;
				if (that.replace) {
					func = function (x, y) {
						var found = that.get(x,y);
						if (found.length !== 0) {
							for (var ci=0; ci < found.length; ci++) {
								bindings.cell.call(that, msg, found[ci]);
							}
						}
						else {
							var cell = bindings.cell.call(that, msg, new Table.Cell({x: x, y: y}));
							that.add(cell);
						}
					};
				}
				else {
					func = function (x, y) {
						var cell = bindings.cell.call(that, msg, new Table.Cell({x: x, y: y}));
						that.add(cell, x, y);
					};
				}
				
				var x = bindings.x.call(that, msg);
				var y = bindings.y.call(that, msg);
				
				if (x && y) {
					
					x = (x instanceof Array) ? x : [x];
					y = (y instanceof Array) ? y : [y];
					
//					console.log('Bindings found:');
//					console.log(x);
//					console.log(y);
					
					for (var xi=0; xi < x.length; xi++) {
						for (var yi=0; yi < y.length; yi++) {
							// Replace or Add
							func.call(that, x[xi], y[yi]);
						}
					}
				}
				// End Cell
			}
			
			// Header
			if (bindings.header) {
				var h = bindings.header.call(that, msg);
				h = (h instanceof Array) ? h : [h];
				that.setHeader(h);
			}
			
			// Left
			if (bindings.left) {
				var l = bindings.left.call(that, msg);
				if (!JSUS.in_array(l, that.left)) {
					that.header.push(l);
				}
			}
			
			// Auto Update?
			if (that.auto_update) {
				that.parse();
			}
		});
		
	};

	DynamicTable.prototype.append = function (root) {
		this.root = root;
		root.appendChild(this.table);
		return root;
	};
	
	DynamicTable.prototype.listeners = function () {}; 

})(node);
(function (node) {
	
	node.widgets.register('GameBoard', GameBoard);
	
	var GameState = node.GameState,
		PlayerList = node.PlayerList;

// ## Defaults	
	
	GameBoard.defaults = {};
	GameBoard.defaults.id = 'gboard';
	GameBoard.defaults.fieldset = {
			legend: 'Game Board'
	};
	
// ## Meta-data
	
	GameBoard.name = 'GameBoard';
	GameBoard.version = '0.4.0';
	GameBoard.description = 'Offer a visual representation of the state of all players in the game.';
	
	function GameBoard (options) {
		
		this.id = options.id || GameBoard.defaults.id;
		this.status_id = this.id + '_statusbar';
		
		this.board = null;
		this.status = null;
		this.root = null;
	
	}
	
	GameBoard.prototype.append = function (root) {
		this.root = root;
		this.status = node.window.addDiv(root, this.status_id);
		this.board = node.window.addDiv(root, this.id);
		
		this.updateBoard(node.game.pl);
		
		
		return root;
	};
	
	GameBoard.prototype.listeners = function() {
		var that = this;		
//		node.on('in.say.PCONNECT', function (msg) {
//			that.addPlayerToBoard(msg.data);
//		});
//
//		node.on('in.say.PDISCONNECT', function (msg) {
//			that.removePlayerFromBoard(msg.data);
//		});
		
		node.on('UPDATED_PLIST', function() {
			that.updateBoard(node.game.pl);
		});
		
	};
	
	GameBoard.prototype.printLine = function (p) {

		var line = '[' + (p.name || p.id) + "]> \t"; 
		
		line += '(' +  p.state.round + ') ' + p.state.state + '.' + p.state.step; 
		line += ' ';
		
		switch (p.state.is) {

			case GameState.iss.UNKNOWN:
				line += '(unknown)';
				break;
				
			case GameState.iss.LOADING:
				line += '(loading)';
				break;
				
			case GameState.iss.LOADED:
				line += '(loaded)';
				break;
				
			case GameState.iss.PLAYING:
				line += '(playing)';
				break;
			case GameState.iss.DONE:
				line += '(done)';
				break;		
			default:
				line += '('+p.state.is+')';
				break;		
		}
		
		if (p.state.paused) {
			line += ' (P)';
		}
		
		return line;
	};
	
	GameBoard.prototype.printSeparator = function (p) {
		return W.getElement('hr', null, {style: 'color: #CCC;'});
	};
	
	
	GameBoard.prototype.updateBoard = function (pl) {
		var that = this;
		
		this.status.innerHTML = 'Updating...';
		
		var player, separator;
		
		if (pl.length) {
			that.board.innerHTML = '';
			pl.forEach( function(p) {
				player = that.printLine(p);
				
				W.write(player, that.board);
				
				separator = that.printSeparator(p);
				W.write(separator, that.board);
			});
		}
		
		
		this.status.innerHTML = 'Connected players: ' + node.game.pl.length;
	};
	
})(node);
(function (node) {
	
	var Table = node.window.Table;
	
	node.widgets.register('ChernoffFacesSimple', ChernoffFaces);
	
	// # Defaults
		
	ChernoffFaces.defaults = {};
	ChernoffFaces.defaults.id = 'ChernoffFaces';
	ChernoffFaces.defaults.canvas = {};
	ChernoffFaces.defaults.canvas.width = 100;
	ChernoffFaces.defaults.canvas.heigth = 100;

	// ## Meta-data
	
	ChernoffFaces.name = 'Chernoff Faces';
	ChernoffFaces.version = '0.3';
	ChernoffFaces.description = 'Display parametric data in the form of a Chernoff Face.'
	
	// ## Dependencies 		
	ChernoffFaces.dependencies = {
		JSUS: {},
		Table: {},
		Canvas: {},
		'Controls.Slider': {}
	};
	
	ChernoffFaces.FaceVector = FaceVector;
	ChernoffFaces.FacePainter = FacePainter;
	
	function ChernoffFaces (options) {
		this.options = options;
		this.id = options.id;
		this.table = new Table({id: 'cf_table'});
		this.root = options.root || document.createElement('div');
		this.root.id = this.id;
		
		this.sc = node.widgets.get('Controls.Slider'); 	// Slider Controls
		this.fp = null; 	// Face Painter
		this.canvas = null;
		this.dims = null;	// width and height of the canvas

		this.change = 'CF_CHANGE';
		var that = this;
		this.changeFunc = function () {
			that.draw(that.sc.getAllValues());
		};
		
		this.features = null;
		this.controls = null;
		
		this.init(this.options);
	}
	
	ChernoffFaces.prototype.init = function (options) {
		var that = this;
		this.id = options.id || this.id;
		var PREF = this.id + '_';
		
		this.features = options.features || this.features || FaceVector.random();
		
		this.controls = ('undefined' !== typeof options.controls) ?  options.controls : true;
		
		var idCanvas = (options.idCanvas) ? options.idCanvas : PREF + 'canvas';
		var idButton = (options.idButton) ? options.idButton : PREF + 'button';

		this.dims = {
				width: (options.width) ? options.width : ChernoffFaces.defaults.canvas.width, 
				height:(options.height) ? options.height : ChernoffFaces.defaults.canvas.heigth
		};
		
		this.canvas = node.window.getCanvas(idCanvas, this.dims);
		this.fp = new FacePainter(this.canvas);		
		this.fp.draw(new FaceVector(this.features));
		
		var sc_options = {
			id: 'cf_controls',
			features: JSUS.mergeOnKey(FaceVector.defaults, this.features, 'value'),
			change: this.change,
			fieldset: {id: this.id + '_controls_fieldest', 
					   legend: this.controls.legend || 'Controls'
			},
			submit: 'Send'
		};
		
		this.sc = node.widgets.get('Controls.Slider', sc_options);
		
		// Controls are always there, but may not be visible
		if (this.controls) {
			this.table.add(this.sc);
		}
		
		// Dealing with the onchange event
		if ('undefined' === typeof options.change) {	
			node.on(this.change, this.changeFunc); 
		} else {
			if (options.change) {
				node.on(options.change, this.changeFunc);
			}
			else {
				node.removeListener(this.change, this.changeFunc);
			}
			this.change = options.change;
		}
		
		
		this.table.add(this.canvas);
		this.table.parse();
		this.root.appendChild(this.table.table);
	};
	
	ChernoffFaces.prototype.getRoot = function() {
		return this.root;
	};
	
	ChernoffFaces.prototype.getCanvas = function() {
		return this.canvas;
	};
	
	ChernoffFaces.prototype.append = function (root) {
		root.appendChild(this.root);
		this.table.parse();
		return this.root;
	};
	
	ChernoffFaces.prototype.listeners = function () {};
	
	ChernoffFaces.prototype.draw = function (features) {
		if (!features) return;
		var fv = new FaceVector(features);
		this.fp.redraw(fv);
		// Without merging wrong values are passed as attributes
		this.sc.init({features: JSUS.mergeOnKey(FaceVector.defaults, features, 'value')});
		this.sc.refresh();
	};
	
	ChernoffFaces.prototype.getAllValues = function() {
		//if (this.sc) return this.sc.getAllValues();
		return this.fp.face;
	};
	
	ChernoffFaces.prototype.randomize = function() {
		var fv = FaceVector.random();
		this.fp.redraw(fv);
	
		var sc_options = {
				features: JSUS.mergeOnKey(FaceVector.defaults, fv, 'value'),
				change: this.change
		};
		this.sc.init(sc_options);
		this.sc.refresh();
	
		return true;
	};
	
	// FacePainter
	// The class that actually draws the faces on the Canvas
	function FacePainter (canvas, settings) {
			
		this.canvas = new node.window.Canvas(canvas);
		
		this.scaleX = canvas.width / ChernoffFaces.defaults.canvas.width;
		this.scaleY = canvas.height / ChernoffFaces.defaults.canvas.heigth;
	};
	
	//Draws a Chernoff face.
	FacePainter.prototype.draw = function (face, x, y) {
		if (!face) return;
		this.face = face;
		this.fit2Canvas(face);
		this.canvas.scale(face.scaleX, face.scaleY);
		
		//console.log('Face Scale ' + face.scaleY + ' ' + face.scaleX );
		
		var x = x || this.canvas.centerX;
		var y = y || this.canvas.centerY;
		
		this.drawHead(face, x, y);
			
		this.drawEyes(face, x, y);
	
		this.drawPupils(face, x, y);
	
		this.drawEyebrow(face, x, y);
	
		this.drawNose(face, x, y);
		
		this.drawMouth(face, x, y);
		
	};		
		
	FacePainter.prototype.redraw = function (face, x, y) {
		this.canvas.clear();
		this.draw(face,x,y);
	}
	
	FacePainter.prototype.scale = function (x, y) {
		this.canvas.scale(this.scaleX, this.scaleY);
	}
	
	// TODO: Improve. It eats a bit of the margins
	FacePainter.prototype.fit2Canvas = function(face) {
		if (!this.canvas) {
		console.log('No canvas found');
			return;
		}
		
		if (this.canvas.width > this.canvas.height) {
			var ratio = this.canvas.width / face.head_radius * face.head_scale_x;
		}
		else {
			var ratio = this.canvas.height / face.head_radius * face.head_scale_y;
		}
		
		face.scaleX = ratio / 2;
		face.scaleY = ratio / 2;
	}
	
	FacePainter.prototype.drawHead = function (face, x, y) {
		
		var radius = face.head_radius;
		
		this.canvas.drawOval({
					   x: x, 
					   y: y,
					   radius: radius,
					   scale_x: face.head_scale_x,
					   scale_y: face.head_scale_y,
					   color: face.color,
					   lineWidth: face.lineWidth
		});
	};
	
	FacePainter.prototype.drawEyes = function (face, x, y) {
		
		var height = FacePainter.computeFaceOffset(face, face.eye_height, y);
		var spacing = face.eye_spacing;
			
		var radius = face.eye_radius;
		//console.log(face);
		this.canvas.drawOval({
						x: x - spacing,
						y: height,
						radius: radius,
						scale_x: face.eye_scale_x,
						scale_y: face.eye_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
						
		});
		//console.log(face);
		this.canvas.drawOval({
						x: x + spacing,
						y: height,
						radius: radius,
						scale_x: face.eye_scale_x,
						scale_y: face.eye_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
	}
	
	FacePainter.prototype.drawPupils = function (face, x, y) {
			
		var radius = face.pupil_radius;
		var spacing = face.eye_spacing;
		var height = FacePainter.computeFaceOffset(face, face.eye_height, y);
		
		this.canvas.drawOval({
						x: x - spacing,
						y: height,
						radius: radius,
						scale_x: face.pupil_scale_x,
						scale_y: face.pupil_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
		
		this.canvas.drawOval({
						x: x + spacing,
						y: height,
						radius: radius,
						scale_x: face.pupil_scale_x,
						scale_y: face.pupil_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
	
	};
	
	FacePainter.prototype.drawEyebrow = function (face, x, y) {
		
		var height = FacePainter.computeEyebrowOffset(face,y);
		var spacing = face.eyebrow_spacing;
		var length = face.eyebrow_length;
		var angle = face.eyebrow_angle;
		
		this.canvas.drawLine({
						x: x - spacing,
						y: height,
						length: length,
						angle: angle,
						color: face.color,
						lineWidth: face.lineWidth
					
						
		});
		
		this.canvas.drawLine({
						x: x + spacing,
						y: height,
						length: 0-length,
						angle: -angle,	
						color: face.color,
						lineWidth: face.lineWidth
		});
		
	};
	
	FacePainter.prototype.drawNose = function (face, x, y) {
		
		var height = FacePainter.computeFaceOffset(face, face.nose_height, y);
		var nastril_r_x = x + face.nose_width / 2;
		var nastril_r_y = height + face.nose_length;
		var nastril_l_x = nastril_r_x - face.nose_width;
		var nastril_l_y = nastril_r_y; 
		
		this.canvas.ctx.lineWidth = face.lineWidth;
		this.canvas.ctx.strokeStyle = face.color;
		
		this.canvas.ctx.save();
		this.canvas.ctx.beginPath();
		this.canvas.ctx.moveTo(x,height);
		this.canvas.ctx.lineTo(nastril_r_x,nastril_r_y);
		this.canvas.ctx.lineTo(nastril_l_x,nastril_l_y);
		//this.canvas.ctx.closePath();
		this.canvas.ctx.stroke();
		this.canvas.ctx.restore();
	
	};
			
	FacePainter.prototype.drawMouth = function (face, x, y) {
		
		var height = FacePainter.computeFaceOffset(face, face.mouth_height, y);
		var startX = x - face.mouth_width / 2;
	    var endX = x + face.mouth_width / 2;
		
		var top_y = height - face.mouth_top_y;
		var bottom_y = height + face.mouth_bottom_y;
		
		// Upper Lip
		this.canvas.ctx.moveTo(startX,height);
	    this.canvas.ctx.quadraticCurveTo(x, top_y, endX, height);
	    this.canvas.ctx.stroke();
		
	    //Lower Lip
	    this.canvas.ctx.moveTo(startX,height);
	    this.canvas.ctx.quadraticCurveTo(x, bottom_y, endX, height);
	    this.canvas.ctx.stroke();
	   
	};	
	
	
	//TODO Scaling ?
	FacePainter.computeFaceOffset = function (face, offset, y) {
		var y = y || 0;
		//var pos = y - face.head_radius * face.scaleY + face.head_radius * face.scaleY * 2 * offset;
		var pos = y - face.head_radius + face.head_radius * 2 * offset;
		//console.log('POS: ' + pos);
		return pos;
	};
	
	FacePainter.computeEyebrowOffset = function (face, y) {
		var y = y || 0;
		var eyemindistance = 2;
		return FacePainter.computeFaceOffset(face, face.eye_height, y) - eyemindistance - face.eyebrow_eyedistance;
	};
	
	
	/*!
	* 
	* A description of a Chernoff Face.
	*
	* This class packages the 11-dimensional vector of numbers from 0 through 1 that completely
	* describe a Chernoff face.  
	*
	*/

	
	FaceVector.defaults = {
			// Head
			head_radius: {
				// id can be specified otherwise is taken head_radius
				min: 10,
				max: 100,
				step: 0.01,
				value: 30,
				label: 'Face radius'
			},
			head_scale_x: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 0.5,
				label: 'Scale head horizontally'
			},
			head_scale_y: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale head vertically'
			},
			// Eye
			eye_height: {
				min: 0.1,
				max: 0.9,
				step: 0.01,
				value: 0.4,
				label: 'Eye height'
			},
			eye_radius: {
				min: 2,
				max: 30,
				step: 0.01,
				value: 5,
				label: 'Eye radius'
			},
			eye_spacing: {
				min: 0,
				max: 50,
				step: 0.01,
				value: 10,
				label: 'Eye spacing'
			},
			eye_scale_x: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale eyes horizontally'
			},
			eye_scale_y: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale eyes vertically'
			},
			// Pupil
			pupil_radius: {
				min: 1,
				max: 9,
				step: 0.01,
				value: 1,  //this.eye_radius;
				label: 'Pupil radius'
			},
			pupil_scale_x: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale pupils horizontally'
			},
			pupil_scale_y: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale pupils vertically'
			},
			// Eyebrow
			eyebrow_length: {
				min: 1,
				max: 30,
				step: 0.01,
				value: 10,
				label: 'Eyebrow length'
			},
			eyebrow_eyedistance: {
				min: 0.3,
				max: 10,
				step: 0.01,
				value: 3, // From the top of the eye
				label: 'Eyebrow from eye'
			},
			eyebrow_angle: {
				min: -2,
				max: 2,
				step: 0.01,
				value: -0.5,
				label: 'Eyebrow angle'
			},
			eyebrow_spacing: {
				min: 0,
				max: 20,
				step: 0.01,
				value: 5,
				label: 'Eyebrow spacing'
			},
			// Nose
			nose_height: {
				min: 0.4,
				max: 1,
				step: 0.01,
				value: 0.4,
				label: 'Nose height'
			},
			nose_length: {
				min: 0.2,
				max: 30,
				step: 0.01,
				value: 15,
				label: 'Nose length'
			},
			nose_width: {
				min: 0,
				max: 30,
				step: 0.01,
				value: 10,
				label: 'Nose width'
			},
			// Mouth
			mouth_height: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 0.75, 
				label: 'Mouth height'
			},
			mouth_width: {
				min: 2,
				max: 100,
				step: 0.01,
				value: 20,
				label: 'Mouth width'
			},
			mouth_top_y: {
				min: -10,
				max: 30,
				step: 0.01,
				value: -2,
				label: 'Upper lip'
			},
			mouth_bottom_y: {
				min: -10,
				max: 30,
				step: 0.01,
				value: 20,
				label: 'Lower lip'
			}					
	};
	
	//Constructs a random face vector.
	FaceVector.random = function () {
	  var out = {};
	  for (var key in FaceVector.defaults) {
	    if (FaceVector.defaults.hasOwnProperty(key)) {
	      if (!JSUS.in_array(key,['color','lineWidth','scaleX','scaleY'])) {
	        out[key] = FaceVector.defaults[key].min + Math.random() * FaceVector.defaults[key].max;
	      }
	    }
	  }
	  
	  out.scaleX = 1;
	  out.scaleY = 1;
	  
	  out.color = 'green';
	  out.lineWidth = 1; 
	  
	  return new FaceVector(out);
	};
	
	function FaceVector (faceVector) {
		  var faceVector = faceVector || {};

		this.scaleX = faceVector.scaleX || 1;
		this.scaleY = faceVector.scaleY || 1;


		this.color = faceVector.color || 'green';
		this.lineWidth = faceVector.lineWidth || 1;
		  
		  // Merge on key
		 for (var key in FaceVector.defaults) {
		   if (FaceVector.defaults.hasOwnProperty(key)){
		     if (faceVector.hasOwnProperty(key)){
		       this[key] = faceVector[key];
		     }
		     else {
		       this[key] = FaceVector.defaults[key].value;
		     }
		   }
		 }
		  
		};

	//Constructs a random face vector.
	FaceVector.prototype.shuffle = function () {
		for (var key in this) {
			if (this.hasOwnProperty(key)) {
				if (FaceVector.defaults.hasOwnProperty(key)) {
					if (key !== 'color') {
						this[key] = FaceVector.defaults[key].min + Math.random() * FaceVector.defaults[key].max;
						
					}
				}
			}
		}
	};
	
	//Computes the Euclidean distance between two FaceVectors.
	FaceVector.prototype.distance = function (face) {
		return FaceVector.distance(this,face);
	};
		
		
	FaceVector.distance = function (face1, face2) {
		var sum = 0.0;
		var diff;
		
		for (var key in face1) {
			if (face1.hasOwnProperty(key)) {
				diff = face1[key] - face2[key];
				sum = sum + diff * diff;
			}
		}
		
		return Math.sqrt(sum);
	};
	
	FaceVector.prototype.toString = function() {
		var out = 'Face: ';
		for (var key in this) {
			if (this.hasOwnProperty(key)) {
				out += key + ' ' + this[key];
			}
		};
		return out;
	};

})(node);
(function (node) {

	var JSUS = node.JSUS;

	node.widgets.register('EventButton', EventButton);
	
// ## Defaults
	
	EventButton.defaults = {};
	EventButton.defaults.id = 'eventbutton';
	EventButton.defaults.fieldset = false;	
	
// ## Meta-data	
	
	EventButton.name = 'Event Button';
	EventButton.version = '0.2';
	
// ## Dependencies
	
	EventButton.dependencies = {
		JSUS: {}
	};
	
	function EventButton (options) {
		this.options = options;
		this.id = options.id;

		this.root = null;		// the parent element
		this.text = 'Send';
		this.button = document.createElement('button');
		this.callback = null;
		this.init(this.options);
	}
	
	EventButton.prototype.init = function (options) {
		options = options || this.options;
		this.button.id = options.id || this.id;
		var text = options.text || this.text;
		while (this.button.hasChildNodes()) {
			this.button.removeChild(this.button.firstChild);
		}
		this.button.appendChild(document.createTextNode(text));
		this.event = options.event || this.event;
		this.callback = options.callback || this.callback;
		var that = this;
		if (this.event) {
			// Emit Event only if callback is successful
			this.button.onclick = function() {
				var ok = true;
				if (this.callback){
					ok = options.callback.call(node.game);
				}
				if (ok) node.emit(that.event);
			};
		}
		
//		// Emit DONE only if callback is successful
//		this.button.onclick = function() {
//			var ok = true;
//			if (options.exec) ok = options.exec.call(node.game);
//			if (ok) node.emit(that.event);
//		}
	};
	
	EventButton.prototype.append = function (root) {
		this.root = root;
		root.appendChild(this.button);
		return root;	
	};
	
	EventButton.prototype.listeners = function () {};
		
// # Done Button
	
	node.widgets.register('DoneButton', DoneButton);
	
	DoneButton.prototype.__proto__ = EventButton.prototype;
	DoneButton.prototype.constructor = DoneButton;

// ## Meta-data
	
	DoneButton.id = 'donebutton';
	DoneButton.version = '0.1';
	DoneButton.name = 'Done Button';
	
// ## Dependencies
	
	DoneButton.dependencies = {
		EventButton: {}
	};
	
	function DoneButton (options) {
		options.event = 'DONE';
		options.text = options.text || 'Done!';
		EventButton.call(this, options);
	}
	
})(node);
(function (node) {
	
	var JSUS = node.JSUS,
		Table = node.window.Table;
	
	node.widgets.register('ChernoffFaces', ChernoffFaces);
	
	// ## Defaults
	
	ChernoffFaces.defaults = {};
	ChernoffFaces.defaults.id = 'ChernoffFaces';
	ChernoffFaces.defaults.canvas = {};
	ChernoffFaces.defaults.canvas.width = 100;
	ChernoffFaces.defaults.canvas.heigth = 100;
	
	// ## Meta-data
	
	ChernoffFaces.name = 'Chernoff Faces';
	ChernoffFaces.version = '0.3';
	ChernoffFaces.description = 'Display parametric data in the form of a Chernoff Face.';
	
	// ## Dependencies 
	ChernoffFaces.dependencies = {
		JSUS: {},
		Table: {},
		Canvas: {},
		'Controls.Slider': {}
	};
	
	ChernoffFaces.FaceVector = FaceVector;
	ChernoffFaces.FacePainter = FacePainter;
	
	function ChernoffFaces (options) {
		this.options = options;
		this.id = options.id;
		this.table = new Table({id: 'cf_table'});
		this.root = options.root || document.createElement('div');
		this.root.id = this.id;
		
		this.sc = node.widgets.get('Controls.Slider');	// Slider Controls
		this.fp = null;	// Face Painter
		this.canvas = null;

		this.change = 'CF_CHANGE';
		var that = this;
		this.changeFunc = function () {
			that.draw(that.sc.getAllValues());
		};
		
		this.features = null;
		this.controls = null;
		
		this.init(this.options);
	}
	
	ChernoffFaces.prototype.init = function (options) {
		var that = this;
		this.id = options.id || this.id;
		var PREF = this.id + '_';
		
		this.features = options.features || this.features || FaceVector.random();
		
		this.controls = ('undefined' !== typeof options.controls) ?  options.controls : true;
		
		var idCanvas = (options.idCanvas) ? options.idCanvas : PREF + 'canvas';
		var idButton = (options.idButton) ? options.idButton : PREF + 'button';
		
		this.canvas = node.window.getCanvas(idCanvas, options.canvas);
		this.fp = new FacePainter(this.canvas);		
		this.fp.draw(new FaceVector(this.features));
		
		var sc_options = {
			id: 'cf_controls',
			features: JSUS.mergeOnKey(FaceVector.defaults, this.features, 'value'),
			change: this.change,
			fieldset: {id: this.id + '_controls_fieldest', 
						legend: this.controls.legend || 'Controls'
			},
			submit: 'Send'
		};
		
		this.sc = node.widgets.get('Controls.Slider', sc_options);
		
		// Controls are always there, but may not be visible
		if (this.controls) {
			this.table.add(this.sc);
		}
		
		// Dealing with the onchange event
		if ('undefined' === typeof options.change) {	
			node.on(this.change, this.changeFunc); 
		} else {
			if (options.change) {
				node.on(options.change, this.changeFunc);
			}
			else {
				node.removeListener(this.change, this.changeFunc);
			}
			this.change = options.change;
		}
		
		
		this.table.add(this.canvas);
		this.table.parse();
		this.root.appendChild(this.table.table);
	};
	
	ChernoffFaces.prototype.getCanvas = function() {
		return this.canvas;
	};
	
	ChernoffFaces.prototype.append = function (root) {
		root.appendChild(this.root);
		this.table.parse();
		return this.root;
	};
	
	ChernoffFaces.prototype.draw = function (features) {
		if (!features) return;
		var fv = new FaceVector(features);
		this.fp.redraw(fv);
		// Without merging wrong values are passed as attributes
		this.sc.init({features: JSUS.mergeOnKey(FaceVector.defaults, features, 'value')});
		this.sc.refresh();
	};
	
	ChernoffFaces.prototype.getAllValues = function() {
		//if (this.sc) return this.sc.getAllValues();
		return this.fp.face;
	};
	
	ChernoffFaces.prototype.randomize = function() {
		var fv = FaceVector.random();
		this.fp.redraw(fv);
	
		var sc_options = {
				features: JSUS.mergeOnValue(FaceVector.defaults, fv),
				change: this.change
		};
		this.sc.init(sc_options);
		this.sc.refresh();
	
		return true;
	};
	
	
	// FacePainter
	// The class that actually draws the faces on the Canvas
	function FacePainter (canvas, settings) {
			
		this.canvas = new node.window.Canvas(canvas);
		
		this.scaleX = canvas.width / ChernoffFaces.defaults.canvas.width;
		this.scaleY = canvas.height / ChernoffFaces.defaults.canvas.heigth;
	}
	
	//Draws a Chernoff face.
	FacePainter.prototype.draw = function (face, x, y) {
		if (!face) return;
		this.face = face;
		this.fit2Canvas(face);
		this.canvas.scale(face.scaleX, face.scaleY);
		
		//console.log('Face Scale ' + face.scaleY + ' ' + face.scaleX );
		
		x = x || this.canvas.centerX;
		y = y || this.canvas.centerY;
		
		this.drawHead(face, x, y);
			
		this.drawEyes(face, x, y);
	
		this.drawPupils(face, x, y);
	
		this.drawEyebrow(face, x, y);
	
		this.drawNose(face, x, y);
		
		this.drawMouth(face, x, y);
		
	};		
		
	FacePainter.prototype.redraw = function (face, x, y) {
		this.canvas.clear();
		this.draw(face,x,y);
	};
	
	FacePainter.prototype.scale = function (x, y) {
		this.canvas.scale(this.scaleX, this.scaleY);
	};
	
	// TODO: Improve. It eats a bit of the margins
	FacePainter.prototype.fit2Canvas = function(face) {
		if (!this.canvas) {
		console.log('No canvas found');
			return;
		}
		
		var ration;
		if (this.canvas.width > this.canvas.height) {
			ratio = this.canvas.width / face.head_radius * face.head_scale_x;
		}
		else {
			ratio = this.canvas.height / face.head_radius * face.head_scale_y;
		}
		
		face.scaleX = ratio / 2;
		face.scaleY = ratio / 2;
	};
	
	FacePainter.prototype.drawHead = function (face, x, y) {
		
		var radius = face.head_radius;
		
		this.canvas.drawOval({
						x: x, 
						y: y,
						radius: radius,
						scale_x: face.head_scale_x,
						scale_y: face.head_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
	};
	
	FacePainter.prototype.drawEyes = function (face, x, y) {
		
		var height = FacePainter.computeFaceOffset(face, face.eye_height, y);
		var spacing = face.eye_spacing;
			
		var radius = face.eye_radius;
		//console.log(face);
		this.canvas.drawOval({
						x: x - spacing,
						y: height,
						radius: radius,
						scale_x: face.eye_scale_x,
						scale_y: face.eye_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
						
		});
		//console.log(face);
		this.canvas.drawOval({
						x: x + spacing,
						y: height,
						radius: radius,
						scale_x: face.eye_scale_x,
						scale_y: face.eye_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
	};
	
	FacePainter.prototype.drawPupils = function (face, x, y) {
			
		var radius = face.pupil_radius;
		var spacing = face.eye_spacing;
		var height = FacePainter.computeFaceOffset(face, face.eye_height, y);
		
		this.canvas.drawOval({
						x: x - spacing,
						y: height,
						radius: radius,
						scale_x: face.pupil_scale_x,
						scale_y: face.pupil_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
		
		this.canvas.drawOval({
						x: x + spacing,
						y: height,
						radius: radius,
						scale_x: face.pupil_scale_x,
						scale_y: face.pupil_scale_y,
						color: face.color,
						lineWidth: face.lineWidth
		});
	
	};
	
	FacePainter.prototype.drawEyebrow = function (face, x, y) {
		
		var height = FacePainter.computeEyebrowOffset(face,y);
		var spacing = face.eyebrow_spacing;
		var length = face.eyebrow_length;
		var angle = face.eyebrow_angle;
		
		this.canvas.drawLine({
						x: x - spacing,
						y: height,
						length: length,
						angle: angle,
						color: face.color,
						lineWidth: face.lineWidth
					
						
		});
		
		this.canvas.drawLine({
						x: x + spacing,
						y: height,
						length: 0-length,
						angle: -angle,	
						color: face.color,
						lineWidth: face.lineWidth
		});
		
	};
	
	FacePainter.prototype.drawNose = function (face, x, y) {
		
		var height = FacePainter.computeFaceOffset(face, face.nose_height, y);
		var nastril_r_x = x + face.nose_width / 2;
		var nastril_r_y = height + face.nose_length;
		var nastril_l_x = nastril_r_x - face.nose_width;
		var nastril_l_y = nastril_r_y; 
		
		this.canvas.ctx.lineWidth = face.lineWidth;
		this.canvas.ctx.strokeStyle = face.color;
		
		this.canvas.ctx.save();
		this.canvas.ctx.beginPath();
		this.canvas.ctx.moveTo(x,height);
		this.canvas.ctx.lineTo(nastril_r_x,nastril_r_y);
		this.canvas.ctx.lineTo(nastril_l_x,nastril_l_y);
		//this.canvas.ctx.closePath();
		this.canvas.ctx.stroke();
		this.canvas.ctx.restore();
	
	};
			
	FacePainter.prototype.drawMouth = function (face, x, y) {
		
		var height = FacePainter.computeFaceOffset(face, face.mouth_height, y);
		var startX = x - face.mouth_width / 2;
		var endX = x + face.mouth_width / 2;
		
		var top_y = height - face.mouth_top_y;
		var bottom_y = height + face.mouth_bottom_y;
		
		// Upper Lip
		this.canvas.ctx.moveTo(startX,height);
		this.canvas.ctx.quadraticCurveTo(x, top_y, endX, height);
		this.canvas.ctx.stroke();
		
		//Lower Lip
		this.canvas.ctx.moveTo(startX,height);
		this.canvas.ctx.quadraticCurveTo(x, bottom_y, endX, height);
		this.canvas.ctx.stroke();
	
	};	
	
	
	//TODO Scaling ?
	FacePainter.computeFaceOffset = function (face, offset, y) {
		y = y || 0;
		//var pos = y - face.head_radius * face.scaleY + face.head_radius * face.scaleY * 2 * offset;
		var pos = y - face.head_radius + face.head_radius * 2 * offset;
		//console.log('POS: ' + pos);
		return pos;
	};
	
	FacePainter.computeEyebrowOffset = function (face, y) {
		y = y || 0;
		var eyemindistance = 2;
		return FacePainter.computeFaceOffset(face, face.eye_height, y) - eyemindistance - face.eyebrow_eyedistance;
	};
	
	
	/*!
	* 
	* A description of a Chernoff Face.
	*
	* This class packages the 11-dimensional vector of numbers from 0 through 1 that completely
	* describe a Chernoff face.  
	*
	*/

	
	FaceVector.defaults = {
			// Head
			head_radius: {
				// id can be specified otherwise is taken head_radius
				min: 10,
				max: 100,
				step: 0.01,
				value: 30,
				label: 'Face radius'
			},
			head_scale_x: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 0.5,
				label: 'Scale head horizontally'
			},
			head_scale_y: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale head vertically'
			},
			// Eye
			eye_height: {
				min: 0.1,
				max: 0.9,
				step: 0.01,
				value: 0.4,
				label: 'Eye height'
			},
			eye_radius: {
				min: 2,
				max: 30,
				step: 0.01,
				value: 5,
				label: 'Eye radius'
			},
			eye_spacing: {
				min: 0,
				max: 50,
				step: 0.01,
				value: 10,
				label: 'Eye spacing'
			},
			eye_scale_x: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale eyes horizontally'
			},
			eye_scale_y: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale eyes vertically'
			},
			// Pupil
			pupil_radius: {
				min: 1,
				max: 9,
				step: 0.01,
				value: 1,  //this.eye_radius;
				label: 'Pupil radius'
			},
			pupil_scale_x: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale pupils horizontally'
			},
			pupil_scale_y: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 1,
				label: 'Scale pupils vertically'
			},
			// Eyebrow
			eyebrow_length: {
				min: 1,
				max: 30,
				step: 0.01,
				value: 10,
				label: 'Eyebrow length'
			},
			eyebrow_eyedistance: {
				min: 0.3,
				max: 10,
				step: 0.01,
				value: 3, // From the top of the eye
				label: 'Eyebrow from eye'
			},
			eyebrow_angle: {
				min: -2,
				max: 2,
				step: 0.01,
				value: -0.5,
				label: 'Eyebrow angle'
			},
			eyebrow_spacing: {
				min: 0,
				max: 20,
				step: 0.01,
				value: 5,
				label: 'Eyebrow spacing'
			},
			// Nose
			nose_height: {
				min: 0.4,
				max: 1,
				step: 0.01,
				value: 0.4,
				label: 'Nose height'
			},
			nose_length: {
				min: 0.2,
				max: 30,
				step: 0.01,
				value: 15,
				label: 'Nose length'
			},
			nose_width: {
				min: 0,
				max: 30,
				step: 0.01,
				value: 10,
				label: 'Nose width'
			},
			// Mouth
			mouth_height: {
				min: 0.2,
				max: 2,
				step: 0.01,
				value: 0.75, 
				label: 'Mouth height'
			},
			mouth_width: {
				min: 2,
				max: 100,
				step: 0.01,
				value: 20,
				label: 'Mouth width'
			},
			mouth_top_y: {
				min: -10,
				max: 30,
				step: 0.01,
				value: -2,
				label: 'Upper lip'
			},
			mouth_bottom_y: {
				min: -10,
				max: 30,
				step: 0.01,
				value: 20,
				label: 'Lower lip'
			}					
	};
	
	//Constructs a random face vector.
	FaceVector.random = function () {
		var out = {};
		for (var key in FaceVector.defaults) {
			if (FaceVector.defaults.hasOwnProperty(key)) {
				if (!JSUS.in_array(key,['color','lineWidth','scaleX','scaleY'])) {
					out[key] = FaceVector.defaults[key].min + Math.random() * FaceVector.defaults[key].max;
				}
			}
		}
	
		out.scaleX = 1;
		out.scaleY = 1;
		
		out.color = 'green';
		out.lineWidth = 1; 
		
		return new FaceVector(out);
	};
	
	function FaceVector (faceVector) {
		faceVector = faceVector || {};

		this.scaleX = faceVector.scaleX || 1;
		this.scaleY = faceVector.scaleY || 1;


		this.color = faceVector.color || 'green';
		this.lineWidth = faceVector.lineWidth || 1;
		
		// Merge on key
		for (var key in FaceVector.defaults) {
			if (FaceVector.defaults.hasOwnProperty(key)){
				if (faceVector.hasOwnProperty(key)){
					this[key] = faceVector[key];
				}
				else {
					this[key] = FaceVector.defaults[key].value;
				}
			}
		}
		
	}

	//Constructs a random face vector.
	FaceVector.prototype.shuffle = function () {
		for (var key in this) {
			if (this.hasOwnProperty(key)) {
				if (FaceVector.defaults.hasOwnProperty(key)) {
					if (key !== 'color') {
						this[key] = FaceVector.defaults[key].min + Math.random() * FaceVector.defaults[key].max;
						
					}
				}
			}
		}
	};
	
	//Computes the Euclidean distance between two FaceVectors.
	FaceVector.prototype.distance = function (face) {
		return FaceVector.distance(this,face);
	};
		
		
	FaceVector.distance = function (face1, face2) {
		var sum = 0.0;
		var diff;
		
		for (var key in face1) {
			if (face1.hasOwnProperty(key)) {
				diff = face1[key] - face2[key];
				sum = sum + diff * diff;
			}
		}
		
		return Math.sqrt(sum);
	};
	
	FaceVector.prototype.toString = function() {
		var out = 'Face: ';
		for (var key in this) {
			if (this.hasOwnProperty(key)) {
				out += key + ' ' + this[key];
			}
		}
		return out;
	};

})(node);
(function (node) {

	node.widgets.register('GameSummary', GameSummary);
	

// ## Defaults
	
	GameSummary.defaults = {};
	GameSummary.defaults.id = 'gamesummary';
	GameSummary.defaults.fieldset = { legend: 'Game Summary' };
	
// ## Meta-data
	
	GameSummary.name = 'Game Summary';
	GameSummary.version = '0.3';
	GameSummary.description = 'Show the general configuration options of the game.';
	
	function GameSummary (options) {
		this.summaryDiv = null;
	}
	
	GameSummary.prototype.append = function (root) {
		this.root = root;
		this.summaryDiv = node.window.addDiv(root);
		this.writeSummary();
		return root;
	};
	
	GameSummary.prototype.writeSummary = function (idState, idSummary) {
		var gName = document.createTextNode('Name: ' + node.game.name),
			gDescr = document.createTextNode('Descr: ' + node.game.description),
			gMinP = document.createTextNode('Min Pl.: ' + node.game.minPlayers),
			gMaxP = document.createTextNode('Max Pl.: ' + node.game.maxPlayers);
		
		this.summaryDiv.appendChild(gName);
		this.summaryDiv.appendChild(document.createElement('br'));
		this.summaryDiv.appendChild(gDescr);
		this.summaryDiv.appendChild(document.createElement('br'));
		this.summaryDiv.appendChild(gMinP);
		this.summaryDiv.appendChild(document.createElement('br'));
		this.summaryDiv.appendChild(gMaxP);
		
		node.window.addDiv(this.root, this.summaryDiv, idSummary);
	};

})(node);
(function (node) {
	
	node.widgets.register('MoneyTalks', MoneyTalks);
	
	var JSUS = node.JSUS;
	
// ## Defaults
	
	MoneyTalks.defaults = {};
	MoneyTalks.defaults.id = 'moneytalks';
	MoneyTalks.defaults.fieldset = {legend: 'Earnings'};
	
// ## Meta-data
	
	MoneyTalks.name = 'Money talks';
	MoneyTalks.version = '0.1.0';
	MoneyTalks.description = 'Display the earnings of a player.';

// ## Dependencies
	
	MoneyTalks.dependencies = {
		JSUS: {}
	};
	
	
	function MoneyTalks (options) {
		this.id = options.id || MoneyTalks.defaults.id;
				
		this.root = null;		// the parent element
		
		this.spanCurrency = document.createElement('span');
		this.spanMoney = document.createElement('span');
		
		this.currency = 'EUR';
		this.money = 0;
		this.precision = 2;
		this.init(options);
	}
	
	
	MoneyTalks.prototype.init = function (options) {
		this.currency = options.currency || this.currency;
		this.money = options.money || this.money;
		this.precision = options.precision || this.precision;
		
		this.spanCurrency.id = options.idCurrency || this.spanCurrency.id || 'moneytalks_currency';
		this.spanMoney.id = options.idMoney || this.spanMoney.id || 'moneytalks_money';
		
		this.spanCurrency.innerHTML = this.currency;
		this.spanMoney.innerHTML = this.money;
	};
	
	MoneyTalks.prototype.getRoot = function () {
		return this.root;
	};
	
	MoneyTalks.prototype.append = function (root, ids) {
		var PREF = this.id + '_';
		root.appendChild(this.spanMoney);
		root.appendChild(this.spanCurrency);
		return root;
	};
		
	MoneyTalks.prototype.listeners = function () {
		var that = this;
		node.on('MONEYTALKS', function(amount) {
			that.update(amount);
		}); 
	};
	
	MoneyTalks.prototype.update = function (amount) {
		if ('number' !== typeof amount) {
			// Try to parse strings
			amount = parseInt(amount);
			if (isNaN(n) || !isFinite(n)) {
				return;
			}
		}
		this.money += amount;
		this.spanMoney.innerHTML = this.money.toFixed(this.precision);
	};
	
})(node);
(function (node) {

	var GameMsg = node.GameMsg,
		Table = node.window.Table;
	
	node.widgets.register('MsgBar', MsgBar);

// ## Defaults
	
	MsgBar.defaults = {};
	MsgBar.defaults.id = 'msgbar';
	MsgBar.defaults.fieldset = { legend: 'Send MSG' };	
	
// ## Meta-data
	
	MsgBar.name = 'Msg Bar';
	MsgBar.version = '0.4';
	MsgBar.description = 'Send a nodeGame message to players';
	
	function MsgBar (options) {
		
		this.id = options.id;
		
		this.recipient = null;
		this.actionSel = null;
		this.targetSel = null;
		
		this.table = new Table();
			
		this.init();
	}
	
	// TODO: Write a proper INIT method
	MsgBar.prototype.init = function () {
		var that = this;
		var gm = new GameMsg();
		var y = 0;
		for (var i in gm) {
			if (gm.hasOwnProperty(i)) {
				var id = this.id + '_' + i;
				this.table.add(i, 0, y);
				this.table.add(node.window.getTextInput(id), 1, y);
				if (i === 'target') {
					this.targetSel = node.window.getTargetSelector(this.id + '_targets');
					this.table.add(this.targetSel, 2, y);
					
					this.targetSel.onchange = function () {
						node.window.getElementById(that.id + '_target').value = that.targetSel.value; 
					};
				}
				else if (i === 'action') {
					this.actionSel = node.window.getActionSelector(this.id + '_actions');
					this.table.add(this.actionSel, 2, y);
					this.actionSel.onchange = function () {
						node.window.getElementById(that.id + '_action').value = that.actionSel.value; 
					};
				}
				else if (i === 'to') {
					this.recipient = node.window.getRecipientSelector(this.id + 'recipients');
					this.table.add(this.recipient, 2, y);
					this.recipient.onchange = function () {
						node.window.getElementById(that.id + '_to').value = that.recipient.value; 
					};
				}
				y++;
			}
		}
		this.table.parse();
	};
	
	MsgBar.prototype.append = function (root) {
		
		var sendButton = node.window.addButton(root);
		var stubButton = node.window.addButton(root, 'stub', 'Add Stub');
		
		var that = this;
		sendButton.onclick = function() {
			// Should be within the range of valid values
			// but we should add a check
			
			var msg = that.parse();
			node.gsc.send(msg);
			//console.log(msg.stringify());
		};
		stubButton.onclick = function() {
			that.addStub();
		};
		
		root.appendChild(this.table.table);
		
		this.root = root;
		return root;
	};
	
	MsgBar.prototype.getRoot = function () {
		return this.root;
	};
	
	MsgBar.prototype.listeners = function () {
		var that = this;	
		node.onPLIST( function(msg) {
			node.window.populateRecipientSelector(that.recipient, msg.data);
		
		}); 
	};
	
	MsgBar.prototype.parse = function () {
		var msg = {};
		var that = this;
		var key = null;
		var value = null;
		this.table.forEach( function(e) {
			
				if (e.x === 0) {
					key = e.content;
					msg[key] = ''; 
				}
				else if (e.x === 1) {
					
					value = e.content.value;
					if (key === 'state' || key === 'data') {
						try {
							value = JSON.parse(e.content.value);
						}
						catch (ex) {
							value = e.content.value;
						}
					}
					
					msg[key] = value;
				}
		});
		var gameMsg = new GameMsg(msg);
		node.info(gameMsg, 'MsgBar sent: ');
		return gameMsg;
	};
	
	MsgBar.prototype.addStub = function () {
		node.window.getElementById(this.id + '_from').value = (node.player) ? node.player.id : 'undefined';
		node.window.getElementById(this.id + '_to').value = this.recipient.value;
		node.window.getElementById(this.id + '_forward').value = 0;
		node.window.getElementById(this.id + '_reliable').value = 1;
		node.window.getElementById(this.id + '_priority').value = 0;
		
		if (node.gsc && node.gsc.session) {
			node.window.getElementById(this.id + '_session').value = node.gsc.session;
		}
		
		node.window.getElementById(this.id + '_state').value = JSON.stringify(node.state);
		node.window.getElementById(this.id + '_action').value = this.actionSel.value;
		node.window.getElementById(this.id + '_target').value = this.targetSel.value;
		
	};
	
})(node);
(function (node) {
	
	node.widgets.register('Chat', Chat);
	
	var J = node.JSUS,
		W = node.window;	

// ## Defaults
	
	Chat.defaults = {};
	Chat.defaults.id = 'chat';
	Chat.defaults.fieldset = { legend: 'Chat' };	
	Chat.defaults.mode = 'MANY_TO_MANY'; 
	Chat.defaults.textarea_id = 'chat_textarea';
	Chat.defaults.chat_id = 'chat_chat';
	Chat.defaults.chat_event = 'CHAT';
	Chat.defaults.submit_id = 'chat_submit';
	Chat.defaults.submit_text = 'chat';

			
// ## Meta-data
	
	// ### Chat.modes
	// 	MANY_TO_MANY: everybody can see all the messages, and it possible
	//    to send private messages
	//  MANY_TO_ONE: everybody can see all the messages, private messages can
	//    be received, but not sent
	//  ONE_TO_ONE: everybody sees only personal messages, private messages can
	//    be received, but not sent. All messages are sent to the SERVER
	//  RECEIVER_ONLY: messages can only be received, but not sent
	Chat.modes = { 
			MANY_TO_MANY: 'MANY_TO_MANY',
			MANY_TO_ONE: 'MANY_TO_ONE',
			ONE_TO_ONE: 'ONE_TO_ONE',
			RECEIVER_ONLY: 'RECEIVER_ONLY'
	};
	
	Chat.name = 'Chat';
	Chat.version = '0.4';
	Chat.description = 'Offers a uni / bi-directional communication interface between players, or between players and the experimenter.';

// ## Dependencies
	
	Chat.dependencies = {
		JSUS: {}
	};
	
	function Chat (options) {
		this.id = options.id || Chat.id;
		this.mode = options.mode || Chat.defaults.mode;
		
		this.root = null;
		
		this.textarea_id = options.textarea_id || Chat.defaults.textarea_id;
		this.chat_id = options.chat_id || Chat.defaults.chat_id;
		this.submit_id = options.submit_id || Chat.defaults.submit_id;
		
		this.chat_event = options.chat_event || Chat.defaults.chat_event;
		this.submit_text = options.submit_text || Chat.defaults.submit_text;

		this.submit = W.getEventButton(this.chat_event, this.submit_text, this.submit_id);
		this.textarea = W.getElement('textarea', this.textarea_id);
		this.chat = W.getElement('div', this.chat_id);
		
		if ('undefined' !== typeof options.displayName) {
			this.displayName = options.displayName;
		}
		
		switch(this.mode) {
		
		case Chat.modes.RECEIVER_ONLY:
			this.recipient = {value: 'SERVER'};
			break;
		case Chat.modes.MANY_TO_ONE:
			this.recipient = {value: 'ALL'};
			break;
		case Chat.modes.ONE_TO_ONE:
			this.recipient = {value: 'SERVER'};
			break;
		default:
			this.recipient = W.getRecipientSelector();
		}
	}
	
	
	Chat.prototype.append = function (root) {
		this.root = root;
		root.appendChild(this.chat);
		
		if (this.mode !== Chat.modes.RECEIVER_ONLY) {	
			W.writeln('', root);
			root.appendChild(this.textarea);
			W.writeln('', root);
			root.appendChild(this.submit);
			if (this.mode === Chat.modes.MANY_TO_MANY) {
				root.appendChild(this.recipient);
			}
		}
		return root;
	};
	
	Chat.prototype.getRoot = function () {
		return this.root;
	};
	
	Chat.prototype.displayName = function(from) {
		return from;
	};
	
	Chat.prototype.readTA = function () {
		var txt = this.textarea.value;
		this.textarea.value = '';
		return txt;
	};
	
	Chat.prototype.writeTA = function (string, args) {
		J.sprintf(string, args, this.chat);
	    W.writeln('', this.chat);
	    this.chat.scrollTop = this.chat.scrollHeight;
	};
	
	Chat.prototype.listeners = function() {
		var that = this;	
		    
	    node.on(this.chat_event, function () {
	      var msg = that.readTA();
	      if (!msg) return;
	      
	      var to = that.recipient.value;
	      var args = {
		        '%s': {
		          'class': 'chat_me'
		        },
		        '%msg': {
		          'class': 'chat_msg'
		        },
		        '!txt': msg
	      };
	      that.writeTA('%sMe%s: %msg!txt%msg', args);
	      node.say(msg.trim(), that.chat_event, to);
	    });
		  
		if (this.mode === Chat.modes.MANY_TO_MANY) {
		    node.on('UPDATED_PLIST', function() {
			      W.populateRecipientSelector(that.recipient, node.game.pl.fetch());
		    });
		}

	    node.onDATA(this.chat_event, function (msg) {
	    	if (msg.from === node.player.id || msg.from === node.player.sid) {
	    		return;
	    	}
	    	
	    	if (this.mode === Chat.modes.ONE_TO_ONE) { 
		    	if (msg.from === this.recipient.value) {
		    		return;
		    	}
	    	}
	    	
	    	
	    	var from = that.displayName(msg.from);
	    	var args = {
		        '%s': {
		          'class': 'chat_others'
		        },
		        '%msg': {
		          'class': 'chat_msg'
		        },
		        '!txt': msg.data,
	            '!from': from
	      };
	    	
	      that.writeTA('%s!from%s: %msg!txt%msg', args);
	    });
	};
	
})(node);
(function (node) {
	
	node.widgets.register('VisualTimer', VisualTimer);
	
	var JSUS = node.JSUS;

// ## Defaults
	
	VisualTimer.defaults = {};
	VisualTimer.defaults.id = 'visualtimer';
	VisualTimer.defaults.fieldset = {
			legend: 'Time left',
			id: 'visualtimer_fieldset'
	};		
	
// ## Meta-data
	
	VisualTimer.name = 'Visual Timer';
	VisualTimer.version = '0.3.3';
	VisualTimer.description = 'Display a timer for the game. Timer can trigger events. Only for countdown smaller than 1h.';
	
// ## Dependencies
	
	VisualTimer.dependencies = {
		GameTimer : {},
		JSUS: {}
	};
	
	function VisualTimer (options) {
		this.options = options;
		this.id = options.id;

		this.gameTimer = null;
		
		this.timerDiv = null;	// the DIV in which to display the timer
		this.root = null;		// the parent element
		
		this.init(this.options);
	}
	
	VisualTimer.prototype.init = function (options) {
		options = options || this.options;
		var that = this;
		(function initHooks() {
			if (options.hooks) {
				if (!options.hooks instanceof Array) {
					options.hooks = [options.hooks];
				}
			}
			else {
				options.hooks = [];
			}
			
			options.hooks.push({hook: that.updateDisplay,
								ctx: that
			});
		})();
		
		
		this.gameTimer = (options.gameTimer) || new node.GameTimer();
		
		if (this.gameTimer) {
			this.gameTimer.init(options);
		}
		else {
			node.log('GameTimer object could not be initialized. VisualTimer will not work properly.', 'ERR');
		}
		
		if (this.timerDiv) {
			this.timerDiv.className = options.className || '';
		}
		
	};
	
	VisualTimer.prototype.getRoot = function () {
		return this.root;
	};
	
	VisualTimer.prototype.append = function (root) {
		this.root = root;
		this.timerDiv = node.window.addDiv(root, this.id + '_div');
		this.updateDisplay();
		return root;	
	};
	
	VisualTimer.prototype.updateDisplay = function () {
		if (!this.gameTimer.milliseconds || this.gameTimer.milliseconds === 0) {
			this.timerDiv.innerHTML = '00:00';
			return;
		}
		var time = this.gameTimer.milliseconds - this.gameTimer.timePassed;
		time = JSUS.parseMilliseconds(time);
		var minutes = (time[2] < 10) ? '' + '0' + time[2] : time[2];
		var seconds = (time[3] < 10) ? '' + '0' + time[3] : time[3];
		this.timerDiv.innerHTML = minutes + ':' + seconds;
	};
	
	VisualTimer.prototype.start = function() {
		this.updateDisplay();
		this.gameTimer.start();
	};
	
	VisualTimer.prototype.restart = function (options) {
		this.init(options);
		this.start();
	};
	
	VisualTimer.prototype.stop = function (options) {
		this.gameTimer.stop();
	};
	
	VisualTimer.prototype.resume = function (options) {
		this.gameTimer.resume();
	};
		
	VisualTimer.prototype.listeners = function () {
		var that = this;
		node.on('LOADED', function() {
			var timer = node.game.gameLoop.getAllParams(node.game.gameState).timer;
			if (timer) {
				timer = JSUS.clone(timer);
				that.timerDiv.className = '';
				var options = {},
					typeoftimer = typeof timer; 
				switch (typeoftimer) {
				
					case 'number':
						options.milliseconds = timer;
						break;
					case 'object':
						options = timer;
						break;
					case 'function':
						options.milliseconds = timer
						break;
					case 'string':
						options.milliseconds = Number(timer);
						break;
				};
			
				if (!options.milliseconds) return;
			
				if ('function' === typeof options.milliseconds) {
					options.milliseconds = options.milliseconds.call(node.game);
				}
				
				if (!options.timeup) {
					options.timeup = 'DONE';
				}
				
				that.gameTimer.init(options);
				that.start();
			}
		});
		
		node.on('DONE', function() {
			// TODO: This should be enabled again
			that.gameTimer.stop();
			that.timerDiv.className = 'strike';
		});
	};
	
})(node);
(function (node) {
	
	
	// TODO: Introduce rules for update: other vs self
	
	node.widgets.register('NextPreviousState', NextPreviousState);
	
// ## Defaults
	
	NextPreviousState.defaults = {};
	NextPreviousState.defaults.id = 'nextprevious';
	NextPreviousState.defaults.fieldset = { legend: 'Rew-Fwd' };		
	
// ## Meta-data
	
	NextPreviousState.name = 'Next,Previous State';
	NextPreviousState.version = '0.3.1';
	NextPreviousState.description = 'Adds two buttons to push forward or rewind the state of the game by one step.';
		
	function NextPreviousState(options) {
		this.id = options.id;
	}
	
	NextPreviousState.prototype.getRoot = function () {
		return this.root;
	};
	
	NextPreviousState.prototype.append = function (root) {
		var idRew = this.id + '_button';
		var idFwd = this.id + '_button';
		
		var rew = node.window.addButton(root, idRew, '<<');
		var fwd = node.window.addButton(root, idFwd, '>>');
		
		
		var that = this;
	
		var updateState = function (state) {
			if (state) {
				var stateEvent = node.IN + node.actions.SAY + '.STATE';
				var stateMsg = node.msg.createSTATE(stateEvent, state);
				// Self Update
				node.emit(stateEvent, stateMsg);
				
				// Update Others
				stateEvent = node.OUT + node.actions.SAY + '.STATE';
				node.emit(stateEvent, state, 'ALL');
			}
			else {
				node.log('No next/previous state. Not sent', 'ERR');
			}
		};
		
		fwd.onclick = function() {
			updateState(node.game.next());
		};
			
		rew.onclick = function() {
			updateState(node.game.previous());
		};
		
		this.root = root;
		return root;
	};
	
})(node);
(function (node) {
	
	node.widgets.register('Wall', Wall);
	
	var JSUS = node.JSUS;

// ## Defaults
	
	Wall.defaults = {};
	Wall.defaults.id = 'wall';
	Wall.defaults.fieldset = { legend: 'Game Log' };		
	
// ## Meta-data
	

	Wall.name = 'Wall';
	Wall.version = '0.3';
	Wall.description = 'Intercepts all LOG events and prints them ';
	Wall.description += 'into a DIV element with an ordinal number and a timestamp.';

// ## Dependencies
	
	Wall.dependencies = {
		JSUS: {}
	};
	
	function Wall (options) {
		this.id = options.id || Wall.id;
		this.name = options.name || this.name;
		this.buffer = [];
		this.counter = 0;

		this.wall = node.window.getElement('pre', this.id);
	}
	
	Wall.prototype.init = function (options) {
		options = options || {};
		this.counter = options.counter || this.counter;
	};
	
	Wall.prototype.append = function (root) {
		return root.appendChild(this.wall);
	};
	
	Wall.prototype.getRoot = function () {
		return this.wall;
	};
	
	Wall.prototype.listeners = function() {
		var that = this;	
		node.on('LOG', function (msg) {
			that.debuffer();
			that.write(msg);
		});
	}; 
	
	Wall.prototype.write = function (text) {
		if (document.readyState !== 'complete') {
			this.buffer.push(s);
		} else {
			var mark = this.counter++ + ') ' + JSUS.getTime() + ' ';
			this.wall.innerHTML = mark + text + "\n" + this.wall.innerHTML;
		}
	};

	Wall.prototype.debuffer = function () {
		if (document.readyState === 'complete' && this.buffer.length > 0) {
			for (var i=0; i < this.buffer.length; i++) {
				this.write(this.buffer[i]);
			}
			this.buffer = [];
		}
	};
	
})(node);
(function (node) {

	var GameState = node.GameState,
		PlayerList = node.PlayerList;
	
	
	node.widgets.register('GameTable', GameTable);
	
// ## Defaults
	
	GameTable.defaults = {};
	GameTable.defaults.id = 'gametable';
	GameTable.defaults.fieldset = { 
			legend: 'Game Table',
			id: 'gametable_fieldset'
	};
	
// ## Meta-data
	
	GameTable.name = 'Game Table';
	GameTable.version = '0.2';
	
// ## Dependencies
	
	GameTable.dependencies = {
		JSUS: {}
	};
	
	function GameTable (options) {
		this.options = options;
		this.id = options.id;
		this.name = options.name || GameTable.name;
				
		this.root = null;
		this.gtbl = null;
		this.plist = null;
		
		this.init(this.options);
	}
	
	GameTable.prototype.init = function (options) {
		
		if (!this.plist) this.plist = new PlayerList();
		
		this.gtbl = new node.window.Table({
											auto_update: true,
											id: options.id || this.id,
											render: options.render
		}, node.game.memory.db);
		
		
		this.gtbl.c('state', GameState.compare);
		
		this.gtbl.setLeft([]);
		
		this.gtbl.parse(true);
	};
	

	GameTable.prototype.addRenderer = function (func) {
		return this.gtbl.addRenderer(func);
	};
	
	GameTable.prototype.resetRender = function () {
		return this.gtbl.resetRenderer();
	};
	
	GameTable.prototype.removeRenderer = function (func) {
		return this.gtbl.removeRenderer(func);
	};
	
	GameTable.prototype.append = function (root) {
		this.root = root;
		root.appendChild(this.gtbl.table);
		return root;
	};
	
	GameTable.prototype.listeners = function () {
		var that = this;
		
		node.onPLIST(function(msg) {	
			if (!msg.data.length) return;
			
			//var diff = JSUS.arrayDiff(msg.data,that.plist.db);
			var plist = new PlayerList({}, msg.data);
			var diff = plist.diff(that.plist);
			if (diff) {
//				console.log('New Players found');
//				console.log(diff);
				diff.forEach(function(el){that.addPlayer(el);});
			}

			that.gtbl.parse(true);
		});
		
		node.on('in.set.DATA', function (msg) {

			that.addLeft(msg.state, msg.from);
			var x = that.player2x(msg.from);
			var y = that.state2y(node.game.state, msg.text);
			
			that.gtbl.add(msg.data, x, y);
			that.gtbl.parse(true);
		});
	}; 
	
	GameTable.prototype.addPlayer = function (player) {
		this.plist.add(player);
		var header = this.plist.map(function(el){return el.name;});
		this.gtbl.setHeader(header);
	};
	
	GameTable.prototype.addLeft = function (state, player) {
		if (!state) return;
		state = new GameState(state);
		if (!JSUS.in_array({content:state.toString(), type: 'left'}, this.gtbl.left)){
			this.gtbl.add2Left(state.toString());
		}
		// Is it a new display associated to the same state?
		else {
			var y = this.state2y(state);
			var x = this.player2x(player);
			if (this.gtbl.select('y','=',y).select('x','=',x).count() > 1) {
				this.gtbl.add2Left(state.toString());
			}
		}
			
	};
	
	GameTable.prototype.player2x = function (player) {
		if (!player) return false;
		return this.plist.select('id', '=', player).first().count;
	};
	
	GameTable.prototype.x2Player = function (x) {
		if (!x) return false;
		return this.plist.select('count', '=', x).first().count;
	};
	
	GameTable.prototype.state2y = function (state) {
		if (!state) return false;
		return node.game.gameLoop.indexOf(state);
	};
	
	GameTable.prototype.y2State = function (y) {
		if (!y) return false;
		return node.game.gameLoop.jumpTo(new GameState(),y);
	};
	
	

})(node);

(function (node) {
	
	// TODO: Introduce rules for update: other vs self
	
	node.widgets.register('StateBar', StateBar);	
	
// ## Defaults
	
	StateBar.defaults = {};
	StateBar.defaults.id = 'statebar';
	StateBar.defaults.fieldset = { legend: 'Change Game State' };	
	
// ## Meta-data
	
	StateBar.name = 'State Bar';
	StateBar.version = '0.3.1';
	StateBar.description = 'Provides a simple interface to change the state of the game.';
	
	function StateBar (options) {
		this.id = options.id;
		this.recipient = null;
	}
	
	StateBar.prototype.getRoot = function () {
		return this.root;
	};
	
	StateBar.prototype.append = function (root) {
		
		var PREF = this.id + '_';
		
		var idButton = PREF + 'sendButton',
			idStateSel = PREF + 'stateSel',
			idRecipient = PREF + 'recipient'; 
				
		var sendButton = node.window.addButton(root, idButton);
		var stateSel = node.window.addStateSelector(root, idStateSel);
		this.recipient = node.window.addRecipientSelector(root, idRecipient);
		
		var that = this;
		
		node.on('UPDATED_PLIST', function() {
			node.window.populateRecipientSelector(that.recipient, node.game.pl);
		});
		
		sendButton.onclick = function() {
	
			// Should be within the range of valid values
			// but we should add a check
			var to = that.recipient.value;
			
			// STATE.STEP:ROUND
			var parseState = /^(\d+)(?:\.(\d+))?(?::(\d+))?$/;
			
			var result = parseState.exec(stateSel.value);
			var state, step, round, stateEvent, stateMsg;
			if (result !== null) {
				// Note: not result[0]!
				state = result[1];
				step = result[2] || 1;
				round = result[3] || 1;
				
				node.log('Parsed State: ' + result.join("|"));
				
				state = new node.GameState({
					state: state,
					step: step,
					round: round
				});
				
				// Self Update
				if (to === 'ALL') {
					stateEvent = node.IN + node.actions.SAY + '.STATE';
					stateMsg = node.msg.createSTATE(stateEvent, state);
					node.emit(stateEvent, stateMsg);
				}
				
				// Update Others
				stateEvent = node.OUT + node.actions.SAY + '.STATE';
				node.emit(stateEvent, state, to);
			}
			else {
				node.err('Not valid state. Not sent.');
				node.socket.sendTXT('E: not valid state. Not sent');
			}
		};
		
		this.root = root;
		return root;
	};
	
})(node);