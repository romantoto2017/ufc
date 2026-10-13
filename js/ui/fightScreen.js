// Pantalla de pelea jugada: bucle, controles táctiles, HUD, banners, entre rounds y pausa.
import { Fight } from '../fight/engine.js';
import { AI } from '../fight/ai.js';
import { Renderer } from '../fight/render.js';
import { STANDING_ACTIONS } from '../fight/moves.js';
import { t } from '../i18n.js';
import { state } from '../store.js';
import { audio, vibrate } from '../audio.js';
import { flagCanvas } from '../gfx/flag.js';
import { show, el, fmtTime } from './common.js';

const DT = 1 / 60;
let current = null;

const BTN_CLASS = { jab: 'punch', cross: 'punch', hook: 'punch', lowKick: 'kick', bodyKick: 'kick', highKick: 'kick', takedown: 'grapple',
  gnpPunch: 'punch', gnpElbow: 'punch', upStrike: 'punch', sub: 'special', escape: 'grapple', standUp: 'grapple' };

export function startFight(a, b, { rounds, onEnd, ufcLogo }) {
  stopFight();
  const s = state.settings;
  const fight = new Fight(a, b, { rounds, roundSeconds: s.duracionRoundMin * 60 });
  const player = fight.f[0];
  const ai = new AI(fight, 1, s.dificultad);
  const canvas = document.getElementById('fight-canvas');
  show('screen-fight');
  const renderer = new Renderer(canvas, fight, { ufcLogo });
  const ctx = { fight, player, ai, renderer, paused: false, raf: 0, acc: 0, last: performance.now(), onEnd, groundMode: null, ended: false, cleanup: [] };
  current = ctx;
  if (window.__pixelmma) window.__pixelmma.fight = fight; // para pruebas automáticas

  buildHud(fight);
  bindControls(ctx);
  setPadMode(ctx, 'stand');
  audio.stopMusic(); audio.startCrowd();
  try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {}); } catch { /* opcional */ }

  const onResize = () => renderer.resize();
  window.addEventListener('resize', onResize);
  ctx.cleanup.push(() => window.removeEventListener('resize', onResize));
  const onVis = () => { if (document.hidden) setPaused(ctx, true); };
  document.addEventListener('visibilitychange', onVis);
  ctx.cleanup.push(() => document.removeEventListener('visibilitychange', onVis));

  banner(t('round_n', { n: 1 }), 'small');
  const loop = now => {
    ctx.raf = requestAnimationFrame(loop);
    const elapsed = Math.min(0.1, (now - ctx.last) / 1000);
    ctx.last = now;
    if (!ctx.paused) {
      ctx.acc += elapsed;
      while (ctx.acc >= DT) { ctx.ai.update(DT); fight.update(DT); ctx.acc -= DT; }
      for (const e of fight.drainEvents()) handleEvent(ctx, e);
    }
    renderer.draw(ctx.paused ? 0 : elapsed);
    updateHud(ctx);
  };
  ctx.raf = requestAnimationFrame(loop);
}

export function stopFight() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  current.cleanup.forEach(fn => fn());
  audio.stopCrowd();
  current = null;
}

// ---------- HUD ----------
function buildHud(fight) {
  fight.f.forEach((f, i) => {
    const box = document.getElementById('hud-' + i);
    box.innerHTML = '';
    const zones = el('canvas', { class: 'zones pixel', width: 6, height: 12 });
    const name = el('div', { class: 'hud-name' }, flagCanvas(f.data.pais, 1.5), ' ', f.data.nombre.split(' ').slice(-1)[0].toUpperCase());
    const stam = el('div', { class: 'hud-stam', role: 'meter', 'aria-label': t('stamina'), 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('i'));
    box.append(zones, name, stam);
    f.hud = { zones: zones.getContext('2d'), stam, bar: stam.querySelector('i'), last: '' };
  });
}

function zoneColor(v) {
  if (v < 25) return '#3ccf5a'; if (v < 50) return '#c9d63c'; if (v < 75) return '#f29b30'; return '#e0302e';
}

function updateHud(ctx) {
  const { fight } = ctx;
  document.getElementById('hud-round').textContent = t('round_n', { n: fight.round }) + ` / ${fight.rounds}`;
  document.getElementById('hud-time').textContent = fmtTime(fight.clock);
  for (const f of fight.f) {
    const pct = Math.round(f.stamina / f.staminaMax * 100);
    f.hud.bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    f.hud.stam.style.width = `${Math.round(f.staminaMax)}%`;
    f.hud.stam.setAttribute('aria-valuenow', String(pct));
    const key = `${f.dmg.head | 0}|${f.dmg.body | 0}|${f.dmg.legs | 0}`;
    if (key !== f.hud.last) {
      f.hud.last = key;
      const g = f.hud.zones;
      g.clearRect(0, 0, 6, 12);
      g.fillStyle = zoneColor(f.dmg.head); g.fillRect(1, 0, 4, 3);
      g.fillStyle = zoneColor(f.dmg.body); g.fillRect(0, 4, 6, 4);
      g.fillStyle = zoneColor(f.dmg.legs); g.fillRect(0, 9, 2, 3); g.fillRect(4, 9, 2, 3);
    }
  }
  const sub = fight.sub;
  const meter = document.getElementById('sub-meter');
  const tap = document.getElementById('tap-btn');
  if (sub) {
    meter.hidden = false; tap.hidden = false;
    document.getElementById('sub-fill').style.width = `${Math.max(0, Math.min(1, sub.progress)) * 100}%`;
    document.getElementById('sub-label').textContent = sub.att === ctx.player ? t('sub_attempt') : t('sub_defend');
  } else { meter.hidden = true; tap.hidden = true; }
  // Modo de botones según posición
  const mode = ctx.player.ground ? 'ground-' + ctx.player.ground : 'stand';
  if (mode !== ctx.groundMode) setPadMode(ctx, mode);
}

function banner(text, kind = '') {
  const b = document.getElementById('banner');
  b.textContent = text;
  b.className = 'banner ' + kind;
  void b.offsetWidth; // reinicia la animación
  b.classList.add('show');
}

// ---------- Controles ----------
function setPadMode(ctx, mode) {
  ctx.groundMode = mode;
  const pad = document.getElementById('pad-right');
  pad.innerHTML = '';
  let actions;
  if (mode === 'stand') actions = STANDING_ACTIONS;
  else if (mode === 'ground-top') actions = ['gnpPunch', 'gnpElbow', 'sub', 'standUp'];
  else actions = ['upStrike', 'sub', 'escape'];
  const moves = ctx.player.moves;
  for (const a of actions) {
    const label = moves[a] ? t(moves[a].nameKey) : t('act_' + a);
    const b = el('button', { class: 'cbtn ' + (BTN_CLASS[a] || ''), 'data-action': a, text: label, 'aria-label': label });
    pad.append(b);
  }
  // Los bloqueos bajos y el movimiento no se usan en el suelo
  document.querySelectorAll('.pad-left [data-hold="blockLow"], .pad-left .cbtn-move').forEach(b => { b.disabled = mode !== 'stand'; });
}

function bindControls(ctx) {
  const root = document.getElementById('controls');
  const tapBtn = document.getElementById('tap-btn');
  const pointers = new Map();
  const vib = () => state.settings.vibracion;

  const down = e => {
    const b = e.target.closest('.cbtn');
    if (!b || b.disabled) return;
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ }
    pointers.set(e.pointerId, b);
    b.classList.add('pressed');
    audio.unlock();
    if (b.dataset.hold) ctx.player.ctl[b.dataset.hold] = true;
    if (b.dataset.action) { ctx.player.ctl.press(b.dataset.action); vibrate(8, vib()); }
  };
  const up = e => {
    const b = pointers.get(e.pointerId);
    if (!b) return;
    pointers.delete(e.pointerId);
    b.classList.remove('pressed');
    if (b.dataset.hold && ![...pointers.values()].some(x => x.dataset.hold === b.dataset.hold)) ctx.player.ctl[b.dataset.hold] = false;
  };
  root.addEventListener('pointerdown', down);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
  root.addEventListener('contextmenu', e => e.preventDefault());

  const tap = e => { e.preventDefault(); ctx.player.ctl.tap(); tapBtn.classList.add('hit'); setTimeout(() => tapBtn.classList.remove('hit'), 60); audio.play('tap'); vibrate(5, vib()); };
  tapBtn.addEventListener('pointerdown', tap);

  // Teclado (para probar en ordenador)
  const KEYS = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'blockHigh', KeyS: 'blockLow' };
  const ACT = { KeyJ: 'jab', KeyK: 'cross', KeyL: 'hook', KeyU: 'lowKick', KeyI: 'bodyKick', KeyO: 'highKick', KeyH: 'takedown', Space: null };
  const kd = e => {
    if (e.repeat) return;
    if (KEYS[e.code]) { ctx.player.ctl[KEYS[e.code]] = true; return; }
    if (e.code === 'Escape') { setPaused(ctx, !ctx.paused); return; }
    if (ctx.fight.sub && (e.code === 'Space' || ACT[e.code])) { ctx.player.ctl.tap(); return; }
    if (e.code in ACT) {
      let a = ACT[e.code];
      const g = ctx.player.ground;
      if (g === 'top') a = { KeyJ: 'gnpPunch', KeyK: 'gnpElbow', KeyH: 'sub', KeyL: 'standUp' }[e.code];
      if (g === 'bottom') a = { KeyJ: 'upStrike', KeyH: 'sub', KeyK: 'escape' }[e.code];
      if (a) ctx.player.ctl.press(a);
    }
  };
  const ku = e => { if (KEYS[e.code]) ctx.player.ctl[KEYS[e.code]] = false; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  const pauseBtn = document.getElementById('pause-btn');
  const resume = document.getElementById('resume-btn');
  const quit = document.getElementById('quit-btn');
  const onPause = () => setPaused(ctx, true);
  const onResume = () => setPaused(ctx, false);
  const onQuit = () => { setPaused(ctx, false); finish(ctx, null); };
  pauseBtn.addEventListener('click', onPause); resume.addEventListener('click', onResume); quit.addEventListener('click', onQuit);

  ctx.cleanup.push(() => {
    root.removeEventListener('pointerdown', down); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up);
    tapBtn.removeEventListener('pointerdown', tap);
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    pauseBtn.removeEventListener('click', onPause); resume.removeEventListener('click', onResume); quit.removeEventListener('click', onQuit);
    document.getElementById('pause-menu').hidden = true; document.getElementById('between').hidden = true;
  });
}

function setPaused(ctx, p) {
  if (ctx.ended) return;
  ctx.paused = p;
  document.getElementById('pause-menu').hidden = !p;
  if (p) { const c = ctx.player.ctl; c.left = c.right = c.blockHigh = c.blockLow = false; document.getElementById('resume-btn').focus(); }
  ctx.last = performance.now();
}

// ---------- Eventos de la pelea ----------
function handleEvent(ctx, e) {
  const { fight, renderer, player } = ctx;
  const vib = state.settings.vibracion;
  renderer.onEvent(e);
  switch (e.type) {
    case 'swing': if (e.moveType !== 'grapple') audio.play('whoosh'); break;
    case 'hit': {
      audio.play(e.dmg > 9 ? 'heavy' : e.move.toLowerCase().includes('kick') ? 'kick' : 'punch');
      if (e.who === player.idx) vibrate(e.dmg > 9 ? 40 : 15, vib);
      if (e.counter && e.by === player.idx) banner(t('counter'), 'small');
      audio.setCrowd(Math.min(1, renderer.excite));
      break;
    }
    case 'block': audio.play('block'); break;
    case 'knockdown': audio.play('knockdown'); banner(t('knockdown'), 'big'); vibrate([60, 40, 60], vib); break;
    case 'takedown': audio.play('takedown'); banner(t('takedown_banner'), 'small'); vibrate(30, vib); break;
    case 'standup': if (e.reason === 'ref_standup') banner(t('stood_up'), 'small'); break;
    case 'sub_escape': banner(t('sub_escaped'), 'small'); break;
    case 'ko': audio.play('ko'); audio.play('bell', { times: 3 }); banner(fight.result?.method === 'tko' ? t('tko_banner') : t('ko_banner'), 'big'); vibrate([100, 50, 200], vib); break;
    case 'tapout': audio.play('bell', { times: 3 }); audio.roar(1); banner(t('sub_banner'), 'big'); vibrate([80, 40, 80], vib); break;
    case 'fight': banner(t('fight_go'), 'big'); break;
    case 'bell': audio.play('bell', { times: fight.phase === 'fight' ? 1 : 2 }); break;
    case 'round_start': banner(fight.round === fight.rounds ? t('final_round') : t('round_n', { n: fight.round }), 'small'); document.getElementById('between').hidden = true; break;
    case 'round_end': if (fight.phase === 'between') showBetween(ctx); break;
    case 'fight_end': setTimeout(() => finish(ctx, fight.result), e.result.method.startsWith('dec') || e.result.method === 'draw' ? 600 : 2600); break;
    default: break;
  }
}

function showBetween(ctx) {
  const { fight } = ctx;
  const box = document.getElementById('between');
  const [A, B] = fight.f, sa = A.cur, sb = B.cur;
  const row = (k, a, b) => [el('span', { text: String(a) }), el('span', { class: 'k', text: t(k) }), el('span', { text: String(b) })];
  const skip = el('button', { class: 'btn btn-primary', text: t('skip') });
  fight.betweenSeconds = 6;
  skip.addEventListener('click', () => { fight.phaseT = 99; });
  box.innerHTML = '';
  box.append(el('div', { class: 'panel' },
    el('h2', { text: t('between_rounds', { n: fight.round }) }),
    el('div', { class: 'between-grid' },
      el('b', { text: A.data.nombre.split(' ').pop() }), el('span'), el('b', { text: B.data.nombre.split(' ').pop() }),
      ...row('stat_landed', `${sa.landed}/${sa.thrown}`, `${sb.landed}/${sb.thrown}`),
      ...row('stat_kd', sa.kd, sb.kd), ...row('stat_td', sa.tdLanded, sb.tdLanded),
      ...row('stat_control', fmtTime(sa.control), fmtTime(sb.control))),
    el('p', { class: 'note', text: t('next_round_in') }), skip));
  box.hidden = false;
  const c = ctx.player.ctl; c.left = c.right = c.blockHigh = c.blockLow = false;
}

function finish(ctx, result) {
  if (ctx.ended) return;
  ctx.ended = true;
  const { onEnd } = ctx;
  stopFight();
  onEnd(result);
}
