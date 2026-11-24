// Extracción de TODO el CSS de una web desde un navegador (SOLO LECTURA). Solo se usa si la
// persona elige usar un navegador (por ejemplo, el MCP de Playwright) porque la web bloquea la
// descarga sin navegador. Pasar como función a la herramienta que ejecuta JavaScript en la página,
// después de cerrar el banner de cookies (rechazando las no esenciales), a 1440 px y a 375 px.
//
// Devuelve, agregado y con número de usos:
//  vars ........ variables CSS clasificadas (color, tamaño, fuente, sombra, tiempo, otra)
//  tokenizacion  por categoría, cuántas declaraciones usan var(--…) y cuántas un valor a mano
//  calculado ... valores reales de los elementos visibles: colores, tipografía, espaciado,
//                radios, bordes, sombras, opacidad, z-index, transiciones y animaciones
//  estilosTexto  combinaciones familia · tamaño · peso · interlineado que se usan de verdad
//  reglas ...... breakpoints, @font-face, prefers-reduced-motion, foco, !important, unidades
//  a11y ........ meta viewport (zoom bloqueado), tamaño base, textos < 12 px
() => {
  const top = (obj, n = 40) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  const inc = (obj, k, by = 1) => { if (k === undefined || k === null || k === '') return; obj[k] = (obj[k] || 0) + by; };
  const toHex = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    if (p.length === 4 && p[3] === 0) return null;
    const h = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    return p.length === 4 && p[3] < 1 ? `${h} @${p[3]}` : h;
  };
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };

  // ---------- 1. Valores calculados de los elementos visibles ----------
  const C = { color: {}, fondo: {}, borde: {}, familia: {}, tamano: {}, peso: {}, interlineado: {}, tracking: {}, transform: {},
    padding: {}, margin: {}, gap: {}, radio: {}, anchoBorde: {}, sombra: {}, sombraTexto: {}, opacidad: {}, zIndex: {},
    duracion: {}, curva: {}, animacion: {} };
  const estilos = {}; const ejColor = {};
  let visibles = 0, textosPeq = 0; const ejPeq = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue;
    visibles++;
    const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (tieneTexto) {
      const fs = px(cs.fontSize); const lh = cs.lineHeight === 'normal' ? 'normal' : Math.round(px(cs.lineHeight) / fs * 100) / 100;
      inc(C.color, toHex(cs.color)); inc(C.familia, cs.fontFamily); inc(C.tamano, fs); inc(C.peso, cs.fontWeight);
      inc(C.interlineado, lh); inc(C.tracking, cs.letterSpacing); if (cs.textTransform !== 'none') inc(C.transform, cs.textTransform);
      inc(estilos, `${cs.fontFamily.split(',')[0].replace(/"/g, '')} · ${fs}px · ${cs.fontWeight} · ${lh}`);
      if (fs < 12) { textosPeq++; if (ejPeq.length < 5) ejPeq.push(`${fs}px: "${el.textContent.trim().slice(0, 40)}"`); }
    }
    const bg = toHex(cs.backgroundColor); inc(C.fondo, bg);
    for (const [k, h] of [['color', toHex(cs.color)], ['fondo', bg]]) if (h && !(ejColor[`${k}|${h}`])) ejColor[`${k}|${h}`] = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '');
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
      const p = px(cs['padding' + s]); if (p) inc(C.padding, p);
      const m = px(cs['margin' + s]); if (m) inc(C.margin, m);
      const bw = px(cs[`border${s}Width`]); if (bw && cs[`border${s}Style`] !== 'none') { inc(C.anchoBorde, bw); inc(C.borde, toHex(cs[`border${s}Color`])); }
    }
    for (const g of [cs.rowGap, cs.columnGap]) { const v = px(g); if (v) inc(C.gap, v); }
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
    if (rad.some((x) => px(x))) inc(C.radio, [...new Set(rad)].join(' '));
    if (cs.boxShadow !== 'none') inc(C.sombra, cs.boxShadow);
    if (cs.textShadow !== 'none') inc(C.sombraTexto, cs.textShadow);
    if (cs.opacity !== '1') inc(C.opacidad, cs.opacity);
    if (cs.zIndex !== 'auto') inc(C.zIndex, cs.zIndex);
    if (cs.transitionDuration && cs.transitionDuration !== '0s') { inc(C.duracion, cs.transitionDuration); inc(C.curva, cs.transitionTimingFunction); }
    if (cs.animationName && cs.animationName !== 'none') inc(C.animacion, `${cs.animationName} ${cs.animationDuration}`);
  }

  // ---------- 2. Hojas de estilo: variables, tokenización y reglas ----------
  const vars = {}; const tok = {}; const literales = {};
  const medias = {}; const fuentesFace = new Set();
  let reduceMotion = 0, keyframes = 0, important = 0, focoReglas = 0, focoVisible = 0; const focoQuitado = [];
  const unidadesFuente = {};
  const cat = (prop) => /color|background|fill|stroke|border-color|outline-color|caret|accent/.test(prop) && !/image|size|position|repeat|clip|origin|attachment/.test(prop) ? 'color'
    : /^font-size$/.test(prop) ? 'tamaño de fuente' : /^font-family$|^font-weight$|^line-height$|^letter-spacing$/.test(prop) ? 'tipografía'
    : /^(padding|margin|gap|row-gap|column-gap)/.test(prop) ? 'espaciado' : /radius/.test(prop) ? 'radio'
    : /shadow/.test(prop) ? 'sombra' : /^z-index$/.test(prop) ? 'z-index' : /transition|animation-duration|animation-timing/.test(prop) ? 'movimiento' : null;
  const tipoVar = (v) => /^#|rgb|hsl/.test(v) ? 'color' : /^-?[\d.]+(px|rem|em|%|vw|vh)$/.test(v) ? 'tamaño' : /\dm?s$/.test(v) ? 'tiempo'
    : /shadow|\d+px \d+px/.test(v) ? 'sombra' : /,|serif|sans|mono/.test(v) ? 'fuente' : /^var\(/.test(v) ? 'alias' : 'otra';
  const recorrer = (rules, media) => {
    for (const r of rules) {
      if (r.type === 4 /* MEDIA */) { inc(medias, r.conditionText || r.media.mediaText); if (/prefers-reduced-motion/.test(r.conditionText || r.media.mediaText)) reduceMotion++; recorrer(r.cssRules, r.conditionText); continue; }
      if (r.type === 7 /* KEYFRAMES */) { keyframes++; continue; }
      if (r.type === 5 /* FONT_FACE */) { fuentesFace.add(r.style.getPropertyValue('font-family').replace(/"/g, '').trim()); continue; }
      if (r.cssRules && r.cssRules.length) recorrer(r.cssRules, media);
      if (!r.style) continue;
      const sel = r.selectorText || '';
      if (/:focus/.test(sel)) { focoReglas++; if (/:focus-visible/.test(sel)) focoVisible++;
        // Quitar el contorno solo para ratón (:not(:focus-visible)) es correcto: no se cuenta.
        const soloRaton = /:not\(:focus-visible\)/.test(sel);
        const o = r.style.getPropertyValue('outline'), ow = r.style.getPropertyValue('outline-width'), os = r.style.getPropertyValue('outline-style');
        if (!soloRaton && (/^(none|0)/.test(o) || ow === '0' || ow === '0px' || os === 'none')) { const sustituto = r.style.getPropertyValue('box-shadow') || r.style.getPropertyValue('border-color') || r.style.getPropertyValue('background-color');
          if (focoQuitado.length < 8) focoQuitado.push(`${sel}${sustituto ? ' (con sustituto en la misma regla)' : ' (sin sustituto en la misma regla: revisar en el navegador)'}`); } }
      for (const n of r.style) {
        const v = r.style.getPropertyValue(n).trim();
        if (r.style.getPropertyPriority(n) === 'important') important++;
        if (n.startsWith('--')) { vars[n] = { valor: v, tipo: tipoVar(v) }; continue; }
        if (n === 'font-size') { const u = (v.match(/[a-z%]+$/) || ['otro'])[0]; inc(unidadesFuente, /var\(/.test(v) ? 'var()' : u); }
        const k = cat(n); if (!k) continue;
        if (/^(inherit|initial|unset|transparent|none|auto|currentcolor|normal|0|0(px|rem|em|%|s|ms))$/i.test(v)) continue;
        const t = (tok[k] = tok[k] || { conVariable: 0, aMano: 0 });
        if (/var\(--/.test(v)) t.conVariable++; else { t.aMano++; const L = (literales[k] = literales[k] || {}); inc(L, v.length > 60 ? v.slice(0, 60) + '…' : v); }
      }
    }
  };
  let hojasBloqueadas = 0;
  for (const s of document.styleSheets) { try { recorrer(s.cssRules); } catch (e) { hojasBloqueadas++; } }
  const varsPorTipo = {}; for (const [n, x] of Object.entries(vars)) (varsPorTipo[x.tipo] = varsPorTipo[x.tipo] || {})[n] = x.valor;
  const breakpoints = [...new Set(Object.keys(medias).flatMap((m) => (m.match(/(min|max)-width:\s*[\d.]+(px|em|rem)/g) || [])))].sort((a, b) => parseFloat(a.split(':')[1]) - parseFloat(b.split(':')[1]));

  // ---------- 3. Accesibilidad visible desde el CSS/HTML ----------
  const meta = document.querySelector('meta[name=viewport]'); const mv = meta ? meta.content : '(sin meta viewport)';
  const zoomBloqueado = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(mv);
  const fsBase = getComputedStyle(document.documentElement).fontSize; const fsBody = getComputedStyle(document.body).fontSize;

  const calc = {}; for (const [k, v] of Object.entries(C)) calc[k] = top(v);
  return {
    url: location.href, ancho: innerWidth, elementosVisibles: visibles, hojasNoAccesibles: hojasBloqueadas,
    vars: varsPorTipo,
    tokenizacion: tok,
    literalesMasUsados: Object.fromEntries(Object.entries(literales).map(([k, v]) => [k, top(v, 15)])),
    calculado: calc,
    estilosTexto: top(estilos, 30),
    ejemplosColor: ejColor,
    reglas: { breakpoints, mediaQueries: top(medias, 20), fuentesFace: [...fuentesFace], unidadesFontSize: unidadesFuente, important, keyframes },
    a11y: { metaViewport: mv, zoomBloqueado, fontSizeHtml: fsBase, fontSizeBody: fsBody, textosMenoresDe12px: textosPeq, ejemplosTextoPequeno: ejPeq,
      reglasPrefersReducedMotion: reduceMotion, animacionesOTransiciones: Object.keys(C.duracion).length + Object.keys(C.animacion).length + keyframes,
      reglasFoco: focoReglas, reglasFocusVisible: focoVisible, focoQuitado },
  };
}
