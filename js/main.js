// Arranque de la app: datos, idioma, menú, navegación y PWA.
import { loadAll, state } from './store.js';
import { loadLang, t } from './i18n.js';
import { audio } from './audio.js';
import { show, back, resetHistory } from './ui/common.js';
import { initSettingsScreen, initDivisionScreen, initSelectScreen, applyControlSettings, showVS, showResult, runSimulation } from './ui/screens.js';
import { startFight } from './ui/fightScreen.js';
import { initCareer } from './ui/careerScreens.js';
import { loadLogo, placeholderLogo } from './gfx/logo.js';
import { Fight } from './fight/engine.js';
import { AI } from './fight/ai.js';
import { Renderer } from './fight/render.js';

let ufcLogo = null;
let demo = null;

async function boot() {
  await loadAll();
  await loadLang(state.settings.idioma);
  applyControlSettings();

  // Logo de UFC (o provisional si falta el PNG)
  ufcLogo = await loadLogo('ufc.png');
  if (!ufcLogo) {
    const img = document.getElementById('menu-logo');
    img.replaceWith(placeholderLogo('UFC', { w: 320, h: 110 }));
  }

  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { audio.unlock(); audio.play('ui'); show('screen-' + b.dataset.go); }));
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', back));
  initSettingsScreen();
  initDivisionScreen();
  initSelectScreen(onFight);
  initCareer({ namesDb: state.names, logo: ufcLogo });

  // La música arranca con el primer gesto (requisito de los navegadores).
  const firstGesture = () => { audio.unlock(); audio.setVolumes(state.settings.volumenMusica, state.settings.volumenEfectos); if (isMenuish()) audio.startMusic(); };
  window.addEventListener('pointerdown', firstGesture, { once: true });
  window.addEventListener('keydown', firstGesture, { once: true });

  document.querySelectorAll('.screen').forEach(s => s.addEventListener('screen:show', () => {
    const menuish = isMenuish(s.id);
    if (menuish) { startDemo(); audio.startMusic(); } else stopDemo();
  }));

  setupInstall();
  document.getElementById('loading').hidden = true;
  startDemo();
}

function isMenuish(id) {
  id = id || document.querySelector('.screen:not([hidden])')?.id;
  return ['screen-menu', 'screen-settings', 'screen-division', 'screen-select', 'screen-career-start', 'screen-career-create', 'screen-career-pick', 'screen-career-hub', 'screen-career-events'].includes(id);
}

// Pelea de exhibición IA vs IA de fondo en el menú.
function startDemo() {
  if (demo || state.fighters.length < 2) return;
  const canvas = document.getElementById('bg-canvas');
  canvas.hidden = false;
  const a = state.fighters.find(f => f.id === 'justin-gaethje') || state.fighters[0];
  const b = state.fighters.find(f => f.id === 'ilia-topuria') || state.fighters[1];
  const fight = new Fight(a, b, { rounds: 99, roundSeconds: 9999 });
  fight.phase = 'fight';
  const ais = [new AI(fight, 0, 'normal'), new AI(fight, 1, 'normal')];
  const renderer = new Renderer(canvas, fight, { ufcLogo });
  let last = performance.now(), acc = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = now => {
    demo.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!reduced) {
      acc += dt;
      while (acc >= 1 / 60) { ais[0].update(1 / 60); ais[1].update(1 / 60); fight.update(1 / 60); acc -= 1 / 60; }
      for (const e of fight.drainEvents()) renderer.onEvent(e);
      // Reinicia la exhibición antes de que alguien quede KO
      if (fight.phase === 'over' || fight.f.some(f => f.dmg.head > 60)) { stopDemo(); startDemo(); return; }
    }
    renderer.draw(reduced ? 0 : dt);
  };
  demo = { raf: requestAnimationFrame(loop), renderer };
  const onResize = () => renderer.resize();
  window.addEventListener('resize', onResize);
  demo.off = () => window.removeEventListener('resize', onResize);
}

function stopDemo() {
  if (!demo) return;
  cancelAnimationFrame(demo.raf); demo.off();
  demo = null;
  document.getElementById('bg-canvas').hidden = true;
}

function onFight(a, b, { rounds, mode }) {
  audio.unlock();
  if (mode === 'sim') {
    const result = runSimulation(a, b, rounds);
    return showResult(a, b, result, { simulated: true, onRematch: () => onFight(a, b, { rounds, mode }), onMenu: toMenu });
  }
  audio.stopMusic();
  showVS(a, b, () => {
    startFight(a, b, {
      rounds, ufcLogo, eventLabel: 'UFC',
      onEnd: result => {
        if (!result) { resetHistory(['screen-menu', 'screen-division']); show('screen-select', { push: false }); return; }
        showResult(a, b, result, { simulated: false, onRematch: () => onFight(a, b, { rounds, mode }), onMenu: toMenu });
      },
    });
  });
}

function toMenu() {
  resetHistory();
  show('screen-menu', { push: false });
}

function setupInstall() {
  let deferred = null;
  const btn = document.getElementById('install-btn');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => { /* sin SW: la app sigue funcionando */ });
    // Cuando se instala una versión nueva, recargar una vez para usarla.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}

boot().catch(err => {
  console.error(err);
  const l = document.getElementById('loading');
  l.textContent = 'Error: ' + err.message;
  l.hidden = false;
});

// Para depuración/pruebas automáticas
window.__pixelmma = { state, t };
