/* ====================================================
   render-week.js -- Weekly view page
   - wkNav: navigate between weeks of the macrociclo
   - renderWk: render current week with phase context, fatigue
     load summary, day-by-day session cards
   - toggleWkEx: expand/collapse per-day exercise detail
==================================================== */


function wkNav(d){
  var prof=getLevelProfile();
  var seq=(prof&&prof.phaseSeq&&prof.phaseSeq[U.plan])||['endurance','strength','power','deload'];
  var seqLen=seq.length;
  var n=wkOff+d;
  if(n<0){showToast('Primera semana del plan','var(--text-secondary)');return;}
  if(n>=seqLen){showToast('Última semana del ciclo','var(--text-secondary)');return;}
  wkOff=n;renderWk();
}
function renderWk(){
  if(!U.startDate)return;
  /* Use the user's actual level profile sequence (per-week blocks).
     This is the source of truth - matches what generatePlan() built. */
  /* La secuencia REAL del plan (ajustada por el motor de objetivo), no la
     base del perfil de nivel: usar la base hacía que el encabezado dijera
     "Fuerza" en una semana de resistencia. Ver `blockOfWeek` en planner.js. */
  var seq=(typeof getPlanSeq==='function')?getPlanSeq():['endurance','strength','power','deload'];
  var totalWks=seq.length;
  var wkStart=new Date(U.startDate);wkStart.setDate(wkStart.getDate()+wkOff*7);
  /* Y por encima de la secuencia manda lo que el plan tiene ESCRITO para
     esos siete días: si el usuario editó su semana, la etiqueta lo sigue. */
  var delPlan=(typeof blockOfWeek==='function')?blockOfWeek(planMap,wkStart):null;
  var curBlock=delPlan||seq[wkOff]||'rest';
  var bt=BLOCKS[curBlock]||BLOCKS.rest;
  var wkSig=new Date(wkStart);wkSig.setDate(wkSig.getDate()+7);
  var sigBlock=(typeof blockOfWeek==='function')?blockOfWeek(planMap,wkSig):null;
  var nextBlock=(sigBlock&&BLOCKS[sigBlock])||(wkOff+1<seq.length?BLOCKS[seq[wkOff+1]]:null);

  /* ── WEEK LABEL ── */
  var lbl=document.getElementById('wk-lbl');
  if(lbl)lbl.textContent='Semana '+(wkOff+1)+' de '+totalWks;

  /* ── PHASE CONTEXT HEADER (sticky) ──
     Stays visible while user scrolls through days.
     Uses position:sticky with negative top to stick to top of the scroll container. */
  var daysToEnd=(totalWks-(wkOff+1))*7;
  var nextTxt=nextBlock?' A continuación: '+nextBlock.label+'.':'Última semana del ciclo.';
  var phaseCtx='<div class="wk-phase-sticky" style="background:'+bt.col+'18;border:1px solid '+bt.col+'33;border-radius:10px;padding:10px 12px;margin-bottom:12px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      +'<div style="width:8px;height:8px;border-radius:50%;background:'+bt.col+';flex-shrink:0"></div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:700;color:'+bt.col+'">Fase '+bt.label+'</div>'
      +'<div style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:'+bt.col+';background:'+bt.col+'22;padding:2px 8px;border-radius:99px">S'+(wkOff+1)+'/'+totalWks+'</div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.5">'
      +(daysToEnd>0?'Faltan '+daysToEnd+' días para terminar el ciclo. ':'')
      +nextTxt
    +'</div>'
  +'</div>';

  /* ── PUENTE A HOY ──
     Reporte de la beta: "veo muy importante que en la semana te diga un
     cartel que para ir marcando los entrenamientos y las explicaciones,
     conviene ir a Hoy".

     Semana es la vista de PLANIFICACIÓN: muestra los siete días y sirve para
     ver qué viene. Hoy es la de EJECUCIÓN: tiene las casillas por ejercicio,
     el paso a paso, el temporizador y el registro de RPE. Nada en la
     pantalla decía eso, así que había gente intentando entrenar desde acá y
     encontrando una lista que no se puede tocar.

     Sólo aparece si HOY cae dentro de la semana que se está mirando: si
     estás viendo la semana que viene, mandar a "Hoy" no tiene sentido. */
  var hoyEnEstaSemana = false;
  for(var puenteDia=0; puenteDia<7; puenteDia++){
    var puenteFecha=new Date(wkStart); puenteFecha.setDate(puenteFecha.getDate()+puenteDia);
    if(puenteFecha.toDateString()===TODAY.toDateString()){ hoyEnEstaSemana=true; break; }
  }
  if(hoyEnEstaSemana){
    var planHoy=planMap[TODAY.toDateString()];
    var haySesion=planHoy&&planHoy.block&&planHoy.block!=='rest';
    phaseCtx+='<div onclick="goPage(\'hoy\')" style="display:flex;align-items:center;gap:10px;'
      +'background:var(--bg-card);border:1px solid var(--border-color);border-left:3px solid var(--accent-primary);'
      +'border-radius:10px;padding:10px 12px;margin-bottom:12px;cursor:pointer;touch-action:manipulation">'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:12px;font-weight:600;color:var(--text-primary)">'
        +(haySesion?'Para entrenar, andá a Hoy':'Hoy descansás')+'</div>'
        +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-top:2px">'
        +(haySesion
            ? 'Ahí marcás cada ejercicio, ves el paso a paso y tenés el temporizador. Esta vista es para planificar.'
            : 'Esta vista es para planificar la semana; en Hoy registrás lo que hacés.')
        +'</div>'
      +'</div>'
      +'<div style="font-size:16px;color:var(--accent-primary-d);flex-shrink:0">&rsaquo;</div>'
    +'</div>';
  }

  /* ── WEEKLY FATIGUE LOAD (uses EX_POOL directly, no DOM deps) ── */
  var totalFat=0,trainDays=0;
  for(var di=0;di<7;di++){
    var dd=new Date(wkStart);dd.setDate(dd.getDate()+di);
    var pp=planMap[dd.toDateString()];
    if(pp&&pp.block!=='rest'&&pp.block!=='test'){
      trainDays++;
      var poolEx=EX_POOL[pp.block]||[];
      var tier2=getLevelTier();
      var filtered=poolEx.filter(function(e){return (e.minLevel||0)<=tier2;});
      var sample=filtered.slice(0,4);
      sample.forEach(function(e){totalFat+=(e.fatigue||3);});
    }
  }
  var avgFat=trainDays>0?Math.round(totalFat/trainDays*10)/10:0;
  var fatCol=avgFat<=2?'var(--accent-deload)':avgFat<=3.5?'var(--accent-caution)':'var(--accent-warning)';
  var fatLbl=avgFat<=2?'Carga ligera':avgFat<=3.5?'Carga moderada':'Carga alta';
  var fatLoad='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    +'<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px;text-align:center">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:'+fatCol+'">'+avgFat+'</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Fatiga media/sesión</div>'
      +'<div style="font-size:11px;color:'+fatCol+';margin-top:2px">'+fatLbl+'</div>'
    +'</div>'
    +'<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px;text-align:center">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:var(--accent-primary-d)">'+trainDays+'</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Sesiones esta semana</div>'
      +'<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">'+totalWks+' sem totales</div>'
    +'</div>'
  +'</div>';

  var cont=document.getElementById('wk-days');if(!cont)return;

  /* week lock banner */
  var wkLocked=isWeekLocked(wkOff);
  var lockHtml='';
  if(wkLocked){
    var prevComp2=getWeekCompletion(wkOff-1);
    lockHtml='<div class="wk-lock-banner"><div class="wk-lock-icon">&#x1F512;</div><div class="wk-lock-txt">Semana bloqueada: semana anterior con '+prevComp2.pct+'% completado (mínimo 70%). Registra las sesiones pendientes.</div></div>';
  }
  /* Rest-spacing hint: warn if this week's gym sessions land on consecutive
     days (little recovery). Uses within-week offsets (not raw DOW) so the
     week's start day never causes a false positive. Rock (outdoor) excluded. */
  var _wkIdx=[];
  for(var _wi=0;_wi<7;_wi++){
    var _wdate=new Date(wkStart); _wdate.setDate(_wdate.getDate()+_wi);
    var _wp=planMap[_wdate.toDateString()];
    if(_wp && _wp.block!=='rest' && !_wp.outdoor) _wkIdx.push(_wi);
  }
  var restHint=(typeof hasTightSpacing==='function' && hasTightSpacing(_wkIdx))
    ? '<div class="wk-lock-banner" style="background:var(--accent-caution)18;border-color:var(--accent-caution)44"><div class="wk-lock-icon">&#x26A0;</div><div class="wk-lock-txt">Sesiones en días seguidos esta semana — poco descanso entre ellas. Si podés, movelas a días alternos para recuperar mejor.</div></div>'
    : '';

  /* ── Ventana de roca: los días que declaraste como posibles salidas ──
     Antes sólo se podían marcar desde Inicio, día por día: la ventana era
     invisible justo en la pantalla donde se planifica la semana. */
  var rockHtml = renderRockWindowHint(wkStart);

  cont.innerHTML=phaseCtx+fatLoad+lockHtml+restHint+rockHtml;

  var trainN=0,doneN=0;
  for(di=0;di<7;di++){   /* reuse di from the loop above (same function scope) */
    var date=new Date(wkStart);date.setDate(date.getDate()+di);
    var key=date.toDateString(),plan=planMap[key];
    var isT=date.toDateString()===TODAY.toDateString();
    var state3=plan?getSessionState(key,plan):'rest';
    var sm3=SS_META[state3]||SS_META.locked;
    if(plan&&plan.block!=='rest')trainN++;
    if(state3==='completed')doneN++;

    var div=document.createElement('div');
    div.className='week-day'+(isT?' hl':'');

    var hd='<div class="wd-hd">'
      +'<span class="wd-name">'+DLG[date.getDay()]+(isT?' <span style="font-size:11px;color:var(--accent-primary-d)">HOY</span>':'')+'</span>'
      +'<div style="display:flex;align-items:center;gap:6px">'
        +(state3!=='rest'?'<span class="badge '+sm3.css+'" style="font-size:11px;padding:2px 7px">'+sm3.lbl+'</span>':'')
        +'<span style="font-size:11px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">'+date.getDate()+'/'+('0'+(date.getMonth()+1)).slice(-2)+'</span>'
      +'</div></div>';

    if(!plan||plan.block==='rest'){
      var restNote=plan&&plan.note==='gap-forzado'
        ?'<div style="font-size:11px;color:#FFB800;margin-top:4px">Buffer de recuperación - espaciado fisiologico</div>':
        plan&&plan.note==='roca'
        ?'<div style="font-size:11px;color:#9B6EFF;margin-top:4px">Día reservado para escalar en roca</div>':'';
      div.innerHTML=hd+'<div style="font-size:12px;color:var(--text-muted)">Descanso'+restNote+'</div>';
    } else {
      var pbt=BLOCKS[plan.block];
      var bordCol=state3==='completed'?'var(--accent-deload)':state3==='missed'?'var(--accent-warning)':state3==='rescheduled'?'var(--accent-caution)':pbt.col;

      var dayExs=getExercisesForDay(key,plan.block);
      var exCardId='wkex'+di;

      var sessLoad=0;dayExs.forEach(function(e){sessLoad+=(e.fatigue||3);});
      var sessLoadCol=sessLoad<=8?'var(--accent-deload)':sessLoad<=12?'var(--accent-caution)':'var(--accent-warning)';

      var exPreview = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">';
      dayExs.forEach(function(e){
        var eCol = e.col || pbt.col;
        exPreview += '<span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;'
          +'background:var(--bg-card);border:1px solid '+eCol+'33;border-radius:6px;'
          +'padding:3px 7px;color:var(--text-primary);line-height:1.4">'+escapeHtml(e.n)+'</span>';
      });
      exPreview += '</div>';

      var dayWarmups = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];
      var renderWkExCard = function(e, isWarmup){
        var eCol = isWarmup ? 'var(--accent-caution)' : (e.col || pbt.col);
        var notaTxt = e.nota
          ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:'+eCol+';background:'+eCol+'18;border-radius:4px;padding:3px 7px;margin:3px 0">'+escapeHtml(e.nota)+'</div>'
          : '';
        var detTxt = '<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:4px">'+escapeHtml(getLevelTier()===0&&e.simple?e.simple:e.det)+'</div>';
        var badge = isWarmup
          ? '<span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:#FFB800;background:#FFB80018;padding:1px 7px;border-radius:99px">warm-up</span>'
          /* CHIP corto, no la descripción larga: SYS_HUMAN trae el rango del
             SISTEMA ("aguantar 5 a 20 movimientos") y chocaba con la dosis
             del ejercicio ("4-8 movs"). Además Hoy ya usaba el chip, así que
             el mismo ejercicio se veía distinto en cada vista. */
          : '<span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:'+eCol+';background:'+eCol+'18;padding:1px 7px;border-radius:99px">'+escapeHtml((typeof SYS_CHIP!=='undefined'&&SYS_CHIP[e.sys])||e.sys)+'</span>';
        return '<div style="background:var(--bg-card-alt);border-radius:8px;padding:10px;border-left:2px solid '+eCol+';margin-bottom:6px">'
          +'<div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:2px">'+escapeHtml(e.n)+'</div>'
          + badge + notaTxt + detTxt
          + makeFatigueDots(e.fatigue||3, eCol)
          +'</div>';
      };

      var exFull = '';
      if(dayWarmups.length > 0){
        exFull += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#FFB800;text-transform:uppercase;letter-spacing:1.2px;margin:4px 0 6px;font-weight:700">Calentamiento</div>';
        dayWarmups.forEach(function(e){ exFull += renderWkExCard(e, true); });
      }
      if(dayExs.length > 0){
        exFull += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:'+pbt.col+';text-transform:uppercase;letter-spacing:1.2px;margin:10px 0 6px;font-weight:700">Entrenamiento principal</div>';
        dayExs.forEach(function(e){ exFull += renderWkExCard(e, false); });
      }

      /* action buttons */
      var acts='';
      if(state3==='available'||state3==='missed'){
        var isPast2=date<TODAY;
        acts='<div class="sc-acts">'
          +'<button class="sc-btn" style="border-color:#00E5A0;background:#00E5A020;color:#00E5A0" onclick="markSess(\''+key+'\',\'done\')">Hecho</button>'
          +'<button class="sc-btn" style="border-color:#FF4D6A;background:#FF4D6A20;color:#FF4D6A" onclick="markSess(\''+key+'\',\'fail\')">No</button>'
          +(!isPast2?'<button class="sc-btn" style="border-color:#FFB800;background:#FFB80020;color:#FFB800" onclick="openMvM(\''+key+'\',\''+plan.block+'\')">Mover</button>':'')
          +'</div>';
      } else if(state3==='completed'||state3==='rescheduled'){
        acts='<button onclick="undoSess(\''+key+'\')" style="margin-top:6px;padding:5px 10px;background:none;border:1px solid var(--border-color);border-radius:6px;color:var(--text-secondary);font-size:11px;cursor:pointer">Deshacer</button>';
      } else if(state3==='locked'){
        acts='<div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-family:\'JetBrains Mono\',monospace">&#x1F512; sesión futura</div>';
      }

      div.innerHTML=hd
        +'<div class="sess-card" style="border-left:3px solid '+bordCol+'">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
            +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+pbt.col+'">'+pbt.label+'</div>'
            +'<div style="display:flex;align-items:center;gap:6px">'
              +'<span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:'+sessLoadCol+'">carga '+sessLoad+'</span>'
              +'<button id="'+exCardId+'-btn" onclick="toggleWkEx(\''+exCardId+'\')" style="font-size:11px;color:var(--text-secondary);background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:6px;padding:3px 8px;cursor:pointer">+ ver</button>'
            +'</div>'
          +'</div>'
          +exPreview
          +'<div id="'+exCardId+'" style="display:none;margin-top:8px;border-top:1px solid var(--border-color);padding-top:8px">'+exFull+'</div>'
          +acts
        +'</div>';
    }
    cont.appendChild(div);
  }

  var pct=trainN>0?Math.round(doneN/trainN*100):0;
  var pctCol=pct>=70?'var(--accent-deload)':pct>=40?'var(--accent-caution)':'var(--accent-warning)';
  var pl=document.getElementById('wk-prog-lbl'),pb=document.getElementById('wk-prog-bar');
  if(pl)pl.textContent=doneN+'/'+trainN+' ('+pct+'%)';
  if(pb){pb.style.width=pct+'%';pb.style.background=pctCol;}
}
/* Bloque de roca de la vista Semana.

   Cubre el agujero que dejaba la carga sin registrar: el plan reserva tus
   días de roca automáticamente, pero después NADIE te pregunta si saliste,
   así que la sesión más dura de la semana no llegaba al historial que
   alimenta el ACWR. Acá se pregunta.

   El view-model (`rockCandidates`) es puro y vive en planner.js; esto sólo
   arma el HTML. Devuelve '' si no hay nada que ofrecer. */
function renderRockWindowHint(wkStart){
  if(typeof rockCandidates !== 'function') return '';

  var days = [];
  for(var i = 0; i < 7; i++){
    var d = new Date(wkStart); d.setDate(d.getDate() + i);
    var k = d.toDateString();
    var p = planMap[k];
    days.push({
      date: k,
      dow: d.getDay(),
      outdoor: !!(p && p.outdoor),
      plannedRock: !!(p && p.plannedRock),
      block: p && p.block,
      isPast: d < TODAY,
      isToday: k === TODAY.toDateString()
    });
  }

  var cands = rockCandidates(days, U.rockDays || []);
  if(!cands.length) return '';

  var confirmar = cands.filter(function(c){ return c.kind === 'confirm'; });
  var agendar   = cands.filter(function(c){ return c.kind === 'mark'; });
  var h = '';

  /* Las fechas van dentro del onclick como toDateString() generado por
     nosotros — nunca texto del usuario, así que no hay superficie de
     inyección (misma regla que el resto de los handlers del proyecto). */
  function etiqueta(c){
    var d = new Date(c.date);
    return escapeHtml(DLG[c.dow] + ' ' + d.getDate());
  }
  function chip(txt, onclick, col, sub){
    return '<button onclick="' + onclick + '" '
      + 'style="flex:none;min-height:44px;padding:8px 12px;border-radius:10px;cursor:pointer;'
      + 'background:color-mix(in srgb, ' + col + ' 12%, transparent);'
      + 'border:1.5px solid color-mix(in srgb, ' + col + ' 45%, transparent);'
      + 'color:' + col + ';font-family:\'JetBrains Mono\',monospace;'
      + 'font-size:12px;font-weight:700;white-space:nowrap;touch-action:manipulation">'
      + txt
      + (sub ? '<span style="display:block;font-size:11px;font-weight:400;opacity:.8">' + sub + '</span>' : '')
      + '</button>';
  }

  if(confirmar.length){
    h += '<div style="background:var(--bg-card);border:1px solid var(--border-color);'
      + 'border-left:3px solid var(--accent-power);border-radius:10px;padding:10px 12px;margin-bottom:12px">'
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:8px">'
      + '&#x1F9D7; Ten&iacute;as roca reservada. &iquest;Saliste? Confirmalo para que cuente '
      + 'en tu carga — si no, tu riesgo de lesi&oacute;n queda subestimado.</div>'
      + '<div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px">';
    confirmar.forEach(function(c){
      h += chip('&#x2713; Sal&iacute; ' + etiqueta(c), 'wkConfirmRock(\'' + c.date + '\')', 'var(--accent-power)');
      h += chip('&#x2715; No', 'wkSkipRock(\'' + c.date + '\')', 'var(--text-muted)');
    });
    h += '</div></div>';
  }

  if(agendar.length){
    h += '<div style="background:var(--bg-card);border:1px solid var(--border-color);'
      + 'border-left:3px solid var(--accent-power);border-radius:10px;padding:10px 12px;margin-bottom:12px">'
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:8px">'
      + '&#x1F9D7; Pod&eacute;s salir a roca ' + (agendar.length === 1 ? 'este d&iacute;a' : 'estos d&iacute;as') + '. '
      + 'Agendalo y el plan se reacomoda solo.</div>'
      + '<div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px">';
    agendar.forEach(function(c){
      h += chip(etiqueta(c), 'wkMarkRock(\'' + c.date + '\')', 'var(--accent-power)',
                c.busy ? 'reemplaza sesi&oacute;n' : '');
    });
    h += '</div></div>';
  }

  return h;
}

/* Agenda/marca una salida. `markRockDay` además abre el panel de día de
   Inicio (su contexto original); acá alcanza con que el Bus repinte. */
function wkMarkRock(dateStr){
  if(typeof applyRockDayToPlan !== 'function') return;
  var res = applyRockDayToPlan(dateStr);
  var w = (typeof applyRockSideEffects === 'function') ? applyRockSideEffects(dateStr) : {};
  commit('plan');
  if(typeof showToast === 'function') showToast(rockToastMsg(res, w.when), 'var(--accent-power)');
}

/* "Sí, salí": convierte la reserva tentativa en salida confirmada y registra
   la carga. Es el camino por el que el ACWR se entera de la roca. */
function wkConfirmRock(dateStr){
  if(typeof applyRockDayToPlan !== 'function') return;
  applyRockDayToPlan(dateStr);
  if(typeof applyRockSideEffects === 'function') applyRockSideEffects(dateStr);
  commit('plan');
  if(typeof showToast === 'function'){
    showToast('Salida registrada — ya cuenta en tu carga.', 'var(--accent-power)');
  }
}

/* "No salí": libera el día reservado. Queda como descanso, sin carga. */
function wkSkipRock(dateStr){
  var p = planMap[dateStr];
  if(!p) return;
  planMap[dateStr] = { block:'rest', week:p.week || 1 };
  if(typeof unlogRockOuting === 'function') unlogRockOuting(dateStr);
  commit('plan');
  if(typeof showToast === 'function'){
    showToast('Anotado: no saliste ese día.', 'var(--text-muted)');
  }
}

function toggleWkEx(id){
  var el=document.getElementById(id);
  var btn=document.getElementById(id+'-btn');
  if(!el||!btn)return;
  var open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  btn.textContent=open?'+ ver':'- ocultar';
  btn.style.color=open?'var(--text-secondary)':'var(--accent-primary)';
  btn.style.borderColor=open?'var(--border-color)':'#CCFF0044';
}
