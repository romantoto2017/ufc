// Pantallas de menú: configuración, división, selección de peleadores, VS y resultado.
import { t, loadLang, applyI18n } from '../i18n.js';
import { state, saveSettings, resetSettings, fightersIn } from '../store.js';
import { audio } from '../audio.js';
import { ATTRS, stars } from '../ratings.js';
import { winProbability, simulateFight, matchupFactors } from '../sim.js';
import { portraitCanvas } from '../gfx/face.js';
import { flagCanvas } from '../gfx/flag.js';
import { show, el, starsEl, rankLabel, streakText, fmtTime, segmented } from './common.js';

// ---------- CONFIGURACIÓN ----------
export function buildSettings() {
  const s = state.settings;
  const form = document.getElementById('settings-form');
  form.innerHTML = '';
  const block = (labelKey, control, valueText) => {
    const id = 'set-' + labelKey;
    const lab = el('label', { for: id }, t(labelKey), valueText ? el('span', { class: 'value', text: valueText }) : null);
    control.id = control.id || id;
    return el('div', { class: 'setting' }, lab, control);
  };
  const seg = (key, labelKey, opts) => {
    const c = el('div', { class: 'seg' });
    segmented(c, opts, s[key], v => { s[key] = v; saveSettings(); onSettingChanged(key); });
    c.setAttribute('aria-label', t(labelKey));
    return block(labelKey, c);
  };
  const range = (key, labelKey) => {
    const input = el('input', { type: 'range', min: 0, max: 100, step: 5, value: s[key] });
    const wrap = block(labelKey, input, `${s[key]}%`);
    input.addEventListener('input', () => { s[key] = +input.value; wrap.querySelector('.value').textContent = `${s[key]}%`; onSettingChanged(key); });
    input.addEventListener('change', () => { saveSettings(); audio.play('ui'); });
    return wrap;
  };
  form.append(
    seg('idioma', 'settings_language', [{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]),
    seg('dificultad', 'settings_difficulty', ['facil', 'normal', 'dificil', 'leyenda'].map(v => ({ value: v, label: t('diff_' + v) }))),
    range('volumenMusica', 'settings_music'),
    range('volumenEfectos', 'settings_sfx'),
    seg('duracionRoundMin', 'settings_round_length', [1, 2, 3, 5].map(v => ({ value: v, label: `${v} ${t('minutes_short')}` }))),
    seg('tamanoBotones', 'settings_button_size', ['pequeno', 'mediano', 'grande'].map(v => ({ value: v, label: t('size_' + v) }))),
    range('opacidadBotones', 'settings_button_opacity'),
    seg('vibracion', 'settings_vibration', [{ value: true, label: t('on') }, { value: false, label: t('off') }]),
  );
}

export function applyControlSettings() {
  const s = state.settings;
  const size = { pequeno: 48, mediano: 60, grande: 72 }[s.tamanoBotones] || 60;
  document.documentElement.style.setProperty('--btn', size + 'px');
  document.documentElement.style.setProperty('--btn-op', String(Math.max(0.2, s.opacidadBotones / 100)));
  audio.setVolumes(s.volumenMusica, s.volumenEfectos);
}

async function onSettingChanged(key) {
  applyControlSettings();
  if (key === 'idioma') { await loadLang(state.settings.idioma); buildSettings(); }
  if (key === 'vibracion' && state.settings.vibracion && navigator.vibrate) navigator.vibrate(30);
}

export function initSettingsScreen() {
  document.getElementById('settings-reset').addEventListener('click', async () => {
    resetSettings(); applyControlSettings(); await loadLang(state.settings.idioma); buildSettings(); audio.play('ui');
  });
  document.getElementById('screen-settings').addEventListener('screen:show', buildSettings);
}

// ---------- DIVISIÓN ----------
export const selection = { division: 'ligero', ids: [null, null], active: 0, rounds: 3, mode: 'play' };

export function initDivisionScreen() {
  document.getElementById('screen-division').addEventListener('screen:show', () => {
    const grid = document.getElementById('division-grid');
    grid.innerHTML = '';
    for (const d of state.divisions) {
      const n = fightersIn(d.id).length;
      const b = el('button', { class: 'btn', disabled: n < 2 },
        el('span', { text: t('div_' + d.id) }),
        el('small', { text: n >= 2 ? `${d.pesoLb} lb · ${t('fighters_count', { n })}` : t('division_empty') }));
      b.addEventListener('click', () => {
        audio.play('ui');
        if (selection.division !== d.id) selection.ids = [null, null];
        selection.division = d.id;
        show('screen-select');
      });
      grid.append(b);
    }
  });
}

// ---------- SELECCIÓN ----------
function fighterById(id) { return state.fighters.find(f => f.id === id); }

function renderCard(idx) {
  const card = document.getElementById('card-' + idx);
  const f = fighterById(selection.ids[idx]);
  card.classList.toggle('active', selection.active === idx);
  card.setAttribute('aria-pressed', String(selection.active === idx));
  card.innerHTML = '';
  const cornerKey = selection.mode === 'play' ? (idx === 0 ? 'corner_red' : 'corner_blue') : (idx === 0 ? 'corner_red_sim' : 'corner_blue_sim');
  card.append(el('div', { class: 'corner-label', text: t(cornerKey) }));
  if (!f) { card.append(el('p', { class: 'hint', text: t('tap_to_assign') })); return; }
  const portrait = portraitCanvas(f.cara, 3); portrait.classList.add('portrait');
  card.append(
    el('div', { class: 'fc-top' }, portrait,
      el('div', {},
        el('div', { class: 'fc-name', text: f.nombre }),
        f.apodo ? el('div', { class: 'fc-nick', text: `"${f.apodo}"` }) : null,
        el('div', { class: 'fc-meta' }, flagCanvas(f.pais, 2), f.paisSecundario ? flagCanvas(f.paisSecundario, 2) : null, rankLabel(f)),
        el('div', { class: 'fc-meta' }, starsEl(stars(f.atributos)), el('span', { text: f.record })),
      )),
    el('div', { class: 'fc-facts' },
      el('span', {}, `${t('age')}: `, el('b', { text: `${f.edad}` })),
      el('span', {}, `${t('style')}: `, el('b', { text: t('style_' + f.estilo) })),
      el('span', {}, `${t('height')}: `, el('b', { text: `${f.altura} cm` })),
      el('span', {}, `${t('reach')}: `, el('b', { text: `${f.alcance} cm` })),
      el('span', {}, `${t('stance')}: `, el('b', { text: t('stance_' + f.postura) })),
      el('span', {}, `${t('streak')}: `, el('b', { text: streakText(f.racha) })),
    ),
    el('div', { class: 'attrs' }, ATTRS.map(k => el('div', { class: 'attr' },
      el('span', { text: t('attr_' + k) }), el('b', { text: String(Math.round(f.atributos[k])) }),
      el('div', { class: 'bar' }, el('i', { style: `width:${f.atributos[k]}%;background:${attrColor(f.atributos[k])}` })),
    ))),
    el('p', { class: 'note', text: (f.fuente === 'ea' ? t('source_ea') : t('source_calculado')) + (f.verificar ? ` · ${t('to_verify')}` : '') }),
  );
}

function attrColor(v) { return v >= 85 ? '#3ccf5a' : v >= 70 ? '#a5d63c' : v >= 55 ? '#f2c230' : '#e0572e'; }

function renderList() {
  const list = document.getElementById('fighter-list');
  list.innerHTML = '';
  for (const f of fightersIn(selection.division)) {
    const tagIdx = selection.ids.indexOf(f.id);
    const b = el('button', { type: 'button', 'aria-pressed': String(tagIdx >= 0) },
      flagCanvas(f.pais, 2),
      el('span', { text: f.nombre }),
      starsEl(stars(f.atributos)),
      tagIdx >= 0 ? el('span', { class: 'tag ' + (tagIdx === 0 ? 'red' : 'blue'), text: tagIdx === 0 ? 'R' : 'A' }) : null);
    b.addEventListener('click', () => {
      audio.play('ui');
      const other = 1 - selection.active;
      if (selection.ids[other] === f.id) selection.ids[other] = selection.ids[selection.active];
      selection.ids[selection.active] = f.id;
      if (!selection.ids[other]) selection.active = other;
      renderSelect();
    });
    list.append(el('li', {}, b));
  }
}

function renderWinProb() {
  const box = document.getElementById('win-prob');
  const [a, b] = selection.ids.map(fighterById);
  box.innerHTML = '';
  if (!a || !b || a === b) return;
  const p = winProbability(a, b);
  box.setAttribute('aria-label', `${t('win_prob')}: ${a.nombre} ${Math.round(p * 100)}%, ${b.nombre} ${Math.round((1 - p) * 100)}%`);
  box.append(el('span', { class: 'r', style: `width:${p * 100}%`, text: `${Math.round(p * 100)}%` }),
    el('span', { class: 'b', style: `width:${(1 - p) * 100}%`, text: `${Math.round((1 - p) * 100)}%` }));
}

export function renderSelect() {
  document.getElementById('select-title').textContent = t('div_' + selection.division);
  renderCard(0); renderCard(1); renderList(); renderWinProb();
  segmented(document.getElementById('opt-rounds'), [3, 5].map(v => ({ value: v, label: String(v) })), selection.rounds, v => { selection.rounds = v; });
  segmented(document.getElementById('opt-mode'), [{ value: 'play', label: t('mode_play') }, { value: 'sim', label: t('mode_sim') }], selection.mode, v => { selection.mode = v; renderCard(0); renderCard(1); });
  const ok = selection.ids[0] && selection.ids[1] && selection.ids[0] !== selection.ids[1];
  document.getElementById('fight-btn').disabled = !ok;
}

export function initSelectScreen(onFight) {
  const scr = document.getElementById('screen-select');
  scr.addEventListener('screen:show', () => {
    const fs = fightersIn(selection.division);
    if (!selection.ids[0] && fs[0]) selection.ids[0] = fs[0].id;
    if (!selection.ids[1] && fs[1]) selection.ids[1] = fs[1].id;
    selection.rounds = fs.some(f => f.ranking === 0 && selection.ids.includes(f.id)) ? 5 : selection.rounds;
    renderSelect();
  });
  for (const i of [0, 1]) {
    const c = document.getElementById('card-' + i);
    const act = () => { selection.active = i; audio.play('ui'); renderCard(0); renderCard(1); };
    c.addEventListener('click', act);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  }
  document.getElementById('fight-btn').addEventListener('click', () => {
    audio.play('ui');
    const [a, b] = selection.ids.map(fighterById);
    onFight(a, b, { rounds: selection.rounds, mode: selection.mode });
  });
}

// ---------- VS ----------
export function showVS(a, b, done) {
  const box = document.getElementById('vs-layout');
  box.innerHTML = '';
  const side = (f, cls) => {
    const p = portraitCanvas(f.cara, 5); p.classList.add('portrait');
    if (cls === 'right') p.style.transform = 'scaleX(-1)';
    return el('div', { class: 'vs-side ' + cls }, p,
      el('div', { class: 'name', text: f.nombre }),
      el('div', { class: 'fc-meta' }, flagCanvas(f.pais, 3), rankLabel(f)),
      el('div', { class: 'fc-meta' }, starsEl(stars(f.atributos)), el('span', { text: f.record })));
  };
  box.append(side(a, 'left'), el('div', { class: 'vs-word', text: t('vs') }), side(b, 'right'));
  show('screen-vs');
  audio.play('bell');
  let finished = false;
  const go = () => { if (finished) return; finished = true; done(); };
  const timer = setTimeout(go, 2600);
  box.onclick = () => { clearTimeout(timer); go(); };
}

// ---------- RESULTADO ----------
export function methodText(r) {
  let m = t('method_' + r.method);
  if (r.method === 'sub' && r.submission) m += ` (${t(r.submission)})`;
  return m;
}

export function showResult(a, b, result, { simulated, onRematch, onMenu }) {
  const box = document.getElementById('result-layout');
  box.innerHTML = '';
  const fighters = [a, b];
  const winner = fighters.find(f => f.id === result.winnerId);
  const main = el('div', { class: 'result-main' });
  if (winner) {
    const p = portraitCanvas(winner.cara, 4); p.classList.add('portrait');
    main.append(el('div', { class: 'label', text: t('winner') }), p, el('div', { class: 'name', id: 'result-title', text: winner.nombre }),
      el('div', { class: 'fc-meta' }, flagCanvas(winner.pais, 3)));
  } else {
    main.append(el('div', { class: 'name', id: 'result-title', text: t('draw') }));
  }
  main.append(el('div', { class: 'method', text: methodText(result) }),
    el('div', { text: t('round_time', { r: result.round, t: fmtTime(result.time) }) }));
  if (simulated) main.append(el('p', { class: 'note', text: t('simulated') }));
  main.append(el('p', { class: 'note', text: t('exhibition_note') }));

  const side = el('div', { class: 'result-side' });
  if (result.scorecards) {
    const cards = result.scorecardsAB || (winner === b ? result.scorecards.map(([w, l]) => [l, w]) : result.scorecards);
    side.append(el('div', { class: 'box' }, el('h3', { text: t('scorecards') }),
      el('table', { class: 'stats' }, el('tr', {}, el('td', { text: a.nombre.split(' ').pop() }), el('td', {}), el('td', { text: b.nombre.split(' ').pop() })), cards.map((c, i) => el('tr', {}, el('td', { text: String(c[0]) }), el('td', { text: t('judge_n', { n: i + 1 }) }), el('td', { text: String(c[1]) }))))));
  }
  if (result.stats) {
    const [s0, s1] = result.stats;
    const row = (k, v0, v1) => el('tr', {}, el('td', { text: String(v0) }), el('td', { text: t(k) }), el('td', { text: String(v1) }));
    side.append(el('div', { class: 'box' }, el('h3', { text: t('stats') }),
      el('table', { class: 'stats' },
        el('tr', {}, el('td', { text: a.nombre.split(' ').pop() }), el('td', {}), el('td', { text: b.nombre.split(' ').pop() })),
        row('stat_landed', `${s0.landed}/${s0.thrown}`, `${s1.landed}/${s1.thrown}`),
        row('stat_head', s0.head, s1.head), row('stat_body', s0.body, s1.body), row('stat_legs', s0.legs, s1.legs),
        row('stat_kd', s0.kd, s1.kd), row('stat_td', `${s0.tdLanded}/${s0.tdAtt}`, `${s1.tdLanded}/${s1.tdAtt}`),
        row('stat_sub', s0.subAtt, s1.subAtt), row('stat_control', fmtTime(s0.control), fmtTime(s1.control)))));
  }
  if (simulated) {
    const p = winProbability(a, b), f = matchupFactors(a, b);
    const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2);
    const row = (k, v) => el('tr', {}, el('td', { text: k === 'win_prob' ? `${Math.round(p * 100)}%` : fmt(v) }), el('td', { text: t(k) }), el('td', { text: k === 'win_prob' ? `${Math.round((1 - p) * 100)}%` : '' }));
    side.append(el('div', { class: 'box' }, el('h3', { text: t('sim_factors') }),
      el('table', { class: 'stats' },
        el('tr', {}, el('td', { text: a.nombre.split(' ').pop() }), el('td', {}), el('td', { text: b.nombre.split(' ').pop() })),
        row('win_prob'), row('factor_rating', f.rating), row('factor_style', f.style), row('factor_reach', f.reach), row('factor_chin', f.chin), row('factor_age', f.age)),
      el('p', { class: 'note', text: t('sim_factors_note') })));
  }
  const rematch = el('button', { class: 'btn', text: t('rematch') });
  const menu = el('button', { class: 'btn btn-primary', text: t('to_menu') });
  rematch.addEventListener('click', () => { audio.play('ui'); onRematch(); });
  menu.addEventListener('click', () => { audio.play('ui'); onMenu(); });
  side.append(el('div', { class: 'result-actions' }, rematch, menu));
  box.append(main, side);
  show('screen-result');
}

export function runSimulation(a, b, rounds) {
  return simulateFight(a, b, { rounds, roundSeconds: 300 });
}

export { applyI18n };
