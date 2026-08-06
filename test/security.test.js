/* Regression tests for escapeHtml() — guards the free-text fields
   (profile name, session notes) that get injected via innerHTML.
   A malicious backup .json must not be able to smuggle live markup. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){
  describe('escapeHtml()', function(){
    it('neutralises angle brackets', function(){
      expect(app.escapeHtml('<img src=x onerror=alert(1)>'))
        .toBe('&lt;img src=x onerror=alert(1)&gt;');
    });
    it('escapes quotes and ampersands', function(){
      expect(app.escapeHtml('a & "b" \'c\'')).toBe('a &amp; &quot;b&quot; &#39;c&#39;');
    });
    it('escapes a <script> payload so no tag survives', function(){
      const out = app.escapeHtml('<script>steal()</script>');
      expect(out.indexOf('<script>')).toBe(-1);
      expect(out.indexOf('<')).toBe(-1);
    });
    it('returns empty string for null/undefined', function(){
      expect(app.escapeHtml(null)).toBe('');
      expect(app.escapeHtml(undefined)).toBe('');
    });
    it('leaves plain text untouched', function(){
      expect(app.escapeHtml('Pedro 7a proyecto')).toBe('Pedro 7a proyecto');
    });
  });
};
