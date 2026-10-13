// Dibujo pixel art de la pelea: arena, público, jaula y peleadores por poses articuladas.
import { ARENA_W } from './engine.js';
import { drawHeadSmall, skinOf } from '../gfx/face.js';
import { drawPerson } from '../gfx/scenes.js';

export const VIEW_H = 180;   // sistema de coordenadas de dibujo
const CROP_TOP = 28;         // recorte superior: acerca la cámara
const CANVAS_H = 148;        // alto real del canvas
const FLOOR_Y = 152;

// Articulaciones: hd, nk, sf, ef, hf, sb, eb, hb, hp, kf, ff, kb, fb (mirando a la derecha; y negativa hacia arriba)
const J = ['hd', 'nk', 'sf', 'ef', 'hf', 'sb', 'eb', 'hb', 'hp', 'kf', 'ff', 'kb', 'fb'];
const P = (arr) => Object.fromEntries(J.map((k, i) => [k, arr[i]]));

const POSES = {
  guard:    P([[3, -55], [1, -48], [5, -46], [11, -39], [13, -47], [-3, -46], [1, -38], [6, -46], [0, -27], [7, -14], [10, 0], [-6, -13], [-10, 0]]),
  walkA:    P([[3, -55], [1, -48], [5, -46], [11, -39], [13, -47], [-3, -46], [1, -38], [6, -46], [0, -27], [8, -14], [13, 0], [-4, -13], [-8, 0]]),
  walkB:    P([[3, -55], [1, -48], [5, -46], [11, -39], [13, -47], [-3, -46], [1, -38], [6, -46], [0, -27], [5, -14], [8, 0], [-7, -13], [-13, 0]]),
  jab:      P([[5, -55], [3, -48], [7, -46], [18, -47], [27, -48], [-2, -46], [1, -38], [6, -46], [1, -27], [7, -14], [10, 0], [-6, -13], [-10, 0]]),
  cross:    P([[7, -55], [5, -48], [8, -46], [12, -40], [10, -48], [3, -46], [16, -47], [27, -48], [2, -27], [8, -14], [11, 0], [-4, -12], [-9, 0]]),
  hook:     P([[5, -55], [4, -48], [8, -46], [17, -47], [21, -51], [-2, -46], [1, -38], [6, -46], [1, -27], [7, -14], [10, 0], [-6, -13], [-10, 0]]),
  elbow:    P([[5, -55], [4, -48], [8, -46], [17, -50], [10, -53], [-2, -46], [1, -38], [6, -46], [1, -27], [7, -14], [10, 0], [-6, -13], [-10, 0]]),
  lowKick:  P([[0, -55], [-1, -48], [3, -46], [9, -40], [11, -48], [-5, -46], [-2, -39], [4, -47], [3, -28], [5, -14], [6, 0], [12, -16], [26, -7]]),
  bodyKick: P([[-4, -55], [-3, -48], [1, -46], [7, -40], [9, -47], [-7, -45], [-6, -39], [-8, -35], [2, -29], [3, -14], [4, 0], [12, -26], [27, -30]]),
  highKick: P([[-8, -54], [-6, -47], [-2, -45], [3, -40], [5, -46], [-9, -45], [-12, -38], [-14, -32], [1, -29], [3, -14], [4, 0], [10, -36], [24, -52]]),
  shoot:    P([[22, -28], [18, -26], [20, -26], [26, -20], [30, -15], [16, -26], [24, -18], [28, -13], [6, -16], [12, -6], [16, 0], [0, -2], [-8, 0]]),
  sprawled: P([[12, -38], [9, -36], [12, -35], [14, -26], [16, -20], [7, -35], [10, -26], [12, -20], [0, -24], [6, -12], [9, 0], [-6, -12], [-10, 0]]),
  blockHigh:P([[2, -55], [0, -48], [5, -46], [10, -46], [10, -56], [-3, -46], [6, -46], [7, -56], [0, -27], [7, -14], [10, 0], [-6, -13], [-10, 0]]),
  blockLow: P([[2, -54], [0, -47], [5, -45], [10, -36], [12, -42], [-3, -45], [3, -35], [7, -42], [0, -28], [10, -23], [13, -11], [-6, -13], [-10, 0]]),
  hitHead:  P([[-3, -54], [-2, -47], [2, -46], [9, -41], [9, -44], [-6, -46], [-2, -38], [3, -44], [-1, -27], [6, -14], [10, 0], [-7, -13], [-11, 0]]),
  hitBody:  P([[2, -50], [0, -44], [4, -43], [7, -37], [8, -38], [-4, -43], [2, -37], [4, -36], [-2, -26], [6, -13], [10, 0], [-7, -13], [-11, 0]]),
  hitLegs:  P([[1, -53], [0, -46], [4, -45], [10, -38], [12, -45], [-4, -45], [0, -37], [5, -44], [-1, -25], [7, -12], [12, 0], [-6, -12], [-10, 0]]),
  down:     P([[-26, -5], [-20, -5], [-18, -6], [-12, -10], [-8, -6], [-19, -4], [-14, -2], [-8, -2], [0, -5], [8, -12], [16, -2], [7, -8], [15, 0]]),
  ko:       P([[-26, -3], [-20, -3], [-18, -4], [-14, -9], [-9, -12], [-19, -3], [-24, -1], [-29, -1], [0, -4], [9, -4], [18, -2], [8, -3], [17, 0]]),
  raised:   P([[2, -56], [1, -49], [6, -48], [7, -60], [7, -71], [-4, -48], [-3, -38], [1, -32], [0, -28], [6, -14], [9, 0], [-6, -14], [-9, 0]]),
  victory:  P([[2, -57], [1, -49], [6, -48], [9, -58], [8, -68], [-4, -48], [-6, -58], [-4, -68], [0, -28], [6, -14], [9, 0], [-6, -14], [-9, 0]]),
  gBottom:  P([[-24, -5], [-18, -6], [-16, -7], [-10, -12], [-5, -16], [-17, -5], [-11, -8], [-6, -10], [-2, -6], [6, -16], [14, -10], [5, -12], [12, -4]]),
  gBottomHit:P([[-25, -4], [-19, -5], [-17, -6], [-12, -10], [-9, -13], [-18, -4], [-13, -7], [-9, -10], [-2, -6], [6, -15], [14, -9], [5, -11], [12, -3]]),
  gTop:     P([[3, -37], [2, -30], [5, -28], [10, -22], [12, -16], [-1, -28], [3, -20], [8, -16], [-2, -12], [4, -2], [-4, 0], [-2, -2], [-10, 0]]),
  gnp:      P([[6, -34], [5, -28], [8, -27], [14, -18], [19, -6], [2, -27], [6, -20], [10, -18], [-1, -12], [4, -2], [-4, 0], [-2, -2], [-10, 0]]),
  subTop:   P([[8, -24], [6, -20], [9, -18], [14, -12], [16, -6], [4, -18], [9, -10], [14, -6], [-2, -10], [4, -2], [-4, 0], [-2, -2], [-10, 0]]),
  getupMid: P([[2, -30], [1, -24], [4, -22], [8, -14], [10, -6], [-2, -22], [2, -14], [6, -6], [-2, -14], [6, -10], [10, 0], [-6, -6], [-12, 0]]),
};

const lerp = (a, b, t) => a + (b - a) * t;
function mix(pa, pb, t) {
  const o = {};
  for (const k of J) o[k] = [lerp(pa[k][0], pb[k][0], t), lerp(pa[k][1], pb[k][1], t)];
  return o;
}
const easeOut = t => 1 - (1 - t) * (1 - t);

const CORNER = [
  { shorts: '#b3121b', trim: '#ffffff', glove: '#b3121b' },
  { shorts: '#1846b0', trim: '#ffffff', glove: '#1846b0' },
];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

export class Renderer {
  constructor(canvas, fight, { ufcLogo } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fight = fight;
    this.logo = ufcLogo || null;
    this.effects = [];
    this.shake = 0;
    this.flash = 0;
    this.time = 0;
    this.excite = 0;
    this.camX = 0;
    this.resize();
    this.buildCrowd();
  }

  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    this.viewW = Math.max(240, Math.min(380, Math.round(CANVAS_H * vw / vh)));
    this.canvas.width = this.viewW;
    this.canvas.height = CANVAS_H;
    this.ctx.imageSmoothingEnabled = false;
  }

  buildCrowd() {
    const rnd = mulberry(7);
    this.crowd = [];
    const shirts = ['#5b2a2a', '#2a3b5b', '#3b3b3b', '#5b4a2a', '#2a5b3e', '#552a5b', '#6b6b6b', '#7a1f1f'];
    const skins = ['#f0c8a0', '#d9a47a', '#b97f55', '#8d5a37', '#5c3a24'];
    for (let row = 0; row < 7; row++) {
      const y = 30 + row * 10;
      for (let x = -40; x < ARENA_W + 40; x += 5 + Math.floor(rnd() * 3)) {
        this.crowd.push({ x, y: y + Math.floor(rnd() * 3), row, shirt: shirts[Math.floor(rnd() * shirts.length)], skin: skins[Math.floor(rnd() * skins.length)], ph: rnd() * 6.28 });
      }
    }
  }

  onEvent(e) {
    const f = this.fight.f;
    if (e.type === 'hit') {
      const D = f[e.who];
      const y = e.zone === 'head' ? -52 : e.zone === 'body' ? -36 : -14;
      const big = e.dmg > 9;
      this.spark(D.x - D.dir * 4, FLOOR_Y + y + (D.ground ? 40 : 0), big ? 10 : 5, big ? '#fff3a0' : '#ffffff');
      if (e.zone === 'head' && e.dmg > 6) this.sweat(D.x, FLOOR_Y + y);
      this.shake = Math.max(this.shake, big ? 4 : 1.5);
      this.excite = Math.min(1, this.excite + (big ? 0.5 : 0.1));
    } else if (e.type === 'block') {
      const D = f[e.who];
      this.spark(D.x + D.dir * 8, FLOOR_Y + (e.zone === 'head' ? -50 : -20), 3, '#9fd3ff');
    } else if (e.type === 'knockdown' || e.type === 'ko') {
      this.shake = 7; this.flash = e.type === 'ko' ? 1 : 0.5; this.excite = 1;
    } else if (e.type === 'takedown') {
      this.shake = 3; this.excite = Math.min(1, this.excite + 0.4);
      const D = f[e.on]; this.dust(D.x, FLOOR_Y);
    } else if (e.type === 'tapout') { this.excite = 1; this.flash = 0.6; }
  }

  spark(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 70;
      this.effects.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.18 + Math.random() * 0.15, color });
    }
  }
  sweat(x, y) {
    for (let i = 0; i < 4; i++) this.effects.push({ kind: 'p', x, y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, g: 260, life: 0.5, color: '#bfe6ff' });
  }
  dust(x, y) {
    for (let i = 0; i < 10; i++) this.effects.push({ kind: 'p', x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 25, life: 0.5, color: '#bdb6a4' });
  }

  draw(dt) {
    const { ctx, fight } = this;
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.4);
    const [A, B] = fight.f;
    // En el suelo, centrar el cuerpo tendido (la cabeza queda lejos del rival).
    const bottom = A.ground === 'bottom' ? A : B.ground === 'bottom' ? B : null;
    const mid = (A.x + B.x) / 2 - (bottom ? bottom.dir * 10 : 0);
    const target = Math.max(0, Math.min(ARENA_W - this.viewW, mid - this.viewW / 2));
    this.camX = this.viewW >= ARENA_W ? (ARENA_W - this.viewW) / 2 : lerp(this.camX || target, target, Math.min(1, dt * 6));
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const sy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    this.shake = Math.max(0, this.shake - dt * 25);

    ctx.setTransform(1, 0, 0, 1, 0, -CROP_TOP);
    this.drawBackground(sx, sy);
    ctx.setTransform(1, 0, 0, 1, Math.round(-this.camX) + sx, sy - CROP_TOP);
    this.drawMat();
    // Sombras
    for (const f of fight.f) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(Math.round(f.x - 13), FLOOR_Y - 1, 26, 3); }
    // El que ataca se dibuja delante
    const order = [...fight.f].sort((a, b) => (a.state === 'attack' || a.ground === 'top' ? 1 : 0) - (b.state === 'attack' || b.ground === 'top' ? 1 : 0));
    for (const f of order) this.drawFighter(f);
    if (this.ceremony) this.drawCeremony(dt);
    this.drawEffects(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, this.flash)})`;
      ctx.fillRect(0, 0, this.viewW, CANVAS_H);
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }
  }

  drawBackground(sx, sy) {
    const { ctx } = this;
    const W = this.viewW;
    ctx.fillStyle = '#07080d'; ctx.fillRect(0, 0, W, VIEW_H);
    // Luces del techo
    for (let i = 0; i < 5; i++) {
      const lx = ((i * 110 - this.camX * 0.3) % (W + 110) + W + 110) % (W + 110) - 55;
      ctx.fillStyle = 'rgba(255,255,230,0.05)';
      for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(lx - 6 - k * 5), 0, 12 + k * 10, 100);
      ctx.fillStyle = '#fffbe0'; ctx.fillRect(Math.round(lx - 3), 2, 6, 2);
    }
    // Público (paralaje)
    const px = Math.round(-this.camX * 0.55) + sx;
    for (const c of this.crowd) {
      const x = c.x + px * (0.8 + c.row * 0.03);
      if (x < -4 || x > W + 4) continue;
      const bob = this.excite > 0.2 ? Math.round(Math.max(0, Math.sin(this.time * 14 + c.ph)) * this.excite * 2) : 0;
      const dim = 0.35 + c.row * 0.07;
      ctx.fillStyle = shade(c.shirt.length === 7 ? c.shirt : '#444444', dim);
      ctx.fillRect(Math.round(x) - 2, c.y - bob + sy + 3, 4, 5);
      ctx.fillStyle = shade(c.skin, dim);
      ctx.fillRect(Math.round(x) - 1, c.y - bob + sy, 3, 3);
      if (this.excite > 0.6 && (c.ph * 10 | 0) % 3 === 0) { ctx.fillRect(Math.round(x) - 3, c.y - bob + sy - 3, 1, 3); ctx.fillRect(Math.round(x) + 3, c.y - bob + sy - 3, 1, 3); }
    }
    // Flashes de cámara del público
    if (this.excite > 0.5 && Math.random() < this.excite * 0.5) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.floor(Math.random() * W), 30 + Math.floor(Math.random() * 60), 1, 1);
    }
  }

  drawMat() {
    const { ctx } = this;
    const x0 = Math.floor(this.camX) - 10, x1 = x0 + this.viewW + 20;
    // Jaula del fondo
    ctx.fillStyle = '#16171d'; ctx.fillRect(x0, 98, x1 - x0, 32);
    ctx.fillStyle = '#2e323c';
    for (let x = x0 - (x0 % 6); x < x1; x += 6) for (let y = 100; y < 130; y += 6) {
      ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 3, y + 3, 1, 1);
      ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1);
    }
    ctx.fillStyle = '#0b0b0e'; ctx.fillRect(x0, 95, x1 - x0, 4);
    for (let x = 40 - 80; x < ARENA_W + 80; x += 100) { ctx.fillStyle = '#0d0d10'; ctx.fillRect(x, 95, 5, 37); ctx.fillStyle = '#c40d0d'; ctx.fillRect(x, 108, 5, 2); }
    // Lona
    ctx.fillStyle = '#c9c8c0'; ctx.fillRect(x0, 130, x1 - x0, 50);
    ctx.fillStyle = '#d9d8d0'; ctx.fillRect(x0, 138, x1 - x0, 42);
    ctx.fillStyle = '#8e8d86'; ctx.fillRect(x0, 130, x1 - x0, 2);
    // Logo en la lona
    if (this.logo) {
      // Encajar en 90x60 y aplastar en perspectiva sobre la lona
      const sc = Math.min(90 / this.logo.width, 60 / this.logo.height);
      const lw = Math.round(this.logo.width * sc), lh = Math.round(this.logo.height * sc * 0.45);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(this.logo, ARENA_W / 2 - lw / 2, 158 - lh / 2, lw, lh);
      ctx.globalAlpha = 1;
    }
    // Bordes del octógono
    ctx.fillStyle = '#111';
    ctx.fillRect(10, 128, 6, 52); ctx.fillRect(ARENA_W - 16, 128, 6, 52);
  }

  // Ceremonia final: el árbitro levanta el brazo del ganador; a veces entra Dana White.
  startCeremony({ winnerIdx, dana }) {
    const W = this.fight.f[winnerIdx], L = this.fight.f[1 - winnerIdx];
    const mid = Math.max(90, Math.min(ARENA_W - 90, (W.x + L.x) / 2));
    W.x = mid - 6; W.dir = 1; W.state = 'raised'; W.ground = null;
    if (L.state !== 'ko' && L.state !== 'tapped') { L.state = 'idle'; L.x = mid + 44; L.dir = -1; } else L.x = mid + 52;
    this.ceremony = { t: 0, refX: mid + 12, dana, danaX: mid + 150, danaTarget: mid + 30 };
  }

  // Decisión: los dos peleadores en el centro, el árbitro en medio tomándolos de las muñecas.
  startDecision() {
    const [A, B] = this.fight.f;
    const mid = Math.max(90, Math.min(ARENA_W - 90, (A.x + B.x) / 2));
    for (const f of this.fight.f) { f.ground = null; f.state = 'idle'; f.move = null; }
    A.x = mid - 18; A.dir = 1; B.x = mid + 18; B.dir = -1;
    this.ceremony = { t: 0, refX: mid, waiting: true, dana: false, danaX: mid + 150, danaTarget: mid + 30 };
  }

  drawCeremony(dt) {
    const c = this.ceremony; c.t += dt;
    drawPerson(this.ctx, Math.round(c.refX), FLOOR_Y, 'ref', { armUp: !c.waiting, t: c.t });
    if (c.dana && c.t > 0.8) {
      c.danaX += (c.danaTarget - c.danaX) * Math.min(1, dt * 2.5);
      drawPerson(this.ctx, Math.round(c.danaX), FLOOR_Y, 'dana', { t: c.t * (Math.abs(c.danaX - c.danaTarget) > 2 ? 2 : 0.5) });
    }
    this.excite = 1;
  }

  poseFor(f) {
    const o = this.fight.opp(f);
    const t = f.t;
    const bob = Math.round(Math.sin(this.time * 5 + f.idx) * 0.7);
    switch (f.state) {
      case 'walk': return { p: mix(POSES.walkA, POSES.walkB, (Math.sin(f.walkPhase) + 1) / 2) };
      case 'block': return { p: f.ground ? POSES.gBottomHit : f.blockZone === 'high' ? POSES.blockHigh : POSES.blockLow };
      case 'attack': {
        const m = f.move, sm = f.speedMult;
        const st = m.startup / sm, ac = m.active, rc = m.recovery / sm;
        const base = f.ground === 'top' ? POSES.gTop : f.ground === 'bottom' ? POSES.gBottom : POSES.guard;
        const ext = f.ground === 'bottom' ? POSES.gBottomHit : (POSES[m.pose] || POSES.jab);
        let p;
        if (t < st) p = mix(base, ext, easeOut(t / st));
        else if (t < st + ac) p = ext;
        else p = mix(ext, base, Math.min(1, (t - st - ac) / rc));
        const spin = m.spin && t < st && t > st * 0.25 && t < st * 0.8;
        return { p, spin };
      }
      case 'hitstun': return { p: f.ground === 'bottom' ? POSES.gBottomHit : f.ground === 'top' ? POSES.gTop : f.hurtZone === 'head' ? POSES.hitHead : f.hurtZone === 'legs' ? POSES.hitLegs : POSES.hitBody };
      case 'sprawled': return { p: POSES.sprawled };
      case 'down': return { p: POSES.down };
      case 'getup': return { p: t < 0.22 ? mix(POSES.down, POSES.getupMid, t / 0.22) : mix(POSES.getupMid, POSES.guard, Math.min(1, (t - 0.22) / 0.23)) };
      case 'ko': return { p: POSES.ko };
      case 'tapped': return { p: POSES.gBottom };
      case 'victory': return { p: POSES.victory, lift: Math.round(Math.abs(Math.sin(this.time * 6)) * 2) };
      case 'raised': return { p: POSES.raised };
      case 'sub': {
        const s = this.fight.sub;
        const shake = Math.round(Math.sin(this.time * 40) * 0.6);
        if (s && s.att === f) return { p: f.ground === 'top' ? POSES.subTop : POSES.gBottom, dx: shake };
        return { p: f.ground === 'bottom' ? POSES.gBottomHit : POSES.subTop, dx: -shake };
      }
      case 'escape_try': return { p: mix(POSES.gBottom, POSES.gBottomHit, (Math.sin(this.time * 30) + 1) / 2) };
      default:
        if (f.ground === 'top') return { p: POSES.gTop };
        if (f.ground === 'bottom') return { p: POSES.gBottom };
        return { p: POSES.guard, bob };
    }
  }

  drawFighter(f) {
    const { ctx } = this;
    const { p, spin, bob = 0, dx = 0, lift = 0 } = this.poseFor(f);
    const dir = spin ? -f.dir : f.dir;
    const ox = Math.round(f.x) + dx, oy = FLOOR_Y + bob - lift;
    const pt = k => [ox + Math.round(p[k][0] * dir), oy + Math.round(p[k][1])];
    const [skin, skinD] = skinOf(f.data.cara);
    const corner = CORNER[f.idx];
    const OUT = '#1a100b';

    const seg = (a, b, w, color, outline = true) => {
      const [x0, y0] = pt(a), [x1, y1] = pt(b);
      if (outline) line(ctx, x0, y0, x1, y1, w + 2, OUT);
      line(ctx, x0, y0, x1, y1, w, color);
    };
    const box = (k, w, h, color, outline = true) => {
      const [x, y] = pt(k);
      if (outline) { ctx.fillStyle = OUT; ctx.fillRect(x - (w >> 1) - 1, y - (h >> 1) - 1, w + 2, h + 2); }
      ctx.fillStyle = color; ctx.fillRect(x - (w >> 1), y - (h >> 1), w, h);
    };
    const legDmg = f.dmg.legs / 100, bodyDmg = f.dmg.body / 100;
    const legColor = legDmg > 0.5 ? mixHex(skinD, '#7a2a3a', (legDmg - 0.5) * 1.2) : skinD;

    // Brazo y pierna traseros
    seg('sb', 'eb', 3, skinD); seg('eb', 'hb', 3, skinD); box('hb', 4, 4, shade(corner.glove, 0.55));
    seg('hp', 'kb', 5, corner.shorts); seg('kb', 'fb', 4, legColor); box('fb', 4, 2, skinD);
    // Torso
    const [hx, hy] = pt('hp'), [nx, ny] = pt('nk');
    line(ctx, hx, hy, nx, ny, 10, OUT);
    line(ctx, hx, hy, nx, ny, 8, bodyDmg > 0.5 ? mixHex(skin, '#a3394a', (bodyDmg - 0.5)) : skin);
    seg('sb', 'sf', 3, skin, false);
    // Tatuajes (pecho y brazos)
    if (f.data.cara?.tatuajes) {
      const ink = '#2c3a4a';
      const lerpPt = (k1, k2, t) => { const [x1, y1] = pt(k1), [x2, y2] = pt(k2); return [Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t)]; };
      ctx.fillStyle = ink;
      for (const t of [0.15, 0.3]) { const [x, y] = lerpPt('nk', 'hp', t); ctx.fillRect(x - 2, y, 2, 1); ctx.fillRect(x + 1, y + 1, 1, 2); }
      for (const t of [0.3, 0.6]) { const [x, y] = lerpPt('sb', 'eb', t); ctx.fillRect(x, y, 1, 2); }
    }
    // Shorts
    box('hp', 10, 6, corner.shorts);
    { const [x, y] = pt('hp'); ctx.fillStyle = corner.trim; ctx.fillRect(x - 5, y - 3, 10, 1); }
    // Pierna delantera
    const [kx, ky] = pt('kf');
    const [hpx, hpy] = pt('hp');
    line(ctx, hpx, hpy, kx, ky, 7, OUT); line(ctx, hpx, hpy, Math.round((hpx + kx) / 2), Math.round((hpy + ky) / 2), 5, corner.shorts);
    line(ctx, Math.round((hpx + kx) / 2), Math.round((hpy + ky) / 2), kx, ky, 5, skin);
    seg('kf', 'ff', 4, legDmg > 0.5 ? mixHex(skin, '#7a2a3a', (legDmg - 0.5) * 1.2) : skin); box('ff', 5, 2, skin);
    // Cabeza
    const [hdx, hdy] = pt('hd');
    const lying = ['down', 'ko', 'tapped'].includes(f.state) || (f.ground === 'bottom');
    drawHeadSmall(ctx, f.data.cara, hdx, hdy, lying ? dir : dir, f.dmg.head / 100);
    // Brazo delantero
    seg('sf', 'ef', 3, skin); seg('ef', 'hf', 3, skin); box('hf', 5, 5, corner.glove);
    if (f.data.cara?.tatuajes) { const [x0, y0] = pt('sf'), [x1, y1] = pt('ef'); ctx.fillStyle = '#2c3a4a'; ctx.fillRect(Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), 2, 2); ctx.fillRect(x1, y1, 1, 1); }
    { const [x, y] = pt('hf'); ctx.fillStyle = '#111'; ctx.fillRect(x - 2, y + 1, 5, 1); }
  }

  drawEffects(dt) {
    const { ctx } = this;
    this.effects = this.effects.filter(e => (e.life -= dt) > 0);
    for (const e of this.effects) {
      e.x += e.vx * dt; e.y += e.vy * dt; if (e.g) e.vy += e.g * dt;
      ctx.fillStyle = e.color; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1 + (e.life > 0.2 ? 1 : 0), 1 + (e.life > 0.2 ? 1 : 0));
    }
  }
}

function line(ctx, x0, y0, x1, y1, w, color) {
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  const h = w >> 1;
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(x - h, y - h, w, w);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function mixHex(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const pa = toRgb(a), pb = toRgb(b);
  return `rgb(${Math.round(lerp(pa[0], pb[0], t))},${Math.round(lerp(pa[1], pb[1], t))},${Math.round(lerp(pa[2], pb[2], t))})`;
}
function toRgb(c) {
  if (c.startsWith('#')) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  return c.match(/\d+/g).map(Number);
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
