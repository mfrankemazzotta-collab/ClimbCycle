/* ======================================================
   data/blocks.js -- Bloques/fases de entrenamiento (BLOCKS) + info científica por fase (BSCI).
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

var BLOCKS={
  strength: {
    label:'Fuerza',      col:'#38BDF8', emo:'Fuerza',
    sessionType:'Go Hard',
    dial:'Intensivo',
    faderRange:'8-10',
    faderDesc:'Intensidad máxima. Detener ante primer signo de fatiga neuromuscular.',
    goalFocus:{sport:'Fuerza de dedos + traccion para gestionar crux en rutas',
               boulder:'Fuerza máxima de contacto y reclutamiento explosivo',
               both:'Base de fuerza bilateral para transferir a ruta y bloque',
               competition:'Pico de fuerza dirigido a fecha objetivo'}
  },
  power:    {
    label:'Potencia',    col:'#9B6EFF', emo:'Potencia',
    sessionType:'Go Hard',
    dial:'Intensivo',
    faderRange:'9-10',
    faderDesc:'Fresqueza neuromuscular absoluta. Mínimo 48h entre sesiones.',
    goalFocus:{sport:'Potencia para movimientos crux y secuencias explosivas en roca',
               boulder:'Potencia máxima de contacto y RFD en primeros 200ms',
               both:'Potencia explosiva aplicada a boulder y rutas cortas duras',
               competition:'Pico de potencia afinado para el formato de competición'}
  },
  endurance:{
    label:'Resistencia', col:'#F472B6', emo:'Resist.',
    sessionType:'Do More',
    dial:'Extensivo',
    faderRange:'3-7',
    faderDesc:'Volumen alto, intensidad moderada. Si hay bombeo oclusivo: reducir dificultad.',
    goalFocus:{sport:'Power endurance para gestionar rutas largas sin descanso',
               boulder:'Capacidad anaeróbica para encadenar secuencias de boulder',
               both:'Base aeróbica + power endurance para ambas disciplinas',
               competition:'Resistencia específica al formato: final corta o larga'}
  },
  deload:   {
    label:'Deload',      col:'#00E5A0', emo:'Deload',
    sessionType:'Explore',
    dial:'Extensivo suave',
    faderRange:'2-4',
    faderDesc:'Supercompensacion. Volumen -50%. Prohibido llegar al fallo.',
    goalFocus:{sport:'Técnica en grados faciles + movilidad + antagonistas',
               boulder:'Refinamiento motor en grados bajos + movilidad',
               both:'Recuperación activa + trabajo técnico sin fatiga',
               competition:'Tapering: máxima especificidad, volumen mínimo'}
  },
  rest:     {label:'Descanso',    col:'#444466', emo:'--', sessionType:'Rest',   dial:'',faderRange:'',faderDesc:''},
  test:     {label:'Test',        col:'#FFB800', emo:'Test',sessionType:'Test',  dial:'',faderRange:'',faderDesc:''}
};

/* BSCI - Background Scientific Information for each phase.
   Sources:
   - Bompa & Buzzichelli (Periodization Training for Sports, Human Kinetics 2015):
     framework canonico AA > MxS > Conversion to Power > Maintenance > Transition.
   - Horst (Training for Climbing, 2016): macrociclo 4-3-2-1 aplicado a escalada.
   - Barrows (Training for Sport Climbing, 2014): los 5 sistemas energeticos
     en escalada y protocolos por bloque (An Cap 12-15 movs/2-4x rest, Aero Pow
     ~30 movs/rest=work, Aero Cap 10+ min sostenido).
   - Tkacz (Training102, 2019): regla de las 5 semanas, prioridad Strength>Power.
   - Feehally (Beastmaking, 2020): fingerboarding variables, max hangs 10s
     half-crimp, "tendons don't like surprises", "consistency over intensity".
   - Lattice Training, Anderson (RCTM 2014), Giles et al. (2019 - Critical Force). */
var BSCI={
  strength:'FASE GO HARD (Dial: Intensivo | Fader: 8-10). '
    +'Fuentes: Bompa cap.13 (Maximum Strength) + Horst + Tkacz (Training102 cap.3) + Barrows + Feehally (Beastmaking cap.7-12). '
    +'Bompa: la fuerza máxima (MxS) requiere 6+ semanas de carga progresiva con buffer descendente. '
    +'Barrows: en TODAS las fases de escalada hay sesiones de fuerza (base 4x semanales, peak 3x). '
    +'Principio SAID: el cuerpo solo se adapta al estres específico que le imponemos. '
    +'Prioriza UN sistema por sesión: fuerza máxima de dedos (Max Hangs 10s/20mm half-crimp según Feehally) + traccion (3-5RM pull-ups). '
    +'Tkacz: la fase de fuerza SIEMPRE va antes de potencia - construye los tejidos que luego la potencia activa (Bompa: "Conversion to Power"). '
    +'Detener la sesión ante el PRIMER signo de fatiga neuromuscular o perdida de precision. '
    +'Feehally: "tendons don\'t like surprises" - los tendones digitales adaptan 3x más lento que el musculo.',

  power:'FASE GO HARD (Dial: Intensivo | Fader: 9-10). '
    +'Fuentes: Bompa cap.14 (Conversion to Specific Strength) + Tkacz + Barrows + Power Company. '
    +'Sistema anaeróbico alactico (ATP) - 1 a 5 movimientos máximos (Barrows cap.2.5). '
    +'Bompa: esta es la fase de "Conversion" - la fuerza acumulada se convierte en cualidad sport-específica (potencia explosiva). '
    +'Tkacz: "es neurologica - ensena al SNC a reclutar rapido". Requiere frescura neuromuscular absoluta: mínimo 48h entre sesiones. '
    +'Barrows protocolo An Pow: 5-7 movs, rest <= work, 4 reps x 4 sets, 10 min entre sets. '
    +'Boulder: prioriza RFD (Rate of Force Development) en los primeros 200ms del movimiento (campus, max throws, dynos). '
    +'Sport: potencia para gestionar crux aislados en secuencias largas. '
    +'CONFLICTO DIRECTO con Power Endurance: no mezclar en la misma sesión (acidosis canibaliza ganancias de fuerza).',

  endurance:'FASE DO MORE (Dial: Extensivo | Fader: 3-7 subiendo a 8-10 en bloques finales). '
    +'Fuentes: Barrows (cap.2.2-2.5) + Horst + Feehally (Beastmaking cap.23-25 Energy Systems) + Bompa cap.3 (Energy Systems Training). '
    +'Barrows distingue 4 sistemas en el bloque "resistencia": '
    +'(1) AERO CAP / ARC: 10-40 min continuo con bombeo ligero - "deberias poder mantener conversacion" (Feehally). '
    +'(2) AN CAP: 12-15 movs (30-40s), rest 2-4x trabajo, 8-10 reps - "powered out, no pumped" (Barrows cap.5.2). '
    +'(3) AERO POW: ~30 movs (45-120s), rest = trabajo, 8 reps - "arm shattering pump" (Barrows cap.5.3). '
    +'(4) AN POW: 5-7 movs, rest muy corto, 4x4 - "instant power fade". '
    +'Barrows: An Cap alto sin base Aero Cap = mal rendimiento. Hay que entrenar Aero Cap MIENTRAS se entrena An Cap.',

  deload:'FASE EXPLORE (Dial: Extensivo suave | Fader: 2-4). '
    +'Fuentes: Bompa cap.15 (Maintenance/Cessation/Compensation) + Horst + Tkacz (regla de las 5 semanas). '
    +'Bompa: la fase de "Compensacion" es activa - no es inactividad. Reduce volumen pero preserva intensidad relativa. '
    +'Tkacz: "estudios en medicina deportiva muestran que 5 semanas es el limite que el cuerpo soporta antes de que el progreso decaiga y el riesgo de lesión aumente exponencialmente". '
    +'La supercompensacion - el momento donde el cuerpo realmente mejora - ocurre AQUÍ, no entrenando. '
    +'Reducir volumen 50% manteniendo intensidad relativa. Prohibido llegar al fallo muscular. '
    +'Objetivo: refinamiento motor intencional (Explore), movilidad, antagonistas. '
    +'Los tendones adaptan más lento que el musculo: sin deload, el plan es precursor de lesiones cronicas.',

  test:'Punto A - Evaluación inicial (Bompa cap.10 + Lattice + Feehally Beastmaking cap.34 Fingerboarding Progress). '
    +'Sin datos precisos del punto de partida, cualquier planificación es una conjetura. '
    +'Tests recomendados: Max Hangs 10s/20mm half-crimp (fuerza dedos), 3RM pull-ups (traccion), Repeaters 7:3 al 60% (resistencia), Critical Force (Giles 2019). '
    +'Feehally: "neuromuscular adaptations come fast at first, then strength gains slow down" - los tests detectan en que fase de adaptación estas. '
    +'Bompa: los tests al inicio y al fin de cada macrociclo permiten calibrar la carga del próximo ciclo.',

  rest:'El descanso es donde sucede la adaptación. El SNC tarda significativamente más en recuperarse que la musculatura periferica. '
    +'Alternar descanso total con recuperación activa (escalada técnica de muy baja intensidad). '
    +'Horst: sin respeto a los tiempos de recuperación, el plan es precursor de lesiones cronicas. '
    +'Bompa cap.4 (Fatigue and Recovery): la recuperación incompleta lleva a "overreaching" funcional, y eventualmente al sobreentrenamiento. '
    +'Feehally (Beastmaking cap.34): "consistency over intensity" - 1 sesión semanal sostenida vale más que rachas intensas seguidas de parones.'
};
