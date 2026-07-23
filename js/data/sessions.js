/* ======================================================
   data/sessions.js -- Anatomía de sesión: calentamiento universal, estructura por bloque, progresión semanal, suplementarios.
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

/* ────────────────────────────────────────────────────
   SESSION_STRUCTURE — phase templates with time ratios
   Each block has 5 phases. The ratios are proportions of
   total session time (U.session). Scientific basis:
   - Lattice Training session anatomy
   - Anderson (RCTM ch.8): session organization
   - Horst (2016): warm-up importance (~15-20% of session)
──────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────
   UNIVERSAL_WARMUP — universal warm-up template
   Same for all training blocks. NOT a training stimulus.
   
   Scientific basis:
   - Horst (2016): warm-up must be progressive, NOT the training modality.
     ARC at 40-50% IS training, not warm-up.
   - Anderson (RCTM): warm-up with same modality creates pre-fatigue
     and reduces training quality.
   - Lattice Training: ~15 min progressive activation.
   
   Structure: pulse-raise -> mobility -> finger activation -> easy climbing
──────────────────────────────────────────────────── */
var UNIVERSAL_WARMUP = [
  {
    n: 'Pulso y temperatura',
    nota: '5 min',
    det: 'Saltar la soga, jumping jacks, trote suave o burpees lentos. Subir el pulso progresivamente sin agotar. Objetivo: temperatura corporal y flujo sanguineo a los musculos.',
    fatigue: 1,
    cat: 'warmup'
  },
  {
    n: 'Movilidad articular',
    nota: '3-5 min',
    det: 'Muñecas (circulos en ambos sentidos), codos, hombros (passes con palo o banda), columna toracica, caderas, tobillos. Sin estiramiento estático - solo movilidad dinámica.',
    fatigue: 1,
    cat: 'warmup'
  },
  {
    n: 'Activacion de dedos',
    nota: '3 series progresivas',
    det: '3 cuelgues progresivos en jugs de 8-10s cada uno con 1 min entre series. Si tenes regleta grande (>25mm), podes hacer 1 serie suave allí. NO al limite - solo activacion neural.',
    fatigue: 2,
    cat: 'warmup'
  },
  {
    n: 'Escalada progresiva',
    nota: '8-12 min',
    det: 'Boulder o vías muy faciles. Empezar 2-3 grados debajo de tu limite, subir progresivamente. Objetivo: lubricar articulaciones, ensayar movimientos, calentar dedos. PARAR antes de cualquier sensacion de bombeo.',
    fatigue: 2,
    cat: 'warmup'
  }
];

var SESSION_STRUCTURE = {
  strength: {
    label: 'Sesión de fuerza',
    phases: [
      {id:'warmup',  label:'Calentamiento',         ratio:0.18, col:'#FFB800',
       desc:'Movilidad, activacion y boulder fácil progresivo. Imprescindible antes de cargas máximas.'},
      {id:'main',    label:'Entrenamiento principal',ratio:0.50, col:'#38BDF8',
       desc:'Máxima intensidad neuromuscular. Detener ante perdida de precision o fatiga (Anderson RCTM).'},
      {id:'supp',    label:'Escalada suplementaria',ratio:0.20, col:'#7070AA',
       desc:'Boulder al 70-80% del limite. 4-6 problemas. NO ir al fallo. Aplicar la fuerza recien entrenada.'},
      {id:'condi',   label:'Acondicionamiento',     ratio:0.07, col:'#9B6EFF',
       desc:'Antagonistas y core ligero. Solo si queda energía (Horst: prevencion lesiones).'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.05, col:'#00E5A0',
       desc:'Cuelgues pasivos suaves y estiramiento de antebrazos.'}
    ]
  },
  power: {
    label: 'Sesión de potencia',
    phases: [
      {id:'warmup',  label:'Calentamiento',         ratio:0.20, col:'#FFB800',
       desc:'Calentamiento EXTENSO antes de movimientos explosivos. Activacion progresiva del SNC.'},
      {id:'main',    label:'Entrenamiento principal',ratio:0.45, col:'#9B6EFF',
       desc:'Movimientos al 100%. Descanso completo entre intentos (3-5 min). Frescura absoluta.'},
      {id:'supp',    label:'Escalada suplementaria',ratio:0.20, col:'#7070AA',
       desc:'Boulder dinámico moderado. 4-5 problemas. Calidad sobre cantidad.'},
      {id:'condi',   label:'Acondicionamiento',     ratio:0.08, col:'#9B6EFF',
       desc:'Antagonistas. Core con enfasis en transferencia explosiva.'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.07, col:'#00E5A0',
       desc:'Movilidad y descompresion. Especial atención a hombros y dedos.'}
    ]
  },
  endurance: {
    label: 'Sesión de resistencia',
    phases: [
      {id:'warmup',  label:'Calentamiento',         ratio:0.15, col:'#FFB800',
       desc:'Calentamiento moderado. Subir progresivamente la frecuencia cardiaca.'},
      {id:'main',    label:'Entrenamiento principal',ratio:0.35, col:'#F472B6',
       desc:'ARC, circuitos o 4x4 según el protocolo del día. Mantener forma técnica.'},
      {id:'supp',    label:'Volumen de escalada',   ratio:0.35, col:'#7070AA',
       desc:'GRAN volumen de escalada continua a intensidad moderada. El grueso del estimulo aeróbico (Barrows 2013).'},
      {id:'condi',   label:'Acondicionamiento',     ratio:0.08, col:'#9B6EFF',
       desc:'Trabajo de antagonistas ligero. Mantenimiento.'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.07, col:'#00E5A0',
       desc:'Cuelgues pasivos y estiramiento. Recuperación activa.'}
    ]
  },
  deload: {
    label: 'Sesión de deload',
    phases: [
      {id:'warmup',  label:'Movilidad inicial',     ratio:0.25, col:'#FFB800',
       desc:'Movilidad articular completa. Sin cargas.'},
      {id:'main',    label:'Técnica',               ratio:0.50, col:'#00E5A0',
       desc:'Skill work intencional en grados muy faciles. PROHIBIDO llegar al fallo (Anderson RCTM).'},
      {id:'condi',   label:'Antagonistas',          ratio:0.15, col:'#9B6EFF',
       desc:'Equilibrio muscular. Push, rotaciones externas, core.'},
      {id:'cooldown',label:'Estiramiento profundo', ratio:0.10, col:'#00E5A0',
       desc:'Estiramiento largo. Trabajo respiratorio. Recuperación del SNC.'}
    ]
  },
  test: {
    label: 'Sesión de test',
    phases: [
      {id:'warmup',  label:'Calentamiento específico',ratio:0.30, col:'#FFB800',
       desc:'Calentamiento EXTENSO para garantizar máximo rendimiento sin lesión.'},
      {id:'main',    label:'Tests',                 ratio:0.55, col:'#FFB800',
       desc:'Ejecutar tests con técnica estricta. Cronometro y registro exacto.'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.15, col:'#00E5A0',
       desc:'Movilidad y recuperación. Sin trabajo adicional.'}
    ]
  }
};

/* Goal-specific supplementary content suggestions */
/* ─────────────────────────────────────────────────────
   WEEK_PROGRESSION — intra-phase progressive overload.
   For each exercise category, returns the stage (intro/build/peak/overreach)
   based on how deep into the phase the week is. The "mod" string is shown
   as a chip in the exercise card so the user has a concrete week-by-week
   target instead of a static prescription that repeats unchanged.

   Sources: Bompa periodization (Wave loading, MxS phase),
   Lattice (block periodization week-stages), Anderson RCTM (linear
   strength progression: intro 70%, build 75-80%, peak 85%+).
   ───────────────────────────────────────────────────── */
var WEEK_PROGRESSION = {
  /* `load` = fraction of the climber's measured max (Max Hang for finger,
     3RM for pull) used by intensity.js/getCategoryLoad to print the concrete
     kg target on the card. Midpoints of the % ranges named in `mod`. */
  finger_strength: [
    {stage:'intro',     tag:'Sem 1 · Intro',     load:0.70,  mod:'Carga al 70% de tu máx. Buffer 3s pleno. Adaptación de tendones.'},
    {stage:'build',     tag:'Sem 2 · Build',     load:0.79,  mod:'Carga al 78-80% de tu máx. Buffer 2-3s. Misma serie/rep.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      load:0.875, mod:'Carga al 85-90%. Buffer 1-2s. Si fallás en serie 5, esa es tu data.'},
    {stage:'overreach', tag:'Sem 4 · Sobrecarga',load:0.925, mod:'Carga al 90-95%. Buffer 0-1s. La próxima semana es deload o cambio de fase.'}
  ],
  pull_strength: [
    {stage:'intro',     tag:'Sem 1 · Intro',     load:0.90,  mod:'1 rep menos que tu máx limpio. Foco en bajada lenta (3s).'},
    {stage:'build',     tag:'Sem 2 · Build',     load:0.97,  mod:'Reps al máximo limpio. Si llegás a 5 limpias, agregá 2.5kg la próxima.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      load:1.00,  mod:'+2.5kg vs sem 2, o +1 rep si todavía sin lastre. RPE 9.'},
    {stage:'overreach', tag:'Sem 4 · Sobrecarga',load:1.03,  mod:'+5kg total respecto a sem 1. Una serie adicional si la calidad lo permite.'}
  ],
  power: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'Al 80% de tu límite. Calidad de movimiento > intensidad.'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'Al 90% del límite. Buffer mínimo pero sin fallo técnico.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'Al 100%. Intentá proyectos. Falla aceptable en últimos intentos.'}
  ],
  campus_board: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'Saltos 1→2 en regletas grandes. 3 series por mano.'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'Saltos 1→3 o regletas medias. 4 series por mano.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'Saltos largos al límite o agarres pequeños. 4-5 series máximas.'}
  ],
  aerobic_endurance: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'20 min continuos sin pump perceptible. Foco en respiración y eficiencia.'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'25 min continuos. Pump apenas sostenible.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'30 min continuos, o 2 bloques de 20 con 5 min entre medio.'},
    {stage:'overreach', tag:'Sem 4 · Volumen',   mod:'2 bloques de 25 min con 5-8 min de descanso. Volumen total +50% vs sem 1.'}
  ],
  power_endurance: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'2-3 sets. Descanso 3 min entre sets (largo).'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'4 sets. Descanso 2 min entre sets.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'4 sets con boulders/rutas más duras. Mismo descanso de sem 2.'}
  ],
  wall_training: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'Al 70% del límite. Volumen completo, foco técnica.'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'Al 78-80% del límite. Volumen completo.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'Al 85-90%. Fallar 1-2 intentos es señal correcta de intensidad.'}
  ],
  mobility: [
    {stage:'maintain',  tag:'Mantener',          mod:'Volumen estándar. Calidad sobre cantidad. No fuerces ROM.'}
  ],
  technique: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'Grados muy fáciles (-2 del flash). Foco en footwork y posición.'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'Grados medios. Foco en eficiencia y respiración.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'Aplicar técnica al grado de proyecto. Sin forzar resultado.'}
  ]
};

var SUPP_CONTENT = {
  sport: {
    strength: 'Rutas al 75-85% del limite. 3-5 vías. Foco: aplicar la fuerza recien entrenada en rutas.',
    power:   'Boulder dinámico o rutas con crux duro. 4-6 intentos calidad.',
    endurance:'Vías largas continuas o link-ups. 30-45 min escalada continua. El estimulo principal.'
  },
  boulder: {
    strength: 'Boulder al 70-80% del limite. 4-6 problemas que completes. NO al fallo.',
    power:   'Boulder dinámico, dynos, lanzamientos. 5-8 intentos. Calidad máxima.',
    endurance:'Circuitos de boulder enlazados. 30-40 min volumen moderado.'
  },
  both: {
    strength: 'Boulder al 75% + 2 vías moderadas. Combinación balanceada.',
    power:   'Boulder dinámico (4 problemas) + 1 ruta con crux duro.',
    endurance:'Circuitos + vías continuas alternados.'
  },
  competition: {
    strength: 'Específico al formato de tu competición (boulder o lead).',
    power:   'Boulder al formato de competición. Lectura rapida + ejecución.',
    endurance:'Vías o circuitos al formato de competición. Tiempos reales.'
  }
};
