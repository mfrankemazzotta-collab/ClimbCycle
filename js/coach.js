/* ====================================================
   coach.js -- Coach mode (read-only athlete view over Supabase)
   ClimbCycle

   Lets an athlete share their training data with a coach, who gets a
   READ-ONLY dashboard of adherence, tests, recovery load and projects.

   Consent-first flow (no email lookups, RLS-safe):
     1. Athlete taps "Compartir con entrenador" → a one-time code is created
        (coach_shares row, 7-day expiry). Sharing the code IS the consent.
     2. Coach enters the code → redeem_coach_share() RPC (SECURITY DEFINER)
        validates it and inserts an accepted coach_links row.
     3. The athlete PUBLISHES a summary (coach_summaries); RLS lets the coach
        read the summaries of the athletes they're linked to.
   The athlete can list and revoke coaches at any time.

   ⚠️ CAMBIO 2026-08-05 — el coach ya NO lee `climbcycle_state`.
   Antes la RLS le daba SELECT sobre la fila del atleta y el filtrado a
   "resumen" lo hacía buildCoachView EN EL NAVEGADOR DEL COACH: el bundle
   completo (peso, edad, pulsaciones y las notas libres de cada sesión)
   viajaba igual y quedaba en su pestaña Network. La UI prometía "solo
   lectura, un resumen" y entregaba el historial entero.
   Ahora el resumen lo calcula el dispositivo del ATLETA y se publica en
   `coach_summaries`; los datos privados no salen nunca. Requiere correr el
   SQL nuevo de COACH_SETUP.md — incluido el DROP de la policy vieja.

   Reuses sync.js's session + HTTP plumbing (syncConfig, _syncHeaders,
   _syncGetSession, _syncRefresh, _syncParse). No-op until sync is configured.
   See COACH_SETUP.md for the SQL (tables, RLS, RPC).
==================================================== */

/* ── Pure helpers (unit-tested) ───────────────────── */

/* Random 24-char hex share token. */
function coachNewToken(){
  try {
    if(typeof crypto !== 'undefined' && crypto.getRandomValues){
      var b = new Uint8Array(12); crypto.getRandomValues(b);
      return Array.prototype.map.call(b, function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
    }
  } catch(e){}
  var s = ''; for(var i=0;i<24;i++) s += Math.floor(Math.random()*16).toString(16);
  return s;
}
/* Display form: grouped, upper — "A1B2-C3D4-…". Parse strips back to the token. */
function coachFormatCode(token){
  return String(token || '').replace(/(.{4})(?=.)/g, '$1-').toUpperCase();
}
function coachParseCode(code){
  return String(code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/* Claves de test que el entrenador puede ver, derivadas de la batería.
   Fallback a la lista histórica sólo si `TESTS` no está cargado (orden de
   scripts en algún sandbox); así el resumen nunca queda vacío. PURA. */
function coachTestKeys(){
  if(typeof TESTS !== 'undefined' && TESTS && TESTS.length){
    return TESTS.map(function(t){ return t.result_key; }).filter(Boolean);
  }
  return ['hang_max','pullup_3rm','cf_minutes','repeater_6rep','max_grade'];
}
/* Etiqueta corta de cada test, también desde la batería. */
function coachTestLabel(key){
  var t = (typeof TESTS !== 'undefined' && TESTS) ? TESTS.filter(function(x){ return x.result_key === key; })[0] : null;
  if(!t) return key;
  /* El título largo no entra en una fila de chips: se corta en el paréntesis
     o se usa la categoría como respaldo. */
  var m = t.title.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : t.title.replace(/^Test de\s+/i, '');
}

/* Build the coach's READ-ONLY view-model from an athlete's backup bundle.
   Pure: takes the bundle, returns a plain summary object. */
function buildCoachView(bundle){
  var data = (bundle && bundle.data) || {};
  function pj(k){ try { var v = data[k]; return v ? JSON.parse(v) : null; } catch(e){ return null; } }
  var user     = pj('cc_user') || {};
  var logs     = pj('cc_logs') || [];
  var tests    = pj('cc_tests') || {};
  var projects = pj('cc_projects') || [];

  var now = Date.now(), DAY = 86400000;
  function within(days){ return logs.filter(function(l){ return l && l.ts && (now - l.ts) <= days*DAY; }).length; }

  /* Las claves salen de la batería, NO de una lista escrita a mano.

     Esta lista estaba hardcodeada y se desincronizó apenas se sumó el
     powerslap: el test existía en la app, el atleta lo cargaba, y el
     entrenador no lo veía. Un caso más de "dos listas que deberían decir lo
     mismo, mantenidas en lugares distintos" — el patrón que viene generando
     la mayoría de los bugs de este proyecto.

     Sigue siendo una whitelist (sólo resultados de test, nada más del
     estado del atleta), pero ahora se deriva de la única fuente de verdad. */
  var latestTests = {};
  coachTestKeys().forEach(function(k){
    var h = tests[k]; if(h && h.length) latestTests[k] = h[h.length-1].v;
  });

  return {
    name: user.name || '', level: user.level || '', goal: user.goal || '',
    grade: user.grade || '', targetGrade: user.targetGrade || '',
    sessions7: within(7), sessions30: within(30), totalLogged: logs.length,
    lastSession: logs.length ? logs[logs.length-1].ts : null,
    tests: latestTests,
    projects: {
      total: projects.length,
      sent: projects.filter(function(p){ return p && p.status === 'sent'; }).length,
      active: projects.filter(function(p){ return p && p.status && p.status !== 'sent' && p.status !== 'shelved'; }).length
    }
  };
}

/* ── Network (reuses sync.js plumbing; no-op until configured) ── */
function coachReady(){
  return typeof syncIsLoggedIn === 'function' && syncIsLoggedIn();
}
function _coachRest(table, method, query, body){
  if(typeof syncConfig !== 'function') return Promise.resolve({ ok:false, err:'Sync no disponible' });
  var c = syncConfig();
  var mk = function(){
    var opts = { method: method, headers: _syncHeaders(true) };
    if(method === 'POST' || method === 'PATCH' || method === 'DELETE') opts.headers['Prefer'] = 'return=representation';
    if(body) opts.body = JSON.stringify(body);
    return opts;
  };
  var opts = mk();
  return fetch(c.url + '/rest/v1/' + table + (query || ''), opts).then(function(r){
    if(r.status === 401 && typeof _syncRefresh === 'function'){
      return _syncRefresh().then(function(rf){
        if(!rf.ok) return { ok:false, err:'Sesión expirada, iniciá de nuevo' };
        return fetch(c.url + '/rest/v1/' + table + (query || ''), mk()).then(_syncParse);
      });
    }
    return _syncParse(r);
  }).catch(function(e){ return { ok:false, err: e.message || 'network error' }; });
}
function _coachRpc(fn, body){
  var c = syncConfig();
  return fetch(c.url + '/rest/v1/rpc/' + fn, { method:'POST', headers:_syncHeaders(true), body: JSON.stringify(body || {}) })
    .then(_syncParse).catch(function(e){ return { ok:false, err: e.message || 'network error' }; });
}

/* Athlete: create a one-time share code for a coach. */
function coachGenerateShare(){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Conectá tu cuenta de nube primero' });
  var s = _syncGetSession();
  var token = coachNewToken();
  var row = { token: token, athlete_id: s.user_id, athlete_email: s.email || null,
              expires_at: new Date(Date.now() + 7*86400000).toISOString() };
  return _coachRest('coach_shares', 'POST', '', row).then(function(res){
    if(!res.ok) return res;
    /* Desde acá este atleta publica resumen en cada sync: el coach que canjee
       el código tiene que encontrar algo que leer. */
    coachSetHasCoaches(true);
    return coachPublishSummary().then(function(){
      return { ok:true, token: token, code: coachFormatCode(token) };
    });
  });
}
/* Coach: redeem a code → creates the accepted link (server-side RPC). */
function coachRedeem(code){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Conectá tu cuenta de nube primero' });
  var token = coachParseCode(code);
  if(token.length < 8) return Promise.resolve({ ok:false, err:'Código inválido' });
  return _coachRpc('redeem_coach_share', { p_token: token });
}
/* Coach: list accepted athletes. */
function coachListAthletes(){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Sin sesión' });
  var s = _syncGetSession();
  return _coachRest('coach_links', 'GET',
    '?coach_id=eq.' + s.user_id + '&status=eq.accepted&select=athlete_id,athlete_email');
}
/* Coach: pull one athlete's bundle (RLS permits only linked athletes). */
/* El coach lee el RESUMEN que publicó el atleta, no su fila de datos.

   Antes esto pedía `climbcycle_state?select=bundle`: el filtrado lo hacía
   `buildCoachView` **en el navegador del coach**, así que el bundle entero
   —peso, edad, pulsaciones y las notas libres de cada sesión— viajaba igual
   y quedaba en su pestaña Network. La app le prometía al atleta "un resumen
   de solo lectura" y le entregaba todo el historial.

   Ahora el resumen se calcula en el dispositivo del ATLETA (que ya tiene los
   datos) y se publica en `coach_summaries`. Los datos privados no salen. */
function coachPullAthlete(athleteId){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Sin sesión' });
  return _coachRest('coach_summaries', 'GET', '?athlete_id=eq.' + athleteId + '&select=summary,updated_at').then(function(res){
    if(!res.ok) return res;
    var rows = res.data || [];
    if(!rows.length) return { ok:true, empty:true };
    return { ok:true, view: rows[0].summary, updatedAt: rows[0].updated_at };
  });
}

/* Atleta: publica (o actualiza) el resumen que verán sus entrenadores.
   Es el MISMO `buildCoachView` de antes — lo que cambia es dónde corre:
   acá, con los datos del dueño, en vez de en la máquina del coach. */
function coachPublishSummary(){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Sin sesión' });
  if(typeof _syncBuildBundle !== 'function') return Promise.resolve({ ok:false, err:'Sync no disponible' });
  var s = _syncGetSession();
  var view;
  try { view = buildCoachView(JSON.parse(_syncBuildBundle())); }
  catch(e){ return Promise.resolve({ ok:false, err:'No se pudo armar el resumen' }); }
  return _coachRest('coach_summaries', 'POST', '', {
    athlete_id: s.user_id, summary: view, updated_at: new Date().toISOString()
  });
}

/* ¿Este atleta tiene entrenadores? Se recuerda en la meta de sync para no
   publicar resúmenes de usuarios que nunca usaron el modo coach. */
function coachHasCoaches(){
  try { return !!(_syncGetMeta() || {}).hasCoaches; } catch(e){ return false; }
}
function coachSetHasCoaches(v){
  try { var m = _syncGetMeta() || {}; m.hasCoaches = !!v; _syncSetMeta(m); } catch(e){}
}
/* Athlete: who currently has access. */
function coachListCoaches(){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Sin sesión' });
  var s = _syncGetSession();
  return _coachRest('coach_links', 'GET',
    '?athlete_id=eq.' + s.user_id + '&select=coach_id,coach_email,status');
}
/* Athlete: revoke a coach's access. */
function coachRevoke(coachId){
  if(!coachReady()) return Promise.resolve({ ok:false, err:'Sin sesión' });
  var s = _syncGetSession();
  return _coachRest('coach_links', 'DELETE',
    '?athlete_id=eq.' + s.user_id + '&coach_id=eq.' + coachId).then(function(res){
    if(!res.ok) return res;
    /* Si no queda ningún entrenador, se borra el resumen publicado: revocar
       tiene que cortar el acceso de verdad, no sólo quitar el enlace. */
    return coachListCoaches().then(function(lst){
      var quedan = (lst.ok && lst.data) ? lst.data.length : 0;
      if(quedan > 0) return res;
      coachSetHasCoaches(false);
      return _coachRest('coach_summaries', 'DELETE', '?athlete_id=eq.' + s.user_id)
        .then(function(){ return res; });
    });
  });
}

/* ── Profile UI (renders into #coach-section-wrap) ──
   Hidden unless the cloud session is configured AND logged in, since coach
   mode is a cloud feature. Nothing changes for offline-only users. */
function renderCoachUI(){
  var wrap = document.getElementById('coach-section-wrap');
  if(!wrap) return;
  if(typeof syncIsConfigured !== 'function' || !syncIsConfigured() || !coachReady()){ wrap.innerHTML = ''; return; }
  var esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s){ return s; };

  wrap.innerHTML =
    '<div class="sec" style="margin-top:18px">Modo entrenador</div>'
    + '<div class="card" style="padding:14px">'
      + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px">Compartí tu progreso con un entrenador (solo lectura), o seguí a tus atletas si sos coach.</div>'
      /* Athlete side */
      + '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Compartir mis datos</div>'
      + '<button onclick="coachUiGenerate()" style="width:100%;padding:10px;background:var(--bg-card);border:1.5px solid var(--accent-primary);border-radius:10px;color:var(--accent-primary-d);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">Generar código para mi entrenador</button>'
      + '<div id="coach-code" style="font-size:12px;color:var(--text-secondary);margin-top:8px;line-height:1.5"></div>'
      + '<div id="coach-coaches" style="margin-top:8px"></div>'
      /* Coach side */
      + '<div style="border-top:1px solid var(--border-color);margin:14px 0 10px"></div>'
      + '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Seguir a un atleta</div>'
      + '<div style="display:flex;gap:6px">'
        + '<input id="coach-code-input" placeholder="Código del atleta" aria-label="Código del atleta" style="flex:1;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:8px;padding:9px 12px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none">'
        + '<button onclick="coachUiRedeem()" style="background:var(--accent-primary);border:none;border-radius:8px;padding:9px 13px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:13px;cursor:pointer;touch-action:manipulation">Agregar</button>'
      + '</div>'
      + '<div id="coach-athletes" style="margin-top:10px"></div>'
      + '<div id="coach-view" style="margin-top:10px"></div>'
      + '<div id="coach-msg" style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.4"></div>'
    + '</div>';

  coachUiRefreshAthletes();
  coachUiRefreshCoaches();
}
function _coachMsg(t, isErr){ var el = document.getElementById('coach-msg'); if(el){ el.textContent = t; el.style.color = isErr ? '#FF4D6A' : 'var(--accent-deload)'; } }

function coachUiGenerate(){
  _coachMsg('Generando código…');
  coachGenerateShare().then(function(res){
    var el = document.getElementById('coach-code');
    if(!res.ok){ _coachMsg(res.err || 'No se pudo generar', true); return; }
    _coachMsg('');
    if(el) el.innerHTML = 'Pasale este código a tu entrenador (válido 7 días):<br>'
      + '<span style="font-family:\'JetBrains Mono\',monospace;font-size:16px;font-weight:700;color:var(--accent-primary-d);letter-spacing:1px;user-select:all">' + res.code + '</span>';
  });
}
function coachUiRedeem(){
  var code = document.getElementById('coach-code-input');
  _coachMsg('Validando…');
  coachRedeem(code ? code.value : '').then(function(res){
    if(!res.ok){ _coachMsg(res.err || 'Código inválido o expirado', true); return; }
    _coachMsg('Atleta agregado.');
    if(code) code.value = '';
    coachUiRefreshAthletes();
  });
}
function coachUiRefreshAthletes(){
  var el = document.getElementById('coach-athletes'); if(!el) return;
  coachListAthletes().then(function(res){
    if(!res.ok){ el.innerHTML = ''; return; }
    var rows = res.data || [];
    if(!rows.length){ el.innerHTML = '<div style="font-size:11px;color:var(--text-muted)">Aún no seguís a ningún atleta.</div>'; return; }
    el.innerHTML = rows.map(function(a){
      var who = (typeof escapeHtml === 'function' ? escapeHtml : String)(a.athlete_email || a.athlete_id);
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:8px;margin-bottom:6px">'
        + '<span style="font-size:12px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis">' + who + '</span>'
        + '<button onclick="coachUiView(\'' + a.athlete_id + '\')" style="flex-shrink:0;background:var(--bg-card);border:1px solid var(--accent-primary);border-radius:7px;padding:6px 12px;color:var(--accent-primary-d);font-size:11px;font-weight:700;cursor:pointer">Ver</button>'
      + '</div>';
    }).join('');
  });
}
function coachUiRefreshCoaches(){
  var el = document.getElementById('coach-coaches'); if(!el) return;
  coachListCoaches().then(function(res){
    if(!res.ok){ el.innerHTML = ''; return; }
    var rows = (res.data || []);
    if(!rows.length){ el.innerHTML = ''; return; }
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Con acceso a tus datos:</div>' + rows.map(function(c){
      var who = (typeof escapeHtml === 'function' ? escapeHtml : String)(c.coach_email || c.coach_id);
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:8px;margin-bottom:4px">'
        + '<span style="font-size:11px;color:var(--text-secondary)">' + who + '</span>'
        + '<button onclick="coachUiRevoke(\'' + c.coach_id + '\')" style="flex-shrink:0;background:none;border:1px solid #FF4D6A55;border-radius:7px;padding:4px 10px;color:#FF4D6A;font-size:11px;cursor:pointer">Revocar</button>'
      + '</div>';
    }).join('');
  });
}
function coachUiRevoke(coachId){
  coachRevoke(coachId).then(function(res){
    if(res.ok) coachUiRefreshCoaches();
  });
}
function coachUiView(athleteId){
  var el = document.getElementById('coach-view'); if(!el) return;
  el.innerHTML = '<div style="font-size:11px;color:var(--text-muted)">Cargando…</div>';
  coachPullAthlete(athleteId).then(function(res){
    if(!res.ok){ el.innerHTML = '<div style="font-size:11px;color:#FF4D6A">' + (res.err || 'No se pudo cargar') + '</div>'; return; }
    if(res.empty){ el.innerHTML = '<div style="font-size:11px;color:var(--text-muted)">El atleta todavía no subió datos.</div>'; return; }
    el.innerHTML = renderCoachSummary(res.view);
  });
}
/* Read-only athlete summary card from a buildCoachView() object. */
function renderCoachSummary(v){
  var LL = (typeof LLBL !== 'undefined') ? LLBL : {}, GL = (typeof GLBL !== 'undefined') ? GLBL : {};
  var esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s){ return s; };
  function metric(lbl, val){
    return '<div style="background:var(--bg-card-alt);border-radius:8px;padding:8px 10px;text-align:center">'
      + '<div style="font-family:\'JetBrains Mono\',monospace;font-size:16px;font-weight:700;color:var(--accent-primary-d)">' + val + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted)">' + lbl + '</div></div>';
  }
  var t = v.tests || {};
  /* Misma derivación que el resumen: si se suma un test a la batería,
     aparece acá solo. La lista escrita a mano ya nos falló una vez. */
  var testRows = coachTestKeys().map(function(k){ return [coachTestLabel(k), t[k]]; })
    .filter(function(r){ return r[1] != null; })
    .map(function(r){ return '<span style="font-size:11px;color:var(--text-secondary)"><strong style="color:var(--text-primary)">' + r[0] + ':</strong> ' + esc(String(r[1])) + '</span>'; })
    .join(' · ');
  return '<div class="card" style="padding:12px;background:var(--bg-card-alt)">'
    + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:800;color:var(--text-primary)">' + (esc(v.name) || 'Atleta') + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">' + (LL[v.level] || v.level || '') + (v.goal ? (' · ' + (GL[v.goal] || v.goal)) : '') + (v.grade ? (' · ' + esc(v.grade) + (v.targetGrade ? (' → ' + esc(v.targetGrade)) : '')) : '') + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">'
      + metric('7 días', v.sessions7) + metric('30 días', v.sessions30)
      + metric('Proy. activos', v.projects.active) + metric('Encadenadas', v.projects.sent)
    + '</div>'
    + (testRows ? '<div style="line-height:1.7">' + testRows + '</div>' : '<div style="font-size:11px;color:var(--text-muted)">Sin tests registrados.</div>')
  + '</div>';
}
