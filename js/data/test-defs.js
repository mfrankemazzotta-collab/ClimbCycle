/* ======================================================
   data/test-defs.js -- Batería de tests de evaluación (DATOS puros; la interpretación vive en test-interpret.js).
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

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
    result_label:'Ej: 75 (si pesas 70 y aguantas +5kg)'
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
    result_label:'Ej: 80 (si pesas 70 y aguantas +10kg en 3 reps)'
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
    result_label:'Ej: 4.5 (minutos hasta el fallo)'
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
    result_label:'Ej: 72 (si pesas 70 y aguantas +2kg en exactamente 6 reps)'
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
    result_label:'Ej: 7a'
  }
];
