/* ====================================================
   render-home.js -- Home page rendering
   - renderNextAction: contextual "what to do now" banner
   - renderTodayCard: hero card for today's session
   - renderHC / hcNav: home mini-calendar selector
   - showDayPanel: detailed expandable day view (the big one)
   - Session actions: markSess, undoSess, openMvM, closeMvModal, doMv
   - renderHeroTodayMidline: alternate Midline-style hero card (currently unused)
==================================================== */


/* ──────────────────────────────────────────────────
   renderNextAction - context banner: tells the user what to do NOW
   based on plan state, recovery, and check-in status.
────────────────────────────────────────────────── */
function renderNextAction(){
  var el = document.getElementById('next-action');
  if(!el) return;
  if(!U.startDate){ el.innerHTML=''; return; }

  var todayKey = TODAY.toDateString();
  var tp = planMap[todayKey];
  var logSt = sessionLog[todayKey];
  var rec = (typeof calcRecovery === 'function') ? calcRecovery() : {score:100, status:'fresh'};

  /* Time since last check-in (hours) */
  var hoursSinceCheckin = recData.ts > 0 ? (Date.now() - recData.ts) / 3600000 : 999;
  var needsCheckin = hoursSinceCheckin > 18 || recData.ts === 0;

  /* Find next training day after today */
  var nextSess = null;
  for(var i=1; i<=14; i++){
    var d = new Date(TODAY);
    d.setDate(d.getDate()+i);
    var p = planMap[d.toDateString()];
    if(p && p.block!=='rest'){
      nextSess = {date:d, block:p.block, label:BLOCKS[p.block]?BLOCKS[p.block].label:p.block};
      break;
    }
  }

  /* Yesterday: was it missed? */
  var ydKey = (function(){var d=new Date(TODAY);d.setDate(d.getDate()-1);return d.toDateString();})();
  var ydPlan = planMap[ydKey];
  var ydMissed = ydPlan && ydPlan.block!=='rest' && ydPlan.block!=='test'
    && !sessionLog[ydKey] && new Date(ydKey) < TODAY;

  var icon='', title='', subtitle='', col='', bg='', cta='', ctaHandler='';

  /* PRIORITY 1: missed session yesterday */
  if(ydMissed){
    icon='&#x26A0;';
    title='Ayer faltó una sesión';
    subtitle='Marcala como hecha o movela a otro día.';
    col='var(--accent-caution)';
    bg='rgba(226,155,0,0.08)';
    cta='Ver ayer';
    ctaHandler='hcSel=new Date(\''+ydKey+'\');showDayPanel(new Date(\''+ydKey+'\'),planMap[\''+ydKey+'\'],\''+ydKey+'\')';
  }
  /* PRIORITY 2: today is rest */
  else if(!tp || tp.block === 'rest'){
    if(tp && tp.outdoor){
      icon='&#x1F9D7;';
      title='Día de escalada exterior';
      subtitle='El plan se adapta. Llevá agua y disfrutá.';
      col='var(--accent-power)';
      bg='rgba(155,110,255,0.08)';
    } else if(tp && tp.note === 'gap-forzado'){
      icon='&#x1F4A4;';
      title='Buffer de recuperación';
      subtitle='El algoritmo omitió este día para proteger SNC y tendones.';
      col='var(--accent-caution)';
      bg='rgba(226,155,0,0.08)';
    } else {
      icon='&#x1F32E;';
      title='Día de descanso';
      subtitle=nextSess
        ? 'Próxima: '+DLG[nextSess.date.getDay()]+' &mdash; '+nextSess.label
        : 'Aprovechá para dormir bien y comer proteína.';
      col='var(--accent-deload)';
      bg='rgba(0,184,132,0.08)';
    }
  }
  /* PRIORITY 3: today is test */
  else if(tp.block === 'test'){
    icon='&#x1F4CA;';
    title='Hoy: día de tests';
    subtitle='Hacelos fresco al inicio. Registrá resultados en Ejercicios &rsaquo; Tests.';
    col='var(--accent-caution)';
    bg='rgba(226,155,0,0.08)';
    cta='Ir a Tests';
    ctaHandler='goPage(\'plan\');setTimeout(function(){var t=document.querySelectorAll(\'.ptab\')[2];if(t)t.click();},100)';
  }
  /* PRIORITY 4: today done */
  else if(logSt === 'done'){
    icon='&#x2705;';
    title='Sesión completada — bien hecho';
    subtitle=nextSess
      ? 'Próxima: '+DLG[nextSess.date.getDay()]+' &mdash; '+nextSess.label
      : 'Disfrutá el resto del día.';
    col='var(--accent-deload)';
    bg='rgba(0,184,132,0.08)';
  }
  /* PRIORITY 5: needs check-in for training day */
  else if(needsCheckin){
    icon='&#x1F4DD;';
    title='Hacé tu check-in';
    subtitle='30 segundos para calibrar la intensidad de hoy.';
    col='var(--accent-strength)';
    bg='rgba(56,189,248,0.08)';
    cta='Check-in';
    ctaHandler='openCI()';
  }
  /* PRIORITY 6: recovery low → suggest deload */
  else if(rec.score < 40){
    icon='&#x1F6A8;';
    title='Recuperación baja ('+Math.round(rec.score)+'%)';
    subtitle='Considerá reducir la intensidad o hacer solo movilidad.';
    col='var(--accent-warning)';
    bg='rgba(229,64,75,0.08)';
  }
  /* PRIORITY 7: recovery moderate */
  else if(rec.score < 70){
    var bt0 = BLOCKS[tp.block];
    icon='&#x1F4AA;';
    title='Tu sesión de '+(bt0?bt0.label:tp.block)+' te espera';
    subtitle='Recuperación al '+Math.round(rec.score)+'%. Entrená con consciencia.';
    col='var(--accent-caution)';
    bg='rgba(226,155,0,0.08)';
  }
  /* PRIORITY 8: ready to train */
  else {
    var bt1 = BLOCKS[tp.block];
    icon='&#x1F525;';
    title='Listo para '+(bt1?bt1.label:tp.block);
    subtitle='Recuperación al '+Math.round(rec.score)+'% &mdash; vamos a romperla.';
    col='var(--accent-primary-d)';
    bg='var(--accent-primary-bg)';
  }

  var ctaHtml = cta
    ? '<button onclick="'+ctaHandler+'" style="background:'+col+';color:#fff;border:none;padding:8px 14px;border-radius:8px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;touch-action:manipulation">'+cta+'</button>'
    : '';

  el.innerHTML = '<div style="background:'+bg+';border:1px solid '+col+'33;border-left:3px solid '+col+';border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px">'
    +'<div style="font-size:22px;flex-shrink:0">'+icon+'</div>'
    +'<div style="flex:1;min-width:0">'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:'+col+';line-height:1.2;margin-bottom:2px">'+title+'</div>'
      +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.4">'+subtitle+'</div>'
    +'</div>'
    + ctaHtml
  +'</div>';
}

/* ──────────────────────────────────────────────────
   QUICK ACTIONS - bottom sheet with context-aware shortcuts
────────────────────────────────────────────────── */
function openQA(){
  var modal = document.getElementById('qa-modal');
  var list = document.getElementById('qa-list');
  var sub  = document.getElementById('qa-sub');
  if(!modal || !list) return;

  var todayKey = TODAY.toDateString();
  var tp = planMap[todayKey];
  var logSt = sessionLog[todayKey];

  /* Build context-aware action list */
  var actions = [];

  /* Check-in always available */
  actions.push({
    icon:'&#x1F4DD;',
    title:'Check-in de readiness',
    sub:'Cómo dormiste, cómo te sentís, RPE de la última sesión',
    col:'var(--accent-strength)',
    onclick:'closeQA();openCI()'
  });

  /* Session actions if there's a session today and not done */
  if(tp && tp.block !== 'rest' && tp.block !== 'test' && logSt !== 'done'){
    actions.push({
      icon:'&#x2705;',
      title:'Marcar sesión como hecha',
      sub:'Registra que completaste el entrenamiento de hoy',
      col:'var(--accent-deload)',
      onclick:'closeQA();markSess(\''+todayKey+'\',\'done\')'
    });
    actions.push({
      icon:'&#x1F4DA;',
      title:'Registrar sesión con detalle',
      sub:'RPE, duración, sensación — para mejor recovery',
      col:'var(--accent-primary-d)',
      onclick:'closeQA();openSL(\''+todayKey+'\',\''+tp.block+'\')'
    });
    actions.push({
      icon:'&#x21C4;',
      title:'Mover sesión',
      sub:'Reagendá la sesión a otro día',
      col:'var(--accent-caution)',
      onclick:'closeQA();openMvM(\''+todayKey+'\',\''+tp.block+'\')'
    });
  }

  /* Outdoor/rock day toggle */
  if(tp && tp.outdoor){
    actions.push({
      icon:'&#x1FAA8;',
      title:'Quitar día de roca',
      sub:'Restaurar la sesión planificada para hoy',
      col:'var(--accent-power)',
      onclick:'closeQA();unmarkRockDay(\''+todayKey+'\')'
    });
  } else if(tp && tp.block !== 'test'){
    actions.push({
      icon:'&#x1F9D7;',
      title:'Marcar hoy como roca',
      sub:'Convertir hoy en día de escalada exterior',
      col:'var(--accent-power)',
      onclick:'closeQA();markRockDay(\''+todayKey+'\')'
    });
  }

  /* Always-available navigation */
  actions.push({
    icon:'&#x1F4C5;',
    title:'Ver calendario completo',
    sub:'Vista mensual de todo el macrociclo',
    col:'var(--text-secondary)',
    onclick:'closeQA();goPage(\'cal\')'
  });
  actions.push({
    icon:'&#x1F4CA;',
    title:'Registrar resultado de test',
    sub:'Anotá un max hang, pull-up, repeater, etc.',
    col:'var(--accent-caution)',
    onclick:'closeQA();goPage(\'plan\');setTimeout(function(){var t=document.querySelectorAll(\'.ptab\')[2];if(t)t.click();},100)'
  });

  if(sub){
    sub.textContent = tp && tp.block !== 'rest' ? 'Atajos para tu sesión de hoy' : 'Qué querés hacer ahora?';
  }

  list.innerHTML = actions.map(function(a){
    return '<button class="qa-item" onclick="'+a.onclick+'" style="border-left-color:'+a.col+'">'
      +'<div class="qa-icon" style="color:'+a.col+'">'+a.icon+'</div>'
      +'<div class="qa-text">'
        +'<div class="qa-title" style="color:var(--text-primary)">'+a.title+'</div>'
        +'<div class="qa-sub">'+a.sub+'</div>'
      +'</div>'
      +'<svg viewBox="0 0 16 16" width="14" height="14" style="color:var(--text-muted);flex-shrink:0"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'</button>';
  }).join('');

  modal.classList.add('on');
}
function closeQA(){
  var m = document.getElementById('qa-modal');
  if(m) m.classList.remove('on');
}

/* Show/hide the FAB based on which page is active */
function updateQAVisibility(){
  var fab = document.getElementById('qa-fab');
  if(!fab) return;
  var homeOn = document.getElementById('phome');
  var visible = homeOn && homeOn.classList.contains('on');
  fab.style.display = visible ? 'flex' : 'none';
}

function renderTodayCard(){
  var tp = planMap[TODAY.toDateString()];
  var tc = document.getElementById('atoday');
  var sH = document.getElementById('sec-hoy');
  var hero = document.getElementById('hero-today');

  /* HERO TODAY CARD - prominent card at top of home */
  if(hero){
    if(tp && tp.block !== 'rest'){
      var bt = BLOCKS[tp.block];
      var logSt = sessionLog[TODAY.toDateString()];
      var wkNum = tp.week || 1;
      var sessionType = bt.sessionType || '';
      var stypeCol = sessionType === 'Go Hard' ? 'var(--accent-warning)'
                   : sessionType === 'Do More' ? 'var(--accent-info)'
                   : sessionType === 'Explore' ? 'var(--accent-deload)'
                   : bt.col;

      hero.innerHTML = '<div style="position:relative;background:linear-gradient(135deg,'+bt.col+'18,'+bt.col+'08);border:1px solid '+bt.col+'33;border-radius:18px;padding:20px;margin-bottom:18px;overflow:hidden">'
        +'<div style="position:absolute;right:-15px;top:-25px;font-family:\'Barlow Condensed\',sans-serif;font-size:180px;font-weight:900;color:'+bt.col+'12;line-height:1;letter-spacing:-5px;pointer-events:none">S'+wkNum+'</div>'
        +'<div style="position:relative;z-index:1">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
            +'<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:'+stypeCol+';background:'+stypeCol+'22;border:1px solid '+stypeCol+'44;padding:3px 9px;border-radius:99px;font-weight:700;letter-spacing:0.5px">'+(sessionType?sessionType.toUpperCase():'HOY')+'</span>'
            +(logSt==='done'?'<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#00E5A0;background:#00E5A022;padding:3px 9px;border-radius:99px;font-weight:700">COMPLETADA</span>':'')
            +(logSt==='fail'?'<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#FF4D6A;background:#FF4D6A22;padding:3px 9px;border-radius:99px;font-weight:700">NO HECHA</span>':'')
          +'</div>'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:36px;font-weight:800;color:'+bt.col+';line-height:1;letter-spacing:-0.5px;margin-bottom:4px">'+bt.label+'</div>'
          +'<div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.4">'+(bt.faderDesc||'Sesión del día. Toca para ver el detalle.')+'</div>'
          +(!logSt
            ? '<div style="display:flex;gap:8px">'
              +'<button onclick="markSess(\''+TODAY.toDateString()+'\',\'done\')" style="flex:1;padding:13px;background:#CCFF00;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:800;border:none;border-radius:11px;cursor:pointer;touch-action:manipulation">Empezar sesión</button>'
              +'<button onclick="hcSel=new Date(TODAY);showDayPanel(TODAY,planMap[TODAY.toDateString()],TODAY.toDateString())" style="padding:13px 14px;background:transparent;border:1.5px solid '+bt.col+';border-radius:11px;color:'+bt.col+';font-size:13px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Ver</button>'
              +'</div>'
            : '<button onclick="undoSess(\''+TODAY.toDateString()+'\')" style="padding:10px 16px;background:none;border:1px solid var(--border-color);border-radius:10px;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:\'JetBrains Mono\',monospace;touch-action:manipulation">Deshacer</button>')
        +'</div>'
      +'</div>';
    } else if(tp && tp.outdoor){
      hero.innerHTML = '<div style="background:linear-gradient(135deg,#9B6EFF18,#9B6EFF08);border:1px solid #9B6EFF33;border-radius:18px;padding:20px;margin-bottom:18px">'
        +'<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#9B6EFF;background:#9B6EFF22;border:1px solid #9B6EFF44;padding:3px 9px;border-radius:99px;font-weight:700">ROCA EXTERIOR</span>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:36px;font-weight:800;color:#9B6EFF;line-height:1;margin-top:10px;margin-bottom:4px">A escalar afuera</div>'
        +'<div style="font-size:12px;color:var(--text-secondary)">Día de roca. El plan se ajusta automaticamente.</div>'
      +'</div>';
    } else {
      hero.innerHTML = '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:24px;margin-bottom:18px;text-align:center">'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--text-muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Hoy</div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:28px;font-weight:800;color:var(--text-secondary);margin-bottom:6px">Día de descanso</div>'
        +'<div style="font-size:12px;color:var(--text-muted)">Recuperate y come bien. La supercompensacion ocurre en el reposo.</div>'
      +'</div>';
    }
  }

  /* Hide legacy "Hoy" section since the hero replaces it */
  if(tc) tc.innerHTML = '';
  if(sH) sH.style.display = 'none';
}
function hcNav(d){hcDate.setMonth(hcDate.getMonth()+d);renderHC();}
function renderHC(){
  var y=hcDate.getFullYear(),m=hcDate.getMonth();
  var el=document.getElementById('hcal-mo');if(el)el.textContent=MONTHS[m]+' '+y;
  var first=new Date(y,m,1),dow=first.getDay();if(dow===0)dow=7;dow--;
  var dim=new Date(y,m+1,0).getDate();
  var g=document.getElementById('hcal-grid');if(!g)return;
  g.innerHTML='';
  for(var i=0;i<dow;i++){var e=document.createElement('div');e.className='hmcal-day emp';g.appendChild(e);}
  for(var d=1;d<=dim;d++){
    var date=new Date(y,m,d),key=date.toDateString();
    var plan=planMap[key];
    var isT=date.toDateString()===TODAY.toDateString();
    var isSel=hcSel&&date.toDateString()===hcSel.toDateString();
    var logSt=sessionLog[key];
    var div=document.createElement('div');
    div.className='hmcal-day'+(isT?' tod':'')+(isSel?' sel':'');
    var dn=document.createElement('div');dn.className='hmcal-dn';dn.textContent=d;div.appendChild(dn);
    if(plan&&plan.block!=='rest'){
      var bt=BLOCKS[plan.block];
      var state2=getSessionState(key,plan);
      /* pc must be a hex string - it gets concatenated with opacity suffix below */
      var pc=state2==='completed'?'var(--accent-deload)':state2==='missed'?'var(--accent-warning)':state2==='rescheduled'?'var(--accent-caution)':state2==='locked'?'var(--text-muted)':bt.col;
      var pt=state2==='completed'?'OK':state2==='missed'?'NO':state2==='rescheduled'?'MV':state2==='locked'?'--':(bt.short||bt.emo||bt.label.slice(0,3));
      var pill=document.createElement('div');pill.className='hmcal-pill';
      pill.style.background=pc+'22';pill.style.color=pc;pill.textContent=pt;div.appendChild(pill);
    }
    (function(dt,pl,k){div.onclick=function(){hcSel=dt;renderHC();showDayPanel(dt,pl,k);};})(date,plan,key);
    g.appendChild(div);
  }
}
/* ──────────────────────────────────────────────────
   Day panel - detailed view for a selected day
────────────────────────────────────────────────── */


function showDayPanel(date,plan,key){
  var p=document.getElementById('home-daypanel');if(!p)return;
  var ds = DLG[date.getDay()] + ' ' + date.getDate() + '/' + ('0'+(date.getMonth()+1)).slice(-2) + '/' + date.getFullYear();
  if(!plan||plan.block==='rest'){
    var gapNote  = plan && plan.note === 'gap-forzado';
    var rockNote = plan && plan.outdoor;
    var restSci  = gapNote
      ? 'Horst (2016) + Guia Maestra: sesiones HIGH requieren 48h de recuperación. El algoritmo omitio este día para proteger tendones y SNC.'
      : rockNote
        ? 'Bechtel (Logical Progression): la roca exterior genera mayor carga sobre tendones y SNC que el gimnasio. Las sesiones posteriores se adaptan automaticamente.'
        : 'Horst (2016): la supercompensacion ocurre en el reposo. El descanso es parte activa del plan.';
    var restTitle = gapNote ? 'Buffer de recuperación' : rockNote ? 'Día de roca exterior' : 'Día de descanso';
    var restCol   = gapNote ? 'var(--accent-caution)' : rockNote ? 'var(--accent-power)' : 'var(--text-muted)';

    var rockBtn = rockNote
      ? '<button onclick="unmarkRockDay(\''+key+'\');" style="margin-top:8px;width:100%;padding:9px;background:#9B6EFF18;border:1.5px solid #9B6EFF;border-radius:10px;color:#9B6EFF;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">Quitar día de roca</button>'
      : '<button onclick="markRockDay(\''+key+'\');" style="margin-top:8px;width:100%;padding:9px;background:none;border:1.5px solid #9B6EFF55;border-radius:10px;color:#9B6EFF;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">+ Marcar como roca exterior</button>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-top:4px;text-align:center">El plan se ajusta automaticamente</div>';
    var overrideBtn = gapNote
      ? '<button onclick="forceSession(\''+key+'\');" style="margin-top:6px;width:100%;padding:9px;background:none;border:1.5px solid #FFB800;border-radius:10px;color:#FFB800;font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer">Forzar sesión de todas formas</button>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-top:4px;text-align:center">No recomendado</div>'
      : '';
    p.innerHTML='<div class="daypanel" style="border-left:3px solid '+restCol+'">'
      +'<div class="dp-title" style="color:var(--text-secondary)">'+ds+'</div>'
      +'<div class="dp-sub">'+restTitle+'</div>'
      +(gapNote?'<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:12px;color:#FFB800;margin-bottom:8px;display:flex;align-items:flex-start;gap:8px"><span>&#x26A0;</span><span>Día omitido - menos de 48h desde sesión anterior.</span></div>':'')
      +(rockNote?'<div style="background:#9B6EFF15;border:1px solid #9B6EFF44;border-radius:8px;padding:8px 12px;font-size:12px;color:#9B6EFF;margin-bottom:8px">Escalada exterior registrada. Las sesiones posteriores estan ajustadas.</div>':'')
      +'<div class="sci-box"><div class="sci-tag">'+(gapNote?'Horst 2016':rockNote?'Bechtel 2019':'Horst 2016')+'</div><div class="sci-txt">'+restSci+'</div></div>'
      + rockBtn + overrideBtn
      +'</div>';
    return;
  }

  /* -- Session state -- */
  var state = getSessionState(key, plan);
  var sm    = SS_META[state] || SS_META.locked;
  var bt    = BLOCKS[plan.block];

  /* -- Session type badge (Go Hard / Do More / Explore) -- */
  var stypeBadge = '';
  if(bt.sessionType && bt.sessionType!=='Rest' && bt.sessionType!=='Test'){
    var stypeCol = bt.sessionType==='Go Hard'?'var(--accent-warning)':bt.sessionType==='Do More'?'var(--accent-info)':'var(--accent-deload)';
    stypeBadge = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">'
      +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;padding:3px 10px;border-radius:99px;'
        +'border:1px solid '+stypeCol+'44;background:'+stypeCol+'15;color:'+stypeCol+';font-weight:700">'
        +bt.sessionType.toUpperCase()+'</span>'
      +(bt.dial?'<span style="font-size:9px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">Dial: '+bt.dial+'</span>':'')
      +(bt.faderRange?'<span style="font-size:9px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">Fader: '+bt.faderRange+'/10</span>':'')
    +'</div>'
    +(bt.faderDesc?'<div style="font-size:10px;color:var(--text-secondary);margin-bottom:8px;line-height:1.5">'+bt.faderDesc+'</div>':'');
  }

  /* -- Goal-specific focus (SAID principle) -- */
  var goalFocusHtml = '';
  if(bt.goalFocus && U.goal && bt.goalFocus[U.goal]){
    goalFocusHtml = '<div style="background:var(--bg-card-alt);border-left:2px solid '+bt.col+'66;border-radius:0 6px 6px 0;padding:6px 10px;margin-bottom:10px">'
      +'<div style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Enfoque SAID para tu objetivo</div>'
      +'<div style="font-size:11px;color:var(--text-primary);line-height:1.5">'+bt.goalFocus[U.goal]+'</div>'
    +'</div>';
  }

  /* Level-aware safety warning */
  var safetyWarn = getSafetyWarning(plan.block, U.level);
  var safetyHtml = safetyWarn
    ? '<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:11px;color:#FFB800;margin-bottom:10px;display:flex;align-items:flex-start;gap:8px"><span style="flex-shrink:0">&#x26A0;</span><span>'+safetyWarn+'</span></div>'
    : '';
  var isT   = date.toDateString()===TODAY.toDateString();
  var isPast = date < TODAY;

  /* -- Week lock check -- */
  var wkIdx = plan.week ? plan.week-1 : 0;
  var locked = isWeekLocked(wkIdx);
  var lockBanner = '';
  if(locked && state==='locked'){
    var prevComp = getWeekCompletion(wkIdx-1);
    lockBanner = '<div class="wk-lock-banner"><div class="wk-lock-icon">&#x1F512;</div><div class="wk-lock-txt">Semana bloqueada. La semana anterior tuvo '+prevComp.pct+'% de completado (mínimo: 70%). Completa las sesiones pendientes para desbloquear.</div></div>';
  }

  /* -- Status banner -- */
  var stBan = '';
  if(state!=='locked'&&state!=='available'){
    var banBg  = sm.col+'20', banBd = sm.col+'55';
    stBan = '<div style="background:'+banBg+';border:1px solid '+banBd+';border-radius:8px;padding:8px 12px;font-size:12px;color:'+sm.col+';margin-bottom:10px;display:flex;align-items:center;gap:8px">'
      +'<span>'+sm.icon+'</span><span>'+sm.lbl+'</span>'
      +'</div>';
  }
  if(state==='available'&&isT){
    stBan = '<div style="background:#CCFF0015;border:1px solid #CCFF0033;border-radius:8px;padding:8px 12px;font-size:12px;color:var(--accent-primary-d);margin-bottom:10px;display:flex;align-items:center;gap:8px">'
      +'<span>'+sm.icon+'</span><span>Sesión de hoy  -  lista para comenzar</span>'
      +'</div>';
  }

  /* -- Exercises with variation engine -- */
  var exs = getExercisesForDay(key, plan.block);
  /* Universal warm-up — same template for all blocks.
     Based on Horst (2016) / Anderson (RCTM): warm-up must NOT be training modality. */
  var warmupExs = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];

  /* -- Week progress bar -- */
  var wkComp = getWeekCompletion(wkIdx);
  var progCol = wkComp.pct>=70?'var(--accent-deload)':wkComp.pct>=40?'var(--accent-caution)':'var(--accent-warning)';
  var progBar = '<div style="margin-bottom:12px">'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:4px">'
      +'<span style="font-size:10px;color:var(--text-secondary);font-family:\'JetBrains Mono\',monospace">Semana '+plan.week+'</span>'
      +'<span style="font-size:10px;font-family:\'JetBrains Mono\',monospace;color:'+progCol+'">'+wkComp.done+'/'+wkComp.total+' ('+wkComp.pct+'%)</span>'
    +'</div>'
    +'<div class="mtr"><div class="mf" style="width:'+wkComp.pct+'%;background:'+progCol+'"></div></div>'
    +(wkComp.pct<70&&wkComp.total>0?'<div style="font-size:10px;color:#FFB800;margin-top:3px">Completa el 70% para avanzar de semana</div>':'')
    +'</div>';

  /* -- Action buttons - depends on state -- */
  var actHtml = '';
  if(state==='available'||state==='missed'){
    actHtml = '<div style="display:flex;gap:6px;margin-top:10px">'
      +'<button class="sa-btn" style="border-color:#00E5A0;background:#00E5A020;color:#00E5A0" onclick="markSess(\''+key+'\',\'done\')">Hecho</button>'
      +'<button class="sa-btn" style="border-color:#FF4D6A;background:#FF4D6A20;color:#FF4D6A" onclick="markSess(\''+key+'\',\'fail\')">No hice</button>'
      +(state==='available'&&!isPast?'<button class="sa-btn" style="border-color:#FFB800;background:#FFB80020;color:#FFB800" onclick="openMvM(\''+key+'\',\''+plan.block+'\')">Mover</button>':'')
      +'</div>'
      +'<button onclick="markRockDay(\''+key+'\')" style="margin-top:8px;width:100%;padding:8px;background:none;border:1.5px solid #9B6EFF55;border-radius:10px;color:#9B6EFF;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Convertir a día de roca</button>'
      +'<div style="font-size:9px;color:var(--text-muted);margin-top:3px;text-align:center">El plan se ajusta automaticamente</div>';
  } else if(state==='completed'||state==='rescheduled'){
    actHtml = '<button onclick="undoSess(\''+key+'\')" style="margin-top:8px;padding:6px 14px;background:none;border:1px solid var(--border-color);border-radius:8px;color:var(--text-secondary);font-size:11px;cursor:pointer">Deshacer</button>';
  } else if(state==='locked'){
    actHtml = '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">Sesión futura  -  pendiente de desbloqueo</div>';
  }

  /* -- Build exercise cards -- */
  var dk = date.getDate()+'x'+date.getMonth();
  var exHtml = '';

  /* STRUCTURED SESSION RENDERER — 5 phases with timing
     Based on Lattice / Anderson session anatomy. Duration scales with U.session. */
  var sessionMin = U.session || 90;
  var phases = (typeof getSessionPhases === 'function')
    ? getSessionPhases(plan.block, sessionMin, U.goal)
    : [];

  if(phases.length > 0){
    var totalMin = phases.reduce(function(s,p){return s + p.minutes;}, 0);

    /* Find the main phase to render ALWAYS expanded;
       wrap secondary phases (warmup/supp/condi/cooldown) in a collapsible block. */
    var mainIdx = phases.findIndex(function(p){return p.id === 'main';});
    if(mainIdx < 0) mainIdx = Math.floor(phases.length / 2);

    /* Compact session pill - tap to expand full structure */
    var collapseId = 'phdet'+dk;
    exHtml += '<div style="margin-top:14px;margin-bottom:14px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;display:flex;justify-content:space-between;align-items:center">'
      +'<div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.1">Sesión de '+totalMin+' min</div>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-top:2px">'+phases.length+' fases &middot; adaptada a tu perfil</div>'
      +'</div>'
      +'<button id="'+collapseId+'-btn" onclick="togglePhDet(\''+collapseId+'\')" style="background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:8px;padding:7px 12px;font-size:11px;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);cursor:pointer;font-weight:700;touch-action:manipulation">+ ver estructura</button>'
    +'</div>';

    /* Render the MAIN phase exercises directly (no phase header) - always visible */
    var mainPh = phases[mainIdx];
    if(mainPh){
      var mainExs = [];
      var mainTests = null;
      if(plan.block === 'test'){
        mainTests = (U.tests || []).map(function(tid){
          return (typeof TESTS !== 'undefined') ? TESTS.find(function(t){return t.id===tid;}) : null;
        }).filter(function(t){return t;});
        if(mainTests.length === 0 && typeof TESTS !== 'undefined' && TESTS.length > 0){
          mainTests = TESTS.slice(0,3);
        }
      } else {
        mainExs = exs;
      }
      /* Section label */
      exHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--divider)">'
        +'<div style="width:6px;height:6px;border-radius:50%;background:'+mainPh.col+'"></div>'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--text-primary);text-transform:uppercase;letter-spacing:1.2px;font-weight:700">Entrenamiento principal &middot; '+mainPh.minutes+' min</div>'
      +'</div>';
      /* Main exercises */
      if(mainExs.length > 0){
        mainExs.forEach(function(ex, ei){
          var eid = 'em'+dk+ei;
          var exCol = ex.col || bt.col;
          var humanSys = SYS_HUMAN[ex.sys] || ex.sys || '';
          var det = (getLevelTier()===0 && ex.simple) ? ex.simple : (ex.det || '');
          var nota = ex.nota || '';
          var sci = ex.sci || '';
          exHtml += '<div class="ex-card" style="border-left-color:'+exCol+'">'
            +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;gap:6px">'
              +'<div class="ex-name" style="color:'+exCol+'">'+ex.n+'</div>'
              +(humanSys?'<span class="ex-var-badge" style="background:'+exCol+'18;color:'+exCol+'">'+humanSys+'</span>':'')
            +'</div>'
            +(nota?'<div class="ex-nota" style="background:'+exCol+'15;color:'+exCol+'">'+nota+'</div>':'')
            +((typeof getWeekProgression === 'function' && plan && plan.week)?(function(){
                var wi = plan.week - 1;
                var wip = getWeekInPhase(wi);
                var plen = getPhaseLength(wi);
                var pg = getWeekProgression(ex.cat, wip, plen);
                if(!pg) return '';
                /* Grip rotation badge for finger_strength */
                var gripBadge = '';
                if(ex.cat === 'finger_strength' && typeof getGripForWeek === 'function'){
                  var grip = getGripForWeek(wip, U.level);
                  if(grip) gripBadge = '<span class="ex-grip">Agarre · '+grip+'</span>';
                }
                return '<div class="ex-prog" style="border-color:'+exCol+'44;background:'+exCol+'10">'
                  + '<div class="ex-prog-head">'
                    + '<span class="ex-prog-tag" style="color:'+exCol+'">'+pg.tag+'</span>'
                    + gripBadge
                  + '</div>'
                  + '<span class="ex-prog-mod">'+pg.mod+'</span>'
                + '</div>';
              })():'')
            +(det?'<div class="ex-det" style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-top:4px">'+det+'</div>':'')
            +((typeof renderExerciseGuide==='function')?renderExerciseGuide(ex,eid,exCol):'')
            +(sci?'<div style="margin-top:6px"><button id="btn'+eid+'" onclick="tgSci(\''+eid+'\')" style="background:none;border:none;color:var(--text-secondary);font-size:10px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;padding:0">+ ciencia</button>'
              +'<div id="sci'+eid+'" style="display:none;font-size:10px;color:var(--text-muted);margin-top:4px;line-height:1.5;border-top:1px solid var(--border-color);padding-top:4px">'+autoTerm(sci)+'</div></div>':'')
          +'</div>';
        });
      } else if(mainTests && mainTests.length > 0){
        exHtml += '<div style="margin-bottom:8px;font-size:11px;color:var(--text-secondary);line-height:1.5">Ejecutá cada test con técnica estricta. Anotá resultados en Ejercicios &rsaquo; Tests.</div>';
        mainTests.forEach(function(t){
          exHtml += '<div class="ex-card" style="border-left-color:#FFB800;background:#FFB80008">'
            +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'
              +'<div class="ex-name" style="color:#FFB800">'+t.title+'</div>'
              +'<span class="ex-var-badge" style="background:#FFB80018;color:#FFB800">'+(t.diff||'')+'</span>'
            +'</div>'
            +'<div class="ex-det" style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-top:4px">'+t.mide+'</div>'
            +'<button onclick="goPage(\'plan\');setTimeout(function(){var t=document.querySelectorAll(\'.ptab\')[2];if(t)t.click();},100)" style="margin-top:8px;padding:7px 12px;background:#FFB80018;border:1px solid #FFB80044;border-radius:8px;color:#FFB800;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Anotar resultado &rsaquo;</button>'
          +'</div>';
        });
      }
    }

    /* Wrap secondary phases (warmup, supp, condi, cooldown) in a collapsible block */
    exHtml += '<div id="'+collapseId+'" style="display:none;margin-top:16px;border-top:1px dashed var(--border-color);padding-top:14px">';
    exHtml += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;font-weight:700">Estructura completa de la sesión</div>';

    phases.forEach(function(ph, pi){
      if(pi === mainIdx) return; /* skip main, already rendered */
      var pid = 'ph'+dk+pi;
      var pid = 'ph'+dk+pi;
      var phEx = (ph.id === 'warmup') ? warmupExs : [];
      var phTests = null;

      /* Compact phase header (smaller than main, since these are secondary) */
      exHtml += '<div style="margin-top:14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+ph.col+'10;border:1px solid '+ph.col+'2A;border-radius:10px">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:'+ph.col+';flex-shrink:0"></div>'
        +'<div style="flex:1">'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+ph.col+';line-height:1;margin-bottom:2px">'+ph.label+'</div>'
          +'<div style="font-size:10px;color:var(--text-secondary);line-height:1.3">'+ph.desc+'</div>'
        +'</div>'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;color:'+ph.col+';flex-shrink:0">'+ph.minutes+' min</div>'
      +'</div>';

      if(phEx.length > 0){
        phEx.forEach(function(ex, ei){
          var eid = 'e'+pid+ei;
          var exCol = (ph.id === 'warmup') ? 'var(--accent-caution)' : (ex.col || bt.col);
          var humanSys = SYS_HUMAN[ex.sys] || ex.sys || '';
          var det = (getLevelTier()===0 && ex.simple) ? ex.simple : (ex.det || '');
          var nota = ex.nota || '';
          var sci = ex.sci || '';
          exHtml += '<div class="ex-card" style="border-left-color:'+exCol+';background:'+exCol+'08;margin-left:10px">'
            +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">'
              +'<div class="ex-name" style="color:'+exCol+'">'+ex.n+'</div>'
              +(humanSys?'<span class="ex-var-badge" style="background:'+exCol+'18;color:'+exCol+'">'+humanSys+'</span>':'')
            +'</div>'
            +(nota?'<div class="ex-nota" style="background:'+exCol+'15;color:'+exCol+'">'+nota+'</div>':'')
            +((typeof getWeekProgression === 'function' && plan && plan.week)?(function(){
                var wi = plan.week - 1;
                var wip = getWeekInPhase(wi);
                var plen = getPhaseLength(wi);
                var pg = getWeekProgression(ex.cat, wip, plen);
                if(!pg) return '';
                /* Grip rotation badge for finger_strength */
                var gripBadge = '';
                if(ex.cat === 'finger_strength' && typeof getGripForWeek === 'function'){
                  var grip = getGripForWeek(wip, U.level);
                  if(grip) gripBadge = '<span class="ex-grip">Agarre · '+grip+'</span>';
                }
                return '<div class="ex-prog" style="border-color:'+exCol+'44;background:'+exCol+'10">'
                  + '<div class="ex-prog-head">'
                    + '<span class="ex-prog-tag" style="color:'+exCol+'">'+pg.tag+'</span>'
                    + gripBadge
                  + '</div>'
                  + '<span class="ex-prog-mod">'+pg.mod+'</span>'
                + '</div>';
              })():'')
            +(det?'<div class="ex-det" style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-top:4px">'+det+'</div>':'')
            +((typeof renderExerciseGuide==='function')?renderExerciseGuide(ex,eid,exCol):'')
            +(sci?'<div style="margin-top:6px"><button id="btn'+eid+'" onclick="tgSci(\''+eid+'\')" style="background:none;border:none;color:var(--text-secondary);font-size:10px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;padding:0">+ ciencia</button>'
              +'<div id="sci'+eid+'" style="display:none;font-size:10px;color:var(--text-muted);margin-top:4px;line-height:1.5;border-top:1px solid var(--border-color);padding-top:4px">'+autoTerm(sci)+'</div></div>':'')
          +'</div>';
        });
      } else if(phTests && phTests.length > 0){
        exHtml += '<div style="margin-left:10px;margin-bottom:8px;font-size:11px;color:var(--text-secondary);line-height:1.5">'
          +'Ejecuta cada test con técnica estricta. Anota resultados en la pestana Tests.'
        +'</div>';
        phTests.forEach(function(t){
          exHtml += '<div class="ex-card" style="border-left-color:#FFB800;background:#FFB80008;margin-left:10px">'
            +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'
              +'<div class="ex-name" style="color:#FFB800">'+t.title+'</div>'
              +'<span class="ex-var-badge" style="background:#FFB80018;color:#FFB800">'+(t.diff||'')+'</span>'
            +'</div>'
            +'<div class="ex-det" style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-top:4px">'+t.mide+'</div>'
            +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--accent-primary-d);background:var(--accent-primary-bg);border-radius:5px;padding:6px 10px;margin-top:6px;line-height:1.6">'+t.how+'</div>'
            +'<button onclick="goPage(\'plan\');setTimeout(function(){swPT(\'ts\');},100)" style="margin-top:8px;padding:7px 12px;background:#FFB80018;border:1px solid #FFB80044;border-radius:8px;color:#FFB800;font-size:11px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Anotar resultado &#x2192;</button>'
          +'</div>';
        });
      } else if(ph.content){
        exHtml += '<div style="margin-left:10px;padding:10px 12px;background:'+ph.col+'08;border:1px dashed '+ph.col+'33;border-radius:8px;margin-bottom:6px">'
          +'<div style="font-size:12px;color:var(--text-primary);line-height:1.5">'+ph.content+'</div>'
        +'</div>';
      } else {
        var genericGuide = {
          warmup:  'Movilidad de muñecas, codos y hombros (3-5 min). Escalada fácil progresiva V0-V2 (10 min). Activacion suave de dedos.',
          condi:   'Trabajo de antagonistas: push-ups, rotaciones externas con banda, face-pulls. Core: planchas, L-sit, dragon flag.',
          cooldown:'Cuelgues pasivos en jugs (2-3 min). Estiramiento de antebrazos. Movilidad de hombros y muñeca. Respiración profunda.'
        };
        var gen = genericGuide[ph.id] || '';
        if(gen){
          exHtml += '<div style="margin-left:10px;padding:10px 12px;background:'+ph.col+'08;border:1px dashed '+ph.col+'33;border-radius:8px;margin-bottom:6px">'
            +'<div style="font-size:12px;color:var(--text-secondary);line-height:1.5">'+gen+'</div>'
          +'</div>';
        }
      }
    });
    exHtml += '</div>'; /* close collapsible block (id=collapseId) */
  } else {
    /* Fallback: legacy rendering if SESSION_STRUCTURE doesnt cover this block */
    if(warmupExs.length > 0){
      exHtml += '<div style="margin-top:14px;margin-bottom:8px;display:flex;align-items:center;gap:8px"><div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#FFB800;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Calentamiento</div></div>';
      warmupExs.forEach(function(ex){
        exHtml += '<div class="ex-card" style="border-left-color:#FFB800"><div class="ex-name" style="color:#FFB800">'+ex.n+'</div></div>';
      });
    }
    exs.forEach(function(ex){
      exHtml += '<div class="ex-card" style="border-left-color:'+(ex.col||bt.col)+'"><div class="ex-name">'+ex.n+'</div></div>';
    });
  }

  p.innerHTML = '<div class="daypanel" style="border-left:3px solid '+bt.col+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'
      +'<div class="dp-title" style="color:'+bt.col+'">'+bt.label+' S'+plan.week+'</div>'
      +(isT?'<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--accent-primary-d);background:var(--accent-primary-bg);padding:3px 8px;border-radius:99px">HOY</span>':'')
    +'</div>'
    + stypeBadge
    +'<div class="dp-sub">'+ds+'</div>'
    + safetyHtml
    + goalFocusHtml
    + lockBanner
    + stBan
    + progBar
    +'<div class="sci-box"><div class="sci-tag">Metodología de fase</div><div class="sci-txt">'+autoTerm(BSCI[plan.block]||'')+'</div></div>'
    + exHtml
    + actHtml
    +'</div>';

  p.scrollIntoView({behavior:'smooth',block:'nearest'});
}
/* ──────────────────────────────────────────────────
   Session actions: mark done/fail/undo, move between days
────────────────────────────────────────────────── */


function markSess(dstr,status){
  sessionLog[dstr]=status;saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();renderNextAction();
  if(hcSel&&hcSel.toDateString()===dstr)showDayPanel(hcSel,planMap[dstr],dstr);
  showToast(status==='done'?'Sesión completada!':'Registrado.',status==='done'?'var(--accent-deload)':'var(--accent-warning)');
}
function undoSess(dstr){
  delete sessionLog[dstr];saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();renderNextAction();
  if(hcSel&&hcSel.toDateString()===dstr)showDayPanel(hcSel,planMap[dstr],dstr);
  showToast('Deshecho','var(--text-secondary)');
}
function openMvM(dstr,btype){
  var orig=new Date(dstr);
  var ti=document.getElementById('mv-title'),sb=document.getElementById('mv-sub');
  if(ti)ti.textContent='Mover sesión de '+DLG[orig.getDay()];
  if(sb)sb.textContent='Elegir nuevo día para '+BLOCKS[btype].label;
  var opts=document.getElementById('mv-opts');if(!opts)return;
  opts.innerHTML='';
  for(var i=1;i<=7;i++){
    var date=new Date(orig);date.setDate(date.getDate()+i);
    var key=date.toDateString();
    var ex=planMap[key],busy=ex&&ex.block!=='rest'&&!sessionLog[key];
    var btn=document.createElement('button');
    btn.style.cssText='width:100%;padding:12px 16px;background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:12px;color:var(--text-primary);font-size:13px;text-align:left;cursor:pointer;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center';
    btn.innerHTML='<span>'+DLG[date.getDay()]+' '+date.getDate()+'/'+('0'+(date.getMonth()+1)).slice(-2)+'</span>'
      +(busy?'<span style="font-size:10px;color:#FFB800">sesión existente</span>':'<span style="font-size:10px;color:var(--text-muted)">libre</span>');
    (function(tk,td,b,os,ot){btn.onclick=function(){doMv(os,ot,tk,td,b);};})(key,date,busy,dstr,btype);
    opts.appendChild(btn);
  }
  document.getElementById('mv-modal').classList.add('on');
}
function closeMvModal(){
  document.getElementById('mv-modal').classList.remove('on');
  if(document.activeElement)document.activeElement.blur();
}
function doMv(fromK,btype,toK,toDate,busy){
  closeMvModal();
  planMap[toK]={block:btype,week:planMap[fromK]?planMap[fromK].week:1,moved:true};
  if(planMap[fromK])planMap[fromK].movedTo=toK;
  if(typeof moveLog!=='undefined')moveLog[fromK]=toK;
  sessionLog[fromK]='moved';saveSL();
  renderHC();renderBigCal();renderWk();renderTodayCard();renderNextAction();
  var msg='Sesión movida al '+DLG[toDate.getDay()]+' '+toDate.getDate()+'.';
  if(busy)msg+=' Ese día ya tenia sesión - recuperación puede verse afectada (Barrows 2013).';
  showToast(msg,'var(--accent-caution)');
}
/* ──────────────────────────────────────────────────
   Midline-style hero card (alternate UI - not currently wired in)
────────────────────────────────────────────────── */


function renderHeroTodayMidline() {
  const container = document.getElementById('hero-today');
  if (!container) return;

  const todayStr = TODAY.toDateString();
  const plan = planMap[todayStr];
  const block = plan ? plan.block : null;

  if (!block || block === 'rest') {
    container.innerHTML = `
      <div class="workout-card">
        <div class="workout-header">
          <div class="workout-title-section">
            <span class="workout-badge">HOY</span>
            <div class="workout-name">Día de descanso</div>
          </div>
        </div>
        <div class="workout-exercises">
          <div class="exercise-item">
            <div class="exercise-name">Recuperación activa</div>
            <div class="exercise-details">Movilidad, estiramientos, caminata ligera</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const blockInfo = BLOCKS[block] || BLOCKS.strength;
  const sessionMinutes = U.session || 90;
  const phases = getSessionPhases(block, sessionMinutes, U.goal);
  const warmups = selectWarmupExercises(block, todayStr);
  const mainEx = getExercisesForDay(todayStr, block);

  let exercisesHtml = '';

  if (warmups.length > 0) {
    exercisesHtml += `<div style="margin-bottom: 12px;"><div class="workout-badge" style="background: #FFB80018; color: #FFB800;">CALENTAMIENTO</div>`;
    warmups.forEach(ex => {
      exercisesHtml += `
        <div class="exercise-item">
          <div class="exercise-name">${ex.n}</div>
          <div class="exercise-notes">${ex.nota || '3-5 min'}</div>
          <div class="exercise-details">${ex.det || 'Movilidad y activación progresiva'}</div>
        </div>
      `;
    });
    exercisesHtml += `</div>`;
  }

  if (mainEx.length > 0) {
    exercisesHtml += `<div><div class="workout-badge" style="background: ${blockInfo.col}18; color: ${blockInfo.col};">ENTRENAMIENTO PRINCIPAL</div>`;
    mainEx.forEach(ex => {
      const fatigueHtml = makeFatigueDots(ex.fatigue || 3, blockInfo.col);
      exercisesHtml += `
        <div class="exercise-item">
          <div class="exercise-name">
            ${ex.n}
            <span class="exercise-notes">${ex.nota || '3-5 series'}</span>
          </div>
          ${fatigueHtml}
          <div class="exercise-details">${ex.det || 'Mantener técnica en todo momento'}</div>
          ${ex.sci ? `<div class="exercise-sci">🔬 ${ex.sci.substring(0, 100)}...</div>` : ''}
        </div>
      `;
    });
    exercisesHtml += `</div>`;
  }

  const rpeRange = blockInfo.faderRange || '3-7';

  container.innerHTML = `
    <div class="workout-card">
      <div class="workout-header">
        <div class="workout-title-section">
          <span class="workout-badge">SESIÓN DE ${blockInfo.label.toUpperCase()}</span>
          <div class="workout-name">${blockInfo.label} • ${sessionMinutes} min</div>
          <div class="workout-meta">
            <span class="workout-meta-item">⏱️ ${sessionMinutes} min</span>
            <span class="workout-meta-item">🎯 ${blockInfo.dial || 'Extensivo'}</span>
          </div>
        </div>
        <div class="workout-rpe">
          <div class="workout-rpe-label">RPE SUGERIDO</div>
          <div class="workout-rpe-value">${rpeRange}/10</div>
        </div>
      </div>

      <div class="workout-exercises">
        ${exercisesHtml}
      </div>

      <div class="workout-actions">
        <button class="btn-finish" onclick="openSL('${todayStr}', '${block}')">
          ✓ Finalizar
        </button>
        <button class="btn-view" onclick="toggleInstructions('hero-instr')">
          📋 Ver movimientos
        </button>
      </div>

      <div id="hero-instr" class="workout-instructions">
        <div class="instructions-content">
          <strong>🎯 Enfoque de la sesión:</strong><br>
          ${BSCI[block] || (blockInfo.goalFocus ? blockInfo.goalFocus[U.goal] : 'Mantén la calidad sobre la cantidad.')}
          <br><br>
          <strong>⏱️ Estructura:</strong><br>
          ${phases.map(p => `• ${p.label}: ${p.minutes} min - ${p.desc}`).join('<br>')}
        </div>
      </div>
    </div>
  `;
}

window.toggleInstructions = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle('open');
  }
};
