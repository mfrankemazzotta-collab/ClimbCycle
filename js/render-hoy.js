/* ====================================================
   render-hoy.js -- "Hoy": pantalla de EJECUCIÓN
   ClimbCycle

   Inicio es el hub (objetivos, plan, proyectos, protocolos, timer…).
   "Hoy" es lo contrario: una sola cosa en pantalla — la sesión de hoy,
   qué ejercicios tocan, un temporizador de descanso por ejercicio, y el
   botón para marcarla como hecha. Sin widgets, sin macrociclo, sin ruido.

   Reusa las piezas existentes: getExercisesForDay/getSessionPhases (planner),
   renderExerciseCard (render-utils), markSess/openSL (render-home),
   openTimer (timer.js) y parseRestSeconds (planner, puro y testeado).
==================================================== */

function renderHoy(){
  var c = document.getElementById('hoyc');
  if(!c) return;

  if(!U.startDate){
    c.innerHTML = '<div class="card" style="padding:18px;text-align:center">'
      +'<div style="font-size:13px;color:var(--text-secondary);line-height:1.6">Todavía no generaste tu plan.</div>'
      +'</div>';
    return;
  }

  var key   = TODAY.toDateString();
  var plan  = planMap[key];
  var state = (typeof getSessionState === 'function') ? getSessionState(key, plan) : 'rest';
  var h = '';

  /* ── Cabecera: fecha + estado ── */
  var fecha = TODAY.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
  h += '<div style="margin-bottom:14px">'
    +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.2px">'+escapeHtml(fecha)+'</div>'
    +'</div>';

  /* ── Día sin sesión programada ── */
  if(!plan || plan.block === 'rest'){
    var esRoca = plan && plan.outdoor;
    h += '<div class="card" style="padding:20px;text-align:center;border-left:3px solid '+(esRoca?'var(--accent-power)':'var(--accent-deload)')+'">'
      +'<div style="font-size:30px;margin-bottom:8px">'+(esRoca?'&#x1F9D7;':'&#x1F634;')+'</div>'
      +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:20px;font-weight:800;color:var(--text-primary)">'+(esRoca?'Día de roca':'Hoy descansás')+'</div>'
      +'<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-top:6px">'
        +(esRoca ? 'El plan ya se adaptó alrededor de tu salida.' : 'El descanso es parte del plan: es cuando el cuerpo asimila lo entrenado.')
      +'</div>'
      +'<button onclick="trainedToday()" style="margin-top:14px;width:100%;padding:12px;background:var(--bg-card-alt);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation">&#x1F3CB; Entrené igual  -  registrar</button>'
    +'</div>';
    c.innerHTML = h;
    return;
  }

  var bt = BLOCKS[plan.block] || {label:plan.block, col:'var(--text-primary)'};
  var hecha = (state === 'completed');
  var exs = (typeof getExercisesForDay === 'function') ? getExercisesForDay(key, plan.block) : [];
  _hoyExs = exs;   /* los handlers resuelven por índice contra esta lista */
  var nDone = (typeof countExDone === 'function') ? countExDone(key, exs) : 0;
  var total = exs.length;

  /* ── Hero: una sola tarjeta, regla de los 2 segundos ── */
  var mins = U.session || 90;
  var totalWk = (typeof getPlanSeq === 'function' && getPlanSeq()) ? getPlanSeq().length : 10;
  var wip = (typeof getWeekInPhase === 'function') ? getWeekInPhase((plan.week||1)-1) : null;
  var sub = 'Semana ' + (plan.week||1) + ' de ' + totalWk
    + (wip ? ' &middot; ' + wip + 'ª de ' + escapeHtml(String(bt.label).toLowerCase()) : '')
    + ' &middot; <span style="font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-primary)">'+mins+' min</span>';

  h += '<div class="card" style="padding:16px;border-left:3px solid '+bt.col+';margin-bottom:12px">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
      +'<div style="min-width:0">'
        +'<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:30px;font-weight:800;color:'+bt.col+';line-height:1">'+escapeHtml(bt.label)+'</div>'
        +'<div style="font-size:12px;color:var(--text-secondary);margin-top:5px">'+sub+'</div>'
      +'</div>'
      +(total?'<div style="text-align:right;flex:none">'
        +'<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;font-weight:700;color:var(--text-primary)">'+(hecha?total:nDone)+'/'+total+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">ejercicios</div>'
      +'</div>':'')
    +'</div>'
    /* barra de segmentos: un tramo por ejercicio */
    +(total?'<div style="display:flex;gap:4px;margin-top:12px">'
      + exs.map(function(ex){
          var on = hecha || isExDone(key, ex.id);
          return '<div style="flex:1;height:5px;border-radius:3px;background:'+(on?bt.col:'var(--border-color)')+'"></div>';
        }).join('')
    +'</div>':'')
  +'</div>';

  /* ── Recuperación (compacta, solo el número + acción) ── */
  if(typeof calcRecovery === 'function'){
    var rec = calcRecovery();
    var rcol = rec.score >= 70 ? 'var(--accent-deload)' : rec.score >= 40 ? 'var(--accent-caution)' : 'var(--accent-warning)';
    h += '<button onclick="openCI()" style="width:100%;text-align:left;display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;cursor:pointer;touch-action:manipulation">'
      +'<span style="font-family:\'JetBrains Mono\',monospace;font-size:18px;font-weight:700;color:'+rcol+';flex-shrink:0">'+Math.round(rec.score)+'%</span>'
      +'<span style="flex:1;min-width:0;font-size:11px;color:var(--text-secondary);line-height:1.35">Recuperación &middot; tocá para hacer el check-in</span>'
    +'</button>';
  }

  /* ── Calentamiento: plegado, pero presente (no se saltea) ── */
  var warm = (typeof UNIVERSAL_WARMUP !== 'undefined' && UNIVERSAL_WARMUP) ? UNIVERSAL_WARMUP : [];
  if(warm.length){
    h += '<button onclick="togglePhDet(\'hoy-warm\')" id="hoy-warm-btn" style="width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:44px;padding:11px 12px;margin-bottom:10px;background:var(--bg-card);border:1px solid var(--border-color);border-left:3px solid var(--accent-caution);border-radius:12px;cursor:pointer;touch-action:manipulation">'
      +'<span style="min-width:0">'
        +'<span style="display:block;font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--accent-caution)">Calentamiento</span>'
        +'<span style="display:block;font-size:11px;color:var(--text-secondary);margin-top:2px">'+warm.length+' pasos &middot; no te lo saltees</span>'
      +'</span>'
      +'<span id="hoy-warm-lbl" style="flex:none;font-size:11px;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);font-weight:700">+ ver</span>'
    +'</button>'
    +'<div id="hoy-warm" style="display:none;margin-bottom:12px">'
      + warm.map(function(w, wi){
          var nombre = w.n || w.name || w.t || '';
          var det = w.d || w.det || w.desc || '';
          return '<div style="display:flex;gap:10px;padding:9px 12px;border-left:2px solid color-mix(in srgb, var(--accent-caution) 45%, transparent);margin-bottom:6px">'
            +'<span style="flex:none;font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:700;color:var(--accent-caution)">'+(wi+1)+'</span>'
            +'<span style="flex:1;min-width:0">'
              +'<span style="display:block;font-size:12.5px;font-weight:600;color:var(--text-primary)">'+escapeHtml(nombre)+'</span>'
              +(det?'<span style="display:block;font-size:11px;color:var(--text-secondary);line-height:1.45;margin-top:2px">'+escapeHtml(det)+'</span>':'')
            +'</span>'
          +'</div>';
        }).join('')
    +'</div>';
  }

  /* ── Ejercicios: el orden del scroll ES el orden de la sesión ── */
  if(total > 0){
    h += '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin:4px 0 8px">Tu sesión</div>';
    exs.forEach(function(ex, i){
      var eid = 'hhoy'+i;
      var exCol = ex.col || bt.col;
      var done = hecha || isExDone(key, ex.id);
      h += '<div style="margin-bottom:10px">';
      /* check en la zona del pulgar (izquierda, 44px) — la tarjeta lo soporta */
      h += renderExerciseCard(ex, plan, exCol, eid, '', { check:true, done:done, onCheck:'hoyToggleEx('+i+')' });
      /* Temporizador CONTEXTUAL: los ejercicios a tiempo (cuelgues, bloqueos)
         lanzan el protocolo completo (trabajo + descanso + series contadas);
         los que van por repeticiones sólo ofrecen el descanso  -  las reps las
         contás vos. Pasamos el ÍNDICE, nunca texto dentro del onclick. */
      var proto = (typeof parseWorkProtocol === 'function') ? parseWorkProtocol(ex) : null;
      var rest  = (typeof parseRestSeconds === 'function') ? parseRestSeconds(ex) : null;
      var etiqueta = proto
        ? '&#x25B6; Protocolo &middot; ' + proto.sets + '&times;' + (proto.reps>1 ? proto.reps+'&times;' : '') + proto.work + 's'
        : '&#x23F1; Descanso' + (rest ? ' &middot; ' + formatRest(rest) : ' (elegir)');
      h += '<button onclick="'+(proto?'hoyProtocolo':'hoyRest')+'('+i+')" style="width:100%;margin-top:-4px;min-height:44px;padding:9px;background:'+(proto?'color-mix(in srgb, '+exCol+' 10%, transparent)':'none')+';border:1.5px '+(proto?'solid':'dashed')+' color-mix(in srgb, '+exCol+' 45%, transparent);border-radius:10px;color:'+exCol+';font-size:11px;font-weight:700;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">'
        + etiqueta
      +'</button>';
      h += '</div>';
    });
  }

  /* ── Acción principal ── */
  h += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-color)">';
  if(hecha){
    /* AL CERRARSE LA SESIÓN NO SE PIERDE LA OPORTUNIDAD DE PONER EL RPE.

       Reporte de la beta: "no me gusta que puedas marcar todas las casillas
       y de repente no te da la opción de agregar el RPE". Tenía razón, y la
       consecuencia es concreta: al completar por casillas se registra la
       carga con un RPE ESTIMADO por fase, y el botón de registrar detalle
       desaparecía — así que ese número quedaba fijo sin haberlo elegido
       nadie. El RPE es lo que alimenta el ACWR, o sea la alerta de carga:
       dejarlo estimado para siempre degrada justo la señal que previene
       lesiones. `writeSessionLog` deduplica por fecha, así que registrar
       después PISA la estimación en vez de duplicar la sesión. */
    var logHoy = (typeof loadSLogs === 'function')
      ? (loadSLogs().filter(function(l){ return l && l.dateStr === key; })[0] || null) : null;
    var estimada = !logHoy || logHoy.auto;
    h += '<div style="text-align:center;font-size:12px;color:var(--accent-deload);margin-bottom:10px">Sesión completada. Buen trabajo.</div>'
      + (estimada
          ? '<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;text-align:center;margin-bottom:8px">La intensidad quedó estimada. Si cargás tu RPE real, el aviso de carga se vuelve más preciso.</div>'
          : '')
      +'<button onclick="openSL(\''+key+'\',\''+plan.block+'\')" style="width:100%;padding:12px;background:'+(estimada?'var(--bg-card)':'none')+';border:1.5px solid '+(estimada?'var(--accent-primary)':'var(--border-color)')+';border-radius:10px;color:'+(estimada?'var(--accent-primary-d)':'var(--text-primary)')+';font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">'
      + (estimada ? 'Agregar mi RPE y duración' : 'Editar RPE y duración')
      +'</button>'
      +'<button onclick="undoSess(\''+key+'\')" style="width:100%;margin-top:8px;padding:11px;background:none;border:1px solid var(--border-color);border-radius:10px;color:var(--text-secondary);font-size:12px;cursor:pointer;touch-action:manipulation">Deshacer</button>';
  } else {
    h += '<button onclick="markSess(\''+key+'\',\'done\')" style="width:100%;padding:15px;background:var(--accent-primary);border:none;border-radius:12px;color:var(--accent-primary-on);font-family:\'Barlow Condensed\',sans-serif;font-size:17px;font-weight:800;cursor:pointer;touch-action:manipulation">&#x2713; Marcar sesión como hecha</button>'
      +'<button onclick="openSL(\''+key+'\',\''+plan.block+'\')" style="width:100%;margin-top:8px;padding:11px;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-size:12px;font-family:\'JetBrains Mono\',monospace;cursor:pointer;touch-action:manipulation">Registrar con detalle (RPE, duración)</button>';
  }
  h += '</div>';

  c.innerHTML = h;
}

/* Ejercicios pintados en la última llamada a renderHoy — para que los handlers
   sólo necesiten un índice (nada de texto dentro de atributos onclick). */
var _hoyExs = [];

/* Marca/desmarca un ejercicio de la sesión de hoy. Cuando se marca el ÚLTIMO,
   la sesión se completa sola (el progreso se construye entre series y no hace
   falta acordarse de tocar el botón grande al final). */
function hoyToggleEx(i){
  var ex = _hoyExs[i]; if(!ex) return;
  var key = TODAY.toDateString();
  toggleExDone(key, ex.id);
  var n = countExDone(key, _hoyExs);
  var todosHechos = (n === _hoyExs.length && _hoyExs.length > 0);
  var yaMarcada = (sessionLog[key] === 'done');

  if(todosHechos && !yaMarcada){
    sessionLog[key] = 'done';
    /* la sesión cuenta como carga igual que si tocaras el botón grande */
    if(typeof logSessionDone === 'function') logSessionDone(key);
    commit('exdone', false); commit('session');   /* un solo repintado */
    /* El toast avisa que la intensidad quedó estimada: el botón para
       corregirla está justo abajo, pero si no se nombra nadie lo busca. */
    if(typeof showToast === 'function') showToast('¡Sesión completa! Cargá tu RPE abajo para afinar el aviso de carga.', 'var(--accent-deload)');
    return;
  }
  /* si desmarcás algo de una sesión ya dada por hecha, vuelve a quedar abierta */
  if(!todosHechos && yaMarcada){
    delete sessionLog[key];
    if(typeof unlogAutoSession === 'function') unlogAutoSession(key);
    commit('exdone', false); commit('session');
    return;
  }
  commit('exdone');
}

/* Abre el temporizador de descanso del ejercicio i, precargado con lo que ese
   ejercicio pide. Si el descanso es relativo (1:1), arranca en 3 min editable. */
function hoyRest(i){
  if(typeof openTimer !== 'function') return;
  var ex = _hoyExs[i];
  var secs = (ex && typeof parseRestSeconds === 'function') ? parseRestSeconds(ex) : null;
  openTimer({
    sets: 1, reps: 1, work: 0,
    restRep: (secs && secs > 0) ? secs : 180,
    prep: 0,
    label: 'Descanso' + (ex && ex.n ? ' · ' + ex.n : '')
  });
  /* Un descanso no necesita pantalla completa: arranca solo y en la barra,
     así seguís mirando el ejercicio mientras corre. */
  if(typeof tmrStart === 'function'){ tmrStart(); if(typeof tmrMinimize === 'function') tmrMinimize(); }
}

/* Protocolo completo para ejercicios a tiempo: preparate → trabajo → descanso,
   con las series contadas. Abre a pantalla completa (querés ver el conteo). */
function hoyProtocolo(i){
  if(typeof openTimer !== 'function') return;
  var ex = _hoyExs[i]; if(!ex) return;
  var p = (typeof parseWorkProtocol === 'function') ? parseWorkProtocol(ex) : null;
  if(!p) return hoyRest(i);
  /* kg objetivo, si el ejercicio los tiene calculados */
  var kg = null;
  try {
    var plan = planMap[TODAY.toDateString()];
    if(plan && plan.week && typeof getWeekProgression === 'function'){
      var pg = getWeekProgression(ex.cat, getWeekInPhase(plan.week-1), getPhaseLength(plan.week-1));
      if(pg && pg.load && typeof getCategoryLoad === 'function'){
        var L = getCategoryLoad(ex.cat, pg.load); if(L) kg = L.kg;
      }
    }
  } catch(e){}
  openTimer({
    sets: p.sets, reps: p.reps, work: p.work,
    restRep: p.restRep, restSet: p.restSet,
    prep: 10, label: ex.n, load: kg
  });
}
