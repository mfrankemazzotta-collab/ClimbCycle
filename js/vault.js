/* ====================================================
   vault.js -- Cifrado en reposo de los datos del usuario
   ClimbCycle

   QUÉ RESUELVE
   Hasta acá el "login" sólo cambiaba el prefijo de las claves: los datos
   vivían en localStorage en texto plano y cualquiera con el dispositivo (o
   con DevTools abierto) leía peso, edad, tests y notas de sesión. La app se
   presenta como privada y offline; en reposo esa promesa no se sostenía.

   POR QUÉ ERA DIFÍCIL (y por qué ya no tanto)
   WebCrypto es async y `localStorage` es sync: no se puede descifrar dentro
   de un `getItem()`. La solución es un ESPEJO en memoria — se descifra una
   vez al desbloquear y las ~355 lecturas del código siguen siendo síncronas
   sin enterarse. Eso vive en storage.js. Y el arranque ya era async donde
   importa (el login usa PBKDF2), así que no hizo falta refactorizarlo.

   ESQUEMA DE CLAVES (el mismo de 1Password/Bitwarden)
   No se cifra con la clave derivada de la contraseña, sino con una clave de
   datos aleatoria (DEK) que se guarda envuelta DOS veces:
     · envuelta con la contraseña      → uso normal
     · envuelta con la clave de recuperación → si olvidás la contraseña
   Ventajas: la recuperación es criptográficamente equivalente (no es una
   puerta trasera más débil), y cambiar la contraseña sólo re-envuelve la
   DEK — no hay que recifrar todos los datos.

   FORMATO EN DISCO
   Un ÚNICO blob cifrado por usuario, no una clave por dato. Es más lento de
   escribir pero ATÓMICO: nunca queda medio cifrado, que es el estado del que
   no se vuelve. Se persiste con debounce.

   ⚠️ ESTADO: detrás de feature flag, APAGADO por defecto. La lógica está
   testeada con WebCrypto real en el harness, pero nunca corrió en un
   navegador — y acá un bug significa perder el historial. Ver §16.2.
==================================================== */

/* Encendido explícito. Mientras sea false, este módulo no hace absolutamente
   nada y la app se comporta exactamente como antes. */
var CC_VAULT_ENABLED = (typeof window !== 'undefined' && window.CC_VAULT_ENABLED === true);

var CC_VAULT_META = 'ccvault_meta';   /* device-global, en claro (no lleva datos) */
var CC_VAULT_BLOB = 'ccvault_blob';   /* device-global, cifrado */
var CC_VAULT_VERSION = 1;

/* Claves de datos que entran al vault. Las de auth quedan fuera a propósito:
   sin ellas no habría forma de loguearse para desbloquear. */
var CC_VAULT_KEYS = ['cc_user','cc_plan','cc_sl','cc_logs','cc_tests','cc_rec',
                     'cc_lastex','cc_projects','cc_widgets','cc_exdone','cc_exmode',
                     'cc_theme','cc_notif','cc_notif_last'];

var _ccVaultKey = null;      /* CryptoKey (DEK) mientras está desbloqueado */
var _ccVaultUser = null;
var _ccVaultTimer = null;

/* ── Estado ───────────────────────────────────────── */
function _vaultMetaKey(user){ return CC_VAULT_META + '_' + user; }
function _vaultBlobKey(user){ return CC_VAULT_BLOB + '_' + user; }

function ccVaultMeta(user){
  try { var s = ccRawGet(_vaultMetaKey(user)); return s ? JSON.parse(s) : null; }
  catch(e){ return null; }
}
/* ¿Este usuario tiene el vault activado? */
function ccVaultExists(user){ return !!ccVaultMeta(user); }
/* ¿Está desbloqueado ahora mismo? */
function ccVaultUnlocked(){ return _ccVaultKey !== null; }

/* ── Clave de recuperación ────────────────────────────
   24 caracteres en grupos de 4, sin caracteres ambiguos (0/O, 1/I/l): se
   escribe a mano en un papel y hay que poder leerla después. */
var CC_RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function ccNewRecoveryKey(){
  var bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  var out = '';
  for(var i = 0; i < 24; i++){
    out += CC_RECOVERY_ALPHABET[bytes[i] % CC_RECOVERY_ALPHABET.length];
    if(i % 4 === 3 && i < 23) out += '-';
  }
  return out;                                   /* ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2 */
}
/* PURE. Normaliza lo que tipeó el usuario: sin guiones, mayúsculas. */
function ccNormalizeRecoveryKey(k){
  return String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/* ── Crear el vault ───────────────────────────────────
   Cifra lo que ya existe en claro y devuelve la clave de recuperación (que
   el usuario TIENE que guardar: es la única copia). */
/* `opts.iters` permite bajar el work factor del KDF. En producción NO se usa
   (manda CC_PBKDF2_ITERS); existe para los tests, donde 150k iteraciones ×15
   operaciones saturan el event loop y vuelven frágiles a otros tests que
   dependen del timing. Lo que se verifica ahí es corrección, no coste. */
function ccVaultCreate(user, password, opts){
  if(!user || !password) return Promise.reject(new Error('Faltan datos'));
  if(ccVaultExists(user)) return Promise.reject(new Error('El vault ya existe'));
  var iters = (opts && opts.iters) || CC_PBKDF2_ITERS;

  /* Copia de rescate en claro ANTES de tocar nada. Si el cifrado sale mal a
     mitad de camino, los datos siguen existiendo en algún lado. Se borra
     recién cuando el usuario confirma que pudo desbloquear (ccVaultConfirm). */
  _ccVaultSnapshotPlano(user);

  var recovery = ccNewRecoveryKey();
  var dekHex = ccNewDataKeyHex();
  var saltPass = ccRandomHex(16), saltRec = ccRandomHex(16);
  var meta = { v: CC_VAULT_VERSION, saltPass: saltPass, saltRec: saltRec, iters: iters };

  /* Lo que hay hoy en claro, para cifrarlo. */
  var actual = {};
  CC_VAULT_KEYS.forEach(function(k){
    var v = ccRawGet(ccUserKey(k));
    if(v !== null && v !== undefined) actual[k] = v;
  });

  return ccDeriveKey(password, saltPass, meta.iters).then(function(kekPass){
    return ccEncryptJSON(kekPass, { dek: dekHex }).then(function(w){ meta.wrapPass = w; });
  }).then(function(){
    return ccDeriveKey(ccNormalizeRecoveryKey(recovery), saltRec, meta.iters).then(function(kekRec){
      return ccEncryptJSON(kekRec, { dek: dekHex }).then(function(w){ meta.wrapRec = w; });
    });
  }).then(function(){
    return ccImportDataKey(dekHex);
  }).then(function(dek){
    return ccEncryptJSON(dek, actual).then(function(blob){
      /* Orden deliberado: primero el blob cifrado, después la meta. Si se
         corta la luz entre medio, sin meta el vault no existe y los datos en
         claro siguen ahí — se pierde el blob, no los datos. */
      ccRawSet(_vaultBlobKey(user), JSON.stringify(blob));
      ccRawSet(_vaultMetaKey(user), JSON.stringify(meta));
      _ccVaultKey = dek; _ccVaultUser = user;
      ccStorageMountMirror(actual, _ccVaultOnWrite);
      /* Recién ahora se borran las copias en claro. */
      CC_VAULT_KEYS.forEach(function(k){ ccRawRemove(ccUserKey(k)); });
      return { ok:true, recovery: recovery };
    });
  });
}

/* ── Desbloquear ──────────────────────────────────────
   Con la contraseña o con la clave de recuperación: las dos abren la misma
   DEK, así que el resto del sistema no distingue cómo entraste. */
function ccVaultUnlock(user, secret, useRecovery){
  var meta = ccVaultMeta(user);
  if(!meta) return Promise.reject(new Error('No hay vault para este usuario'));

  var salt    = useRecovery ? meta.saltRec : meta.saltPass;
  var wrapped = useRecovery ? meta.wrapRec : meta.wrapPass;
  var input   = useRecovery ? ccNormalizeRecoveryKey(secret) : secret;
  if(!wrapped) return Promise.reject(new Error('Este vault no tiene esa vía de acceso'));

  return ccDeriveKey(input, salt, meta.iters).then(function(kek){
    return ccDecryptJSON(kek, wrapped);          /* falla si el secreto es incorrecto */
  }).then(function(open){
    return ccImportDataKey(open.dek);
  }).then(function(dek){
    var raw = ccRawGet(_vaultBlobKey(user));
    if(!raw) throw new Error('Faltan los datos cifrados');
    return ccDecryptJSON(dek, JSON.parse(raw)).then(function(data){
      _ccVaultKey = dek; _ccVaultUser = user;
      ccStorageMountMirror(data || {}, _ccVaultOnWrite);
      return { ok:true };
    });
  });
}

/* Cerrar: la clave y los datos desaparecen de memoria. */
function ccVaultLock(){
  ccVaultFlush();
  _ccVaultKey = null; _ccVaultUser = null;
  ccStorageUnmountMirror();
}

/* ── Persistencia ─────────────────────────────────────
   Cada escritura marca el espejo como sucio; el blob se reescribe con un
   pequeño retardo para no cifrar 20 veces durante un render. */
function _ccVaultOnWrite(){
  if(_ccVaultTimer) clearTimeout(_ccVaultTimer);
  _ccVaultTimer = setTimeout(function(){ ccVaultFlush(); }, 400);
}

function ccVaultFlush(){
  if(!_ccVaultKey || !_ccVaultUser) return Promise.resolve({ ok:false });
  if(_ccVaultTimer){ clearTimeout(_ccVaultTimer); _ccVaultTimer = null; }
  var snap = ccStorageMirrorSnapshot();
  if(!snap) return Promise.resolve({ ok:false });
  var user = _ccVaultUser;
  return ccEncryptJSON(_ccVaultKey, snap).then(function(blob){
    ccRawSet(_vaultBlobKey(user), JSON.stringify(blob));
    return { ok:true };
  }).catch(function(e){
    /* Si el cifrado falla, el usuario tiene que enterarse: sus últimos
       cambios no están a salvo. Silenciarlo sería lo peor posible. */
    if(typeof logError === 'function') logError(e, 'ccVaultFlush');
    if(typeof showToast === 'function') showToast('No se pudieron guardar los cambios cifrados', 'var(--accent-warning)');
    return { ok:false, err:e.message };
  });
}

/* ── Desactivar (vuelta a texto plano) ────────────────
   Que se pueda deshacer no es un lujo: es lo que hace que activarlo no sea
   una decisión irreversible. */
function ccVaultDisable(user){
  if(!ccVaultUnlocked()) return Promise.reject(new Error('Desbloqueá el vault primero'));
  var snap = ccStorageMirrorSnapshot() || {};
  return Promise.resolve().then(function(){
    Object.keys(snap).forEach(function(k){ ccRawSet(ccUserKey(k), snap[k]); });
    ccRawRemove(_vaultMetaKey(user));
    ccRawRemove(_vaultBlobKey(user));
    _ccVaultKey = null; _ccVaultUser = null;
    ccStorageUnmountMirror();
    return { ok:true };
  });
}

/* ── Cambiar la contraseña ────────────────────────────
   Sólo re-envuelve la DEK. Los datos NO se recifran: por eso es instantáneo
   y por eso la clave de recuperación sigue sirviendo. */
function ccVaultRewrapPassword(user, newPassword){
  if(!ccVaultUnlocked()) return Promise.reject(new Error('Desbloqueá el vault primero'));
  var meta = ccVaultMeta(user);
  if(!meta) return Promise.reject(new Error('No hay vault'));
  var saltPass = ccRandomHex(16);
  return _ccVaultExportDekHex().then(function(dekHex){
    return ccDeriveKey(newPassword, saltPass, meta.iters).then(function(kek){
      return ccEncryptJSON(kek, { dek: dekHex });
    });
  }).then(function(w){
    meta.saltPass = saltPass; meta.wrapPass = w;
    ccRawSet(_vaultMetaKey(user), JSON.stringify(meta));
    return { ok:true };
  });
}

function _ccVaultExportDekHex(){
  if(!_ccVaultKey) return Promise.reject(new Error('El vault está bloqueado'));
  return ccExportDataKeyHex(_ccVaultKey);
}

/* ── Red de seguridad de la migración ─────────────────
   Activar el cifrado es el momento de mayor riesgo de toda la app: si algo
   falla a mitad, el usuario se queda sin datos legibles. Se guarda una copia
   en claro que sobrevive hasta que él confirme que puede desbloquear. */
var CC_VAULT_RESCUE = 'ccvault_rescue';

function _ccVaultRescueKey(user){ return CC_VAULT_RESCUE + '_' + user; }

function _ccVaultSnapshotPlano(user){
  try {
    var copia = {};
    CC_VAULT_KEYS.forEach(function(k){
      var v = ccRawGet(ccUserKey(k));
      if(v !== null && v !== undefined) copia[k] = v;
    });
    ccRawSet(_ccVaultRescueKey(user), JSON.stringify({ at: Date.now(), data: copia }));
  } catch(e){ if(typeof logError === 'function') logError(e, 'vaultSnapshot'); }
}

/* ¿Quedó una copia de rescate de una migración sin confirmar? */
function ccVaultRescuePending(user){ return !!ccRawGet(_ccVaultRescueKey(user)); }

/* El usuario pudo desbloquear: ya no hace falta la copia en claro. */
function ccVaultConfirm(user){
  ccRawRemove(_ccVaultRescueKey(user));
  return { ok:true };
}

/* Algo salió mal: volver a como estaba antes de cifrar. */
function ccVaultRescue(user){
  var raw = ccRawGet(_ccVaultRescueKey(user));
  if(!raw) return { ok:false, err:'No hay copia de rescate' };
  var copia;
  try { copia = JSON.parse(raw); } catch(e){ return { ok:false, err:'Copia ilegible' }; }
  var data = (copia && copia.data) || {};
  Object.keys(data).forEach(function(k){ ccRawSet(ccUserKey(k), data[k]); });
  ccRawRemove(_vaultMetaKey(user));
  ccRawRemove(_vaultBlobKey(user));
  ccRawRemove(_ccVaultRescueKey(user));
  _ccVaultKey = null; _ccVaultUser = null;
  ccStorageUnmountMirror();
  return { ok:true, restored: Object.keys(data).length };
}

/* ── Arranque ─────────────────────────────────────────
   Se llama antes de leer nada. Devuelve qué tiene que hacer la app:
     'off'      el vault no está en uso → seguir como siempre
     'unlock'   hay datos cifrados → pedir la contraseña ANTES de renderizar
     'rescue'   quedó una migración a medias → ofrecer recuperar
   Lo importante es que NUNCA devuelva 'off' habiendo datos cifrados: eso
   haría arrancar la app en blanco y el usuario creería que perdió todo. */
function ccVaultBootState(user){
  if(!user) return 'off';
  /* OJO: esto se evalúa ANTES que el feature flag, a propósito. Si alguien
     apaga `CC_VAULT_ENABLED` teniendo datos ya cifrados, respetar el flag
     haría arrancar la app en blanco y el usuario creería que perdió todo.
     El flag decide si el vault se puede ACTIVAR, no si se respeta uno que
     ya existe. */
  if(ccVaultExists(user)) return 'unlock';
  if(ccVaultRescuePending(user)) return 'rescue';
  return 'off';
}
