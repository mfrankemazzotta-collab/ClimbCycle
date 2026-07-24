/* ====================================================
   test/harness.js -- Browser-less loader for unit tests
   ClimbCycle

   The app ships as plain <script> files that assume a browser
   (localStorage, document, window). This harness builds a minimal
   sandbox with those globals stubbed, loads the pure-logic modules
   into it via Node's `vm`, and returns the shared global object so
   tests can call functions and read/reset state directly.

   Only logic modules are loaded (data, state, planner, recovery).
   Render/DOM modules are skipped — the functions under test never
   touch the DOM, they only read the globals defined here.
==================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* In-memory localStorage stub — enough for get/set/remove/clear. */
function makeLocalStorage(){
  const store = {};
  return {
    getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v){ store[k] = String(v); },
    removeItem(k){ delete store[k]; },
    clear(){ for(const k in store) delete store[k]; },
    _dump(){ return { ...store }; }
  };
}

/* Minimal document/window stubs. The logic modules only reference these
   inside functions we don't call, but they must exist as globals so the
   files evaluate without ReferenceErrors. */
function makeDocumentStub(){
  const noop = () => {};
  const el = { style:{}, classList:{ add:noop, remove:noop, contains:()=>false }, innerHTML:'', textContent:'', value:'', appendChild:noop, querySelectorAll:()=>[], setAttribute:noop, getAttribute:()=>null };
  return {
    getElementById: () => el,
    querySelector: () => el,
    querySelectorAll: () => [],
    createElement: () => el,
    addEventListener: noop,
    body: el,
    head: el,
    documentElement: el
  };
}

/* Build a fresh sandbox and load the given module files into it. */
function loadApp(){
  const localStorage = makeLocalStorage();
  const documentStub = makeDocumentStub();

  const sandbox = {
    console,
    localStorage,
    document: documentStub,
    window: {
      matchMedia: () => ({ matches: false }),
      localStorage
    },
    matchMedia: () => ({ matches: false }),
    setTimeout, clearTimeout, Date, Math, JSON, parseInt, parseFloat, isNaN
  };
  sandbox.window.document = documentStub;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);

  const jsDir = path.join(__dirname, '..', 'js');
  /* Load order mirrors index.html for the logic layer. */
  const files = [
    'data/labels.js', 'data/glossary.js', 'data/training-constants.js', 'data/grades.js',
    'data/test-defs.js', 'data/blocks.js', 'data/exercises.js', 'data/sessions.js',
    'data/protocols.js', 'data/ranges-meta.js', 'data/levels.js',
    'state.js', 'events.js', 'planner.js', 'recovery.js', 'render-utils.js', 'sync.js', 'goal.js',
    'test-interpret.js', 'tests.js', 'intensity.js', 'ics.js', 'widgets.js', 'projects.js', 'coach.js', 'pwa.js'
  ];
  for(const f of files){
    const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }

  return sandbox;
}

module.exports = { loadApp, makeLocalStorage };
