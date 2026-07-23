/* ======================================================
   data/ranges-meta.js -- Rangos de tests por nivel (TEST_RANGES), estados de recuperación (REC_META), nombres de sistemas (SYS_HUMAN).
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

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
