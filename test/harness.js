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
const nodeCrypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');

/* In-memory localStorage stub — enough for get/set/remove/clear. */
function makeLocalStorage(){
  const store = {};
  const ls = {
    /* `_lleno` simula lo que hace un navegador cuando no hay dónde guardar:
       Safari en navegación privada y iOS con la cuota agotada tiran en
       `setItem`. El flag se lee EN CADA LLAMADA a propósito — storage.js
       captura la función con `.bind()` al cargar, así que cambiarla después
       no serviría de nada. */
    _lleno: false,
    getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v){
      if(ls._lleno){
        const e = new Error('The quota has been exceeded.');
        e.name = 'QuotaExceededError';
        throw e;
      }
      store[k] = String(v);
    },
    removeItem(k){ delete store[k]; },
    clear(){ for(const k in store) delete store[k]; },
    _dump(){ return { ...store }; }
  };
  return ls;
}

/* Minimal document/window stubs. The logic modules only reference these
   inside functions we don't call, but they must exist as globals so the
   files evaluate without ReferenceErrors. */
function makeDocumentStub(){
  const noop = () => {};
  /* `remove` hace falta: confirmDialog() borra su diálogo anterior con
     `existing.remove()`. Sin él, cualquier test que pase por un confirm
     revienta con un error que además llega como unhandled rejection y mata
     el proceso entero — enmascarando qué test falló de verdad. */
  const el = { style:{}, classList:{ add:noop, remove:noop, contains:()=>false }, innerHTML:'', textContent:'', value:'', appendChild:noop, removeChild:noop, remove:noop, querySelectorAll:()=>[], querySelector:()=>null, setAttribute:noop, getAttribute:()=>null, addEventListener:noop, focus:noop };
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
    /* Web Crypto + text codecs so crypto.js / auth.js evaluate and run. */
    crypto: nodeCrypto.webcrypto,
    TextEncoder, TextDecoder,
    setTimeout, clearTimeout, Date, Math, JSON, parseInt, parseFloat, isNaN,
    /* el temporizador usa intervalos: stubs no-op para poder testearlo sin reloj */
    setInterval: () => 0, clearInterval: () => {}
  };
  sandbox.window.document = documentStub;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);

  const jsDir = path.join(__dirname, '..', 'js');
  /* Load order mirrors index.html for the logic layer. */
  const files = [
    'errors.js', 'observability.js', 'storage.js', 'crypto.js',
    'data/labels.js', 'data/glossary.js', 'data/training-constants.js', 'data/grades.js',
    'data/test-defs.js', 'data/blocks.js', 'data/exercises.js', 'data/sessions.js',
    'data/protocols.js', 'data/ranges-meta.js', 'data/gear.js', 'data/levels.js',
    'state.js', 'events.js', 'store.js', 'planner.js', 'recovery.js', 'render-utils.js', 'sync.js', 'goal.js',
    'test-interpret.js', 'tests.js', 'intensity.js', 'ics.js', 'widgets.js', 'projects.js', 'coach.js', 'pwa.js', 'timer.js'
  ];
  for(const f of files){
    const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }

  /* Keep console quiet during tests: errors.js buffers into getErrorLog(). */
  if(typeof sandbox.CC_ERR_QUIET !== 'undefined') sandbox.CC_ERR_QUIET = true;

  return sandbox;
}

/* Isolated sandbox for the security layer (crypto.js + auth.js). Kept separate
   from loadApp() so auth.js's localStorage monkey-patch never leaks into the
   215 logic tests. Includes Web Crypto so PBKDF2/AES-GCM actually run. */
function loadSecureApp(){
  const localStorage = makeLocalStorage();
  const documentStub = makeDocumentStub();
  const sandbox = {
    console,
    localStorage,
    document: documentStub,
    window: { localStorage },
    crypto: nodeCrypto.webcrypto,
    TextEncoder, TextDecoder,
    setTimeout, clearTimeout, Date, Math, JSON, parseInt, parseFloat, isNaN
  };
  sandbox.window.document = documentStub;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  const jsDir = path.join(__dirname, '..', 'js');
  /* El vault se carga con el flag ENCENDIDO: los tests tienen que poder
     ejercitarlo aunque en la app siga apagado por defecto. */
  sandbox.window.CC_VAULT_ENABLED = true;
  for(const f of ['errors.js', 'storage.js', 'crypto.js', 'auth.js', 'vault.js']){
    vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx, { filename: f });
  }
  sandbox.CC_ERR_QUIET = true;
  return sandbox;
}

/* ── Sandbox de RENDER ───────────────────────────────────────
   loadApp() salta los módulos de render: las funciones que testea no tocan
   el DOM. Pero dos bugs reales fueron de ANCHO (ver test/layout-metrics.js),
   y para cazarlos hay que ejecutar los renderers de verdad y leer el HTML
   que producen.

   Este sandbox carga TODOS los render-* con un `document` que, en vez de
   descartar lo que se le escribe, retiene el `innerHTML` de cada id en un
   objeto `sink`. No pinta nada — sólo captura el string. Se mantiene aparte
   de loadApp() para no arrastrar el peso del render a las suites de lógica.

   Devuelve { app, sink, reset }. */
/* Lee los <script src> de index.html, en orden, como rutas relativas a js/. */
function scriptsDeIndex(){
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const out = [];
  const re = /<script\s+src=["']([^"']+)["']/g;
  let m;
  while((m = re.exec(html)) !== null){
    const src = m[1].split('?')[0];
    if(src.indexOf('js/') === 0) out.push(src.slice(3));
  }
  return out;
}

function loadRenderApp(opts){
  opts = opts || {};
  const sink = {};
  const localStorage = makeLocalStorage();
  const noop = () => {};
  const oyentes = {};   /* eventos registrados con document.addEventListener */

  const mkEl = id => ({
    id, style:{}, dataset:{}, children:[], parentNode:null,
    classList:{ add:noop, remove:noop, contains:()=>false, toggle:noop },
    get innerHTML(){ return sink[id] || ''; },
    set innerHTML(v){ sink[id] = v; },
    textContent:'', value:'', checked:false, offsetWidth:390,
    /* Se CUENTAN. El calendario grande no arma su HTML como string, lo arma
       con createElement + appendChild, así que el `sink` (que sólo ve
       asignaciones a innerHTML) lo da por vacío. Sin este contador no hay
       forma de afirmar que el mes se pintó. */
    _appends: 0,
    appendChild(){ this._appends++; }, removeChild:noop, remove:noop, insertAdjacentHTML:noop,
    querySelector:()=>null, querySelectorAll:()=>[],
    setAttribute:noop, getAttribute:()=>null, removeAttribute:noop,
    addEventListener:noop, removeEventListener:noop,
    focus:noop, blur:noop, click:noop, closest:()=>null,
    scrollIntoView:noop, scrollTo:noop,
    getBoundingClientRect:()=>({ width:390, height:0, top:0, left:0, right:390, bottom:0 })
  });

  const cache = {};
  const documentStub = {
    getElementById: id => (cache[id] || (cache[id] = mkEl(id))),
    querySelector: () => mkEl('_q'),
    querySelectorAll: () => [],
    createElement: () => mkEl('_c'),
    /* Se GUARDAN: `app.js` registra su arranque en DOMContentLoaded, y sin
       poder dispararlo a mano ese archivo no se ejecuta nunca en los tests. */
    addEventListener: (ev, fn) => { (oyentes[ev] = oyentes[ev] || []).push(fn); },
    body: mkEl('body'), head: mkEl('head'), documentElement: mkEl('html')
  };

  const sandbox = {
    console, localStorage, document: documentStub,
    window: { matchMedia:()=>({matches:false}), localStorage,
              addEventListener:noop, location:{ href:'' } },
    matchMedia: () => ({ matches:false }),
    crypto: nodeCrypto.webcrypto, TextEncoder, TextDecoder,
    setTimeout, clearTimeout, Date, Math, JSON, parseInt, parseFloat, isNaN,
    setInterval: () => 0, clearInterval: noop,
    navigator: { onLine:true, vibrate:noop, serviceWorker:{ register:()=>Promise.resolve() } },
    fetch: () => Promise.reject(new Error('sin red en los tests de layout')),
    alert: noop, confirm: () => true, requestAnimationFrame: cb => cb(0)
  };
  sandbox.window.document = documentStub;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  const jsDir = path.join(__dirname, '..', 'js');
  /* Mismo orden que index.html, ahora INCLUYENDO la capa de render. */
  const files = [
    'errors.js', 'observability.js', 'storage.js', 'crypto.js',
    'data/labels.js', 'data/glossary.js', 'data/training-constants.js', 'data/grades.js',
    'data/test-defs.js', 'data/blocks.js', 'data/exercises.js', 'data/sessions.js',
    'data/protocols.js', 'data/ranges-meta.js', 'data/gear.js', 'data/levels.js',
    'state.js', 'events.js', 'store.js', 'planner.js', 'recovery.js',
    'test-interpret.js', 'tests.js', 'intensity.js', 'render-utils.js', 'a11y.js', 'ics.js',
    'render-onboarding.js', 'render-calendar.js', 'render-home.js', 'render-week.js',
    'render-plan.js', 'render-profile.js', 'render-hoy.js',
    'goal.js', 'widgets.js', 'projects.js', 'timer.js',
    /* sync.js es inerte hasta syncInit() (que es quien instala el auto-push):
       cargarlo acá permite testear la resolución de dirección del sync. */
    'sync.js',
    /* Las otras secciones del Perfil. Se cargan para poder verificar que
       ninguna se vacíe en silencio cuando le falta un requisito (ver
       secciones-perfil.test.js). Todas son inertes sin configuración:
       vault-ui depende del flag, coach del login de nube, pwa del soporte
       de notificaciones del entorno. */
    'vault.js', 'vault-ui.js', 'coach.js', 'pwa.js', 'cloud-prompt.js'
  ];

  /* Modo ARRANQUE: en vez de esta lista curada, se cargan EXACTAMENTE los
     scripts de index.html, en su orden, leyendo el HTML.

     Dos razones. Una: `app.js` —el archivo que decide si la app abre— era el
     único de los 47 que ningún sandbox cargaba, así que ningún test lo
     ejecutaba jamás. Dos: leer la lista del HTML evita el patrón que viene
     generando la mitad de los bugs de este proyecto, dos listas que deberían
     decir lo mismo mantenidas en lugares distintos. Si mañana se agrega un
     script y se olvida acá, este harness se entera solo. */
  const listaFinal = opts.boot ? scriptsDeIndex() : files;
  for(const f of listaFinal){
    vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx, { filename:f });
  }
  sandbox.CC_ERR_QUIET = true;

  return {
    app: sandbox,
    sink,
    /* Vacía el sink para que cada escenario mida sólo lo que él pintó. */
    reset(){ for(const k in sink) delete sink[k]; },
    /* Dispara un evento de document (DOMContentLoaded, para arrancar). */
    disparar(ev){
      (oyentes[ev] || []).forEach(function(fn){ fn({ type: ev }); });
      return (oyentes[ev] || []).length;
    },
    /* Corre un renderer y devuelve todo el HTML que haya escrito. */
    capture(fn){
      for(const k in sink) delete sink[k];
      fn();
      return Object.keys(sink).filter(id => sink[id] && sink[id].trim())
                   .map(id => sink[id]).join('\n');
    }
  };
}

/* ── Sandbox de DISPOSITIVO (para el e2e de sync) ─────────────
   Un "dispositivo" es un localStorage propio + una copia de los módulos.
   Dos instancias = dos teléfonos distintos hablando con el mismo servidor,
   que es el escenario donde el sync perdía datos: el segundo dispositivo
   nunca bajaba nada y pisaba en la nube el trabajo del primero.

   A diferencia de los otros sandboxes, éste trae `fetch` DE VERDAD (el de
   Node) apuntando al servidor de prueba: lo que se testea es justamente la
   costura entre la lógica y la red. */
function loadDevice(baseUrl){
  const localStorage = makeLocalStorage();
  const noop = () => {};
  const el = {
    style:{}, classList:{ add:noop, remove:noop, contains:()=>false, toggle:noop },
    innerHTML:'', textContent:'', value:'', dataset:{},
    appendChild:noop, removeChild:noop, remove:noop,
    querySelectorAll:()=>[], querySelector:()=>null,
    setAttribute:noop, getAttribute:()=>null, addEventListener:noop,
    focus:noop, scrollIntoView:noop
  };
  const documentStub = {
    getElementById: () => el, querySelector: () => el, querySelectorAll: () => [],
    createElement: () => el, addEventListener: noop, body: el, head: el, documentElement: el
  };

  const sandbox = {
    console, localStorage, document: documentStub,
    window: {
      matchMedia: () => ({ matches:false }), localStorage,
      addEventListener: noop, location: { href:'', reload: noop },
      /* Config de sync: es lo que enciende toda la capa de nube. */
      CC_SUPABASE_URL: baseUrl,
      CC_SUPABASE_ANON_KEY: 'anon_key_de_prueba_suficientemente_larga_1234567890'
    },
    matchMedia: () => ({ matches:false }),
    crypto: nodeCrypto.webcrypto, TextEncoder, TextDecoder,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: noop,
    Date, Math, JSON, parseInt, parseFloat, isNaN,
    navigator: { onLine:true, vibrate:noop },
    fetch: (...a) => fetch(...a),          /* red real contra el server de prueba */
    URL, URLSearchParams,
    alert: noop, confirm: () => true, requestAnimationFrame: cb => cb(0),
    Promise
  };
  sandbox.window.document = documentStub;
  sandbox.globalThis = sandbox;
  /* `location` también como global: _syncApplyRemote hace location.reload() */
  sandbox.location = sandbox.window.location;
  const ctx = vm.createContext(sandbox);

  const jsDir = path.join(__dirname, '..', 'js');
  const files = [
    'errors.js', 'storage.js', 'crypto.js',
    'data/labels.js', 'data/glossary.js', 'data/training-constants.js', 'data/grades.js',
    'data/test-defs.js', 'data/blocks.js', 'data/exercises.js', 'data/sessions.js',
    'data/protocols.js', 'data/ranges-meta.js', 'data/gear.js', 'data/levels.js',
    'state.js', 'events.js', 'store.js', 'planner.js', 'recovery.js',
    'test-interpret.js', 'tests.js', 'intensity.js', 'sync.js', 'coach.js'
  ];
  for(const f of files){
    vm.runInContext(fs.readFileSync(path.join(jsDir, f), 'utf8'), ctx, { filename:f });
  }
  sandbox.CC_ERR_QUIET = true;
  return sandbox;
}

module.exports = { loadApp, loadSecureApp, loadRenderApp, loadDevice, makeLocalStorage };
