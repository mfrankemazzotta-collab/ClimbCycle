/* ====================================================
   cobertura-critica.test.js -- lo que la suite NO estaba mirando

   (X) DE DÓNDE SALEN ESTOS CASOS.

   Auditoría por MUTACIÓN: se rompe una cosa a propósito en el código y se
   mira si la suite lo nota. Si no lo nota, esa parte no está cubierta —
   por más tests verdes que haya alrededor.

   Se probaron 14 mutaciones sobre lo crítico. La suite detectó 9 y se le
   escaparon 5:

     1. la ventana AGUDA del ACWR (7 días → 6): sin detectar
     2. la ventana CRÓNICA del ACWR (28 días → 21): sin detectar
     3. el filtro de NIVEL (dejar pasar ejercicios 2 tiers por encima)
     4. la exclusión de warmups para intermedios en adelante
     5. la rotación semanal de ejercicios (desactivarla del todo)

   El nº 3 es el grave: sin ese filtro, un PRINCIPIANTE recibe campus board
   y min-edge hangs. La app tiene un criterio explícito de seguridad —nada
   de trabajo explosivo ni regletas mínimas sin años de base— y no había
   una sola aserción que lo protegiera. Los otros cuatro son parámetros que
   alguien podría "ajustar" en un refactor sin que nada avise.

   Los umbrales del ACWR vienen de Gabbett (2016): agudo 7 días, crónico 28.
==================================================== */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  const DIA = 86400000;

  function logsEnDias(dias){
    const ahora = Date.now();
    return dias.map(function(d, i){
      return { ts: ahora - d * DIA, dateStr: 'd' + d + '_' + i, block:'strength', rpe:7, dur:90 };
    });
  }

  describe('(X) las ventanas del ACWR son las de la literatura', function(){

    it('la ventana AGUDA es de 7 días, ni uno más ni uno menos', function(){
      /* Una sesión de hace 7 días cuenta como aguda; una de hace 8, ya no. Si
         alguien mueve el límite, el ratio cambia y la alerta de pico se corre
         — sin que nada avise.

         Los 0.1 días de margen NO son cosmética: la primera versión usaba 7 y
         8 exactos y fallaba una vez cada ~12 corridas. `computeACWR` compara
         contra su propio `Date.now()`, unos milisegundos posterior al que usa
         el test para fabricar el log, así que "hace exactamente 7 días" cae
         del lado de afuera por unos milisegundos. Un test que falla al azar
         se termina ignorando, y ahí se pierde la cobertura entera. */
      app.saveSLogs(logsEnDias([6.9]));
      const dentro = app.computeACWR().acute;
      app.saveSLogs(logsEnDias([7.1]));
      const fuera = app.computeACWR().acute;
      expect(dentro).toBeGreaterThan(0);
      expect(fuera).toBe(0);
    });

    it('la ventana CRÓNICA es de 28 días', function(){
      app.saveSLogs(logsEnDias([27.9]));
      const dentro = app.computeACWR().sessions;
      app.saveSLogs(logsEnDias([28.1]));
      const fuera = app.computeACWR().sessions;
      expect(dentro).toBe(1);
      expect(fuera).toBe(0);
    });

    it('lo agudo también cuenta como crónico (una ventana dentro de la otra)', function(){
      /* El ACWR compara los últimos 7 días contra el promedio de 28, y esos
         7 están INCLUIDOS en los 28. Si alguien los separara, el ratio de un
         atleta constante dejaría de dar ~1. */
      app.saveSLogs(logsEnDias([3]));
      const a = app.computeACWR();
      expect(a.acute).toBeGreaterThan(0);
      expect(a.sessions).toBe(1);
    });

    it('entrenar parejo cuatro semanas da un ratio cercano a 1', function(){
      /* Verificación de sentido del modelo entero: mismo trabajo todas las
         semanas ⇒ agudo ≈ promedio semanal. */
      const dias = [];
      for(let d = 27; d >= 1; d -= 2) dias.push(d);
      app.saveSLogs(logsEnDias(dias));
      const r = app.computeACWR().ratio;
      expect(r).toBeGreaterThan(0.7);
      expect(r).toBeLessThan(1.4);
      app.saveSLogs([]);
    });
  });

  describe('(X) el filtro de nivel protege a los principiantes', function(){

    function conNivel(level, fn){
      const antesU = app.U, antesPlan = app.planMap;
      try {
        app.U = Object.assign({}, antesU, {
          goal:'boulder', level:level, plan:'4-3-2-1', days:4, weight:70, age:30, session:90,
          gymDays:[1,3,5,6], rockDays:[], rockWeekend:'never', trainTime:'evening',
          grade:'6a', targetGrade:'6c', startDate:new Date(2026, 7, 3),
          gear: app.gearDefault ? app.gearDefault() : undefined
        });
        app.planMap = {};
        app.generatePlan();
        return fn();
      } finally { app.U = antesU; app.planMap = antesPlan; }
    }

    function ejerciciosDelPlan(){
      const out = [];
      Object.keys(app.planMap).filter(k => app.planMap[k].block !== 'rest').forEach(function(k){
        app.getExercisesForDay(k, app.planMap[k].block).forEach(function(e){ out.push(e); });
      });
      return out;
    }

    it('un PRINCIPIANTE nunca recibe campus board ni regletas mínimas', function(){
      /* Éste es el test que faltaba y el que más importa. La app excluye el
         trabajo explosivo y las regletas mínimas para quien no tiene años de
         base — es criterio de seguridad, no de dificultad: ahí es donde se
         rompen las poleas. Sin esta aserción, subir el tier por error deja
         a un principiante con "Campus bumps 1-4-7" y nada avisa. */
      conNivel('beginner', function(){
        const peligrosos = ejerciciosDelPlan().filter(function(e){
          return e.cat === 'campus_board' || /min-edge|one-arm|density/i.test(e.n);
        });
        if(peligrosos.length) throw new Error('a un principiante se le propuso: '
          + peligrosos.map(e => e.id + ' ("' + e.n + '")').join(', '));
      });
    });

    it('ningún ejercicio supera el nivel del usuario', function(){
      ['beginner','intermediate','advanced'].forEach(function(nivel){
        conNivel(nivel, function(){
          const tier = app.getLevelTier();
          const altos = ejerciciosDelPlan().filter(e => (e.minLevel || 0) > tier);
          if(altos.length) throw new Error(nivel + ' recibió ejercicios por encima de su nivel: '
            + altos.map(e => e.id + ' (minLevel ' + e.minLevel + ' > tier ' + tier + ')').join(', '));
        });
      });
    });

    it('a partir de intermedio no se programan warmups como sesión', function(){
      /* Los warmups del pool son para el bloque de calentamiento, no para
         ocupar un hueco de la sesión principal. Sin el filtro, un intermedio
         recibía "activación de dedos" como si fuera su entrenamiento. */
      conNivel('intermediate', function(){
        const wu = ejerciciosDelPlan().filter(e => e.phase === 'warmup');
        if(wu.length) throw new Error('warmups programados como sesión: '
          + wu.map(e => e.id).join(', '));
      });
    });

    it('nunca más de DOS sesiones de campus por semana', function(){
      /* Regla de seguridad, no de dosificación: el campus board produce el
         pico de fuerza más alto sobre la polea A2 de todo el entrenamiento, y
         la recomendación publicada es un máximo de 2 sesiones semanales con
         48-72 h entre ellas.

         La app cumplía ese límite POR CASUALIDAD —la categoría competía de
         igual a igual con las demás y decidía la semilla—, así que bastaba
         agregar ejercicios al pool para que empezara a incumplirlo sin que
         nada avisara. Ahora hay un tope explícito y este test lo custodia. */
      ['advanced','elite'].forEach(function(nivel){
        conNivel(nivel, function(){
          const porSemana = {};
          Object.keys(app.planMap).forEach(function(k){
            const p = app.planMap[k];
            if(!p || p.block === 'rest' || !p.week) return;
            const hay = app.getExercisesForDay(k, p.block)
              .some(function(e){ return e.cat === 'campus_board'; });
            if(hay) porSemana[p.week] = (porSemana[p.week] || 0) + 1;
          });
          const pasadas = Object.keys(porSemana).filter(w => porSemana[w] > 2);
          if(pasadas.length) throw new Error(nivel + ': semanas con más de 2 sesiones de campus → '
            + pasadas.map(w => 's' + w + ': ' + porSemana[w]).join(', '));
        });
      });
    });

    it('quien está para el campus lo recibe alguna vez en el ciclo', function(){
      /* La otra cara del tope. Medido antes de ponerlo: un AVANZADO con tabla
         pasaba un ciclo entero de 10 semanas con CERO campus, porque la
         composición lista `['campus_board','power']` como preferencia y el
         código la leía como un conjunto plano. El criterio estaba en el
         comentario, no en el código. */
      conNivel('advanced', function(){
        let campus = 0;
        Object.keys(app.planMap).forEach(function(k){
          const p = app.planMap[k];
          if(!p || p.block === 'rest') return;
          app.getExercisesForDay(k, p.block).forEach(function(e){
            if(e.cat === 'campus_board' && !e._sustituye) campus++;
          });
        });
        expect(campus).toBeGreaterThan(0);
      });
    });

    it('un principiante SÍ recibe los suyos (el filtro no lo deja sin plan)', function(){
      /* El error opuesto: filtrar de más y dejarlo con días vacíos. */
      conNivel('beginner', function(){
        const ex = ejerciciosDelPlan();
        expect(ex.length).toBeGreaterThan(10);
        const dias = Object.keys(app.planMap).filter(k => app.planMap[k].block !== 'rest');
        dias.forEach(function(k){
          const n = app.getExercisesForDay(k, app.planMap[k].block).length;
          if(n < 2) throw new Error('día con ' + n + ' ejercicios para un principiante: ' + k);
        });
      });
    });
  });

  describe('(X) la rotación de ejercicios existe de verdad', function(){

    /* Prepara un plan y devuelve los ejercicios por día. */
    function conPlan(fn, nivel){
      const antesU = app.U, antesPlan = app.planMap;
      try {
        app.U = Object.assign({}, antesU, {
          goal:'sport', level:nivel || 'intermediate', plan:'4-3-2-1', days:4, weight:70, age:30, session:90,
          gymDays:[1,3,5,6], rockDays:[], rockWeekend:'never', trainTime:'evening',
          grade:'6c', targetGrade:'7a', startDate:new Date(2026, 7, 3),
          gear: app.gearDefault ? app.gearDefault() : undefined
        });
        app.planMap = {};
        app.generatePlan();
        return fn();
      } finally { app.U = antesU; app.planMap = antesPlan; }
    }

    it('dos sesiones del mismo bloque en la misma semana nunca son idénticas', function(){
      /* ESTE TEST ENCONTRÓ UN BUG REAL.

         Un intermedio en fase de potencia recibía los MISMOS TRES ejercicios
         los tres días de la semana, semana tras semana. Causa: sólo 5 de los
         13 ejercicios de potencia pasan el filtro de nivel (el resto pide
         tier 2+, que es criterio de seguridad), y `pull_strength` aparecía
         únicamente en el slot 4 de la composición — al que un intermedio no
         llega nunca, porque su `exPerSession` es 3. Dos de los cinco eran
         inalcanzables y los otros tres se repetían en bucle.

         El plan seguía siendo "válido": bloques correctos, nivel correcto,
         volumen correcto. Ningún test se quejaba. Simplemente era el mismo
         día tres veces. */
      ['beginner','intermediate','advanced','elite'].forEach(function(nivel){
        conPlan(function(){
          const porSemana = {};
          Object.keys(app.planMap).forEach(function(k){
            const p = app.planMap[k];
            if(!p || p.block === 'rest' || !p.week) return;
            const ids = app.getExercisesForDay(k, p.block).map(e => e.id).sort().join(',');
            const key = p.week + '|' + p.block + '|' + ids;
            (porSemana[key] = porSemana[key] || []).push(k);
          });
          const repetidos = Object.keys(porSemana).filter(k => porSemana[k].length > 1);
          if(repetidos.length) throw new Error(nivel + ': sesiones calcadas dentro de la semana → '
            + repetidos.map(k => k + '  (' + porSemana[k].join(' = ') + ')').join(' | '));
        }, nivel);
      });
    });

    it('ningún ejercicio disponible para el nivel queda inalcanzable', function(){
      /* La otra cara del mismo bug: no alcanza con que los días se vean
         distintos, hace falta que el ciclo entero llegue a TODO lo que el
         usuario puede hacer. Si una categoría vive sólo en un slot al que su
         nivel no llega, esos ejercicios no existen para él — y nada avisa,
         porque el plan que sí recibe es correcto.

         Se compara contra el pool filtrado por nivel (mismo criterio que
         `selectExercises`), con equipamiento completo para que el filtro de
         material no reste nada. */
      ['beginner','intermediate','advanced','elite'].forEach(function(nivel){
        conPlan(function(){
          const tier = app.getLevelTier();
          const usados = {}, huecos = {};
          Object.keys(app.planMap).forEach(function(k){
            const p = app.planMap[k];
            if(!p || p.block === 'rest') return;
            usados[p.block] = usados[p.block] || {};
            const ex = app.getExercisesForDay(k, p.block);
            huecos[p.block] = (huecos[p.block] || 0) + ex.length;
            ex.forEach(function(e){ usados[p.block][e.id] = 1; });
          });
          const faltan = [];
          Object.keys(usados).forEach(function(block){
            const pool = (app.EX_POOL[block] || []).filter(function(e){
              if((e.minLevel || 0) > tier) return false;
              if(tier >= 1 && e.phase === 'warmup') return false;
              if(e.maxLevel != null && tier > e.maxLevel) return false;
              return true;
            });
            /* Si el ciclo tiene menos huecos de ese bloque que ejercicios
               disponibles, que sobre alguno es aritmética, no un defecto
               (un principiante hace 2 días de descarga × 2 ejercicios = 4
               huecos para 5 ejercicios de movilidad y técnica). */
            if(huecos[block] < pool.length) return;
            pool.forEach(function(e){
              if(!usados[block][e.id]) faltan.push(nivel + ' ' + block + '/' + e.id);
            });
          });
          if(faltan.length) throw new Error('disponibles para el nivel pero nunca programados: '
            + faltan.join(', '));
        }, nivel);
      });
    });

    it('dos semanas seguidas no proponen exactamente lo mismo', function(){
      /* La rotación es lo que hace que la semana 2 se sienta distinta de la
         1. Desactivarla del todo no rompía ningún test: el plan seguía
         siendo válido, sólo que repetitivo — el tipo de degradación que
         nadie reporta como bug pero hace abandonar la app. */
      const antesU = app.U, antesPlan = app.planMap;
      try {
        app.U = Object.assign({}, antesU, {
          goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4, weight:70, age:30, session:90,
          gymDays:[1,3,5,6], rockDays:[], rockWeekend:'never', trainTime:'evening',
          grade:'6c', targetGrade:'7a', startDate:new Date(2026, 7, 3),
          gear: app.gearDefault ? app.gearDefault() : undefined
        });
        app.planMap = {};
        app.generatePlan();

        /* Se comparan los mismos días de semanas consecutivas dentro de la
           MISMA fase (si cambia la fase, cambiar de ejercicios es trivial). */
        const porSemana = {};
        Object.keys(app.planMap).forEach(function(k){
          const p = app.planMap[k];
          if(!p || p.block === 'rest' || !p.week) return;
          const ids = app.getExercisesForDay(k, p.block).map(e => e.id).sort().join(',');
          (porSemana[p.week] = porSemana[p.week] || []).push({ block:p.block, ids:ids });
        });

        let comparadas = 0, distintas = 0;
        Object.keys(porSemana).forEach(function(w){
          const sig = porSemana[Number(w) + 1];
          if(!sig) return;
          porSemana[w].forEach(function(a, i){
            const b = sig[i];
            if(!b || b.block !== a.block) return;
            comparadas++;
            if(a.ids !== b.ids) distintas++;
          });
        });
        expect(comparadas).toBeGreaterThan(3);
        /* No se exige que TODO cambie —el pool de algunas categorías es
           chico— pero sí que la rotación se note. */
        expect(distintas).toBeGreaterThan(0);
      } finally { app.U = antesU; app.planMap = antesPlan; }
    });
  });
};
