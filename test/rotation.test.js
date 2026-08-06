/* Tests for selectExercises() cross-week rotation (planner.js).
   The picker now avoids exercises used LAST week (when the level-appropriate
   pool has alternatives) and advances the pick by week index, so consecutive
   weeks feel different — while staying deterministic per date. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  function setU(){
    app.U.level = 'intermediate';
    app.U.plan = '4-3-2-1';
    app.U.startDate = new Date('2026-01-05');   /* a Monday */
    app.U.tests = [];
  }
  const day = function(s){ return new Date(s).toDateString(); };

  describe('selectExercises() cross-week rotation', function(){
    it('is deterministic for the same date and state', function(){
      setU(); app.planMap = {};
      const d = day('2026-01-05');
      const a = app.selectExercises('strength', d, 4).map(function(e){ return e.id; });
      const b = app.selectExercises('strength', d, 4).map(function(e){ return e.id; });
      expect(a.join(',')).toBe(b.join(','));
    });

    it('rotates the selection from one week to the next', function(){
      setU();
      const w0 = day('2026-01-05'), w1 = day('2026-01-12');
      app.planMap = {};
      app.planMap[w0] = { block:'strength', week:1 };
      app.planMap[w1] = { block:'strength', week:2 };
      const e0 = app.selectExercises('strength', w0, 4);
      app.planMap[w0].exercises = e0;             /* cache, like getExercisesForDay */
      const e1 = app.selectExercises('strength', w1, 4);
      const same = e0.map(function(e){ return e.id; }).join(',') === e1.map(function(e){ return e.id; }).join(',');
      expect(same).toBe(false);
    });

    it('surfaces more variety across 3 weeks than any single week', function(){
      setU();
      const days = ['2026-01-05', '2026-01-12', '2026-01-19'].map(day);
      app.planMap = {};
      days.forEach(function(d, i){ app.planMap[d] = { block:'strength', week:i+1 }; });
      const uniq = {};
      let oneWeek = 0;
      days.forEach(function(d){
        const e = app.selectExercises('strength', d, 4);
        app.planMap[d].exercises = e;             /* feed the next week's rotation */
        if(!oneWeek) oneWeek = e.length;
        e.forEach(function(x){ uniq[x.id] = 1; });
      });
      expect(Object.keys(uniq).length).toBeGreaterThan(oneWeek);
    });
  });
};
