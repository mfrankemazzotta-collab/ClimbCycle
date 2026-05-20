/* ====================================================
   recovery.js -- Recovery engine, check-in, session logger
   ClimbCycle v5
==================================================== */


/* ──────────────────────────────────────────────────
   Recovery engine
────────────────────────────────────────────────── */


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

  /* No session -> fully fresh */
  if(rpe===0 || stype==='none' || dur===0){
    var score0=100;
    var sleepPenalty0=Math.max(0,(7-recData.sleep)*5);
    var sleepQBonus0=(recData.sleepQ-3)*3;
    var sorePenalty0=[0,5,12,20][recData.sore]||0;
    score0=Math.max(0,Math.min(100,score0-sleepPenalty0+sleepQBonus0-sorePenalty0));
    return {score:score0,hoursRemaining:0,status:score0>=70?'fresh':'recovering',load:0};
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
    baseScore - sleepPenalty + sleepBonus - sorePenalty - fatPenalty
  ));

  var status = score >= 72 ? 'fresh'
             : score >= 45 ? 'recovering'
             :               'fatigued';

  return {score:score, hoursRemaining:hoursRemaining, status:status, load:load};
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
}
/* ──────────────────────────────────────────────────
   Check-in
────────────────────────────────────────────────── */


function openCI(){document.getElementById('ci-modal').classList.add('on');ciUpd();}
function closeCI(){
  document.getElementById('ci-modal').classList.remove('on');
  if(document.activeElement)document.activeElement.blur();
}
function ciUpd(){
  var sl=document.getElementById('ci-sleep'),rp=document.getElementById('ci-rpe'),du=document.getElementById('ci-dur');
  if(sl)document.getElementById('ci-sleep-lbl').textContent=sl.value+'h';
  if(rp){
    var rpeLabels=['0  -  Sin sesión','1  -  Muy fácil','2  -  Fácil','3  -  Moderado','4  -  Algo duro',
      '5  -  Duro','6  -  Muy duro','7  -  Muy muy duro','8  -  Extremo','9  -  Máximo casi','10  -  Máximo absoluto'];
    document.getElementById('ci-rpe-lbl').textContent=rpeLabels[parseInt(rp.value)]||rp.value;
  }
  if(du){
    var dv=parseInt(du.value)||0;
    document.getElementById('ci-dur-lbl').textContent=dv===0?'Sin sesión':dv+' min';
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
  showToast('Check-in guardado','#00E5A0');
}
/* ──────────────────────────────────────────────────
   Session logger
────────────────────────────────────────────────── */


function blockToStype(block){
  var m={strength:'strength',power:'power',endurance:'endurance',deload:'recovery',test:'strength'};
  return m[block]||'endurance';
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
}
function closeSL(){
  document.getElementById('sl-modal').classList.remove('on');
  if(document.activeElement)document.activeElement.blur();
}
function slRpe(val){
  slState.rpe=val;
  document.querySelectorAll('.sl-star').forEach(function(s){s.classList[parseInt(s.getAttribute('data-v'))<=val?'add':'remove']('on');});
  var lbl=document.getElementById('sl-rpe-lbl');
  if(lbl)lbl.textContent='RPE '+val+' - '+(SL_RPE_LABELS[val]||'');
}
function slUpdDur(){var v=document.getElementById('sl-dur').value;document.getElementById('sl-dur-lbl').textContent=v+' min';}
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
  if(slState.rpe===0){showToast('Selecciona la intensidad (RPE)','#FFB800');return;}
  var entry={ts:Date.now(),dateStr:slState.dateStr,block:slState.block,
    rpe:slState.rpe,dur:dur,feel:slState.feel,pain:slState.pain,
    focus:slState.focus,notes:notes};
  var logs=loadSLogs().filter(function(l){return l.dateStr!==slState.dateStr;});
  logs.push(entry);
  if(logs.length>120)logs=logs.slice(-120);
  saveSLogs(logs);
  /* feed recovery engine */
  recData={sleep:recData.sleep||7,sleepQ:recData.sleepQ||3,
    sore:slState.pain,fat:Math.max(0,Math.round(slState.rpe/3)-1),
    rpe:slState.rpe,dur:dur,hoursAgo:0,stype:blockToStype(slState.block),ts:Date.now()};
  saveRec();
  closeSL();
  sessionLog[slState.dateStr]='done';saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();
  if(typeof renderNextAction === 'function') renderNextAction();
  if(hcSel&&hcSel.toDateString()===slState.dateStr)showDayPanel(hcSel,planMap[slState.dateStr],slState.dateStr);
  var rec=calcRecovery();renderRecoveryCard(rec);
  showToast('Sesión registrada','#00E5A0');
}
function renderSessionHistory(containerId,limit){
  var c=document.getElementById(containerId);if(!c)return;
  var logs=loadSLogs().slice().reverse().slice(0,limit||10);
  if(logs.length===0){
    c.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Sin sesiones registradas aun.<br>Marca tu primera sesión como completada.</div>';
    return;
  }
  var RPE_COL={2:'#00E5A0',4:'#00C8FF',6:'#FFB800',8:'#FF4D6A',10:'#FF1A4A'};
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
        +(log.focus?'<div style="font-size:10px;color:var(--text-muted);margin-top:1px">'+log.focus.replace('_',' ')+'</div>':'')
        +'</div>'
        +'<div class="sl-log-date">'+DLG[d.getDay()]+' '+d.getDate()+'/'+('0'+(d.getMonth()+1)).slice(-2)+'</div>'
      +'</div>'
      +'<div class="sl-log-meta">'
        +'<span class="sl-log-pill" style="color:'+rc+';background:'+rc+'18">RPE '+log.rpe+'</span>'
        +'<span class="sl-log-pill">'+log.dur+' min</span>'
        +(log.feel?'<span class="sl-log-pill">'+FEEL_LBL[log.feel]+'</span>':'')
        +(log.pain>0?'<span class="sl-log-pill" style="color:#FF4D6A">'+PAIN_LBL[log.pain]+'</span>':'')
      +'</div>'
      +(log.notes?'<div class="sl-log-notes">'+log.notes+'</div>':'')
      +'</div>';
  });
  c.innerHTML=h;
}
