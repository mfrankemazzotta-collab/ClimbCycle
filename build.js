#!/usr/bin/env node
/* ====================================================
   build.js -- empaqueta ClimbCycle para producción
   ClimbCycle

   QUÉ RESUELVE
   La app carga 45 `<script src>` en orden implícito, con cache-busting a
   mano (`?v=20260725b`). Eso ya causó un bug real: el usuario veía versiones
   viejas porque alguien se olvidó de tocar el `?v=`. Este build genera UN
   archivo con hash de contenido, así el navegador no puede servir código
   viejo aunque quiera.

   POR QUÉ NO ES UN BUNDLER "DE VERDAD"
   El proyecto no usa ESM: son scripts que comparten variables globales y el
   HTML los llama por `onclick="markSess(...)"`. Bundlear en el sentido
   habitual (resolver imports, envolver en IIFE) ROMPERÍA todo: verificado
   que `--format=iife` deja el archivo vacío, y una IIFE sacaría del scope
   global justo las funciones que el HTML necesita.

   Entonces el build hace lo único correcto para esta arquitectura:
     1. lee el ORDEN REAL de <script src> del index.html (única fuente de
        verdad; nada de listas duplicadas que se desincronizan)
     2. concatena en ese orden, separando con `;` por si algún archivo
        termina sin punto y coma (ASI puede unir dos líneas y romperlas)
     3. minifica con esbuild SIN bundle → preserva los identificadores de
        nivel superior, renombra sólo los internos
     4. nombra el resultado por hash de contenido → cache-busting automático
     5. escribe dist/ SIN tocar los fuentes: el index.html de desarrollo
        sigue funcionando igual

   Uso:  node build.js        (o: npm run build)
   Salida: dist/index.html + dist/app.<hash>.js + dist/app.<hash>.css + assets
==================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = __dirname;
const DIST = path.join(RAIZ, 'dist');

/* esbuild se usa como MÓDULO, no como binario. Invocar
   `node_modules/.bin/esbuild` funciona en Linux/Mac pero falla en Windows
   con ENOENT: ahí el ejecutable se llama `esbuild.cmd`, y spawn no resuelve
   la extensión solo. El API de Node es multiplataforma y además evita el
   costo de levantar un proceso por cada archivo. */
let esbuild = null;
try { esbuild = require('esbuild'); } catch(e){ /* se avisa abajo */ }

/* Scripts que pueden NO existir en un clone limpio: son configuración local
   y están git-ignored. Su ausencia es normal, no un error de build. */
const ES_OPCIONAL = /sync-config\.js$/;

function hash8(txt){
  return crypto.createHash('sha256').update(txt).digest('hex').slice(0, 8);
}

/* El index.html manda: si alguien agrega un script, el build se entera solo. */
function leerOrdenDeScripts(html){
  return [...html.matchAll(/<script\s+src="([^"]+)"[^>]*><\/script>/g)]
    .map(m => ({ tag: m[0], src: m[1].split('?')[0] }));
}

function main(){
  const htmlPath = path.join(RAIZ, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = leerOrdenDeScripts(html);

  if(!scripts.length){ console.error('No se encontró ningún <script src> en index.html'); process.exit(1); }

  /* ── 1. Concatenar en el orden del HTML ── */
  let bundle = '';
  let faltantes = [];
  let omitidos = [];
  for(const s of scripts){
    const p = path.join(RAIZ, s.src);
    if(!fs.existsSync(p)){
      /* `sync-config.js` es configuración LOCAL y está git-ignored: en un
         clone limpio (o en CI) no existe, y eso es correcto, no un error.
         La app ya tolera su ausencia — sync y Sentry leen `window.CC_*` con
         un fallback y quedan apagados. Tratarlo como fatal rompía el build
         en CI, que es donde más falta hace que funcione. */
      if(ES_OPCIONAL.test(s.src)) omitidos.push(s.src);
      else faltantes.push(s.src);
      continue;
    }
    /* El `;\n` no es cosmético: sin él, un archivo que termina sin punto y
       coma se pega con el siguiente y el parser los une en una sola
       expresión. */
    bundle += '/* ' + s.src + ' */\n' + fs.readFileSync(p, 'utf8') + '\n;\n';
  }
  if(faltantes.length){
    console.error('Faltan archivos referenciados por index.html:\n  ' + faltantes.join('\n  '));
    process.exit(1);
  }

  fs.mkdirSync(DIST, { recursive: true });

  /* ── 2. Minificar (sin bundle: preserva los globales) ── */
  if(!esbuild){
    console.error('Falta esbuild. Corré `npm install` en la carpeta ClimbCycle.');
    process.exit(1);
  }
  let minificado;
  try {
    minificado = esbuild.transformSync(bundle, {
      minify: true, loader: 'js', charset: 'utf8'
    }).code;
  } catch(e){
    console.error('esbuild no pudo minificar:\n' + (e.message || e));
    process.exit(1);
  }

  /* ── 3. CSS: mismo tratamiento ── */
  const cssRel = (html.match(/href="(css\/[^"?]+)/) || [])[1] || 'css/app.css';
  const cssCrudo = fs.readFileSync(path.join(RAIZ, cssRel), 'utf8');
  let cssMin;
  try {
    cssMin = esbuild.transformSync(cssCrudo, {
      minify: true, loader: 'css', charset: 'utf8'
    }).code;
  } catch(e){ cssMin = cssCrudo; }

  /* ── 4. Hash de contenido = cache-busting que no depende de nadie ── */
  const jsName  = 'app.' + hash8(minificado) + '.js';
  const cssName = 'app.' + hash8(cssMin) + '.css';
  fs.writeFileSync(path.join(DIST, jsName), minificado);
  fs.writeFileSync(path.join(DIST, cssName), cssMin);

  /* ── 5. index.html de producción ── */
  let out = html;
  /* el primer <script src> pasa a ser el bundle; los demás desaparecen */
  let primero = true;
  for(const s of scripts){
    out = out.replace(s.tag, primero ? '<script src="' + jsName + '"></script>' : '');
    primero = false;
  }
  out = out.replace(/href="css\/[^"]+"/, 'href="' + cssName + '"');
  /* limpia las líneas que quedaron vacías al sacar los <script> */
  out = out.replace(/\n\s*\n(\s*\n)+/g, '\n\n');
  fs.writeFileSync(path.join(DIST, 'index.html'), out);

  /* ── 6. Assets que la app necesita tal cual ── */
  const assets = ['manifest.json', 'icon.svg', 'icon-192.png',
                  'icon-512.png', 'icon-maskable.png'];
  let copiados = 0;
  for(const a of assets){
    const src = path.join(RAIZ, a);
    if(fs.existsSync(src)){ fs.copyFileSync(src, path.join(DIST, a)); copiados++; }
  }

  /* ── 7. Service worker: hay que reescribirlo, no copiarlo ──
     Su SHELL lista `./css/app.css`, que en dist NO existe (ahora se llama
     app.<hash>.css): quedaría sin estilos offline. Y el nombre del caché se
     bumpea A MANO (`climbcycle-v29`) — exactamente el mismo problema de
     cache-busting manual que este build vino a resolver. Se deriva del hash
     del contenido, así que se invalida solo cuando el código cambia. */
  const swPath = path.join(RAIZ, 'sw.js');
  if(fs.existsSync(swPath)){
    let sw = fs.readFileSync(swPath, 'utf8');
    const cacheId = 'climbcycle-' + hash8(minificado + cssMin);
    sw = sw.replace(/var CACHE = '[^']*'/, "var CACHE = '" + cacheId + "'");
    sw = sw.replace(/var SHELL = \[[^\]]*\]/,
      "var SHELL = ['./', './index.html', './manifest.json', './icon.svg', "
      + "'./" + cssName + "', './" + jsName + "']");
    fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
    copiados++;
  }

  /* ── Limpieza de residuos ──
     dist/ tiene que contener SÓLO lo que este build genera. Un bundle viejo
     con otro hash, o un temporal de una corrida que falló, se serviría junto
     con lo nuevo y sumaría peso muerto (o serviría código viejo si alguien
     lo referencia).

     Se borra sólo lo que este build RECONOCE COMO PROPIO: nombres con la
     forma `app.<hash>.js|css` y el temporal `_bundle.raw.js`. Cualquier otra
     cosa se avisa y se deja quieta — borrar a ciegas un directorio de salida
     es una forma conocida de perder archivos que alguien puso a mano. */
  const esperados = new Set([jsName, cssName, 'index.html', 'sw.js'].concat(assets));
  const MIO = /^(app\.[a-f0-9]{8}\.(js|css)|_bundle\.raw\.js)$/;
  const sobran = fs.readdirSync(DIST).filter(f => !esperados.has(f));
  const borrados = [], ajenos = [], noSePudo = [];
  sobran.forEach(function(f){
    if(!MIO.test(f)){ ajenos.push(f); return; }
    try { fs.unlinkSync(path.join(DIST, f)); borrados.push(f); }
    catch(e){ noSePudo.push(f); }
  });
  if(borrados.length){
    console.log('');
    console.log('  limpieza: ' + borrados.length + ' artefacto(s) viejo(s) borrado(s)');
  }
  if(noSePudo.length || ajenos.length){
    console.log('');
    console.log('  ⚠ dist/ tiene archivos que este build no generó:');
    noSePudo.concat(ajenos).forEach(f => console.log('      ' + f));
    console.log('    Borralos antes de publicar (bundles viejos o temporales).');
  }

  /* ── Reporte ── */
  const kb = n => (n / 1024).toFixed(1) + ' KB';
  const crudoJs = Buffer.byteLength(bundle);
  console.log('');
  console.log('  ' + scripts.length + ' scripts → 1 archivo');
  console.log('  JS   ' + kb(crudoJs).padStart(9) + ' → ' + kb(Buffer.byteLength(minificado)).padStart(9)
              + '   (' + Math.round((1 - minificado.length / crudoJs) * 100) + '% menos)');
  console.log('  CSS  ' + kb(Buffer.byteLength(cssCrudo)).padStart(9) + ' → ' + kb(Buffer.byteLength(cssMin)).padStart(9));
  console.log('  + ' + copiados + ' assets');
  if(omitidos.length){
    console.log('  (omitidos por no existir, es normal: ' + omitidos.join(', ') + ')');
  }
  console.log('');
  console.log('  dist/' + jsName);
  console.log('  dist/' + cssName);
  console.log('');
  console.log('  Los fuentes NO se tocaron: index.html sigue sirviendo para desarrollo.');
  console.log('');
}

main();
