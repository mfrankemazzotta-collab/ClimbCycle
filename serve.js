/* ====================================================
   serve.js -- servidor estático para desarrollo y QA
   ClimbCycle

   POR QUÉ EXISTE. Abrir `index.html` con doble clic (protocolo `file://`)
   NO sirve para probar esta app: el Service Worker sólo se registra sobre
   `https://` o `localhost`, así que la PWA, el caché offline y todo lo que
   dependa de ellos quedan fuera. Y la versión publicada en GitHub Pages
   tampoco sirve para el QA del vault: `js/sync-config.js` está git-ignored
   (lleva credenciales), así que allá el feature flag no existe y la sección
   de cifrado no puede aparecer nunca.

   Queda entonces un único camino honesto para el QA: servir la carpeta en
   localhost. Esto lo hace sin dependencias — Node puro, nada que instalar,
   nada que descargar.

   VENTAJA COLATERAL, Y NO ES MENOR: `localhost:8080` es un ORIGEN DISTINTO
   de `mfrankemazzotta-collab.github.io`, y `localStorage` está separado por
   origen. Los datos con los que hagas el QA no son los de la app publicada:
   podés romper todo acá sin tocar tu historial real. Es exactamente el
   "hacelo con datos de prueba" que pide QA_VAULT.md, garantizado por el
   navegador en vez de por tu memoria.

   Uso:  npm run dev      → http://localhost:8080
         npm run dev 3000 → otro puerto
==================================================== */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

/* IPs de red local (para entrar desde el celu). Se filtran las internas y
   las IPv6, que no sirven para tipear en un teléfono. */
function ipsLocales(){
  const out = [];
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function(nombre){
    (ifaces[nombre] || []).forEach(function(i){
      if(i.family === 'IPv4' && !i.internal) out.push({ nombre: nombre, ip: i.address });
    });
  });
  return out;
}

const RAIZ   = __dirname;
const PUERTO = parseInt(process.argv[2], 10) || 8080;

const TIPOS = {
  '.html':'text/html; charset=utf-8',
  '.js':  'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest':'application/manifest+json'
};

const servidor = http.createServer(function(req, res){
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if(ruta === '/') ruta = '/index.html';

  /* Nada de subir por encima de la carpeta del proyecto. */
  const destino = path.join(RAIZ, path.normalize(ruta).replace(/^(\.\.[/\\])+/, ''));
  if(!destino.startsWith(RAIZ)){
    res.writeHead(403); res.end('403'); return;
  }

  fs.readFile(destino, function(err, buf){
    if(err){
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
      res.end('404 — no existe: ' + ruta);
      return;
    }
    /* SIN CACHÉ, a propósito. Durante un QA, que el navegador te sirva un
       script viejo convierte cualquier prueba en una pérdida de tiempo:
       arreglás algo, recargás, y seguís viendo el bug de antes. El Service
       Worker igual cachea por su cuenta — para eso está el Ctrl+Shift+R de
       la guía. */
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate'
    });
    res.end(buf);
  });
});

servidor.listen(PUERTO, function(){
  const cfg = path.join(RAIZ, 'js', 'sync-config.js');
  const hayCfg = fs.existsSync(cfg);
  const txt = hayCfg ? fs.readFileSync(cfg, 'utf8') : '';
  /* Sólo cuentan las asignaciones ACTIVAS: una línea comentada con `//` no
     configura nada. La primera versión miraba el archivo entero con una
     regex y decía "sync CONFIGURADO" aunque el usuario ya hubiera comentado
     las dos líneas — el aviso mentía justo cuando le habías hecho caso. */
  const activas = txt.split('\n')
    .filter(function(l){ return !/^\s*(\/\/|\/\*|\*)/.test(l); })
    .join('\n');
  const vault = /CC_VAULT_ENABLED\s*=\s*true/.test(activas);
  const sync  = /CC_SUPABASE_URL\s*=\s*['"](?!TU_PROJECT_URL)[^'"]+['"]/.test(activas);

  console.log('');
  console.log('  ClimbCycle sirviéndose en  →  http://localhost:' + PUERTO);
  console.log('');
  console.log('  config local (js/sync-config.js): ' + (hayCfg ? 'presente' : 'NO EXISTE'));
  console.log('    vault (cifrado en reposo): ' + (vault ? 'ENCENDIDO' : 'apagado'));
  console.log('    sync con Supabase:         ' + (sync  ? 'CONFIGURADO' : 'sin configurar (app offline)'));
  if(vault && sync){
    console.log('');
    console.log('  ⚠ Tenés vault Y sync activos a la vez. Para el QA conviene uno por vez:');
    console.log('    si algo falla, no vas a saber cuál de los dos fue.');
  }
  console.log('');
  console.log('  Tus datos acá son INDEPENDIENTES de los de GitHub Pages');
  console.log('  (otro origen = otro localStorage). Probá tranquilo.');
  console.log('');
  const ips = ipsLocales();
  console.log('  ── Para probar en el celu (Android) ──────────────');
  if(ips.length){
    ips.forEach(function(i){
      console.log('    http://' + i.ip + ':' + PUERTO + '   (' + i.nombre + ')');
    });
  } else {
    console.log('    (no encontré una IP de red local: ¿estás sin WiFi?)');
  }
  console.log('');
  console.log('  Esa dirección abre la app, PERO el cifrado no va a andar:');
  console.log('  sobre http:// sin localhost el navegador bloquea WebCrypto.');
  console.log('  Para que ande, en el CELU una sola vez:');
  console.log('    1. Chrome → chrome://flags');
  console.log('    2. Buscá: insecure origins');
  console.log('    3. En "Insecure origins treated as secure" pegá:');
  if(ips.length) console.log('         http://' + ips[0].ip + ':' + PUERTO);
  console.log('    4. Ponelo en Enabled y reiniciá Chrome cuando te lo pida.');
  console.log('');
  console.log('  Si no carga NADA, casi seguro es el Firewall de Windows.');
  console.log('  En PowerShell como administrador, una sola vez:');
  console.log('    New-NetFirewallRule -DisplayName "ClimbCycle dev" `');
  console.log('      -Direction Inbound -LocalPort ' + PUERTO + ' -Protocol TCP -Action Allow');
  console.log('');
  console.log('  Ctrl+C para cortar.');
  console.log('');
});

servidor.on('error', function(e){
  if(e.code === 'EADDRINUSE'){
    console.error('\n  El puerto ' + PUERTO + ' está ocupado. Probá:  npm run dev 3000\n');
    process.exit(1);
  }
  throw e;
});
