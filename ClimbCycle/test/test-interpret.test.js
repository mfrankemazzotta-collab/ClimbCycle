/* Unit tests for test-interpret.js — the interpreters extracted out of the
   TESTS data. Now that they're pure and isolated they can be exercised
   directly at boundary conditions (impossible while inlined in the data). */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const I = app.interpretTest;
  const T = (key) => ({ result_key: key });   /* minimal test stub */

  describe('interpretTest() dispatch', function(){
    it('null for a null test', function(){
      expect(I(null, 60, 'intermediate', 70)).toBe(null);
    });
    it('null for an unknown result_key', function(){
      expect(I(T('nope'), 1, 'intermediate', 70)).toBe(null);
    });
    it('returns a {txt,col,icon,adj} shape for a known test', function(){
      const r = I(T('hang_max'), 80, 'intermediate', 70);
      expect(typeof r.txt).toBe('string');
      expect(typeof r.col).toBe('string');
      expect(typeof r.adj).toBe('number');
    });
  });

  describe('hang_max interpreter', function(){
    it('null on non-numeric input', function(){
      expect(I(T('hang_max'), 'abc', 'beginner', 70)).toBe(null);
    });
    it('beginner below bodyweight → conservative adj (-15)', function(){
      expect(I(T('hang_max'), 55, 'beginner', 70).adj).toBe(-15);   /* ratio 0.79 */
    });
    it('intermediate below range → adj -20', function(){
      expect(I(T('hang_max'), 70, 'intermediate', 70).adj).toBe(-20); /* ratio 1.0 */
    });
    it('intermediate solid → positive adj', function(){
      expect(I(T('hang_max'), 100, 'intermediate', 70).adj).toBeGreaterThan(0); /* ratio 1.43 */
    });
    it('advanced strong → adj 10', function(){
      expect(I(T('hang_max'), 130, 'advanced', 70).adj).toBe(10);   /* ratio 1.86 */
    });
  });

  describe('pullup_3rm interpreter', function(){
    it('beginner needs base → adj -10', function(){
      expect(I(T('pullup_3rm'), 65, 'beginner', 70).adj).toBe(-10); /* ratio 0.93 */
    });
    it('advanced strong → adj 8', function(){
      expect(I(T('pullup_3rm'), 110, 'advanced', 70).adj).toBe(8);  /* ratio 1.57 */
    });
  });

  describe('cf_minutes interpreter', function(){
    it('low CF → adj -20', function(){
      expect(I(T('cf_minutes'), 3, 'intermediate', 70).adj).toBe(-20);
    });
    it('excellent CF → adj 10', function(){
      expect(I(T('cf_minutes'), 15, 'intermediate', 70).adj).toBe(10);
    });
  });

  describe('repeater_6rep interpreter', function(){
    it('below expected → adj -15', function(){
      expect(I(T('repeater_6rep'), 56, 'intermediate', 70).adj).toBe(-15); /* ratio 0.8 */
    });
  });

  describe('max_grade interpreter', function(){
    it('empty string → null', function(){
      expect(I(T('max_grade'), '', 'intermediate', 70)).toBe(null);
    });
    it('below the level range → adj -10', function(){
      expect(I(T('max_grade'), '5', 'intermediate', 70).adj).toBe(-10);  /* tier 3 < 6 */
    });
    it('inside the level range → adj 0', function(){
      expect(I(T('max_grade'), '6b', 'intermediate', 70).adj).toBe(0);   /* tier 7 in [6,10] */
    });
    it('above the level range → adj 10', function(){
      expect(I(T('max_grade'), '7b', 'intermediate', 70).adj).toBe(10);  /* tier 13 > 10 */
    });
  });
};
