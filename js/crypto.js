/* ====================================================
   crypto.js -- PBKDF2 key derivation + AES-GCM encryption (WebCrypto)
   ClimbCycle

   Dependency-free crypto primitives used by:
     - auth.js  → slow password hashing (PBKDF2 instead of a single SHA-256)
     - state.js → optional ENCRYPTED backups (AES-GCM)

   Everything is async (WebCrypto). Must load BEFORE auth.js. Every consumer
   guards on `typeof cc… === 'function'`, so if this file ever fails to load
   the app falls back to its previous behaviour instead of breaking.
==================================================== */

var CC_PBKDF2_ITERS = 150000;   /* OWASP-ballpark for PBKDF2-SHA256 */

function _ccSubtle(){ return (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null; }
function _ccBytesToHex(bytes){
  return Array.prototype.map.call(bytes, function(b){ return ('0'+b.toString(16)).slice(-2); }).join('');
}
function _ccHexToBytes(hex){
  hex = String(hex || '');
  var a = new Uint8Array(hex.length/2);
  for(var i=0;i<a.length;i++) a[i] = parseInt(hex.substr(i*2,2),16);
  return a;
}
function _ccEnc(str){ return new TextEncoder().encode(String(str)); }

/* Random salt/token as hex. */
function ccRandomHex(nBytes){
  var a = new Uint8Array(nBytes || 16);
  crypto.getRandomValues(a);
  return _ccBytesToHex(a);
}

/* PBKDF2 → raw 256-bit AES-GCM key (for encrypt/decrypt). */
function ccDeriveKey(password, saltHex, iters){
  var subtle = _ccSubtle();
  return subtle.importKey('raw', _ccEnc(password), 'PBKDF2', false, ['deriveKey']).then(function(base){
    return subtle.deriveKey(
      { name:'PBKDF2', salt:_ccHexToBytes(saltHex), iterations:iters || CC_PBKDF2_ITERS, hash:'SHA-256' },
      base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
  });
}

/* PBKDF2 → 256-bit verification hash (hex) for password STORAGE. */
function ccDeriveHashHex(password, saltHex, iters){
  var subtle = _ccSubtle();
  return subtle.importKey('raw', _ccEnc(password), 'PBKDF2', false, ['deriveBits']).then(function(base){
    return subtle.deriveBits(
      { name:'PBKDF2', salt:_ccHexToBytes(saltHex), iterations:iters || CC_PBKDF2_ITERS, hash:'SHA-256' },
      base, 256);
  }).then(function(bits){ return _ccBytesToHex(new Uint8Array(bits)); });
}

/* Encrypt a JS value → self-describing payload {alg, iv, ct} (hex). */
function ccEncryptJSON(key, obj){
  var subtle = _ccSubtle();
  var iv = new Uint8Array(12); crypto.getRandomValues(iv);
  return subtle.encrypt({ name:'AES-GCM', iv:iv }, key, _ccEnc(JSON.stringify(obj))).then(function(ct){
    return { alg:'AES-GCM', iv:_ccBytesToHex(iv), ct:_ccBytesToHex(new Uint8Array(ct)) };
  });
}
/* Decrypt a payload from ccEncryptJSON back into the original value.
   Rejects (bad key / tampered ciphertext) surface as a rejected Promise. */
function ccDecryptJSON(key, payload){
  var subtle = _ccSubtle();
  return subtle.decrypt({ name:'AES-GCM', iv:_ccHexToBytes(payload.iv) }, key, _ccHexToBytes(payload.ct))
    .then(function(pt){ return JSON.parse(new TextDecoder().decode(pt)); });
}
