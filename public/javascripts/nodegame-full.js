// cycle.js
// 2011-08-24

/*jslint evil: true, regexp: true */

/*members $ref, apply, call, decycle, hasOwnProperty, length, prototype, push,
    retrocycle, stringify, test, toString
*/

if (typeof JSON.decycle !== 'function') {
    JSON.decycle = function decycle(object) {
        'use strict';

// Make a deep copy of an object or array, assuring that there is at most
// one instance of each object or array in the resulting structure. The
// duplicate references (which might be forming cycles) are replaced with
// an object of the form
//      {$ref: PATH}
// where the PATH is a JSONPath string that locates the first occurance.
// So,
//      var a = [];
//      a[0] = a;
//      return JSON.stringify(JSON.decycle(a));
// produces the string '[{"$ref":"$"}]'.

// JSONPath is used to locate the unique object. $ indicates the top level of
// the object or array. [NUMBER] or [STRING] indicates a child member or
// property.

        var objects = [],   // Keep a reference to each unique object or array
            paths = [];     // Keep the path to each unique object or array

        return (function derez(value, path) {

// The derez recurses through the object, producing the deep copy.

            var i,          // The loop counter
                name,       // Property name
                nu;         // The new object or array

            switch (typeof value) {
            case 'object':

// typeof null === 'object', so get out if this value is not really an object.

                if (!value) {
                    return null;
                }

// If the value is an object or array, look to see if we have already
// encountered it. If so, return a $ref/path object. This is a hard way,
// linear search that will get slower as the number of unique objects grows.

                for (i = 0; i < objects.length; i += 1) {
                    if (objects[i] === value) {
                        return {$ref: paths[i]};
                    }
                }

// Otherwise, accumulate the unique value and its path.

                objects.push(value);
                paths.push(path);

// If it is an array, replicate the array.

                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    nu = [];
                    for (i = 0; i < value.length; i += 1) {
                        nu[i] = derez(value[i], path + '[' + i + ']');
                    }
                } else {

// If it is an object, replicate the object.

                    nu = {};
                    for (name in value) {
                        if (Object.prototype.hasOwnProperty.call(value, name)) {
                            nu[name] = derez(value[name],
                                path + '[' + JSON.stringify(name) + ']');
                        }
                    }
                }
                return nu;
            case 'number':
            case 'string':
            case 'boolean':
                return value;
            }
        }(object, '$'));
    };
}


if (typeof JSON.retrocycle !== 'function') {
    JSON.retrocycle = function retrocycle($) {
        'use strict';

// Restore an object that was reduced by decycle. Members whose values are
// objects of the form
//      {$ref: PATH}
// are replaced with references to the value found by the PATH. This will
// restore cycles. The object will be mutated.

// The eval function is used to locate the values described by a PATH. The
// root object is kept in a $ variable. A regular expression is used to
// assure that the PATH is extremely well formed. The regexp contains nested
// * quantifiers. That has been known to have extremely bad performance
// problems on some browsers for very long strings. A PATH is expected to be
// reasonably short. A PATH is allowed to belong to a very restricted subset of
// Goessner's JSONPath.

// So,
//      var s = '[{"$ref":"$"}]';
//      return JSON.retrocycle(JSON.parse(s));
// produces an array containing a single element which is the array itself.

        var px =
            /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

        (function rez(value) {

// The rez function walks recursively through the object looking for $ref
// properties. When it finds one that has a value that is a path, then it
// replaces the $ref object with a reference to the value that is found by
// the path.

            var i, item, name, path;

            if (value && typeof value === 'object') {
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    for (i = 0; i < value.length; i += 1) {
                        item = value[i];
                        if (item && typeof item === 'object') {
                            path = item.$ref;
                            if (typeof path === 'string' && px.test(path)) {
                                value[i] = eval(path);
                            } else {
                                rez(item);
                            }
                        }
                    }
                } else {
                    for (name in value) {
                        if (typeof value[name] === 'object') {
                            item = value[name];
                            if (item) {
                                path = item.$ref;
                                if (typeof path === 'string' && px.test(path)) {
                                    value[name] = eval(path);
                                } else {
                                    rez(item);
                                }
                            }
                        }
                    }
                }
            }
        }($));
        return $;
    };
}
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

store.error = function() {
	return "shelf quota exceeded"; 
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
 * ## Cookie storage for Shelf.js
 * 
 */

(function(exports) {

var store = exports.store;
	
if (!store) {
	console.log('cookie.shelf.js: shelf.js core not found. Cookie storage not available.');
	return;
}

if ('undefined' === typeof window) {
	console.log('cookie.shelf.js: am I running in a browser? Cookie storage not available.');
	return;
}

var cookie = (function() {
	
	var resolveOptions, assembleOptionsString, parseCookies, constructor, defaultOptions = {
		expiresAt: null,
		path: '/',
		domain:  null,
		secure: false
	};
	
	/**
	* resolveOptions - receive an options object and ensure all options are present and valid, replacing with defaults where necessary
	*
	* @access private
	* @static
	* @parameter Object options - optional options to start with
	* @return Object complete and valid options object
	*/
	resolveOptions = function(options){
		
		var returnValue, expireDate;

		if(typeof options !== 'object' || options === null){
			returnValue = defaultOptions;
		}
		else {
			returnValue = {
				expiresAt: defaultOptions.expiresAt,
				path: defaultOptions.path,
				domain: defaultOptions.domain,
				secure: defaultOptions.secure
			};

			if (typeof options.expiresAt === 'object' && options.expiresAt instanceof Date) {
				returnValue.expiresAt = options.expiresAt;
			}
			else if (typeof options.hoursToLive === 'number' && options.hoursToLive !== 0){
				expireDate = new Date();
				expireDate.setTime(expireDate.getTime() + (options.hoursToLive * 60 * 60 * 1000));
				returnValue.expiresAt = expireDate;
			}

			if (typeof options.path === 'string' && options.path !== '') {
				returnValue.path = options.path;
			}

			if (typeof options.domain === 'string' && options.domain !== '') {
				returnValue.domain = options.domain;
			}

			if (options.secure === true) {
				returnValue.secure = options.secure;
			}
		}

		return returnValue;
	};
	
	/**
	* assembleOptionsString - analyze options and assemble appropriate string for setting a cookie with those options
	*
	* @access private
	* @static
	* @parameter options OBJECT - optional options to start with
	* @return STRING - complete and valid cookie setting options
	*/
	assembleOptionsString = function (options) {
		options = resolveOptions(options);

		return (
			(typeof options.expiresAt === 'object' && options.expiresAt instanceof Date ? '; expires=' + options.expiresAt.toGMTString() : '') +
			'; path=' + options.path +
			(typeof options.domain === 'string' ? '; domain=' + options.domain : '') +
			(options.secure === true ? '; secure' : '')
		);
	};
	
	/**
	* parseCookies - retrieve document.cookie string and break it into a hash with values decoded and unserialized
	*
	* @access private
	* @static
	* @return OBJECT - hash of cookies from document.cookie
	*/
	parseCookies = function() {
		var cookies = {}, i, pair, name, value, separated = document.cookie.split(';'), unparsedValue;
		for(i = 0; i < separated.length; i = i + 1){
			pair = separated[i].split('=');
			name = pair[0].replace(/^\s*/, '').replace(/\s*$/, '');

			try {
				value = decodeURIComponent(pair[1]);
			}
			catch(e1) {
				value = pair[1];
			}

//						if (JSON && 'object' === typeof JSON && 'function' === typeof JSON.parse) {
//							try {
//								unparsedValue = value;
//								value = JSON.parse(value);
//							}
//							catch (e2) {
//								value = unparsedValue;
//							}
//						}

			cookies[name] = store.parse(value);
		}
		return cookies;
	};

	constructor = function(){};

	
	/**
	 * get - get one, several, or all cookies
	 *
	 * @access public
	 * @paramater Mixed cookieName - String:name of single cookie; Array:list of multiple cookie names; Void (no param):if you want all cookies
	 * @return Mixed - Value of cookie as set; Null:if only one cookie is requested and is not found; Object:hash of multiple or all cookies (if multiple or all requested);
	 */
	constructor.prototype.get = function(cookieName) {
		
		var returnValue, item, cookies = parseCookies();

		if(typeof cookieName === 'string') {
			returnValue = (typeof cookies[cookieName] !== 'undefined') ? cookies[cookieName] : null;
		}
		else if (typeof cookieName === 'object' && cookieName !== null) {
			returnValue = {};
			for (item in cookieName) {
				if (typeof cookies[cookieName[item]] !== 'undefined') {
					returnValue[cookieName[item]] = cookies[cookieName[item]];
				}
				else {
					returnValue[cookieName[item]] = null;
				}
			}
		}
		else {
			returnValue = cookies;
		}

		return returnValue;
	};
	
	/**
	 * filter - get array of cookies whose names match the provided RegExp
	 *
	 * @access public
	 * @paramater Object RegExp - The regular expression to match against cookie names
	 * @return Mixed - Object:hash of cookies whose names match the RegExp
	 */
	constructor.prototype.filter = function (cookieNameRegExp) {
		var cookieName, returnValue = {}, cookies = parseCookies();

		if (typeof cookieNameRegExp === 'string') {
			cookieNameRegExp = new RegExp(cookieNameRegExp);
		}

		for (cookieName in cookies) {
			if (cookieName.match(cookieNameRegExp)) {
				returnValue[cookieName] = cookies[cookieName];
			}
		}

		return returnValue;
	};
	
	/**
	 * set - set or delete a cookie with desired options
	 *
	 * @access public
	 * @paramater String cookieName - name of cookie to set
	 * @paramater Mixed value - Any JS value. If not a string, will be JSON encoded; NULL to delete
	 * @paramater Object options - optional list of cookie options to specify
	 * @return void
	 */
	constructor.prototype.set = function(cookieName, value, options){
		if (typeof options !== 'object' || options === null) {
			options = {};
		}

		if (typeof value === 'undefined' || value === null) {
			value = '';
			options.hoursToLive = -8760;
		}

		else if (typeof value !== 'string'){
//						if(typeof JSON === 'object' && JSON !== null && typeof store.stringify === 'function') {
//							
//							value = JSON.stringify(value);
//						}
//						else {
//							throw new Error('cookies.set() received non-string value and could not serialize.');
//						}
			
			value = store.stringify(value);
		}


		var optionsString = assembleOptionsString(options);

		document.cookie = cookieName + '=' + encodeURIComponent(value) + optionsString;
	};
	
	/**
	 * del - delete a cookie (domain and path options must match those with which the cookie was set; this is really an alias for set() with parameters simplified for this use)
	 *
	 * @access public
	 * @paramater MIxed cookieName - String name of cookie to delete, or Bool true to delete all
	 * @paramater Object options - optional list of cookie options to specify (path, domain)
	 * @return void
	 */
	constructor.prototype.del = function(cookieName, options) {
		var allCookies = {}, name;

		if(typeof options !== 'object' || options === null) {
			options = {};
		}

		if(typeof cookieName === 'boolean' && cookieName === true) {
			allCookies = this.get();
		}
		else if(typeof cookieName === 'string') {
			allCookies[cookieName] = true;
		}

		for(name in allCookies) {
			if(typeof name === 'string' && name !== '') {
				this.set(name, null, options);
			}
		}
	};
	
	/**
	 * test - test whether the browser is accepting cookies
	 *
	 * @access public
	 * @return Boolean
	 */
	constructor.prototype.test = function() {
		var returnValue = false, testName = 'cT', testValue = 'data';

		this.set(testName, testValue);

		if(this.get(testName) === testValue) {
			this.del(testName);
			returnValue = true;
		}

		return returnValue;
	};
	
	/**
	 * setOptions - set default options for calls to cookie methods
	 *
	 * @access public
	 * @param Object options - list of cookie options to specify
	 * @return void
	 */
	constructor.prototype.setOptions = function(options) {
		if(typeof options !== 'object') {
			options = null;
		}

		defaultOptions = resolveOptions(options);
	};

	return new constructor();
})();

// if cookies are supported by the browser
if (cookie.test()) {

	store.addType("cookie", function (key, value, options) {
		
		if ('undefined' === typeof key) {
			return cookie.get();
		}

		if ('undefined' === typeof value) {
			return cookie.get(key);
		}
		
		// Set to NULL means delete
		if (value === null) {
			cookie.del(key);
			return null;
		}

		return cookie.set(key, value, options);		
	});
}

}(this));
/**
 * ## Amplify storage for Shelf.js
 * 
 */

(function(exports) {

var store = exports.store;	

if (!store) {
	console.log('amplify.shelf.js: shelf.js core not found. Amplify storage not available.');
	return;
}

if ('undefined' === typeof window) {
	console.log('amplify.shelf.js: am I running in a browser? Amplify storage not available.');
	return;
}

//var rprefix = /^__shelf__/;
var regex = new RegExp("^" + store.name); 
function createFromStorageInterface(storageType, storage) {
	store.addType(storageType, function(key, value, options) {
		var storedValue, parsed, i, remove,
			ret = value,
			now = (new Date()).getTime();

		if (!key) {
			ret = {};
			remove = [];
			i = 0;
			try {
				// accessing the length property works around a localStorage bug
				// in Firefox 4.0 where the keys don't update cross-page
				// we assign to key just to avoid Closure Compiler from removing
				// the access as "useless code"
				// https://bugzilla.mozilla.org/show_bug.cgi?id=662511
				key = storage.length;

				while (key = storage.key(i++)) {
					if (regex.test(key)) {
						parsed = store.parse(storage.getItem(key));
						if (parsed.expires && parsed.expires <= now) {
							remove.push(key);
						} else {
							ret[key.replace(rprefix, "")] = parsed.data;
						}
					}
				}
				while (key = remove.pop()) {
					storage.removeItem(key);
				}
			} catch (error) {}
			return ret;
		}

		// protect against name collisions with direct storage
		key = store.name + key;


		if (value === undefined) {
			storedValue = storage.getItem(key);
			parsed = storedValue ? store.parse(storedValue) : { expires: -1 };
			if (parsed.expires && parsed.expires <= now) {
				storage.removeItem(key);
			} else {
				return parsed.data;
			}
		} else {
			if (value === null) {
				storage.removeItem(key);
			} else {
				parsed = store.stringify({
					data: value,
					expires: options.expires ? now + options.expires : null
				});
				try {
					storage.setItem(key, parsed);
				// quota exceeded
				} catch(error) {
					// expire old data and try again
					store[storageType]();
					try {
						storage.setItem(key, parsed);
					} catch(error) {
						throw store.error();
					}
				}
			}
		}

		return ret;
	});
}

// ## localStorage + sessionStorage
// IE 8+, Firefox 3.5+, Safari 4+, Chrome 4+, Opera 10.5+, iPhone 2+, Android 2+
for (var webStorageType in { localStorage: 1, sessionStorage: 1 }) {
	// try/catch for file protocol in Firefox
	try {
		if (window[webStorageType].getItem) {
			createFromStorageInterface(webStorageType, window[webStorageType]);
		}
	} catch(e) {}
}

// ## globalStorage
// non-standard: Firefox 2+
// https://developer.mozilla.org/en/dom/storage#globalStorage
if (!store.types.localStorage && window.globalStorage) {
	// try/catch for file protocol in Firefox
	try {
		createFromStorageInterface("globalStorage",
			window.globalStorage[window.location.hostname]);
		// Firefox 2.0 and 3.0 have sessionStorage and globalStorage
		// make sure we default to globalStorage
		// but don't default to globalStorage in 3.5+ which also has localStorage
		if (store.type === "sessionStorage") {
			store.type = "globalStorage";
		}
	} catch(e) {}
}

// ## userData
// non-standard: IE 5+
// http://msdn.microsoft.com/en-us/library/ms531424(v=vs.85).aspx
(function() {
	// IE 9 has quirks in userData that are a huge pain
	// rather than finding a way to detect these quirks
	// we just don't register userData if we have localStorage
	if (store.types.localStorage) {
		return;
	}

	// append to html instead of body so we can do this from the head
	var div = document.createElement("div"),
		attrKey = "shelf";
	div.style.display = "none";
	document.getElementsByTagName("head")[0].appendChild(div);

	// we can't feature detect userData support
	// so just try and see if it fails
	// surprisingly, even just adding the behavior isn't enough for a failure
	// so we need to load the data as well
	try {
		div.addBehavior("#default#userdata");
		div.load(attrKey);
	} catch(e) {
		div.parentNode.removeChild(div);
		return;
	}

	store.addType("userData", function(key, value, options) {
		div.load(attrKey);
		var attr, parsed, prevValue, i, remove,
			ret = value,
			now = (new Date()).getTime();

		if (!key) {
			ret = {};
			remove = [];
			i = 0;
			while (attr = div.XMLDocument.documentElement.attributes[i++]) {
				parsed = store.parse(attr.value);
				if (parsed.expires && parsed.expires <= now) {
					remove.push(attr.name);
				} else {
					ret[attr.name] = parsed.data;
				}
			}
			while (key = remove.pop()) {
				div.removeAttribute(key);
			}
			div.save(attrKey);
			return ret;
		}

		// convert invalid characters to dashes
		// http://www.w3.org/TR/REC-xml/#NT-Name
		// simplified to assume the starting character is valid
		// also removed colon as it is invalid in HTML attribute names
		key = key.replace(/[^-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u37f-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g, "-");
		// adjust invalid starting character to deal with our simplified sanitization
		key = key.replace(/^-/, "_-");

		if (value === undefined) {
			attr = div.getAttribute(key);
			parsed = attr ? store.parse(attr) : { expires: -1 };
			if (parsed.expires && parsed.expires <= now) {
				div.removeAttribute(key);
			} else {
				return parsed.data;
			}
		} else {
			if (value === null) {
				div.removeAttribute(key);
			} else {
				// we need to get the previous value in case we need to rollback
				prevValue = div.getAttribute(key);
				parsed = store.stringify({
					data: value,
					expires: (options.expires ? (now + options.expires) : null)
				});
				div.setAttribute(key, parsed);
			}
		}

		try {
			div.save(attrKey);
		// quota exceeded
		} catch (error) {
			// roll the value back to the previous value
			if (prevValue === null) {
				div.removeAttribute(key);
			} else {
				div.setAttribute(key, prevValue);
			}

			// expire old data and try again
			store.userData();
			try {
				div.setAttribute(key, parsed);
				div.save(attrKey);
			} catch (error) {
				// roll the value back to the previous value
				if (prevValue === null) {
					div.removeAttribute(key);
				} else {
					div.setAttribute(key, prevValue);
				}
				throw store.error();
			}
		}
		return ret;
	});
}());


}(this));
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

store.filename = './shelf.out';

var fs = require('fs'),
	path = require('path'),
	util = require('util');

// https://github.com/jprichardson/node-fs-extra/blob/master/lib/copy.js
var copyFile = function(srcFile, destFile, cb) {
    var fdr, fdw;
    fdr = fs.createReadStream(srcFile);
    fdw = fs.createWriteStream(destFile);
    fdr.on('end', function() {
      return cb(null);
    });
    return fdr.pipe(fdw);
  };


var timeout = {};

var overwrite = function (fileName, items) {
	var file = fileName || store.filename;
	if (!file) {
		store.log('You must specify a valid file.', 'ERR');
		return false;
	}
	
	var tmp_copy = path.dirname(file) + '.' + path.basename(file);
	
//	console.log('files')
//	console.log(file);
//	console.log(fileName);
//	console.log(tmp_copy)
	
	copyFile(file, tmp_copy, function(){
		var s = store.stringify(items);
		// removing leading { and trailing }
		s = s.substr(1, s = s.substr(0, s.legth-1));
//		console.log('SAVING')
//		console.log(s)
		fs.writeFile(file, s, 'utf-8', function(e) {
			if (e) throw e;
			fs.unlink(tmp_copy, function (err) {
				if (err) throw err;  
			});
			return true;
		});

	});
	
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
		


		fs.open(file, 'a', 666, function( e, id ) {
			fs.write( id, item, null, 'utf8', function(){
				fs.close(id, function(){});
			});
		});
		
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
/**
 * # JSUS: JavaScript UtilS. 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of general purpose javascript functions. JSUS helps!
 * 
 * See README.md for extra help.
 */

(function (exports) {
    
    var JSUS = exports.JSUS = {};
    
// ## JSUS._classes
// Reference to all the extensions
    JSUS._classes = {};
    
/**
 * ## JSUS.log
 * 
 * Reference to standard out, by default `console.log`
 * Override to redirect the standard output of all JSUS functions.
 * 
 * @param {string} txt Text to output
 * 
 */
JSUS.log = function (txt) {
    console.log(txt);
};
    
/**
 * ## JSUS.extend
 * 
 * Extends JSUS with additional methods and or properties taken 
 * from the object passed as first parameter. 
 * 
 * The first parameter can be an object literal or a function.
 * A reference of the original extending object is stored in 
 * JSUS._classes
 * 
 * If a second parameter is passed, that will be the target of the
 * extension.
 * 
 * @param {object} additional Text to output
 * @param {object|function} target The object to extend
 * @return {object|function} target The extended object
 * 
 * 	@see JSUS.get
 * 
 */
JSUS.extend = function (additional, target) {        
    if ('object' !== typeof additional && 'function' !== typeof additional) {
        return target;
    }
    
    // If we are extending JSUS, store a reference
    // of the additional object into the hidden
    // JSUS._classes object;
    if ('undefined' === typeof target) {
        target = target || this;
        if ('function' === typeof additional) {
            var name = additional.toString();
            name = name.substr('function '.length);
            name = name.substr(0, name.indexOf('('));
        }
        //! must be object
        else {
            var name = additional.constructor || additional.__proto__.constructor;
        }
        if (name) {
            this._classes[name] = additional;
        }
    }
    
    for (var prop in additional) {
        if (additional.hasOwnProperty(prop)) {
            if (typeof target[prop] !== 'object') {
                target[prop] = additional[prop];
            } else {
                JSUS.extend(additional[prop], target[prop]);
            }
        }
    }

    // additional is a class (Function)
    // TODO: this is true also for {}
    if (additional.prototype) {
        JSUS.extend(additional.prototype, target.prototype || target);
    };
    
    return target;
};
  
/**
 * ## JSUS.require
 * 
 * Returns a copy of one / all the objects that have extended the
 * current instance of JSUS.
 * 
 * The first parameter is a string representation of the name of 
 * the requested extending object. If no parameter is passed a copy 
 * of all the extending objects is returned.
 * 
 * @param {string} className The name of the requested JSUS library
 * @return {function|boolean} The copy of the JSUS library, or FALSE if the library does not exist
 * 
 */
JSUS.require = JSUS.get = function (className) {
    if ('undefined' === typeof JSUS.clone) {
        JSUS.log('JSUS.clone not found. Cannot continue.');
        return false;
    }
    if ('undefined' === typeof className) return JSUS.clone(JSUS._classes);
    if ('undefined' === typeof JSUS._classes[className]) {
        JSUS.log('Could not find class ' + className);
        return false;
    }
    return JSUS.clone(JSUS._classes[className]);
    //return new JSUS._classes[className]();
};

/**
 * ## JSUS.isNodeJS
 * 
 * Returns TRUE when executed inside Node.JS environment
 * 
 * @return {boolean} TRUE when executed inside Node.JS environment
 */
JSUS.isNodeJS = function () {
	return 'undefined' !== typeof module 
			&& 'undefined' !== typeof module.exports
			&& 'function' === typeof require;
};

// ## Node.JS includes
// if node
if (JSUS.isNodeJS()) {
    require('./lib/compatibility');
    require('./lib/obj');
    require('./lib/array');
    require('./lib/time');
    require('./lib/eval');
    require('./lib/dom');
    require('./lib/random');
    require('./lib/parse');
    require('./lib/fs');
}
// end node
    
})('undefined' !== typeof module && 'undefined' !== typeof module.exports ? module.exports: window);


/**
 * # SUPPORT
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Tests browsers ECMAScript 5 compatibility
 * 
 * For more information see http://kangax.github.com/es5-compat-table/
 * 
 */

(function (JSUS) {
    
function COMPATIBILITY() {};

/**
 * ## COMPATIBILITY.compatibility
 * 
 * Returns a report of the ECS5 features available
 * 
 * Useful when an application routinely performs an operation 
 * depending on a potentially unsupported ECS5 feature. 
 * 
 * Transforms multiple try-catch statements in a if-else
 * 
 * @return {object} support The compatibility object
 */
COMPATIBILITY.compatibility = function() {

	var support = {};
	
	try {
		Object.defineProperty({}, "a", {enumerable: false, value: 1})
		support.defineProperty = true;
	}
	catch(e) {
		support.defineProperty = false;	
	}
	
	try {
		eval('({ get x(){ return 1 } }).x === 1')
		support.setter = true;
	}
	catch(err) {
		support.setter = false;
	}
	  
	try {
		var value;
		eval('({ set x(v){ value = v; } }).x = 1');
		support.getter = true;
	}
	catch(err) {
		support.getter = false;
	}	  

	return support;
};


JSUS.extend(COMPATIBILITY);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # ARRAY
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions to manipulate arrays.
 * 
 */

(function (JSUS) {
    
function ARRAY(){};


/**
 * ## ARRAY.filter
 * 
 * Add the filter method to ARRAY objects in case the method is not
 * supported natively. 
 * 
 * 		@see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/ARRAY/filter
 * 
 */
if (!Array.prototype.filter) {  
    Array.prototype.filter = function(fun /*, thisp */) {  
        "use strict";  
        if (this === void 0 || this === null) throw new TypeError();  

        var t = Object(this);  
        var len = t.length >>> 0;  
        if (typeof fun !== "function") throw new TypeError();  
    
        var res = [];  
        var thisp = arguments[1];  
        for (var i = 0; i < len; i++) {  
            if (i in t) {  
                var val = t[i]; // in case fun mutates this  
                if (fun.call(thisp, val, i, t)) { 
                    res.push(val);  
                }
            }
        }
        
        return res;  
    };
}

/**
 * ## ARRAY.isArray
 * 
 * Returns TRUE if a variable is an Array
 * 
 * This method is exactly the same as `Array.isArray`, 
 * but it works on a larger share of browsers. 
 * 
 * @param {object} o The variable to check.
 * @see Array.isArray
 *  
 */
ARRAY.isArray = function (o) {
	if (!o) return false;
	return Object.prototype.toString.call(o) === '[object Array]';	
};

/**
 * ## ARRAY.seq
 * 
 * Returns an array of sequential numbers from start to end
 * 
 * If start > end the series goes backward.
 * 
 * The distance between two subsequent numbers can be controlled by the increment parameter.
 * 
 * When increment is not a divider of Abs(start - end), end will
 * be missing from the series.
 * 
 * A callback function to apply to each element of the sequence
 * can be passed as fourth parameter.
 *  
 * Returns FALSE, in case parameters are incorrectly specified
 * 
 * @param {number} start The first element of the sequence
 * @param {number} end The last element of the sequence
 * @param {number} increment Optional. The increment between two subsequents element of the sequence
 * @param {Function} func Optional. A callback function that can modify each number of the sequence before returning it
 *  
 * @return {array} out The final sequence 
 */
ARRAY.seq = function (start, end, increment, func) {
	if ('number' !== typeof start) return false;
	if (start === Infinity) return false;
	if ('number' !== typeof end) return false;
	if (end === Infinity) return false;
	if (start === end) return [start];
	
	if (increment === 0) return false;
	if (!JSUS.in_array(typeof increment, ['undefined', 'number'])) {
		return false;
	}
	
	increment = increment || 1;
	func = func || function(e) {return e;};
	
	var i = start,
		out = [];
	
	if (start < end) {
		while (i <= end) {
    		out.push(func(i));
    		i = i + increment;
    	}
	}
	else {
		while (i >= end) {
    		out.push(func(i));
    		i = i - increment;
    	}
	}
	
    return out;
};


/**
 * ## ARRAY.each
 * 
 * Executes a callback on each element of the array
 * 
 * If an error occurs returns FALSE.
 * 
 * @param {array} array The array to loop in
 * @param {Function} func The callback for each element in the array
 * @param {object} context Optional. The context of execution of the callback. Defaults ARRAY.each
 * 
 * @return {Boolean} TRUE, if execution was successful
 */
ARRAY.each = function (array, func, context) {
	if ('object' !== typeof array) return false;
	if (!func) return false;
    
	context = context || this;
    var i, len = array.length;
    for (i = 0 ; i < len; i++) {
        func.call(context, array[i]);
    }
    
    return true;
};

/**
 * ## ARRAY.map
 * 
 * Applies a callback function to each element in the db, store
 * the results in an array and returns it
 * 
 * Any number of additional parameters can be passed after the 
 * callback function
 * 
 * @return {array} out The result of the mapping execution
 * @see ARRAY.each
 * 
 */
ARRAY.map = function () {
    if (arguments.length < 2) return;
    var	args = Array.prototype.slice.call(arguments),
    	array = args.shift(),
    	func = args[0];
    
    if (!ARRAY.isArray(array)) {
    	JSUS.log('ARRAY.map() the first argument must be an array. Found: ' + array);
    	return;
    }

    var out = [],
    	o = undefined;
    for (var i = 0; i < array.length; i++) {
    	args[0] = array[i];
        o = func.apply(this, args);
        if ('undefined' !== typeof o) out.push(o);
    }
    return out;
};


/**
 * ## ARRAY.removeElement
 * 
 * Removes an element from the the array, and returns it
 * 
 * For objects, deep equality comparison is performed 
 * through JSUS.equals.
 * 
 * If no element is removed returns FALSE.
 * 
 * @param {mixed} needle The element to search in the array
 * @param {array} haystack The array to search in
 * 
 * @return {mixed} The element that was removed, FALSE if none was removed
 * @see JSUS.equals
 */
ARRAY.removeElement = function (needle, haystack) {
    if ('undefined' === typeof needle || !haystack) return false;
	
    if ('object' === typeof needle) {
        var func = JSUS.equals;
    } else {
        var func = function (a,b) {
            return (a === b);
        }
    }
    
    for (var i=0; i < haystack.length; i++) {
        if (func(needle, haystack[i])){
            return haystack.splice(i,1);
        }
    }
    
    return false;
};

/**
 * ## ARRAY.inArray 
 * 
 * Returns TRUE if the element is contained in the array,
 * FALSE otherwise
 * 
 * For objects, deep equality comparison is performed 
 * through JSUS.equals.
 * 
 * Alias ARRAY.in_array (deprecated)
 * 
 * @param {mixed} needle The element to search in the array
 * @param {array} haystack The array to search in
 * @return {Boolean} TRUE, if the element is contained in the array
 * 
 * 	@see JSUS.equals
 */
ARRAY.inArray = ARRAY.in_array = function (needle, haystack) {
    if (!haystack) return false;
    
    var func = JSUS.equals;    
    for (var i = 0; i < haystack.length; i++) {
        if (func.call(this, needle, haystack[i])) {
        	return true;
        }
    }
    // <!-- console.log(needle, haystack); -->
    return false;
};

/**
 * ## ARRAY.getNGroups
 * 
 * Returns an array of N array containing the same number of elements
 * If the length of the array and the desired number of elements per group
 * are not multiple, the last group could have less elements
 * 
 * The original array is not modified.
 *  
 *  @see ARRAY.getGroupsSizeN
 *  @see ARRAY.generateCombinations
 *  @see ARRAY.matchN
 *  
 * @param {array} array The array to split in subgroups
 * @param {number} N The number of subgroups
 * @return {array} Array containing N groups
 */ 
ARRAY.getNGroups = function (array, N) {
    return ARRAY.getGroupsSizeN(array, Math.floor(array.length / N));
};

/**
 * ## ARRAY.getGroupsSizeN
 * 
 * Returns an array of array containing N elements each
 * The last group could have less elements
 * 
 * @param {array} array The array to split in subgroups
 * @param {number} N The number of elements in each subgroup
 * @return {array} Array containing groups of size N
 * 
 *  	@see ARRAY.getNGroups
 *  	@see ARRAY.generateCombinations
 *  	@see ARRAY.matchN
 * 
 */ 
ARRAY.getGroupsSizeN = function (array, N) {
    
    var copy = array.slice(0);
    var len = copy.length;
    var originalLen = copy.length;
    var result = [];
    
    // <!-- Init values for the loop algorithm -->
    var i, idx;
    var group = [], count = 0;
    for (i=0; i < originalLen; i++) {
        
        // <!-- Get a random idx between 0 and array length -->
        idx = Math.floor(Math.random()*len);
        
        // <!-- Prepare the array container for the elements of a new group -->
        if (count >= N) {
            result.push(group);
            count = 0;
            group = [];
        }
        
        // <!-- Insert element in the group -->
        group.push(copy[idx]);
        
        // <!-- Update -->
        copy.splice(idx,1);
        len = copy.length;
        count++;
    }
    
    // <!-- Add any remaining element -->
    if (group.length > 0) {
        result.push(group);
    }
    
    return result;
};

/**
 * ## ARRAY._latinSquare
 * 
 * Generate a random Latin Square of size S
 * 
 * If N is defined, it returns "Latin Rectangle" (SxN) 
 * 
 * A parameter controls for self-match, i.e. whether the symbol "i" 
 * is found or not in in column "i".
 * 
 * @api private
 * @param {number} S The number of rows
 * @param {number} Optional. N The number of columns. Defaults N = S
 * @param {boolean} Optional. If TRUE self-match is allowed. Defaults TRUE
 * @return {array} The resulting latin square (or rectangle)
 * 
 */
ARRAY._latinSquare = function (S, N, self) {
	self = ('undefined' === typeof self) ? true : self;
	if (S === N && !self) return false; // <!-- infinite loop -->
	var seq = [];
	var latin = [];
	for (var i=0; i< S; i++) {
		seq[i] = i;
	}
	
	var idx = null;
	
	var start = 0;
	var limit = S;
	var extracted = [];
	if (!self) {
    	limit = S-1;
	}
	
	for (i=0; i < N; i++) {
		do {
			idx = JSUS.randomInt(start,limit);
		}
		while (JSUS.in_array(idx, extracted));
		extracted.push(idx);
		
		if (idx == 1) {
			latin[i] = seq.slice(idx);
			latin[i].push(0);
		}
		else {
			latin[i] = seq.slice(idx).concat(seq.slice(0,(idx)));
		}
		
	}
	
	return latin;
};

/**
 * ## ARRAY.latinSquare
 * 
 * Generate a random Latin Square of size S
 * 
 * If N is defined, it returns "Latin Rectangle" (SxN) 
 * 
 * @param {number} S The number of rows
 * @param {number} Optional. N The number of columns. Defaults N = S
 * @return {array} The resulting latin square (or rectangle)
 * 
 */
ARRAY.latinSquare = function (S, N) {
	if (!N) N = S;
	if (!S || S < 0 || (N < 0)) return false;
	if (N > S) N = S;
	
	return ARRAY._latinSquare(S, N, true);
};

/**
 * ## ARRAY.latinSquareNoSelf
 * 
 * Generate a random Latin Square of size Sx(S-1), where 
 * in each column "i", the symbol "i" is not found
 * 
 * If N < S, it returns a "Latin Rectangle" (SxN)
 * 
 * @param {number} S The number of rows
 * @param {number} Optional. N The number of columns. Defaults N = S-1
 * @return {array} The resulting latin square (or rectangle)
 */
ARRAY.latinSquareNoSelf = function (S, N) {
	if (!N) N = S-1;
	if (!S || S < 0 || (N < 0)) return false;
	if (N > S) N = S-1;
	
	return ARRAY._latinSquare(S, N, false);
}


/**
 * ## ARRAY.generateCombinations
 * 
 *  Generates all distinct combinations of exactly r elements each 
 *  and returns them into an array
 *  
 *  @param {array} array The array from which the combinations are extracted
 *  @param {number} r The number of elements in each combination
 *  @return {array} The total sets of combinations
 *  
 *  	@see ARRAY.getGroupSizeN
 *  	@see ARRAY.getNGroups
 *  	@see ARRAY.matchN
 * 
 */
ARRAY.generateCombinations = function (array, r) {
    function values(i, a) {
        var ret = [];
        for (var j = 0; j < i.length; j++) ret.push(a[i[j]]);
        return ret;
    }
    var n = array.length;
    var indices = [];
    for (var i = 0; i < r; i++) indices.push(i);
    var final = [];
    for (var i = n - r; i < n; i++) final.push(i);
    while (!JSUS.equals(indices, final)) {
        callback(values(indices, array));
        var i = r - 1;
        while (indices[i] == n - r + i) i -= 1;
        indices[i] += 1;
        for (var j = i + 1; j < r; j++) indices[j] = indices[i] + j - i;
    }
    return values(indices, array); 
};

/**
 * ## ARRAY.matchN
 * 
 * Match each element of the array with N random others
 * 
 * If strict is equal to true, elements cannot be matched multiple times.
 * 
 * *Important*: this method has a bug / feature. If the strict parameter is set,
 * the last elements could remain without match, because all the other have been 
 * already used. Another recombination would be able to match all the 
 * elements instead.
 * 
 * @param {array} array The array in which operate the matching
 * @param {number} N The number of matches per element
 * @param {Boolean} strict Optional. If TRUE, matched elements cannot be repeated. Defaults, FALSE 
 * @return {array} result The results of the matching
 * 
 *  	@see ARRAY.getGroupSizeN
 *  	@see ARRAY.getNGroups
 *  	@see ARRAY.generateCombinations
 * 
 */
ARRAY.matchN = function (array, N, strict) {
	if (!array) return;
	if (!N) return array;
	
    var result = [],
    	len = array.length,
    	found = [];
    for (var i = 0 ; i < len ; i++) {
        // <!-- Recreate the array -->
        var copy = array.slice(0);
        copy.splice(i,1);
        if (strict) {
            copy = ARRAY.arrayDiff(copy,found);
        }
        var group = ARRAY.getNRandom(copy,N);
        // <!-- Add to the set of used elements -->
        found = found.concat(group);
        // <!-- Re-add the current element -->
        group.splice(0,0,array[i]);
        result.push(group);
        
        // <!-- Update -->
        group = [];
    }
    return result;
};

/**
 * ## ARRAY.rep
 * 
 * Appends an array to itself a number of times and return a new array
 * 
 * The original array is not modified.
 * 
 * @param {array} array the array to repeat 
 * @param {number} times The number of times the array must be appended to itself
 * @return {array} A copy of the original array appended to itself
 * 
 */
ARRAY.rep = function (array, times) {
	if (!array) return;
	if (!times) return array.slice(0);
	if (times < 1) {
		JSUS.log('times must be greater or equal 1', 'ERR');
		return;
	}
	
    var i = 1, result = array.slice(0);
    for (; i < times; i++) {
        result = result.concat(array);
    }
    return result;
};

/**
 * ## ARRAY.stretch
 * 
 * Repeats each element of the array N times
 * 
 * N can be specified as an integer or as an array. In the former case all 
 * the elements are repeat the same number of times. In the latter, the each
 * element can be repeated a custom number of times. If the length of the `times`
 * array differs from that of the array to stretch a recycle rule is applied.
 * 
 * The original array is not modified.
 * 
 * E.g.:
 * 
 * ```js
 * 	var foo = [1,2,3];
 * 
 * 	ARRAY.stretch(foo, 2); // [1, 1, 2, 2, 3, 3]
 * 
 * 	ARRAY.stretch(foo, [1,2,3]); // [1, 2, 2, 3, 3, 3];
 *
 * 	ARRAY.stretch(foo, [2,1]); // [1, 1, 2, 3, 3];
 * ```
 * 
 * @param {array} array the array to strech
 * @param {number|array} times The number of times each element must be repeated
 * @return {array} A stretched copy of the original array
 * 
 */
ARRAY.stretch = function (array, times) {
	if (!array) return;
	if (!times) return array.slice(0);
	if ('number' === typeof times) {
		if (times < 1) {
			JSUS.log('times must be greater or equal 1', 'ERR');
			return;
		}
		times = ARRAY.rep([times], array.length);
	}
	
    var result = [];
    for (var i = 0; i < array.length; i++) {
    	var repeat = times[(i % times.length)];
        for (var j = 0; j < repeat ; j++) {
        	result.push(array[i]);
        }
    }
    return result;
};


/**
 * ## ARRAY.arrayIntersect
 * 
 * Computes the intersection between two arrays
 * 
 * Arrays can contain both primitive types and objects.
 * 
 * @param {array} a1 The first array
 * @param {array} a2 The second array
 * @return {array} All the values of the first array that are found also in the second one
 */
ARRAY.arrayIntersect = function (a1, a2) {
    return a1.filter( function(i) {
        return JSUS.in_array(i, a2);
    });
};
    
/**
 * ## ARRAY.arrayDiff
 * 
 * Performs a diff between two arrays
 * 
 * Arrays can contain both primitive types and objects.
 * 
 * @param {array} a1 The first array
 * @param {array} a2 The second array
 * @return {array} All the values of the first array that are not found in the second one
 */
ARRAY.arrayDiff = function (a1, a2) {
    return a1.filter( function(i) {
        return !(JSUS.in_array(i, a2));
    });
};

/**
 * ## ARRAY.shuffle
 * 
 * Shuffles the elements of the array using the Fischer algorithm
 * 
 * The original array is not modified, and a copy is returned.
 * 
 * @param {array} shuffle The array to shuffle
 * @return {array} copy The shuffled array
 * 
 * 		@see http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
ARRAY.shuffle = function (array) {
	if (!array) return;
    var copy = array.slice(0);
    var len = array.length-1; // ! -1
    var j, tmp;
    for (var i = len; i > 0; i--) {
        j = Math.floor(Math.random()*(i+1));
        tmp = copy[j];
        copy[j] = copy[i];
        copy[i] = tmp;
    }
    return copy;
};

/**
 * ## ARRAY.getNRandom
 * 
 * Select N random elements from the array and returns them
 * 
 * @param {array} array The array from which extracts random elements
 * @paran {number} N The number of random elements to extract
 * @return {array} An new array with N elements randomly chose from the original array  
 */
ARRAY.getNRandom = function (array, N) {
    return ARRAY.shuffle(array).slice(0,N);
};                           
    
/**
 * ## ARRAY.distinct
 * 
 * Removes all duplicates entries from an array and returns a copy of it
 * 
 * Does not modify original array.
 * 
 * Comparison is done with `JSUS.equals`.
 * 
 * @param {array} array The array from which eliminates duplicates
 * @return {array} out A copy of the array without duplicates
 * 
 * 	@see JSUS.equals
 */
ARRAY.distinct = function (array) {
	var out = [];
	if (!array) return out;
	
	ARRAY.each(array, function(e) {
		if (!ARRAY.in_array(e, out)) {
			out.push(e);
		}
	});
	return out;
	
};

/**
 * ## ARRAY.transpose
 * 
 * Transposes a given 2D array.
 * 
 * The original array is not modified, and a new copy is
 * returned.
 *
 * @param {array} array The array to transpose
 * @return {array} The Transposed Array
 * 
 */
ARRAY.transpose = function (array) {
	if (!array) return;  
	
	// Calculate width and height
    var w, h, i, j, t = []; 
	w = array.length || 0;
	h = (ARRAY.isArray(array[0])) ? array[0].length : 0;
	if (w === 0 || h === 0) return t;
	
	for ( i = 0; i < h; i++) {
		t[i] = [];
	    for ( j = 0; j < w; j++) {	   
	    	t[i][j] = array[j][i];
	    }
	} 
	return t;
};




JSUS.extend(ARRAY);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # DOM
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions related to DOM manipulation
 * 
 * Helper library to perform generic operation with DOM elements.
 * 
 * The general syntax is the following: Every HTML element has associated
 * a get* and a add* method, whose syntax is very similar.
 * 
 * - The get* method creates the element and returns it.
 * - The add* method creates the element, append it as child to a root element, and then returns it.
 * 
 * The syntax of both method is the same, but the add* method 
 * needs the root element as first parameter. E.g.
 * 
 *  getButton(id, text, attributes);
 * 	addButton(root, id, text, attributes);
 *  
 * The last parameter is generally an object containing a list of 
 * of key-values pairs as additional attributes to set to the element.
 *   
 * Only the methods which do not follow the above-mentioned syntax
 * will receive further explanation. 
 * 
 * 
 */

(function (JSUS) {
    
function DOM() {};

// ## GENERAL

/**
 * ### DOM.write
 * 
 * Write a text, or append an HTML element or node, into the
 * the root element.
 * 
 * 	@see DOM.writeln
 * 
 */
DOM.write = function (root, text) {
    if (!root) return;
    if (!text) return;
    var content = (!JSUS.isNode(text) || !JSUS.isElement(text)) ? document.createTextNode(text) : text;
    root.appendChild(content);
    return content;
};

/**
 * ### DOM.writeln
 * 
 * Write a text, or append an HTML element or node, into the
 * the root element and adds a break immediately after.
 * 
 * @see DOM.write
 * @see DOM.addBreak
 */
DOM.writeln = function (root, text, rc) {
    if (!root) return;
    var br = this.addBreak(root, rc);
    return (text) ? DOM.write(root, text) : br;
};

/**
 * ### DOM.sprintf
 * 
 * Builds up a decorated HTML text element
 * 
 * Performs string substitution from an args object where the first 
 * character of the key bears the following semantic: 
 *  
 * 	- '@': variable substitution with escaping 
 * 	- '!': variable substitution without variable escaping
 *  - '%': wraps a portion of string into a _span_ element to which is possible 
 *  		to associate a css class or id. Alternatively, it also possible to 
 *  		add in-line style. E.g.:
 * 
 * 	sprintf('%sImportant!%s An error has occurred: %pre@err%pre', {
 * 		'%pre': {
 * 			style: 'font-size: 12px; font-family: courier;'
 * 		},
 * 		'%s': {
 * 			id: 'myId',
 * 			'class': 'myClass',
 * 		},
 * 		'@err': 'file not found',
 * 	}, document.body);
 * 
 * 
 * @param {string} string A text to transform
 * @param {object} args Optional. An object containing the spans to apply to the string
 * @param {Element} root Optional. An HTML element to which append the string. Defaults, a new _span_ element
 * 
 */
DOM.sprintf = function (string, args, root) {
	
	var text, textNode, span, idx_start, idx_finish, idx_replace, idxs, spans = {};
	
	if (!args) {
		return document.createTextNode(string);
	}
	
	root = root || document.createElement('span');
	
	// Transform arguments before inserting them.
	for (var key in args) {
		if (args.hasOwnProperty(key)) {
			
			// pattern not found
			if (idx_start === -1) continue;
			
			switch(key[0]) {
			
			case '%': // span
				
				idx_start = string.indexOf(key);
				idx_replace = idx_start + key.length;
				idx_finish = string.indexOf(key, idx_replace);
				
				if (idx_finish === -1) {
					JSUS.log('Error. Could not find closing key: ' + key);
					continue;
				}
				
				spans[idx_start] = key;
				
				break;
			
			case '@': // replace and sanitize
				string = string.replace(key, escape(args[key]));
				break;
				
			case '!': // replace and not sanitize
				string = string.replace(key, args[key]);
				break;
				
			default:
				JSUS.log('Identifier not in [!,@,%]: ' + key[0]);
		
			}
		}
	}
	
	// No span to creates
	if (!JSUS.size(spans)) {
		return document.createTextNode(string);
	}
	
	// Re-assamble the string
	
	idxs = JSUS.keys(spans).sort(function(a,b){return a-b;});
	idx_finish = 0;
	for (var i = 0; i < idxs.length; i++) {
		
		// add span
		key = spans[idxs[i]];
		idx_start = string.indexOf(key);
		
		// add fragments of string
		if (idx_finish !== idx_start-1) {
			root.appendChild(document.createTextNode(string.substring(idx_finish, idx_start)));
		}
		
		idx_replace = idx_start + key.length;
		idx_finish = string.indexOf(key, idx_replace);
		
		span = W.getElement('span', null, args[key]);

		text = string.substring(idx_replace, idx_finish);
		
		span.appendChild(document.createTextNode(text));
		
		root.appendChild(span);
		idx_finish = idx_finish + key.length;
	}
	
	// add the final part of the string
	if (idx_finish !== string.length) {
		root.appendChild(document.createTextNode(string.substring(idx_finish)));
	}
	
	return root;
}


/**
 * ### DOM.isNode
 * 
 * Returns TRUE if the object is a DOM node
 * 
 */
DOM.isNode = function(o){
    return (
        typeof Node === "object" ? o instanceof Node : 
        typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
    );
};

/**
 * ### DOM.isElement
 * 
 * Returns TRUE if the object is a DOM element 
 * 
 */   
DOM.isElement = function(o) {
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        typeof o === "object" && o.nodeType === 1 && typeof o.nodeName === "string"
    );
};

/**
 * ### DOM.getElement
 * 
 * Creates a generic HTML element with id and attributes as specified,
 * and returns it.
 * 
 * @see DOM.addAttributes2Elem
 * 
 */
DOM.getElement = function (elem, id, attributes) {
    var e = document.createElement(elem);
    if ('undefined' !== typeof id) {
        e.id = id;
    }
    return this.addAttributes2Elem(e, attributes);
};

/**
 * ### DOM.addElement
 * 
 * Creates a generic HTML element with id and attributes as specified, 
 * appends it to the root element, and returns it.
 * 
 * @see DOM.getElement
 * @see DOM.addAttributes2Elem
 * 
 */
DOM.addElement = function (elem, root, id, attributes) {
    var el = this.getElement(elem, id, attributes);
    return root.appendChild(el);
};

/**
 * ### DOM.addAttributes2Elem
 * 
 * Adds attributes to an HTML element and returns it.
 * 
 * Attributes are defined as key-values pairs. 
 * Attributes 'style', and 'label' are ignored.
 * 
 * @see DOM.style
 * @see DOM.addLabel
 * 
 */
DOM.addAttributes2Elem = function (e, a) {
    if (!e || !a) return e;
    if ('object' != typeof a) return e;
    var specials = ['id', 'label'];
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            if (!JSUS.in_array(key, specials)) {
                e.setAttribute(key,a[key]);
            } else if (key === 'id') {
                e.id = a[key];
            }
            
            // TODO: handle special cases
            // <!--
//                else {
//            
//                    // If there is no parent node, the legend cannot be created
//                    if (!e.parentNode) {
//                        node.log('Cannot add label: no parent element found', 'ERR');
//                        continue;
//                    }
//                    
//                    this.addLabel(e.parentNode, e, a[key]);
//                }
            // -->
        }
    }
    return e;
};

/**
 * ### DOM.populateSelect
 * 
 * Appends a list of options into a HTML select element.
 * The second parameter list is an object containing 
 * a list of key-values pairs as text-value attributes for
 * the option.
 *  
 */
DOM.populateSelect = function (select, list) {
    if (!select || !list) return;
    for (var key in list) {
        if (list.hasOwnProperty(key)) {
            var opt = document.createElement('option');
            opt.value = list[key];
            opt.appendChild(document.createTextNode(key));
            select.appendChild(opt);
        }
    }
};

/**
 * ### DOM.removeChildrenFromNode
 * 
 * Removes all children from a node.
 * 
 */
DOM.removeChildrenFromNode = function (e) {
    
    if (!e) return false;
    
    while (e.hasChildNodes()) {
        e.removeChild(e.firstChild);
    }
    return true;
};

/**
 * ### DOM.insertAfter
 * 
 * Insert a node element after another one.
 * 
 * The first parameter is the node to add.
 * 
 */
DOM.insertAfter = function (node, referenceNode) {
      referenceNode.insertBefore(node, referenceNode.nextSibling);
};

/**
 * ### DOM.generateUniqueId
 * 
 * Generate a unique id for the page (frames included).
 * 
 * TODO: now it always create big random strings, it does not actually
 * check if the string exists.
 * 
 */
DOM.generateUniqueId = function (prefix) {
    var search = [window];
    if (window.frames) {
        search = search.concat(window.frames);
    }
    
    function scanDocuments(id) {
        var found = true;
        while (found) {
            for (var i=0; i < search.length; i++) {
                found = search[i].document.getElementById(id);
                if (found) {
                    id = '' + id + '_' + JSUS.randomInt(0, 1000);
                    break;
                }
            }
        }
        return id;
    };

    
    return scanDocuments(prefix + '_' + JSUS.randomInt(0, 10000000));
    //return scanDocuments(prefix);
};

/**
 * ### DOM.getBlankPage
 * 
 * Creates a blank HTML page with the html and body 
 * elements already appended.
 * 
 */
DOM.getBlankPage = function() {
    var html = document.createElement('html');
    html.appendChild(document.createElement('body'));
    return html;
};
    
//    DOM.findLastElement = function(o) {
//        if (!o) return;
//        
//        if (o.lastChild) {
//            var e 
//            JSUS.isElement(e)) return DOM.findLastElement(e);
//        
//            var e = e.previousSibling;
//            if (e && JSUS.isElement(e)) return DOM.findLastElement(e);
//        
//        return o;
//    };

// ## GET/ADD

/**
 * ### DOM.getButton
 * 
 */
DOM.getButton = function (id, text, attributes) {
    var sb = document.createElement('button');
    sb.id = id;
    sb.appendChild(document.createTextNode(text || 'Send'));    
    return this.addAttributes2Elem(sb, attributes);
};

/**
 * ### DOM.addButton
 * 
 */
DOM.addButton = function (root, id, text, attributes) {
    var b = this.getButton(id, text, attributes);
    return root.appendChild(b);
};

/**
 * ### DOM.getFieldset
 * 
 */
DOM.getFieldset = function (id, legend, attributes) {
    var f = this.getElement('fieldset', id, attributes);
    var l = document.createElement('Legend');
    l.appendChild(document.createTextNode(legend));    
    f.appendChild(l);
    return f;
};

/**
 * ### DOM.addFieldset
 * 
 */
DOM.addFieldset = function (root, id, legend, attributes) {
    var f = this.getFieldset(id, legend, attributes);
    return root.appendChild(f);
};

/**
 * ### DOM.getTextInput
 * 
 */
DOM.getTextInput = function (id, attributes) {
	var ti =  document.createElement('input');
	if ('undefined' !== typeof id) ti.id = id;
	ti.setAttribute('type', 'text');
	return this.addAttributes2Elem(ti, attributes);
};

/**
 * ### DOM.addTextInput
 * 
 */
DOM.addTextInput = function (root, id, attributes) {
	var ti = this.getTextInput(id, attributes);
	return root.appendChild(ti);
};

/**
 * ### DOM.getTextArea
 * 
 */
DOM.getTextArea = function (id, attributes) {
	var ta =  document.createElement('textarea');
	if ('undefined' !== typeof id) ta.id = id;
	return this.addAttributes2Elem(ta, attributes);
};

/**
 * ### DOM.addTextArea
 * 
 */
DOM.addTextArea = function (root, id, attributes) {
	var ta = this.getTextArea(id, attributes);
	return root.appendChild(ta);
};

/**
 * ### DOM.getCanvas
 * 
 */
DOM.getCanvas = function (id, attributes) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
        
    if (!context) {
        alert('Canvas is not supported');
        return false;
    }
    
    canvas.id = id;
    return this.addAttributes2Elem(canvas, attributes);
};

/**
 * ### DOM.addCanvas
 * 
 */
DOM.addCanvas = function (root, id, attributes) {
    var c = this.getCanvas(id, attributes);
    return root.appendChild(c);
};
  
/**
 * ### DOM.getSlider
 * 
 */
DOM.getSlider = function (id, attributes) {
    var slider = document.createElement('input');
    slider.id = id;
    slider.setAttribute('type', 'range');
    return this.addAttributes2Elem(slider, attributes);
};

/**
 * ### DOM.addSlider
 * 
 */
DOM.addSlider = function (root, id, attributes) {
    var s = this.getSlider(id, attributes);
    return root.appendChild(s);
};

/**
 * ### DOM.getRadioButton
 * 
 */
DOM.getRadioButton = function (id, attributes) {
    var radio = document.createElement('input');
    radio.id = id;
    radio.setAttribute('type', 'radio');
    return this.addAttributes2Elem(radio, attributes);
};

/**
 * ### DOM.addRadioButton
 * 
 */
DOM.addRadioButton = function (root, id, attributes) {
    var rb = this.getRadioButton(id, attributes);
    return root.appendChild(rb);
};

/**
 * ### DOM.getLabel
 * 
 */
DOM.getLabel = function (forElem, id, labelText, attributes) {
    if (!forElem) return false;
    var label = document.createElement('label');
    label.id = id;
    label.appendChild(document.createTextNode(labelText));
    
    if ('undefined' === typeof forElem.id) {
        forElem.id = this.generateUniqueId();
    }
    
    label.setAttribute('for', forElem.id);
    this.addAttributes2Elem(label, attributes);
    return label;
};

/**
 * ### DOM.addLabel
 * 
 */
DOM.addLabel = function (root, forElem, id, labelText, attributes) {
    if (!root || !forElem || !labelText) return false;        
    var l = this.getLabel(forElem, id, labelText, attributes);
    root.insertBefore(l, forElem);
    return l;
};

/**
 * ### DOM.getSelect
 * 
 */
DOM.getSelect = function (id, attributes) {
    return this.getElement('select', id, attributes);
};

/**
 * ### DOM.addSelect
 * 
 */
DOM.addSelect = function (root, id, attributes) {
    return this.addElement('select', root, id, attributes);
};

/**
 * ### DOM.getIFrame
 * 
 */
DOM.getIFrame = function (id, attributes) {
    var attributes = {'name' : id}; // For Firefox
    return this.getElement('iframe', id, attributes);
};

/**
 * ### DOM.addIFrame
 * 
 */
DOM.addIFrame = function (root, id, attributes) {
    var ifr = this.getIFrame(id, attributes);
    return root.appendChild(ifr);
};

/**
 * ### DOM.addBreak
 * 
 */
DOM.addBreak = function (root, rc) {
    var RC = rc || 'br';
    var br = document.createElement(RC);
    return root.appendChild(br);
    //return this.insertAfter(br,root);
};

/**
 * ### DOM.getDiv
 * 
 */
DOM.getDiv = function (id, attributes) {
    return this.getElement('div', id, attributes);
};

/**
 * ### DOM.addDiv
 * 
 */
DOM.addDiv = function (root, id, attributes) {
    return this.addElement('div', root, id, attributes);
};

// ## CSS / JS

/**
 * ### DOM.addCSS
 * 
 * If no root element is passed, it tries to add the CSS 
 * link element to document.head, document.body, and 
 * finally document. If it fails, returns FALSE.
 * 
 */
DOM.addCSS = function (root, css, id, attributes) {
    var root = root || document.head || document.body || document;
    if (!root) return false;
    
    attributes = attributes || {};
    
    attributes = JSUS.merge(attributes, {rel : 'stylesheet',
                                        type: 'text/css',
                                        href: css
    });
    
    return this.addElement('link', root, id, attributes);
};

/**
 * ### DOM.addJS
 * 
 */
DOM.addJS = function (root, js, id, attributes) {
	var root = root || document.head || document.body || document;
    if (!root) return false;
    
    attributes = attributes || {};
    
    attributes = JSUS.merge(attributes, {charset : 'utf-8',
                                        type: 'text/javascript',
                                        src: js
    });
    
    return this.addElement('script', root, id, attributes);
};


/**
 * ### DOM.highlight
 * 
 * Provides a simple way to highlight an HTML element
 * by adding a colored border around it.
 * 
 * Three pre-defined modes are implemented: 
 * 
 * - OK: green
 * - WARN: yellow
 * - ERR: red (default)
 * 
 * Alternatively, it is possible to specify a custom
 * color as HEX value. Examples:
 * 
 * ```javascript
 * highlight(myDiv, 'WARN'); // yellow border
 * highlight(myDiv);          // red border
 * highlight(myDiv, '#CCC'); // grey border
 * ```
 *  
 * 	@see DOM.addBorder
 *	@see DOM.style
 * 
 */
DOM.highlight = function (elem, code) {
    if (!elem) return;
    
    // default value is ERR        
    switch (code) {    
        case 'OK':
            var color =  'green';
            break;
        case 'WARN':
            var color = 'yellow';
            break;
        case 'ERR':
            var color = 'red';
            break;
        default:
            if (code[0] === '#') {
                var color = code;
            }
            else {
                var color = 'red';
            }
    }
    
    return this.addBorder(elem, color);
};

/**
 * ### DOM.addBorder
 * 
 * Adds a border around the specified element. Color,
 * width, and type can be specified.
 * 
 */
DOM.addBorder = function (elem, color, witdh, type) {
    if (!elem) return;
    
    var color = color || 'red';
    var width = width || '5px';
    var type = type || 'solid';
    
    var properties = { border: width + ' ' + type + ' ' + color };
    return this.style(elem,properties);
};

/**
 * ### DOM.style
 * 
 * Styles an element as an in-line css. 
 * Takes care to add new styles, and not overwriting previuous
 * attributes.
 * 
 * Returns the element.
 * 
 * @see DOM.setAttribute
 */
DOM.style = function (elem, properties) {
    if (!elem || !properties) return;
    if (!DOM.isElement(elem)) return;
    
    var style = '';
    for (var i in properties) {
        style += i + ': ' + properties[i] + '; ';
    };
    return elem.setAttribute('style', style);
};

/**
 * ### DOM.removeClass
 * 
 * Removes a specific class from the class attribute
 * of a given element.
 * 
 * Returns the element.
 */
DOM.removeClass = function (el, c) {
    if (!el || !c) return;
    var regexpr = '/(?:^|\s)' + c + '(?!\S)/';
    var o = el.className = el.className.replace( regexpr, '' );
    return el;
};

/**
 * ### DOM.addClass
 * 
 * Add a class to the class attribute of the given element.
 * 
 * Takes care not to overwrite already existing classes
 * 
 */
DOM.addClass = function (el, c) {
    if (!el || !c) return;
    if (c instanceof Array) c = c.join(' ');
    if ('undefined' === typeof el.className) {
        el.className = c;
    } else {
        el.className += ' ' + c;
    }
    return el;
  };
    
JSUS.extend(DOM);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # EVAL
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions related to the evaluation
 * of strings as javascript commands
 * 
 */

(function (JSUS) {
    
function EVAL(){};

/**
 * ## EVAL.eval
 * 
 * Allows to execute the eval function within a given 
 * context. 
 * 
 * If no context is passed a reference, ```this``` is used.
 * 
 * @param {string} str The command to executes
 * @param {object} context Optional. The context of execution. Defaults ```this```
 * @return {mixed} The return value of the executed commands
 * 
 * 	@see eval
 * 	@see JSON.parse
 */
EVAL.eval = function (str, context) {
    if (!str) return;
	context = context || this;
    // Eval must be called indirectly
    // i.e. eval.call is not possible
    var func = function (str) {
        // TODO: Filter str
        return eval(str);
    }
    return func.call(context, str);
};

JSUS.extend(EVAL);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # OBJ
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions to manipulate javascript objects
 * 
 */
(function (JSUS) {


    
function OBJ(){};

var compatibility = null;

if ('undefined' !== typeof JSUS.compatibility) {
	compatibility = JSUS.compatibility();
}


/**
 * ## OBJ.equals
 * 
 * Checks for deep equality between two objects, string 
 * or primitive types.
 * 
 * All nested properties are checked, and if they differ 
 * in at least one returns FALSE, otherwise TRUE.
 * 
 * Takes care of comparing the following special cases: 
 * 
 * - undefined
 * - null
 * - NaN
 * - Infinity
 * - {}
 * - falsy values
 * 
 * 
 */
OBJ.equals = function (o1, o2) {	
	if ('undefined' === typeof o1 || 'undefined' === typeof o2) {
		return (o1 === o2);
	}
	if (o1 === null || o2 === null) {
		return (o1 === o2);
	}
	if (('number' === typeof o1 && isNaN(o1)) && ('number' === typeof o2 && isNaN(o2)) ) {
		return (isNaN(o1) && isNaN(o2));
	}
	
    // Check whether arguments are not objects
	var primitives = {number: '', string: '', boolean: ''}
    if (typeof o1 in primitives) {
        if (typeof o2 in primitives) {
            return (o1 === o2);
        }
        return false;
    } else if (typeof o2 in {number: '', string: '', boolean: ''}) {
        return false;
    }

    for (var p in o1) {
        if (o1.hasOwnProperty(p)) {
          
            if ('undefined' === typeof o2[p] && 'undefined' !== typeof o1[p]) return false;
            if (!o2[p] && o1[p]) return false; // <!-- null --> 
            
            switch (typeof o1[p]) {
                case 'function':
                        if (o1[p].toString() !== o2[p].toString()) return false;
                        
                    default:
                    	if (!OBJ.equals(o1[p], o2[p])) return false; 
              }
          } 
      }
  
      // Check whether o2 has extra properties
  // TODO: improve, some properties have already been checked!
  for (p in o2) {
      if (o2.hasOwnProperty(p)) {
          if ('undefined' === typeof o1[p] && 'undefined' !== typeof o2[p]) return false;
          if (!o1[p] && o2[p]) return false; // <!-- null --> 
      }
  }

  return true;
};

/**
 * ## OBJ.isEmpty
 * 
 * Returns TRUE if an object has no own properties, 
 * FALSE otherwise
 * 
 * Does not check properties of the prototype chain.
 * 
 * @param {object} o The object to check
 * @return {boolean} TRUE, if the object has no properties
 * 
 */
OBJ.isEmpty = function (o) {
	if ('undefined' === typeof o) return true;
	
    for (var key in o) {
        if (o.hasOwnProperty(key)) {
        	return false;
        }
    }

    return true;
};


/**
 * ## OBJ.size
 * 
 * Counts the number of own properties of an object.
 * 
 * Prototype chain properties are excluded.
 * 
 * @param {object} obj The object to check
 * @return {number} The number of properties in the object
 */
OBJ.size = OBJ.getListSize = function (obj) {
	if (!obj) return 0;
	if ('number' === typeof obj) return 0;
	if ('string' === typeof obj) return 0;
	
    var n = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            n++;
        }
    }
    return n;
};

/**
 * ## OBJ._obj2Array
 * 
 * Explodes an object into an array of keys and values,
 * according to the specified parameters.

 * A fixed level of recursion can be set.
 * 
 * @api private
 * @param {object} obj The object to convert in array
 * @param {boolean} keyed TRUE, if also property names should be included. Defaults FALSE
 * @param {number} level Optional. The level of recursion. Defaults undefined
 * @return {array} The converted object
 */
OBJ._obj2Array = function(obj, keyed, level, cur_level) {
    if ('object' !== typeof obj) return [obj];
    
    if (level) {
        cur_level = ('undefined' !== typeof cur_level) ? cur_level : 1;
        if (cur_level > level) return [obj];
        cur_level = cur_level + 1;
    }
    
    var result = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if ('object' === typeof obj[key]) {
                result = result.concat(OBJ._obj2Array(obj[key], keyed, level, cur_level));
            } else {
                if (keyed) result.push(key);
                result.push(obj[key]);
            }
           
        }
    }        
    return result;
};

/**
 * ## OBJ.obj2Array
 * 
 * Converts an object into an array, keys are lost
 * 
 * Recursively put the values of the properties of an object into 
 * an array and returns it.
 * 
 * The level of recursion can be set with the parameter level. 
 * By default recursion has no limit, i.e. that the whole object 
 * gets totally unfolded into an array.
 * 
 * @param {object} obj The object to convert in array
 * @param {number} level Optional. The level of recursion. Defaults undefined
 * @return {array} The converted object
 * 
 * 	@see OBJ._obj2Array
 *	@see OBJ.obj2KeyedArray
 * 
 */
OBJ.obj2Array = function (obj, level) {
    return OBJ._obj2Array(obj, false, level);
};

/**
 * ## OBJ.obj2KeyedArray
 * 
 * Converts an object into array, keys are preserved
 * 
 * Creates an array containing all keys and values of an object and 
 * returns it.
 * 
 * @param {object} obj The object to convert in array
 * @param {number} level Optional. The level of recursion. Defaults undefined
 * @return {array} The converted object
 * 
 * @see OBJ.obj2Array 
 * 
 */
OBJ.obj2KeyedArray = OBJ.obj2KeyArray = function (obj, level) {
    return OBJ._obj2Array(obj, true, level);
};

/**
 * ## OBJ.keys
 * 
 * Scans an object an returns all the keys of the properties,
 * into an array. 
 * 
 * The second paramter controls the level of nested objects 
 * to be evaluated. Defaults 0 (nested properties are skipped).
 * 
 * @param {object} obj The object from which extract the keys
 * @param {number} level Optional. The level of recursion. Defaults 0
 * @return {array} The array containing the extracted keys
 * 
 * 	@see Object.keys
 * 
 */
OBJ.keys = OBJ.objGetAllKeys = function (obj, level, curLevel) {
    if (!obj) return [];
    level = ('number' === typeof level && level >= 0) ? level : 0; 
    curLevel = ('number' === typeof curLevel && curLevel >= 0) ? curLevel : 0;
    var result = [];
    for (var key in obj) {
       if (obj.hasOwnProperty(key)) {
           result.push(key);
           if (curLevel < level) {
               if ('object' === typeof obj[key]) {
                   result = result.concat(OBJ.objGetAllKeys(obj[key], (curLevel+1)));
               }
           }
       }
    }
    return result;
};

/**
 * ## OBJ.implode
 * 
 * Separates each property into a new objects and returns
 * them into an array
 * 
 * E.g.
 * 
 * ```javascript
 * var a = { b:2, c: {a:1}, e:5 };
 * OBJ.implode(a); // [{b:2}, {c:{a:1}}, {e:5}]
 * ```
 * 
 * @param {object} obj The object to implode
 * @return {array} result The array containig all the imploded properties
 * 
 */
OBJ.implode = OBJ.implodeObj = function (obj) {
	if (!obj) return [];
    var result = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var o = {};
            o[key] = obj[key];
            result.push(o);
        }
    }
    return result;
};
 
/**
 * ## OBJ.clone
 * 
 * Creates a perfect copy of the object passed as parameter
 * 
 * Recursively scans all the properties of the object to clone.
 * Properties of the prototype chain are copied as well.
 * 
 * Primitive types and special values are returned as they are.
 *  
 * @param {object} obj The object to clone
 * @return {object} clone The clone of the object
 */
OBJ.clone = function (obj) {
	if (!obj) return obj;
	if ('number' === typeof obj) return obj;
	if ('string' === typeof obj) return obj;
	if ('boolean' === typeof obj) return obj;
	if (obj === NaN) return obj;
	if (obj === Infinity) return obj;
	
	var clone;
	if ('function' === typeof obj) {
//		clone = obj;
		// <!-- Check when and if we need this -->
		clone = function() { return obj.apply(clone, arguments); };
	}
	else {
		clone = (Object.prototype.toString.call(obj) === '[object Array]') ? [] : {};
	}
	
	for (var i in obj) {
		var value;
		// TODO: index i is being updated, so apply is called on the 
		// last element, instead of the correct one.
//		if ('function' === typeof obj[i]) {
//			value = function() { return obj[i].apply(clone, arguments); };
//		}
		// It is not NULL and it is an object
		if (obj[i] && 'object' === typeof obj[i]) {
			// is an array
			if (Object.prototype.toString.call(obj[i]) === '[object Array]') {
				value = obj[i].slice(0);
			}
			// is an object
			else {
				value = OBJ.clone(obj[i]);
			}
		}
		else {
			value = obj[i];
		} 
	 	
	    if (obj.hasOwnProperty(i)) {
	    	clone[i] = value;
	    }
	    else {
	    	// we know if object.defineProperty is available
	    	if (compatibility && compatibility.defineProperty) {
		    	Object.defineProperty(clone, i, {
		    		value: value,
	         		writable: true,
	         		configurable: true
	         	});
	    	}
	    	else {
	    		// or we try...
	    		try {
	    			Object.defineProperty(clone, i, {
			    		value: value,
		         		writable: true,
		         		configurable: true
		         	});
	    		}
		    	catch(e) {
		    		clone[i] = value;
		    	}
	    	}
	    }
    }
    return clone;
};
    
/**
 * ## OBJ.join
 * 
 * Performs a *left* join on the keys of two objects
 * 
 * Creates a copy of obj1, and in case keys overlap 
 * between obj1 and obj2, the values from obj2 are taken. 
 * 
 * Returns a new object, the original ones are not modified.
 *  
 * E.g.
 * 
 * ```javascript
 * var a = { b:2, c:3, e:5 };
 * var b = { a:10, b:2, c:100, d:4 };
 * OBJ.join(a, b); // { b:2, c:100, e:5 }
 * ```
 *  
 * @param {object} obj1 The object where the merge will take place
 * @param {object} obj2 The merging object
 * @return {object} clone The joined object
 * 
 * 	@see OBJ.merge
 */
OBJ.join = function (obj1, obj2) {
    var clone = OBJ.clone(obj1);
    if (!obj2) return clone;
    for (var i in clone) {
        if (clone.hasOwnProperty(i)) {
            if ('undefined' !== typeof obj2[i]) {
                if ('object' === typeof obj2[i]) {
                    clone[i] = OBJ.join(clone[i], obj2[i]);
                } else {
                    clone[i] = obj2[i];
                }
            }
        }
    }
    return clone;
};

/**
 * ## OBJ.merge
 * 
 * Merges two objects in one
 * 
 * In case keys overlap the values from obj2 are taken. 
 * 
 * Only own properties are copied.
 * 
 * Returns a new object, the original ones are not modified.
 * 
 * E.g.
 * 
 * ```javascript
 * var a = { a:1, b:2, c:3 };
 * var b = { a:10, b:2, c:100, d:4 };
 * OBJ.merge(a, b); // { a: 10, b: 2, c: 100, d: 4 }
 * ```
 * 
 * @param {object} obj1 The object where the merge will take place
 * @param {object} obj2 The merging object
 * @return {object} clone The merged object
 * 
 * 	@see OBJ.join
 * 	@see OBJ.mergeOnKey
 */
OBJ.merge = function (obj1, obj2) {
	// Checking before starting the algorithm
	if (!obj1 && !obj2) return false;
	if (!obj1) return OBJ.clone(obj2);
	if (!obj2) return OBJ.clone(obj1);
	
    var clone = OBJ.clone(obj1);
    for (var i in obj2) {
    	
        if (obj2.hasOwnProperty(i)) {
        	// it is an object and it is not NULL
            if ( obj2[i] && 'object' === typeof obj2[i] ) {
            	// If we are merging an object into  
            	// a non-object, we need to cast the 
            	// type of obj1
            	if ('object' !== typeof clone[i]) {
            		if (Object.prototype.toString.call(obj2[i]) === '[object Array]') {
            			clone[i] = [];
            		}
            		else {
            			clone[i] = {};
            		}
            	}
                clone[i] = OBJ.merge(clone[i], obj2[i]);
            } else {
                clone[i] = obj2[i];
            }
        }
    }
    
    return clone;
};

/**
 * ## OBJ.mixin
 * 
 * Adds all the properties of obj2 into obj1
 * 
 * Original object is modified
 * 
 * @param {object} obj1 The object to which the new properties will be added
 * @param {object} obj2 The mixin-in object
 */
OBJ.mixin = function (obj1, obj2) {
	if (!obj1 && !obj2) return;
	if (!obj1) return obj2;
	if (!obj2) return obj1;
	
	for (var i in obj2) {
		obj1[i] = obj2[i];
	}
};

/**
 * ## OBJ.mixin
 * 
 * Copies only non-overlapping properties from obj2 to obj1
 * 
 * Original object is modified
 * 
 * @param {object} obj1 The object to which the new properties will be added
 * @param {object} obj2 The mixin-in object
 */
OBJ.mixout = function (obj1, obj2) {
	if (!obj1 && !obj2) return;
	if (!obj1) return obj2;
	if (!obj2) return obj1;
	
	for (var i in obj2) {
		if (!obj1[i]) obj1[i] = obj2[i];
	}
};

/**
 * ## OBJ.mixcommon
 * 
 * Copies only overlapping properties from obj2 to obj1
 * 
 * Original object is modified
 * 
 * @param {object} obj1 The object to which the new properties will be added
 * @param {object} obj2 The mixin-in object
 */
OBJ.mixcommon = function (obj1, obj2) {
	if (!obj1 && !obj2) return;
	if (!obj1) return obj2;
	if (!obj2) return obj1;
	
	for (var i in obj2) {
		if (obj1[i]) obj1[i] = obj2[i];
	}
};

/**
 * ## OBJ.mergeOnKey
 * 
 * Appends / merges the values of the properties of obj2 into a 
 * a new property named 'key' in obj1.
 * 
 * Returns a new object, the original ones are not modified.
 * 
 * This method is useful when we want to merge into a larger 
 * configuration (e.g. min, max, value) object another one that 
 * contains just the values for one of the properties (e.g. value). 
 * 
 * @param {object} obj1 The object where the merge will take place
 * @param {object} obj2 The merging object
 * @param {string} key The name of property under which merging the second object
 * @return {object} clone The merged object
 * 	
 * 	@see OBJ.merge
 * 
 */
OBJ.mergeOnKey = function (obj1, obj2, key) {
    var clone = OBJ.clone(obj1);
    if (!obj2 || !key) return clone;        
    for (var i in obj2) {
        if (obj2.hasOwnProperty(i)) {
            if (!clone[i] || 'object' !== typeof clone[i]) {
            	clone[i] = {};
            } 
            clone[i][key] = obj2[i];
        }
    }
    return clone;
};
    
/**
 * ## OBJ.subobj
 * 
 * Creates a copy of an object containing only the properties 
 * passed as second parameter
 * 
 * The parameter select can be an array of strings, or the name 
 * of a property. 
 * 
 * Use '.' (dot) to point to a nested property.
 * 
 * @param {object} o The object to dissect
 * @param {string|array} select The selection of properties to extract
 * @return {object} out The subobject with the properties from the parent one 
 * 
 * 	@see OBJ.getNestedValue
 */
OBJ.subobj = function (o, select) {
    if (!o) return false;
    var out = {};
    if (!select) return out;
    if (!(select instanceof Array)) select = [select];
    for (var i=0; i < select.length; i++) {
        var key = select[i];
        if (OBJ.hasOwnNestedProperty(key, o)) {
        	OBJ.setNestedValue(key, OBJ.getNestedValue(key, o), out);
        }
    }
    return out;
};
  
/**
 * ## OBJ.skim
 * 
 * Creates a copy of an object where a set of selected properties
 * have been removed
 * 
 * The parameter `remove` can be an array of strings, or the name 
 * of a property. 
 * 
 * Use '.' (dot) to point to a nested property.
 * 
 * @param {object} o The object to dissect
 * @param {string|array} remove The selection of properties to remove
 * @return {object} out The subobject with the properties from the parent one 
 * 
 * 	@see OBJ.getNestedValue
 */
OBJ.skim = function (o, remove) {
    if (!o) return false;
    var out = OBJ.clone(o);
    if (!remove) return out;
    if (!(remove instanceof Array)) remove = [remove];
    for (var i=0; i < remove.length; i++) {
    	OBJ.deleteNestedKey(remove[i], out);
    }
    return out;
};


/**
 * ## OBJ.setNestedValue
 * 
 * Sets the value of a nested property of an object,
 * and returns it.
 *
 * If the object is not passed a new one is created.
 * If the nested property is not existing, a new one is created.
 * 
 * Use '.' (dot) to point to a nested property.
 *
 * The original object is modified.
 *
 * @param {string} str The path to the value
 * @param {mixed} value The value to set
 * @return {object|boolean} obj The modified object, or FALSE if error occurred
 * 
 * @see OBJ.getNestedValue
 * @see OBJ.deleteNestedKey
 *  
 */
OBJ.setNestedValue = function (str, value, obj) {
	if (!str) {
		JSUS.log('Cannot set value of undefined property', 'ERR');
		return false;
	}
	obj = ('object' === typeof obj) ? obj : {};
    var keys = str.split('.');
    if (keys.length === 1) {
    	obj[str] = value;
        return obj;
    }
    var k = keys.shift();
    obj[k] = OBJ.setNestedValue(keys.join('.'), value, obj[k]);
    return obj;
};

/**
 * ## OBJ.getNestedValue
 * 
 * Returns the value of a property of an object, as defined
 * by a path string. 
 * 
 * Use '.' (dot) to point to a nested property.
 *  
 * Returns undefined if the nested property does not exist.
 * 
 * E.g.
 * 
 * ```javascript
 * var o = { a:1, b:{a:2} };
 * OBJ.getNestedValue('b.a', o); // 2
 * ```
 * 
 * @param {string} str The path to the value
 * @param {object} obj The object from which extract the value
 * @return {mixed} The extracted value
 * 
 * @see OBJ.setNestedValue
 * @see OBJ.deleteNestedKey
 */
OBJ.getNestedValue = function (str, obj) {
    if (!obj) return;
    var keys = str.split('.');
    if (keys.length === 1) {
        return obj[str];
    }
    var k = keys.shift();
    return OBJ.getNestedValue(keys.join('.'), obj[k]); 
};

/**
 * ## OBJ.deleteNestedKey
 * 
 * Deletes a property from an object, as defined by a path string 
 * 
 * Use '.' (dot) to point to a nested property.
 *  
 * The original object is modified.
 * 
 * E.g.
 * 
 * ```javascript
 * var o = { a:1, b:{a:2} };
 * OBJ.deleteNestedKey('b.a', o); // { a:1, b: {} }
 * ```
 * 
 * @param {string} str The path string
 * @param {object} obj The object from which deleting a property
 * @param {boolean} TRUE, if the property was existing, and then deleted
 * 
 * @see OBJ.setNestedValue
 * @see OBJ.getNestedValue
 */
OBJ.deleteNestedKey = function (str, obj) {
    if (!obj) return;
    var keys = str.split('.');
    if (keys.length === 1) {
		delete obj[str];
        return true;
    }
    var k = keys.shift();
    if ('undefined' === typeof obj[k]) {
    	return false;
    }
    return OBJ.deleteNestedKey(keys.join('.'), obj[k]); 
};

/**
 * ## OBJ.hasOwnNestedProperty
 * 
 * Returns TRUE if a (nested) property exists
 * 
 * Use '.' to specify a nested property.
 * 
 * E.g.
 * 
 * ```javascript
 * var o = { a:1, b:{a:2} };
 * OBJ.hasOwnNestedProperty('b.a', o); // TRUE
 * ```
 * 
 * @param {string} str The path of the (nested) property
 * @param {object} obj The object to test
 * @return {boolean} TRUE, if the (nested) property exists
 * 
 */
OBJ.hasOwnNestedProperty = function (str, obj) {
    if (!obj) return false;
    var keys = str.split('.');
    if (keys.length === 1) {
        return obj.hasOwnProperty(str);
    }
    var k = keys.shift();
    return OBJ.hasOwnNestedProperty(keys.join('.'), obj[k]); 
};


/**
 * ## OBJ.split
 *
 * Splits an object along a specified dimension, and returns 
 * all the copies in an array.
 *  
 * It creates as many new objects as the number of properties 
 * contained in the specified dimension. The object are identical,
 * but for the given dimension, which was split. E.g.
 * 
 * ```javascript
 *  var o = { a: 1,
 *            b: {c: 2,
 *                d: 3
 *            },
 *            e: 4
 *  };
 *  
 *  o = OBJ.split(o, 'b');
 *  
 *  // o becomes:
 *  
 *  [{ a: 1,
 *     b: {c: 2},
 *     e: 4
 *  },
 *  { a: 1,
 *    b: {d: 3},
 *    e: 4
 *  }];
 * ```
 */
OBJ.split = function (o, key) {        
    if (!o) return;
    if (!key || 'object' !== typeof o[key]) {
        return JSUS.clone(o);
    }
    
    var out = [];
    var model = JSUS.clone(o);
    model[key] = {};
    
    var splitValue = function (value) {
        for (var i in value) {
            var copy = JSUS.clone(model);
            if (value.hasOwnProperty(i)) {
                if ('object' === typeof value[i]) {
                    out = out.concat(splitValue(value[i]));
                }
                else {
                    copy[key][i] = value[i]; 
                    out.push(copy);
                }
            }
        }
        return out;
    };
    
    return splitValue(o[key]);
};

JSUS.extend(OBJ);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # RANDOM
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions related to the generation of 
 * pseudo-random numbers
 * 
 */

(function (JSUS) {
    
function RANDOM(){};

/**
 * ## RANDOM.random
 * 
 * Generates a pseudo-random floating point number between 
 * (a,b), both a and b exclusive.
 * 
 * @param {number} a The lower limit 
 * @param {number} b The upper limit
 * @return {number} A random floating point number in (a,b)
 */
RANDOM.random = function (a, b) {
	a = ('undefined' === typeof a) ? 0 : a;
	b = ('undefined' === typeof b) ? 0 : b;
	if (a === b) return a;
	
	if (b < a) {
		var c = a;
		a = b;
		b = c;
	}
	return (Math.random() * (b - a)) + a
};

/**
 * ## RANDOM.randomInt
 * 
 * Generates a pseudo-random integer between 
 * (a,b] a exclusive, b inclusive.
 * 
 * @param {number} a The lower limit 
 * @param {number} b The upper limit
 * @return {number} A random integer in (a,b]
 * 
 * @see RANDOM.random
 */
RANDOM.randomInt = function (a, b) {
	if (a === b) return a;
    return Math.floor(RANDOM.random(a, b) + 1);
};


JSUS.extend(RANDOM);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # TIME
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions related to the generation, 
 * manipulation, and formatting of time strings in javascript
 * 
 */

(function (JSUS) {
    
function TIME() {};

/**
 * ## TIME.getDate
 * 
 * Returns a string representation of the current date 
 * and time formatted as follows:
 * 
 * dd-mm-yyyy hh:mm:ss milliseconds
 * 
 * @return {string} date Formatted time string hh:mm:ss
 */
TIME.getDate = TIME.getFullDate = function() {
    var d = new Date();
    var date = d.getUTCDate() + '-' + (d.getUTCMonth()+1) + '-' + d.getUTCFullYear() + ' ' 
            + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ' ' 
            + d.getMilliseconds();
    
    return date;
};

/**
 * ## TIME.getTime
 * 
 * Returns a string representation of the current time
 * formatted as follows:
 * 
 * hh:mm:ss
 * 
 * @return {string} time Formatted time string hh:mm:ss
 */
TIME.getTime = function() {
    var d = new Date();
    var time = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
    
    return time;
};

/**
 * ## TIME.parseMilliseconds
 * 
 * Parses an integer number representing milliseconds, 
 * and returns an array of days, hours, minutes and seconds
 * 
 * @param {number} ms Integer representing milliseconds
 * @return {array} result Milleconds parsed in days, hours, minutes, and seconds
 * 
 */
TIME.parseMilliseconds = function (ms) {
	if ('number' !== typeof ms) return;
	
    var result = [];
    var x = ms / 1000;
    result[4] = x;
    var seconds = x % 60;
    result[3] = Math.floor(seconds);
    var x = x /60;
    var minutes = x % 60;
    result[2] = Math.floor(minutes);
    var x = x / 60;
    var hours = x % 24;
    result[1] = Math.floor(hours);
    var x = x / 24;
    var days = x;
    result[1] = Math.floor(days);
    
    return result;
};

JSUS.extend(TIME);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # PARSE
 *  
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Collection of static functions related to parsing strings
 * 
 */
(function (JSUS) {
    
function PARSE(){};

/**
 * ## PARSE.getQueryString
 * 
 * Parses the current querystring and returns it full or a specific variable.
 * Return false if the requested variable is not found.
 * 
 * @param {string} variable Optional. If set, returns only the value associated
 *   with this variable
 *   
 * @return {string|boolean} The querystring, or a part of it, or FALSE
 */
PARSE.getQueryString = function (variable) {
    var query = window.location.search.substring(1);
    if ('undefined' === typeof variable) return query;
    
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] === variable) {
            return unescape(pair[1]);
        }
    }
    return false;
};

/**
 * ## PARSE.tokenize
 * 
 * Splits a string in tokens that users can specified as input parameter.
 * Additional options can be specified with the modifiers parameter
 * 
 * - limit: An integer that specifies the number of splits, 
 * 		items after the split limit will not be included in the array
 * 
 * @param {string} str The string to split
 * @param {array} separators Array containing the separators words
 * @param {object} modifiers Optional. Configuration options for the tokenizing
 * 
 * @return {array} Tokens in which the string was split
 * 
 */
PARSE.tokenize = function (str, separators, modifiers) {
	if (!str) return;
	if (!separators || !separators.length) return [str];
	modifiers = modifiers || {};
	
	var pattern = '[';
	
	JSUS.each(separators, function(s) {
		if (s === ' ') s = '\\s';
		
		pattern += s;
	});
	
	pattern += ']+';
	
	var regex = new RegExp(pattern);
	return str.split(regex, modifiers.limit);
};

JSUS.extend(PARSE);
    
})('undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS);
/**
 * # NDDB: N-Dimensional Database
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * NDDB provides a simple, lightweight, NO-SQL object database 
 * for node.js and the browser. It depends on JSUS.
 * 
 * Allows to define any number of comparator and indexing functions, 
 * which are associated to any of the dimensions (i.e. properties) of 
 * the objects stored in the database. 
 * 
 * Whenever a comparison is needed, the corresponding comparator function 
 * is called, and the database is updated.
 * 
 * Whenever an object is inserted that matches one of the indexing functions
 * an hash is produced, and the element is added to one of the indexes.
 * 
 * Additional features are: methods chaining, tagging, and iteration 
 * through the entries.
 * 
 * 
 * See README.md for help.
 * 
 * ---
 * 
 */

(function (exports, JSUS, store) {
	
var nddb_operation = null;
var nddb_conditions = [];

var addCondition = function(type, condition) {
	if (!type || !condition) {
		NDDB.log('Attempt to add invalid condition', 'ERR');
		return false;
	}
	nddb_conditions.push({
		type: type,
		condition: condition
	});
	return true;
}

var addOperation = function (type, d, op, value) {
	if (!nddb_operation) {
		NDDB.log('No operation found.', 'ERR');
		return false;
	}
	
    var valid = this._analyzeQuery(d, op, value);        
    if (!valid) return false;
	
    
	return addCondition(type, valid);
}

NDDB.prototype.and = NDDB.prototype.AND = function (d, op, value) {
	return addOperation('AND', d, op, value);
};

NDDB.prototype.or = NDDB.prototype.OR = function (d, op, value) {
	return addOperation('OR', d, op, value);
};

NDDB.prototype.not = NDDB.prototype.NOT = function (d, op, value) {
	return addOperation('NOT', d, op, value);
};

NDDB.compatibility = JSUS.compatibility();
	
// Expose constructors
exports.NDDB = NDDB;

// ### NDDB.log
// Stdout redirect
NDDB.log = console.log;


NDDB.__symbols = ['>','>=','>==','<', '<=', '<==', '!=', '!==', '=', '==', '===', '><', '<>', 'in', '!in'];
NDDB.__operations = ['select', 'groupby', 'limit', 'first', 'fetch', 'last'];

/**
 * ### NDDB.retrocycle
 * 
 * Removes cyclic references from an object
 * 
 * @param {object} e The object to decycle
 * @return {object} e The decycled object
 * 
 * 	@see https://github.com/douglascrockford/JSON-js/
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
 * 	@see https://github.com/douglascrockford/JSON-js/
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
 * @param {NDDB} parent Optional. A parent database to keep sync
 * 
 */
function NDDB (options, db, parent) {                
    options = options || {};
    
    if (!JSUS) throw new Error('JSUS not found.');
    
    // ## Public properties
    
    // ### db
    // The default database
    this.db = [];
    
    // ###tags
    // The tags list
    this.tags = {};
    
    // ### hooks
    // The list of hooks and associated callbacks
    this.hooks = {};
    
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
   
    
    // ### __C
    // List of comparator functions
    this.__C = {};
    
    // ### __H
    // List of hashing functions
    this.__H = {};
    
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
        
    // ### __parent
    // Reference to a parent NNDB database (if chaining)
    this.__parent = parent || undefined;

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
	
	if (options.tags) {
		this.tags = options.tags;
	}
    
    if (options.nddb_pointer > 0) {
    	this.nddb_pointer = options.nddb_pointer;
	}
    
    if (options.hooks) {
    	this.hooks = options.hook;
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
    
};

// ## CORE

/**
 * ### NDDB.globalCompare
 * 
 * Function used for comparing two items in the database
 * 
 * By default, elements are sorted according to their 
 * internal id (FIFO). Override to change.
 * 
 * Returns
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
    
    if (o1.nddbid < o2.nddbid) return -1;
    if (o1.nddbid > o2.nddbid) return 1;
    return 0;
};

/**
 * ### NDDB._masquerade
 * 
 * Injects a hidden counter property into the prototype 
 * 
 * The object contains the index of the containing array.
 * 
 * @param {object} o The object to masquerade
 * @param {array} db Optional. The array
 * 
 * @api private
 */
NDDB.prototype._masquerade = function (o, db) {
    if ('undefined' === typeof o) return false;
    
    // TODO: check this
    if ('undefined' !== typeof o.nddbid) return o;
    db = db || this.db;
    
    if (NDDB.compatibility.defineProperty) {
	    Object.defineProperty(o, 'nddbid', {
	    	value: db.length,
	    	configurable: true,
	    	writable: true
		});
    }
    else {
    	o.nddbid = db.length;
    }
    
    return o;
};

/**
 * ### NDDB._masqueradeDB
 *
 * Masquerades a whole array and returns it
 * 
 * @see NDDB._masquerade
 * @api private
 * @param {array} db Array of items to masquerade
 * 
 */
NDDB.prototype._masqueradeDB = function (db) {
    if (!db) return [];
    var out = [];
    for (var i = 0; i < db.length; i++) {
        out[i] = this._masquerade(db[i], out);
    }
    return out;
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
	var update = (options) ? JSUS.merge(options, this.__update)
						   : this.__update;
	
    if (update.pointer) {
        this.nddb_pointer = this.db.length-1;
    }
    if (update.sort) {
        this.sort();
    }
    
    if (update.indexes) {
        this.rebuildIndexes();
    }
    
    // Update also parent element
    if (this.__parent) {
    	this.__parent._autoUpdate(update);
    }
}

/**
 * ### NDDB.importDB
 * 
 * Imports a whole array into the current database
 * 
 * @param {array} db Array of items to import
 */
NDDB.prototype.importDB = function (db) {
    if (!db) return;
    if (!this.db) this.db = [];
    for (var i = 0; i < db.length; i++) {
        this.insert(db[i]);
    }
    // <!-- Check this
    //this.db = this.db.concat(this._masqueradeDB(db));
    //this._autoUpdate();
    // -->
};
    
/**
 * ### NDDB.insert
 * 
 * Insert an item into the database
 * 
 * @param {object} o The item or array of items to insert
 * @see NDDB._insert
 */
NDDB.prototype.insert = function (o) {
	if ('undefined' === typeof o || o === null) return;
    if (!this.db) this.db = [];
 
    this._insert(o);
};

/**
 * ### NDDB._insert
 *
 * Inserts an object into the current database
 * 
 * @param {object} o The item or array of items to insert
 */
NDDB.prototype._insert = function (o) {
    if ('undefined' === typeof o || o === null) return;
    o = this._masquerade(o);
    
    this.db.push(o);
    
    // We save time calling _hashIt only
    // on the latest inserted element
    if (this.__update.indexes) {
    	this._hashIt(o);
    }
	// See above
    this._autoUpdate({indexes: false});
};

/**
 * ### NDDB.breed
 *
 * Creates a clone of the current NDDB object
 * with a reference to the parent database
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
    var options = this.cloneSettings();
    var parent = this.__parent || this;							
    
    //In case the class was inherited
    return new this.constructor(options, db, parent);
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
    options.C = 		this.__C;
    options.tags = 		this.tags;
    options.update = 	this.__update;
    
    return JSUS.clone(options);
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
 */
NDDB.prototype.stringify = function (compressed) {
	if (!this.length) return '[]';
	compressed = ('undefined' === typeof compressed) ? true : compressed;
	
	var objToStr;
	
	if (compressed) {
		objToStr = function(o) {
			// Skip empty objects
			if (JSUS.isEmpty(o)) return '{}';
			return JSON.stringify(o);
		}	
	}
	else {
		objToStr = function(o) {
			// Skip empty objects
			if (JSUS.isEmpty(o)) return '{}';
			return JSON.stringify(o, null, 4);
		}
	}
	
    var out = '[';
    this.each(function(e) {
    	// decycle, if possible
    	e = NDDB.decycle(e);
    	out += objToStr(e) + ', ';
    });
    out = out.replace(/, $/,']');
    
    return out;
};    


/**
 * ### NDDB.compare | NDDB.c 
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
NDDB.prototype.compare = NDDB.prototype.c = function (d, comparator) {
    if (!d || !comparator) {
        NDDB.log('Cannot set empty property or empty comparator', 'ERR');
        return false;
    }
    this.__C[d] = comparator;
    return true;
};

/**
 * ### NDDB.comparator
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
NDDB.prototype.comparator = function (d) {
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
        var v1 = JSUS.getNestedValue(d,o1);
        var v2 = JSUS.getNestedValue(d,o2);
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
 * ### NDDB.hash | NDDB.h
 *
 * Registers a new hashing function for index d
 * 
 * Hashing functions automatically creates indexes 
 * to retrieve objects faster
 * 
 * If no function is specified Object.toString is used.
 * 
 * @param {string} idx The name of index
 * @param {function} func The hashing function
 * @return {boolean} TRUE, if registration was successful
 * 
 * @see NDDB.isReservedWord
 * @see NDDB.rebuildIndexes
 * 
 */
NDDB.prototype.hash = NDDB.prototype.h = function (idx, func) {
	if ('undefined' === typeof idx) {
		NDDB.log('A valid index name must be provided', 'ERR');
		return false;
	}
	
	func = func || Object.toString;
	
	if (this.isReservedWord(idx)) {
		var str = 'A reserved word have been selected as an index. ';
		str += 'Please select another one: ' + idx;
		NDDB.log(str, 'ERR');
		return false;
	}
	
	this.__H[idx] = func;
	
	this[idx] = {};
	
	return true;
};

/**
 * ### NDDB.rebuildIndexes
 *
 * Resets and rebuilds all the database indexes 
 * 
 * Indexes are defined by the hashing functions
 * 
 * @see NDDB.hash
 */
NDDB.prototype.rebuildIndexes = function() {
	if (JSUS.isEmpty(this.__H)) {
		return;
	} 	
	// Reset current indexes
	for (var key in this.__H) {
		if (this.__H.hasOwnProperty(key)) {
			this[key] = {};
		}
	}
	
	this.each(this._hashIt)
};

/**
 * ### NDDB._hashIt
 *
 * Hashes an element and adds it to one of the indexes
 * 
 * @param {object} o The element to hash
 * @return {boolean} TRUE, if insertion to an index was successful
 * 
 */
NDDB.prototype._hashIt = function(o) {
  	if (!o) return false;
	if (JSUS.isEmpty(this.__H)) {
		return false;
	}

	var h = null,
		id = null,
		hash = null;
	
	for (var key in this.__H) {
		if (this.__H.hasOwnProperty(key)) {
			h = this.__H[key];	    			
			hash = h(o);

			if ('undefined' === typeof hash) {
				continue;
			}

			if (!this[key]) {
				this[key] = {};
			}
			
			if (!this[key][hash]) {
				this[key][hash] = new NDDB();
			}
			this[key][hash].insert(o);		
		}
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
        if ('undefined' === typeof value) {
            raiseError(d,op,value);
        }
        
        if (!JSUS.in_array(op, ['>','>=','>==','<', '<=', '<==', '!=', '!==', '=', '==', '===', '><', '<>', 'in', '!in'])) {
            NDDB.log('Query error. Invalid operator detected: ' + op, 'WARN');
            return false;
        }
        
        if (op === '=') {
            op = '==';
        }
        
        // Range-queries need an array as third parameter
        if (JSUS.in_array(op,['><', '<>', 'in', '!in'])) {
            if (!(value instanceof Array)) {
                NDDB.log('Range-queries need an array as third parameter', 'WARN');
                raiseError(d,op,value);
            }
            if (op === '<>' || op === '><') {
                
                value[0] = JSUS.setNestedValue(d, value[0]);
                value[1] = JSUS.setNestedValue(d, value[1]);
            }
        }
        else {
            // Encapsulating the value;
            value = JSUS.setNestedValue(d,value);
        }
    }
    else if ('undefined' !== typeof value) {
        raiseError(d,op,value);
    }
    else {
        op = '';
        value = '';
    }
    
    return {d:d,op:op,value:value};
};

/**
 * ## NDDB.distinct
 * 
 * Eliminates duplicated entries
 *  
 * A new database is returned and the original stays unchanged
 * 
 * @return {NDDB} A copy of the current selection without duplicated entries
 * 
 * 	@see NDDB.select() 
 *  @see NDDB.fetch()
 *  @see NDDB.fetchValues()
 */
NDDB.prototype.distinct = function () {
	return this.breed(JSUS.distinct(this.db));
};

/**
 * ## NDDB.select
 * 
 * Select entries a subset of entries in the database 
 * 
 * Input parameters:
 * 
 * - d: the string representation of the dimension used to filter. Mandatory.
 * - op: operator for selection. Allowed: >, <, >=, <=, = (same as ==), ==, ===, 
 * 		!=, !==, in (in array), !in, >< (not in interval), <> (in interval)
 *  - value: values of comparison. Operators: in, !in, ><, <> require an array.
 *  
 *  The selection is returned as a new NDDB object, on which further operations 
 *  can be chained. In order to get the actual entries returned, it is necessary
 *  to call one of the fetching methods.
 *  
 * @param {string} d The dimension of comparison
 * @param {string} op The operation to perform
 * @param {string} value The right-hand element of comparison
 * @return {NDDB} A new NDDB instance containing the selected items
 * 
 *  @see NDDB.fetch()
 *  @see NDDB.fetchValues()
 */
NDDB.prototype.select = function (d, op, value) {

    var valid = this._analyzeQuery(d, op, value);        
    if (!valid) return false;
    
    var d = valid.d;
    var op = valid.op;
    var value = valid.value;

    var comparator = this.comparator(d);
    
    var exist = function (elem) {
        if ('undefined' !== typeof JSUS.getNestedValue(d,elem)) return elem;
    };
    
    var compare = function (elem) {
        try {    
            if (JSUS.eval(comparator(elem, value) + op + 0, elem)) {
                return elem;
            }
        }
        catch(e) {
            NDDB.log('Malformed select query: ' + d + op + value);
            return false;
        };
    };
    
    var between = function (elem) {
        if (comparator(elem, value[0]) > 0 && comparator(elem, value[1]) < 0) {
            return elem;
        }
    };
    
    var notbetween = function (elem) {
        if (comparator(elem, value[0]) < 0 && comparator(elem, value[1] > 0)) {
            return elem;
        }
    };
    
    var inarray = function (elem) {
        if (JSUS.in_array(JSUS.getNestedValue(d,elem), value)) {
            return elem;
        }
    };
    
    var notinarray = function (elem) {
        if (!JSUS.in_array(JSUS.getNestedValue(d,elem), value)) {
            return elem;
        }
    };
    
    switch (op) {
        case (''): var func = exist; break;
        case ('<>'): var func = notbetween; break;
        case ('><'): var func = between; break;
        case ('in'): var func = inarray; break;
        case ('!in'): var func = notinarray; break;
        default: var func = compare;
    }
    
    return this.filter(func);
};


//function queryBuilder(o) {
//	for (var d in o) {
//		if (o.hasOwnProperty(d)) {
//			
//		}
//	}
//}


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
 *	@see NDDB.first
 * 	@see NDDB.last
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
 * 	@see NDDB.sort
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
 * further operations can be chained. 
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
          var result = that.comparator(d[i]).call(that,a,b);
          if (result !== 0) return result;
        }
        return result;
      }
    }
    
    // SINGLE dimension
    else {
      var func = this.comparator(d);
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
 */
NDDB.prototype.shuffle = function () {
    // TODO: check do we need to reassign __nddbid__ ?
    this.db = JSUS.shuffle(this.db);
    return true;
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
    var func = arguments[0];    
    for (var i=0; i < this.db.length; i++) {
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
    var func = arguments[0];
    var out = [];
    var o = undefined;
    for (var i=0; i < this.db.length; i++) {
        arguments[0] = this.db[i];
        o = func.apply(this, arguments);
        if ('undefined' !== typeof o) out.push(o);
    }
    return out;
};

// # Update

///**
// * ### NDDB.remove
// *
// * Removes all entries from the database
// * 
// * Elements in the parent database will be removed too.
// * 
// * @return {NDDB} A new instance of NDDB with no entries 
// */
//
//NDDB.prototype.update = function (update) {
//	if (!this.length) {
//		NDDB.log('Cannot update empty database', 'WARN');
//		return this;
//	}
//  
//	if (!JSUS.isArray(update)) update = [update];
//	
//	    	  
//	for (var i=0; i < this.db.length; i++) {
//		this.db[i] = update[i % update.length];
//		
//		var idx = this.db[i].nddbid - i;
//		if (this.__parent) {
//		this.__parent.db.splice(idx,1);
//    }
//    // TODO: we could make it with only one for loop
//    // we loop on parent db and check whether the id is in the array
//    // at the same time we decrement the nddbid depending on i
//    for (var i=0; i < this.__parent.length; i++) {
//    	this.__parent.db[i].nddbid = i;
//    }
//	
// 
//	this.db = [];
//	this._autoUpdate();
//	return this;
//};  

//## Deletion


/**
 * ### NDDB.remove
 *
 * Removes all entries from the database
 * 
 * Elements in the parent database will be removed too.
 * 
 * @return {NDDB} A new instance of NDDB with no entries 
 */
NDDB.prototype.remove = function () {
	if (!this.length) return this;
  
	if (this.__parent) {    	  
		for (var i=0; i < this.db.length; i++) {
			// Important: index changes as we removes elements
			var idx = this.db[i].nddbid - i;
			this.__parent.db.splice(idx,1);
        }
        // TODO: we could make it with only one for loop
        // we loop on parent db and check whether the id is in the array
        // at the same time we decrement the nddbid depending on i
        for (var i=0; i < this.__parent.length; i++) {
        	this.__parent.db[i].nddbid = i;
        }
	}
 
	this.db = [];
	this._autoUpdate();
	return this;
};    

/**
 * ### NDDB.clear
 *
 * Removes all entries from the database. 
 * 
 * Requires an additional parameter to confirm the deletion.
 * 
 * Elements in parent database will not be removed
 * 
 * @return {boolean} TRUE, if the database was cleared
 */
NDDB.prototype.clear = function (confirm) {
    if (confirm) {
        this.db = [];
        this._autoUpdate();
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
 * 	@see NDDB._join
 * 	@see NDDB.breed
 * 
 * 
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
    return this._join(key1, key2, JSUS.equals, pos, select);
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
 * according to the specified comparator callback, or using JSUS.equals.
 * 
 * If the comparator function returns TRUE, matched entries are appended 
 * as a new property of the matching one. 
 * 
 * By default, the full object is copied in the join, but it is possible to 
 * specify the name of the properties to copy as an input parameter.
 * 
 * A new NDDB object breeded, so that further operations can be chained.
 * 
 * @api private
 * @param {string} key1 First property to compare  
 * @param {string} key2 Second property to compare
 * @param {function} comparator Optional. A comparator function. Defaults JSUS.equals
 * @param {string} pos Optional. The property under which the join is performed. Defaults 'joined'
 * @param {string|array} select Optional. The properties to copy in the join. Defaults undefined 
 * @return {NDDB} A new database containing the joined entries
 * 	@see NDDB.breed
 * 
 *  * TODO: check do we need to reassign __nddbid__ ?
 */
NDDB.prototype._join = function (key1, key2, comparator, pos, select) {
    comparator = comparator || JSUS.equals;
    pos = ('undefined' !== typeof pos) ? pos : 'joined';
    if (select) {
        var select = (select instanceof Array) ? select : [select];
    }
    var out = [];
    var idxs = [];
    for (var i=0; i < this.db.length; i++) {
        try {
            var foreign_key = JSUS.eval('this.'+key1, this.db[i]);
            if ('undefined' !== typeof foreign_key) { 
                for (var j=i+1; j < this.db.length; j++) {
                    try {
                        var key = JSUS.eval('this.'+key2, this.db[j]);
                        if ('undefined' !== typeof key) { 
                            if (comparator(foreign_key, key)) {
                                // Inject the matched obj into the
                                // reference one
                                var o = JSUS.clone(this.db[i]);
                                var o2 = (select) ? JSUS.subobj(this.db[j], select) : this.db[j];
                                o[pos] = o2;
                                out.push(o);
                            }
                        }
                    }
                    catch(e) {
                        NDDB.log('Key not found in entry: ' + key2, 'WARN');
                        //return false;
                    }
                }
            }
        }
        catch(e) {
            NDDB.log('Key not found in entry: ' + key1, 'WARN');
            //return false;
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
 * @param {string} key The dimension along which splitting the entries
 * @return {NDDB} A new database containing the split entries
 * 
 * 	@see NDDB._split
 * 
 */
NDDB.prototype.split = function (key) {    
    var out = [];
    for (var i=0; i < this.db.length;i++) {
        out = out.concat(JSUS.split(this.db[i], key));
    }
    return this.breed(out);
};

// ## Fetching


/**
 * ### NDDB._fetch
 *
 * Performs the fetching of the entries according to the
 * specified parameters 
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * var items = [{a:1, b:2}, {a:3, b:4}, {a:5}];
 * db.importDB(items);
 * 
 * db._fetch(); 
 * // [ {a:1, b:2}, {a:3, b:4}, {a:5} ]
 * 
 * db._fetch('a'); 
 * // [1, 3, 5];
 * 
 * db._fetch('a', 'VALUES'); 
 * //  [ [ 1 ], [ 3 ], [ 5 ] ]
 * 
 * db._fetch('a', 'KEY_VALUES'); 
 * // [ [ 'a', 1 ], [ 'a', 3 ], [ 'a', 5 ] ]
 * 
 * db._fetch(null, 'VALUES'); 
 * // [ [ 1, 2 ], [ 3, 4 ], [ 5] ]
 * 
 * db._fetch(null, 'KEY_VALUES'); 
 * // [ [ 'a', 1, 'b', 2 ], [ 'a', 3, 'b', 4 ], [ 'a', 5 ] ]
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @api private
 * @param {string} key Optional. If set, returns only the value from the specified property 
 * @param {string} array. Optional If set, objects are transformed in arrays and returned
 * @return {array} out The fetched values 
 * 
 * 	@see NDDB.fetch
 * 	@see NDDB.fetchArray
 * 	@see NDDB.fetchKeyArray
 * 
 */
NDDB.prototype._fetch = function (key, array) {
    
    function getValues (o, key) {        
        return JSUS.getNestedValue(key, o);
    };
    
    function getValuesArray (o, key) {
        var el = JSUS.getNestedValue(key, o);
        if ('undefined' !== typeof el) {
            return JSUS.obj2KeyedArray(el);
        }
    };
    
    function getKeyValuesArray (o, key) {
        var el = JSUS.getNestedValue(key, o);
        if ('undefined' !== typeof el) {
            return key.split('.').concat(JSUS.obj2KeyedArray(el));
        }
    };
            
    switch (array) {
        case 'VALUES':
            var func = (key) ? getValuesArray : 
                               JSUS.obj2Array;
            
            break;
        case 'KEY_VALUES':
            var func = (key) ? getKeyValuesArray :
                               JSUS.obj2KeyedArray;
            break;
            
        default: // results are not 
            if (!key) return this.db;
            var func = getValues;        
    }
    
    var out = [];    
    for (var i=0; i < this.db.length; i++) {
        var el = func.call(this.db[i], this.db[i], key);
        if ('undefined' !== typeof el) out.push(el);
    }    
    
    return out;
}

/**
 * ### NDDB.fetch
 *
 * Fetches all the entries in the database and returns 
 * them in a array. 
 * 
 * If a second key parameter is passed, only the value of 
 * the property named after the key are returned, otherwise  
 * the whole entry is returned as it is.
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * 
 * db.fetch();    // [ {a: 1, b: {c: 2}, d: 3} ] 
 * db.fetch('b'); // [ {c: 2} ];
 * db.fetch('d'); // [ 3 ];
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @param {string} key Optional. If set, returns only the value from the specified property 
 * @return {array} out The fetched values 
 * 
 * 	@see NDDB._fetch
 * 	@see NDDB.fetchArray
 * 	@see NDDB.fetchKeyArray
 * 
 */
NDDB.prototype.fetch = function (key) {
    return this._fetch(key, true);
};

/**
 * ### NDDB.fetchArray
 *
 * Fetches all the entries in the database, transforms them into 
 * one-dimensional array by exploding all nested values, and returns
 * them into an array.
 * 
 * If a parameter is passed, only the value of the property
 * named after the key is returned, otherwise the whole entry 
 * is exploded, and its values returned in a array. 
 * 
 * Examples
 * 
 * ```javascript
 * var db = new NDDB();
 * db.insert([ { a:1, b:{c:2}, d:3 } ]);
 * 
 * db.fetchArray();    // [ [ 1, 2, 3 ] ]
 * db.fetchArray('b'); // [ ['c', 2 ] ]
 * db.fetchArray('d'); // [ [ 3 ] ];
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @param {string} key Optional. If set, returns only the value from the specified property 
 * @return {array} out The fetched values 
 * 
 * 	@see NDDB._fetch
 * 	@see NDDB.fetch
 * 	@see NDDB.fetchKeyArray
 * 
 */
NDDB.prototype.fetchArray = function (key) {
    return this._fetch(key, 'VALUES');
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
 * db.fetchArray();       // [ [ 'a', 1, 'c', 2, 'd', 3 ] ]
 * db.fetchKeyArray('b'); // [ [ 'b', 'c', 2 ] ] 
 * db.fetchArray('d');    // [ [ 'd', 3 ] ]
 * ```
 * 
 * No further chaining is permitted after fetching.
 * 
 * @param {string} key Optional. If set, returns only the value from the specified property 
 * @return {array} out The fetched values 
 * 
 * 	@see NDDB._fetch
 * 	@see NDDB.fetch
 * 	@see NDDB.fetchArray
 */
NDDB.prototype.fetchKeyArray = function (key) {
    return this._fetch(key, 'KEY_VALUES');
};

/**
 * ### NDDB.fetchValues
 *
 * @deprecated
 * @see NDDB.fetchArray
 * 
 */
NDDB.prototype.fetchValues = function (key) {
    return this._fetch(key, 'VALUES');
};

/**
 * ### NDDB.fetchKeyValues
 *
 * @deprecated
 * @see NDDB.fetchKeyArray
 */
NDDB.prototype.fetchKeyValues = function (key) {
    return this._fetch(key, 'KEY_VALUES');
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
        var el = JSUS.getNestedValue(key, this.db[i]);
        if ('undefined' === typeof el) continue;
        // Creates a new group and add entries to it
        if (!JSUS.in_array(el, groups)) {
            groups.push(el);
            var out = this.filter(function (elem) {
                if (JSUS.equals(JSUS.getNestedValue(key, elem), el)) {
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
 * 	@see NDDB.length
 */
NDDB.prototype.count = function (key) {
    if ('undefined' === typeof key) return this.db.length;
    var count = 0;
    for (var i = 0; i < this.db.length; i++) {
        if (JSUS.hasOwnNestedProperty(key, this.db[i])){
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
        var tmp = JSUS.getNestedValue(key, this.db[i]);
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
        var tmp = JSUS.getNestedValue(key, this.db[i]);
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
 * 	@see NDDB.mean
 */
NDDB.prototype.stddev = function (key) {
	if ('undefined' === typeof key) return false;
    var mean = this.mean(key);
    if (isNaN(mean)) return false;
    
    var V = 0;
    this.each(function(e){
        var tmp = JSUS.getNestedValue(key, e);
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
 * 	@see NDDB.max
 */
NDDB.prototype.min = function (key) {
	if ('undefined' === typeof key) return false;
    var min = false;
    for (var i=0; i < this.db.length; i++) {
        var tmp = JSUS.getNestedValue(key, this.db[i]);
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
 * 	@see NDDB.min
 */
NDDB.prototype.max = function (key) {
	if ('undefined' === typeof key) return false;
    var max = false;
    for (var i=0; i < this.db.length; i++) {
        var tmp = JSUS.getNestedValue(key, this.db[i]);
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
    	var skimmed = JSUS.skim(e, skim); 
    	if (!JSUS.isEmpty(skimmed)) {
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
    	var subobj = JSUS.subobj(e, keep);
    	if (!JSUS.isEmpty(subobj)) {
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
    return this.breed(JSUS.arrayDiff(this.db, nddb));
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
    return this.breed(JSUS.arrayIntersect(this.db, nddb));
};

// ## Iterator


/**
 * ### NDDB.get
 *
 * Returns the entry in the database, at which 
 * the iterator is currently pointing 
 * 
 * If a parameter is passed, then returns the entry
 * with the same internal id. The pointer is *not*
 * automatically updated. 
 * 
 * Returns false, if the pointer is at an invalid position.
 * 
 * @return {object|boolean} The current entry, or FALSE if none is found
 */
NDDB.prototype.get = function (pos) {
    var pos = pos || this.nddb_pointer;
    if (pos < 0 || pos > (this.db.length-1)) {
    	return false;
    }
    return this.db[pos];
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
    var el = NDDB.prototype.get.call(this, ++this.nddb_pointer);
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
    var el = NDDB.prototype.get.call(this, --this.nddb_pointer);
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
 * 	@see NDDB.last
 */
NDDB.prototype.first = function (key) {
    var db = this.fetch(key);
    if (db.length) {
        this.nddb_pointer = db[0].nddbid;
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
 * 	@see NDDB.first
 */
NDDB.prototype.last = function (key) {
    var db = this.fetch(key);
    if (db.length) {
        this.nddb_pointer = db[db.length-1].nddbid;
        return db[db.length-1];
    }
    return undefined;
};

// ## Tagging


/**
 * ### NDDB.tag
 *
 * Registers a tag associated to an internal id.
 * 
 * @TODO: tag should be updated with shuffling and sorting
 * operations.
 * 
 * @status: experimental
 * 
 * @param {string} tag An alphanumeric id
 * @param {string} idx Optional. The index in the database. Defaults nddb_pointer
 * @return {boolean} TRUE, if registration is successful
 * 
 * 	@see NDDB.resolveTag
 */
NDDB.prototype.tag = function (tag, idx) {
    if ('undefined' === typeof tag) {
        NDDB.log('Cannot register empty tag.', 'ERR');
        return false;
    }
    idx = idx || this.nddb_pointer;
    if (idx > this.length || idx < 0) {
        NDDB.log('Invalid index provided for tag registration', 'ERR');
        return false;
    }
    this.tags[tag] = this.db[idx];
    return true;
};

/**
 * ### NDDB.resolveTag
 *
 * Returns the element associated with the given tag.
 * 
 * @param {string} tag An alphanumeric id
 * @return {object} The object associated with the tag
 * 
 * 	@see NDDB.tag
 * @status: experimental
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

// if node
if (JSUS.isNodeJS()) {   
	require('./external/cycle.js');		
	var fs = require('fs');
};

//end node  

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
 * 
 * @see NDDB.load
 * @see NDDB.stringify
 * @see https://github.com/douglascrockford/JSON-js/blob/master/cycle.js
 * @return {boolean} TRUE, if operation is successful
 * 
 */
NDDB.prototype.save = function (file, callback, compress) {
	if (!file) {
		NDDB.log('You must specify a valid file / id.', 'ERR');
		return false;
	}
	
	compress = compress || false;
	
	// Try to save in the browser, e.g. with Shelf.js
	if (!JSUS.isNodeJS()){
		if (!storageAvailable()) {
			NDDB.log('No support for persistent storage found.', 'ERR');
			return false;
		}
		
		store(file, this.stringify(compress));
		if (callback) callback();
		return true;
	}
	
	// Save in Node.js
	fs.writeFile(file, this.stringify(compress), 'utf-8', function(e) {
		if (e) throw e
		if (callback) callback();
		return true;
	});
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
 * @param {function} callback Optional. A callback to execute after the database was saved
 * 
 * @see NDDB.save
 * @see NDDB.stringify
 * @see https://github.com/douglascrockford/JSON-js/blob/master/cycle.js
 * @return {boolean} TRUE, if operation is successful
 * 
 */
NDDB.prototype.load = function (file, callback) {
	if (!file) {
		NDDB.log('You must specify a valid file / id.', 'ERR');
		return false;
	}
	
	// Try to save in the browser, e.g. with Shelf.js
	if (!JSUS.isNodeJS()){
		if (!storageAvailable()) {
			NDDB.log('No support for persistent storage found.', 'ERR');
			return false;
		}
		
		var items = store(file);
		this.importDB(items);
		if (callback) callback();
		return true;
	}
	
	var loadString = function(s) {
		var items = JSON.parse(s.toString());
		//console.log(s);
		var i;
		for (i=0; i< items.length; i++) {
			// retrocycle if possible
			items[i] = NDDB.retrocycle(items[i]);
		}
//					console.log(Object.prototype.toString.apply(items[0].aa))
		
		this.importDB(items);
//				this.each(function(e) {
//					e = NDDB.retrocycle(e);
//				});
	}
	
	if (!callback) { 
		var s = fs.readFileSync(file, 'utf-8');
		loadString.call(this, s);
	}
	else {
		fs.readFile(file, 'utf-8', function(e, s) {
			if (e) throw e
			loadString.call(this, s);
			callback();
		});
	}
};
	


// ## Closure    
})(
    'undefined' !== typeof module && 'undefined' !== typeof module.exports ? module.exports: window
  , 'undefined' !== typeof JSUS ? JSUS : module.parent.exports.JSUS || require('JSUS').JSUS
  , ('object' === typeof module && 'function' === typeof require) ? module.parent.exports.store || require('shelf.js/build/shelf-fs.js').store : this.store
);
/**
 * # nodeGame
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * ### nodeGame: Web Experiments in the Browser
 * 
 * nodeGame is a free, open source, event-driven javascript framework for on line, 
 * multiplayer games in the browser.
 * 
 * 
 */

(function (node) {

node.version = '0.7.5';

/**
 *  ## node.verbosity
 *  
 *  The minimum level for a log entry to be displayed as output.
 *   
 *  Defaults, only errors are displayed.
 *  
 */
node.verbosity = 0;
node.verbosity_levels = {
		// <!-- It is not really always... -->
		ALWAYS: -(Number.MIN_VALUE+1), 
		ERR: -1,
		WARN: 0,
		INFO: 1,
		DEBUG: 100
};


node.warn = function (txt, prefix) {
	node.log(txt, node.verbosity_levels.WARN, prefix);
}

node.err = function (txt, prefix) {
	node.log(txt, node.verbosity_levels.ERR, prefix);
}

node.info = function (txt, prefix) {
	node.log(txt, node.verbosity_levels.INFO, prefix);
}


/**
 *  ## node.support
 *  
 *  A collection of features that are supported by the current browser
 *  
 */
node.support = {};

(function(){
	
	try {
		Object.defineProperty({}, "a", {enumerable: false, value: 1})
		node.support.defineProperty = true;
	}
	catch(e) {
		node.support.defineProperty = false;	
	}
	
	try {
		eval('({ get x(){ return 1 } }).x === 1')
		node.support.setter = true;
	}
	catch(err) {
		node.support.setter = false;
	}
	  
	try {
		var value;
		eval('({ set x(v){ value = v; } }).x = 1');
		node.support.getter = true;
	}
	catch(err) {
		node.support.getter = false;
	}	  
})();

/**
 * ## node.log
 * 
 * Default nodeGame standard out, override to redirect
 * 
 * Default behavior is to output a text in the form: `nodeGame: some text`.
 * 
 * Logs entries are displayed only if their verbosity level is 
 * greater than `node.verbosity`
 * 
 * @param {string} txt The text to output
 * @param {string|number} level Optional. The verbosity level of this log. Defaults, level = 0
 * @param {string} prefix Optional. A text to display at the beginning of the log entry. Defaults prefix = 'nodeGame: ' 
 * 
 */
node.log = function (txt, level, prefix) {
	if ('undefined' === typeof txt) return false;
	
	level 	= level || 0;
	prefix 	= ('undefined' === typeof prefix) 	? 'nodeGame: '
												: prefix;
	if ('string' === typeof level) {
		level = node.verbosity_levels[level];
	}
	if (node.verbosity > level) {
		console.log(prefix + txt);
	}
};

// <!-- It will be overwritten later -->
node.game 		= {};
node.socket 	= {};
node.session 	= {};
node.player 	= {};
node.memory 	= {};

// <!-- Load the auxiliary library if available in the browser -->
if ('undefined' !== typeof JSUS) node.JSUS = JSUS;
if ('undefined' !== typeof NDDB) node.NDDB = NDDB;
if ('undefined' !== typeof store) node.store = store;

// <!-- if node
if ('object' === typeof module && 'function' === typeof require) {
    require('./init.node.js');
    require('./nodeGame.js');

    // ### Loading Event listeners
    require('./listeners/incoming.js');
    require('./listeners/internal.js');
    require('./listeners/outgoing.js');
}
// end node -->
	
})('object' === typeof module ? module.exports : (window.node = {}));	
/**
 * # EventEmitter
 * 
 * Event emitter engine for `nodeGame`
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Keeps a register of events and function listeners.
 * 
 * ---
 *  
 */
(function (exports, node) {
	
// ## Global scope	
	
var NDDB = node.NDDB;

exports.EventEmitter = EventEmitter;

/**
 * ## EventEmitter constructor
 * 
 * Creates a new instance of EventEmitter
 */
function EventEmitter() {

// ## Public properties	
	
/**
 * ### EventEmitter.global
 * 
 * 
 * Global listeners always active during the game
 * 
 */	
    this.global = this._listeners = {};
    
 /**
  * ### EventEmitter.local
  * 
  * Local listeners erased after every state update
  * 
  */   
    this.local = this._localListeners = {};

/**
 * ### EventEmitter.history
 * 
 * Database of emitted events
 * 
 * 	@see NDDB
 * 	@see EventEmitter.store
 * 
 */      
    this.history = new NDDB({
    	update: {
    		indexes: true
    }});
    
    this.history.h('state', function(e) {
    	if (!e) return;
    	var state = ('object' === typeof e.state) ? e.state
    											  : node.game.state;
    	return node.GameState.toHash(state, 'S.s.r');
    });
}

// ## EventEmitter methods

EventEmitter.prototype = {

    constructor: EventEmitter,
	
/**
 * ### EventEmitter.add
 * 
 * Registers a global listener for an event
 * 
 * Listeners registered with this method are valid for the
 * whole length of the game
 * 
 * @param {string} type The event name
 * @param {function} listener The function to fire
 * 
 * @see EventEmitter.addLocal
 */
    add: function (type, listener) {
    	if (!type || !listener) return;
    	if ('undefined' === typeof this.global[type]){
    		this.global[type] = [];
    	}
        node.log('Added Listener: ' + type + ' ' + listener, 'DEBUG');
        this.global[type].push(listener);
    },
    
/**
 * ### EventEmitter.addLocal
 * 
 * Registers a local listener for an event
 * 
 * Listeners registered with this method are valid *only* 
 * for the same game state (step) in which they have been
 * registered 
 * 
 * @param {string} type The event name
 * @param {function} listener The function to fire
 * 
 * @see EventEmitter.add
 * 
 */
    addLocal: function (type, listener) {
    	if (!type || !listener) return;
    	if ('undefined' === typeof this.local[type]){
            this.local[type] = [];
        }
    	node.log('Added Local Listener: ' + type + ' ' + listener, 'DEBUG');
        this.local[type].push(listener);
    },

/**
 * ### EventEmitter.emit
 * 
 * Fires all the listeners associated with an event
 * 
 * @param event {string|object} The event name or an object of the type
 * 
 * 		{ type: 'myEvent',
 * 		  target: this, } // optional
 * 
 * @param {object} p1 Optional. A parameter to be passed to the listener
 * @param {object} p2 Optional. A parameter to be passed to the listener
 * @param {object} p3 Optional. A parameter to be passed to the listener
 * 
 * @TODO accepts any number of parameters
 */
    emit: function(event, p1, p2, p3) { // Up to 3 parameters
    	if (!event) return;
    	
    	if ('string' === typeof event) {
            event = { type: event };
        }
        if (!event.target){
            event.target = this;
        }
        
        if (!event.type) {  //falsy
            throw new Error("Event object missing 'type' property.");
        }
    	
        
        // Log the event into node.history object, if present
        if (!node.conf || !node.conf.events) {
        	node.log('node.conf.events object not found. Is everthing all right?', 'WARN');
        }
        else {
        	
        	if (node.conf.events.history) {
	        	var o = {
		        		event: event.type,
		        		//target: node.game,
		        		state: node.game.state,
		        		p1: p1,
		        		p2: p2,
		        		p3: p3
		        	};
	        	
	        	this.history.insert(o);
        	}
        	
        	// <!-- Debug
            if (node.conf.events.dumpEvents) {
            	node.log('Fired ' + event.type);
            }
        }
        
        
        // Fires global listeners
        if (this.global[event.type] instanceof Array) {
            var listeners = this.global[event.type];
            for (var i=0, len=listeners.length; i < len; i++){
            	listeners[i].call(this.game, p1, p2, p3);
            }
        }
        
        // Fires local listeners
        if (this.local[event.type] instanceof Array) {
            var listeners = this.local[event.type];
            for (var i=0, len=listeners.length; i < len; i++) {
            	listeners[i].call(this.game, p1, p2, p3);
            }
        }
       
    },

/**
 * ### EventEmitter.remove
 * 
 * Deregister an event, or an event listener
 * 
 * @param {string} type The event name
 * @param {function} listener Optional. The specific function to deregister 
 * 
 * @return Boolean TRUE, if the removal is successful
 */
	remove: function(type, listener) {
	
		function removeFromList(type, listener, list) {
	    	//<!-- console.log('Trying to remove ' + type + ' ' + listener); -->
	    	
	        if (list[type] instanceof Array) {
	        	if (!listener) {
	        		delete list[type];
	        		//console.log('Removed listener ' + type);
	        		return true;
	        	}
	        	
	            var listeners = list[type];
	            var len=listeners.length;
	            for (var i=0; i < len; i++) {
	            	//console.log(listeners[i]);
	            	
	                if (listeners[i] == listener) {
	                    listeners.splice(i, 1);
	                    node.log('Removed listener ' + type + ' ' + listener, 'DEBUG');
	                    return true;
	                }
	            }
	        }
	        
	        return false;
		}
		
		var r1 = removeFromList(type, listener, this.global);
		var r2 = removeFromList(type, listener, this.local);
	
		return r1 || r2;
	},
    
/**
 * ### EventEmitter.clearState
 * 
 * Undocumented (for now)
 * 
 * @TODO: This method wraps up clearLocalListeners. To re-design.
 */ 
	clearState: function(state) {
		this.clearLocal();
		return true;
	},
    
/**
 * ### EventEmitter.clearLocalListeners
 * 
 * Removes all entries from the local listeners register
 * 
 */
	clearLocal: function() {
		node.log('Cleaning Local Listeners', 'DEBUG');
		for (var key in this.local) {
			if (this.local.hasOwnProperty(key)) {
				this.remove(key, this.local[key]);
			}
		}
		
		this.local = {};
	},
    
/**
 * ### EventEmitter.printAll
 * 
 * Prints to console all the registered functions 
 */
	printAll: function() {
		node.log('nodeGame:\tPRINTING ALL LISTENERS', 'DEBUG');
	    
		for (var i in this.global){
	    	if (this.global.hasOwnProperty(i)){
	    		console.log(i + ' ' + i.length);
	    	}
	    }
		
		for (var i in this.local){
	    	if (this.local.hasOwnProperty(i)){
	    		console.log(i + ' ' + i.length);
	    	}
	    }
	    
}
};

/**
 * # Listener
 * 
 * Undocumented (for now)
 */

function Listener (o) {
	var o = o || {};
	
	// event name
	this.event = o.event; 					
	
	// callback function
	this.listener = o.listener; 			
	
	// events with higher priority are executed first
	this.priority = o.priority || 0; 	
	
	// the state in which the listener is
	// allowed to be executed
	this.state = o.state || node.game.state; 	
	
	// for how many extra steps is the event 
	// still valid. -1 = always valid
	this.ttl = ('undefined' !== typeof o.ttl) ? o.ttl : -1; 
	
	// function will be called with
	// target as 'this'		
	this.target = o.target || undefined;	
};
	 
// ## Closure

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameState
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Representation of the state of a game: 
 * 
 * 	`state`: the higher-level building blocks of a game
 * 	`step`: the sub-unit of a state
 * 	`round`: the number of repetition for a state. Defaults round = 1
 * 	`is`: the *load-lavel* of the game as expressed in `GameState.iss`
 * 	`paused`: TRUE if the game is paused
 * 
 * 
 * @see GameLoop
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
var JSUS = node.JSUS;

// Expose constructor
exports.GameState = GameState;

/**
 * ### GameState.iss
 *  
 * Numeric representation of the state of the nodeGame engine 
 * the game
 *  
 */
GameState.iss = {};
GameState.iss.UNKNOWN = 0; 		// Game has not been initialized
GameState.iss.LOADING = 10;		// The game is loading
GameState.iss.LOADED  = 25;		// Game is loaded, but the GameWindow could still require some time
GameState.iss.PLAYING = 50;		// Everything is ready
GameState.iss.DONE = 100;		// The player completed the game state

GameState.defaults = {};

/**
 * ### GameState.defaults.hash
 * 
 * Default hash string for game-states
 * 
 * 	@see GameState.toHash
 */
GameState.defaults.hash = 'S.s.r.i.p';

/**
 * ## GameState constructor
 * 
 * Creates an instance of a GameState 
 * 
 * It accepts an object literal or an hash string as defined in `GameState.defaults.hash`.
 * 
 * If no parameter is passed, all the properties of the GameState 
 * object are set to 0
 * 
 * @param {object|string} gs An object literal | hash string representing the game state
 * 
 * 	@see GameState.defaults.hash 
 */
function GameState (gs) {

// ## Public properties	

/**
 * ### GameState.state
 * 
 * The N-th game-block (state) in the game-loop currently being executed
 * 
 * 	@see GameLoop
 * 
 */	
	this.state = 	0;

/**
 * ### GameState.step
 * 
 * The N-th game-block (step) nested in the current state
 * 
 * 	@see GameState.state
 * 
 */	
	this.step = 	0;

/**
 * ### GameState.round
 * 
 * The number of times the current state was repeated 
 * 
 */		
	this.round = 	0;
	
/**
 * ### GameState.is
 * 
 * 
 * 
 * 	@see GameState.iss
 * 
 */		
	this.is = 		GameState.iss.UNKNOWN;
	
/**
 * ### GameState.paused
 * 
 * TRUE if the game is paused
 * 
 */		
	this.paused = 	false;
	
	if ('string' === typeof gs) {
		var tokens = gs.split('.');		
		this.state = 	('undefined' !== typeof tokens[0]) ? Number(tokens[0]) : undefined;
		this.step = 	('undefined' !== typeof tokens[1]) ? Number(tokens[1]) : undefined;
		this.round = 	('undefined' !== typeof tokens[2]) ? Number(tokens[2]) : undefined;
		this.is = 		('undefined' !== typeof tokens[3]) ? Number(tokens[3]) : GameState.iss.UNKNOWN;
		this.paused = 	(tokens[4] === '1') ? true : false;
	}
	else if ('object' === typeof gs) {	
		this.state = 	gs.state;
		this.step = 	gs.step;
		this.round = 	gs.round;
		this.is = 		(gs.is) ? gs.is : GameState.iss.UNKNOWN;
		this.paused = 	(gs.paused) ? gs.paused : false;
	}
	
}

/**
 * ## GameState.toString
 * 
 * Converts the current instance of GameState to a string
 * 
 * @return {string} out The string representation of the state of the GameState
 */
GameState.prototype.toString = function () {
	var out = this.toHash('(r) S.s');
	if (this.paused) {
		out += ' [P]';
	}
	return out;
};

/**
 * ## GameState.toHash
 * 
 * Returns a simplified hash of the state of the GameState,
 * according to the input string
 * 
 * @param {string} str The hash code
 * @return {string} hash The hashed game states
 * 
 * @see GameState.toHash (static)
 */
GameState.prototype.toHash = function (str) {
	return GameState.toHash(this, str);
};

/**
 * ## GameState.toHash (static)
 * 
 * Returns a simplified hash of the state of the GameState,
 * according to the input string. 
 * 
 * The following characters are valid to determine the hash string
 * 
 * 	- S: state
 * 	- s: step
 * 	- r: round
 * 	- i: is
 * 	- P: paused
 * 
 * E.g. 
 * 
 * ```javascript
 * 		var gs = new GameState({
 * 							round: 1,
 * 							state: 2,
 * 							step: 1,
 * 							is: 50,
 * 							paused: false,
 * 		});
 * 
 * 		gs.toHash('(R) S.s'); // (1) 2.1
 * ```
 * 
 * @param {GameState} gs The game state to hash
 * @param {string} str The hash code
 * @return {string} hash The hashed game states
 */
GameState.toHash = function (gs, str) {
	if (!gs || 'object' !== typeof gs) return false;
	if (!str || !str.length) return gs.toString();
	
	var hash = '',
		symbols = 'Ssrip',
		properties = ['state', 'step', 'round', 'is', 'paused'];
	
	for (var i = 0; i < str.length; i++) {
		var idx = symbols.indexOf(str[i]); 
		hash += (idx < 0) ? str[i] : Number(gs[properties[idx]]);
	}
	return hash;
};

/**
 * ## GameState.compare (static)
 * 
 * Compares two GameState objects|hash strings and returns
 * 
 *  - 0 if they represent the same game state
 *  - a positive number if gs1 is ahead of gs2 
 *  - a negative number if gs2 is ahead of gs1 
 * 
 * If the strict parameter is set, also the `is` property is compared,
 * otherwise only `round`, `state`, and `step`
 * 
 * The accepted hash string format is the following: 'S.s.r.i.p'.
 * Refer to `GameState.toHash` for the semantic of the characters.
 * 
 * 
 * @param {GameState|string} gs1 The first GameState object|string to compare
 * @param {GameState|string} gs2 The second GameState object|string to compare
 * @param {Boolean} strict If TRUE, also the `is` attribute is checked
 * 
 * @return {Number} result The result of the comparison
 * 
 * @see GameState.toHash (static)
 * 
 */
GameState.compare = function (gs1, gs2, strict) {
	if (!gs1 && !gs2) return 0;
	if (!gs2) return 1;
	if (!gs1) return -1;

	strict = strict || false;

	// Convert the parameters to objects, if an hash string was passed
	if ('string' === typeof gs1) gs1 = new GameState(gs1);
	if ('string' === typeof gs2) gs2 = new GameState(gs2);
	
	
	// <!--		
	//		console.log('COMPARAING GSs','DEBUG')
	//		console.log(gs1,'DEBUG');
	//		console.log(gs2,'DEBUG');
	// -->
	var result = gs1.state - gs2.state;
	
	if (result === 0 && 'undefined' !== typeof gs1.round) {
		result = gs1.round - gs2.round;
		
		if (result === 0 && 'undefined' !== typeof gs1.step) {
			result = gs1.step - gs2.step;
			
			if (strict && result === 0 && 'undefined' !== typeof gs1.is) {
				result = gs1.is - gs2.is;
			}
		}
	}
	
	
//	<!-- console.log('EQUAL? ' + result); -->

	
	return result;
};

/**
 * ## GameState.stringify (static)
 * 
 * Converts an object GameState-like to its string representation
 * 
 * @param {GameState} gs The object to convert to string	
 * @return {string} out The string representation of a GameState object
 */ 
GameState.stringify = function (gs) {
	if (!gs) return;
	var out = new GameState(gs).toHash('(r) S.s_i');
	if (gs.paused) out += ' [P]';
	return out;
}; 

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);

/**
 * # PlayerList
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Stores a collection of `Player` objects and offers methods
 * to perform operation on them
 * 
 * ---
 * 
 */

(function (exports, node) {


// ## Global scope
	
// Setting up global scope variables 
var	JSUS = node.JSUS,
	NDDB = node.NDDB;

var GameState = node.GameState;

// Exposing constructor
exports.PlayerList = PlayerList;

// Inheriting from NDDB	
PlayerList.prototype = JSUS.clone(NDDB.prototype);
PlayerList.prototype.constructor = PlayerList;


/**
 * ## PlayerList.array2Groups (static)
 * 
 * Transforms an array of array (of players) into an
 * array of PlayerList instances and returns it.
 * 
 * The original array is modified.
 * 
 * @param {Array} array The array to transform
 * @return {Array} array The array of `PlayerList` objects
 * 
 */
PlayerList.array2Groups = function (array) {
	if (!array) return;
	for (var i = 0; i < array.length; i++) {
		array[i] = new PlayerList({}, array[i]);
	};
	return array;
};

/**
 * ## PlayerList constructor
 *
 * Creates an instance of PlayerList.
 * 
 * The instance inherits from NDDB, an contains an internal 
 * database for storing the players 
 * 
 * @param {object} options Optional. Configuration options for the instance
 * @param {object} db Optional. An initial set of players to import 
 * @param {PlayerList} parent Optional. A parent object for the instance
 * 
 * @api public
 * 
 * 		@see NDDB constructor
 */

function PlayerList (options, db, parent) {
	options = options || {};
	if (!options.log) options.log = node.log;
	NDDB.call(this, options, db, parent);
  
	this.globalCompare = function (pl1, pl2) {
	  
		if (pl1.id === pl2.id) {
			return 0;
		}
		else if (pl1.count < pl2.count) {
			return 1;
		}
		else if (pl1.count > pl2.count) {
			return -1;
		}
		else {
			node.log('Two players with different id have the same count number', 'WARN');
			return 0;
		}
	};
};

// ## PlayerList methods

/**
 * ### PlayerList.add 
 * 
 * Adds a new player to the database
 * 
 * Before insertion, objects are checked to be valid `Player` objects.
 * 
 * @param {Player} player The player object to add to the database
 * @return {Boolean} TRUE, if the insertion was successful
 * 
 */
PlayerList.prototype.add = function (player) {
	// <!-- Check if the object contains the minimum requisite to act as Player -->
	if (!player || !player.sid || !player.id) {
		node.log('Only instance of Player objects can be added to a PlayerList', 'ERR');
		return false;
	}

	// <!-- Check if the id is unique -->
	if (this.exist(player.id)) {
		node.log('Attempt to add a new player already in the player list: ' + player.id, 'ERR');
		return false;
	}
	
	this.insert(player);
	player.count = player.nddbid;
	
	return true;
};

/**
 * ### PlayerList.remove
 * 
 * Removes a player from the database based on its id
 * 
 * If no id is passed, removes all currently selected 
 * players
 * 
 * Notice: this operation cannot be undone
 * 
 * @param {number} id The id of the player to remove
 * @return {Boolean} TRUE, if a player is found and removed successfully 
 * 
 * 		@see `PlayerList.pop`
 * 
 */
PlayerList.prototype.remove = function (id) {
	if (!id) {
		// fallback on NDDB.remove
		return NDDB.prototype.remove.call(this);
	}
		
	var p = this.select('id', '=', id);
	if (p.length) {
		p.remove();
		return true;
	}

	node.log('Attempt to remove a non-existing player from the the player list. id: ' + id, 'ERR');
	return false;
};

/**
 * ### PlayerList.get 
 * 
 * Retrieves a player with a given id and returns it
 * 
 * Displays a warning if more than one player is found with the same id
 * 
 * @param {number} id The id of the player to retrieve
 * @return {Player|Boolean} The player with the speficied id, or FALSE if no player was found
 * 
 * 		@see `PlayerList.pop`	
 * 
 */
PlayerList.prototype.get = function (id) {	
	if (!id) return false;
	
	var p = this.select('id', '=', id);
	
	if (p.count() > 0) {
		if (p.count() > 1) {
			node.log('More than one player found with id: ' + id, 'WARN');
			return p.fetch();
		}
		return p.first();
	}
	
	node.log('Attempt to access a non-existing player from the the player list. id: ' + id, 'ERR');
	return false;
};

/**
 * ### PlayerList.pop 
 * 
 * Retrieves a player with a given id, removes it from the database,
 * and returns it
 * 
 * Displays a warning if more than one player is found with the same id
 * 
 * @param {number} id The id of the player to retrieve
 * @return {Player|Boolean} The player with the speficied id, or FALSE if no player was found  
 * 
 * 		@see `PlayerList.remove`
 */
PlayerList.prototype.pop = function (id) {	
	if (!id) return false;
	
	var p = this.get(id);
	
	// <!-- can be either a Player object or an array of Players -->
	if ('object' === typeof p) {
		this.remove(id);
		return p;
	}
	
	return false;
};

/**
 * ### PlayerLIst.getAllIDs
 * 
 * Fetches all the id of the players in the database and
 * returns them into an array
 * 
 * @return {Array} The array of id of players
 * 
 */
PlayerList.prototype.getAllIDs = function () {	
	return this.map(function(o){return o.id;});
};

/**
 * ### PlayerList.updatePlayerState
 * 
 * Updates the value of the `state` object of a player in the database
 * 
 * @param {number} id The id of the player to update
 * @param {GameState} state The new value of the state property
 * @return {Boolean} TRUE, if update is successful
 * 
 */
PlayerList.prototype.updatePlayerState = function (id, state) {
	
	if (!this.exist(id)) {
		node.log('Attempt to access a non-existing player from the the player list ' + player.id, 'WARN');
		return false;	
	}
	
	if ('undefined' === typeof state) {
		node.log('Attempt to assign to a player an undefined state', 'WARN');
		return false;
	}
	
	this.select('id', '=', id).first().state = state;	

	return true;
};

/**
 * ### PlayerList.exist
 * 
 * Checks whether at least one player with a given player exists
 * 
 * @param {number} id The id of the player
 * @return {Boolean} TRUE, if a player with the specified id was found
 */
PlayerList.prototype.exist = function (id) {
	return (this.select('id', '=', id).count() > 0) ? true : false;
};

/**
 * ### PlayerList.isStateDone
 * 
 * Checks whether all players in the database are DONE
 * for the specified `GameState`.
 * 
 * @param {GameState} state Optional. The GameState to check. Defaults state = node.game.state
 * @param {Boolean} extended Optional. If TRUE, also newly connected players are checked. Defaults, FALSE
 * @return {Boolean} TRUE, if all the players are DONE with the specified `GameState`
 * 
 * 		@see `PlayerList.actives`
 * 		@see `PlayerList.checkState`
 */
PlayerList.prototype.isStateDone = function (state, extended) {
	
	// <!-- console.log('1--- ' + state); -->
	state = state || node.game.state;
	// <!-- console.log('2--- ' + state); -->
	extended = extended || false;
	
	var result = this.map(function(p){
		var gs = new GameState(p.state);
		// <!-- console.log('Going to compare ' + gs + ' and ' + state); -->
		
		// Player is done for his state
		if (p.state.is !== GameState.iss.DONE) {
			return 0;
		}
		// The state of the player is actually the one we are interested in
		if (GameState.compare(state, p.state, false) !== 0) {
			return 0;
		}
		
		return 1;
	});
	
	var i;
	var sum = 0;
	for (i=0; i<result.length;i++) {
		sum = sum + Number(result[i]);
	}
	
	var total = (extended) ? this.length : this.actives(); 
// <!--
//		console.log('ISDONE??')
//		console.log(total + ' ' + sum);
// -->	
	return (sum === total) ? true : false;
};

/**
 * ### PlayerList.actives
 * 
 * Counts the number of player whose state is different from 0:0:0
 * 
 * @return {number} result The number of player whose state is different from 0:0:0
 * 
 */
PlayerList.prototype.actives = function () {
	var result = 0;
	var gs;
	this.each(function(p) {
		gs = new GameState(p.state);	
		// <!-- Player is on 0.0.0 state -->
		if (GameState.compare(gs, new GameState()) !== 0) {
			result++;
		}
	});	
	// <!-- node.log('ACTIVES: ' + result); -->
	return result;
};

/**
 * ### PlayerList.checkState
 * 
 * If all the players are DONE with the specfied state,
 * emits a `STATEDONE` event
 * 
 * @param {GameState} state Optional. The GameState to check. Defaults state = node.game.state
 * @param {Boolean} extended Optional. If TRUE, also newly connected players are checked. Defaults, FALSE
 * 
 * 		@see `PlayerList.actives`
 * 		@see `PlayerList.isStateDone`
 * 
 */
PlayerList.prototype.checkState = function (state, extended) {
	if (this.isStateDone(state, extended)) {
		node.emit('STATEDONE');
	}
};

/**
 * ### PlayerList.toString
 * 
 * Returns a string representation of the state of the 
 * PlayerList
 * 
 * @param {string} eol Optional. End of line separator between players
 * @return {string} out The string representation of the state of the PlayerList
 */
PlayerList.prototype.toString = function (eol) {
	
	var out = '';
	var EOL = eol || '\n';
	
	this.forEach(function(p) {
    	out += p.id + ': ' + p.name;
    	var state = new GameState(p.state);
    	out += ': ' + state + EOL;
	});
	return out;
};

/**
 * ### PlayerList.getNGroups
 * 
 * Creates N random groups of players
 * 
 * @param {number} N The number of groups
 * @return {Array} Array containing N `PlayerList` objects 
 * 
 * 		@see `JSUS.getNGroups`
 */
PlayerList.prototype.getNGroups = function (N) {
	if (!N) return;
	var groups = JSUS.getNGroups(this.db, N);
	return PlayerList.array2Groups(groups);
};	

/**
 * ### PlayerList.getGroupsSizeN
 * 
 * Creates random groups of N players
 * 
 * @param {number} N The number player per group
 * @return {Array} Array containing N `PlayerList` objects 
 * 
 * 		@see `JSUS.getGroupsSizeN`
 */
PlayerList.prototype.getGroupsSizeN = function (N) {
	if (!N) return;
	var groups = JSUS.getGroupsSizeN(this.db, N);
	return PlayerList.array2Groups(groups);
};	

/**
 * ### PlayerList.getRandom
 * 
 * Returns a set of N random players 
 * 
 * @param {number} N The number of random players to include in the set. Defaults N = 1
 * @return {Player|Array} A single player object or an array of
 */
PlayerList.prototype.getRandom = function (N) {	
	if (!N) N = 1;
	if (N < 1) {
		node.log('N must be an integer >= 1', 'ERR');
		return false;
	}
	this.shuffle();
	
	if (N == 1) {
		return this.first();
	}
	
	return this.limit(N).fetch();
};

/**
 * # Player Class
 * 
 * A Player object is a wrapper object for a number of properties 
 * to associate to a player during the game. 
 * 
 * Some of the properties are `private` and can never be changed 
 * after an instance of a Player has been created. Defaults one are:
 * 
 * 	`sid`: The Socket.io session id associated to the player
 * 	`id`: The nodeGame session id associate to the player
 * 	`count`: The id of the player within a PlayerList object
 * 
 * Others properties are public and can be changed during the game.
 * 
 *	`name`: An alphanumeric name associated to the player 
 *	`state`: The current state of the player as relative to a game
 *	`ip`: The ip address of the player
 * 
 * All the additional properties in the configuration object passed 
 * to the constructor are also created as *private* and cannot be further
 * modified during the game. 
 * 
 * For security reasons, non-default properties cannot be `function`, and 
 * cannot overwrite any previously existing property.
 * 
 * ---
 * 
 */


// Expose Player constructor
exports.Player = Player;

/**
 * ## Player constructor
 * 
 * Creates an instance of Player
 * 
 * @param {object} pl The object literal representing the player
 * 
 * 
 */
function Player (pl) {
	pl = pl || {};
	
// ## Private properties
	
/**
 * ### Player.sid
 * 
 * The session id received from the nodeGame server 
 * 
 */	
	var sid = pl.sid;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'sid', {
			value: sid,
	    	enumerable: true
		});
	}
	else {
		this.sid = sid;
	}
	
/**
 * ### Player.id
 * 
 * The nodeGame session id associate to the player 
 * 
 * Usually it is the same as the Socket.io id, but in 
 * case of reconnections it can change
 * 
 */	
	var id = pl.id || sid;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'id', {
			value: id,
	    	enumerable: true
		});
	}
	else {
		this.id = id;
	}
	
/**
 * ### Player.count
 * 
 * The ordinal position of the player in a PlayerList object
 * 
 * 	@see PlayerList
 */		
	var count = pl.count;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'count', {
	    	value: count,
	    	enumerable: true
		});
	}
	else {
		this.count = count;
	}
	
// ## Player public properties

/**
 * ### Player.ip
 * 
 * The ip address of the player
 * 
 * Note: this can change in mobile networks
 * 
 */		
 	this.ip = pl.ip;
 
/**
 * ### Player.name
 * 
 * An alphanumeric name associated with the player
 * 
 */	 
	this.name = pl.name;
	
/**
 * ### Player.state
 * 
 * Reference to the game-state the player currently is
 * 
 * 	@see node.game.state
 * 	@see GameState
 */		
	this.state = pl.state || new GameState();

	
// ## Extra properties
// Non-default properties are all added as private
// For security reasons, they cannot be of type function, and they 
// cannot overwrite any previously defined variable
	for (var key in pl) {
		if (pl.hasOwnProperty(key)) {
			if ('function' !== typeof pl[key]) {
				if (!this.hasOwnProperty(key)) {
					this[key] = pl[key];
				}
			}
		}
	}
}

// ## Player methods

/**
 * ### Player.toString
 * 
 * Returns a string representation of a player
 * 
 * @return {string} The string representation of a player
 */
Player.prototype.toString = function() {
	return (this.name || '' ) + ' (' + this.id + ') ' + new GameState(this.state);
};
		
// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameMsg
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` exchangeable data format
 * 
 * ---
 */
(function (exports, node) {

// ## Global scope	
var GameState = node.GameState,
	JSUS = node.JSUS;

exports.GameMsg = GameMsg;

/**
 * ### GameMsg.actions
 * 
 * Collection of available nodeGame actions
 * 
 * The action adds an initial semantic meaning to the
 * message. It specify the nature of requests
 * "Why the message was sent?"
 * 
 */
GameMsg.actions = {};

GameMsg.actions.SET 		= 'set'; 	// Changes properties of the receiver
GameMsg.actions.GET 		= 'get'; 	// Ask a properties of the receiver
GameMsg.actions.SAY			= 'say'; 	// Announce properties of the sender

/**
 * ### GameMsg.targets
 * 
 * Collection of available nodeGame targets
 * 
 * The target adds an additional level of semantic 
 * for the message, and specifies the nature of the
 * information carried in the message. 
 * 
 * It answers the question: "What is the content of the message?" 
 */
GameMsg.targets = {};

GameMsg.targets.HI			= 'HI';			// Client connects
GameMsg.targets.HI_AGAIN	= 'HI_AGAIN'; 	// Client reconnects

GameMsg.targets.PCONNECT	= 'PCONNECT'; 		// A new player just connected
GameMsg.targets.PDISCONNECT = 'PDISCONNECT';	// A player just disconnected

GameMsg.targets.MCONNECT	= 'MCONNECT'; 		// A new monitor just connected
GameMsg.targets.MDISCONNECT = 'MDISCONNECT';	// A monitor just disconnected

GameMsg.targets.PLIST 		= 'PLIST';	// PLIST
GameMsg.targets.MLIST 		= 'MLIST';	// PLIST

GameMsg.targets.STATE		= 'STATE';	// STATE

GameMsg.targets.TXT 		= 'TXT';	// Text msg
GameMsg.targets.DATA		= 'DATA';	// Contains a data-structure in the data field

GameMsg.targets.REDIRECT	= 'REDIRECT'; // redirect a client to a new address

// Still to implement
GameMsg.targets.BYE			= 'BYE';	// Force disconnects
GameMsg.targets.ACK			= 'ACK';	// A reliable msg was received correctly
GameMsg.targets.WARN 		= 'WARN';	// To do.
GameMsg.targets.ERR			= 'ERR';	// To do.


GameMsg.IN					= 'in.';	// Prefix for incoming msgs
GameMsg.OUT					= 'out.';	// Prefix for outgoing msgs


/**
 * ### GameMSg.clone (static)
 * 
 * Returns a perfect copy of a game-message
 * 
 * @param {GameMsg} gameMsg The message to clone
 * @return {GameMsg} The cloned messaged
 * 
 * 	@see JSUS.clone
 */
GameMsg.clone = function (gameMsg) {	
	return new GameMsg(gameMsg);
};


/**
 * ## GameMsg constructor
 * 
 * Creates an instance of GameMsg
 */
function GameMsg (gm) {
	gm = gm || {};
	
// ## Private properties

/**
 * ### GameMsg.id
 * 
 * A randomly generated unique id
 * 
 * @api private
 */	
	var id = gm.id || Math.floor(Math.random()*1000000);
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'id', {
			value: id,
			enumerable: true
		});
	}
	else {
		this.id = id;
	}

/**
 * ### GameMsg.session
 * 
 * The session id in which the message was generated
 * 
 * @api private
 */	
	var session = gm.session;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'session', {
			value: session,
			enumerable: true
		});
	}
	else {
		this.session = session;
	}

// ## Public properties	

/**
 * ### GameMsg.state
 * 
 * The game-state in which the message was generated
 * 
 * 	@see GameState
 */	
	this.state = gm.state;

/**
 * ### GameMsg.action
 * 
 * The action of the message
 * 
 * 	@see GameMsg.actions
 */		
	this.action = gm.action;
	
/**
 * ### GameMsg.target
 * 
 * The target of the message
 * 
 * 	@see GameMsg.targets
 */	
	this.target = gm.target;
	
/**
 * ### GameMsg.from
 * 
 * The id of the sender of the message
 * 
 * 	@see Player.id
 */		
	this.from = gm.from;

/**
 * ### GameMsg.to
 * 
 * The id of the receiver of the message
 * 
 * 	@see Player.id
 * 	@see node.player.id
 */		
	this.to = gm.to;

/**
 * ### GameMsg.text
 * 
 * An optional text adding a description for the message
 */		
	this.text = gm.text; 
	
/**
 * ### GameMsg.data
 * 
 * An optional payload field for the message
 */			
	this.data = gm.data;
	
/**
 * ### GameMsg.priority
 * 
 * A priority index associated to the message
 */	
	this.priority = gm.priority;
	
/**
 * ### GameMsg.reliable
 * 
 * Experimental. Disabled for the moment
 * 
 * If set, requires ackwnoledgment of delivery
 * 
 */	
	this.reliable = gm.reliable;

/**
 * ### GameMsg.created
 * 
 * A timestamp of the date of creation
 */		
	this.created = JSUS.getDate();
	
/**
 * ### GameMsg.forward
 * 
 * If TRUE, the message is a forward. 
 * 
 * E.g. between nodeGame servers
 */	
	this.forward = 0;
};

/**
 * ### GameMsg.stringify
 * 
 * Calls JSON.stringify on the message
 * 
 * @return {string} The stringified game-message
 * 
 * 	@see GameMsg.toString
 */
GameMsg.prototype.stringify = function () {
	return JSON.stringify(this);
};


/**
 * ### GameMsg.toString
 * 
 * Creates a human readable string representation of the message
 * 
 * @return {string} The string representation of the message
 * 	@see GameMsg.stringify
 */
GameMsg.prototype.toString = function () {
	
	var SPT = ",\t";
	var SPTend = "\n";
	var DLM = "\"";
	
	var gs = new GameState(this.state);
	
	var line = this.created + SPT;
		line += this.id + SPT;
		line += this.session + SPT;
		line += this.action + SPT;
		line += this.target + SPT;
		line +=	this.from + SPT;
		line += this.to + SPT;
		line += DLM + this.text + DLM + SPT;
		line += DLM + this.data + DLM + SPT; // maybe to remove
		line += this.reliable + SPT;
		line += this.priority + SPTend;
		
	return line;
};

/**
 * ### GameMSg.toSMS
 * 
 * Creates a compact visualization of the most important properties
 * 
 * @return {string} A compact string representing the message 
 * 
 * @TODO: Create an hash method as for GameState
 */
GameMsg.prototype.toSMS = function () {
	
	var parseDate = /\w+/; // Select the second word;
	var results = parseDate.exec(this.created);

	var line = '[' + this.from + ']->[' + this.to + ']\t';
	line += '|' + this.action + '.' + this.target + '|'+ '\t';
	line += ' ' + this.text + ' ';
	
	return line;
};

/**
 * ### GameMsg.toInEvent
 * 
 * Hashes the action and target properties of an incoming message
 * 
 * @return {string} The hash string
 * 	@see GameMsg.toEvent 
 */
GameMsg.prototype.toInEvent = function() {
	return 'in.' + this.toEvent();
};

/**
 * ### GameMsg.toOutEvent
 * 
 * Hashes the action and target properties of an outgoing message
 * 
 * @return {string} The hash string
 *  @see GameMsg.toEvent
 */
GameMsg.prototype.toOutEvent = function() {
	return 'out.' + this.toEvent();
};

/**
 * ### GameMsg.toEvent
 * 
 * Hashes the action and target properties of the message
 * 
 * @return {string} The hash string
 */
GameMsg.prototype.toEvent = function () {
	return this.action + '.' + this.target;
}; 

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameLoop
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` container of game-state functions, and parameters
 * 
 * ---
 * 
 */
(function (exports, node) {
	
// ## Global scope
var GameState = node.GameState,
	JSUS = node.JSUS;

exports.GameLoop = GameLoop;

/**
 * ### limits
 * 
 * Array containing the boundary limits of the game-loop
 * 
 * @api private
 */
var limits = [];

/**
 * ## GameLoop constructor
 * 
 * Creates a new instance of GameLoop
 * 
 * Takes as input parameter an object like
 * 
 *	{ 1:
 *		{
 *			state: myFunc,
 *			rounds: numRounds, // optional, defaults 1
 *		},
 *	 2:
 *		{
 *			state: myNestedState,
 *			rounds: numRounds, // optional, defaults 1
 *		},	
 * 		// any arbitray number of state-objects is allowed
 * 	}
 * 
 * From the above example, the value of the `state` property 
 * can be a function or a nested state object (with internal steps). 
 * For example
 * 
 * 	myFunc = function() {};
 * 
 * 	myNestedState = {
 * 			1: {
 * 				state: myFunc2,
 * 			}
 * 			2: {
 * 				state: myFunc3,
 * 			}
 * 	}
 * 
 * @param {object} loop Optional. An object containing the loop functions
 * 
 */
function GameLoop (loop) {
	// ### Public variables
	
/**
 * ### GameLoop.loop
 * 
 * The transformed loop container
 */
	this.loop = loop || {};

	for (var key in this.loop) {
		if (this.loop.hasOwnProperty(key)) {
			
			// Transform the loop obj if necessary.
			// When a state executes only one step,
			// it is allowed to pass directly the name of the function.
			// So such function must be incapsulated in a obj here.
			var loop = this.loop[key].state;
			if ('function' === typeof loop) {
				var o = JSUS.clone(this.loop[key]);
				this.loop[key].state = {1: o};
			}
			
			var steps = JSUS.size(this.loop[key].state)
			
			var round = this.loop[key].rounds || 1;
			limits.push({rounds: round, steps: steps});
		}
	}
	
/**
 * ### GameLoop.length
 * 
 * The total number of states + steps in the game-loop
 * 
 * @see GameLoop.size()
 * 
 * @deprecated
 */
	if (node.support.getter) {
		Object.defineProperty(this, 'length', {
	    	set: function(){},
	    	get: this.size,
	    	configurable: true
		});
	}
	else {
		this.length = null;
	}	
}

// ## GameLoop methods

/**
 * ### GameLoop.size
 * 
 * Returns the total number of states + steps in the game-loop
 * 
 */
GameLoop.prototype.size = function() {
	return this.steps2Go(new GameState());
};

/**
 * ### GameLoop.exist
 * 
 * Returns TRUE, if a gameState exists in the game-loop
 * 
 * @param {GameState} gameState The game-state to check
 */
GameLoop.prototype.exist = function (gameState) {
	if (!gameState) return false;
	gameState = new GameState(gameState);
	
	if (typeof(this.loop[gameState.state]) === 'undefined') {
		node.log('Unexisting state: ' + gameState.state, 'WARN');
		return false;
	}
	
	if (typeof(this.loop[gameState.state]['state'][gameState.step]) === 'undefined'){
		node.log('Unexisting step: ' + gameState.step, 'WARN');
		return false;
	}
	// States are 1 based, arrays are 0-based => -1
	if (gameState.round > limits[gameState.state-1]['rounds']) {
		node.log('Unexisting round: ' + gameState.round + 'Max round: ' + limits[gameState.state]['rounds'], 'WARN');
		return false;
	}
		
	return true;
};

/**
 * ### GameLoop.next
 * 
 * Returns the next state in the loop
 * 
 * An optional input parameter can control the state from which 
 * to compute the next state
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.game.state
 * @return {GameState|boolean} The next game-state, or FALSE if it does not exist
 * 
 */
GameLoop.prototype.next = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.game.state;
	
	// Game has not started yet, do it!
	if (gameState.state === 0) {
		return new GameState({
							 state: 1,
							 step: 1,
							 round: 1
		});
	}
	
	if (!this.exist(gameState)) {
		node.log('No next state of non-existing state: ' + gameState, 'WARN');
		return false;
	}
	
	var idxLimit = Number(gameState.state)-1; // 0 vs 1 based
	
	if (limits[idxLimit]['steps'] > gameState.step){
		var newStep = Number(gameState.step)+1;
		return new GameState({
			state: gameState.state,
			step: newStep,
			round: gameState.round
		});
	}
	
	if (limits[idxLimit]['rounds'] > gameState.round){
		var newRound = Number(gameState.round)+1;
		return new GameState({
			state: gameState.state,
			step: 1,
			round: newRound
		});
	}
	
	if (limits.length > gameState.state){		
		var newState = Number(gameState.state)+1;
		return new GameState({
			state: newState,
			step: 1,
			round: 1
		});
	}
	
	// No next state: game over
	return false; 
};

/**
 * ### GameLoop.previous
 * 
 * Returns the previous state in the loop
 * 
 * An optional input parameter can control the state from which 
 * to compute the previous state
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.game.state
 * @return {GameState|boolean} The previous game-state, or FALSE if it does not exist
 */
GameLoop.prototype.previous = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.game.state;
	
	if (!this.exist(gameState)) {
		node.log('No previous state of non-existing state: ' + gameState, 'WARN');
	}
	
	var idxLimit = Number(gameState.state)-1; // 0 vs 1 based
	
	if (gameState.step > 1){
		var oldStep = Number(gameState.step)-1;
		return new GameState({
			state: gameState.state,
			step: oldStep,
			round: gameState.round
		});
	}
	else if (gameState.round > 1){
		var oldRound = Number(gameState.round)-1;
		var oldStep = limits[idxLimit]['steps'];
		return new GameState({
			state: gameState.state,
			step: oldStep,
			round: oldRound
		});
	}
	else if (gameState.state > 1){
		var oldRound = limits[idxLimit-1]['rounds'];
		var oldStep = limits[idxLimit-1]['steps'];
		var oldState = idxLimit;
		return new GameState({
			state: oldState,
			step: oldStep,
			round: oldRound
		});
	}
	
	// game init
	return false; 
};

/**
 * ### GameLoop.getName
 * 
 * Returns the name associated with a game-state
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.game.state
 * @return {string|boolean} The name of the game-state, or FALSE if state does not exists
 */
GameLoop.prototype.getName = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.game.state;
	if (!this.exist(gameState)) return false;
	return this.loop[gameState.state]['state'][gameState.step]['name'];
};

/**
 * ### GameLoop.getFunction
 * 
 * Returns the function associated with a game-state
 * 
 * @param {GameState} gameState The reference game-state
 * @return {object|boolean} The function of the game-state, or FALSE if state does not exists
 */
GameLoop.prototype.getFunction = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.game.state;
	if (!this.exist(gameState)) return false;
	return this.loop[gameState.state]['state'][gameState.step]['state'];
};

/**
 * ### GameLoop.getAllParams
 * 
 * Returns all the parameters associated with a game-state
 * 
 * @param {GameState} gameState The reference game-state
 * @return {object|boolean} The state object, or FALSE if state does not exists
 */
GameLoop.prototype.getAllParams = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.game.state;
	if (!this.exist(gameState)) return false;
	return this.loop[gameState.state]['state'][gameState.step];
};

/**
 * ### GameLoop.jumpTo
 * 
 * Returns a state N steps away from the reference state
 * 
 * A negative value for N jumps backward in the game-loop, 
 * and a positive one jumps forward in the game-loop
 * 
 * @param {GameState} gameState The reference game-state
 * @param {number} N The number of steps to jump
 * @return {GameState|boolean} The "jumped-to" game-state, or FALSE if it does not exist
 */
GameLoop.prototype.jumpTo = function (gameState, N) {
	if (!this.exist(gameState)) return false;
	if (!N) return gameState;
	
	var func = (N > 0) ? this.next : this.previous;
	
	for (var i=0; i < Math.abs(N); i++) {
		gameState = func.call(this, gameState);
		if (!gameState) return false;
	}
	return gameState;
};

/**
 * ### GameLoop.steps2Go
 * 
 * Computes the total number steps left to the end of the game.
 * 
 * An optional input parameter can control the starting state
 * for the computation
 * 
 * @param {GameState} gameState Optional. The reference game-state. Defaults, node.game.state
 * @return {number} The total number of steps left
 */
GameLoop.prototype.steps2Go = function (gameState) {
	gameState = (gameState) ? new GameState(gameState) : node.game.state;
	var count = 0;
	while (gameState) { 
		count++;
		gameState = this.next(gameState);
	}
	return count;
};

GameLoop.prototype.toArray = function() {
	var state = new GameState();
	var out = [];
	while (state) { 
		out.push(state.toString());
		var state = this.next(state);
	}
	return out;
};

/**
 * 
 * ### GameLoop.indexOf
 * 
 * Returns the ordinal position of a state in the game-loop 
 * 
 * All steps and rounds in between are counted.
 * 
 * @param {GameState} gameState The reference game-state
 * @return {number} The state index in the loop, or -1 if it does not exist
 * 
 * 	@see GameLoop.diff
 */
GameLoop.prototype.indexOf = function (state) {
	if (!state) return -1;
	return this.diff(state, new GameState());
};

/**
 * ### GameLoop.diff
 * 
 * Returns the distance in steps between two states in the game-loop 
 * 
 * All steps and rounds in between are counted.
 * 
 * It works under the assumption that state1 comes first than state2
 * in the game-loop.
 * 
 * @param {GameState} state1 The reference game-state
 * @param {GameState} state2 Optional. The second state for comparison. Defaults node.game.state
 * 
 * @return {number} The state index in the loop, or -1 if it does not exist
 * 
 * @TODO: compute also negative distances
 */
GameLoop.prototype.diff = function (state1, state2) {
	if (!state1) return false;
	state1 = new GameState(state1) ;
	
	if (!state2) {
		if (!node.game.state) return false;
		state2 = node.game.state
	}
	else {
		state2 = new GameState(state2) ;
	}
	
	
	var idx = 0;
	while (state2) {
		if (GameState.compare(state1, state2) === 0){
			return idx;
		}
		state2 = this.next(state2);
		idx++;
	}
	return -1;
};
	
// ## Closure	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameMsgGenerator
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` component rensponsible creating messages 
 * 
 * Static factory of objects of type `GameMsg`.
 * 
 * All message are reliable, but TXT messages.
 * 
 * 	@see GameMSg
 * 	@see GameMsg.targets
 * 	@see GameMsg.actions
 * 
 * ---
 *
 */
(function (exports, node) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameState = node.GameState,
	Player = node.Player,
	JSUS = node.JSUS;

exports.GameMsgGenerator = GameMsgGenerator; 

/**
 * ## GameMsgGenerator constructor
 * 
 * Creates an instance of GameMSgGenerator
 * 
 */
function GameMsgGenerator () {}

// ## General methods

/**
 * ### GameMsgGenerator.create 
 * 
 * Primitive for creating any type of game-message
 * 
 * Merges a set of default settings with the object passed
 * as input parameter
 * 
 * 	@see JSUS.merge
 */
GameMsgGenerator.create = function (msg) {

  var base = {
		session: node.gsc.session, 
		state: node.game.state,
		action: GameMsg.actions.SAY,
		target: GameMsg.targets.DATA,
		from: node.player.sid,
		to: 'SERVER',
		text: null,
		data: null,
		priority: null,
		reliable: 1
  };

  msg = JSUS.merge(base, msg);
  return new GameMsg(msg);

};

//## HI messages

/**
 * ### GameMSgGenerator.createHI
 * 
 * Notice: this is different from the server;
 * 
 * @param {Player} player The player to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createHI = function (player, to, reliable) {
	player = player || node.player;
	if (!player) return false;
	reliable = reliable || 1;
  
	return new GameMsg( {
            			session: node.gsc.session,
            			state: node.game.state,
            			action: GameMsg.actions.SAY,
            			target: GameMsg.targets.HI,
            			from: node.player.sid,
            			to: to,
            			text: new Player(player) + ' ready.',
            			data: player,
            			priority: null,
            			reliable: reliable
	});
};

// ## STATE messages

/**
 * ### GameMSgGenerator.saySTATE
 * 
 * Creates a say.STATE message
 * 
 * Notice: state is different from node.game.state
 * 
 * @param {GameState} state The game-state to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 */
GameMsgGenerator.saySTATE = function (state, to, reliable) {
	return this.createSTATE(GameMsg.SAY, state, to, reliable);
};

/**
 * ### GameMSgGenerator.setSTATE
 * 
 * Creates a set.STATE message
 * 
 * @param {GameState} state The game-state to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 */
GameMsgGenerator.setSTATE = function (state, to, reliable) {
	return this.createSTATE(GameMsg.SET, state, to, reliable);
};

/**
 * ### GameMSgGenerator.getSTATE
 * 
 * Experimental. Creates a get.STATE message
 * 
 * @param {GameState} state The game-state to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 */
GameMsgGenerator.getSTATE = function (state, to, reliable) {
	return this.createSTATE(GameMsg.GET, state, to,reliable);
};

/**
 * ### GameMSgGenerator.createSTATE
 * 
 * Creates a STATE message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {GameState} state The game-state to communicate
 * @param {string} to Optional. The recipient of the message. Defaults, SERVER
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameState
 * 	@see GameMsg.actions
 */
GameMsgGenerator.createSTATE = function (action, state, to, reliable) {
	if (!action || !state) return false;
	to = to || 'SERVER';
	reliable = reliable || 1;
	return new GameMsg({
						session: node.gsc.session,
						state: node.game.state,
						action: action,
						target: GameMsg.targets.STATE,
						from: node.player.sid,
						to: to,
						text: 'New State: ' + GameState.stringify(state),
						data: state,
						priority: null,
						reliable: reliable
	});
};

//## PLIST messages

/**
 * ### GameMSgGenerator.sayPLIST
 * 
 * Creates a say.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.sayPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.SAY, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.setPLIST
 * 
 * Creates a set.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.setPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.SET, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.getPLIST
 * 
 * Experimental. Creates a get.PLIST message
 * 
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see PlayerList
 */
GameMsgGenerator.getPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.GET, plist, to, reliable);
};

/**
 * ### GameMSgGenerator.createPLIST
 * 
 * Creates a PLIST message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {PlayerList} plist The player-list to communicate
 * @param {string} to Optional. The recipient of the message. Defaults, SERVER
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 * 
 * 	@see GameMsg.actions
 *  @see PlayerList
 */
GameMsgGenerator.createPLIST = function (action, plist, to, reliable) {
	plist = plist || !node.game || node.game.pl;
	if (!action || !plist) return false;
	
	to = to || 'SERVER';
	reliable = reliable || 1;
	
	return new GameMsg({
						session: node.gsc.session, 
						state: node.game.state,
						action: action,
						target: GameMsg.targets.PLIST,
						from: node.player.sid,
						to: to,
						text: 'List of Players: ' + plist.length,
						data: plist.pl,
						priority: null,
						reliable: reliable
	});
};

// ## TXT messages

/**
 * ### GameMSgGenerator.createTXT
 * 
 * Creates a say.TXT message
 * 
 * TXT messages are always of action 'say'
 * 
 * @param {string} text The text to communicate
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createTXT = function (text, to, reliable) {
	if (!text) return false;
	reliable = reliable || 0;
	
	return new GameMsg({
						session: node.gsc.session,
						state: node.game.state,
						action: GameMsg.actions.SAY,
						target: GameMsg.targets.TXT,
						from: node.player.sid,
						to: to,
						text: text,
						data: null,
						priority: null,
						reliable: reliable
	});
};


// ## DATA messages

/**
 * ### GameMSgGenerator.sayDATA
 * 
 * Creates a say.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.sayDATA = function (data, to, text, reliable) {
	return this.createDATA(GameMsg.actions.SAY, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.setDATA
 * 
 * Creates a set.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.setDATA = function (data, to, text, reliable) {
	return this.createDATA(GameMsg.actions.SET, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.getDATA
 * 
 * Experimental. Creates a say.DATA message
 * 
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.getDATA = function (data, to, text, reliable) {
	return this.createDATA(GameMsg.actions.GET, data, to, text, reliable);
};

/**
 * ### GameMSgGenerator.createDATA
 * 
 * Creates a DATA message
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {object} data An object to exchange
 * @param {string} to The recipient of the message
 * @param {boolean} reliable Optional. Experimental. Requires an acknowledgment
 * 
 * @return {GameMsg|boolean} The game message, or FALSE if error in the input parameters is detected
 */
GameMsgGenerator.createDATA = function (action, data, to, text, reliable) {
	if (!action) return false;
	reliable = reliable || 1;
	text = text || 'data msg';
	
	return new GameMsg({
						session: node.gsc.session, 
						state: node.game.state,
						action: action,
						target: GameMsg.targets.DATA,
						from: node.player.sid,
						to: to,
						text: text,
						data: data,
						priority: null,
						reliable: reliable
	});
};

// ## ACK messages

/**
 * ### GameMSgGenerator.setACK
 * 
 * Experimental. Undocumented (for now)
 * 
 */
GameMsgGenerator.createACK = function (gm, to, reliable) {
	if (!gm) return false;
	reliable = reliable || 0;
	
	var newgm = new GameMsg({
							session: node.gsc.session, 
							state: node.game.state,
							action: GameMsg.actions.SAY,
							target: GameMsg.targets.ACK,
							from: node.player.sid,
							to: to,
							text: 'Msg ' + gm.id + ' correctly received',
							data: gm.id,
							priority: null,
							reliable: reliable
	});
	
	if (gm.forward) {
		newgm.forward = 1;
	}
	
	return newgm;
}; 


// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # GameSocketClient
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * `nodeGame` component rensponsible for dispatching events and messages 
 * 
 * ---
 * 
 */

(function (exports, node, io) {
	
// ## Global scope
	
var GameMsg = node.GameMsg,
	GameState = node.GameState,
	Player = node.Player,
	GameMsgGenerator = node.GameMsgGenerator;

var buffer,
	session;
	

exports.GameSocketClient = GameSocketClient;

/**
 * ## GameSocketClient constructor
 * 
 * Creates a new instance of GameSocketClient
 * 
 * @param {object} options Optional. A configuration object
 */
function GameSocketClient (options) {
	options = options || {};
	
// ## Private properties
	
/**
 * ### GameSocketClient.buffer
 * 
 * Buffer of queued messages 
 * 
 * @api private
 */ 
	buffer = [];
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'buffer', {
			value: buffer,
			enumerable: true
		});
	}
	else {
		this.buffer = buffer;
	}
	
/**
 * ### GameSocketClient.session
 * 
 * The session id shared with the server
 * 
 * This property is initialized only when a game starts
 * 
 */
	session = null;
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'session', {
			value: session,
			enumerable: true
		});
	}
	else {
		this.session = session;
	}
// ## Public properties
	
/**
 * ### GameSocketClient.io
 * 
 * 
 */	
	this.io 		= null;
/**
 * ### GameSocketClient.url
 * 
 */		
	this.url 		= null;
	
/**
 * ### GameSocketClient.servername
 * 
 */	
	this.servername = null;

}

// ## GameSocketClient methods

/**
 * ### GameSocketClient.getSession
 * 
 * Searches the node.session object for a saved session matching the passed 
 * game-message
 * 
 * If found, the session object will have the following a structure
 * 
 *	var session = {
 * 		id: 	node.gsc.session,
 * 		player: node.player,
 * 		memory: node.game.memory,
 * 		state: 	node.game.state,
 * 		game: 	node.game.name,
 * 		history: undefined,
 * 	};	
 * 
 * 
 * @param {GameMsg} msg A game-msg
 * @return {object|boolean} A session object, or FALSE if not was not found
 * 
 * 	@see node.session
 */
GameSocketClient.prototype.getSession = function (msg) {
	if (!msg) return false;
	
	var session = false;
	if ('function' === typeof node.session)	{
		session = node.session(msg.session);
	}
	
	// TODO: check if session is still valid
	return (session) ? session : false;
};

/**
 * ### GameSocketClient.startSession
 * 
 * Initializes a nodeGame session
 * 
 * Creates a the player and saves it in node.player, and stores the session ids
 * in the session object (GameSocketClient.session)
 * 
 * @param {GameMsg} msg A game-msg
 * @return {boolean} TRUE, if session was correctly initialized
 * 
 * 	@see GameSocketClient.createPlayer
 */
GameSocketClient.prototype.startSession = function (msg) {
	var player = {
			id:		msg.data,	
			sid: 	msg.data
	};
	this.createPlayer(player);
	session = msg.session;
	return true;
};

/**
 * ### GameSocketClient.restoreSession
 * 
 * Restores a session object
 * 
 * @param {object} session A session object as loaded by GameSocketClient.getSession
 * 
 * 
 * 	@emit NODEGAME_RECOVERY
 * 	@emit LOADED
 * 
 * 	@see GameSocketClient.createPlayer
 * 	@see node.session
 */
GameSocketClient.prototype.restoreSession = function (sessionObj, sid) {
	if (!sessionObj) return;
	
	var log_prefix = 'nodeGame session recovery: ';
	
	node.log('Starting session recovery ' + sid, 'INFO', log_prefix);
	node.emit('NODEGAME_RECOVERY', sid);
	
	sid = sid || sessionObj.player.sid;
	
	this.session = sessionObj.id;
	
	// Important! The new socket.io ID
	session.player.sid = sid;

	this.createPlayer(session.player);
	node.game.memory = session.memory;
	node.goto(session.state);
	
	if (!sessionObj.history) {
		node.log('No event history was found to recover', 'WARN', log_prefix);
		return true;
	}
	
	node.log('Recovering ' + session.history.length + ' events', 'DEBUG', log_prefix);
	
	node.events.history.importDB(session.history);
	var hash = new GameState(session.state).toHash('S.s.r'); 
	if (!node.events.history.state) {
		node.log('No old events to re-emit were found during session recovery', 'DEBUG', log_prefix);
		return true; 
	}
	if (!node.events.history.state[hash]){
		node.log('The current state ' + hash + ' has no events to re-emit', 'DEBUG', log_prefix);
		return true; 
	}
	
	var discard = ['LOG', 
	               'STATECHANGE',
	               'WINDOW_LOADED',
	               'BEFORE_LOADING',
	               'LOADED',
	               'in.say.STATE',
	               'UPDATED_PLIST',
	               'NODEGAME_READY',
	               'out.say.STATE',
	               'out.set.STATE',
	               'in.say.PLIST',
	               'STATEDONE', // maybe not here
	               'out.say.HI'
		               
	];
	
	var to_remit = node.events.history.state[hash];
	to_remit.select('event', 'in', discard).remove();
	
	if (!to_remit.length){
		node.log('The current state ' + hash + ' has no valid events to re-emit', 'DEBUG', log_prefix);
		return true;
	}
	
	var remit = function () {
		node.log('Re-emitting ' + to_remit.length + ' events', 'DEBUG', log_prefix);
		// We have events that were fired at the state when 
		// disconnection happened. Let's fire them again 
		to_remit.each(function(e) {
			// Falsy, should already been discarded
			if (!JSUS.in_array(e.event, discard)) {
				node.emit(e.event, e.p1, e.p2, e.p3);
			}
		});
	};
	
	if (node.game.isReady()) {
		remit.call(node.game);
	}
	else {
		node.on('LOADED', function(){
			remit.call(node.game);
		});
	}
	
	return true;
};

/**
 * ### GameSocketClient.createPlayer
 * 
 * Mixes in default properties for the player object and
 * additional configuration variables from node.conf.player
 * 
 * Writes the node.player object
 * 
 * Properties: `id`, `sid`, `ip` can never be overwritten.
 * 
 * Properties added as local configuration cannot be further
 * modified during the game. 
 * 
 * Only the property `name`, can be changed.
 * 
 */
GameSocketClient.prototype.createPlayer = function (player) {	
	player = new Player(player);
	
	if (node.conf && node.conf.player) {			
		var pconf = node.conf.player;
		for (var key in pconf) {
			if (pconf.hasOwnProperty(key)) {
				if (JSUS.in_array(key, ['id', 'sid', 'ip'])) {
					continue;
				} 
				
				// Cannot be overwritten properties previously 
				// set in other sessions (recovery)
//				if (player.hasOwnProperty(key)) {
//					continue;
//				}
				if (node.support.defineProperty) {
					Object.defineProperty(player, key, {
				    	value: pconf[key],
				    	enumerable: true
					});
				}
				else {
					player[key] = pconf[key];
				}
			}
		}
	}
	if (node.support.defineProperty) {
		Object.defineProperty(node, 'player', {
	    	value: player,
	    	enumerable: true
		});
	}
	else {
		node.player = player;
	}
	return player;
};

/**
 * ### GameSocketClient.connect
 * 
 * Initializes the connection to a nodeGame server
 * 
 * 
 * 
 * @param {object} conf A configuration object
 */
GameSocketClient.prototype.connect = function (conf) {
	conf = conf || {};
	if (!conf.url) {
		node.log('cannot connect to empty url.', 'ERR');
		return false;
	}
	
	this.url = conf.url;
	
	node.log('connecting to ' + conf.url);
	this.io = io.connect(conf.url, conf.io);
    this.attachFirstListeners(this.io);
    return this.io;
};

// ## I/O Functions


var logSecureParseError = function (text, e) {
	text = text || 'Generic error while parsing a game message';
	var error = (e) ? text + ": " + e : text;
	node.log(error, 'ERR');
	node.emit('LOG', 'E: ' + error);
	return false;
}

/**
 * ### GameSocketClient.secureParse
 * 
 * Parse the message received in the Socket
 * 
 * @param {object|GameMsg} msg The game-message to parse
 * @return {GameMsg|boolean} The parsed GameMsg object, or FALSE if an error occurred
 *  
 */
GameSocketClient.prototype.secureParse = function (msg) {
	
	var gameMsg;
	try {
		gameMsg = GameMsg.clone(JSON.parse(msg));
		node.info(gameMsg, 'R: ');
	}
	catch(e) {
		return logSecureParseError('Malformed msg received',  e);
	}
	
	if (this.session && gameMsg.session !== this.session) {
		return logSecureParseError('Local session id does not match incoming message session id');
	}
	
	return gameMsg;
};

/**
 * ### GameSocketClient.clearBuffer
 * 
 * Emits and removes all the events in the message buffer
 * 
 * 	@see node.emit
 */
GameSocketClient.prototype.clearBuffer = function () {
	var nelem = buffer.length;
	for (var i=0; i < nelem; i++) {
		var msg = this.buffer.shift();
		if (msg) {
			node.emit(msg.toInEvent(), msg);
			node.log('Debuffered ' + msg, 'DEBUG');
		}
	}
};

/**
 * ### GameSocketClient.attachFirstListeners
 *
 * Initializes the socket to wait for a HI message from the server
 * 
 * Nothing is done until the SERVER send an HI msg. All the others msgs will
 * be ignored otherwise.
 * 
 * @param {object} socket The socket.io socket
 */
GameSocketClient.prototype.attachFirstListeners = function (socket) {
	
	var that = this;
	
	socket.on('connect', function (msg) {
		var connString = 'nodeGame: connection open';
	    node.log(connString); 
	    
	    socket.on('message', function (msg) {	
	    	
	    	var msg = that.secureParse(msg);
	    	
	    	if (msg) { // Parsing successful
				if (msg.target === 'HI') {

					// Setting global info
					that.servername = msg.from;
					// Keep serverid = msg.from for now
					that.serverid = msg.from;
					
					var sessionObj = that.getSession(msg);
					
					if (sessionObj) {
						that.restoreSession(sessionObj, socket.id);
						
						// Get Ready to play
						that.attachMsgListeners(socket, msg.session);
						
						var msg = node.msg.create({
							action: GameMsg.actions.SAY,
							target: 'HI_AGAIN',
							data: node.player
						});
//							console.log('HI_AGAIN MSG!!');
//							console.log(msg);
						that.send(msg);
						
					}
					else {
						that.startSession(msg);
						// Get Ready to play
						that.attachMsgListeners(socket, msg.session);
						
						// Send own name to SERVER
						that.sendHI(node.player, 'ALL');
					}
					

					// Ready to play
					node.emit('out.say.HI');
			   	 } 
	    	}
	    });
	    
	});
	
    socket.on('disconnect', function() {
    	// Save the current state of the game
    	node.session.store();
    	node.log('closed');
    });
};

/**
 * ### GameSocketClient.attachMsgListeners
 * 
 * Attaches standard message listeners
 * 
 * This method is called after the client has received a valid HI message from
 * the server, and a session number has been issued
 * 
 * @param {object} socket The socket.io socket
 * @param {number} session The session id issued by the server
 * 
 * @emit NODEGAME_READY
 */
GameSocketClient.prototype.attachMsgListeners = function (socket, session) {   
	var that = this;
	
	node.log('Attaching FULL listeners');
	socket.removeAllListeners('message');
		
	socket.on('message', function(msg) {
		var msg = that.secureParse(msg);
		
		if (msg) { // Parsing successful
			// Wait to fire the msgs if the game state is loading
			if (node.game && node.game.isReady()) {	
				node.emit(msg.toInEvent(), msg);
			}
			else {
				node.log('Buffering: ' + msg, 'DEBUG');
				buffer.push(msg);
			}
		}
	});
	
	node.emit('NODEGAME_READY');
};

// ## SEND methods

/**
 * ### GameSocketClient.sendHI
 * 
 * Creates a HI message and pushes it into the socket
 *   
 * @param {string} from Optional. The message sender. Defaults node.player
 * @param {string} to Optional. The recipient of the message. Defaults 'SERVER'
 * 
 */
GameSocketClient.prototype.sendHI = function (from, to) {
	from = from || node.player;
	to = to || 'SERVER';
	var msg = node.msg.createHI(from, to);
	this.send(msg);
};

/**
 * ### GameSocketClient.sendSTATE
 * 
 * Creates a STATE message and pushes it into the socket
 * 
 * @param {string} action A nodeGame action (e.g. 'get' or 'set')
 * @param {GameState} state The GameState object to send
 * @param {string} to Optional. The recipient of the message.
 * 
 * 	@see GameMsg.actions
 */
GameSocketClient.prototype.sendSTATE = function (action, state, to) {	
	var msg = node.msg.createSTATE(action, state, to);
	this.send(msg);
};

/**
 * ### GameSocketClient.sendTXT
 *
 * Creates a TXT message and pushes it into the socket
 * 
 * @param {string} text Text to send
 * @param {string} to Optional. The recipient of the message
 */
GameSocketClient.prototype.sendTXT = function(text, to) {	
	var msg = node.msg.createTXT(text,to);
	this.send(msg);
};

/**
 * ### GameSocketClient.sendDATA
 * 
 * Creates a DATA message and pushes it into the socket
 * 
 * @param {string} action Optional. A nodeGame action (e.g. 'get' or 'set'). Defaults 'say'
 * @param {object} data An object to exchange
 * @param {string} to Optional. The recipient of the message. Defaults 'SERVER'
 * @param {string} text Optional. A descriptive text associated to the message.
 * 
 * 	@see GameMsg.actions
 * 
 * @TODO: invert parameter order: first data then action
 */
GameSocketClient.prototype.sendDATA = function (action, data, to, text) {
	action = action || GameMsg.say;
	to = to || 'SERVER';
	text = text || 'DATA';
	var msg = node.msg.createDATA(action, data, to, text);
	this.send(msg);
};

/**
 * ### GameSocketClient.send
 * 
 * Pushes a message into the socket.
 * 
 * The msg is actually received by the client itself as well.
 * 
 * @param {GameMsg} The game message to send
 * 
 * 	@see GameMsg
 * 
 * @TODO: Check Do volatile msgs exist for clients?
 */
GameSocketClient.prototype.send = function (msg) {

	// if (msg.reliable) {
		this.io.send(msg.stringify());
	// }
	// else {
	// this.io.volatile.send(msg.stringify());
	// }
	node.log('S: ' + msg);
	node.emit('LOG', 'S: ' + msg.toSMS());
};

})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
  , 'undefined' != typeof io ? io : module.parent.exports.io
);
/**
 * # GameDB
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * ### Provides a simple, lightweight NO-SQL database for nodeGame
 * 
 * Entries are stored as GameBit messages.
 * 
 * It automatically creates three indexes.
 * 
 * 1. by player,
 * 2. by state,
 * 3. by key.
 * 
 * Uses GameState.compare to compare the state property of each entry.
 * 
 * 	@see GameBit
 * 	@see GameState.compare
 * 
 * ---
 * 
 */
(function (exports, node) {

// ## Global scope	
var JSUS = node.JSUS,
	NDDB = node.NDDB;
	
var GameState = node.GameState;

// Inheriting from NDDB	
GameDB.prototype = JSUS.clone(NDDB.prototype);
GameDB.prototype.constructor = GameDB;


// Expose constructors
exports.GameDB = GameDB;
exports.GameBit = GameBit;

/**
 * ## GameDB constructor 
 *
 * Creates an instance of GameDB
 * 
 * @param {object} options Optional. A configuration object
 * @param {array} db Optional. An initial array of items to import into the database
 * @param {NDDB|GameDB} parent Optional. A reference to the parent database
 * 
 * 	@see NDDB constructor 
 */

function GameDB (options, db, parent) {
	options = options || {};
	
	
	if (!options.update) options.update = {};
	// Auto build indexes by default
	options.update.indexes = true;
	
	NDDB.call(this, options, db, parent);
	
	this.c('state', GameBit.compareState);
	  
	
	if (!this.player) {
		this.h('player', function(gb) {
			return gb.player;
		});
	}
	if (!this.state) {
		this.h('state', function(gb) {
			return GameState.toHash(gb.state, 'S.s.r');
		});
	}  
	if (!this.key) {
		this.h('key', function(gb) {
			return gb.key;
		});
	}
	
}

// ## GameDB methods

/**
 * ### GameDB.add
 * 
 * Creates a GameBit and adds it to the database
 * 
 * @param {string} key An alphanumeric id for the entry
 * @param {mixed} value Optional. The value to store
 * @param {Player} player Optional. The player associated to the entry. Defaults, node.player
 * @param {GameState} player Optional. The state associated to the entry. Defaults, node.game.state
 * 
 * @return {boolean} TRUE, if insertion was successful
 * 
 * 	@see GameBit
 */
GameDB.prototype.add = function (key, value, player, state) {
	if (!key) return false;
	
	state = state || node.game.state;
	player = player || node.player;

	this.insert(new GameBit({
						player: player, 
						key: key,
						value: value,
						state: state
	}));

	return true;
};

/**
 * # GameBit
 * 
 * ### Container of relevant information for the game
 * 
 *  ---
 *  
 * A GameBit unit always contains the following properties
 * 
 * - state GameState
 * - player Player
 * - key 
 * - value
 * - time 
 */

// ## GameBit methods

/**
 * ### GameBit constructor
 * 
 * Creates a new instance of GameBit
 */
function GameBit (options) {
	
	this.state = options.state;
	this.player = options.player;
	this.key = options.key;
	this.value = options.value;
	this.time = (Date) ? Date.now() : null;
};


/**
 * ### GameBit.toString
 * 
 * Returns a string representation of the instance of GameBit
 * 
 * @return {string} string representation of the instance of GameBit
 */
GameBit.prototype.toString = function () {
	return this.player + ', ' + GameState.stringify(this.state) + ', ' + this.key + ', ' + this.value;
};

/** 
 * ### GameBit.equals (static)
 * 
 * Compares two GameBit objects
 * 
 * Returns TRUE if the attributes of `player`, `state`, and `key`
 * are identical. 
 *  
 * If the strict parameter is set, also the `value` property 
 * is used for comparison
 *  
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * @param {boolean} strict Optional. If TRUE, compares also the `value` property
 * 
 * @return {boolean} TRUE, if the two objects are equals
 * 
 * 	@see GameBit.comparePlayer
 * 	@see GameBit.compareState
 * 	@see GameBit.compareKey
 * 	@see GameBit.compareValue
 */
GameBit.equals = function (gb1, gb2, strict) {
	if (!gb1 || !gb2) return false;
	strict = strict || false;
	if (GameBit.comparePlayer(gb1, gb2) !== 0) return false;
	if (GameBit.compareState(gb1, gb2) !== 0) return false;
	if (GameBit.compareKey(gb1, gb2) !== 0) return false;
	if (strict && gb1.value && GameBit.compareValue(gb1, gb2) !== 0) return false;
	return true;	
};

/**
 * ### GameBit.comparePlayer (static)
 * 
 * Sort two game-bits by player numerical id
 * 
 * Returns a numerical id that can assume the following values
 * 
 * - `-1`: the player id of the second game-bit is larger 
 * - `1`: the player id of the first game-bit is larger
 * - `0`: the two gamebits belong to the same player
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 */
GameBit.comparePlayer = function (gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (gb1.player === gb2.player) return 0;

	if (gb1.player > gb2.player) return 1;
	return -1;
};

/**
 * ### GameBit.compareState (static)
 * 
 * Sort two game-bits by their state property
 * 
 * GameState.compare is used for comparison
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 * 
 * 	@see GameState.compare
 */
GameBit.compareState = function (gb1, gb2) {
	return GameState.compare(gb1.state, gb2.state);
};

/**
 * ### GameBit.compareKey (static)
 * 
 * 	Sort two game-bits by their key property 
 * 
 * Returns a numerical id that can assume the following values
 * 
 * - `-1`: the key of the first game-bit comes first alphabetically  
 * - `1`: the key of the second game-bit comes first alphabetically 
 * - `0`: the two gamebits have the same key
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 */
GameBit.compareKey = function (gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (gb1.key === gb2.key) return 0;
	if (gb1.key < gb2.key) return -1;
	return 1;
};

/**
 * ### GameBit.compareValue (static)
 *  
 * Sorts two game-bits by their value property
 * 
 * Uses JSUS.equals for equality. If they differs, 
 * further comparison is performed, but results will be inaccurate
 * for objects. 
 * 
 * Returns a numerical id that can assume the following values
 * 
 * - `-1`: the value of the first game-bit comes first alphabetically / numerically
 * - `1`: the value of the second game-bit comes first alphabetically / numerically 
 * - `0`: the two gamebits have identical value properties
 * 
 * @param {GameBit} gb1 The first game-bit to compare
 * @param {GameBit} gb2 The second game-bit to compare
 * 
 * @return {number} The result of the comparison
 * 
 * 	@see JSUS.equals
 */
GameBit.compareValue = function (gb1, gb2) {
	if (!gb1 && !gb2) return 0;
	if (!gb1) return 1;
	if (!gb2) return -1;
	if (JSUS.equals(gb1.value, gb2.value)) return 0;
	if (gb1.value > gb2.value) return 1;
	return -1;
};	

// ## Closure
	
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # Game
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 *
 * Wrapper class for a `GameLoop` object and functions to control the game flow
 * 
 * Defines a number of event listeners, diveded in
 * 	
 * - incoming,
 * - outgoing,
 * - internal 
 *  
 *  ---
 *  
 */
	
(function (exports, node) {
	
// ## Global scope
	
var GameState = node.GameState,
	GameMsg = node.GameMsg,
	GameDB = node.GameDB,
	PlayerList = node.PlayerList,
	Player = node.Player,
	GameLoop = node.GameLoop,
	JSUS = node.JSUS;


exports.Game = Game;

var name,
	description,
	gameLoop,
	pl,
	ml;
	

/**
 * ## Game constructor
 * 
 * Creates a new instance of Game
 * 
 * @param {object} settings Optional. A configuration object
 */
function Game (settings) {
	settings = settings || {};

// ## Private properties

/**
 * ### Game.name
 * 
 * The name of the game
 * 
 * @api private
 */
	name = settings.name || 'A nodeGame game';
	
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'name', {
			value: name,
			enumerable: true
		});
	}
	else {
		this.name = name;
	}

/**
 * ### Game.description
 * 
 * A text describing the game
 * 
 * @api private
 */
	description = settings.description || 'No Description';
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'description', {
			value: description,
			enumerable: true
		});
	}
	else {
		this.description = description;
	}

/**
 * ### Game.gameLoop
 * 
 * An object containing the game logic 
 * 
 * @see GameLoop
 * @api private
 */
	// <!-- support for deprecated options loops -->
	gameLoop = new GameLoop(settings.loop || settings.loops);
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'gameLoop', {
			value: gameLoop,
			enumerable: true
		});
	}
	else {
		this.gameLoop = gameLoop;
	}
	
/**
 * ### Game.pl
 * 
 * The list of players connected to the game
 * 
 * The list may be empty, depending on the server settings
 * 
 * @api private
 */
	pl = new PlayerList();
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'pl', {
			value: pl,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	else {
		this.pl = pl;
	}

/**
 * ### Game.pl
 * 
 * The list of monitor clients connected to the game
 * 
 * The list may be empty, depending on the server settings
 * 
 * @api private
 */
	ml = new PlayerList();
	if (node.support.defineProperty) {
		Object.defineProperty(this, 'ml', {
			value: pl,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	else {
		this.ml = ml;
	}
	
/**
 * ### Game.ready
 * 
 * If TRUE, the nodeGame engine is fully loaded
 * 
 * Shortcut to game.isReady
 * 
 * If the browser does not support the method object setters,
 * this property is disabled, and Game.isReady() should be used
 * instead.
 * 
 * @see Game.isReady();
 * 
 * @api private
 * @deprecated
 * 
 */
	if (node.support.getter) {
		Object.defineProperty(this, 'ready', {
			set: function(){},
			get: this.isReady,
			enumerable: true
		});
	}
	else {
		this.ready = null;
	}



// ## Public properties

/**
 * ### Game.observer
 * 
 * If TRUE, silently observes the game. Defaults FALSE
 * 
 * An nodeGame observer will not send any automatic notification
 * to the server, but it will just *observe* the game played by
 * other clients.
 * 
 */
	this.observer = ('undefined' !== typeof settings.observer) ? settings.observer 
		   													: false;

/**
 * ### Game.auto_step
 * 
 * If TRUE, automatically advances to the next state if all the players 
 * have completed the same state
 * 
 * After a successful STATEDONE event is fired, the client will automatically 
 * goes to the next function in the game-loop without waiting for a STATE
 * message from the server. 
 * 
 * Depending on the configuration settings, it can still perform additional
 * checkings (e.g.wheter the mininum number of players is connected) 
 * before stepping to the next state.
 * 
 * Defaults: true
 * 
 */
	this.auto_step = ('undefined' !== typeof settings.auto_step) ? settings.auto_step 
															 : true;

/**
 * ### Game.auto_wait
 * 
 * If TRUE, fires a WAITING... event immediately after a successful DONE event
 * 
 * Under default settings, the WAITING... event temporarily prevents the user
 * to access the screen and displays a message to the player.
 * 
 * Defaults: FALSE
 * 
 */
	this.auto_wait = ('undefined' !== typeof settings.auto_wait) ? settings.auto_wait 
																 : false; 

/**
 * ### Game.solo_mode
 * 
 * If TRUE, automatically advances to the next state upon completion of a state
 * 
 * After a successful DONE event is fired, the client will automatically 
 * goes to the next function in the game-loop without waiting for a STATE
 * message from the server, or checking the STATE of the other players. 
 * 
 * Defaults: FALSE
 * 
 */
	this.solo_mode = ('undefined' !== typeof settings.solo_mode) ? settings.solo_mode 
															 : false;	
	// TODO: check this
	this.minPlayers = settings.minPlayers || 1;
	this.maxPlayers = settings.maxPlayers || 1000;
	
	if (settings.init) {
		this.init = settings.init;
	}

/**
 * ### Game.memory
 * 
 * A storage database for the game
 * 
 * In the server logic the content of SET messages are
 * automatically inserted in this object
 * 
 * 	@see node.set
 */
	this.memory = new GameDB();
	
	this.player = null;	
	this.state = new GameState();

} // <!-- ends constructor -->

// ## Game methods

/** 
 * ### Game.init
 * 
 * Initialization function
 * 
 * This function is called as soon as the game is instantiated,
 * i.e. at state 0.0.0. All event listeners declared here will
 * stay valid throughout the game.
 * 
 */
Game.prototype.init = function () {};

/**
 * ### Game.pause
 * 
 * Experimental. Sets the game to pause
 * 
 * @TODO: check with Game.ready
 */
Game.prototype.pause = function () {
	this.state.paused = true;
};

/**
 * ### Game.resume
 * 
 * Experimental. Resumes the game from a pause
 * 
 * @TODO: check with Game.ready
 */
Game.prototype.resume = function () {
	this.state.paused = false;
};

/**
 * ### Game.next
 * 
 * Fetches a state from the game-loop N steps ahead
 * 
 * Optionally, a parameter can control the number of steps to take
 * in the game-loop before returning the state
 * 
 * @param {number} N Optional. The number of steps to take in the game-loop. Defaults 1
 * @return {boolean|GameState} The next state, or FALSE if it does not exist
 * 
 * 	@see GameState
 * 	@see Game.gameLoop
 */
Game.prototype.next = function (N) {
	if (!N) return this.gameLoop.next(this.state);
	return this.gameLoop.jumpTo(this.state, Math.abs(N));
};

/**
 * ### Game.previous
 * 
 * Fetches a state from the game-loop N steps back
 * 
 * Optionally, a parameter can control the number of steps to take
 * backward in the game-loop before returning the state
 * 
 * @param {number} times Optional. The number of steps to take in the game-loop. Defaults 1
 * @return {boolean|GameState} The previous state, or FALSE if it does not exist
 * 
 * 	@see GameState
 * 	@see Game.gameLoop
 */
Game.prototype.previous = function (N) {
	if (!N) return this.gameLoop.previous(this.state);
	return this.gameLoop.jumpTo(this.state, -Math.abs(N));
};

/**
 * ### Game.jumpTo
 * 
 * Moves the game forward or backward in the game-loop
 * 
 * Optionally, a parameter can control the number of steps to take
 * in the game-loop before executing the next function. A negative 
 * value jumps backward in the game-loop, and a positive one jumps
 * forward in the game-loop
 * 
 * @param {number} jump  The number of steps to take in the game-loop
 * @return {boolean} TRUE, if the game succesfully jumped to the desired state
 * 
 * 	@see GameState
 * 	@see Game.gameLoop
 */
Game.prototype.jumpTo = function (jump) {
	if (!jump) return false;
	var gs = this.gameLoop.jumpTo(this.state, jump);
	if (!gs) return false;
	return this.updateState(gs);
};

/**
 * ### Game.publishState
 * 
 * Notifies internal listeners, the server and other connected clients 
 * of the current game-state
 * 
 * If the *observer* flag is set, external notification is inhibited, 
 * but the STATECHANGE event is emitted anyway 
 * 
 * @emit STATECHANGE
 * 
 * @see GameState
 * @see	Game.observer
 */
Game.prototype.publishState = function() {
	// <!-- Important: SAY -->
	if (!this.observer) {
		var stateEvent = GameMsg.OUT + GameMsg.actions.SAY + '.STATE'; 
		node.emit(stateEvent, this.state, 'ALL');
	}
	
	node.emit('STATECHANGE');
	
	node.log('New State = ' + new GameState(this.state), 'DEBUG');
};

/**
 * ### Game.updateState
 * 
 * Updates the game to the specified game-state
 * 
 * @param {GameState} state The state to load and run
 * 
 * @emit BEFORE_LOADING
 * @emit LOADED
 * @emit TXT
 */
Game.prototype.updateState = function (state) {
	
	node.log('New state is going to be ' + new GameState(state), 'DEBUG');
	
	if (this.step(state) !== false) {
		this.paused = false;
		this.state.is =  GameState.iss.LOADED;
		if (this.isReady()) {
			node.emit('LOADED');
		}
	}		
	else {
		node.log('Error in stepping', 'ERR');
		// TODO: implement sendERR
		node.emit('TXT','State was not updated');
	}
};

/**
 * ### Game.step
 * 
 * Retrieves from the game-loop and executes the function for the 
 * specified game-state
 * 
 * @param {GameState} gameState Optional. The GameState to run
 * @return {Boolean} FALSE, if the execution encountered an error
 * 
 * 	@see Game.gameLoop
 * 	@see GameState
 */
Game.prototype.step = function (gameState) {
	
	gameState = gameState || this.next();
	if (gameState) {
		
		var func = this.gameLoop.getFunction(gameState);
		
		// Experimental: node.window should load the func as well
//			if (node.window) {
//				var frame = this.gameLoop.getAllParams(gameState).frame;
//				node.window.loadFrame(frame);
//			}
		
		
		
		if (func) {
			// Local Listeners from previous state are erased 
			// before proceeding to next one
			node.events.clearState(this.state);
			
			gameState.is = GameState.iss.LOADING;
			this.state = gameState;
		
			// This could speed up the loading in other client,
			// but now causes problems of multiple update
			this.publishState();
					
			return func.call(node.game);
		}
	}
	return false;
};

/**
 * ### Game.isReady
 * 
 * Returns TRUE if the nodeGame engine is fully loaded
 * 
 * During stepping between functions in the game-loop
 * the flag is temporarily turned to FALSE, and all events 
 * are queued and fired only after nodeGame is ready to 
 * handle them again.
 * 
 * If the browser does not support the method object setters,
 * this property is disabled, and Game.isReady() should be used
 * instead.
 * 
 * @see Game.ready;
 * 
 */
Game.prototype.isReady = function() {
	if (this.state.is < GameState.iss.LOADED) return false;
	
	// Check if there is a gameWindow obj and whether it is loading
	if (node.window) {	
		return (node.window.state >= GameState.iss.LOADED) ? true : false;
	}
	return true;
};

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * # nodeGame
 * 
 * Copyright(c) 2012 Stefano Balietti MIT Licensed
 * 
 * ### nodeGame: Web Experiments in the Browser
 * 
 * *nodeGame* is a free, open source, event-driven javascript framework for on
 * line, multiplayer games in the browser.
 */
(function (node) {
	
	// Declaring variables
	// //////////////////////////////////////////
		
	var EventEmitter = node.EventEmitter,
		GameSocketClient = node.GameSocketClient,
		GameState = node.GameState,
		GameMsg = node.GameMsg,
		Game = node.Game,
		Player = node.Player,
		GameSession = node.GameSession;
	
	
	// Adding constants directly to node
	// ////////////////////////////////////////
	
	node.actions 	= GameMsg.actions;
	node.IN 		= GameMsg.IN;
	node.OUT 		= GameMsg.OUT;
	node.targets 	= GameMsg.targets;		
	node.states 	= GameState.iss;
	
	// Creating EventEmitter
	// /////////////////////////////////////////
	
	node.events = new EventEmitter();


	// Creating objects
	// /////////////////////////////////////////
	
	node.msg	= node.GameMsgGenerator;	
	node.socket = node.gsc = new GameSocketClient();
	
	node.env = function (env, func, ctx, params) {
		if (!env || !func || !node.env[env]) return;
		ctx = ctx || node;
		params = params || [];
		func.apply(ctx, params);
	};
	
	// Adding methods
	// /////////////////////////////////////////
	
	/**
	 * Parses the a node configuration object and add default and missing
	 * values. Stores the final configuration in node.conf.
	 * 
	 */
	node._analyzeConf = function (conf) {
		if (!conf) {
			node.log('Invalid configuration object found.', 'ERR');
			return false;
		}
		
		// URL
		if (!conf.host) {
			if ('undefined' !== typeof window) {
				if ('undefined' !== typeof window.location) {
					var host = window.location.href;
				}
			}
			else {
				var host = conf.url;
			}
			if (host) {
				var tokens = host.split('/').slice(0,-2);
				// url was not of the form '/channel'
				if (tokens.length > 1) {
					conf.host = tokens.join('/');
				}
			}
		}
		
		
		// Add a trailing slash if missing
		if (conf.host && conf.host.lastIndexOf('/') !== host.length) {
			conf.host = conf.host + '/';
		}
		
		// VERBOSITY
		if ('undefined' !== typeof conf.verbosity) {
			node.verbosity = conf.verbosity;
		}
		
		
		// Environments
		if ('undefined' !== typeof conf.env) {
			for (var i in conf.env) {
				if (conf.env.hasOwnProperty(i)) {
					node.env[i] = conf.env[i];
				}
			}
		}
		
		if (!conf.events) { conf.events = {}; };
		
		if ('undefined' === conf.events.history) {
			conf.events.history = false;
		}
		
		if ('undefined' === conf.events.dumpEvents) {
			conf.events.dumpEvents = false;
		}
		
		this.conf = conf;
		return conf;
	};
	
	
	node.on = function (event, listener) {
		// It is in the init function;
		if (!node.game || !node.game.state || (GameState.compare(node.game.state, new GameState(), true) === 0 )) {
			node.events.add(event, listener);
			// node.log('global');
		}
		else {
			node.events.addLocal(event, listener);
			// node.log('local');
		}
	};
	
	node.once = function (event, listener) {
		node.on(event, listener);
		node.on(event, function(event, listener) {
			node.events.remove(event, listener);
		});
	};
	
	node.removeListener = function (event, func) {
		return node.events.remove(event, func);
	};
	
	// TODO: create conf objects
	node.connect = node.play = function (conf, game) {	
		node._analyzeConf(conf);
		
		// node.socket.connect(conf);
		
		node.game = new Game(game);
		node.emit('NODEGAME_GAME_CREATED');
		
		
		// INIT the game
		node.game.init.call(node.game);
		node.socket.connect(conf); // was node.socket.setGame(node.game);
		
		node.log('game loaded...');
		node.log('ready.');
	};	
	
// node.observe = function (conf, game) {
// node._analyzeConf(conf);
//		
// var game = game || {loops: {1: {state: function(){}}}};
// node.socket = that.gsc = new GameSocketClient(conf);
//		
// node.game = that.game = new Game(game, that.gsc);
// node.socket.setGame(that.game);
//		
// node.on('NODEGAME_READY', function(){
//			
// // Retrieve the game and set is as observer
// node.get('LOOP', function(game) {
//				
// // alert(game);
// // console.log('ONLY ONE');
// // console.log(game);
// // var game = game.observer = true;
// // node.game = that.game = game;
// //
// // that.game.init();
// //
// // that.gsc.setGame(that.game);
// //
// // node.log('nodeGame: game loaded...');
// // node.log('nodeGame: ready.');
// });
// });
		
		
// node.onDATA('GAME', function(data){
// alert(data);
// console.log(data);
// });
		
// node.on('DATA', function(msg){
// console.log('--------->Eh!')
// console.log(msg);
// });
// };
	
	node.emit = function (event, p1, p2, p3) {	
		node.events.emit(event, p1, p2, p3);
	};	
	
	node.say = function (data, what, whom) {
		node.events.emit('out.say.DATA', data, whom, what);
	};
	
/**
 * ### node.set
 * 
 * Store a key, value pair in the server memory
 * 
 * @param {string} key An alphanumeric (must not be unique)
 * @param {mixed} The value to store (can be of any type)
 * 
 */
	node.set = function (key, value) {
		// TODO: parameter to say who will get the msg
		node.events.emit('out.set.DATA', value, null, key);
	};
	
	
	node.get = function (key, func) {
		node.events.emit('out.get.DATA', key);
		
		var listener = function(msg) {
			if (msg.text === key) {
				func.call(node.game, msg.data);
				node.events.remove('in.say.DATA', listener);
			}
			// node.events.printAll();
		};
		
		node.on('in.say.DATA', listener);
	};

/**
 * ### node.replay
 * 
 * Moves the game state to 1.1.1
 * 
 * @param {boolean} rest TRUE, to erase the game memory before update the game state
 */	
	node.replay = function (reset) {
		if (reset) node.game.memory.clear(true);
		node.goto(new GameState({state: 1, step: 1, round: 1}));
	}

/**
 * ### node.goto
 * 
 * Moves the game to the specified game state
 * 
 * @param {string|GameState} The state to go to
 * 
 */	
	node.goto = function (state) {
		node.game.updateState(state);
	};
	
/**
 * ### node.redirect
 * 
 * Redirects a player to the specified url
 * 
 * Works only if it is a monitor client to send
 * the message, i.e. players cannot redirect each 
 * other.
 * 
 * Examples
 *  
 * 	// Redirect to http://mydomain/mygame/missing_auth
 * 	node.redirect('missing_auth', 'xxx'); 
 * 
 *  // Redirect to external urls
 *  node.redirect('http://www.google.com');
 * 
 * @param {string} url the url of the redirection
 * @param {string} who A player id or 'ALL'
 * @return {boolean} TRUE, if the redirect message is sent
 */	
	node.redirect = function (url, who) {
		if (!url || !who) return false;
		
		var msg = node.msg.create({
			target: node.targets.REDIRECT,
			data: url,
			to: who
		});
		node.socket.send(msg);
		return true;
	};
	
	// *Aliases*
	//
	// Conventions:
	//
	// - Direction:
	// 'in' for all
	//
	// - Target:
	// DATA and TXT are 'say' as default
	// STATE and PLIST are 'set' as default
	
	
	// Sending
		
	
// this.setSTATE = function(action,state,to){
// var stateEvent = GameMsg.OUT + action + '.STATE';
// fire(stateEvent,action,state,to);
// };
	
	// Receiving
	
	// Say
	
	node.onTXT = function(func) {
		node.on("in.say.TXT", function(msg) {
			func.call(node.game,msg);
		});
	};
	
	node.onDATA = function(text, func) {
		node.on('in.say.DATA', function(msg) {
			if (text && msg.text === text) {
				func.call(node.game, msg);
			}
		});
		
		node.on('in.set.DATA', function(msg) {
			if (text && msg.text === text) {
				func.call(node.game, msg);
			}
		});
	};
	
	// Set
	
	node.onSTATE = function(func) {
		node.on("in.set.STATE", function(msg) {
			func.call(node.game, msg);
		});
	};
	
	node.onPLIST = function(func) {
		node.on("in.set.PLIST", function(msg) {
			func.call(node.game, msg);
		});
		
		node.on("in.say.PLIST", function(msg) {
			func.call(node.game, msg);
		});
	};
	
	node.DONE = function (text) {
		node.emit("DONE",text);
	};
	
	node.TXT = function (text, to) {
		node.emit('out.say.TXT', text, to);
	};	
	
	
	node.random = {};
	
	// Generates event at RANDOM timing in milliseconds
	// if timing is missing, default is 6000
	node.random.emit = function (event, timing){
		var timing = timing || 6000;
		setTimeout(function(event) {
			node.emit(event);
		}, Math.random()*timing, event);
	};
	
	node.random.exec = function (func, timing) {
		var timing = timing || 6000;
		setTimeout(function(func) {
			func.call();
		}, Math.random()*timing, func);
	};
		
	node.log(node.version + ' loaded', 'ALWAYS');
	
})('undefined' != typeof node ? node : module.parent.exports);

// ## Game incoming listeners
// Incoming listeners are fired in response to incoming messages
(function (node) {

	if (!node) {
		console.log('nodeGame not found. Cannot add incoming listeners');
		return false;
	}
	
	var GameMsg = node.GameMsg,
		GameState = node.GameState,
		PlayerList = node.PlayerList,
		Player = node.Player;
	
	var say = GameMsg.actions.SAY + '.',
		set = GameMsg.actions.SET + '.',
		get = GameMsg.actions.GET + '.',
		IN  = GameMsg.IN;

	
/**
 * ### in.say.PCONNECT
 * 
 * Adds a new player to the player list from the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.pl 
 */
	node.on( IN + say + 'PCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.pl.add(new Player(msg.data));
		node.emit('UPDATED_PLIST');
		node.game.pl.checkState();
	});	
	
/**
 * ### in.say.PDISCONNECT
 * 
 * Removes a player from the player list based on the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.pl 
 */
	node.on( IN + say + 'PDISCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.pl.remove(msg.data.id);
		node.emit('UPDATED_PLIST');
		node.game.pl.checkState();
	});	

/**
 * ### in.say.MCONNECT
 * 
 * Adds a new monitor to the monitor list from the data contained in the message
 * 
 * @emit UPDATED_PLIST
 * @see Game.ml 
 */
	node.on( IN + say + 'MCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.ml.add(new Player(msg.data));
		node.emit('UPDATED_MLIST');
	});	
		
/**
 * ### in.say.MDISCONNECT
 * 
 * Removes a monitor from the player list based on the data contained in the message
 * 
 * @emit UPDATED_MLIST
 * @see Game.ml 
 */
	node.on( IN + say + 'MDISCONNECT', function (msg) {
		if (!msg.data) return;
		node.game.ml.remove(msg.data.id);
		node.emit('UPDATED_MLIST');
	});		
			

/**
 * ### in.say.PLIST
 * 
 * Creates a new player-list object from the data contained in the message
 * 
 * @emit UPDATED_MLIST
 * @see Game.pl 
 */
node.on( IN + say + 'PLIST', function (msg) {
	if (!msg.data) return;
	node.game.pl = new PlayerList({}, msg.data);
	node.emit('UPDATED_PLIST');
});	
	
/**
 * ### in.say.MLIST
 * 
 * Creates a new monitor-list object from the data contained in the message
 * 
 * @emit UPDATED_MLIST
 * @see Game.pl 
 */
node.on( IN + say + 'MLIST', function (msg) {
	if (!msg.data) return;
	node.game.ml = new PlayerList({}, msg.data);
	node.emit('UPDATED_MLIST');
});	
	
/**
 * ### in.get.DATA
 * 
 * Experimental feature. Undocumented (for now)
 */ 
node.on( IN + get + 'DATA', function (msg) {
	if (msg.text === 'LOOP'){
		node.socket.sendDATA(GameMsg.actions.SAY, node.game.gameLoop, msg.from, 'GAME');
	}
	// <!-- We could double emit
	// node.emit(msg.text, msg.data); -->
});

/**
 * ### in.set.STATE
 * 
 * Adds an entry to the memory object 
 * 
 */
node.on( IN + set + 'STATE', function (msg) {
	node.game.memory.add(msg.text, msg.data, msg.from);
});

/**
 * ### in.set.DATA
 * 
 * Adds an entry to the memory object 
 * 
 */
node.on( IN + set + 'DATA', function (msg) {
	node.game.memory.add(msg.text, msg.data, msg.from);
});

/**
 * ### in.say.STATE
 * 
 * Updates the game state or updates a player's state in
 * the player-list object
 *
 * If the message is from the server, it updates the game state,
 * else the state in the player-list object from the player who
 * sent the message is updated 
 * 
 *  @emit UPDATED_PLIST
 *  @see Game.pl 
 */
	node.on( IN + say + 'STATE', function (msg) {
//		console.log('updateState: ' + msg.from + ' -- ' + new GameState(msg.data), 'DEBUG');
//		console.log(node.game.pl.count())
		
		//console.log(node.socket.serverid + 'AAAAAA');
		if (node.socket.serverid && msg.from === node.socket.serverid) {
//			console.log(node.socket.serverid + ' ---><--- ' + msg.from);
//			console.log('NOT EXISTS');
		}
		
		if (node.game.pl.exist(msg.from)) {
			//console.log('EXIST')
			
			node.game.pl.updatePlayerState(msg.from, msg.data);
			node.emit('UPDATED_PLIST');
			node.game.pl.checkState();
		}
		// <!-- Assume this is the server for now
		// TODO: assign a string-id to the server -->
		else {
			//console.log('NOT EXISTS')
			node.game.updateState(msg.data);
		}
	});
	
/**
 * ### in.say.REDIRECT
 * 
 * Redirects to a new page
 * 
 * @emit REDIRECTING...
 * @see node.redirect
 */
node.on( IN + say + 'REDIRECT', function (msg) {
	if (!msg.data) return;
	if ('undefined' === typeof window || !window.location) {
		node.log('window.location not found. Cannot redirect', 'err');
		return false;
	}
	node.emit('REDIRECTING...', msg.data);
	window.location = msg.data; 
});	
	
	node.log('incoming listeners added');
	
})('undefined' !== typeof node ? node : module.parent.exports); 
// <!-- ends incoming listener -->
// ## Game outgoing listeners

(function (node) {

	if (!node) {
		console.log('nodeGame not found. Cannot add outgoing listeners');
		return false;
	}
	
	var GameMsg = node.GameMsg,
		GameState = node.GameState;
	
	var say = GameMsg.actions.SAY + '.',
		set = GameMsg.actions.SET + '.',
		get = GameMsg.actions.GET + '.',
		OUT  = GameMsg.OUT;
	
/** 
 * ### out.say.HI
 * 
 * Updates the game-state of the game upon connection to a server
 * 
 */
node.on( OUT + say + 'HI', function() {
	// Enter the first state
	if (node.game.auto_step) {
		node.game.updateState(node.game.next());
	}
	else {
		// The game is ready to step when necessary;
		node.game.state.is = GameState.iss.LOADED;
		node.socket.sendSTATE(GameMsg.actions.SAY, node.game.state);
	}
});

/**
 * ### out.say.STATE
 * 
 * Sends out a STATE message to the specified recipient
 * 
 * TODO: check with the server 
 * The message is for informative purpose
 * 
 */
node.on( OUT + say + 'STATE', function (state, to) {
	node.socket.sendSTATE(GameMsg.actions.SAY, state, to);
});	

/**
 * ### out.say.TXT
 * 
 * Sends out a TXT message to the specified recipient
 */
node.on( OUT + say + 'TXT', function (text, to) {
	node.socket.sendTXT(text,to);
});

/**
 * ### out.say.DATA
 * 
 * Sends out a DATA message to the specified recipient
 */
node.on( OUT + say + 'DATA', function (data, to, key) {
	node.socket.sendDATA(GameMsg.actions.SAY, data, to, key);
});

/**
 * ### out.set.STATE
 * 
 * Sends out a STATE message to the specified recipient
 * 
 * TODO: check with the server 
 * The receiver will update its representation of the state
 * of the sender
 */
node.on( OUT + set + 'STATE', function (state, to) {
	node.socket.sendSTATE(GameMsg.actions.SET, state, to);
});

/**
 * ### out.set.DATA
 * 
 * Sends out a DATA message to the specified recipient
 * 
 * The sent data will be stored in the memory of the recipient
 * 
 * 	@see Game.memory
 */
node.on( OUT + set + 'DATA', function (data, to, key) {
	node.socket.sendDATA(GameMsg.actions.SET, data, to, key);
});

/**
 * ### out.get.DATA
 * 
 * Issues a DATA request
 * 
 * Experimental. Undocumented (for now)
 */
node.on( OUT + get + 'DATA', function (data, to, key) {
	node.socket.sendDATA(GameMsg.actions.GET, data, to, data);
});
	
node.log('outgoing listeners added');

})('undefined' !== typeof node ? node : module.parent.exports); 
// <!-- ends outgoing listener -->
// ## Game internal listeners

// Internal listeners are not directly associated to messages,
// but they are usually responding to internal nodeGame events, 
// such as progressing in the loading chain, or finishing a game state 

(function (node) {

	if (!node) {
		console.log('nodeGame not found. Cannot add internal listeners');
		return false;
	}
	
	var GameMsg = node.GameMsg,
		GameState = node.GameState;
	
	var say = GameMsg.actions.SAY + '.',
		set = GameMsg.actions.SET + '.',
		get = GameMsg.actions.GET + '.',
		IN  = GameMsg.IN,
		OUT = GameMsg.OUT;
	
/**
 * ### STATEDONE
 * 
 * Fired when all the players in the player list have their
 * state set to DONE
 */ 
node.on('STATEDONE', function() {
	
	// In single player mode we ignore when all the players have completed the state
	if (node.game.solo_mode) {
		return;
	}
	
	// <!-- If we go auto -->
	if (node.game.auto_step && !node.game.observer) {
		node.log('We play AUTO', 'DEBUG');
		var morePlayers = ('undefined' !== node.game.minPlayers) ? node.game.minPlayers - node.game.pl.count() : 0 ;
		node.log('Additional player required: ' + morePlayers > 0 ? MorePlayers : 0, 'DEBUG');
		
		if (morePlayers > 0) {
			node.emit('OUT.say.TXT', morePlayers + ' player/s still needed to play the game');
			node.log(morePlayers + ' player/s still needed to play the game');
		}
		// TODO: differentiate between before the game starts and during the game
		else {
			node.emit('OUT.say.TXT', node.game.minPlayers + ' players ready. Game can proceed');
			node.log(node.game.pl.count() + ' players ready. Game can proceed');
			node.game.updateState(node.game.next());
		}
	}
	else {
		node.log('Waiting for monitor to step', 'DEBUG');
	}
});

/**
 * ### DONE
 * 
 * Updates and publishes that the client has successfully terminated a state 
 * 
 * If a DONE handler is defined in the game-loop, it will executes it before
 * continuing with further operations. In case it returns FALSE, the update
 * process is stopped. 
 * 
 * @emit BEFORE_DONE
 * @emit WAITING...
 */
node.on('DONE', function(p1, p2, p3) {
	
	// Execute done handler before updatating state
	var ok = true;
	var done = node.game.gameLoop.getAllParams(node.game.state).done;
	
	if (done) ok = done.call(node.game, p1, p2, p3);
	if (!ok) return;
	node.game.state.is = GameState.iss.DONE;
	
	// Call all the functions that want to do 
	// something before changing state
	node.emit('BEFORE_DONE');
	
	if (node.game.auto_wait) {
		if (node.window) {	
			node.emit('WAITING...');
		}
	}
	node.game.publishState();
	
	if (node.game.solo_mode) {
		node.game.updateState(node.game.next());
	}
});

/**
 * ### PAUSE
 * 
 * Sets the game to PAUSE and publishes the state
 * 
 */
node.on('PAUSE', function(msg) {
	node.game.state.paused = true;
	node.game.publishState();
});

/**
 * ### WINDOW_LOADED
 * 
 * Checks if the game is ready, and if so fires the LOADED event
 * 
 * @emit BEFORE_LOADING
 * @emit LOADED
 */
node.on('WINDOW_LOADED', function() {
	if (node.game.ready) node.emit('LOADED');
});

/**
 * ### GAME_LOADED
 * 
 * Checks if the window was loaded, and if so fires the LOADED event
 * 
 * @emit BEFORE_LOADING
 * @emit LOADED
 */
node.on('GAME_LOADED', function() {
	if (node.game.ready) node.emit('LOADED');
});

/**
 * ### LOADED
 * 
 * 
 */
node.on('LOADED', function() {
	node.emit('BEFORE_LOADING');
	node.game.state.is =  GameState.iss.PLAYING;
	//TODO: the number of messages to emit to inform other players
	// about its own state should be controlled. Observer is 0 
	//node.game.publishState();
	node.socket.clearBuffer();
	
});

node.log('internal listeners added');
	
})('undefined' !== typeof node ? node : module.parent.exports); 
// <!-- ends outgoing listener -->
/**
 * # GameTimer
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Creates a controllable timer object for nodeGame 
 * 
 * ---
 * 
 */

(function (exports, node) {
	
// ## Global scope
	
exports.GameTimer = GameTimer;

JSUS = node.JSUS;

/**
 * ### GameTimer status levels
 * Numerical levels representing the state of the GameTimer
 * 
 * 	@see GameTimer.status
 */
GameTimer.STOPPED = -5
GameTimer.PAUSED = -3;
GameTimer.UNINITIALIZED = -1;
GameTimer.INITIALIZED = 0;
GameTimer.LOADING = 3;
GameTimer.RUNNING = 5;
	
/**
 * ## GameTimer constructor
 * 
 * Creates an instance of GameTimer
 * 
 * @param {object} options. Optional. A configuration object
 */	
function GameTimer (options) {
	options = options || {};

// ## Public properties

/**
 * ### GameTimer.status
 * 
 * Numerical index representing the current the state of the GameTimer object
 * 
 */
	this.status = GameTimer.UNINITIALIZED;	
	
/**
 * ### GameTimer.options
 * 
 * The current settings for the GameTimer
 * 
 */	
	this.options = options;

/**
 * ### GameTimer.timer
 * 
 * The ID of the javascript interval
 * 
 */	
	this.timer = null; 		

/**
 * ### GameTimer.timeLeft
 * 
 * Milliseconds left before time is up
 * 
 */	
	this.timeLeft = null;
	
/**
 * ### GameTimer.timePassed
 * 
 * Milliseconds already passed from the start of the timer
 * 
 */	
	this.timePassed = 0;

/**
 * ### GameTimer.update
 * 
 * The frequency of update for the timer (in milliseconds)
 * 
 */	
	this.update = 1000;	
	
/**
 * ### GameTimer.timeup
 * 
 * Event string or function to fire when the time is up
 * 
 * 	@see GameTimer.fire
 */		
	this.timeup = 'TIMEUP';	
	
/**
 * ### GameTimer.hooks
 * 
 * Array of hook functions to fire at every update
 * 
 * The array works as a LIFO queue
 * 
 * 	@see GameTimer.fire
 */	
	this.hooks = [];
	
	this.init();
	// TODO: remove into a new addon
	this.listeners();
};

// ## GameTimer methods

/**
 * ### GameTimer.init
 * 
 * Inits the GameTimer
 * 
 * Takes the configuration as an input parameter or 
 * recycles the settings in `this.options`.
 * 
 * The configuration object is of the type
 * 
 * 	var options = {
 * 		milliseconds: 4000, // The length of the interval
 * 		update: 1000, // How often to update the time counter. Defaults every 1sec
 * 		timeup: 'MY_EVENT', // An event ot function to fire when the timer expires
 * 		hooks: [ myFunc, // Array of functions or events to fire at every update
 * 				'MY_EVENT_UPDATE', 
 * 				{ hook: myFunc2,
 * 				  ctx: that, }, 	
 * 				], 
 * 	} 
 * 	// Units are in milliseconds 
 * 
 * @param {object} options Optional. Configuration object
 * 
 * 	@see GameTimer.addHook
 */
GameTimer.prototype.init = function (options) {
	options = options || this.options;
	this.status = GameTimer.UNINITIALIZED;
	if (this.timer) clearInterval(this.timer);
	this.milliseconds = options.milliseconds || 0;
	this.timeLeft = this.milliseconds;
	this.timePassed = 0;
	this.update = options.update || 1000;
	this.timeup = options.timeup || 'TIMEUP'; // event to be fire when timer is expired
	// TODO: update and milliseconds must be multiple now
	if (options.hooks) {
		for (var i=0; i < options.hooks.length; i++){
			this.addHook(options.hooks[i]);
		}
	}
	
	this.status = GameTimer.INITIALIZED;
};


/**
 * ### GameTimer.fire
 * 
 * Fires a registered hook
 * 
 * If it is a string it is emitted as an event, 
 * otherwise it called as a function.
 * 
 * @param {mixed} h The hook to fire
 * 
 */
GameTimer.prototype.fire = function (h) {
	if (!h && !h.hook) return;
	var hook = h.hook || h;
	if ('function' === typeof hook) {
		var ctx = h.ctx || node.game;
		hook.call(ctx);
	}
	else {
		node.emit(hook);
	}	
};
	
/**
 * ### GameTimer.start
 * 
 * Starts the timer
 * 
 * Updates the status of the timer and calls `setInterval`
 * At every update all the registered hooks are fired, and 
 * time left is checked. 
 * 
 * When the timer expires the timeup event is fired, and the
 * timer is stopped
 * 
 * 	@see GameTimer.status
 * 	@see GameTimer.timeup
 * 	@see GameTimer.fire 
 * 
 */
GameTimer.prototype.start = function() {
	this.status = GameTimer.LOADING;
	// fire the event immediately if time is zero
	if (this.options.milliseconds === 0) {
		node.emit(this.timeup);
		return;
	}

	var that = this;
	this.timer = setInterval(function() {
		that.status = GameTimer.RUNNING;
		node.log('interval started: ' + that.timeLeft, 'DEBUG', 'GameTimer: ');
		that.timePassed = that.timePassed + that.update;
		that.timeLeft = that.milliseconds - that.timePassed;
		// Fire custom hooks from the latest to the first if any
		for (var i = that.hooks.length; i > 0; i--) {
			that.fire(that.hooks[(i-1)]);
		}
		// Fire Timeup Event
		if (that.timeLeft <= 0) {
			// First stop the timer and then call the timeup
			that.stop();
			that.fire(that.timeup);
			node.log('time is up: ' + that.timeup, 'DEBUG', 'GameTimer: ');
		}
		
	}, this.update);
};
	
/**
 * ### GameTimer.addHook
 * 
 * 
 * Add an hook to the hook list after performing conformity checks.
 * The first parameter hook can be a string, a function, or an object
 * containing an hook property.
 */
GameTimer.prototype.addHook = function (hook, ctx) {
	if (!hook) return;
	var ctx = ctx || node.game;
	if (hook.hook) {
		ctx = hook.ctx || ctx;
		var hook = hook.hook;
	}
	this.hooks.push({hook: hook, ctx: ctx});
};

/**
 * ### GameTimer.pause
 * 
 * Pauses the timer
 * 
 * If the timer was running, clear the interval and sets the
 * status property to `GameTimer.PAUSED`
 * 
 */
GameTimer.prototype.pause = function() {
	if (this.status > 0) {
		this.status = GameTimer.PAUSED;
		//console.log('Clearing Interval... pause')
		clearInterval(this.timer);
	}
};	

/**
 * ### GameTimer.resume
 * 
 * Resumes a paused timer
 * 
 * If the timer was paused, restarts it with the current configuration
 * 
 * 	@see GameTimer.restart
 */
GameTimer.prototype.resume = function() {
	if (this.status !== GameTimer.PAUSED) return; // timer was not paused
	var options = JSUS.extend({milliseconds: this.milliseconds - this.timePassed}, this.options);
	this.restart(options);
};	

/**
 * ### GameTimer.stop
 * 
 * Stops the timer
 * 
 * If the timer was paused or running, clear the interval, sets the
 * status property to `GameTimer.STOPPED`, and reset the time passed
 * and time left properties
 * 
 */
GameTimer.prototype.stop = function() {
	if (this.status === GameTimer.UNINITIALIZED) return;
	if (this.status === GameTimer.INITIALIZED) return;
	if (this.status === GameTimer.STOPPED) return;
	this.status = GameTimer.STOPPED;
	clearInterval(this.timer);
	this.timePassed = 0;
	this.timeLeft = null;
};	

/**
 * ### GameTimer.restart
 * 
 * Restarts the timer
 *  
 * Uses the input parameter as configuration object, 
 * or the current settings, if undefined 
 *  
 * @param {object} options Optional. A configuration object
 *  
 * 	@see GameTimer.init
 */
GameTimer.prototype.restart = function (options) {
	this.init(options);
	this.start();
};

/**
 * ### GameTimer.listeners
 * 
 * Experimental. Undocumented (for now)
 * 
 */
GameTimer.prototype.listeners = function () {
	var that = this;
// <!--	
//		node.on('GAME_TIMER_START', function() {
//			that.start();
//		}); 
//		
//		node.on('GAME_TIMER_PAUSE', function() {
//			that.pause();
//		});
//		
//		node.on('GAME_TIMER_RESUME', function() {
//			that.resume();
//		});
//		
//		node.on('GAME_TIMER_STOP', function() {
//			that.stop();
//		});
	
//		node.on('DONE', function(){
//			console.log('TIMER PAUSED');
//			that.pause();
//		});
	
	// TODO: check what is right behavior for this
//		node.on('WAITING...', function(){
//			that.pause();
//		});
// -->
	
};

// ## Closure
})(
	'undefined' != typeof node ? node : module.exports
  , 'undefined' != typeof node ? node : module.parent.exports
);
/**
 * 
 * # TriggerManager: 
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Manages a collection of trigger functions to be called sequentially
 *  
 * ## Note for developers
 * 
 * Triggers are functions that operate on a common object, and each 
 * sequentially adds further modifications to it. 
 * 
 * If the TriggerManager were a beauty saloon, the first trigger function
 * would wash the hair, the second would cut the washed hair, and the third
 * would style it. All these operations needs to be done sequentially, and
 * the TriggerManager takes care of handling this process.
 * 
 * If `TriggerManager.returnAt` is set equal to `TriggerManager.first`, 
 * the first trigger function returning a truthy value will stop the process
 * and the target object will be immediately returned. In these settings,
 * if a trigger function returns `undefined`, the target is passed to the next
 * trigger function. 
 * 
 * Notice: TriggerManager works as a *LIFO* queue, i.e. new trigger functions
 * will be executed first.
 * 
 * ---
 * 
 */

(function(exports, node){

// ## Global scope
	
exports.TriggerManager = TriggerManager;

TriggerManager.first = 'first';
TriggerManager.last = 'last';



/**
 * ## TriggerManager constructor
 * 
 * Creates a new instance of TriggerManager
 * 
 */
function TriggerManager (options) {
// ## Public properties
	
	
/**
 * ### TriggerManager.triggers
 * 
 * Array of trigger functions 
 * 
 */
this.triggers = [];
	
// ## Public properties

/**
 * ### TriggerManager.options
 * 
 * Reference to current configuration
 * 
 */	
	this.options = options || {};

/**
 * ### TriggerManager.returnAt
 * 
 * Controls the behavior of TriggerManager.pullTriggers
 * 
 * By default it is equal to `TriggerManager.first`
 */	
	var returnAt = TriggerManager.first;
	Object.defineProperty(this, 'returnAt', {
		set: function(at){
			if (!at || (at !== TriggerManager.first && at !== TriggerManager.last)) {
				node.log('Invalid returnAt type: ' + at);
				return false;
			}
			returnAt = at;
			return at;
		},
		get: function(){
			return returnAt;
		},
		configurable: true,
		enumerable: true
	});

/**
 * ### TriggerManager.length
 * 
 * The number of registered trigger functions
 * 
 */
	Object.defineProperty(this, 'length', {
		set: function(){},
		get: function(){
			return this.triggers.length;
		},
		configurable: true
	});
	
	this.init();
};

// ## TriggerManager methods

/**
 * ### TriggerManager.init
 * 
 * Configures the TriggerManager instance
 * 
 * Takes the configuration as an input parameter or 
 * recycles the settings in `this.options`.
 * 
 * The configuration object is of the type
 * 
 * 	var options = {
 * 		returnAt: 'first', // or 'last'
 * 		triggers: [ myFunc,
 * 					myFunc2 
 * 		],
 * 	} 
 * 	 
 * @param {object} options Optional. Configuration object
 * 
 */
TriggerManager.prototype.init = function (options) {
	this.options = options || this.options;
	if (this.options.returnAt === TriggerManager.first || this.options.returnAt === TriggerManager.last) {
		this.returnAt = this.options.returnAt;
	}
	this.resetTriggers();
};

/**
 * ### TriggerManager.initTriggers
 * 
 * Adds a collection of trigger functions to the trigger array
 * 
 * @param {function|array} triggers An array of trigger functions or a single function 
 */
TriggerManager.prototype.initTriggers = function (triggers) {
	if (!triggers) return;
	if (!(triggers instanceof Array)) {
		triggers = [triggers];
	}
	for (var i=0; i< triggers.length; i++) {
		this.triggers.push(triggers[i]);
	}
  };
	
/**
 * ### TriggerManager.resetTriggers
 *   
 * Resets the trigger array to initial configuration
 *   
 * Delete existing trigger functions and re-add the ones
 * contained in `TriggerManager.options.triggers`
 * 
 */
TriggerManager.prototype.resetTriggers = function () {
	this.triggers = [];
	this.initTriggers(this.options.triggers);
};

/**
 * ### TriggerManager.clear
 * 
 * Clears the trigger array
 * 
 * Requires a boolean parameter to be passed for confirmation
 * 
 * @param {boolean} clear TRUE, to confirm clearing
 * @return {boolean} TRUE, if clearing was successful
 */
TriggerManager.prototype.clear = function (clear) {
	if (!clear) {
		node.log('Do you really want to clear the current TriggerManager obj? Please use clear(true)', 'WARN');
		return false;
	}
	this.triggers = [];
	return clear;
};
	
/**
 * ### TriggerManager.addTrigger
 * 
 * Pushes a trigger into the trigger array
 * 
 * @param {function} trigger The function to add
 * @param {number} pos Optional. The index of the trigger in the array
 * @return {boolean} TRUE, if insertion is successful
 */	  
TriggerManager.prototype.addTrigger = function (trigger, pos) {
	if (!trigger) return false;
	if (!('function' === typeof trigger)) return false;
	if (!pos) {
		this.triggers.push(trigger);
	}
	else {
		this.triggers.splice(pos, 0, trigger);
	}
	return true;
};
	  
/**
 * ### TriggerManager.removeTrigger
 * 
 * Removes a trigger from the trigger array
 * 
 * @param {function} trigger The function to remove
 * @return {boolean} TRUE, if removal is successful
 */	  
TriggerManager.prototype.removeTrigger = function (trigger) {
	if (!trigger) return false;
	for (var i=0; i< this.triggers.length; i++) {
		if (this.triggers[i] == trigger) {
			return this.triggers.splice(i,1);
		}
	}  
	return false;
};

/**
 * ### TriggerManager.pullTriggers
 * 
 * Fires the collection of trigger functions on the target object
 * 
 * Triggers are fired according to a LIFO queue, i.e. new trigger
 * functions are fired first.
 * 
 * Depending on the value of `TriggerManager.returnAt`, some trigger
 * functions may not be called. In fact a value is returned 
 * 
 * 	- 'first': after the first trigger returns a truthy value
 * 	- 'last': after all triggers have been executed
 * 
 * If no trigger is registered the target object is returned unchanged
 * 
 * @param {object} o The target object
 * @return {object} The target object after the triggers have been fired
 * 
 */	
TriggerManager.prototype.pullTriggers = function (o) {
	if ('undefined' === typeof o) return;
	if (!this.length) return o;
	
	for (var i = this.triggers.length; i > 0; i--) {
		var out = this.triggers[(i-1)].call(this, o);
		if ('undefined' !== typeof out) {
			if (this.returnAt === TriggerManager.first) {
				return out;
			}
		}
	}
	// Safety return
	return ('undefined' !== typeof out) ? out : o;
};

// <!-- old pullTriggers
//TriggerManager.prototype.pullTriggers = function (o) {
//	if (!o) return;
//	
//	for (var i = triggersArray.length; i > 0; i--) {
//		var out = triggersArray[(i-1)].call(this, o);
//		if (out) {
//			if (this.returnAt === TriggerManager.first) {
//				return out;
//			}
//		}
//	}
//	// Safety return
//	return o;
//}; 
//-->


/**
 * ### TriggerManager.size
 * 
 * Returns the number of registered trigger functions
 * 
 * Use TriggerManager.length instead 
 * 
 * @deprecated
 */
TriggerManager.prototype.size = function () {
	return this.triggers.length;
};
	

// ## Closure	
})(
	('undefined' !== typeof node) ? node : module.exports
  , ('undefined' !== typeof node) ? node : module.parent.exports
);
/**
 * # GameSession
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed 
 * 
 * Addon to save and load the nodeGame session in the browser
 * 
 *  @see node.store
 *  
 * ---
 * 
 */

(function (node) {
	
	// ## Global scope
	
	var JSUS = node.JSUS,
		NDDB = node.NDDB,
		store = node.store;

	var prefix = 'nodegame_';

/**
 * ## node.session
 *
 * Loads a nodeGame session
 *
 * If no parameter is passed it will return the current session.
 * Else, it will try to load a session with the given id. 
 *
 * This method interact with the `node.store` object that provides
 * lower level capabilities to write to a persistent support (e.g. 
 * the browser localStorate).
 * 
 * @param {number} sid Optional. The session id to load
 * @return {object} The session object
 * 
 *  @see node.store
 * 
 */
	node.session = function (sid) {
				
		// Returns the current session
		if (!sid) {
			var session = {
					id: 	node.gsc.session,
					player: node.player,
					memory: node.game.memory,
					state: 	node.game.state,
					game: 	node.game.name,
					history: undefined
			};
			
			// If we saved the emitted events, add them to the
			// session object
			if (node.events.history || node.events.history.length) {
				session.history = node.events.history.fetch();
			}
			
			return session;
		}
		
		if (!node.session.isEnabled()) {
			return false;
		}
		
		// Tries to return a stored session
		return node.store(prefix + sid);
	};

/**
 * ## node.session.isEnabled
 * 
 * TRUE, if the session can be saved to a persistent support
 * 
 */	
	node.session.isEnabled = function() {
		return (node.store) ? node.store.isPersistent() : false;
	};
	

/**
 * ## node.session.store
 * 
 * Stores the current session to a persistent medium
 * 
 * @return {boolean} TRUE, if session saving was successful
 */	
	node.session.store = function() {
		if (!node.session.isEnabled()) {
			node.log('Could not save the session');
			return false;
		}
		
		var session = node.session();
		var sid = session.id;
		node.store(prefix + sid, session);
		node.log('Session saved with id ' + sid);
		return true;
	}
	
// <!--	
//	node.session.restore = function (sessionObj, sid) {
//		
//		if (!sessionObj) return false;
//		if (!sessionObj.player) return false;
//		if (!sessionObj.state) return false;
//		
//		sid = sid || sessionObj.player.sid;
//		if (!sid) return false;
//		
//		var player = {
//				id: 	sessionObj.player.id,
//				sid: 	sid,
//				name:	node.gsc.name,
//		};
//	
//		that.createPlayer(player);
//		
//		node.gsc.session 	= sessionObj.id;
//		node.game.memory 	= sessionObj.memory;
//		
//		node.goto(session.state);	
//		
//		return true;
//		
//	};
// -->

// ## Closure	
})('undefined' != typeof node ? node : module.parent.exports);
/**
 * ## WaitingRoom
 * 
 * Holds a list of players and starts one or more games based on a 
 * list of criteria. 
 *  
 */

(function(exports, node){
	
	if (!node.TriggerManager) {
		throw new Error('node.TriggerManager not found. Aborting');
	}
	
	function Group(options) {
		options = options || {}
		
		this.players = options.players;
	}
	
//	if (!node.Group) {
//		throw new Error('node.TriggerManager not found. Aborting');
//	}
	
	var J = node.JSUS;
	
	
	exports.WaitingRoom = WaitingRoom;
	
	WaitingRoom.prototype = new node.TriggerManager();
	WaitingRoom.prototype.constructor = WaitingRoom;
	
	WaitingRoom.defaults = {};
	

	
	function WaitingRoom (options) {
		node.TriggerManager.call(this, options);
		
		
		node.pool = new node.PlayerList();
		node.game.room = {};
		
		var that = this;

		var pullTriggers = function() {
			console.log('CAPTURED')
			var groups  = that.pullTriggers();

			if (!groups) return;
			if (!J.isArray(groups)) groups = [groups];
			
			var i, name, count = 0;
			for (i = 0; i< groups.length; i++) {
				name = groups[i].name || count++;
				node.game.room[name] = new Game(groups[i]);
				node.game.room[name].step();
			}
		};
		
		var onConnectFunc = function() {
			//console.log('added')
			node.onPLIST(function(){
				pullTriggers();
			});
		};
		
		var onConnect;
		Object.defineProperty(this, 'onConnect', {
			set: function(value) {
				if (value === false) {
					node.removeListener('in.say.PLIST', pullTriggers);
					node.removeListener('in.set.PLIST', pullTriggers);
				}
				else if (value === true) {
					node.onPLIST(pullTriggers);
				}
				onConnect = value;
				
			},
			get: function() {
				return onConnect;
			},
			configurable: true
		});
		
		var onTimeout, onTimeoutTime;
		Object.defineProperty(this, 'onTimeout', {
			set: function(value) {
				if (!value) {
					clearTimeout(onTimeout);
					onTimeoutTime = value;
					onTimeout = false;
				}
				else if ('numeric' === typeof value) {
				
					if (onTimeout) {
						clearTimeout(onTimeout);
					}
					onTimeoutTime = value;
					onTimeout = setTimeout(pullTriggers);
				}
			},
			get: function() {
				return onTimeoutTime;
			},
			configurable: true
		});
		
		var onInterval, onIntervalTime;
		Object.defineProperty(this, 'onInterval', {
			set: function(value) {
				if (!value) {
					clearInterval(onInterval);
					onIntervalTime = value;
					onInterval = false;
				}
				else if ('numeric' === typeof value) {
				
					if (onInterval) {
						clearInterval(onInterval);
					}
					onInterval = setInterval(pullTriggers);
					onIntervalTime = value;
				}
			},
			get: function() {
				return onIntervalTime;
			},
			configurable: true
		});
		
		
		this.init(options);
	}

	
	WaitingRoom.prototype.init = function (options) {
		options = options || {};
		
		this.onConnect = options.onConnect || true;
		this.onTimeout = options.onTimeout || false;
		this.onInterval = options.onInterval || false;
		
		
		this.addTrigger(function(){
			return new Group({
				players: node.pool,
				game: options.loops
			});
		});
		
		if (options.minPlayers && options.maxPlayers) {
			this.addTrigger(function(){
				if (node.pool.length < options.minPlayers) {
					return false;
				}
				if (node.pool.length > options.maxPlayers) {
					// Take N = maxPlayers random player
					var players = node.pool.shuffle().limit(options.maxPlayers);
					return new Group({
						players: players,
						game: options.loops
					});
					
				}
				
				return new Group({
					players: node.pool,
					game: options.loops
				});
			});
		}
		
		if (options.minPlayers) {
			this.addTrigger(function(){
				if (node.pool.length < options.minPlayers) {
					return false;
				}
				
				return new Group({
					players: node.pool,
					game: options.loops
				});
			});
		}
		
		if (options.maxPlayers) {
			this.addTrigger(function(){
				if (node.pool.length > options.maxPlayers) {
					// Take N = maxPlayers random player
					var players = node.pool.shuffle().limit(options.maxPlayers);
					return new Group({
						players: players,
						game: options.loops
					});
					
				}
			});
		}
		
		if (options.nPlayers) {
			this.addTrigger(function(){
				if (node.pool.length === options.nPlayers) {
					// Take N = maxPlayers random player
					return new Group({
						players: node.pool,
						game: options.loops
					});
					
				}
			});
		}
		
	};
	
	
	WaitingRoom.prototype.criteria = function (func, pos) {
		this.addTrigger(func, pos);
	};
	
	
	/**
	 * ## WaitingRoom.setInterval
	 * 
	 * Set the update interval
	 * 
	 */
	WaitingRoom.prototype.setInterval = function(interval) {
		if (!interval) clearInterval(this.interval);
		if (this.interval) clearInterval(this.interval);
		this.interval = setInterval(this.pullTriggers, interval);
	};
	
	
})(
	('undefined' !== typeof node) ? node : module.exports
  , ('undefined' !== typeof node) ? node : module.parent.exports
);
/**
 * 
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
 * 
 * 
 */
(function (window, node) {
		
var J = node.JSUS;

var Player = node.Player,
	PlayerList = node.PlayerList,
	GameState = node.GameState,
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


/**
 * ## GameWindow constructor
 * 
 * The constructor performs the following operations:
 * 
 * 		- creates a root div element (this.root)
 * 		- creates an iframe element inside the root element	(this.frame)
 * 		- defines standard event listeners for showing and hiding elements
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
	
	this.state = GameState.iss.LOADED;
	this.areLoading = 0; 
	
	// Init default behavior
	this.init();
	
};

// ## GameWindow methods

/**
 * ### GameWindow.init
 * 
 * Sets global variables based on local configuration.
 * 
 * Defaults:
 * 
 * 		- promptOnleave TRUE
 * 		- captures ESC key
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
 * Returns a collection of elements with the tag name equal to @tag . 
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
		
		//var maincss		= this.addCSS(this.root, 'style.css');
		this.header 	= this.generateHeader();
	    var mainframe 	= this.addIFrame(this.root,'mainframe');
	    
		node.game.vs 	= node.widgets.append('VisualState', this.header);
		node.game.timer = node.widgets.append('VisualTimer', this.header);
		//node.game.doneb = node.widgets.append('DoneButton', this.header);
		node.game.sd 	= node.widgets.append('StateDisplay', this.header);

		node.widgets.append('WaitScreen');
	    
		// Add default CSS
		if (node.conf.host) {
			this.addCSS(document.body, node.conf.host + '/stylesheets/player.css');
		}
	
		this.frame = window.frames[this.mainframe]; // there is no document yet
		var initPage = this.getBlankPage();
		if (this.conf.noEscape) {
			// TODO: inject the no escape code here
			// not working
			//this.addJS(initPage, node.conf.host + 'javascripts/noescape.js');
		}
		
		window.frames[this.mainframe].src = initPage;
	    
		break;
	}
	
};


/**
 * ## GameWindow.load
 * 
 * Loads content from an uri (remote or local) into the iframe, 
 * and after it is loaded executes the callback function. 
 * 
 * The third parameter is the id of the frame in which to load the content. 
 * If it is not specified, the default iframe of the game is assumed.
 * 
 * Warning: Security policies may block this methods, if the 
 * content is coming from another domain.
 * 
 * @param {string} uri The uri to load
 * @param {function} func The callback function to call once the DOM is ready
 * @param {string} frame The name of the frame in which loading the uri
 * 
 */
GameWindow.prototype.load = GameWindow.prototype.loadFrame = function (uri, func, frame) {
	if (!uri) return;
	frame =  frame || this.mainframe;
	
	this.state = GameState.iss.LOADING;
	this.areLoading++; // keep track of nested call to loadFrame
	
	var that = this;	
			
	// First add the onload event listener
	var iframe = document.getElementById(frame);
	iframe.onload = function () {
		if (that.conf.noEscape) {
			
			// TODO: inject the no escape code here
			
			//that.addJS(iframe.document, node.conf.host + 'javascripts/noescape.js');
			//that.addJS(that.getElementById('mainframe'), node.conf.host + 'javascripts/noescape.js');
		}
		that.updateStatus(func, frame);
	};

	// Then update the frame location
	window.frames[frame].location = uri;
	
	
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


GameWindow.prototype.updateStatus = function(func, frame) {
	// Update the reference to the frame obj
	this.frame = window.frames[frame].document;
		
	if (func) {
		func.call(node.game); // TODO: Pass the right this reference
		//node.log('Frame Loaded correctly!');
	}
		
	this.areLoading--;
	//console.log('ARE LOADING: ' + this.areLoading);
	if (this.areLoading === 0) {
		this.state = GameState.iss.LOADED;
		node.emit('WINDOW_LOADED');
	}
	else {
		node.log('Attempt to update state, before the window object was loaded', 'DEBUG');
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
	var root = root || this.getScreen();
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
	var root = root || this.getScreen();
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
	
	if ('undefined' !== typeof id) {
		var container = this.getElementById(id);
	}
	if ('undefined' === typeof container) {
		var container = this.frame.body;
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
 * 		- the specified root element
 * 		- the body element
 * 		- the last element of the document
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
	var root = root || document.body || document.lastElementChild;
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
		var root = this.getScreen();
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
* Adds an ALL and a SERVER option to a specified select element.
* 
* @TODO: adds options to control which players/servers to add.
* 
* @see GameWindow.populateRecipientSelector
* 
*/
GameWindow.prototype.addStandardRecipients = function (toSelector) {
		
	var opt = document.createElement('option');
	opt.value = 'ALL';
	opt.appendChild(document.createTextNode('ALL'));
	toSelector.appendChild(opt);
	
	var opt = document.createElement('option');
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
 * 		- the body element of the iframe 
 * 		- the document element of the iframe 
 * 		- the body element of the document 
 * 		- the last child element of the document
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
	return 	el;
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
	
	if (!node) {
		console.log('nodegame-window: node object not found.');
		return false;
	}
	if (!window) {
		node.err('window object not found.', 'nodegame-window');
		return false;
	}
	
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
}


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