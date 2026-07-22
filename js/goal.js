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
  {key:'power',          label:'Potencia',                   testKey:null,            block:'power',     cat:'power'}
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
  var scored = GOAL_CAPS.map(function(c){
    var sev = null;
    if(c.testKey && typeof loadTestHistory === 'function' && typeof TEST_RANGES !== 'undefined'){
      var hist = loadTestHistory(c.testKey);
      var rng = TEST_RANGES[c.testKey] && TEST_RANGES[c.testKey][targetLevel];
      if(hist && hist.length && rng){
        usesTests = true;
        var raw = parseFloat(hist[hist.length - 1].v);
        var val = rng.unit === 'ratio' ? (weight > 0 ? raw / weight : 0) : raw;
        sev = rng.mid > 0 ? (rng.mid - val) / rng.mid : 0;
        sev = Math.max(0, Math.min(1, sev));
      }
    }
    return { cap:c, severity:sev };
  });
  res.usesTests = usesTests;

  var chosen;
  if(usesTests){
    var withSev = scored.filter(function(s){ return s.severity != null; })
                        .sort(function(a,b){ return b.severity - a.severity; });
    chosen = withSev.filter(function(s){ return s.severity > 0.05; }).slice(0, 2);
    if(chosen.length === 0) chosen = withSev.slice(0, 1);
  } else {
    var g = U.goal || 'sport';
    var order = g === 'boulder'      ? ['fingerStrength','power','pullStrength']
              : g === 'sport'        ? ['aerobic','fingerStrength','fingerEndurance']
              : g === 'competition'  ? ['fingerStrength','power','aerobic']
              :                        ['fingerStrength','aerobic','power']; /* both */
    if(U.level === 'beginner') order = order.filter(function(k){ return k !== 'power'; }).concat(['pullStrength']);
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
    + '<div class="goal-section-t">Tu foco</div>'
    + focusHTML
    + '<div class="goal-section-t">Cómo usar tus días</div>'
    + '<div class="goal-day"><span class="goal-day-ic">🏋️</span><div>' + escapeHtml(p.gymGuidance) + '</div></div>'
    + '<div class="goal-day"><span class="goal-day-ic">🧗</span><div>' + escapeHtml(p.rockGuidance) + '</div></div>'
    + '<div class="goal-horizon">⏱ Horizonte estimado: ' + escapeHtml(p.horizon) + '</div>'
    + '<div class="goal-src">' + srcNote + '</div>'
    + '</div>';
}

