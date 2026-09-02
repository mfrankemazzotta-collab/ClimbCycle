/* ====================================================
   storage.js -- Single owner of the localStorage layer
   ClimbCycle

   Before, TWO files fought over localStorage: auth.js monkey-patched
   getItem/setItem/removeItem to prefix keys per user, and sync.js reached
   around that patch via leaked `_orig*` globals to read/write device-global
   keys. That was order-dependent and fragile.

   Now there is ONE place:
     - the raw methods are captured once here,
     - cc_* keys are prefixed by the ACTIVE user (auth.js registers a provider
       via setStorageUserProvider so the lookup stays dynamic — same behaviour
       as before, just centralized),
     - ccRawGet/ccRawSet/ccRawRemove expose UNPREFIXED access for device-global
       keys (ccsync_*), which sync.js uses.

   Loads early (right after errors.js), before crypto/auth/state/sync.
==================================================== */

/* Capture the pristine methods once, before we override them. */
var _ccRawGet    = localStorage.getItem.bind(localStorage);
var _ccRawSet    = localStorage.setItem.bind(localStorage);
var _ccRawRemove = localStorage.removeItem.bind(localStorage);

/* Device-global access (never user-prefixed) — for ccsync_* and similar. */
function ccRawGet(key){ return _ccRawGet(key); }
function ccRawSet(key, value){ return _ccRawSet(key, value); }
function ccRawRemove(key){ return _ccRawRemove(key); }

/* auth.js registers a function that returns the active username (or null). */
var _ccUserProvider = null;
function setStorageUserProvider(fn){ _ccUserProvider = (typeof fn === 'function') ? fn : null; }
function _ccActiveUser(){ return _ccUserProvider ? _ccUserProvider() : null; }

/* Map a logical key to its physical, per-user key.
   Auth keys (shared across users) and non-cc_ keys are never prefixed. */
function ccUserKey(key){
  if(key === 'cc_users' || key === 'cc_current_user') return key;
  if(key.indexOf('cc_') !== 0) return key;
  var user = _ccActiveUser();
  if(!user) return key;
  return 'cc_' + user + '_' + key.substring(3);
}

/* ── Espejo en memoria (para el vault cifrado) ─────────────────
   El problema estructural del cifrado en reposo es que WebCrypto es ASYNC y
   `localStorage` es SYNC: no se puede descifrar dentro de un getItem(). La
   salida es un espejo — al desbloquear, los datos se descifran UNA vez a
   memoria, y de ahí en adelante las ~355 lecturas del código siguen siendo
   síncronas y no se enteran de nada.

   Esta parte vive acá y NO sabe de criptografía (storage.js carga antes que
   crypto.js). vault.js hace el trabajo cripto y llena el espejo. */
var _ccMirror = null;                 /* null = vault apagado; objeto = activo */
var _ccMirrorOnWrite = null;          /* callback para persistir cifrado */

/* vault.js llama esto tras descifrar. `onWrite(logicalKey, value)` se dispara
   en cada escritura para que el vault persista (con debounce). */
function ccStorageMountMirror(data, onWrite){
  _ccMirror = data || {};
  _ccMirrorOnWrite = (typeof onWrite === 'function') ? onWrite : null;
}
/* Bloquear/cerrar sesión: el espejo desaparece de memoria. */
function ccStorageUnmountMirror(){ _ccMirror = null; _ccMirrorOnWrite = null; }
function ccStorageMirrorActive(){ return _ccMirror !== null; }
/* Copia del espejo, para que el vault la cifre. */
function ccStorageMirrorSnapshot(){ return _ccMirror ? JSON.parse(JSON.stringify(_ccMirror)) : null; }

/* ¿Esta clave la maneja el vault? Sólo las de datos del usuario: las de auth
   y las device-global (ccsync_*) tienen que seguir legibles sin desbloquear,
   o no habría forma de loguearse. */
function _ccVaulted(key){
  return _ccMirror !== null &&
         key.indexOf('cc_') === 0 &&
         key !== 'cc_users' && key !== 'cc_current_user';
}

/* Install the user-prefixing wrapper over localStorage — the only override. */
localStorage.getItem = function(key){
  if(_ccVaulted(key)){
    return Object.prototype.hasOwnProperty.call(_ccMirror, key) ? _ccMirror[key] : null;
  }
  return _ccRawGet(ccUserKey(key));
};
/* ¿Ya avisamos que no se puede guardar? Una vez alcanza: si el disco está
   bloqueado falla CADA escritura, y una catarata de toasts no agrega nada. */
var _ccAvisoSinEspacio = false;

localStorage.setItem = function(key, value){
  if(_ccVaulted(key)){
    _ccMirror[key] = String(value);
    if(_ccMirrorOnWrite) _ccMirrorOnWrite(key, String(value));
    return;
  }
  try {
    return _ccRawSet(ccUserKey(key), value);
  } catch(e){
    /* PÉRDIDA SILENCIOSA DE DATOS. Todos los `save*` de state.js envuelven su
       escritura en `try{...}catch(e){}` sin decir nada. Si el navegador se
       niega a guardar —Safari en navegación privada, cuota agotada en iOS—
       la app sigue funcionando perfecta en memoria: el usuario completa el
       onboarding, registra semanas de entrenamiento, y al recargar no queda
       nada. Sin un solo mensaje en el medio.

       Para una app cuyo valor ES el historial, ese es el peor fallo posible,
       y el más difícil de reportar ("se me borró todo" no dice qué pasó).
       Se avisa una vez y se re-lanza, para no cambiarle el comportamiento a
       quien ya capturaba la excepción. */
    if(!_ccAvisoSinEspacio){
      _ccAvisoSinEspacio = true;
      var msg = 'El navegador no está dejando guardar. Lo que hagas ahora se '
              + 'pierde al recargar: probá salir de navegación privada o '
              + 'liberar espacio.';
      try {
        if(typeof logError === 'function'){
          logError(e, 'localStorage.setItem', { notify:true, userMessage: msg });
        } else if(typeof showToast === 'function'){
          showToast(msg, '#E5404B');
        }
      } catch(_){}
    }
    throw e;
  }
};
localStorage.removeItem = function(key){
  if(_ccVaulted(key)){
    delete _ccMirror[key];
    if(_ccMirrorOnWrite) _ccMirrorOnWrite(key, null);
    return;
  }
  return _ccRawRemove(ccUserKey(key));
};
