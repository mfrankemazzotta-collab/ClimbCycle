/* ======================================================
   data.js -- Static training data tables
   ClimbCycle v5
   No functions, no DOM access, no side effects.
====================================================== */

var GLBL={sport:'Escalada en Roca',boulder:'Boulder',both:'Mixto',competition:'Competición'};

var LLBL={beginner:'Principiante',intermediate:'Intermedio',advanced:'Avanzado',elite:'Elite'};

var DLG=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

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

var BLOCK_FATIGUE = {
  strength:  'HIGH',    /* max hangs, limit bouldering  -  48-72h CNS */
  power:     'HIGH',    /* campus, dynamic  -  same CNS demand */
  endurance: 'MED',     /* circuits, ARC  -  24-36h */
  deload:    'LOW',     /* technique, antagonists  -  12-24h */
  test:      'HIGH',
  rest:      'NONE'
};

/* Minimum recovery hours before repeating tier */

var MIN_GAP_H = {HIGH:48, MED:24, LOW:12, NONE:0};

/* RPE 0-10 (Borg modificada) con equivalencia RIR (reps/segundos en reserva).
   Fuente: pasoclave (cuantificación de intensidad RIR/RPE/CE). Los escaladores
   con experiencia pasan la mayor parte del trabajo de FUERZA en RPE 8 (RIR ~2);
   RPE 9-10 queda para proyecto de búlder o suspensiones muy breves al límite. */
var SL_RPE_LABELS={2:'Muy suave · ARC/recuperación (RIR 8+)',4:'Suave · técnica (RIR ~5)',6:'Moderada · circuitos (RIR ~4)',8:'Dura · fuerza/hangboard — zona óptima (RIR 2)',10:'Máxima · al fallo/proyecto (RIR 0)'};

var GRADES={
  beginner:    ['4','4+','5','5+','6a','6a+'],
  intermediate:['6a','6a+','6b','6b+','6c','6c+'],
  advanced:    ['7a','7a+','7b','7b+','7c','7c+'],
  elite:       ['8a','8a+','8b','8b+','8c','8c+','9a']
};

/* Canonical ordered French grade scale — single source of truth for the
   goal engine (gap between current and target grade). */
var GRADE_ORDER=['4','4+','5','5+','6a','6a+','6b','6b+','6c','6c+',
  '7a','7a+','7b','7b+','7c','7c+','8a','8a+','8b','8b+','8c','8c+','9a','9a+','9b'];
function gradeIndex(g){
  if(!g) return -1;
  return GRADE_ORDER.indexOf(String(g).toLowerCase().replace(/\s/g,''));
}
/* Which level tier a grade belongs to (for calibrating expectations). */
function gradeLevel(g){
  var i=gradeIndex(g);
  if(i<0) return 'intermediate';
  if(i<=gradeIndex('6a+')) return 'beginner';
  if(i<=gradeIndex('6c+')) return 'intermediate';
  if(i<=gradeIndex('7c+')) return 'advanced';
  return 'elite';
}

/*
  TESTS  -  Assessment battery only.
  Scientific basis:
  - Horst (2016): max hang test as primary finger strength metric
  - Anderson (RCTM 2014): 3RM pull-up for pulling strength baseline
  - Giles et al. (2019): critical force as aerobic threshold proxy
  - Lattice Training: repeater test for finger endurance capacity
  - Bechtel (2019): movement quality + grade as holistic performance test
  - Power Company: RPE-calibrated max bouldering grade

  NOT included as tests (they are TRAINING methods):
  - 4x4 boulders -> Aero Pow training protocol (Barrows 2013)
  - ARC traversing -> Aero Cap training protocol
  - Campus board -> power training stimulus
  - Arousal measurement -> monitoring tool, not a test
*/

var TESTS=[
  {
    id:'hang',
    title:'Test de fuerza máxima (Max Hang)',
    category:'finger_strength',
    diff:'Intermedio',
    col:'#38BDF8',
    freq:'Cada 4-6 semanas',
    how:'1) Calienta 20 min de escalada suave más 5 min de hangs progresivos. 2) Colgate de una regleta de 20mm en medio crimp. 3) Anadi peso hasta el máximo que puedas sostener exactamente 10 segundos sin soltar. 4) Descansa 5 min y repite para confirmar. 5) Anota: peso corporal + lastre = tu mark. Requisito antes de colgar con lastre (Eva Lopez): aguantar 20mm >40s y 10mm >15s a peso corporal, tener base previa en regleta y +2 años de escalada sistematica. Si no llegas: primero un ciclo de suspensiones a peso corporal.',
    mide:'Fuerza isométrica máxima de dedos (N/kg relativo)',
    unit:'kg totales (tu peso + lastre)',
    result_key:'hang_max',
    result_label:'Ej: 75 (si pesas 70 y aguantas +5kg)',
    interpret: function(v,level,weight){
      var kg=parseFloat(v);if(isNaN(kg)||kg<=0)return null;
      var ratio=weight>0?kg/weight:0;
      if(level==='beginner'){
        if(ratio<0.9)  return {txt:'Tu fuerza digital esta en etapa inicial  -  completamente normal para tu nivel. El objetivo es llegar a aguantar tu peso corporal.',   col:'#7070AA',icon:'&#x1F4CA;',adj:-15};
        if(ratio<1.1)  return {txt:'Buena progresión. Colgarte con tu peso corporal es el primer hito importante según Horst.',                                           col:'#00E5A0',icon:'&#x2705;', adj:0};
        return             {txt:'Fuerza digital por encima del promedio para principiante. Puedes progresar a regletas más pequeñas.',                                   col:'#CCFF00',icon:'&#x26A1;',adj:10};
      }
      if(level==='intermediate'){
        if(ratio<1.1)  return {txt:'La fuerza digital esta por debajo del rango intermedio esperado  -  prioriza la fase de fuerza antes de potencia.',                    col:'#FF4D6A',icon:'&#x26A0;',adj:-20};
        if(ratio<1.3)  return {txt:'Fuerza digital en rango normal para intermedio. Buen punto de partida.',                                                             col:'#00C8FF',icon:'&#x2705;', adj:0};
        if(ratio<1.5)  return {txt:'Fuerza digital solida para intermedio. Puedes enfocarte más en potencia y resistencia.',                                             col:'#00E5A0',icon:'&#x2705;', adj:5};
        return             {txt:'Fuerza digital alta para tu nivel  -  ojo con la potencia y la resistencia si son tu limitante.',                                         col:'#CCFF00',icon:'&#x26A1;',adj:10};
      }
      if(ratio<1.3)    return {txt:'Fuerza digital por debajo del rango esperado para escaladores avanzados. Ciclo de base prioritario.',                                col:'#FF4D6A',icon:'&#x26A0;',adj:-20};
      if(ratio<1.6)    return {txt:'Fuerza digital competente. Foco en especificidad y progresión de carga.',                                                            col:'#00C8FF',icon:'&#x2705;', adj:0};
      return               {txt:'Fuerza digital alta  -  potencia y resistencia de dedos pueden ser el siguiente limitante.',                                              col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
  },
  {
    id:'pullup3rm',
    title:'Test de fuerza de traccion (3RM Pull-up)',
    category:'pulling_strength',
    diff:'Fácil',
    col:'#9B6EFF',
    freq:'Cada 4-6 semanas',
    how:'1) Calienta con 10 min de movimiento suave y 2 series de 5 pull-ups sin lastre. 2) Anadi peso progresivamente hasta encontrar el máximo con el que puedes hacer exactamente 3 repeticiones limpias (sin trampa, bajando lento). 3) Descansa 5 min. 4) Anota: peso corporal + lastre = tu 3RM.',
    mide:'Fuerza máxima de traccion (3RM relativo al peso corporal)',
    unit:'kg totales (tu peso + lastre)',
    result_key:'pullup_3rm',
    result_label:'Ej: 80 (si pesas 70 y aguantas +10kg en 3 reps)',
    interpret: function(v,level,weight){
      var kg=parseFloat(v);if(isNaN(kg)||kg<=0)return null;
      var ratio=weight>0?kg/weight:0;
      if(level==='beginner'){
        if(ratio<1.0)  return {txt:'Construye primero la fuerza de traccion basica  -  este es el punto de partida. Usa banda de asistencia hasta llegar a 5 pull-ups limpios.',col:'#7070AA',icon:'&#x1F4CA;',adj:-10};
        if(ratio<1.15) return {txt:'Buena base de traccion para principiante. Continua progresando con pull-ups antes de agregar lastre.',                               col:'#00E5A0',icon:'&#x2705;', adj:0};
        return             {txt:'Fuerza de traccion por encima del promedio para tu nivel. Puedes empezar a trabajar con lastre ligero.',                                col:'#CCFF00',icon:'&#x26A1;',adj:5};
      }
      if(ratio<1.2)    return {txt:'Fuerza de traccion limitada para tu nivel  -  prioriza pull-ups lastrados en la fase de fuerza.',                                      col:'#FF4D6A',icon:'&#x26A0;',adj:-15};
      if(ratio<1.4)    return {txt:'Fuerza de traccion adecuada. Sigue progresando con carga.',                                                                          col:'#00C8FF',icon:'&#x2705;', adj:0};
      return               {txt:'Excelente fuerza de traccion. La limitante probablemente sea la fuerza de dedos o la resistencia.',                                    col:'#CCFF00',icon:'&#x26A1;',adj:8};
    }
  },
  {
    id:'criticalforce',
    title:'Test de Critical Force (CF)',
    category:'aerobic_capacity',
    diff:'Moderado',
    col:'#F472B6',
    freq:'Cada 6-8 semanas',
    how:'1) Calienta 15-20 min. 2) Determina tu fuerza máxima en regleta de 20mm (Max Hang previo). 3) Calcula 60% de ese máximo. 4) Realiza ciclos de 7s colgado / 3s descanso a esa carga. 5) Continua hasta que NO puedas completar un hang de 7 segundos limpio. 6) Anota los minutos totales. Protocolo de Giles et al. 2019 - rango tipico: 3-7 min principiantes, 5-9 min avanzados.',
    mide:'Critical Force  -  el umbral aeróbico local de los flexores digitales (Giles et al. 2019)',
    unit:'minutos antes de fallar',
    result_key:'cf_minutes',
    result_label:'Ej: 4.5 (minutos hasta el fallo)',
    interpret: function(v,level,weight){
      var min=parseFloat(v);if(isNaN(min)||min<=0)return null;
      if(level==='beginner'){
        if(min<3)  return {txt:'Base aeróbica digital muy baja  -  normal para principiante. ARC training es tu prioridad.',                                               col:'#7070AA',icon:'&#x1F4CA;',adj:-5};
        if(min<6)  return {txt:'Base aeróbica en desarrollo. Enfocate en ARC antes de an cap.',                                                                          col:'#00C8FF',icon:'&#x2705;', adj:0};
        return         {txt:'Buena base aeróbica para principiante. La fuerza máxima es probablemente tu limitante ahora.',                                             col:'#00E5A0',icon:'&#x2705;', adj:5};
      }
      if(min<4)    return {txt:'Critical Force bajo  -  el sistema aeróbico digital es tu limitante principal. Prioriza ARC antes de An Cap.',                             col:'#FF4D6A',icon:'&#x26A0;',adj:-20};
      if(min<7)    return {txt:'Critical Force moderado. Puedes trabajar An Cap pero incluye ARC regularmente.',                                                         col:'#FFB800',icon:'&#x26A0;',adj:-5};
      if(min<12)   return {txt:'Buen Critical Force. Tu sistema aeróbico soporta bien el An Cap.',                                                                       col:'#00C8FF',icon:'&#x2705;', adj:0};
      return           {txt:'Excelente Critical Force. Tu limitante es probablemente la fuerza máxima o la potencia.',                                                  col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
  },
  {
    id:'repeater',
    title:'Test de resistencia de dedos (Repeater)',
    category:'finger_endurance',
    diff:'Moderado',
    col:'#00E5A0',
    freq:'Cada 4-6 semanas',
    how:'1) Calienta bien. 2) Usa una regleta que uses normalmente en entrenamiento. 3) Haz series de 7s colgado / 3s descanso al máximo peso posible que te permita completar EXACTAMENTE 6 repeticiones antes de fallar. 4) Ese peso (corporal + lastre) es tu resultado. Si lo completas muy fácil, sube peso la próxima.',
    mide:'Resistencia de fuerza de dedos  -  capacidad anaeróbica local (Eva Lopez, TrainingBeta)',
    unit:'kg totales en 6 repeticiones de 7s',
    result_key:'repeater_6rep',
    result_label:'Ej: 72 (si pesas 70 y aguantas +2kg en exactamente 6 reps)',
    interpret: function(v,level,weight){
      var kg=parseFloat(v);if(isNaN(kg)||kg<=0)return null;
      var ratio=weight>0?kg/weight:0;
      if(level==='beginner'){
        if(ratio<0.8)  return {txt:'Resistencia digital muy baja  -  normal al empezar. El ARC y los hangs asistidos construiran esta capacidad gradualmente.',            col:'#7070AA',icon:'&#x1F4CA;',adj:-5};
        if(ratio<1.0)  return {txt:'Resistencia digital en desarrollo. Buen punto de partida para trabajar.',                                                            col:'#00C8FF',icon:'&#x2705;', adj:0};
        return             {txt:'Buena resistencia digital para principiante.',                                                                                          col:'#00E5A0',icon:'&#x2705;', adj:5};
      }
      if(ratio<0.9)    return {txt:'Resistencia digital por debajo del esperado  -  prioriza ARC y Critical Force antes de An Cap intenso.',                               col:'#FF4D6A',icon:'&#x26A0;',adj:-15};
      if(ratio<1.1)    return {txt:'Resistencia digital moderada. Buen punto de partida.',                                                                               col:'#00C8FF',icon:'&#x2705;', adj:0};
      if(ratio<1.3)    return {txt:'Buena resistencia digital. Puedes enfocarte en fuerza máxima como siguiente limitante.',                                             col:'#00E5A0',icon:'&#x2705;', adj:5};
      return               {txt:'Resistencia digital alta. Tu limitante es probablemente la fuerza máxima pura.',                                                       col:'#CCFF00',icon:'&#x26A1;',adj:8};
    }
  },
  {
    id:'maxgrade',
    title:'Grado máximo redpoint',
    category:'performance',
    diff:'Fácil',
    col:'#CCFF00',
    freq:'Cada mesociclo',
    how:'1) Sin presion  -  este es solo un registro. 2) Anota el grado más duro que hayas completado limpio en los ultimos 2 meses (redpoint: con intentos previos). 3) Si escalaas boulder y roca, anota ambos. 4) Usa grado frances para roca, el mismo sistema para boulder.',
    mide:'Rendimiento en contexto real  -  indicador holistico de progreso',
    unit:'Grado frances (ej: 7a, 7b+, 6c)',
    result_key:'max_grade',
    result_label:'Ej: 7a',
    interpret: function(v,level,weight){
      if(!v||v.trim()==='')return null;
      var gradeMap={'4':1,'4+':2,'5':3,'5+':4,'6a':5,'6a+':6,'6b':7,'6b+':8,'6c':9,'6c+':10,'7a':11,'7a+':12,'7b':13,'7b+':14,'7c':15,'7c+':16,'8a':17,'8a+':18,'8b':19,'8b+':20,'8c':21,'9a':22};
      var tier=gradeMap[v.toLowerCase().replace(' ','')]||0;
      var expected={beginner:[1,6],intermediate:[6,10],advanced:[11,16],elite:[17,22]};
      var range=expected[level]||expected['intermediate'];
      if(tier<range[0])  return {txt:'Tu grado máximo esta por debajo del rango tipico de '+level+'. La técnica y la confianza pueden estar limitando más que la fuerza física.',col:'#FFB800',icon:'&#x26A0;',adj:-10};
      if(tier<=range[1]) return {txt:'Tu grado redpoint esta dentro del rango esperado para tu nivel. El plan esta bien calibrado.',                                     col:'#00E5A0',icon:'&#x2705;', adj:0};
      return                 {txt:'Tu grado máximo supera el rango tipico de tu nivel. Considera actualizar tu nivel en el perfil.',                                    col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
  }
];

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

var EX={
  strength: [{n:'Max Hangs 20mm',d:'6x10s / 3min'},{n:'Lock-offs',d:'4x3 rep 5s'},{n:'Weighted Pull-ups',d:'4x3-5 rep'},{n:'Core Hanging',d:'3x20s L-sit'}],
  power:    [{n:'Campus Board',d:'Max ladders 1-3-5'},{n:'Dynamic Boulder',d:'Al limite'},{n:'Plyometric Pull-ups',d:'4x5 explosivos'}],
  endurance:[{n:'4x4s',d:'4 prob x 4 series'},{n:'ARC Training',d:'30min 40%'},{n:'Circuitos',d:'10 movs x 6 series'}],
  deload:   [{n:'Easy Traversing',d:'30min técnica'},{n:'Movilidad',d:'20min hombros'},{n:'Antagonistas',d:'Extensores'}]
};

var SS_META = {
  available:   {lbl:'Disponible',  col:'#CCFF00', css:'ss-available',   icon:'&#x25B6;'},
  completed:   {lbl:'Completada',  col:'#00E5A0', css:'ss-completed',   icon:'&#x2713;'},
  missed:      {lbl:'No realizada',col:'#FF4D6A', css:'ss-missed',      icon:'&#x2715;'},
  locked:      {lbl:'Pendiente',   col:'#444466', css:'ss-locked',       icon:'&#x1F512;'},
  rescheduled: {lbl:'Movida',      col:'#FFB800', css:'ss-rescheduled', icon:'&#x21C4;'},
  rest:        {lbl:'Descanso',    col:'#444466', css:'ss-locked',       icon:'--'}
};

var EX_POOL = {
  strength:[
    {id:'str0a',n:'Hangs en jugs con pies apoyados',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:2,skill:1,minLevel:0,phase:'warmup',
     det:'Cuelgate de presas grandes (jugs) con los pies en una silla o caja. 5 x 10s. Descanso 2 min. Primer paso para adaptar los tendones de los dedos sin riesgo.',
     nota:'5 x 10s :2min (pies apoyados)',
     simple:'Práctica colgarte con ayuda de los pies  -  así los tendones de los dedos se adaptan poco a poco sin riesgo de lesión.',
     sci:'Horst (2008): los tendones digitales necesitan hasta 12 meses de adaptación gradual. Empezar con carga asistida es crítico para prevenir lesiones en principiantes.',
     tips:['Si sientes dolor agudo en dedos: parar inmediatamente','Calentamiento 10 min de escalada fácil primero','Progresar reduciendo apoyo de pies semana a semana']},
    {id:'str0b',n:'Dominadas con peso corporal',cat:'pull_strength',sys:'Fuerza traccion',col:'#38BDF8',fatigue:2,skill:1,minLevel:0,phase:'warmup',
     det:'Pull-ups normales sin lastre. 3-4 series al máximo con buena forma. Descanso 2-3 min. Si no llegas a 3 reps, usar banda elastica de asistencia.',
     nota:'3-4 x max reps :3min',
     simple:'Dominadas basicas  -  construyen la fuerza de brazos y espalda que necesitas para escalar bien.',
     sci:'Horst (2016): la fuerza de traccion es el predictor número 1 de progresión en principiantes antes del fingerboard.',
     tips:['Bajar lento (3 segundos)  -  más efectivo','Hombros siempre abajo, no encorvados','Usa banda si no llegas a 3 reps limpias']},
    {id:'str0c',n:'Bouldering en grados muy faciles',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:2,skill:2,minLevel:0,phase:'warmup',
     det:'Escala problemas que puedas completar facilmente. Foco en movimiento, no en dificultad. 30-45 min de escalada tranquila.',
     nota:'30-45 min al 50-60% de tu limite',
     simple:'Escalar fácil con atención a como te mueves  -  la mejor forma de ganar fuerza sin lesionarte cuando empiezas.',
     sci:'Bechtel (2019): el movimiento de escalada es el mejor estimulo de adaptación neural para principiantes. Técnica y fuerza se desarrollan juntas.',
     tips:['Foco en footwork  -  donde pones los pies','Escalar lento y con control','No te preocupes por el grado']},
    {id:'str1',n:'Deadhangs en regleta 20mm',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:4,skill:3,minLevel:1,
     det:'Te colgás de una regleta de 20mm en half-crimp durante 10 segundos con un buffer de 3s (osea que podrías haber aguantado 3s más antes de soltar). 5 series con 3 min de descanso entre cada una. Subís peso semana a semana cuando completás todas las series.',
     nota:'5 series · 10s con buffer 3s · descanso 3 min',
     simple:'Te colgás de una regleta chica durante 10 segundos, descansás, y lo repetís 5 veces. Es EL ejercicio para construir fuerza de dedos. Cada semana intentás colgar con un poquito más de peso (mochila con discos, cinturón).',
     sci:'Maisch/TrainingBeta: el "buffer" mide cuánto te queda en el tanque al soltar. Buffer 3s = podrías haber aguantado 3s más (Effort Level 3, intensidad moderada-alta). Permite progresar sin overtrain de tendones. CNS y poleas tardan 48-72h en recuperarse.',
     tips:['Calentamiento digital de 20-30 min OBLIGATORIO  -  esto incluye escalada suave + hangs progresivos en regletas más grandes','Variá el agarre (half-crimp, open-hand) cada 2-3 semanas para no sobrecargar siempre el mismo tejido','Subí 2.5kg cuando puedas completar las 5 series con el buffer intacto','Si el buffer cae a 0-1s, no sumes peso esa semana'],
     how:[
       'Calentá los dedos primero: 15-20 min escalando suave + 2-3 hangs progresivos en regletas más grandes (35mm, 25mm) antes de tocar la de 20mm.',
       'Posicionate en la regleta en half-crimp: primera falange a 90°, segunda extendida, pulgar al costado del índice.',
       'Si tu peso corporal solo ya te da 10s con buffer 3s, agregá peso (mochila con discos, cinturón). Si NO podés aguantar 10s con peso corporal, restá peso (banda de asistencia desde un anclaje arriba).',
       'Colgate 10 segundos y soltate ANTES de la falla. El buffer de 3s significa: si forzaras, aguantarías 3 más.',
       'Bajá y descansá 3 min completos. Cronometralo  -  el descanso completo es parte del estímulo.',
       'Repetí hasta completar 5 series. Si en la serie 4 o 5 el buffer cae a 0-1s, terminá ahí: registralo y no sumes peso la próxima semana.'
     ],
     errors:[
       'Saltearse el calentamiento  -  es el camino directo a una lesión de polea.',
       'Buscar máxima duración en vez de máxima carga: hangar 30s a pelo NO entrena fuerza máxima, entrena resistencia.',
       'Usar full crimp (pulgar cerrado sobre los dedos) en regletas de 20mm  -  riesgo alto de polea sin beneficio extra.',
       'Cambiar el peso entre series: el peso es FIJO para las 5 series. Si fallás en la 4ª, esa es tu data.',
       'Hacer 2-3 sesiones por semana en el mismo agarre: los tendones tardan en remodelarse, 1-2 sesiones/semana es plenty.'
     ]},
    {id:'str2',n:'Bouldering al límite',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:5,minLevel:1,
     det:'Trabajás problemas al 95-100% de tu límite (proyectos). 4-8 intentos por problema con 5-8 min de descanso COMPLETO entre intentos. La calidad de cada intento importa más que la cantidad.',
     nota:'Proyectos al 95-100% · 4-8 intentos · descanso 5-8 min',
     simple:'Intentás los boulders más difíciles que podés. La idea no es completarlos todos, es darle todo a cada intento, descansar bien, y probar de nuevo. Cuando la calidad se cae notoriamente, terminás la sesión.',
     sci:'Barrows (2013): la An Cap (capacidad anaeróbica) necesita 16+ semanas de trabajo consistente para adaptarse. SAID (Horst 2008): el principio de especificidad indica que escalar al límite es el estímulo más específico para mejorar tu grado de escalada.',
     tips:['Calentamiento 30-40 min OBLIGATORIO  -  esto no se negocia, el riesgo de lesión es real','Parar la sesión cuando la calidad de movimiento cae más del 20% (te enganchás, fallás secuencias que antes pegabas)','Registrá grado y tipo de agarre del crux  -  útil para identificar tu debilidad'],
     how:[
       'Calentá 30-40 min: movilidad de hombros y dedos, escalada progresiva V0 → V2 → V3 → V4 hasta llegar a 1-2 grados debajo de tu proyecto.',
       'Elegí 2-3 proyectos para la sesión (no más  -  necesitás reservar energía mental y física).',
       'En cada intento, foco total: secuencia clara, agarre decidido, pies precisos. No te tirés por tirarte.',
       'Después de cada intento, descansá 5-8 min completos. Caminá, hidratá, anotá qué falló. Sin escalar nada en el medio.',
       'Hacés 4-8 intentos por problema. Si pegás el problema, podés ir al siguiente o seguir con otro intento de pulido.',
       'Terminás cuando: completaste tus proyectos, O la calidad cayó claramente, O sentís fatiga digital alta (dedos "blandos"). Esto último es señal de parar inmediatamente.'
     ],
     errors:[
       'Hacerlo sin calentar  -  poleas en frío es una receta para lesionarse.',
       'Descansar poco entre intentos pensando "estoy todavía caliente": para An Cap necesitás recuperación COMPLETA, sino bajás a entrenar resistencia (otro estímulo distinto).',
       'Forzar el "envío" cuando ya estás cansado  -  te fijás malas movilidades y aumenta riesgo de lesión.',
       'Hacer demasiados problemas: 2-3 proyectos por sesión es plenty. Más es dispersar el estímulo.'
     ]},
    {id:'str3',n:'Dominadas con lastre',cat:'pull_strength',sys:'Fuerza traccion',col:'#38BDF8',fatigue:4,skill:3,minLevel:1,
     det:'4-6 series de 3-5 reps con lastre a RPE 8-9 (RIR 1-2). Cadencia 2-0-2. Descanso 3-5 min entre series.',
     nota:'5 x 3-5rep @RPE8-9 :4min',
     simple:'Dominadas con peso adicional  -  cuando ya puedes hacer 8+ sin lastre, agregar peso acelera la ganancia de fuerza.',
     sci:'Horst (2008): pull-ups lastrados + deadhangs = mayor transferencia a escalada. Adaptación: 8-12 semanas.',
     tips:['Nunca sacrificar la forma por el peso','Registrar 3RM cada semana','Fingerboard primero si combinas ejercicios']},
    {id:'str5',n:'Lock-offs a distintas alturas',cat:'pull_strength',sys:'Fuerza isométrica',col:'#38BDF8',fatigue:3,skill:3,minLevel:1,
     det:'4 series x 3 rep x 5s hold a 90/120/150 grados de codo. Descanso 3 min.',
     nota:'4 x 3rep x 5s hold :3min',
     simple:'Sostener la posición de dominada a distintas alturas  -  desarrolla control para movimientos técnicos.',
     sci:'Horst (2008): lock-offs en multiples angulos cubre todo el rango funcional de escalada.',
     tips:['Empezar en angulo más fuerte (90 grados)','Progresar angulo antes de agregar peso','Combinar con deadhangs el mismo día']},
    {id:'str6',n:'One-arm hang asistido',cat:'finger_strength',sys:'Fuerza max unilateral',col:'#38BDF8',fatigue:4,skill:4,minLevel:2,
     det:'Asistido con banda o polea. 5 x 8s por brazo. Descanso 3 min. Buffer de 2-3s.',
     nota:'5 x 8s(2) cada brazo :3min',
     simple:'Colgarse de un solo brazo con ayuda de banda  -  fuerza unilateral para movimientos de palanca avanzados.',
     sci:'Anderson (Rock Climbers Training Manual): fuerza unilateral crítica para movimientos de palanca y desplomes.',
     tips:['Banda de resistencia para calibrar asistencia','Empezar con brazo dominante','Progresar reduciendo grosor de banda']}
  ],
  power:[
    {id:'pow0a',n:'Movimientos dinámicos en fácil',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:2,skill:2,minLevel:0,phase:'warmup',
     det:'Práctica saltar a presas grandes en el muro de boulder desde posición solida. 4-6 intentos con 3-4 min descanso.',
     nota:'4-6 x 1 movimiento :3-4min',
     simple:'Empezar a practicar movimientos dinámicos  -  saltos  -  con presas grandes y seguras para aprender el patron.',
     sci:'Horst (2016): la potencia no puede entrenarse directamente sin base de fuerza. En principiantes, practicar el patron de movimiento es el primer paso.',
     tips:['Muro vertical o poco desplomado','Presas grandes y seguras','Importa la técnica del movimiento, no el grado']},
    {id:'pow0b',n:'Bouldering rapido en grados faciles',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:3,skill:3,minLevel:0,phase:'warmup',
     det:'Escala problemas simples pero con movimientos rapidos y decisivos. 3-5 problemas con 5 min descanso completo.',
     nota:'3-5 x problema fácil :5min',
     simple:'Escalar boulders que conoces pero moviendote rapido y con decision  -  entrena la velocidad de respuesta muscular.',
     sci:'Bechtel (2019): en principiantes la mejora de potencia viene del refinamiento neural. Movimiento rapido en grados faciles es el estimulo correcto.',
     tips:['Elige problemas que puedas completar seguro','Explota desde los pies, no solo de los brazos','5 min de descanso real entre intentos']},
    {id:'pow1',n:'Campus: movimiento máximo',cat:'campus_board',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'Desde liston 1, movimiento dinámico al liston más lejano posible. 6-8 intentos con 5 min descanso.',
     nota:'6-8 x max move :5min',
     simple:'Campus board: saltar al liston más lejano posible  -  mide la potencia explosiva real.',
     sci:'Barrows (2013) PEAK PHASE: An Pow = % capacidad anaeróbica en un movimiento. RFD200ms (Anderson).',
     tips:['Solo con cuerpo 100% fresco','Registrar liston alcanzado cada sesión','Sin campus: dynamic bouldering al limite']},
    {id:'pow2',n:'Bouldering dinámico al limite',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:1,
     det:'4-8 movs explosivos al máximo. Descanso = tiempo trabajo. 4 reps x 4 sets, 10 min entre sets.',
     nota:'4 sets x 4 reps, rest=work',
     simple:'Escalar los bloques más dificiles con máxima explosion  -  para desarrollar potencia real de escalada.',
     sci:'Barrows (2013): powered out NO pump. Mantener 1 sesión An Cap/semana para no saturar lactato.',
     tips:['Problemas al limite absoluto de fuerza','Descanso fijo: 20s trabajo = 20s descanso','Bouldering primero, An Cap después']},
    {id:'pow3',n:'Dominadas explosivas (pliometricas)',cat:'pull_strength',sys:'An Pow',col:'#9B6EFF',fatigue:4,skill:3,minLevel:1,
     det:'Dominadas soltando la barra en el punto más alto. 4 x 5 reps. Descanso 3-4 min entre series.',
     nota:'4 x 5 explosivos :4min',
     simple:'Dominadas donde sueltas la barra arriba  -  entrena la velocidad de contracción muscular para movimientos explosivos.',
     sci:'RFD200ms (Anderson): velocidad de contracción en 200ms del movimiento. Crítico en boulder y rutas dinámicas.',
     tips:['Solo con 8+ dominadas normales previas','Calentamiento completo siempre','Parar si baja la técnica']},
    {id:'pow4',n:'Campus: escaleras de An Cap',cat:'campus_board',sys:'An Cap',col:'#9B6EFF',fatigue:5,skill:4,minLevel:2,
     det:'Sube y baja en campus sin pies. 15-20 movs. Descanso 3-4x el tiempo de trabajo. 6-8 reps.',
     nota:'6-8 x 15-20 movs :4min',
     simple:'Subir y bajar el campus board varias veces seguidas  -  aguante de alta intensidad para secuencias explosivas largas.',
     sci:'Barrows (2013): campus permite progresar 1 movimiento por sesión. Mayor velocidad vs bouldering en campus.',
     tips:['Listones grandes para empezar','Progresar 1 movimiento por sesión','Transición gradual a listones más pequeños']},
    {id:'pow5',n:'Moon/Tensión board al limite',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'Problemas al limite en tabla de madera estandarizada. 4-6 intentos con 5-8 min descanso.',
     nota:'4-6 x max effort :5-8min',
     simple:'Escalar problemas de muro de madera estandarizado  -  mide progresión objetiva de potencia.',
     sci:'Barrows (2013): tabla estandarizada = progresión medible. RFD en angulo negativo.',
     tips:['Registrar grade más duro completado','No escalar si fatiga alta','Mejor rendimiento las primeras 2h']},
    {id:'pow6',n:'System board bilateral',cat:'wall_training',sys:'Fuerza max bilateral',col:'#9B6EFF',fatigue:4,skill:4,minLevel:2,
     det:'Movimientos simetricos en system board. 6 x 4 movs al limite bilateral. Descanso 5 min.',
     nota:'6 x 4 movs :5min',
     simple:'Muro con presas simetricas  -  identifica cual lado es más débil y trabaja en igualar.',
     sci:'Horst (2008): system board elimina compensaciones. Permite atacar debilidades específicas.',
     tips:['Mismo agarre ambas manos','Identificar tipo de agarre más débil','Alternar: crimps, slopers, pockets']}
  ],
  endurance:[
    {id:'end10',n:'Circuito de capacidad anaeróbica',cat:'power_endurance',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:4,minLevel:1,
     det:'12-15 movimientos seguidos, descanso 2-4 veces el tiempo de trabajo. 8-10 repeticiones. Objetivo: quedarte sin fuerza pero NO bombeado.',
     nota:'8-10 x 12-15 movs',
     simple:'Movimientos intensos seguidos para aprender a aguantar secuencias duras sin bombearte  -  lo que necesitas en rutas largas.',
     sci:'Barrows (2013): An Cap requiere 16+ semanas de adaptación. Sin Aero Cap base: más An Cap = peor rendimiento.',
     tips:['Boulder al 75-85% limite','Si te bombeas: circuito muy largo o intenso','Objetivo: menos del 25% de fallos']},
    {id:'end0a',n:'Escalada continua suave (ARC basico)',cat:'aerobic_endurance',sys:'Aero Cap',col:'#F472B6',fatigue:1,skill:1,minLevel:0,phase:'warmup',
     det:'Escala durante 15-20 min sin parar en grados muy faciles. El bombeo debe ser manejable en todo momento  -  si no puedes mantener una conversacion, bajas la intensidad.',
     nota:'15-20 min continuo al 40-50% limite',
     simple:'Escalar tranquilo y sin parar  -  como caminar. Construye la base aeróbica que hace que te recuperes mejor entre movimientos y entre sesiones.',
     sci:'Barrows (2013): ARC mejora densidad capilar en antebrazos, permitiendo recuperarse más rapido. Primer estimulo aeróbico recomendado para principiantes.',
     tips:['Si el bombeo no es manejable: baja al siguiente grado','15 min ya es suficiente para empezar','Aumentar duración 5 min por semana']},
    {id:'end0b',n:'Travesias técnicas',cat:'technique',sys:'Skill development',col:'#F472B6',fatigue:1,skill:2,minLevel:0,phase:'warmup',
     det:'Muevete de lado a lado en el muro sin bajar durante 15-20 min. Foco 100% en los pies y en la posición del cuerpo.',
     nota:'15-20 min de travesia continua',
     simple:'Moverse por el muro de forma continua pero pensando en como te mueves  -  mejora técnica y base aeróbica al mismo tiempo.',
     sci:'Bechtel (2019): travesias técnicas tienen el mejor ratio beneficio/riesgo para principiantes  -  estimulo aeróbico y neural sin carga digital excesiva.',
     tips:['Los pies hacen el trabajo  -  confiale el peso','Mirar donde pones el pie antes de moverlo','No importa la velocidad  -  importa el control']},
    {id:'end1',n:'Circuitos de potencia-resistencia',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:3,minLevel:1,
     det:'30 movs sin sacudir los brazos. Descanso = tiempo trabajo. 8 reps o 6 sets x 4 reps.',
     nota:'8 x 30 movs, rest=work',
     simple:'Escalar 30 movimientos seguidos sin bajar los brazos  -  para aguantar rutas largas e intensas sin bombearte.',
     sci:'Barrows (2013): Aero Pow responde mejor a REDUCIR el descanso, no aumentar dificultad.',
     tips:['Sin sacudir aunque haya presas buenas','Para alto volumen: 6 sets x 4 reps con 10-20 min entre sets','Simular posición de clipse para bajar ritmo']},
    {id:'end2',n:'4x4 boulders',cat:'wall_training',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'4 boulders distintos encadenados sin descanso entre ellos (eso es UN set), después descansás 1-3 min. Repetís 4 veces (4 sets). Boulders al 70-80% de tu límite  -  difíciles pero completables hasta el final.',
     nota:'4 sets · 4 boulders encadenados · descanso 1-3 min entre sets',
     simple:'Hacés 4 boulders seguidos sin descanso entre ellos. Eso es un set. Descansás 1-3 min y volvés a hacer otra ronda de 4 boulders. En total 4 rondas. Entrena tu capacidad de aguantar esfuerzos repetidos como en una ruta larga.',
     sci:'Barrows (2013): el 4x4 con boulders genera mayor intensidad local en los dedos que el ARC con rutas. Trabaja Aero Pow + algo de An Cap. Especialmente útil 4-6 semanas antes de temporada de roca.',
     tips:['Cada boulder debe estar al 70-80%: difícil pero te tiene que dar terminarlo sin fallar','El descanso entre sets es FIJO, decidido de antemano (no "cuando me sienta listo")','Registrá: ¿completaste los 4 boulders del set 4 con la misma calidad que los del set 1? Esa es tu métrica'],
     how:[
       'Elegí 4 boulders a 1-2 grados por debajo de tu límite, contiguos en el muro para no perder tiempo caminando.',
       'Calentá 15-20 min: movilidad + boulders progresivos hasta justo debajo de la dificultad del 4x4.',
       'Set 1: subí los 4 boulders seguidos. Cuando bajás de uno, vas directo al siguiente sin parar a respirar. 4 boulders = 1 set.',
       'Cronometrá el descanso: 1-3 min según nivel (principiante 3 min, avanzado 1-2 min). Mismo descanso para todos los sets.',
       'Repetí 3 sets más (total 4). En el set 3 y 4 deberías estar bastante bombeado pero todavía pudiendo completar.',
       'Si fallás un boulder en el set, ANOTÁ cuál y en qué set. Si fallás antes del set 4, los boulders eran muy duros para vos.'
     ],
     errors:[
       'Elegir boulders muy duros: si fallás en el set 1 ya no estás entrenando Aero Pow, estás haciendo bouldering al límite con mal descanso.',
       'Descansar de más entre sets para "asegurar" completar  -  el estímulo se pierde, pasa de Aero Pow a An Cap.',
       'No registrar  -  necesitás comparar set 1 vs set 4 para saber si la sesión funcionó.',
       'Hacerlo en una sesión sin descansar de la anterior: 4x4 acumula fatiga digital, requiere mínimo 48h.'
     ]},
    {id:'end3',n:'Intervalos cada minuto',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:3,minLevel:1,
     det:'6-8 movs empezando cada minuto. Aprox 20s trabajo / 40s descanso. 8-12 reps.',
     nota:'8-12 x 6-8 movs cada 60s',
     simple:'Hacer 6-8 movimientos al empezar cada minuto  -  ritmo constante que entrena la resistencia a esfuerzos repetidos.',
     sci:'Barrows (2013): para aumentar intensidad usar problema más difícil, no acortar descanso.',
     tips:['Problema constante toda la sesión','Objetivo: fallar en ultimos 2-3 reps','Timer fijo, empezar siempre en punto']},
    {id:'end4',n:'ARC Training (base aeróbica)',cat:'aerobic_endurance',sys:'Aero Cap',col:'#F472B6',fatigue:2,skill:2,minLevel:1,
     det:'Escalás de forma continua 20-40 min en zona de pump leve y manejable, sin pausa larga. La idea NO es cansarte: es entrenar a tus dedos a recuperarse mientras seguís escalando.',
     nota:'1 bloque continuo · 20-40 min · pump leve',
     simple:'Escalás suavecito durante mucho tiempo sin bajarte. No tenés que sentir que te quemás, sólo un pump suave que se mantiene estable. Esto mejora la base aeróbica de los dedos para que te recuperes mejor entre intentos.',
     sci:'Barrows (2013): ARC = Aerobic Restoration & Capillarity. Mejora densidad capilar y umbral de pump. Las adaptaciones son lentas: necesitás 8+ semanas consistentes (2-3 sesiones por semana) para ver cambios reales.',
     tips:['NUNCA llegues a pump terminal (la sensación de "no puedo abrir la mano")','Si el pump no es manejable, bajá intensidad inmediatamente  -  pasá a travesía fácil o presas más grandes','Excelente como warm-down de 10-15 min al final de una sesión'],
     how:[
       'Buscá un sector con presas medianas-grandes (jugs y romos), pared vertical o ligeramente positiva. NADA de regletas o agarres duros.',
       'Empezá con 5 min de movimiento muy suave para activar  -  prácticamente caminar en la pared.',
       'Entrás en el bloque principal: 20-40 min escalando de forma continua. Si tenés que bajarte, hacelo, pero apuntá a estar al menos 80% del tiempo en pared.',
       'Mantenés un pump apenas perceptible  -  como un calor leve en los antebrazos. Si se vuelve incómodo, simplificás (presas más grandes o pared menos inclinada).',
       'Foco en eficiencia: peso sobre los pies, brazos largos, respiración pareja. Es entrenamiento técnico también.',
       'Terminás cuando llegás al tiempo o cuando notás que la calidad del movimiento se degrada.'
     ],
     errors:[
       'Hacerlo en boulder o en pared muy plomada  -  ahí no podés mantener el ritmo aeróbico.',
       'Buscar la "quemazón" pensando que más intensidad = más ganancia. ARC es lo opuesto: si te bombeás, ya no es ARC.',
       'Hacer 5-10 min y pensar que sirve. El estímulo aeróbico necesita volumen: mínimo 20 min de continuidad.',
       'Saltearlo en fase de fuerza pensando que "no entrena nada"  -  es la base sobre la que se construye toda la resistencia futura.'
     ]},
    {id:'end5',n:'Pirámides en rutas',cat:'aerobic_endurance',sys:'Aero Pow + An Cap',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'Trepás escalones progresivos: 1 ruta sola, después 2 ruteadas seguidas sin bajar, después 3 seguidas. Eso es un ciclo. Descansás 3 min entre escalones y 5-6 min entre ciclos. Hacés 2-3 ciclos según nivel.',
     nota:'2-3 ciclos · 1→2→3 rutas · descanso 3 min entre escalones',
     simple:'Escalás 1 ruta, descansás, después 2 seguidas, descansás, después 3 seguidas. Cada escalón suma más rutas sin descanso entre medio, así la fatiga se va acumulando como en una jornada de roca.',
     sci:'Barrows (2013): variante de Aero Pow que combina An Cap. Especialmente útil para escaladores de roca con rutas largas, porque entrena tanto el sistema lactato (escalón 1) como la recuperación entre intentos repetidos (escalones 2-3).',
     tips:['Rutas al 65-75% de tu límite  -  típicamente 1-2 grados por debajo de tu max RP','No descanses entre rutas del mismo escalón (la "pirámide" es eso)','Sí descansás 3 min entre escalones, 5-6 min entre ciclos','Registrá en qué ruta del último escalón empezás a fallar  -  esa es tu métrica de progreso'],
     how:[
       'Elegí 3 rutas en tu rango (65-75% del límite). Deberían estar cerca entre sí en el muro para no perder tiempo caminando.',
       'Calentá 15-20 min: movilidad + 2-3 rutas progresivas sin llegar a pump.',
       'Ciclo 1, escalón 1: subí 1 ruta → bajá → descansá 3 min.',
       'Ciclo 1, escalón 2: subí 2 rutas seguidas sin bajarte entre medio → descansá 3 min.',
       'Ciclo 1, escalón 3: subí 3 rutas seguidas → descansá 5-6 min antes del próximo ciclo.',
       'Repetí el ciclo completo 1 vez más (intermedio) o 2 veces más (avanzado). El último escalón del último ciclo suele ser donde aparece la falla  -  está bien.',
       'Anotá: ¿completaste el escalón 3 del ciclo final? Si sí, la próxima vez subí dificultad de rutas. Si no, mantené y repetí la sesión.'
     ],
     errors:[
       'Elegir rutas muy duras: te quemás antes del último escalón y el estímulo aeróbico se pierde.',
       'Descansar entre rutas del mismo escalón  -  desvirtúa el ejercicio y lo convierte en intervalos.',
       'Hacerlo cansado de la sesión anterior: este ejercicio pide SNC + dedos frescos, mínimo 48h post sesión dura.',
       'No registrar  -  sin números concretos no sabés si la fase está funcionando.'
     ]},
    {id:'end6',n:'Ruta repetida en intervalos',cat:'aerobic_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:4,minLevel:1,
     det:'Escala la misma ruta 6-10 veces. Descanso 2-3x el tiempo de escalada. Mantener forma.',
     nota:'6-10 x misma ruta, rest=2-3x',
     simple:'Repetir la misma ruta muchas veces  -  aprende a escalarla más eficiente y desarrollas aguante específico.',
     sci:'Barrows (2013): repeticion de ruta permite aislamiento del estimulo. Alta especificidad para rutas de proyecto.',
     tips:['Ruta al 75-80% limite','Si fallas antes de rep 4: ruta muy dura','Si nunca fallas: ruta muy fácil']},
    {id:'end7',n:'Boulders enlazados',cat:'wall_training',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'Encadenás 3-5 boulders distintos como si fueran UNA sola ruta larga, sin descanso entre ellos. Eso es un set. Repetís 4-6 sets con 3-4 min de descanso entre cada uno. Boulders al 65-75% del límite.',
     nota:'4-6 sets · 3-5 boulders enlazados · descanso 3-4 min',
     simple:'Escalás varios boulders pegados sin parar entre ellos, como si fuera una ruta larga. Esto simula la sensación de una ruta de roca exterior pero en zona de boulder. Diferencia con 4x4: acá los boulders son más fáciles (65-75% vs 70-80%) y hacés más sets con descanso más largo.',
     sci:'Anderson (RCTM 2014): los "linked boulders" tienen alta especificidad para escaladores de roca. Combinan An Cap y Aero Pow según el número total de movimientos. Recomendado especialmente 4-6 semanas antes de temporada de roca exterior.',
     tips:['Boulders al 65-75% del límite  -  un poquito más fáciles que el 4x4','Elegí boulders contiguos para minimizar el tiempo de transición entre ellos','Registrá si completás el último boulder del último set con la misma calidad que el primero del primer set'],
     how:[
       'Buscá 3-5 boulders contiguos en el muro, al 65-75% de tu límite. La línea ideal es que puedas ir de uno al siguiente sin caminar.',
       'Calentá 15-20 min hasta llegar a la dificultad de los boulders del set.',
       'Set 1: subí el primer boulder, bajá, vas directo al segundo, bajá, al tercero, etc. Como si fuera una sola ruta larga. Total de movimientos ≈ 20-40 por set.',
       'Descanso 3-4 min entre sets (cronometrado, sin "salgo cuando me sienta").',
       'Hacé 4-6 sets total. El último set tiene que ser dificultoso pero todavía completable. Si te queda muy fácil, agregá un boulder o subí dificultad la próxima sesión.',
       'Registrá: número total de boulders sin fallar, set en el que aparece el primer fallo.'
     ],
     errors:[
       'Confundirlo con 4x4: el 4x4 es más intenso (boulders más duros, menos sets). Boulders enlazados es más volumen total.',
       'Hacer pausa entre boulders para "preparar el siguiente"  -  rompe el estímulo aeróbico. Si necesitás pausa, los boulders son muy duros.',
       'Elegir boulders muy alejados: el tiempo de transición se acumula y termina siendo un descanso disfrazado.',
       'Hacerlo en plena fase de fuerza máxima  -  este ejercicio es de fase de resistencia / pre-temporada.'
     ]},
    {id:'end8',n:'On/Off Traversing',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:2,minLevel:0,
     det:'30s escalando en travesia + 30s pausa. Repetir 8-12 veces. En zona de bombeo ligero-moderado.',
     nota:'8-12 x (30s on / 30s off)',
     simple:'Escalar 30 segundos y parar 30 segundos -- una forma segura y efectiva de entrenar la resistencia para cualquier nivel.',
     sci:'Bechtel (Logical Progression 2019): on/off intervals = introducción ideal a Aero Pow. Control preciso de intensidad. Recomendado como primera herramienta de PE para principiantes e intermedios.',
     tips:['Si te bombeas antes de 30s: zona demasiado difícil','Usar el mismo tramo toda la sesión','Progresar: más repeticiones antes de aumentar dificultad']},
    {id:'end9',n:'Circuito de capacidad (PE inicial)',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:2,skill:1,minLevel:0,
     det:'Circuito fácil de 15-20 movimientos, 6-8 veces con 2 min descanso. En zona suave, forma perfecta.',
     nota:'6-8 x 15-20 movs :2min',
     simple:'Circuito corto y fácil repetido varias veces -- la introducción más segura al entrenamiento de resistencia para principiantes.',
     sci:'Barrows (2013): estimulo mínimo efectivo de Aero Pow para principiantes = circuito 10-20 movimientos al 50-60% limite. Baja intensidad + consistencia = adaptación sin riesgo de lesión.',
     tips:['Zona MUY fácil -- debes poder hablar mientras escalas','Si te bombeas: circuito demasiado difícil','Progresar: primero más repeticiones, luego más dificultad']}
  ],
  deload:[
    {id:'del1',n:'Travesia suave de recuperación',cat:'mobility',sys:'Recuperación activa',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'20-30 min moviendote por el muro en grados muy faciles. Bombeo mínimo o nulo.',
     nota:'1 x 20-30 min suave',
     simple:'Moverte por el muro de forma muy tranquila  -  activa la circulación y te ayuda a recuperarte sin generar más fatiga.',
     sci:'Barrows (2013): deload NO es inactividad. Reduccion volumen 50% manteniendo intensidad. La supercompensacion ocurre DESPUÉS.',
     tips:['Enfoque en técnica y eficiencia','No intentar subir grados esta semana','Ideal para trabajar miedo y visualizacion']},
    {id:'del2',n:'Circuito de musculos antagonistas',cat:'mobility',sys:'Prevencion lesiones',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'Extensores de dedos 3x15 con banda elastica, face pulls 3x15, rotación externa de hombro 3x12. Lento y controlado.',
     nota:'3 x 15 reps :90s',
     simple:'Ejercicios para los musculos opuestos a los que usa la escalada  -  previene lesiones y mantiene equilibrio muscular.',
     sci:'Horst (2008): antagonistas críticos: extensores dedos, triceps, rotadores externos. 2 sesiones/semana todo el ciclo.',
     tips:['Extensores con banda elastica, NUNCA pesos','Face pulls lento  -  3 segundos cada fase','Incluir: wrist curls, reverse curls, pushups']},
    {id:'del3',n:'Movilidad y yoga para escaladores',cat:'mobility',sys:'ROM y recuperación',col:'#00E5A0',fatigue:1,skill:1,minLevel:0,
     det:'20 min: caderas, hombros, muñecas. Secuencias de yoga orientadas a escalada.',
     nota:'20 min, siempre con musculo caliente',
     simple:'Estiramientos y movilidad  -  mantiene las articulaciones sanas y mejora la flexibilidad para escalar técnico.',
     sci:'Consuegra (21 Factores): ROM como factor físico independiente que limita el rendimiento técnico.',
     tips:['Con musculo caliente, nunca en frio','Yoga: hip openers + shoulder mobility','Isquiotibiales, flexores cadera, rotadores externos']},
    {id:'del4',n:'Sesión de técnica en grados bajos',cat:'technique',sys:'Skill development',col:'#00E5A0',fatigue:1,skill:3,minLevel:0,
     det:'1h escalando en grados muy inferiores al limite. Foco 100% en footwork, posición de caderas y eficiencia.',
     nota:'60 min al 40-50% limite',
     simple:'Escalar fácil pensando solo en como te mueves  -  el deload es el mejor momento para trabajar técnica sin fatiga.',
     sci:'Consuegra: Economia de agarre = reduccion de fuerza vía optimizacion técnica.',
     tips:['Grados al 40-50% de tu limite real','Video o espejo para feedback de footwork','Objetivo: cada move perfecto, no velocidad']}
  ]
};


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
  finger_strength: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'Carga al 70% de tu máx. Buffer 3s pleno. Adaptación de tendones.'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'Carga al 78-80% de tu máx. Buffer 2-3s. Misma serie/rep.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'Carga al 85-90%. Buffer 1-2s. Si fallás en serie 5, esa es tu data.'},
    {stage:'overreach', tag:'Sem 4 · Sobrecarga',mod:'Carga al 90-95%. Buffer 0-1s. La próxima semana es deload o cambio de fase.'}
  ],
  pull_strength: [
    {stage:'intro',     tag:'Sem 1 · Intro',     mod:'1 rep menos que tu máx limpio. Foco en bajada lenta (3s).'},
    {stage:'build',     tag:'Sem 2 · Build',     mod:'Reps al máximo limpio. Si llegás a 5 limpias, agregá 2.5kg la próxima.'},
    {stage:'peak',      tag:'Sem 3 · Peak',      mod:'+2.5kg vs sem 2, o +1 rep si todavía sin lastre. RPE 9.'},
    {stage:'overreach', tag:'Sem 4 · Sobrecarga',mod:'+5kg total respecto a sem 1. Una serie adicional si la calidad lo permite.'}
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

var HBP=[
  {t:'Max Hangs 7s (Fuerza Máxima)',ph:'Fase Go Hard | Fuerza',col:'#38BDF8',
   nota:'8 series progresivas hasta 1RM | Descanso: 2-3 min',
   desc:'Protocolo primario de fuerza de dedos (Lattice Training / Horst 2016). Suspensiones de 7 segundos en regleta de 20mm (profundidad de una falange). Incrementar carga progresivamente en 8 series hasta el fallo mecánico. Si no puedes sostenerte con tu peso corporal: usar banda de asistencia o Quad Block. Metrica: carga total máxima (peso corporal + lastre).',
   prog:['Sin experiencia en regleta: empezar con banda de asistencia o jugs','Series 1-3: calentamiento progresivo al 50-70% del máximo','Series 4-8: aproximacion al 1RM. Descanso completo entre series (2-3 min)','Progresar: +2.5kg cuando completes todas las series sin fallo anticipado'],
   warn:'Calentamiento obligatorio de 20 min antes de cargas máximas. Protocolo SOLO para intermedios con base previa en regleta. El SNC tarda más en recuperarse que la musculatura - respetar 48h entre sesiones de alta intensidad.'},

  {t:'Repeaters 7:3 al 60% (Resistencia)',ph:'Fase Do More | Resistencia',col:'#9B6EFF',
   nota:'Ciclos 7s tensión / 3s descanso al 60% del 1RM | Hasta el fallo metabólico',
   desc:'Protocolo de resistencia de antebrazo (Lattice Training). Ciclos de 7 segundos de tensión seguidos de 3 segundos de recuperación al 60% de la carga máxima obtenida en el Max Hang. Si el peso corporal supera el 60% del 1RM: usar polea de asistencia (obligatorio - no negociable). Metrica: Tiempo Total hasta el Fallo (TTF). Objetivo: fallo metabólico, no perdida de forma técnica.',
   prog:['Calcular 60% del 1RM: si max hang = 80kg totales, trabajar a 48kg','Si BW > 60% del 1RM: usar polea con asistencia para reducir carga efectiva','Registrar TTF en cada sesión para medir progresión','Aumentar carga cuando TTF supere los 10-12 minutos consistentemente'],
   warn:'La carga del 60% NO es negociable. Una intensidad mayor convierte el ejercicio en fuerza, no en resistencia. El objetivo es el fallo metabólico puro.'},

  {t:'ARC Training (Base Aeróbica)',ph:'Fase Do More | Base aeróbica',col:'#F472B6',
   nota:'20-40 min continuo | Fader: 3-5 | Sin pump oclusivo',
   desc:'Protocolo de base aeróbica (Barrows 2013 / Power Company). Escalada continua durante 20-40 minutos por debajo del umbral anaeróbico. Fader 3-5/10. Si aparece pump oclusivo o fallo técnico: la dificultad es excesiva, reducir inmediatamente. Si no hay ninguna sensacion de fatiga local: aumentar levemente la dificultad. Objetivo: elevar umbral anaeróbico y optimizar capilarizacion muscular periferica.',
   prog:['Semanas 1-2: 2 series de 15 min con 5-10 min descanso','Semanas 3-4: 3 series de 20 min o 1 serie de 30 min continuo','Progresar duración antes de intensidad','Puede ejecutarse como "segundo día consecutivo" por su bajo costo metabólico'],
   warn:'Si el pump es inmanejable en cualquier momento: bajar al siguiente grado inmediatamente. No negociar este criterio.'},

  {t:'4x4 Bloques (Power Endurance)',ph:'Fase Do More | Power Endurance',col:'#FFB800',
   nota:'4 bloques x 4 reps | Descanso: 4-5 min entre sets',
   desc:'Protocolo de resistencia anaeróbica (Lattice Training / Guia Maestra). Seleccionar 4 bloques de dificultad media-alta y escalarlos de forma consecutiva sin descanso entre ellos. Repetir 4 veces con 4-5 minutos de descanso entre cada ronda. Objetivo: gestión del lactato y tolerancia a la fatiga muscular extrema bajo cargas moderadas-altas. NOTA: esto es entrenamiento, NO un test.',
   prog:['Bloques al 70-80% del limite (completables pero exigentes)','Sin descanso entre los 4 bloques de la misma ronda','4-5 min de descanso completo entre rondas','Progresar: incrementar dificultad de los bloques, no reducir descanso'],
   warn:'CONFLICTO: no combinar con sesiones de fuerza máxima el mismo día. La acidosis extrema canibaliza las adaptaciones de fuerza pura (Principio SAID). Limitar a 2 sesiones semanales.'},

  {t:'Crux Intervals (Power Endurance específica)',ph:'Fase Do More | Transferencia a ruta',col:'#00E5A0',
   nota:'Escalar crux -> bajar -> repetir en top-rope hasta el final',
   desc:'Protocolo de transferencia específica para ruta (Lattice Training / Guia Maestra). Escalar los primeros pernos o el crux de una ruta difícil como lider, descender inmediatamente, y volver a escalar en top-rope hasta el punto más alto para acumular fatiga mecánica controlada. Muy alta especificidad para escalada deportiva.',
   prog:['Seleccionar ruta al 85-95% del limite redpoint','Primera repeticion: lider hasta el crux o 3-4 pernos','Bajar inmediatamente, sin descanso largo','Segunda repeticion: top-rope hasta la cadena. Registrar donde fallas'],
   warn:'Solo para escalada deportiva (sport). Requiere seguro de confianza. Las adaptaciones de PE son altamente transitorias - introducir justo antes del periodo de rendimiento o proyecto.'}
];

var TEST_RANGES = {
  hang_max: {
    beginner:     {lo:0.80, mid:0.90, hi:1.10, elite:1.30, unit:'ratio'},
    intermediate: {lo:1.00, mid:1.15, hi:1.35, elite:1.60, unit:'ratio'},
    advanced:     {lo:1.30, mid:1.45, hi:1.65, elite:1.90, unit:'ratio'},
    elite:        {lo:1.55, mid:1.70, hi:1.90, elite:2.10, unit:'ratio'}
  },
  pullup_3rm: {
    beginner:     {lo:0.90, mid:1.00, hi:1.15, elite:1.30, unit:'ratio'},
    intermediate: {lo:1.10, mid:1.25, hi:1.45, elite:1.60, unit:'ratio'},
    advanced:     {lo:1.35, mid:1.50, hi:1.65, elite:1.80, unit:'ratio'},
    elite:        {lo:1.55, mid:1.70, hi:1.85, elite:2.00, unit:'ratio'}
  },
  cf_minutes: {
    beginner:     {lo:2,  mid:4,  hi:7,  elite:10, unit:'min'},
    intermediate: {lo:5,  mid:7,  hi:11, elite:14, unit:'min'},
    advanced:     {lo:8,  mid:11, hi:14, elite:18, unit:'min'},
    elite:        {lo:12, mid:15, hi:18, elite:22, unit:'min'}
  },
  repeater_6rep: {
    beginner:     {lo:0.75, mid:0.85, hi:1.00, elite:1.10, unit:'ratio'},
    intermediate: {lo:0.95, mid:1.05, hi:1.20, elite:1.35, unit:'ratio'},
    advanced:     {lo:1.15, mid:1.25, hi:1.40, elite:1.55, unit:'ratio'},
    elite:        {lo:1.35, mid:1.50, hi:1.65, elite:1.80, unit:'ratio'}
  }
};

var REC_META={
  fresh:     {lbl:'Fresco',     col:'#00E5A0', css:'rec-status-fresh',     badge:'ÓPTIMO'},
  recovering:{lbl:'Recuperando',col:'#FFB800', css:'rec-status-recovering', badge:'EN RECUPERACIÓN'},
  fatigued:  {lbl:'Fatigado',   col:'#FF4D6A', css:'rec-status-fatigued',   badge:'FATIGADO'}
};


/* Human-readable system names with energy-system terminology (Feehally / Beastmaking ch.23-24)
   - Aerobic system: oxigeno + grasa/glucogeno, sostiene esfuerzos largos
   - Anaerobic lactic: glucosa, 20s-2min, 5-20 movimientos intensos
   - Anaerobic alactic: ATP, 1-5 movimientos máximos */
var SYS_HUMAN={
  'An Cap':       'Anaeróbico lactico  -  aguantar 5 a 20 movimientos intensos sin perder fuerza',
  'An Pow':       'Anaeróbico alactico  -  explosividad máxima 1 a 5 movimientos',
  'Aero Pow':     'Resistencia con intensidad  -  rutas largas a 60-80% sin bombeo terminal',
  'Aero Cap':     'Base aeróbica  -  recuperarse entre movimientos y entre intentos',
  'Fuerza max':   'Fuerza máxima de dedos  -  reclutamiento neural + adaptación tendinosa',
  'Fuerza traccion':'Fuerza de brazos y espalda para jalar en escalada',
  'Fuerza isométrica':'Sostener posiciones de brazos doblados (lock-offs)',
  'Fuerza max unilateral':'Fuerza de un solo brazo  -  nivel avanzado',
  'Recuperación activa':'Movimiento suave para acelerar la recuperación',
  'Prevencion lesiones':'Fortalecer antagonistas que equilibran los de escalada',
  'ROM y recuperación':'Flexibilidad y movilidad para escalar mejor',
  'Skill development':'Refinar técnica de movimiento y eficiencia',
  'Aero Cap + An Cap':'Combinar aguante aeróbico con esfuerzos intensos'
};

/* =====================================================
   LEVEL_PROFILES: per-level training prescriptions
   Each entry in phaseSeq represents ONE WEEK of training.
   - "4-3-2-1" plan = 10 weeks total (4 + 3 + 2 + 1)
   - "3-2-1" plan = 6 weeks total (3 + 2 + 1)

   Scientific basis:
   - Bompa & Buzzichelli (Periodization Training for Sports, 2015): framework
     canonico de periodizacion AA > MxS > Conversion to Power > Maintenance.
     Para principiantes (cap.11) la fase AA (Anatomical Adaptation) es OBLIGATORIA
     antes de cualquier trabajo de fuerza máxima - prepara tendones y ligamentos.
   - Horst (Training for Climbing, 2016): el macrociclo 4-3-2-1 aplicado a escalada
     organiza el ciclo como 4 sem base aeróbica > 3 sem fuerza máxima >
     2 sem potencia > 1 sem deload/supercompensacion.
   - Barrows (Training for Sport Climbing, 2014): "in EVERY phase, strength is
     trained" - lo que cambia entre Base y Peak es la mezcla de capacidades
     (An Cap + Aero Cap) vs powers (Aero Pow + An Pow).
   - Tkacz (Training 102, p.38): los principiantes (v3-v5) deben dedicar
     ~75% del tiempo a escalada en muro. El fingerboard pesado solo cuando
     tendones ya estan adaptados (>2 anios consistentes).
   - Feehally (Beastmaking): tendones digitales adaptan 3x más lento que
     musculos. Los principiantes deben evitar la fase de potencia (campus,
     dinámicos al limite) hasta tener base de fuerza.
   - Anderson (RCTM): no fingerboard de alta intensidad antes de 6-12 meses
     de escalada consistente.
===================================================== */
var LEVEL_PROFILES = {
  beginner: {
    /* Principiantes: NO power phase. Bompa cap.11 (Anatomical Adaptation):
       las primeras semanas son AA - circuit training, alto volumen / baja
       intensidad para preparar tendones y ligamentos. Tkacz: 75% del tiempo
       en muro (volumen técnico). Sin campus, sin max hangs intensos. */
    phaseSeq:    {
      '4-3-2-1': ['endurance','endurance','endurance','endurance',
                  'endurance','endurance','endurance',
                  'strength','strength',
                  'deload'],
      '3-2-1':   ['endurance','endurance','endurance',
                  'strength','strength',
                  'deload']
    },
    minGapMult:  1.4,
    maxSessPerWk: 3,
    exPerSession: 2,
    intensityNote: 'Fader 3-5. Nunca al fallo muscular las primeras 8 semanas. Bompa: fase de Anatomical Adaptation.',
    progressNote: 'Progresar cada 2-3 semanas, no cada semana. Tkacz (Training102 p.38): 75% del tiempo en muro, 25% aislamiento.'
  },
  intermediate: {
    /* Intermedios: modelo Horst clasico 4-3-2-1. Endurance > Strength > Power > Deload.
       Tkacz (p.38): 50% aislamiento + 50% muro. Bompa: ya pueden hacer MxS
       y Conversion to Power tradicional. */
    phaseSeq:    {
      '4-3-2-1': ['endurance','endurance','endurance','endurance',
                  'strength','strength','strength',
                  'power','power',
                  'deload'],
      '3-2-1':   ['endurance','endurance','endurance',
                  'strength','strength',
                  'deload']
    },
    minGapMult:  1.0,
    maxSessPerWk: 4,
    exPerSession: 3,
    intensityNote: 'Fader 6-8 en sesiones Go Hard. Fader 4-6 en Do More. Bompa: Conversion to Power requiere base previa.',
    progressNote: 'Progresar cada 1-2 semanas con carga medida. Tkacz: 50% muro, 50% aislamiento.'
  },
  advanced: {
    /* Avanzados: el orden de fases depende del OBJETIVO (Barrows 2013 / Bompa).
       - boulder/competition: Strength → Power → Endurance (peak de potencia
         antes de la temporada de boulder o evento).
       - sport: Endurance → Strength → Power (base aeróbica primero para
         sostener vías largas; el peak es de potencia aplicada).
       - both: híbrido (base corta + strength + power + endurance corta).
       Tkacz (p.38): 25-45% muro, 55-75% aislamiento.
       Default (fallback): el orden de boulder. */
    phaseSeq:    {
      '4-3-2-1': ['strength','strength','strength','strength',
                  'power','power','power',
                  'endurance','endurance',
                  'deload'],
      '3-2-1':   ['strength','strength','strength',
                  'power','power',
                  'deload']
    },
    phaseSeqByGoal: {
      sport: {
        /* Sport: base aeróbica primero, después fuerza, después potencia
           aplicada a rutas. Peak de potencia justo antes del deload coincide
           con temporada de roca. */
        '4-3-2-1': ['endurance','endurance','endurance','endurance',
                    'strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['endurance','endurance','endurance',
                    'strength','strength',
                    'deload']
      },
      boulder: {
        /* Boulder: fuerza primero (frescura neural), luego potencia, después
           algo de resistencia para enlaces de boulder largos. */
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['strength','strength','strength',
                    'power','power',
                    'deload']
      },
      both: {
        /* Híbrido: base corta + fuerza + potencia + resistencia final corta. */
        '4-3-2-1': ['endurance','endurance','endurance',
                    'strength','strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['endurance','endurance',
                    'strength','strength',
                    'power',
                    'deload']
      },
      competition: {
        /* Competition: igual que boulder pero con peak más afilado. */
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['strength','strength',
                    'power','power','power',
                    'deload']
      }
    },
    minGapMult:  0.9,
    maxSessPerWk: 5,
    exPerSession: 4,
    intensityNote: 'Fader 8-10 en Go Hard. Detener ante fatiga neuromuscular, no ante pump. Barrows: Base(4)+Peak1(3)+Peak2(2)+Deload(1).',
    progressNote: 'Progresión semanal con metricas exactas (kg, TTF, liston). Bompa: buffer descendente sesión a sesión.'
  },
  elite: {
    /* Elite: estructura paralela a advanced pero con microciclos 3:1
       (3 semanas build + 1 descarga implícita en deload final) y maintenance
       de MxS durante la fase de endurance. En plan corto, priorizan
       potencia ya que fuerza esta consolidada. Bompa: Conversion to
       Specific Strength. */
    phaseSeq:    {
      '4-3-2-1': ['strength','strength','strength','strength',
                  'power','power','power',
                  'endurance','endurance',
                  'deload'],
      '3-2-1':   ['power','power','power',
                  'endurance','endurance',
                  'deload']
    },
    phaseSeqByGoal: {
      sport: {
        '4-3-2-1': ['endurance','endurance','endurance','endurance',
                    'strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['endurance','endurance',
                    'strength','strength',
                    'power','power',
                    'deload']
      },
      boulder: {
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['power','power','power',
                    'endurance','endurance',
                    'deload']
      },
      both: {
        '4-3-2-1': ['endurance','endurance','endurance',
                    'strength','strength','strength','strength',
                    'power','power',
                    'deload'],
        '3-2-1':   ['strength','strength',
                    'power','power','power',
                    'deload']
      },
      competition: {
        '4-3-2-1': ['strength','strength','strength','strength',
                    'power','power','power',
                    'endurance','endurance',
                    'deload'],
        '3-2-1':   ['power','power','power','power',
                    'endurance',
                    'deload']
      }
    },
    minGapMult:  0.85,
    maxSessPerWk: 6,
    exPerSession: 4,
    intensityNote: 'Fader 9-10. Autorregulacion por HRV y TTF. Máxima especificidad (Bompa: Conversion to Specific Strength).',
    progressNote: 'Progresión por ciclos de 3 semanas con validacion de tests. Tests al inicio y fin del macrociclo (Bompa cap.10).'
  }
};

