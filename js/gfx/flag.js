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
  FR: ['v', ['#0055a4', W, '#ef4135']], IT: ['v', ['#009246', W, '#ce2b37']], IE: ['v', ['#169b62', W, '#ff883e']],
  BE: ['v', [K, '#fdda24', '#ef3340']], NG: ['v', ['#008751', W, '#008751']], PE: ['v', ['#d91023', W, '#d91023']],
  RO: ['v', ['#002b7f', '#fcd116', '#ce1126']], MD: ['v', ['#0046ae', '#ffd200', '#cc092f']], TD: ['v', ['#002664', '#fecb00', '#c60c30']],
  CI: ['v', ['#f77f00', W, '#009e60']], ML: ['v', ['#14b53a', '#fcd116', '#ce1126']], GN: ['v', ['#ce1126', '#fcd116', '#009460']],
};

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
