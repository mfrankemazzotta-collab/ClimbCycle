/* Tests for tsRecView() — the pure branching extracted from buildTsTab that
   maps a test's status to the recommendation banner's color + message. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('tsRecView()', function(){
    it('never-done → primary accent + "nunca hecho" copy', function(){
      const v = app.tsRecView({ neverDone: true });
      expect(v.color).toBe('var(--accent-primary)');
      expect(v.msg.indexOf('Nunca hecho')).toBe(0);
    });
    it('overdue → warning accent + days-since copy', function(){
      const v = app.tsRecView({ neverDone: false, overdue: true, daysSince: 10 });
      expect(v.color).toBe('var(--accent-warning)');
      expect(v.msg).toBe('Hace 10 días - ya toca repetirlo');
    });
    it('due today → caution accent + "hoy" copy', function(){
      const v = app.tsRecView({ neverDone: false, overdue: false, daysUntil: 0 });
      expect(v.color).toBe('var(--accent-caution)');
      expect(v.msg).toBe('Puedes hacerlo hoy');
    });
    it('within a week → caution accent + countdown', function(){
      const v = app.tsRecView({ neverDone: false, overdue: false, daysUntil: 3 });
      expect(v.color).toBe('var(--accent-caution)');
      expect(v.msg).toBe('En 3 días');
    });
    it('more than a week away → deload accent', function(){
      const v = app.tsRecView({ neverDone: false, overdue: false, daysUntil: 14 });
      expect(v.color).toBe('var(--accent-deload)');
      expect(v.msg).toBe('En 14 días');
    });
  });
};
