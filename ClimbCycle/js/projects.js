/* ====================================================
   projects.js -- Route / boulder projects: attempts, sends, progress
   ClimbCycle

   Lets advanced users track specific projects (a route or boulder they're
   working) with attempts, a send state, and progress. The list transforms
   (addProjectTo / logAttemptIn / setStatusIn / deleteProjectIn /
   projectProgress) are PURE and unit-tested; the localStorage-backed wrappers
   persist to cc_projects (included in backup + sync) and emit on the Bus.
==================================================== */

function loadProjects(){
  try { var s = localStorage.getItem('cc_projects'); return s ? JSON.parse(s) : []; }
  catch(e){ return []; }
}
function saveProjects(list){
  try { localStorage.setItem('cc_projects', JSON.stringify(list || [])); } catch(e){}
  if(typeof Bus !== 'undefined') Bus.emit('cc:projectsChanged');
}
function _projId(now){
  return 'p' + (now || Date.now()).toString(36) + Math.floor(Math.random()*1e4).toString(36);
}

/* ── Pure list transforms (unit-tested) ── */
function addProjectTo(list, name, grade, type, now){
  name = (name || '').trim();
  if(!name) return list || [];
  var p = { id:_projId(now), name:name, grade:(grade || '').trim(), type:type || 'sport',
            status:'trying', createdAt:now || Date.now(), sentAt:null, attempts:[] };
  return (list || []).concat([p]);
}
function logAttemptIn(list, id, attempt, now){
  attempt = attempt || {};
  var ts = now || Date.now();
  return (list || []).map(function(p){
    if(p.id !== id) return p;
    var a = { ts:ts };
    if(attempt.highpoint != null) a.highpoint = attempt.highpoint;
    if(attempt.notes) a.notes = String(attempt.notes);
    var np = Object.assign({}, p, { attempts:(p.attempts || []).concat([a]) });
    if(attempt.sent){ np.status = 'sent'; np.sentAt = ts; }
    return np;
  });
}
function setStatusIn(list, id, status, now){
  return (list || []).map(function(p){
    if(p.id !== id) return p;
    var np = Object.assign({}, p, { status:status });
    if(status === 'sent'){ if(!np.sentAt) np.sentAt = now || Date.now(); }
    else np.sentAt = null;
    return np;
  });
}
function deleteProjectIn(list, id){
  return (list || []).filter(function(p){ return p.id !== id; });
}
function projectProgress(p){
  if(!p) return { pct:0, label:'', col:'var(--text-muted)' };
  if(p.status === 'sent')    return { pct:100, label:'Encadenada', col:'var(--accent-deload)' };
  if(p.status === 'shelved') return { pct:0,   label:'En pausa',   col:'var(--text-muted)' };
  var n = (p.attempts || []).length;
  return { pct:Math.min(85, n*12), label:n + ' intento' + (n === 1 ? '' : 's'), col:'var(--accent-caution)' };
}
function projectStats(list){
  list = list || []; var sent = 0, active = 0;
  list.forEach(function(p){ if(p.status === 'sent') sent++; else if(p.status !== 'shelved') active++; });
  return { total:list.length, sent:sent, active:active };
}

/* ── localStorage-backed actions (called from the widget) ── */
function projAddFromInputs(){
  var nEl = document.getElementById('proj-name'),
      gEl = document.getElementById('proj-grade'),
      tEl = document.getElementById('proj-type');
  if(!nEl) return;
  if(!nEl.value.trim()){ if(typeof showToast === 'function') showToast('Poné un nombre', 'var(--accent-caution)'); return; }
  saveProjects(addProjectTo(loadProjects(), nEl.value, gEl ? gEl.value : '', tEl ? tEl.value : 'sport'));
  if(typeof showToast === 'function') showToast('Proyecto agregado', 'var(--accent-deload)');
  if(typeof renderProjects === 'function') renderProjects();
}
/* Timestamp for a logged attempt: the date the user picked in the card
   (noon to avoid TZ drift), else now. Lets you back-date real attempts. */
function _projDateTs(id){
  var el = document.getElementById('pd-' + id);
  if(el && el.value){ var t = new Date(el.value + 'T12:00:00').getTime(); if(!isNaN(t)) return t; }
  return Date.now();
}
function projAttempt(id){ saveProjects(logAttemptIn(loadProjects(), id, {}, _projDateTs(id))); if(typeof renderProjects === 'function') renderProjects(); }
function projSend(id){
  saveProjects(logAttemptIn(loadProjects(), id, { sent:true }, _projDateTs(id)));
  if(typeof showToast === 'function') showToast('¡Encadenada!', 'var(--accent-deload)');
  if(typeof renderProjects === 'function') renderProjects();
}
function projReopen(id){ saveProjects(setStatusIn(loadProjects(), id, 'trying')); if(typeof renderProjects === 'function') renderProjects(); }
function projDelete(id){ saveProjects(deleteProjectIn(loadProjects(), id)); if(typeof renderProjects === 'function') renderProjects(); }

/* ── Widget render (populate #projects-body) ── */
function renderProjects(){
  var el = document.getElementById('projects-body'); if(!el) return;
  var list = loadProjects();
  var stats = projectStats(list);
  var esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s){ return s; };
  var todayISO = new Date().toISOString().slice(0,10);

  var h = '<div class="card" style="padding:16px">'
    + '<div class="row-between" style="align-items:baseline;margin-bottom:10px">'
      + '<span class="eyebrow" style="margin-bottom:0">Proyectos</span>'
      + '<span style="font-size:11px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">' + stats.active + ' activos · ' + stats.sent + ' enviados</span>'
    + '</div>'
    + '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">'
      + '<input id="proj-name" placeholder="Vía o bloque" aria-label="Nombre del proyecto" style="flex:2;min-width:110px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:8px;padding:8px 10px;color:var(--text-primary);font-size:13px;outline:none">'
      + '<input id="proj-grade" placeholder="7a" aria-label="Grado" style="width:56px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:8px;padding:8px 10px;color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none">'
      + '<select id="proj-type" aria-label="Tipo" style="background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:8px;padding:8px;color:var(--text-primary);font-size:12px"><option value="sport">Vía</option><option value="boulder">Boulder</option></select>'
      + '<button onclick="projAddFromInputs()" style="background:var(--accent-primary);border:none;border-radius:8px;padding:8px 12px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:13px;cursor:pointer;touch-action:manipulation">+ Agregar</button>'
    + '</div>';

  if(list.length === 0){
    h += '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">Sin proyectos aún. Agregá una vía o bloque que estés intentando y registrá tus intentos.</div>';
  } else {
    list.slice().reverse().forEach(function(p){
      var pr = projectProgress(p);
      var typeLbl = p.type === 'boulder' ? 'Boulder' : 'Vía';
      var last = (p.attempts && p.attempts.length) ? new Date(p.attempts[p.attempts.length-1].ts) : null;
      var lastTxt = last ? ('último ' + ('0'+last.getDate()).slice(-2) + '/' + ('0'+(last.getMonth()+1)).slice(-2)) : 'sin intentos';
      h += '<div style="background:var(--bg-card-alt);border:1px solid var(--border-color);border-left:3px solid ' + pr.col + ';border-radius:10px;padding:10px 12px;margin-bottom:8px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
          + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:14px;font-weight:600;color:var(--text-primary)">' + esc(p.name) + '</div>'
            + '<div style="font-size:10px;color:var(--text-muted);margin-top:1px">' + typeLbl + (p.grade ? (' · ' + esc(p.grade)) : '') + ' · ' + lastTxt + '</div>'
          + '</div>'
          + '<span style="flex-shrink:0;font-size:9px;font-family:\'JetBrains Mono\',monospace;color:' + pr.col + ';background:' + pr.col + '18;border:1px solid ' + pr.col + '44;padding:2px 8px;border-radius:99px">' + pr.label + '</span>'
        + '</div>'
        + '<div class="mtr" style="margin-top:8px"><div class="mf" style="width:' + pr.pct + '%;background:' + pr.col + '"></div></div>'
        + (p.status !== 'sent'
            ? '<div style="display:flex;align-items:center;gap:6px;margin-top:8px">'
              + '<span style="font-size:10px;color:var(--text-muted);white-space:nowrap">Fecha del intento</span>'
              + '<input type="date" id="pd-' + p.id + '" value="' + todayISO + '" max="' + todayISO + '" aria-label="Fecha del intento" style="flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:7px;padding:5px 8px;color:var(--text-primary);font-size:11px;font-family:\'JetBrains Mono\',monospace;outline:none;color-scheme:dark">'
            + '</div>'
            : '')
        + '<div style="display:flex;gap:6px;margin-top:8px">'
          + (p.status !== 'sent'
              ? '<button onclick="projAttempt(\'' + p.id + '\')" style="flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:7px;padding:6px;color:var(--text-secondary);font-size:11px;cursor:pointer;touch-action:manipulation">+ intento</button>'
                + '<button onclick="projSend(\'' + p.id + '\')" style="flex:1;background:#00E5A018;border:1px solid #00E5A055;border-radius:7px;padding:6px;color:var(--accent-deload);font-size:11px;font-weight:700;cursor:pointer;touch-action:manipulation">&#x2713; enviada</button>'
              : '<button onclick="projReopen(\'' + p.id + '\')" style="flex:1;background:var(--bg-card);border:1px solid var(--border-color);border-radius:7px;padding:6px;color:var(--text-secondary);font-size:11px;cursor:pointer;touch-action:manipulation">Reabrir</button>')
          + '<button onclick="projDelete(\'' + p.id + '\')" aria-label="Borrar proyecto" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:7px;padding:6px 9px;color:var(--text-muted);font-size:11px;cursor:pointer;touch-action:manipulation">&#x2715;</button>'
        + '</div>'
      + '</div>';
    });
  }
  h += '</div>';
  el.innerHTML = h;
}
