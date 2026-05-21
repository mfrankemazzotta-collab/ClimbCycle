/* ====================================================
   render-utils.js -- Shared UI utilities
   Reusable building blocks: ring widgets, progress bars,
   toast notifications, calendar-side day detail panel.
==================================================== */


function makeRing(val,col,sz){
  var st=10,r=(sz-st)/2,cx=sz/2,circ=2*Math.PI*r,p=Math.max(0,Math.min(100,val)),dash=p/100*circ;
  return '<div style="position:relative;width:'+sz+'px;height:'+sz+'px;display:inline-flex;align-items:center;justify-content:center"><svg width="'+sz+'" height="'+sz+'" style="position:absolute"><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" stroke="var(--border-color)" stroke-width="'+st+'" fill="none"/><circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" stroke="'+col+'" stroke-width="'+st+'" fill="none" stroke-dasharray="'+dash+' '+(circ-dash)+'" stroke-linecap="round" transform="rotate(-90 '+cx+' '+cx+')"/></svg><div style="position:absolute;display:flex;flex-direction:column;align-items:center"><span style="font-family:\'JetBrains Mono\',monospace;font-size:20px;font-weight:700;color:'+col+'">'+Math.round(p)+'%</span><span style="font-size:9px;color:var(--text-secondary)">recovery</span></div></div>';
}
function mbar(lbl,cur,tgt,col,unit){
  var p=Math.min(100,Math.round(cur/Math.max(tgt,1)*100));
  return '<div class="mr"><div class="mh"><span class="ml">'+lbl+'</span><span class="mv">'+cur+'<span style="color:var(--text-muted)">/'+tgt+unit+'</span></span></div><div class="mtr"><div class="mf" style="width:'+p+'%;background:'+col+'"></div></div></div>';
}
function r2(l,v){return '<div><div style="font-size:10px;color:var(--text-muted)">'+l+'</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:var(--text-primary)">'+v+'</div></div>';}
function showToast(msg,col){
  var t=document.getElementById('toast');if(!t)return;
  t.textContent=msg;t.style.borderColor=col||'var(--border-light)';t.style.color=col||'var(--text-primary)';t.style.display='block';
  if(toastTmr)clearTimeout(toastTmr);
  toastTmr=setTimeout(function(){t.style.display='none';},3000);
}
function showErr(msg){
  document.querySelectorAll('.emsg').forEach(function(e){e.remove();});
  var e=document.createElement('div');e.className='emsg';e.textContent=msg;
  var f=document.querySelector('#s'+curStep+' .sfoot');
  if(f)f.insertBefore(e,f.firstChild);
  setTimeout(function(){if(e.parentNode)e.remove();},2500);
}
/* showDD - Day detail panel for the big calendar page.
   Writes to #ddtl. Uses EX_POOL vía getExercisesForDay for level-aware exs. */
function showDD(date,plan){
  var dd=document.getElementById('ddtl');
  if(!dd)return;
  var key=date.toDateString();
  var bt=BLOCKS[plan.block];
  var opts={weekday:'long',day:'numeric',month:'long'};
  var dateStr='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:700;margin-bottom:4px;color:'+bt.col+'">'+bt.label+' <span style="color:var(--text-muted);font-size:14px">S'+plan.week+'</span></div>'
    +'<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+date.toLocaleDateString('es-ES',opts)+'</div>';

  var body='';
  if(plan.block==='rest'){
    var isRock=plan.outdoor;
    body='<div style="font-size:13px;color:var(--text-secondary)">'+(isRock?'Escalada exterior. Las sesiones siguientes estan ajustadas.':'Día de descanso. Prioriza sueño, hidratacion y nutricion.')+'</div>';
  } else if(plan.block==='test'){
    body='<div style="font-size:13px;color:var(--text-secondary)">Tests programados: '+(U.tests&&U.tests.length?U.tests.join(', '):'ninguno seleccionado')+'</div>';
  } else {
    var exs=getExercisesForDay(key, plan.block);
    if(!exs||exs.length===0){
      exs=(EX[plan.block]||[]).map(function(e){return {n:e.n,nota:e.d,col:bt.col,fatigue:3,sys:''};});
    }
    var safetyWarn=getSafetyWarning(plan.block, U.level);
    if(safetyWarn){
      body+='<div style="background:#FFB80015;border:1px solid #FFB80044;border-radius:8px;padding:8px 12px;font-size:11px;color:#FFB800;margin-bottom:10px;display:flex;align-items:flex-start;gap:6px"><span>&#x26A0;</span><span>'+safetyWarn+'</span></div>';
    }
    body+=exs.map(function(e){
      return '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;margin-bottom:8px">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
          +'<div style="font-size:13px;font-weight:600;color:var(--text-primary);flex:1">'+e.n+'</div>'
          +(e.nota?'<div style="font-size:10px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);flex-shrink:0;text-align:right">'+e.nota+'</div>':'')
        +'</div>'
        +(e.simple?'<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;line-height:1.5">'+e.simple+'</div>':'')
        +(e.sys?'<div style="margin-top:6px"><span style="font-size:9px;padding:2px 8px;border-radius:99px;background:'+(e.col||bt.col)+'20;color:'+(e.col||bt.col)+';border:1px solid '+(e.col||bt.col)+'44;font-family:\'JetBrains Mono\',monospace">'+(SYS_HUMAN[e.sys]||e.sys)+'</span></div>':'')
      +'</div>';
    }).join('');
  }

  dd.innerHTML=dateStr+body;
  dd.classList.add('on');
  dd.scrollIntoView({behavior:'smooth',block:'nearest'});
}
/* tgSci - toggle expandable scientific info inside exercise cards.
   Used by inline onclick handlers generated in showDayPanel. */
function tgSci(eid){
  var el=document.getElementById('sci'+eid),btn=document.getElementById('btn'+eid);
  if(!el||!btn)return;
  var open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  btn.textContent=open?'+ ciencia':'- ocultar';
  btn.style.color=open?'var(--text-secondary)':'var(--accent-primary)';
}

/* togglePhDet - toggle full phase detail (warmup/supp/condi/cooldown) in day panel */
function togglePhDet(id){
  var el = document.getElementById(id);
  var btn = document.getElementById(id+'-btn');
  if(!el || !btn) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  btn.textContent = open ? '+ ver estructura' : '- ocultar estructura';
  btn.style.borderColor = open ? 'var(--border-color)' : 'var(--accent-primary)';
  btn.style.color = open ? 'var(--text-secondary)' : 'var(--accent-primary-d)';
}
/* makeFatigueDots / makeSkillTag are defined in planner.js (they belong with
   exercise selection logic). They are referenced from multiple render files. */

/* ──────────────────────────────────────────────────
   GLOSSARY TOOLTIPS - tap-to-explain technical terms
────────────────────────────────────────────────── */

/* term(label) - wrap a technical term in a clickable span. */
function term(label){
  if(typeof GLOSSARY==='undefined' || !GLOSSARY[label]) return label;
  var safe = label.replace(/'/g, '&#39;');
  return '<span class="term" onclick="showGlossary(\''+safe+'\',event)">'+label+'</span>';
}

/* autoTerm(text) - scan a string and wrap known glossary terms automatically. */
function autoTerm(text){
  if(typeof GLOSSARY==='undefined' || !text) return text;
  var keys = Object.keys(GLOSSARY).sort(function(a,b){return b.length-a.length;});
  var html = String(text);
  keys.forEach(function(k){
    var safeK = k.replace(/'/g, '&#39;');
    var escapedK = k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    var re = new RegExp('(^|[^A-Za-z0-9_\\-])('+escapedK+')(?=[^A-Za-z0-9_]|$)', 'g');
    html = html.replace(re, function(m, pre, t){
      return pre + '<span class="term" onclick="showGlossary(\''+safeK+'\',event)">'+t+'</span>';
    });
  });
  return html;
}

/* showGlossary - render the popover with the term's explanation */
function showGlossary(termKey, ev){
  if(ev){ ev.stopPropagation(); ev.preventDefault(); }
  if(typeof GLOSSARY==='undefined' || !GLOSSARY[termKey]) return;

  var existing = document.getElementById('glossary-popover');
  if(existing) existing.remove();

  var pop = document.createElement('div');
  pop.id = 'glossary-popover';
  pop.className = 'glossary-popover';
  pop.innerHTML =
    '<div class="glossary-header">'
      +'<span class="glossary-term">'+termKey+'</span>'
      +'<button class="glossary-close" onclick="closeGlossary()" aria-label="Cerrar">&times;</button>'
    +'</div>'
    +'<div class="glossary-body">'+GLOSSARY[termKey]+'</div>';
  document.body.appendChild(pop);

  setTimeout(function(){
    document.addEventListener('click', closeGlossaryOnOutside);
  }, 0);
}
function closeGlossary(){
  var p = document.getElementById('glossary-popover');
  if(p) p.remove();
  document.removeEventListener('click', closeGlossaryOnOutside);
}
function closeGlossaryOnOutside(e){
  var p = document.getElementById('glossary-popover');
  if(!p){ document.removeEventListener('click', closeGlossaryOnOutside); return; }
  if(!p.contains(e.target)) closeGlossary();
}

/* ──────────────────────────────────────────────────
   CUSTOM CONFIRM DIALOG
   Promise-based replacement for the ugly native confirm().
   Usage:
     confirmDialog({
       title: 'Reiniciar plan?',
       message: 'Esto borrará tu progreso actual.',
       confirm: 'Sí, reiniciar',
       cancel:  'Cancelar',
       danger:  true   // makes the confirm button red
     }).then(function(yes){ if(yes) doIt(); });
────────────────────────────────────────────────── */
function confirmDialog(opts){
  opts = opts || {};
  var title   = opts.title   || '¿Estás seguro?';
  var message = opts.message || '';
  var okLbl   = opts.confirm || 'Confirmar';
  var noLbl   = opts.cancel  || 'Cancelar';
  var danger  = !!opts.danger;

  return new Promise(function(resolve){
    /* Remove any prior */
    var existing = document.getElementById('confirm-modal');
    if(existing) existing.remove();

    var okCol = danger ? 'var(--accent-warning)' : 'var(--accent-primary)';
    var okFg  = danger ? '#fff' : 'var(--accent-primary-on)';

    var m = document.createElement('div');
    m.id = 'confirm-modal';
    m.className = 'confirm-modal';
    m.innerHTML =
      '<div class="confirm-sheet">'
        +'<div class="confirm-title">'+title+'</div>'
        +(message?'<div class="confirm-msg">'+message+'</div>':'')
        +'<div class="confirm-actions">'
          +'<button class="confirm-btn-cancel" type="button">'+noLbl+'</button>'
          +'<button class="confirm-btn-ok" type="button" style="background:'+okCol+';color:'+okFg+'">'+okLbl+'</button>'
        +'</div>'
      +'</div>';
    document.body.appendChild(m);

    function close(result){
      if(m.parentNode){ m.parentNode.removeChild(m); }
      resolve(result);
    }
    m.querySelector('.confirm-btn-ok').onclick = function(){ close(true); };
    m.querySelector('.confirm-btn-cancel').onclick = function(){ close(false); };
    m.onclick = function(e){ if(e.target === m) close(false); };

    /* Esc to cancel */
    var keyHandler = function(e){
      if(e.key === 'Escape'){
        document.removeEventListener('keydown', keyHandler);
        close(false);
      }
    };
    document.addEventListener('keydown', keyHandler);
  });
}

/* ────────────────────────────────────────────────────
   renderExerciseGuide - "Cómo hacerlo" expandable block
   Returns HTML for an inline expander that shows:
     - how[]   (numbered step-by-step)
     - tips[]  (bullet list of tips)
     - errors[] (common mistakes to avoid)
   Returns empty string if the exercise has none of these.
──────────────────────────────────────────────────── */
function renderExerciseGuide(ex, eid, exCol){
  if(!ex) return '';
  var has = (ex.how && ex.how.length) || (ex.tips && ex.tips.length) || (ex.errors && ex.errors.length);
  if(!has) return '';

  var color = exCol || 'var(--text-primary)';
  var html = '';

  if(ex.how && ex.how.length){
    html += '<div class="exg-section">'
      + '<div class="exg-section-title" style="color:'+color+'">Paso a paso</div>'
      + '<ol class="exg-steps">';
    ex.how.forEach(function(step){
      html += '<li>'+step+'</li>';
    });
    html += '</ol></div>';
  }

  if(ex.tips && ex.tips.length){
    html += '<div class="exg-section">'
      + '<div class="exg-section-title" style="color:var(--accent-primary-d)">Tips clave</div>'
      + '<ul class="exg-bullets">';
    ex.tips.forEach(function(tip){
      html += '<li>'+tip+'</li>';
    });
    html += '</ul></div>';
  }

  if(ex.errors && ex.errors.length){
    html += '<div class="exg-section">'
      + '<div class="exg-section-title" style="color:var(--accent-warning)">Errores comunes</div>'
      + '<ul class="exg-bullets exg-bullets-err">';
    ex.errors.forEach(function(err){
      html += '<li>'+err+'</li>';
    });
    html += '</ul></div>';
  }

  return '<div class="exg-wrap">'
    + '<button class="exg-toggle" onclick="tgGuide(\''+eid+'\')" id="exg-btn-'+eid+'">'
      + '<span class="exg-toggle-text">Cómo hacerlo</span>'
      + '<svg class="exg-toggle-chev" viewBox="0 0 12 12" width="11" height="11"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '</button>'
    + '<div class="exg-body" id="exg-'+eid+'">'+html+'</div>'
  + '</div>';
}

/* Toggle expand/collapse of an exercise guide */
function tgGuide(eid){
  var body = document.getElementById('exg-'+eid);
  var btn  = document.getElementById('exg-btn-'+eid);
  if(!body || !btn) return;
  var open = body.classList.toggle('open');
  btn.classList.toggle('open', open);
}

/* ────────────────────────────────────────────────────
   renderMacrocycleSummary - narrative explanation of why
   the user's plan is structured the way it is.
   Renders: 1-line headline + collapsible details with
   per-phase explanations contextual to level + goal.
──────────────────────────────────────────────────── */
function renderMacrocycleSummary(){
  if(!U || !U.level || !U.plan || !U.startDate) return '';

  var prof = getLevelProfile();
  if(!prof) return '';

  /* Resolve the actual sequence the planner used (goal-aware) */
  var goalKey = U.goal || 'sport';
  var goalSeqs = prof.phaseSeqByGoal && prof.phaseSeqByGoal[goalKey];
  var seqs = goalSeqs || prof.phaseSeq;
  var seq = (seqs && seqs[U.plan]) || [];
  if(seq.length === 0) return '';

  /* Group consecutive same-block weeks into phases. */
  var phases = [];
  seq.forEach(function(b){
    var last = phases[phases.length-1];
    if(last && last.block === b) last.weeks++;
    else phases.push({block: b, weeks: 1});
  });

  /* Plain-language descriptions per phase, contextual to GOAL.
     Each entry: short purpose + why-it's-here-for-this-goal. */
  var GOAL_LBL = {
    sport: 'escalada deportiva (rutas)',
    boulder: 'boulder',
    both: 'roca + boulder',
    competition: 'competición'
  };
  var LEVEL_LBL = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
    elite: 'elite'
  };

  var phaseDesc = {
    endurance: {
      sport: 'Construye la base aeróbica de los dedos. Es lo que te va a permitir sostener rutas largas sin bombearte.',
      boulder: 'Resistencia para enlazar boulders y tolerar sesiones largas en gimnasio o muro.',
      both: 'Base aeróbica que sostiene tanto rutas largas como sesiones de boulder con volumen.',
      competition: 'Capacidad de mantener intensidad alta durante la duración de la final.'
    },
    strength: {
      sport: 'Subimos tu techo de fuerza de dedos y tracción. Sin un techo alto, la potencia y la resistencia se topan rápido.',
      boulder: 'Fuerza máxima de contacto y reclutamiento — el motor del boulder duro.',
      both: 'Fuerza máxima que se aplica tanto a crux de rutas como a problemas de boulder.',
      competition: 'Pico de fuerza dirigido al evento — máxima base neuromuscular.'
    },
    power: {
      sport: 'Convertimos la fuerza recién construida en movimientos explosivos para los crux de la ruta.',
      boulder: 'Potencia para dynos, lanzamientos y movimientos al límite.',
      both: 'Potencia aplicada: dynos en boulder, crux explosivos en ruta.',
      competition: 'Afinación de potencia para el formato — RFD máximo en los primeros 200ms.'
    },
    deload: {
      sport: 'Volumen -50%. La supercompensación ocurre en el reposo, no en el entrenamiento.',
      boulder: 'Recuperación activa antes de salir de roca o testear.',
      both: 'Descarga para absorber las adaptaciones de las semanas previas.',
      competition: 'Tapering: máxima especificidad, mínimo volumen. Llegás fresco al evento.'
    }
  };

  /* Level-specific framing (one short paragraph at the top of the details) */
  var levelFraming = {
    beginner: 'Como recién arrancás, tu plan está construido con un margen extra de seguridad: '
            + 'sin fingerboard de alta intensidad, sin campus, sin movimientos al límite. '
            + 'Volumen alto a intensidad baja, foco en técnica y base aeróbica. '
            + 'Los tendones de los dedos tardan 6-12 meses en adaptarse a cargas máximas — respetamos eso.',
    intermediate: 'Ya tenés base. Tu plan sigue el clásico Horst 4-3-2-1: resistencia → fuerza → potencia → deload. '
            + 'Empezamos por la resistencia porque sin base aeróbica la fuerza no se aplica bien en escalada.',
    advanced: goalKey === 'sport'
            ? 'Como avanzado en escalada deportiva, priorizamos la base aeróbica primero. '
            + 'Tenés ya un buen techo de fuerza — el limitante en sport suele ser la resistencia local de dedos.'
            : 'Como avanzado, arrancamos con fuerza máxima (Barrows: Base + Peak1 + Peak2). '
            + 'Tu frescura neuromuscular es ahora, antes de acumular fatiga de las fases siguientes.',
    elite: goalKey === 'sport'
            ? 'Elite + sport: maximizamos base aeróbica primero, después afilamos fuerza y potencia para el peak. '
            + 'Microciclos de 3 semanas con descarga implícita en la fase final.'
            : 'Como elite, el orden es por frescura neural: fuerza primero (cuando estás más fresco), '
            + 'potencia como pico aplicado, y resistencia al final para sostener volumen.'
  };

  /* Headline: 1-line summary */
  var headline = 'Plan de ' + seq.length + ' semanas para ' + (LEVEL_LBL[U.level]||U.level)
               + ' · ' + (GOAL_LBL[goalKey]||goalKey);

  /* Build phase rows */
  var phaseRows = phases.map(function(p){
    var bt = BLOCKS[p.block] || {label:p.block, col:'var(--text-primary)'};
    var desc = (phaseDesc[p.block] && phaseDesc[p.block][goalKey]) || (phaseDesc[p.block] && phaseDesc[p.block].sport) || '';
    return '<div class="mc-phase">'
      + '<div class="mc-phase-pill" style="background:'+bt.col+'18;color:'+bt.col+';border-color:'+bt.col+'44">'
        + '<span class="mc-phase-weeks">' + p.weeks + ' sem</span>'
        + '<span class="mc-phase-label">' + bt.label + '</span>'
      + '</div>'
      + '<div class="mc-phase-desc">' + desc + '</div>'
    + '</div>';
  }).join('');

  /* Phase bar visualisation: each week colored by its block */
  var totalWeeks = seq.length;
  var phaseBar = '<div class="mc-bar">'
    + seq.map(function(b, wi){
        var bt = BLOCKS[b] || {col:'var(--text-muted)'};
        return '<div class="mc-bar-seg" title="Semana '+(wi+1)+' · '+(bt.label||b)+'" style="background:'+bt.col+';flex:1"></div>';
      }).join('')
    + '</div>'
    + '<div class="mc-bar-axis">'
      + '<span>Semana 1</span><span>Semana ' + totalWeeks + '</span>'
    + '</div>';

  /* Notes about how this differs from other goals or levels (if applicable) */
  var notes = [];

  if((U.level === 'advanced' || U.level === 'elite') && goalKey === 'sport'){
    notes.push('<strong>Si fueras a boulder o competición</strong>, el orden sería al revés (fuerza → potencia → resistencia). '
      + 'En sport con vías largas la base aeróbica decae rápido si no se mantiene — por eso va primero.');
  } else if(U.level === 'intermediate' && goalKey === 'sport'){
    notes.push('Este orden (resistencia → fuerza → potencia → deload) es el macrociclo clásico de Horst para sport climbing. '
      + 'Funciona porque la fuerza se construye sobre una base de resistencia, no al revés.');
  }

  /* Elite-specific differentiator: maintenance hangs during endurance + microciclos 3:1 */
  if(U.level === 'elite'){
    notes.push('<strong>Específico elite:</strong> en las semanas de resistencia incluimos un "maintenance hang" '
      + '(serie de dedos a baja carga) para evitar que el techo de fuerza decaiga durante el bloque aeróbico (Bompa cap.13). '
      + 'Microciclos 3:1: si tu recovery score cae por debajo del 60% durante 2 sesiones seguidas, tratá esa semana como deload activo y subí el descanso.');
  }

  var goalNote = notes.length > 0
    ? notes.map(function(t){return '<div class="mc-note">'+t+'</div>';}).join('')
    : '';

  return '<div class="mc-summary">'
    + '<button class="mc-toggle" onclick="tgMacro()" id="mc-toggle-btn">'
      + '<div class="mc-toggle-text">'
        + '<div class="mc-toggle-eyebrow">Tu macrociclo</div>'
        + '<div class="mc-toggle-headline">' + headline + '</div>'
      + '</div>'
      + '<svg class="mc-toggle-chev" viewBox="0 0 12 12" width="14" height="14"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + '</button>'
    + '<div class="mc-body" id="mc-body">'
      + '<div class="mc-framing">' + (levelFraming[U.level] || '') + '</div>'
      + phaseBar
      + '<div class="mc-phases">' + phaseRows + '</div>'
      + goalNote
    + '</div>'
  + '</div>';
}

function tgMacro(){
  var body = document.getElementById('mc-body');
  var btn  = document.getElementById('mc-toggle-btn');
  if(!body || !btn) return;
  var open = body.classList.toggle('open');
  btn.classList.toggle('open', open);
}
