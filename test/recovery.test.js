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

  /* ── ACWR (acute:chronic workload ratio) ──────────────────────────
     Seeds the session history (cc_logs) the engine reads. */
  function seedLogs(sessions){
    const now = Date.now(), DAY = 86400000;
    app.saveSLogs(sessions.map(function(s){
      return { ts: now - s.daysAgo*DAY, dateStr:'', block: s.block||'strength', rpe: s.rpe, dur: s.dur };
    }));
  }
  function clearLogs(){ app.saveSLogs([]); }

  const SPIKE = [
    {daysAgo:1,rpe:9,dur:120,block:'power'}, {daysAgo:2,rpe:9,dur:120,block:'power'},
    {daysAgo:3,rpe:9,dur:120,block:'power'}, {daysAgo:4,rpe:9,dur:120,block:'power'},
    {daysAgo:5,rpe:9,dur:120,block:'power'},
    {daysAgo:12,rpe:6,dur:60,block:'endurance'}, {daysAgo:19,rpe:6,dur:60,block:'endurance'},
    {daysAgo:26,rpe:6,dur:60,block:'endurance'}
  ];

  describe('computeACWR()', function(){
    it('is not ready without enough history (ratio null)', function(){
      clearLogs();
      seedLogs([ {daysAgo:1,rpe:8,dur:90}, {daysAgo:3,rpe:8,dur:90} ]);  /* 2 sessions, all <7d */
      const a = app.computeACWR();
      expect(a.ready).toBe(false);
      expect(a.ratio).toBe(null);
      clearLogs();
    });
    it('reports a balanced ratio for steady load', function(){
      clearLogs();
      const s = [];
      for(let d=1; d<=27; d+=2) s.push({daysAgo:d, rpe:8, dur:90, block:'strength'});  /* ~14 even sessions */
      seedLogs(s);
      const a = app.computeACWR();
      expect(a.ready).toBe(true);
      expect(a.ratio).toBeGreaterThan(0.7);
      expect(a.ratio).toBeLessThan(1.4);
      clearLogs();
    });
    it('flags a spike (ratio > 1.5) when recent load jumps', function(){
      clearLogs();
      seedLogs(SPIKE);
      const a = app.computeACWR();
      expect(a.ready).toBe(true);
      expect(a.ratio).toBeGreaterThan(1.5);
      clearLogs();
    });
  });

  describe('acwrAssessment()', function(){
    it('none / no penalty when ratio is null', function(){
      const x = app.acwrAssessment({ ratio:null });
      expect(x.level).toBe('none');
      expect(x.penalty).toBe(0);
    });
    it('a high spike costs 20 readiness points', function(){
      const x = app.acwrAssessment({ ratio:2.0, chronic:100 });
      expect(x.level).toBe('high');
      expect(x.penalty).toBe(20);
    });
    it('elevated load costs 10', function(){
      const x = app.acwrAssessment({ ratio:1.4, chronic:100 });
      expect(x.level).toBe('caution');
      expect(x.penalty).toBe(10);
    });
    it('the sweet spot is free', function(){
      const x = app.acwrAssessment({ ratio:1.0, chronic:100 });
      expect(x.level).toBe('optimal');
      expect(x.penalty).toBe(0);
    });
    it('low load is informational, not penalised', function(){
      const x = app.acwrAssessment({ ratio:0.5, chronic:100 });
      expect(x.level).toBe('detrain');
      expect(x.penalty).toBe(0);
    });
  });

  describe('calcRecovery() — ACWR integration', function(){
    it('is a no-op without history (score unchanged, acwr null)', function(){
      clearLogs();
      setRec({ rpe:0, stype:'none', dur:0, sleep:7, sleepQ:3, sore:0 });
      const r = app.calcRecovery();
      expect(r.score).toBe(100);
      expect(r.acwr.ratio).toBe(null);
    });
    it('docks 20 points and flags high when load is spiking', function(){
      clearLogs();
      seedLogs(SPIKE);
      setRec({ rpe:0, stype:'none', dur:0, sleep:7, sleepQ:3, sore:0 });  /* no check-in session */
      const r = app.calcRecovery();
      expect(r.acwr.level).toBe('high');
      expect(r.score).toBe(80);   /* 100 − 20 ACWR penalty */
      clearLogs();
    });
  });
};
