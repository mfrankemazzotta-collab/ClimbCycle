/* ====================================================
   goal.js -- Goal engine: "how do I reach my target grade?"
   ClimbCycle

   Turns a target grade into a focused roadmap: given the climber's
   current capacities (test results if available, otherwise level/goal
   heuristics), their gym + rock days, and the exercise pool, it says
   WHAT to prioritise and WHICH exercises get them there.

   computeGoalPlan() is pure logic (unit-tested). renderGoalCard() paints
   the Home card. Both no-op gracefully when no target grade is set.
==================================================== */

/* Capacity catalogue: maps a trainable capacity to its assessment test,
   the plan block that trains it, and the exercise-pool category. */
var GOAL_CAPS = [
  {key:'fingerStrength', label:'Fuerza de dedos',            testKey:'hang_max',      block:'strength',  cat:'finger_strength'},
  {key:'pullStrength',   label:'Fuerza de tracción',         testKey:'pullup_3rm',    block:'strength',  cat:'pull_strength'},
  {key:'aerobic',        label:'Base aeróbica (resistencia)', testKey:'cf_minutes',    block:'endurance', cat:'aerobic_endurance'},
  {key:'fingerEndurance',label:'Resistencia de dedos',       testKey:'repeater_6rep', block:'endurance', cat:'power_endurance'},
  /* `power_slap` tiene test pero NO tiene entrada en TEST_RANGES: no hay
     normas por nivel publicadas (ver el intérprete en test-interpret.js).
     Eso lo deja en un tercer estado -- medido, pero sin norma contra la cual
     puntuarlo -- que el motor reporta como `tracked`. */
  {key:'power',          label:'Potencia',                   testKey:'power_slap',    block:'power',     cat:'power'}
];

var GOAL_REASONS = {
  fingerStrength: 'La fuerza de dedos suele ser el limitante nº1 para subir de grado (Lattice).',
  pullStrength:   'La tracción sostiene bloqueos y movimientos en desplome.',
  aerobic:        'Más base aeróbica de antebrazo = escalás más sin engomarte (Critical Force, Giles 2019).',
  fingerEndurance:'Sostener la intensidad en el tiempo es lo que define vías y enlaces largos.',
  power:          'La potencia resuelve movimientos explosivos y el crux de bloque.'
};

var SHORT_DOW = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function goalBlockLabel(block){
  return (typeof BLOCKS !== 'undefined' && BLOCKS[block] && BLOCKS[block].label)
    ? BLOCKS[block].label : block;
}
function goalDowList(arr){
  if(!arr || arr.length === 0) return '';
  return arr.slice().sort(function(a,b){return (a===0?7:a)-(b===0?7:b);})
            .map(function(d){return SHORT_DOW[d];}).join(', ');
}
function goalRelGrade(g, delta){
  var i = gradeIndex(g);
  if(i < 0) return g;
  var j = Math.max(0, Math.min(GRADE_ORDER.length - 1, i + delta));
  return GRADE_ORDER[j];
}

/* Pick up to n exercises for a capacity, respecting the climber's level. */
function goalPickExercises(block, cat, n){
  var pool = (typeof EX_POOL !== 'undefined' && EX_POOL[block]) ? EX_POOL[block] : [];
  var tier = (typeof getLevelTier === 'function') ? getLevelTier() : 1;
  var m = pool.filter(function(e){
    if(e.cat !== cat) return false;
    if((e.minLevel || 0) > tier) return false;
    if(tier >= 1 && e.phase === 'warmup') return false;
    return true;
  });
  if(m.length === 0) m = pool.filter(function(e){ return e.cat === cat; });
  return m.slice(0, n || 2).map(function(e){
    return { n: e.n, det: e.simple || e.det || '' };
  });
}

/* Orden heurístico de capacidades según disciplina y nivel.
   Es lo que el motor usa cuando NO hay tests — y, desde el arreglo de
   2026-08-07, también para ubicar a las capacidades que el usuario todavía
   no midió cuando sí midió otras. PURA. */
function heuristicOrder(goal, level){
  var g = goal || 'sport';
  var order = g === 'boulder'      ? ['fingerStrength','power','pullStrength']
            : g === 'sport'        ? ['aerobic','fingerStrength','fingerEndurance']
            : g === 'competition'  ? ['fingerStrength','power','aerobic']
            :                        ['fingerStrength','aerobic','power']; /* both */
  if(level === 'beginner') order = order.filter(function(k){ return !capacityBlocked(k, level); }).concat(['pullStrength']);
  return order;
}

/* Capacidades VEDADAS para un nivel — distinto de "no prioritaria".

   A un principiante no se le programa potencia: sin base de fuerza y de
   tejido, el trabajo explosivo es riesgo de lesión sin rendimiento a cambio.

   Esto existe como regla aparte porque `heuristicOrder` no alcanzaba. Al
   escribir el arreglo de la severidad presunta, una capacidad simplemente
   ausente del orden recibía igual el piso de 0.10 — que le ganaba a las
   capacidades MEDIDAS y en buen estado (severidad 0.00-0.06). Resultado: el
   principiante terminaba con potencia en el foco, exactamente lo que la
   regla venía a impedir. Lo cazó el test antes de salir del sandbox.

   Moraleja para la próxima: "no está en la lista" y "está prohibida" no son
   lo mismo, y un piso numérico no distingue entre las dos. PURA. */
function capacityBlocked(key, level){
  return level === 'beginner' && key === 'power';
}

/* Severidad PRESUNTA de una capacidad que el usuario no midió.

   EL BUG QUE ESTO ARREGLA: `severity` salía `null` para toda capacidad sin
   test, y tanto el foco como el diagnóstico filtraban los `null`. Con lo
   cual, apenas el usuario medía CUALQUIER test, la potencia —la única sin
   test— desaparecía del motor. Un boulderista de 7a apuntando a 7c pasaba
   de recibir "fuerza de dedos y potencia" a recibir "base aeróbica y fuerza
   de tracción": medir sus tests le EMPEORABA el consejo, y en la dirección
   más equivocada posible para su disciplina.

   La ausencia de dato no es evidencia de que la capacidad esté bien. Así
   que una capacidad sin medir conserva la prioridad que le da su disciplina
   y compite; pero con valores deliberadamente moderados, para que un test
   real que salga flojo siempre pese más que una presunción. PURA. */
function presumedSeverity(rank){
  if(rank === 0) return 0.30;
  if(rank === 1) return 0.22;
  if(rank === 2) return 0.15;
  return 0.10;   /* fuera del orden de la disciplina: existe, pero no manda */
}

/* Estimate a realistic horizon (weeks) for the grade jump. */
function goalHorizon(gap, level){
  var wpg = ({beginner:6, intermediate:10, advanced:18, elite:30}[level || 'intermediate']) || 10;
  var lo = Math.round(gap * wpg * 0.8);
  var hi = Math.round(gap * wpg * 1.3);
  return lo + '–' + hi + ' semanas de trabajo consistente (estimación; depende de constancia y descanso).';
}

/* THE ENGINE. Returns a plain object describing the roadmap. */
function computeGoalPlan(){
  var cur = U.grade, tgt = U.targetGrade;
  var ci = gradeIndex(cur), ti = gradeIndex(tgt);
  if(!tgt || ti < 0) return { hasTarget:false, currentGrade: cur || null };

  var gap = ti - (ci < 0 ? ti - 2 : ci);
  var res = {
    hasTarget:true, currentGrade:cur, targetGrade:tgt, gap:gap,
    goal:U.goal, level:U.level,
    gymDays:(U.gymDays || []).slice(), rockDays:(U.rockDays || []).slice()
  };
  if(gap <= 0){
    res.reached = true;
    res.message = '¡Ya estás en ' + tgt + ' o por encima! Subí tu meta para seguir progresando.';
    return res;
  }

  var targetLevel = gradeLevel(tgt);
  res.targetLevel = targetLevel;

  var weight = U.weight || 70;
  var usesTests = false;
  var order = heuristicOrder(U.goal, U.level);
  var scored = GOAL_CAPS.map(function(c){
    var sev = null, tieneDato = false;
    if(c.testKey && typeof loadTestHistory === 'function' && typeof TEST_RANGES !== 'undefined'){
      var hist = loadTestHistory(c.testKey);
      tieneDato = !!(hist && hist.length);
      var rng = TEST_RANGES[c.testKey] && TEST_RANGES[c.testKey][targetLevel];
      if(tieneDato && rng){
        usesTests = true;
        var raw = parseFloat(hist[hist.length - 1].v);
        var val = rng.unit === 'ratio' ? (weight > 0 ? raw / weight : 0) : raw;
        sev = rng.mid > 0 ? (rng.mid - val) / rng.mid : 0;
        sev = Math.max(0, Math.min(1, sev));
      }
    }
    var rank = order.indexOf(c.key);
    return {
      cap: c,
      severity: sev,
      measured: sev != null,
      /* medido pero sin norma poblacional: el usuario TIENE el dato, así que
         decir "sin medir" sería mentirle. */
      tracked: tieneDato && sev == null,
      blocked: capacityBlocked(c.key, U.level),
      /* severidad EFECTIVA: la medida si existe, la presunta si no. Es la
         que decide el foco; `severity` sigue siendo sólo lo medido para que
         el diagnóstico no invente números. Una capacidad vedada para el
         nivel queda en 0 y no compite jamás. */
      effective: capacityBlocked(c.key, U.level) ? 0
               : sev != null ? sev
               : presumedSeverity(rank < 0 ? 99 : rank),
      rank: rank < 0 ? 99 : rank
    };
  });
  res.usesTests = usesTests;

  /* Diagnóstico por capacidad, relativo al rango esperado para el grado
     objetivo. Las medidas llevan severidad; las que faltan aparecen igual,
     marcadas como `unmeasured` — antes desaparecían y el usuario no tenía
     forma de saber que el diagnóstico estaba incompleto. */
  res.diagnosis = scored.filter(function(s){
    return s.measured || usesTests;   /* sin ningún test no hay nada que diagnosticar */
  }).map(function(s){
    return {
      label: s.cap.label,
      severity: s.severity,
      measured: s.measured,
      /* Una capacidad vedada no ofrece su test: sugerirle a un principiante
         que mida potencia, después de decirle que no la entrene todavía, es
         una contradicción que el usuario nota. */
      testKey: s.blocked ? null : (s.cap.testKey || null),
      blocked: s.blocked,
      status: s.blocked  ? 'blocked'        /* todavía no toca, por nivel */
            : s.measured ? (s.severity > 0.15 ? 'weak' : (s.severity > 0.001 ? 'ok' : 'strong'))
            : s.tracked  ? 'tracked'        /* hay dato, no hay norma */
            :              'unmeasured'     /* no hay dato */
    };
  });

  var chosen;
  if(usesTests){
    /* Ordena por severidad efectiva, así una capacidad sin medir compite en
       vez de desaparecer. Ante empate gana la medida: un dato real vale más
       que una presunción. */
    var ranked = scored.slice().sort(function(a,b){
      if(b.effective !== a.effective) return b.effective - a.effective;
      if(a.measured !== b.measured) return a.measured ? -1 : 1;
      return a.rank - b.rank;
    });
    chosen = ranked.filter(function(s){ return s.effective > 0.05; }).slice(0, 2);
    if(chosen.length === 0) chosen = ranked.slice(0, 1);
  } else {
    var byKey = {}; scored.forEach(function(s){ byKey[s.cap.key] = s; });
    chosen = order.slice(0, 2).map(function(k){ return byKey[k]; }).filter(Boolean);
  }

  res.focuses = chosen.map(function(s){
    var c = s.cap;
    var reason = GOAL_REASONS[c.key] || '';
    if(usesTests && s.severity != null && s.severity > 0.25){
      reason = 'Tus tests te ubican por debajo de lo que pide ' + tgt + ' acá. ' + reason;
    }
    return {
      key:c.key, label:c.label, block:c.block, severity:s.severity,
      reason:reason, exercises:goalPickExercises(c.block, c.cat, 2)
    };
  });

  var n = res.gymDays.length;
  var blocks = res.focuses.map(function(f){ return goalBlockLabel(f.block); });
  res.gymGuidance = n === 0
    ? 'Configurá tus días de gym para distribuir ' + blocks.join(' y ') + ' con 48h entre sesiones duras de dedos.'
    : 'En tus ' + n + ' día' + (n>1?'s':'') + ' de gym (' + goalDowList(res.gymDays) + '): prioriza ' + blocks[0]
        + (blocks[1] ? ' y, en los días más frescos, ' + blocks[1] : '') + '. Deja 48h entre sesiones duras de dedos.';

  res.rockGuidance = res.rockDays.length === 0
    ? 'Sumá días de roca (o boulder de gimnasio) para transferir la fuerza a escalada real — sin transferencia, los números no suben de grado.'
    : 'En roca (' + goalDowList(res.rockDays) + '): proyectá a ' + tgt + ' para exponerte a la dificultad, y hacé volumen técnico ("mileage") a ' + goalRelGrade(tgt, -2) + '.';

  res.horizon = goalHorizon(gap, U.level);
  res.message = 'Para pasar de ' + cur + ' a ' + tgt + ' (' + gap + ' grado' + (gap>1?'s':'') + '), tu prioridad es '
    + res.focuses.map(function(f){ return f.label.toLowerCase(); }).join(' y ') + '.';
  return res;
}

/* ── Render ───────────────────────────────────────── */
function editGoal(){ if(typeof jumpTo === 'function') jumpTo(2); }

/* Bloque compacto de diagnóstico por capacidad.

   Los cuatro estados que NO son "medido y puntuado" tienen que verse
   distintos. El default caía en `ok` ("En camino"), así que una capacidad
   que el usuario nunca midió se mostraba como si estuviera bien encaminada
   — el sistema afirmando algo que no sabe. */
var GOAL_DIAG_META = {
  weak:       { lbl:'A mejorar',  col:'var(--accent-warning)' },
  ok:         { lbl:'En camino',  col:'var(--accent-caution)' },
  strong:     { lbl:'Sólido',     col:'var(--accent-deload)' },
  tracked:    { lbl:'Seguimiento',col:'var(--text-secondary)' },  /* hay dato, no hay norma */
  unmeasured: { lbl:'Sin medir',  col:'var(--text-muted)' },
  blocked:    { lbl:'Todavía no', col:'var(--text-muted)' }
};
function goalDiagnosisHTML(p){
  if(!p.diagnosis || !p.diagnosis.length) return '';
  var meta = GOAL_DIAG_META;
  var rows = p.diagnosis.map(function(d){
    var m = meta[d.status] || meta.unmeasured;
    return '<div class="goal-diag-row">'
      + '<span class="goal-diag-lbl">' + escapeHtml(d.label) + '</span>'
      + '<span class="goal-diag-tag" style="color:' + m.col + ';border-color:' + m.col + '55">' + m.lbl + '</span>'
      + '</div>';
  }).join('');
  return '<div class="goal-section-t">Tu diagnóstico (vs ' + escapeHtml(p.targetGrade) + ')</div>' + rows;
}

/* How the target reweighted the macrocycle (vs the base sequence). */
function goalMacroNote(focusBlock){
  if(typeof getBasePlanSeq !== 'function' || typeof getPlanSeq !== 'function') return '';
  var base = getBasePlanSeq(), adj = getPlanSeq();
  if(!base.length || !adj.length) return '';
  var cb = base.filter(function(b){ return b === focusBlock; }).length;
  var ca = adj.filter(function(b){ return b === focusBlock; }).length;
  if(ca <= cb) return '';
  return 'Tu macrociclo dedica ' + ca + ' semanas a ' + goalBlockLabel(focusBlock).toLowerCase()
    + ' (' + (ca - cb) + ' más de lo normal, priorizando tu meta).';
}

function renderGoalCard(){
  var el = document.getElementById('goal-card');
  if(!el) return;
  var p = computeGoalPlan();

  if(!p.hasTarget || p.reached){
    var body = p.reached
      ? '<div class="goal-sub">' + escapeHtml(p.message) + '</div>'
      : '<div class="goal-sub">Elegí a qué grado querés llegar y armamos el foco de tu entrenamiento.</div>';
    el.innerHTML =
      '<div class="card glow goal-card-inner">'
      + '<div class="goal-head"><span class="goal-emoji">🎯</span><div class="goal-title">Tu objetivo</div></div>'
      + body
      + '<button class="btn-tint" style="margin-top:12px" onclick="editGoal()">'
      + (p.reached ? 'Subir la meta' : 'Elegir grado objetivo') + '</button>'
      + '</div>';
    return;
  }

  var focusHTML = p.focuses.map(function(f, i){
    var exs = f.exercises.map(function(e){
      return '<div class="goal-ex"><span class="goal-ex-dot"></span><div><div class="goal-ex-n">'
        + escapeHtml(e.n) + '</div>'
        + (e.det ? '<div class="goal-ex-d">' + escapeHtml(e.det) + '</div>' : '')
        + '</div></div>';
    }).join('');
    return '<div class="goal-focus">'
      + '<div class="goal-focus-head"><span class="goal-focus-rank">' + (i+1) + '</span>'
      + '<span class="goal-focus-label">' + escapeHtml(f.label) + '</span>'
      + '<span class="goal-focus-block badge">' + escapeHtml(goalBlockLabel(f.block)) + '</span></div>'
      + '<div class="goal-focus-reason">' + escapeHtml(f.reason) + '</div>'
      + exs + '</div>';
  }).join('');

  var srcNote = p.usesTests
    ? 'Basado en tus tests.'
    : 'Basado en tu nivel y objetivo — <a onclick="goPage(\'plan\')" style="color:var(--accent-primary-d);cursor:pointer">hacé los tests</a> para afinarlo.';

  el.innerHTML =
    '<div class="card glow goal-card-inner">'
    + '<div class="goal-head"><span class="goal-emoji">🎯</span>'
      + '<div class="goal-title">Camino a ' + escapeHtml(p.targetGrade) + '</div>'
      + '<button class="goal-edit" onclick="editGoal()">Editar</button></div>'
    + '<div class="goal-gap"><span class="goal-gap-cur">' + escapeHtml(p.currentGrade || '—') + '</span>'
      + '<span class="goal-gap-arrow">→</span>'
      + '<span class="goal-gap-tgt">' + escapeHtml(p.targetGrade) + '</span>'
      + '<span class="goal-gap-n">' + p.gap + ' grado' + (p.gap>1?'s':'') + '</span></div>'
    + '<div class="goal-msg">' + escapeHtml(p.message) + '</div>'
    + (function(){ var m = p.focuses.length ? goalMacroNote(p.focuses[0].block) : ''; return m ? '<div class="goal-macro">📈 ' + escapeHtml(m) + '</div>' : ''; })()
    + goalDiagnosisHTML(p)
    + '<div class="goal-section-t">Tu foco</div>'
    + focusHTML
    + '<div class="goal-section-t">Cómo usar tus días</div>'
    + '<div class="goal-day"><span class="goal-day-ic">🏋️</span><div>' + escapeHtml(p.gymGuidance) + '</div></div>'
    + '<div class="goal-day"><span class="goal-day-ic">🧗</span><div>' + escapeHtml(p.rockGuidance) + '</div></div>'
    + '<div class="goal-horizon">⏱ Horizonte estimado: ' + escapeHtml(p.horizon) + '</div>'
    + '<div class="goal-src">' + srcNote + '</div>'
    + '</div>';
}

