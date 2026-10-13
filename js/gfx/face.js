// Caras pixel art generadas por partes a partir de los parámetros del JSON.
// - drawPortrait: retrato 32x32 (selección, VS, resultados)
// - drawHeadSmall: cabeza 9x10 de perfil 3/4 para la pelea

export const SKIN = [
  ['#f6d3b3', '#dcb092'], ['#eec19b', '#d29f78'], ['#d9a47a', '#b9835b'],
  ['#b97f55', '#97623d'], ['#8d5a37', '#6e4327'], ['#5c3a24', '#432818'],
];
export const HAIR = {
  negro: '#1d1a19', castano: '#5a3a22', castano_claro: '#8a6a42', rubio: '#c9a14a', pelirrojo: '#a2482a', gris: '#9a9a9a',
  platino: '#efe3b8', rosa: '#ff5fae', verde: '#3fd17a', azul: '#3d7bff', morado: '#9b5cff', rojo: '#d23a2a',
};
const OUTLINE = '#22140d';
const MOUTH = '#7a3b2e';

const HEAD_ROWS = {
  redonda:  [4, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 6, 5, 4, 3],
  cuadrada: [5, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 5],
  ovalada:  [3, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 5, 4, 3],
  ancha:    [5, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 6, 5, 4],
};

export function skinOf(face) { return SKIN[Math.max(0, Math.min(SKIN.length - 1, face?.piel ?? 1))]; }
export function hairOf(face) { return HAIR[face?.colorPelo] || HAIR.negro; }

function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

// Construye la rejilla 32x32 del retrato.
export function portraitGrid(face = {}, opts = {}) {
  const W = 32, H = 32, CX = 16, TOP = 6;
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const [skin, skinD] = skinOf(face);
  const hair = hairOf(face);
  const beardC = HAIR[face.colorBarba] || hair;
  const rows = HEAD_ROWS[face.cabeza] || HEAD_ROWS.redonda;
  const hwAt = y => rows[y - TOP] ?? 0;
  const inHead = (x, y) => y >= TOP && y < TOP + rows.length && Math.abs(x + 0.5 - CX) <= hwAt(y);

  // Pelo largo por detrás
  if (face.pelo === 'largo') for (let y = 8; y < 27; y++) for (let x = CX - 10; x < CX + 10; x++) set(x, y, shade(hair, 0.8));
  if (face.pelo === 'mullet') for (let y = 12; y < 28; y++) for (let x = CX - 10; x < CX + 10; x++) if (y > 18 || Math.abs(x + 0.5 - CX) > 7) set(x, y, shade(hair, 0.8));
  if (face.pelo === 'rastas') for (let y = 8; y < 30; y++) for (let x = CX - 11; x < CX + 11; x++) if ((x + (y >> 2)) % 3 !== 0) set(x, y, (x % 3 === 0) ? shade(hair, 0.65) : shade(hair, 0.85));
  // Torso y cuello
  for (let y = 27; y < 32; y++) for (let x = 4; x < 28; x++) set(x, y, (x > 22 || y > 30) ? skinD : skin);
  for (let y = 22; y < 29; y++) for (let x = 12; x < 20; x++) set(x, y, x > 17 ? skinD : skin);
  for (let x = 12; x < 20; x++) set(x, 26, skinD); // sombra de la barbilla
  // Orejas
  const earX = hwAt(15);
  for (let y = 14; y < 18; y++) { set(CX - earX - 1, y, skinD); set(CX + earX, y, skinD); }
  // Cabeza
  for (let y = TOP; y < TOP + rows.length; y++) {
    for (let x = 0; x < W; x++) if (inHead(x, y)) set(x, y, (x - CX >= hwAt(y) - 2) ? skinD : skin);
  }
  // Contorno
  const snapshot = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (snapshot[y][x]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inHead(x + dx, y + dy));
    if (n && y < 27) set(x, y, OUTLINE);
  }
  // Ojos
  const hurt = opts.hurt || 0;
  set(12, 15, '#ffffff'); set(13, 15, '#2a1c14'); set(19, 15, '#2a1c14'); set(20, 15, '#ffffff');
  if (hurt > 0.6) { set(19, 14, '#7b3a52'); set(20, 14, '#7b3a52'); set(21, 15, '#7b3a52'); }
  // Cejas
  const brow = shade(hair, 0.85);
  const browW = face.cejas === 'finas' ? 2 : 3;
  for (let i = 0; i < browW; i++) { set(11 + i + (3 - browW), 13, brow); set(19 + i, 13, brow); }
  if (face.cejas === 'gruesas') for (let i = 0; i < 4; i++) { set(10 + i, 12, brow); set(19 + i, 12, brow); set(10 + i, 13, brow); set(19 + i, 13, brow); }
  // Nariz y boca
  set(16, 16, skinD); set(16, 17, skinD); set(15, 18, skinD); set(17, 18, skinD);
  for (let x = 14; x < 19; x++) set(x, 21, MOUTH);
  // Barba
  const beard = face.barba || 'ninguna';
  const beardPix = (x, y) => { if (inHead(x, y) && !(y === 21 && x >= 14 && x < 19)) set(x, y, beardC); };
  if (beard === 'sombra') {
    for (let y = 19; y < 26; y++) for (let x = 0; x < W; x++) if (inHead(x, y) && (x + y) % 2 === 0 && !(y === 21 && x >= 14 && x < 19)) set(x, y, shade(skinD, 0.75));
  } else if (beard === 'corta' || beard === 'completa') {
    const y0 = beard === 'completa' ? 18 : 19;
    for (let y = y0; y < 26; y++) for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - CX) >= 4 || y >= 20) beardPix(x, y);
    if (beard === 'completa') {
      for (let y = 14; y < 18; y++) { beardPix(CX - hwAt(y), y); beardPix(CX + hwAt(y) - 1, y); }
      for (let x = 12; x < 21; x++) set(x, 26, beardC);
    }
    for (let x = 14; x < 19; x++) set(x, 20, beardC);
  } else if (beard === 'candado') {
    for (let y = 20; y < 25; y++) for (let x = 13; x < 20; x++) beardPix(x, y);
  } else if (beard === 'bigote') {
    for (let x = 13; x < 20; x++) set(x, 20, beardC);
    set(13, 21, beardC); set(19, 21, beardC);
  }
  // Pelo
  const p = face.pelo || 'corto';
  const hairRow = (y, x0, x1, c = hair) => { for (let x = x0; x < x1; x++) set(x, y, c); };
  const buzz = mixColor(skin, hair, 0.55);
  if (p === 'rapado') {
    for (let y = TOP; y < 11; y++) for (let x = 0; x < W; x++) if (inHead(x, y) && !(y === 10 && Math.abs(x + 0.5 - CX) < 4)) set(x, y, buzz);
    for (let y = 11; y < 14; y++) { set(CX - hwAt(y), y, buzz); set(CX + hwAt(y) - 1, y, buzz); }
  } else if (p === 'corto') {
    for (let y = TOP - 1; y < 11; y++) { const hw = hwAt(Math.max(y, TOP)) + (y < TOP ? -1 : 0); hairRow(y, CX - hw, CX + hw); }
    for (let y = 11; y < 14; y++) { set(CX - hwAt(y), y, hair); set(CX + hwAt(y) - 1, y, hair); }
  } else if (p === 'fade') {
    for (let y = TOP - 2; y < 10; y++) { const hw = hwAt(Math.max(y, TOP)) - (y < TOP ? 2 + (TOP - 1 - y) : 0); hairRow(y, CX - hw, CX + hw); }
    for (let y = 10; y < 13; y++) { set(CX - hwAt(y), y, buzz); set(CX + hwAt(y) - 1, y, buzz); }
  } else if (p === 'medio' || p === 'largo') {
    for (let y = TOP - 2; y < 11; y++) { const hw = hwAt(Math.max(y, TOP)) + 1 - (y < TOP ? 1 : 0); hairRow(y, CX - hw, CX + hw); }
    for (let y = 11; y < 17; y++) { set(CX - hwAt(y) - 1, y, hair); set(CX - hwAt(y), y, hair); set(CX + hwAt(y), y, hair); set(CX + hwAt(y) - 1, y, hair); }
  } else if (p === 'mullet') {
    for (let y = TOP - 2; y < 10; y++) { const hw = hwAt(Math.max(y, TOP)) + (y < TOP ? 0 : 1); hairRow(y, CX - hw, CX + hw); }
    for (let y = 10; y < 15; y++) { set(CX - hwAt(y) - 1, y, hair); set(CX + hwAt(y), y, hair); }
  } else if (p === 'rastas') {
    for (let y = TOP - 2; y < 10; y++) { const hw = hwAt(Math.max(y, TOP)) + 1; for (let x = CX - hw; x < CX + hw; x++) set(x, y, (x + y) % 3 === 0 ? shade(hair, 0.6) : hair); }
    for (let y = 10; y < 22; y++) { for (const x of [CX - hwAt(y) - 1, CX - hwAt(y), CX + hwAt(y) - 1, CX + hwAt(y)]) if (y % 3 !== 0) set(x, y, hair); }
  } else if (p === 'mohicano') {
    for (let y = 2; y < 11; y++) hairRow(y, 14, 18);
  } else if (p === 'rizado') {
    for (let y = TOP - 3; y < 11; y++) { const hw = hwAt(Math.max(y, TOP)) + 1; for (let x = CX - hw; x < CX + hw; x++) if (y >= TOP - 1 || (x + y) % 3 !== 0) set(x, y, (x + y) % 4 === 0 ? shade(hair, 1.3) : hair); }
  } else if (p === 'calvo') {
    set(12, 8, '#ffffff'); set(13, 8, shade(skin, 1.08));
  }
  // Tintura en dos colores (p. ej. el pelo de colores de O'Malley): alterna mechones.
  if (face.colorPelo2 && HAIR[face.colorPelo2]) {
    const c2 = HAIR[face.colorPelo2];
    for (let y = 0; y < 16; y++) for (let x = 0; x < W; x++) if (g[y][x] === hair && ((x >> 1) + (y >> 1)) % 2 === 0) set(x, y, c2);
  }
  // Tatuajes en hombros y pecho
  if (face.tatuajes) {
    const ink = '#2c3a4a';
    // Diseño tribal en los hombros y una pieza en el pecho
    const tribal = [[4, 28], [5, 28], [6, 28], [7, 29], [7, 30], [6, 31], [5, 30], [4, 30]];
    for (const [x, y] of tribal) { set(x, y, ink); set(31 - x, y, ink); }
    for (const [x, y] of [[13, 29], [14, 30], [15, 29], [16, 29], [17, 30], [18, 29]]) set(x, y, ink);
  }
  // Daño visible
  if (hurt > 0.35) { set(12, 13, '#b22'); set(20, 16, '#c8434f'); }
  if (hurt > 0.7) { set(13, 13, '#b22'); set(12, 12, '#b22'); set(16, 19, '#b22'); set(17, 22, '#b22'); }
  return g;
}

export function drawGrid(ctx, grid, x0, y0, scale = 1) {
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
    const c = grid[y][x];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
  }
}

export function drawPortrait(ctx, face, x0, y0, scale = 4, opts) {
  drawGrid(ctx, portraitGrid(face, opts), x0, y0, scale);
}

// Canvas con el retrato listo para insertar en el DOM.
export function portraitCanvas(face, scale = 4, opts) {
  const c = document.createElement('canvas');
  c.width = 32 * scale; c.height = 32 * scale;
  c.className = 'pixel';
  drawPortrait(c.getContext('2d'), face, 0, 0, scale, opts);
  return c;
}

// ---------- cabeza pequeña para la pelea (mirando a la derecha) ----------
const SMALL_ROWS = [3, 4, 4, 4, 4, 4, 4, 4, 3, 2];
const smallCache = new Map();

export function headSmallGrid(face = {}, hurt = 0) {
  const key = JSON.stringify(face) + '|' + (hurt > 0.7 ? 2 : hurt > 0.4 ? 1 : 0);
  if (smallCache.has(key)) return smallCache.get(key);
  const W = 10, H = 11;
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const [skin, skinD] = skinOf(face);
  const hair = hairOf(face);
  const beardC = HAIR[face.colorBarba] || hair;
  const cx = 5, top = 1;
  const wide = face.cabeza === 'ancha' || face.cabeza === 'cuadrada' ? 1 : 0;
  const inH = (x, y) => y >= top && y < top + SMALL_ROWS.length && Math.abs(x + 0.5 - cx) <= SMALL_ROWS[y - top] + (wide && y > 2 && y < 9 ? 0.5 : 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inH(x, y)) set(x, y, x <= 2 ? skinD : skin);
  // Oreja (lado trasero)
  set(2, 5, skinD); set(2, 6, shade(skinD, 0.8));
  // Ojo, ceja, nariz, boca (mirando a la derecha)
  set(7, 5, '#20140e');
  const brow = shade(hair, 0.85);
  set(6, 4, brow); set(7, 4, brow); if (face.cejas === 'gruesas') set(8, 4, brow);
  set(9, 6, skin); set(9, 5, skin);
  set(7, 8, MOUTH); set(8, 8, MOUTH);
  // Barba
  const b = face.barba || 'ninguna';
  if (b === 'corta' || b === 'completa') { for (let y = 7; y < 11; y++) for (let x = 3; x < 9; x++) if (inH(x, y) && !(y === 8 && x >= 7)) set(x, y, beardC); if (b === 'completa') { set(3, 6, beardC); set(4, 6, beardC); } }
  else if (b === 'sombra') { for (let y = 7; y < 11; y++) for (let x = 3; x < 9; x++) if (inH(x, y) && (x + y) % 2 === 0 && !(y === 8 && x >= 7)) set(x, y, shade(skinD, 0.75)); }
  else if (b === 'candado') { set(7, 9, beardC); set(8, 9, beardC); set(6, 8, beardC); set(7, 10, beardC); }
  else if (b === 'bigote') { set(7, 7, beardC); set(8, 7, beardC); }
  // Pelo
  const p = face.pelo || 'corto';
  const rowHair = (y, x0, x1, c = hair) => { for (let x = x0; x < x1; x++) if (inH(x, y) || y < top) set(x, y, c); };
  if (p === 'rapado') { for (let x = 2; x < 8; x++) if (x % 2 === 0) set(x, 1, hair); set(3, 2, hair); }
  else if (p === 'corto') { rowHair(1, 2, 8); rowHair(2, 1, 7); set(1, 3, hair); set(1, 4, hair); }
  else if (p === 'fade') { rowHair(0, 3, 8); rowHair(1, 2, 9); rowHair(2, 2, 6); set(1, 3, shade(hair, 1.2)); }
  else if (p === 'medio') { rowHair(0, 2, 8); rowHair(1, 1, 9); rowHair(2, 1, 6); for (let y = 3; y < 7; y++) set(1, y, hair); }
  else if (p === 'largo') { rowHair(0, 2, 8); rowHair(1, 1, 9); rowHair(2, 1, 6); for (let y = 3; y < 10; y++) { set(1, y, hair); set(0, y + 1, hair); } }
  else if (p === 'mohicano') { rowHair(0, 3, 7); set(2, 1, hair); set(7, 1, hair); }
  else if (p === 'rizado') { rowHair(0, 2, 8); rowHair(1, 1, 9); rowHair(2, 1, 7); set(1, 3, hair); set(1, 4, hair); }
  else if (p === 'mullet') { rowHair(0, 2, 8); rowHair(1, 1, 9); rowHair(2, 1, 6); for (let y = 3; y < 10; y++) { set(1, y, hair); set(0, y + 1, hair); } }
  else if (p === 'rastas') { rowHair(0, 2, 8); rowHair(1, 1, 9); rowHair(2, 1, 6); for (let y = 3; y < 11; y++) { set(1, y, hair); if (y % 2) set(0, y, hair); } }
  else if (p === 'calvo') { set(4, 1, shade(skin, 1.12)); }
  if (face.colorPelo2 && HAIR[face.colorPelo2]) for (let y = 0; y < 4; y++) for (let x = 0; x < W; x++) if (g[y][x] === hair && (x + y) % 2 === 0) set(x, y, HAIR[face.colorPelo2]);
  // Contorno
  const snap = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (snap[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => snap[y + dy]?.[x + dx])) set(x, y, OUTLINE);
  }
  if (hurt > 0.4) set(7, 4, '#b22');
  if (hurt > 0.7) { set(8, 6, '#b22'); set(6, 3, '#b22'); }
  smallCache.set(key, g);
  return g;
}

export function drawHeadSmall(ctx, face, cx, cy, dir, hurt = 0) {
  const g = headSmallGrid(face, hurt);
  const W = g[0].length, H = g.length;
  const x0 = Math.round(cx - W / 2), y0 = Math.round(cy - H / 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y][dir > 0 ? x : W - 1 - x];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }
}
