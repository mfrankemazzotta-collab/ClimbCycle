/* Unit tests for recovery.js — the recovery engine (calcRecovery). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  /* Set the recovery inputs the engine reads. calcRecovery() calls loadRec()
     first, but localStorage is empty in the harness so our assignment stands. */
  function setRec(over){
    app.recData = Object.assign({
      sleep:7, sleepQ:3, sore:0, fat:0, rpe:0, dur:0, ts:0, hoursAgo:24, stype:'none'
    }, over || {});
  }

  describe('calcRecovery() — no session', function(){
    it('is fully fresh with good sleep and no soreness', function(){
      setRec({ rpe:0, stype:'none', dur:0, sleep:7, sleepQ:3, sore:0 });
      const r = app.calcRecovery();
      expect(r.score).toBe(100);
      expect(r.status).toBe('fresh');
      expect(r.load).toBe(0);
    });
    it('docks points for short sleep', function(){
      setRec({ rpe:0, stype:'none', dur:0, sleep:4, sleepQ:3, sore:0 });
      const r = app.calcRecovery();
      /* 100 - (7-4)*5 = 85 */
      expect(r.score).toBe(85);
    });
    it('docks points for soreness', function(){
      setRec({ rpe:0, stype:'none', dur:0, sleep:7, sleepQ:3, sore:2 });
      const r = app.calcRecovery();
      /* 100 - 12 = 88 */
      expect(r.score).toBe(88);
    });
  });

  describe('calcRecovery() — after a session', function(){
    it('a hard power session just finished leaves you fatigued', function(){
      setRec({ rpe:10, dur:120, stype:'power', hoursAgo:0, sleep:7, sleepQ:3, sore:0, fat:0 });
      const r = app.calcRecovery();
      expect(r.status).toBe('fatigued');
      expect(r.score).toBeLessThan(45);
      expect(r.hoursRemaining).toBeGreaterThan(0);
      expect(r.load).toBeGreaterThan(900);   /* 120*10*1.2 = 1440 */
    });

    it('the same session fully recovers once enough time has passed', function(){
      setRec({ rpe:10, dur:120, stype:'power', hoursAgo:72, sleep:7, sleepQ:3, sore:0, fat:0 });
      const r = app.calcRecovery();
      expect(r.status).toBe('fresh');
      expect(r.score).toBeGreaterThanOrEqual(72);
      expect(r.hoursRemaining).toBe(0);
    });

    it('power sessions need more recovery than easy ARC of equal duration', function(){
      setRec({ rpe:8, dur:120, stype:'power', hoursAgo:24 });
      const power = app.calcRecovery().score;
      setRec({ rpe:8, dur:120, stype:'recovery', hoursAgo:24 });
      const arc = app.calcRecovery().score;
      expect(arc).toBeGreaterThan(power);
    });

    it('recovery window shrinks as hoursAgo grows', function(){
      setRec({ rpe:8, dur:90, stype:'strength', hoursAgo:6 });
      const early = app.calcRecovery().hoursRemaining;
      setRec({ rpe:8, dur:90, stype:'strength', hoursAgo:30 });
      const late = app.calcRecovery().hoursRemaining;
      expect(late).toBeLessThan(early);
    });

    it('poor sleep lowers the score for an identical session', function(){
      setRec({ rpe:8, dur:90, stype:'strength', hoursAgo:36, sleep:8, sleepQ:4 });
      const rested = app.calcRecovery().score;
      setRec({ rpe:8, dur:90, stype:'strength', hoursAgo:36, sleep:4, sleepQ:1 });
      const tired = app.calcRecovery().score;
      expect(tired).toBeLessThan(rested);
    });

    it('clamps the score to the 0–100 range', function(){
      setRec({ rpe:10, dur:180, stype:'power', hoursAgo:0, sleep:3, sleepQ:1, sore:3, fat:3 });
      const r = app.calcRecovery();
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });

  describe('getRecoveryInterpretation()', function(){
    it('maps high scores to full-intensity guidance', function(){
      expect(app.getRecoveryInterpretation(90).txt).toBe('Listo para entrenar al máximo');
    });
    it('maps mid scores to moderate-intensity guidance', function(){
      expect(app.getRecoveryInterpretation(60).txt).toBe('Entrená a intensidad moderada');
    });
    it('maps low scores to a rest recommendation', function(){
      expect(app.getRecoveryInterpretation(20).txt).toBe('Fatiga alta — descansá hoy');
    });
  });
};
