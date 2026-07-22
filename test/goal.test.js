/* Unit tests for goal.js — computeGoalPlan() (the pure roadmap engine). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  function setUser(over){
    app.U = Object.assign({
      goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4,
      weight:70, age:25, rhr:55, session:90,
      name:'', grade:'6c', targetGrade:'', tests:[], startDate:null,
      gymDays:[1,3,5], rockDays:[], rockWeekend:'never', trainTime:'evening'
    }, over || {});
    app.localStorage.removeItem('cc_tests');   /* clear any stored test history */
  }

  describe('computeGoalPlan() — target handling', function(){
    it('reports no target when none is set', function(){
      setUser({ targetGrade:'' });
      expect(app.computeGoalPlan().hasTarget).toBe(false);
    });
    it('flags "reached" when target is at or below current', function(){
      setUser({ grade:'7a', targetGrade:'6c' });
      var p = app.computeGoalPlan();
      expect(p.hasTarget).toBe(true);
      expect(p.reached).toBe(true);
    });
    it('computes the grade gap correctly', function(){
      setUser({ grade:'6c', targetGrade:'7b' });   /* 6c→7b = 4 steps */
      expect(app.computeGoalPlan().gap).toBe(4);
    });
  });

  describe('computeGoalPlan() — heuristic focus (no tests)', function(){
    it('sport goal leads with aerobic base', function(){
      setUser({ goal:'sport', grade:'6c', targetGrade:'7b' });
      var p = app.computeGoalPlan();
      expect(p.usesTests).toBe(false);
      expect(p.focuses[0].key).toBe('aerobic');
    });
    it('boulder goal leads with finger strength', function(){
      setUser({ goal:'boulder', level:'advanced', grade:'7a', targetGrade:'7c' });
      var p = app.computeGoalPlan();
      expect(p.focuses[0].key).toBe('fingerStrength');
    });
    it('beginner focus never includes power', function(){
      setUser({ goal:'boulder', level:'beginner', grade:'5', targetGrade:'6a+' });
      var keys = app.computeGoalPlan().focuses.map(function(f){ return f.key; });
      expect(keys).notToContain('power');
    });
    it('each focus carries concrete exercises', function(){
      setUser({ goal:'sport', grade:'6c', targetGrade:'7b' });
      var p = app.computeGoalPlan();
      p.focuses.forEach(function(f){
        expect(f.exercises.length).toBeGreaterThan(0);
        expect(typeof f.exercises[0].n).toBe('string');
      });
    });
  });

  describe('computeGoalPlan() — test-driven focus', function(){
    it('prioritises the capacity where the test result is weakest', function(){
      setUser({ goal:'both', level:'advanced', grade:'7a', targetGrade:'7b' });
      /* weak fingers, strong everything else, relative to the advanced range */
      app.saveTestResult('hang_max', 70);       /* ratio 1.0 vs mid 1.45 → weak */
      app.saveTestResult('pullup_3rm', 140);    /* ratio 2.0 vs mid 1.50 → strong */
      app.saveTestResult('cf_minutes', 20);     /* 20 vs mid 11 → strong */
      app.saveTestResult('repeater_6rep', 120); /* ratio 1.7 vs mid 1.25 → strong */
      var p = app.computeGoalPlan();
      expect(p.usesTests).toBe(true);
      expect(p.focuses[0].key).toBe('fingerStrength');
    });
  });

  describe('computeGoalPlan() — day guidance', function(){
    it('references gym days when set', function(){
      setUser({ grade:'6c', targetGrade:'7a', gymDays:[1,3,5] });
      var p = app.computeGoalPlan();
      expect(p.gymGuidance.indexOf('Lun') >= 0).toBe(true);
    });
    it('nudges to add rock days when none are set', function(){
      setUser({ grade:'6c', targetGrade:'7a', rockDays:[] });
      expect(app.computeGoalPlan().rockGuidance.toLowerCase().indexOf('sumá') >= 0).toBe(true);
    });
    it('gives projecting guidance when rock days exist', function(){
      setUser({ grade:'6c', targetGrade:'7a', rockDays:[6] });
      var p = app.computeGoalPlan();
      expect(p.rockGuidance.indexOf('Sáb') >= 0).toBe(true);
      expect(p.rockGuidance.indexOf('7a') >= 0).toBe(true);
    });
    it('always provides a horizon estimate', function(){
      setUser({ grade:'6c', targetGrade:'7b' });
      expect(app.computeGoalPlan().horizon.indexOf('semanas') >= 0).toBe(true);
    });
  });
};
