/* ====================================================
   sync.js -- Cloud sync layer (backend-agnostic core + Supabase adapter)
   ClimbCycle

   Design goals:
   - The whole app stays 100% functional OFFLINE. Sync is additive.
   - Zero external dependencies: talks to Supabase over plain fetch()
     against its Auth (GoTrue) and REST (PostgREST) HTTP endpoints.
   - No-op until configured. If js/sync-config.js is missing or still
     holds placeholders, every entry point returns quietly and the app
     behaves exactly as before.
   - Reuses the existing backup bundle (exportUserData / importUserData)
     as the sync payload, so "sync" and "backup" share one format.

   Data model (create this table in Supabase — see SYNC_SETUP.md):
     climbcycle_state(user_id uuid pk, bundle jsonb, updated_at timestamptz)
   with row-level security so each user only sees their own row.

   Auth token keys deliberately do NOT start with "cc_" so they bypass
   auth.js's per-local-user key prefixing — the cloud session is global
   to the device, independent of which local profile is active.
==================================================== */

/* ── Config ───────────────────────────────────────── */
/* sync-config.js (loaded before this file) may set these globals. */
function syncConfig(){
  var url = (typeof window !== 'undefined' && window.CC_SUPABASE_URL) || '';
  var key = (typeof window !== 'undefined' && window.CC_SUPABASE_ANON_KEY) || '';
  return { url: url.replace(/\/+$/,''), key: key };
}
function syncIsConfigured(){
  var c = syncConfig();
  return !!(c.url && c.key &&
            c.url.indexOf('TU_') !== 0 && c.url.indexOf('http') === 0 &&
            c.key.indexOf('TU_') !== 0 && c.key.length > 20);
}

var TABLE = 'climbcycle_state';

/* ── Local session token storage (non-cc_ keys, see note above) ── */
function _syncGetSession(){
  try { var s = _origGetItem('ccsync_session'); return s ? JSON.parse(s) : null; }
  catch(e){ return null; }
}
function _syncSetSession(sess){
  try {
    if(sess) _origSetItem('ccsync_session', JSON.stringify(sess));
    else _origRemoveItem('ccsync_session');
  } catch(e){ if(typeof logError === 'function') logError(e, 'sync.setSession'); }
}
/* Device-global raw access lives in storage.js; fall back to bound localStorage
   methods if it wasn't loaded (keeps sync usable standalone). */
var _origGetItem    = (typeof ccRawGet    === 'function') ? ccRawGet    : localStorage.getItem.bind(localStorage);
var _origSetItem    = (typeof ccRawSet    === 'function') ? ccRawSet    : localStorage.setItem.bind(localStorage);
var _origRemoveItem = (typeof ccRawRemove === 'function') ? ccRawRemove : localStorage.removeItem.bind(localStorage);

function syncCurrentEmail(){
  var s = _syncGetSession();
  return s && s.email ? s.email : null;
}
function syncIsLoggedIn(){
  var s = _syncGetSession();
  return !!(s && s.access_token && s.user_id);
}

/* ── HTTP helpers ─────────────────────────────────── */
function _syncHeaders(withAuth){
  var c = syncConfig();
  var h = { 'apikey': c.key, 'Content-Type': 'application/json' };
  if(withAuth){
    var s = _syncGetSession();
    if(s && s.access_token) h['Authorization'] = 'Bearer ' + s.access_token;
  }
  return h;
}

/* Auth request against GoTrue. Returns {ok, data, err}. */
function _syncAuth(path, body){
  var c = syncConfig();
  return fetch(c.url + '/auth/v1' + path, {
    method: 'POST',
    headers: _syncHeaders(false),
    body: JSON.stringify(body)
  }).then(function(r){
    return r.json().then(function(j){
      if(!r.ok) return { ok:false, err:(j.error_description || j.msg || j.message || ('HTTP '+r.status)) };
      return { ok:true, data:j };
    });
  }).catch(function(e){ return { ok:false, err:e.message || 'network error' }; });
}

function _sessionFromAuth(data){
  /* GoTrue returns access_token/refresh_token and a nested user object. */
  var user = data.user || (data.access_token ? data : null);
  if(!data.access_token || !user) return null;
  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    user_id:       user.id,
    email:         user.email
  };
}

/* ── Auth API ─────────────────────────────────────── */
function syncSignUp(email, password){
  if(!syncIsConfigured()) return Promise.resolve({ ok:false, err:'Sync no configurado' });
  return _syncAuth('/signup', { email:email, password:password }).then(function(res){
    if(!res.ok) return res;
    var sess = _sessionFromAuth(res.data);
    if(!sess){
      /* Email confirmation is ON — no session yet. */
      return { ok:true, needsConfirm:true };
    }
    _syncSetSession(sess);
    return { ok:true, session:sess };
  });
}

function syncSignIn(email, password){
  if(!syncIsConfigured()) return Promise.resolve({ ok:false, err:'Sync no configurado' });
  return _syncAuth('/token?grant_type=password', { email:email, password:password }).then(function(res){
    if(!res.ok) return res;
    var sess = _sessionFromAuth(res.data);
    if(!sess) return { ok:false, err:'Respuesta de auth inválida' };
    _syncSetSession(sess);
    return { ok:true, session:sess };
  });
}

function syncSignOut(){
  _syncSetSession(null);
  return Promise.resolve({ ok:true });
}

/* Refresh an expired access token using the stored refresh token. */
function _syncRefresh(){
  var s = _syncGetSession();
  if(!s || !s.refresh_token) return Promise.resolve({ ok:false });
  return _syncAuth('/token?grant_type=refresh_token', { refresh_token:s.refresh_token }).then(function(res){
    if(!res.ok) return { ok:false };
    var sess = _sessionFromAuth(res.data);
    if(!sess) return { ok:false };
    _syncSetSession(sess);
    return { ok:true, session:sess };
  });
}

/* ── Conflict resolution (pure, unit-tested) ──────────
   Compares the local bundle's timestamp against the remote row's
   updated_at and decides the direction. Timestamps are ISO strings
   or epoch millis; both are coerced to numbers.
   Returns 'pull' | 'push' | 'insync'. */
function syncResolve(localTs, remoteTs){
  var l = _syncToMs(localTs);
  var r = _syncToMs(remoteTs);
  if(r == null && l == null) return 'insync';
  if(r == null) return 'push';        /* nothing remote yet */
  if(l == null) return 'pull';        /* nothing local yet */
  if(r > l) return 'pull';
  if(l > r) return 'push';
  return 'insync';
}
function _syncToMs(ts){
  if(ts == null || ts === '') return null;
  if(typeof ts === 'number') return ts;
  var n = Date.parse(ts);
  return isNaN(n) ? null : n;
}

/* ─────────────────────────────────────────────────────
   Dirección del sync — PURE

   `syncResolve` compara dos marcas de tiempo y está bien, pero durante
   mucho tiempo `syncPull` le pasaba como "local" el `exportedAt` de un
   bundle CONSTRUIDO EN ESE INSTANTE, o sea `Date.now()`. Como el remoto
   nunca está en el futuro, el resultado era siempre 'push': **el pull no
   ocurría jamás**. El sync era unidireccional sin que nadie lo notara, y
   abrir la app en un segundo dispositivo con datos viejos pisaba en la nube
   el trabajo del primero. El test de `syncResolve` pasaba en verde porque
   probaba la función aislada, con valores inyectados a mano.

   Lo que hay que comparar no es "ahora" sino DOS HECHOS registrados:
     lastPush        cuándo subí por última vez
     lastLocalChange cuándo cambió algo acá desde entonces
   Con eso:
     · el remoto cambió después de mi último push  → tiene cosas que no tengo
     · yo cambié cosas después de mi último push   → tengo cosas que no subí
     · las dos a la vez                            → CONFLICTO: no se pisa nada
   ───────────────────────────────────────────────────── */
function resolveSyncDirection(meta, remoteTs){
  meta = meta || {};
  var push   = _syncToMs(meta.lastPush);
  var local  = _syncToMs(meta.lastLocalChange);
  var remote = _syncToMs(remoteTs);

  if(remote == null) return local == null && push == null ? 'insync' : 'push';

  /* Nunca subí nada: si hay algo remoto, es la única fuente que existe.
     (Si además tengo cambios locales, decide el usuario.) */
  if(push == null) return local == null ? 'pull' : 'conflict';

  var remotoNuevo = remote > push;
  var localNuevo  = local != null && local > push;

  if(remotoNuevo && localNuevo) return 'conflict';
  if(remotoNuevo) return 'pull';
  if(localNuevo)  return 'push';
  return 'insync';
}
/* Extract the bundle's own timestamp (exportedAt) for comparison. */
function syncBundleTs(bundleJson){
  try {
    var b = typeof bundleJson === 'string' ? JSON.parse(bundleJson) : bundleJson;
    return b && b.exportedAt ? b.exportedAt : null;
  } catch(e){ return null; }
}

/* ── Data push / pull ─────────────────────────────── */
/* Low-level REST call with one automatic token-refresh retry on 401. */
function _syncRest(method, query, body){
  var c = syncConfig();
  var opts = { method:method, headers:_syncHeaders(true) };
  if(method === 'POST' || method === 'PATCH'){
    opts.headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  }
  if(body) opts.body = JSON.stringify(body);
  var doFetch = function(){
    return fetch(c.url + '/rest/v1/' + TABLE + query, opts);
  };
  return doFetch().then(function(r){
    if(r.status === 401){
      return _syncRefresh().then(function(rf){
        if(!rf.ok) return { ok:false, err:'Sesión expirada, iniciá de nuevo' };
        opts.headers = _syncHeaders(true);
        if(method === 'POST' || method === 'PATCH') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
        return doFetch().then(_syncParse);
      });
    }
    return _syncParse(r);
  }).catch(function(e){ return { ok:false, err:e.message || 'network error' }; });
}
function _syncParse(r){
  return r.text().then(function(t){
    var j = null; try { j = t ? JSON.parse(t) : null; } catch(e){}
    if(!r.ok) return { ok:false, err:(j && (j.message||j.hint)) || ('HTTP '+r.status) };
    return { ok:true, data:j };
  });
}

/* Push the current local bundle to the cloud (upsert). */
function syncPush(){
  if(!syncIsLoggedIn()) return Promise.resolve({ ok:false, err:'No hay sesión de nube' });
  var s = _syncGetSession();
  var bundleUrl;  /* exportUserData returns a Blob URL; we want the JSON itself */
  var bundleJson = _syncBuildBundle();
  var row = {
    user_id:    s.user_id,
    bundle:     JSON.parse(bundleJson),
    updated_at: new Date().toISOString()
  };
  return _syncRest('POST', '', row).then(function(res){
    if(res.ok){
      /* Sellar con el `updated_at` que devolvió el SERVIDOR, no con el que
         mandamos. Son dos relojes distintos: si el del servidor queda unos
         ms después (o la tabla usa `now()` por defecto), la fila remota
         parece "más nueva que mi último push" y el siguiente sync dispara
         un pull espurio — con su recarga de página incluida. Lo detectó el
         e2e: en local nunca se hubiera visto.
         `Prefer: return=representation` garantiza que la fila viene. */
      var devuelto = null;
      try {
        var fila = res.data && res.data.length ? res.data[0] : res.data;
        if(fila && fila.updated_at) devuelto = fila.updated_at;
      } catch(e){}

      /* Se preserva el resto de la meta: pisarla entera borraba
         `lastLocalChange` y el resolver volvía a quedar sin referencia. */
      var meta = _syncGetMeta();
      meta.lastPush = devuelto || row.updated_at;
      _syncSetMeta(meta);

      /* Si el atleta tiene entrenadores, mantener su resumen al día. Es una
         request chica y sólo para quien usa el modo coach. */
      if(typeof coachHasCoaches === 'function' && coachHasCoaches() &&
         typeof coachPublishSummary === 'function'){
        try { coachPublishSummary(); }
        catch(e){ if(typeof logError === 'function') logError(e, 'coachPublishSummary'); }
      }
    }
    return res;
  });
}

/* Pull the cloud bundle and import it if it is newer than local. */
function syncPull(){
  if(!syncIsLoggedIn()) return Promise.resolve({ ok:false, err:'No hay sesión de nube' });
  var s = _syncGetSession();
  return _syncRest('GET', '?user_id=eq.' + s.user_id + '&select=bundle,updated_at', null).then(function(res){
    if(!res.ok) return res;
    var rows = res.data || [];
    if(rows.length === 0) return { ok:true, empty:true };
    var remote = rows[0];
    /* Comparar contra hechos registrados, NO contra `ahora` (ver
       resolveSyncDirection): construir el bundle acá sellaba `exportedAt`
       con la hora de la consulta y el pull no ocurría nunca. */
    var dir = resolveSyncDirection(_syncGetMeta(), remote.updated_at);
    if(dir === 'pull'){
      _syncApplyRemote(remote.bundle);
      return { ok:true, applied:true };
    }
    if(dir === 'conflict'){
      /* Los dos lados cambiaron desde el último push. No se pisa nada de
         forma silenciosa: que elija el usuario. */
      return { ok:true, applied:false, direction:'conflict', remote:remote };
    }
    return { ok:true, applied:false, direction:dir };
  });
}

/* Full two-way sync: pull first (may import), then push local if needed. */
function syncNow(){
  if(!syncIsLoggedIn()) return Promise.resolve({ ok:false, err:'No hay sesión de nube' });
  return syncPull().then(function(pr){
    if(!pr.ok) return pr;
    if(pr.applied) return { ok:true, applied:true };  /* remote was newer, we imported */
    /* En conflicto NO se pushea: subir acá pisaría en la nube los cambios
       del otro dispositivo, que es exactamente la pérdida de datos que este
       camino tiene que evitar. */
    if(pr.direction === 'conflict') return { ok:true, conflict:true, remote:pr.remote };
    /* Si no cambió nada, tampoco se sube. Un push inútil mueve el
       `updated_at` remoto, y entonces TODOS los demás dispositivos creen que
       hay novedades y bajan (con recarga de página incluida) sin motivo. */
    if(pr.direction === 'insync') return { ok:true, insync:true };
    return syncPush().then(function(pu){
      return pu.ok ? { ok:true, pushed:true } : pu;
    });
  });
}

/* Build the same bundle the backup feature uses, as a JSON string. */
function _syncBuildBundle(){
  /* Prefer reusing exportUserData's logic, but it returns a Blob URL.
     Rebuild the JSON directly from the known keys for a plain string. */
  var bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'unknown',
    data: {}
  };
  var keys = ['cc_user','cc_plan','cc_sl','cc_logs','cc_tests','cc_rec','cc_lastex','cc_theme','cc_projects','cc_widgets','cc_exdone'];
  keys.forEach(function(k){
    try { var v = localStorage.getItem(k); if(v !== null) bundle.data[k] = v; } catch(e){}
  });
  return JSON.stringify(bundle);
}

/* Apply a remote bundle to local storage WITHOUT triggering an auto-push
   loop, then reload so the UI reflects the imported data. */
var _syncApplying = false;
function _syncApplyRemote(bundle){
  /* Red de seguridad: aplicar un bundle remoto SOBRESCRIBE todo el estado
     local. Se guarda una copia de rescate antes de tocar nada, para que un
     pull equivocado no sea irreversible (`ccsync_prepull`, device-global, no
     entra en el bundle ni se sincroniza). */
  try {
    var previo = _syncBuildBundle();
    _origSetItem('ccsync_prepull', previo);
  } catch(e){ if(typeof logError === 'function') logError(e, 'syncPrepullBackup'); }

  _syncApplying = true;
  try {
    var data = (bundle && bundle.data) ? bundle.data : {};
    Object.keys(data).forEach(function(k){
      try { localStorage.setItem(k, data[k]); } catch(e){}
    });
    /* El estado local pasa a SER el remoto: sellar ambos hechos para que el
       próximo sync no lo lea como "tengo cambios sin subir". */
    var sello = new Date().toISOString();
    _syncSetMeta({ lastPush: sello, lastLocalChange: sello });
  } finally {
    _syncApplying = false;
  }
  if(typeof showToast === 'function') showToast('Datos sincronizados desde la nube','var(--accent-deload)');
  setTimeout(function(){ location.reload(); }, 700);
}

function _syncSetMeta(m){ try { _origSetItem('ccsync_meta', JSON.stringify(m)); } catch(e){} }
function _syncGetMeta(){ try { var s=_origGetItem('ccsync_meta'); return s?JSON.parse(s):{}; } catch(e){ return {}; } }

/* ── Auto-push: debounce a push whenever local data changes ── */
var _syncPushTimer = null;
function _syncSchedulePush(){
  if(!syncIsLoggedIn() || _syncApplying) return;
  /* Sellar CUÁNDO cambió el estado local. Sin este dato no hay forma de
     distinguir "no subí nada nuevo" de "tengo cambios sin subir", que es
     justo lo que hace falta para decidir la dirección del sync. */
  var meta = _syncGetMeta();
  meta.lastLocalChange = new Date().toISOString();
  _syncSetMeta(meta);

  if(_syncPushTimer) clearTimeout(_syncPushTimer);
  _syncPushTimer = setTimeout(function(){
    syncPush().then(function(res){
      if(!res.ok && typeof console !== 'undefined') console.warn('auto-push failed:', res.err);
    });
  }, 2500);
}

/* Wrap localStorage.setItem so any cc_* data change queues a cloud push.
   Called from syncInit (not at module load) so the test harness stays inert. */
function _syncInstallAutoPush(){
  var prev = localStorage.setItem;
  localStorage.setItem = function(key, value){
    var r = prev.call(localStorage, key, value);
    if(!_syncApplying && typeof key === 'string' && key.indexOf('cc_') === 0){
      _syncSchedulePush();
    }
    return r;
  };
}

/* ── Profile UI ───────────────────────────────────── */
/* Renders into #sync-section-wrap (created by render-profile.js).
   Hidden entirely when sync isn't configured, so nothing changes for
   users who never set up Supabase. */
function renderSyncUI(){
  var wrap = document.getElementById('sync-section-wrap');
  if(!wrap) return;
  /* Sin credenciales no hay nube — pero decirlo es mejor que desaparecer:
     el usuario que buscaba el sync no puede distinguir "falta configurar"
     de "esta app no tiene sync". */
  if(!syncIsConfigured()){
    renderSeccionBloqueada(wrap, 'Nube · Sync',
      'Sin configurar — la app funciona 100% offline',
      'Para sincronizar entre dispositivos, copiá js/sync-config.example.js a js/sync-config.js y pegá tus datos de Supabase. Ver SYNC_SETUP.md.');
    return;
  }

  var h = '<div class="sec" style="margin-top:18px">Nube · Sync</div>';
  if(syncIsLoggedIn()){
    var email = escapeHtmlSafe(syncCurrentEmail() || '');
    var meta = _syncGetMeta();
    var last = meta.lastPush ? new Date(meta.lastPush).toLocaleString() : 'nunca';
    h += '<div class="card" style="padding:14px">'
      + '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Conectado</div>'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;color:var(--accent-primary-d);margin-bottom:4px">'+email+'</div>'
      + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Última subida: '+escapeHtmlSafe(last)+'</div>'
      + '<div style="display:flex;gap:8px">'
      + '<button onclick="syncUiNow()" style="flex:1;padding:11px;background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">↻ Sincronizar ahora</button>'
      + '<button onclick="syncUiSignOut()" style="padding:11px 14px;background:none;border:1px solid #FF4D6A55;border-radius:10px;color:#FF4D6A;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Salir</button>'
      + '</div>'
      + '<div id="sync-msg" style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.4"></div>'
      + '</div>';
  } else {
    h += '<div class="card" style="padding:14px">'
      + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px">Entrá o creá una cuenta de nube para sincronizar tu plan entre dispositivos. Tus datos siguen guardados localmente también.</div>'
      + '<input id="sync-email" type="email" autocomplete="email" placeholder="tu@email.com" style="width:100%;padding:10px 12px;margin-bottom:8px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none;box-sizing:border-box">'
      + '<input id="sync-pass" type="password" autocomplete="current-password" placeholder="contraseña (mín. 6)" style="width:100%;padding:10px 12px;margin-bottom:10px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none;box-sizing:border-box">'
      + '<div style="display:flex;gap:8px">'
      + '<button onclick="syncUiSignIn()" style="flex:1;padding:11px;background:var(--accent-primary);border:none;border-radius:10px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">Entrar</button>'
      + '<button onclick="syncUiSignUp()" style="flex:1;padding:11px;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation">Crear cuenta</button>'
      + '</div>'
      + '<div id="sync-msg" style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.4"></div>'
      + '</div>';
  }
  wrap.innerHTML = h;
}
/* escapeHtml lives in render-utils.js; guard in case load order changes. */
function escapeHtmlSafe(s){ return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }
function _syncMsg(txt, isErr){
  var el = document.getElementById('sync-msg');
  if(el){ el.textContent = txt; el.style.color = isErr ? '#FF4D6A' : 'var(--accent-deload)'; }
}
function syncUiSignIn(){
  var e = document.getElementById('sync-email').value.trim();
  var p = document.getElementById('sync-pass').value;
  _syncMsg('Entrando…');
  syncSignIn(e, p).then(function(res){
    if(!res.ok){ _syncMsg(res.err || 'No se pudo entrar', true); return; }
    _syncMsg('Conectado. Sincronizando…');
    syncNow().then(function(){ renderSyncUI(); });
  });
}
function syncUiSignUp(){
  var e = document.getElementById('sync-email').value.trim();
  var p = document.getElementById('sync-pass').value;
  _syncMsg('Creando cuenta…');
  syncSignUp(e, p).then(function(res){
    if(!res.ok){ _syncMsg(res.err || 'No se pudo crear la cuenta', true); return; }
    if(res.needsConfirm){ _syncMsg('Revisá tu email para confirmar la cuenta, después entrá.'); return; }
    _syncMsg('Cuenta creada. Subiendo tus datos…');
    syncPush().then(function(){ renderSyncUI(); });
  });
}
function syncUiSignOut(){
  syncSignOut().then(function(){ renderSyncUI(); });
}
function syncUiNow(){
  _syncMsg('Sincronizando…');
  syncNow().then(function(res){
    if(!res.ok){ _syncMsg(res.err || 'Error al sincronizar', true); return; }
    if(res.conflict){ _syncShowConflict(res.remote); return; }
    if(res.applied) _syncMsg('Datos actualizados desde la nube.');
    else _syncMsg('Todo al día. Datos subidos.');
    /* NO se sella `lastPush` acá: syncPush() ya lo hace cuando el push
       realmente ocurre. Sellarlo a ciegas (incluso tras un pull o un
       conflicto) falseaba la referencia que usa resolveSyncDirection. */
    renderSyncUI();
  });
}

/* Conflicto real: los dos lados cambiaron desde el último push. No hay forma
   automática de resolverlo sin arriesgar datos, así que se explica y se deja
   elegir. Cualquiera de las dos opciones descarta trabajo, y eso se dice. */
function _syncShowConflict(remote){
  var cuando = '';
  try { cuando = new Date(remote.updated_at).toLocaleString('es-ES'); } catch(e){}
  var msg = 'Hay cambios en este dispositivo Y en la nube (última subida: '
    + cuando + '). Elegí cuál conservar — el otro se descarta.';
  if(typeof confirmDialog === 'function'){
    confirmDialog({
      title: 'Datos en conflicto',
      message: msg,
      confirm: 'Usar los de la nube',
      cancel:  'Conservar los de acá'
    }).then(function(usarNube){
      if(usarNube){ _syncApplyRemote(remote.bundle); }
      else {
        syncPush().then(function(r){
          _syncMsg(r.ok ? 'Se subieron los datos de este dispositivo.'
                        : (r.err || 'No se pudo subir'), !r.ok);
          renderSyncUI();
        });
      }
    });
  } else {
    _syncMsg(msg, true);
  }
}

/* ── Init — called once on app start ──────────────── */
function syncInit(){
  if(!syncIsConfigured()) return;      /* stays fully offline */
  _syncInstallAutoPush();
  if(syncIsLoggedIn()){
    /* Pull on startup so a fresh device/browser gets the latest. */
    syncPull().then(function(res){
      if(res && res.ok && !res.applied && typeof showToast === 'function'){
        /* local was newer or equal — push to be safe */
        syncPush();
      }
    });
  }
}
