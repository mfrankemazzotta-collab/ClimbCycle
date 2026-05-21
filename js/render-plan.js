/* ====================================================
   render-plan.js -- Plan page (Ejercicios / Hangboard / Tests tabs)
   - renderPlanPage: top-level tab orchestrator (#planc)
   - buildExTab: today/week/phase/catalog exercise listings
   - buildHBTab: hangboard protocols catalog
   - renderExCard: shared exercise card builder
   buildTsTab lives in tests.js (closer to test data and dashboard).
==================================================== */


function renderPlanPage(){
  var c=document.getElementById('planc');if(!c)return;
  var macroHtml = (typeof renderMacrocycleSummary === 'function') ? renderMacrocycleSummary() : '';
  c.innerHTML=macroHtml
    +'<div class="ptabs"><button class="ptab on" onclick="swPT(this,\'ptej\')">Ejercicios</button><button class="ptab" onclick="swPT(this,\'pthb\')">Hangboard</button><button class="ptab" onclick="swPT(this,\'ptts\')">Tests</button></div>'
    +'<div class="ptabc on" id="ptej"></div><div class="ptabc" id="pthb"></div><div class="ptabc" id="ptts"></div>';
  buildExTab();buildHBTab();buildTsTab();
}
function swPT(el,tid){el.parentElement.querySelectorAll('.ptab').forEach(function(t){t.classList.remove('on');});document.querySelectorAll('.ptabc').forEach(function(t){t.classList.remove('on');});el.classList.add('on');var t=document.getElementById(tid);if(t)t.classList.add('on');}
function buildExTab(){
  var c=document.getElementById('ptej');if(!c)return;
  var tier=getLevelTier();

  /* CATEGORY METADATA - professional taxonomy */
  var CAT_META={
    finger_strength:    {label:'Fuerza de dedos',     icon:'&#x270A;', col:'var(--accent-strength)',
                         desc:'Hangboard, max hangs, one-arm hangs'},
    pull_strength:      {label:'Fuerza de traccion',  icon:'&#x1F4AA;', col:'#60A5FA',
                         desc:'Dominadas, lock-offs, pull-ups con lastre'},
    power:              {label:'Potencia',            icon:'&#x26A1;',  col:'var(--accent-power)',
                         desc:'Movimientos explosivos, dinámicos al limite'},
    campus_board:       {label:'Campus Board',        icon:'&#x1FA9C;', col:'#A855F7',
                         desc:'Potencia reactiva sin pies'},
    wall_training:      {label:'Muro de entrenamiento',icon:'&#x1F9D7;', col:'#EC4899',
                         desc:'Boulder al limite, 4x4, system board'},
    power_endurance:    {label:'Power endurance',     icon:'&#x1F525;', col:'var(--accent-endurance)',
                         desc:'Circuitos intensos, on/off, intervalos'},
    aerobic_endurance:  {label:'Resistencia aeróbica',icon:'&#x1F30A;', col:'#06B6D4',
                         desc:'ARC, escalada continua, base aeróbica'},
    technique:          {label:'Técnica',             icon:'&#x1F3AF;', col:'#10B981',
                         desc:'Skill work, travesias técnicas'},
    mobility:           {label:'Movilidad y prevencion',icon:'&#x1F9D8;',col:'var(--accent-deload)',
                         desc:'Movilidad, antagonistas, recuperación activa'}
  };

  /* COLLECT ALL EXERCISES from EX_POOL */
  var allExercises=[];
  ['strength','power','endurance','deload'].forEach(function(block){
    var pool=EX_POOL[block]||[];
    pool.forEach(function(ex){
      if((ex.minLevel||0)<=tier){
        allExercises.push({ex:ex,block:block});
      }
    });
  });

  /* current phase - use level profile (source of truth) */
  var _prof2=getLevelProfile();
  var seq=(_prof2&&_prof2.phaseSeq&&_prof2.phaseSeq[U.plan])||['endurance','strength','power','deload'];
  var curWkIdx=getCurrentWeekIndex();
  var curBlock=seq[Math.min(curWkIdx,seq.length-1)]||'strength';
  var curBt=BLOCKS[curBlock]||BLOCKS.strength;

  /* SECTION 1: Ejercicios de hoy */
  var todayKey=TODAY.toDateString();
  var todayPlan=planMap[todayKey];
  var todayHtml='';
  if(todayPlan && todayPlan.block!=='rest' && todayPlan.block!=='test'){
    var todayExs=getExercisesForDay(todayKey,todayPlan.block);
    var todayWarmups = (typeof UNIVERSAL_WARMUP !== 'undefined') ? UNIVERSAL_WARMUP : [];
    var todayBt=BLOCKS[todayPlan.block];
    todayHtml='<div style="margin-bottom:22px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border-color)">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:#CCFF00;box-shadow:0 0 8px #CCFF0066"></div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:800;color:var(--accent-primary-d);letter-spacing:-0.2px;line-height:1">Ejercicios de hoy</div>'
        +'<span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+todayBt.col+';background:'+todayBt.col+'18;padding:3px 9px;border-radius:99px;letter-spacing:0.5px;font-weight:700;margin-left:auto">'+todayBt.label.toUpperCase()+'</span>'
      +'</div>';
    todayWarmups.forEach(function(ex){todayHtml+=renderExCard(ex,'var(--accent-caution)',true);});
    todayExs.forEach(function(ex){todayHtml+=renderExCard(ex,ex.col||todayBt.col,false);});
    todayHtml+='</div>';
  }

  /* SECTION 2: Esta semana - todos los ejercicios planificados */
  var weekHtml='';
  var weekStart=new Date(TODAY);
  var weekDow=weekStart.getDay();if(weekDow===0)weekDow=7;
  weekStart.setDate(weekStart.getDate()-(weekDow-1));
  var weekExIds={};
  for(var di=0;di<7;di++){
    var d=new Date(weekStart);d.setDate(d.getDate()+di);
    var dk=d.toDateString();
    if(dk===todayKey)continue;
    var pp=planMap[dk];
    if(!pp||pp.block==='rest'||pp.block==='test')continue;
    var dexs=getExercisesForDay(dk,pp.block);
    dexs.forEach(function(ex){
      if(!weekExIds[ex.id]){
        weekExIds[ex.id]={ex:ex,block:pp.block,day:DLG[d.getDay()]};
      }
    });
  }
  var weekKeys=Object.keys(weekExIds);
  if(weekKeys.length>0){
    weekHtml='<div style="margin-bottom:22px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border-color)">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:var(--text-secondary)"></div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:800;color:var(--text-primary);letter-spacing:-0.2px;line-height:1">Esta semana</div>'
        +'<span style="font-size:9px;color:var(--text-secondary);font-family:\'JetBrains Mono\',monospace;background:var(--bg-card-alt);padding:3px 9px;border-radius:99px;margin-left:auto">'+weekKeys.length+' ejercicios</span>'
      +'</div>';
    weekKeys.forEach(function(id){
      var item=weekExIds[id];
      var ec=item.ex.col||(BLOCKS[item.block]?BLOCKS[item.block].col:'var(--text-secondary)');
      weekHtml+=renderExCard(item.ex,ec,false,item.day);
    });
    weekHtml+='</div>';
  }

  /* SECTION 3: Recomendados para tu fase actual */
  var phaseHtml='<div style="margin-bottom:18px">'
    +'<div style="background:'+curBt.col+'15;border:1px solid '+curBt.col+'40;border-radius:12px;padding:12px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:'+curBt.col+'"></div>'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;color:'+curBt.col+'">Fase actual: '+curBt.label+'</div>'
      +'</div>'
      +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.4">Recomendados para esta fase del plan, respetando tu nivel</div>'
    +'</div>';
  var phasePool=(EX_POOL[curBlock]||[]).filter(function(ex){
    return (ex.minLevel||0)<=tier && ex.phase!=='warmup';
  });
  phasePool.slice(0,5).forEach(function(ex){
    phaseHtml+=renderExCard(ex,ex.col||curBt.col,false);
  });
  phaseHtml+='</div>';

  /* SECTION 4: Catalogo completo - filtros por categoría */
  var activeCat=c._activeCat||'all';
  var presentCats={};
  allExercises.forEach(function(item){if(item.ex.cat)presentCats[item.ex.cat]=true;});
  var filterBar='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;-webkit-overflow-scrolling:touch">';
  filterBar+='<button onclick="exFilter(\'all\')" '
    +'style="flex-shrink:0;padding:6px 12px;border-radius:99px;border:1.5px solid '+(activeCat==='all'?'var(--accent-primary)':'var(--border-color)')+';'
    +'background:'+(activeCat==='all'?'var(--accent-primary-bg)':'var(--bg-card)')+';color:'+(activeCat==='all'?'var(--accent-primary)':'var(--text-secondary)')+';'
    +'font-family:\'JetBrains Mono\',monospace;font-size:10px;cursor:pointer;touch-action:manipulation">Todos</button>';
  Object.keys(CAT_META).forEach(function(cat){
    if(!presentCats[cat])return;
    var meta=CAT_META[cat];
    var isOn=cat===activeCat;
    filterBar+='<button onclick="exFilter(\''+cat+'\')" '
      +'style="flex-shrink:0;padding:6px 12px;border-radius:99px;border:1.5px solid '+(isOn?meta.col:'var(--border-color)')+';'
      +'background:'+(isOn?meta.col+'18':'var(--bg-card)')+';color:'+(isOn?meta.col:'var(--text-secondary)')+';'
      +'font-family:\'JetBrains Mono\',monospace;font-size:10px;cursor:pointer;touch-action:manipulation;white-space:nowrap">'
      +meta.icon+' '+meta.label+'</button>';
  });
  filterBar+='</div>';

  var catalogHtml='<div style="margin-bottom:22px">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-color)">'
      +'<div style="width:8px;height:8px;border-radius:50%;background:var(--text-secondary)"></div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:800;color:var(--text-primary);letter-spacing:-0.2px;line-height:1">Catalogo completo</div>'
    +'</div>'
    + filterBar;

  var filtered=allExercises.filter(function(item){
    if(activeCat==='all')return true;
    return item.ex.cat===activeCat;
  });

  if(filtered.length===0){
    catalogHtml+='<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">Sin ejercicios en esta categoría para tu nivel actual.</div>';
  } else {
    var byCat={};
    filtered.forEach(function(item){
      var k=item.ex.cat||'other';
      if(!byCat[k])byCat[k]=[];
      byCat[k].push(item);
    });
    Object.keys(CAT_META).forEach(function(cat){
      if(!byCat[cat])return;
      var meta=CAT_META[cat];
      catalogHtml+='<div style="margin-bottom:14px">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 0;border-bottom:1px solid '+meta.col+'33">'
          +'<div style="font-size:14px">'+meta.icon+'</div>'
          +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:'+meta.col+'">'+meta.label+'</div>'
          +'<span style="font-size:9px;color:var(--text-muted)">'+byCat[cat].length+'</span>'
        +'</div>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;padding-left:22px">'+meta.desc+'</div>';
      byCat[cat].forEach(function(item){
        var ec=item.ex.col||meta.col;
        catalogHtml+=renderExCard(item.ex,ec,item.ex.phase==='warmup');
      });
      catalogHtml+='</div>';
    });
  }
  catalogHtml+='</div>';

  c.innerHTML = todayHtml + weekHtml + phaseHtml + catalogHtml;
}

/* Render a single exercise card - shared helper for buildExTab */
function renderExCard(ex,col,isWarmup,dayLabel){
  var humanSys=(typeof SYS_HUMAN!=='undefined'&&SYS_HUMAN[ex.sys])?SYS_HUMAN[ex.sys]:(ex.sys||'');
  var tier=getLevelTier();
  var det=(tier===0&&ex.simple)?ex.simple:(ex.det||ex.d||'');
  var nota=ex.nota||'';
  var sci=ex.sci||'';
  var bgCol=isWarmup?'#FFB80008':'var(--bg-card)';
  var borderCol=isWarmup?'var(--accent-caution)':col;
  var html='<div style="background:'+bgCol+';border:1px solid var(--border-color);border-radius:10px;padding:11px;margin-bottom:6px;border-left:3px solid '+borderCol+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px;gap:8px">'
      +'<div style="font-size:13px;font-weight:600;color:var(--text-primary);flex:1">'+ex.n+'</div>'
      +'<div style="display:flex;gap:4px;align-items:center;flex-shrink:0">';
  if(isWarmup) html+='<span style="font-size:8px;color:#FFB800;background:#FFB80018;padding:2px 6px;border-radius:4px;font-family:\'JetBrains Mono\',monospace">warm-up</span>';
  if(dayLabel) html+='<span style="font-size:8px;color:'+col+';background:'+col+'18;padding:2px 6px;border-radius:4px;font-family:\'JetBrains Mono\',monospace">'+dayLabel.slice(0,3)+'</span>';
  html+='</div></div>';
  if(humanSys) html+='<div style="font-size:10px;color:'+col+';margin-bottom:4px">'+humanSys+'</div>';
  if(nota) html+='<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--accent-primary-d);background:var(--accent-primary-bg);border-radius:5px;padding:4px 8px;margin-bottom:6px">'+nota+'</div>';
  if(det) html+='<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:4px">'+det+'</div>';
  if(typeof makeFatigueDots==='function') html+=makeFatigueDots(ex.fatigue||3,col);
  if(sci) html+='<div style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.5;border-top:1px solid var(--border-color);padding-top:6px">'+(typeof autoTerm==='function'?autoTerm(sci):sci)+'</div>';
  html+='</div>';
  return html;
}

function exFilter(cat){
  var c=document.getElementById('ptej');
  if(c)c._activeCat=cat;
  buildExTab();
}
function buildHBTab(){
  var c=document.getElementById('pthb');if(!c)return;
  var h='<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">Notacion Eva Lopez: Sets x HangTime(Buffer) x Reps :SetRest/RepRest. Buffer = segundos que sobran antes del fallo.</div>';
  HBP.forEach(function(p){
    h+='<div class="proto" style="border-left:3px solid '+p.col+'"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700;color:var(--text-primary)">'+p.t+'</div><span style="font-size:9px;font-family:\'JetBrains Mono\',monospace;color:'+p.col+'">'+p.ph+'</span></div><div class="proto-nota">'+p.nota+'</div><div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px">'+p.desc+'</div><div style="margin-bottom:8px">';
    p.prog.forEach(function(pr,i){h+='<div style="font-size:11px;color:var(--text-secondary);padding:3px 0;padding-left:10px;border-left:2px solid var(--border-light);margin-bottom:3px">'+(i+1)+'. '+pr+'</div>';});
    h+='</div><div class="proto-warn">'+p.warn+'</div></div>';
  });
  c.innerHTML=h;
}
