/**
 * # NDDB: N-Dimensional Database
 * 
 * MIT Licensed
 * 
 * NDDB is a powerful and versatile object database for node.js and the browser.
 *
 * See README.md for help.
 * 
 * ---
 * 
 */

(function (exports, J, store) {

NDDB.compatibility = J.compatibility();
	
// Expose constructors
exports.NDDB = NDDB;

// ### NDDB.log
// Stdout redirect
NDDB.log = console.log;


/**
 * ### NDDB.retrocycle
 * 
 * Removes cyclic references from an object
 * 
 * @param {object} e The object to decycle
 * @return {object} e The decycled object
 * 
 * @see https://github.com/douglascrockford/JSON-js/
 */
NDDB.decycle = function(e) {
	if (JSON && JSON.decycle && 'function' === typeof JSON.decycle) {
		e = JSON.decycle(e);
	}
	return e;
};

/**
 * ### NDDB.retrocycle
 * 
 * Restores cyclic references in an object previously decycled
 * 
 * @param {object} e The object to retrocycle
 * @return {object} e The retrocycled object
 * 
 * @see https://github.com/douglascrockford/JSON-js/
 */
NDDB.retrocycle = function(e) {
	if (JSON && JSON.retrocycle && 'function' === typeof JSON.retrocycle) {
		e = JSON.retrocycle(e);
	}
	return e;
};


/**
 * ## NDDB constructor
 *
 * Creates a new instance of NDDB
 * 
 * @param {object} options Optional. Configuration options
 * @param {db} db Optional. An initial set of items to import
 * 
 */
function NDDB (options, db) {                
    options = options || {};
    
    if (!J) throw new Error('JSUS not found.');
    
    // ## Public properties
    
    // ### db
    // The default database
    this.db = [];
    
    // ###tags
    // The tags list
    this.tags = {};
    
    // ### hooks
    // The list of hooks and associated callbacks
    this.hooks = {
		insert: [],
    	remove: [],
    	update: []
    };
    
    // ### nddb_pointer
    // Pointer for iterating along all the elements
    this.nddb_pointer = 0; 
    
    // ### length
    // The number of items in the database
    if (NDDB.compatibility.getter) {
    	this.__defineGetter__('length', function() { return this.db.length; });
    }
	else {
    	this.length = null;
    }
   
    // ### query
    // QueryBuilder obj
    this.query = new QueryBuilder();
    
    // ### __C
    // List of comparator functions
    this.__C = {};
    
    // ### __H
    // List of hash functions
    this.__H = {};
    
    // ### __I
    // List of index functions
    this.__I = {};
    
    // ### __I
    // List of view functions
    this.__V = {};
    
    // ### __update
    // Auto update options container
    this.__update = {};
    
    // ### __update.pointer
    // If TRUE, nddb_pointer always points to the last insert
    this.__update.pointer 	= false;
    
    // ### __update.indexes
    // If TRUE, rebuild indexes on every insert and remove
    this.__update.indexes 	= false;
    
    // ### __update.sort
    // If TRUE, sort db on every insert and remove
    this.__update.sort 		= false;
    
    this.init(options);
    this.importDB(db);   
};

// ## METHODS

/**
 * ### NDDB.init
 * 
 * Sets global options based on local configuration
 * 
 * @param {object} options Optional. Configuration options
 * 
 */
NDDB.prototype.init = function(options) {
	options = options || {};
	
	this.__options = options;
	
	if (options.log) {
		NDDB.log = options.log;
	}
    
	if (options.C) {
		this.__C = options.C;
	}
	
	if (options.H) {
		this.__H = options.H;
	}
	
	if (options.I) {
		this.__I = options.I;
	}
	
	if (options.V) {
		this.__V = options.V;
	}
	
	if (options.tags) {
		this.tags = options.tags;
	}
    
    if (options.nddb_pointer > 0) {
    	this.nddb_pointer = options.nddb_pointer;
	}
    
    if (options.hooks) {
    	this.hooks = options.hooks;
    }
    
    if (options.update) {
        if ('undefined' !== typeof options.update.pointer) {
        	this.__update.pointer = options.update.pointer;
        }
           
        if ('undefined' !== typeof options.update.indexes) {
        	this.__update.indexes = options.update.indexes;
        }
                                        
        if ('undefined' !== typeof options.update.sort) {
        	this.__update.sort = options.update.sort;
        }
    }
    
    if ('object' === typeof options.operators) {
    	for (var op in options.operators) {
    		this.query.registerOperator(op, options.operators[op]);
    	}
    }
};

// ## CORE

/**
 * ### NDDB.globalCompare
 * 
 * Dummy compare function
 * 
 * Used to sort elements in the database
 * 
 * By default, if both elements are not `undefined`, 
 * the first object is considered to preceeds the 
 * second.
 * 
 * Override to define a proper compare function, returning:
 * 
 *  - 0 if the objects are the same
 *  - a positive number if o2 precedes o1 
 *  - a negative number if o1 precedes o2 
 * 
 * @param {object} o1 The first object to compare
 * @param {object} o1 The second object to compare
 * @return {number} The result of the comparison
 * 
 */
NDDB.prototype.globalCompare = function(o1, o2) {
    if ('undefined' === typeof o1 && 'undefined' === typeof o2) return 0;
    if ('undefined' === typeof o2) return -1;  
    if ('undefined' === typeof o1) return 1;
    return -1;
};

/**
 * ### NDDB._autoUpdate
 *
 * Performs a series of automatic checkings 
 * and updates the db according to current 
 * configuration
 * 
 * @api private
 * @param {object} options Optional. Configuration object
 */
NDDB.prototype._autoUpdate = function (options) {
	var update = options ? J.merge(this.__update, options) : this.__update;
	
    if (update.pointer) {
        this.nddb_pointer = this.db.length-1;
    }
    if (update.sort) {
        this.sort();
    }
    
    if (update.indexes) {
        this.rebuildIndexes();
    }
};


function nddb_insert(o, update) {
	if (o === null) return;
	var type = typeof(o);
	if (type === 'undefined') return;
	if (type === 'string') return;
	if (type === 'number') return;
	this.db.push(o);
	if (update) {
		this._indexIt(o, (this.db.length-1));
		this._hashIt(o);
		this._viewIt(o);
	}
    this.emit('insert', o);
}

/**
 * ### NDDB.importDB
 * 
 * Imports an array of items at once
 * 
 * @param {array} db Array of items to import
 */
NDDB.prototype.importDB = function (db) {
    if (!db) return;
    for (var i = 0; i < db.length; i++) {
        nddb_insert.call(this, db[i], this.__update.indexes);
    }
    this._autoUpdate({indexes: false});
};
    
/**
 * ### NDDB.insert
 * 
 * Insert an item into the database
 * 
 * Item must be of type object or function. 
 * 
 * The following entries will be ignored:
 * 
 * 	- strings
 * 	- numbers
 * 	- undefined
 * 	- null
 * 
 * @param {object} o The item or array of items to insert
 * @see NDDB._insert
 */
NDDB.prototype.insert = function (o) {
	nddb_insert.call(this, o, this.__update.indexes);
    this._autoUpdate({indexes: false});
};

/**
 * ### NDDB.breed
 *
 * Creates a clone of the current NDDB object
 * 
 * Takes care of calling the actual constructor
 * of the class, so that inheriting objects will
 * preserve their prototype.
 * 
 * @param {array} db Array of items to import in the new database
 * @return {NDDB} The new database 
 */
NDDB.prototype.breed = function (db) {
    db = db || this.db;
    //In case the class was inherited
    return new this.constructor(this.cloneSettings(), db);
};
    
/**
 * ### NDDB.cloneSettings
 *
 * Creates a configuration object to initialize
 * a new NDDB instance based on the current settings
 * and returns it
 * 
 * @return {object} options A copy of the current settings
 * 
 */
NDDB.prototype.cloneSettings = function () {
    var options = this.__options || {};
    
    options.H = 		this.__H;
    options.I = 		this.__I;
    options.C = 		this.__C;
    options.V = 		this.__V;
    options.tags = 		this.tags;
    options.update = 	this.__update;
    options.hooks = 	this.hooks;
    
    return J.clone(options);
};    

/**
 * ### NDDB.toString
 *
 * Returns a human-readable representation of the database
 * 
 * @return {string} out A human-readable representation of the database
 */
NDDB.prototype.toString = function () {
    var out = '';
    for (var i=0; i< this.db.length; i++) {
        out += this.db[i] + "\n";
    }    
    return out;
};    
    
/**
 * ### NDDB.stringify
 *
 * Returns a machine-readable representation of the database
 * 
 * Cyclic objects are decycled.
 * 
 * @param {boolean} TRUE, if compressed
 * @return {string} out A machine-readable representation of the database
 * 
 * @see JSUS.stringify
 */
NDDB.prototype.stringify = function (compressed) {
	if (!this.length) return '[]';
	compressed = ('undefined' === typeof compressed) ? true : compressed;
	
	var spaces = compressed ? 0 : 4;
	
    var out = '[';
    this.each(function(e) {
    	// decycle, if possible
    	e = NDDB.decycle(e);
    	out += J.stringify(e) + ', ';
    });
    out = out.replace(/, $/,']');

    return out;
};    


/**
 * ### NDDB.comparator
 *
 * Registers a comparator function for dimension d
 * 
 * Each time a comparison between two objects containing
 * property named as the specified dimension, the registered
 * comparator function will be used.
 * 
 * @param {string} d The name of the dimension
 * @param {function} comparator The comparator function
 * @return {boolean} TRUE, if registration was successful
 * 
 */
NDDB.prototype.comparator = function (d, comparator) {
    if (!d || !comparator) {
        NDDB.log('Cannot set empty property or empty comparator', 'ERR');
        return false;
    }
    this.__C[d] = comparator;
    return true;
};

// ### NDDB.c
// @deprecated 
NDDB.prototype.c = NDDB.prototype.comparator;

/**
 * ### NDDB.getComparator
 *
 * Retrieves the comparator function for dimension d.
 *  
 * If no comparator function is found, returns a generic
 * comparator function. 
 * 
 * @param {string} d The name of the dimension
 * @return {function} The comparator function
 * 
 * @see NDDB.compare
 */
NDDB.prototype.getComparator = function (d) {
    if ('undefined' !== typeof this.__C[d]) {
    	return this.__C[d]; 
    }
    
    return function (o1, o2) {
// <!--    	
//            NDDB.log('1' + o1);
//            NDDB.log('2' + o2);
// -->    	
        if ('undefined' === typeof o1 && 'undefined' === typeof o2) return 0;
        if ('undefined' === typeof o1) return 1;
        if ('undefined' === typeof o2) return -1;        
        var v1 = J.getNestedValue(d,o1);
        var v2 = J.getNestedValue(d,o2);
// <!--
//            NDDB.log(v1);
//            NDDB.log(v2);
// -->        
        if ('undefined' === typeof v1 && 'undefined' === typeof v2) return 0;
        if ('undefined' === typeof v1) return 1;
        if ('undefined' === typeof v2) return -1;
        if (v1 > v2) return 1;
        if (v2 > v1) return -1;
        return 0;
    };    
};

/**
 * ### NDDB.isReservedWord
 *
 * Returns TRUE if a property or a method with the same name
 * already exists in the current instance od NDDB 
 * 
 * @param {string} key The name of the property
 * @return {boolean} TRUE, if the property exists
 */
NDDB.prototype.isReservedWord = function (key) {
	return (this[key]) ? true : false; 
};

/**
 * ### NDDB._isValidIndex
 *
 * Returns TRUE if the index is not a reserved word, otherwise
 * displays an error and returns FALSE. 
 * 
 * @param {string} key The name of the property
 * @return {boolean} TRUE, if the index has a valid name
 */
NDDB.prototype._isValidIndex = function (idx) {
	if ('undefined' === typeof idx) {
		NDDB.log('A valid index name must be provided', 'ERR');
		return false;
	}
	if (this.isReservedWord(idx)) {
		var str = 'A reserved word have been selected as an index. ';
		str += 'Please select another one: ' + idx;
		NDDB.log(str, 'ERR');
		return false;
	}
	return true;
};

/**
 * ### NDDB.index
 *
 * Registers a new indexing function
 * 
 * Indexing functions give fast direct access to the 
 * entries of the dataset.
 * 
 * A new object `NDDB[idx]` is created, whose properties 
 * are the elements indexed by the function.
 * 
 * An indexing function must return a _string_ with a unique name of  
 * the property under which the entry will registered, or _undefined_ if
 * the entry does not need to be indexed.
 * 
 * @param {string} idx The name of index
 * @param {function} func The hashing function
 * @return {boolean} TRUE, if registration was successful
 * 
 * @see NDDB.isReservedWord
 * @see NDDB.rebuildIndexes
 * 
 */
NDDB.prototype.index = function (idx, func) {
	if (!func || !this._isValidIndex(idx)) return false;
	this.__I[idx] = func, this[idx] = new NDDBIndex(idx, this);
	return true;
};


// ### NDDB.i
// @deprecated
NDDB.prototype.i = NDDB.prototype.index;

/**
 * ### NDDB.view
 *
 * Registers a new view function
 * 
 * View functions create a _view_ on the database that
 * excludes automatically some of the entries.
 * 
 * A nested NDDB dataset is created as `NDDB[idx]`, containing 
 * all the items that the callback function returns. If the 
 * callback returns _undefined_ the entry will be ignored.
 * 
 * @param {string} idx The name of index
 * @param {function} func The hashing function
 * @return {boolean} TRUE, if registration was successful
 * 
 * @see NDDB.hash
 * @see NDDB.isReservedWord
 * @see NDDB.rebuildIndexes
 * 
 */
NDDB.prototype.view = function (idx, func) {
	if (!func || !this._isValidIndex(idx)) return false;
	this.__V[idx] = func, this[idx] = new this.constructor();
	return true;
};

/**
 * ### NDDB.hash
 *
 * Registers a new hashing function
 * 
 * Hash functions create an index containing multiple sub-_views_.
 * 
 * A new object `NDDB[idx]` is created, whose properties 
 * are _views_ on the original dataset.
 * 
 * An hashing function must return a _string_ representing the 
 * view under which the entry will be added, or _undefined_ if
 * the entry does not belong to any view of the index.
 * 
 * @param {string} idx The name of index
 * @param {function} func The hashing function
 * @return {boolean} TRUE, if registration was successful
 * 
 * @see NDDB.view
 * @see NDDB.isReservedWord
 * @see NDDB.rebuildIndexes
 * 
 */
NDDB.prototype.hash = function (idx, func) {
	if (!func || !this._isValidIndex(idx)) return false;
	this.__H[idx] = func, this[idx] = {};
	return true;
};

//### NDDB.h
//@deprecated
NDDB.prototype.h = NDDB.prototype.hash; 


/**
 * ### NDDB.resetIndexes
 *
 * Resets all the database indexes, hashs, and views 
 * 
 * @see NDDB.rebuildIndexes
 * @see NDDB.index
 * @see NDDB.view
 * @see NDDB.hash
 * @see NDDB._indexIt
 * @see NDDB._viewIt
 * @see NDDB._hashIt
 */
NDDB.prototype.resetIndexes = function(options) {
	var reset = options || J.merge({
		h: true,
		v: true,
		i: true
	}, options);
	var key;
	if (reset.h) {
	  for (key in this.__H) {
		  if (this.__H.hasOwnProperty(key)) {
			  this[key] = {};
		  }
	  }
	}
	if (reset.v) {
	  for (key in this.__V) {
		  if (this.__V.hasOwnProperty(key)) {
			  this[key] = new this.constructor();
		  }
	  }
	}
	if (reset.v) {
	  for (key in this.__I) {
		  if (this.__I.hasOwnProperty(key)) {
			  this[key] = new NDDBIndex(key, this);
		  }
	  }
	}

};

/**
 * ### NDDB.rebuildIndexes
 *
 * Rebuilds all the database indexes, hashs, and views 
 * 
 * @see NDDB.resetIndexes
 * @see NDDB.index
 * @see NDDB.view
 * @see NDDB.hash
 * @see NDDB._indexIt
 * @see NDDB._viewIt
 * @see NDDB._hashIt
 */
NDDB.prototype.rebuildIndexes = function() {
	var h = !(J.isEmpty(this.__H)),
		i = !(J.isEmpty(this.__I)),
		v = !(J.isEmpty(this.__V));
	
	var cb, idx;
	if (!h && !i && !v) return;
	
	// Reset current indexes
	this.resetIndexes({h: h, v: v, i: i});
	
	if (h && !i && !v) {
		cb = this._hashIt;
	}
	else if (!h && i && !v) {
		cb = this._indexIt;
	}
	else if (!h && !i && v) {
		cb = this._viewIt;
	}
	else if (h && i && !v) {
		cb = function(o, idx) {
			this._hashIt(o);
			this._indexIt(o, idx);
		};
	}
	else if (!h && i && v) {
		cb = function(o, idx) {
			this._indexIt(o, idx);
			this._viewIt(o);
		};
	}
	else if (h && !i && v) {
		cb = function(o, idx) {
			this._hashIt(o);
			this._viewIt(o);
		};
	}
	else {
		cb = function(o, idx) {
			this._indexIt(o, idx);
			this._hashIt(o);
			this._viewIt(o);
		};
	}
	
	for (idx = 0 ; idx < this.db.length ; idx++) {
		// _hashIt and viewIt do not need idx, it is no harm anyway
		cb.call(this, this.db[idx], idx);
	}
};

/**
 * ### NDDB._indexIt
 *
 * Indexes an element
 * 
 * @param {object} o The element to index
 * @param {object} o The position of the element in the database array
 */
NDDB.prototype._indexIt = function(o, dbidx) {
  	if (!o || J.isEmpty(this.__I)) return;
	var func, id, index;
	
	for (var key in this.__I) {
		if (this.__I.hasOwnProperty(key)) {
			func = this.__I[key];	    			
			index = func(o);

			if ('undefined' === typeof index) continue;
			
			if (!this[key]) this[key] = new NDDBIndex(key, this);
			this[key]._add(index, dbidx);
		}
	}
};

/**
 * ### NDDB._viewIt
 *
 * Adds an element to a view
 * 
 * @param {object} o The element to index
 */
NDDB.prototype._viewIt = function(o) {
  	if (!o || J.isEmpty(this.__V)) return;
	
	var func, id, index;
	
	for (var key in this.__V) {
		if (this.__V.hasOwnProperty(key)) {
			func = this.__V[key];
			index = func(o);
			if ('undefined' === typeof index) continue;
			
			if (!this[key]) this[key] = new this.constructor();
			this[key].insert(o);
		}
	}
};

/**
 * ### NDDB._hashIt
 *
 * Hashes an element
 * 
 * @param {object} o The element to hash
 * @return {boolean} TRUE, if insertion to an index was successful
 * 
 */
NDDB.prototype._hashIt = function(o) {
  	if (!o || J.isEmpty(this.__H)) return false;
	
	var h, id, hash;
	
	for (var key in this.__H) {
		if (this.__H.hasOwnProperty(key)) {
			h = this.__H[key];	    			
			hash = h(o);

			if ('undefined' === typeof hash) continue;
			if (!this[key]) this[key] = {};
			
			if (!this[key][hash]) {
				this[key][hash] = new this.constructor();
			}
			this[key][hash].insert(o);		
		}
	}
};

// ## Event emitter / listener

/**
 * ### NDDB.on
 * 
 * Registers an event listeners
 * 
 * Available events: 
 * 
 * 	`insert`: each time an item is inserted 
 * 	`remove`: each time a collection of items is removed
 * 
 * Examples.
 * 
 * ```javascript
 * var db = new NDDB();
 * 
 * var trashBin = new NDDB();
 * 
 * db.on('insert', function(item){
 * 		item.id = getMyNextId();	
 * });
 * 
 * db.on('remove', function(array) {
 * 		trashBin.importDB(array);
 * });
 * ```
 * 
 */
NDDB.prototype.on = function(event, func) {
	if (!event || !func || !this.hooks[event]) return;
    this.hooks[event].push(func);
    return true;
};

/**
 * ### NDDB.off
 * 
 * Deregister an event, or an event listener
 * 
 * @param {string} event The event name
 * @param {function} func Optional. The specific function to deregister 
 * 
 * @return Boolean TRUE, if the removal is successful
 */
NDDB.prototype.off = function(event, func) {
	if (!event || !this.hooks[event] || !this.hooks[event].length) return;
	 
    if (!func) {
    	this.hooks[event] = [];
    	return true;
    }
     
    for (var i=0; i < this.hooks[event].length; i++) {
    	if (this.hooks[event][i] == func) {
    		this.hooks[event].splice(i, 1);
	        return true;
	    }
	}
     
    return false;
}

/**
 * ### NDDB.emit
 * 
 * Fires all the listeners associated with an event
 * 
 * @param event {string} The event name 
 * @param {object} o Optional. A parameter to be passed to the listener
 * 
 */
NDDB.prototype.emit = function(event, o) {
	if (!event || !this.hooks[event] || !this.hooks[event].length) {		
		return;
	}
	
	for (var i=0; i < this.hooks[event].length; i++) {
		this.hooks[event][i].call(this, o);
	}
};

// ## Sort and Select

/**
 * ### NDDB._analyzeQuery
 *
 * Validates and prepares select queries before execution
 * 
 * @api private
 * @param {string} d The dimension of comparison
 * @param {string} op The operation to perform
 * @param {string} value The right-hand element of comparison
 * @return {boolean|object} The object-query or FALSE if an error was detected 
 */
NDDB.prototype._analyzeQuery = function (d, op, value) {
    
    var raiseError = function (d,op,value) {
        var miss = '(?)';
        var err = 'Malformed query: ' + d || miss + ' ' + op || miss + ' ' + value || miss;
        NDDB.log(err, 'WARN');
        return false;
    };
    

    if ('undefined' === typeof d) raiseError(d,op,value);
    
    // Verify input 
    if ('undefined' !== typeof op) {
        
        if (op === '=') {
            op = '==';
        }
      
        if (!(op in this.query.operators)) {
            NDDB.log('Query error. Invalid operator detected: ' + op, 'WARN');
            return false;
        }

        // Range-queries need an array as third parameter instance of Array
        if (J.in_array(op,['><', '<>', 'in', '!in'])) {
        	
            if (!(value instanceof Array)) {
                NDDB.log('Range-queries need an array as third parameter', 'WARN');
                raiseError(d,op,value);
            }
            if (op === '<>' || op === '><') {
                
                value[0] = J.setNestedValue(d, value[0]);
                value[1] = J.setNestedValue(d, value[1]);
            }
        }
        
        else if (J.in_array(op, ['>', '==', '>=', '<', '<='])){
        	// Comparison queries need a third parameter
        	if ('undefined' === typeof value) raiseError(d,op,value);

        	// Comparison queries need to have the same data structure in the compared object
            value = J.setNestedValue(d,value);
        }
        
        // other (e.g. user-defined) operators do not have constraints, 
        // e.g. no need to transform the value
        
    }
    else if ('undefined' !== typeof value) {
        raiseError(d,op,value);
    }
    else {
        op = 'E'; // exists
        value = '';
    }
    
    return {d:d,op:op,value:value};
};

/**
 * ### NDDB.distinct
 * 
 * Eliminates duplicated entries
 *  
 * A new database is returned and the original stays unchanged
 * 
 * @return {NDDB} A copy of the current selection without duplicated entries
 * 
 * @see NDDB.select() 
 *  @see NDDB.fetch()
 *  @see NDDB.fetchValues()
 */
NDDB.prototype.distinct = function () {
	return this.breed(J.distinct(this.db));
};

/**
 * ### NDDB.select
 * 
 * Initiates a new query selection procedure
 * 
 * Input parameters:
 * 
 * - d: the string representation of the dimension used to filter. Mandatory.
 * - op: operator for selection. Allowed: >, <, >=, <=, = (same as ==), ==, ===, 
 * 		!=, !==, in (in array), !in, >< (not in interval), <> (in interval)
 *  - value: values of comparison. Operators: in, !in, ><, <> require an array.
 *   
 * No actual selection is performed until the `execute` method is called, so that 
 * further selections can be chained with the `or`, and `and` methods.
 * 
 * To retrieve the items use one of the fetching methods.
 *  
 * @param {string} d The dimension of comparison
 * @param {string} op Optional. The operation to perform
 * @param {mixed} value Optional. The right-hand element of comparison
 * @return {NDDB} A new NDDB instance with the currently selected items in memory
 * 
 * @see NDDB.and
 * @see NDDB.or
 * @see NDDB.execute()
 * @see NDDB.fetch()
 * 
 */
NDDB.prototype.select = function (d, op, value) {
    this.query.reset();
    return arguments.length ? this.and(d, op, value) : this;
};

/**
 * ### NDDB.and
 * 
 * Chains an AND query to the current selection
 * 
 * @param {string} d The dimension of comparison
 * @param {string} op Optional. The operation to perform
 * @param {mixed} value Optional. The right-hand element of comparison
 * @return {NDDB} A new NDDB instance with the currently selected items in memory
 * 
 * @see NDDB.select
 * @see NDDB.or
 * @see NDDB.execute()
 */
NDDB.prototype.and = function (d, op, value) {
// TODO: Support for nested query	
//	if (!arguments.length) {
//		addBreakInQuery();
//	}
//	else {
		var condition = this._analyzeQuery(d, op, value);        
	    if (!condition) return false;
	    this.query.addCondition('AND', condition, this.getComparator(d));
//	}			
	return this;
};

/**
 * ### NDDB.or
 * 
 * Chains an OR query to the current selection
 * 
 * @param {string} d The dimension of comparison
 * @param {string} op Optional. The operation to perform
 * @param {mixed} value Optional. The right-hand element of comparison
 * @return {NDDB} A new NDDB instance with the currently selected items in memory
 * 
 * @see NDDB.select
 * @see NDDB.and
 * @see NDDB.execute()
 */
NDDB.prototype.or = function (d, op, value) {
// TODO: Support for nested query		
//	if (!arguments.length) {
//		addBreakInQuery();
//	}
//	else {
		var condition = this._analyzeQuery(d, op, value);        
	    if (!condition) return false;
	    this.query.addCondition('OR', condition, this.getComparator(d));
//	}			
	return this;
};


/**
 * ### NDDB.selexec
 * 
 * Shorthand for select and execute methods
 * 
 * Adds a single select condition and executes it.
 *  
 * @param {string} d The dimension of comparison
 * @param {string} op Optional. The operation to perform
 * @param {mixed} value Optional. The right-hand element of comparison
 * @return {NDDB} A new NDDB instance with the currently selected items in memory
 * 
 * @see NDDB.select
 * @see NDDB.and
 * @see NDDB.or
 * @see NDDB.execute
 * @see NDDB.fetch
 * 
 */
NDDB.prototype.selexec = function (d, op, value) {
    return this.select(d, op, value).execute();
};

/**
 * ### NDDB.execute
 * 
 * Implements the criteria for selection previously specified by `select` queries
 * 
 * Does not reset the query object, and it is possible to reuse the current
 * selection multiple times
 * 
 * @param {string} d The dimension of comparison
 * @param {string} op Optional. The operation to perform
 * @param {mixed} value Optional. The right-hand element of comparison
 * @return {NDDB} A new NDDB instance with the previously selected items in the db 
 * 
 * @see NDDB.select
 * @see NDDB.selexec
 * @see NDDB.and
 * @see NDDB.or
 */
NDDB.prototype.execute = function () {
    return this.filter(this.query.get.call(this.query));
};

/**
 * ### NDDB.exists
 * 
 * Returns TRUE if a copy of the object exists in 
 * the database
 * 
 * @param {object} o The object to look for
 * @return {boolean} TRUE, if a copy is found
 * 
 * @see JSUS.equals
 */
NDDB.prototype.exists = function (o) {
	if (!o) return false;
	
	for (var i = 0 ; i < this.db.length ; i++) {
		if (J.equals(this.db[i], o)) {
			return true;
		}
	}
	
    return false;
};

/**
 * ### NDDB.limit
 *
 * Creates a copy of the current database containing only 
 * the first N entries
 * 
 * If limit is a negative number, selection is made starting 
 * from the end of the database.
 * 
 * @param {number} limit The number of entries to include
 * @return {NDDB} A "limited" copy of the current instance of NDDB
 * 
 * @see NDDB.first
 * @see NDDB.last
 */
NDDB.prototype.limit = function (limit) {
	limit = limit || 0;
    if (limit === 0) return this.breed();
    var db = (limit > 0) ? this.db.slice(0, limit) :
                           this.db.slice(limit);
    
    return this.breed(db);
};
    
/**
 * ### NDDB.reverse
 *
 * Reverses the order of all the entries in the database
 * 
 * @see NDDB.sort
 */
NDDB.prototype.reverse = function () {
    this.db.reverse();
    return this;
};
    
/**
 * ### NDDB.sort
 *
 * Sort the db according to one of the following
 * criteria:
 *  
 *  - globalCompare function, if no parameter is passed 
 *  - one of the dimension, if a string is passed
 *  - a custom comparator function 
 * 
 * A reference to the current NDDB object is returned, so that
 * further methods can be chained. 
 * 
 * Notice: the order of entries is changed.
 * 
 * @param {string|arrat|function} d Optional. The criterium of sorting
 * @return {NDDB} A sorted copy of the current instance of NDDB 
 */
  NDDB.prototype.sort = function (d) {
    // GLOBAL compare  
    if (!d) {
        var func = this.globalCompare;
    }
    
    // FUNCTION  
    else if ('function' === typeof d) {
      var func = d;
    }
    
    // ARRAY of dimensions
    else if (d instanceof Array) {
      var that = this;
      var func = function (a,b) {
        for (var i=0; i < d.length; i++) {
          var result = that.getComparator(d[i]).call(that,a,b);
          if (result !== 0) return result;
        }
        return result;
      }
    }
    
    // SINGLE dimension
    else {
      var func = this.getComparator(d);
    }
    
    this.db.sort(func);
    return this;
  };

/**
 * ### NDDB.shuffle
 *
 * Randomly shuffles all the entries of the database
 * 
 * Changes the order of elements in the current database
 * 
 * @return {NDDB} A a reference to the current instance with shuffled entries
 */
NDDB.prototype.shuffle = function () {
    this.db = J.shuffle(this.db);
    return this;
};
    
// ## Custom callbacks
  
/**
 * ### NDDB.filter
 *
 * Filters the entries of the database according to the
 * specified callback function. 
 * 
 * A new NDDB instance is breeded.
 * 
 * @param {function} func The filtering function
 * @return {NDDB} A new instance of NDDB containing the filtered entries 
 * 
 * @see NDDB.breed
 * 
 */
NDDB.prototype.filter = function (func) {
    return this.breed(this.db.filter(func));
};


/**
 * ### NDDB.each || NDDB.forEach
 *
 * Applies a callback function to each element in the db.
 * 
 * It accepts a variable number of input arguments, but the first one 
 * must be a valid callback, and all the following are passed as parameters
 * to the callback
 * 
 * @see NDDB.map
 */
NDDB.prototype.each = NDDB.prototype.forEach = function () {
    if (arguments.length === 0) return;
    var func = arguments[0], i;    
    for (i = 0 ; i < this.db.length ; i++) {
        arguments[0] = this.db[i];
        func.apply(this, arguments);
    }
};

/**
 * ### NDDB.map
 *
 * Applies a callback function to each element in the db, store
 * the results in an array and returns it.
 * 
 * It accepts a variable number of input arguments, but the first one 
 * must be a valid callback, and all the following are passed as parameters
 * to the callback
 * 
 * @return {array} out The result of the mapping
 * @see NDDB.each
 * 
 */
NDDB.prototype.map = function () {
    if (arguments.length === 0) return;
    var func = arguments[0], 
    	out = [], o, i;
    for (i = 0 ; i < this.db.length ; i++) {
        arguments[0] = this.db[i];
        o = func.apply(this, arguments);
        if ('undefined' !== typeof o) out.push(o);
    }
    return out;
};

// # Update

/**
 * ### NDDB.update
 *
 * Updates all selected entries
 * 
 * Mix ins the properties of the _update_ object in each 
 * selected item.
 * 
 * Properties from the _update_ object that are not found in
 * the selected items will be created.
 * 
 * @param {object} update An object containing the properties
 *  that will be updated.
 * @return {NDDB} A new instance of NDDB with updated entries
 * 
 * @see JSUS.mixin
 */
NDDB.prototype.update = function (update) {
	if (!this.db.length || !update) return this;
   	  
	for (var i = 0; i < this.db.length; i++) {
		J.mixin(this.db[i], update);
		this.emit('update', this.db[i]);
    }
	
	this._autoUpdate();
	return this;
};  

//## Deletion


/**
 * ### NDDB.remove
 *
 * Removes all entries from the database
 * 
 * @return {NDDB} A new instance of NDDB with no entries 
 */
NDDB.prototype.remove = function () {
	if (!this.length) return this;
	
	this.emit('remove', this.db);
	this.db = [];
	this._autoUpdate();
	return this;
};    

/**
 * ### NDDB.clear
 *
 * Removes all volatile data
 * 
 * Removes all entries, indexes, hashes and tags, 
 * and resets the current query selection  
 * 
 * Hooks, indexing, comparator, and hash functions are not deleted.
 * 
 * Requires an additional parameter to confirm the deletion.
 * 
 * @return {boolean} TRUE, if the database was cleared
 */
NDDB.prototype.clear = function (confirm) {
    if (confirm) {
        this.db = [];
        this.tags = {};
        this.query.reset();
        this.nddb_pointer = 0;
        
        var i;
        for (i in this.__H) {
        	if (this[i]) delete this[i]
        }
        for (i in this.__C) {
        	if (this[i]) delete this[i]
        }
        for (var i in this.__I) {
        	if (this[i]) delete this[i]
        }
    }
    else {
        NDDB.log('Do you really want to clear the current dataset? Please use clear(true)', 'WARN');
    }
    
    return confirm;
};    


// ## Advanced operations

/**
 * ### NDDB.join
 *
 * Performs a *left* join across all the entries of the database
 * 
 * @param {string} key1 First property to compare  
 * @param {string} key2 Second property to compare
 * @param {string} pos Optional. The property under which the join is performed. Defaults 'joined'
 * @param {string|array} select Optional. The properties to copy in the join. Defaults undefined 
 * @return {NDDB} A new database containing the joined entries
 * 
 * @see NDDB._join
 * @see NDDB.breed
 */
NDDB.prototype.join = function (key1, key2, pos, select) {
// <!--	
    // Construct a better comparator function
    // than the generic JSUS.equals
//        if (key1 === key2 && 'undefined' !== typeof this.__C[key1]) {
//            var comparator = function(o1,o2) {
//                if (this.__C[key1](o1,o2) === 0) return true;
//                return false;
//            }
//        }
//        else {
//            var comparator = JSUS.equals;
//        }
// -->	
    return this._join(key1, key2, J.equals, pos, select);
};

/**
 * ### NDDB.concat
 *
 * Copies all the entries (or selected properties of them) containing key2 
 * in all the entries containing key1.
 * 
 * Nested properties can be accessed with '.'.
 * 
 * @param {string} key1 First property to compare  
 * @param {string} key2 Second property to compare
 * @param {string} pos Optional. The property under which the join is performed. Defaults 'joined'
 * @param {string|array} select Optional. The properties to copy in the join. Defaults undefined 
 * @return {NDDB} A new database containing the concatenated entries
 * 
 *  @see NDDB._join
 *  @see JSUS.join
 */
NDDB.prototype.concat = function (key1, key2, pos, select) {        
    return this._join(key1, key2, function(){ return true;}, pos, select);
};

/**
 * ### NDDB._join
 *
 * Performs a *left* join across all the entries of the database
 * 
 * The values of two keys (also nested properties are accepted) are compared
 * according to the specified comparator callback, or using `JSUS.equals`.
 * 
 * If the comparator function returns TRUE, matched entries are appended 
 * as a new property of the matching one. 
 * 
 * By default, the full object is copied in the join, but it is possible to 
 * specify the name of the properties to copy as an input parameter.
 * 
 * A new NDDB object breeded, so that further methods can be chained.
 * 
 * @api private
 * @param {string} key1 First property to compare  
 * @param {string} key2 Second property to compare
 * @param {function} comparator Optional. A comparator function. Defaults, `JSUS.equals`
 * @param {string} pos Optional. The property under which the join is performed. Defaults 'joined'
 * @param {string|array} select Optional. The properties to copy in the join. Defaults undefined 
 * @return {NDDB} A new database containing the joined entries
 * @see NDDB.breed
 */
NDDB.prototype._join = function (key1, key2, comparator, pos, select) {
	if (!key1 || !key2) return this.breed([]);
	
    comparator = comparator || J.equals;
    pos = ('undefined' !== typeof pos) ? pos : 'joined';
    if (select) {
        select = (select instanceof Array) ? select : [select];
    }
    var out = [], idxs = [], foreign_key, key;
    
    for (var i=0; i < this.db.length; i++) {
       
       foreign_key = J.getNestedValue(key1, this.db[i]);
       if ('undefined' !== typeof foreign_key) { 
    	   for (var j=i+1; j < this.db.length; j++) {
           
    		   key = J.getNestedValue(key2, this.db[j]);
               
               if ('undefined' !== typeof key) { 
            	   if (comparator(foreign_key, key)) {
	                    // Inject the matched obj into the
	                    // reference one
	                    var o = J.clone(this.db[i]);
	                    var o2 = (select) ? J.subobj(this.db[j], select) : this.db[j];
	                    o[pos] = o2;
	                    out.push(o);
            	   }
                    
                }
            }
        }
    }
    
    return this.breed(out);
};

/**
 * ### NDDB.split
 *
 * Splits all the entries in the database containing
 * the passed dimension. 
 * 
 * New entries are created and a new NDDB object is
 * breeded to allows method chaining.
 * 
 * @param {string} key The dimension along which items will be split
 * @return {NDDB} A new database containing the split entries
 * 
 * @see JSUS.split
 */
NDDB.prototype.split = function (key) {    
    var out = [], i;
    for (i = 0; i < this.db.length; i++) {
        out = out.concat(J.split(this.db[i], key));
    }
    return this.breed(out);
};

// ## Fetching

/**
 * ### NDDB.fetch
 *
 * Fetches all the entries in the database and returns 
 * them in one array 
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * 
 * db.fetch();    // [ {a: 1, b: {c: 2}, d: 3} ] 
 * ```
 * 
 * No further chaining is permitted after fetching.
 *  
 * @return {array} out The fetched values 
 * 
 * @see NDDB.fetchValues
 * @see NDDB.fetchArray
 * @see NDDB.fetchKeyArray
 * @see NDDB.fetchSubObj
 * 
 */
NDDB.prototype.fetch = function () {
    return this.db;
};

/**
 * ### NDDB.fetchSubObj
 *
 * Fetches all the entries in the database and trims out unwanted properties
 * 
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * db.insert([ { a:4, b:{c:5}, d:6 } ]);
 * 
 * db.fetchSubObj('a'); // [ { a: 1} , {a: 4}]
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @param {string|array} key Optional. If set, returned objects will have only such properties  
 * @return {array} out The fetched objects 
 * 
 * @see NDDB.fetch
 * @see NDDB.fetchValues
 * @see NDDB.fetchArray
 * @see NDDB.fetchKeyArray
 */
NDDB.prototype.fetchSubObj= function (key) {
	if (!key) return [];
	var i, el, out = [];
	for (i=0; i < this.db.length; i++) {
	    el = J.subobj(this.db[i], key);
	    if (!J.isEmpty(el)) out.push(el);
    }
    return out;
};


/**
 * ### NDDB.fetchValues
 *
 * Fetches all the values of the entries in the database
 * 
 * The type of the input parameter determines the return value:
 *  - if it is `string`, returned value is a one-dimensional array. 
 * 	- if it is `array`, returned value is an object whose properties are arrays containing 
 * all the values found in the database for those keys.
 *   
 * Nested properties can be specified too.  
 *   
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * 
 * db.fetchValues();    // [ [ 1, 2, 3 ] ]
 * db.fetchValues('b'); // { b: [ {c: 2} ] }
 * db.fetchValues('d'); // { d: [ 3 ] };
 * 
 * db.insert([ { a:4, b:{c:5}, d:6 } ]);
 * 
 * db.fetchValues([ 'a', 'd' ]); // { a: [ 1, 4] , d: [ 3, 6] };
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @param {string|array} key Optional. If set, returns only the value from the specified property 
 * @return {array} out The fetched values 
 * 
 * @see NDDB.fetch
 * @see NDDB.fetchArray
 * @see NDDB.fetchKeyArray
 * @see NDDB.fetchSubObj
 * 
 */
NDDB.prototype.fetchValues = function(key) {
	var el, i, out, typeofkey;
	
	typeofkey = typeof key, out = {};
	
	if (typeofkey === 'undefined') {	
		for (i=0; i < this.db.length; i++) {
			J.augment(out, this.db[i], J.keys(this.db[i]));
		} 
	}
	
	else if (typeofkey === 'string') {
		out[key] = [];
		for (i=0; i < this.db.length; i++) {
			el = J.getNestedValue(key, this.db[i]);
	        if ('undefined' !== typeof el) {
	        	out[key].push(el);
	        }
		}
		
		
	}
		
	else if (J.isArray(key)) {
    	out = J.melt(key, J.rep([], key.length)); // object not array  
        for ( i = 0 ; i < this.db.length ; i++) {
        	el = J.subobj(this.db[i], key);
        	if (!J.isEmpty(el)) {
            	J.augment(out, el);
            }
        }   
	}
	
    return out;
};

function getValuesArray(o, key) {
	return J.obj2Array(o, 1);
};

function getKeyValuesArray(o, key) {
	return J.obj2KeyedArray(o, 1);
};


function getValuesArray_KeyString(o, key) {
    var el = J.getNestedValue(key, o);
    if ('undefined' !== typeof el) {
        return J.obj2Array(el,1);
    }
};

function getValuesArray_KeyArray(o, key) {
    var el = J.subobj(o, key);
    if (!J.isEmpty(el)) {
    	return J.obj2Array(el,1);
	}
};


function getKeyValuesArray_KeyString(o, key) {
    var el = J.getNestedValue(key, o);
    if ('undefined' !== typeof el) {
        return key.split('.').concat(J.obj2KeyedArray(el));
    }
};

function getKeyValuesArray_KeyArray(o, key) {
	var el = J.subobj(o, key);
    if (!J.isEmpty(el)) {
        return J.obj2KeyedArray(el);
	}
};

/**
 * ### NDDB._fetchArray
 *
 * Low level primitive for fetching the entities as arrays 
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * var items = [{a:1, b:2}, {a:3, b:4}, {a:5, c:6}];
 * db.importDB(items);
 * 
 * db._fetch(null, 'VALUES'); 
 * // [ [ 1, 2 ], [ 3, 4 ], [ 5, 6] ]
 * 
 * db._fetch(null, 'KEY_VALUES'); 
 * // [ [ 'a', 1, 'b', 2 ], [ 'a', 3, 'b', 4 ], [ 'a', 5, 'c', 6 ] ]
 * 
 * db._fetch('a', 'VALUES'); 
 * //  [ [ 1 ], [ 3 ], [ 5 ] ]
 * 
 * db._fetch('a', 'KEY_VALUES'); 
 * // [ [ 'a', 1 ], [ 'a', 3 ], [ 'a', 5 ] ] 
 * 
 * db._fetch(['a','b'], 'VALUES'); 
 * //  [ [ 1 , 2], [ 3, 4 ], [ 5 ] ]
 * 
 * db._fetch([ 'a', 'c'] 'KEY_VALUES'); 
 * // [ [ 'a', 1 ], [ 'a', 3 ], [ 'a', 5, 'c', 6 ] ]
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @api private
 * @param {string|array} key Optional. If set, returns key/values only from the specified property 
 * @param {boolean} keyed. Optional. If set, also the keys are returned
 * @return {array} out The fetched values 
 * 
 */
NDDB.prototype._fetchArray = function (key, keyed) {
	
    var cb, out, el, i;
    
    if (keyed) {
    	
    	if (!key) cb = getKeyValuesArray;
    	
    	else if ('string' === typeof key) {
    		cb = getKeyValuesArray_KeyString;
    	}
    	else {
    		cb = getKeyValuesArray_KeyArray;
    	}
    }
    else {
    	if (!key) cb = getValuesArray;
    	
    	else if ('string' === typeof key) {
    		cb = getValuesArray_KeyString;
    	}
    	else {
    		cb = getValuesArray_KeyArray;
    	}
    }
    
    out = [];
    for (i=0; i < this.db.length; i++) {
        el = cb.call(this.db[i], this.db[i], key);
        if ('undefined' !== typeof el) out.push(el);
    }    
    
    return out;
}

/**
 * ### NDDB.fetchArray
 *
 * Fetches the entities in the database as arrays instead of objects
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * db.insert([ { a:4, b:{c:5}, d:6 } ]);
 * 
 * db.fetchArray();     // [ [ 1, 'c', 2, 3 ],  ]
 * db.fetchArray('b');  // [ [ 'c', 2 ] ] 
 * db.fetchArray('d');  // [ [ 3 ] ]
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @see NDDB._fetchArray
 * @see NDDB.fetchValues
 * @see NDDB.fetchKeyArray
 * @see NDDB.fetchSubObj
 */
NDDB.prototype.fetchArray = function (key) {
    return this._fetchArray(key);
};

/**
 * ### NDDB.fetchKeyArray
 *
 * Exactly as NDDB.fetchArray, but also the keys are added to the
 * returned values. 
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * 
 * db.fetchKeyArray();       // [ [ 'a', 1, 'c', 2, 'd', 3 ] ]
 * db.fetchKeyArray('b'); // [ [ 'b', 'c', 2 ] ] 
 * db.fetchKeyArray('d');    // [ [ 'd', 3 ] ]
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @param {string} key Optional. If set, returns only the value from the specified property 
 * @return {array} out The fetched values 
 * 
 * @see NDDB._fetchArray
 * @see NDDB.fetchArray
 * @see NDDB.fetchValues
 * @see NDDB.fetchSubObj
 */
NDDB.prototype.fetchKeyArray = function (key) {
    return this._fetchArray(key, true);
};
            
/**
 * ### NDDB.groupBy
 *
 * Splits the entries in the database in subgroups
 * 
 * Each subgroup is formed up by elements which have the
 * same value along the specified dimension. 
 * 
 * An array of NDDB instances is returned, therefore no direct 
 * method chaining is allowed afterwards. 
 * 
 * Entries containing undefined values in the specified
 * dimension will be skipped
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * var items = [{a:1, b:2}, {a:3, b:4}, {a:5}, {a:6, b:2}];
 * db.importDB(items);
 * 
 * var groups = db.groupBy('b'); 
 * groups.length; // 2
 * 
 * groups[0].fetch(); // [ { a: 1, b: 2 }, { a: 6, b: 2 } ]
 * 
 * groups[1].fetch(); // [ { a: 3, b: 4 } ]
 * ```
 * 
 * @param {string} key If the dimension for grouping 
 * @return {array} outs The array of groups 
 * 
 */
NDDB.prototype.groupBy = function (key) {
    if (!key) return this.db;
    
    var groups = [];
    var outs = [];
    for (var i=0; i < this.db.length; i++) {
        var el = J.getNestedValue(key, this.db[i]);
        if ('undefined' === typeof el) continue;
        // Creates a new group and add entries to it
        if (!J.in_array(el, groups)) {
            groups.push(el);
            var out = this.filter(function (elem) {
                if (J.equals(J.getNestedValue(key, elem), el)) {
                    return this;
                }
            });
            
            // Reset nddb_pointer in subgroups
            out.nddb_pointer = 0;
            
            outs.push(out);
        }
        
    }
    return outs;
};    

// ## Statistics

/**
 * ### NDDB.count
 *
 * Counts the entries containing the specified key 
 * 
 * If key is undefined, the size of the databse is returned.
 * 
 * @param {string} key The dimension to count
 * @return {number} count The number of items along the specified dimension
 * 
 * @see NDDB.length
 */
NDDB.prototype.count = function (key) {
    if ('undefined' === typeof key) return this.db.length;
    var count = 0;
    for (var i = 0; i < this.db.length; i++) {
        if (J.hasOwnNestedProperty(key, this.db[i])){
            count++;
        }
    }    
    return count;
};


/**
 * ### NDDB.sum
 *
 * Returns the total sum of the values of all the entries 
 * in the database containing the specified key. 
 * 
 * Non numeric values are ignored. 
 * 
 * @param {string} key The dimension to sum
 * @return {number|boolean} sum The sum of the values for the dimension, or FALSE if it does not exist
 * 
 */
NDDB.prototype.sum = function (key) {
	if ('undefined' === typeof key) return false;
    var sum = 0;
    for (var i=0; i < this.db.length; i++) {
        var tmp = J.getNestedValue(key, this.db[i]);
        if (!isNaN(tmp)) {
            sum += tmp;
        }
    }    
    return sum;
};

/**
 * ### NDDB.mean
 *
 * Returns the average of the values of all the entries 
 * in the database containing the specified key. 
 * 
 * Entries with non numeric values are ignored, and excluded
 * from the computation of the mean.
 * 
 * @param {string} key The dimension to average
 * @return {number|boolean} The mean of the values for the dimension, or FALSE if it does not exist
 * 
 */
NDDB.prototype.mean = function (key) {
	if ('undefined' === typeof key) return false;
    var sum = 0;
    var count = 0;
    for (var i=0; i < this.db.length; i++) {
        var tmp = J.getNestedValue(key, this.db[i]);
        if (!isNaN(tmp)) { 
            sum += tmp;
            count++;
        }
    }    
    return (count === 0) ? 0 : sum / count;
};

/**
 * ### NDDB.stddev
 *
 * Returns the standard deviation of the values of all the entries 
 * in the database containing the specified key. 
 * 
 * Entries with non numeric values are ignored, and excluded
 * from the computation of the standard deviation.
 * 
 * @param {string} key The dimension to average
 * @return {number|boolean} The mean of the values for the dimension, or FALSE if it does not exist
 * 
 * @see NDDB.mean
 */
NDDB.prototype.stddev = function (key) {
	if ('undefined' === typeof key) return false;
    var mean = this.mean(key);
    if (isNaN(mean)) return false;
    
    var V = 0;
    this.each(function(e){
        var tmp = J.getNestedValue(key, e);
        if (!isNaN(tmp)) { 
        	V += Math.pow(tmp - mean, 2)
        }
    });
    
    return (V !== 0) ? Math.sqrt(V) : 0;
};


/**
 * ### NDDB.min
 *
 * Returns the min of the values of all the entries 
 * in the database containing the specified key. 
 * 
 * Entries with non numeric values are ignored. 
 * 
 * @param {string} key The dimension of which to find the min
 * @return {number|boolean} The smallest value for the dimension, or FALSE if it does not exist
 * 
 * @see NDDB.max
 */
NDDB.prototype.min = function (key) {
	if ('undefined' === typeof key) return false;
    var min = false;
    for (var i=0; i < this.db.length; i++) {
        var tmp = J.getNestedValue(key, this.db[i]);
        if (!isNaN(tmp) && (tmp < min || min === false)) {
            min = tmp;
        }
    }    
    return min;
};

/**
 * ### NDDB.max
 *
 * Returns the max of the values of all the entries 
 * in the database containing the specified key. 
 * 
 * Entries with non numeric values are ignored. 
 *
 * @param {string} key The dimension of which to find the max
 * @return {number|boolean} The biggest value for the dimension, or FALSE if it does not exist
 * 
 * @see NDDB.min
 */
NDDB.prototype.max = function (key) {
	if ('undefined' === typeof key) return false;
    var max = false;
    for (var i=0; i < this.db.length; i++) {
        var tmp = J.getNestedValue(key, this.db[i]);
        if (!isNaN(tmp) && (tmp > max || max === false)) {
            max = tmp;
        }
    }    
    return max;
};
    
// ## Skim

/**
 * ### NDDB.skim
 *
 * Removes the specified properties from all the items in the database 
 *  
 * Use '.' (dot) to point to a nested property.
 * 
 * Items with no property are automatically removed.
 * 
 * @param {string|array} skim The selection of properties to remove
 * @return {NDDB} A new database containing the result of the skim
 * 
 * @see NDDB.keep
 * @see JSUS.skim
 */
NDDB.prototype.skim = function (skim) {
    if (!skim) return this;
    return this.breed(this.map(function(e){
    	var skimmed = J.skim(e, skim); 
    	if (!J.isEmpty(skimmed)) {
    		return skimmed;
    	}
    }));
};

/**
 * ### NDDB.keep
 *
 * Removes all the properties that are not specified as parameter 
 * from all the items in the database
 *  
 * Use '.' (dot) to point to a nested property.
 * 
 * Items with no property are automatically removed.
 * 
 * @param {string|array} skim The selection of properties to keep
 * @return {NDDB} A new database containing the result of the keep operation
 * 
 * @see NDDB.skim
 * @see JSUS.keep
 */
NDDB.prototype.keep = function (keep) {
    if (!keep) return this.breed([]);
    return this.breed(this.map(function(e){
    	var subobj = J.subobj(e, keep);
    	if (!J.isEmpty(subobj)) {
    		return subobj;
    	}
    }));
};

// ## Diff


/**
 * ### NDDB.diff
 *
 * Performs a diff of the entries in the database and the database
 * object passed as parameter (Array or NDDB)
 * 
 * Returns a new NDDB instance containing all the entries that
 * are present in the current instance, and *not* in the 
 * database obj passed as parameter.
 * 
 * @param {NDDB|array} nddb The external database to compare
 * @return {NDDB} A new database containing the result of the diff
 * 
 * @see NDDB.intersect
 * @see JSUS.arrayDiff
 */
NDDB.prototype.diff = function (nddb) {
    if (!nddb || !nddb.length) return this;
    if ('object' === typeof nddb) {
        if (nddb instanceof NDDB || nddb instanceof this.constructor) {
            nddb = nddb.db;
        }
    }
    return this.breed(J.arrayDiff(this.db, nddb));
};

/**
 * ### NDDB.intersect
 *
 * Finds the common the entries between the current database and 
 * the database  object passed as parameter (Array or NDDB)
 * 
 * Returns a new NDDB instance containing all the entries that
 * are present both in the current instance of NDDB and in the 
 * database obj passed as parameter.
 * 
 * @param {NDDB|array} nddb The external database to compare
 * @return {NDDB} A new database containing the result of the intersection
 * 
 * @see NDDB.diff
 * @see JSUS.arrayIntersect
 */
NDDB.prototype.intersect = function (nddb) {
    if (!nddb || !nddb.length) return this;
    if ('object' === typeof nddb) {
        if (nddb instanceof NDDB || nddb instanceof this.constructor) {
            var nddb = nddb.db;
        }
    }
    return this.breed(J.arrayIntersect(this.db, nddb));
};


// ## Iterator

/**
 * ### NDDB.get
 *   
 * Returns the entry at the given numerical position
 * 
 * @param {number} pos The position of the entry
 * @return {object|boolean} The requested item, or FALSE if 
 * 	the index is invalid 
 */
NDDB.prototype.get = function (pos) {
	if ('undefined' === typeof pos || pos < 0 || pos > (this.db.length-1)) {
		return false;
	}
	return this.db[pos];
};

/**
 * ### NDDB.current
 *
 * Returns the entry in the database, at which 
 * the iterator is currently pointing 
 * 
 * The pointer is *not* updated. 
 * 
 * Returns false, if the pointer is at an invalid position.
 * 
 * @return {object|boolean} The current entry, or FALSE if none is found
 */
NDDB.prototype.current = function () {
    if (this.nddb_pointer < 0 || this.nddb_pointer > (this.db.length-1)) {
    	return false;
    }
    return this.db[this.nddb_pointer];
};
    
/**
 * ### NDDB.next
 *
 * Moves the pointer to the next entry in the database 
 * and returns it
 * 
 * Returns false if the pointer is at the last entry,
 * or if database is empty.
 * 
 * @return {object|boolean} The next entry, or FALSE if none is found 
 * 
 */
NDDB.prototype.next = function () {
	this.nddb_pointer++;
    var el = NDDB.prototype.current.call(this);
    if (!el) this.nddb_pointer--;
    return el;
};

/**
 * ### NDDB.previous
 *
 * Moves the pointer to the previous entry in the database 
 * and returns it
 * 
 * Returns false if the pointer is at the first entry,
 * or if database is empty.
 * 
 * @return {object|boolean} The previous entry, or FALSE if none is found
 */
NDDB.prototype.previous = function () {
	this.nddb_pointer--;
    var el = NDDB.prototype.current.call(this);
    if (!el) this.nddb_pointer++;
    return el;
};

/**
 * ### NDDB.first
 *
 * Moves the pointer to the first entry in the database,
 * and returns it
 * 
 * Returns the first entry of the database, or undefined 
 * if the database is empty.
 * 
 * @param {string} key Optional. If set, moves to the pointer to the first entry along this dimension
 * @return {object} The first entry found
 * 
 * @see NDDB.last
 */
NDDB.prototype.first = function (key) {
    var db = this.fetch(key);
    if (db.length) {
        this.nddb_pointer = 0;
        return db[0];
    }
    return undefined;
};

/**
 * ### NDDB.last
 *
 * Moves the pointer to the first last in the database,
 * and returns it
 * 
 * Returns the last entry of the database, or undefined 
 * if the database is empty.
 * 
 * @param {string} key Optional. If set, moves to the pointer to the last entry along this dimension
 * @return {object} The last entry found
 * 
 * @see NDDB.first
 */
NDDB.prototype.last = function (key) {
    var db = this.fetch(key);
    if (db.length) {
        this.nddb_pointer = db.length-1;
        return db[db.length-1];
    }
    return undefined;
};

// ## Tagging


/**
 * ### NDDB.tag
 *
 * Registers a tag associated to an object
 * 
 * The second parameter can be the index of an object 
 * in the database, the object itself, or undefined. In 
 * the latter case, the current valye of `nddb_pointer` 
 * is used to create the reference.
 * 
 * The tag is independent from sorting and deleting operations,
 * but changes on update of the elements of the database.
 * 
 * @param {string} tag An alphanumeric id
 * @param {mixed} idx Optional. The reference to the object. Defaults, `nddb_pointer`
 * @return {boolean} TRUE, if registration is successful
 * 
 * @see NDDB.resolveTag
 */
NDDB.prototype.tag = function (tag, idx) {
    if ('undefined' === typeof tag) {
        NDDB.log('Cannot register empty tag.', 'ERR');
        return false;
    }
    
    var ref = null, typeofIdx = typeof idx;
    
    if (typeofIdx === 'undefined') {
    	ref = this.db[this.nddb_pointer];
    }
    else if (typeofIdx === 'number') {
    	
    	if (idx > this.length || idx < 0) {
            NDDB.log('Invalid index provided for tag registration', 'ERR');
            return false;
        }
    	ref = this.db[idx];
    }
    else {
    	ref = idx;
    }
    
    this.tags[tag] = ref;
    return ref;
};

/**
 * ### NDDB.resolveTag
 *
 * Returns the element associated with the given tag.
 * 
 * @param {string} tag An alphanumeric id
 * @return {object} The object associated with the tag
 * 
 * @see NDDB.tag
 */
NDDB.prototype.resolveTag = function (tag) {
    if ('undefined' === typeof tag) {
    	NDDB.log('Cannot resolve empty tag.', 'ERR');
    	return false;
    }
    return this.tags[tag];
};

// ## Persistance    

var storageAvailable = function() {
	return ('function' === typeof store);
}

/**
 * ### NDDB.save
 * 
 * Saves the database to a persistent medium in JSON format
 * 
 * If NDDB is executed in the browser, it tries to use the `store` method - 
 * usually associated to shelf.js - to write to the browser database. 
 * If no `store` object is found, an error is issued and the database
 * is not saved.
 * 
 * If NDDB is executed in the Node.JS environment it saves to the file system
 * using the standard `fs.writeFile` method.
 * 
 * Cyclic objects are decycled, and do not cause errors. Upon loading, the cycles
 * are restored.
 * 
 * @param {string} file The file system path, or the identifier for the browser database
 * @param {function} callback Optional. A callback to execute after the database was saved
 * @param {compress} boolean Optional. If TRUE, output will be compressed. Defaults, FALSE
 * @return {boolean} TRUE, if operation is successful
 * 
 * @see NDDB.load
 * @see NDDB.stringify
 * @see https://github.com/douglascrockford/JSON-js/blob/master/cycle.js

 * 
 */
NDDB.prototype.save = function (file, callback, compress) {
	if (!file) {
		NDDB.log('You must specify a valid file / id.', 'ERR');
		return false;
	}
	
	compress = compress || false;
	
	// Try to save in the browser, e.g. with Shelf.js
	if (!J.isNodeJS()){
		if (!storageAvailable()) {
			NDDB.log('No support for persistent storage found.', 'ERR');
			return false;
		}
		
		store(file, this.stringify(compress));
		if (callback) callback();
		return true;
	}
	
	// Save in Node.js
	fs.writeFileSync(file, this.stringify(compress), 'utf-8');
	if (callback) callback();
	return true;
	
};

/**
 * ### NDDB.load
 * 
 * Loads a JSON object into the database from a persistent medium
 * 
 * If NDDB is executed in the browser, it tries to use the `store` method - 
 * usually associated to shelf.js - to load from the browser database. 
 * If no `store` object is found, an error is issued and the database
 * is not loaded.
 * 
 * If NDDB is executed in the Node.JS environment it loads from the file system
 * using the standard `fs.readFileSync` or `fs.readFile` method.
 * 
 * Cyclic objects previously decycled will be retrocycled. 
 * 
 * @param {string} file The file system path, or the identifier for the browser database
 * @param {function} cb Optional. A callback to execute after the database was saved
 * @return {boolean} TRUE, if operation is successful
 * 
 * @see NDDB.save
 * @see NDDB.stringify
 * @see JSUS.parse
 * @see https://github.com/douglascrockford/JSON-js/blob/master/cycle.js
 * 
 */
NDDB.prototype.load = function (file, cb, options) {
	if (!file) {
		NDDB.log('You must specify a valid file / id.', 'ERR');
		return false;
	}
	
	// Try to save in the browser, e.g. with Shelf.js
	if (!J.isNodeJS()){
		if (!storageAvailable()) {
			NDDB.log('No support for persistent storage found.', 'ERR');
			return false;
		}
		
		var items = store(file);
		this.importDB(items);
		if (cb) cb();
		return true;
	}
	
	var loadString = function(s) {

		var items = J.parse(s);
		
		var i;
		for (i=0; i< items.length; i++) {
			// retrocycle if possible
			items[i] = NDDB.retrocycle(items[i]);
		}

		this.importDB(items);
	}
	
	var s = fs.readFileSync(file, 'utf-8');	
	loadString.call(this, s);
	return true;
};


//if node
if (J.isNodeJS()) {   
	require('./external/cycle.js');		
	var fs = require('fs'),
		csv = require('ya-csv');
	
	NDDB.prototype.load.csv = function (file, cb, options) {
		if (!file) {
			NDDB.log('You must specify a valid CSV file.', 'ERR');
			return false;
		}
		
		// Mix options
		options = options || {};
		 
		if ('undefined' === typeof options.columnsFromHeader) {
			options.columnsFromHeader = true;
		}


		var reader = csv.createCsvStreamReader(file, options);

		if (options.columnNames) {
			reader.setColumnNames(options.columnNames);
		}
		
		reader.addListener('data', function(data) {
		    this.insert(data);
		});
		
		reader.addListener('end', function(data) {
			if (cb) callback();
		});
		
		return true;
	};
};
//end node  

/**
 * # QueryBuilder
 * 
 * MIT Licensed
 * 
 * Helper class for NDDB query selector
 * 
 * ---
 * 
 */

/**
 * ## QueryBuilder Constructor
 * 
 * Manages the _select_ queries of NDDB
 */	
function QueryBuilder() {
	this.operators = {};
	this.registerDefaultOperators();
	this.reset();
}

/**
 * ### QueryBuilder.addCondition
 * 
 * Adds a new _select_ condition
 * 
 * @param {string} type. The type of the operation (e.g. 'OR', or 'AND')
 * @param {object} condition. An object containing the parameters of the
 *   _select_ query
 * @param {function} comparator. The comparator function associated with
 *   the dimension inside the condition object.  
 */
QueryBuilder.prototype.addCondition = function(type, condition, comparator) {
	condition.type = type;
	condition.comparator = comparator;
	this.query[this.pointer].push(condition);
};

/**
 * ### QueryBuilder.registerOperator
 * 
 * Registers a _select_ function under an alphanumeric id
 * 
 * When calling `NDDB.select('d','OP','value')` the second parameter (_OP_)
 * will be matched with the callback function specified here.
 * 
 * Callback function must accept three input parameters:
 * 
 * 	- d: dimension of comparison
 *  - value: second-term of comparison
 *  - comparator: the comparator function as defined by `NDDB.c`
 *  
 * and return a function that execute the desired operation.  
 * 
 * Registering a new operator under an already existing id will 
 * overwrite the old operator.
 * 
 * @param {string} op An alphanumeric id
 * @param {function} cb The callback function
 * 
 * @see QueryBuilder.registerDefaultOperators
 */
QueryBuilder.prototype.registerOperator = function(op, cb) {
	this.operators[op] = cb;
};

/**
 * ### QueryBuilder.registerDefaultOperators
 * 
 * Register default operators for NDDB
 * 
 */
QueryBuilder.prototype.registerDefaultOperators = function() {
	
	// Exists
	this.operators['E'] = function (d, value, comparator) {
		return function(elem) {
			if ('undefined' !== typeof J.getNestedValue(d,elem)) return elem;
		}
	};

	// (strict) Equals
	this.operators['=='] = function (d, value, comparator) {
		return function(elem) {
			if (comparator(elem, value) === 0) return elem;
		};
	};
	
	// Greater than
	this.operators['>'] = function (d, value, comparator) {
		return function(elem) {
			var compared = comparator(elem, value);
			if (compared === 1 || compared === 0) return elem;
		};
	};
	
	// Smaller than
	this.operators['<'] = function (d, value, comparator) {
		return function(elem) {
			if (comparator(elem, value) === -1) return elem;
		};
	};
	
	//  Smaller or equal than
	this.operators['<='] = function (d, value, comparator) {
		return function(elem) {
			var compared = comparator(elem, value);
			if (compared === -1 || compared === 0) return elem;
		};
	};
   
    // Between
    this.operators['><'] = function (d, value, comparator) {
    	return function(elem) {
    		if (comparator(elem, value[0]) > 0 && comparator(elem, value[1]) < 0) {
	            return elem;
	        }
    	};
    };
    // Not Between
    this.operators['<>'] = function (d, value, comparator) {
    	return function(elem) {
	        if (comparator(elem, value[0]) < 0 && comparator(elem, value[1] > 0)) {
	            return elem;
	        }
    	};
    };
    
    // In Array
    this.operators['in'] = function (d, value, comparator) {
    	return function(elem) {
	        if (J.in_array(J.getNestedValue(d,elem), value)) {
	            return elem;
	        }
    	};
    };
    
    // Not In Array
    this.operators['!in'] = function (d, value, comparator) {
    	return function(elem) {
	        if (!J.in_array(J.getNestedValue(d,elem), value)) {
	            return elem;
	        }
    	};
    };
};

/**
 * ### QueryBuilder.addBreak 
 * 
 * undocumented
 */
QueryBuilder.prototype.addBreak = function() {
	this.pointer++;
	this.query[this.pointer] = [];
};

/**
 * ### QueryBuilder.reset
 * 
 * Resets the current query selection
 * 
 */
QueryBuilder.prototype.reset = function() {
	this.query = [];
	this.pointer = 0;
	this.query[this.pointer] = [];
};

/**
 * ### QueryBuilder.get
 * 
 * Builds up the select function
 * 
 * Up to three conditions it builds up a custom function without  
 * loop. For more than three conditions, a loop is created.
 * 
 * Expressions are evaluated from right to left, so that the last one
 * always decides the overall logic value. E.g. :
 * 
 * 	true AND false OR true => false OR true => TRUE
 * 	true AND true OR false => true OR false => TRUE
 * 
 * @return {function} The select function containing all the specified
 *   conditions
 */
QueryBuilder.prototype.get = function() {
	var line, lineLen, f1, f2, f3, type1, type2, i;
	var query = this.query, pointer = this.pointer;
	var operators = this.operators;
	
	function findCallback(obj, operators) {
		var d = obj.d,
			op = obj.op,
			value = obj.value,
			comparator = obj.comparator;
		return operators[op](d, value, comparator);  
	};	
	
	// Ready to support nested queries, not yet implemented
	if (pointer === 0) {
		line = query[pointer]
		lineLen = line.length; 
		
		if (lineLen === 1) {
			return findCallback(line[0], operators);
		}
		
		else if (lineLen === 2) {
			f1 = findCallback(line[0], operators);
			f2 = findCallback(line[1], operators);
			type1 = line[1].type;
			
			switch (type1) {
				case 'OR': 
					return function(elem) {
						if ('undefined' !== typeof f1(elem)) return elem;
						if ('undefined' !== typeof f2(elem)) return elem;
					}	
				case 'AND':
					return function(elem) {
						if ('undefined' !== typeof f1(elem) && 'undefined' !== typeof f2(elem)) return elem;
					}
				
				case 'NOT':
					return function(elem) {
						if ('undefined' !== typeof f1(elem) && 'undefined' === typeof f2(elem)) return elem;
					}
			}
		}
		
		else if (lineLen === 3) {
			f1 = findCallback(line[0], operators);
			f2 = findCallback(line[1], operators);
			f3 = findCallback(line[2], operators);
			type1 = line[1].type;
			type2 = line[2].type;
			type1 = type1 + '_' + type2;
			switch (type1) {
				case 'OR_OR': 
					return function(elem) {
						if ('undefined' !== typeof f1(elem)) return elem;
						if ('undefined' !== typeof f2(elem)) return elem;
						if ('undefined' !== typeof f3(elem)) return elem;
					};	
					
				case 'OR_AND':
					return function(elem) {
					
						if ('undefined' === typeof f3(elem)) return;
						if ('undefined' !== typeof f2(elem)) return elem;
						if ('undefined' !== typeof f1(elem)) return elem;
					};
				
				case 'AND_OR':
					return function(elem) {
						if ('undefined' !== typeof f3(elem)) return elem;
						if ('undefined' === typeof f2(elem)) return;
						if ('undefined' !== typeof f1(elem)) return elem;
					};
					
				case 'AND_AND':
					return function(elem) {
						if ('undefined' === typeof f3(elem)) return;
						if ('undefined' === typeof f2(elem)) return;
						if ('undefined' !== typeof f1(elem)) return elem;
					};
			}
		}
		
		else {				
			return function(elem) {
				var i, f, type, resOK;
				var prevType = 'OR', prevResOK = true;
				for (i = lineLen-1 ; i > -1 ; i--) {
					
			
					f = findCallback(line[i], operators);
					type = line[i].type,
					resOK = 'undefined' !== typeof f(elem);
					
					if (type === 'OR') {
						// Current condition is TRUE OR
						if (resOK) return elem;
					}
					
					// Current condition is FALSE AND 
					else if (type === 'AND') {
						if (!resOK) {
							return;
						}
						// Previous check was an AND or a FALSE OR
						else if (prevType === 'OR' && !prevResOK) {
							return;
						}
					}
					prevType = type;
					// A previous OR is TRUE also if follows a TRUE AND 
					prevResOK = type === 'AND' ? resOK : resOK || prevResOK;
					
				}
				return elem;
			}
			
		}
		
	}
};

/**
 * # NDDBIndex
 * 
 * MIT Licensed
 * 
 * Helper class for NDDB indexing
 * 
 * ---
 * 
 */

/**
 * ## NDDBIndex Constructor
 * 
 * Creates direct access index objects for NDDB
 * 
 * @param {string} The name of the index
 * @param {array} The reference to the original database
 */	
function NDDBIndex(idx, nddb) {
	this.idx = idx;
	this.nddb = nddb;
	this.resolve = {};
}

/**
 * ### NDDBIndex._add
 *
 * Adds an item to the index
 * 
 * @param {mixed} idx The id of the item
 * @param {number} dbidx The numerical id of the item in the original array
 */
NDDBIndex.prototype._add = function (idx, dbidx) {
    this.resolve[idx] = dbidx;
};

/**
 * ### NDDBIndex._remove
 *
 * Adds an item to the index
 * 
 * @param {mixed} idx The id to remove from the index
 */
NDDBIndex.prototype._remove = function (idx) {
    delete this.resolve[idx];
};

/**
 * ### NDDBIndex.get
 *
 * Gets the entry from database with the given id
 * 
 * @param {mixed} idx The id of the item to get
 * @return {object|boolean} The requested entry, or FALSE if none is found
 * 
 * @see NDDB.index
 * @see NDDBIndex.pop
 * @see NDDBIndex.update
 */
NDDBIndex.prototype.size = function () {
    return J.size(this.resolve);
};

/**
 * ### NDDBIndex.get
 *
 * Gets the entry from database with the given id
 * 
 * @param {mixed} idx The id of the item to get
 * @return {object|boolean} The requested entry, or FALSE if the index is invalid
 * 
 * @see NDDB.index
 * @see NDDBIndex.pop
 * @see NDDBIndex.update
 */
NDDBIndex.prototype.get = function (idx) {
	if (!this.resolve[idx]) return false
    return this.nddb.db[this.resolve[idx]];
};


/**
 * ### NDDBIndex.pop
 *
 * Removes and entry from the database with the given id and returns it
 * 
 * @param {mixed} idx The id of item to remove 
 * @return {object|boolean} The removed item, or FALSE if the index is invalid
 * 
 * @see NDDB.index
 * @see NDDBIndex.get
 * @see NDDBIndex.update
 */
NDDBIndex.prototype.pop = function (idx) {
	var o, dbidx;
	dbidx = this.resolve[idx];
	if ('undefined' === typeof dbidx) return false;
	o = this.nddb.db[dbidx];
	if ('undefined' === typeof o) return;
	this.nddb.db.splice(dbidx,1);
	delete this.resolve[idx];
	this.nddb.emit('remove', o);
	this.nddb._autoUpdate();
	return o;
};

/**
 * ### NDDBIndex.update
 *
 * Removes and entry from the database with the given id and returns it
 * 
 * @param {mixed} idx The id of item to update 
 * @return {object|boolean} The updated item, or FALSE if the index is invalid
 * 
 * @see NDDB.index
 * @see NDDBIndex.get
 * @see NDDBIndex.pop
 */
NDDBIndex.prototype.update = function (idx, update) {
	var o, dbidx;
	dbidx = this.resolve[idx];
	if ('undefined' === typeof dbidx) return false;
	o = this.nddb.db[dbidx];
	J.mixin(o, update);
	this.nddb.emit('update', o);
	this.nddb._autoUpdate();
	return o;
};

/**
 * ### NDDBIndex.getAllKeys
 *
 * Returns the list of all keys in the index
 * 
 * @return {array} The array of alphanumeric keys in the index
 * 
 * @see NDDBIndex.getAllKeyElements
 */
NDDBIndex.prototype.getAllKeys = function () {
	return J.keys(this.resolve);
};

/**
 * ### NDDBIndex.getAllKeyElements
 *
 * Returns all the elements indexed by their key in one object
 * 
 * @return {object} The object of key-elements
 * 
 * @see NDDBIndex.getAllKeys
 */
NDDBIndex.prototype.getAllKeyElements = function () {
	var out = {}, idx;
	for (idx in this.resolve) {
		if (this.resolve.hasOwnProperty(idx)) {
			out[idx] = this.nddb.db[this.resolve[idx]];
		}
	}
	return out;
};

// ## Closure    
})(
    'undefined' !== typeof module && 'undefined' !== typeof module.exports ? module.exports: window
  , 'undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS || require('JSUS').JSUS
  , ('object' === typeof module && 'function' === typeof require) ? module.parent.exports.store || require('shelf.js/build/shelf-fs.js').store : this.store
);
