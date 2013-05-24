/**
 * # Shelf.JS 
 * 
 * Persistent Client-Side Storage @VERSION
 * 
 * Copyright 2012 Stefano Balietti
 * GPL licenses.
 * 
 * ---
 * 
 */
(function(exports){
	
var version = '0.3';

var store = exports.store = function (key, value, options, type) {
	options = options || {};
	type = (options.type && options.type in store.types) ? options.type : store.type;
	if (!type || !store.types[type]) {
		store.log("Cannot save/load value. Invalid storage type selected: " + type, 'ERR');
		return;
	}
	store.log('Accessing ' + type + ' storage');
	
	return store.types[type](key, value, options);
};

// Adding functions and properties to store
///////////////////////////////////////////
store.name = "__shelf__";

store.verbosity = 0;
store.types = {};


var mainStorageType = "volatile";

//if Object.defineProperty works...
try {	
	
	Object.defineProperty(store, 'type', {
		set: function(type){
			if ('undefined' === typeof store.types[type]) {
				store.log('Cannot set store.type to an invalid type: ' + type);
				return false;
			}
			mainStorageType = type;
			return type;
		},
		get: function(){
			return mainStorageType;
		},
		configurable: false,
		enumerable: true
	});
}
catch(e) {
	store.type = mainStorageType; // default: memory
}

store.addType = function (type, storage) {
	store.types[type] = storage;
	store[type] = function (key, value, options) {
		options = options || {};
		options.type = type;
		return store(key, value, options);
	};
	
	if (!store.type || store.type === "volatile") {
		store.type = type;
	}
};

// TODO: create unit test
store.onquotaerror = undefined;
store.error = function() {	
	console.log("shelf quota exceeded"); 
	if ('function' === typeof store.onquotaerror) {
		store.onquotaerror(null);
	}
};

store.log = function(text) {
	if (store.verbosity > 0) {
		console.log('Shelf v.' + version + ': ' + text);
	}
	
};

store.isPersistent = function() {
	if (!store.types) return false;
	if (store.type === "volatile") return false;
	return true;
};

//if Object.defineProperty works...
try {	
	Object.defineProperty(store, 'persistent', {
		set: function(){},
		get: store.isPersistent,
		configurable: false
	});
}
catch(e) {
	// safe case
	store.persistent = false;
}

store.decycle = function(o) {
	if (JSON && JSON.decycle && 'function' === typeof JSON.decycle) {
		o = JSON.decycle(o);
	}
	return o;
};
    
store.retrocycle = function(o) {
	if (JSON && JSON.retrocycle && 'function' === typeof JSON.retrocycle) {
		o = JSON.retrocycle(o);
	}
	return o;
};

store.stringify = function(o) {
	if (!JSON || !JSON.stringify || 'function' !== typeof JSON.stringify) {
		throw new Error('JSON.stringify not found. Received non-string value and could not serialize.');
	}
	
	o = store.decycle(o);
	return JSON.stringify(o);
};

store.parse = function(o) {
	if ('undefined' === typeof o) return undefined;
	if (JSON && JSON.parse && 'function' === typeof JSON.parse) {
		try {
			o = JSON.parse(o);
		}
		catch (e) {
			store.log('Error while parsing a value: ' + e, 'ERR');
			store.log(o);
		}
	}
	
	o = store.retrocycle(o);
	return o;
};

// ## In-memory storage
// ### fallback for all browsers to enable the API even if we can't persist data
(function() {
	
	var memory = {},
		timeout = {};
	
	function copy(obj) {
		return store.parse(store.stringify(obj));
	}

	store.addType("volatile", function(key, value, options) {
		
		if (!key) {
			return copy(memory);
		}

		if (value === undefined) {
			return copy(memory[key]);
		}

		if (timeout[key]) {
			clearTimeout(timeout[key]);
			delete timeout[key];
		}

		if (value === null) {
			delete memory[key];
			return null;
		}

		memory[key] = value;
		if (options.expires) {
			timeout[key] = setTimeout(function() {
				delete memory[key];
				delete timeout[key];
			}, options.expires);
		}

		return value;
	});
}());

}('undefined' !== typeof module && 'undefined' !== typeof module.exports ? module.exports: this));
/**
 * ## File System storage for Shelf.js
 * 
 * ### Available only in Node.JS
 */

(function(exports) {
	
var store = exports.store;

if (!store) {
	console.log('fs.shelf.js: shelf.js core not found. File system storage not available.');
	return;
}

var lock = false;

var queue = [];

function clearQueue() {
	if (isLocked()) {
//		console.log('cannot clear queue if lock is active');
		return false;
	}
//	console.log('clearing queue');
	for (var i=0; i< queue.length; i++) {
		queue[i].call(queue[i]);
	}
}

function locked() {
	lock = true;
}

function unlocked() {
	lock = false;
}

function isLocked() {
	return lock;
}

function addToQueue(cb) {
	queue.push(cb);
}

var counter = 0;

store.filename = './shelf.out';

var fs = require('fs'),
	path = require('path'),
	util = require('util');

// https://github.com/jprichardson/node-fs-extra/blob/master/lib/copy.js
//var copyFile = function(srcFile, destFile, cb) {
//	
//    var fdr, fdw;
//    
//    fdr = fs.createReadStream(srcFile, {
//    	flags: 'r'
//    });
////    fs.flockSync(fdr, 'sh');
//    
//    fdw = fs.createWriteStream(destFile, {
//    	flags: 'w'
//    });
//    
////    fs.flockSync(fdw, 'ex');
//    		
//	fdr.on('end', function() {
////      fs.flockSync(fdr, 'un');
//    });
//	
//    fdw.on('close', function() {
////        fs.flockSync(fdw, 'un');
//    	if (cb) cb(null);
//    });
//    
//    fdr.pipe(fdw);
//};

//var overwrite = function (fileName, items) {
//console.log('OW: ' + counter++);
//
//var file = fileName || store.filename;
//if (!file) {
//	store.log('You must specify a valid file.', 'ERR');
//	return false;
//}
//
//var tmp_copy = path.dirname(file) + '/.' + path.basename(file);
//
////console.log('files')
////console.log(file);
////console.log(fileName);
////console.log(tmp_copy)
//
//copyFile(file, tmp_copy, function(){
//	var s = store.stringify(items);
//	// removing leading { and trailing }
//	s = s.substr(1, s = s.substr(0, s.legth-1));
////	console.log('SAVING')
////	console.log(s)
//	fs.writeFile(file, s, 'utf-8', function(e) {
//		console.log('UNLINK ' + counter)
//		if (e) throw e;
////		fs.unlinkSync(tmp_copy);
//		fs.unlink(tmp_copy, function (err) {
//			if (err) throw err;  
//		});
//		return true;
//	});
//
//});
//
//};

var BUF_LENGTH = 64 * 1024;
var _buff = new Buffer(BUF_LENGTH);

var copyFileSync = function(srcFile, destFile) {
	  var bytesRead, fdr, fdw, pos;
	  fdr = fs.openSync(srcFile, 'r');
	  fdw = fs.openSync(destFile, 'w');
	  bytesRead = 1;
	  pos = 0;
	  while (bytesRead > 0) {
	    bytesRead = fs.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
	    fs.writeSync(fdw, _buff, 0, bytesRead);
	    pos += bytesRead;
	  }
	  fs.closeSync(fdr);
	  return fs.closeSync(fdw);
};


var timeout = {};



var overwrite = function (fileName, items) {
	
	if (isLocked()) {
		addToQueue(this);
		return false;
	}
	
	locked();
	
//	console.log('OW: ' + counter++);
	
	var file = fileName || store.filename;
	if (!file) {
		store.log('You must specify a valid file.', 'ERR');
		return false;
	}
	
	var tmp_copy = path.dirname(file) + '/.' + path.basename(file);
	copyFileSync(file, tmp_copy);
	
	var s = store.stringify(items);

	// removing leading { and trailing }
	s = s.substr(1, s = s.substr(0, s.legth-1));
	
	fs.writeFileSync(file, s, 'utf-8');
	fs.unlinkSync(tmp_copy);
	
//	console.log('UNLINK ' + counter);
	
	
	unlocked();
	
	clearQueue();
	return true;	
};


if ('undefined' !== typeof fs.appendFileSync) {
	// node 0.8
	var save = function (fileName, key, value) {
		var file = fileName || store.filename;
		if (!file) {
			store.log('You must specify a valid file.', 'ERR');
			return false;
		}
		if (!key) return;
		
		var item = store.stringify(key) + ": " + store.stringify(value) + ",\n";
		
		return fs.appendFileSync(file, item, 'utf-8');
	};	
}
else {
	// node < 0.8
	var save = function (fileName, key, value) {
		var file = fileName || store.filename;
		if (!file) {
			store.log('You must specify a valid file.', 'ERR');
			return false;
		}
		if (!key) return;
		
		var item = store.stringify(key) + ": " + store.stringify(value) + ",\n";
		


		var fd = fs.openSync(file, 'a', '0666');
		fs.writeSync(fd, item, null, 'utf8');
		fs.closeSync(fd);
		return true;
	};
}

var load = function (fileName, key) {
	var file = fileName || store.filename;
	if (!file) {
		store.log('You must specify a valid file.', 'ERR');
		return false;
	}

	var s = fs.readFileSync(file, 'utf-8');
	
//	console.log('BEFORE removing end')
//	console.log(s)
	
	
	s = s.substr(0, s.length-2); // removing last ',' and /n
	
//	console.log('BEFORE PARSING')
//	console.log(s)
	
	var items = store.parse('{' + s + '}');
	
//	console.log('PARSED')
//	console.log(items)
	
	return (key) ? items[key] : items; 

};

var deleteVariable = function (fileName, key) {
	var file = fileName || store.filename;
	var items = load(file);
//	console.log('dele')
//	console.log(items)
//	console.log(key)
	delete items[key];
	overwrite(file, items);
	return null;
};

store.addType("fs", function(key, value, options) {
	
	var filename = options.file || store.filename;
	
	if (!key) { 
		return load(filename);
	}

	if (value === undefined) {
		return load(filename, key);
	}

	if (timeout[key]) {
		clearTimeout(timeout[key]);
		deleteVariable(filename, key);
	}

	if (value === null) {
		deleteVariable(filename, key);
		return null;
	}
	
	// save item
	save(filename, key, value);
	
	if (options.expires) {
		timeout[key] = setTimeout(function() {
			deleteVariable(filename, key);
		}, options.expires);
	}

	return value;
});

}(('undefined' !== typeof module && 'function' === typeof require) ? module.exports || module.parent.exports : {}));