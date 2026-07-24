/* Unit tests for intensity.js — tests → concrete session loads & calibration.
   This is the module that makes "los tests ajustan tu plan" TRUE, so it's the
   one that most needs guarding against regressions. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  /* Fresh state before each assertion: clear stored test history + reset U. */
  function reset(over){
    app.localStorage.clear();
    app.U = Object.assign({
      goal:'sport', level:'intermediate', plan:'4-3-2-1', days:4,
      weight:70, age:25, rhr:55, session:90,
      name:'', grade:'', targetGrade:'', tests:[], startDate:null,
      baseFinger:'', basePull:'', gymDays:[], rockDays:[], rockWeekend:'never', trainTime:'evening'
    }, over || {});
  }

  describe('latestTestValue()', function(){
    it('null when there is no history', function(){
      reset();
      expect(app.latestTestValue('hang_max')).toBe(null);
    });
    it('returns the most recent positive value', function(){
      reset();
      app.saveTestResult('hang_max', 55);
      app.saveTestResult('hang_max', 62);
      expect(app.latestTestValue('hang_max')).toBe(62);
    });
  });

  describe('categoryMax()', function(){
    it('uses the recorded test result', function(){
      reset();
      app.saveTestResult('hang_max', 80);
      expect(app.categoryMax('finger_strength')).toBe(80);
    });
    it('falls back to the onboarding baseline', function(){
      reset({ baseFinger:'72' });
      expect(app.categoryMax('finger_strength')).toBe(72);
    });
    it('prefers a recorded test over the baseline', function(){
      reset({ baseFinger:'72' });
      app.saveTestResult('hang_max', 80);
      expect(app.categoryMax('finger_strength')).toBe(80);
    });
    it('null with neither test nor baseline', function(){
      reset();
      expect(app.categoryMax('finger_strength')).toBe(null);
    });
    it('null for a capacity with no measurable max (power)', function(){
      reset();
      expect(app.categoryMax('power')).toBe(null);
    });
  });

  describe('getCapacityAdj()', function(){
    it('0 when untested', function(){
      reset();
      expect(app.getCapacityAdj('finger_strength')).toBe(0);
    });
    it('negative when below the level range', function(){
      reset({ level:'intermediate', weight:70 });
      app.saveTestResult('hang_max', 40);          /* ratio 0.57 → below → adj < 0 */
      expect(app.getCapacityAdj('finger_strength')).toBeLessThan(0);
    });
    it('positive when above the level range', function(){
      reset({ level:'intermediate', weight:70 });
      app.saveTestResult('hang_max', 120);         /* ratio 1.71 → above → adj > 0 */
      expect(app.getCapacityAdj('finger_strength')).toBeGreaterThan(0);
    });
  });

  describe('getCategoryLoad()', function(){
    it('null without a stage fraction', function(){
      reset();
      app.saveTestResult('hang_max', 80);
      expect(app.getCategoryLoad('finger_strength', 0)).toBe(null);
    });
    it('null without a measured max (card falls back to % text)', function(){
      reset();
      expect(app.getCategoryLoad('finger_strength', 0.875)).toBe(null);
    });
    it('kg = max × stage when the test sits in range (no adj)', function(){
      reset({ level:'intermediate', weight:70 });
      app.saveTestResult('hang_max', 80);          /* ratio 1.14 → in range → adj 0 */
      var L = app.getCategoryLoad('finger_strength', 0.875);
      expect(L.kg).toBe(70);                        /* 80 × 0.875 */
      expect(L.pct).toBe(88);
      expect(L.adjusted).toBe(false);
      expect(L.label).toBe('Max Hang');
    });
    it('a weak test lowers the effective % (more conservative)', function(){
      reset({ level:'intermediate', weight:70 });
      app.saveTestResult('hang_max', 40);          /* adj −20 → eff = 0.875 − 0.10 */
      var L = app.getCategoryLoad('finger_strength', 0.875);
      expect(L.pct).toBe(78);
      expect(L.adjusted).toBe(true);
    });
    it('clamps to the modality band (finger never trains > 95% of max)', function(){
      reset({ level:'intermediate', weight:70 });
      app.saveTestResult('hang_max', 120);         /* adj +10 → 0.975 → clamp 0.95 */
      var L = app.getCategoryLoad('finger_strength', 0.925);
      expect(L.pct).toBe(95);
    });
    it('pull band allows meeting/slightly exceeding the 3RM', function(){
      reset({ level:'intermediate', weight:70 });
      app.saveTestResult('pullup_3rm', 90);        /* ratio 1.28 → adj 0 */
      var L = app.getCategoryLoad('pull_strength', 1.03);
      expect(L.pct).toBe(103);
      expect(L.kg).toBe(93);                        /* round(90 × 1.03) */
    });
  });

  describe('getTestCalibration()', function(){
    it('empty when nothing is recorded', function(){
      reset();
      expect(app.getTestCalibration().hasAny).toBe(false);
    });
    it('lists the capacities that have a max', function(){
      reset();
      app.saveTestResult('hang_max', 70);
      app.saveTestResult('pullup_3rm', 85);
      var cal = app.getTestCalibration();
      expect(cal.hasAny).toBe(true);
      expect(cal.items.length).toBe(2);
    });
  });
};
