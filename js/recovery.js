/* ====================================================
   recovery.js -- Recovery engine, check-in, session logger
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Recovery engine
────────────────────────────────────────────────── */


/* ──────────────────────────────────────────────────
   Acute:Chronic Workload Ratio (ACWR)
   The memory of consecutive sessions the single-session model ignores.
   Reads the persisted session history (cc_logs) via loadSLogs().
     acute   = total training load of the last 7 days
     chronic = average WEEKLY load over the last 28 days (28d total / 4)
     ratio   = acute / chronic
   Gabbett (2016): the 0.8–1.3 "sweet spot" balances stimulus and recovery;
   a spike > 1.5 is the strongest MODIFIABLE predictor of overuse injury.
   No-op until there's enough history to be meaningful (>7 days of span AND
   ≥3 sessions), so brand-new users are never penalised.
────────────────────────────────────────────────── */
function loadForLog(l){
  if(!l) return 0;
  /* session-RPE de Foster (2001): carga = duración × RPE. Y NADA MÁS.
     Es el método estándar de carga interna, validado en múltiples deportes y
     —desde hace poco— en escalada específicamente (Italian climbers, todas
     las disciplinas: r = 0.83 contra métodos basados en frecuencia cardíaca).

     Antes acá se multiplicaba además por un factor de tipo de sesión
     (power 1.2, endurance 0.7…). Eso es DOBLE CONTEO: si una sesión se
     percibe más dura, eso YA está en el RPE. Peor: cuando el usuario
     registraba con detalle y decía "resistencia, RPE 8", el factor 0.7 lo
     rebajaba a 5.6 efectivo — el sistema contradecía a quien había estado
     ahí. El factor sí tiene sentido en `calcRecovery`, que modela otra cosa
     (cuánto tarda el TEJIDO en recuperarse, no cuánto costó el esfuerzo);
     ahí se conserva, con su justificación. */
  return (l.dur || 0) * (l.rpe || 0);
}
function computeACWR(){
  var logs = (typeof loadSLogs === 'function') ? loadSLogs() : [];
  var now = Date.now(), DAY = 86400000;
  var acute = 0, chronic28 = 0, nChronic = 0, spanDays = 0;
  for(var i = 0; i < logs.length; i++){
    var l = logs[i];
    if(!l || !l.ts) continue;
    var days = (now - l.ts) / DAY;
    if(days < 0) days = 0;
    var load = loadForLog(l);
    if(days <= 7)  acute += load;
    if(days <= 28){ chronic28 += load; nChronic++; if(days > spanDays) spanDays = days; }
  }
  var chronic = chronic28 / 4;
  var ready = (spanDays > 7 && nChronic >= 3 && chronic > 0);
  return { acute:acute, chronic:chronic, ratio: ready ? acute / chronic : null, sessions:nChronic, ready:ready };
}
/* Turn an ACWR reading into a readiness penalty + a user-facing message.
   Only genuine spikes cost readiness points; low load is informational. */
function acwrAssessment(acwr){
  if(!acwr || acwr.ratio == null) return { level:'none', penalty:0, label:'', msg:'' };
  var r = acwr.ratio, rs = r.toFixed(1);
  if(r > 1.5) return { level:'high', penalty:20, label:'Carga en pico',
    msg:'Tu carga de los últimos 7 días es ' + rs + '× tu media de 4 semanas. Los picos bruscos (>1.5) son el principal predictor modificable de lesión por sobreuso (Gabbett 2016). Bajá volumen o intensidad esta semana.' };
  if(r > 1.3) return { level:'caution', penalty:10, label:'Carga elevada',
    msg:'Tu carga aguda sube rápido (' + rs + '× tu media). Estás saliendo de la zona segura (0.8–1.3): progresá con cuidado.' };
  if(r < 0.8) return { level:'detrain', penalty:0, label:'Carga baja',
    msg:'Tu carga reciente (' + rs + '× tu media) viene floja. No es riesgo de lesión; si venís de un parón, retomá de forma progresiva.' };
  return { level:'optimal', penalty:0, label:'Carga óptima',
    msg:'Tu carga está en la zona dulce (0.8–1.3× tu media de 4 semanas): buen equilibrio entre estímulo y recuperación.' };
}
function recoveryStatus(score){
  return score >= 72 ? 'fresh' : score >= 45 ? 'recovering' : 'fatigued';
}

function calcRecovery(){
  loadRec();

  /*
    RECOVERY ENGINE v2 - Scientific basis:
    - Horst (2016): HIGH sessions (limit bouldering, campus, max hangs) need 48-72h.
      Moderate (circuits, volume climbing): 24-36h. Easy/ARC: 12-24h.
    - Bechtel (Logical Progression): time elapsed since session is the PRIMARY
      recovery driver. Volume * intensity is secondary.
    - Lattice Training: perceived fatigue + sleep quality are strong predictors
      of readiness (stronger than volume alone).
    - ATR model: acute load decays with ~3-5 day half-life for finger tendons,
      ~1-2 days for systemic fatigue.

    KEY FIX: use recData.hoursAgo (time since session) NOT ts (check-in time).
    ts was always 0 at check-in, making hoursSince=0 -> always fatigued.
  */

  var rpe     = recData.rpe   || 0;
  var dur     = recData.dur   || 0;
  var stype   = recData.stype || 'none';
  var hoursAgo= recData.hoursAgo != null ? recData.hoursAgo : 24;

  /* Accumulated load (ACWR) — memory of consecutive sessions, independent of
     today's check-in. acwrA.penalty is 0 until there's enough history. */
  var acwr    = computeACWR();
  var acwrA   = acwrAssessment(acwr);
  var acwrOut = { ratio:acwr.ratio, level:acwrA.level, label:acwrA.label, msg:acwrA.msg,
                  acute:acwr.acute, chronic:acwr.chronic, ready:acwr.ready };

  /* No session -> fully fresh */
  if(rpe===0 || stype==='none' || dur===0){
    var score0=100;
    var sleepPenalty0=Math.max(0,(7-recData.sleep)*5);
    var sleepQBonus0=(recData.sleepQ-3)*3;
    var sorePenalty0=[0,5,12,20][recData.sore]||0;
    score0=Math.max(0,Math.min(100,score0-sleepPenalty0+sleepQBonus0-sorePenalty0-acwrA.penalty));
    return {score:score0,hoursRemaining:0,status:recoveryStatus(score0),load:0,acwr:acwrOut};
  }

  /*
    Session type multipliers (Horst 2016 + Bechtel):
    Outdoor rock and power sessions stress CNS + tendons most -> slowest recovery.
    ARC/recovery sessions flush lactate, actually HELP recovery.
  */
  var typeMultiplier={
    'none':0,
    'recovery': 0.4,   /* ARC, easy climbing — minimal tendon load */
    'endurance':0.7,   /* circuits, 4x4 — moderate load */
    'strength':  1.0,  /* max hangs, limit bouldering — full load */
    'power':     1.2,  /* campus, dynamic — highest CNS demand */
    'outdoor':   0.9   /* rock: varies, assume moderate-high */
  };
  var mult = typeMultiplier[stype] || 1.0;

  /* Raw training load (Impulse = duration * RPE, scaled by type) */
  var load = dur * rpe * mult;

  /*
    Hours needed for full recovery (Horst 2016 tendon adaptation timeline):
    LOW load (<180): 16-24h (1 day)
    MODERATE (180-500): 24-36h
    HIGH (500-900): 36-48h
    VERY HIGH (>900): 48-72h
    Campus/power adds 20% extra (CNS component)
  */
  var hoursNeeded;
  if(load < 180)      hoursNeeded = 18;
  else if(load < 350) hoursNeeded = 24;
  else if(load < 600) hoursNeeded = 36;
  else if(load < 900) hoursNeeded = 48;
  else                hoursNeeded = 60;

  /* Power sessions add CNS recovery time */
  if(stype==='power') hoursNeeded = Math.min(72, hoursNeeded + 12);

  /*
    Recovery progress: linear decay from load to 0 over hoursNeeded.
    hoursAgo = how long ago the session was (user-reported).
    This is the KEY FIX - was using ts (always 0) before.
  */
  var effectiveHours = Math.min(hoursAgo, hoursNeeded);
  var rawProgress    = hoursNeeded > 0 ? effectiveHours / hoursNeeded : 1;
  var hoursRemaining = Math.max(0, Math.round(hoursNeeded - hoursAgo));

  /* Base recovery score from time elapsed */
  var baseScore = Math.round(rawProgress * 100);

  /*
    Modifiers (Lattice/Crimpd check-in model):
    Sleep: < 6h significantly impairs recovery (Walker, Why We Sleep 2017)
    Sleep quality matters: poor quality = worse than quantity alone
    Soreness: objective tissue damage signal
    Perceived fatigue: CNS/motivation predictor
  */
  var sleepH   = recData.sleep   || 7;
  var sleepQ   = recData.sleepQ  || 3; /* 1-4 */
  var sore     = recData.sore    || 0; /* 0-3 */
  var fatigue  = recData.fat     || 0; /* 0-3 */

  /* Sleep: Horst references 7-9h optimal for climbing recovery */
  var sleepPenalty = sleepH >= 7 ? 0 : Math.round((7 - sleepH) * 6);
  var sleepBonus   = (sleepQ - 2) * 4; /* Q4=+8, Q3=+4, Q2=0, Q1=-4 */

  /* Soreness: tissue damage slows recovery regardless of time */
  var sorePenalty = [0, 8, 16, 28][sore] || 0;

  /* Perceived fatigue: CNS/motivation state */
  var fatPenalty = [0, 6, 14, 24][fatigue] || 0;

  var score = Math.max(0, Math.min(100,
    baseScore - sleepPenalty + sleepBonus - sorePenalty - fatPenalty - acwrA.penalty
  ));

  return {score:score, hoursRemaining:hoursRemaining, status:recoveryStatus(score), load:load, acwr:acwrOut};
}
/* Map recovery score to actionable interpretation.
   Based on Horst (Training for Climbing) recovery zones:
   - >= 85%: full intensity OK
   - 70-84%: ready, monitor sensations
   - 50-69%: moderate intensity only
   - 30-49%: deload or movility
   - < 30%: rest */
function getRecoveryInterpretation(score){
  if(score >= 85) return {txt:'Listo para entrenar al máximo', col:'var(--accent-deload)'};
  if(score >= 70) return {txt:'Listo, pero monitoreá tus sensaciones', col:'var(--accent-deload)'};
  if(score >= 50) return {txt:'Entrená a intensidad moderada', col:'var(--accent-caution)'};
  if(score >= 30) return {txt:'Considerá deload o solo movilidad', col:'var(--accent-warning)'};
  return {txt:'Fatiga alta — descansá hoy', col:'var(--accent-warning)'};
}

function renderRecoveryCard(rec){
  var m=REC_META[rec.status];
  /* ring */
  document.getElementById('aring').innerHTML=makeRing(rec.score,m.col,100);
  /* badge de fase */
  document.getElementById('aphase').innerHTML='<span class="badge '+m.css+'">'+m.badge+'</span>';
  /* fc reposo */
  document.getElementById('arhr').textContent=U.rhr+' bpm';
  /* estado texto + interpretación accionable */
  var stEl=document.getElementById('arec-status');
  var interp = getRecoveryInterpretation(rec.score);
  if(stEl){
    stEl.innerHTML = m.lbl
      + '<div style="font-family:\'Barlow\',sans-serif;font-size:11px;font-weight:500;color:'+interp.col+';margin-top:3px;line-height:1.3">'+interp.txt+'</div>';
    stEl.style.color = m.col;
  }
  /* ventana */
  var recEl=document.getElementById('arec');
  if(rec.hoursRemaining===0&&rec.status==='fresh'){
    if(recEl){recEl.textContent='Listo';recEl.style.color='var(--accent-deload)';}
  } else {
    if(recEl){recEl.textContent=rec.hoursRemaining+'h restantes';}
  }
  /* glow color dinámico */
  var card=document.querySelector('#phome .card.glow');
  if(card)card.style.boxShadow='0 0 24px '+m.col+'18';
  /* ACWR load strip — injury-prevention signal. Shows only once there's
     enough history (rec.acwr.ratio != null); hidden otherwise. */
  var loadEl=document.getElementById('arec-load');
  if(loadEl){
    var a=rec.acwr;
    if(a&&a.ratio!=null){
      var lc=a.level==='high'?'var(--accent-warning)'
            :a.level==='caution'?'var(--accent-caution)'
            :a.level==='detrain'?'var(--text-secondary)'
            :'var(--accent-deload)';
      loadEl.style.display='block';
      loadEl.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid '+lc+'44;background:'+lc+'12;border-radius:8px">'
        +'<div style="display:flex;flex-direction:column">'
          +'<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Carga aguda:crónica</span>'
          +'<span style="font-size:12px;color:'+lc+';font-weight:600">'+a.label+'</span>'
        +'</div>'
        +'<span style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:'+lc+'">'+a.ratio.toFixed(2)+'</span>'
      +'</div>';
    } else {
      loadEl.style.display='none';
      loadEl.innerHTML='';
    }
  }
  /* keep the At-a-Glance / stats widgets in sync after check-ins & logs */
  if(typeof renderGlance === 'function'){ try{ renderGlance(); }catch(e){} }
  if(typeof renderStats === 'function'){ try{ renderStats(); }catch(e){} }
}
/* ──────────────────────────────────────────────────
   Check-in
────────────────────────────────────────────────── */


function openCI(){document.getElementById('ci-modal').classList.add('on');ciUpd();if(typeof a11yOpenModal==='function')a11yOpenModal(document.getElementById('ci-modal'),closeCI,'ci-title-h');}
function closeCI(){
  document.getElementById('ci-modal').classList.remove('on');
  if(document.activeElement)document.activeElement.blur();
  if(typeof a11yCloseModal==='function')a11yCloseModal(document.getElementById('ci-modal'));
}
/* El RPE del check-in se elige con pills (`ci-rpe-pills`, ver ciPill), no con
   un slider: por eso acá sólo quedan sueño y duración. */
function ciUpd(){
  var sl=document.getElementById('ci-sleep'),du=document.getElementById('ci-dur');
  if(sl){document.getElementById('ci-sleep-lbl').textContent=sl.value+'h';if(typeof a11ySlider==='function')a11ySlider('ci-sleep',sl.value+' horas');}
  if(du){
    var dv=parseInt(du.value)||0;
    document.getElementById('ci-dur-lbl').textContent=dv===0?'Sin sesión':dv+' min';
    if(typeof a11ySlider==='function')a11ySlider('ci-dur',dv===0?'Sin sesión':dv+' minutos');
  }
}
function ciPill(el,group){
  var container=document.getElementById('ci-'+group+'-pills');
  if(container)container.querySelectorAll('.ci-pill').forEach(function(p){p.classList.remove('on');});
  el.classList.add('on');
  var val=el.getAttribute('data-v');
  /* Hide duration slider for outdoor (rock) sessions — duration is variable */
  if(group === 'stype'){
    var durRow = document.getElementById('ci-dur-row');
    if(durRow){
      durRow.style.display = (val === 'outdoor' || val === 'none') ? 'none' : 'block';
    }
  }
  /* numeric groups */
  if(group==='sleepq'||group==='sore'||group==='fat'){
    ciState[group]=parseInt(val);
  } else if(group==='rpe'||group==='ago'){
    ciState[group]=parseInt(val);
  } else {
    /* string groups: stype */
    ciState[group]=val;
  }
}
function saveCI(){
  var sl=parseFloat(document.getElementById('ci-sleep').value)||7;
  var du=parseInt(document.getElementById('ci-dur').value)||0;
  /* Outdoor sessions: default to 4h if user didn't enter */
  if(ciState.stype === 'outdoor' && du === 0) du = 240;
  recData={
    sleep:sl,
    sleepQ:ciState.sleepq||3,
    sore:ciState.sore||0,
    fat:ciState.fat||0,
    rpe:ciState.rpe||0,
    dur:du,
    hoursAgo:ciState.ago!=null?ciState.ago:24,
    stype:ciState.stype||'none',
    ts:Date.now()
  };
  saveRec();
  closeCI();
  var rec=calcRecovery();
  renderRecoveryCard(rec);
  if(typeof renderNextAction === 'function') renderNextAction();
  showToast('Check-in guardado','var(--accent-deload)');
}
/* ──────────────────────────────────────────────────
   Session logger
────────────────────────────────────────────────── */


function blockToStype(block){
  /* 'outdoor' se mapea explícitamente: sin esta entrada caía en el fallback
     'endurance' y una salida de roca se contabilizaba con el multiplicador
     equivocado (0.7 en vez de 0.9) en loadForLog/ACWR. */
  var m={strength:'strength',power:'power',endurance:'endurance',deload:'recovery',test:'strength',
         outdoor:'outdoor',project:'outdoor'};
  return m[block]||'endurance';
}

/* ─────────────────────────────────────────────────────
   Sesiones ↔ historial de carga (cc_logs)

   `cc_logs` es lo que lee `computeACWR()`, y el ACWR es la alerta preventiva
   de lesión de la app. Durante mucho tiempo el ÚNICO camino que escribía ahí
   era el modal "Registrar con detalle": marcar la sesión con el botón grande,
   completarla marcando ejercicios, "Entrené hoy" o salir a roca no dejaban
   rastro de carga. Con 10 sesiones hechas el ACWR seguía en `ratio:null`, o
   sea que la alerta no se disparaba nunca.

   Ahora cada camino que da una sesión por hecha registra su carga. Las que se
   marcan con un tap no traen RPE ni duración, así que se ESTIMAN por fase
   (ver `estimateSessionLoad`) y quedan marcadas con `auto:true`:
     · una estimación uniforme sigue haciendo informativo el ratio agudo:crónico
       (es la misma métrica comparada consigo misma), y
     · si después el usuario registra esa sesión con detalle, su dato real
       pisa la estimación (el log se indexa por `dateStr`).

   Se registra con el timestamp DEL DÍA de la sesión, no con `Date.now()`, para
   que caiga en la ventana correcta de 7/28 días.
   ───────────────────────────────────────────────────── */

/* RPE típico por fase, en la escala CR-10 (Borg modificada por Foster).
   Calibrado 2026-08-05 contra los rangos que publica Lattice Training para
   entrenamiento de escalada — antes estaban puestos a ojo y comprimidos
   hacia el medio (endurance 6, deload 4), lo que inflaba la carga crónica
   de las fases suaves y por lo tanto SUBESTIMABA los picos del ACWR: el
   error iba, otra vez, en la dirección peligrosa.

     strength  7  Lattice: un max hang se busca a RPE 7 (≈3 s en reserva
                  sobre un cuelgue de 7 s)
     power     9  limit bouldering / campus caen en RPE 9-10; se toma el
                  extremo bajo porque una sesión incluye descansos largos
     endurance 4  Lattice: los intervalos de resistencia apuntan a 4/10
                  ("pumped pero sin fallar"). La fase mezcla ARC (2/10) con
                  intervalos y 4x4, así que 4 es el promedio razonable
     deload    2  Lattice: ARC y escalada fácil viven en 2/10
     test      8  los tests son esfuerzos maximales por definición
     outdoor   7  un día de roca varía muchísimo; 7 asume "buen día de
                  escalada", no una jornada de proyecto al límite
     project   9  proyectar ES limit climbing (RPE 9-10)

   Sigue siendo una ESTIMACIÓN para las sesiones que se marcan con un tap.
   Quien quiera precisión usa el modal de detalle, y su RPE real manda. */
var SESSION_RPE = { strength:7, power:9, endurance:4, deload:2, test:8, outdoor:7, project:9 };
var ROCK_DEFAULT_RPE = 7;      /* salida de roca típica: dura, no maximal */
var ROCK_DEFAULT_MIN = 240;    /* 4 h de jornada, incluidos los descansos */

var PROJECT_DEFAULT_MIN = 120;   /* un día de proyecto: alta intensidad, volumen medio */

/* PURE. Carga estimada de una sesión marcada con un tap. */
function estimateSessionLoad(block, sessionMin){
  if(block === 'outdoor') return { rpe: ROCK_DEFAULT_RPE, dur: ROCK_DEFAULT_MIN };
  if(block === 'project') return { rpe: SESSION_RPE.project, dur: PROJECT_DEFAULT_MIN };
  return { rpe: SESSION_RPE[block] || 6, dur: sessionMin || 90 };
}

/* Escribe (o reemplaza) la entrada de un día en el historial de carga. */
function writeSessionLog(dateStr, entry){
  var logs = loadSLogs().filter(function(l){ return l.dateStr !== dateStr; });
  logs.push(entry);
  if(logs.length > 120) logs = logs.slice(-120);
  saveSLogs(logs);
  return entry;
}

/* Timestamp del DÍA de la sesión (mediodía), no el instante en que se marcó:
   registrar el lunes una sesión del martes pasado la ubicaba en la ventana
   aguda de hoy e inflaba el ACWR. */
function dayTimestamp(dateStr){
  var d = new Date(dateStr); d.setHours(12, 0, 0, 0);
  return d.getTime();
}

/* Registra una sesión dada por hecha sin detalle (botón grande, ejercicios
   completados, "entrené hoy", salida de roca). */
function logAutoSession(dateStr, block, sessionMin){
  var est = estimateSessionLoad(block, sessionMin);
  return writeSessionLog(dateStr, {
    ts: dayTimestamp(dateStr), dateStr: dateStr, block: block,
    rpe: est.rpe, dur: est.dur,
    feel: 2, pain: 0, focus: '', notes: '', auto: true
  });
}

function logRockOuting(dateStr, opts){
  opts = opts || {};
  var est = estimateSessionLoad('outdoor');
  return writeSessionLog(dateStr, {
    ts: dayTimestamp(dateStr), dateStr: dateStr, block: 'outdoor',
    rpe: opts.rpe || est.rpe, dur: opts.dur || est.dur,
    feel: 2, pain: 0, focus: 'outdoor', notes: opts.notes || '', auto: true
  });
}

/* Al deshacer una sesión se borra su log — pero SÓLO si lo puso la app
   (`auto`). Si el usuario lo registró a mano con su propio RPE, ese dato es
   suyo y no se toca. */
function unlogAutoSession(dateStr){
  var logs = loadSLogs();
  var quedan = logs.filter(function(l){ return !(l.dateStr === dateStr && l.auto); });
  if(quedan.length === logs.length) return false;
  saveSLogs(quedan);
  return true;
}
/* Alias histórico (las salidas de roca son un caso de lo mismo). */
function unlogRockOuting(dateStr){ return unlogAutoSession(dateStr); }

/* Punto de entrada único para "esta sesión se dio por hecha": lo llaman el
   botón grande de Hoy (`markSess`), el auto-completar por ejercicios
   (`hoyToggleEx`) y "Entrené hoy" (`trainedToday`). Vive acá, y no en un
   render-*, para que ninguna pantalla dependa de otra.
   No hace nada si: el día no es de entrenamiento, la sesión es futura, o el
   usuario ya la registró a mano (su RPE real manda sobre la estimación). */
function logSessionDone(dateStr){
  var p = (typeof planMap !== 'undefined') ? planMap[dateStr] : null;
  if(!p || p.block === 'rest' || p.block === 'test') return null;

  var w = (typeof resolveSessionTiming === 'function')
    ? resolveSessionTiming(dateStr, TODAY) : { log:true };
  if(!w.log) return null;   /* una sesión futura todavía no es carga */

  var previos = loadSLogs();
  for(var i = 0; i < previos.length; i++){
    if(previos[i].dateStr === dateStr && !previos[i].auto) return null;
  }
  return logAutoSession(dateStr, p.outdoor ? 'outdoor' : p.block,
                        (typeof U !== 'undefined') ? U.session : 90);
}

/* ─────────────────────────────────────────────────────
   Proyectos ↔ carga

   Los intentos de proyecto viven en `cc_projects` y no tocaban nada más:
   12 días proyectando a tu límite dejaban el ACWR en cero. Proyectar es la
   escalada MÁS intensa que hace el usuario, así que ignorarla desarma la
   alerta de lesión justo en el escenario más riesgoso.

   Criterio conservador, para no inflar la carga:
     · un DÍA con intentos = UNA sesión (no una por intento: 12 intentos
       suelen ser 3 días de 4, no 12 sesiones)
     · si ese día ya tiene un log (roca, gym o registro detallado), ese manda
       y no se agrega nada — los intentos ocurrieron DENTRO de esa sesión
   ───────────────────────────────────────────────────── */

/* PURE. Días distintos en los que hubo al menos un intento. */
function projectAttemptDays(projects){
  var dias = {};
  (projects || []).forEach(function(p){
    (p && p.attempts ? p.attempts : []).forEach(function(a){
      if(!a || !a.ts) return;
      dias[new Date(a.ts).toDateString()] = true;
    });
  });
  return Object.keys(dias);
}

/* Registra como carga los días de proyecto que no tengan ya una sesión. */
function syncProjectLoad(projects){
  var dias = projectAttemptDays(projects || (typeof loadProjects === 'function' ? loadProjects() : []));
  var existentes = {};
  loadSLogs().forEach(function(l){ existentes[l.dateStr] = l; });

  var nuevos = 0;
  dias.forEach(function(d){
    if(existentes[d]) return;                       /* ya hay sesión ese día */
    var w = (typeof resolveSessionTiming === 'function') ? resolveSessionTiming(d, TODAY) : { log:true };
    if(!w.log) return;                              /* intento fechado a futuro */
    logAutoSession(d, 'project');
    nuevos++;
  });
  return nuevos;
}
function openSL(dateStr,block){
  slState={rpe:0,feel:2,pain:0,focus:'',dateStr:dateStr,block:block};
  var bt=BLOCKS[block]||BLOCKS.rest;
  var d=new Date(dateStr);
  var el=document.getElementById('sl-title');
  var es=document.getElementById('sl-subtitle');
  if(el)el.textContent='Sesión de '+bt.label;
  if(es)es.textContent=DLG[d.getDay()]+' '+d.getDate()+'/'+('0'+(d.getMonth()+1)).slice(-2);
  document.querySelectorAll('.sl-star').forEach(function(s){s.classList.remove('on');});
  var lbl=document.getElementById('sl-rpe-lbl');if(lbl)lbl.textContent='Toca para seleccionar';
  var dur=document.getElementById('sl-dur');if(dur)dur.value=90;
  var dl=document.getElementById('sl-dur-lbl');if(dl)dl.textContent='90 min';
  document.querySelectorAll('#sl-feel-pills .ci-pill').forEach(function(p,i){p.classList[i===1?'add':'remove']('on');});
  document.querySelectorAll('#sl-pain-pills .ci-pill').forEach(function(p,i){p.classList[i===0?'add':'remove']('on');});
  document.querySelectorAll('.sl-type-btn').forEach(function(b){b.classList.remove('on');});
  var notes=document.getElementById('sl-notes');if(notes)notes.value='';
  var warn=document.getElementById('sl-pain-warn');if(warn)warn.style.display='none';
  /* pre-select focus based on block */
  var bf={strength:'limit_boulder',power:'limit_boulder',endurance:'circuits',deload:'technique'};
  var preF=bf[block];
  if(preF){var pb=document.querySelector('.sl-type-btn[data-v="'+preF+'"]');if(pb){pb.classList.add('on');slState.focus=preF;}}
  document.getElementById('sl-modal').classList.add('on');
  if(typeof a11yOpenModal==='function')a11yOpenModal(document.getElementById('sl-modal'),closeSL,'sl-title');
}
function closeSL(){
  document.getElementById('sl-modal').classList.remove('on');
  if(document.activeElement)document.activeElement.blur();
  if(typeof a11yCloseModal==='function')a11yCloseModal(document.getElementById('sl-modal'));
}
function slRpe(val){
  slState.rpe=val;
  document.querySelectorAll('.sl-star').forEach(function(s){s.classList[parseInt(s.getAttribute('data-v'))<=val?'add':'remove']('on');});
  var lbl=document.getElementById('sl-rpe-lbl');
  if(lbl)lbl.textContent='RPE '+val+' - '+(SL_RPE_LABELS[val]||'');
}
function slUpdDur(){var v=document.getElementById('sl-dur').value;document.getElementById('sl-dur-lbl').textContent=v+' min';if(typeof a11ySlider==='function')a11ySlider('sl-dur',v+' minutos');}
function slPill(el,group){
  var container=document.getElementById('sl-'+group+'-pills');
  if(container)container.querySelectorAll('.ci-pill').forEach(function(p){p.classList.remove('on');});
  el.classList.add('on');
  slState[group]=parseInt(el.getAttribute('data-v'));
  if(group==='pain'){var w=document.getElementById('sl-pain-warn');if(w)w.style.display=slState.pain>=2?'block':'none';}
}
function slFocus(el){
  document.querySelectorAll('.sl-type-btn').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
  slState.focus=el.getAttribute('data-v');
}
function saveSessionLog(){
  var dur=parseInt(document.getElementById('sl-dur').value)||90;
  var notes=(document.getElementById('sl-notes').value||'').trim();
  if(slState.rpe===0){showToast('Selecciona la intensidad (RPE)','var(--accent-caution)');return;}
  /* El modal se puede abrir para CUALQUIER día, no sólo hoy (desde el panel de
     día, la vista Semana o un día marcado como no realizado). Antes se
     guardaba `ts:Date.now()` y `hoursAgo:0`, así que registrar una sesión de
     hace 6 días la metía en la ventana aguda de hoy (inflando el ACWR) y
     además hundía la recuperación como si acabaras de entrenar. */
  var w = (typeof resolveSessionTiming === 'function')
    ? resolveSessionTiming(slState.dateStr, TODAY)
    : { touchRecovery:true, hoursAgo:0 };

  writeSessionLog(slState.dateStr, {
    ts: dayTimestamp(slState.dateStr), dateStr:slState.dateStr, block:slState.block,
    rpe:slState.rpe, dur:dur, feel:slState.feel, pain:slState.pain,
    focus:slState.focus, notes:notes
    /* sin `auto`: es un dato real del usuario y no se borra al deshacer */
  });

  /* feed recovery engine — sólo si esta sesión es la más reciente */
  if(w.touchRecovery){
    recData={sleep:recData.sleep||7,sleepQ:recData.sleepQ||3,
      sore:slState.pain,fat:Math.max(0,Math.round(slState.rpe/3)-1),
      rpe:slState.rpe,dur:dur,hoursAgo:w.hoursAgo,stype:blockToStype(slState.block),
      ts:dayTimestamp(slState.dateStr)};
    saveRec();
  }
  closeSL();
  sessionLog[slState.dateStr]='done';saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();
  if(typeof renderNextAction === 'function') renderNextAction();
  if(hcSel&&hcSel.toDateString()===slState.dateStr)showDayPanel(hcSel,planMap[slState.dateStr],slState.dateStr);
  var rec=calcRecovery();renderRecoveryCard(rec);
  showToast('Sesión registrada','var(--accent-deload)');
}
function renderSessionHistory(containerId,limit){
  var c=document.getElementById(containerId);if(!c)return;
  var logs=loadSLogs().slice().reverse().slice(0,limit||10);
  if(logs.length===0){
    c.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Sin sesiones registradas aun.<br>Marca tu primera sesión como completada.</div>';
    return;
  }
  var RPE_COL={2:'var(--accent-deload)',4:'var(--accent-info)',6:'var(--accent-caution)',8:'var(--accent-warning)',10:'#FF1A4A'};
  var PAIN_LBL=['','Dolor leve','Dolor moderado','Dolor alto'];
  var FEEL_LBL=['','Mal','Regular','Bien','Excelente'];
  var h='';
  logs.forEach(function(log){
    var d=new Date(log.ts);
    var bt=BLOCKS[log.block]||BLOCKS.rest;
    var rc=RPE_COL[log.rpe]||'var(--text-secondary)';
    h+='<div class="sl-log-card">'
      +'<div class="sl-log-header">'
        +'<div><div class="sl-log-block" style="color:'+bt.col+'">'+bt.label+'</div>'
        +(log.focus?'<div style="font-size:11px;color:var(--text-muted);margin-top:1px">'+escapeHtml(log.focus.replace('_',' '))+'</div>':'')
        +'</div>'
        +'<div class="sl-log-date">'+DLG[d.getDay()]+' '+d.getDate()+'/'+('0'+(d.getMonth()+1)).slice(-2)+'</div>'
      +'</div>'
      +'<div class="sl-log-meta">'
        +'<span class="sl-log-pill" style="color:'+rc+';background:'+rc+'18">RPE '+log.rpe+'</span>'
        +'<span class="sl-log-pill">'+log.dur+' min</span>'
        +(log.feel?'<span class="sl-log-pill">'+FEEL_LBL[log.feel]+'</span>':'')
        +(log.pain>0?'<span class="sl-log-pill" style="color:#FF4D6A">'+PAIN_LBL[log.pain]+'</span>':'')
      +'</div>'
      +(log.notes?'<div class="sl-log-notes">'+escapeHtml(log.notes)+'</div>':'')
      +'</div>';
  });
  c.innerHTML=h;
}
