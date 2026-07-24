/* ====================================================
   timer.js -- Interval timer for hangboard / protocols (Grippy-style)
   ClimbCycle

   Runs sets × reps of WORK with rests between reps and between sets, with
   audio + vibration cues. Two ways in:
     - openTimer(cfg): a free timer with editable steppers.
     - tmrOpenProtocol(id): preloaded from a FINGER_PROTOCOLS entry, including
       the target load in kg computed from the climber's Max Hang.

   buildTimerPlan()/fmtMMSS() are PURE and unit-tested; the rest drives DOM +
   WebAudio (created only inside a user gesture, so autoplay policies are happy).
==================================================== */

/* ── Pure engine ── */
function buildTimerPlan(cfg){
  cfg = cfg || {};
  var sets    = Math.max(1, cfg.sets    || 1);
  var reps    = Math.max(1, cfg.reps    || 1);
  var work    = Math.max(1, cfg.work    || 10);
  var restRep = Math.max(0, cfg.restRep != null ? cfg.restRep : 0);
  var restSet = Math.max(0, cfg.restSet || 0);
  var prep    = Math.max(0, cfg.prep    || 0);   /* "get ready" lead-in */
  var phases = [], total = 0;
  if(prep > 0) phases.push({ type:'prep', secs:prep });   /* not counted in the "tiempo de serie" total */
  for(var s=1; s<=sets; s++){
    for(var r=1; r<=reps; r++){
      phases.push({ type:'work', secs:work, set:s, rep:r }); total += work;
      if(r < reps && restRep > 0){ phases.push({ type:'restRep', secs:restRep, set:s, rep:r }); total += restRep; }
    }
    if(s < sets && restSet > 0){ phases.push({ type:'restSet', secs:restSet, set:s }); total += restSet; }
  }
  /* total = protocol time (work+rests); runTotal = incl. prep, for the progress bar */
  return { phases:phases, total:total, runTotal:total + prep, sets:sets, reps:reps, prep:prep };
}
function fmtMMSS(secs){
  secs = Math.max(0, Math.round(secs || 0));
  var m = Math.floor(secs/60), s = secs % 60;
  return m + ':' + ('0'+s).slice(-2);
}

/* ── Runtime state ── */
var Tmr = { cfg:null, plan:null, idx:0, remaining:0, running:false, tick:null };
var _tmrAC = null;

function _tmrPhaseMeta(ph){
  if(!ph) return { label:'¡Listo!', col:'var(--accent-deload,#00E5A0)' };
  if(ph.type === 'prep')    return { label:'Preparate', col:'var(--accent-caution,#FFB800)' };
  if(ph.type === 'work')    return { label:'Trabajo', col:'var(--accent-primary-d,#CCFF00)' };
  if(ph.type === 'restRep') return { label:'Descanso', col:'var(--accent-info,#38BDF8)' };
  return { label:'Descanso entre series', col:'var(--accent-deload,#00E5A0)' };
}
function _tmrInitAudio(){
  try { if(!_tmrAC && (window.AudioContext || window.webkitAudioContext)) _tmrAC = new (window.AudioContext || window.webkitAudioContext)();
        if(_tmrAC && _tmrAC.state === 'suspended') _tmrAC.resume(); } catch(e){}
}
function tmrBeep(freq, dur){
  try {
    if(!_tmrAC) return;
    var o = _tmrAC.createOscillator(), g = _tmrAC.createGain();
    o.type = 'sine'; o.frequency.value = freq || 800;
    o.connect(g); g.connect(_tmrAC.destination);
    var t = _tmrAC.currentTime; dur = dur || 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch(e){}
}
function tmrVibrate(ms){ try { if(navigator.vibrate) navigator.vibrate(ms || 100); } catch(e){} }

/* ── Overlay ── */
function _tmrOverlay(){
  var o = document.getElementById('tmr-overlay');
  if(!o){
    o = document.createElement('div');
    o.id = 'tmr-overlay';
    o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','Temporizador');
    o.style.cssText = 'position:fixed;inset:0;z-index:10000;background:var(--bg-primary,#07070F);display:flex;flex-direction:column;padding:20px 18px;overflow-y:auto';
    document.body.appendChild(o);
  }
  o.style.display = 'flex';
  return o;
}
function tmrClose(){
  Tmr.running = false; if(Tmr.tick) clearInterval(Tmr.tick);
  var o = document.getElementById('tmr-overlay'); if(o) o.style.display = 'none';
}

function openTimer(cfg){
  cfg = cfg || {};
  Tmr.cfg = { sets:cfg.sets || 1, reps:cfg.reps || 6, work:cfg.work || 10,
              restRep:(cfg.restRep != null ? cfg.restRep : 60), restSet:cfg.restSet || 0,
              prep:(cfg.prep != null ? cfg.prep : 10),
              label:cfg.label || 'Temporizador', load:(cfg.load != null ? cfg.load : null) };
  Tmr.plan = null; Tmr.idx = 0; Tmr.remaining = 0; Tmr.running = false;
  if(Tmr.tick) clearInterval(Tmr.tick);
  tmrRenderConfig();
}
/* Preload from a finger protocol (+ compute kg from the Max Hang). */
function tmrOpenProtocol(protoId){
  var p = null;
  if(typeof FINGER_PROTOCOLS !== 'undefined'){
    for(var i=0;i<FINGER_PROTOCOLS.length;i++){ if(FINGER_PROTOCOLS[i].id === protoId){ p = FINGER_PROTOCOLS[i]; break; } }
  }
  if(!p) return openTimer({});
  var load = null;
  if(p.mode === 'hangboard' && typeof fingerMaxHang === 'function'){ var mh = fingerMaxHang(); if(mh > 0) load = Math.round(mh * p.intensity); }
  openTimer({ sets:p.series, reps:p.reps, work:p.work, restRep:p.restReps,
              restSet:Math.round((p.restSeries || 0) * 60), label:p.obj, load:load });
}

/* ── Config view (editable steppers) ── */
function tmrAdj(field, dir){
  var c = Tmr.cfg; if(!c) return;
  var step = { sets:1, reps:1, work:1, restRep:5, restSet:5, prep:5 }[field] || 1;
  var lim  = { sets:[1,20], reps:[1,40], work:[1,120], restRep:[0,900], restSet:[0,1800], prep:[0,60] }[field] || [0,9999];
  c[field] = Math.max(lim[0], Math.min(lim[1], (c[field] || 0) + dir*step));
  tmrRenderConfig();
}
function _tmrStepper(label, field, val, unit){
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border-color)">'
    + '<div style="font-size:13px;color:var(--text-secondary)">' + label + '</div>'
    + '<div style="display:flex;align-items:center;gap:14px">'
      + '<button aria-label="Menos ' + label + '" onclick="tmrAdj(\'' + field + '\',-1)" style="width:34px;height:34px;border-radius:9px;border:1px solid var(--border-color);background:var(--bg-card-alt);color:var(--text-primary);font-size:18px;cursor:pointer;line-height:1">&minus;</button>'
      + '<div style="min-width:56px;text-align:center"><span style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:var(--text-primary)">' + val + '</span>' + (unit ? '<span style="font-size:10px;color:var(--text-muted);margin-left:3px">' + unit + '</span>' : '') + '</div>'
      + '<button aria-label="Más ' + label + '" onclick="tmrAdj(\'' + field + '\',1)" style="width:34px;height:34px;border-radius:9px;border:1px solid var(--border-color);background:var(--bg-card-alt);color:var(--text-primary);font-size:18px;cursor:pointer;line-height:1">+</button>'
    + '</div>'
  + '</div>';
}
function tmrRenderConfig(){
  var o = _tmrOverlay(); var c = Tmr.cfg;
  var total = buildTimerPlan(c).total;
  o.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:800;color:var(--text-primary)">' + (typeof escapeHtml==='function'?escapeHtml(c.label):c.label) + '</div>'
      + '<button aria-label="Cerrar" onclick="tmrClose()" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border-color);background:var(--bg-card-alt);color:var(--text-secondary);font-size:18px;cursor:pointer">&times;</button>'
    + '</div>'
    + (c.load != null ? '<div style="display:inline-block;font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;color:var(--accent-primary-d);background:var(--accent-primary-bg);border-radius:8px;padding:5px 10px;margin-bottom:6px">Carga objetivo: ' + c.load + ' kg</div>' : '')
    + '<div style="background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:16px;padding:22px;text-align:center;margin:8px 0 16px">'
      + '<div style="font-size:11px;color:#DBEAFE;text-transform:uppercase;letter-spacing:1.5px">Tiempo de serie</div>'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:52px;font-weight:800;color:#fff;line-height:1.1">' + fmtMMSS(total) + '</div>'
    + '</div>'
    + _tmrStepper('Preparación', 'prep', c.prep, 'seg')
    + _tmrStepper('Series', 'sets', c.sets, '')
    + _tmrStepper('Repeticiones', 'reps', c.reps, '')
    + _tmrStepper('Tiempo de trabajo', 'work', c.work, 'seg')
    + _tmrStepper('Descanso entre reps', 'restRep', c.restRep, 'seg')
    + _tmrStepper('Descanso entre series', 'restSet', c.restSet, 'seg')
    + '<button onclick="tmrStart()" style="margin-top:20px;width:100%;padding:16px;background:#00E5A0;border:none;border-radius:14px;color:#04120c;font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;cursor:pointer;touch-action:manipulation">&#x25B6; Empezar</button>';
}

/* ── Run view ── */
function tmrStart(){
  _tmrInitAudio();
  Tmr.plan = buildTimerPlan(Tmr.cfg);
  if(!Tmr.plan.phases.length){ return; }
  Tmr.idx = 0; Tmr.remaining = Tmr.plan.phases[0].secs; Tmr.running = true;
  tmrRenderRun(); tmrLoop();
}
function tmrLoop(){
  if(Tmr.tick) clearInterval(Tmr.tick);
  Tmr.tick = setInterval(function(){
    if(!Tmr.running) return;
    Tmr.remaining--;
    if(Tmr.remaining > 0 && Tmr.remaining <= 3) tmrBeep(600, 0.07);
    if(Tmr.remaining <= 0){
      Tmr.idx++;
      if(Tmr.idx >= Tmr.plan.phases.length){ tmrBeep(1040,0.35); tmrVibrate([120,60,120]); tmrDone(); return; }
      var next = Tmr.plan.phases[Tmr.idx];
      tmrBeep(next.type === 'work' ? 980 : 760, 0.22); tmrVibrate(140);
      Tmr.remaining = next.secs;
    }
    tmrUpdateRun();
  }, 1000);
}
function tmrPauseResume(){
  Tmr.running = !Tmr.running;
  if(Tmr.running){ _tmrInitAudio(); tmrLoop(); }
  var b = document.getElementById('tmr-pp'); if(b) b.innerHTML = Tmr.running ? '&#10073;&#10073; Pausar' : '&#x25B6; Seguir';
}
function tmrReset(){
  Tmr.running = false; if(Tmr.tick) clearInterval(Tmr.tick);
  Tmr.idx = 0; Tmr.remaining = Tmr.plan ? Tmr.plan.phases[0].secs : 0;
  tmrRenderConfig();
}
function tmrDone(){
  Tmr.running = false; if(Tmr.tick) clearInterval(Tmr.tick);
  tmrUpdateRun(true);
}
function _tmrElapsed(){
  var e = 0; for(var i=0;i<Tmr.idx && i<Tmr.plan.phases.length;i++) e += Tmr.plan.phases[i].secs;
  var cur = Tmr.plan.phases[Tmr.idx];
  if(cur) e += (cur.secs - Tmr.remaining);
  return e;
}
function tmrRenderRun(){
  var o = _tmrOverlay();
  o.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      + '<div style="font-size:13px;color:var(--text-muted)">' + (typeof escapeHtml==='function'?escapeHtml(Tmr.cfg.label):Tmr.cfg.label) + (Tmr.cfg.load!=null?(' · '+Tmr.cfg.load+' kg'):'') + '</div>'
      + '<button aria-label="Cerrar" onclick="tmrClose()" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border-color);background:var(--bg-card-alt);color:var(--text-secondary);font-size:18px;cursor:pointer">&times;</button>'
    + '</div>'
    + '<div id="tmr-stage" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:20px;margin:8px 0;transition:background .2s">'
      + '<div id="tmr-phase" style="font-family:\'Barlow Condensed\',sans-serif;font-size:26px;font-weight:800;letter-spacing:1px"></div>'
      + '<div id="tmr-count" style="font-family:\'Barlow Condensed\',sans-serif;font-size:104px;font-weight:900;line-height:1;color:#fff;margin:6px 0"></div>'
      + '<div id="tmr-meta" style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:rgba(255,255,255,0.8)"></div>'
      + '<div style="width:70%;max-width:280px;height:5px;background:rgba(255,255,255,0.2);border-radius:99px;margin-top:16px;overflow:hidden"><div id="tmr-prog" style="height:100%;width:0%;background:#fff;border-radius:99px"></div></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px">'
      + '<button id="tmr-pp" onclick="tmrPauseResume()" style="flex:2;padding:15px;background:#00E5A0;border:none;border-radius:13px;color:#04120c;font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:800;cursor:pointer;touch-action:manipulation">&#10073;&#10073; Pausar</button>'
      + '<button onclick="tmrReset()" style="flex:1;padding:15px;background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:13px;color:var(--text-secondary);font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;cursor:pointer;touch-action:manipulation">Reiniciar</button>'
    + '</div>';
  tmrUpdateRun();
}
function tmrUpdateRun(done){
  var ph = done ? null : Tmr.plan.phases[Tmr.idx];
  var m = _tmrPhaseMeta(ph);
  var stage = document.getElementById('tmr-stage');
  var phEl = document.getElementById('tmr-phase'), cEl = document.getElementById('tmr-count'), mEl = document.getElementById('tmr-meta'), pEl = document.getElementById('tmr-prog');
  if(stage) stage.style.background = done ? 'var(--accent-deload,#00E5A0)'
    : (ph && ph.type==='work') ? 'rgba(204,255,0,0.14)'
    : (ph && ph.type==='prep') ? 'rgba(255,184,0,0.14)'
    : 'rgba(56,189,248,0.14)';
  if(phEl){ phEl.textContent = m.label; phEl.style.color = done ? '#04120c' : m.col; }
  if(cEl) cEl.textContent = done ? '✓' : fmtMMSS(Tmr.remaining);
  if(mEl && !done){
    if(ph && ph.type === 'prep'){ mEl.textContent = '¡Preparate!'; }
    else {
      var setsTxt = 'Serie ' + (ph ? ph.set : Tmr.plan.sets) + '/' + Tmr.plan.sets;
      var repTxt  = (ph && ph.rep) ? (' · Rep ' + ph.rep + '/' + Tmr.cfg.reps) : '';
      mEl.textContent = setsTxt + repTxt;
    }
  } else if(mEl){ mEl.textContent = 'Sesión completa'; }
  if(pEl && Tmr.plan.runTotal) pEl.style.width = Math.min(100, Math.round(_tmrElapsed()/Tmr.plan.runTotal*100)) + '%';
  var pp = document.getElementById('tmr-pp'); if(pp && done){ pp.innerHTML = '&#x21BB; De nuevo'; pp.setAttribute('onclick','tmrReset()'); }
}
