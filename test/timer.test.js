/* Unit tests for timer.js — the pure interval engine (buildTimerPlan/fmtMMSS). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('buildTimerPlan()', function(){
    it('image case: 1 set × 6 reps, 10s work, 125s rest → 11:25 total, 11 phases', function(){
      const p = app.buildTimerPlan({ sets:1, reps:6, work:10, restRep:125, restSet:0 });
      expect(p.total).toBe(685);          /* 6×10 + 5×125 */
      expect(p.phases.length).toBe(11);   /* 6 work + 5 rest-between-reps */
    });
    it('max-hangs: 6 sets × 1 rep, 10s, 120s between sets → 660 total, 11 phases', function(){
      const p = app.buildTimerPlan({ sets:6, reps:1, work:10, restRep:0, restSet:120 });
      expect(p.total).toBe(660);
      expect(p.phases.length).toBe(11);   /* 6 work + 5 rest-between-sets */
    });
    it('never appends a trailing rest after the final rep/set', function(){
      const p = app.buildTimerPlan({ sets:2, reps:2, work:5, restRep:3, restSet:10 });
      expect(p.phases.length).toBe(7);
      expect(p.total).toBe(36);
      expect(p.phases[p.phases.length-1].type).toBe('work');
    });
    it('clamps to at least 1 set / 1 rep (0 work falls back to the 10s default)', function(){
      const p = app.buildTimerPlan({ sets:0, reps:0, work:0 });
      expect(p.sets).toBe(1);
      expect(p.reps).toBe(1);
      expect(p.phases.length).toBe(1);
      expect(p.total).toBe(10);
    });
    it('prepends a "prep" lead-in phase, excluded from the series total', function(){
      const p = app.buildTimerPlan({ sets:1, reps:2, work:10, restRep:0, prep:10 });
      expect(p.phases[0].type).toBe('prep');
      expect(p.phases[0].secs).toBe(10);
      expect(p.total).toBe(20);        /* 2×10 work; prep not counted */
      expect(p.runTotal).toBe(30);     /* prep counts toward the progress bar */
    });
    it('has no prep phase when prep is 0 (runTotal === total)', function(){
      const p = app.buildTimerPlan({ sets:1, reps:2, work:10, restRep:0, prep:0 });
      expect(p.phases[0].type).toBe('work');
      expect(p.runTotal).toBe(p.total);
    });
  });

  describe('fmtMMSS()', function(){
    it('formats seconds as M:SS', function(){
      expect(app.fmtMMSS(685)).toBe('11:25');
      expect(app.fmtMMSS(9)).toBe('0:09');
      expect(app.fmtMMSS(60)).toBe('1:00');
      expect(app.fmtMMSS(0)).toBe('0:00');
    });
  });
};
