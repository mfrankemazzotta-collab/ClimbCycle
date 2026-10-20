/* ====================================================
   send-reminders -- Edge Function de Supabase
   ClimbCycle

   Manda los recordatorios push que la app dejó programados en la tabla
   `push_reminders`, a los dispositivos guardados en `push_subscriptions`.
   La llama pg_cron cada 10 minutos (ver sql/push.sql).

   Dos acciones:
     GET  ?action=key   → { publicKey }  clave pública VAPID para suscribirse
     POST {action:send} → manda lo que ya venció y lo marca como enviado

   POR QUÉ SIN LIBRERÍAS. Se pega tal cual en el editor del panel de
   Supabase (Edge Functions → Deploy a new function → Via Editor), sin
   CLI ni npm. Todo el protocolo (RFC 8291 cifrado aes128gcm + RFC 8292
   VAPID) está acá con WebCrypto, y test/push-crypto.test.js lo valida
   descifrando con la implementación de referencia (http_ece).

   LA CLAVE PRIVADA VAPID NO SALE NUNCA DE LA BASE. Se genera sola en el
   primer pedido y se guarda en `push_vapid`, una tabla con RLS y SIN
   policies: sólo esta función (service role) puede leerla. Nadie tiene
   que copiar ni pegar secretos.

   El archivo es JavaScript válido a propósito (aunque se llame .ts): así
   los tests de Node lo pueden cargar sin compilar.
==================================================== */

var PUSH_TTL_S = 6 * 3600;            /* si el teléfono está apagado, 6 h y se descarta */
var LATE_WINDOW_MS = 6 * 3600 * 1000; /* un recordatorio con más de 6 h de atraso ya no sirve */
var VAPID_SUB = 'https://mfrankemazzotta-collab.github.io/ClimbCycle/';

/* ── base64url ─────────────────────────────────────── */
function b64uEncode(bytes){
  var s = '';
  var b = new Uint8Array(bytes);
  for(var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str){
  var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while(s.length % 4) s += '=';
  var bin = atob(s);
  var out = new Uint8Array(bin.length);
  for(var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concatBytes(){
  var total = 0, i;
  for(i = 0; i < arguments.length; i++) total += arguments[i].length;
  var out = new Uint8Array(total), off = 0;
  for(i = 0; i < arguments.length; i++){ out.set(arguments[i], off); off += arguments[i].length; }
  return out;
}
function utf8(s){ return new TextEncoder().encode(s); }

/* ── HKDF (extract + expand en una sola llamada de WebCrypto) ── */
async function hkdf(salt, ikm, info, length){
  var key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  var bits = await crypto.subtle.deriveBits({ name:'HKDF', hash:'SHA-256', salt:salt, info:info }, key, length * 8);
  return new Uint8Array(bits);
}

/* ── RFC 8291: cifrado del mensaje para UN dispositivo ─────────────
   `opts.asKeys` y `opts.salt` sólo existen para los tests (vectores fijos);
   en producción se generan al azar en cada envío. */
async function encryptPayload(payloadText, p256dhB64u, authB64u, opts){
  opts = opts || {};
  var uaPublic = b64uDecode(p256dhB64u);
  var authSecret = b64uDecode(authB64u);
  var asKeys = opts.asKeys || await crypto.subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, true, ['deriveBits']);
  var asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  var uaKey = await crypto.subtle.importKey('raw', uaPublic, { name:'ECDH', namedCurve:'P-256' }, false, []);
  var ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name:'ECDH', public:uaKey }, asKeys.privateKey, 256));

  var keyInfo = concatBytes(utf8('WebPush: info\0'), uaPublic, asPublic);
  var ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  var salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  var cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  var nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  /* un solo registro: contenido + delimitador 0x02 (último registro) */
  var plain = concatBytes(utf8(payloadText), new Uint8Array([2]));
  var aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  var cipher = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv:nonce }, aesKey, plain));

  var rs = 4096;
  var header = concatBytes(salt, new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255]),
                           new Uint8Array([asPublic.length]), asPublic);
  return concatBytes(header, cipher);
}

/* ── RFC 8292: VAPID (JWT ES256 firmado con la clave del servidor) ── */
async function vapidAuthHeader(endpoint, vapid, nowS){
  var aud = new URL(endpoint).origin;
  var exp = (nowS || Math.floor(Date.now() / 1000)) + 12 * 3600;
  var head = b64uEncode(utf8(JSON.stringify({ typ:'JWT', alg:'ES256' })));
  var body = b64uEncode(utf8(JSON.stringify({ aud:aud, exp:exp, sub:VAPID_SUB })));
  var key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  /* WebCrypto ya devuelve la firma en formato JOSE (r||s, 64 bytes) */
  var sig = new Uint8Array(await crypto.subtle.sign({ name:'ECDSA', hash:'SHA-256' }, key, utf8(head + '.' + body)));
  return 'vapid t=' + head + '.' + body + '.' + b64uEncode(sig) + ', k=' + vapid.publicKey;
}

async function generateVapid(){
  var kp = await crypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign', 'verify']);
  var pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  var jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { publicKey:b64uEncode(pub), privateJwk:jwk };
}

/* Arma el pedido HTTP completo hacia el servicio de push del navegador. */
async function buildPushRequest(sub, payloadText, vapid){
  var body = await encryptPayload(payloadText, sub.p256dh, sub.auth);
  return {
    url: sub.endpoint,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': String(PUSH_TTL_S),
        'Urgency': 'normal',
        'Authorization': await vapidAuthHeader(sub.endpoint, vapid)
      },
      body: body
    }
  };
}

/* ── PostgREST con la service role (sólo dentro de la función) ── */
function db(){
  var url = (typeof Deno !== 'undefined') ? Deno.env.get('SUPABASE_URL') : '';
  var key = (typeof Deno !== 'undefined') ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : '';
  return async function(method, path, body, prefer){
    var headers = { apikey:key, Authorization:'Bearer ' + key, 'Content-Type':'application/json' };
    if(prefer) headers.Prefer = prefer;
    var r = await fetch(url + '/rest/v1/' + path, { method:method, headers:headers, body: body ? JSON.stringify(body) : undefined });
    var t = await r.text();
    if(!r.ok) throw new Error(method + ' ' + path.split('?')[0] + ' → ' + r.status + ' ' + t.slice(0, 200));
    return t ? JSON.parse(t) : null;
  };
}

async function loadVapid(q){
  var rows = await q('GET', 'push_vapid?id=eq.1&select=public_key,private_jwk');
  if(rows && rows.length) return { publicKey:rows[0].public_key, privateJwk:rows[0].private_jwk };
  /* primera vez: se genera y se guarda. Si dos pedidos llegan juntos, el
     segundo insert se ignora y ambos leen la misma clave. */
  var v = await generateVapid();
  await q('POST', 'push_vapid', { id:1, public_key:v.publicKey, private_jwk:v.privateJwk }, 'resolution=ignore-duplicates');
  rows = await q('GET', 'push_vapid?id=eq.1&select=public_key,private_jwk');
  return { publicKey:rows[0].public_key, privateJwk:rows[0].private_jwk };
}

async function sendDue(q, nowMs){
  var vapid = await loadVapid(q);
  var now = new Date(nowMs).toISOString();
  var desde = new Date(nowMs - LATE_WINDOW_MS).toISOString();
  var due = await q('GET', 'push_reminders?sent_at=is.null&send_at=lte.' + encodeURIComponent(now)
    + '&send_at=gte.' + encodeURIComponent(desde) + '&select=id,user_id,tag,title,body&order=send_at&limit=500');
  var stats = { due:due.length, sent:0, gone:0, failed:0 };
  if(due.length){
    var users = Array.from(new Set(due.map(function(r){ return r.user_id; })));
    var subs = await q('GET', 'push_subscriptions?user_id=in.(' + users.join(',') + ')&select=id,user_id,endpoint,p256dh,auth');
    var muertas = {};
    for(var i = 0; i < due.length; i++){
      var r = due[i];
      var payload = JSON.stringify({ title:r.title, body:r.body, tag:r.tag });
      var mias = subs.filter(function(s){ return s.user_id === r.user_id && !muertas[s.id]; });
      for(var j = 0; j < mias.length; j++){
        try {
          var req = await buildPushRequest(mias[j], payload, vapid);
          var res = await fetch(req.url, req.init);
          if(res.status === 404 || res.status === 410){ muertas[mias[j].id] = true; stats.gone++; }
          else if(res.ok) stats.sent++;
          else stats.failed++;
        } catch(e){ stats.failed++; }
      }
    }
    await q('PATCH', 'push_reminders?id=in.(' + due.map(function(r){ return r.id; }).join(',') + ')', { sent_at:now });
    var ids = Object.keys(muertas);
    if(ids.length) await q('DELETE', 'push_subscriptions?id=in.(' + ids.join(',') + ')');
  }
  /* limpieza: lo de hace más de 2 días ya no le sirve a nadie */
  await q('DELETE', 'push_reminders?send_at=lt.' + encodeURIComponent(new Date(nowMs - 2 * 86400000).toISOString()));
  return stats;
}

var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
function json(obj, status){
  return new Response(JSON.stringify(obj), { status:status || 200, headers:Object.assign({ 'Content-Type':'application/json' }, CORS) });
}

async function handler(req){
  if(req.method === 'OPTIONS') return new Response('ok', { headers:CORS });
  try {
    var q = db();
    var action = new URL(req.url).searchParams.get('action');
    if(!action && req.method === 'POST'){
      try { action = (await req.json()).action; } catch(e){}
    }
    if(action === 'key'){
      var v = await loadVapid(q);
      return json({ publicKey:v.publicKey });
    }
    return json(await sendDue(q, Date.now()));
  } catch(e){
    return json({ error:String(e && e.message || e) }, 500);
  }
}

if(typeof Deno !== 'undefined') Deno.serve(handler);
