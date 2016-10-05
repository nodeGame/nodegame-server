/**
 * # nodeGame IE support
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Shims of methods required by nodeGame, but missing in old IE browsers
 *
 * ---
 */

if ('undefined' === typeof String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

if ('undefined' === typeof console) {
    this.console = {log: function() {}};
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
// Global_Objects/Date/now
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

// http://stackoverflow.com/questions/2790001/
// fixing-javascript-array-functions-in-internet-explorer-indexof-foreach-etc
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf= function(find, i /*opt*/) {
        if (i===undefined) i= 0;
        if (i<0) i+= this.length;
        if (i<0) i= 0;
        for (var n= this.length; i<n; i++)
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}
if (!('lastIndexOf' in Array.prototype)) {
    Array.prototype.lastIndexOf= function(find, i /*opt*/) {
        if (i===undefined) i= this.length-1;
        if (i<0) i+= this.length;
        if (i>this.length-1) i= this.length-1;
        for (i++; i-->0;) /* i++ because from-argument is sadly inclusive */
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}

if (typeof Object.create !== 'function') {
    Object.create = (function() {
        var Temp = function() {};
        return function (prototype) {
            if (arguments.length > 1) {
                throw Error('Second argument not supported');
            }
            if (typeof prototype != 'object') {
                throw TypeError('Argument must be an object');
            }
            Temp.prototype = prototype;
            var result = new Temp();
            Temp.prototype = null;
            return result;
        };
    })();
}

/**
   JSON2
   http://www.JSON.org/json2.js
   2011-02-23
*/

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    var global = new Function('return this')()
      , JSON = global.JSON
      ;

    if (!JSON) {
      JSON = {};
    }

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }

    global.JSON = JSON;
}());


// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {

        var k;

        // 1. Let O be the result of calling ToObject passing
        //    the this value as the argument.
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get
        //    internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If len is 0, return -1.
        if (len === 0) {
            return -1;
        }

        // 5. If argument fromIndex was passed let n be
        //    ToInteger(fromIndex); else let n be 0.
        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) {
            n = 0;
        }

        // 6. If n >= len, return -1.
        if (n >= len) {
            return -1;
        }

        // 7. If n >= 0, then Let k be n.
        // 8. Else, n<0, Let k be len - abs(n).
        //    If k is less than 0, then let k be 0.
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        // 9. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the
            //    HasProperty internal method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            //    i.  Let elementK be the result of calling the Get
            //        internal method of O with the argument ToString(k).
            //   ii.  Let same be the result of applying the
            //        Strict Equality Comparison Algorithm to
            //        searchElement and elementK.
            //  iii.  If same is true, return k.
            if (k in O && O[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

/**
 * # Shelf.JS
 * Copyright 2014 Stefano Balietti
 * GPL licenses.
 *
 * Persistent Client-Side Storage
 *
 * ---
 */
(function(exports){

    var version = '0.5';

    var store = exports.store = function(key, value, options, type) {
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
    store.prefix = "__shelf__";

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

    store.addType = function(type, storage) {
	store.types[type] = storage;
	store[type] = function(key, value, options) {
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
 * ## Amplify storage for Shelf.js
 *
 * v. 1.1.0 22.05.2013 a275f32ee7603fbae6607c4e4f37c4d6ada6c3d5
 *
 * Important! When updating to next Amplify.JS release, remember to change:
 *
 * - JSON.stringify -> store.stringify to keep support for cyclic objects
 * - JSON.parse -> store.parse (cyclic objects)
 * - store.name -> store.prefix (check)
 * - rprefix -> regex
 * -  "__amplify__" -> store.prefix
 *
 * ---
 */
(function(exports) {

    var store = exports.store;

    if (!store) {
	throw new Error('amplify.shelf.js: shelf.js core not found.');
    }

    if ('undefined' === typeof window) {
	throw new Error('amplify.shelf.js:  window object not found.');
    }

    var regex = new RegExp("^" + store.prefix);
    function createFromStorageInterface( storageType, storage ) {
	store.addType( storageType, function( key, value, options ) {
	    var storedValue, parsed, i, remove,
	    ret = value,
	    now = (new Date()).getTime();

	    if ( !key ) {
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

		    while ( key = storage.key( i++ ) ) {
			if ( regex.test( key ) ) {
			    parsed = store.parse( storage.getItem( key ) );
			    if ( parsed.expires && parsed.expires <= now ) {
				remove.push( key );
			    } else {
				ret[ key.replace( rprefix, "" ) ] = parsed.data;
			    }
			}
		    }
		    while ( key = remove.pop() ) {
			storage.removeItem( key );
		    }
		} catch ( error ) {}
		return ret;
	    }

	    // protect against name collisions with direct storage
	    key = store.prefix + key;

	    if ( value === undefined ) {
		storedValue = storage.getItem( key );
		parsed = storedValue ? store.parse( storedValue ) : { expires: -1 };
		if ( parsed.expires && parsed.expires <= now ) {
		    storage.removeItem( key );
		} else {
		    return parsed.data;
		}
	    } else {
		if ( value === null ) {
		    storage.removeItem( key );
		} else {
		    parsed = store.stringify({
			data: value,
			expires: options.expires ? now + options.expires : null
		    });
		    try {
			storage.setItem( key, parsed );
			// quota exceeded
		    } catch( error ) {
			// expire old data and try again
			store[ storageType ]();
			try {
			    storage.setItem( key, parsed );
			} catch( error ) {
			    throw store.error();
			}
		    }
		}
	    }

	    return ret;
	});
    }

    // localStorage + sessionStorage
    // IE 8+, Firefox 3.5+, Safari 4+, Chrome 4+, Opera 10.5+, iPhone 2+, Android 2+
    for ( var webStorageType in { localStorage: 1, sessionStorage: 1 } ) {
	// try/catch for file protocol in Firefox and Private Browsing in Safari 5
	try {
	    // Safari 5 in Private Browsing mode exposes localStorage
	    // but doesn't allow storing data, so we attempt to store and remove an item.
	    // This will unfortunately give us a false negative if we're at the limit.
	    window[ webStorageType ].setItem(store.prefix, "x" );
	    window[ webStorageType ].removeItem(store.prefix );
	    createFromStorageInterface( webStorageType, window[ webStorageType ] );
	} catch( e ) {}
    }

    // globalStorage
    // non-standard: Firefox 2+
    // https://developer.mozilla.org/en/dom/storage#globalStorage
    if ( !store.types.localStorage && window.globalStorage ) {
	// try/catch for file protocol in Firefox
	try {
	    createFromStorageInterface( "globalStorage",
			                window.globalStorage[ window.location.hostname ] );
	    // Firefox 2.0 and 3.0 have sessionStorage and globalStorage
	    // make sure we default to globalStorage
	    // but don't default to globalStorage in 3.5+ which also has localStorage
	    if ( store.type === "sessionStorage" ) {
		store.type = "globalStorage";
	    }
	} catch( e ) {}
    }

    // userData
    // non-standard: IE 5+
    // http://msdn.microsoft.com/en-us/library/ms531424(v=vs.85).aspx
    (function() {
	// IE 9 has quirks in userData that are a huge pain
	// rather than finding a way to detect these quirks
	// we just don't register userData if we have localStorage
	if ( store.types.localStorage ) {
	    return;
	}

	// append to html instead of body so we can do this from the head
	var div = document.createElement( "div" ),
	attrKey = store.prefix; // was "amplify" and not __amplify__
	div.style.display = "none";
	document.getElementsByTagName( "head" )[ 0 ].appendChild( div );

	// we can't feature detect userData support
	// so just try and see if it fails
	// surprisingly, even just adding the behavior isn't enough for a failure
	// so we need to load the data as well
	try {
	    div.addBehavior( "#default#userdata" );
	    div.load( attrKey );
	} catch( e ) {
	    div.parentNode.removeChild( div );
	    return;
	}

	store.addType( "userData", function( key, value, options ) {
	    div.load( attrKey );
	    var attr, parsed, prevValue, i, remove,
	    ret = value,
	    now = (new Date()).getTime();

	    if ( !key ) {
		ret = {};
		remove = [];
		i = 0;
		while ( attr = div.XMLDocument.documentElement.attributes[ i++ ] ) {
		    parsed = store.parse( attr.value );
		    if ( parsed.expires && parsed.expires <= now ) {
			remove.push( attr.name );
		    } else {
			ret[ attr.name ] = parsed.data;
		    }
		}
		while ( key = remove.pop() ) {
		    div.removeAttribute( key );
		}
		div.save( attrKey );
		return ret;
	    }

	    // convert invalid characters to dashes
	    // http://www.w3.org/TR/REC-xml/#NT-Name
	    // simplified to assume the starting character is valid
	    // also removed colon as it is invalid in HTML attribute names
	    key = key.replace( /[^\-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g, "-" );
	    // adjust invalid starting character to deal with our simplified sanitization
	    key = key.replace( /^-/, "_-" );

	    if ( value === undefined ) {
		attr = div.getAttribute( key );
		parsed = attr ? store.parse( attr ) : { expires: -1 };
		if ( parsed.expires && parsed.expires <= now ) {
		    div.removeAttribute( key );
		} else {
		    return parsed.data;
		}
	    } else {
		if ( value === null ) {
		    div.removeAttribute( key );
		} else {
		    // we need to get the previous value in case we need to rollback
		    prevValue = div.getAttribute( key );
		    parsed = store.stringify({
			data: value,
			expires: (options.expires ? (now + options.expires) : null)
		    });
		    div.setAttribute( key, parsed );
		}
	    }

	    try {
		div.save( attrKey );
		// quota exceeded
	    } catch ( error ) {
		// roll the value back to the previous value
		if ( prevValue === null ) {
		    div.removeAttribute( key );
		} else {
		    div.setAttribute( key, prevValue );
		}

		// expire old data and try again
		store.userData();
		try {
		    div.setAttribute( key, parsed );
		    div.save( attrKey );
		} catch ( error ) {
		    // roll the value back to the previous value
		    if ( prevValue === null ) {
			div.removeAttribute( key );
		    } else {
			div.setAttribute( key, prevValue );
		    }
		    throw store.error();
		}
	    }
	    return ret;
	});
    }());

}(this));
/**
 * ## Cookie storage for Shelf.js
 * Copyright 2015 Stefano Balietti
 *
 * Original library from:
 * See http://code.google.com/p/cookies/
 */
(function(exports) {

    var store = exports.store;

    if (!store) {
	throw new Error('cookie.shelf.js: shelf.js core not found.');
    }

    if ('undefined' === typeof window) {
	throw new Error('cookie.shelf.js: window object not found.');
    }

    var cookie = (function() {

	var resolveOptions, assembleOptionsString, parseCookies, constructor;
        var defaultOptions = {
	    expiresAt: null,
	    path: '/',
	    domain:  null,
	    secure: false
	};

	/**
	 * resolveOptions - receive an options object and ensure all options
         * are present and valid, replacing with defaults where necessary
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

	store.addType("cookie", function(key, value, options) {

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
 * # JSUS: JavaScript UtilS.
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Collection of general purpose javascript functions. JSUS helps!
 *
 * See README.md for extra help.
 * ---
 */
(function(exports) {

    var JSUS = exports.JSUS = {};

    // ## JSUS._classes
    // Reference to all the extensions
    JSUS._classes = {};

    // Make sure that the console is available also in old browser, e.g. < IE8.
    if ('undefined' === typeof console) console = {};
    if ('undefined' === typeof console.log) console.log = function() {};

    /**
     * ## JSUS.log
     *
     * Reference to standard out, by default `console.log`
     *
     * Override to redirect the standard output of all JSUS functions.
     *
     * @param {string} txt Text to output
     */
    JSUS.log = function(txt) {
        console.log(txt);
    };

    /**
     * ## JSUS.extend
     *
     * Extends JSUS with additional methods and or properties
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
     *
     * @return {object|function} target The extended object
     *
     * @see JSUS.get
     */
    JSUS.extend = function(additional, target) {
        var name, prop;
        if ('object' !== typeof additional &&
            'function' !== typeof additional) {
            return target;
        }

        // If we are extending JSUS, store a reference
        // of the additional object into the hidden
        // JSUS._classes object;
        if ('undefined' === typeof target) {
            target = target || this;
            if ('function' === typeof additional) {
                name = additional.toString();
                name = name.substr('function '.length);
                name = name.substr(0, name.indexOf('('));
            }
            // Must be object.
            else {
                name = additional.constructor ||
                    additional.__proto__.constructor;
            }
            if (name) {
                this._classes[name] = additional;
            }
        }

        for (prop in additional) {
            if (additional.hasOwnProperty(prop)) {
                if (typeof target[prop] !== 'object') {
                    target[prop] = additional[prop];
                } else {
                    JSUS.extend(additional[prop], target[prop]);
                }
            }
        }

        // Additional is a class (Function)
        // TODO: this is true also for {}
        if (additional.prototype) {
            JSUS.extend(additional.prototype, target.prototype || target);
        }

        return target;
    };

    /**
     * ## JSUS.require
     *
     * Returns a copy of one / all the objects extending JSUS
     *
     * The first parameter is a string representation of the name of
     * the requested extending object. If no parameter is passed a copy
     * of all the extending objects is returned.
     *
     * @param {string} className The name of the requested JSUS library
     *
     * @return {function|boolean} The copy of the JSUS library, or
     *   FALSE if the library does not exist
     */
    JSUS.require = JSUS.get = function(className) {
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
    };

    /**
     * ## JSUS.isNodeJS
     *
     * Returns TRUE when executed inside Node.JS environment
     *
     * @return {boolean} TRUE when executed inside Node.JS environment
     */
    JSUS.isNodeJS = function() {
        return 'undefined' !== typeof module &&
            'undefined' !== typeof module.exports &&
            'function' === typeof require;
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
        require('./lib/queue');
        require('./lib/fs');
    }
    // end node

})(
    'undefined' !== typeof module && 'undefined' !== typeof module.exports ?
        module.exports: window
);

/**
 * # COMPATIBILITY
 *
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Tests browsers ECMAScript 5 compatibility
 *
 * For more information see http://kangax.github.com/es5-compat-table/
 */
(function(JSUS) {
    "use strict";

    function COMPATIBILITY() {}

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
            Object.defineProperty({}, "a", {enumerable: false, value: 1});
            support.defineProperty = true;
        }
        catch(e) {
            support.defineProperty = false;
        }

        try {
            eval('({ get x(){ return 1 } }).x === 1');
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
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Collection of static functions to manipulate arrays
 */
(function(JSUS) {

    "use strict";

    function ARRAY() {}

    /**
     * ## ARRAY.filter
     *
     * Add the filter method to ARRAY objects in case the method is not
     * supported natively.
     *
     * @see https://developer.mozilla.org/en/JavaScript/Reference/
     *              Global_Objects/ARRAY/filter
     */
    if (!Array.prototype.filter) {
        Array.prototype.filter = function(fun /*, thisp */) {
            if (this === void 0 || this === null) throw new TypeError();

            var t = new Object(this);
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
     */
    ARRAY.isArray = function(o) {
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
     * The distance between two subsequent numbers can be controlled
     * by the increment parameter.
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
     * @param {number} increment Optional. The increment between two
     *   subsequents element of the sequence
     * @param {Function} func Optional. A callback function that can modify
     *   each number of the sequence before returning it
     *
     * @return {array} The final sequence
     */
    ARRAY.seq = function(start, end, increment, func) {
        var i, out;
        if ('number' !== typeof start) return false;
        if (start === Infinity) return false;
        if ('number' !== typeof end) return false;
        if (end === Infinity) return false;
        if (start === end) return [start];

        if (increment === 0) return false;
        if (!JSUS.inArray(typeof increment, ['undefined', 'number'])) {
            return false;
        }

        increment = increment || 1;
        func = func || function(e) {return e;};

        i = start;
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
     * @param {object} context Optional. The context of execution of the
     *   callback. Defaults ARRAY.each
     *
     * @return {boolean} TRUE, if execution was successful
     */
    ARRAY.each = function(array, func, context) {
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
     * Executes a callback to each element of the array and returns the result
     *
     * Any number of additional parameters can be passed after the
     * callback function.
     *
     * @return {array} The result of the mapping execution
     *
     * @see ARRAY.each
     */
    ARRAY.map = function() {
        var i, len, args, out, o;
        var array, func;

        array = arguments[0];
        func = arguments[1];

        if (!ARRAY.isArray(array)) {
            JSUS.log('ARRAY.map: first parameter must be array. Found: ' +
                     array);
            return;
        }
        if ('function' !== typeof func) {
            JSUS.log('ARRAY.map: second parameter must be function. Found: ' +
                     func);
            return;
        }

        len = arguments.length;
        if (len === 3) args = [null, arguments[2]];
        else if (len === 4) args = [null, arguments[2], arguments[3]];
        else {
            len = len - 1;
            args = new Array(len);
            for (i = 1; i < (len); i++) {
                args[i] = arguments[i+1];
            }
        }

        out = [], len = array.length;
        for (i = 0; i < len; i++) {
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
     *
     * @see JSUS.equals
     */
    ARRAY.removeElement = function(needle, haystack) {
        var func, i;
        if ('undefined' === typeof needle || !haystack) return false;

        if ('object' === typeof needle) {
            func = JSUS.equals;
        }
        else {
            func = function(a, b) {
                return (a === b);
            };
        }

        for (i = 0; i < haystack.length; i++) {
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
     * @param {mixed} needle The element to search in the array
     * @param {array} haystack The array to search in
     *
     * @return {boolean} TRUE, if the element is contained in the array
     *
     * @see JSUS.equals
     */
    ARRAY.inArray = function(needle, haystack) {
        var func, i, len;
        if (!haystack) return false;
        func = JSUS.equals;
        len = haystack.length;
        for (i = 0; i < len; i++) {
            if (func.call(this, needle, haystack[i])) {
                return true;
            }
        }
        return false;
    };

    ARRAY.in_array = function(needle, haystack) {
        console.log('***ARRAY.in_array is deprecated. ' +
                    'Use ARRAY.inArray instead.***');
        return ARRAY.inArray(needle, haystack);
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
     *
     * @return {array} Array containing N groups
     */
    ARRAY.getNGroups = function(array, N) {
        return ARRAY.getGroupsSizeN(array, Math.floor(array.length / N));
    };

    /**
     * ## ARRAY.getGroupsSizeN
     *
     * Returns an array of arrays containing N elements each
     *
     * The last group could have less elements
     *
     * @param {array} array The array to split in subgroups
     * @param {number} N The number of elements in each subgroup
     *
     * @return {array} Array containing groups of size N
     *
     * @see ARRAY.getNGroups
     * @see ARRAY.generateCombinations
     * @see ARRAY.matchN
     */
    ARRAY.getGroupsSizeN = function(array, N) {

        var copy = array.slice(0);
        var len = copy.length;
        var originalLen = copy.length;
        var result = [];

        // Init values for the loop algorithm.
        var i, idx;
        var group = [], count = 0;
        for (i=0; i < originalLen; i++) {

            // Get a random idx between 0 and array length.
            idx = Math.floor(Math.random()*len);

            // Prepare the array container for the elements of a new group.
            if (count >= N) {
                result.push(group);
                count = 0;
                group = [];
            }

            // Insert element in the group.
            group.push(copy[idx]);

            // Update.
            copy.splice(idx,1);
            len = copy.length;
            count++;
        }

        // Add any remaining element.
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
     *
     * @return {array} The resulting latin square (or rectangle)
     */
    ARRAY._latinSquare = function(S, N, self) {
        self = ('undefined' === typeof self) ? true : self;
        // Infinite loop.
        if (S === N && !self) return false;
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
            while (JSUS.inArray(idx, extracted));
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
     *
     * @return {array} The resulting latin square (or rectangle)
     */
    ARRAY.latinSquare = function(S, N) {
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
     *
     * @return {array} The resulting latin square (or rectangle)
     */
    ARRAY.latinSquareNoSelf = function(S, N) {
        if (!N) N = S-1;
        if (!S || S < 0 || (N < 0)) return false;
        if (N > S) N = S-1;

        return ARRAY._latinSquare(S, N, false);
    };


    /**
     * ## ARRAY.generateCombinations
     *
     * Generates all distinct combinations of exactly r elements each
     *
     * @param {array} array The array from which the combinations are extracted
     * @param {number} r The number of elements in each combination
     *
     * @return {array} The total sets of combinations
     *
     * @see ARRAY.getGroupSizeN
     * @see ARRAY.getNGroups
     * @see ARRAY.matchN
     *
     * Kudos: http://rosettacode.org/wiki/Combinations#JavaScript
     */
    ARRAY.generateCombinations = function combinations(arr, k) {
        var i, subI, ret, sub, next;
        ret = [];
        for (i = 0; i < arr.length; i++) {
            if (k === 1) {
                ret.push( [ arr[i] ] );
            }
            else {
                sub = combinations(arr.slice(i+1, arr.length), k-1);
                for (subI = 0; subI < sub.length; subI++ ){
                    next = sub[subI];
                    next.unshift(arr[i]);
                    ret.push( next );
                }
            }
        }
        return ret;
    };

    /**
     * ## ARRAY.matchN
     *
     * Match each element of the array with N random others
     *
     * If strict is equal to true, elements cannot be matched multiple times.
     *
     * *Important*: this method has a bug / feature. If the strict parameter
     * is set, the last elements could remain without match, because all the
     * other have been already used. Another recombination would be able
     * to match all the elements instead.
     *
     * @param {array} array The array in which operate the matching
     * @param {number} N The number of matches per element
     * @param {boolean} strict Optional. If TRUE, matched elements cannot be
     *   repeated. Defaults, FALSE
     *
     * @return {array} The results of the matching
     *
     * @see ARRAY.getGroupSizeN
     * @see ARRAY.getNGroups
     * @see ARRAY.generateCombinations
     */
    ARRAY.matchN = function(array, N, strict) {
        var result, i, copy, group, len, found;
        if (!array) return;
        if (!N) return array;

        result = [];
        len = array.length;
        found = [];
        for (i = 0 ; i < len ; i++) {
            // Recreate the array.
            copy = array.slice(0);
            copy.splice(i,1);
            if (strict) {
                copy = ARRAY.arrayDiff(copy,found);
            }
            group = ARRAY.getNRandom(copy,N);
            // Add to the set of used elements.
            found = found.concat(group);
            // Re-add the current element.
            group.splice(0,0,array[i]);
            result.push(group);

            // Update.
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
     * @param {number} times The number of times the array must be appended
     *   to itself
     *
     * @return {array} A copy of the original array appended to itself
     */
    ARRAY.rep = function(array, times) {
        var i, result;
        if (!array) return;
        if (!times) return array.slice(0);
        if (times < 1) {
            JSUS.log('times must be greater or equal 1', 'ERR');
            return;
        }

        i = 1;
        result = array.slice(0);
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
     * the elements are repeat the same number of times. In the latter, each
     * element can be repeated a custom number of times. If the length of the
     * `times` array differs from that of the array to stretch a recycle rule
     * is applied.
     *
     * The original array is not modified.
     *
     * E.g.:
     *
     * ```js
     *  var foo = [1,2,3];
     *
     *  ARRAY.stretch(foo, 2); // [1, 1, 2, 2, 3, 3]
     *
     *  ARRAY.stretch(foo, [1,2,3]); // [1, 2, 2, 3, 3, 3];
     *
     *  ARRAY.stretch(foo, [2,1]); // [1, 1, 2, 3, 3];
     * ```
     *
     * @param {array} array the array to strech
     * @param {number|array} times The number of times each element
     *   must be repeated
     * @return {array} A stretched copy of the original array
     */
    ARRAY.stretch = function(array, times) {
        var result, i, repeat, j;
        if (!array) return;
        if (!times) return array.slice(0);
        if ('number' === typeof times) {
            if (times < 1) {
                JSUS.log('times must be greater or equal 1', 'ERR');
                return;
            }
            times = ARRAY.rep([times], array.length);
        }

        result = [];
        for (i = 0; i < array.length; i++) {
            repeat = times[(i % times.length)];
            for (j = 0; j < repeat ; j++) {
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
     * @return {array} All the values of the first array that are found
     *   also in the second one
     */
    ARRAY.arrayIntersect = function(a1, a2) {
        return a1.filter( function(i) {
            return JSUS.inArray(i, a2);
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
     * @return {array} All the values of the first array that are not
     *   found in the second one
     */
    ARRAY.arrayDiff = function(a1, a2) {
        return a1.filter( function(i) {
            return !(JSUS.inArray(i, a2));
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
     *
     * @return {array} copy The shuffled array
     *
     * @see http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
     */
    ARRAY.shuffle = function(array) {
        var copy, len, j, tmp, i;
        if (!array) return;
        copy = Array.prototype.slice.call(array);
        len = array.length-1; // ! -1
        for (i = len; i > 0; i--) {
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
     *
     * @return {array} An new array with N elements randomly chosen
     */
    ARRAY.getNRandom = function(array, N) {
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
     *
     * @return {array} A copy of the array without duplicates
     *
     * @see JSUS.equals
     */
    ARRAY.distinct = function(array) {
        var out = [];
        if (!array) return out;

        ARRAY.each(array, function(e) {
            if (!ARRAY.inArray(e, out)) {
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
     *
     * @return {array} The Transposed Array
     */
    ARRAY.transpose = function(array) {
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
 * Copyright(c) 2016 Stefano Balietti
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
 * - The add* method creates the element, append it as child to a root element,
 *     and then returns it.
 *
 * The syntax of both method is the same, but the add* method
 * needs the root element as first parameter. E.g.
 *
 * - getButton(id, text, attributes);
 * - addButton(root, id, text, attributes);
 *
 * The last parameter is generally an object containing a list of
 * of key-values pairs as additional attributes to set to the element.
 *
 * Only the methods which do not follow the above-mentioned syntax
 * will receive further explanation.
 */
(function(JSUS) {

    "use strict";

    var onFocusChange, changeTitle;

    function DOM() {}

    // ## GENERAL

    /**
     * ### DOM.write
     *
     * Write a text, or append an HTML element or node, into a root element
     *
     * @param {Element} root The HTML element where to write into
     * @param {mixed} text The text to write. Default, an ampty string
     *
     * @return {TextNode} The text node inserted in the root element
     *
     * @see DOM.writeln
     */
    DOM.write = function(root, text) {
        var content;
        if ('undefined' === typeof text || text === null) text = "";
        if (JSUS.isNode(text) || JSUS.isElement(text)) content = text;
        else content = document.createTextNode(text);
        root.appendChild(content);
        return content;
    };

    /**
     * ### DOM.writeln
     *
     * Write a text and a break into a root element
     *
     * Default break element is <br> tag
     *
     * @param {Element} root The HTML element where to write into
     * @param {mixed} text The text to write. Default, an ampty string
     * @param {string} rc the name of the tag to use as a break element
     *
     * @return {TextNode} The text node inserted in the root element