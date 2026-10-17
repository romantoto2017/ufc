// Banderas pixel art generadas por código (sin imágenes). Tamaño base 12x8.
const R = '#d52b1e', W = '#ffffff', B = '#0039a6', G = '#009739', Y = '#fcd116', K = '#000000';

// Franjas simples: h = horizontales, v = verticales. Pesos opcionales.
const SIMPLE = {
  DE: ['h', [K, '#dd0000', '#ffce00']], RU: ['h', [W, B, R]], NL: ['h', ['#ae1c28', W, '#21468b']],
  AT: ['h', ['#ed2939', W, '#ed2939']], HU: ['h', ['#ce2939', W, '#477050']], BG: ['h', [W, '#00966e', '#d62612']],
  LT: ['h', ['#fdb913', '#006a44', '#c1272d']], EE: ['h', ['#0072ce', K, W]], AM: ['h', ['#d90012', '#0033a0', '#f2a800']],
  UA: ['h', ['#0057b7', '#ffd700']], PL: ['h', [W, '#dc143c']], ID: ['h', ['#ff0000', W]], MC: ['h', ['#ce1126', W]],
  CO: ['h', ['#fcd116', '#fcd116', '#003893', '#ce1126']], VE: ['h', ['#ffcc00', '#00247d', '#cf142b']],
  BO: ['h', ['#d52b1e', '#f9e300', '#007934']], LU: ['h', ['#ed2939', W, '#00a1de']], YE: ['h', ['#ce1126', W, K]],
  MM: ['h', ['#fecb00', '#34b233', '#ea2839']], EC: ['h', ['#ffdd00', '#ffdd00', '#034ea2', '#ed1c24']],
  AF: ['v', ['#000000', '#be0000', '#009900']], CM: ['v', ['#007a5e', '#ce1126', '#fcd116']],
  AZ: ['h', ['#00b5e2', '#ef3340', '#509e2f']], TJ: ['h', ['#cc0000', '#ffffff', '#006600']],
  SK: ['h', ['#ffffff', '#0b4ea2', '#ee1c25']], RS: ['h', ['#c6363c', '#0c4076', '#ffffff']],
  HR: ['h', ['#ff0000', '#ffffff', '#171796']], IQ: ['h', ['#ce1126', '#ffffff', '#000000']],
  UY: ['h', ['#ffffff', '#0038a8', '#ffffff', '#0038a8', '#ffffff']], SE: ['h', ['#006aa7', '#fecc00', '#006aa7']],
  FR: ['v', ['#0055a4', W, '#ef4135']], IT: ['v', ['#009246', W, '#ce2b37']], IE: ['v', ['#169b62', W, '#ff883e']],
  BE: ['v', [K, '#fdda24', '#ef3340']], NG: ['v', ['#008751', W, '#008751']], PE: ['v', ['#d91023', W, '#d91023']],
  RO: ['v', ['#002b7f', '#fcd116', '#ce1126']], MD: ['v', ['#0046ae', '#ffd200', '#cc092f']], TD: ['v', ['#002664', '#fecb00', '#c60c30']],
  CI: ['v', ['#f77f00', W, '#009e60']], ML: ['v', ['#14b53a', '#fcd116', '#ce1126']], GN: ['v', ['#ce1126', '#fcd116', '#009460']],
  BY: ['h', ['#c8313e', '#c8313e', '#4aa657']], EG: ['h', ['#ce1126', W, K]], IR: ['h', ['#239f40', W, '#da0000']],
  HN: ['h', ['#0073cf', W, '#0073cf']], NI: ['h', ['#0067c6', W, '#0067c6']], SV: ['h', ['#0047ab', W, '#0047ab']],
  GT: ['v', ['#4997d0', W, '#4997d0']], LV: ['h', ['#9e3039', '#9e3039', W, '#9e3039', '#9e3039']], SI: ['h', [W, '#005ce5', '#ed1c24']],
  SN: ['v', ['#00853f', '#fdef42', '#e31b23']], GH: ['h', ['#ce1126', '#fcd116', '#006b3f']], GR: ['h', ['#0d5eaf', W, '#0d5eaf', W, '#0d5eaf', W, '#0d5eaf']],
  CR: ['h', ['#002b7f', W, '#ce1126', '#ce1126', W, '#002b7f']],
};

// Banderas con un paño a la izquierda (franja vertical) y franjas horizontales a la derecha.
function hoist(ctx, x, y, w, h, hoistColor, hoistW, colors) { stripes(ctx, x, y, w, h, 'h', colors); rect(ctx, x, y, hoistW, h, hoistColor); }
function canton(ctx, x, y, w, h, bg, cantonColor, dot) { rect(ctx, x, y, w, h, bg); rect(ctx, x, y, Math.round(w * 0.45), h >> 1, cantonColor); if (dot) rect(ctx, x + 2, y + 1, 2, 2, dot); }

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function stripes(ctx, x, y, w, h, dir, colors) {
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    if (dir === 'h') { const y0 = Math.round(i * h / n), y1 = Math.round((i + 1) * h / n); rect(ctx, x, y + y0, w, y1 - y0, colors[i]); }
    else { const x0 = Math.round(i * w / n), x1 = Math.round((i + 1) * w / n); rect(ctx, x + x0, y, x1 - x0, h, colors[i]); }
  }
}

function nordic(ctx, x, y, w, h, bg, cross, inner) {
  rect(ctx, x, y, w, h, bg);
  const cx = Math.round(w * 0.36), t = Math.max(2, Math.round(h / 4));
  rect(ctx, x + cx - (t >> 1), y, t, h, cross); rect(ctx, x, y + (h >> 1) - (t >> 1), w, t, cross);
  if (inner) { rect(ctx, x + cx - (t >> 2), y, Math.max(1, t >> 1), h, inner); rect(ctx, x, y + (h >> 1) - (t >> 2), w, Math.max(1, t >> 1), inner); }
}

const CUSTOM = {
  TW(ctx, x, y, w, h) { canton(ctx, x, y, w, h, '#fe0000', '#000095', W); },
  MY(ctx, x, y, w, h) { for (let i = 0; i < h; i++) rect(ctx, x, y + i, w, 1, i % 2 === 0 ? '#cc0001' : W); rect(ctx, x, y, Math.round(w * 0.5), Math.round(h * 0.55), '#010066'); rect(ctx, x + 2, y + 1, 2, 2, '#ffcc00'); },
  VN(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#da251d'); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 2, 2, 4, '#ffff00'); rect(ctx, x + (w >> 1) - 2, y + (h >> 1) - 1, 4, 2, '#ffff00'); },
  CD(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#007fff'); for (let i = 0; i < w; i++) { const yy = Math.round(h - 1 - i * (h - 1) / (w - 1)); rect(ctx, x + i, y + yy - 1, 1, 3, '#f7d618'); rect(ctx, x + i, y + yy, 1, 1, '#ce1021'); } rect(ctx, x + 1, y + 1, 2, 2, '#f7d618'); },
  BA(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#002395'); for (let i = 0; i < h; i++) rect(ctx, x + 3 + i, y + i, 1, 1, '#fecb00'); rect(ctx, x + 3, y, 1, 1, '#fecb00'); rect(ctx, x + 4, y, w - 7, 1, '#fecb00'); for (let i = 0; i < h; i++) rect(ctx, x + 4 + i, y + i, w - 8 - i > 0 ? 1 : 0, 1, '#fecb00'); },
  PA(ctx, x, y, w, h) { rect(ctx, x, y, w, h, W); rect(ctx, x + (w >> 1), y, w >> 1, h >> 1, '#da121a'); rect(ctx, x, y + (h >> 1), w >> 1, h >> 1, '#072357'); rect(ctx, x + 2, y + 1, 2, 2, '#072357'); rect(ctx, x + w - 4, y + h - 3, 2, 2, '#da121a'); },
  PR(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#ed0000', W, '#ed0000', W, '#ed0000']); for (let i = 0; i < h; i++) { const len = Math.round((1 - Math.abs(i - (h - 1) / 2) / (h / 2)) * w * 0.45); rect(ctx, x, y + i, len, 1, '#0050f0'); } rect(ctx, x + 1, y + (h >> 1) - 1, 1, 2, W); },
  QA(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#8d1b3d'); rect(ctx, x, y, Math.round(w * 0.32), h, W); for (let i = 0; i < h; i += 2) rect(ctx, x + Math.round(w * 0.32), y + i, 1, 1, W); },
  KW(ctx, x, y, w, h) { hoist(ctx, x, y, w, h, K, 3, ['#007a3d', W, '#ce1126']); },
  JO(ctx, x, y, w, h) { hoist(ctx, x, y, w, h, '#ce1126', 4, [K, W, '#007a3d']); rect(ctx, x + 1, y + (h >> 1), 1, 1, W); },
  OM(ctx, x, y, w, h) { hoist(ctx, x, y, w, h, '#db161b', 3, [W, '#db161b', '#008000']); rect(ctx, x, y, 3, 3, '#db161b'); },
  SA(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#006c35'); rect(ctx, x + 2, y + 3, w - 4, 1, W); rect(ctx, x + 3, y + 5, w - 6, 1, W); },
  LB(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#ed1c24', W, W, '#ed1c24']); rect(ctx, x + (w >> 1) - 1, y + 2, 2, 4, '#00a651'); },
  TM(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#00843d'); rect(ctx, x + 2, y, 2, h, '#d22630'); rect(ctx, x + 6, y + 1, 2, 2, W); },
  KG(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#e8112d'); rect(ctx, x + (w >> 1) - 2, y + (h >> 1) - 2, 4, 4, '#ffef00'); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#e8112d'); },
  PH(ctx, x, y, w, h) { rect(ctx, x, y, w, h >> 1, '#0038a8'); rect(ctx, x, y + (h >> 1), w, h - (h >> 1), '#ce1126'); for (let i = 0; i < h; i++) { const len = Math.round((1 - Math.abs(i - (h - 1) / 2) / (h / 2)) * w * 0.45); rect(ctx, x, y + i, len, 1, W); } rect(ctx, x + 1, y + (h >> 1) - 1, 2, 2, '#fcd116'); },
  TH(ctx, x, y, w, h) { for (let i = 0; i < 6; i++) { const y0 = Math.round(i * h / 6), y1 = Math.round((i + 1) * h / 6); rect(ctx, x, y + y0, w, y1 - y0, ['#a51931', W, '#2d2a4a', '#2d2a4a', W, '#a51931'][i]); } },
  PY(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#d52b1e', W, '#0038a8']); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#fcd116'); },
  IN(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#ff9933', W, '#138808']); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#000080'); },
  MN(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'v', ['#c4272f', '#015197', '#c4272f']); rect(ctx, x + 1, y + 2, 2, 4, '#f9cf02'); },

  ENG(ctx, x, y, w, h) { rect(ctx, x, y, w, h, W); const t = Math.max(2, Math.round(h / 4)); rect(ctx, x + (w >> 1) - (t >> 1), y, t, h, '#ce1124'); rect(ctx, x, y + (h >> 1) - (t >> 1), w, t, '#ce1124'); },
  SCO(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#0065bd'); for (let i = 0; i < w; i++) { const yy = Math.round(i * (h - 1) / (w - 1)); rect(ctx, x + i, y + yy, 1, 1, W); rect(ctx, x + i, y + h - 1 - yy, 1, 1, W); } },
  WAL(ctx, x, y, w, h) { rect(ctx, x, y, w, h >> 1, W); rect(ctx, x, y + (h >> 1), w, h - (h >> 1), '#00b140'); rect(ctx, x + 3, y + 2, 5, 3, '#d30731'); rect(ctx, x + 7, y + 1, 2, 2, '#d30731'); rect(ctx, x + 3, y + 5, 1, 1, '#d30731'); rect(ctx, x + 6, y + 5, 1, 1, '#d30731'); },
  NIR(ctx, x, y, w, h) { CUSTOM.ENG(ctx, x, y, w, h); },
  UZ(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#0099b5', W, '#1eb53a']); rect(ctx, x, y + Math.round(h / 3), w, 1, '#ce1126'); rect(ctx, x, y + Math.round(2 * h / 3) - 1, w, 1, '#ce1126'); rect(ctx, x + 1, y + 1, 1, 1, W); },
  AO(ctx, x, y, w, h) { rect(ctx, x, y, w, h >> 1, '#cc092f'); rect(ctx, x, y + (h >> 1), w, h - (h >> 1), K); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 2, 3, 3, '#ffcb00'); },
  MA(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#c1272d'); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#006233'); rect(ctx, x + (w >> 1) - 2, y + (h >> 1) - 1, 1, 1, '#006233'); rect(ctx, x + (w >> 1) + 1, y + (h >> 1) - 1, 1, 1, '#006233'); },
  UG(ctx, x, y, w, h) { for (let i = 0; i < 6; i++) { const y0 = Math.round(i * h / 6), y1 = Math.round((i + 1) * h / 6); rect(ctx, x, y + y0, w, y1 - y0, [K, '#fcdc04', '#d90000'][i % 3]); } rect(ctx, x + (w >> 1) - 2, y + (h >> 1) - 2, 4, 4, W); },
  ME(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#d4af37'); rect(ctx, x + 1, y + 1, w - 2, h - 2, '#c40308'); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#d4af37'); },
  AW(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#418fde'); rect(ctx, x, y + h - 3, w, 1, '#ffd100'); rect(ctx, x, y + h - 2, w, 1, '#ffd100'); rect(ctx, x + 2, y + 2, 1, 1, '#ef3340'); },
  DO(ctx, x, y, w, h) { rect(ctx, x, y, w, h, W); const cw = (w >> 1) - 1, ch = (h >> 1) - 1; rect(ctx, x, y, cw, ch, '#002d62'); rect(ctx, x + w - cw, y + h - ch, cw, ch, '#002d62'); rect(ctx, x + w - cw, y, cw, ch, '#ce1126'); rect(ctx, x, y + h - ch, cw, ch, '#ce1126'); },
  PT(ctx, x, y, w, h) { rect(ctx, x, y, Math.round(w * 0.4), h, '#006600'); rect(ctx, x + Math.round(w * 0.4), y, w - Math.round(w * 0.4), h, '#ff0000'); rect(ctx, x + Math.round(w * 0.4) - 1, y + (h >> 1) - 1, 3, 3, '#ffcc00'); },

  US(ctx, x, y, w, h) {
    for (let i = 0; i < h; i++) rect(ctx, x, y + i, w, 1, i % 2 === 0 ? '#b22234' : W);
    const cw = Math.round(w * 0.45), ch = Math.round(h * 0.55);
    rect(ctx, x, y, cw, ch, '#3c3b6e');
    for (let yy = 1; yy < ch; yy += 2) for (let xx = 1 + ((yy >> 1) % 2); xx < cw; xx += 2) rect(ctx, x + xx, y + yy, 1, 1, W);
  },
  GB(ctx, x, y, w, h) {
    rect(ctx, x, y, w, h, '#012169');
    for (let i = 0; i < w; i++) { const yy = Math.round(i * (h - 1) / (w - 1)); rect(ctx, x + i, y + yy, 1, 1, W); rect(ctx, x + i, y + h - 1 - yy, 1, 1, W); }
    const t = Math.max(2, Math.round(h / 4));
    rect(ctx, x + (w >> 1) - t / 2 - 1, y, t + 2, h, W); rect(ctx, x, y + (h >> 1) - t / 2 - 1, w, t + 2, W);
    rect(ctx, x + (w >> 1) - t / 2, y, t, h, '#c8102e'); rect(ctx, x, y + (h >> 1) - t / 2, w, t, '#c8102e');
  },
  GE(ctx, x, y, w, h) {
    rect(ctx, x, y, w, h, W);
    const t = Math.max(2, Math.round(h / 4));
    rect(ctx, x + (w >> 1) - (t >> 1), y, t, h, '#e8112d'); rect(ctx, x, y + (h >> 1) - (t >> 1), w, t, '#e8112d');
    const qx = [Math.round(w * 0.2), Math.round(w * 0.78)], qy = [Math.round(h * 0.2), Math.round(h * 0.75)];
    for (const xx of qx) for (const yy of qy) { rect(ctx, x + xx - 1, y + yy, 2, 1, '#e8112d'); rect(ctx, x + xx - 1, y + yy - 1, 1, 3, '#e8112d'); }
  },
  ES(ctx, x, y, w, h) {
    rect(ctx, x, y, w, h, '#aa151b');
    rect(ctx, x, y + Math.round(h / 4), w, Math.round(h / 2), '#f1bf00');
    rect(ctx, x + Math.round(w * 0.25), y + Math.round(h * 0.38), 2, Math.max(2, Math.round(h * 0.25)), '#aa151b');
  },
  BR(ctx, x, y, w, h) {
    rect(ctx, x, y, w, h, G);
    for (let i = 0; i < h; i++) { const half = Math.round((1 - Math.abs(i - (h - 1) / 2) / (h / 2)) * (w / 2 - 1)); rect(ctx, x + (w >> 1) - half, y + i, half * 2, 1, '#ffdf00'); }
    const r = Math.max(2, Math.round(h * 0.28));
    rect(ctx, x + (w >> 1) - r, y + (h >> 1) - r + 1, r * 2, r * 2 - 1, '#002776');
    rect(ctx, x + (w >> 1) - r, y + (h >> 1), r * 2, 1, W);
  },
  AR(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#74acdf', W, '#74acdf']); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#f6b40e'); },
  MX(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'v', ['#006847', W, '#ce1126']); rect(ctx, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#8c5a2b'); },
  JP(ctx, x, y, w, h) { rect(ctx, x, y, w, h, W); const r = Math.max(2, Math.round(h * 0.3)); rect(ctx, x + (w >> 1) - r + 1, y + (h >> 1) - r, r * 2 - 2, r * 2, '#bc002d'); rect(ctx, x + (w >> 1) - r, y + (h >> 1) - r + 1, r * 2, r * 2 - 2, '#bc002d'); },
  KR(ctx, x, y, w, h) {
    rect(ctx, x, y, w, h, W); const r = Math.max(2, Math.round(h * 0.25)), cx = x + (w >> 1), cy = y + (h >> 1);
    rect(ctx, cx - r, cy - r, r * 2, r, '#cd2e3a'); rect(ctx, cx - r, cy, r * 2, r, '#0047a0');
    for (const [dx, dy] of [[-0.38, -0.3], [0.32, -0.3], [-0.38, 0.22], [0.32, 0.22]]) rect(ctx, x + Math.round(w * (0.5 + dx)), y + Math.round(h * (0.5 + dy)), 1, 2, K);
  },
  CN(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#de2910'); rect(ctx, x + 1, y + 1, 2, 2, '#ffde00'); rect(ctx, x + 4, y + 1, 1, 1, '#ffde00'); rect(ctx, x + 4, y + 3, 1, 1, '#ffde00'); },
  CA(ctx, x, y, w, h) { const s = Math.round(w / 4); rect(ctx, x, y, w, h, W); rect(ctx, x, y, s, h, '#d80621'); rect(ctx, x + w - s, y, s, h, '#d80621'); rect(ctx, x + (w >> 1) - 1, y + 2, 2, h - 4, '#d80621'); rect(ctx, x + (w >> 1) - 2, y + 3, 4, 2, '#d80621'); },
  AU(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#012169'); CUSTOM.GB(ctx, x, y, Math.round(w / 2), Math.round(h / 2)); for (const [a, b] of [[0.75, 0.3], [0.85, 0.55], [0.7, 0.75], [0.3, 0.75]]) rect(ctx, x + Math.round(w * a), y + Math.round(h * b), 1, 1, W); },
  NZ(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#012169'); CUSTOM.GB(ctx, x, y, Math.round(w / 2), Math.round(h / 2)); for (const [a, b] of [[0.75, 0.3], [0.85, 0.5], [0.7, 0.55], [0.78, 0.78]]) rect(ctx, x + Math.round(w * a), y + Math.round(h * b), 1, 1, '#c8102e'); },
  CL(ctx, x, y, w, h) { rect(ctx, x, y, w, h >> 1, W); rect(ctx, x, y + (h >> 1), w, h - (h >> 1), '#d52b1e'); rect(ctx, x, y, Math.round(w / 3), h >> 1, '#0039a6'); rect(ctx, x + Math.round(w / 6) - 1, y + 1, 1, 1, W); },
  CZ(ctx, x, y, w, h) { rect(ctx, x, y, w, h >> 1, W); rect(ctx, x, y + (h >> 1), w, h - (h >> 1), '#d7141a'); for (let i = 0; i < h; i++) { const len = Math.round((1 - Math.abs(i - (h - 1) / 2) / (h / 2)) * w * 0.45); rect(ctx, x, y + i, len, 1, '#11457e'); } },
  AE(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#00732f', W, K]); rect(ctx, x, y, Math.round(w / 4), h, '#ff0000'); },
  BH(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#ce1126'); rect(ctx, x, y, Math.round(w * 0.3), h, W); for (let i = 0; i < h; i += 2) rect(ctx, x + Math.round(w * 0.3), y + i, 1, 1, W); },
  SG(ctx, x, y, w, h) { rect(ctx, x, y, w, h >> 1, '#ef3340'); rect(ctx, x, y + (h >> 1), w, h - (h >> 1), W); rect(ctx, x + 1, y + 1, 1, 2, W); rect(ctx, x + 3, y + 1, 1, 1, W); },
  SE(ctx, x, y, w, h) { nordic(ctx, x, y, w, h, '#006aa7', '#fecc00'); },
  NO(ctx, x, y, w, h) { nordic(ctx, x, y, w, h, '#ba0c2f', W, '#00205b'); },
  DK(ctx, x, y, w, h) { nordic(ctx, x, y, w, h, '#c8102e', W); },
  FI(ctx, x, y, w, h) { nordic(ctx, x, y, w, h, W, '#002f6c'); },
  IS(ctx, x, y, w, h) { nordic(ctx, x, y, w, h, '#02529c', W, '#dc1e35'); },
  CH(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#da291c'); rect(ctx, x + (w >> 1) - 1, y + 2, 2, h - 4, W); rect(ctx, x + (w >> 1) - 3, y + (h >> 1) - 1, 6, 2, W); },
  TR(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#e30a17'); rect(ctx, x + 3, y + 2, 3, 4, W); rect(ctx, x + 4, y + 2, 2, 4, '#e30a17'); rect(ctx, x + 6, y + 3, 1, 2, W); },
  KZ(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#00afca'); rect(ctx, x + (w >> 1) - 1, y + 2, 3, 3, '#fec50c'); rect(ctx, x + 1, y + 1, 1, h - 2, '#fec50c'); },
  CU(ctx, x, y, w, h) { for (let i = 0; i < 5; i++) { const y0 = Math.round(i * h / 5), y1 = Math.round((i + 1) * h / 5); rect(ctx, x, y + y0, w, y1 - y0, i % 2 ? W : '#002a8f'); } for (let i = 0; i < h; i++) { const len = Math.round((1 - Math.abs(i - (h - 1) / 2) / (h / 2)) * w * 0.42); rect(ctx, x, y + i, len, 1, '#cf142b'); } },
  ZA(ctx, x, y, w, h) { stripes(ctx, x, y, w, h, 'h', ['#e03c31', W, '#007749', W, '#001489']); for (let i = 0; i < h; i++) { const len = Math.round((1 - Math.abs(i - (h - 1) / 2) / (h / 2)) * w * 0.4); rect(ctx, x, y + i, len, 1, i === (h >> 1) || i === (h >> 1) - 1 ? K : '#ffb81c'); } },
};

export function drawFlag(ctx, code, x, y, w = 12, h = 8) {
  code = (code || '').toUpperCase();
  if (CUSTOM[code]) CUSTOM[code](ctx, x, y, w, h);
  else if (SIMPLE[code]) stripes(ctx, x, y, w, h, SIMPLE[code][0], SIMPLE[code][1]);
  else {
    rect(ctx, x, y, w, h, '#555');
    rect(ctx, x + 1, y + 1, w - 2, h - 2, '#777');
  }
}

export function hasFlag(code) { return !!(CUSTOM[code] || SIMPLE[code]); }

export function flagCanvas(code, scale = 3, w = 12, h = 8) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.className = 'pixel flag';
  c.style.width = w * scale + 'px'; c.style.height = h * scale + 'px';
  drawFlag(c.getContext('2d'), code, 0, 0, w, h);
  c.title = code;
  return c;
}
