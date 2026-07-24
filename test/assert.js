/* Tiny zero-dependency test framework: describe / it / expect.
   Collects results, prints a readable report, sets process exit code. */

let passed = 0, failed = 0;
const failures = [];
let currentSuite = '';

function describe(name, fn){
  currentSuite = name;
  console.log('\n\x1b[1m' + name + '\x1b[0m');
  fn();
  currentSuite = '';
}

let pending = [];

function _pass(name){
  passed++;
  console.log('  \x1b[32m✓\x1b[0m ' + name);
}
function _fail(suite, name, e){
  failed++;
  const msg = (e && e.message) ? e.message : String(e);
  failures.push({ suite, name, message: msg });
  console.log('  \x1b[31m✗ ' + name + '\x1b[0m');
  console.log('    \x1b[31m' + msg + '\x1b[0m');
}

/* Supports both sync tests and tests that return a Promise (async fn).
   Async results are collected in `pending` and awaited by flush(). */
function it(name, fn){
  const suite = currentSuite;
  let r;
  try {
    r = fn();
  } catch(e){
    return _fail(suite, name, e);
  }
  if(r && typeof r.then === 'function'){
    pending.push(r.then(function(){ _pass(name); }, function(e){ _fail(suite, name, e); }));
  } else {
    _pass(name);
  }
}

/* Await every async test registered so far. Call before report(). */
async function flush(){
  const ps = pending;
  pending = [];
  await Promise.all(ps);
}

function expect(actual){
  return {
    toBe(exp){
      if(actual !== exp) throw new Error('expected ' + fmt(exp) + ' but got ' + fmt(actual));
    },
    toEqual(exp){
      if(JSON.stringify(actual) !== JSON.stringify(exp))
        throw new Error('expected ' + fmt(exp) + ' but got ' + fmt(actual));
    },
    toBeCloseTo(exp, tol){
      tol = tol == null ? 0.001 : tol;
      if(Math.abs(actual - exp) > tol)
        throw new Error('expected ~' + fmt(exp) + ' (±' + tol + ') but got ' + fmt(actual));
    },
    toBeGreaterThan(exp){
      if(!(actual > exp)) throw new Error('expected > ' + fmt(exp) + ' but got ' + fmt(actual));
    },
    toBeGreaterThanOrEqual(exp){
      if(!(actual >= exp)) throw new Error('expected >= ' + fmt(exp) + ' but got ' + fmt(actual));
    },
    toBeLessThan(exp){
      if(!(actual < exp)) throw new Error('expected < ' + fmt(exp) + ' but got ' + fmt(actual));
    },
    toBeLessThanOrEqual(exp){
      if(!(actual <= exp)) throw new Error('expected <= ' + fmt(exp) + ' but got ' + fmt(actual));
    },
    toContain(item){
      if(!Array.isArray(actual) || actual.indexOf(item) < 0)
        throw new Error('expected ' + fmt(actual) + ' to contain ' + fmt(item));
    },
    notToContain(item){
      if(Array.isArray(actual) && actual.indexOf(item) >= 0)
        throw new Error('expected ' + fmt(actual) + ' not to contain ' + fmt(item));
    },
    toBeTruthy(){
      if(!actual) throw new Error('expected truthy but got ' + fmt(actual));
    },
    toBeFalsy(){
      if(actual) throw new Error('expected falsy but got ' + fmt(actual));
    }
  };
}

function fmt(v){
  if(typeof v === 'string') return '"' + v + '"';
  if(Array.isArray(v) || (v && typeof v === 'object')) return JSON.stringify(v);
  return String(v);
}

function report(){
  console.log('\n' + '─'.repeat(48));
  if(failed === 0){
    console.log('\x1b[32m\x1b[1m' + passed + ' passed\x1b[0m, 0 failed');
  } else {
    console.log('\x1b[31m\x1b[1m' + failed + ' failed\x1b[0m, ' + passed + ' passed');
  }
  process.exitCode = failed === 0 ? 0 : 1;
}

module.exports = { describe, it, expect, report, flush };
