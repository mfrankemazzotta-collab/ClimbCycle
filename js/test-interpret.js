/* ======================================================
   test-interpret.js -- Interpretación de resultados de test (LÓGICA PURA)
   ClimbCycle

   Extraído de data/test-defs.js: TESTS[] vuelve a ser datos puros y estas
   funciones quedan aisladas y testeables. runInterpret() (tests.js) es la
   fachada que las invoca con el nivel/peso del usuario.
   Cada intérprete: (value, level, weight) -> {txt,col,icon,adj} | null.
====================================================== */

var TEST_INTERPRETERS = {
  hang_max: function(v,level,weight){
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
    },
  pullup_3rm: function(v,level,weight){
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
    },
  cf_minutes: function(v,level,weight){
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
    },
  repeater_6rep: function(v,level,weight){
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
    },
  /* POWER SLAP  -  el test de potencia (Draper et al. 2011; batería IRCRA 2021).

     POR QUÉ ESTE INTÉRPRETE NO SE PARECE A LOS OTROS. Los demás comparan
     contra rangos por nivel (principiante/intermedio/avanzado). Para el
     powerslap NO existen esos rangos publicados: la validación reporta
     fiabilidad (ICC 0.95-0.98) y correlación con el grado (r = 0.69-0.73),
     pero no normas por nivel accesibles. Inventarlas para que la pantalla
     se vea completa sería exactamente el error que ya cometimos una vez con
     los RPE "puestos a ojo".

     Así que se usa el ÚNICO ancla numérica publicada que hay -- media 93 cm
     (DE 19; rango 61-118) en escaladores jóvenes avanzados, Vasile &
     Stanescu 2023 -- y se dice de dónde sale. Con un ICC de 0.95-0.98 el
     test es tan repetible que la comparación que de verdad sirve es contra
     TU marca anterior, no contra una tabla. El texto lo dice.

     Ojo con la envergadura: el alcance en cm depende de cuán largo seas, y
     el brazo es el 2º factor antropométrico más predictivo del rendimiento
     (Vasile & Stanescu 2023). Comparar tu número con el de otra persona
     mide en parte su altura; compararlo con el tuyo de hace 6 semanas, no. */
  power_slap: function(v,level,weight){
      var cm=parseFloat(v);if(isNaN(cm)||cm<=0)return null;
      var REF='Referencia: media 93 cm en jóvenes avanzados (Vasile & Stanescu 2023). Como el alcance depende de tu envergadura, lo que más te sirve es comparar contra tu propia marca.';
      if(level==='beginner'){
        return {txt:'Primera marca registrada. En potencia el valor absoluto importa poco al empezar: lo que cuenta es que este número suba en los próximos ciclos, midiendo siempre con las mismas presas y la misma altura de inicio.',
                col:'#7070AA',icon:'&#x1F4CA;',adj:0};
      }
      if(cm<75)  return {txt:'Alcance por debajo de la referencia. Si escalás boulder o competís, la potencia es candidata a ser tu limitante: el trabajo explosivo desde presas grandes y los bloques dinámicos al límite son el estímulo. '+REF,
                         col:'#FF4D6A',icon:'&#x26A0;',adj:-15};
      if(cm<93)  return {txt:'Alcance en la mitad inferior de la referencia. Hay margen claro de mejora con trabajo específico de potencia. '+REF,
                         col:'#FFB800',icon:'&#x26A0;',adj:-5};
      if(cm<112) return {txt:'Alcance por encima de la media de referencia. Tu potencia de tren superior acompaña; el limitante probablemente esté en dedos o resistencia. '+REF,
                         col:'#00C8FF',icon:'&#x2705;',adj:0};
      return         {txt:'Alcance alto. La potencia no parece ser tu limitante  -  revisá fuerza de dedos y resistencia antes de meter más trabajo explosivo. '+REF,
                      col:'#CCFF00',icon:'&#x26A1;',adj:8};
    },
  max_grade: function(v,level,weight){
      if(!v||v.trim()==='')return null;
      var gradeMap={'4':1,'4+':2,'5':3,'5+':4,'6a':5,'6a+':6,'6b':7,'6b+':8,'6c':9,'6c+':10,'7a':11,'7a+':12,'7b':13,'7b+':14,'7c':15,'7c+':16,'8a':17,'8a+':18,'8b':19,'8b+':20,'8c':21,'9a':22};
      var tier=gradeMap[v.toLowerCase().replace(' ','')]||0;
      var expected={beginner:[1,6],intermediate:[6,10],advanced:[11,16],elite:[17,22]};
      var range=expected[level]||expected['intermediate'];
      if(tier<range[0])  return {txt:'Tu grado máximo esta por debajo del rango tipico de '+level+'. La técnica y la confianza pueden estar limitando más que la fuerza física.',col:'#FFB800',icon:'&#x26A0;',adj:-10};
      if(tier<=range[1]) return {txt:'Tu grado redpoint esta dentro del rango esperado para tu nivel. El plan esta bien calibrado.',                                     col:'#00E5A0',icon:'&#x2705;', adj:0};
      return                 {txt:'Tu grado máximo supera el rango tipico de tu nivel. Considera actualizar tu nivel en el perfil.',                                    col:'#CCFF00',icon:'&#x26A1;',adj:10};
    }
};

/* Dispatch by result_key. Returns null for unknown/undefined tests. */
function interpretTest(test, value, level, weight){
  if(!test) return null;
  var fn = TEST_INTERPRETERS[test.result_key];
  return fn ? fn(value, level, weight) : null;
}
