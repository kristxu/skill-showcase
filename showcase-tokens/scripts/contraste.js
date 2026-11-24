// Contraste WCAG 2.2 (luminancia relativa).
// Sirve tal cual en use_figma, figma_execute o node.
// Colores: '#RRGGBB', '#RRGGBBAA' u objeto de Figma {r, g, b, a} en 0–1.

const toRGBA = (c) => {
  if (typeof c === 'string') {
    const h = c.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  return { r: c.r, g: c.g, b: c.b, a: c.a === undefined ? 1 : c.a };
};

// Pinta "top" (con su alfa) encima de "bottom" (opaco).
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

// Capas de fondo ordenadas de la más cercana al texto a la más lejana.
// Las transparentes se componen sobre la base (blanco si no se indica).
const flatten = (layers, base = '#FFFFFF') =>
  [].concat(layers).map(toRGBA).reverse().reduce((acc, c) => over(c, acc), toRGBA(base));

const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

// fg: color del texto o elemento. bgLayers: un color o lista de capas (cercana → lejana).
const contraste = (fg, bgLayers, base = '#FFFFFF') => {
  const bg = flatten(bgLayers, base);
  const f = over(toRGBA(fg), bg);
  const a = lum(f), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

// Texto grande según WCAG: ≥ 24 px, o ≥ 18,66 px en negrita (peso 700 o más; semibold no cuenta).
const esGrande = (fontSize, style = '') => {
  const s = String(style).toLowerCase().replace(/\s|-/g, '');
  const negrita = /(bold|black|heavy)/.test(s) && !/(semibold|demibold)/.test(s);
  return fontSize >= 24 || (negrita && fontSize >= 18.66);
};

const nivelTexto = (r, grande = false) => {
  if (grande) return r >= 4.5 ? 'AAA' : r >= 3 ? 'AA' : 'Falla';
  return r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'Solo texto grande' : 'Falla';
};
const nivelNoTexto = (r) => (r >= 3 ? 'Pasa 3:1' : 'Falla');

// WCAG no permite redondear hacia arriba: 4,499 no es 4,5. Se trunca a 2 decimales.
const fmt = (r) => `${(Math.floor(r * 100) / 100).toFixed(2).replace('.', ',')} : 1`;

if (typeof module !== 'undefined') module.exports = { toRGBA, over, flatten, contraste, esGrande, nivelTexto, nivelNoTexto, fmt };
