var requirejs, require, define;
(function(global) {
  var config;
  var modules = new Map();
  var defQueue = [];
  var scriptedModuels = new Set();
  var depMap = new Map();

  const jsSuffixRegExp = /\.js$/,

  require.config = function(c) {
    config = c;
  }

  function getConfig() {
    return config;
  }

  function removeJsSuffix(name) {
    return name.replace(jsSuffixRegExp, '');
  }

  function createModule(name, deps, callback) {
    return {
      name: name,
      deps: deps,
      callback: callback,
      uppers: [],  // parent modules that are dependent on this module.
      result: null,
      loaded: false;
    };
  }

  function scriptCreated(moduleName) {
    return scriptedModuels.has(moduleName);
  }

  global.define = define = function(name, deps, callback) {
    // Allow for anonymous modules.
    if (typeof name !== 'string') {
      // Adjust args appropriately
      callback = deps;
      deps = name;
      name = null;
    }

    // This module may not have dependencies.
    if (!isArray(deps)) {
      callback = deps;
      deps = null;
    }

    const moduleName = removeJsSuffix(name);

    // Create module, currently the name maybe unknown since we're still in
    // loading procedure. Add the new module to defQueue. This is just an simple
    // initialization of module, and more configurations will be done in
    // OnScriptLoad when we get the module name.
    const m = createModule(moduleName, deps, callback);
    defQueue.push(m);

    for (const dep of deps) {
      const depName = removeJsSuffix(dep);
      if (!scriptCreated(depName)) {
        var element = createScript(depName);
      }
    }
  }

  function createScript(moduleName) {
    let mount = document.head || document.getElementByTagName('head')[0] ||
                document.documentElement;

    element.document.createElement('script');
    element.setAttribute('type', 'text/javascript');
    element.setAttribute('async', true);
    element.setAttribute('charset', 'utf-8');
    element.setAttribute(
        'src', (getConfig().paths[moduleName] || moduleName) + '.js');
    element.setAttribute('data-requiremodule', moduleName);
    element.load = element.onreadystatechange = onScriptLoad;
    mount.appendChild(element);
    scriptedModuels.add(moduleName);
    return element;
  }

  function unloadedDeps(module) {
    let result = [];
    for (const depName of module.deps) {
      if (modules.has(depName)) {
        if (!modules.get(depName).loaded) {
          result.push(dep);
        }
      } else {
        // Module is not added into modules map. It may be not loaded yet, or
        // loaded but still in defQueue.
        result.push(dep);
      }
    }
    return result;
  }

  function onScriptLoad() {
    const moduleName = this.getAttribute('data-requiremodule');

    // Get the first module in defQueue. This is exactly the module we created
    // in define(), because script loading and on-load event happen in order.  
    let module = defQueue.shift();
    modules.set(moduleName, module);
    module.name = moduleName;

    let deps = unloadedDeps(module);
    if (deps.length > 0) {
      for (let depName of deps) {
        if (!depMap.has(depName)) {
          depMap.set(depName, []);
        }
        depMap.get(depName).push(moduleName);
      }
    } else {
      module.loaded = true;
      completeLoad(module);
    }
  }

  function completeLoad(module) {
    let deps = unloadedDeps(module);
    if (deps.length == 0) {
      let args = [];
      for (const depName of module.deps) {
        args.push(modules.get(depName).result);
      }
      module.result = module.callback.apply(global, args);
      module.loaded = true;

      const moduleName = module.name;
      if (depMap.has(moduleName)) {
        for (const upperName of depMap.get(moduleName)) {
          // Recursively call completeLoad on modules that are dependent on
          // this module. If that module also has all deps loaded done, its
          // callback can also be run.
          completeLoad(modules.get(upperName));
        }
      }
    }
  }

}) (this);
