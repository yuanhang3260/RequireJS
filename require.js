var requirejs, require, define;
(function(global) {
  var config = {
    paths: {},
    shim: {},
  };
  var modules = new Map();
  var defQueue = [];
  var waitingModules = new Set();
  var depMap = new Map();
  var shimDepMap = new Map();

  const jsSuffixRegExp = /\.js$/;

  function scripts() {
    return document.getElementsByTagName('script');
  }

  function isArray(o) {
    return Object.prototype.toString.call(o) == '[object Array]';
  }

  function removeJsSuffix(name) {
    return name.replace(jsSuffixRegExp, '');
  }

  function toArray(o) {
    if (!o) {
      o = [];
    } else if (!isArray(o)) {
      o = [o];
    }
    return o;
  }

  function addModuleDependency(map, key, dependency) {
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(dependency);
  }

  function createModule(name, deps, callback) {
    let deps_array = toArray(deps);
    deps = [];
    for (const dep of deps_array) {
      deps.push(removeJsSuffix(dep));
    }

    return {
      name: name,
      deps: deps,
      callback: callback,
      result: null,
      loaded: false,
    };
  }

  function requested(moduleName) {
    return waitingModules.has(moduleName);
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

    let moduleName = '';
    if (name) {
      moduleName = removeJsSuffix(name);
    }

    // Create module, currently the name maybe unknown since we're still in
    // loading procedure. Add the new module to defQueue. This is just an simple
    // initialization of module, and more configurations will be done in
    // OnScriptLoad when we get the module name.
    const m = createModule(moduleName, deps, callback);
    defQueue.push(m);

    for (const depName of deps) {
      req(depName);
    }
  }

  function req(moduleName) {
    if (requested(moduleName)) {
      return;
    }

    if (!config.shim[moduleName]) {
      // For AMD modules, just create the script and let it load.
      let element = createScript(moduleName);
    } else {
      // For non-AMD compliant modules, we defer loading until its deps are all
      // loaded. Here we simualte the define() call on this module - create
      // module, and request its dependencies.
      let module = createModule(moduleName, config.shim[moduleName].deps, null);
      modules.set(moduleName, module);

      let shim = config.shim[moduleName];
      let unloaded = getUnloaded(shim.deps);
      if (unloaded.length == 0) {
        // All deps are loaded. This module can start loading. 
        var element = createScript(moduleName);
      } else {
        // Otherwise we have to request its unloaded deps, and marks the
        // dependency relationship in shimDepMap.
        for (const depName of unloaded) {
          req(depName);
          addModuleDependency(shimDepMap, depName, moduleName);
        }
      }
    }
    waitingModules.add(moduleName);
  }

  global.require = require = define;

  require.config = function(c) {
    if (c.baseUrl && !c.baseUrl.endsWith('/')) {
      c.baseUrl = c.baseUrl + '/';
    }
    Object.assign(config, c);
  }

  // If path is given, it overwrites moduleName as script src.
  function createScript(moduleName, path) {
    let mount = document.head || document.getElementByTagName('head')[0] ||
                document.documentElement;

    let element = document.createElement('script');
    element.setAttribute('type', 'text/javascript');
    element.setAttribute('async', true);
    element.setAttribute('charset', 'utf-8');
    if (path) {
      element.setAttribute('src', path);
    } else {
      element.setAttribute('src',
          (config.baseUrl + (config.paths[moduleName] || moduleName) + '.js'));
    }
    element.setAttribute('data-requiremodule', moduleName);
    element.onload = element.onreadystatechange = onScriptLoad;
    mount.appendChild(element);
    return element;
  }

  function getUnloaded(names) {
    if (!names) {
      return [];
    }
    if (!isArray(names)) {
      names = [names];
    }

    let result = [];
    for (const moduleName of names) {
      if (modules.has(moduleName)) {
        if (!modules.get(moduleName).loaded) {
          result.push(moduleName);
        }
      } else {
        // Module is not added into modules map. It may be not loaded yet, or
        // loaded but still in defQueue.
        result.push(moduleName);
      }
    }
    return result;
  }

  function isLoaded(moduleName) {
    return modules.has(moduleName);
  }

  function onScriptLoad() {
    const moduleName = this.getAttribute('data-requiremodule');

    var module;
    if (!config.shim[moduleName]) {
      // Get the first module in defQueue. This is exactly the module we created
      // in define(), because script loading and on-load event happen in order.
      module = defQueue.shift();
      if (!module.name) {
        module.name = moduleName;
      }
      modules.set(module.name, module);
    } else {
      module = modules.get(moduleName);
    }

    let deps = getUnloaded(module.deps);
    if (deps.length > 0) {
      // Only AMD module can come here.
      for (let depName of deps) {
        addModuleDependency(depMap, depName, moduleName);
      }
    } else {
      completeLoad(module);
    }
  }

  function completeLoad(module) {
    let unloaded = getUnloaded(module.deps);
    if (unloaded.length > 0) {
      return;
    }

    let args = [];
    if (module.deps) {
      for (const depName of module.deps) {
        args.push(modules.get(depName).result);
      }
    }

    const moduleName = module.name;
    if (!config.shim[moduleName]) {
      module.result = module.callback.apply(global, args);
    } else {
      // Non AMD compliant module result is exported to global.
      module.result = global[config.shim[moduleName].exports];
    }
    module.loaded = true;

    if (depMap.has(moduleName)) {
      for (const upperName of depMap.get(moduleName)) {
        // Recursively call completeLoad on modules that are dependent on
        // this module. If that module also has all deps loaded done, its
        // callback can also be run.
        completeLoad(modules.get(upperName));
      }
    }

    if (shimDepMap.has(moduleName)) {
      for (const upperName of shimDepMap.get(moduleName)) {
        unloaded = getUnloaded(modules.get(moduleName).deps);
        if (unloaded.length == 0) {
          let element = createScript(upperName);
        }
      }
    }
  }

  function shimReadyToLoad(upperName) {
    for (let [key, dependents] of shimDepMap) {
      if (dependents.indexOf(upperName) >= 0 && !isLoaded(key)) {
        return false;
      }
    }
    return true;
  }

  // Main entry point of requirejs. It searches script tags in html and create
  // data-main script which begins loading everything.
  (function start() {
    let pageScripts = scripts();
    for (const script of pageScripts) {
      if (script.hasAttribute('data-main') && script.hasAttribute('src')) {
        const src = script.getAttribute('src');
        let list = src.split('/');
        const file = list.pop();
        if (file == 'require.js') {
          // By default use require.js directory as context base.
          const baseUrl = list.join('/') + '/';
          if (baseUrl.startsWith('http')) {
            // requirejs from CDN, set js 'as' default baseUrl.
            baseUrl = 'js/';
          } else {
            config.baseUrl = list.join('/') + '/';
          }

          const main = script.getAttribute('data-main');
          var element = createScript(main, main + '.js');
          waitingModules.add(main);
          return;
        }
      }
    }
  }) ();

  global.requirejs = require;

}) (this);
