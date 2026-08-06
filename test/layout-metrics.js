/* ====================================================
   test/layout-metrics.js -- medición de layout sin navegador
   ClimbCycle

   El harness testea lógica, no pintura. Pero dos bugs reales fueron de
   ANCHO, no de lógica: (1) un chip con `flex:none` que llevaba un texto
   de 74 chars se comió la fila y partió el nombre del ejercicio letra por
   letra; (2) la nav de 6 items repartía ~60px por botón y "Calendario"
   no entraba. Ninguno lo agarra un test de view-model.

   Esto modela lo mínimo de CSS flexbox para cazar esa clase de bug:
   dado el HTML generado, estima el ancho de cada celda y detecta filas
   que no entran en un móvil de 390px.

   Es una ESTIMACIÓN (±8%): sin navegador no hay anchos exactos. Por eso
   `MARGEN` exige un 10% de aire antes de dar una fila por buena — es
   preferible avisar de más que dejar pasar el caso de la nav, que medía
   57px contra una cuota de 58px y aun así rompió en el teléfono.
==================================================== */

/* ── 1. Métrica de texto ──────────────────────────────────
   Anchos medios por carácter, relativos al font-size, medidos
   sobre las 3 familias que usa la app. Aproximados a propósito:
   sirven para detectar desbordes groseros, no para pixel-perfect. */
const NARROW = 'iljtfIr.,:;\'"|!()[]{}-';   /* glifos angostos */
const WIDE   = 'mwMW@%';                    /* glifos anchos */

/* La métrica es una estimación (±8%): sin navegador no hay anchos exactos.
   Por eso una celda que "entra por poco" también se reporta — la nav de 6
   items medía 57px contra una cuota de 58px y ROMPIÓ en el teléfono real.
   Fingir precisión acá sería peor que avisar de más. */
const MARGEN = 1.10;   /* pedile 10% más de lo estimado antes de darlo por bueno */

function charW(ch, family){
  if(family === 'mono') return 0.6;                       /* JetBrains Mono: monoespaciada */
  const base = family === 'cond' ? 0.44 : 0.52;           /* Barlow Condensed / sans */
  if(NARROW.indexOf(ch) > -1) return base * 0.45;
  if(WIDE.indexOf(ch) > -1)   return base * 1.5;
  if(ch === ' ')              return base * 0.55;
  if(ch >= '0' && ch <= '9')  return base * 1.02;
  if(ch >= 'A' && ch <= 'Z')  return base * 1.15;
  return base;
}

function textWidth(txt, size, family, letterSpacing){
  let w = 0;
  for(const ch of txt) w += charW(ch, family) * size;
  return w + (letterSpacing || 0) * txt.length;
}

/* Ancho MÍNIMO intrínseco: si el texto puede envolver, el mínimo es
   la palabra más larga; si es nowrap, es el texto entero. */
function minIntrinsic(txt, size, family, ls, nowrap){
  if(nowrap) return textWidth(txt, size, family, ls);
  return txt.split(/\s+/).reduce((mx, w) => Math.max(mx, textWidth(w, size, family, ls)), 0);
}

/* ── 3. Parser de HTML mínimo (suficiente para nuestro markup) ── */
function parse(html){
  const root = { tag:'root', style:'', children:[], text:'' };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while((m = re.exec(html))){
    if(m[5] !== undefined){
      const t = m[5].replace(/&[a-zA-Z]+;|&#x?[0-9A-Fa-f]+;/g, 'x').trim();
      if(t) stack[stack.length-1].children.push({ tag:'#text', text:t, style:'', children:[] });
      continue;
    }
    const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3] || '', self = m[4] === '/';
    if(close){ if(stack.length > 1) stack.pop(); continue; }
    const sm = /style\s*=\s*"([^"]*)"/.exec(attrs);
    const node = { tag, style: sm ? sm[1] : '', attrs, children:[], text:'' };
    stack[stack.length-1].children.push(node);
    const VOID = ['br','img','input','hr','meta','link','path','circle','rect','line','stop'];
    if(!self && VOID.indexOf(tag) === -1) stack.push(node);
  }
  return root;
}

function css(style, prop){
  const re = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)', 'i');
  const m = re.exec(style || '');
  return m ? m[1].trim() : null;
}
function px(v, dflt){ if(!v) return dflt; const m = /(-?[\d.]+)px/.exec(v); return m ? parseFloat(m[1]) : dflt; }

function fontFamily(style, inherited){
  const f = css(style, 'font-family');
  if(!f) return inherited;
  if(/Mono/i.test(f)) return 'mono';
  if(/Condensed/i.test(f)) return 'cond';
  return 'sans';
}

/* ¿Este hijo puede encogerse por debajo de su contenido?
   `flex:none` / `flex:0 0 auto` / `flex-shrink:0` ⇒ ancho = max-content,
   es decir el texto ENTERO, no la palabra más larga. Éste fue exactamente
   el bug del chip con SYS_HUMAN: no encogía y se comía la fila. */
function noShrink(style){
  const f = css(style, 'flex');
  if(f){
    if(/^none\b/.test(f)) return true;
    const parts = f.split(/\s+/);
    if(parts.length >= 2 && parseFloat(parts[1]) === 0) return true;   /* flex-shrink 0 */
  }
  return px(css(style,'flex-shrink'), null) === 0 || css(style,'flex-shrink') === '0';
}

/* ¿Es una celda de reparto equitativo (`flex:1`)? Todas las hermanas con
   flex:1 reciben el MISMO ancho: el sobrante de una corta no ayuda a una
   larga. Ése fue el bug de la nav de 6 items. */
function equalShare(style){
  const f = css(style, 'flex');
  if(!f) return false;
  if(/^1\b/.test(f)){
    const parts = f.split(/\s+/);
    /* flex:1 y flex:1 1 0 reparten parejo; flex:1 1 auto parte del contenido */
    return parts.length < 3 || /^0/.test(parts[2]);
  }
  return false;
}

/* Mide un nodo devolviendo DOS números, porque son cosas distintas:
     · floor   — lo que la celda le quita sí o sí a la fila (0 si puede colapsar)
     · content — el ancho por debajo del cual el texto se parte feo
                 (la palabra más larga, o el texto entero si no puede encoger)
   Distinguirlos importa: una celda con `min-width:0` NO desborda la fila
   (floor 0) pero igual se rompe si le queda menos que su `content`. Ése fue
   el bug del nombre partido letra por letra: la fila "entraba". */
function nodeMin(node, ctx){
  const st = node.style || '';
  const size = px(css(st,'font-size'), ctx.size);
  const fam = fontFamily(st, ctx.fam);
  const ls = px(css(st,'letter-spacing'), ctx.ls);
  const rigido = noShrink(st);
  const nowrap = /nowrap/.test(css(st,'white-space') || '') || ctx.nowrap || rigido;
  const padL = px(css(st,'padding-left'), 0), padR = px(css(st,'padding-right'), 0);
  let padX = padL + padR;
  const pad = css(st,'padding');
  if(pad){ const p = pad.split(/\s+/).map(x=>px(x,0)); padX += (p.length>1 ? p[1] : p[0]) * 2; }

  const kid = { size, fam, ls, nowrap };

  const disp = css(st,'display') || '';
  let content = 0;
  if(/flex/.test(disp)){
    content = rowMin(node, kid).total;
  } else {
    for(const c of node.children){
      const w = c.tag === '#text'
        ? minIntrinsic(c.text, size, fam, ls, nowrap)
        : nodeMin(c, kid).content;
      content = Math.max(content, w);   /* bloque: manda el hijo más ancho */
    }
  }
  content += padX;

  const explicitW = px(css(st,'width'), null);
  if(explicitW !== null && !/100%/.test(css(st,'width') || '')) content = Math.max(content, explicitW);

  /* ¿Puede colapsar? Sólo si lo declara (`min-width:0`) y no es rígida. */
  const mw = css(st,'min-width');
  const colapsa = (mw === '0' || mw === '0px') && !rigido;
  const floor = colapsa ? Math.min(content, padX) : content;

  return { floor, content, colapsa, rigido, kid };
}

/* Mínimos de una fila flex + gaps. */
function rowMin(node, ctx){
  const gap = px(css(node.style,'gap'), 0);
  const kids = node.children.filter(c => c.tag !== '#text' || c.text);
  let total = 0; const parts = [];
  for(const c of kids){
    let m;
    if(c.tag === '#text'){
      const w = minIntrinsic(c.text, ctx.size, ctx.fam, ctx.ls, ctx.nowrap);
      m = { floor:w, content:w, colapsa:false, rigido:false };
    } else {
      m = nodeMin(c, ctx);
    }
    parts.push({ node:c, w:m.floor, content:m.content, colapsa:m.colapsa });
    total += m.floor;
  }
  if(kids.length > 1) total += gap * (kids.length - 1);
  return { total, parts, gap };
}

/* Recorre el árbol buscando filas flex que no entren. */
function scanRow(node, avail, ctx, out, pathStr){
  const st = node.style || '';
  const size = px(css(st,'font-size'), ctx.size);
  const fam = fontFamily(st, ctx.fam);
  const ls = px(css(st,'letter-spacing'), ctx.ls);
  const kid = { size, fam, ls, nowrap: /nowrap/.test(css(st,'white-space')||'') || ctx.nowrap };

  const pad = css(st,'padding');
  let padX = 0;
  if(pad){ const p = pad.split(/\s+/).map(x=>px(x,0)); padX = (p.length>1 ? p[1] : p[0]) * 2; }
  padX += px(css(st,'padding-left'),0) + px(css(st,'padding-right'),0);
  const bl = px(css(st,'border-left'),0) + px(css(st,'border-right'),0);
  const inner = avail - padX - bl;

  const disp = css(st,'display') || '';
  const wrap = /wrap/.test(css(st,'flex-wrap')||'') || /flex-wrap:\s*wrap/.test(st);
  /* Una fila con scroll horizontal declarado NO desborda: se desplaza.
     Es un patrón deliberado (barras de filtros, chips). */
  const scrollX = /auto|scroll/.test(css(st,'overflow-x') || '')
               || /auto|scroll/.test(css(st,'overflow') || '');
  if(/flex/.test(disp) && !/column/.test(css(st,'flex-direction')||'') && !wrap && !scrollX){
    const r = rowMin(node, kid);
    const gaps = r.gap * Math.max(0, r.parts.length - 1);

    /* (a) DESBORDE: ni encogiendo todo lo encogible entra la fila. */
    if(r.total * MARGEN > inner){
      out.push({ path:pathStr, need:Math.round(r.total), have:Math.round(inner), kind:'desborde',
                 parts:r.parts.map(p => ({ w:Math.round(p.w), snippet:snippet(p.node) })) });
    }
    /* (b) APLASTADA: la fila "entra" sólo porque una celda colapsó, y lo que
           le queda es menos que su palabra más larga → texto partido. */
    else {
      const flexibles = r.parts.filter(p => p.colapsa);
      if(flexibles.length){
        const fijos = r.parts.filter(p => !p.colapsa).reduce((s,p) => s + p.w, 0);
        const libre = inner - fijos - gaps;
        const cuota = libre / flexibles.length;
        const rotas = flexibles.filter(p => p.content * MARGEN > cuota);
        if(rotas.length){
          out.push({ path:pathStr, need:Math.round(Math.max(...rotas.map(p => p.content))),
                     have:Math.round(cuota), kind:'aplastada',
                     parts:r.parts.map(p => ({ w:Math.round(p.colapsa ? p.content : p.w),
                                               snippet:(p.colapsa?'[encoge] ':'[rígida] ') + snippet(p.node) })) });
        }
      }
      /* (c) CUOTA: celdas `flex:1` reparten parejo — el sobrante de una corta
             no se le presta a una larga (bug de la nav de 6 items). */
      const eq = r.parts.filter(p => p.node.tag !== '#text' && equalShare(p.node.style));
      if(eq.length > 1){
        const fijos = r.parts.filter(p => eq.indexOf(p) === -1).reduce((s,p) => s + p.w, 0);
        const cuota = (inner - fijos - gaps) / eq.length;
        const apretadas = eq.filter(p => p.content * MARGEN > cuota);
        if(apretadas.length){
          out.push({ path:pathStr, need:Math.round(Math.max(...apretadas.map(p => p.content))),
                     have:Math.round(cuota), kind:'cuota',
                     parts:apretadas.map(p => ({ w:Math.round(p.content), snippet:snippet(p.node) })) });
        }
      }
    }
  }
  for(let i=0;i<node.children.length;i++){
    const c = node.children[i];
    if(c.tag === '#text') continue;
    scanRow(c, inner, kid, out, pathStr + '>' + c.tag + (i?('['+i+']'):''));
  }
}

function snippet(node){
  if(node.tag === '#text') return JSON.stringify(node.text.slice(0,40));
  let t = '';
  (function walk(n){ for(const c of n.children){ if(c.tag==='#text') t += c.text + ' '; else walk(c); } })(node);
  return '<' + node.tag + '> ' + JSON.stringify(t.trim().slice(0,44));
}


const VIEWPORT = 390;
const PAGE_PAD = 14 * 2;         /* padding lateral del contenedor de página */
const AVAIL = VIEWPORT - PAGE_PAD;

/* API principal: dado un fragmento de HTML, devuelve las filas que NO entran
   en un móvil de 390px. Array vacío = el fragmento entra.
   `avail` permite auditar contenedores más angostos (columnas, modales). */
function findOverflows(html, avail){
  if(!html || !html.trim()) return [];
  const out = [];
  scanRow(parse(html), (avail || AVAIL), { size:13, fam:'sans', ls:0, nowrap:false }, out, '');
  return out;
}

/* Render legible de un hallazgo, para el mensaje de fallo del test. */
function describeOverflow(o){
  return '(' + o.kind + ') necesita ' + o.need + 'px pero hay ' + o.have + 'px'
    + ' @ ' + (o.path || 'raíz') + '\n'
    + o.parts.map(p => '        ' + String(p.w).padStart(4) + 'px  ' + p.snippet).join('\n');
}

module.exports = { findOverflows, describeOverflow,
                   parse, scanRow, rowMin, nodeMin, textWidth, minIntrinsic,
                   snippet, css, VIEWPORT, PAGE_PAD, AVAIL, MARGEN };
