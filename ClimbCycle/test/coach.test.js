/* Unit tests for coach.js — the pure parts: share-code helpers and the
   read-only athlete view-model. Network functions aren't exercised here. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('share code helpers', function(){
    it('formats a token into grouped uppercase (no trailing dash)', function(){
      expect(app.coachFormatCode('a1b2c3d4')).toBe('A1B2-C3D4');
    });
    it('round-trips: parse(format(token)) === token', function(){
      const tok = '0123456789abcdef01234567';
      expect(app.coachParseCode(app.coachFormatCode(tok))).toBe(tok);
    });
    it('parse strips spaces/dashes and lowercases', function(){
      expect(app.coachParseCode(' A1B2-C3 D4 ')).toBe('a1b2c3d4');
    });
    it('coachNewToken is 24 lowercase-hex chars', function(){
      const t = app.coachNewToken();
      expect(t.length).toBe(24);
      expect(/^[0-9a-f]+$/.test(t)).toBe(true);
    });
  });

  describe('buildCoachView()', function(){
    function bundle(){
      const now = Date.now(), DAY = 86400000;
      return { data: {
        cc_user: JSON.stringify({ name:'Ana', level:'advanced', goal:'sport', grade:'7a', targetGrade:'7c' }),
        cc_logs: JSON.stringify([
          { ts: now - 1*DAY,  rpe:8, dur:90, block:'strength' },
          { ts: now - 3*DAY,  rpe:7, dur:60, block:'endurance' },
          { ts: now - 20*DAY, rpe:8, dur:90, block:'power' }
        ]),
        cc_tests: JSON.stringify({ hang_max:[{v:75,ts:now-40*DAY},{v:82,ts:now}], pullup_3rm:[{v:90,ts:now}] }),
        cc_projects: JSON.stringify([{status:'trying'},{status:'sent'},{status:'shelved'}])
      }};
    }
    it('summarizes profile fields', function(){
      const v = app.buildCoachView(bundle());
      expect(v.name).toBe('Ana');
      expect(v.level).toBe('advanced');
      expect(v.grade).toBe('7a');
      expect(v.targetGrade).toBe('7c');
    });
    it('counts sessions in the 7- and 30-day windows', function(){
      const v = app.buildCoachView(bundle());
      expect(v.sessions7).toBe(2);
      expect(v.sessions30).toBe(3);
      expect(v.totalLogged).toBe(3);
    });
    it('takes the latest value per test', function(){
      const v = app.buildCoachView(bundle());
      expect(v.tests.hang_max).toBe(82);
      expect(v.tests.pullup_3rm).toBe(90);
    });
    it('counts projects by status (shelved is neither active nor sent)', function(){
      const v = app.buildCoachView(bundle());
      expect(v.projects.total).toBe(3);
      expect(v.projects.sent).toBe(1);
      expect(v.projects.active).toBe(1);
    });
    it('is safe on an empty bundle', function(){
      const v = app.buildCoachView({});
      expect(v.sessions7).toBe(0);
      expect(v.projects.total).toBe(0);
      expect(v.name).toBe('');
    });
  });
};
