/* Unit tests for ics.js — plan → iCalendar export (pure buildICS). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const key = (y,m,d) => new Date(y,m,d).toDateString();
  function fixture(){
    const plan = {};
    plan[key(2026,0,5)]  = { block:'strength',  week:4 };
    plan[key(2026,0,6)]  = { block:'rest',      week:4 };            /* skipped */
    plan[key(2026,0,7)]  = { block:'endurance', week:4 };
    plan[key(2026,0,9)]  = { block:'test',      week:4 };
    plan[key(2026,0,10)] = { block:'rest',      week:4, outdoor:true }; /* rock — kept */
    return plan;
  }

  describe('buildICS()', function(){
    it('wraps events in a VCALENDAR', function(){
      const ics = app.buildICS(fixture());
      expect(ics.indexOf('BEGIN:VCALENDAR') === 0).toBe(true);
      expect(ics.indexOf('END:VCALENDAR') > 0).toBe(true);
    });
    it('emits one VEVENT per session/test/rock day and skips plain rest', function(){
      const ics = app.buildICS(fixture());
      expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(4);
    });
    it('icsEventCount matches the number of exported events', function(){
      expect(app.icsEventCount(fixture())).toBe(4);
    });
    it('writes all-day DATE start/end with the local calendar date', function(){
      const ics = app.buildICS(fixture());
      expect(ics.indexOf('DTSTART;VALUE=DATE:20260105') >= 0).toBe(true);
      expect(ics.indexOf('DTEND;VALUE=DATE:20260106') >= 0).toBe(true);   /* end = next day */
    });
    it('labels the block and week in the summary', function(){
      const ics = app.buildICS(fixture());
      expect(ics.indexOf('SUMMARY:Fuerza') >= 0).toBe(true);
      expect(ics.indexOf('Semana 4') >= 0).toBe(true);
    });
    it('labels a rock outing distinctly', function(){
      const ics = app.buildICS(fixture());
      expect(ics.indexOf('SUMMARY:Escalada en roca') >= 0).toBe(true);
    });
    it('escapes RFC-5545 special characters in text', function(){
      const plan = {}; plan[key(2026,0,5)] = { block:'x', week:1 };
      const ics = app.buildICS(plan, { blocks:{ x:{label:'A,B;C\\D'} } });
      expect(ics.indexOf('SUMMARY:A\\,B\\;C\\\\D') >= 0).toBe(true);
    });
    it('uses the injected timestamp for DTSTAMP', function(){
      const ics = app.buildICS(fixture(), { now: new Date(Date.UTC(2026,0,1,0,0,0)) });
      expect(ics.indexOf('DTSTAMP:20260101T000000Z') >= 0).toBe(true);
    });
    it('uses CRLF line endings', function(){
      expect(app.buildICS(fixture()).indexOf('\r\n') >= 0).toBe(true);
    });
    it('is a valid empty calendar for an empty plan', function(){
      const ics = app.buildICS({});
      expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(0);
      expect(ics.indexOf('END:VCALENDAR') > 0).toBe(true);
    });
  });

  /* ── ALARMAS ──────────────────────────────────────────────────────
     El export existía desde hacía tiempo y no servía como recordatorio:
     eran eventos de día completo SIN VALARM, así que el plan aparecía en
     el calendario y no avisaba nada.

     Importa más de lo que parece. Las notificaciones propias de la app
     (`maybeNotifyToday`) se disparan al ABRIR la app — o sea, te recuerdan
     entrenar cuando ya la abriste. Hasta que exista Web Push con backend,
     la alarma del calendario es el único recordatorio real, y funciona
     igual en iOS y Android sin instalar nada. */
  describe('buildICS() — alarmas', function(){

    const key = (y,m,d) => new Date(y,m,d).toDateString();
    function unDia(){
      const p = {}; p[key(2026,7,10)] = { block:'strength', week:2 };
      return p;
    }

    it('cada sesión lleva su recordatorio', function(){
      const ics = app.buildICS(unDia(), { blocks:{ strength:{label:'Fuerza'} } });
      expect((ics.match(/BEGIN:VALARM/g) || []).length).toBe(1);
      expect(ics.indexOf('ACTION:DISPLAY') > -1).toBe(true);
      /* el texto de la alarma dice QUÉ toca, no "recordatorio" a secas */
      expect(ics.indexOf('DESCRIPTION:Fuerza') > -1).toBe(true);
    });

    it('la hora sigue a cuándo entrena el usuario (PURA)', function(){
      /* Avisar a medianoche —el default si no se pone hora— sería inútil. */
      expect(app.icsAlarmTrigger('morning')).toBe('PT7H');
      expect(app.icsAlarmTrigger('afternoon')).toBe('PT14H');
      expect(app.icsAlarmTrigger('evening')).toBe('PT18H');
    });

    it('un trainTime desconocido no rompe el archivo', function(){
      /* Un .ics mal formado no se importa: el usuario perdería el plan
         entero por un campo raro. */
      expect(app.icsAlarmTrigger(undefined)).toBe('PT18H');
      expect(app.icsAlarmTrigger('cualquier-cosa')).toBe('PT18H');
      const ics = app.buildICS(unDia(), { trainTime:'raro' });
      expect(/TRIGGER;RELATED=START:PT\d+H/.test(ics)).toBe(true);
    });

    it('el trigger es relativo al inicio y con formato RFC 5545', function(){
      const ics = app.buildICS(unDia(), { trainTime:'morning' });
      expect(ics.indexOf('TRIGGER;RELATED=START:PT7H') > -1).toBe(true);
    });

    it('la alarma va DENTRO del VEVENT, no suelta', function(){
      /* Un VALARM fuera de su evento invalida el calendario completo. */
      const ics = app.buildICS(unDia());
      const iEv = ics.indexOf('BEGIN:VEVENT');
      const iAl = ics.indexOf('BEGIN:VALARM');
      const iFinAl = ics.indexOf('END:VALARM');
      const iFinEv = ics.indexOf('END:VEVENT');
      expect(iEv < iAl && iAl < iFinAl && iFinAl < iFinEv).toBe(true);
    });

    it('se pueden desactivar sin tocar el resto', function(){
      const ics = app.buildICS(unDia(), { alarms:false });
      expect(ics.indexOf('VALARM')).toBe(-1);
      expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(1);
    });

    it('los días de descanso siguen sin exportarse (ni evento ni alarma)', function(){
      const p = {};
      p[key(2026,7,10)] = { block:'strength' };
      p[key(2026,7,11)] = { block:'rest' };
      const ics = app.buildICS(p);
      expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(1);
      expect((ics.match(/BEGIN:VALARM/g) || []).length).toBe(1);
    });
  });
};
