/* rockCandidates() — la ventana de roca surfaceada en la vista Semana.

   El planner RESERVA automáticamente los días de `U.rockDays` (los marca
   `plannedRock`), pero esa reserva es tentativa: nadie sabía si el usuario
   había salido de verdad. Como nadie preguntaba, la salida más dura de la
   semana nunca llegaba al historial de carga y el ACWR quedaba ciego.

   Estos tests fijan los tres estados y, sobre todo, qué NO se ofrece. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  /* Semana de lunes a domingo; todo descanso salvo lo que se sobreescriba. */
  function semana(over){
    const base = new Date(2026, 0, 5);   /* lunes 5-ene-2026 */
    const out = [];
    for(let i = 0; i < 7; i++){
      const d = new Date(base); d.setDate(d.getDate() + i);
      out.push(Object.assign({
        date: d.toDateString(), dow: d.getDay(),
        outdoor:false, plannedRock:false, block:'rest',
        isPast:false, isToday:false
      }, (over && over[i]) || {}));
    }
    return out;
  }
  const FINDE = [6, 0];   /* sábado y domingo */
  const SAB = 5, DOM = 6; /* índices dentro de la semana */

  describe('rockCandidates() — reservas que ya llegaron', function(){

    it('pregunta por un finde reservado que ya pasó', function(){
      const c = app.rockCandidates(
        semana({ [SAB]:{ plannedRock:true, outdoor:true, isPast:true },
                 [DOM]:{ plannedRock:true, outdoor:true, isPast:true } }), FINDE);
      expect(c.length).toBe(2);
      expect(c.every(x => x.kind === 'confirm')).toBe(true);
    });

    it('pregunta por una reserva de HOY', function(){
      /* el domingo sigue libre → genera además un candidato 'mark';
         acá interesa sólo el sábado */
      const c = app.rockCandidates(
        semana({ [SAB]:{ plannedRock:true, outdoor:true, isToday:true } }), FINDE);
      const conf = c.filter(x => x.kind === 'confirm');
      expect(conf.length).toBe(1);
      expect(conf[0].dow).toBe(6);
    });

    it('NO pregunta por una reserva futura: todavía no tiene respuesta', function(){
      const c = app.rockCandidates(
        semana({ [SAB]:{ plannedRock:true, outdoor:true } }), FINDE);
      expect(c.filter(x => x.kind === 'confirm').length).toBe(0);
    });

    it('no vuelve a preguntar por una salida ya confirmada', function(){
      /* outdoor sin plannedRock = el usuario ya dijo que salió */
      const c = app.rockCandidates(
        semana({ [SAB]:{ outdoor:true, isPast:true } }), FINDE);
      expect(c.filter(x => x.date === semana()[SAB].date).length).toBe(0);
    });
  });

  describe('rockCandidates() — días libres para agendar', function(){

    it('ofrece agendar un día de la ventana que el plan no reservó', function(){
      const c = app.rockCandidates(semana(), FINDE);
      expect(c.length).toBe(2);
      expect(c.every(x => x.kind === 'mark')).toBe(true);
    });

    it('no ofrece nada si el usuario no declaró ventana de roca', function(){
      expect(app.rockCandidates(semana(), []).length).toBe(0);
      expect(app.rockCandidates(semana(), null).length).toBe(0);
    });

    it('NO ofrece agendar días pasados: el ripple sólo va hacia adelante', function(){
      const c = app.rockCandidates(
        semana({ [SAB]:{ isPast:true }, [DOM]:{ isPast:true } }), FINDE);
      expect(c.length).toBe(0);
    });

    it('ignora los días fuera de la ventana aunque estén libres', function(){
      const c = app.rockCandidates(semana(), [3]);   /* sólo miércoles */
      expect(c.length).toBe(1);
      expect(c[0].dow).toBe(3);
    });
  });

  describe('rockCandidates() — aviso de sesión ocupada', function(){

    it('marca busy cuando ese día ya tiene sesión de gym', function(){
      const c = app.rockCandidates(semana({ [SAB]:{ block:'strength' } }), FINDE);
      expect(c.find(x => x.dow === 6).busy).toBe(true);
    });

    it('no marca busy en un día de descanso', function(){
      expect(app.rockCandidates(semana(), FINDE)[0].busy).toBe(false);
    });

    it('un día de test no cuenta como sesión ocupada', function(){
      /* el test es una evaluación, no una sesión que se pierda al salir */
      const c = app.rockCandidates(semana({ [SAB]:{ block:'test' } }), FINDE);
      expect(c.find(x => x.dow === 6).busy).toBe(false);
    });
  });

  describe('rockCandidates() — robustez', function(){
    it('tolera entradas vacías sin romper', function(){
      expect(app.rockCandidates([], FINDE).length).toBe(0);
      expect(app.rockCandidates(null, FINDE).length).toBe(0);
    });

    it('devuelve la fecha tal cual, para poder marcarla después', function(){
      const dias = semana();
      expect(app.rockCandidates(dias, FINDE)[0].date).toBe(dias[SAB].date);
    });
  });
};
