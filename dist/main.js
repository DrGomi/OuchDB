'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

var objectWithoutPropertiesLoose = _objectWithoutPropertiesLoose;

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = objectWithoutPropertiesLoose(source, excluded);
  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

var objectWithoutProperties = _objectWithoutProperties;

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

var arrayWithHoles = _arrayWithHoles;

function _iterableToArrayLimit(arr, i) {
  if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

var iterableToArrayLimit = _iterableToArrayLimit;

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

var arrayLikeToArray = _arrayLikeToArray;

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
}

var unsupportedIterableToArray = _unsupportedIterableToArray;

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var nonIterableRest = _nonIterableRest;

function _slicedToArray(arr, i) {
  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
}

var slicedToArray = _slicedToArray;

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return arrayLikeToArray(arr);
}

var arrayWithoutHoles = _arrayWithoutHoles;

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
}

var iterableToArray = _iterableToArray;

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var nonIterableSpread = _nonIterableSpread;

function _toConsumableArray(arr) {
  return arrayWithoutHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableSpread();
}

var toConsumableArray = _toConsumableArray;

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var runtime_1 = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined$1; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined$1) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined$1;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined$1;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined$1;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined$1, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined$1;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined$1;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined$1;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined$1;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined$1;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   module.exports 
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}
});

var regenerator = runtime_1;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

var asyncToGenerator = _asyncToGenerator;

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var classCallCheck = _classCallCheck;

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var createClass = _createClass;

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var defineProperty = _defineProperty;

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

// from : https://github.com/expo/expo/tree/master/packages/expo-sqlite/src
// interface DocSyncStateCheck {
//     guard: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) =>  Boolean;
//     action: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) => DocSyncAction;
// }
var OuchDB = /*#__PURE__*/function () {
  function OuchDB(db, httpClient) {
    var _this = this;

    classCallCheck(this, OuchDB);

    defineProperty(this, "db", void 0);

    defineProperty(this, "dbName", void 0);

    defineProperty(this, "httpClient", void 0);

    defineProperty(this, "takeSyncActions", {
      'delete': function _delete(tx, act) {
        return _this.deleteSyncAction(tx, act);
      },
      'add': function add(tx, act) {
        return _this.addSyncAction(tx, act);
      },
      'update': function update(tx, act) {
        return _this.updateSyncAction(tx, act);
      }
    });

    defineProperty(this, "testDocType", {
      isArray: function isArray(doc) {
        return toString.call(doc) === '[object Array]';
      },
      isObject: function isObject(doc) {
        return toString.call(doc) === '[object Object]';
      },
      hasID: function hasID(doc) {
        return '_id' in doc;
      },
      hasRev: function hasRev(doc) {
        return '_rev' in doc;
      }
    });

    defineProperty(this, "docPutErrors", [{
      test: function test(doc) {
        return !_this.testDocType.isObject(doc);
      },
      error: {
        status: 400,
        name: 'bad_request',
        message: 'Document must be a JSON object',
        error: true
      }
    }, {
      test: function test(doc) {
        return !_this.testDocType.hasID(doc);
      },
      error: {
        status: 412,
        name: 'missing_id',
        message: '_id is required for puts',
        error: true
      }
    }, {
      test: function test(doc) {
        return true;
      },
      error: undefined
    }]);

    defineProperty(this, "getTx", /*#__PURE__*/asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
      return regenerator.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", new Promise(function (resolve, reject) {
                return _this.db.transaction(function (tx) {
                  return resolve(tx);
                }, function (err) {
                  return reject(err);
                });
              }));

            case 1:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));

    defineProperty(this, "getAllRows", function () {
      return new Promise(function (resolve, reject) {
        return _this.db.transaction(function (tx) {
          return tx.executeSql("SELECT * FROM \"by-sequence\"", [], function (tx, res) {
            return resolve([tx, res]);
          }, function (tx, err) {
            return reject([tx, err]);
          });
        });
      });
    });

    defineProperty(this, "mapDocRows", function (res) {
      return Object.keys(res.rows).map(function (_) {
        return res.rows[_];
      })[0];
    });

    defineProperty(this, "getRevInt", function (inRev) {
      return parseInt(inRev.split('-')[0]);
    });

    defineProperty(this, "compareLocalDocs", function (left, right) {
      return left.doc_id !== right.doc_id ? true // : left == right ||
      : _this.getRevInt(left.rev) > _this.getRevInt(right.rev);
    });

    defineProperty(this, "compareSyncDocs", function (left, right) {
      return left.id !== right.id ? true : _this.getRevInt(left.value.rev) > _this.getRevInt(right.value.rev);
    });

    defineProperty(this, "check4SameID", function (docs, checkDoc) {
      return !!docs.find(function (doc) {
        return doc.doc_id === checkDoc.doc_id;
      });
    });

    defineProperty(this, "filterOldLocalRevs", function (origSeq) {
      return origSeq.reduce(function (acc, iter) {
        // try to filter out docs (with same id & lower revision) ...
        var filterRows = acc.filter(function (x) {
          return _this.compareLocalDocs(x, iter);
        }); // ...check if doc with same id is still present in filtered rows...

        return _this.check4SameID(filterRows, iter) ? filterRows // this doc's rev id higher 
        : [].concat(toConsumableArray(filterRows), [iter]); // OR: add the iter doc to list
      }, []);
    });

    defineProperty(this, "deleteRev", function (tx, doc) {
      return new Promise(function (resolve, reject) {
        return tx.executeSql("DELETE FROM \"by-sequence\" WHERE\n             doc_id = \"".concat(doc.doc_id, "\"\n             AND rev = \"").concat(doc.rev, "\""), [], function () {
          return resolve();
        }, function (err) {
          return reject(err);
        });
      });
    });

    defineProperty(this, "killOldRevs", function (origSeq, filterSeq) {
      return _this.getTx().then(function (tx) {
        return Promise.all(origSeq // only delete docs exclusive to origSeq
        .filter(function (x) {
          return !filterSeq.includes(x);
        }).map(function (x) {
          return _this.deleteRev(tx, x);
        }));
      });
    });

    defineProperty(this, "pruneOldLocalRevs", function () {
      return _this.getAllRows().then(function (txNrs) {
        var _txNrs = slicedToArray(txNrs, 2),
            _ = _txNrs[0],
            res = _txNrs[1];

        var origSeq = _this.mapDocRows(res);

        var filterSeq = _this.filterOldLocalRevs(origSeq);

        return _this.killOldRevs(origSeq, filterSeq);
      });
    });

    defineProperty(this, "getTables", function () {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql('SELECT tbl_name from sqlite_master WHERE type = "table"', [], function (tx, res) {
            return resolve([tx, res]);
          }, function (tx, err) {
            return reject([tx, err]);
          });
        });
      }).then(function (txCb) {
        var _txCb = slicedToArray(txCb, 2),
            _ = _txCb[0],
            res = _txCb[1];

        var tables = res.rows._array.map(function (y) {
          return y['tbl_name'];
        }); // const tables: string[] = res['rows']['_array'].map(y => y['tbl_name']);


        return Promise.resolve(tables);
      });
    });

    defineProperty(this, "drobTable", function (tx, tableName) {
      return new Promise(function (resolve, reject) {
        return tx.executeSql("DROP TABLE \"".concat(tableName, "\""), [], function (tx, res) {
          return resolve([tx, res]);
        }, function (tx, err) {
          return reject([tx, err]);
        });
      });
    });

    defineProperty(this, "dropFunnyTables", function () {
      return _this.getTx().then(function (tx) {
        return Promise.all(['attach-store', 'local-store', 'attach-seq-store', 'document-store', 'metadata-store'].map(function (x) {
          return _this.drobTable(tx, x);
        }));
      });
    });

    defineProperty(this, "getLocalAllDocs", function () {
      return _this.getAllRows().then(function (txNrs) {
        var _txNrs2 = slicedToArray(txNrs, 2),
            _ = _txNrs2[0],
            res = _txNrs2[1];

        var rows = _this.mapDocRows(res);

        var allDocs = {
          total_rows: rows.length,
          offset: 0,
          rows: rows.map(function (doc) {
            return {
              id: doc.doc_id,
              key: doc.doc_id,
              value: {
                rev: doc.rev
              }
            };
          })
        };
        return Promise.resolve(allDocs);
      });
    });

    defineProperty(this, "getCleanAllDocRows", function (rawResponse) {
      return rawResponse.rows.filter(function (row) {
        return row.id !== "_design/access";
      });
    });

    defineProperty(this, "sameIdNHigherRev", function (localDoc) {
      return function (remoteDoc) {
        return localDoc.id === remoteDoc.id && _this.getRevInt(localDoc.value.rev) < _this.getRevInt(remoteDoc.value.rev);
      };
    });

    defineProperty(this, "map2SyncAction", function (syncState) {
      return function (doc) {
        return {
          state: syncState,
          id: doc.id
        };
      };
    });

    defineProperty(this, "getChangedDocs", function (leftRows, rightRows) {
      return leftRows.filter(function (leftDoc) {
        return !!rightRows.find(_this.sameIdNHigherRev(leftDoc));
      }).map(_this.map2SyncAction('update'));
    });

    defineProperty(this, "getExclusiveDocs", function (leftRows, rightRows, syncState) {
      return leftRows.filter(function (lDoc) {
        return !rightRows.find(function (rDoc) {
          return lDoc.id === rDoc.id;
        });
      }).map(_this.map2SyncAction(syncState));
    });

    defineProperty(this, "compareWithRemote", function (localNremoteDocs) {
      // destructure all_docs-rows tuple
      var _localNremoteDocs = slicedToArray(localNremoteDocs, 2),
          localDocs = _localNremoteDocs[0],
          remoteDocs = _localNremoteDocs[1]; // changed docs need to be converted to 'update' actions


      var changedRows = _this.getChangedDocs(localDocs, remoteDocs); // docs exclusive to remote response need to be added to db


      var onlyRemoteRows = _this.getExclusiveDocs(remoteDocs, localDocs, 'add'); // docs exclusive present in local db need to be deleted from db


      var onlyLocalRows = _this.getExclusiveDocs(localDocs, remoteDocs, 'delete');

      return [].concat(toConsumableArray(changedRows), toConsumableArray(onlyRemoteRows), toConsumableArray(onlyLocalRows));
    });

    defineProperty(this, "updateSyncAction", function (tx, action) {
      return new Promise(function (resolve, reject) {
        var _action$doc = action.doc,
            _id = _action$doc._id,
            _rev = _action$doc._rev,
            jsonValue = objectWithoutProperties(_action$doc, ["_id", "_rev"]);

        var doc = action.doc,
            response = objectWithoutProperties(action, ["doc"]);

        tx.executeSql("UPDATE \"by-sequence\" SET json = ?, rev = ?  WHERE doc_id = ?", [JSON.stringify(jsonValue), doc._rev, doc._id], function (tx, res) {
          return resolve([tx, _objectSpread(_objectSpread({}, response), {
            done: 'success'
          })]);
        }, function (tx, err) {
          return reject([tx, err]);
        });
      });
    });

    defineProperty(this, "addSyncAction", function (tx, action) {
      return new Promise(function (resolve, reject) {
        var _action$doc2 = action.doc,
            _id = _action$doc2._id,
            _rev = _action$doc2._rev,
            jsonValue = objectWithoutProperties(_action$doc2, ["_id", "_rev"]);

        var doc = action.doc,
            response = objectWithoutProperties(action, ["doc"]);

        tx.executeSql("INSERT INTO \"by-sequence\" (json, deleted, doc_id, rev)\n                 VALUES (?, ?, ?, ?)", [JSON.stringify(jsonValue), 0, doc._id, doc._rev], function (tx, res) {
          return resolve([tx, _objectSpread(_objectSpread({}, response), {
            done: 'success'
          })]);
        }, function (tx, err) {
          return reject([tx, err]);
        });
      });
    });

    defineProperty(this, "deleteSyncAction", function (tx, action) {
      return new Promise(function (resolve, reject) {
        return tx.executeSql("DELETE FROM \"by-sequence\" WHERE doc_id = ?", [action.id], function (tx, res) {
          return resolve([tx, _objectSpread(_objectSpread({}, action), {
            done: 'success'
          })]);
        }, function (tx, err) {
          return reject([tx, err]);
        });
      });
    });

    defineProperty(this, "getRemoteDoc", function (docID) {
      return _this.httpClient.get("http://127.0.0.1:3000/".concat(docID));
    });

    defineProperty(this, "getAllRemoteDocs", function () {
      return (// need to change the endpoint
        _this.httpClient.get("http://127.0.0.1:3000/_all_docs?include_docs=true")
      );
    });

    defineProperty(this, "convertDoc2Map", function (acc, row) {
      acc[row.id] = row.doc;
      return acc;
    });

    defineProperty(this, "enrichDocSyncAction", function (action, docsMap) {
      return action.state !== 'delete' ? _objectSpread(_objectSpread({}, action), {
        doc: docsMap[action.id]
      }) : action;
    });

    defineProperty(this, "getRemoteDocs4SyncActions", function (actions) {
      return _this.getAllRemoteDocs().then(function (res) {
        var docsMap = res.rows.filter(function (row) {
          return row.id !== '_design/access';
        }).reduce(_this.convertDoc2Map, {});
        var enrichedActions = actions.reduce(function (acc, action) {
          return [].concat(toConsumableArray(acc), [_this.enrichDocSyncAction(action, docsMap)]);
        }, []);
        return Promise.resolve(enrichedActions);
      });
    });

    defineProperty(this, "enrichSyncActionsWithDocs", function (actions) {
      return !!actions.find(function (act) {
        return act.state === 'update' || act.state === 'add';
      }) ? _this.getRemoteDocs4SyncActions(actions) : Promise.resolve(actions) // below would also work since update/add actions are added before delete (see 'compareWithRemote()')
      // (actions[0].state === 'update' || actions[0].state === 'add') 
      ;
    });

    defineProperty(this, "syncAction2DB", function (tx, actions) {
      return actions.map(function (action) {
        return _this.takeSyncActions[action.state](tx, action);
      });
    });

    defineProperty(this, "syncAllActions2DB", function (actions) {
      return _this.getTx().then(function (tx) {
        return Promise.all(_this.syncAction2DB(tx, actions));
      });
    });

    defineProperty(this, "processSyncActions", function (actions) {
      return actions.length == 0 ? Promise.resolve([]) : _this.enrichSyncActionsWithDocs(actions).then(function (actions) {
        return _this.syncAllActions2DB(actions);
      });
    });

    defineProperty(this, "getDumpRows", function (dump) {
      var dumps = dump.split('\n');
      return dumps.length === 3 ? Promise.resolve(JSON.parse(dumps[1])['docs']) : _this.httpClient.get(dump).then(function (res) {
        return _this.getDumpRows(res);
      });
    });

    defineProperty(this, "insertDumpRows", function (rows) {
      return _this.getTx().then(function (tx) {
        var addActions = rows.map(function (doc) {
          return (// map doc to DocySyncAction
            {
              state: 'add',
              id: doc._id,
              doc: doc
            }
          );
        }).map(function (row) {
          return _this.addSyncAction(tx, row);
        });
        return Promise.all(addActions);
      });
    });

    defineProperty(this, "initDBtable", function () {
      return new Promise(function (resolve, reject) {
        return _this.db.transaction(function (tx) {
          return tx.executeSql("CREATE TABLE IF NOT EXISTS \"by-sequence\" (\n                        seq INTEGER PRIMARY KEY,\n                        json TEXT,\n                        deleted INT,\n                        doc_id TEXT unique,\n                        rev TEXT\n                    )", [], function (tx, res) {
            return resolve();
          }, function (tx, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "getDocCount", function () {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql('SELECT COUNT(*) as "docCount" FROM "by-sequence"', [], function (_, res) {
            return resolve(res.rows._array[0]['docCount']);
          }, function (_, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "getDoc", function (id) {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql("SELECT * FROM \"by-sequence\" WHERE doc_id=\"".concat(id, "\""), [], function (_, res) {
            return resolve(res.rows._array[0]);
          }, function (_, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "getAllDocs", function () {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql("SELECT * FROM \"by-sequence\"", [], function (_, res) {
            return resolve(res.rows);
          }, function (_, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "getAllDocsWithStartId", function (idStart) {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql("SELECT * FROM \"by-sequence\" WHERE id LIKE \"".concat(idStart, "%\""), [], function (_, res) {
            return resolve(res.rows._array);
          }, function (_, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "putDoc", function (id) {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql("SELECT * FROM \"by-sequence\" WHERE doc_id=\"".concat(id, "\""), [], function (_, res) {
            return resolve(res.rows._array[0]);
          }, function (_, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "getRev", function (id) {
      return new Promise(function (resolve, reject) {
        return _this.db.readTransaction(function (tx) {
          return tx.executeSql("SELECT rev FROM \"by-sequence\" WHERE doc_id=\"".concat(id, "\""), [], function (_, res) {
            return resolve(res.rows._array[0]['rev']);
          }, function (_, err) {
            return reject(err);
          });
        });
      });
    });

    defineProperty(this, "checkDocId", function (id) {
      return new Promise(function (resolve, reject) {
        return _this.db.transaction(function (tx) {
          return tx.executeSql("SELECT id FROM \"by-sequence\" WHERE doc_id=\"".concat(id, "\""), [], function (_, res) {
            return reject("Doc with id: ".concat(id, " already in db!"));
          }, function (tx, err) {
            return resolve(tx);
          });
        });
      });
    });

    defineProperty(this, "map2AllDoc", function (row) {
      return {
        id: row.doc_id,
        key: row.doc_id,
        value: {
          rev: row.rev
        }
      };
    });

    defineProperty(this, "map2AllFullDoc", function (row) {
      return {
        id: row.doc_id,
        key: row.doc_id,
        value: {
          rev: row.rev
        },
        doc: _objectSpread(_objectSpread({}, JSON.parse(row.json)), {
          _id: row.doc_id,
          _rev: row.rev
        })
      };
    });

    this.db = db;
    this.dbName = db['_db']['_db']['filename'];
    this.httpClient = httpClient; // this.initDBtable()
  } // resolves execution context from db


  createClass(OuchDB, [{
    key: "load",
    value: function load(dump) {
      var _this2 = this;

      return this.initDBtable().then(function () {
        return _this2.getDumpRows(dump);
      }).then(function (dumpRows) {
        return _this2.insertDumpRows(dumpRows);
      });
    } // checks if dump string contains dump or just a url to dump file...

  }, {
    key: "info",
    value: function info() {
      var _this3 = this;

      return this.getDocCount().then(function (docCount) {
        return {
          doc_count: docCount,
          update_seq: docCount,
          websql_encoding: 'UTF-8',
          db_name: _this3.db['_db']['_db']['filename'],
          auto_compaction: false,
          adapter: 'websql'
        };
      });
    }
  }, {
    key: "get",
    value: function get(id) {
      return this.getDoc(id).then(function (row) {
        var json = JSON.parse(row.json);
        return Promise.resolve(_objectSpread(_objectSpread({}, json), {
          _id: row.doc_id,
          _rev: row.rev
        }));
      })["catch"](function (err) {
        return Promise.reject({
          status: 404,
          name: 'not_found',
          message: 'missing',
          error: true,
          reason: 'missing',
          docId: id
        });
      }); // PouchError { TODO: need an OuchError
      //     status: 404,
      //     name: 'not_found',
      //     message: 'missing',
      //     error: true,
      //     reason: 'missing',
      //     docId: 'splinter'
      //   }
    }
  }, {
    key: "allDocs",
    value: function allDocs(option) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        return _this4.getAllDocs().then(function (rows) {
          if (!option) {
            var idNRevs = {
              total_rows: rows.length,
              offset: 0,
              rows: rows._array.map(_this4.map2AllDoc)
            };
            resolve(idNRevs);
          } else {
            var _idNRevs = {
              total_rows: rows.length,
              offset: 0,
              rows: rows._array.map(_this4.map2AllFullDoc)
            };
            resolve(_idNRevs);
          }
        });
      });
    }
  }, {
    key: "put",
    value: function put(doc) {
      var _this5 = this;

      var typeCheck = this.docPutErrors.find(function (i) {
        return i.test(doc);
      });

      if (!!typeCheck.error) {
        return Promise.reject(typeCheck.error);
      } else if ('_rev' in doc) {
        return this.getRev(doc._id).then(function (rev) {
          return rev === doc._rev ? Promise.resolve({
            ok: true,
            id: doc._id,
            rev: (_this5.getRevInt(rev) + 1).toString() + rev.slice(1)
          }) : Promise.reject();
        })["catch"](function (_) {
          return Promise.reject({
            status: 409,
            name: 'conflict',
            message: 'Document update conflict',
            error: true,
            id: doc._id,
            docId: doc._id
          });
        });
      } else {
        return this.checkDocId(doc._id).then(function (tx) {
          var addAction = {
            state: 'add',
            id: doc._id,
            doc: _objectSpread(_objectSpread({}, doc), {
              _rev: '1-XXXXX'
            })
          };
          return _this5.addSyncAction(tx, addAction);
        })["catch"](function () {
          return Promise.reject({
            status: 409,
            name: 'conflict',
            message: 'Document update conflict',
            error: true,
            id: doc._id,
            docId: doc._id
          });
        });
      }
    } // .then((row: PouchDBRow) => {
    //     const json = JSON.parse(row.json);
    //     return Promise.resolve({ 
    //         ...json,
    //         ...{
    //              _id: row.doc_id, 
    //              _rev: row.rev 
    //             } 
    //     });
    // })   
    // PouchError {
    //     status: 400,
    //     name: 'bad_request',
    //     message: 'Document must be a JSON object',
    //     error: true
    //   }
    // PouchError {
    //     status: 412,
    //     name: 'missing_id',
    //     message: '_id is required for puts',
    //     error: true
    //   }
    // PouchError { // no provided _rev???
    //     status: 404,
    //     name: 'not_found',
    //     message: 'missing',
    //     error: true,
    //     reason: 'missing',
    //     docId: 'splinter'
    //   }
    // PouchError { // 1st put: _rev provided but no doc present
    // & 2nd put: no _rev provided
    // & 2nd put wrong _rev provided
    //     status: 409,
    //     name: 'conflict',
    //     message: 'Document update conflict',
    //     error: true,
    //     id: 'splinter',
    //     docId: 'splinter'
    //   }
    // {  // 1st no _rev provided
    //     ok: true,
    //     id: 'splinter',
    //     rev: '1-a24f0fc8ad85f4de56ddbe793d0a7057' 
    // }

  }]);

  return OuchDB;
}();

exports.OuchDB = OuchDB;
//# sourceMappingURL=main.js.map
