/* ======================================================
   data/glossary.js -- Glosario de términos técnicos (tooltips) + nombres de sistemas.
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

/* GLOSSARY - technical terms for tap-to-explain tooltips.
   Key = exact term (case-insensitive matching).
   Used by render-utils.js makeTerm() and click-to-show popover. */
var GLOSSARY = {
  'An Cap':        'Capacidad anaeróbica láctica. Sistema que sostiene 5-20 movimientos intensos (30s-2min) usando glucosa sin oxígeno. Genera lactato. (Feehally, Beastmaking cap.23)',
  'An Pow':        'Potencia anaeróbica alactica. Sistema que activa 1-5 movimientos máximos usando ATP. Recuperación 3-5 min entre intentos. (Barrows cap.2.5)',
  'Aero Cap':      'Capacidad aeróbica. Sistema con oxígeno que sostiene esfuerzos largos a intensidad baja-media. Base para recuperarse entre intentos. (Barrows cap.2.2)',
  'Aero Pow':      'Potencia aeróbica (Power Endurance). 20-40 movimientos a intensidad alta sin pump terminal. Es la "resistencia con intensidad". (Barrows cap.2.4)',
  'ARC':           'Aerobic Restoration and Capillarisation. Escalada continua suave 20-40 min para mejorar capilarización y umbral aeróbico. (Power Company)',
  'SAID':          'Specific Adaptation to Imposed Demands. El cuerpo se adapta SOLO al estímulo específico que se le da. Por eso entrenar para boulder ≠ entrenar para vía.',
  'RFD':           'Rate of Force Development. Velocidad con que el músculo genera fuerza máxima en los primeros 200ms. Crítico para movimientos explosivos en boulder.',
  'CNS':           'Sistema Nervioso Central. Tarda 48-72h en recuperarse después de sesiones de máxima intensidad (campus, max hangs). Más lento que el músculo.',
  'CF':            'Critical Force. Carga máxima sostenible indefinidamente por los flexores digitales (Giles et al. 2019). Mide tu umbral aeróbico local.',
  'TTF':           'Time To Failure. Tiempo total hasta el fallo en un test de resistencia. Métrica clave para repeaters y Critical Force.',
  'Fader':         'Escala de intensidad 1-10 (Lattice Training). Fader 3-5 = suave, 6-8 = duro, 9-10 = máximo. Calibra qué tan exigente debe ser la sesión.',
  'macrociclo':    'Ciclo de entrenamiento completo (4-10 semanas) con fases en secuencia. Termina en un peak de rendimiento. (Bompa cap.10)',
  'mesociclo':     'Fase dentro del macrociclo (1-4 semanas) con un objetivo único: fuerza máxima, potencia, resistencia, etc.',
  'microciclo':    'Una semana de entrenamiento. La unidad mínima de planificación.',
  'deload':        'Semana de baja carga (volumen -50%) que permite que ocurra la supercompensación. Es DONDE realmente mejorás, no entrenando.',
  'pump':          'Acumulación de lactato y sangre en antebrazos. Genera la sensación de "ladrillo". Manejable = OK, oclusivo = fallo inminente.',
  'redpoint':      'Encadenar una vía después de practicarla (con falls/intentos previos). Es el grado "máximo" en escalada deportiva.',
  'onsight':       'Subir una vía a primer intento sin información ni intentos previos. Es 2-3 grados más difícil que redpoint.',
  'beta':          'Información sobre cómo hacer un movimiento o secuencia. "Tengo la beta" = sé la solución.',
  'crimp':         'Tipo de agarre con dedos cerrados (full crimp) o semi-cerrados (half crimp). El half-crimp es más seguro para tendones.',
  'half-crimp':    'Agarre con primera falange a 90°, segunda extendida, pulgar al lado. Es el "default" para max hangs (Feehally cap.8).',
  'sloper':        'Presa redondeada sin canto que se agarra con la palma abierta. Depende mucho de fricción y posición corporal.',
  'pinch':         'Presa que se agarra con el pulgar opuesto a los otros dedos. Trabaja musculatura distinta al crimp.',
  'campus':        'Tablero con listones de madera para escalar sin pies. Entrena potencia y RFD. Solo intermedios+ con tendones adaptados.',
  'hangboard':     'Tablero de regletas y agarres para colgarse. Herramienta principal de fuerza de dedos.',
  'fingerboard':   'Sinónimo de hangboard.',
  '4x4':           'Protocolo de Power Endurance: 4 boulders seguidos sin descanso × 4 sets con 4-5 min entre sets. (Lattice / Barrows)',
  'repeater':      'Protocolo de resistencia: ciclos 7s tensión / 3s descanso al 60% del 1RM. Mide TTF.',
  'max hang':      'Suspensión máxima de 7-10s a la carga más alta que podés sostener con técnica perfecta. Test y entrenamiento de fuerza pura.',
  'RPE':           'Rate of Perceived Exertion. Escala 1-10 de cuán duro percibiste la sesión. RPE 8+ = sesión exigente; RPE <5 = fácil/recuperación.',
  'HRV':           'Heart Rate Variability. Variación entre latidos. HRV alta = sistema nervioso recuperado. Indicador objetivo de readiness.',
  'supercompensación':'Mejora real del cuerpo que ocurre durante el descanso DESPUÉS del estímulo. Es por esto que el deload es obligatorio.',
  'overreaching':  'Estado de fatiga acumulada por entrenar más de lo que el cuerpo puede absorber. Recuperable con deload de 1-2 semanas.',
  'sobreentrenamiento':'Estado crónico de overreaching no resuelto. Requiere semanas/meses para revertir. Síntomas: fatiga, insomnio, lesiones.',
  'tendinopatía':  'Lesión por sobreuso de tendones (poleas, codo, etc.). Causa #1: progresión muy rápida. Prevención: deload y carga gradual.'
};
