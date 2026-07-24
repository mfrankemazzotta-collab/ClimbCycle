/* ======================================================
   data/training-constants.js -- Constantes de carga/recuperación: fatiga por bloque, gaps mínimos, escala RPE.
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

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
