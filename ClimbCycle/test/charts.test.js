/* Unit tests for the test-progress chart geometry (buildTestChartModel).
   The SVG string renderer is trivial; the value is in the coordinate math,
   which is pure and worth guarding. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  const RANGE = { lo:1.0, mid:1.15, hi:1.35, elite:1.60, unit:'ratio' };
  const now = Date.now();

  describe('buildTestChartModel()', function(){
    it('is empty for no history', function(){
      expect(app.buildTestChartModel([], RANGE, true, 70).empty).toBe(true);
    });
    it('drops non-numeric entries', function(){
      const m = app.buildTestChartModel([{v:'abc',ts:now},{v:80,ts:now}], RANGE, true, 70);
      expect(m.count).toBe(1);
    });
    it('centers a single point horizontally', function(){
      const m = app.buildTestChartModel([{v:70,ts:now}], RANGE, true, 70);
      expect(m.count).toBe(1);
      expect(m.points[0].x).toBeGreaterThan(100);
      expect(m.points[0].x).toBeLessThan(200);
    });
    it('maps higher values to a smaller y (SVG is top-down)', function(){
      const m = app.buildTestChartModel([{v:70,ts:now-2e9},{v:110,ts:now}], RANGE, true, 70);
      expect(m.points[1].y).toBeLessThan(m.points[0].y);
    });
    it('computes the trend % from first to last', function(){
      const m = app.buildTestChartModel([{v:70,ts:now-2e9},{v:84,ts:now}], RANGE, true, 70);
      expect(m.trendPct).toBe(20);   /* ratio 1.0 → 1.2 */
    });
    it('builds four level-range zones when a range is given', function(){
      const m = app.buildTestChartModel([{v:80,ts:now}], RANGE, true, 70);
      expect(m.zones.length).toBe(4);
    });
    it('omits zones when no range is given', function(){
      const m = app.buildTestChartModel([{v:8,ts:now}], null, false, 70);
      expect(m.zones.length).toBe(0);
    });
    it('applies ratio scaling (val = raw / weight)', function(){
      const m = app.buildTestChartModel([{v:105,ts:now}], RANGE, true, 70);
      expect(m.points[0].val).toBeCloseTo(1.5, 0.001);
    });
    it('uses raw values for non-ratio tests', function(){
      const m = app.buildTestChartModel([{v:8,ts:now}], {lo:5,mid:7,hi:11,elite:14,unit:'min'}, false, 70);
      expect(m.points[0].val).toBe(8);
    });
    it('keeps every point inside the plot box, even a record above elite', function(){
      const m = app.buildTestChartModel([{v:200,ts:now}], RANGE, true, 70);  /* ratio 2.86 > elite */
      const d = m.dims;
      expect(m.points[0].y).toBeGreaterThanOrEqual(d.padT);
      expect(m.points[0].y).toBeLessThanOrEqual(d.h - d.padB);
    });
    it('renderTestChart emits an svg for a real model and empty string for an empty model', function(){
      const svg = app.renderTestChart(app.buildTestChartModel([{v:70,ts:now-2e9},{v:84,ts:now}], RANGE, true, 70), '#CCFF00');
      expect(svg.indexOf('<svg') >= 0).toBe(true);
      expect(app.renderTestChart({empty:true})).toBe('');
    });
  });
};
