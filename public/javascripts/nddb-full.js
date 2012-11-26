// vim: ts=4 sts=4 sw=4 expandtab
// -- kriskowal Kris Kowal Copyright (C) 2009-2011 MIT License
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License (Narwhal Project)
// -- dantman Daniel Friesen Copyright (C) 2010 XXX TODO License or CLA
// -- fschaefer Florian Schäfer Copyright (C) 2010 MIT License
// -- Gozala Irakli Gozalishvili Copyright (C) 2010 MIT License
// -- kitcambridge Kit Cambridge Copyright (C) 2011 MIT License
// -- kossnocorp Sasha Koss XXX TODO License or CLA
// -- bryanforbes Bryan Forbes XXX TODO License or CLA
// -- killdream Quildreen Motta XXX TODO License or CLA
// -- michaelficarra Michael Ficarra Copyright (C) 2011 3-clause BSD License
// -- sharkbrainguy Gerard Paapu Copyright (C) 2011 MIT License
// -- bbqsrc Brendan Molloy XXX TODO License or CLA
// -- iwyg XXX TODO License or CLA
// -- DomenicDenicola Domenic Denicola XXX TODO License or CLA
// -- xavierm02 Montillet Xavier XXX TODO License or CLA
// -- Raynos Raynos XXX TODO License or CLA
// -- samsonjs Sami Samhuri XXX TODO License or CLA
// -- rwldrn Rick Waldron XXX TODO License or CLA
// -- lexer Alexey Zakharov XXX TODO License or CLA

/*!
    Copyright (c) 2009, 280 North Inc. http://280north.com/
    MIT License. http://github.com/280north/narwhal/blob/master/README.md
*/

// Module systems magic dance
(function (definition) {
    // RequireJS
    if (typeof define == "function") {
        define(definition);
    // CommonJS and <script>
    } else {
        definition();
    }
})(function () {

/**
 * Brings an environment as close to ECMAScript 5 compliance
 * as is possible with the facilities of erstwhile engines.
 *
 * ES5 Draft
 * http://www.ecma-international.org/publications/files/drafts/tc39-2009-050.pdf
 *
 * NOTE: this is a draft, and as such, the URL is subject to change.  If the
 * link is broken, check in the parent directory for the latest TC39 PDF.
 * http://www.ecma-international.org/publications/files/drafts/
 *
 * Previous ES5 Draft
 * http://www.ecma-international.org/publications/files/drafts/tc39-2009-025.pdf
 * This is a broken link to the previous draft of ES5 on which most of the
 * numbered specification references and quotes herein were taken.  Updating
 * these references and quotes to reflect the new document would be a welcome
 * volunteer project.
 *
 * @module
 */

/*whatsupdoc*/

//
// Function
// ========
//

// ES-5 15.3.4.5
// http://www.ecma-international.org/publications/files/drafts/tc39-2009-025.pdf

if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
        // 1. Let Target be the this value.
        var target = this;
        // 2. If IsCallable(Target) is false, throw a TypeError exception.
        if (typeof target != "function")
            throw new TypeError(); // TODO message
        // 3. Let A be a new (possibly empty) internal list of all of the
        //   argument values provided after thisArg (arg1, arg2 etc), in order.
        // XXX slicedArgs will stand in for "A" if used
        var args = slice.call(arguments, 1); // for normal call
        // 4. Let F be a new native ECMAScript object.
        // 9. Set the [[Prototype]] internal property of F to the standard
        //   built-in Function prototype object as specified in 15.3.3.1.
        // 10. Set the [[Call]] internal property of F as described in
        //   15.3.4.5.1.
        // 11. Set the [[Construct]] internal property of F as described in
        //   15.3.4.5.2.
        // 12. Set the [[HasInstance]] internal property of F as described in
        //   15.3.4.5.3.
        // 13. The [[Scope]] internal property of F is unused and need not
        //   exist.
        var bound = function () {

            if (this instanceof bound) {
                // 15.3.4.5.2 [[Construct]]
                // When the [[Construct]] internal method of a function object,
                // F that was created using the bind function is called with a
                // list of arguments ExtraArgs the following steps are taken:
                // 1. Let target be the value of F's [[TargetFunction]]
                //   internal property.
                // 2. If target has no [[Construct]] internal method, a
                //   TypeError exception is thrown.
                // 3. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.

                var F = function(){};
                F.prototype = target.prototype;
                var self = new F;

                var result = target.apply(
                    self,
                    args.concat(slice.call(arguments))
                );
                if (result !== null && Object(result) === result)
                    return result;
                return self;

            } else {
                // 15.3.4.5.1 [[Call]]
                // When the [[Call]] internal method of a function object, F,
                // which was created using the bind function is called with a
                // this value and a list of arguments ExtraArgs the following
                // steps are taken:
                // 1. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 2. Let boundThis be the value of F's [[BoundThis]] internal
                //   property.
                // 3. Let target be the value of F's [[TargetFunction]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the list
                //   boundArgs in the same order followed by the same values as
                //   the list ExtraArgs in the same order. 5.  Return the
                //   result of calling the [[Call]] internal method of target
                //   providing boundThis as the this value and providing args
                //   as the arguments.

                // equiv: target.call(this, ...boundArgs, ...args)
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );

            }

        };
        // XXX bound.length is never writable, so don't even try
        //
        // 16. The length own property of F is given attributes as specified in
        //   15.3.5.1.
        // TODO
        // 17. Set the [[Extensible]] internal property of F to true.
        // TODO
        // 18. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "caller", PropertyDescriptor {[[Value]]: null,
        //   [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]:
        //   false}, and false.
        // TODO
        // 19. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "arguments", PropertyDescriptor {[[Value]]: null,
        //   [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]:
        //   false}, and false.
        // TODO
        // NOTE Function objects created using Function.prototype.bind do not
        // have a prototype property.
        // XXX can't delete it in pure-js.
        return bound;
    };
}

// Shortcut to an often accessed properties, in order to avoid multiple
// dereference that costs universally.
// _Please note: Shortcuts are defined after `Function.prototype.bind` as we
// us it in defining shortcuts.
var call = Function.prototype.call;
var prototypeOfArray = Array.prototype;
var prototypeOfObject = Object.prototype;
var slice = prototypeOfArray.slice;
var toString = call.bind(prototypeOfObject.toString);
var owns = call.bind(prototypeOfObject.hasOwnProperty);

// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;
if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
}

//
// Array
// =====
//

// ES5 15.4.3.2
if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
        return toString(obj) == "[object Array]";
    };
}

// The IsCallable() check in the Array functions
// has been replaced with a strict check on the
// internal class of the object to trap cases where
// the provided function was actually a regular
// expression literal, which in V8 and
// JavaScriptCore is a typeof "function".  Only in
// V8 are regular expression literals permitted as
// reduce parameters, so it is desirable in the
// general case for the shim to match the more
// strict and common behavior of rejecting regular
// expressions.

// ES5 15.4.4.18
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
        var self = toObject(this),
            thisp = arguments[1],
            i = 0,
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        while (i < length) {
            if (i in self) {
                // Invoke the callback function with call, passing arguments:
                // context, property value, property key, thisArg object context
                fun.call(thisp, self[i], i, self);
            }
            i++;
        }
    };
}

// ES5 15.4.4.19
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
        var self = toObject(this),
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        for (var i = 0; i < length; i++) {
            if (i in self)
                result[i] = fun.call(thisp, self[i], i, self);
        }
        return result;
    };
}

// ES5 15.4.4.20
if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            result = [],
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, self))
                result.push(self[i]);
        }
        return result;
    };
}

// ES5 15.4.4.16
if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, self))
                return false;
        }
        return true;
    };
}

// ES5 15.4.4.17
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, self))
                return true;
        }
        return false;
    };
}

// ES5 15.4.4.21
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
        var self = toObject(this),
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        // no value to return if no initial value and an empty array
        if (!length && arguments.length == 1)
            throw new TypeError(); // TODO message

        var i = 0;
        var result;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i++];
                    break;
                }

                // if array contains no values, no initial value to return
                if (++i >= length)
                    throw new TypeError(); // TODO message
            } while (true);
        }

        for (; i < length; i++) {
            if (i in self)
                result = fun.call(void 0, result, self[i], i, self);
        }

        return result;
    };
}

// ES5 15.4.4.22
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduceRight
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
        var self = toObject(this),
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        // no value to return if no initial value, empty array
        if (!length && arguments.length == 1)
            throw new TypeError(); // TODO message

        var result, i = length - 1;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i--];
                    break;
                }

                // if array contains no values, no initial value to return
                if (--i < 0)
                    throw new TypeError(); // TODO message
            } while (true);
        }

        do {
            if (i in this)
                result = fun.call(void 0, result, self[i], i, self);
        } while (i--);

        return result;
    };
}

// ES5 15.4.4.14
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
        var self = toObject(this),
            length = self.length >>> 0;

        if (!length)
            return -1;

        var i = 0;
        if (arguments.length > 1)
            i = toInteger(arguments[1]);

        // handle negative indices
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i < length; i++) {
            if (i in self && self[i] === sought) {
                return i;
            }
        }
        return -1;
    };
}

// ES5 15.4.4.15
if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
        var self = toObject(this),
            length = self.length >>> 0;

        if (!length)
            return -1;
        var i = length - 1;
        if (arguments.length > 1)
            i = toInteger(arguments[1]);
        // handle negative indices
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i >= 0; i--) {
            if (i in self && sought === self[i])
                return i;
        }
        return -1;
    };
}

//
// Object
// ======
//

// ES5 15.2.3.2
if (!Object.getPrototypeOf) {
    // https://github.com/kriskowal/es5-shim/issues#issue/2
    // http://ejohn.org/blog/objectgetprototypeof/
    // recommended by fschaefer on github
    Object.getPrototypeOf = function getPrototypeOf(object) {
        return object.__proto__ || (
            object.constructor ?
            object.constructor.prototype :
            prototypeOfObject
        );
    };
}

// ES5 15.2.3.3
if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a " +
                         "non-object: ";
    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT + object);
        // If object does not owns property return undefined immediately.
        if (!owns(object, property))
            return;

        var descriptor, getter, setter;

        // If object has a property then it's for sure both `enumerable` and
        // `configurable`.
        descriptor =  { enumerable: true, configurable: true };

        // If JS engine supports accessor properties then property may be a
        // getter or setter.
        if (supportsAccessors) {
            // Unfortunately `__lookupGetter__` will return a getter even
            // if object has own non getter property along with a same named
            // inherited getter. To avoid misbehavior we temporary remove
            // `__proto__` so that `__lookupGetter__` will return getter only
            // if it's owned by an object.
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;

            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);

            // Once we have getter and setter we can put values back.
            object.__proto__ = prototype;

            if (getter || setter) {
                if (getter) descriptor.get = getter;
                if (setter) descriptor.set = setter;

                // If it was accessor property we're done and return here
                // in order to avoid adding `value` to the descriptor.
                return descriptor;
            }
        }

        // If we got this far we know that object has an own property that is
        // not an accessor so we set it as a value and return descriptor.
        descriptor.value = object[property];
        return descriptor;
    };
}

// ES5 15.2.3.4
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
        return Object.keys(object);
    };
}

// ES5 15.2.3.5
if (!Object.create) {
    Object.create = function create(prototype, properties) {
        var object;
        if (prototype === null) {
            object = { "__proto__": null };
        } else {
            if (typeof prototype != "object")
                throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            // IE has no built-in implementation of `Object.getPrototypeOf`
            // neither `__proto__`, but this manually setting `__proto__` will
            // guarantee that `Object.getPrototypeOf` will work as expected with
            // objects created using `Object.create`
            object.__proto__ = prototype;
        }
        if (properties !== void 0)
            Object.defineProperties(object, properties);
        return object;
    };
}

// ES5 15.2.3.6

// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//     http://msdn.microsoft.com/en-us/library/dd282900.aspx
//     http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//     https://bugs.webkit.org/show_bug.cgi?id=36423

function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
        // returns falsy
    }
}

// check whether defineProperty works if it's given. Otherwise,
// shim partially.
if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        var definePropertyFallback = Object.defineProperty;
    }
}

if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                                      "on this javascript engine";

    Object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null)
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);

        // make a valiant attempt to use the real defineProperty
        // for I8's DOM elements.
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
                // try the shim if the real one doesn't work
            }
        }

        // If it's a data property.
        if (owns(descriptor, "value")) {
            // fail silently if "writable", "enumerable", or "configurable"
            // are requested but not supported
            /*
            // alternate approach:
            if ( // can't implement these features; allow false but not true
                !(owns(descriptor, "writable") ? descriptor.writable : true) ||
                !(owns(descriptor, "enumerable") ? descriptor.enumerable : true) ||
                !(owns(descriptor, "configurable") ? descriptor.configurable : true)
            )
                throw new RangeError(
                    "This implementation of Object.defineProperty does not " +
                    "support configurable, enumerable, or writable."
                );
            */

            if (supportsAccessors && (lookupGetter(object, property) ||
                                      lookupSetter(object, property)))
            {
                // As accessors are supported only on engines implementing
                // `__proto__` we can safely override `__proto__` while defining
                // a property to make sure that we don't hit an inherited
                // accessor.
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                // Deleting a property anyway since getter / setter may be
                // defined on object itself.
                delete object[property];
                object[property] = descriptor.value;
                // Setting original `__proto__` back now.
                object.__proto__ = prototype;
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors)
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            // If we got that far then getters and setters can be defined !!
            if (owns(descriptor, "get"))
                defineGetter(object, property, descriptor.get);
            if (owns(descriptor, "set"))
                defineSetter(object, property, descriptor.set);
        }

        return object;
    };
}

// ES5 15.2.3.7
if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
        for (var property in properties) {
            if (owns(properties, property))
                Object.defineProperty(object, property, properties[property]);
        }
        return object;
    };
}

// ES5 15.2.3.8
if (!Object.seal) {
    Object.seal = function seal(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// ES5 15.2.3.9
if (!Object.freeze) {
    Object.freeze = function freeze(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// detect a Rhino bug and patch it
try {
    Object.freeze(function () {});
} catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
        return function freeze(object) {
            if (typeof object == "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    })(Object.freeze);
}

// ES5 15.2.3.10
if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// ES5 15.2.3.11
if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
        return false;
    };
}

// ES5 15.2.3.12
if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
        return false;
    };
}

// ES5 15.2.3.13
if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
        // 1. If Type(O) is not Object throw a TypeError exception.
        if (Object(object) === object) {
            throw new TypeError(); // TODO message
        }
        // 2. Return the Boolean value of the [[Extensible]] internal property of O.
        var name = '';
        while (owns(object, name)) {
            name += '?';
        }
        object[name] = true;
        var returnValue = owns(object, name);
        delete object[name];
        return returnValue;
    };
}

// ES5 15.2.3.14
// http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
if (!Object.keys) {

    var hasDontEnumBug = true,
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;

    for (var key in {"toString": null})
        hasDontEnumBug = false;

    Object.keys = function keys(object) {

        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError("Object.keys called on a non-object");

        var keys = [];
        for (var name in object) {
            if (owns(object, name)) {
                keys.push(name);
            }
        }

        if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                var dontEnum = dontEnums[i];
                if (owns(object, dontEnum)) {
                    keys.push(dontEnum);
                }
            }
        }

        return keys;
    };

}

//
// Date
// ====
//

// ES5 15.9.5.43
// Format a Date object as a string according to a simplified subset of the ISO 8601
// standard as defined in 15.9.1.15.
if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function toISOString() {
        var result, length, value;
        if (!isFinite(this))
            throw new RangeError;

        // the date time string format is specified in 15.9.1.15.
        result = [this.getUTCFullYear(), this.getUTCMonth() + 1, this.getUTCDate(),
            this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()];

        length = result.length;
        while (length--) {
            value = result[length];
            // pad months, days, hours, minutes, and seconds to have two digits.
            if (value < 10)
                result[length] = "0" + value;
        }
        // pad milliseconds to have three digits.
        return result.slice(0, 3).join("-") + "T" + result.slice(3).join(":") + "." +
            ("000" + this.getUTCMilliseconds()).slice(-3) + "Z";
    }
}

// ES5 15.9.4.4
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

// ES5 15.9.5.44
if (!Date.prototype.toJSON) {
    Date.prototype.toJSON = function toJSON(key) {
        // This function provides a String representation of a Date object for
        // use by JSON.stringify (15.12.3). When the toJSON method is called
        // with argument key, the following steps are taken:

        // 1.  Let O be the result of calling ToObject, giving it the this
        // value as its argument.
        // 2. Let tv be ToPrimitive(O, hint Number).
        // 3. If tv is a Number and is not finite, return null.
        // XXX
        // 4. Let toISO be the result of calling the [[Get]] internal method of
        // O with argument "toISOString".
        // 5. If IsCallable(toISO) is false, throw a TypeError exception.
        if (typeof this.toISOString != "function")
            throw new TypeError(); // TODO message
        // 6. Return the result of calling the [[Call]] internal method of
        // toISO with O as the this value and an empty argument list.
        return this.toISOString();

        // NOTE 1 The argument is ignored.

        // NOTE 2 The toJSON function is intentionally generic; it does not
        // require that its this value be a Date object. Therefore, it can be
        // transferred to other kinds of objects for use as a method. However,
        // it does require that any such object have a toISOString method. An
        // object is free to use the argument key to filter its
        // stringification.
    };
}

// 15.9.4.2 Date.parse (string)
// 15.9.1.15 Date Time String Format
// Date.parse
// based on work shared by Daniel Friesen (dantman)
// http://gist.github.com/303249
if (isNaN(Date.parse("2011-06-15T21:40:05+06:00"))) {
    // XXX global assignment won't work in embeddings that use
    // an alternate object for the context.
    Date = (function(NativeDate) {

        // Date.length === 7
        var Date = function Date(Y, M, D, h, m, s, ms) {
            var length = arguments.length;
            if (this instanceof NativeDate) {
                var date = length == 1 && String(Y) === Y ? // isString(Y)
                    // We explicitly pass it through parse:
                    new NativeDate(Date.parse(Y)) :
                    // We have to manually make calls depending on argument
                    // length here
                    length >= 7 ? new NativeDate(Y, M, D, h, m, s, ms) :
                    length >= 6 ? new NativeDate(Y, M, D, h, m, s) :
                    length >= 5 ? new NativeDate(Y, M, D, h, m) :
                    length >= 4 ? new NativeDate(Y, M, D, h) :
                    length >= 3 ? new NativeDate(Y, M, D) :
                    length >= 2 ? new NativeDate(Y, M) :
                    length >= 1 ? new NativeDate(Y) :
                                  new NativeDate();
                // Prevent mixups with unfixed Date object
                date.constructor = Date;
                return date;
            }
            return NativeDate.apply(this, arguments);
        };

        // 15.9.1.15 Date Time String Format. This pattern does not implement
        // extended years (15.9.1.15.1), as `Date.UTC` cannot parse them.
        var isoDateExpression = new RegExp("^" +
            "(\\d{4})" + // four-digit year capture
            "(?:-(\\d{2})" + // optional month capture
            "(?:-(\\d{2})" + // optional day capture
            "(?:" + // capture hours:minutes:seconds.milliseconds
                "T(\\d{2})" + // hours capture
                ":(\\d{2})" + // minutes capture
                "(?:" + // optional :seconds.milliseconds
                    ":(\\d{2})" + // seconds capture
                    "(?:\\.(\\d{3}))?" + // milliseconds capture
                ")?" +
            "(?:" + // capture UTC offset component
                "Z|" + // UTC capture
                "(?:" + // offset specifier +/-hours:minutes
                    "([-+])" + // sign capture
                    "(\\d{2})" + // hours offset capture
                    ":(\\d{2})" + // minutes offset capture
                ")" +
            ")?)?)?)?" +
        "$");

        // Copy any custom methods a 3rd party library may have added
        for (var key in NativeDate)
            Date[key] = NativeDate[key];

        // Copy "native" methods explicitly; they may be non-enumerable
        Date.now = NativeDate.now;
        Date.UTC = NativeDate.UTC;
        Date.prototype = NativeDate.prototype;
        Date.prototype.constructor = Date;

        // Upgrade Date.parse to handle simplified ISO 8601 strings
        Date.parse = function parse(string) {
            var match = isoDateExpression.exec(string);
            if (match) {
                match.shift(); // kill match[0], the full match
                // parse months, days, hours, minutes, seconds, and milliseconds
                for (var i = 1; i < 7; i++) {
                    // provide default values if necessary
                    match[i] = +(match[i] || (i < 3 ? 1 : 0));
                    // match[1] is the month. Months are 0-11 in JavaScript
                    // `Date` objects, but 1-12 in ISO notation, so we
                    // decrement.
                    if (i == 1)
                        match[i]--;
                }

                // parse the UTC offset component
                var minuteOffset = +match.pop(), hourOffset = +match.pop(), sign = match.pop();

                // compute the explicit time zone offset if specified
                var offset = 0;
                if (sign) {
                    // detect invalid offsets and return early
                    if (hourOffset > 23 || minuteOffset > 59)
                        return NaN;

                    // express the provided time zone offset in minutes. The offset is
                    // negative for time zones west of UTC; positive otherwise.
                    offset = (hourOffset * 60 + minuteOffset) * 6e4 * (sign == "+" ? -1 : 1);
                }

                // compute a new UTC date value, accounting for the optional offset
                return NativeDate.UTC.apply(this, match) + offset;
            }
            return NativeDate.parse.apply(this, arguments);
        };

        return Date;
    })(Date);
}

//
// String
// ======
//

// ES5 15.5.4.20
var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
if (!String.prototype.trim || ws.trim()) {
    // http://blog.stevenlevithan.com/archives/faster-trim-javascript
    // http://perfectionkills.com/whitespace-deviations/
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
        trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
        return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
}

//
// Util
// ======
//

// http://jsperf.com/to-integer
var toInteger = function (n) {
    n = +n;
    if (n !== n) // isNaN
        n = -1;
    else if (n !== 0 && n !== (1/0) && n !== -(1/0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    return n;
};

var prepareString = "a"[0] != "a",
    // ES5 9.9
    toObject = function (o) {
        if (o == null) { // this matches both null and undefined
            throw new TypeError(); // TODO message
        }
        // If the implementation doesn't support by-index access of
        // string characters (ex. IE < 7), split the string
        if (prepareString && typeof o == "string" && o) {
            return o.split("");
        }
        return Object(o);
    };
});

/*
    http://www.JSON.org/json2.js
    2011-02-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    var global = Function('return this')()
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
    module.exports = JSON;
}());

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


var mainStorageType = null;

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
	if (!store.types.length) return false;
	if (store.types.length === 1 && store.type === "volatile") return false;
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