/* ======================================================
   data/exercises.js -- Ejercicios: catálogo legacy (EX), metadatos de estado (SS_META) y pool principal (EX_POOL).
   ClimbCycle · datos estáticos (troceado desde el antiguo data.js).
====================================================== */

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
     nota:'5 cuelgues de 10s · 2 min de descanso · pies en una silla',
     simple:'Práctica colgarte con ayuda de los pies  -  así los tendones de los dedos se adaptan poco a poco sin riesgo de lesión.',
     sci:'Horst (2008): los tendones digitales necesitan hasta 12 meses de adaptación gradual. Empezar con carga asistida es crítico para prevenir lesiones en principiantes.',
     tips:['Si sientes dolor agudo en dedos: parar inmediatamente','Calentamiento 10 min de escalada fácil primero','Progresar reduciendo apoyo de pies semana a semana'],
     how:[
       'Colgate de presas grandes (jugs) con los pies apoyados en una silla o caja, de modo que sostengan buena parte de tu peso.',
       'Escápulas activas: hombros abajo y atrás, nunca colgado pasivamente.',
       'Sostené 10 segundos con agarre abierto o semiarqueo — nunca arqueo completo.',
       'Descansá 2 minutos entre repeticiones. Completá 5.',
       'Semana a semana, quitá un poco de apoyo de pies. Ésa es la progresión: menos ayuda, no más tiempo.'
     ],
     errors:[
       'Arquear los dedos: al principio los tendones no están listos y el arqueo es lo que rompe poleas.',
       'Sacar los pies antes de tiempo buscando "que sea más difícil".',
       'Colgar de hombros relajados, sin activar escápula.',
       'Seguir si aparece dolor agudo en los dedos: eso no es entrenamiento, es aviso.'
     ]},
    {id:'str0b',n:'Dominadas con peso corporal',cat:'pull_strength',sys:'Fuerza traccion',col:'#38BDF8',fatigue:2,skill:1,minLevel:0,phase:'warmup',
     det:'Pull-ups normales sin lastre. 3-4 series al máximo con buena forma. Descanso 2-3 min. Si no llegas a 3 reps, usar banda elastica de asistencia.',
     nota:'3-4 series al máximo de repeticiones · 3 min de descanso',
     simple:'Dominadas basicas  -  construyen la fuerza de brazos y espalda que necesitas para escalar bien.',
     sci:'Baláš/Laffaye: el predictor más fuerte del rendimiento en escalada es la fuerza de DEDOS relativa al peso, no la tracción. Pero en principiantes la tracción se entrena antes que el fingerboard, porque los tendones de los dedos necesitan meses de adaptación (Horst 2016) y las dominadas dan base de tirón sin ese riesgo.',
     tips:['Bajar lento (3 segundos)  -  más efectivo','Hombros siempre abajo, no encorvados','Usa banda si no llegas a 3 reps limpias'],
     how:[
       'Colgate de la barra con agarre a la anchura de los hombros, brazos estirados y escápulas activas.',
       'Traccioná hasta que el mentón pase la barra, sin balanceo ni impulso de piernas.',
       'Bajá CONTROLADO hasta estirar los brazos del todo: la fase de bajada es donde más se construye.',
       'Si no llegás a completar las repeticiones, usá una banda elástica o hacé sólo la fase negativa.',
       'Descansá 2-3 min entre series.'
     ],
     errors:[
       'Usar impulso de piernas o balanceo: sacás la carga justo del músculo que querías entrenar.',
       'No estirar del todo abajo — el recorrido incompleto deja la parte más útil sin trabajar.',
       'Bajar de golpe en vez de controlar el descenso.',
       'Encoger los hombros hacia las orejas al traccionar.'
     ]},
    {id:'str0c',n:'Bouldering en grados muy faciles',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:2,skill:2,minLevel:0,phase:'warmup',
     det:'Escala problemas que puedas completar facilmente. Foco en movimiento, no en dificultad. 30-45 min de escalada tranquila.',
     nota:'30-45 min al 50-60% de tu limite',
     simple:'Escalar fácil con atención a como te mueves  -  la mejor forma de ganar fuerza sin lesionarte cuando empiezas.',
     sci:'Bechtel (2019): el movimiento de escalada es el mejor estimulo de adaptación neural para principiantes. Técnica y fuerza se desarrollan juntas.',
     tips:['Foco en footwork  -  donde pones los pies','Escalar lento y con control','No te preocupes por el grado'],
     how:[
       'Elegí bloques bien por debajo de tu grado máximo: la idea es moverte bien, no llegar al límite.',
       'Enfocate en pies precisos: mirá la presa hasta que apoyás el pie, y no lo corrijas después.',
       'Mantené los brazos estirados siempre que puedas y movete desde las piernas.',
       'Escalá 20-30 minutos con descansos cortos, sin llegar a bombearte.',
       'Si empezás a escalar feo por cansancio, cortá: el objetivo era la técnica.'
     ],
     errors:[
       'Subir el grado buscando dificultad: eso rompe el propósito del ejercicio.',
       'Escalar con los brazos flexionados todo el tiempo, gastando fuerza de más.',
       'Apoyar el pie sin mirar y corregirlo con la punta después.',
       'Continuar bombeado: con fatiga sólo se consolidan los malos hábitos.'
     ]},
    {id:'str1',n:'Deadhangs en regleta 20mm',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:4,skill:3,minLevel:1,
     det:'Te colgás de una regleta de 20mm en half-crimp durante 10 segundos con un buffer de 3s (osea que podrías haber aguantado 3s más antes de soltar). 5 series con 3 min de descanso entre cada una. Subís peso semana a semana cuando completás todas las series.',
     nota:'5 series · 10s con buffer 3s · descanso 3 min',
     simple:'Te colgás de una regleta chica durante 10 segundos, descansás, y lo repetís 5 veces. Es EL ejercicio para construir fuerza de dedos. Cada semana intentás colgar con un poquito más de peso (mochila con discos, cinturón).',
     sci:'Eva López-Rivera (Univ. Castilla-La Mancha): los protocolos de max hangs de bajo volumen y carga máxima son los más efectivos para aumentar la fuerza de los flexores de los dedos; en su estudio de 8 semanas el grupo de MaxHangs mejoró también la resistencia de agarre (~34%). El "buffer" (Maisch) mide cuánto te queda al soltar: buffer 3s = podrías haber aguantado 3s más, y permite progresar sin sobrecargar el tendón. SNC y poleas tardan 48-72h en recuperarse.',
     tips:['Calentamiento digital de 20-30 min OBLIGATORIO  -  esto incluye escalada suave + hangs progresivos en regletas más grandes','Variá el agarre (half-crimp, open-hand) cada 1-2 semanas para no sobrecargar siempre el mismo tejido  -  la app ya te sugiere el agarre de cada semana','Subí 2.5kg cuando puedas completar las 5 series con el buffer intacto','Si el buffer cae a 0-1s, no sumes peso esa semana'],
     how:[
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
    {id:'str1b',n:'Repeaters en regleta 20mm',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:4,skill:3,minLevel:1,
     det:'Protocolo de "repeaters": en una regleta de 20mm en half-crimp, colgás 7s y descansás 3s, x6 repeticiones = 1 serie. 3-4 series con 3 min de descanso entre series. Estímulo distinto a los max-hangs: más volumen bajo tensión. Ideal para alternar semana a semana con str1.',
     nota:'3-4 series · (7s on / 3s off) x6 · descanso 3 min',
     simple:'Colgás de la regleta 7 segundos, soltás 3, y repetís 6 veces seguidas. Eso es una serie; hacés 3-4. Es la variante "de volumen" de los cuelgues  -  para no hacer siempre lo mismo que los max-hangs.',
     sci:'Anderson (RCTM) / Eva López: los "repeaters" acumulan tiempo bajo tensión con recuperación parcial. La evidencia comparativa muestra que 3-5 series de repeaters dan ganancias de fuerza e hipertrofia comparables o superiores a los max hangs, pero el estímulo se corre hacia la fuerza-RESISTENCIA (los max hangs piden frescura y reclutamiento; los repeaters, fatiga y volumen). Por eso son ideales para alternar con str1 y como puente hacia la fase de resistencia.',
     tips:['Calentamiento digital de 20-30 min OBLIGATORIO, igual que en los max-hangs.','Elegí una carga con la que la última repetición de cada serie cueste pero no falles.','Alterná con los max-hangs (str1) entre semanas  -  no hagas los dos el mismo día.'],
     how:[
       'En half-crimp sobre la regleta de 20mm: colgá 7 segundos, soltá 3, repetí hasta 6 veces sin bajar del todo. Eso es una serie.',
       'Descansá 3 minutos completos entre series.',
       'Completá 3-4 series. Registrá la carga; subí cuando completes todas con buena forma.'
     ],
     errors:[
       'Full crimp en la regleta de 20mm  -  riesgo de polea sin beneficio extra.',
       'Combinar repeaters + max-hangs el mismo día: demasiado volumen para los tendones  -  alterná por semana.',
       'Descansar menos de 3 minutos entre series: los repeaters ya tienen su descanso corto DENTRO de la serie; entre series necesitás recuperación real.'
     ]},
    {id:'str1c',n:'Density hangs (cuelgues largos)',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:3,skill:2,minLevel:1,
     det:'Cuelgues de 20-40 segundos a intensidad MODERADA (nunca a la falla), en una presa cómoda (25-30mm o jug pequeño). 4-5 series con 2-3 min de descanso. Prioriza volumen de tiempo bajo tensión y salud del tendón por encima de la carga máxima.',
     nota:'4-5 series · 20-40s a intensidad moderada · descanso 2-3 min',
     simple:'Cuelgues largos y cómodos, sin llegar nunca al límite. Es la variante "amable" para los dedos: construye tejido resistente sin el desgaste de los cuelgues máximos. Ideal si venís de una molestia, si estás en semana cargada, o si querés sumar volumen sin riesgo.',
     sci:'Tyler Nelson (Camp4 Human Performance): los isométricos de larga duración a intensidad moderada generan un estímulo de remodelación del tendón distinto al de la carga máxima. Además, la evidencia reciente indica que la carga ligera y frecuente de los dedos mejora la fuerza de agarre de forma comparable a la carga máxima, y que combinar ambas produce ganancias ADITIVAS  -  o sea que no reemplaza a los max hangs: los complementa.',
     tips:['Intensidad moderada: tenés que poder sostener los 30s sin que la mano se abra.','Es el protocolo más seguro del bloque de dedos  -  útil si tenés molestias leves o mucha carga acumulada.','Se puede combinar con max hangs en la misma semana (en días distintos).'],
     how:[
       'Elegí una presa cómoda (25-30mm) y una carga con la que puedas colgar 30s dejando margen claro. Si a los 20s la mano se abre, es demasiado.',
       'Colgá 20-40s con hombros activos, respirando normal. Bajá antes de cualquier pérdida de forma.',
       'Descansá 2-3 min y repetí. 4-5 series.',
       'Progresás alargando el tiempo (hasta 40s) antes de sumar carga.'
     ],
     errors:[
       'Convertirlo en un test de aguante e ir a la falla: pierde todo el sentido  -  es volumen controlado, no máximo.',
       'Usar regletas chicas: la presa tiene que ser cómoda, la intensidad la ponés con el tiempo y la carga.',
       'Sustituir del todo los max hangs: la evidencia sugiere que se potencian combinados, no que uno reemplace al otro.',
       'Colgar con el hombro pasivo durante 30s  -  es mucho tiempo para una articulación desactivada.',
       'Arquear durante 30 segundos: el density hang es largo por diseño y el arqueo sostenido no perdona. Agarre abierto o semiarqueo cómodo.'
     ]},
    {id:'str2',n:'Bouldering al límite',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:5,minLevel:1,
     det:'Trabajás problemas al 95-100% de tu límite (proyectos). 4-8 intentos por problema con 5-8 min de descanso COMPLETO entre intentos. La calidad de cada intento importa más que la cantidad.',
     nota:'Proyectos al 95-100% · 4-8 intentos · descanso 5-8 min',
     simple:'Intentás los boulders más difíciles que podés. La idea no es completarlos todos, es darle todo a cada intento, descansar bien, y probar de nuevo. Cuando la calidad se cae notoriamente, terminás la sesión.',
     sci:'Barrows (2013): la An Cap (capacidad anaeróbica) necesita 16+ semanas de trabajo consistente para adaptarse. SAID (Horst 2008): el principio de especificidad indica que escalar al límite es el estímulo más específico para mejorar tu grado de escalada.',
     tips:['Calentamiento 30-40 min OBLIGATORIO  -  esto no se negocia, el riesgo de lesión es real','Parar la sesión cuando la calidad de movimiento cae más del 20% (te enganchás, fallás secuencias que antes pegabas)','Registrá grado y tipo de agarre del crux  -  útil para identificar tu debilidad'],
     how:[
       'Este ejercicio pide MÁS calentamiento que el de la sesión: sumá 10-15 min de escalada progresiva hasta rozar el grado que vas a intentar.',
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
     det:'4-6 series de 3-5 repeticiones con lastre, parando cuando te quedan 1 o 2 repeticiones en el tanque (nunca hasta el fallo). Bajá contando 2 segundos y subí contando 2: el control en la bajada es donde más se gana. 4 min de descanso entre series.',
     nota:'4-6 series de 3-5 reps con lastre · 4 min de descanso',
     simple:'Dominadas con peso extra, series cortas y pesadas. La clave es parar con 1-2 repeticiones de margen: entrenás fuerza, no aguante, y llegar al fallo sólo suma fatiga.',
     sci:'Horst (2008): pull-ups lastrados + deadhangs = mayor transferencia a escalada. Adaptación: 8-12 semanas.',
     tips:['Nunca sacrificar la forma por el peso','Registrar 3RM cada semana','Fingerboard primero si combinas ejercicios'],
     how:[
       'Colgá el lastre (cinturón de lastre o mochila con discos). Elegí un peso con el que 3-5 reps te dejen 1-2 en reserva (RPE 8-9).',
       'Cada rep: subí en ~2s hasta que el mentón pase la barra, bajá controlado en ~2s hasta brazos casi extendidos (no del todo muertos).',
       'Descansá 3-5 min completos entre series. Es fuerza máxima: el descanso largo es parte del estímulo.',
       'Completá 4-6 series. Registrá peso × reps para comparar semana a semana.'
     ],
     errors:[
       'Sumar peso sacrificando el rango: media dominada con mucho lastre no entrena lo mismo que una completa.',
       'Ir al fallo todas las series  -  para fuerza querés dejar 1-2 reps en reserva, no vaciarte.',
       'Balancear las piernas para ayudarte (kipping): convierte el ejercicio en otro y castiga el hombro.',
       'Hacerlo ANTES del fingerboard en la misma sesión: la fuerza de dedos se entrena fresca, la tracción va después.',
       'Bajar de golpe soltando el peso: la fase excéntrica controlada es donde está gran parte del estímulo.'
     ]},
    {id:'str5',n:'Lock-offs a distintas alturas',cat:'pull_strength',sys:'Fuerza isométrica',col:'#38BDF8',fatigue:3,skill:3,minLevel:1,
     det:'4 series x 3 rep x 5s hold a 90/120/150 grados de codo. Descanso 3 min.',
     nota:'4 series x 3 bloqueos de 5s · 3 min de descanso',
     simple:'Sostener la posición de dominada a distintas alturas  -  desarrolla control para movimientos técnicos.',
     sci:'Horst (2008): lock-offs en multiples angulos cubre todo el rango funcional de escalada.',
     tips:['Empezar en angulo más fuerte (90 grados)','Progresar angulo antes de agregar peso','Combinar con deadhangs el mismo día'],
     how:[
       'Subí hasta que el codo quede a ~90° y frená ahí. Mantené 5s con el cuerpo quieto: sin balancearte ni descolgarte de a poco.',
       'Bajá controlado hasta ~120° y volvé a mantener 5s. Ese par (90° + 120°) es una repetición.',
       'Hacé 3 repeticiones por serie, 4 series, con 3 min de descanso.',
       'Cuando los 5s te resulten cómodos en todos los ángulos, recién ahí sumá lastre.'
     ],
     errors:[
       'Deslizarse lentamente en vez de mantener la posición fija: si no podés frenar, usá banda de asistencia.',
       'Colgarse del hombro pasivo abajo  -  mantené la escápula activa todo el tiempo.',
       'Sumar peso antes de dominar el ángulo más abierto (120°+): primero rango, después carga.',
       'Aguantar la respiración: respirá durante el bloqueo, sin bloquear el diafragma.'
     ]},
    {id:'str6',n:'One-arm hang asistido',cat:'finger_strength',sys:'Fuerza max unilateral',col:'#38BDF8',fatigue:4,skill:4,minLevel:2,
     det:'Asistido con banda o polea. 5 x 8s por brazo. Descanso 3 min. Buffer de 2-3s.',
     nota:'5 cuelgues de 8s por brazo · 3 min de descanso',
     simple:'Colgarse de un solo brazo con ayuda de banda  -  fuerza unilateral para movimientos de palanca avanzados.',
     sci:'Anderson (Rock Climbers Training Manual): fuerza unilateral crítica para movimientos de palanca y desplomes.',
     tips:['Banda de resistencia para calibrar asistencia','Empezar con brazo dominante','Progresar reduciendo grosor de banda'],
     how:[
       'Sumá al calentamiento de la sesión unos hangs progresivos a dos brazos antes de pasar al unilateral: la carga por brazo se duplica.',
       'Montá la asistencia: banda desde un anclaje arriba, o polea con contrapeso. Calibrala para poder aguantar 8s con 2-3s de buffer.',
       'Colgá de un brazo 8s en half-crimp u open-hand, con el hombro ACTIVO (escápula encajada, nunca colgado muerto).',
       'Cambiá de brazo y repetí. Descansá 3 min entre series.',
       'Completá 5 series por brazo. Progresás reduciendo la asistencia, nunca alargando el tiempo.'
     ],
     errors:[
       'Colgar con el hombro pasivo (descolgado): es la principal causa de lesión de hombro en cuelgues unilaterales.',
       'Pasar al one-arm sin tener max-hangs a dos brazos con lastre sólidos: el salto de carga por dedo es enorme.',
       'Ir a la falla: siempre buffer de 2-3s. En unilateral la falla llega de golpe.',
       'Compensar rotando el torso o balanceándote para "robar" apoyo.',
       'Progresar por tiempo en vez de por asistencia: 8s es el techo, la progresión es quitar banda.',
       'Arquear a un brazo: toda tu masa sobre cuatro dedos en full crimp es la carga más alta que le vas a pedir a una polea. Semiarqueo o abierto.'
     ]},
    {id:'str2b',n:'Bloques al límite en pared',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:4,skill:4,minLevel:1,
     det:'4-6 bloques cortos (4-8 movs) a tu límite en el rocódromo, con 3-4 min de descanso. Aplicás la fuerza de dedos y tracción a movimientos reales de escalada.',
     nota:'4-6 bloques límite (4-8 movs) · descanso 3-4 min',
     simple:'Buscá bloques cortos y difíciles y probalos con descanso largo. Es la forma de transferir la fuerza de dedos a escalada de verdad.',
     sci:'Lattice/Anderson: la fuerza del hangboard transfiere a la pared solo si la aplicás en movimientos reales. El bouldering al límite es el puente entre fuerza aislada y rendimiento.',
     tips:['Elegí bloques que puedas hacer en 1-4 intentos.','Descanso largo: es fuerza, no resistencia.','Variá presas y ángulos entre bloques.'],
     how:[
       'Elegí problemas que puedas encadenar en 1-4 intentos: si necesitás 10, es demasiado duro para entrenar fuerza.',
       'Trabajá con intención máxima en cada intento, no "probando a ver qué pasa".',
       'Descansá largo entre bloques (3+ min): buscás fuerza, no bombear.',
       'Variá presas y ángulos entre problemas para no machacar siempre los mismos dedos.'
     ],
     errors:[
       'Elegir bloques demasiado duros y quemar 10 intentos: eso es proyectar, no entrenar fuerza.',
       'Descansar poco entre intentos y terminar entrenando resistencia sin darte cuenta.',
       'Repetir siempre el mismo tipo de presa: sobrecarga los mismos tendones y deja huecos en el resto.',
       'Hacerlo al final de la sesión, cuando ya no podés aplicar fuerza real.'
     ]},
    {id:'str7',n:'Min-edge hangs (regletas chicas)',cat:'finger_strength',sys:'Fuerza max',col:'#38BDF8',fatigue:5,skill:4,minLevel:2,
     det:'Max hangs en regletas cada vez más chicas (15mm → 10mm → 8mm) en half-crimp, a peso corporal o con poco lastre. 5 x 7-10s, descanso 3 min. Para avanzados con base sólida de tendones.',
     nota:'5 x 7-10s en regleta mínima · descanso 3 min',
     simple:'Cuelgues en regletas muy chicas (más chicas que las de 20mm) a tu límite. Solo para avanzados: los dedos ya tienen que estar muy adaptados.',
     sci:'Anderson/López: reducir el tamaño de la presa aumenta la intensidad específica sobre la unidad músculo-tendón. Requiere años de adaptación previa — riesgo alto en dedos poco preparados.',
     tips:['Solo si ya hacés max-hangs en 20mm con lastre sin dolor.','Bajá de tamaño de a poco (2-3mm por bloque de semanas).','Cualquier molestia en poleas: volvé a regleta más grande.'],
     how:[
       'Sumá 10 min al calentamiento de la sesión, con hangs progresivos bajando de tamaño de regleta. En regletas mínimas entrar en frío es la vía directa a la polea.',
       'Elegí el tamaño con el que aguantás 7-10s a peso corporal dejando 2-3s de buffer. Si necesitás quitar peso, usá banda: nunca fuerces el tamaño.',
       'Half-crimp u open-hand, hombros activos. Colgá 7-10s y soltá ANTES de la falla.',
       'Descansá 3 min completos. Completá 5 series.',
       'La progresión es MUY lenta: bajás 2-3mm recién después de varias semanas sin molestias al tamaño actual.'
     ],
     errors:[
       'Saltar a regletas chicas sin años de base: es la causa clásica de rotura de polea A2.',
       'Usar full crimp en regletas mínimas  -  máxima tensión sobre la polea, sin beneficio extra.',
       'Progresar por tamaño y por peso al mismo tiempo: cambiá una variable por vez.',
       'Ignorar molestias "leves" en la base del dedo: ahí empieza la lesión de polea, no cuando duele fuerte.',
       'Hacerlo más de 1-2 veces por semana: el tejido conectivo se remodela lento.'
     ]},
    {id:'str8',n:'One-arm max hang (a un brazo)',cat:'finger_strength',sys:'Fuerza max unilateral',col:'#38BDF8',fatigue:5,skill:5,minLevel:3,
     det:'Cuelgue a un solo brazo sin asistencia (o con lastre negativo mínimo) en regleta de 20mm. 4-5 x 5-8s por brazo, descanso 3-4 min. Solo elite.',
     nota:'4-5 x 5-8s cada brazo · descanso 3-4 min',
     simple:'Colgarte de UN brazo, sin ayuda. De lo más duro que hay para los dedos  -  solo para nivel elite con base enorme.',
     sci:'Anderson (RCTM): el one-arm hang es la máxima expresión de fuerza de dedos unilateral, específica para desplomes y movimientos de palanca extremos. Reservado a elite por la carga.',
     tips:['Progresá desde el one-arm ASISTIDO (str6) primero.','Nunca a falla: buffer siempre.','Alterná brazos y frená si baja la calidad.'],
     how:[
       'Sumá 10-15 min al calentamiento de la sesión, incluyendo hangs a dos brazos con lastre progresivo. A un brazo la carga por dedo es máxima.',
       'Regleta de 20mm (no más chica). Hombro activo y encajado, cuerpo quieto.',
       'Colgá 5-8s con buffer real y bajá con control  -  nunca te descuelgues de golpe.',
       'Cambiá de brazo. Descansá 3-4 min entre series. Completá 4-5 por brazo.',
       'Si un brazo rinde bastante menos, igualalo con asistencia en ese lado antes de progresar carga.'
     ],
     errors:[
       'Intentarlo sin dominar antes el one-arm asistido (str6) con poca banda.',
       'Bajar de 20mm: a un brazo, la carga por dedo ya es máxima  -  achicar la regleta multiplica el riesgo sin beneficio.',
       'Hombro pasivo o cuerpo girando: lesión de hombro casi asegurada a esta carga.',
       'Buscar el récord de segundos: es fuerza máxima, no aguante. Buffer siempre.',
       'Programarlo en semanas de mucha carga acumulada o con dedos sensibles.',
       'Full crimp a un brazo: es la combinación de carga por dedo más alta que existe en la escalada. Si no podés sostenerlo en semiarqueo, todavía no es tu ejercicio.'
     ]}
  ],
  power:[
    {id:'pow0a',n:'Movimientos dinámicos en fácil',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:2,skill:2,minLevel:0,phase:'warmup',
     det:'Práctica saltar a presas grandes en el muro de boulder desde posición solida. 4-6 intentos con 3-4 min descanso.',
     nota:'4-6 movimientos sueltos al límite · 3-4 min de descanso',
     simple:'Empezar a practicar movimientos dinámicos  -  saltos  -  con presas grandes y seguras para aprender el patron.',
     sci:'Horst (2016): la potencia no puede entrenarse directamente sin base de fuerza. En principiantes, practicar el patron de movimiento es el primer paso.',
     tips:['Muro vertical o poco desplomado','Presas grandes y seguras','Importa la técnica del movimiento, no el grado'],
     how:[
       'En bloques fáciles, buscá movimientos donde tengas que impulsarte en vez de traccionar despacio.',
       'Brazos estirados antes de iniciar el movimiento; el impulso arranca en piernas y cadera.',
       'Apuntá a agarrar la presa en el punto más alto del recorrido, sin quedarte corto ni pasarte.',
       'Repetí el mismo movimiento varias veces hasta que salga suave — es coordinación, no fuerza.',
       'Parás cuando el movimiento pierde precisión.'
     ],
     errors:[
       'Elegir movimientos demasiado duros: para aprender a moverse dinámico hace falta margen.',
       'Traccionar con los brazos en vez de impulsar con las piernas.',
       'Practicar cansado, cuando la coordinación ya está degradada.',
       'Hacerlo una sola vez y pasar a otra cosa: la coordinación necesita repetición.'
     ]},
    {id:'pow0b',n:'Bouldering rapido en grados faciles',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:3,skill:3,minLevel:0,phase:'warmup',
     det:'Escala problemas simples pero con movimientos rapidos y decisivos. 3-5 problemas con 5 min descanso completo.',
     nota:'3-5 bloques fáciles lo más rápido posible · 5 min de descanso',
     simple:'Escalar boulders que conoces pero moviendote rapido y con decision  -  entrena la velocidad de respuesta muscular.',
     sci:'Bechtel (2019): en principiantes la mejora de potencia viene del refinamiento neural. Movimiento rapido en grados faciles es el estimulo correcto.',
     tips:['Elige problemas que puedas completar seguro','Explota desde los pies, no solo de los brazos','5 min de descanso real entre intentos'],
     how:[
       'Elegí bloques bastante por debajo de tu grado y escalalos MÁS RÁPIDO de lo habitual.',
       'La velocidad es el estímulo: buscás moverte con decisión, sin dudar entre presa y presa.',
       'Mantené la técnica: si al acelerar empezás a patinar de pies, bajá un grado más.',
       'Descansá lo suficiente entre bloques como para poder mantener la velocidad.',
       'Cortá cuando ya no puedas escalar rápido y limpio a la vez.'
     ],
     errors:[
       'Subir el grado: a mayor dificultad no vas a poder ir rápido y perdés el estímulo.',
       'Confundir rápido con descuidado — los pies siguen teniendo que ser precisos.',
       'Encadenar bloques sin descanso hasta bombearte.',
       'Hacerlo al final de la sesión, cuando la velocidad ya no existe.'
     ]},
    {id:'pow1',n:'Campus: movimiento máximo',cat:'campus_board',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'Desde liston 1, movimiento dinámico al liston más lejano posible. 6-8 intentos con 5 min descanso.',
     nota:'6-8 movimientos máximos · 5 min de descanso entre cada uno',
     simple:'Campus board: saltar al liston más lejano posible  -  mide la potencia explosiva real.',
     sci:'Barrows (2013) PEAK PHASE: An Pow = % capacidad anaeróbica en un movimiento. RFD200ms (Anderson).',
     tips:['Solo con cuerpo 100% fresco','Registrar liston alcanzado cada sesión','Sin campus: dynamic bouldering al limite'],
     how:[
       'Sumá 10-15 min al calentamiento de la sesión, terminando con algunos movimientos de campus suaves en listones grandes. Acá el riesgo de polea es real.',
       'Desde el listón 1 con ambas manos, lanzá una mano al listón más lejano que puedas alcanzar con control.',
       'Bajá con los pies al piso (no te descuelgues de golpe). Anotá qué listón alcanzaste.',
       'Descansá 5 min completos entre intentos: es potencia pura, necesitás el SNC fresco.',
       'Completá 6-8 intentos. Frená apenas dejes de alcanzar tu mejor listón: ya no estás entrenando potencia.'
     ],
     errors:[
       'Hacerlo con cualquier grado de fatiga: el campus con SNC cansado es cuando aparecen las lesiones.',
       'Listones chicos: en campus se progresa por distancia, no por tamaño de listón.',
       'Aterrizar con el codo bloqueado o el hombro pasivo  -  el impacto se lo come la articulación.',
       'Encadenar muchos intentos con poco descanso: eso ya es capacidad, no potencia, y multiplica el riesgo.',
       'Usarlo sin base: si no tenés años de escalada y fuerza de dedos sólida, hacé bouldering dinámico en su lugar.',
       'Arquear los listones (full crimp): en campus el impacto de la recepción llega de golpe y el arqueo es lo que rompe la polea A2. Agarre abierto o semiarqueo, siempre.'
     ]},
    {id:'pow2',n:'Bouldering dinámico al limite',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:1,
     det:'Secuencias cortas (4-8 movimientos) explosivas al máximo. 4-6 intentos por secuencia con descanso COMPLETO de 3-5 min entre intentos. La clave es llegar fresco a cada intento: querés quedar "sin potencia", nunca bombeado.',
     nota:'4-6 intentos · 4-8 movs explosivos · descanso 3-5 min',
     simple:'Escalar los bloques más difíciles con máxima explosión, descansando bien entre intentos. Si te bombeás, el descanso fue muy corto: esto es potencia, no resistencia.',
     sci:'Barrows (2013): en potencia anaeróbica el objetivo es "powered out, NOT pumped". El sistema ATP-PC necesita 3-5 min de recuperación completa entre esfuerzos máximos; con descanso corto el estímulo se convierte en capacidad anaeróbica (otro sistema).',
     tips:['Problemas al límite absoluto de fuerza.','Descanso COMPLETO (3-5 min): si te bombeás, descansaste poco.','Bouldering de potencia primero en la sesión, An Cap después.'],
     how:[
       'Hacé este bloque al INICIO de la sesión, apenas terminado el calentamiento: es potencia y necesita el cuerpo fresco.',
       'Elegí un bloque dinámico que esté a tu límite absoluto — de esos que sacás en 1 a 4 intentos como mucho.',
       'Antes de lanzar, dejá los brazos estirados y colgá del esqueleto. Lanzar con los brazos ya flexionados te deja sin recorrido para acelerar.',
       'Buscá agarrar la presa en el punto muerto del movimiento (el apex), cuando tu centro de masa deja de subir: ahí la presa recibe la carga mínima.',
       'No sueltes la tensión de cuerpo al llegar: relajarse un instante antes de tiempo es lo que hace fallar la mayoría de los lanzamientos.',
       'Descansá 3-5 min COMPLETOS entre intentos. Si terminás bombeado, descansaste poco y ya no es potencia.'
     ],
     errors:[
       'Encadenar intentos con poco descanso: convierte una sesión de potencia en una de resistencia y no entrena lo que buscabas.',
       'Lanzar con los brazos flexionados: perdés el recorrido de aceleración y sobrecargás el hombro.',
       'Hacerlo al final de la sesión, ya fatigado — el SNC necesita estar fresco y la técnica se degrada.',
       'Insistir 10 veces con el mismo bloque: si no sale en 4-5 intentos de calidad, cambiá de problema.'
     ]},
    {id:'pow3',n:'Dominadas explosivas (pliometricas)',cat:'pull_strength',sys:'An Pow',col:'#9B6EFF',fatigue:4,skill:3,minLevel:1,
     det:'Dominadas soltando la barra en el punto más alto. 4 x 5 reps. Descanso 3-4 min entre series.',
     nota:'4 series x 5 dominadas explosivas · 4 min de descanso',
     simple:'Dominadas donde sueltas la barra arriba  -  entrena la velocidad de contracción muscular para movimientos explosivos.',
     sci:'RFD200ms (Anderson): velocidad de contracción en 200ms del movimiento. Crítico en boulder y rutas dinámicas.',
     tips:['Solo con 8+ dominadas normales previas','Calentamiento completo siempre','Parar si baja la técnica'],
     how:[
       'Requisito previo: 8+ dominadas estrictas. Si no llegás, entrená dominadas normales o con lastre (str3) primero.',
       'Calentá hombros y codos a fondo (10-15 min) + 2 series suaves de dominadas.',
       'Tirá explosivo hasta que el pecho llegue a la barra y soltá las manos un instante en el punto más alto.',
       'Recibí con los codos algo flexionados y el hombro activo  -  nunca con el brazo bloqueado.',
       'Bajá con control. 5 reps por serie, 4 series, 3-4 min de descanso.'
     ],
     errors:[
       'Hacerlas sin la base de 8+ dominadas: la fase de recepción exige mucho más que el tirón.',
       'Recibir con los codos totalmente extendidos: es el error que lesiona codo y hombro.',
       'Seguir cuando ya no despegás las manos: si no hay vuelo, es una dominada normal mal hecha  -  cortá la serie.',
       'Programarlas en la misma sesión que campus: demasiada carga pliométrica junta.'
     ]},
    {id:'pow3b',n:'Bloqueos (lock-offs) a 90° y 120°',cat:'pull_strength',sys:'An Pow',col:'#9B6EFF',fatigue:3,skill:3,minLevel:1,
     det:'Hacés una dominada y frenás el movimiento manteniendo la posición bloqueada a ~90° y a ~120° de codo, 3-5s por ángulo. 4-5 series con 3 min de descanso. Construye la fuerza de bloqueo para sostener una presa mientras la otra mano avanza.',
     nota:'4-5 series · bloqueo 3-5s a 90° y 120° · descanso 3 min',
     simple:'Hacés una dominada y te "congelás" a mitad de camino unos segundos, en dos alturas. Entrena la fuerza para quedarte quieto sujetando una presa mientras la otra mano busca la siguiente.',
     sci:'Horst/Anderson: la fuerza isométrica de bloqueo (lock-off) es específica para sostener posiciones estáticas en pared. Complementa a las dominadas explosivas (pow3): una entrena velocidad, la otra control  -  alternarlas varía el estímulo del slot de tracción entre semanas.',
     tips:['Base previa: al menos 6-8 dominadas limpias.','Mantené los hombros activos (no cuelgues muerto abajo).','Si no llegás a bloquear, usá banda de asistencia; si es fácil, sumá peso.','Alterná con las dominadas explosivas (pow3) entre semanas.'],
     how:[
       'Colgate de una barra o presas grandes con agarre cómodo.',
       'Traccioná hasta 90° (codo en ángulo recto) y sostené ahí, con las escápulas bajas y el core firme.',
       'Sostené el tiempo indicado, bajá controlado y repetí en el otro ángulo (120°).',
       'Alterná los ángulos: la fuerza de bloqueo es específica de la posición, y entrenar sólo uno deja huecos.',
       'Descansá 2-3 min entre series.'
     ],
     errors:[
       'Dejar el hombro colgado pasivamente en el bloqueo: la carga se va al manguito rotador.',
       'Sostener con el cuerpo balanceándose: sin tensión de core el bloqueo no entrena lo que debería.',
       'Entrenar un solo ángulo y suponer que la fuerza se transfiere al resto.',
       'Bajar de golpe al terminar la serie en vez de controlar el descenso.'
     ]},
    {id:'pow4',n:'Campus: escaleras de An Cap',cat:'campus_board',sys:'An Cap',col:'#9B6EFF',fatigue:5,skill:4,minLevel:2,
     det:'Escaleras cortas de subida y bajada en campus (sin pies), de 6-10 movimientos por serie. 4-6 series con descanso 3-4x el tiempo de trabajo (mínimo 3 min). Listones GRANDES. El campus es la herramienta de mayor carga sobre poleas y hombros: acá se prioriza calidad, no volumen.',
     nota:'4-6 series · 6-10 movs · descanso 3+ min',
     simple:'Subir y bajar el campus en escaleras cortas, con descanso largo. Poco volumen a propósito: el campus castiga mucho los dedos y los hombros.',
     sci:'Barrows (2013): el campus permite progresar de a 1 movimiento por sesión. Horst/Anderson coinciden en que el campus exige volumen BAJO y descanso largo — es la herramienta con mayor tasa de lesión de poleas y hombro si se acumulan repeticiones.',
     tips:['Listones grandes para empezar; nunca regletas chicas en campus.','Progresar 1 movimiento por sesión, no más.','Calentamiento completo de dedos y hombros (30+ min) obligatorio.','1 sola sesión de campus por semana como máximo.'],
     errors:[
       'Acumular volumen alto (decenas de movimientos por sesión): es la vía rápida a una lesión de polea o de hombro.',
       'Hacer campus con fatiga previa o sin calentar del todo.',
       'Usar listones chicos buscando más intensidad  -  la progresión va por movimiento, no por tamaño de listón.',
       'Hacer campus más de 1 vez por semana o en fases sin base de fuerza.'
     ],
     how:[
       'Sumá 10-15 min al calentamiento de la sesión, con movimientos de campus suaves antes de las escaleras.',
       'Prerrequisito real: si todavía no encadenás V5-V6 y no hacés 15-20 dominadas limpias, seguí escalando en vez de campusear. El campus no acelera nada si falta base.',
       'Agarre SIEMPRE abierto o semiarqueo. El arqueo completo hiperextiende la primera falange y carga la polea A2 por encima de lo seguro.',
       'Empezá con las escápulas bajas y atrás — nunca colgado pasivamente de hombros encogidos, que traslada la carga al manguito rotador.',
       'Subí y bajá la escalera de forma continua, 6-10 movimientos por serie. Bajar controlado es parte del ejercicio, no un trámite.',
       'Descansá 3+ minutos entre series (3-4× el tiempo de trabajo). Si acortás el descanso, dejaste de entrenar potencia.',
       'Frená apenas una serie salga peor que la anterior: en potencia, la repetición fea no suma, resta.'
     ]},
    {id:'pow5',n:'Moon/Tensión board al limite',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'Problemas al limite en tabla de madera estandarizada. 4-6 intentos con 5-8 min descanso.',
     nota:'4-6 intentos máximos · 5-8 min de descanso entre cada uno',
     simple:'Escalar problemas de muro de madera estandarizado  -  mide progresión objetiva de potencia.',
     sci:'Barrows (2013): tabla estandarizada = progresión medible. RFD en angulo negativo.',
     tips:['Registrar grade más duro completado','No escalar si fatiga alta','Mejor rendimiento las primeras 2h'],
     how:[
       'Moon o tension board exigen tensión de cuerpo constante: calentá también core y hombros, no sólo dedos.',
       'Elegí problemas al límite de tu grado, pero con presas que puedas tomar en semiarqueo o abierto.',
       'Escalá los primeros 2-3 intentos leyendo el movimiento; recién después andá al 100%.',
       'Mantené los pies activos: en board las presas de pie son chicas y soltar el pie duplica la carga sobre los dedos.',
       'Descansá 3-5 min entre intentos y frená cuando el grado que completás empieza a bajar.'
     ],
     errors:[
       'Usar el board con fatiga acumulada: las presas son fijas y castigan siempre los mismos dedos.',
       'Arquear por defecto en todas las presas — el board invita a arquear y es donde más poleas se rompen.',
       'Encadenar sesiones de board en días seguidos: la carga sobre dedos es altísima y necesita 48h.',
       'Ignorar los pies y traccionar todo con brazos: es el error que más rápido lleva a lesión de hombro.'
     ]},
    {id:'pow6',n:'System board bilateral',cat:'wall_training',sys:'Fuerza max bilateral',col:'#9B6EFF',fatigue:4,skill:4,minLevel:2,
     det:'Movimientos simetricos en system board. 6 x 4 movs al limite bilateral. Descanso 5 min.',
     nota:'6 series x 4 movimientos · 5 min de descanso',
     simple:'Muro con presas simetricas  -  identifica cual lado es más débil y trabaja en igualar.',
     sci:'Horst (2008): system board elimina compensaciones. Permite atacar debilidades específicas.',
     tips:['Mismo agarre ambas manos','Identificar tipo de agarre más débil','Alternar: crimps, slopers, pockets'],
     how:[
       'System board: los movimientos son simétricos a propósito, para cargar los dos lados por igual.',
       'Calentá dedos y hombros; el system board no perdona presas mal tomadas.',
       'Ejecutá el movimiento de forma controlada en ambos lados, mismo número de repeticiones por lado.',
       'Mantené la escápula activa (hombro "empaquetado", no colgado) en cada tracción.',
       'Descansá 3 min entre series y frená si un lado empieza a compensar al otro.'
     ],
     errors:[
       'Hacer más repeticiones del lado fuerte: el system board existe justamente para corregir asimetrías, no para reforzarlas.',
       'Colgar de hombros pasivos: es la vía directa a molestias de manguito rotador.',
       'Usar presas más chicas de las que podés tomar en semiarqueo cómodo.',
       'Acumular volumen: es entrenamiento de fuerza, y con fatiga la técnica se degrada rápido.'
     ]},
    {id:'pow1b',n:'Dead-points (lanzamientos controlados)',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:3,skill:4,minLevel:1,
     det:'Movimientos donde lanzás a una presa y la agarrás en el "punto muerto" (el instante sin peso, arriba del arco del movimiento). 5-8 intentos por movimiento, bien descansado.',
     nota:'5-8 lanzamientos · descanso 3 min',
     simple:'Practicá lanzarte a una presa y agarrarla justo cuando tu cuerpo queda "flotando" arriba. Movimientos explosivos con control.',
     sci:'Barrows (2013): el dead-point es la técnica dinámica clave  -  agarrás la presa en el punto de ingravidez momentánea. Entrena RFD (velocidad de fuerza) con menos riesgo que el campus.',
     tips:['Buscá el timing, no la fuerza bruta.','Empezá con distancias cortas.','Bien descansado entre intentos: es potencia.'],
     how:[
       'Elegí un movimiento donde tengas que soltar una mano y llegar a una presa lejana.',
       'Antes de lanzar, brazos estirados y cuerpo colgado del esqueleto: desde ahí podés acelerar.',
       'Iniciá el movimiento desde las piernas y la cadera, no tirando sólo con los brazos.',
       'Agarrá la presa en el APEX del recorrido — el instante en que tu centro de masa deja de subir. Ahí la presa recibe la mínima carga posible.',
       'No relajes la tensión de cuerpo al tocar la presa: sostener la tensión un instante más es lo que evita que te descuelgues.',
       'Descansá 2-3 min y repetí. Buscás precisión, no cansancio.'
     ],
     errors:[
       'Lanzar con los brazos ya flexionados: te quedás sin recorrido y el hombro absorbe el tirón.',
       'Agarrar la presa antes o después del apex — antes te frena, después ya vas cayendo y la carga se multiplica.',
       'Soltar la tensión de cuerpo apenas tocás la presa.',
       'Practicarlo con fatiga: la coordinación se degrada y sólo aprendés a hacerlo mal.'
     ]},
    {id:'pow6b',n:'Bloques potentes en spray wall',cat:'wall_training',sys:'An Pow',col:'#9B6EFF',fatigue:4,skill:3,minLevel:1,
     det:'4-6 bloques cortos con movimientos potentes (NO campus) en spray/moon board a ángulo moderado, usando los pies. Descanso 3-5 min. La versión "de pared" de la potencia, apta antes de progresar al campus.',
     nota:'4-6 bloques potentes · descanso 3-5 min',
     simple:'Bloques cortos y explosivos en un panel inclinado  -  movimientos con impulso pero usando los pies. Más seguro que el campus.',
     sci:'Barrows (2013): entrenar potencia en la pared (con pies) antes que en campus reduce el riesgo articular y transfiere mejor al movimiento real de escalada.',
     tips:['Usá los pies  -  no es campus.','Movimientos explosivos pero controlados.','Descanso largo entre bloques.'],
     how:[
       'Armá o elegí bloques cortos (3-6 movimientos) y potentes en el spray wall.',
       'Priorizá movimientos que exijan generar, no bloquear: lanzamientos, compresiones, movimientos largos.',
       'Cada intento al 100%, con el cuerpo fresco y al inicio de la sesión.',
       'Descanso 3 min entre intentos; el spray wall invita a encadenar sin parar y ahí se pierde el estímulo.',
       'Cambiá de bloque cuando el movimiento empiece a salir lento.'
     ],
     errors:[
       'Escalar sin parar de bloque en bloque: se convierte en resistencia y deja de ser potencia.',
       'Elegir siempre los mismos movimientos que ya te salen bien.',
       'Ignorar el calentamiento porque "es sólo spray wall": las presas suelen ser chicas y agresivas.',
       'Hacerlo después del hangboard, con los dedos ya gastados.'
     ]},
    {id:'pow7',n:'Movimientos aislados al límite (max recruitment)',cat:'power',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:2,
     det:'NO es el bloque entero: aislás 1-2 MOVIMIENTOS individuales tan duros que apenas podés hacerlos (el crux de un proyecto, o un movimiento armado a propósito). 6-10 intentos de ese único movimiento, con 3-5 min de descanso. Máximo reclutamiento de unidades motoras en un solo esfuerzo.',
     nota:'6-10 intentos de 1-2 movimientos máximos · descanso 3-5 min',
     simple:'En vez de probar un bloque entero, elegís UN movimiento durísimo y lo intentás una y otra vez bien descansado. Al ser un solo movimiento podés darle el 100% cada vez  -  eso es lo que entrena la potencia máxima.',
     sci:'Barrows (2013): el trabajo de reclutamiento máximo aísla el esfuerzo en 1-2 movimientos para que cada intento sea verdaderamente máximo. Diferencia con el bouldering al límite (str2, problema completo): al aislar el movimiento no se acumula fatiga de la secuencia, así que la calidad neuromuscular se mantiene más alta.',
     tips:['Aislá el movimiento: no encadenes el problema entero (para eso está str2).','Cada intento al 100%: si no podés, descansá más.','Frená apenas la potencia baja  -  no lo conviertas en resistencia.'],
     how:[
       'Elegí UN movimiento aislado del problema — el más duro — y trabajalo solo. No encadenes el bloque entero.',
       'Posicionate en la presa de inicio, con el cuerpo ya tensionado, y ejecutá el movimiento al 100 % de intención.',
       'La intención máxima es el punto: aunque el movimiento sea corto, el reclutamiento depende de cuánta fuerza intentás aplicar, no de cuánto te movés.',
       'Bajate y descansá 3-5 min. Es reclutamiento neural puro: necesitás recuperación completa entre intentos.',
       'Frená apenas notes que la potencia baja. Seguir es entrenar fatiga, no fuerza.'
     ],
     errors:[
       'Convertirlo en encadenar el problema completo: ahí ya es otro ejercicio (bloques al límite), con otro estímulo.',
       'Descansar poco entre intentos: sin SNC fresco no hay reclutamiento máximo.',
       'Hacerlo con dedos ya cargados de un hangboard previo en la misma sesión.',
       'Elegir un movimiento tan duro que no puedas ni iniciarlo — necesitás poder ejecutarlo, aunque sea al límite.'
     ]},
    {id:'pow8',n:'Campus bumps / escaleras 1-4-7',cat:'campus_board',sys:'An Pow',col:'#9B6EFF',fatigue:5,skill:5,minLevel:3,
     det:'Campus avanzado con "bumps" (dobles movimientos con la misma mano) y escaleras largas (ej. 1-4-7). 6-8 series, descanso 3-4x el tiempo de trabajo. Solo elite.',
     nota:'6-8 series de bumps o escaleras · 4 min de descanso',
     simple:'Campus con movimientos dobles y saltos largos entre listones. De lo más exigente para potencia de contacto  -  solo elite con hombros y dedos muy sólidos.',
     sci:'Barrows (2013): los bumps y escaleras largas maximizan la tasa de desarrollo de fuerza (RFD) de contacto. Alta carga articular  -  solo para elite bien preparado.',
     tips:['Base previa: campus básico (1-3-5) sólido.','Hombros muy calientes: alto riesgo articular.','Progresar 1 movimiento por sesión.'],
     how:[
       'Sumá 15-20 min al calentamiento de la sesión: los bumps concentran toda la carga en un brazo y el hombro tiene que llegar listo.',
       'Bumps: subís a un listón y con la MISMA mano "picás" al siguiente sin soltar la otra. Empezá con bumps cortos.',
       'Escaleras largas (1-4-7): lanzás salteando listones. Hacé la subida con control y bajá con los pies al piso.',
       'Descansá 3-4x el tiempo de trabajo (mínimo 3-4 min) entre series. 6-8 series máximo.',
       'Progresás 1 movimiento por sesión. Registrá la combinación alcanzada.'
     ],
     errors:[
       'Hacerlo sin dominar el campus básico (1-3-5): los bumps concentran toda la carga en un brazo.',
       'Calentamiento insuficiente de hombro  -  a esta intensidad el manguito rotador es el eslabón débil.',
       'Acumular series buscando volumen: es potencia máxima, la calidad cae rápido.',
       'Combinarlo con otra sesión de campus en la misma semana.',
       'Seguir con dedos o codos sensibles: a este nivel de carga, una molestia leve se transforma en lesión.',
       'Bumpear en arqueo completo: el bump carga un solo brazo en el peor instante del movimiento. Semiarqueo o abierto, sin excepción.'
     ]}
  ],
  endurance:[
    {id:'end10',n:'Circuito de capacidad anaeróbica',cat:'power_endurance',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:4,minLevel:1,
     det:'Donde: spray wall, board (Moon/Kilter/Tension) o un circuito que armes vos en el muro de boulder enlazando 2-3 bloques. Necesitás poder repetir EXACTAMENTE la misma secuencia cada vez, por eso sirve mejor una pared con muchas presas que una vía. Armá 12-15 movimientos intensos (75-85% de tu límite) y repetilos 8-10 veces, descansando 2-4 veces lo que tardaste. Objetivo: terminar sin fuerza pero NO bombeado.',
     nota:'8-10 x 12-15 movs · descansás el triple de lo que tardás',
     simple:'Una secuencia dura de 12-15 movimientos que repetís muchas veces, en spray wall o enlazando bloques. Entrena aguantar tramos intensos sin bombearte — lo que necesitas en el crux de una vía larga.',
     sci:'Barrows (2013): An Cap requiere 16+ semanas de adaptación. Sin Aero Cap base: más An Cap = peor rendimiento.',
     tips:['Boulder al 75-85% límite','Si te bombeas: circuito muy largo o intenso','Objetivo: menos del 25% de fallos'],
     how:[
       'Armá una secuencia de 12-15 movimientos intensos (75-85% del límite), más dura que un circuito de resistencia normal.',
       'Calentá 20 min progresivos: esto es alta intensidad, necesitás dedos listos.',
       'Escalá la secuencia completa a tope. Cronometrá el tiempo de trabajo.',
       'Descansá 2-4 veces ese tiempo (descanso largo: querés recuperar, no acumular bombeo).',
       'Repetí 8-10 veces. Buscás terminar sin fuerza pero SIN estar bombeado  -  si te bombeás, la secuencia es muy larga.'
     ],
     errors:[
       'Acortar el descanso: pasa de capacidad anaeróbica a un circuito de bombeo, que es otro sistema.',
       'Confundir el objetivo: acá querés quedarte sin fuerza, no bombeado. Si el antebrazo se hincha, ajustá.',
       'Hacerlo sin base aeróbica prevía: Barrows advierte que sin Aero Cap de base, más An Cap empeora el rendimiento.',
       'Aceptar más de 25% de fallos: si te caés todo el tiempo, la secuencia es demasiado dura.'
     ]},
    {id:'end0a',n:'Escalada continua suave (ARC basico)',cat:'aerobic_endurance',sys:'Aero Cap',col:'#F472B6',fatigue:1,skill:1,minLevel:0,phase:'warmup',
     det:'En el muro de boulder (travesía) o en top-rope, escalá 15-20 min sin bajarte, a 3-4 grados por debajo de tu máximo. El bombeo tiene que ser leve y estable: si no podés mantener una conversación, bajá el grado.',
     nota:'15-20 min continuo · 3-4 grados bajo tu máximo',
     simple:'Escalar tranquilo y sin parar  -  como caminar. Construye la base aeróbica que hace que te recuperes mejor entre movimientos y entre sesiones.',
     sci:'Barrows (2013): ARC mejora densidad capilar en antebrazos, permitiendo recuperarse más rapido. Primer estimulo aeróbico recomendado para principiantes.',
     tips:['Si el bombeo no es manejable: baja al siguiente grado','15 min ya es suficiente para empezar','Aumentar duración 5 min por semana'],
     how:[
       'Elegí una pared o travesía bien por debajo de tu grado: tenés que poder escalar sin parar y sin bombearte.',
       'La intensidad correcta es RPE 2/10: podrías mantener una conversación mientras escalás.',
       'Movete de forma continua 10-30 minutos, sin descolgarte. Si necesitás parar a sacudir, bajá el grado.',
       'Mantené los brazos estirados y el peso en los pies todo lo que puedas.',
       'Si aparece hinchazón de antebrazos, ya te fuiste de intensidad: el ARC deja de funcionar apenas te bombeás.'
     ],
     errors:[
       'Escalar demasiado duro: es EL error del ARC. Con bombeo el estímulo capilar desaparece y pasa a ser otra cosa.',
       'Parar a sacudir brazos cada dos movimientos — eso indica que el grado es alto.',
       'Hacer sesiones cortas de 5 minutos: por debajo de 10 min continuos no hay adaptación.',
       'Ponerlo después de una sesión dura, cuando ya no podés sostener el movimiento continuo.'
     ]},
    {id:'end0b',n:'Travesias técnicas',cat:'technique',sys:'Skill development',col:'#F472B6',fatigue:1,skill:2,minLevel:0,phase:'warmup',
     det:'Muevete de lado a lado en el muro sin bajar durante 15-20 min. Foco 100% en los pies y en la posición del cuerpo.',
     nota:'15-20 min de travesia continua',
     simple:'Moverse por el muro de forma continua pero pensando en como te mueves  -  mejora técnica y base aeróbica al mismo tiempo.',
     sci:'Bechtel (2019): travesias técnicas tienen el mejor ratio beneficio/riesgo para principiantes  -  estimulo aeróbico y neural sin carga digital excesiva.',
     tips:['Los pies hacen el trabajo  -  confiale el peso','Mirar donde pones el pie antes de moverlo','No importa la velocidad  -  importa el control'],
     how:[
       'Elegí una travesía fácil y largá con una consigna técnica por vuelta (pies silenciosos, brazos estirados, cadera pegada).',
       'Escalá lento y prestando atención a la consigna, no al grado.',
       'Hacé 3-5 vueltas, cambiando la consigna en cada una.',
       'Descansá lo necesario entre vueltas para no acumular fatiga: la técnica se aprende fresco.',
       'Cortá apenas la consigna deje de cumplirse.'
     ],
     errors:[
       'Escalar sin una consigna concreta: sin foco es sólo escalada fácil, no un drill.',
       'Subir el grado hasta donde la técnica se rompe.',
       'Hacerlo cansado, al final de la sesión: consolidás los errores en vez de corregirlos.',
       'Cambiar de consigna a mitad de vuelta y no trabajar ninguna a fondo.'
     ]},
    {id:'end1',n:'Circuitos de potencia-resistencia',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:3,minLevel:1,
     det:'Armá un circuito de 25-30 movimientos (no más: en roca rara vez hay tramos más largos sin descanso) al 60-70% de tu límite, en spray wall o enlazando bloques. Escalalo sin sacudir los brazos. Descansá lo mismo que tardaste y repetí. Arrancá con 4 repeticiones; subí a 6 recién cuando termines las 4 con técnica limpia. Si en la última repetición escalás feo o te caés, era demasiado.',
     nota:'4-6 x 25-30 movs · descanso = tiempo de trabajo',
     simple:'Un circuito largo de 25-30 movimientos que repetís 4-6 veces, descansando lo mismo que tardaste. Entrena aguantar el bombeo sin poder sacudir — lo que pasa en el tramo duro de una vía.',
     sci:'Barrows (2013): Aero Pow responde mejor a REDUCIR el descanso, no aumentar dificultad.',
     tips:['Sin sacudir aunque haya presas buenas','Para alto volumen: 6 sets x 4 reps con 10-20 min entre sets','Simular posición de clipse para bajar ritmo'],
     how:[
       'Armá un circuito de ~30 movimientos continuos que puedas completar bombeado pero sin caerte.',
       'Calentá 15 min progresivos, sin llegar a bombeo.',
       'Escalá los 30 movimientos SIN sacudir los brazos, aunque pases por presas buenas. Ese es el punto del ejercicio.',
       'Cronometrá cuánto tardaste y descansá exactamente ese mismo tiempo (rest = work).',
       'Repetí 8 veces. Si buscás volumen alto: 6 sets de 4 repeticiones con 10-20 min entre sets.'
     ],
     errors:[
       'Sacudir los brazos en cada jug: rompe el estímulo  -  el objetivo es aprender a escalar bombeado.',
       'Aumentar la dificultad en vez de reducir el descanso: en Aero Pow la progresión va por descanso (Barrows).',
       'Elegir un circuito donde te caés en la repetición 2: bajá dificultad para poder completar las 8.',
       'Hacerlo el mismo día que una sesión de fuerza máxima de dedos.'
     ]},
    {id:'end2',n:'4x4 de bloques · clásico (70-80%)',cat:'wall_training',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
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
     det:'En el muro de boulder o spray wall. Mirá el reloj: al arrancar cada minuto escalás un bloque de 6-8 movimientos cómodo (60-70% de tu límite, te lleva unos 20 s) y te bajás; lo que queda del minuto es tu descanso (unos 40 s). Al minuto siguiente volvés a empezar. 8-12 rondas. Si un bloque empieza a llevarte más de 30 s, ya estás fatigado: cortá.',
     nota:'8-12 rondas · 6-8 movs al inicio de cada minuto · 60-70% del límite',
     simple:'Cada minuto arrancás una serie corta de 6-8 movimientos y descansás lo que sobra del minuto. Como el reloj no para, cuanto más rápido escalás más descansás — y eso es parte del entrenamiento.',
     sci:'Barrows (2013): para aumentar intensidad usar problema más difícil, no acortar descanso.',
     tips:['Problema constante toda la sesión','Objetivo: fallar en ultimos 2-3 reps','Timer fijo, empezar siempre en punto'],
     how:[
       'Elegí un problema o circuito de 6-8 movimientos que te lleve unos 20 segundos.',
       'Calentá 15 min sin llegar a bombeo.',
       'Poné un timer que suene cada 60 segundos. Al sonar, empezás a escalar; terminás en ~20s y descansás lo que resta del minuto (~40s).',
       'Repetí 8-12 veces, siempre arrancando en punto  -  el reloj manda, no tus ganas.',
       'Está bien fallar en las últimás 2-3 repeticiones: esa es la señal de que la dificultad es la correcta.'
     ],
     errors:[
       'Cambiar de problema entre repeticiones: el estímulo depende de que la carga sea constante.',
       'Acortar el descanso para "hacerlo más duro"  -  para subir intensidad se usa un problema más difícil (Barrows), no menos descanso.',
       'Empezar tarde cuando cansa: si no llegás en punto, el problema es muy duro.',
       'Completar las 12 sin despeinarte: si nunca fallás, el problema es muy fácil.'
     ]},
    {id:'end4',n:'ARC Training (base aeróbica)',cat:'aerobic_endurance',sys:'Aero Cap',col:'#F472B6',fatigue:2,skill:2,minLevel:1,
     det:'En travesía de boulder o en top-rope: bloques de 10-15 min escalando sin bajarte, con 5 min de descanso entre bloques (2-3 bloques). Cuando 15 min te resulten cómodos, alargalos: el objetivo a largo plazo es un bloque continuo de 25-30 min. Intensidad: 3-4 grados POR DEBAJO de tu máximo (si encadenás 6b, escalá 5+/6a). "Sin pausa larga" significa que podés sacudir los brazos un segundo colgado de una presa buena, pero no bajarte ni sentarte.',
     nota:'2-3 x 10-15 min · pump leve · 5 min entre bloques',
     simple:'Escalada fácil y continua, en bloques de 10-15 min con descanso entre medio. Tenés que poder mantener una conversacion mientras escalás: si te falta el aire o se te hinchan los antebrazos, el grado es alto. No es un ejercicio para cansarte, es para que tus dedos aprendan a recuperarse mientras seguís escalando.',
     sci:'ARC = Aerobic Restoration & Capillarity (Goddard & Neumann 1993; Anderson RCTM). Los escaladores muestran mayor capilarización y mayor diámetro de arteria braquial que los no escaladores. DOSIS revisada tras el feedback de la beta (2026-08): Lattice prescribe ARC desde 10 min —no 20— a RPE 2/10, y el protocolo estándar admite la variante por INTERVALOS además de la continua, que es la única practicable cuando recién empezás. Intensidad: 3-4 grados por debajo del redpoint (Anderson).',
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
     det:'Elegí 3 rutas del MISMO grado, cómodas para vos: 2-3 grados por debajo de tu máximo (si encadenás 7a, usá 6b/6b+). Tenés que poder hacerlas sin caerte incluso cansado. Un ciclo es: 1 ruta → descanso 3 min → 2 rutas seguidas sin bajarte → 3 min → 3 seguidas. Después 5-6 min y arrancás otro ciclo. 2-3 ciclos segun nivel.',
     nota:'2-3 ciclos · 1→2→3 rutas · 3 min de descanso entre escalones',
     simple:'Escalas 1 ruta, descansás, después 2 seguidas, descansás, después 3 seguidas. Todas al mismo grado comodo. Cada escalon suma rutas sin bajarte, así la fatiga se acumula como en una jornada de roca.',
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
       'Elegír rutas muy duras: te quemás antes del último escalón y el estímulo aeróbico se pierde.',
       'Descansar entre rutas del mismo escalón  -  desvirtúa el ejercicio y lo convierte en intervalos.',
       'Hacerlo cansado de la sesión anterior: este ejercicio pide SNC + dedos frescos, mínimo 48h post sesión dura.',
       'No registrar  -  sin números concretos no sabés si la fase está funcionando.'
     ]},
    {id:'end6',n:'Ruta repetida en intervalos',cat:'aerobic_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:3,skill:4,minLevel:1,
     det:'Elegí una ruta de cuerda 1-2 grados por debajo de tu máximo, que puedas repetir sin caerte incluso cansado. Escalala, mirá cuánto tardaste, y descansá el DOBLE de ese tiempo (si subís en 3 min, descansás 6). Repetí 4-6 vueltas. Si empezás a escalar feo o te caés, cortá: la última vuelta tiene que salir limpia.',
     nota:'4-6 vueltas a la misma ruta · descansás el doble de lo que tardás',
     simple:'Subís la misma ruta 4-6 veces, descansando el doble de lo que tardás en subirla. Al repetirla la aprendés de memoria, así que lo único que te limita es el aguante.',
     sci:'Barrows (2013): repeticion de ruta permite aislamiento del estimulo. Alta especificidad para rutas de proyecto.',
     tips:['Ruta al 75-80% limite','Si fallas antes de rep 4: ruta muy dura','Si nunca fallas: ruta muy fácil'],
     how:[
       'Elegí UNA ruta al 75-80% de tu límite y quedate con esa toda la sesión.',
       'Calentá 15-20 min con rutas progresivas más fáciles.',
       'Escalá la ruta completa, bajá, y cronometrá: descansás 2-3 veces el tiempo que tardaste en subir.',
       'Repetí 6-10 veces. Cada repetición tenés que mantener la misma secuencia y la misma calidad de movimiento.',
       'Registrá en qué repetición aparece el primer fallo: esa es tu métrica de progreso entre sesiones.'
     ],
     errors:[
       'Cambiar de ruta entre repeticiones: perdés la comparabilidad, que es el valor del ejercicio.',
       'Elegir una ruta muy dura: si fallás antes de la repetición 4, no estás entrenando resistencia.',
       'Elegir una muy fácil: si nunca fallás, no hay estímulo.',
       'Improvisar la secuencia cada vez  -  parte del beneficio es automatizar los movimientos.'
     ]},
    {id:'end7',n:'Bloques enlazados · volumen (65-75%)',cat:'wall_training',sys:'Aero Pow',col:'#F472B6',fatigue:4,skill:4,minLevel:1,
     det:'Encadenás 3-5 boulders distintos como si fueran UNA sola ruta larga, sin descanso entre ellos. Eso es un set. Repetís 4-6 sets con 3-4 min de descanso entre cada uno. Boulders al 65-75% del límite.',
     nota:'4-6 sets · 3-5 bloques enlazados · 65-75% · descanso 3-4 min',
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
     det:'En TRAVESÍA (moviendote de lado por el muro de boulder, a poca altura, sin cuerda): 30 s escalando sin parar + 30 s de pausa parado en el suelo. Repetir 8-12 veces. Elegí un tramo con presas medianas que puedas recorrer ida y vuelta sin movimientos al límite. Zona de bombeo ligero-moderado: al final de cada 30 s tenés que poder seguir.',
     nota:'8-12 x (30s on / 30s off) · en travesía, sin cuerda',
     simple:'Escalas 30 segundos de travesía y parás 30 segundos, varias veces. Es a ras del suelo y sin cuerda, no en una vía. La forma más fácil y segura de empezar a entrenar resistencia.',
     sci:'Bechtel (Logical Progression 2019): on/off intervals = introducción ideal a Aero Pow. Control preciso de intensidad. Recomendado como primera herramienta de PE para principiantes e intermedios.',
     tips:['Si te bombeas antes de 30s: zona demasiado difícil','Usar el mismo tramo toda la sesión','Progresar: más repeticiones antes de aumentar dificultad'],
     how:[
       'Elegí un tramo de travesía con presas medianas que puedas escalar de forma continua, sin movimientos al límite.',
       'Calentá 10-15 min de escalada suave antes de empezar los intervalos.',
       'Poné un cronómetro: 30s escalando en movimiento continuo, 30s de pausa (bajás y sacudís los brazos).',
       'Repetí 8-12 veces. El bombeo tiene que subir de a poco, no aparecer de golpe en la primera serie.',
       'Progresás sumando repeticiones (12, 14, 16...) antes de subir la dificultad del tramo.'
     ],
     errors:[
       'Elegír un tramo demasiado duro: si te bombeás antes de los 30s, ya no estás entrenando resistencia aeróbica.',
       'No respetar el reloj y alargar las pausas cuando cansa  -  el estímulo está en el ritmo constante.',
       'Descansar colgado de la pared en vez de bajar: los antebrazos no se recuperan.',
       'Subir la dificultad antes de poder completar todas las repeticiones con calidad.'
     ]},
    {id:'end9',n:'Circuito de capacidad (PE inicial)',cat:'power_endurance',sys:'Aero Pow',col:'#F472B6',fatigue:2,skill:1,minLevel:0,
     det:'Circuito fácil de 15-20 movimientos, 6-8 veces con 2 min descanso. En zona suave, forma perfecta.',
     nota:'6-8 circuitos de 15-20 movs · 2 min de descanso',
     simple:'Circuito corto y fácil repetido varias veces -- la introducción más segura al entrenamiento de resistencia para principiantes.',
     sci:'Barrows (2013): estimulo mínimo efectivo de Aero Pow para principiantes = circuito 10-20 movimientos al 50-60% limite. Baja intensidad + consistencia = adaptación sin riesgo de lesión.',
     tips:['Zona MUY fácil -- debes poder hablar mientras escalas','Si te bombeas: circuito demasiado difícil','Progresar: primero más repeticiones, luego más dificultad'],
     how:[
       'Armá un circuito de 15-20 movimientos al 50-60% de tu límite: presas cómodas, nada de movimientos duros.',
       'Calentá 10 min de escalada muy suave.',
       'Escalá el circuito completo a ritmo tranquilo y constante. Bajá y descansá 2 min cronometrados.',
       'Repetí 6-8 veces. Tenés que poder hablar mientras escalás: esa es la señal de que la intensidad es la correcta.',
       'Progresás sumando repeticiones primero; recién cuando llegás a 8 cómodas, subís un poco la dificultad.'
     ],
     errors:[
       'Elegir un circuito muy difícil "para que sirva más": si te bombeás, perdiste el estímulo aeróbico.',
       'Saltarse el descanso de 2 min o acortarlo: el ratio trabajo/descanso es parte del ejercicio.',
       'Hacerlo con fatiga digital de una sesión de fuerza previa.',
       'Abandonar a las 3-4 repeticiones: el volumen es justamente lo que genera la adaptación.'
     ]},
    {id:'end0c',n:'Drill de pies precisos',cat:'technique',sys:'Skill development',col:'#F472B6',fatigue:1,skill:3,minLevel:1,
     det:'Escalá vías fáciles apoyando cada pie con precisión total: mirás la presa, apoyás sin ruido y sin reajustar. 15-20 min, foco 100% en técnica de pies.',
     nota:'15-20 min · pies silenciosos, sin reajustar',
     simple:'Escalás fácil pero apoyando cada pie perfecto, sin hacer ruido ni corregir. Mejora la eficiencia y ahorra energía en vías largas.',
     sci:'Bechtel (2019): la precisión de pies es el mayor ahorro de energía en escalada de resistencia. "Pies silenciosos" fuerza el control neuromuscular fino.',
     tips:['Si el pie hace ruido, fue impreciso.','Mirá la presa hasta apoyar el pie.','Prohibido reajustar una vez apoyado.'],
     how:[
       'En terreno fácil, mirá cada presa de pie hasta que apoyás el pie encima.',
       'Apoyá una sola vez: nada de reacomodar la punta después de poner el pie.',
       'Movete despacio y en silencio — si el pie hace ruido, lo apoyaste mal.',
       'Hacé 3-5 vueltas cortas concentrándote sólo en esto.',
       'Descansá entre vueltas: es un drill de precisión, no de resistencia.'
     ],
     errors:[
       'Mirar la presa y desviar la vista antes de apoyar: ahí se pierde la precisión.',
       'Corregir la posición del pie después de apoyarlo (el clásico "raspar" con la punta).',
       'Escalar rápido: la precisión se entrena lento y después se acelera.',
       'Elegir terreno tan duro que no puedas darte el lujo de mirar los pies.'
     ]},
    {id:'end0d',n:'Drill de brazos rectos',cat:'technique',sys:'Skill development',col:'#F472B6',fatigue:1,skill:3,minLevel:1,
     det:'Escalá vías fáciles manteniendo los brazos ESTIRADOS el máximo tiempo posible (colgando del esqueleto, no del músculo) y girando la cadera hacia la pared. 15-20 min.',
     nota:'15-20 min · brazos rectos, cadera a la pared',
     simple:'Escalás fácil tratando de tener los brazos estirados casi siempre y la cadera pegada a la pared. Así descansás los antebrazos mientras escalás.',
     sci:'Horst (2008): colgar de brazos rectos transfiere la carga a los huesos y no a los flexores del antebrazo, retrasando el pump. Es la base de la eficiencia en resistencia.',
     tips:['Brazo doblado = músculo trabajando: estiralo.','Girá la cadera para acercar el hombro a la presa.','Buscá posiciones de descanso en cada vía.'],
     how:[
       'En terreno fácil, escalá manteniendo los brazos ESTIRADOS todo lo posible.',
       'Para avanzar, empujá con las piernas y reposicioná la cadera en vez de traccionar.',
       'Cuando necesites alcanzar una presa lejana, girá la cadera hacia la pared antes de estirar el brazo.',
       'Hacé 3-5 vueltas. La sensación correcta es que los antebrazos casi no trabajan.',
       'Cortá cuando empieces a flexionar los brazos sin darte cuenta.'
     ],
     errors:[
       'Traccionar con los brazos por costumbre: es exactamente lo que el drill viene a corregir.',
       'Elegir terreno vertical duro donde estirar los brazos sea imposible.',
       'Hacerlo con antebrazos ya cargados de otra parte de la sesión.',
       'Ir rápido: sin tiempo para pensar, volvés al patrón viejo.'
     ]},
    {id:'end11',n:'Bloques enlazados · al límite (85-95%)',cat:'power_endurance',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:4,minLevel:2,
     det:'En el muro de boulder o spray wall: enlazá 3-4 bloques exigentes (cercanos a tu límite) sin bajarte, o bloque + destrepe, hasta acumular 15-25 movimientos duros. 4-6 series, descanso 1:1 (igual al tiempo de trabajo). Resistencia de potencia de alta intensidad.',
     nota:'4-6 series · 15-25 movs al límite · descanso 1:1',
     simple:'Encadenás varios bloques difíciles seguidos, sin descansar, hasta quedar bombeado. Descansás lo mismo que trabajaste y repetís. Entrena aguantar la intensidad alta.',
     sci:'Barrows (2013): la resistencia de potencia (An Cap) se entrena con series largas de alta intensidad y descanso incompleto (1:1). Enlazar bloques duros replica la demanda de un crux sostenido.',
     tips:['Elegí bloques al 80-90% de tu límite  -  duros pero encadenables.','Descanso igual al tiempo de trabajo, no más.','Si no llegás a la última serie con calidad, bajá un poco la dificultad.'],
     how:[
       'Elegí 3-4 bloques exigentes (80-90%) contiguos, o un bloque que puedas subir y destrepar.',
       'Calentá 20-25 min: alta intensidad sostenida exige dedos y hombros listos.',
       'Encadenalos sin bajarte hasta acumular 15-25 movimientos duros. Ese es tu tiempo de trabajo: cronometralo.',
       'Descansá exactamente ese mismo tiempo (1:1) y repetí. 4-6 series en total.',
       'Registrá en qué serie cae la calidad: si es antes de la 4ª, bajá un poco la dificultad la próxima vez.'
     ],
     errors:[
       'Descansar de más "para hacerlo bien": con descanso completo se convierte en bouldering al límite, no en capacidad.',
       'Elegir bloques tan duros que te caés en la primera serie: 80-90% significa encadenables bajo fatiga.',
       'Hacerlo sin base aeróbica ni fuerza previa: es el estímulo más exigente del bloque de resistencia.',
       'Programarlo con menos de 48h desde la última sesión dura de dedos.'
     ]},
    {id:'end12',n:'Intervalos de vía al límite',cat:'power_endurance',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:3,minLevel:2,
     det:'Escalá una vía al 90-100% de tu redpoint (o una réplica en muro), bajá, descansá lo mismo que tardaste, y repetí 4-6 veces. Capacidad anaeróbica específica de vía. Si la completás siempre, subí dificultad.',
     nota:'4-6 vías al límite · descanso 1:1',
     simple:'Subís una vía difícil, descansás lo que tardaste, y la repetís varias veces. Entrena aguantar el bombeo en vías cerca de tu tope.',
     sci:'Barrows (2013): los intervalos de vía a alta intensidad con descanso 1:1 desarrollan la capacidad anaeróbica (tolerancia al lactato), clave en vías de resistencia con crux sostenido.',
     tips:['Elegí una vía que puedas hacer 4-6 veces con esfuerzo real.','Cronometrá: descanso 1:1 con el tiempo de escalada.','No la conviertas en ARC: la intensidad tiene que ser alta.'],
     how:[
       'Elegí una vía al 90-100% de tu redpoint (o replicala en el muro del gimnasio).',
       'Calentá 20-25 min con vías progresivas, sin llegar a bombeo.',
       'Escalá la vía a tope y cronometrá el tiempo desde que salís hasta que bajás.',
       'Descansá exactamente ese mismo tiempo (1:1) y volvé a subir. Repetí 4-6 veces.',
       'Registrá hasta qué repetición llegás sin caerte: si completás las 6 con margen, subí dificultad la próxima.'
     ],
     errors:[
       'Bajar la intensidad para completar todas las repeticiones: se convierte en ARC y perdés el estímulo de capacidad.',
       'Descansar "hasta sentirte listo" en vez de cronometrar 1:1.',
       'Hacerlo en fase de fuerza máxima: este ejercicio es de fase de resistencia / pre-temporada.',
       'Encadenarlo con otra sesión intensa el mismo día  -  el coste de recuperación es alto.'
     ]},
    {id:'end13',n:'4x4 de bloques · duro (80-90%)',cat:'wall_training',sys:'An Cap',col:'#38BDF8',fatigue:5,skill:4,minLevel:2,
     det:'En el muro de boulder: elegí 4 bloques al 80-90% de tu límite (vs 70-80% del 4x4 estándar) y escalá cada uno 4 veces seguidas, con descanso corto (1-2 min) entre grupos. Para avanzados que ya dominan el 4x4 clásico (end2).',
     nota:'4 bloques (80-90%) x 4 reps · descanso 1-2 min entre grupos',
     simple:'El 4x4 de siempre pero con bloques bastante más duros y menos descanso. Solo tiene sentido si el 4x4 normal ya te queda cómodo.',
     sci:'Horst (2008): el 4x4 es el estímulo clásico de resistencia de potencia. Subir la intensidad al 80-90% (en vez de 70-80%) desplaza el estímulo hacia capacidad anaeróbica pura  -  progresión lógica cuando el 4x4 estándar ya no genera adaptación.',
     tips:['Solo si el 4x4 estándar (end2) ya te resulta manejable.','Bloques al 80-90%: duros, pero tenés que poder repetirlos 4 veces.','Si fallás ya en el grupo 1-2, son demasiado duros: volvé al 4x4 estándar.'],
     how:[
       'Elegí 4 bloques al 80-90% de tu límite (más duros que en el 4x4 estándar), contiguos en el muro.',
       'Calentá 20-25 min progresivos hasta rozar la dificultad de los bloques.',
       'Bloque 1: subilo 4 veces seguidas, con el mínimo descanso entre repeticiones (lo que tardás en bajar y volver a arrancar).',
       'Descansá 1-2 min y pasá al bloque 2. Repetí hasta completar los 4 bloques.',
       'Registrá cuántas repeticiones completaste de las 16 totales: esa es tu métrica entre sesiones.'
     ],
     errors:[
       'Hacerlo sin dominar antes el 4x4 estándar (end2): el salto de intensidad es grande.',
       'Elegir bloques que no podés repetir 4 veces: si fallás en el grupo 1-2, volvé al estándar.',
       'Estirar el descanso entre grupos más allá de 2 min  -  el estímulo depende de la densidad.',
       'Programarlo en semanas de mucha carga acumulada: es de los ejercicios más demandantes del pool.'
     ]}
  ],
  deload:[
    {id:'del1',n:'Travesia suave de recuperación',cat:'mobility',sys:'Recuperación activa',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'Travesía en el muro de boulder, a ras del suelo: 20-30 min moviéndote de lado en grados muy fáciles (5+ o menos). Bombeo mínimo o nulo. Si sentís cualquier hinchazón en los antebrazos, bajá el grado.',
     nota:'1 x 20-30 min de travesía muy suave',
     simple:'Moverte por el muro de forma muy tranquila  -  activa la circulación y te ayuda a recuperarte sin generar más fatiga.',
     sci:'Barrows (2013): deload NO es inactividad. Reduccion volumen 50% manteniendo intensidad. La supercompensacion ocurre DESPUÉS.',
     tips:['Enfoque en técnica y eficiencia','No intentar subir grados esta semana','Ideal para trabajar miedo y visualizacion'],
     how:[
       'Travesía muy suave, bien por debajo de tu grado, durante 15-20 minutos.',
       'El objetivo es mover sangre por los antebrazos, no entrenar: intensidad mínima.',
       'Parás apenas sientas cualquier hinchazón. En deload, menos es más.',
       'Combinalo con movilidad de hombros y muñecas al terminar.'
     ],
     errors:[
       'Aprovechar el deload para "probar un bloque": rompe el propósito de la semana.',
       'Alargar la sesión porque te sentís bien — sentirte bien es justamente el resultado buscado.',
       'Escalar hasta bombear: eso reinicia la fatiga que el deload viene a disipar.'
     ]},
    {id:'del2',n:'Circuito de musculos antagonistas',cat:'mobility',sys:'Prevencion lesiones',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'Extensores de dedos 3x15 con banda elastica, face pulls 3x15, rotación externa de hombro 3x12. Lento y controlado.',
     nota:'3 series x 15 reps · 90 s de descanso',
     simple:'Ejercicios para los musculos opuestos a los que usa la escalada  -  previene lesiones y mantiene equilibrio muscular.',
     sci:'Horst (2008): antagonistas críticos: extensores dedos, triceps, rotadores externos. 2 sesiones/semana todo el ciclo.',
     tips:['Extensores con banda elastica, NUNCA pesos','Face pulls lento  -  3 segundos cada fase','Incluir: wrist curls, reverse curls, pushups'],
     how:[
       'Extensores de dedos: banda elástica (o gomita) alrededor de los 5 dedos, abrí la mano contra la resistencia. 3 x 15 por mano, lento.',
       'Face pulls: banda anclada a la altura de la cara, tirá llevando los codos atrás y afuera, juntando escápulas. 3 x 15, 3s por fase.',
       'Rotación externa de hombro: codo pegado al costado a 90°, rotá el antebrazo hacia afuera contra la banda. 3 x 12 por lado.',
       'Descansá 90s entre ejercicios. Todo lento y controlado: es prevención, no fuerza.',
       'Hacelo 2 veces por semana durante TODO el ciclo, no solo en semana de descarga  -  podés hacerlo en casa.'
     ],
     errors:[
       'Usar peso libre en los extensores de dedos en vez de banda: sobrecarga innecesaria en un tejido chico.',
       'Hacerlo rápido y con impulso: el estímulo preventivo está en el control, no en la carga.',
       'Hacerlo solo en la semana de deload  -  la prevención funciona por acumulación constante.',
       'Saltárselo cuando aparecen las primeras molestias de codo: es justo cuando más falta hace (consultá si el dolor persiste).'
     ]},
    {id:'del3',n:'Movilidad y yoga para escaladores',cat:'mobility',sys:'ROM y recuperación',col:'#00E5A0',fatigue:1,skill:1,minLevel:0,
     det:'20 min: caderas, hombros, muñecas. Secuencias de yoga orientadas a escalada.',
     nota:'20 min, siempre con musculo caliente',
     simple:'Estiramientos y movilidad  -  mantiene las articulaciones sanas y mejora la flexibilidad para escalar técnico.',
     sci:'Consuegra (21 Factores): ROM como factor físico independiente que limita el rendimiento técnico.',
     tips:['Con musculo caliente, nunca en frio','Yoga: hip openers + shoulder mobility','Isquiotibiales, flexores cadera, rotadores externos'],
     how:[
       'Trabajá movilidad de hombros (rotación externa e interna), muñecas, dorsales y cadera.',
       'Sostené cada posición 30-60 segundos, respirando: no rebotes.',
       'Prestá atención especial a extensores de antebrazo y pectoral, que en escaladores se acortan.',
       'Sesión de 20 minutos, sin llegar a molestia — estirás hasta tensión cómoda, no hasta dolor.',
       'Ideal en día de descanso o después de escalar, nunca antes de una sesión dura.'
     ],
     errors:[
       'Estirar hasta el dolor: no acelera nada y puede irritar tendones ya cargados.',
       'Hacer estiramiento estático largo ANTES de escalar fuerte — baja la producción de fuerza.',
       'Saltear los antagonistas (extensores, rotadores externos), que es justo lo que previene lesiones.',
       'Rebotar en las posiciones en vez de sostener.'
     ]},
    {id:'del4',n:'Sesión de técnica en grados bajos',cat:'technique',sys:'Skill development',col:'#00E5A0',fatigue:1,skill:3,minLevel:0,
     det:'1h escalando en grados muy inferiores al limite. Foco 100% en footwork, posición de caderas y eficiencia.',
     nota:'60 min al 40-50% limite',
     simple:'Escalar fácil pensando solo en como te mueves  -  el deload es el mejor momento para trabajar técnica sin fatiga.',
     sci:'Consuegra: Economia de agarre = reduccion de fuerza vía optimizacion técnica.',
     tips:['Grados al 40-50% de tu limite real','Video o espejo para feedback de footwork','Objetivo: cada move perfecto, no velocidad'],
     how:[
       'Elegí grados cómodos, 2-3 números por debajo de tu máximo.',
       'Trabajá una habilidad concreta por sesión: talonar, empotrar, escalar en placa, movimientos de compresión.',
       'Repetí los movimientos que te salen mal hasta que salgan limpios.',
       'Descansá bien entre bloques: buscás aprender, no fatigarte.',
       'Sesión corta, de 45-60 minutos. En deload la calidad manda sobre la cantidad.'
     ],
     errors:[
       'Usar el día de técnica para meter intentos duros "ya que estoy".',
       'Practicar sólo lo que ya te sale bien — la técnica mejora donde estás flojo.',
       'Acumular volumen hasta bombearte, que anula el propósito del deload.',
       'No elegir ninguna habilidad concreta y escalar por escalar.'
     ]},
    {id:'del5',n:'Lectura de vías y visualización',cat:'technique',sys:'Skill development',col:'#00E5A0',fatigue:1,skill:2,minLevel:0,
     det:'Sin escalar al límite: elegí vías y "leelas" desde el piso (secuencia, presas, descansos), después escalalas confirmando tu plan. 20-30 min a intensidad baja. Descansa el cuerpo y entrena la cabeza.',
     nota:'20-30 min · leer + escalar suave confirmando',
     simple:'Antes de subir, imaginás toda la secuencia desde abajo; después la escalás tranquilo para ver si acertaste. Descansás el cuerpo pero seguís mejorando.',
     sci:'Horst (Maximum Climbing): la visualización activa las mismas rutas neuronales que el movimiento real. En semana de descarga da estímulo técnico/mental con carga física mínima.',
     tips:['Leé toda la vía antes de tocarla.','Anticipá dónde vas a descansar.','Intensidad baja: es descarga, no proyecto.'],
     how:[
       'Antes de escalar una vía o bloque, quedate abajo y leé la secuencia completa.',
       'Identificá cada presa, qué mano la toma y dónde van los pies.',
       'Marcá los puntos de descanso y dónde vas a tener que ir rápido.',
       'Visualizá el recorrido entero en primera persona, sintiendo los movimientos, antes de tocar la roca.',
       'Después de escalar, compará lo que pasó con lo que habías leído: ahí está el aprendizaje.'
     ],
     errors:[
       'Leer sólo los primeros movimientos y largar a ver qué pasa.',
       'Visualizar en tercera persona (verte de afuera) en vez de sentir los movimientos.',
       'Saltear la comparación posterior, que es donde realmente mejora la lectura.',
       'Tratarlo como un trámite: la lectura es una habilidad entrenable y ahorra energía real en la vía.'
     ]}
  ]
};
