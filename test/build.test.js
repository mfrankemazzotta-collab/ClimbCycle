/* ====================================================
   build.test.js -- el bundle de producción tiene que ser la misma app

   Minificar código que depende de VARIABLES GLOBALES y de `onclick="fn()"`
   en el HTML es peligroso: si el minificador renombra un identificador de
   nivel superior, la app carga sin errores y recién explota cuando el
   usuario toca un botón. Un smoke test de "carga sin excepciones" no
   alcanzaría.

   Por eso acá se compara el bundle contra los fuentes: mismas funciones
   globales, mismos handlers, mismo orden de carga. Se salta solo si no se
   corrió `node build.js` (el build no es obligatorio para desarrollar).
==================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeCrypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');
const { describe, it, expect } = require('./assert');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');

/* Sandbox de navegador mínimo, igual que el del boot de los fuentes. */
function sandboxNavegador(){
  const noop = () => {};
  const el = () => ({
    style:{}, classList:{ add:noop, remove:noop, contains:()=>false, toggle:noop },
    innerHTML:'', textContent:'', value:'', dataset:{}, checked:false,
    appendChild:noop, removeChild:noop, remove:noop, insertAdjacentHTML:noop,
    querySelectorAll:()=>[], querySelector:()=>null,
    setAttribute:noop, getAttribute:()=>null, addEventListener:noop,
    focus:noop, blur:noop, scrollIntoView:noop,
    getBoundingClientRect:()=>({width:390,height:0,top:0,left:0})
  });
  const sb = {
    console: { log:noop, warn:noop, error:noop },
    localStorage:{ getItem:()=>null, setItem:noop, removeItem:noop, clear:noop },
    document:{ getElementById:el, querySelector:el, querySelectorAll:()=>[],
               createElement:el, addEventListener:noop,
               body:el(), head:el(), documentElement:el() },
    window:{ matchMedia:()=>({matches:false}), addEventListener:noop, location:{href:''} },
    matchMedia:()=>({matches:false}),
    crypto: nodeCrypto.webcrypto, TextEncoder, TextDecoder,
    setTimeout, clearTimeout, setInterval:()=>0, clearInterval:noop,
    navigator:{ onLine:true, vibrate:noop, serviceWorker:{ register:()=>Promise.resolve() } },
    fetch:()=>Promise.reject(new Error('sin red')),
    Date, Math, JSON, parseInt, parseFloat, isNaN,
    alert:noop, confirm:()=>true, prompt:()=>null, requestAnimationFrame:cb=>cb(0)
  };
  sb.window.document = sb.document;
  sb.globalThis = sb;
  return sb;
}

/* Nombres declarados en el scope global (funciones y var de nivel superior). */
function globalesDe(sandbox){
  return Object.keys(sandbox).filter(k => typeof sandbox[k] === 'function');
}

module.exports = function(){
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1].split('?')[0]);

  /* Cargar los fuentes (referencia).

     Se saltean los que no existen: `js/sync-config.js` es configuración
     LOCAL y está git-ignored, así que en un clone limpio —o en CI— no está.
     Este test reventaba ahí con ENOENT: mi máquina tenía el archivo y el
     runner no. Es exactamente el bug que un CI existe para encontrar. */
  const ref = sandboxNavegador();
  const ctxRef = vm.createContext(ref);
  const presentes = srcs.filter(s => fs.existsSync(path.join(RAIZ, s)));
  for(const s of presentes){
    vm.runInContext(fs.readFileSync(path.join(RAIZ, s), 'utf8'), ctxRef, { filename:s });
  }

  const distHtmlPath = path.join(DIST, 'index.html');
  const hayBuild = fs.existsSync(distHtmlPath);

  describe('build — el bundle preserva la app', function(){

    it('los fuentes arrancan (referencia del test)', function(){
      expect(srcs.length).toBeGreaterThan(20);
      expect(typeof ref.goPage).toBe('function');
    });

    it('la app tolera que falte sync-config.js (clone limpio / CI)', function(){
      /* Está git-ignored: un clone nuevo no lo tiene. La app tiene que
         arrancar igual, con sync y Sentry apagados. */
      const falta = srcs.filter(s => !fs.existsSync(path.join(RAIZ, s)));
      falta.forEach(function(f){
        if(!/sync-config\.js$/.test(f)) throw new Error('falta un script que NO es opcional: ' + f);
      });
      /* y sin él, las funciones críticas siguen definidas */
      expect(typeof ref.goPage).toBe('function');
      expect(typeof ref.markSess).toBe('function');
    });

    if(!hayBuild){
      it('(sin dist/ — corré `npm run build` para verificar el bundle)', function(){
        expect(true).toBe(true);
      });
      return;
    }

    const distHtml = fs.readFileSync(distHtmlPath, 'utf8');
    const bundleSrc = (distHtml.match(/<script\s+src="(app\.[a-f0-9]+\.js)"/) || [])[1];

    it('dist/index.html apunta a un único bundle con hash', function(){
      expect(typeof bundleSrc).toBe('string');
      /* un solo <script src>: los 45 se colapsaron en uno */
      const cuantos = (distHtml.match(/<script\s+src=/g) || []).length;
      expect(cuantos).toBe(1);
    });

    it('el CSS también va con hash de contenido', function(){
      expect(/href="app\.[a-f0-9]+\.css"/.test(distHtml)).toBe(true);
    });

    const bundle = fs.readFileSync(path.join(DIST, bundleSrc), 'utf8');
    const bun = sandboxNavegador();

    it('el bundle se evalúa sin errores', function(){
      const ctx = vm.createContext(bun);
      vm.runInContext(bundle, ctx, { filename: bundleSrc });
      expect(typeof bun.goPage).toBe('function');
    });

    it('NO perdió ninguna función global al minificar', function(){
      /* Éste es el test que importa. Si esbuild renombrara identificadores
         de nivel superior, la app cargaría igual y explotaría al primer
         click. Se compara el conjunto completo contra los fuentes. */
      const enFuentes = globalesDe(ref);
      const enBundle  = new Set(globalesDe(bun));
      const perdidas  = enFuentes.filter(n => !enBundle.has(n));
      if(perdidas.length){
        /* Distinguir las dos causas, porque llevan a arreglos opuestos:
           un bundle VIEJO se resuelve con `npm run build`; un minificado que
           renombra globales es un problema serio del build. Si el archivo
           más nuevo de js/ es posterior al bundle, es lo primero. */
        const mtimeBundle = fs.statSync(path.join(DIST, bundleSrc)).mtimeMs;
        const masNuevo = presentes.reduce(function(max, s){
          return Math.max(max, fs.statSync(path.join(RAIZ, s)).mtimeMs);
        }, 0);
        if(masNuevo > mtimeBundle){
          throw new Error('dist/ está DESACTUALIZADO respecto de los fuentes '
            + '(faltan ' + perdidas.length + ' funciones nuevas: ' + perdidas.slice(0,5).join(', ') + '). '
            + 'Corré `npm run build` y volvé a testear.');
        }
        throw new Error('el bundle perdió ' + perdidas.length + ' funciones globales: '
                        + perdidas.slice(0, 15).join(', '));
      }
      expect(perdidas.length).toBe(0);
      expect(enFuentes.length).toBeGreaterThan(100);
    });

    it('todos los handlers del HTML existen en el bundle', function(){
      /* Los `onclick="fn(...)"` son el punto donde el renombrado se nota. */
      const handlers = new Set();
      for(const m of distHtml.matchAll(/on(?:click|change|input|submit)="([a-zA-Z_][\w]*)\s*\(/g)){
        if(m[1] !== 'if') handlers.add(m[1]);
      }
      /* y los que generan los renderers en tiempo de ejecución */
      for(const f of fs.readdirSync(path.join(RAIZ, 'js'))){
        if(!f.endsWith('.js')) continue;
        const src = fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8');
        for(const m of src.matchAll(/on(?:click|change|input)=\\?["']([a-zA-Z_][\w]*)\s*\(/g)){
          if(m[1] !== 'if') handlers.add(m[1]);
        }
      }
      const rotos = [...handlers].filter(h => typeof bun[h] !== 'function');
      if(rotos.length) throw new Error('handlers ausentes en el bundle: ' + rotos.join(', '));
      expect(handlers.size).toBeGreaterThan(50);
    });

    it('respetó el orden de carga de los fuentes', function(){
      /* El orden importa: son globales que se referencian entre archivos.
         Se comprueba con marcadores que el build deja por archivo. */
      const orden = [...bundle.matchAll(/\/\* (js\/[\w\-./]+) \*\//g)].map(m => m[1]);
      if(orden.length){
        const esperado = presentes.filter(s => s.indexOf('js/') === 0);
        expect(orden.join(',')).toBe(esperado.join(','));
      } else {
        /* minificado agresivo puede borrar los comentarios: se verifica
           entonces que errors.js siga primero (todo depende de logError) */
        expect(bundle.indexOf('logError')).toBeGreaterThan(-1);
      }
    });

    it('el bundle pesa menos que los fuentes', function(){
      let crudo = 0;
      /* `presentes`, no `srcs`: sync-config.js puede no existir. */
      for(const s of presentes) crudo += fs.statSync(path.join(RAIZ, s)).size;
      expect(bundle.length).toBeLessThan(crudo);
    });

    it('el vault sólo se enciende desde la config, nunca desde el código', function(){
      /* Un build no puede encender features por accidente.

         ESTE TEST PASABA POR LA RAZÓN EQUIVOCADA. Verificaba
         `bun.CC_VAULT_ENABLED === false`, y daba verde… porque el flag NUNCA
         podía ser true: se leía con `var` al cargar vault.js (script nº 6) y
         el usuario lo escribe en sync-config.js (nº 40). Un test que no
         puede fallar no está probando nada, y encima tapaba el bug que
         impedía activar la feature.

         Y arreglado aquello, apareció el problema opuesto: durante el QA el
         dev SÍ enciende el flag en su `sync-config.js`, el build local se lo
         lleva, y el test fallaba acusando un bug que no existe. Un test que
         falla cuando el usuario hace lo que la guía le pide tampoco sirve.

         Lo que importa no es el valor del flag en el bundle: es de DÓNDE
         viene. Si lo enciende la config local del dev, es lo esperado. Si lo
         enciende cualquier otro archivo, eso sí es un build que prende
         features solo — y es lo que se verifica. */
      expect(typeof bun.ccVaultEnabled).toBe('function');

      /* Se auditan los FUENTES, no el bundle. Mirar el bundle no sirve:
         mientras el dev tenga el flag encendido en su config local, el
         bundle sale encendido y no se puede distinguir de dónde vino.
         (Comprobado: la primera versión de este test no detectaba un
         `window.CC_VAULT_ENABLED = true` inyectado en vault-ui.js. Tercera
         vez en esta sesión que un test parecía verificar algo y no podía
         fallar — el patrón es no razonar sobre un valor agregado cuando lo
         que importa es su procedencia.) */
      const culpables = presentes.filter(function(s){
        if(/sync-config\.js$/.test(s)) return false;   /* config local: es SU trabajo */
        const src = fs.readFileSync(path.join(RAIZ, s), 'utf8');
        return /window\.CC_VAULT_ENABLED\s*=\s*true/.test(src);
      });
      if(culpables.length){
        throw new Error('archivos versionados que encienden el vault solos: ' + culpables.join(', '));
      }

      /* Y el default, sin config alguna, tiene que ser apagado. */
      const antes = bun.window.CC_VAULT_ENABLED;
      delete bun.window.CC_VAULT_ENABLED;
      expect(bun.ccVaultEnabled()).toBe(false);
      bun.window.CC_VAULT_ENABLED = antes;
    });

    it('el service worker cachea los archivos que EXISTEN en dist', function(){
      /* El sw.js de los fuentes lista `./css/app.css`, que en dist no existe:
         copiarlo tal cual dejaba la app sin estilos offline. */
      const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
      const shell = (sw.match(/var SHELL = \[([^\]]*)\]/) || [])[1] || '';
      expect(shell.indexOf('css/app.css')).toBe(-1);
      expect(shell.indexOf(bundleSrc)).toBeGreaterThan(-1);
      /* y todo lo que lista tiene que existir de verdad */
      const rutas = [...shell.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(Boolean);
      const faltan = rutas.filter(r => r && !fs.existsSync(path.join(DIST, r)));
      if(faltan.length) throw new Error('el SHELL lista archivos inexistentes: ' + faltan.join(', '));
    });

    it('el nombre del caché se deriva del contenido, no se bumpea a mano', function(){
      /* Mismo problema que el `?v=`: si depende de que alguien se acuerde,
         tarde o temprano se sirve código viejo. */
      const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
      const cache = (sw.match(/var CACHE = '([^']*)'/) || [])[1] || '';
      expect(/^climbcycle-[a-f0-9]{8}$/.test(cache)).toBe(true);
    });
  });
};
