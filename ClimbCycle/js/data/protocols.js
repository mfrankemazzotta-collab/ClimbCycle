/* ======================================================
   data/protocols.js -- Protocolos de hangboard/dedos (HBP, FINGER_PROTOCOLS, FINGER_GUIDELINES).
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

var HBP=[
  {t:'Max Hangs 10s (Fuerza Máxima)',ph:'Fase Go Hard | Fuerza',col:'#38BDF8',hb:true,
   nota:'6 series x 1 rep de 10s al 85% | Descanso: 2 min',
   desc:'Protocolo primario de fuerza de dedos (Lattice / Eva Lopez). 6 series de 1 suspension de 10 segundos en regleta de 20mm (medio arque o 4 dedos en extension) a la carga con la que llegas justo a los 10s (~85% de tu Max Hang total). La intensidad se aplica a la carga TOTAL (peso corporal + lastre), no solo al lastre. Si no puedes sostenerte con tu peso corporal: banda de asistencia o Quad Block. Metrica: carga total (peso + lastre).',
   prog:['Calcular carga objetivo = 85% de tu Max Hang total (la app la calcula en el widget "Protocolos de dedos")','Calentar con 2-3 suspensiones progresivas al 50-70%','6 series de 1x10s con 2 min de descanso completo entre series','Progresar: +2.5kg (o -1mm de regleta) cuando completes las 6 series con forma estable'],
   warn:'Calentamiento obligatorio de 20 min antes de cargas máximas. Protocolo SOLO para intermedios con base previa en regleta. Mantené idénticos regleta, profundidad, agarre y postura entre evaluación y entrenamiento. Evitá el arqueo completo. Respetá 48h entre sesiones de alta intensidad de dedos.'},

  {t:'Repeaters 7:3 al 60% (Resistencia)',ph:'Fase Do More | Resistencia',col:'#9B6EFF',hb:true,
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

/* ──────────────────────────────────────────────────
   FINGER_PROTOCOLS — Lattice finger-training protocols by objective.
   Source: usuario / Lattice (MXEdge Lift + "How to manage finger strength").
   intensity = fraction of the calc base (Hangboard: Max Hang total;
   No-hang: máximo Tindeq 7s por mano). work/restReps in seconds,
   restSeries in minutes. mode: 'hangboard' | 'nohang'.
────────────────────────────────────────────────── */
var FINGER_PROTOCOLS = [
  {id:'hb_max',   mode:'hangboard', obj:'Fuerza máxima',            series:6, reps:1,  work:10, restReps:0, restSeries:2.0, intensity:0.85, base:'Max Hang total'},
  {id:'hb_ancap', mode:'hangboard', obj:'Capacidad anaeróbica',    series:6, reps:5,  work:7,  restReps:3, restSeries:2.5, intensity:0.80, base:'Max Hang total'},
  {id:'hb_aerp',  mode:'hangboard', obj:'Potencia aeróbica',       series:6, reps:12, work:7,  restReps:3, restSeries:5.0, intensity:0.60, base:'Max Hang total'},
  {id:'nh_max',   mode:'nohang',    obj:'Fuerza máxima (por mano)', series:6, reps:1,  work:10, restReps:0, restSeries:2.0, intensity:0.85, base:'Tindeq 7s/mano'},
  {id:'nh_ancap', mode:'nohang',    obj:'Capacidad anaeróbica',    series:6, reps:5,  work:7,  restReps:3, restSeries:3.0, intensity:0.70, base:'Tindeq 7s/mano'},
  {id:'nh_aerp',  mode:'nohang',    obj:'Potencia aeróbica',       series:6, reps:12, work:7,  restReps:3, restSeries:4.0, intensity:0.50, base:'Tindeq 7s/mano'},
  {id:'nh_aercap',mode:'nohang',    obj:'Capacidad aeróbica',      series:5, reps:18, work:7,  restReps:3, restSeries:4.0, intensity:0.30, base:'Tindeq 7s/mano'}
];

/* 7 method/safety notes (Lattice). Shown with the finger-protocol widget. */
var FINGER_GUIDELINES = [
  'La intensidad se aplica a la carga TOTAL (peso corporal + lastre), no solo al lastre añadido.',
  'No-hang: cada mano usa su propio máximo (Tindeq) mantenido 7 s; el resultado aparece por mano (D / I).',
  'Mantené idénticos regleta, profundidad, agarre y postura entre la evaluación y el entrenamiento.',
  'Agarre recomendado: semiarque o cuatro dedos en extensión; evitá el arqueo completo.',
  'Progresá solo tras completar todas las repeticiones con forma estable; no subas volumen e intensidad a la vez.',
  'Calentá progresivamente y no entrenes con dolor, lesión o fatiga acumulada.',
  'La programación es una referencia general de Lattice: ajustala a tu volumen total de escalada y recuperación.'
];
