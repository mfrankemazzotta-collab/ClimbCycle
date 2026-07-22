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
        +   '<button onclick="openCI()" class="btn-tint">+ Nuevo check-in</button>'
        + '</div>';
  }},
  { id:'goal', title:'Objetivo', icon:'🏁', html:function(){
      return '<div id="goal-card"></div>';
  }},
  { id:'stats', title:'Números', icon:'📊', html:function(){
      return ''
        + '<div class="stats-row">'
        +   '<div class="stat-tile"><div class="stat-tile-num" style="color:var(--accent-primary-d)" id="stses">0</div><div class="stat-tile-lbl">ses/sem</div></div>'
        +   '<div class="stat-tile"><div class="stat-tile-num" style="color:var(--accent-strength)" id="stwk">S1</div><div class="stat-tile-lbl">semana</div></div>'
        +   '<div class="stat-tile"><div class="stat-tile-num" style="color:var(--accent-power)" id="stday">--</div><div class="stat-tile-lbl">restantes</div></div>'
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
  }}
];
var WIDGET_DEFS_BYID = (function(){ var m={}; WIDGET_DEFS.forEach(function(d){ m[d.id]=d; }); return m; })();

/* Default order = registry order, all enabled. */
function defaultWidgetConfig(){
  return WIDGET_DEFS.map(function(d){ return { id:d.id, on:true }; });
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
  WIDGET_DEFS.forEach(function(d){ if(!seen[d.id]) out.push({ id:d.id, on:true }); });
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
  try { if(g('stses')) renderStats(); } catch(e){}
  try { if(g('glance-grid')) renderGlance(); } catch(e){}
}

/* Wire the (previously static, unpopulated) stat tiles to real numbers. */
function renderStats(){
  var cur = (typeof getCurrentWeekIndex === 'function') ? getCurrentWeekIndex() : 0;
  var comp = (typeof getWeekCompletion === 'function') ? getWeekCompletion(cur) : { done:0, total:0 };
  var ses = document.getElementById('stses'); if(ses) ses.textContent = comp.total;
  var wk  = document.getElementById('stwk');  if(wk)  wk.textContent = 'S' + (cur + 1);
  var day = document.getElementById('stday'); if(day) day.textContent = Math.max(0, comp.total - comp.done);
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
  if(m){ m.classList.add('on'); renderWidgetConfigList(); }
}
function closeWidgetConfig(){
  var m = document.getElementById('wcfg-modal');
  if(m) m.classList.remove('on');
}
function renderWidgetConfigList(){
  var list = document.getElementById('wcfg-list'); if(!list) return;
  var cfg = loadWidgetConfig();
  list.innerHTML = cfg.map(function(w, i){
    var def = WIDGET_DEFS_BYID[w.id]; if(!def) return '';
    return '<div class="wcfg-row">'
      + '<div class="wcfg-move">'
      +   '<button class="wcfg-arrow" ' + (i === 0 ? 'disabled' : '') + ' onclick="widgetMove(\'' + w.id + '\',-1)">&#8593;</button>'
      +   '<button class="wcfg-arrow" ' + (i === cfg.length - 1 ? 'disabled' : '') + ' onclick="widgetMove(\'' + w.id + '\',1)">&#8595;</button>'
      + '</div>'
      + '<div class="wcfg-name">' + def.icon + ' ' + def.title + '</div>'
      + '<button class="wcfg-toggle ' + (w.on ? 'on' : '') + '" onclick="widgetToggle(\'' + w.id + '\')" aria-label="Activar/desactivar">'
      +   '<span class="wcfg-knob"></span></button>'
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
