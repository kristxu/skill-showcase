#!/usr/bin/env node
// Extracción del CSS de una web SIN navegador (SOLO LECTURA).
//
// Uso:  node extraer-css-url.js <fuente> [carpeta-salida] [más hojas .css…]
//
// <fuente> puede ser:
//  - una URL (https://…): descarga el HTML y sus hojas.
//  - una página guardada desde el navegador (archivo .html, "Guardar como → Página web completa"):
//    lee el HTML y las hojas de su carpeta _files (las que apunten a internet se descargan).
//  - una hoja .css (URL o archivo) o una carpeta con archivos .css: analiza solo esas hojas.
//    Se pueden añadir más hojas después de la carpeta de salida.
//
// Si la web bloquea la descarga (403, página de verificación antibots) o no devuelve hojas,
// lo dice en "aviso" y no analiza nada más: no intenta saltarse el bloqueo.
//
// Descarga el HTML y todas sus hojas de estilo, también las de otro dominio y las
// que llegan por @import, más los bloques <style> del HTML. Lo guarda todo en la carpeta de
// salida (html.html, css/NN-nombre.css) y escribe extraccion.json con, agregado y con usos:
//  hojas ........ hojas descargadas y las que fallaron
//  vars ......... variables CSS de :root por tipo (color, tamaño, fuente, sombra, tiempo, alias, otra)
//  temas ........ selectores que redefinen muchas variables (temas, "placas", modos por clase)
//  varsSinUso ... variables definidas que ninguna regla usa
//  tokenizacion . por categoría, declaraciones con var(--…) frente a valores a mano
//  literales .... valores a mano más usados por categoría, con selectores de ejemplo
//  colores ...... cada color (normalizado a hex) con usos en variables y a mano
//  declarado .... tamaños de fuente (evaluados a 1440 y 375 px si son fluidos), familias, pesos,
//                 interlineados, tracking, espaciados, radios, bordes, sombras, opacidades,
//                 z-index, duraciones y curvas
//  estilosTexto . combinaciones tamaño · peso · interlineado declaradas en la misma regla
//  paresMismaRegla  texto y fondo declarados en la misma regla, con su ratio
//  opacidadConTexto reglas con opacity < 1: pueden bajar el contraste de un texto
//  reglas ....... breakpoints, @font-face, prefers-reduced-motion, prefers-color-scheme,
//                 reglas de foco, !important, keyframes, unidades de font-size
//  a11y ......... meta viewport (zoom bloqueado) y tamaño base declarado
//  limitaciones . lo que no se puede saber sin pintar la página (va a "No comprobado")
//
// Necesita Node 18 o posterior (usa fetch). No necesita instalar nada.

const fs = require('fs');
const path = require('path');
let C = null; try { C = require('./contraste.js'); } catch (e) { /* sin ratios */ }

const { pathToFileURL, fileURLToPath } = require('url');
const [, , URL_IN, OUT = 'extraccion-css', ...EXTRAS] = process.argv;
if (!URL_IN) { console.error('Uso: node extraer-css-url.js <url | pagina.html | hoja.css | carpeta-con-css> [carpeta-salida] [más hojas .css…]'); process.exit(1); }
const aURL = (x) => (/^(https?|file):/i.test(x) ? x : pathToFileURL(path.resolve(x)).href);
const UA = 'Mozilla/5.0 (compatible; auditoria-css/1.0)';
const ANCHOS = [1440, 375];

// ---------- utilidades ----------
const inc = (o, k, by = 1) => { if (k === undefined || k === null || k === '') return; o[k] = (o[k] || 0) + by; };
const top = (o, n = 40) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
const ej = (o, k, sel, n = 2) => { const a = (o[k] ||= []); if (a.length < n && !a.includes(sel)) a.push(sel.slice(0, 80)); };
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attrs = (tag) => { const o = {}; for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) o[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? ''); return o; };
const get = async (u) => {
  if (/^file:/i.test(u)) { const p = fileURLToPath(u.split('?')[0].split('#')[0]); const ok = fs.existsSync(p) && fs.statSync(p).isFile();
    return { status: ok ? 200 : 404, url: u, text: ok ? fs.readFileSync(p, 'utf8') : '', tipo: /\.html?$/i.test(p) ? 'text/html' : 'text/css' }; }
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8', Accept: '*/*' }, redirect: 'follow' });
  return { status: r.status, url: r.url, text: await r.text(), tipo: r.headers.get('content-type') || '' };
};

// ---------- colores ----------
const NOMBRES = { white: '#FFFFFF', black: '#000000', red: '#FF0000', gray: '#808080', grey: '#808080', yellow: '#FFFF00', blue: '#0000FF', green: '#008000', orange: '#FFA500', silver: '#C0C0C0', navy: '#000080', purple: '#800080' };
const h2 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0').toUpperCase();
const hsl2rgb = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
const normColor = (raw) => {
  let v = raw.trim().toLowerCase();
  if (NOMBRES[v]) return NOMBRES[v];
  if (v[0] === '#') {
    v = v.slice(1);
    if (v.length === 3 || v.length === 4) v = [...v].map((c) => c + c).join('');
    if (v.length !== 6 && v.length !== 8) return null;
    if (v.length === 8 && v.endsWith('ff')) v = v.slice(0, 6);
    if (v.length === 8 && v.endsWith('00')) return null; // totalmente transparente
    return '#' + v.toUpperCase();
  }
  const m = v.match(/^(rgba?|hsla?)\(([^)]*)\)$/); if (!m) return null;
  const p = m[2].split(/[\s,\/]+/).filter(Boolean);
  if (p.length < 3 || p.some((x) => /var|calc/.test(x))) return null;
  const num = (x, max) => (x.endsWith('%') ? (parseFloat(x) / 100) * max : parseFloat(x));
  let rgb = m[1].startsWith('rgb') ? p.slice(0, 3).map((x) => num(x, 255)) : hsl2rgb(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]));
  const a = p[3] !== undefined ? num(p[3], 1) : 1;
  if (a === 0 || rgb.some((x) => !Number.isFinite(x))) return null;
  return '#' + rgb.map(h2).join('') + (a < 1 ? h2(a * 255) : '');
};
const RE_COLOR = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|\b(?:white|black|red|gray|grey|yellow|blue|green|orange|silver|navy|purple)\b/g;
const sinVar = (v) => { let s = v, prev; do { prev = s; s = s.replace(/var\(--[\w-]+\s*(?:,[^()]*(?:\([^()]*\)[^()]*)*)?\)/g, ' '); } while (s !== prev); return s; };
const coloresEn = (v) => (v.match(RE_COLOR) || []).map(normColor).filter(Boolean);

// ---------- longitudes (para tamaños fluidos con clamp/min/max/calc) ----------
const evalLen = (s, vw) => {
  s = String(s).trim(); let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const args = () => { const a = [expr()]; ws(); while (s[i] === ',') { i++; a.push(expr()); ws(); } if (s[i] !== ')') throw 0; i++; return a; };
  const factor = () => {
    ws(); const f = s.slice(i).match(/^(clamp|min|max|calc)\(/i);
    if (f) { i += f[0].length; const a = args(); const n = f[1].toLowerCase(); return n === 'calc' ? a[0] : n === 'min' ? Math.min(...a) : n === 'max' ? Math.max(...a) : Math.min(Math.max(a[0], a[1]), a[2]); }
    if (s[i] === '(') { i++; const v = expr(); ws(); if (s[i] !== ')') throw 0; i++; return v; }
    const m = s.slice(i).match(/^-?[\d.]+(px|rem|em|vw|%)?/i); if (!m) throw 0; i += m[0].length;
    const x = parseFloat(m[0]); const u = (m[1] || '').toLowerCase();
    return u === 'rem' || u === 'em' ? x * 16 : u === 'vw' ? (x * vw) / 100 : u === '%' ? NaN : x;
  };
  const term = () => { let v = factor(); ws(); while (s[i] === '*' || s[i] === '/') { const op = s[i++]; const f = factor(); v = op === '*' ? v * f : v / f; ws(); } return v; };
  const expr = () => { let v = term(); ws(); while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const t = term(); v = op === '+' ? v + t : v - t; ws(); } return v; };
  try { const v = expr(); ws(); return i === s.length && Number.isFinite(v) ? Math.round(v * 100) / 100 : null; } catch (e) { return null; }
};

// ---------- parser de CSS (sin dependencias) ----------
const parseCSS = (css) => {
  css = css.replace(/\/\*[\s\S]*?\*\//g, ''); let i = 0; const n = css.length;
  const leerCuerpo = () => {
    const ini = i; let d = 0, q = null;
    while (i < n) { const c = css[i];
      if (q) { if (c === '\\') { i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; i++; continue; }
      if (c === '{') d++; else if (c === '}') { if (d === 0) { const b = css.slice(ini, i); i++; return b; } d--; }
      i++; }
    return css.slice(ini);
  };
  const bloque = () => {
    const items = [];
    while (i < n) {
      while (i < n && /\s/.test(css[i])) i++;
      if (i >= n) break;
      if (css[i] === '}') { i++; return items; }
      const ini = i; let par = 0, q = null;
      while (i < n) { const c = css[i];
        if (q) { if (c === '\\') { i += 2; continue; } if (c === q) q = null; i++; continue; }
        if (c === '"' || c === "'") { q = c; i++; continue; }
        if (c === '(') par++; else if (c === ')') par--; else if (par <= 0 && (c === '{' || c === ';' || c === '}')) break;
        i++; }
      const pre = css.slice(ini, i).trim();
      if (i >= n) { if (pre) items.push({ t: 'stmt', pre }); break; }
      if (css[i] === ';') { i++; if (pre) items.push({ t: 'stmt', pre }); continue; }
      if (css[i] === '}') { i++; if (pre) items.push({ t: 'stmt', pre }); return items; }
      i++;
      if (pre.startsWith('@')) {
        const nombre = (pre.match(/^@([\w-]+)/) || [, ''])[1].toLowerCase();
        if (['media', 'supports', 'layer', 'container', 'document', '-moz-document', 'scope', 'starting-style'].includes(nombre)) items.push({ t: 'at', nombre, pre, hijos: bloque() });
        else items.push({ t: 'at', nombre, pre, cuerpo: leerCuerpo() });
      } else items.push({ t: 'regla', sel: pre, cuerpo: leerCuerpo() });
    }
    return items;
  };
  return bloque();
};
const declaraciones = (cuerpo) => {
  const out = []; const anid = []; let ini = 0, par = 0, llave = 0, q = null;
  const cortar = (fin) => { const t = cuerpo.slice(ini, fin).trim(); ini = fin + 1; if (!t) return;
    if (t.includes('{')) { anid.push(t); return; }
    const k = t.indexOf(':'); if (k < 1) return;
    let v = t.slice(k + 1).trim(); const imp = /!\s*important\s*$/i.test(v); if (imp) v = v.replace(/!\s*important\s*$/i, '').trim();
    out.push({ prop: t.slice(0, k).trim().toLowerCase(), v, imp }); };
  for (let i = 0; i < cuerpo.length; i++) { const c = cuerpo[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '(') par++; else if (c === ')') par--; else if (c === '{') llave++;
    else if (c === '}') { llave--; if (llave === 0 && par <= 0) cortar(i); }
    else if (c === ';' && par <= 0 && llave === 0) cortar(i); }
  cortar(cuerpo.length);
  return { decl: out, anidadas: anid };
};

// ---------- clasificación ----------
const cat = (p) => /color|background|fill|stroke|border-color|outline-color|caret|accent/.test(p) && !/image|size|position|repeat|clip|origin|attachment|blend/.test(p) ? 'color'
  : p === 'font-size' ? 'tamaño de fuente' : /^(font-family|font-weight|line-height|letter-spacing)$/.test(p) ? 'tipografía'
  : /^(padding|margin|gap|row-gap|column-gap)/.test(p) ? 'espaciado' : /radius/.test(p) ? 'radio'
  : /shadow/.test(p) ? 'sombra' : p === 'z-index' ? 'z-index' : /^(transition|transition-duration|transition-timing-function|animation-duration|animation-timing-function)$/.test(p) ? 'movimiento' : null;
const tipoVar = (v) => /^var\(/.test(v) ? 'alias' : /^(#|rgb|hsl)/.test(v) ? 'color' : /^-?[\d.]+(px|rem|em|%|vw|vh)$|^(clamp|calc|min|max)\(/.test(v) ? 'tamaño'
  : /^-?[\d.]+m?s$/.test(v) ? 'tiempo' : /\d+px\s+-?\d+px|inset/.test(v) ? 'sombra' : /,|serif|sans|mono/.test(v) ? 'fuente' : 'otra';
const VACIO = /^(inherit|initial|unset|revert|transparent|none|auto|currentcolor|normal|0|0(px|rem|em|%|s|ms))$/i;
const aPx = (t) => { const m = t.match(/^(-?[\d.]+)(px|rem|em)$/); return m ? Math.round(parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16) * 100) / 100 : null; };

(async () => {
  fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
  const esCarpeta = !/^https?:/i.test(URL_IN) && fs.existsSync(URL_IN) && fs.statSync(URL_IN).isDirectory();
  const esCSS = /\.css(\?.*)?$/i.test(URL_IN);
  const modo = esCarpeta || esCSS ? 'hojas-css' : /^https?:/i.test(URL_IN) ? 'url' : 'pagina-guardada';
  const fuentes = []; // {origen, url?, css}
  let pag = { status: 200, url: aURL(URL_IN), text: '' };
  let aviso = null;
  if (modo === 'hojas-css') {
    const lista = esCarpeta ? fs.readdirSync(URL_IN, { recursive: true }).filter((f) => /\.css$/i.test(f)).map((f) => path.join(URL_IN, f)) : [URL_IN];
    for (const x of lista.concat(EXTRAS)) fuentes.push({ origen: 'link', url: aURL(x), media: '' });
  } else {
    try { pag = await get(aURL(URL_IN)); } catch (e) { pag = { status: 0, url: URL_IN, text: '', error: e.message }; }
    fs.writeFileSync(path.join(OUT, 'html.html'), pag.text);
    // Bloqueo: error HTTP o página de verificación antibots. No se intenta saltar.
    const firma = (pag.text.match(/datadome|captcha|cf-chl|challenge-platform|just a moment|access denied|perimeterx|px-captcha|incapsula|akamai bot/i) || [])[0];
    if (pag.status === 0) aviso = { tipo: 'sin-conexion', motivo: `No se pudo conectar: ${pag.error}` };
    else if (pag.status >= 400 || (firma && pag.text.length < 60000)) aviso = { tipo: 'bloqueo', motivo: `La web respondió HTTP ${pag.status}${firma ? ` con una página de verificación (${firma})` : ''}: bloquea las descargas sin navegador.` };
    if (!aviso) {
      const html = pag.text; const base = (html.match(/<base\b[^>]*>/i) && attrs(html.match(/<base\b[^>]*>/i)[0]).href) || pag.url;
      for (const t of html.match(/<link\b[^>]*>/gi) || []) {
        const a = attrs(t); const rel = (a.rel || '').toLowerCase();
        if (a.href && (rel.split(/\s+/).includes('stylesheet') || (rel.includes('preload') && (a.as || '') === 'style'))) fuentes.push({ origen: 'link', url: new URL(a.href, base).href, media: a.media || '' });
      }
      let nStyle = 0; for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) { nStyle++; fuentes.push({ origen: 'style', url: `<style> ${nStyle}`, css: m[1] }); }
      for (const x of EXTRAS) fuentes.push({ origen: 'link', url: aURL(x), media: '' });
    }
  }
  const html = pag.text; const base = pag.url;
  const hojas = []; const fallidas = []; const vistas = new Set();
  const cola = [...fuentes];
  while (cola.length) {
    const f = cola.shift(); if (f.url && vistas.has(f.url)) continue; vistas.add(f.url);
    let css = f.css;
    if (css === undefined) {
      try { const r = await get(f.url); if (r.status >= 400 || /text\/html/.test(r.tipo)) { fallidas.push(`${f.url} (HTTP ${r.status})`); continue; } css = r.text; }
      catch (e) { fallidas.push(`${f.url} (${e.message})`); continue; }
    }
    const nombre = String(hojas.length + 1).padStart(2, '0') + '-' + (f.origen === 'style' ? 'style-' + hojas.length : (f.url.split('/').pop().split('?')[0] || 'hoja')).replace(/[^\w.-]/g, '_').slice(0, 60) + (f.origen === 'style' || !/\.css$/.test(f.url.split('?')[0]) ? '.css' : '');
    fs.writeFileSync(path.join(OUT, 'css', nombre), css);
    hojas.push({ url: f.url, archivo: 'css/' + nombre, kb: Math.round(Buffer.byteLength(css) / 102.4) / 10, media: f.media || '' });
    for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)['"]?\s*\)?([^;]*);/g)) cola.push({ origen: 'import', url: new URL(m[1], f.url && /^(https?|file):/.test(f.url) ? f.url : base).href, media: m[2].trim() });
    f.css = css; f.archivo = nombre;
  }

  // ---------- recorrido ----------
  const defs = {}; const usosVar = {}; const temas = {};
  const tok = {}; const literales = {}; const ejLit = {};
  const colores = {}; const ejCol = {};
  const D = { tamano: {}, familia: {}, peso: {}, interlineado: {}, tracking: {}, espaciado: {}, radio: {}, anchoBorde: {}, sombra: {}, opacidad: {}, zIndex: {}, duracion: {}, curva: {} };
  const medias = {}; const fontFace = new Set(); const unidadesFuente = {}; const estilos = {};
  let important = 0, keyframes = 0, reduceMotion = 0, colorScheme = 0, focoReglas = 0, focoVisible = 0, nReglas = 0;
  const focoQuitado = []; const opacidadTexto = []; const pares = [];
  const reglasPorHoja = {};
  const procesarRegla = (sel, cuerpo, media, hoja) => {
    const { decl, anidadas } = declaraciones(cuerpo);
    for (const a of anidadas) { const k = a.indexOf('{'); procesarRegla(a.slice(0, k).trim().replace(/&/g, sel), a.slice(k + 1, a.lastIndexOf('}')), media, hoja); }
    nReglas++; inc(reglasPorHoja, hoja);
    const props = {}; let nVars = 0;
    for (const d of decl) {
      if (d.imp) important++;
      for (const m of d.v.matchAll(/var\(\s*(--[\w-]+)/g)) inc(usosVar, m[1]);
      if (d.prop.startsWith('--')) {
        nVars++; (defs[d.prop] ||= []).push({ sel, v: d.v, media });
        if (tipoVar(d.v) === 'color' || /^(#|rgb|hsl)/.test(d.v)) for (const c of coloresEn(d.v)) { (colores[c] ||= { enVariables: 0, aMano: 0 }).enVariables++; ej(ejCol, c, `${d.prop} en ${sel}`); }
        continue;
      }
      props[d.prop] = d.v;
      if (d.prop === 'font-size') inc(unidadesFuente, /var\(/.test(d.v) ? 'var()' : /^(clamp|calc|min|max)\(/.test(d.v) ? 'fluido (clamp/calc)' : (d.v.match(/[a-z%]+$/) || ['otro'])[0]);
      const k = cat(d.prop);
      if (k && !VACIO.test(d.v)) {
        const t = (tok[k] ||= { conVariable: 0, aMano: 0 });
        if (/var\(--/.test(d.v)) t.conVariable++; else { t.aMano++; const val = d.v.length > 70 ? d.v.slice(0, 70) + '…' : d.v; inc((literales[k] ||= {}), val); ej((ejLit[k] ||= {}), val, sel); }
      }
      if (k === 'color' || k === 'sombra') for (const c of coloresEn(sinVar(d.v))) { (colores[c] ||= { enVariables: 0, aMano: 0 }).aMano++; ej(ejCol, c, sel); }
      // valores declarados por categoría
      const v = d.v;
      if (d.prop === 'font-family') inc(D.familia, v.split(',')[0].replace(/["']/g, '').trim());
      if (d.prop === 'font-weight') inc(D.peso, v);
      if (d.prop === 'line-height') inc(D.interlineado, v);
      if (d.prop === 'letter-spacing') inc(D.tracking, v);
      if (/^(padding|margin|gap|row-gap|column-gap)/.test(d.prop) && !/var\(/.test(v)) for (const p of v.split(/\s+/)) { const x = aPx(p); if (x) inc(D.espaciado, x); }
      if (/radius/.test(d.prop) && !/var\(/.test(v)) for (const p of v.split(/[\s\/]+/)) { const x = aPx(p); if (x) inc(D.radio, x); else if (/%$/.test(p) && p !== '0%') inc(D.radio, p); }
      if (/^border(-(top|right|bottom|left))?(-width)?$/.test(d.prop)) { const m = v.match(/(^|\s)([\d.]+(px|rem|em))(\s|$)/); if (m) inc(D.anchoBorde, aPx(m[2])); }
      if (/shadow/.test(d.prop) && !VACIO.test(v)) inc(D.sombra, v.length > 90 ? v.slice(0, 90) + '…' : v);
      if (d.prop === 'opacity' && parseFloat(v) < 1) { inc(D.opacidad, v); if (opacidadTexto.length < 40) opacidadTexto.push({ sel: sel.slice(0, 100), opacity: v, media }); }
      if (d.prop === 'z-index') inc(D.zIndex, v);
      if (/^(transition|animation)/.test(d.prop)) { for (const m of v.matchAll(/(?:^|[\s,])(-?[\d.]+m?s)\b/g)) inc(D.duracion, m[1]); for (const m of v.matchAll(/cubic-bezier\([^)]*\)|\b(ease-in-out|ease-in|ease-out|ease|linear|steps\([^)]*\))\b/g)) inc(D.curva, m[0]); }
    }
    if (nVars >= 5 && !/^(:root|html|:host)\s*$/i.test(sel)) temas[sel.slice(0, 120)] = (temas[sel.slice(0, 120)] || 0) + nVars;
    if (props['font-size']) inc(estilos, `${props['font-size']} · ${props['font-weight'] || '—'} · ${props['line-height'] || '—'}`);
    const fondo = props['background-color'] || (props.background && !/url\(|gradient/.test(props.background) ? props.background : null);
    if (props.color && fondo) pares.push({ sel: sel.slice(0, 100), color: props.color, fondo, media });
    if (/:focus/.test(sel)) { focoReglas++; if (/:focus-visible/.test(sel)) focoVisible++;
      const soloRaton = /:not\(:focus-visible\)/.test(sel); const o = props.outline || '', ow = props['outline-width'], os = props['outline-style'];
      if (!soloRaton && (/^(none|0)\b/.test(o) || ow === '0' || ow === '0px' || os === 'none')) { const sust = props['box-shadow'] || props['border-color'] || props.border || props['background-color'] || props['text-decoration'];
        if (focoQuitado.length < 12) focoQuitado.push(`${sel.slice(0, 100)}${sust ? ' (con sustituto en la misma regla)' : ' (sin sustituto en la misma regla: buscar otra regla para el mismo elemento)'}`); } }
  };
  const recorrer = (items, media, hoja) => {
    for (const it of items) {
      if (it.t === 'at') {
        if (it.nombre === 'media') { const c = it.pre.replace(/^@media\s*/i, ''); inc(medias, c); if (/prefers-reduced-motion/.test(c)) reduceMotion++; if (/prefers-color-scheme/.test(c)) colorScheme++; recorrer(it.hijos, c, hoja); }
        else if (it.hijos) recorrer(it.hijos, media, hoja);
        else if (/keyframes$/.test(it.nombre)) keyframes++;
        else if (it.nombre === 'font-face') { const m = it.cuerpo.match(/font-family\s*:\s*([^;]+)/i); if (m) fontFace.add(m[1].replace(/["']/g, '').trim()); }
        continue;
      }
      if (it.t === 'regla') procesarRegla(it.sel, it.cuerpo, media, hoja);
    }
  };
  for (const h of hojas) { const css = fs.readFileSync(path.join(OUT, h.archivo), 'utf8'); recorrer(parseCSS(css), h.media || '', h.archivo); }

  // ---------- resolver variables de :root ----------
  const raiz = {}; for (const [k, lista] of Object.entries(defs)) { const r = lista.find((d) => /^(:root|html|:host)$/i.test(d.sel.trim()) && !d.media) || lista[0]; raiz[k] = r.v; }
  const resolver = (v, prof = 0) => prof > 8 ? v : v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (m, n, fb) => raiz[n] !== undefined ? resolver(raiz[n], prof + 1) : (fb ? resolver(fb.trim(), prof + 1) : m));
  const vars = {}; for (const [k, v] of Object.entries(raiz)) (vars[tipoVar(v)] ||= {})[k] = v;

  // tamaños de fuente evaluados a 1440 y 375 px
  const tamanos = {};
  for (const [k, n] of top(Object.fromEntries(Object.entries(literales['tamaño de fuente'] || {})), 200)) tamanos[k] = { usos: n };
  for (const [k] of Object.entries(defs)) if (tipoVar(raiz[k]) === 'tamaño' && /font|size|text|heading|display|body/.test(k)) tamanos[`var(${k})`] = { usos: usosVar[k] || 0 };
  for (const [k, o] of Object.entries(tamanos)) { const r = resolver(k.startsWith('var(') ? `var(${k.slice(4, -1)})` : k); for (const w of ANCHOS) o[w + 'px'] = evalLen(r, w); }

  // pares de la misma regla con ratio
  const paresR = [];
  for (const p of pares) {
    const fg = coloresEn(resolver(p.color))[0], bg = coloresEn(resolver(p.fondo))[0];
    const ratio = C && fg && bg ? C.contraste(fg, [bg]) : null;
    paresR.push({ ...p, fg: fg || null, bg: bg || null, ratio: ratio ? Math.floor(ratio * 100) / 100 : null });
  }
  paresR.sort((a, b) => (a.ratio ?? 99) - (b.ratio ?? 99));

  const mv = (html.match(/<meta\b[^>]*name\s*=\s*["']?viewport[^>]*>/i) || [])[0];
  const metaViewport = mv ? attrs(mv).content || '' : '(sin meta viewport)';
  const fsBase = []; for (const h of hojas) { const css = fs.readFileSync(path.join(OUT, h.archivo), 'utf8'); for (const m of css.matchAll(/(?:^|[}\s,])(html|:root)\s*\{([^}]*)\}/g)) { const f = m[2].match(/font-size\s*:\s*([^;]+)/); if (f) fsBase.push(f[1].trim()); } }
  const breakpoints = [...new Set(Object.keys(medias).flatMap((m) => m.match(/(min|max)-width\s*:\s*[\d.]+(px|em|rem)/g) || []).map((s) => s.replace(/\s+/g, '')))].sort((a, b) => parseFloat(a.split(':')[1]) - parseFloat(b.split(':')[1]));
  const varsSinUso = Object.keys(defs).filter((k) => !usosVar[k]);

  const res = {
    url: URL_IN, modo, urlFinal: pag.url, httpStatus: pag.status, fecha: new Date().toISOString().slice(0, 10),
    hojas, hojasFallidas: fallidas, reglas: nReglas, reglasPorHoja,
    aviso: aviso || (hojas.length === 0 ? { tipo: 'sin-hojas', motivo: modo === 'hojas-css' ? 'No se pudo leer ninguna hoja CSS de las indicadas.' : 'La página no tiene hojas de estilo en el HTML: probablemente el CSS lo genera JavaScript al cargar.' } : null),
    vars, numVariables: Object.keys(defs).length,
    temas: top(temas, 30).map(([sel, n]) => ({ sel, variablesRedefinidas: n })),
    varsSinUso: { total: varsSinUso.length, ejemplos: varsSinUso.slice(0, 40) },
    tokenizacion: tok,
    literales: Object.fromEntries(Object.entries(literales).map(([k, v]) => [k, top(v, 20).map(([val, n]) => ({ valor: val, usos: n, ejemplos: (ejLit[k] || {})[val] || [] }))])),
    colores: Object.entries(colores).sort((a, b) => (b[1].aMano + b[1].enVariables) - (a[1].aMano + a[1].enVariables)).map(([hex, o]) => ({ hex, ...o, ejemplos: ejCol[hex] || [] })),
    declarado: { tamanosFuente: tamanos, ...Object.fromEntries(Object.entries(D).map(([k, v]) => [k, top(v, 40)])) },
    estilosTexto: top(estilos, 40),
    paresMismaRegla: paresR.slice(0, 80),
    opacidadConTexto: opacidadTexto,
    reglasCSS: { breakpoints, mediaQueries: top(medias, 30), fuentesFace: [...fontFace], unidadesFontSize: unidadesFuente, important, keyframes,
      prefersReducedMotion: reduceMotion, prefersColorScheme: colorScheme, reglasFoco: focoReglas, reglasFocusVisible: focoVisible, focoQuitado },
    a11y: { metaViewport, zoomBloqueado: /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(metaViewport), fontSizeBaseDeclarado: fsBase },
    limitaciones: [
      ...(modo === 'hojas-css' ? ['Sin HTML: no se revisa el meta viewport (zoom bloqueado) ni qué hojas carga de verdad cada página.'] : []),
      'Sin navegador no se sabe qué reglas se aplican de verdad a cada elemento: los valores son los declarados en el CSS, no los calculados.',
      'Contraste: solo se miden los pares de texto y fondo declarados en la misma regla; el resto son supuestos. No se ven opacidades heredadas, texto sobre imágenes o degradados, fondos en pseudo-elementos o shadow DOM.',
      'No se ven los estilos que añade JavaScript (CSS-in-JS, hojas cargadas después) ni los estados que solo aparecen al interactuar.',
      'No se sabe qué fuentes llegan a usarse ni qué colores aparecen en pantalla: una variable sin uso en el CSS puede usarse desde JavaScript.',
    ],
  };
  fs.writeFileSync(path.join(OUT, 'extraccion.json'), JSON.stringify(res, null, 1));
  const t = tok.color || { conVariable: 0, aMano: 0 };
  console.log(`Modo ${modo} · HTTP ${pag.status} · ${hojas.length} hojas (${fallidas.length} fallidas) · ${nReglas} reglas · ${res.numVariables} variables · ${res.temas.length} posibles temas`);
  console.log(`Color: ${t.conVariable} con variable, ${t.aMano} a mano · ${res.colores.length} colores distintos · ${paresR.filter((p) => p.ratio !== null).length} pares de la misma regla con ratio`);
  if (res.aviso) console.log(`AVISO (${res.aviso.tipo}): ${res.aviso.motivo}`);
  console.log('Guardado en ' + path.join(OUT, 'extraccion.json'));
})().catch((e) => { console.error('Error: ' + e.message); process.exit(1); });
