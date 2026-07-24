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
};
