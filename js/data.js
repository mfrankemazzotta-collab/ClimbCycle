/* ======================================================
   data.js -- Static training data tables
   ClimbCycle v5
   No functions, no DOM access, no side effects.
====================================================== */

var GLBL={sport:'Escalada en Roca',boulder:'Boulder',both:'Mixto',competition:'Competicion'};

var LLBL={beginner:'Principiante',intermediate:'Intermedio',advanced:'Avanzado',elite:'Elite'};

var DLG=['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];

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

var SL_RPE_LABELS={2:'Muy suave - ARC, recuperacion',4:'Suave - tecnica',6:'Moderada - circuitos',8:'Dura - limite, hangboard',10:'Maxima - todo al fallo'};

var GRADES={
  beginner:    ['4','4+','5','5+','6a','6a+'],
  intermediate:['6a','6a+','6b','6b+','6c','6c+'],
  advanced:    ['7a','7a+','7b','7b+','7c','7c+'],
  elite:       ['8a','8a+','8b','8b+','8c','8c+','9a']
};

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
    title:'Test de fuerza maxima (Max Hang)',
    category:'finger_strength',
    diff:'Intermedio',
    col:'#38BDF8',
    freq:'Cada 4-6 semanas',
    how:'1) Calienta 20 min de escalada suave mas 5 min de hangs progresivos. 2) Colgate de una regleta de 20mm en medio crimp. 3) Anadi peso hasta el maximo que puedas sostener exactamente 10 segundos sin soltar. 4) Descansa 5 min y repite para confirmar. 5) Anota: peso corporal + lastre = tu mark.',
    mide:'Fuerza isometrica maxima de dedos (N/kg relativo)',
    unit:'kg totales (tu peso + lastre)',
    result_key:'hang_max',
    result_label:'Ej: 75 (si pesas 70 y aguantas +5kg)',
    interpret: function(v,level,weight){
      var kg=parseFloat(v);if(isNaN(kg)||kg<=0)return null;
      var ratio=weight>0?kg/weight:0;
      if(level==='beginner'){
        if(ratio<0.9)  return {txt:'Tu fuerza digital esta en etapa inicial  -  completamente normal para tu nivel. El objetivo es llegar a aguantar tu peso corporal.',   col:'#7070AA',icon:'&#x1F4CA;',adj:-15};
        if(ratio<1.1)  return {txt:'Buena progresion. Colgarte con tu peso corporal es el primer hito importante segun Horst.',                                           col:'#00E5A0',icon:'&#x2705;', adj:0};
        return             {txt:'Fuerza digital por encima del promedio para principiante. Puedes progresar a regletas mas pequenas.',                                   col:'#CCFF00',icon:'&#x26A1;',adj:10};
      }
      if(level==='intermediate'){
        if(ratio<1.1)  return {txt:'La fuerza digital esta por debajo del rango intermedio esperado  -  prioriza la fase de fuerza antes de potencia.',                    col:'#FF4D6A',icon:'&#x26A0;',adj:-20};
        if(ratio<1.3)  return {txt:'Fuerza digital en rango normal para intermedio. Buen punto de partida.',                                                             col:'#00C8FF',icon:'&#x2705;', adj:0};
        if(ratio<1.5)  return {txt:'Fuerza digital solida para intermedio. Puedes enfocarte mas en potencia y resistencia.',                                             col:'#00E5A0',icon:'&#x2705;', adj:5};
        return             {txt:'Fuerza digital alta para tu nivel  -  ojo con la potencia y la resistencia si son tu limitante.',                                         col:'#CCFF00',icon:'&#x26A1;',adj:10};
      }
      if(ratio<1.3)    return {txt:'Fuerza digital por debajo del rango esperado para escaladores avanzados. Ciclo de base prioritario.',                                col:'#FF4D6A',icon:'&#x26A0;',adj:-20};
      if(ratio<1.6)    return {txt:'Fuerza digital competente. Foco en especificidad y progresion de carga.',                                                            col:'#00C8FF',icon:'&#x2705;', adj:0};
      return               {txt:'Fuerza digital alta  -  potencia y resistencia de dedos pueden ser el siguiente limitante.',                                              col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
  },
  {
    id:'pullup3rm',
    title:'Test de fuerza de traccion (3RM Pull-up)',
    category:'pulling_strength',
    diff:'Facil',
    col:'#9B6EFF',
    freq:'Cada 4-6 semanas',
    how:'1) Calienta con 10 min de movimiento suave y 2 series de 5 pull-ups sin lastre. 2) Anadi peso progresivamente hasta encontrar el maximo con el que puedes hacer exactamente 3 repeticiones limpias (sin trampa, bajando lento). 3) Descansa 5 min. 4) Anota: peso corporal + lastre = tu 3RM.',
    mide:'Fuerza maxima de traccion (3RM relativo al peso corporal)',
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
    how:'1) Calienta 15 min. 2) Determina tu fuerza maxima en regleta (o usa 100% como referencia). 3) Haz hangs de 7s / 3s descanso al 60-70% de tu maximo. 4) Continua hasta que no puedas completar un hang de 7s limpio. 5) Anota cuantos minutos duraste antes de fallar.',
    mide:'Critical Force  -  el umbral aerobico local de los flexores digitales (Giles et al. 2019)',
    unit:'minutos antes de fallar',
    result_key:'cf_minutes',
    result_label:'Ej: 8 (minutos que duraste)',
    interpret: function(v,level,weight){
      var min=parseFloat(v);if(isNaN(min)||min<=0)return null;
      if(level==='beginner'){
        if(min<3)  return {txt:'Base aerobica digital muy baja  -  normal para principiante. ARC training es tu prioridad.',                                               col:'#7070AA',icon:'&#x1F4CA;',adj:-5};
        if(min<6)  return {txt:'Base aerobica en desarrollo. Enfocate en ARC antes de an cap.',                                                                          col:'#00C8FF',icon:'&#x2705;', adj:0};
        return         {txt:'Buena base aerobica para principiante. La fuerza maxima es probablemente tu limitante ahora.',                                             col:'#00E5A0',icon:'&#x2705;', adj:5};
      }
      if(min<4)    return {txt:'Critical Force bajo  -  el sistema aerobico digital es tu limitante principal. Prioriza ARC antes de An Cap.',                             col:'#FF4D6A',icon:'&#x26A0;',adj:-20};
      if(min<7)    return {txt:'Critical Force moderado. Puedes trabajar An Cap pero incluye ARC regularmente.',                                                         col:'#FFB800',icon:'&#x26A0;',adj:-5};
      if(min<12)   return {txt:'Buen Critical Force. Tu sistema aerobico soporta bien el An Cap.',                                                                       col:'#00C8FF',icon:'&#x2705;', adj:0};
      return           {txt:'Excelente Critical Force. Tu limitante es probablemente la fuerza maxima o la potencia.',                                                  col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
  },
  {
    id:'repeater',
    title:'Test de resistencia de dedos (Repeater)',
    category:'finger_endurance',
    diff:'Moderado',
    col:'#00E5A0',
    freq:'Cada 4-6 semanas',
    how:'1) Calienta bien. 2) Usa una regleta que uses normalmente en entrenamiento. 3) Haz series de 7s colgado / 3s descanso al maximo peso posible que te permita completar EXACTAMENTE 6 repeticiones antes de fallar. 4) Ese peso (corporal + lastre) es tu resultado. Si lo completas muy facil, sube peso la proxima.',
    mide:'Resistencia de fuerza de dedos  -  capacidad anaerobica local (Eva Lopez, TrainingBeta)',
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
      if(ratio<1.3)    return {txt:'Buena resistencia digital. Puedes enfocarte en fuerza maxima como siguiente limitante.',                                             col:'#00E5A0',icon:'&#x2705;', adj:5};
      return               {txt:'Resistencia digital alta. Tu limitante es probablemente la fuerza maxima pura.',                                                       col:'#CCFF00',icon:'&#x26A1;',adj:8};
    }
  },
  {
    id:'maxgrade',
    title:'Grado maximo redpoint',
    category:'performance',
    diff:'Facil',
    col:'#CCFF00',
    freq:'Cada mesociclo',
    how:'1) Sin presion  -  este es solo un registro. 2) Anota el grado mas duro que hayas completado limpio en los ultimos 2 meses (redpoint: con intentos previos). 3) Si escalaas boulder y roca, anota ambos. 4) Usa grado frances para roca, el mismo sistema para boulder.',
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
      if(tier<range[0])  return {txt:'Tu grado maximo esta por debajo del rango tipico de '+level+'. La tecnica y la confianza pueden estar limitando mas que la fuerza fisica.',col:'#FFB800',icon:'&#x26A0;',adj:-10};
      if(tier<=range[1]) return {txt:'Tu grado redpoint esta dentro del rango esperado para tu nivel. El plan esta bien calibrado.',                                     col:'#00E5A0',icon:'&#x2705;', adj:0};
      return                 {txt:'Tu grado maximo supera el rango tipico de tu nivel. Considera actualizar tu nivel en el perfil.',                                    col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
  }
];

var BLOCKS={
  strength: {
    label:'Fuerza',      col:'#38BDF8', emo:'Fuerza',
    sessionType:'Go Hard',
    dial:'Intensivo',
    faderRange:'8-10',
    faderDesc:'Intensidad maxima. Detener ante primer signo de fatiga neuromuscular.',
    goalFocus:{sport:'Fuerza de dedos + traccion para gestionar crux en rutas',
               boulder:'Fuerza maxima de contacto y reclutamiento explosivo',
               both:'Base de fuerza bilateral para transferir a ruta y bloque',
               competition:'Pico de fuerza dirigido a fecha objetivo'}
  },
  power:    {
    label:'Potencia',    col:'#9B6EFF', emo:'Potencia',
    sessionType:'Go Hard',
    dial:'Intensivo',
    faderRange:'9-10',
    faderDesc:'Fresqueza neuromuscular absoluta. Minimo 48h entre sesiones.',
    goalFocus:{sport:'Potencia para movimientos crux y secuencias explosivas en roca',
               boulder:'Potencia maxima de contacto y RFD en primeros 200ms',
               both:'Potencia explosiva aplicada a boulder y rutas cortas duras',
               competition:'Pico de potencia afinado para el formato de competicion'}
  },
  endurance:{
    label:'Resistencia', col:'#F472B6', emo:'Resist.',
    sessionType:'Do More',
    dial:'Extensivo',
    faderRange:'3-7',
    faderDesc:'Volumen alto, intensidad moderada. Si hay bombeo oclusivo: reducir dificultad.',
    goalFocus:{sport:'Power endurance para gestionar rutas largas sin descanso',
               boulder:'Capacidad anaerobica para encadenar secuencias de boulder',
               both:'Base aerobica + power endurance para ambas disciplinas',
               competition:'Resistencia especifica al formato: final corta o larga'}
  },
  deload:   {
    label:'Deload',      col:'#00E5A0', emo:'Deload',
    sessionType:'Explore',
    dial:'Extensivo suave',
    faderRange:'2-4',
    faderDesc:'Supercompensacion. Volumen -50%. Prohibido llegar al fallo.',
    goalFocus:{sport:'Tecnica en grados faciles + movilidad + antagonistas',
               boulder:'Refinamiento motor en grados bajos + movilidad',
               both:'Recuperacion activa + trabajo tecnico sin fatiga',
               competition:'Tapering: maxima especificidad, volumen minimo'}
  },
  rest:     {label:'Descanso',    col:'#444466', emo:'--', sessionType:'Rest',   dial:'',faderRange:'',faderDesc:''},
  test:     {label:'Test',        col:'#FFB800', emo:'Test',sessionType:'Test',  dial:'',faderRange:'',faderDesc:''}
};

var EX={
  strength: [{n:'Max Hangs 20mm',d:'6x10s / 3min'},{n:'Lock-offs',d:'4x3 rep 5s'},{n:'Weighted Pull-ups',d:'4x3-5 rep'},{n:'Core Hanging',d:'3x20s L-sit'}],
  power:    [{n:'Campus Board',d:'Max ladders 1-3-5'},{n:'Dynamic Boulder',d:'Al limite'},{n:'Plyometric Pull-ups',d:'4x5 explosivos'}],
  endurance:[{n:'4x4s',d:'4 prob x 4 series'},{n:'ARC Training',d:'30min 40%'},{n:'Circuitos',d:'10 movs x 6 series'}],
  deload:   [{n:'Easy Traversing',d:'30min tecnica'},{n:'Movilidad',d:'20min hombros'},{n:'Antagonistas',d:'Extensores'}]
};

var SS_META = {
  available:   {lbl:'Disponible',  col:'#CCFF00', css:'ss-available',   icon:'&#x25B6;'},
  completed:   {lbl:'Completada',  col:'#00E5A0', css:'ss-completed',   icon:'&#x2713;'},
  missed:      {lbl:'No realizada',col:'#FF4D6A', css:'ss-missed',      icon:'&#x2715;'},
  locked:      {lbl:'Pendiente',   col:'#444466', css:'ss-locked',       icon:'&#x1F512;'},
  rescheduled: {lbl:'Movida',      col:'#FFB800', css:'ss-rescheduled', icon:'&#x21C4;'},
  rest:        {lbl:'Descanso',    col:'#444466', css:'ss-locked',       icon:'--'}
};

var SYS_HUMAN={
  'An Cap':       'Aguantar movimientos intensos seguidos sin fatigarte',
  'An Pow':       'Potencia maxima  -  explotar en un movimiento',
  'Aero Pow':     'Aguantar rutas largas sin bombearte demasiado',
  'Aero Cap':     'Base aerobica  -  recuperarte mas rapido entre movimientos',
  'Fuerza max':   'Fuerza maxima de dedos  -  adaptacion tendinosa gradual',
  'Fuerza traccion':'Fuerza de brazos y espalda para jalar en escalada',
  'Fuerza isometrica':'Sostener posiciones de brazos doblados',
  'Fuerza max unilateral':'Fuerza de un solo brazo  -  nivel avanzado',
  'Recuperacion activa':'Movimiento suave para recuperarte mas rapido',
  'Prevencion lesiones':'Fortalecer musculos que equilibran los de escalada',
  'ROM y recuperacion':'Flexibilidad y movilidad para escalar mejor',
  'Skill development':'Mejorar la tecnica de movimiento y eficiencia',
  'Aero Cap + An Cap':'Combinar aguante aerobico con esfuerzos intensos'
};

var EX_POOL = {
  strength:[
    {id:'str0a',n:'Hangs en jugs con pies apoyados',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:2,skill:1,minLevel:0,phase:'warmup',
     det:'Cuelgate de presas grandes (jugs) con los pies en una silla o caja. 5 x 10s. Descanso 2 min. Primer paso para adaptar los tendones de los dedos sin riesgo.',
     nota:'5 x 10s :2min (pies apoyados)',
     simple:'Practica colgarte con ayuda de los pies  -  asi los tendones de los dedos se adaptan poco a poco sin riesgo de lesion.',
     sci:'Horst (2008): los tendones digitales necesitan hasta 12 meses de adaptacion gradual. Empezar con carga asistida es critico para prevenir lesiones en principiantes.',
     tips:['Si sientes dolor agudo en dedos: parar inmediatamente','Calentamiento 10 min de escalada facil primero','Progresar reduciendo apoyo de pies semana a semana']},
    {id:'str0b',n:'Dominadas con peso corporal',cat:'pull_strength',sys:'Fuerza traccion',col:'#38BDF8',fatigue:2,skill:1,minLevel:0,phase:'warmup',
     det:'Pull-ups normales sin lastre. 3-4 series al maximo con buena forma. Descanso 2-3 min. Si no llegas a 3 reps, usar banda elastica de asistencia.',
     nota:'3-4 x max reps :3min',
     simple:'Dominadas basicas  -  construyen la fuerza de brazos y espalda que necesitas para escalar bien.',
     sci:'Horst (2016): la fuerza de traccion es el predictor numero 1 de progresion en principiantes antes del fingerboard.',
     tips:['Bajar lento (3 segundos)  -  mas efectivo','Hombros siempre abajo, no encorvados','Usa banda si no llegas a 3 reps limpias']},
    {id:'str0c',n:'Bouldering en grados muy faciles',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:2,skill:2,minLevel:0,phase:'warmup',
     det:'Escala problemas que puedas completar facilmente. Foco en movimiento, no en dificultad. 30-45 min de escalada tranquila.',
     nota:'30-45 min al 50-60% de tu limite',
     simple:'Escalar facil con atencion a como te mueves  -  la mejor forma de ganar fuerza sin lesionarte cuando empiezas.',
     sci:'Bechtel (2019): el movimiento de escalada es el mejor estimulo de adaptacion neural para principiantes. Tecnica y fuerza se desarrollan juntas.',
     tips:['Foco en footwork  -  donde pones los pies','Escalar lento y con control','No te preocupes por el grado']},
    {id:'str1',n:'Deadhangs en regleta 20mm',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:4,skill:3,minLevel:1,
     det:'5 series x 10s con 3s de buffer. Descanso 3 min. Peso progresivo semana a semana.',
     nota:'5 x 10s(3) :3min',
     simple:'Colgarse de una regleta pequena durante 10 segundos  -  el ejercicio central para construir fuerza maxima de dedos.',
     sci:'Maisch/TrainingBeta: buffer = effort level. EL3 = intensidad moderada. 72h recuperacion recomendada.',
     tips:['20-30 min calentamiento digital previo','Variar agarre cada 2-3 semanas','Subir 2.5kg cuando completes todos los sets']},
    {id:'str2',n:'Bouldering al limite',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:5,minLevel:1,
     det:'Problemas al 95-100% limite. 4-8 intentos por problema con 5-8 min descanso completo.',
     nota:'',
     simple:'Escalar los problemas mas dificiles que puedas  -  el maximo estimulo para desarrollar fuerza especifica de escalada.',
     sci:'Barrows (2013): An Cap necesita 16+ semanas. SAID (Horst 2008): especificidad maxima en el estimulo.',
     tips:['Calentamiento 30-40 min obligatorio','Parar si calidad cae mas del 20%','Registrar grado y tipo de agarre']},
    {id:'str3',n:'Dominadas con lastre',cat:'pull_strength',sys:'Fuerza traccion',col:'#38BDF8',fatigue:4,skill:3,minLevel:1,
     det:'4-6 series de 3-5 reps con lastre. Cadencia 2-0-2. Descanso 3-5 min entre series.',
     nota:'5 x 3-5rep :4min',
     simple:'Dominadas con peso adicional  -  cuando ya puedes hacer 8+ sin lastre, agregar peso acelera la ganancia de fuerza.',
     sci:'Horst (2008): pull-ups lastrados + deadhangs = mayor transferencia a escalada. Adaptacion: 8-12 semanas.',
     tips:['Nunca sacrificar la forma por el peso','Registrar 3RM cada semana','Fingerboard primero si combinas ejercicios']},
    {id:'str5',n:'Lock-offs a distintas alturas',cat:'pull_strength',sys:'Fuerza isometrica',col:'#38BDF8',fatigue:3,skill:3,minLevel:1,
     det:'4 series x 3 rep x 5s hold a 90/120/150 grados de codo. Descanso 3 min.',
     nota:'4 x 3rep x 5s hold :3min',
     simple:'Sostener la posicion de dominada a distintas alturas  -  desarrolla control para movimientos tecnicos.',
     sci:'Horst (2008): lock-offs en multiples angulos cubre todo el rango funcional de escalada.',
     tips:['Empezar en angulo mas fuerte (90 grados)','Progresar angulo antes de agregar peso','Combinar con deadhangs el mismo dia']},
    {id:'str6',n:'One-arm hang asistido',cat:'finger_strength',sys:'Fuerza max unilateral',col:'#38BDF8',fatigue:4,skill:4,minLevel:2,
     det:'Asistido con banda o polea. 5 x 8s por brazo. Descanso 3 min. Buffer de 2-3s.',
     nota:'5 x 8s(2) cada brazo :3min',
     simple:'Colgarse de un solo brazo con ayuda de banda  -  fuerza unilateral para movimientos de palanca avanzados.',
     sci:'Anderson (Rock Climbers Training Manual): fuerza unilateral critica para movimientos de palanca y desplomes.',
     tips:['Banda de resistencia para calibrar asistencia','Empezar con brazo dominante','Progresar reduciendo grosor de banda']}
  ],
  power:[
    {id:'pow0a',n:'Movimientos dinamicos en facil',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:2,skill:2,minLevel:0,phase:'warmup',
     det:'Practica saltar a presas grandes en el muro de boulder desde posicion solida. 4-6 intentos con 3-4 min descanso.',
     nota:'4-6 x 1 movimiento :3-4min',
     simple:'Empezar a practicar movimientos dinamicos  -  saltos  -  con presas grandes y seguras para aprender el patron.',
     sci:'Horst (2016): la potencia no puede entrenarse directamente sin base de fuerza. En principiantes, practicar el patron de movimiento es el primer paso.',
     tips:['Muro vertical o poco desplomado','Presas grandes y seguras','Importa la tecnica del movimiento, no el grado']},
    {id:'pow0b',n:'Bouldering rapido en grados faciles',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:3,skill:3,minLevel:0,phase:'warmup',
     det:'Escala problemas simples pero con movimientos rapidos y decisivos. 3-5 problemas con 5 min descanso completo.',
     nota:'3-5 x problema facil :5min',
     simple:'Escalar boulders que conoces pero moviendote rapido y con decision  -  entrena la velocidad de respuesta muscular.',
     sci:'Bechtel (2019): en principiantes la mejora de potencia viene del refinamiento neural. Movimiento rapido en grados faciles es el estimulo correcto.',
     tips:['Elige problemas que puedas completar seguro','Explota desde los pies, no solo de los brazos','5 min de descanso real entre intentos']},
    {id:'pow1',n:'Campus: movimiento maximo',cat:'campus_board',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'Desde liston 1, movimiento dinamico al liston mas lejano posible. 6-8 intentos con 5 min descanso.',
     nota:'6-8 x max move :5min',
     simple:'Campus board: saltar al liston mas lejano posible  -  mide la potencia explosiva real.',
     sci:'Barrows (2013) PEAK PHASE: An Pow = % capacidad anaerobica en un movimiento. RFD200ms (Anderson).',
     tips:['Solo con cuerpo 100% fresco','Registrar liston alcanzado cada sesion','Sin campus: dynamic bouldering al limite']},
    {id:'pow2',n:'Bouldering dinamico al limite',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:1,
     det:'4-8 movs explosivos al maximo. Descanso = tiempo trabajo. 4 reps x 4 sets, 10 min entre sets.',
     nota:'4 sets x 4 reps, rest=work',
     simple:'Escalar los bloques mas dificiles con maxima explosion  -  para desarrollar potencia real de escalada.',
     sci:'Barrows (2013): powered out NO pump. Mantener 1 sesion An Cap/semana para no saturar lactato.',
     tips:['Problemas al limite absoluto de fuerza','Descanso fijo: 20s trabajo = 20s descanso','Bouldering primero, An Cap despues']},
    {id:'pow3',n:'Dominadas explosivas (pliometricas)',cat:'pull_strength',sys:'An Pow',col:'#9B6EFF',fatigue:4,skill:3,minLevel:1,
     det:'Dominadas soltando la barra en el punto mas alto. 4 x 5 reps. Descanso 3-4 min entre series.',
     nota:'4 x 5 explosivos :4min',
     simple:'Dominadas donde sueltas la barra arriba  -  entrena la velocidad de contraccion muscular para movimientos explosivos.',
     sci:'RFD200ms (Anderson): velocidad de contraccion en 200ms del movimiento. Critico en boulder y rutas dinamicas.',
     tips:['Solo con 8+ dominadas normales previas','Calentamiento completo siempre','Parar si baja la tecnica']},
    {id:'pow4',n:'Campus: escaleras de An Cap',cat:'campus_board',sys:'An Cap',col:'#9B6EFF',fatigue:5,skill:4,minLevel:2,
     det:'Sube y baja en campus sin pies. 15-20 movs. Descanso 3-4x el tiempo de trabajo. 6-8 reps.',
     nota:'6-8 x 15-20 movs :4min',
     simple:'Subir y bajar el campus board varias veces seguidas  -  aguante de alta intensidad para secuencias explosivas largas.',
     sci:'Barrows (2013): campus permite progresar 1 movimiento por sesion. Mayor velocidad vs bouldering en campus.',
     tips:['Listones grandes para empezar','Progresar 1 movimiento por sesion','Transicion gradual a listones mas pequenos']},
    {id:'pow5',n:'Moon/Tension board al limite',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'Problemas al limite en tabla de madera estandarizada. 4-6 intentos con 5-8 min descanso.',
     nota:'4-6 x max effort :5-8min',
     simple:'Escalar problemas de muro de madera estandarizado  -  mide progresion objetiva de potencia.',
     sci:'Barrows (2013): tabla estandarizada = progresion medible. RFD en angulo negativo.',
     tips:['Registrar grade mas duro completado','No escalar si fatiga alta','Mejor rendimiento las primeras 2h']},
    {id:'pow6',n:'System board bilateral',cat:'wall_training',sys:'Fuerza max bilateral',col:'#9B6EFF',fatigue:4,skill:4,minLevel:2,
     det:'Movimientos simetricos en system board. 6 x 4 movs al limite bilateral. Descanso 5 min.',
     nota:'6 x 4 movs :5min',
     simple:'Muro con presas simetricas  -  identifica cual lado es mas debil y trabaja en igualar.',
     sci:'Horst (2008): system board elimina compensaciones. Permite atacar debilidades especificas.',
     tips:['Mismo agarre ambas manos','Identificar tipo de agarre mas debil','Alternar: crimps, slopers, pockets']}
  ],
  endurance:[
    {id:'end10',n:'Circuito de capacidad anaerobica',cat:'power_endurance',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:4,minLevel:1,
     det:'12-15 movimientos seguidos, descanso 2-4 veces el tiempo de trabajo. 8-10 repeticiones. Objetivo: quedarte sin fuerza pero NO bombeado.',
     nota:'8-10 x 12-15 movs',
     simple:'Movimientos intensos seguidos para aprender a aguantar secuencias duras sin bombearte  -  lo que necesitas en rutas largas.',
     sci:'Barrows (2013): An Cap requiere 16+ semanas de adaptacion. Sin Aero Cap base: mas An Cap = peor rendimiento.',
     tips:['Boulder al 75-85% limite','Si te bombeas: circuito muy largo o intenso','Objetivo: menos del 25% de fallos']},
    {id:'end0a',n:'Escalada continua suave (ARC basico)',cat:'aerobic_endurance',sys:'Aero Cap',col:'#F472B6',fatigue:1,skill:1,minLevel:0,phase:'warmup',
     det:'Escala durante 15-20 min sin parar en grados muy faciles. El bombeo debe ser manejable en todo momento  -  si no puedes mantener una conversacion, bajas la intensidad.',
     nota:'15-20 min continuo al 40-50% limite',
     simple:'Escalar tranquilo y sin parar  -  como caminar. Construye la base aerobica que hace que te recuperes mejor entre movimientos y entre sesiones.',
     sci:'Barrows (2013): ARC mejora densidad capilar en antebrazos, permitiendo recuperarse mas rapido. Primer estimulo aerobico recomendado para principiantes.',
     tips:['Si el bombeo no es manejable: baja al siguiente grado','15 min ya es suficiente para empezar','Aumentar duracion 5 min por semana']},
    {id:'end0b',n:'Travesias tecnicas',cat:'technique',sys:'Skill development',col:'#F472B6',fatigue:1,skill:2,minLevel:0,phase:'warmup',
     det:'Muevete de lado a lado en el muro sin bajar durante 15-20 min. Foco 100% en los pies y en la posicion del cuerpo.',
     nota:'15-20 min de travesia continua',
     simple:'Moverse por el muro de forma continua pero pensando en como te mueves  -  mejora tecnica y base aerobica al mismo tiempo.',
     sci:'Bechtel (2019): travesias tecnicas tienen el mejor ratio beneficio/riesgo para principiantes  -  estimulo aerobico y neural sin carga digital excesiva.',
     tips:['Los pies hacen el trabajo  -  confiale el peso','Mirar donde pones el pie antes de moverlo','No importa la velocidad  -  importa el control']},
    {id:'end1',n:'Circuitos de potencia-resistencia',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:3,minLevel:1,
     det:'30 movs sin sacudir los brazos. Descanso = tiempo trabajo. 8 reps o 6 sets x 4 reps.',
     nota:'8 x 30 movs, rest=work',
     simple:'Escalar 30 movimientos seguidos sin bajar los brazos  -  para aguantar rutas largas e intensas sin bombearte.',
     sci:'Barrows (2013): Aero Pow responde mejor a REDUCIR el descanso, no aumentar dificultad.',
     tips:['Sin sacudir aunque haya presas buenas','Para alto volumen: 6 sets x 4 reps con 10-20 min entre sets','Simular posicion de clipse para bajar ritmo']},
    {id:'end2',n:'4x4 boulders',cat:'wall_training',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'4 boulders sin descanso, luego 1-3 min. x4 sets. Boulders al 70-80% limite.',
     nota:'4 sets x 4 boulders :2min',
     simple:'Cuatro boulders seguidos sin descanso  -  entrena aguantar esfuerzos repetidos, como en una ruta.',
     sci:'Barrows (2013): 4x4 con boulders diferente al Aero Cap con rutas. Mayor intensidad local.',
     tips:['Boulder al 70-80%: dificil pero completable','Descanso decidido antes de empezar','Registrar set 4 vs set 1']},
    {id:'end3',n:'Intervalos cada minuto',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:3,minLevel:1,
     det:'6-8 movs empezando cada minuto. Aprox 20s trabajo / 40s descanso. 8-12 reps.',
     nota:'8-12 x 6-8 movs cada 60s',
     simple:'Hacer 6-8 movimientos al empezar cada minuto  -  ritmo constante que entrena la resistencia a esfuerzos repetidos.',
     sci:'Barrows (2013): para aumentar intensidad usar problema mas dificil, no acortar descanso.',
     tips:['Problema constante toda la sesion','Objetivo: fallar en ultimos 2-3 reps','Timer fijo, empezar siempre en punto']},
    {id:'end4',n:'ARC Training (base aerobica)',cat:'aerobic_endurance',sys:'Aero Cap',col:'#F472B6',fatigue:2,skill:2,minLevel:1,
     det:'20-40 min continuo en zona de bombeo ligero manejable. Nunca forzar el movimiento.',
     nota:'1 x 20-40 min continuo',
     simple:'Escalar tranquilo durante bastante tiempo  -  desarrolla la base aerobica que hace que te recuperes entre movimientos.',
     sci:'Barrows (2013): ARC mejora umbral de bombeo y densidad capilar. Adaptacion: 8+ semanas de consistencia.',
     tips:['NUNCA llegar a bombeo terminal','Si el bombeo no es manejable: bajar intensidad','Ideal como warm-down de 10-15 min']},
    {id:'end5',n:'Piramides en rutas',cat:'aerobic_endurance',sys:'Aero Pow + An Cap',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'1 ruta, 2 rutas, 3 rutas sin descanso adicional. Descanso 3 min entre escalones. 2-3 ciclos.',
     nota:'2-3 ciclos de piramide :3min',
     simple:'Escalar 1 ruta, luego 2 seguidas, luego 3  -  la carga aumenta progresivamente dentro de la sesion.',
     sci:'Barrows (2013): variante de Aero Pow que combina An Cap. Util para escaladores de roca de duracion.',
     tips:['Rutas al 65-75% limite','No descansar entre rutas del mismo escalon','Registrar si completas escalon 3 en el ultimo ciclo']},
    {id:'end6',n:'Ruta repetida en intervalos',cat:'aerobic_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:4,minLevel:1,
     det:'Escala la misma ruta 6-10 veces. Descanso 2-3x el tiempo de escalada. Mantener forma.',
     nota:'6-10 x misma ruta, rest=2-3x',
     simple:'Repetir la misma ruta muchas veces  -  aprende a escalarla mas eficiente y desarrollas aguante especifico.',
     sci:'Barrows (2013): repeticion de ruta permite aislamiento del estimulo. Alta especificidad para rutas de proyecto.',
     tips:['Ruta al 75-80% limite','Si fallas antes de rep 4: ruta muy dura','Si nunca fallas: ruta muy facil']},
    {id:'end7',n:'Boulders enlazados',cat:'wall_training',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'Encadena 3-5 boulders distintos sin descanso entre ellos como si fueran una ruta. 4-6 sets con 3-4 min descanso.',
     nota:'4-6 sets x 3-5 boulders enlazados :3-4min',
     simple:'Escalar varios boulders seguidos sin parar -- simula la intensidad de una ruta larga en zona de boulder.',
     sci:'Anderson (RCTM 2014): linked boulders = alta especificidad para escaladores de roca. Combina An Cap y Aero Pow segun numero de movimientos. Recomendado antes de temporada de roca exterior.',
     tips:['Boulders al 65-75% del limite','Elegir boulders contiguos para minimizar transicion','Registrar si completas el ultimo boulder con misma calidad']},
    {id:'end8',n:'On/Off Traversing',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:2,minLevel:0,
     det:'30s escalando en travesia + 30s pausa. Repetir 8-12 veces. En zona de bombeo ligero-moderado.',
     nota:'8-12 x (30s on / 30s off)',
     simple:'Escalar 30 segundos y parar 30 segundos -- una forma segura y efectiva de entrenar la resistencia para cualquier nivel.',
     sci:'Bechtel (Logical Progression 2019): on/off intervals = introduccion ideal a Aero Pow. Control preciso de intensidad. Recomendado como primera herramienta de PE para principiantes e intermedios.',
     tips:['Si te bombeas antes de 30s: zona demasiado dificil','Usar el mismo tramo toda la sesion','Progresar: mas repeticiones antes de aumentar dificultad']},
    {id:'end9',n:'Circuito de capacidad (PE inicial)',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:2,skill:1,minLevel:0,
     det:'Circuito facil de 15-20 movimientos, 6-8 veces con 2 min descanso. En zona suave, forma perfecta.',
     nota:'6-8 x 15-20 movs :2min',
     simple:'Circuito corto y facil repetido varias veces -- la introduccion mas segura al entrenamiento de resistencia para principiantes.',
     sci:'Barrows (2013): estimulo minimo efectivo de Aero Pow para principiantes = circuito 10-20 movimientos al 50-60% limite. Baja intensidad + consistencia = adaptacion sin riesgo de lesion.',
     tips:['Zona MUY facil -- debes poder hablar mientras escalas','Si te bombeas: circuito demasiado dificil','Progresar: primero mas repeticiones, luego mas dificultad']}
  ],
  deload:[
    {id:'del1',n:'Travesia suave de recuperacion',cat:'mobility',sys:'Recuperacion activa',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'20-30 min moviendote por el muro en grados muy faciles. Bombeo minimo o nulo.',
     nota:'1 x 20-30 min suave',
     simple:'Moverte por el muro de forma muy tranquila  -  activa la circulacion y te ayuda a recuperarte sin generar mas fatiga.',
     sci:'Barrows (2013): deload NO es inactividad. Reduccion volumen 50% manteniendo intensidad. La supercompensacion ocurre DESPUES.',
     tips:['Enfoque en tecnica y eficiencia','No intentar subir grados esta semana','Ideal para trabajar miedo y visualizacion']},
    {id:'del2',n:'Circuito de musculos antagonistas',cat:'mobility',sys:'Prevencion lesiones',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'Extensores de dedos 3x15 con banda elastica, face pulls 3x15, rotacion externa de hombro 3x12. Lento y controlado.',
     nota:'3 x 15 reps :90s',
     simple:'Ejercicios para los musculos opuestos a los que usa la escalada  -  previene lesiones y mantiene equilibrio muscular.',
     sci:'Horst (2008): antagonistas criticos: extensores dedos, triceps, rotadores externos. 2 sesiones/semana todo el ciclo.',
     tips:['Extensores con banda elastica, NUNCA pesos','Face pulls lento  -  3 segundos cada fase','Incluir: wrist curls, reverse curls, pushups']},
    {id:'del3',n:'Movilidad y yoga para escaladores',cat:'mobility',sys:'ROM y recuperacion',col:'#00E5A0',fatigue:1,skill:1,minLevel:0,
     det:'20 min: caderas, hombros, munecas. Secuencias de yoga orientadas a escalada.',
     nota:'20 min, siempre con musculo caliente',
     simple:'Estiramientos y movilidad  -  mantiene las articulaciones sanas y mejora la flexibilidad para escalar tecnico.',
     sci:'Consuegra (21 Factores): ROM como factor fisico independiente que limita el rendimiento tecnico.',
     tips:['Con musculo caliente, nunca en frio','Yoga: hip openers + shoulder mobility','Isquiotibiales, flexores cadera, rotadores externos']},
    {id:'del4',n:'Sesion de tecnica en grados bajos',cat:'technique',sys:'Skill development',col:'#00E5A0',fatigue:1,skill:3,minLevel:0,
     det:'1h escalando en grados muy inferiores al limite. Foco 100% en footwork, posicion de caderas y eficiencia.',
     nota:'60 min al 40-50% limite',
     simple:'Escalar facil pensando solo en como te mueves  -  el deload es el mejor momento para trabajar tecnica sin fatiga.',
     sci:'Consuegra: Economia de agarre = reduccion de fuerza via optimizacion tecnica.',
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
    det: 'Munecas (circulos en ambos sentidos), codos, hombros (passes con palo o banda), columna toracica, caderas, tobillos. Sin estiramiento estatico - solo movilidad dinamica.',
    fatigue: 1,
    cat: 'warmup'
  },
  {
    n: 'Activacion de dedos',
    nota: '3 series progresivas',
    det: '3 cuelgues progresivos en jugs de 8-10s cada uno con 1 min entre series. Si tenes regleta grande (>25mm), podes hacer 1 serie suave alli. NO al limite - solo activacion neural.',
    fatigue: 2,
    cat: 'warmup'
  },
  {
    n: 'Escalada progresiva',
    nota: '8-12 min',
    det: 'Boulder o vias muy faciles. Empezar 2-3 grados debajo de tu limite, subir progresivamente. Objetivo: lubricar articulaciones, ensayar movimientos, calentar dedos. PARAR antes de cualquier sensacion de bombeo.',
    fatigue: 2,
    cat: 'warmup'
  }
];

var SESSION_STRUCTURE = {
  strength: {
    label: 'Sesion de fuerza',
    phases: [
      {id:'warmup',  label:'Calentamiento',         ratio:0.18, col:'#FFB800',
       desc:'Movilidad, activacion y boulder facil progresivo. Imprescindible antes de cargas maximas.'},
      {id:'main',    label:'Entrenamiento principal',ratio:0.50, col:'#38BDF8',
       desc:'Maxima intensidad neuromuscular. Detener ante perdida de precision o fatiga (Anderson RCTM).'},
      {id:'supp',    label:'Escalada suplementaria',ratio:0.20, col:'#7070AA',
       desc:'Boulder al 70-80% del limite. 4-6 problemas. NO ir al fallo. Aplicar la fuerza recien entrenada.'},
      {id:'condi',   label:'Acondicionamiento',     ratio:0.07, col:'#9B6EFF',
       desc:'Antagonistas y core ligero. Solo si queda energia (Horst: prevencion lesiones).'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.05, col:'#00E5A0',
       desc:'Cuelgues pasivos suaves y estiramiento de antebrazos.'}
    ]
  },
  power: {
    label: 'Sesion de potencia',
    phases: [
      {id:'warmup',  label:'Calentamiento',         ratio:0.20, col:'#FFB800',
       desc:'Calentamiento EXTENSO antes de movimientos explosivos. Activacion progresiva del SNC.'},
      {id:'main',    label:'Entrenamiento principal',ratio:0.45, col:'#9B6EFF',
       desc:'Movimientos al 100%. Descanso completo entre intentos (3-5 min). Frescura absoluta.'},
      {id:'supp',    label:'Escalada suplementaria',ratio:0.20, col:'#7070AA',
       desc:'Boulder dinamico moderado. 4-5 problemas. Calidad sobre cantidad.'},
      {id:'condi',   label:'Acondicionamiento',     ratio:0.08, col:'#9B6EFF',
       desc:'Antagonistas. Core con enfasis en transferencia explosiva.'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.07, col:'#00E5A0',
       desc:'Movilidad y descompresion. Especial atencion a hombros y dedos.'}
    ]
  },
  endurance: {
    label: 'Sesion de resistencia',
    phases: [
      {id:'warmup',  label:'Calentamiento',         ratio:0.15, col:'#FFB800',
       desc:'Calentamiento moderado. Subir progresivamente la frecuencia cardiaca.'},
      {id:'main',    label:'Entrenamiento principal',ratio:0.35, col:'#F472B6',
       desc:'ARC, circuitos o 4x4 segun el protocolo del dia. Mantener forma tecnica.'},
      {id:'supp',    label:'Volumen de escalada',   ratio:0.35, col:'#7070AA',
       desc:'GRAN volumen de escalada continua a intensidad moderada. El grueso del estimulo aerobico (Barrows 2013).'},
      {id:'condi',   label:'Acondicionamiento',     ratio:0.08, col:'#9B6EFF',
       desc:'Trabajo de antagonistas ligero. Mantenimiento.'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.07, col:'#00E5A0',
       desc:'Cuelgues pasivos y estiramiento. Recuperacion activa.'}
    ]
  },
  deload: {
    label: 'Sesion de deload',
    phases: [
      {id:'warmup',  label:'Movilidad inicial',     ratio:0.25, col:'#FFB800',
       desc:'Movilidad articular completa. Sin cargas.'},
      {id:'main',    label:'Tecnica',               ratio:0.50, col:'#00E5A0',
       desc:'Skill work intencional en grados muy faciles. PROHIBIDO llegar al fallo (Anderson RCTM).'},
      {id:'condi',   label:'Antagonistas',          ratio:0.15, col:'#9B6EFF',
       desc:'Equilibrio muscular. Push, rotaciones externas, core.'},
      {id:'cooldown',label:'Estiramiento profundo', ratio:0.10, col:'#00E5A0',
       desc:'Estiramiento largo. Trabajo respiratorio. Recuperacion del SNC.'}
    ]
  },
  test: {
    label: 'Sesion de test',
    phases: [
      {id:'warmup',  label:'Calentamiento especifico',ratio:0.30, col:'#FFB800',
       desc:'Calentamiento EXTENSO para garantizar maximo rendimiento sin lesion.'},
      {id:'main',    label:'Tests',                 ratio:0.55, col:'#FFB800',
       desc:'Ejecutar tests con tecnica estricta. Cronometro y registro exacto.'},
      {id:'cooldown',label:'Enfriamiento',           ratio:0.15, col:'#00E5A0',
       desc:'Movilidad y recuperacion. Sin trabajo adicional.'}
    ]
  }
};

/* Goal-specific supplementary content suggestions */
var SUPP_CONTENT = {
  sport: {
    strength: 'Rutas al 75-85% del limite. 3-5 vias. Foco: aplicar la fuerza recien entrenada en rutas.',
    power:   'Boulder dinamico o rutas con crux duro. 4-6 intentos calidad.',
    endurance:'Vias largas continuas o link-ups. 30-45 min escalada continua. El estimulo principal.'
  },
  boulder: {
    strength: 'Boulder al 70-80% del limite. 4-6 problemas que completes. NO al fallo.',
    power:   'Boulder dinamico, dynos, lanzamientos. 5-8 intentos. Calidad maxima.',
    endurance:'Circuitos de boulder enlazados. 30-40 min volumen moderado.'
  },
  both: {
    strength: 'Boulder al 75% + 2 vias moderadas. Combinacion balanceada.',
    power:   'Boulder dinamico (4 problemas) + 1 ruta con crux duro.',
    endurance:'Circuitos + vias continuas alternados.'
  },
  competition: {
    strength: 'Especifico al formato de tu competicion (boulder o lead).',
    power:   'Boulder al formato de competicion. Lectura rapida + ejecucion.',
    endurance:'Vias o circuitos al formato de competicion. Tiempos reales.'
  }
};

var LEVEL_PROFILES = {
  beginner: {
    phaseSeq:    {'4-3-2-1':['endurance','endurance','strength','deload'],
                  '3-2-1':  ['endurance','strength','deload']},
    minGapMult:  1.4,
    maxSessPerWk: 3,
    exPerSession: 2,
    hangboardOk:  false,
    intensityNote: 'Fader 3-5. Nunca al fallo muscular las primeras 8 semanas.',
    progressNote: 'Progresar cada 2-3 semanas, no cada semana.'
  },
  intermediate: {
    phaseSeq:    {'4-3-2-1':['strength','endurance','power','deload'],
                  '3-2-1':  ['strength','power','deload']},
    minGapMult:  1.0,
    maxSessPerWk: 4,
    exPerSession: 3,
    hangboardOk:  true,
    intensityNote: 'Fader 6-8 en sesiones Go Hard. Fader 4-6 en Do More.',
    progressNote: 'Progresar cada 1-2 semanas con carga medida.'
  },
  advanced: {
    phaseSeq:    {'4-3-2-1':['strength','power','endurance','deload'],
                  '3-2-1':  ['strength','power','deload']},
    minGapMult:  0.9,
    maxSessPerWk: 5,
    exPerSession: 4,
    hangboardOk:  true,
    intensityNote: 'Fader 8-10 en Go Hard. Detener ante fatiga neuromuscular, no ante pump.',
    progressNote: 'Progresion semanal con metricas exactas (kg, TTF, liston).'
  },
  elite: {
    phaseSeq:    {'4-3-2-1':['strength','power','endurance','deload'],
                  '3-2-1':  ['power','endurance','deload']},
    minGapMult:  0.85,
    maxSessPerWk: 6,
    exPerSession: 4,
    hangboardOk:  true,
    intensityNote: 'Fader 9-10. Autorregulacion por HRV y TTF. Maxima especificidad.',
    progressNote: 'Progresion por ciclos de 3 semanas con validacion de tests.'
  }
};

var BSCI={
  strength:'FASE GO HARD (Dial: Intensivo | Fader: 8-10). '
    +'Fuente: Lattice Training / Horst (2016). La fuerza maxima actua como limitador primario en grados 5.12+ (sport) y V6+ (boulder). '
    +'Principio SAID: el cuerpo solo se adapta al estres especifico que le imponemos. '
    +'Prioriza un sistema por sesion: fuerza maxima de dedos (Max Hangs 7s/20mm) + traccion (2RM pull-ups). '
    +'Detener la sesion ante el PRIMER signo de fatiga neuromuscular o perdida de precision. '
    +'Tendones digitales: adaptan 3x mas lento que el musculo - la progresion debe ser gradual y medida.',

  power:'FASE GO HARD (Dial: Intensivo | Fader: 9-10). '
    +'Fuente: Lattice Training / Power Company Climbing. Esta fase convierte la fuerza en movimiento explosivo. '
    +'Requiere frescura neuromuscular absoluta (SNC): minimo 48h entre sesiones de alta intensidad. '
    +'Boulder: prioriza RFD (Rate of Force Development) en los primeros 200ms del movimiento. '
    +'Sport: potencia para gestionar crux aislados en secuencias largas. '
    +'CONFLICTO DIRECTO con Power Endurance: no mezclar en la misma sesion (acidosis canibaliza ganancias de fuerza).',

  endurance:'FASE DO MORE (Dial: Extensivo | Fader: 3-7 subiendo a 8-10 en bloques finales). '
    +'Fuente: Lattice Training / Guia Maestra de Periodizacion. '
    +'Fase de base aerobica (semanas 1-4 del macrociclo): elevar umbral anaerobico y capilarizacion periferica. '
    +'Sesiones "Do More": 20-30 min de escalada continua por debajo del umbral. Si aparece pump oclusivo -> reducir dificultad. '
    +'Power Endurance (semanas posteriores): 4x4, crux intervals, linked boulders. '
    +'ADVERTENCIA: la PE es altamente transitoria. Si se introduce antes de tener base de fuerza, canibaliza las ganancias.',

  deload:'FASE EXPLORE (Dial: Extensivo suave | Fader: 2-4). '
    +'Fuente: Lattice Training / Horst (2016). El deload NO es opcional ni es perder tiempo. '
    +'La supercompensacion - el momento donde el cuerpo realmente mejora - ocurre AQUI, no durante el entrenamiento. '
    +'Reducir volumen 50% manteniendo intensidad relativa. Prohibido llegar al fallo muscular. '
    +'Objetivo: refinamiento motor intencional (Explore), movilidad, antagonistas. '
    +'Los tendones adaptan mas lento que el musculo: sin deload, el plan es un precursor de lesiones cronicas.',

  test:'Punto A - Evaluacion inicial (Lattice Training). '
    +'Sin datos precisos del punto de partida, cualquier planificacion es una conjetura. '
    +'Tests obligatorios: Max Hangs 7s/20mm (fuerza dedos), 2RM pull-ups (traccion), Repeaters 60% (resistencia), Side split (movilidad). '
    +'Repetir al inicio y fin de cada macrociclo para validar tasa de adaptacion neuromuscular y metabolica. '
    +'El analisis del perfil fisiologico determina la jerarquia de las fases.',

  rest:'El descanso es donde sucede la adaptacion. El SNC tarda significativamente mas en recuperarse que la musculatura periferica. '
    +'Alternar descanso total con recuperacion activa (escalada tecnica de muy baja intensidad). '
    +'Horst (2016): sin respeto a los tiempos de recuperacion, el plan de entrenamiento es un precursor de lesiones cronicas.'
};

var HBP=[
  {t:'Max Hangs 7s (Fuerza Maxima)',ph:'Fase Go Hard | Fuerza',col:'#38BDF8',
   nota:'8 series progresivas hasta 1RM | Descanso: 2-3 min',
   desc:'Protocolo primario de fuerza de dedos (Lattice Training / Horst 2016). Suspensiones de 7 segundos en regleta de 20mm (profundidad de una falange). Incrementar carga progresivamente en 8 series hasta el fallo mecanico. Si no puedes sostenerte con tu peso corporal: usar banda de asistencia o Quad Block. Metrica: carga total maxima (peso corporal + lastre).',
   prog:['Sin experiencia en regleta: empezar con banda de asistencia o jugs','Series 1-3: calentamiento progresivo al 50-70% del maximo','Series 4-8: aproximacion al 1RM. Descanso completo entre series (2-3 min)','Progresar: +2.5kg cuando completes todas las series sin fallo anticipado'],
   warn:'Calentamiento obligatorio de 20 min antes de cargas maximas. Protocolo SOLO para intermedios con base previa en regleta. El SNC tarda mas en recuperarse que la musculatura - respetar 48h entre sesiones de alta intensidad.'},

  {t:'Repeaters 7:3 al 60% (Resistencia)',ph:'Fase Do More | Resistencia',col:'#9B6EFF',
   nota:'Ciclos 7s tension / 3s descanso al 60% del 1RM | Hasta el fallo metabolico',
   desc:'Protocolo de resistencia de antebrazo (Lattice Training). Ciclos de 7 segundos de tension seguidos de 3 segundos de recuperacion al 60% de la carga maxima obtenida en el Max Hang. Si el peso corporal supera el 60% del 1RM: usar polea de asistencia (obligatorio - no negociable). Metrica: Tiempo Total hasta el Fallo (TTF). Objetivo: fallo metabolico, no perdida de forma tecnica.',
   prog:['Calcular 60% del 1RM: si max hang = 80kg totales, trabajar a 48kg','Si BW > 60% del 1RM: usar polea con asistencia para reducir carga efectiva','Registrar TTF en cada sesion para medir progresion','Aumentar carga cuando TTF supere los 10-12 minutos consistentemente'],
   warn:'La carga del 60% NO es negociable. Una intensidad mayor convierte el ejercicio en fuerza, no en resistencia. El objetivo es el fallo metabolico puro.'},

  {t:'ARC Training (Base Aerobica)',ph:'Fase Do More | Base aerobica',col:'#F472B6',
   nota:'20-40 min continuo | Fader: 3-5 | Sin pump oclusivo',
   desc:'Protocolo de base aerobica (Barrows 2013 / Power Company). Escalada continua durante 20-40 minutos por debajo del umbral anaerobico. Fader 3-5/10. Si aparece pump oclusivo o fallo tecnico: la dificultad es excesiva, reducir inmediatamente. Si no hay ninguna sensacion de fatiga local: aumentar levemente la dificultad. Objetivo: elevar umbral anaerobico y optimizar capilarizacion muscular periferica.',
   prog:['Semanas 1-2: 2 series de 15 min con 5-10 min descanso','Semanas 3-4: 3 series de 20 min o 1 serie de 30 min continuo','Progresar duracion antes de intensidad','Puede ejecutarse como "segundo dia consecutivo" por su bajo costo metabolico'],
   warn:'Si el pump es inmanejable en cualquier momento: bajar al siguiente grado inmediatamente. No negociar este criterio.'},

  {t:'4x4 Bloques (Power Endurance)',ph:'Fase Do More | Power Endurance',col:'#FFB800',
   nota:'4 bloques x 4 reps | Descanso: 4-5 min entre sets',
   desc:'Protocolo de resistencia anaerobica (Lattice Training / Guia Maestra). Seleccionar 4 bloques de dificultad media-alta y escalarlos de forma consecutiva sin descanso entre ellos. Repetir 4 veces con 4-5 minutos de descanso entre cada ronda. Objetivo: gestion del lactato y tolerancia a la fatiga muscular extrema bajo cargas moderadas-altas. NOTA: esto es entrenamiento, NO un test.',
   prog:['Bloques al 70-80% del limite (completables pero exigentes)','Sin descanso entre los 4 bloques de la misma ronda','4-5 min de descanso completo entre rondas','Progresar: incrementar dificultad de los bloques, no reducir descanso'],
   warn:'CONFLICTO: no combinar con sesiones de fuerza maxima el mismo dia. La acidosis extrema canibaliza las adaptaciones de fuerza pura (Principio SAID). Limitar a 2 sesiones semanales.'},

  {t:'Crux Intervals (Power Endurance especifica)',ph:'Fase Do More | Transferencia a ruta',col:'#00E5A0',
   nota:'Escalar crux -> bajar -> repetir en top-rope hasta el final',
   desc:'Protocolo de transferencia especifica para ruta (Lattice Training / Guia Maestra). Escalar los primeros pernos o el crux de una ruta dificil como lider, descender inmediatamente, y volver a escalar en top-rope hasta el punto mas alto para acumular fatiga mecanica controlada. Muy alta especificidad para escalada deportiva.',
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
  fresh:     {lbl:'Fresco',     col:'#00E5A0', css:'rec-status-fresh',     badge:'OPTIMO'},
  recovering:{lbl:'Recuperando',col:'#FFB800', css:'rec-status-recovering', badge:'EN RECUPERACION'},
  fatigued:  {lbl:'Fatigado',   col:'#FF4D6A', css:'rec-status-fatigued',   badge:'FATIGADO'}
};


/* Human-readable system names  -  no jargon */
var SYS_HUMAN={
  'An Cap':       'Aguantar movimientos intensos seguidos sin fatigarte',
  'An Pow':       'Potencia maxima  -  explotar en un movimiento',
  'Aero Pow':     'Aguantar rutas largas sin bombearte demasiado',
  'Aero Cap':     'Base aerobica  -  recuperarte mas rapido entre movimientos',
  'Fuerza max':   'Fuerza maxima de dedos  -  adaptacion tendinosa gradual',
  'Fuerza traccion':'Fuerza de brazos y espalda para jalar en escalada',
  'Fuerza isometrica':'Sostener posiciones de brazos doblados',
  'Fuerza max unilateral':'Fuerza de un solo brazo  -  nivel avanzado',
  'Recuperacion activa':'Movimiento suave para recuperarte mas rapido',
  'Prevencion lesiones':'Fortalecer musculos que equilibran los de escalada',
  'ROM y recuperacion':'Flexibilidad y movilidad para escalar mejor',
  'Skill development':'Mejorar la tecnica de movimiento y eficiencia',
  'Aero Cap + An Cap':'Combinar aguante aerobico con esfuerzos intensos'
};

/* =====================================================
   LEVEL_PROFILES: per-level training prescriptions
   Scientific basis:
   - Lattice Training: beginner limiters are technique + general fitness.
     Intermediate: specific strength becomes primary limiter.
     Advanced+: power and PE are the differentiators.
   - Horst (2016): volume and frequency must match adaptation capacity.
   - Guia Maestra: el triangulo del rendimiento shifts at each level.
   - Anderson (RCTM): no fingerboard before 6+ months consistent climbing.
===================================================== */
var LEVEL_PROFILES = {
  beginner: {
    phaseSeq:    {'4-3-2-1':['endurance','endurance','strength','deload'],
                  '3-2-1':  ['endurance','strength','deload']},
    minGapMult:  1.4,
    maxSessPerWk: 3,
    exPerSession: 2,
    hangboardOk:  false,
    intensityNote: 'Fader 3-5. Nunca al fallo muscular las primeras 8 semanas.',
    progressNote: 'Progresar cada 2-3 semanas, no cada semana.'
  },
  intermediate: {
    phaseSeq:    {'4-3-2-1':['strength','endurance','power','deload'],
                  '3-2-1':  ['strength','power','deload']},
    minGapMult:  1.0,
    maxSessPerWk: 4,
    exPerSession: 3,
    hangboardOk:  true,
    intensityNote: 'Fader 6-8 en sesiones Go Hard. Fader 4-6 en Do More.',
    progressNote: 'Progresar cada 1-2 semanas con carga medida.'
  },
  advanced: {
    phaseSeq:    {'4-3-2-1':['strength','power','endurance','deload'],
                  '3-2-1':  ['strength','power','deload']},
    minGapMult:  0.9,
    maxSessPerWk: 5,
    exPerSession: 4,
    hangboardOk:  true,
    intensityNote: 'Fader 8-10 en Go Hard. Detener ante fatiga neuromuscular, no ante pump.',
    progressNote: 'Progresion semanal con metricas exactas (kg, TTF, liston).'
  },
  elite: {
    phaseSeq:    {'4-3-2-1':['strength','power','endurance','deload'],
                  '3-2-1':  ['power','endurance','deload']},
    minGapMult:  0.85,
    maxSessPerWk: 6,
    exPerSession: 4,
    hangboardOk:  true,
    intensityNote: 'Fader 9-10. Autorregulacion por HRV y TTF. Maxima especificidad.',
    progressNote: 'Progresion por ciclos de 3 semanas con validacion de tests.'
  }
};

/* -- ANTI-REPEAT VARIATION LOGIC -- */

/*
  lastExerciseUsed[block] = id del ultimo ejercicio principal usado
  Se persiste en localStorage para sobrevivir recargas.
*/
var lastExUsed = {};

/*
  selectExercises(block, dateStr, count)
  Selects `count` exercises from EX_POOL[block],
  avoiding the id stored in lastExUsed[block].
  Uses dateStr as a deterministic seed so same day always shows same variation.
  Records selection so next session avoids it.
*/
/*
  getExercisesForDay(dateStr, block)
  Returns the exercise selection for a given day.
  Result is memoized in planMap to stay stable within a session.
*/
/* -- FATIGUE / SKILL INDICATOR HTML -- */
var BSCI={
  strength:'FASE GO HARD (Dial: Intensivo | Fader: 8-10). '
    +'Fuente: Lattice Training / Horst (2016). La fuerza maxima actua como limitador primario en grados 5.12+ (sport) y V6+ (boulder). '
    +'Principio SAID: el cuerpo solo se adapta al estres especifico que le imponemos. '
    +'Prioriza un sistema por sesion: fuerza maxima de dedos (Max Hangs 7s/20mm) + traccion (2RM pull-ups). '
    +'Detener la sesion ante el PRIMER signo de fatiga neuromuscular o perdida de precision. '
    +'Tendones digitales: adaptan 3x mas lento que el musculo - la progresion debe ser gradual y medida.',

  power:'FASE GO HARD (Dial: Intensivo | Fader: 9-10). '
    +'Fuente: Lattice Training / Power Company Climbing. Esta fase convierte la fuerza en movimiento explosivo. '
    +'Requiere frescura neuromuscular absoluta (SNC): minimo 48h entre sesiones de alta intensidad. '
    +'Boulder: prioriza RFD (Rate of Force Development) en los primeros 200ms del movimiento. '
    +'Sport: potencia para gestionar crux aislados en secuencias largas. '
    +'CONFLICTO DIRECTO con Power Endurance: no mezclar en la misma sesion (acidosis canibaliza ganancias de fuerza).',

  endurance:'FASE DO MORE (Dial: Extensivo | Fader: 3-7 subiendo a 8-10 en bloques finales). '
    +'Fuente: Lattice Training / Guia Maestra de Periodizacion. '
    +'Fase de base aerobica (semanas 1-4 del macrociclo): elevar umbral anaerobico y capilarizacion periferica. '
    +'Sesiones "Do More": 20-30 min de escalada continua por debajo del umbral. Si aparece pump oclusivo -> reducir dificultad. '
    +'Power Endurance (semanas posteriores): 4x4, crux intervals, linked boulders. '
    +'ADVERTENCIA: la PE es altamente transitoria. Si se introduce antes de tener base de fuerza, canibaliza las ganancias.',

  deload:'FASE EXPLORE (Dial: Extensivo suave | Fader: 2-4). '
    +'Fuente: Lattice Training / Horst (2016). El deload NO es opcional ni es perder tiempo. '
    +'La supercompensacion - el momento donde el cuerpo realmente mejora - ocurre AQUI, no durante el entrenamiento. '
    +'Reducir volumen 50% manteniendo intensidad relativa. Prohibido llegar al fallo muscular. '
    +'Objetivo: refinamiento motor intencional (Explore), movilidad, antagonistas. '
    +'Los tendones adaptan mas lento que el musculo: sin deload, el plan es un precursor de lesiones cronicas.',

  test:'Punto A - Evaluacion inicial (Lattice Training). '
    +'Sin datos precisos del punto de partida, cualquier planificacion es una conjetura. '
    +'Tests obligatorios: Max Hangs 7s/20mm (fuerza dedos), 2RM pull-ups (traccion), Repeaters 60% (resistencia), Side split (movilidad). '
    +'Repetir al inicio y fin de cada macrociclo para validar tasa de adaptacion neuromuscular y metabolica. '
    +'El analisis del perfil fisiologico determina la jerarquia de las fases.',

  rest:'El descanso es donde sucede la adaptacion. El SNC tarda significativamente mas en recuperarse que la musculatura periferica. '
    +'Alternar descanso total con recuperacion activa (escalada tecnica de muy baja intensidad). '
    +'Horst (2016): sin respeto a los tiempos de recuperacion, el plan de entrenamiento es un precursor de lesiones cronicas.'
};

/* -- LEVEL-AWARE SAFETY SYSTEM -- */

/*
  getSafetyWarning(block, level)
  Returns a warning string if the combination is risky.
  Based on Horst (2008) tendon adaptation timeline and
  Bechtel (2019) injury prevention principles.
*/

/* -- ANTI-REPEAT VARIATION LOGIC -- */

/*
  lastExerciseUsed[block] = id del ultimo ejercicio principal usado
  Se persiste en localStorage para sobrevivir recargas.
*/
var lastExUsed = {};
