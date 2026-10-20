/* ====================================================
   push-crypto.test.js -- la Edge Function de recordatorios push

   El cifrado de Web Push (RFC 8291) y la firma VAPID (RFC 8292) están
   escritos a mano con WebCrypto para que la función se pueda pegar en el
   panel de Supabase sin dependencias. Un error de un byte acá no da
   excepción: el teléfono descarta el mensaje en silencio y nadie se entera.

   Por eso se valida como lo haría el NAVEGADOR: con una implementación
   independiente del lado receptor (node:crypto, no WebCrypto) que descifra
   lo que la función cifró, y verificando la firma del JWT con la clave
   pública que se publica. Además se prueba el ciclo de envío con una base
   falsa: marca enviados, borra suscripciones muertas (410), no reenvía.
==================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeCrypto = require('crypto');
const { describe, it, expect } = require('./assert');

function cargarFuncion(fetchFake){
  const src = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'send-reminders', 'index.ts'), 'utf8');
  const ctx = {
    crypto: globalThis.crypto, TextEncoder, URL, btoa, atob, Uint8Array, Array, Set, Date, JSON, Math, String, Object,
    encodeURIComponent, Response: globalThis.Response,
    fetch: fetchFake || function(){ throw new Error('sin red en los tests'); }
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'send-reminders/index.ts' });
  return ctx;
}

/* Lado RECEPTOR (lo que hace el navegador), con node:crypto. */
function descifrar(body, uaEcdh, authSecret){
  const salt = body.subarray(0, 16);
  const rs = body.readUInt32BE(16);
  const idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen);
  const cipher = body.subarray(21 + idlen);
  const uaPublic = uaEcdh.getPublicKey();
  const ecdhSecret = uaEcdh.computeSecret(asPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(nodeCrypto.hkdfSync('sha256', ecdhSecret, authSecret, keyInfo, 32));
  const cek = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const tag = cipher.subarray(cipher.length - 16);
  const dec = nodeCrypto.createDecipheriv('aes-128-gcm', cek, nonce);
  dec.setAuthTag(tag);
  const plain = Buffer.concat([dec.update(cipher.subarray(0, cipher.length - 16)), dec.final()]);
  /* delimitador del último registro: 0x02, seguido sólo de ceros de padding */
  let fin = plain.length - 1;
  while(fin >= 0 && plain[fin] === 0) fin--;
  if(plain[fin] !== 2) throw new Error('falta el delimitador 0x02');
  return { rs, idlen, text: plain.subarray(0, fin).toString('utf8') };
}

function b64u(buf){ return Buffer.from(buf).toString('base64url'); }

function suscriptor(){
  const ecdh = nodeCrypto.createECDH('prime256v1'); ecdh.generateKeys();
  const auth = nodeCrypto.randomBytes(16);
  return { ecdh, auth, sub: { endpoint:'https://fcm.googleapis.com/fcm/send/abc123', p256dh:b64u(ecdh.getPublicKey()), auth:b64u(auth) } };
}

module.exports = function(){
  describe('Web Push: cifrado RFC 8291', function(){
    it('el navegador descifra exactamente lo que se mandó', async function(){
      const F = cargarFuncion();
      const s = suscriptor();
      const msg = JSON.stringify({ title:'Hoy toca entrenar', body:'Sesión de Fuerza. Y tus Abrahangs.', tag:'cc-x' });
      const body = Buffer.from(await F.encryptPayload(msg, s.sub.p256dh, s.sub.auth));
      const r = descifrar(body, s.ecdh, s.auth);
      expect(r.text).toBe(msg);
      expect(r.rs).toBe(4096);
      expect(r.idlen).toBe(65);
    });

    it('con otra clave de dispositivo NO se descifra (no es texto plano disfrazado)', async function(){
      const F = cargarFuncion();
      const s = suscriptor(), otro = suscriptor();
      const body = Buffer.from(await F.encryptPayload('secreto', s.sub.p256dh, s.sub.auth));
      let fallo = false;
      try { descifrar(body, otro.ecdh, s.auth); } catch(e){ fallo = true; }
      expect(fallo).toBe(true);
    });

    it('cada envío usa sal y clave efímera nuevas', async function(){
      const F = cargarFuncion();
      const s = suscriptor();
      const a = Buffer.from(await F.encryptPayload('x', s.sub.p256dh, s.sub.auth));
      const b = Buffer.from(await F.encryptPayload('x', s.sub.p256dh, s.sub.auth));
      expect(a.subarray(0, 16).equals(b.subarray(0, 16))).toBe(false);
      expect(a.subarray(21, 86).equals(b.subarray(21, 86))).toBe(false);
    });

    it('los textos con tildes y eñes llegan intactos', async function(){
      const F = cargarFuncion();
      const s = suscriptor();
      const msg = '¡Mañana descansás! Acordate de los cuelgues suaves 🖐️';
      const body = Buffer.from(await F.encryptPayload(msg, s.sub.p256dh, s.sub.auth));
      expect(descifrar(body, s.ecdh, s.auth).text).toBe(msg);
    });
  });

  describe('Web Push: firma VAPID RFC 8292', function(){
    it('el JWT se verifica con la clave pública publicada', async function(){
      const F = cargarFuncion();
      const v = await F.generateVapid();
      const h = await F.vapidAuthHeader('https://fcm.googleapis.com/fcm/send/abc', v, 1700000000);
      const m = h.match(/^vapid t=([^,]+), k=(.+)$/);
      expect(!!m).toBe(true);
      expect(m[2]).toBe(v.publicKey);
      const [head, body, sig] = m[1].split('.');
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
      expect(claims.aud).toBe('https://fcm.googleapis.com');
      expect(claims.exp).toBe(1700000000 + 12 * 3600);
      expect(/^https:\/\//.test(claims.sub)).toBe(true);
      const pub = nodeCrypto.createPublicKey({ key: Object.assign({}, v.privateJwk, { d: undefined }), format: 'jwk' });
      const ok = nodeCrypto.verify('sha256', Buffer.from(head + '.' + body), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
      expect(ok).toBe(true);
    });

    it('la clave pública es un punto P-256 sin comprimir (65 bytes, 0x04)', async function(){
      const F = cargarFuncion();
      const v = await F.generateVapid();
      const raw = Buffer.from(v.publicKey, 'base64url');
      expect(raw.length).toBe(65);
      expect(raw[0]).toBe(4);
    });

    it('el JWT no lleva el email del usuario (sub es la URL de la app)', async function(){
      const F = cargarFuncion();
      const v = await F.generateVapid();
      const h = await F.vapidAuthHeader('https://web.push.apple.com/x', v);
      const claims = JSON.parse(Buffer.from(h.split('t=')[1].split('.')[1], 'base64url').toString());
      expect(String(claims.sub).indexOf('@')).toBe(-1);
    });
  });

  describe('Web Push: ciclo de envío contra una base falsa', function(){
    function baseFalsa(){
      const st = {
        vapid: [], reminders: [
          { id:1, user_id:'u1', tag:'t1', title:'Hoy toca entrenar', body:'Sesión de Fuerza.', sent_at:null },
          { id:2, user_id:'u2', tag:'t2', title:'Tus Abrahangs', body:'10 min.', sent_at:null }
        ],
        subs: [], patched: [], deleted: []
      };
      const q = async function(method, p, body){
        if(p.indexOf('push_vapid') === 0){
          if(method === 'POST'){ if(!st.vapid.length) st.vapid.push(body); return null; }
          return st.vapid.map(v => ({ public_key:v.public_key, private_jwk:v.private_jwk }));
        }
        if(p.indexOf('push_reminders') === 0){
          if(method === 'GET') return st.reminders.filter(r => !r.sent_at);
          if(method === 'PATCH'){ st.patched.push(p); st.reminders.forEach(r => { r.sent_at = body.sent_at; }); return null; }
          if(method === 'DELETE') return null;
        }
        if(p.indexOf('push_subscriptions') === 0){
          if(method === 'GET') return st.subs;
          if(method === 'DELETE'){ st.deleted.push(p); return null; }
        }
        throw new Error('ruta inesperada ' + method + ' ' + p);
      };
      return { st, q };
    }

    it('manda a cada dispositivo del usuario, marca enviados y borra las suscripciones muertas', async function(){
      const a = suscriptor(), b = suscriptor(), c = suscriptor();
      const llamadas = [];
      const F = cargarFuncion(async function(url, init){
        llamadas.push({ url, init });
        return { ok: url.indexOf('muerta') === -1, status: url.indexOf('muerta') === -1 ? 201 : 410 };
      });
      const { st, q } = baseFalsa();
      st.subs = [
        Object.assign({ id:10, user_id:'u1' }, a.sub),
        Object.assign({ id:11, user_id:'u1' }, b.sub, { endpoint:'https://fcm.googleapis.com/fcm/send/muerta' }),
        Object.assign({ id:12, user_id:'u2' }, c.sub, { endpoint:'https://web.push.apple.com/QGx' })
      ];
      const stats = await F.sendDue(q, Date.now());
      expect(stats.due).toBe(2);
      expect(stats.sent).toBe(2);
      expect(stats.gone).toBe(1);
      expect(llamadas.length).toBe(3);
      expect(st.patched.length).toBe(1);
      expect(st.deleted[0]).toContainText('11');
      /* lo que recibe el iPhone de u2 es SU recordatorio, no el de u1 */
      const alIphone = llamadas.filter(l => l.url.indexOf('apple') > -1)[0];
      expect(alIphone.init.headers['Content-Encoding']).toBe('aes128gcm');
      expect(alIphone.init.headers.Authorization.indexOf('vapid t=')).toBe(0);
      const txt = descifrar(Buffer.from(alIphone.init.body), c.ecdh, c.auth).text;
      expect(JSON.parse(txt).title).toBe('Tus Abrahangs');
    });

    it('una segunda pasada no reenvía nada', async function(){
      const a = suscriptor();
      let n = 0;
      const F = cargarFuncion(async function(){ n++; return { ok:true, status:201 }; });
      const { st, q } = baseFalsa();
      st.subs = [Object.assign({ id:10, user_id:'u1' }, a.sub), Object.assign({ id:12, user_id:'u2' }, suscriptor().sub)];
      await F.sendDue(q, Date.now());
      const antes = n;
      const stats = await F.sendDue(q, Date.now());
      expect(stats.due).toBe(0);
      expect(n).toBe(antes);
    });

    it('la clave VAPID se genera una sola vez y después se reusa', async function(){
      const F = cargarFuncion(async function(){ return { ok:true, status:201 }; });
      const { st, q } = baseFalsa();
      const v1 = await F.loadVapid(q);
      const v2 = await F.loadVapid(q);
      expect(st.vapid.length).toBe(1);
      expect(v1.publicKey).toBe(v2.publicKey);
    });
  });
};
