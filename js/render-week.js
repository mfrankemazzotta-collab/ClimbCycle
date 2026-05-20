?/* ====================================================
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
  var prof=getLevelProfile();
  var seq=(prof&&prof.phaseSeq&&prof.phaseSeq[U.plan])||['endurance','strength','power','deload'];
  var totalWks=seq.length;
  var wkStart=new Date(U.startDate);wkStart.setDate(wkStart.getDate()+wkOff*7);
  var curBlock=seq[wkOff]||'rest';
  var bt=BLOCKS[curBlock]||BLOCKS.rest;
  var nextBlock=wkOff+1<seq.length?BLOCKS[seq[wkOff+1]]:null;

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
      +'<div style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+bt.col+';background:'+bt.col+'22;padding:2px 8px;border-radius:99px">S'+(wkOff+1)+'/'+totalWks+'</div>'
    +'</div>'
    +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.5">'
      +(daysToEnd>0?'Faltan '+daysToEnd+' días para terminar el ciclo. ':'')
      +nextTxt
    +'</div>'
  +'</div>';

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
      +'<div style="font-size:9px;color:var(--text-muted)">Fatiga media/sesión</div>'
      +'<div style="font-size:9px;color:'+fatCol+';margin-top:2px">'+fatLbl+'</div>'
    +'</div>'
    +'<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px;text-align:center">'
      +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:var(--accent-primary-d)">'+trainDays+'</div>'
      +'<div style="font-size:9px;color:var(--text-muted)">Sesiones esta semana</div>'
      +'<div style="font-size:9px;color:var(--text-secondary);margin-top:2px">'+totalWks+' sem totales</div>'
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
  cont.innerHTML=phaseCtx+fatLoad+lockHtml;

  var trainN=0,doneN=0;
  for(var di=0;di<7;di++){
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
      +'<span class="wd-name">'+DLG[date.getDay()]+(isT?' <span style="font-size:9px;color:var(--accent-primary-d)">HOY</span>':'')+'</span>'
      +'<div style="display:flex;align-items:center;gap:6px">'
        +(state3!=='rest'?'<span class="badge '+sm3.css+'" style="font-size:8px;padding:2px 7px">'+sm3.lbl+'</span>':'')
        +'<span style="font-size:10px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">'+date.getDate()+'/'+('0'+(date.getMonth()+1)).slice(-2)+'</span>'
      +'</div></div>';

    if(!plan||plan.block==='rest'){
      var restNote=plan&&plan.note==='gap-forzado'
        ?'<div style="font-size:10px;color:#FFB800;margin-top:4px">Buffer de recuperación - espaciado fisiologico</div>':
        plan&&plan.note==='roca'
        ?'<div style="font-size:10px;color:#9B6EFF;margin-top:4px">Día reservado para escalar en roca</div>':'';
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
        exPreview += '<span style="font-size:10px;font-family:\'JetBrains Mono\',monospace;'
          +'background:var(--bg-card);border:1px solid '+eCol+'33;border-radius:6px;'
          +'padding:3px 7px;color:var(--text-primary);line-height:1.4">'+e.n+'</span>';
      });
      exPreview += '</div>';

      var dayWarmups = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];
      var renderWkExCard = function(e, isWarmup){
        var eCol = isWarmup ? 'var(--accent-caution)' : (e.col || pbt.col);
        var notaTxt = e.nota
          ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:'+eCol+';background:'+eCol+'18;border-radius:4px;padding:3px 7px;margin:3px 0">'+e.nota+'</div>'
          : '';
        var detTxt = '<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:4px">'+(getLevelTier()===0&&e.simple?e.simple:e.det)+'</div>';
        var badge = isWarmup
          ? '<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:#FFB800;background:#FFB80018;padding:1px 7px;border-radius:99px">warm-up</span>'
          : '<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+eCol+';background:'+eCol+'18;padding:1px 7px;border-radius:99px">'+(SYS_HUMAN[e.sys]||e.sys)+'</span>';
        return '<div style="background:var(--bg-card-alt);border-radius:8px;padding:10px;border-left:2px solid '+eCol+';margin-bottom:6px">'
          +'<div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:2px">'+e.n+'</div>'
          + badge + notaTxt + detTxt
          + makeFatigueDots(e.fatigue||3, eCol)
          +'</div>';
      };

      var exFull = '';
      if(dayWarmups.length > 0){
        exFull += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#FFB800;text-transform:uppercase;letter-spacing:1.2px;margin:4px 0 6px;font-weight:700">Calentamiento</div>';
        dayWarmups.forEach(function(e){ exFull += renderWkExCard(e, true); });
      }
      if(dayExs.length > 0){
        exFull += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:'+pbt.col+';text-transform:uppercase;letter-spacing:1.2px;margin:10px 0 6px;font-weight:700">Entrenamiento principal</div>';
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
        acts='<button onclick="undoSess(\''+key+'\')" style="margin-top:6px;padding:5px 10px;background:none;border:1px solid var(--border-color);border-radius:6px;color:var(--text-secondary);font-size:10px;cursor:pointer">Deshacer</button>';
      } else if(state3==='locked'){
        acts='<div style="font-size:10px;color:var(--text-muted);margin-top:6px;font-family:\'JetBrains Mono\',monospace">&#x1F512; sesión futura</div>';
      }

      div.innerHTML=hd
        +'<div class="sess-card" style="border-left:3px solid '+bordCol+'">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
            +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+pbt.col+'">'+pbt.label+'</div>'
            +'<div style="display:flex;align-items:center;gap:6px">'
              +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+sessLoadCol+'">carga '+sessLoad+'</span>'
              +'<button id="'+exCardId+'-btn" onclick="toggleWkEx(\''+exCardId+'\')" style="font-size:10px;color:var(--text-secondary);background:var(--bg-card-alt);border:1px solid var(--border-color);border-radius:6px;padding:3px 8px;cursor:pointer">+ ver</button>'
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
