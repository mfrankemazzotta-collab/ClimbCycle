/* ====================================================
   errors.js -- Central error logging + user-visible surfacing
   ClimbCycle

   One place to funnel every caught/uncaught error:
     - keeps an in-memory ring buffer (getErrorLog) for debugging,
     - logs to the console,
     - optionally shows a toast to the user (opts.notify),
     - and dispatches to a pluggable reporter (Sentry/PostHog later)
       set via setErrorReporter — no external SDK wired yet.

   Loads FIRST (before crypto/auth/state) so every module can call
   logError(). Zero dependencies. Guarded so it also loads in the
   browser-less test harness (no window/document required).
==================================================== */

var CC_ERR_LOG = [];        /* ring buffer of the last CC_ERR_MAX entries */
var CC_ERR_MAX = 50;
var CC_ERR_QUIET = false;   /* tests flip this to silence console.error */
var _ccErrReporter = null;  /* pluggable sink: fn(entry, rawError) */

/* Register an external reporter (e.g. Sentry.captureException). It receives
   the normalized entry plus the raw error. Pass null/anything else to clear. */
function setErrorReporter(fn){ _ccErrReporter = (typeof fn === 'function') ? fn : null; }

/* Snapshot copy of the buffer (newest last). */
function getErrorLog(){ return CC_ERR_LOG.slice(); }
function clearErrorLog(){ CC_ERR_LOG.length = 0; }

/* Best-effort human message from anything that got thrown/rejected. */
function _ccErrMessage(err){
  if(err == null) return 'unknown error';
  if(typeof err === 'string') return err;
  if(err.message) return String(err.message);
  try { return JSON.stringify(err); } catch(e){ return String(err); }
}

/* Central error entry point.
   err     : Error | string | any thrown/rejected value
   context : short label of where it happened ('importUserData', ...)
   opts    : { notify:bool, userMessage:string, color:string }
   Returns the normalized entry (handy for tests). */
function logError(err, context, opts){
  opts = opts || {};
  var entry = {
    t: Date.now(),
    context: context || '',
    message: _ccErrMessage(err),
    stack: (err && err.stack) ? String(err.stack) : ''
  };
  CC_ERR_LOG.push(entry);
  if(CC_ERR_LOG.length > CC_ERR_MAX){
    CC_ERR_LOG.splice(0, CC_ERR_LOG.length - CC_ERR_MAX);
  }
  if(!CC_ERR_QUIET && typeof console !== 'undefined' && console.error){
    console.error('[cc:' + entry.context + '] ' + entry.message, err);
  }
  if(_ccErrReporter){
    /* A broken reporter must never take the app down. */
    try { _ccErrReporter(entry, err); } catch(e){}
  }
  if(opts.notify && typeof showToast === 'function'){
    showToast(opts.userMessage || ('Error: ' + entry.message), opts.color || '#E5404B');
  }
  return entry;
}

/* Wire browser-global handlers so nothing slips through uncaught.
   Call once from app init. No-op (returns false) in the test harness or
   any environment without window.addEventListener. */
function installGlobalErrorHandlers(){
  if(typeof window === 'undefined' || typeof window.addEventListener !== 'function') return false;
  window.addEventListener('error', function(e){
    logError((e && e.error) || (e && e.message) || 'window error', 'window.onerror');
  });
  window.addEventListener('unhandledrejection', function(e){
    logError((e && e.reason) || 'unhandled rejection', 'unhandledrejection');
  });
  return true;
}
