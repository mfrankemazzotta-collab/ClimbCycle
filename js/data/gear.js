/* ======================================================
   data/gear.js -- Equipamiento del usuario y requisitos de cada ejercicio
   ClimbCycle · datos estáticos

   POR QUÉ EXISTE.

   El pool asumía un gimnasio completo: campus board, spray wall, tablas de
   entrenamiento, paredes de boulder Y de cuerda. Medido sobre los 48
   ejercicios, eso significaba que:

     · quien entrena en un gimnasio SÓLO DE CUERDA no podía hacer 16 (33%);
     · quien entrena SÓLO EN BOULDER no podía hacer 9;
     · sin spray wall se caían 7; sin campus, 3; sin colgador, 4.

   Y nada se lo decía: el plan proponía "Campus bumps 1-4-7" a alguien cuyo
   gimnasio no tiene campus, sin alternativa ni explicación. La app se veía
   perfecta y era inaplicable.

   CÓMO SE RESUELVE. Cada ejercicio declara qué necesita (`req`). Si el
   usuario no lo tiene, el planificador busca un SUSTITUTO que entrene lo
   mismo con lo que sí hay —campus → bloques dinámicos sin pies; vías →
   travesías largas— y sólo lo descarta si no existe ninguno.

   La sustitución es SILENCIOSA a propósito (decisión del proyecto): cada
   uno ve un plan que puede ejecutar, sin la fricción de leer sobre material
   que no tiene.
====================================================== */

/* Claves de equipamiento. Se mantienen cortas porque viajan en el bundle de
   sync y se guardan por usuario. */
var GEAR_KEYS = ['boulder', 'rope', 'board', 'campus', 'spray', 'hangboard', 'pullup'];

/* Qué es cada cosa, para la UI (onboarding y Perfil). */
var GEAR_META = {
  boulder:   { label:'Muro de boulder',        hint:'Bloques a poca altura, sin cuerda.' },
  rope:      { label:'Pared con cuerda',       hint:'Vías de top-rope o plomo.' },
  board:     { label:'Tabla de entrenamiento', hint:'Moonboard, Kilter, Tension.' },
  campus:    { label:'Campus board',           hint:'Listones para subir sin pies.' },
  spray:     { label:'Spray wall',             hint:'Panel cargado de presas, sin bloques marcados.' },
  hangboard: { label:'Colgador (hangboard)',   hint:'Tabla de regletas para suspensiones.' },
  pullup:    { label:'Barra de dominadas',     hint:'Barra fija o anillas.' }
};

/* DEFAULT: gimnasio completo.

   Es deliberado. Quien ya venía usando la app no puede perder ejercicios de
   un día para el otro por un campo que nunca se le preguntó, y quien recién
   entra y saltea la pregunta tiene que ver el plan completo, no uno
   recortado en silencio. Ausencia de dato no es ausencia de material — la
   misma regla que aprendimos con el ACWR. */
function gearDefault(){
  return { boulder:true, rope:true, board:true, campus:true, spray:true, hangboard:true, pullup:true };
}

/* Normaliza lo que venga del estado (puede faltar, venir a medias, o de una
   versión anterior). PURA. */
function normalizeGear(g){
  var out = gearDefault();
  if(!g || typeof g !== 'object') return out;
  GEAR_KEYS.forEach(function(k){
    if(typeof g[k] === 'boolean') out[k] = g[k];
  });
  return out;
}

/* Qué necesita un ejercicio. PURA.

   Se busca primero en el propio objeto (`ex.req`) porque las versiones
   ADAPTADAS lo llevan encima, y sólo después en la tabla `EX_GEAR_REQ`. Al
   revés, un sustituto heredaría los requisitos del original —el campus que
   justamente no tenemos— y quedaría descartado igual que él. */
function gearReqOf(ex){
  if(!ex) return [];
  if(ex.req) return ex.req;
  if(typeof EX_GEAR_REQ !== 'undefined' && ex.id && EX_GEAR_REQ[ex.id]) return EX_GEAR_REQ[ex.id];
  return [];
}

/* ¿El usuario puede hacer este ejercicio con lo que tiene? PURA.
   Un ejercicio sin requisitos no necesita nada especial (el suelo, su propio
   cuerpo) y siempre se puede. */
function gearAllows(gear, ex){
  if(!ex) return false;
  var req = gearReqOf(ex);
  if(!req || !req.length) return true;
  var g = normalizeGear(gear);
  for(var i = 0; i < req.length; i++){
    if(!g[req[i]]) return false;
  }
  return true;
}

/* Requisitos por ejercicio.

   Criterio: se etiqueta lo que REALMENTE hace falta, no lo que sería lindo
   tener. "Dominadas con lastre" pide barra; "Bouldering al límite" pide muro
   de boulder; "Movilidad y yoga" no pide nada. Sobre-etiquetar vaciaría los
   planes de quien tiene un gimnasio modesto. */
var EX_GEAR_REQ = {
  /* — Fuerza — */
  str0a:['hangboard'], str0b:['pullup'],  str0c:['boulder'],
  str1: ['hangboard'], str1b:['hangboard'], str1c:['hangboard'],
  str2: ['boulder'],   str3: ['pullup'],  str5: ['pullup'],
  str6: ['hangboard'], str2b:['boulder'], str7: ['hangboard'], str8:['hangboard'],
  /* — Potencia — */
  pow0a:['boulder'],   pow0b:['boulder'], pow1: ['campus'],
  pow2: ['boulder'],   pow3: ['pullup'],  pow3b:['pullup'],
  pow4: ['campus'],    pow5: ['board'],   pow6: ['board'],
  pow1b:['boulder'],   pow6b:['spray'],   pow7: ['boulder'], pow8:['campus'],
  /* — Resistencia — */
  end10:['spray'],     end0a:['boulder'], end0b:['boulder'],
  end1: ['spray'],     end2: ['boulder'], end3: ['boulder'],
  end4: ['boulder'],   end5: ['rope'],    end6: ['rope'],
  end7: ['boulder'],   end8: ['boulder'], end9: ['boulder'],
  end0c:['boulder'],   end0d:['boulder'], end11:['boulder'],
  end12:['rope'],      end13:['boulder'],
  /* — Deload — */
  del1: ['boulder'],   del2: [],          del3: [],
  del4: ['boulder'],   del5: ['rope']
};

/* SUSTITUCIONES. `ex.id` → cómo hacerlo con otro material.

   Cada entrada dice: si te falta lo que pide el original, usá ESTE otro
   ejercicio del pool (`use`), o mostrá el original con estos textos
   cambiados (`as`). La segunda forma es la interesante: mantiene el
   estímulo y sólo cambia el CÓMO.

   Fuente del criterio: el estímulo tiene que ser equivalente en sistema
   energético e intensidad, no sólo "parecido". Un campus 1-5-9 y un bloque
   dinámico sin pies entrenan lo mismo (An Pow, reclutamiento máximo); un
   campus y unas dominadas, no. */
var EX_GEAR_ALT = {
  /* Campus board → bloques dinámicos sin pies en el muro de boulder.
     Mismo sistema (An Pow), misma intención: movimiento máximo con el tren
     superior. Menos control de la distancia, más específico de escalada. */
  pow1: { req:['boulder'], n:'Lanzamientos sin pies (sin campus board)',
          nota:'6-8 movimientos máximos · 5 min de descanso entre cada uno',
          det:'En el muro de boulder, en un tramo desplomado con presas buenas: sacá los pies y hacé UN movimiento explosivo hacia la presa más lejana que puedas alcanzar. Bajate, descansá 5 min completos y repetí. 6-8 movimientos en total. Es el reemplazo del campus cuando no hay tabla: mismo estímulo de potencia, con más especificidad de escalada.',
          simple:'Un solo movimiento explosivo sin pies, lo más lejos que llegues, con descanso largo entre cada intento.' },
  pow4: { req:['boulder'], n:'Series de lanzamientos sin pies (sin campus)',
          nota:'4-6 series · 6-10 movimientos · descanso 3+ min',
          det:'En el muro de boulder desplomado, enlazá 6-10 movimientos SIN PIES con presas grandes (al límite de lo que podés sostener sin pies, ~85% de tu máximo), subiendo y bajando. Eso es una serie. 4-6 series con 3+ min de descanso. Reemplaza las escaleras de campus: mismo trabajo de capacidad anaeróbica del tren superior.',
          simple:'Enlazar movimientos sin pies en el muro, en series cortas con descanso largo. La versión sin campus board.' },
  pow8: { req:['boulder'], n:'Lanzamientos largos encadenados (sin campus)',
          nota:'6-8 series · 4 min de descanso',
          det:'En el muro desplomado y sin pies: hacé dos o tres movimientos LARGOS seguidos al 100% de intención, saltando presas intermedias. 6-8 series con 4 min de descanso. Reemplaza los bumps de campus. Agarre abierto o semiarqueo, nunca arqueo completo.',
          simple:'Movimientos largos encadenados sin pies, saltando presas. La versión sin campus board.' },

  /* Board (Moon/Kilter/Tension) y spray wall se sustituyen entre sí, y en
     última instancia por bloques normales del muro. */
  pow5:  { req:['spray'], n:'Bloques al límite en spray wall',
           det:'En el spray wall, armá o elegí problemas a tu límite y trabajalos como en un board: mismas presas, misma secuencia cada intento. 4-6 intentos máximos con 5-8 min de descanso.' },
  pow6:  { req:['spray'], n:'Movimientos simétricos en spray wall',
           det:'En el spray wall, elegí un movimiento exigente (80-90% de tu límite) y hacelo con los dos lados, mismo número de repeticiones por lado. 6 series x 4 movimientos, 5 min de descanso. Reemplaza al system board.' },
  pow6b: { req:['boulder'], n:'Bloques potentes en el muro',
           det:'Elegí bloques cortos (3-6 movimientos) y potentes del muro de boulder: lanzamientos, compresiones, movimientos largos. Cada intento al 100%, 3 min de descanso entre intentos.' },
  end10: { req:['boulder'], n:'Circuito de capacidad anaeróbica (en el muro)',
           det:'Enlazá 2-3 bloques del muro hasta armar una secuencia de 12-15 movimientos intensos (75-85% de tu límite) que puedas repetir IGUAL cada vez. Repetila 8-10 veces descansando el triple de lo que tardás.' },
  end1:  { req:['boulder'], n:'Circuito de potencia-resistencia (en el muro)',
           det:'Armá un circuito de 25-30 movimientos enlazando bloques del muro, al 60-70% de tu límite. Escalalo sin sacudir los brazos, descansá lo mismo que tardaste y repetí 4-6 veces.' },

  /* Vías con cuerda → travesía larga o enlace de bloques. El sistema
     aeróbico no distingue el plano: lo que importa es el tiempo bajo
     tensión sin descanso. */
  end5:  { req:['boulder'], n:'Pirámides en travesía (sin cuerda)',
           nota:'2-3 ciclos · 1→2→3 vueltas · 3 min de descanso entre escalones',
           det:'Elegí una travesía larga y cómoda (2-3 grados bajo tu máximo). Un ciclo es: 1 vuelta → 3 min → 2 vueltas seguidas → 3 min → 3 vueltas seguidas. Después 5-6 min y arrancás otro ciclo. 2-3 ciclos. Reemplaza las pirámides en rutas.',
           simple:'Vueltas encadenadas a una travesía, sumando una más en cada escalón. La fatiga se acumula como en una jornada de roca.' },
  end6:  { req:['boulder'], n:'Travesía repetida en intervalos (sin cuerda)',
           nota:'4-6 vueltas a la misma travesía · descansás el doble de lo que tardás',
           det:'Elegí una travesía larga 1-2 grados por debajo de tu máximo, que puedas repetir sin caerte incluso cansado. Recorrela, mirá cuánto tardaste y descansá el DOBLE. Repetí 4-6 vueltas. Si empezás a escalar feo, cortá.',
           simple:'La misma travesía varias veces, descansando el doble de lo que tardás. Al aprenderla de memoria, lo único que te limita es el aguante.' },
  end12: { req:['boulder'], n:'Bloques al límite en intervalos (sin cuerda)',
           nota:'4-6 series al límite · descanso 1:1',
           det:'Enlazá bloques hasta armar una secuencia al 90-100% de tu límite que te lleve 1-2 minutos. Escalala, descansá lo mismo que tardaste, y repetí 4-6 veces. Reemplaza los intervalos de vía.',
           simple:'Una secuencia dura de 1-2 minutos repetida varias veces, descansando lo mismo que tardás. Entrena aguantar el bombeo cerca de tu tope.' },
  del5:  { req:['boulder'], n:'Lectura de bloques y visualización',
           det:'En cualquier bloque, a cualquier grado (no es esfuerzo físico). Antes de cada intento, quedate abajo y leé la secuencia completa: qué presa toma cada mano, dónde van los pies, dónde podés parar. Visualizá el bloque entero en primera persona antes de tocarlo. Después compará lo que pasó con lo que habías leído.' },

  /* Colgador → suspensiones en presas del muro. Menos preciso, pero
     entrena el mismo tejido. */
  str1:  { req:['boulder'], n:'Suspensiones en presas del muro',
           det:'Sin colgador: buscá en el muro dos presas iguales, cómodas y de canto marcado (tipo regleta grande). La intensidad la da tu peso corporal: si aguantás más de 15 s cómodo, buscá presas peores. Colgate 10 segundos en semiarqueo con las escápulas activas, bajá y descansá 3 min. 5 series. Menos preciso que un colgador, pero entrena el mismo tejido.' },
  str0a: { req:['boulder'], n:'Suspensiones asistidas en presas del muro',
           det:'Buscá dos presas grandes (jugs) del muro a la altura del pecho y colgate con los pies apoyados en una silla o caja, de modo que sostengan buena parte de tu peso. 5 cuelgues de 10 segundos, 2 min de descanso. Semana a semana quitás apoyo de pies.' },

  /* Barra de dominadas → suspensiones y tracciones en presas del muro. */
  str0b: { req:['boulder'], n:'Tracciones en presas del muro',
           det:'Sin barra: usá dos presas grandes del muro a la altura adecuada y hacé tracciones ahí, con las escápulas activas y sin balanceo. 3-4 series al máximo de repeticiones, 3 min de descanso.' },
  pow3:  { req:['boulder'], n:'Movimientos explosivos en el muro',
           det:'Sin barra: en el muro, elegí un movimiento cómodo (60-70% de tu límite) que exija generar potencia con los brazos y hacelo de forma explosiva. 4 series x 5 repeticiones, 4 min de descanso.' }
};

/* ── SEGUNDA VUELTA: el gimnasio SÓLO DE CUERDA ───────────────────
   Medido tras la primera tanda: quien sólo tiene pared de cuerda perdía 30
   de 48 ejercicios y se quedaba con planes de 2 ejercicios por día. Todas
   las sustituciones de arriba apuntaban al muro de boulder — que es
   justamente lo que ese usuario no tiene.

   La traducción a cuerda es real y la usan los entrenadores: en top-rope se
   puede trabajar potencia (movimientos duros aislados con el seguro puesto),
   resistencia (vueltas continuas) y técnica igual que en boulder. Lo que se
   pierde es la comodidad de bajarse de un salto, no el estímulo.

   Se declara aparte para que se lea el criterio, y se fusiona abajo. */
var EX_GEAR_ALT_CUERDA = {
  str0c: { req:['rope'], n:'Vías fáciles con foco técnico',
           det:'En top-rope, elegí vías 2-3 grados por debajo de tu máximo y escalalas concentrándote en los pies y en mantener los brazos estirados. 20-30 min con descansos cortos, sin llegar a bombearte.' },
  str2:  { req:['rope'], n:'Movimientos duros aislados en vía',
           det:'En top-rope, elegí los movimientos más duros de una vía a tu límite y trabajalos aislados: subís, hacés el tramo, bajás y descansás 3-5 min. Es el equivalente a proyectar bloques, con el seguro puesto.' },
  str2b: { req:['rope'], n:'Tramos al límite en vía',
           det:'En top-rope, aislá tramos de 4-8 movimientos al límite dentro de una vía dura. Trabajá cada tramo en 1-4 intentos con 3-4 min de descanso. Cambiá de tramo para no machacar siempre los mismos dedos.' },
  pow0a: { req:['rope'], n:'Movimientos dinámicos en vía fácil',
           det:'En top-rope y en terreno cómodo, buscá movimientos donde tengas que impulsarte en vez de traccionar despacio. Repetilos hasta que salgan suaves. Es coordinación, no fuerza.' },
  pow0b: { req:['rope'], n:'Vías fáciles a velocidad',
           det:'En top-rope, escalá vías bastante por debajo de tu grado MÁS RÁPIDO de lo habitual, sin dudar entre presa y presa. 3-5 vías con 5 min de descanso. Si al acelerar patinás de pies, bajá el grado.' },
  pow2:  { req:['rope'], n:'Movimientos explosivos en vía al límite',
           det:'En top-rope, elegí los movimientos más dinámicos de una vía a tu límite y trabajalos aislados, al 100%. 4-6 intentos con 3-5 min de descanso completo entre cada uno.' },
  pow1b: { req:['rope'], n:'Dead-points en vía',
           det:'En top-rope y a un grado cómodo (70-80% de tu máximo), buscá un movimiento donde tengas que soltar una mano y llegar lejos. Agarrá la presa en el punto más alto del recorrido, cuando tu cuerpo deja de subir. 2-3 min entre intentos.' },
  pow7:  { req:['rope'], n:'Movimiento aislado al límite en vía',
           det:'En top-rope, aislá UN movimiento —el más duro de la vía— y ejecutalo con intención máxima. Bajá, descansá 3-5 min y repetí. Reclutamiento puro: necesitás estar fresco.' },
  end0a: { req:['rope'], n:'Vías continuas suaves (ARC básico)',
           det:'En top-rope, escalá 15-20 min encadenando vías fáciles con el mínimo descanso entre una y otra (3-4 grados bajo tu máximo). El bombeo tiene que ser leve y estable: si no podés conversar, bajá el grado.' },
  end0b: { req:['rope'], n:'Vías con consigna técnica',
           det:'En top-rope y en vías fáciles, escalá con una consigna por vuelta: pies silenciosos, brazos estirados, cadera pegada. 3-5 vías cambiando la consigna en cada una.' },
  end0c: { req:['rope'], n:'Drill de pies precisos en vía',
           det:'En top-rope y en terreno fácil, mirá cada presa de pie hasta apoyarlo y no lo corrijas después. Escalá lento y en silencio: si el pie hace ruido, lo apoyaste mal. 3-5 vías.' },
  end0d: { req:['rope'], n:'Drill de brazos rectos en vía',
           det:'En top-rope y en terreno fácil, escalá manteniendo los brazos ESTIRADOS todo lo posible, empujando con las piernas y girando la cadera para alcanzar. 3-5 vías. Los antebrazos casi no deberían trabajar.' },
  end2:  { req:['rope'], n:'4x4 de vías · clásico (70-80%)',
           det:'Elegí 4 vías cómodas (70-80% de tu límite) y escalá cada una 4 veces seguidas con el mínimo descanso entre vueltas; 3-5 min entre grupos. Es el 4x4 clásico trasladado a cuerda.' },
  end13: { req:['rope'], n:'4x4 de vías · duro (80-90%)',
           det:'Igual que el 4x4 clásico pero con vías al 80-90% de tu límite y descanso corto (1-2 min) entre grupos. Para quien ya domina la versión estándar.' },
  end3:  { req:['rope'], n:'Intervalos cada minuto en vía',
           det:'En top-rope: al arrancar cada minuto escalás un tramo de 6-8 movimientos cómodo (60-70% de tu límite) y bajás; lo que sobra del minuto es tu descanso. 8-12 rondas.' },
  end4:  { req:['rope'], n:'ARC en vías (base aeróbica)',
           det:'En top-rope, encadená vías fáciles durante bloques de 10-15 min con el mínimo descanso entre una y otra, y 5 min entre bloques (2-3 bloques). Intensidad: 3-4 grados por debajo de tu máximo.' },
  end7:  { req:['rope'], n:'Vías enlazadas · volumen (65-75%)',
           det:'Escalá 3-5 vías cómodas (65-75%) seguidas, bajando y volviendo a subir con el mínimo descanso, como si fueran una sola vía larga. 4-6 sets con 3-4 min entre cada uno.' },
  end11: { req:['rope'], n:'Vías enlazadas · al límite (85-95%)',
           det:'Enlazá tramos duros de vías (85-95% de tu límite) hasta acumular 15-25 movimientos exigentes con el mínimo descanso. 4-6 series, descanso igual al tiempo de trabajo.' },
  end8:  { req:['rope'], n:'Intervalos 30/30 en vía',
           det:'En top-rope: 30 s escalando sin parar + 30 s colgado del seguro descansando. Repetir 8-12 veces. Elegí un tramo con presas medianas que puedas recorrer sin movimientos al límite.' },
  end9:  { req:['rope'], n:'Circuito de capacidad en vía (PE inicial)',
           det:'Escalá tramos de 15-20 movimientos en top-rope al 65-75% de tu límite, con 2 min de descanso entre repeticiones. 6-8 circuitos. Primera aproximación a la resistencia de potencia.' },
  end1:  { req:['rope'], n:'Circuito de potencia-resistencia en vía',
           det:'Encadená vías hasta acumular 25-30 movimientos al 60-70% de tu límite sin sacudir los brazos. Descansá lo mismo que tardaste y repetí 4-6 veces.' },
  end10: { req:['rope'], n:'Circuito anaeróbico en vía',
           det:'Aislá una secuencia de 12-15 movimientos intensos (75-85%) dentro de una vía y repetila 8-10 veces, descansando el triple de lo que tardás. Tiene que ser la MISMA secuencia cada vez.' },
  del1:  { req:['rope'], n:'Vías suaves de recuperación',
           det:'20-30 min en top-rope en vías muy fáciles, moviéndote tranquilo. Bombeo mínimo o nulo: si sentís hinchazón en los antebrazos, bajá el grado.' },
  del4:  { req:['rope'], n:'Sesión de técnica en vías fáciles',
           det:'Vías 2-3 grados por debajo de tu máximo, trabajando una habilidad concreta por sesión: talonar, empotrar, placa, compresión. 45-60 min, con descanso entre vías.' },
  pow5:  { req:['rope'], n:'Movimientos al límite en vía (sin board)',
           det:'En top-rope, elegí los movimientos más duros de una vía a tu límite y trabajalos aislados, con la misma secuencia cada intento. 4-6 intentos máximos con 5-8 min de descanso.' },
  pow6:  { req:['rope'], n:'Movimientos simétricos en vía (sin board)',
           det:'En top-rope, elegí un movimiento y trabajalo con los dos lados, mismo número de repeticiones por lado. 6 series x 4 movimientos, 5 min de descanso.' },
  pow6b: { req:['rope'], n:'Tramos potentes en vía (sin spray wall)',
           det:'Aislá tramos cortos (3-6 movimientos) y potentes de una vía: lanzamientos, compresiones, movimientos largos. Cada intento al 100%, 3 min de descanso.' }
};

/* Fusión. Las de boulder tienen prioridad porque son el caso más común; las
   de cuerda entran sólo para los ids que no estaban cubiertos. */
(function(){
  Object.keys(EX_GEAR_ALT_CUERDA).forEach(function(id){
    if(!EX_GEAR_ALT[id]) EX_GEAR_ALT[id] = EX_GEAR_ALT_CUERDA[id];
  });
})();

/* ELECCIÓN DEL SUSTITUTO SEGÚN LO QUE HAY.

   Varios ejercicios tienen versión para boulder Y para cuerda. `adaptExercise`
   prueba primero la de la tabla principal y, si esa tampoco se puede hacer,
   cae a la de cuerda. Sin esto, quien sólo tiene cuerda recibía el sustituto
   "en el muro de boulder" y quedaba igual de afuera. */
function gearAltsFor(id){
  var out = [];
  if(EX_GEAR_ALT[id]) out.push(EX_GEAR_ALT[id]);
  if(EX_GEAR_ALT_CUERDA[id] && EX_GEAR_ALT_CUERDA[id] !== EX_GEAR_ALT[id]) out.push(EX_GEAR_ALT_CUERDA[id]);
  return out;
}

/* Devuelve el ejercicio ADAPTADO al equipamiento del usuario, o null si no
   hay forma de hacerlo. PURA: no toca el pool original.

   Orden deliberado:
     1. ¿Lo puede hacer tal cual? → se devuelve intacto.
     2. ¿Hay sustituto y lo puede hacer? → se devuelve la versión adaptada.
     3. Si no → null, y el planificador elige otro ejercicio. */
function adaptExercise(ex, gear){
  if(!ex) return null;
  if(gearAllows(gear, ex)) return ex;

  /* Se prueban TODAS las alternativas, no sólo la primera. Varios ejercicios
     tienen versión para boulder y versión para cuerda; probando una sola,
     quien tiene únicamente pared de cuerda recibía el sustituto "en el muro
     de boulder" y quedaba tan afuera como antes. Medido: se quedaba con 12
     ejercicios distintos de 25, y días de sólo 2. */
  var alts = (typeof gearAltsFor === 'function') ? gearAltsFor(ex.id) : [];
  for(var i = 0; i < alts.length; i++){
    var alt = alts[i];
    var adaptado = {};
    Object.keys(ex).forEach(function(k){ adaptado[k] = ex[k]; });
    Object.keys(alt).forEach(function(k){ adaptado[k] = alt[k]; });
    adaptado.req = alt.req || [];
    adaptado._sustituye = ex.id;      /* trazabilidad, no se muestra */
    if(gearAllows(gear, adaptado)) return adaptado;
  }
  return null;
}
