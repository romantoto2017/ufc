// Escenas y personajes pixel art: Dana White, presentador, árbitro, conferencia de prensa,
// firma de contrato y cinturón de campeón.
import { drawPortrait } from './face.js';

function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

// Personaje de cuerpo entero (estilo chibi, ~40 px de alto) mirando al frente.
// tipo: 'dana' (calvo, traje negro), 'announcer' (esmoquin, pelo gris, micrófono), 'ref' (camisa negra, guantes azules)
// Dana White: pelado, gordito, conjunto negro (remera y saco negros).
export function drawDana(ctx, x, y, { t = 0, armUp = false } = {}) {
  const OUT = '#120c09', skin = '#efbf9e', skinD = '#d29d7c', black = '#141418', black2 = '#22222a';
  y += Math.round(Math.sin(t * 4) * 0.6);
  // Piernas cortas y anchas
  px(ctx, x - 8, y - 13, 7, 13, OUT); px(ctx, x + 1, y - 13, 7, 13, OUT);
  px(ctx, x - 7, y - 13, 5, 12, black2); px(ctx, x + 2, y - 13, 5, 12, black2);
  px(ctx, x - 9, y - 2, 8, 2, '#050505'); px(ctx, x + 1, y - 2, 8, 2, '#050505');
  // Torso ancho con panza
  px(ctx, x - 12, y - 33, 24, 22, OUT);
  px(ctx, x - 11, y - 32, 22, 20, black);
  // Panza redonda
  px(ctx, x - 15, y - 26, 30, 13, OUT); px(ctx, x - 14, y - 25, 28, 11, black);
  px(ctx, x - 16, y - 23, 32, 7, OUT); px(ctx, x - 15, y - 22, 30, 5, black);
  px(ctx, x - 6, y - 22, 12, 1, '#2a2a33'); // brillo de la tela sobre la panza
  px(ctx, x - 3, y - 32, 6, 12, black2); // remera negra bajo el saco
  px(ctx, x - 10, y - 30, 1, 14, '#2e2e38'); px(ctx, x + 9, y - 30, 1, 14, '#2e2e38'); // solapas
  // Brazos gruesos
  px(ctx, x - 17, y - 32, 5, 15, OUT); px(ctx, x - 16, y - 31, 3, 13, black); px(ctx, x - 16, y - 18, 4, 3, skin);
  if (armUp) { px(ctx, x + 12, y - 48, 5, 17, OUT); px(ctx, x + 13, y - 47, 3, 15, black); px(ctx, x + 12, y - 50, 4, 3, skin); }
  else { px(ctx, x + 12, y - 32, 5, 15, OUT); px(ctx, x + 13, y - 31, 3, 13, black); px(ctx, x + 12, y - 18, 4, 3, skin); }
  // Cabeza redonda, pelada, con papada
  // Contorno redondeado
  px(ctx, x - 7, y - 52, 14, 1, OUT); px(ctx, x - 9, y - 51, 18, 1, OUT);
  px(ctx, x - 10, y - 50, 20, 17, OUT); px(ctx, x - 9, y - 33, 18, 1, OUT);
  px(ctx, x - 7, y - 51, 14, 1, skin); px(ctx, x - 9, y - 50, 18, 2, skin);
  px(ctx, x - 9, y - 48, 18, 15, skin);
  px(ctx, x + 5, y - 48, 4, 15, skinD);
  px(ctx, x - 10, y - 50, 1, 1, '#0b0d14'); px(ctx, x + 9, y - 50, 1, 1, '#0b0d14');
  px(ctx, x - 5, y - 48, 3, 1, '#fff6ea'); px(ctx, x - 4, y - 47, 1, 1, '#fff6ea'); // brillo de la pelada
  px(ctx, x - 11, y - 44, 2, 4, skinD); px(ctx, x + 9, y - 44, 2, 4, skinD); // orejas
  px(ctx, x - 5, y - 43, 2, 2, '#1a120c'); px(ctx, x + 3, y - 43, 2, 2, '#1a120c'); // ojos chicos
  px(ctx, x - 6, y - 45, 4, 1, '#8a6a52'); px(ctx, x + 2, y - 45, 4, 1, '#8a6a52'); // cejas
  px(ctx, x - 1, y - 41, 2, 2, skinD); // nariz
  px(ctx, x - 3, y - 37, 6, 1, '#8a4a3a'); // boca
  px(ctx, x - 8, y - 35, 16, 1, skinD); px(ctx, x - 6, y - 34, 12, 1, skinD); // papada
}

export function drawPerson(ctx, x, y, tipo, { armUp = false, t = 0, face = null, shirt: shirtColor = null } = {}) {
  if (tipo === 'dana') return drawDana(ctx, x, y, { t, armUp });
  const OUT = '#120c09';
  const skin = '#e9b896', skinD = '#c99372';
  const suit = shirtColor || (tipo === 'ref' ? '#151515' : '#16161c');
  const shirt = shirtColor || (tipo === 'announcer' ? '#ffffff' : tipo === 'dana' ? '#1e1e24' : '#151515');
  const bob = Math.round(Math.sin(t * 4) * 0.6);
  y += bob;
  // Piernas
  px(ctx, x - 6, y - 14, 5, 14, OUT); px(ctx, x + 1, y - 14, 5, 14, OUT);
  px(ctx, x - 5, y - 14, 3, 13, tipo === 'ref' ? '#1b1b1b' : '#202028'); px(ctx, x + 2, y - 14, 3, 13, tipo === 'ref' ? '#1b1b1b' : '#202028');
  px(ctx, x - 7, y - 2, 6, 2, '#050505'); px(ctx, x + 1, y - 2, 6, 2, '#050505');
  // Torso
  px(ctx, x - 9, y - 32, 18, 19, OUT);
  px(ctx, x - 8, y - 31, 16, 17, suit);
  px(ctx, x - 2, y - 31, 4, 12, shirt);
  if (tipo === 'announcer') { px(ctx, x - 2, y - 31, 4, 2, '#111'); px(ctx, x - 3, y - 31, 1, 2, '#111'); px(ctx, x + 2, y - 31, 1, 2, '#111'); }
  if (tipo === 'ref') { for (let i = 0; i < 4; i++) px(ctx, x - 8 + i * 4, y - 31, 2, 17, '#ffffff22'); px(ctx, x - 7, y - 28, 4, 2, '#d20a0a'); }
  // Brazos
  px(ctx, x - 12, y - 31, 4, 14, OUT); px(ctx, x - 11, y - 30, 2, 12, suit); px(ctx, x - 11, y - 18, 3, 3, tipo === 'ref' ? '#2a5bd7' : skin);
  if (armUp) { px(ctx, x + 8, y - 46, 4, 16, OUT); px(ctx, x + 9, y - 45, 2, 14, suit); px(ctx, x + 8, y - 48, 4, 3, tipo === 'ref' ? '#2a5bd7' : skin); }
  else { px(ctx, x + 8, y - 31, 4, 14, OUT); px(ctx, x + 9, y - 30, 2, 12, suit); px(ctx, x + 8, y - 18, 3, 3, tipo === 'ref' ? '#2a5bd7' : skin); }
  if (tipo === 'announcer') { px(ctx, x - 13, y - 24, 2, 7, '#333'); px(ctx, x - 14, y - 27, 4, 4, '#666'); }
  // Cabeza (o retrato del peleador)
  if (face) { drawPortrait(ctx, face, x - 16, y - 58, 1); return; }
  px(ctx, x - 7, y - 46, 14, 15, OUT);
  px(ctx, x - 6, y - 45, 12, 13, skin);
  px(ctx, x + 3, y - 45, 3, 13, skinD);
  if (tipo === 'dana') { px(ctx, x - 4, y - 45, 3, 1, '#fff6ea'); } // calvo, brillo
  else if (tipo === 'announcer') { px(ctx, x - 6, y - 46, 12, 3, '#b9b9b9'); px(ctx, x - 7, y - 44, 2, 5, '#b9b9b9'); px(ctx, x + 5, y - 44, 2, 5, '#b9b9b9'); }
  else { px(ctx, x - 6, y - 46, 12, 3, '#3a2a1c'); }
  px(ctx, x - 4, y - 40, 2, 2, '#1a120c'); px(ctx, x + 2, y - 40, 2, 2, '#1a120c');
  px(ctx, x - 2, y - 35, 4, 1, tipo === 'announcer' ? '#7a2b22' : '#8a4a3a');
  if (tipo === 'announcer' && Math.sin(t * 12) > 0) px(ctx, x - 2, y - 36, 4, 3, '#4a1210'); // boca abierta gritando
  if (tipo === 'dana') { px(ctx, x - 6, y - 37, 12, 1, '#c99372'); }
}

// Escena de conferencia de prensa: fondo con logos, mesa, Dana y el peleador.
export function drawPressConference(ctx, W, H, { t, logo, face }) {
  px(ctx, 0, 0, W, H, '#0b0d14');
  // Fondo con logos repetidos
  for (let y = 0; y < H * 0.62; y += 22) for (let x = (y / 22) % 2 ? -20 : 0; x < W; x += 48) {
    px(ctx, x, y, 46, 20, '#14182a');
    if (logo) { ctx.globalAlpha = 0.55; ctx.drawImage(logo, x + 6, y + 5, 34, Math.round(34 * logo.height / logo.width)); ctx.globalAlpha = 1; }
  }
  // Mesa
  px(ctx, 0, H * 0.62, W, H * 0.38, '#08090d');
  px(ctx, W * 0.15, H * 0.66, W * 0.7, 16, '#1d2235');
  px(ctx, W * 0.15, H * 0.66, W * 0.7, 2, '#d20a0a');
  // Micrófonos
  for (const mx of [0.34, 0.66]) { px(ctx, W * mx, H * 0.6, 2, 10, '#555'); px(ctx, W * mx - 1, H * 0.58, 4, 4, '#222'); }
  drawPerson(ctx, Math.round(W * 0.34), Math.round(H * 0.67), 'dana', { t });
  // Peleador con remera del equipo
  drawPerson(ctx, Math.round(W * 0.66), Math.round(H * 0.67), 'fighter', { t: t + 1, face, shirt: '#8c1414' });
  // Flashes de cámara
  if (Math.sin(t * 9) > 0.92) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, W, H); }
}

// Firma: trazo pseudo-manuscrito determinista a partir del nombre; progress 0..1.
export function signaturePath(name, w, h) {
  let seed = 0; for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  // Trocoide: avanza en x mientras dibuja bucles, como una letra cursiva.
  const pts = [];
  const words = name.trim().split(/\s+/).slice(0, 3);
  let x = w * 0.06;
  const mid = h * 0.58;
  for (const [wi, word] of words.entries()) {
    const letters = Math.max(2, Math.min(9, word.length));
    const step = (w * 0.8 / Math.max(6, name.replace(/\s/g, '').length));
    for (let i = 0; i < letters; i++) {
      const cap = i === 0;
      const amp = h * (cap ? 0.42 : 0.16 + rnd() * 0.12);
      const R = step * (0.35 + rnd() * 0.25);
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        pts.push([x + (k / 10) * step + R * Math.sin(a), mid - amp * (1 - Math.cos(a)) / 2 + (cap ? 0 : rnd() * 1.5)]);
      }
      x += step;
    }
    if (wi < words.length - 1) { pts.push(null); x += step * 0.6; }
  }
  // Rúbrica final
  for (let k = 0; k <= 12; k++) pts.push([x - (k / 12) * (x - w * 0.1), mid + 6 + Math.sin(k / 12 * Math.PI) * 6]);
  return pts;
}

export function drawSignature(ctx, pts, progress, color = '#10204a') {
  const n = Math.floor(pts.length * Math.min(1, progress));
  ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (!p) { pen = false; continue; }
    if (!pen) { ctx.moveTo(p[0], p[1]); pen = true; } else ctx.lineTo(p[0], p[1]);
  }
  ctx.stroke();
}

// Cinturón de campeón detallado (base 96x40 px), con brillo animado.
export function drawBelt(ctx, cx, cy, scale, t, { label = 'CHAMPION', strap = '#121212', accent = '#d20a0a' } = {}) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-48, -20);
  const GOLD = '#f2c230', GOLD_D = '#b8860b', GOLD_L = '#fff1a8', OUT = '#1a1205';
  // Correa con costuras
  px(ctx, 0, 12, 96, 16, OUT); px(ctx, 1, 13, 94, 14, strap);
  for (let x = 3; x < 94; x += 3) { px(ctx, x, 14, 1, 1, '#3a3a3a'); px(ctx, x, 25, 1, 1, '#3a3a3a'); }
  // Placas laterales (4)
  for (const [x, w] of [[6, 12], [20, 10], [66, 10], [78, 12]]) {
    px(ctx, x - 1, 11, w + 2, 18, OUT); px(ctx, x, 12, w, 16, GOLD); px(ctx, x, 12, w, 2, GOLD_L); px(ctx, x, 26, w, 2, GOLD_D);
    px(ctx, x + (w >> 1) - 2, 17, 4, 6, accent); px(ctx, x + (w >> 1) - 1, 18, 2, 2, '#ff9a9a');
  }
  // Placa central: octógono dorado
  const oct = [[34, 2], [62, 2], [70, 10], [70, 30], [62, 38], [34, 38], [26, 30], [26, 10]];
  ctx.fillStyle = OUT; ctx.beginPath(); oct.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.5) : ctx.moveTo(x, y + 0.5))); ctx.closePath(); ctx.fill();
  ctx.fillStyle = GOLD; ctx.beginPath(); oct.forEach(([x, y], i) => { const xx = x + (x < 48 ? 1 : -1), yy = y + (y < 20 ? 1 : -1); return i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.closePath(); ctx.fill();
  px(ctx, 30, 6, 36, 2, GOLD_L); px(ctx, 30, 33, 36, 2, GOLD_D);
  // Anillo interior y gema
  px(ctx, 34, 9, 28, 22, GOLD_D); px(ctx, 35, 10, 26, 20, '#151515'); px(ctx, 36, 11, 24, 18, accent);
  px(ctx, 40, 13, 16, 3, '#ffffff'); px(ctx, 40, 16, 16, 1, '#ffd6d6');
  // Texto de la placa
  ctx.fillStyle = GOLD_L; ctx.font = '5px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 9), 48, 23);
  // Remaches
  for (const [x, y] of [[29, 9], [67, 9], [29, 31], [67, 31]]) { px(ctx, x - 1, y - 1, 2, 2, GOLD_L); }
  // Brillo que recorre el cinturón
  const sx = ((t * 60) % 160) - 30;
  ctx.globalAlpha = 0.35; px(ctx, sx, 3, 2, 34, '#ffffff'); px(ctx, sx + 3, 3, 1, 34, '#ffffff'); ctx.globalAlpha = 1;
  ctx.restore();
}
