/* ====================================================
   widgets.js -- Configurable Home dashboard (Garmin-style)
   ClimbCycle

   The Home screen is now a stack of widgets the user can turn on/off and
   reorder (Personalizar). Each widget's html() returns markup that mirrors
   the original static IDs, so the existing populate functions
   (renderRecoveryCard, renderTodayCard, renderHC, …) keep working untouched.

   Config is stored in localStorage (cc_widgets) as an ordered list of
   {id, on}. loadWidgetConfig() merges it with the registry so new widgets
   appear and removed ones are dropped — forward/backward compatible.
==================================================== */

/* ── Registry ─────────────────────────────────────── */
var WIDGET_DEFS = [
  { id:'glance', title:'Resumen rápido', icon:'⚡', html:function(){
      return '<div class="glance-grid" id="glance-grid"></div>';
  }},
  { id:'next', title:'Próxima acción', icon:'👉', html:function(){
      return '<div id="next-action"></div>';
  }},
  { id:'today', title:'Hoy: qué entrenar', icon:'🎯', html:function(){
      return '<div id="hero-today"></div>';
  }},
  { id:'recovery', title:'Recuperación', icon:'🔋', html:function(){
      return ''
        + '<div class="card glow recov-card">'
        +   '<div class="recov-head">'
        +     '<div id="aring" onclick="openCI()" class="recov-ring"></div>'
        +     '<div class="recov-info">'
        +       '<div class="eyebrow" style="margin-bottom:4px">Recuperación</div>'
        +       '<div id="aphase" style="margin-bottom:6px"></div>'
        +       '<div id="arec-status" class="recov-status">--</div>'
        +     '</div>'
        +   '</div>'
        +   '<div class="recov-meta">'
        +     '<div><div class="eyebrow-sm">FC Reposo</div><div class="recov-meta-num" style="color:var(--accent-warning)" id="arhr">-- bpm</div></div>'
        +     '<div><div class="eyebrow-sm">Ventana restante</div><div class="recov-meta-num" style="color:var(--accent-primary-d)" id="arec">--h</div></div>'
        +   '</div>'
        +   '<div id="arec-load" style="display:none;margin-top:10px"></div>'
        +   '<button onclick="openCI()" class="btn-tint">+ Nuevo check-in</button>'
        + '</div>';
  }},
  { id:'goal', title:'Objetivo', icon:'🏁', html:function(){
      return '<div id="goal-card"></div>';
  }},
  { id:'stats', title:'Progreso de la semana', icon:'📊', html:function(){
      return ''
        + '<div class="card" style="padding:16px">'
        +   '<div class="row-between" style="align-items:baseline;margin-bottom:8px">'
        +     '<span class="eyebrow" style="margin-bottom:0">Progreso de la semana</span>'
        +     '<span id="st-frac" style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:var(--accent-primary-d)">0/0</span>'
        +   '</div>'
        +   '<div class="mtr"><div id="st-bar" class="mf" style="width:0%;background:var(--accent-primary)"></div></div>'
        +   '<div id="st-sub" style="font-size:12px;color:var(--text-secondary);margin-top:10px"></div>'
        + '</div>';
  }},
  { id:'plan', title:'Calendario del plan', icon:'📅', html:function(){
      return ''
        + '<div class="row-between" style="margin-bottom:10px"><div class="section-title">Mi Plan</div>'
        +   '<button onclick="openEdit()" class="btn-ghost-sm">Editar</button></div>'
        + '<div class="hmcal">'
        +   '<div class="hmcal-nav"><button class="hmcal-nb" onclick="hcNav(-1)">&#8249;</button>'
        +     '<div class="hmcal-mo" id="hcal-mo"></div><button class="hmcal-nb" onclick="hcNav(1)">&#8250;</button></div>'
        +   '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">'
        +     '<div class="hmcal-dnh">L</div><div class="hmcal-dnh">M</div><div class="hmcal-dnh">X</div>'
        +     '<div class="hmcal-dnh">J</div><div class="hmcal-dnh">V</div><div class="hmcal-dnh">S</div><div class="hmcal-dnh">D</div></div>'
        +   '<div class="hmcal-grid" id="hcal-grid"></div>'
        + '</div>'
        + '<div class="legend-row">'
        +   '<span class="legend-chip legend-chip-strength">Fuerza</span>'
        +   '<span class="legend-chip legend-chip-power">Potencia</span>'
        +   '<span class="legend-chip legend-chip-endurance">Resistencia</span>'
        +   '<span class="legend-chip legend-chip-deload">Deload</span>'
        +   '<span class="legend-chip legend-chip-deload">&#x2705; OK</span>'
        +   '<span class="legend-chip legend-chip-warning">&#x274C; No</span>'
        + '</div>'
        + '<div id="home-daypanel"></div>';
  }},
  { id:'todaylist', title:'Sesión de hoy (detalle)', icon:'📋', html:function(){
      return '<div class="sec" id="sec-hoy">Hoy</div><div id="atoday"></div>';
  }},
  { id:'fingers', title:'Protocolos de dedos', icon:'🖐️', html:function(){
      return '<div id="fingers-body"></div>';
  }},
  { id:'projects', title:'Proyectos', icon:'📌', html:function(){
      return '<div id="projects-body"></div>';
  }},
  { id:'timer', title:'Temporizador', icon:'⏱️', html:function(){
      return '<div class="card" style="padding:16px">'
        + '<div class="eyebrow" style="margin-bottom:6px">Temporizador de series</div>'
        + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:12px">Cronómetro de intervalos para hangboard y protocolos (trabajo / descanso / series) con pitidos. Cargá un protocolo desde Ejercicios &rsaquo; Hangboard, o abrí uno libre.</div>'
        + '<button class="btn-tint" onclick="if(typeof openTimer===\'function\')openTimer({})">Abrir temporizador</button>'
      + '</div>';
  }}
];
var WIDGET_DEFS_BYID = (function(){ var m={}; WIDGET_DEFS.forEach(function(d){ m[d.id]=d; }); return m; })();

/* Default order = registry order; a widget is on unless it declares def:false. */
function defaultWidgetConfig(){
  return WIDGET_DEFS.map(function(d){ return { id:d.id, on: d.def !== false }; });
}

/* Load config and reconcile with the current registry (adds new widgets at
   the end, drops unknown ids). Always returns a valid ordered list. */
function loadWidgetConfig(){
  var saved = null;
  try { var s = localStorage.getItem('cc_widgets'); if(s) saved = JSON.parse(s); } catch(e){}
  if(!Array.isArray(saved)) return defaultWidgetConfig();
  var out = [];
  var seen = {};
  saved.forEach(function(w){
    if(w && w.id && WIDGET_DEFS_BYID[w.id] && !seen[w.id]){
      out.push({ id:w.id, on: w.on !== false });
      seen[w.id] = true;
    }
  });
  /* append any registry widgets not present in saved (new since last save) */
  WIDGET_DEFS.forEach(function(d){ if(!seen[d.id]) out.push({ id:d.id, on: d.def !== false }); });
  return out;
}
function saveWidgetConfig(cfg){
  try { localStorage.setItem('cc_widgets', JSON.stringify(cfg)); } catch(e){}
}

/* Pure helpers (unit-tested) — operate on a config array, return a new one. */
function widgetToggleIn(cfg, id){
  return cfg.map(function(w){ return w.id === id ? { id:w.id, on:!w.on } : w; });
}
function widgetMoveIn(cfg, id, dir){
  var i = cfg.findIndex(function(w){ return w.id === id; });
  if(i < 0) return cfg;
  var j = i + dir;
  if(j < 0 || j >= cfg.length) return cfg;
  var copy = cfg.slice();
  var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
  return copy;
}

/* ── Render ───────────────────────────────────────── */
function renderWidgets(){
  var host = document.getElementById('widgets');
  if(!host) return;
  var cfg = loadWidgetConfig();
  var html = '';
  cfg.forEach(function(w){
    if(!w.on) return;
    var def = WIDGET_DEFS_BYID[w.id];
    if(!def) return;
    html += '<div class="widget" data-wid="' + w.id + '">' + def.html() + '</div>';
  });
  host.innerHTML = html;
  populateWidgets();
}

/* Call the existing populate functions for whichever widgets are present. */
function populateWidgets(){
  var g = function(id){ return document.getElementById(id); };
  try { if(g('aring') && typeof renderRecoveryCard === 'function') renderRecoveryCard(calcRecovery()); } catch(e){}
  try { if((g('hero-today') || g('atoday')) && typeof renderTodayCard === 'function') renderTodayCard(); } catch(e){}
  try { if(g('next-action') && typeof renderNextAction === 'function') renderNextAction(); } catch(e){}
  try { if(g('goal-card') && typeof renderGoalCard === 'function') renderGoalCard(); } catch(e){}
  try {
    if(g('hcal-grid') && typeof renderHC === 'function'){
      renderHC();
      if(typeof hcSel !== 'undefined' && hcSel && g('home-daypanel') && typeof showDayPanel === 'function'){
        showDayPanel(hcSel, planMap[hcSel.toDateString()], hcSel.toDateString());
      }
    }
  } catch(e){}
  try { if(g('st-frac')) renderStats(); } catch(e){}
  try { if(g('glance-grid')) renderGlance(); } catch(e){}
  try { if(g('fingers-body')) renderFingers(); } catch(e){}
  try { if(g('projects-body') && typeof renderProjects === 'function') renderProjects(); } catch(e){}
}

/* ── Finger protocols (Lattice) ───────────────────────────
   Given the climber's Max Hang total, compute the working load for each
   protocol (Hangboard uses Max Hang total; No-hang needs a per-hand Tindeq
   max we don't collect, so those loads stay null / reference-only). */
function computeFingerLoads(maxHangTotal){
  var mh = parseFloat(maxHangTotal);
  if(typeof FINGER_PROTOCOLS === 'undefined') return [];
  return FINGER_PROTOCOLS.map(function(p){
    var load = (p.mode === 'hangboard' && mh > 0) ? Math.round(mh * p.intensity) : null;
    return {
      id:p.id, mode:p.mode, obj:p.obj, series:p.series, reps:p.reps, work:p.work,
      restReps:p.restReps, restSeries:p.restSeries, intensity:p.intensity, base:p.base, load:load
    };
  });
}
/* Latest Max Hang total (kg): from recorded test history, else the onboarding baseline. */
function fingerMaxHang(){
  if(typeof loadTestHistory === 'function'){
    var h = loadTestHistory('hang_max');
    if(h && h.length){ var v = parseFloat(h[h.length-1].v); if(v > 0) return v; }
  }
  var b = parseFloat(U.baseFinger);
  return (b > 0) ? b : 0;
}
function renderFingers(){
  var el = document.getElementById('fingers-body'); if(!el) return;
  var mh = fingerMaxHang();
  if(!mh){
    el.innerHTML = '<div class="card" style="padding:16px">'
      + '<div class="eyebrow" style="margin-bottom:6px">Protocolos de dedos · Lattice</div>'
      + '<div style="font-size:13px;color:var(--text-secondary);line-height:1.5">Cargá tu <strong>Max Hang</strong> (kg totales colgado 10s en regleta de 20mm) y te calculo las cargas exactas de cada protocolo.</div>'
      + '<button class="btn-tint" style="margin-top:12px" onclick="openEdit()">Ir a tests</button>'
      + '</div>';
    return;
  }
  var rows = computeFingerLoads(mh).filter(function(p){ return p.mode === 'hangboard'; }).map(function(p){
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      + '<div class="fp-row" style="flex:1;margin-bottom:0">'
        + '<div class="fp-obj">' + p.obj + '</div>'
        + '<div class="fp-load">' + p.load + ' kg</div>'
        + '<div class="fp-scheme">' + p.series + '×' + p.reps + ' · ' + p.work + 's · ' + p.restSeries + 'min</div>'
      + '</div>'
      + '<button onclick="if(typeof tmrOpenProtocol===\'function\')tmrOpenProtocol(\'' + p.id + '\')" aria-label="Iniciar temporizador" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:#00E5A0;border:none;color:#04120c;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation">&#x25B6;</button>'
    + '</div>';
  }).join('');
  var guides = (typeof FINGER_GUIDELINES !== 'undefined')
    ? FINGER_GUIDELINES.map(function(gd){ return '<li style="margin-bottom:5px">' + escapeHtml(gd) + '</li>'; }).join('')
    : '';
  el.innerHTML = '<div class="card" style="padding:16px">'
    + '<div class="eyebrow" style="margin-bottom:4px">Protocolos de dedos · Lattice</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Cargas calculadas desde tu Max Hang: <strong style="color:var(--text-primary)">' + mh + ' kg</strong></div>'
    + '<div class="fp-head"><span>Objetivo</span><span>Carga</span><span>Esquema</span></div>'
    + rows
    + '<details style="margin-top:12px"><summary style="font-size:12px;color:var(--accent-primary-d);cursor:pointer;font-weight:600">Indicaciones (7)</summary>'
    +   '<ul style="margin:8px 0 0;padding-left:18px;font-size:11px;color:var(--text-secondary);line-height:1.5">' + guides + '</ul>'
    +   '<div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">¿Tenés dinamómetro (Tindeq)? El modo No-hang unilateral mide cada mano por separado — útil para corregir asimetrías. (Opcional.)</div>'
    + '</details>'
    + '</div>';
}

/* Weekly progress: sessions done vs planned this week + current phase. */
function renderStats(){
  var cur = (typeof getCurrentWeekIndex === 'function') ? getCurrentWeekIndex() : 0;
  var comp = (typeof getWeekCompletion === 'function') ? getWeekCompletion(cur) : { done:0, total:0 };
  var frac = document.getElementById('st-frac'); if(frac) frac.textContent = comp.done + '/' + comp.total;
  var bar = document.getElementById('st-bar'); if(bar) bar.style.width = (comp.total ? Math.round(comp.done / comp.total * 100) : 0) + '%';
  var sub = document.getElementById('st-sub');
  if(sub){
    var seq = (typeof getPlanSeq === 'function') ? getPlanSeq() : [];
    var total = seq.length;
    var block = seq[cur];
    var blabel = (typeof BLOCKS !== 'undefined' && BLOCKS[block]) ? BLOCKS[block].label : '';
    sub.innerHTML = 'Semana ' + (cur + 1) + (total ? ' de ' + total : '')
      + (blabel ? ' · Fase <strong style="color:var(--text-primary)">' + blabel + '</strong>' : '');
  }
}

/* "At a Glance": a compact, low-text, high-signal row of processed metrics. */
function renderGlance(){
  var el = document.getElementById('glance-grid'); if(!el) return;
  var tiles = [];

  /* Recovery */
  if(typeof calcRecovery === 'function'){
    var rec = calcRecovery();
    var rcol = rec.status === 'fresh' ? 'var(--accent-deload)'
             : rec.status === 'recovering' ? 'var(--accent-caution)'
             : 'var(--accent-warning)';
    tiles.push({ num: rec.score + '%', lbl: 'Recuperación', col: rcol });
  }

  /* Today's session type */
  var todayPlan = planMap[TODAY.toDateString()];
  var bt = (typeof BLOCKS !== 'undefined' && todayPlan && BLOCKS[todayPlan.block]) ? BLOCKS[todayPlan.block] : null;
  var todayTxt = bt ? (bt.emo && bt.emo !== '--' ? bt.emo + ' ' : '') + bt.label : 'Descanso';
  tiles.push({ num: todayTxt, lbl: 'Hoy', col: bt ? bt.col : 'var(--text-muted)', small:true });

  /* Week number */
  var cur = (typeof getCurrentWeekIndex === 'function') ? getCurrentWeekIndex() : 0;
  var seqLen = (typeof getPlanSeq === 'function' && getPlanSeq().length) ? getPlanSeq().length : 0;
  tiles.push({ num: 'S' + (cur + 1) + (seqLen ? '/' + seqLen : ''), lbl: 'Semana', col: 'var(--accent-strength)' });

  /* Sessions done this week */
  var comp = (typeof getWeekCompletion === 'function') ? getWeekCompletion(cur) : { done:0, total:0 };
  tiles.push({ num: comp.done + '/' + comp.total, lbl: 'Sesiones', col: 'var(--accent-primary-d)' });

  el.innerHTML = tiles.map(function(t){
    return '<div class="glance-tile">'
      + '<div class="glance-num' + (t.small ? ' glance-num-sm' : '') + '" style="color:' + t.col + '">' + t.num + '</div>'
      + '<div class="glance-lbl">' + t.lbl + '</div>'
      + '</div>';
  }).join('');
}

/* ── Personalizar sheet ───────────────────────────── */
function openWidgetConfig(){
  var m = document.getElementById('wcfg-modal');
  if(!m) return;
  /* Force the overlay styles inline so a stale/missing CSS cache can't make
     the sheet render inline in the page flow. */
  m.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;'
    + 'align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.55)';
  var sheet = m.querySelector('.wcfg-sheet');
  if(sheet){
    sheet.style.cssText = 'background:var(--bg-elevated,#15151d);border-radius:20px 20px 0 0;'
      + 'padding:18px 14px 32px;width:100%;max-width:430px;max-height:84vh;overflow-y:auto;'
      + 'border-top:1px solid var(--border-color)';
  }
  m.classList.add('on');
  renderWidgetConfigList();
  if(typeof a11yOpenModal === 'function') a11yOpenModal(m, closeWidgetConfig);
}
function closeWidgetConfig(){
  var m = document.getElementById('wcfg-modal');
  if(m){ m.classList.remove('on'); m.style.display = 'none'; if(typeof a11yCloseModal === 'function') a11yCloseModal(m); }
}
/* Fully inline-styled so it looks right even if the stylesheet is cached/stale. */
function renderWidgetConfigList(){
  var list = document.getElementById('wcfg-list'); if(!list) return;
  var cfg = loadWidgetConfig();
  list.innerHTML = cfg.map(function(w, i){
    var def = WIDGET_DEFS_BYID[w.id]; if(!def) return '';
    var on = w.on;
    var arrow = function(dir, disabled){
      return '<button onclick="widgetMove(\'' + w.id + '\',' + dir + ')" ' + (disabled ? 'disabled' : '')
        + ' style="width:30px;height:22px;border:1px solid var(--border-color);border-radius:7px;'
        + 'background:var(--bg-card-alt);color:var(--text-secondary);cursor:pointer;font-size:11px;line-height:1;'
        + 'padding:0;' + (disabled ? 'opacity:.3;' : '') + '">' + (dir < 0 ? '▲' : '▼') + '</button>';
    };
    var pill = on
      ? '<button onclick="widgetToggle(\'' + w.id + '\')" style="flex-shrink:0;min-width:92px;padding:9px 14px;'
        + 'border-radius:99px;border:none;background:var(--accent-primary);color:var(--accent-primary-on);'
        + 'font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation">✓ Visible</button>'
      : '<button onclick="widgetToggle(\'' + w.id + '\')" style="flex-shrink:0;min-width:92px;padding:9px 14px;'
        + 'border-radius:99px;border:1.5px solid var(--border-color);background:transparent;color:var(--text-muted);'
        + 'font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation">Oculto</button>';
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:8px;'
      + 'background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;opacity:' + (on ? '1' : '0.6') + '">'
      + '<div style="display:flex;flex-direction:column;gap:3px">' + arrow(-1, i === 0) + arrow(1, i === cfg.length - 1) + '</div>'
      + '<div style="font-size:20px;flex-shrink:0">' + def.icon + '</div>'
      + '<div style="flex:1;font-size:15px;font-weight:600;color:var(--text-primary)">' + def.title + '</div>'
      + pill
      + '</div>';
  }).join('');
}
function widgetToggle(id){
  var cfg = widgetToggleIn(loadWidgetConfig(), id);
  saveWidgetConfig(cfg);
  renderWidgetConfigList();
  renderWidgets();
}
function widgetMove(id, dir){
  var cfg = widgetMoveIn(loadWidgetConfig(), id, dir);
  saveWidgetConfig(cfg);
  renderWidgetConfigList();
  renderWidgets();
}
function resetWidgetConfig(){
  saveWidgetConfig(defaultWidgetConfig());
  renderWidgetConfigList();
  renderWidgets();
}
