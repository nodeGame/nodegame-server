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