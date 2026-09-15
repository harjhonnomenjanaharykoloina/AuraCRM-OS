var RUNTIME_PUBLIC_PATH = "server/chunks/[turbopack]_runtime.js";
var RELATIVE_ROOT_PATH = "..";
var ASSET_PREFIX = "/";
// Apply forwarded globals from workerData if running in a worker thread
if (typeof require !== 'undefined') {
    try {
        var { workerData } = require('worker_threads');
        if (workerData?.__turbopack_globals__) {
            Object.assign(globalThis, workerData.__turbopack_globals__);
            // Remove internal data so it's not visible to user code
            delete workerData.__turbopack_globals__;
        }
    } catch (_) {
        // Not in a worker thread context, ignore
    }
}
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
/// <reference path="./async-module.ts" />
/**
 * Describes why a module was instantiated.
 * Shared between browser and Node.js runtimes.
 */ var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    /**
   * The module was instantiated because it was included in a chunk's hot module
   * update.
   * SourceData is an array of ModuleIds or undefined.
   */ SourceType[SourceType["Update"] = 2] = "Update";
    return SourceType;
}(SourceType || {});
/**
 * Flag indicating which module object type to create when a module is merged. Set to `true`
 * by each runtime that uses ModuleWithDirection (browser dev-base.ts, nodejs dev-base.ts,
 * nodejs build-base.ts). Browser production (build-base.ts) leaves it as `false` since it
 * uses plain Module objects.
 */ let createModuleWithDirectionFlag = false;
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache[id];
    if (!module) {
        if (createModuleWithDirectionFlag) {
            // set in development modes for hmr support
            module = createModuleWithDirection(id);
        } else {
            module = createModuleObject(id);
        }
        moduleCache[id] = module;
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
function createModuleWithDirection(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined,
        parents: [],
        children: []
    };
}
const BindingTag_Value = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings, dynamic) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    // The properties defined above are already non-configurable and
    // non-writable, so the namespace's existing exports are effectively
    // immutable. Sealing additionally makes the object non-extensible, matching
    // real ESM-namespace semantics. Modules with dynamic re-exports
    // (`export *` from a CommonJS module) must stay extensible so the dynamic
    // export proxy can surface keys discovered at runtime, so skip the seal for
    // them.
    if (!dynamic) Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id, dynamic) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings, dynamic);
}
contextPrototype.s = esmExport;
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        // Returns the re-exported object that provides `prop` as an own property,
        // or `undefined` if none does. The traps share this logic so they always
        // agree on which keys are synthesized from `reexportedObjects`. `default`
        // is never re-exported by `export *`, so it is never synthesized.
        const reexportOwning = (prop)=>{
            if (prop !== 'default') {
                for (const obj of reexportedObjects){
                    if (hasOwnProperty.call(obj, prop)) return obj;
                }
            }
            return undefined;
        };
        // Modules with dynamic re-exports are not sealed by `esm()`, so the
        // target beneath the namespace stays extensible. That is what lets the
        // `ownKeys` and `getOwnPropertyDescriptor` traps legally report keys that
        // exist on `reexportedObjects` but not on the target itself.
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                const obj = reexportOwning(prop);
                return obj && Reflect.get(obj, prop);
            },
            // The namespace is read-only, like a real esm namespace object. The
            // re-exported modules can still mutate their own exports (exposed live
            // via `get`), but mutating the namespace itself is rejected. Refusing
            // here, rather than forwarding to the extensible target, also prevents an
            // assignment/definition from shadowing a dynamic re-export. It also
            // prevents delete from removing a static export.
            set () {
                return false;
            },
            defineProperty () {
                return false;
            },
            deleteProperty () {
                return false;
            },
            // The `has` trap ensures that `'exportName' in starImports` will reflect
            // the truth of whether a key is exported.
            has (target, prop) {
                if (Reflect.has(target, prop)) return true;
                if (prop === 'default' || prop === '__esModule') return false;
                return reexportOwning(prop) !== undefined;
            },
            // ownKeys and getOwnPropertyDescriptor together make the keys enumerable.
            // If a value is returned from `ownKeys` but its property descriptor is
            // not enumerable, it will not be visible to iterator methods.
            // Collectively, they allow code like the following:
            //
            // ```
            // // module.js re-exports dynamic CJS exports
            // export * from './legacyModule.cjs'
            //
            // // from another JS file, reference the re-exported dynamic values
            // import * as Namespace from './module.js'
            // Object.keys(Namespace)
            // ```
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            },
            getOwnPropertyDescriptor (target, prop) {
                const own = Reflect.getOwnPropertyDescriptor(target, prop);
                if (own || prop === 'default' || prop === '__esModule') return own;
                const obj = reexportOwning(prop);
                if (obj) {
                    // Synthetic keys don't exist on the target, so they MUST be
                    // reported as configurable. However the set/delete traps above will
                    // prevent them from actually being changed
                    return {
                        enumerable: true,
                        configurable: true,
                        get: ()=>Reflect.get(obj, prop)
                    };
                }
                return undefined;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Install the factory for each module ID that doesn't already have one.
        // When some IDs in this group already have a factory, reuse that existing
        // group factory for the missing IDs to keep all IDs in the group consistent.
        // Otherwise, install the factory from this chunk.
        const moduleFactoryFn = chunkModules[end];
        let existingGroupFactory = undefined;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            const existingFactory = moduleFactories.get(id);
            if (existingFactory) {
                existingGroupFactory = existingFactory;
                break;
            }
        }
        const factoryToInstall = existingGroupFactory ?? moduleFactoryFn;
        let didInstallFactory = false;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            if (!moduleFactories.has(id)) {
                if (!didInstallFactory) {
                    if (factoryToInstall === moduleFactoryFn) {
                        applyModuleFactoryName(moduleFactoryFn);
                    }
                    didInstallFactory = true;
                }
                moduleFactories.set(id, factoryToInstall);
                newModuleId?.(id);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * Constructs an error message for when a module factory is not available.
 */ function factoryNotAvailableMessage(moduleId, sourceType, sourceData) {
    let instantiationReason;
    switch(sourceType){
        case 0:
            instantiationReason = `as a runtime entry of chunk ${sourceData}`;
            break;
        case 1:
            instantiationReason = `because it was required from module ${sourceData}`;
            break;
        case 2:
            instantiationReason = 'because of an HMR update';
            break;
        default:
            invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
    }
    return `Module ${moduleId} was instantiated ${instantiationReason}, but the module factory is not available.`;
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="./runtime-types.d.ts" />
/// <reference path="./runtime-utils.ts" />
/**
 * Top-level-await / async-module machinery. This is only included in the runtime
 * when the module graph actually contains an async module (a module with
 * top-level await, or one that transitively depends on one). When no async
 * module is present, the chunk items never reference `__turbopack_context__.a`,
 * so this whole file can be omitted.
 *
 * everything below is adapted from webpack
 * https://github.com/webpack/webpack/blob/6be4065ade1e252c1d8dcba4af0f43e32af1bdc1/lib/runtime/AsyncModuleRuntimeModule.js#L13
 */ const turbopackQueues = Symbol('turbopack queues');
const turbopackExports = Symbol('turbopack exports');
const turbopackError = Symbol('turbopack error');
function isPromise(maybePromise) {
    return maybePromise != null && typeof maybePromise === 'object' && 'then' in maybePromise && typeof maybePromise.then === 'function';
}
function isAsyncModuleExt(obj) {
    return turbopackQueues in obj;
}
function createPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        reject = rej;
        resolve = res;
    });
    return {
        promise,
        resolve: resolve,
        reject: reject
    };
}
function resolveQueue(queue) {
    if (queue && queue.status !== 1) {
        queue.status = 1;
        queue.forEach((fn)=>fn.queueCount--);
        queue.forEach((fn)=>fn.queueCount-- ? fn.queueCount++ : fn());
    }
}
function wrapDeps(deps) {
    return deps.map((dep)=>{
        if (dep !== null && typeof dep === 'object') {
            if (isAsyncModuleExt(dep)) return dep;
            if (isPromise(dep)) {
                const queue = Object.assign([], {
                    status: 0
                });
                const obj = {
                    [turbopackExports]: {},
                    [turbopackQueues]: (fn)=>fn(queue)
                };
                dep.then((res)=>{
                    obj[turbopackExports] = res;
                    resolveQueue(queue);
                }, (err)=>{
                    obj[turbopackError] = err;
                    resolveQueue(queue);
                });
                return obj;
            }
        }
        return {
            [turbopackExports]: dep,
            [turbopackQueues]: ()=>{}
        };
    });
}
function asyncModule(body, hasAwait) {
    const module = this.m;
    const queue = hasAwait ? Object.assign([], {
        status: -1
    }) : undefined;
    const depQueues = new Set();
    const { resolve, reject, promise: rawPromise } = createPromise();
    const promise = Object.assign(rawPromise, {
        [turbopackExports]: module.exports,
        [turbopackQueues]: (fn)=>{
            queue && fn(queue);
            depQueues.forEach(fn);
            promise['catch'](()=>{});
        }
    });
    const attributes = {
        get () {
            return promise;
        },
        set (v) {
            // Calling `esmExport` leads to this.
            if (v !== promise) {
                promise[turbopackExports] = v;
            }
        }
    };
    Object.defineProperty(module, 'exports', attributes);
    Object.defineProperty(module, 'namespaceObject', attributes);
    function handleAsyncDependencies(deps) {
        const currentDeps = wrapDeps(deps);
        const getResult = ()=>currentDeps.map((d)=>{
                if (d[turbopackError]) throw d[turbopackError];
                return d[turbopackExports];
            });
        const { promise, resolve } = createPromise();
        const fn = Object.assign(()=>resolve(getResult), {
            queueCount: 0
        });
        function fnQueue(q) {
            if (q !== queue && !depQueues.has(q)) {
                depQueues.add(q);
                if (q && q.status === 0) {
                    fn.queueCount++;
                    q.push(fn);
                }
            }
        }
        currentDeps.map((dep)=>dep[turbopackQueues](fnQueue));
        return fn.queueCount ? promise : getResult();
    }
    function asyncResult(err) {
        if (err) {
            reject(promise[turbopackError] = err);
        } else {
            resolve(promise[turbopackExports]);
        }
        resolveQueue(queue);
    }
    body(handleAsyncDependencies, asyncResult);
    if (queue && queue.status === -1) {
        queue.status = 0;
    }
}
contextPrototype.a = asyncModule;
/// <reference path="../shared/runtime/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  case "pg-71df57fbe79e18ab":
    raw = await import(".pnpm/pg@8.23.0/node_modules/pg");
    break;
  case "@prisma/client-127e3d410980433a/wasm":
    raw = await import("@prisma/client-127e3d410980433a/wasm");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/**
 * Returns an absolute `file://` URL for the given module path.
 *
 * Uses `url.pathToFileURL` so that the resulting URL is a valid file URI on
 * all platforms (forward slashes on Windows, drive letters handled
 * correctly, path segments URL-encoded).
 */ function resolveFileUrl(modulePath) {
    return require('url').pathToFileURL(resolveAbsolutePath(modulePath)).href;
}
Context.prototype.F = resolveFileUrl;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../../shared/runtime/runtime-utils.ts" />
/// <reference path="../../shared-node/base-externals-utils.ts" />
/// <reference path="../../shared-node/node-externals-utils.ts" />
/// <reference path="./nodejs-globals.d.ts" />
/**
 * Base Node.js runtime shared between production and development.
 * Contains chunk loading, module caching, and other non-HMR functionality.
 */ process.env.TURBOPACK = '1';
const url = require('url');
const moduleFactories = new Map();
const moduleCache = Object.create(null);
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
/**
 * Exports a URL value. No suffix is added in Node.js runtime.
 */ function exportUrl(urlValue, id) {
    exportValue.call(this, urlValue, id);
}
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
    loadedChunks.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
// Shared runtime primitive: the root that on-disk chunk paths are resolved
// against. Used by the bundled wasm helper (exposed as `__turbopack_runtime_root__`).
contextPrototype.w = RUNTIME_ROOT;
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-base.ts" />
/**
 * Production Node.js runtime.
 * Uses ModuleWithDirection and simple module instantiation without HMR support.
 */ // moduleCache and moduleFactories are declared in runtime-base.ts
// this is read in runtime-utils.ts so it creates a module with direction for hmr
createModuleWithDirectionFlag = true;
const nodeContextPrototype = Context.prototype;
nodeContextPrototype.q = exportUrl;
nodeContextPrototype.M = moduleFactories;
// Cast moduleCache to ModuleWithDirection for production mode
nodeContextPrototype.c = moduleCache;
nodeContextPrototype.R = resolvePathFromModule;
nodeContextPrototype.C = clearChunkCache;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        throw new Error(factoryNotAvailableMessage(id, sourceType, sourceData));
    }
    const module1 = createModuleWithDirection(id);
    const exports = module1.exports;
    moduleCache[id] = module1;
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    ;
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, SourceType.Parent, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, SourceType.Runtime, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/[externals]__1p04-11._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[externals]__1p04-11._.js");
      case "server/chunks/[root-of-the-server]__1vwmy90._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1vwmy90._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/ssr/1bqf_next_dist_15c7lxq._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_15c7lxq._.js");
      case "server/chunks/ssr/1bqf_next_dist_1dnpv3_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_1dnpv3_._.js");
      case "server/chunks/ssr/1bqf_next_dist_client_components_1e0i2tu._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_client_components_1e0i2tu._.js");
      case "server/chunks/ssr/1bqf_next_dist_client_components_builtin_forbidden_1ti6pb2.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_client_components_builtin_forbidden_1ti6pb2.js");
      case "server/chunks/ssr/1bqf_next_dist_client_components_builtin_unauthorized_16agf-a.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_client_components_builtin_unauthorized_16agf-a.js");
      case "server/chunks/ssr/1bqf_next_dist_compiled_@opentelemetry_api_index_1b0qwot.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_compiled_@opentelemetry_api_index_1b0qwot.js");
      case "server/chunks/ssr/1yq9_sonner_dist_index_mjs_1movuti._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1yq9_sonner_dist_index_mjs_1movuti._.js");
      case "server/chunks/ssr/[root-of-the-server]__05j7rgg._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__05j7rgg._.js");
      case "server/chunks/ssr/[root-of-the-server]__13j0imf._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__13j0imf._.js");
      case "server/chunks/ssr/[root-of-the-server]__1o753sh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1o753sh._.js");
      case "server/chunks/ssr/[root-of-the-server]__1susk_u._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1susk_u._.js");
      case "server/chunks/ssr/[root-of-the-server]__1sxerau._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1sxerau._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js");
      case "server/chunks/ssr/node_modules__pnpm_1izafc0._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1izafc0._.js");
      case "server/chunks/ssr/src_components_providers_tsx_09kw-mv._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_providers_tsx_09kw-mv._.js");
      case "server/chunks/ssr/06bi_zod_v4_classic_external_01y7syo.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/06bi_zod_v4_classic_external_01y7syo.js");
      case "server/chunks/ssr/0yvv_lucide-react_dist_esm_1i9-83k._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0yvv_lucide-react_dist_esm_1i9-83k._.js");
      case "server/chunks/ssr/1bqf_next_11n0geo._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_11n0geo._.js");
      case "server/chunks/ssr/1bqf_next_1e-b8l5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_1e-b8l5._.js");
      case "server/chunks/ssr/1bqf_next_dist_0toe4kd._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_0toe4kd._.js");
      case "server/chunks/ssr/1bqf_next_dist_client_components_builtin_global-error_0ecd0q1.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_client_components_builtin_global-error_0ecd0q1.js");
      case "server/chunks/ssr/[root-of-the-server]__06m0tl3._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__06m0tl3._.js");
      case "server/chunks/ssr/[root-of-the-server]__19sqfr5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__19sqfr5._.js");
      case "server/chunks/ssr/[root-of-the-server]__1vz4qsl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1vz4qsl._.js");
      case "server/chunks/ssr/_0cviq_y._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0cviq_y._.js");
      case "server/chunks/ssr/_0d8rni-._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0d8rni-._.js");
      case "server/chunks/ssr/_0jhtmj3._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0jhtmj3._.js");
      case "server/chunks/ssr/_0kgilco._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0kgilco._.js");
      case "server/chunks/ssr/_0z-v18h._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0z-v18h._.js");
      case "server/chunks/ssr/_1j-p8r7._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1j-p8r7._.js");
      case "server/chunks/ssr/_1yjs2ci._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1yjs2ci._.js");
      case "server/chunks/ssr/node_modules__pnpm_0gdx6vp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0gdx6vp._.js");
      case "server/chunks/ssr/node_modules__pnpm_16pkla1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_16pkla1._.js");
      case "server/chunks/ssr/node_modules__pnpm_1gufv5m._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1gufv5m._.js");
      case "server/chunks/ssr/node_modules__pnpm_1w9aa9v._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1w9aa9v._.js");
      case "server/chunks/ssr/src_actions_admin_admin-actions_ts_14oxfye._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_actions_admin_admin-actions_ts_14oxfye._.js");
      case "server/chunks/ssr/src_components_admin_apps_builder_builder-layout_tsx_0yho4w_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_apps_builder_builder-layout_tsx_0yho4w_._.js");
      case "server/chunks/ssr/src_components_ui_dropdown-menu_tsx_1xyz_k6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_dropdown-menu_tsx_1xyz_k6._.js");
      case "server/chunks/ssr/src_components_ui_scroll-area_tsx_0i-n_27._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_scroll-area_tsx_0i-n_27._.js");
      case "server/chunks/ssr/src_components_ui_select_tsx_0m__-6s._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_select_tsx_0m__-6s._.js");
      case "server/chunks/ssr/src_lib_metadata-dependencies_ts_0yt255t._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_metadata-dependencies_ts_0yt255t._.js");
      case "server/chunks/ssr/src_lib_utils_ts_02vl9dh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_utils_ts_02vl9dh._.js");
      case "server/chunks/ssr/06bi_zod_v4_0b24xd2._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/06bi_zod_v4_0b24xd2._.js");
      case "server/chunks/ssr/0yvv_lucide-react_dist_esm_1r8_mme._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0yvv_lucide-react_dist_esm_1r8_mme._.js");
      case "server/chunks/ssr/1i17_react-hook-form_dist_index_esm_mjs_1jbivgq._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1i17_react-hook-form_dist_index_esm_mjs_1jbivgq._.js");
      case "server/chunks/ssr/[root-of-the-server]__0xnd739._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0xnd739._.js");
      case "server/chunks/ssr/[root-of-the-server]__15wwv-8._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__15wwv-8._.js");
      case "server/chunks/ssr/_08bwq7i._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_08bwq7i._.js");
      case "server/chunks/ssr/_0xego9f._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0xego9f._.js");
      case "server/chunks/ssr/src_components_admin_apps_app-form_tsx_1xp966s._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_apps_app-form_tsx_1xp966s._.js");
      case "server/chunks/ssr/[root-of-the-server]__1wx4qux._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1wx4qux._.js");
      case "server/chunks/ssr/_11uahd3._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_11uahd3._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_apps_page_actions_0yld8vl.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_apps_page_actions_0yld8vl.js");
      case "server/chunks/ssr/src_lib_utils_ts_0m4hn6s._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_utils_ts_0m4hn6s._.js");
      case "server/chunks/ssr/1jng_app_(admin)_admin_assignment-rules_[objectId]_[ruleId]_page_actions_0k0gk7y.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1jng_app_(admin)_admin_assignment-rules_[objectId]_[ruleId]_page_actions_0k0gk7y.js");
      case "server/chunks/ssr/[root-of-the-server]__0ivz1kk._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ivz1kk._.js");
      case "server/chunks/ssr/_1tqx1h-._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1tqx1h-._.js");
      case "server/chunks/ssr/[root-of-the-server]__06uec56._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__06uec56._.js");
      case "server/chunks/ssr/[root-of-the-server]__0g11hb2._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0g11hb2._.js");
      case "server/chunks/ssr/_09z9mtw._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_09z9mtw._.js");
      case "server/chunks/ssr/_0jnf0c6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0jnf0c6._.js");
      case "server/chunks/ssr/_1liilxq._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1liilxq._.js");
      case "server/chunks/ssr/src_components_admin_assignment-rules_006nb8-._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_assignment-rules_006nb8-._.js");
      case "server/chunks/ssr/[root-of-the-server]__0i4q-mp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0i4q-mp._.js");
      case "server/chunks/ssr/[root-of-the-server]__0p92lwf._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0p92lwf._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_assignment-rules_page_actions_1cyhffs.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_assignment-rules_page_actions_1cyhffs.js");
      case "server/chunks/ssr/src_components_ui_table_tsx_18xq-sl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_table_tsx_18xq-sl._.js");
      case "server/chunks/ssr/[root-of-the-server]__0rq5jai._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0rq5jai._.js");
      case "server/chunks/ssr/[root-of-the-server]__1h8lkfc._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1h8lkfc._.js");
      case "server/chunks/ssr/_0q4unyb._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0q4unyb._.js");
      case "server/chunks/ssr/_0qh1zwv._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0qh1zwv._.js");
      case "server/chunks/ssr/src_components_admin_duplicate-rules_duplicate-rule-form_tsx_0ty9xbw._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_duplicate-rules_duplicate-rule-form_tsx_0ty9xbw._.js");
      case "server/chunks/ssr/[root-of-the-server]__0d6l5q4._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0d6l5q4._.js");
      case "server/chunks/ssr/[root-of-the-server]__19aqbce._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__19aqbce._.js");
      case "server/chunks/ssr/[root-of-the-server]__0lb2-yc._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0lb2-yc._.js");
      case "server/chunks/ssr/[root-of-the-server]__0zkilon._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0zkilon._.js");
      case "server/chunks/ssr/_0e6g9h6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0e6g9h6._.js");
      case "server/chunks/ssr/_0xhn47b._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0xhn47b._.js");
      case "server/chunks/ssr/_1ajtxrp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ajtxrp._.js");
      case "server/chunks/ssr/[root-of-the-server]__0_xwzsd._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0_xwzsd._.js");
      case "server/chunks/ssr/[root-of-the-server]__0ksbfkl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ksbfkl._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_duplicate-rules_page_actions_0lpm_91.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_duplicate-rules_page_actions_0lpm_91.js");
      case "server/chunks/ssr/[root-of-the-server]__1438uec._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1438uec._.js");
      case "server/chunks/ssr/[root-of-the-server]__1it_xv9._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1it_xv9._.js");
      case "server/chunks/ssr/[root-of-the-server]__1ur0iax._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1ur0iax._.js");
      case "server/chunks/ssr/_07610ik._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_07610ik._.js");
      case "server/chunks/ssr/_1-4prze._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1-4prze._.js");
      case "server/chunks/ssr/[root-of-the-server]__02d6uw6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__02d6uw6._.js");
      case "server/chunks/ssr/[root-of-the-server]__0pzz9v5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0pzz9v5._.js");
      case "server/chunks/ssr/_0cr07g1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0cr07g1._.js");
      case "server/chunks/ssr/_16p3jwr._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_16p3jwr._.js");
      case "server/chunks/ssr/src_components_admin_groups_create-group-dialog_tsx_0z7f2y6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_groups_create-group-dialog_tsx_0z7f2y6._.js");
      case "server/chunks/ssr/0yvv_lucide-react_dist_esm_0a-u3se._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0yvv_lucide-react_dist_esm_0a-u3se._.js");
      case "server/chunks/ssr/[root-of-the-server]__0jlchbh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0jlchbh._.js");
      case "server/chunks/ssr/[root-of-the-server]__107_9m0._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__107_9m0._.js");
      case "server/chunks/ssr/_01pb9x4._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_01pb9x4._.js");
      case "server/chunks/ssr/_0k409k2._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0k409k2._.js");
      case "server/chunks/ssr/_0oa55pn._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0oa55pn._.js");
      case "server/chunks/ssr/_1lhf_aj._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1lhf_aj._.js");
      case "server/chunks/ssr/src_components_admin_objects_036oodf._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_objects_036oodf._.js");
      case "server/chunks/ssr/src_components_ui_0lhj1v1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_0lhj1v1._.js");
      case "server/chunks/ssr/06bi_zod_v4_0-k8il1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/06bi_zod_v4_0-k8il1._.js");
      case "server/chunks/ssr/0yvv_lucide-react_dist_esm_icons_1wkxh62._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0yvv_lucide-react_dist_esm_icons_1wkxh62._.js");
      case "server/chunks/ssr/[root-of-the-server]__06-3oc8._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__06-3oc8._.js");
      case "server/chunks/ssr/[root-of-the-server]__0uottso._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0uottso._.js");
      case "server/chunks/ssr/_0ev-zgh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0ev-zgh._.js");
      case "server/chunks/ssr/_0q2nu9k._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0q2nu9k._.js");
      case "server/chunks/ssr/_0vl8kn_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0vl8kn_._.js");
      case "server/chunks/ssr/_174dxna._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_174dxna._.js");
      case "server/chunks/ssr/_18bp3de._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_18bp3de._.js");
      case "server/chunks/ssr/src_components_admin_objects_record-page-builder_tsx_19n0ok0._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_objects_record-page-builder_tsx_19n0ok0._.js");
      case "server/chunks/ssr/[root-of-the-server]__0ffix21._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ffix21._.js");
      case "server/chunks/ssr/[root-of-the-server]__0mtm3kq._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0mtm3kq._.js");
      case "server/chunks/ssr/_1ep9cxu._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ep9cxu._.js");
      case "server/chunks/ssr/src_components_admin_objects_validation-rule-form_tsx_10968u2._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_objects_validation-rule-form_tsx_10968u2._.js");
      case "server/chunks/ssr/src_components_ui_tooltip_tsx_0paor_t._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_tooltip_tsx_0paor_t._.js");
      case "server/chunks/ssr/[root-of-the-server]__10k419u._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__10k419u._.js");
      case "server/chunks/ssr/[root-of-the-server]__12hbw2q._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__12hbw2q._.js");
      case "server/chunks/ssr/_0_9-qxc._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0_9-qxc._.js");
      case "server/chunks/ssr/_1p_yj-y._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1p_yj-y._.js");
      case "server/chunks/ssr/_1ykp_j4._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ykp_j4._.js");
      case "server/chunks/ssr/_1yvb6on._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1yvb6on._.js");
      case "server/chunks/ssr/[root-of-the-server]__1_q9fgj._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1_q9fgj._.js");
      case "server/chunks/ssr/[root-of-the-server]__1avk7wj._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1avk7wj._.js");
      case "server/chunks/ssr/_0iogbl_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0iogbl_._.js");
      case "server/chunks/ssr/_1ip02na._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ip02na._.js");
      case "server/chunks/ssr/_1o8vk7x._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1o8vk7x._.js");
      case "server/chunks/ssr/_1w0au56._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1w0au56._.js");
      case "server/chunks/ssr/1oeh_server_app_(admin)_admin_permission-groups_[id]_page_actions_0lb5fon.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_(admin)_admin_permission-groups_[id]_page_actions_0lb5fon.js");
      case "server/chunks/ssr/[root-of-the-server]__1h7e2he._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1h7e2he._.js");
      case "server/chunks/ssr/[root-of-the-server]__1j3r-cw._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1j3r-cw._.js");
      case "server/chunks/ssr/_0b8_34r._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0b8_34r._.js");
      case "server/chunks/ssr/_0ouydms._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0ouydms._.js");
      case "server/chunks/ssr/_1w-hrlm._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1w-hrlm._.js");
      case "server/chunks/ssr/[root-of-the-server]__0qkizlc._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0qkizlc._.js");
      case "server/chunks/ssr/_0luq197._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0luq197._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_permission-groups_page_actions_1-y78da.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_permission-groups_page_actions_1-y78da.js");
      case "server/chunks/ssr/src_components_admin_permissions_create-permission-group-dialog_tsx_0typmfv._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_permissions_create-permission-group-dialog_tsx_0typmfv._.js");
      case "server/chunks/ssr/[root-of-the-server]__0igqt4s._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0igqt4s._.js");
      case "server/chunks/ssr/_094ry_u._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_094ry_u._.js");
      case "server/chunks/ssr/_1kqqdzb._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1kqqdzb._.js");
      case "server/chunks/ssr/_1ycb64r._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ycb64r._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_permissions_[id]_page_actions_18559fj.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_permissions_[id]_page_actions_18559fj.js");
      case "server/chunks/ssr/src_components_admin_permissions_08wdvry._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_permissions_08wdvry._.js");
      case "server/chunks/ssr/[root-of-the-server]__00uzrl5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__00uzrl5._.js");
      case "server/chunks/ssr/_1uehrlg._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1uehrlg._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_permissions_page_actions_1r6rvo_.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_permissions_page_actions_1r6rvo_.js");
      case "server/chunks/ssr/src_components_admin_permissions_create-permission-set-dialog_tsx_1olbbhy._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_permissions_create-permission-set-dialog_tsx_1olbbhy._.js");
      case "server/chunks/ssr/[root-of-the-server]__0906re1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0906re1._.js");
      case "server/chunks/ssr/_07blu1_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_07blu1_._.js");
      case "server/chunks/ssr/_0n2p0to._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0n2p0to._.js");
      case "server/chunks/ssr/_0omki-n._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0omki-n._.js");
      case "server/chunks/ssr/[root-of-the-server]__00-xrs-._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__00-xrs-._.js");
      case "server/chunks/ssr/_0nf-rtj._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0nf-rtj._.js");
      case "server/chunks/ssr/_1ilc0gp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ilc0gp._.js");
      case "server/chunks/ssr/src_components_admin_queues_create-queue-dialog_tsx_0r2rscl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_queues_create-queue-dialog_tsx_0r2rscl._.js");
      case "server/chunks/ssr/[root-of-the-server]__0ynpvc8._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ynpvc8._.js");
      case "server/chunks/ssr/[root-of-the-server]__1yn80xf._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1yn80xf._.js");
      case "server/chunks/ssr/_0_u28t7._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0_u28t7._.js");
      case "server/chunks/ssr/_0twuwc6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0twuwc6._.js");
      case "server/chunks/ssr/_1s8smj1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1s8smj1._.js");
      case "server/chunks/ssr/src_components_admin_sharing-rules_sharing-rule-form_tsx_1d1arsz._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_sharing-rules_sharing-rule-form_tsx_1d1arsz._.js");
      case "server/chunks/ssr/[root-of-the-server]__0r4cy-x._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0r4cy-x._.js");
      case "server/chunks/ssr/[root-of-the-server]__1q62lzq._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1q62lzq._.js");
      case "server/chunks/ssr/[root-of-the-server]__051fk5m._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__051fk5m._.js");
      case "server/chunks/ssr/[root-of-the-server]__0gnywxv._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0gnywxv._.js");
      case "server/chunks/ssr/_0l90e0g._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0l90e0g._.js");
      case "server/chunks/ssr/_1f52ox1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1f52ox1._.js");
      case "server/chunks/ssr/[root-of-the-server]__1a5ot82._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1a5ot82._.js");
      case "server/chunks/ssr/_1vonx2a._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1vonx2a._.js");
      case "server/chunks/ssr/_next-internal_server_app_(admin)_admin_sharing-rules_page_actions_0-yia91.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(admin)_admin_sharing-rules_page_actions_0-yia91.js");
      case "server/chunks/ssr/[root-of-the-server]__092wxal._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__092wxal._.js");
      case "server/chunks/ssr/[root-of-the-server]__0kge8i6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0kge8i6._.js");
      case "server/chunks/ssr/[root-of-the-server]__0v2q8s-._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0v2q8s-._.js");
      case "server/chunks/ssr/[root-of-the-server]__1fpm4ls._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1fpm4ls._.js");
      case "server/chunks/ssr/_061kqbu._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_061kqbu._.js");
      case "server/chunks/ssr/_0nevaab._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0nevaab._.js");
      case "server/chunks/ssr/_1xgwjez._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1xgwjez._.js");
      case "server/chunks/ssr/src_07zem35._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_07zem35._.js");
      case "server/chunks/ssr/src_actions_admin_user-actions_ts_12d-izh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_actions_admin_user-actions_ts_12d-izh._.js");
      case "server/chunks/ssr/src_components_admin_users_1e5r_nh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_users_1e5r_nh._.js");
      case "server/chunks/ssr/src_components_standard_record_record-form_tsx_1uvnv8z._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_standard_record_record-form_tsx_1uvnv8z._.js");
      case "server/chunks/ssr/[root-of-the-server]__0idcbi0._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0idcbi0._.js");
      case "server/chunks/ssr/[root-of-the-server]__1116zlr._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1116zlr._.js");
      case "server/chunks/ssr/[root-of-the-server]__1tobrs3._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1tobrs3._.js");
      case "server/chunks/ssr/_07d7ynm._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_07d7ynm._.js");
      case "server/chunks/ssr/_0vjlu7b._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0vjlu7b._.js");
      case "server/chunks/ssr/src_components_admin_users_invite-user-dialog_tsx_1l6dj22._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_users_invite-user-dialog_tsx_1l6dj22._.js");
      case "server/chunks/ssr/[root-of-the-server]__0mzp77-._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0mzp77-._.js");
      case "server/chunks/ssr/[root-of-the-server]__0qr2b0a._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0qr2b0a._.js");
      case "server/chunks/ssr/[root-of-the-server]__10vc1_i._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__10vc1_i._.js");
      case "server/chunks/ssr/_0y1w6gd._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0y1w6gd._.js");
      case "server/chunks/ssr/_1r4-mtt._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1r4-mtt._.js");
      case "server/chunks/ssr/_next-internal_server_app_(auth)_login_page_actions_1jr42c1.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(auth)_login_page_actions_1jr42c1.js");
      case "server/chunks/ssr/node_modules__pnpm_0yibm_2._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0yibm_2._.js");
      case "server/chunks/ssr/[root-of-the-server]__0abey71._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0abey71._.js");
      case "server/chunks/ssr/[root-of-the-server]__0rwecas._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0rwecas._.js");
      case "server/chunks/ssr/_1-gf03f._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1-gf03f._.js");
      case "server/chunks/ssr/0yvv_lucide-react_dist_esm_icons_1737dmi._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0yvv_lucide-react_dist_esm_icons_1737dmi._.js");
      case "server/chunks/ssr/0zw8_date-fns_format_19n6sq7.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0zw8_date-fns_format_19n6sq7.js");
      case "server/chunks/ssr/[root-of-the-server]__00jl54y._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__00jl54y._.js");
      case "server/chunks/ssr/[root-of-the-server]__026p9el._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__026p9el._.js");
      case "server/chunks/ssr/[root-of-the-server]__07tzztg._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__07tzztg._.js");
      case "server/chunks/ssr/[root-of-the-server]__1f18357._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1f18357._.js");
      case "server/chunks/ssr/[root-of-the-server]__1j9jtyx._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1j9jtyx._.js");
      case "server/chunks/ssr/[root-of-the-server]__1vbqm6e._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1vbqm6e._.js");
      case "server/chunks/ssr/_06ufcmf._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_06ufcmf._.js");
      case "server/chunks/ssr/_0df2oh6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0df2oh6._.js");
      case "server/chunks/ssr/_1b69rer._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1b69rer._.js");
      case "server/chunks/ssr/_1m0--en._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1m0--en._.js");
      case "server/chunks/ssr/node_modules__pnpm_1b0sl47._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1b0sl47._.js");
      case "server/chunks/ssr/src_components_standard_layout_204hwgo._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_standard_layout_204hwgo._.js");
      case "server/chunks/ssr/src_components_standard_record_record-detail_tsx_0k85wrl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_standard_record_record-detail_tsx_0k85wrl._.js");
      case "server/chunks/09i2_app_[appApiName]_[objectApiName]_import_[jobId]_errors_route_actions_1tvw0wr.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/09i2_app_[appApiName]_[objectApiName]_import_[jobId]_errors_route_actions_1tvw0wr.js");
      case "server/chunks/[root-of-the-server]__11o_qli._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__11o_qli._.js");
      case "server/chunks/[root-of-the-server]__1qjg1sg._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1qjg1sg._.js");
      case "server/chunks/_0y8_bpy._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_0y8_bpy._.js");
      case "server/chunks/ssr/0ivl_(standard)_app_[appApiName]_[objectApiName]_import_[jobId]_page_actions_0x0rp1p.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0ivl_(standard)_app_[appApiName]_[objectApiName]_import_[jobId]_page_actions_0x0rp1p.js");
      case "server/chunks/ssr/[root-of-the-server]__1-yy9lr._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1-yy9lr._.js");
      case "server/chunks/ssr/_18sljvg._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_18sljvg._.js");
      case "server/chunks/ssr/1veg_csv-parse_lib_sync_0y-l2tb.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1veg_csv-parse_lib_sync_0y-l2tb.js");
      case "server/chunks/ssr/[root-of-the-server]__094mggi._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__094mggi._.js");
      case "server/chunks/ssr/[root-of-the-server]__0xj3ic6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0xj3ic6._.js");
      case "server/chunks/ssr/_1-doi7g._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1-doi7g._.js");
      case "server/chunks/ssr/_1hvbbgk._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1hvbbgk._.js");
      case "server/chunks/ssr/src_components_standard_import_16-yslt._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_standard_import_16-yslt._.js");
      case "server/chunks/09i2_app_[appApiName]_[objectApiName]_import_template_route_actions_0agp1lx.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/09i2_app_[appApiName]_[objectApiName]_import_template_route_actions_0agp1lx.js");
      case "server/chunks/[root-of-the-server]__0wn666j._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0wn666j._.js");
      case "server/chunks/_1szqp7r._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_1szqp7r._.js");
      case "server/chunks/ssr/[root-of-the-server]__0uv9uvm._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0uv9uvm._.js");
      case "server/chunks/ssr/[root-of-the-server]__13kam7i._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__13kam7i._.js");
      case "server/chunks/ssr/_0b_altl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0b_altl._.js");
      case "server/chunks/ssr/_15-buyn._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_15-buyn._.js");
      case "server/chunks/ssr/src_components_standard_views_data-table_tsx_01i02vd._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_standard_views_data-table_tsx_01i02vd._.js");
      case "server/chunks/ssr/[root-of-the-server]__15njm6y._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__15njm6y._.js");
      case "server/chunks/ssr/_06iknk1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_06iknk1._.js");
      case "server/chunks/ssr/_0j88qmh._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0j88qmh._.js");
      case "server/chunks/ssr/_0m23l5w._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0m23l5w._.js");
      case "server/chunks/ssr/_17at1_l._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_17at1_l._.js");
      case "server/chunks/ssr/node_modules__pnpm_0gynmim._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0gynmim._.js");
      case "server/chunks/ssr/node_modules__pnpm_108iw8k._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_108iw8k._.js");
      case "server/chunks/ssr/node_modules__pnpm_1gwsr6a._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1gwsr6a._.js");
      case "server/chunks/ssr/[root-of-the-server]__17-x1dj._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__17-x1dj._.js");
      case "server/chunks/ssr/_next-internal_server_app_(standard)_app_[appApiName]_page_actions_18cceeq.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(standard)_app_[appApiName]_page_actions_18cceeq.js");
      case "server/chunks/ssr/1oeh_server_app_(standard)_app_[appApiName]_search_page_actions_03daj7y.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_(standard)_app_[appApiName]_search_page_actions_03daj7y.js");
      case "server/chunks/ssr/[root-of-the-server]__0ndb1e_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ndb1e_._.js");
      case "server/chunks/ssr/src_components_1dz_hhk._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_1dz_hhk._.js");
      case "server/chunks/ssr/[root-of-the-server]__0t469d3._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0t469d3._.js");
      case "server/chunks/ssr/_0qp6-u5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_0qp6-u5._.js");
      case "server/chunks/ssr/_next-internal_server_app_(standard)_no-apps_page_actions_0rvcym5.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_(standard)_no-apps_page_actions_0rvcym5.js");
      case "server/chunks/ssr/node_modules__pnpm_1611jsa._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1611jsa._.js");
      case "server/chunks/ssr/[root-of-the-server]__11_-j1e._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__11_-j1e._.js");
      case "server/chunks/ssr/[root-of-the-server]__1w2f5xr._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1w2f5xr._.js");
      case "server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-.js");
      case "server/chunks/[root-of-the-server]__10luakr._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__10luakr._.js");
      case "server/chunks/_next-internal_server_app_api_auth_[___nextauth]_route_actions_08nexdk.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_auth_[___nextauth]_route_actions_08nexdk.js");
      case "server/chunks/[root-of-the-server]__1dka40_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1dka40_._.js");
      case "server/chunks/_next-internal_server_app_api_fields_[objectApiName]_route_actions_0r8zk3_.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_fields_[objectApiName]_route_actions_0r8zk3_.js");
      case "server/chunks/[root-of-the-server]__1_lsk46._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1_lsk46._.js");
      case "server/chunks/_0q9yf6r._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_0q9yf6r._.js");
      case "server/chunks/_next-internal_server_app_api_files_[id]_route_actions_09u_zzl.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_files_[id]_route_actions_09u_zzl.js");
      case "server/chunks/_0lx-0jc._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_0lx-0jc._.js");
      case "server/chunks/_next-internal_server_app_api_files_upload_route_actions_0l_s3zz.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_files_upload_route_actions_0l_s3zz.js");
      case "server/chunks/[root-of-the-server]__1sa02qb._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1sa02qb._.js");
      case "server/chunks/_next-internal_server_app_api_notifications_route_actions_1272ib8.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notifications_route_actions_1272ib8.js");
      case "server/chunks/[root-of-the-server]__13gjykp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__13gjykp._.js");
      case "server/chunks/_1nqdxl9._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_1nqdxl9._.js");
      case "server/chunks/_next-internal_server_app_api_search_global_route_actions_1z8fum_.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_search_global_route_actions_1z8fum_.js");
      case "server/chunks/[externals]__14kfdpf._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/[externals]__14kfdpf._.js");
      case "server/chunks/_0njjn0_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_0njjn0_._.js");
      case "server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjls.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjls.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_blockDiagram-868be97b_1917m_7.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_blockDiagram-868be97b_1917m_7.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_c4Diagram-3f4bdde3_0xea_ay.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_c4Diagram-3f4bdde3_0xea_ay.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_createText-aed3d8b3_0uxy276.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_createText-aed3d8b3_0uxy276.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_edges-b2856ca0_1xqt68z.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_edges-b2856ca0_1xqt68z.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_erDiagram-5d81789a_0_7afdd.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_erDiagram-5d81789a_0_7afdd.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_flowDb-185abca5_1ipq0av.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_flowDb-185abca5_1ipq0av.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_flowDiagram-1629c991_1ab21k5.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_flowDiagram-1629c991_1ab21k5.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_gitGraphDiagram-f01e8bc2_08zdfwb.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_gitGraphDiagram-f01e8bc2_08zdfwb.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_index-9bae90f3_182shts.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_index-9bae90f3_182shts.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_journeyDiagram-95396277_1gn2ctn.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_journeyDiagram-95396277_1gn2ctn.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_pieDiagram-c941bede_0lt1l8z.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_pieDiagram-c941bede_0lt1l8z.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_quadrantDiagram-cf8b8fe0_0edsnmo.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_quadrantDiagram-cf8b8fe0_0edsnmo.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_requirementDiagram-53bda41b_209j-ar.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_requirementDiagram-53bda41b_209j-ar.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_sankeyDiagram-c3ef121a_1j2ev4t.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_sankeyDiagram-c3ef121a_1j2ev4t.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_sequenceDiagram-82a5b84f_0uam1wz.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_sequenceDiagram-82a5b84f_0uam1wz.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_styles-455b33cd_0xz-6v2.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_styles-455b33cd_0xz-6v2.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_styles-fcc2142b_0nmvb_n.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_styles-fcc2142b_0nmvb_n.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_timeline-definition-7545f45a_0x6w82v.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_timeline-definition-7545f45a_0x6w82v.js");
      case "server/chunks/ssr/0_i6_mermaid_dist_xychartDiagram-3f383b91_0_81jtg.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/0_i6_mermaid_dist_xychartDiagram-3f383b91_0_81jtg.js");
      case "server/chunks/ssr/1bqf_next_dist_0v-5utl._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1bqf_next_dist_0v-5utl._.js");
      case "server/chunks/ssr/1u84_katex_dist_katex_mjs_1sth3te._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/1u84_katex_dist_katex_mjs_1sth3te._.js");
      case "server/chunks/ssr/[root-of-the-server]__07b1zqp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__07b1zqp._.js");
      case "server/chunks/ssr/[root-of-the-server]__0s72wmd._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0s72wmd._.js");
      case "server/chunks/ssr/[root-of-the-server]__1-v-q3f._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1-v-q3f._.js");
      case "server/chunks/ssr/[root-of-the-server]__168elkz._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__168elkz._.js");
      case "server/chunks/ssr/[root-of-the-server]__1xtc_92._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1xtc_92._.js");
      case "server/chunks/ssr/_1ag4u5b._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_1ag4u5b._.js");
      case "server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js");
      case "server/chunks/ssr/node_modules__pnpm_017rpa_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_017rpa_._.js");
      case "server/chunks/ssr/node_modules__pnpm_02h__oc._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_02h__oc._.js");
      case "server/chunks/ssr/node_modules__pnpm_02rg5xb._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_02rg5xb._.js");
      case "server/chunks/ssr/node_modules__pnpm_02xpupi._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_02xpupi._.js");
      case "server/chunks/ssr/node_modules__pnpm_052aeo6._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_052aeo6._.js");
      case "server/chunks/ssr/node_modules__pnpm_064-b70._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_064-b70._.js");
      case "server/chunks/ssr/node_modules__pnpm_07ojtf3._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_07ojtf3._.js");
      case "server/chunks/ssr/node_modules__pnpm_07t9pta._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_07t9pta._.js");
      case "server/chunks/ssr/node_modules__pnpm_0_g3glr._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0_g3glr._.js");
      case "server/chunks/ssr/node_modules__pnpm_0_o4zy9._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0_o4zy9._.js");
      case "server/chunks/ssr/node_modules__pnpm_0i1bcz5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0i1bcz5._.js");
      case "server/chunks/ssr/node_modules__pnpm_0k43_b9._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0k43_b9._.js");
      case "server/chunks/ssr/node_modules__pnpm_0kh5bxj._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0kh5bxj._.js");
      case "server/chunks/ssr/node_modules__pnpm_0km-cxp._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0km-cxp._.js");
      case "server/chunks/ssr/node_modules__pnpm_0nf6kh8._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0nf6kh8._.js");
      case "server/chunks/ssr/node_modules__pnpm_0p9cb4n._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0p9cb4n._.js");
      case "server/chunks/ssr/node_modules__pnpm_0soq_-2._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0soq_-2._.js");
      case "server/chunks/ssr/node_modules__pnpm_0vp4jsv._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0vp4jsv._.js");
      case "server/chunks/ssr/node_modules__pnpm_0xekdgo._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_0xekdgo._.js");
      case "server/chunks/ssr/node_modules__pnpm_1-lcxxs._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1-lcxxs._.js");
      case "server/chunks/ssr/node_modules__pnpm_10lp5p4._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_10lp5p4._.js");
      case "server/chunks/ssr/node_modules__pnpm_14nt46f._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_14nt46f._.js");
      case "server/chunks/ssr/node_modules__pnpm_18hzhdm._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_18hzhdm._.js");
      case "server/chunks/ssr/node_modules__pnpm_1atger8._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1atger8._.js");
      case "server/chunks/ssr/node_modules__pnpm_1e9sns5._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1e9sns5._.js");
      case "server/chunks/ssr/node_modules__pnpm_1j6svly._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1j6svly._.js");
      case "server/chunks/ssr/node_modules__pnpm_1kxbyad._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1kxbyad._.js");
      case "server/chunks/ssr/node_modules__pnpm_1l4-jji._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1l4-jji._.js");
      case "server/chunks/ssr/node_modules__pnpm_1mo7zmq._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1mo7zmq._.js");
      case "server/chunks/ssr/node_modules__pnpm_1nf_30r._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1nf_30r._.js");
      case "server/chunks/ssr/node_modules__pnpm_1nxehw1._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1nxehw1._.js");
      case "server/chunks/ssr/node_modules__pnpm_1rv9a-x._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1rv9a-x._.js");
      case "server/chunks/ssr/node_modules__pnpm_1uyls3h._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_1uyls3h._.js");
      case "server/chunks/ssr/node_modules__pnpm_20ina0_._.js": return require("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules__pnpm_20ina0_._.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }


  async function loadWasmChunk(chunkPath) {
    switch (chunkPath) {
      case "/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_magicast@0.3.5_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma/client/query_engine_bg.wasm": return (await import("/home/cathenon/Desktop/openCRM/.open-next/server-functions/default/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_magicast@0.3.5_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma/client/query_engine_bg.wasm")).default;
      default:
        throw new Error(`Unknown wasm chunk: ${chunkPath}`);
    }
  }
