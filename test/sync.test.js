/* Unit tests for sync.js — the pure, network-free logic:
   conflict resolution, timestamp coercion, bundle timestamp extraction,
   and config detection. Network calls (auth/push/pull) are not exercised. */
const { describe, it, expect } = require('./assert');

module.exports = function(app){

  describe('syncResolve()', function(){
    it('pulls when the remote copy is newer', function(){
      expect(app.syncResolve('2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBe('pull');
    });
    it('pushes when the local copy is newer', function(){
      expect(app.syncResolve('2026-03-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBe('push');
    });
    it('is in sync when timestamps are equal', function(){
      expect(app.syncResolve('2026-02-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBe('insync');
    });
    it('pushes when nothing exists remotely yet', function(){
      expect(app.syncResolve('2026-02-01T00:00:00Z', null)).toBe('push');
    });
    it('pulls when there is no local timestamp', function(){
      expect(app.syncResolve(null, '2026-02-01T00:00:00Z')).toBe('pull');
    });
    it('is in sync when both sides are empty', function(){
      expect(app.syncResolve(null, null)).toBe('insync');
    });
    it('accepts epoch-millis numbers too', function(){
      expect(app.syncResolve(1000, 2000)).toBe('pull');
      expect(app.syncResolve(2000, 1000)).toBe('push');
    });
  });

  describe('syncBundleTs()', function(){
    it('extracts exportedAt from a bundle object', function(){
      expect(app.syncBundleTs({ exportedAt:'2026-02-01T00:00:00Z', data:{} }))
        .toBe('2026-02-01T00:00:00Z');
    });
    it('extracts exportedAt from a bundle JSON string', function(){
      expect(app.syncBundleTs('{"exportedAt":"2026-02-01T00:00:00Z"}'))
        .toBe('2026-02-01T00:00:00Z');
    });
    it('returns null for malformed input', function(){
      expect(app.syncBundleTs('not json')).toBe(null);
      expect(app.syncBundleTs({})).toBe(null);
    });
  });

  describe('syncIsConfigured()', function(){
    it('is false while the placeholder credentials are in place', function(){
      app.window.CC_SUPABASE_URL = 'TU_PROJECT_URL';
      app.window.CC_SUPABASE_ANON_KEY = 'TU_ANON_KEY';
      expect(app.syncIsConfigured()).toBe(false);
    });
    it('is false when values are empty', function(){
      app.window.CC_SUPABASE_URL = '';
      app.window.CC_SUPABASE_ANON_KEY = '';
      expect(app.syncIsConfigured()).toBe(false);
    });
    it('is true once real-looking values are set', function(){
      app.window.CC_SUPABASE_URL = 'https://abcd1234.supabase.co';
      app.window.CC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.somethinglong';
      expect(app.syncIsConfigured()).toBe(true);
      /* reset so other suites see the offline default */
      app.window.CC_SUPABASE_URL = 'TU_PROJECT_URL';
      app.window.CC_SUPABASE_ANON_KEY = 'TU_ANON_KEY';
    });
  });

  describe('offline safety', function(){
    it('starts logged out with no cloud session', function(){
      expect(app.syncIsLoggedIn()).toBe(false);
      expect(app.syncCurrentEmail()).toBe(null);
    });
    it('push/pull/now return thenables instead of throwing when logged out', function(){
      expect(typeof app.syncPush().then).toBe('function');
      expect(typeof app.syncPull().then).toBe('function');
      expect(typeof app.syncNow().then).toBe('function');
    });
  });
};
