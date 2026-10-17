// Interfaz del modo carrera: inicio, creación, elección de peleador existente, hub, contrato
// (conferencia de prensa + firma), cinturón y resumen de eventos tras cada pelea.
import { t, lang } from '../i18n.js';
import { state } from '../store.js';
import { audio } from '../audio.js';
import { stars, ATTRS, STYLES } from '../ratings.js';
import { simulateFight } from '../sim.js';
import { portraitCanvas, drawPortrait } from '../gfx/face.js';
import { flagCanvas } from '../gfx/flag.js';
import { loadLogo, placeholderLogo } from '../gfx/logo.js';
import { drawPressConference, drawHandSignature, SIGNATURE_FONT, drawBelt } from '../gfx/scenes.js';
import { show, el, starsEl, rankLabel, fmtTime, segmented, resetHistory } from './common.js';
import { showResult, showVS } from './screens.js';
import { startFight } from './fightScreen.js';
import * as C from '../career/career.js';
import { randomName, namesFor } from '../career/generator.js';

let career = null;
let names = null;
let ufcLogo = null;
const ctx = () => ({ promos: state.promotionsDb, names });

const HEIGHT_RANGE = { mosca: [155, 172], gallo: [160, 176], pluma: [163, 180], ligero: [165, 185], welter: [170, 190], medio: [175, 195], semipesado: [178, 198], pesado: [183, 206] };
const SUBNATIONAL = { ENG: 'England', SCO: 'Scotland', WAL: 'Wales', NIR: 'Northern Ireland' };

export function countryName(code) {
  if (SUBNATIONAL[code]) return lang() === 'es' ? { ENG: 'Inglaterra', SCO: 'Escocia', WAL: 'Gales', NIR: 'Irlanda del Norte' }[code] : SUBNATIONAL[code];
  try { return new Intl.DisplayNames([lang()], { type: 'region' }).of(code) || code; } catch { return code; }
}

// pais: necesario cuando todavía no hay carrera activa (pantalla de inicio recién abierta la app).
function orgName(id, pais = career?.player?.pais) {
  if (id === 'nacional' || !id) return t('national_circuit', { country: countryName(pais) });
  return C.promoById(state.promotionsDb, id)?.nombre || id;
}

async function orgLogo(id, w = 120, h = 36) {
  const promo = C.promoById(state.promotionsDb, id);
  const img = promo?.logo ? await loadLogo(promo.logo) : null;
  if (img) return img;
  return placeholderLogo(id === 'nacional' || !id ? `${t('national_short')} ${career?.player?.pais || ''}` : (promo?.nombre || id), { w, h });
}

function eventText(ev) {
  if (!ev) return '';
  switch (ev.key) {
    case 'event_national': return t('event_national', { country: countryName(career.player.pais), n: ev.n });
    case 'event_dwcs': return t('event_dwcs', { season: ev.season, n: ev.n });
    case 'event_rtu': return t('event_rtu', { n: ev.n });
    case 'event_ufc': return `UFC ${ev.n}`;
    default: return `${ev.org} ${ev.n}`;
  }
}

function persist() { if (career) C.save(career); }
const money = v => '$' + Math.round(v).toLocaleString(lang() === 'es' ? 'es-AR' : 'en-US');

export function initCareer({ namesDb, logo }) {
  C.setNames(namesDb);
  if (window.__pixelmma) { window.__pixelmma.career = () => career; window.__pixelmma.showBelt = org => showBelt({ org, first: true }, () => show('screen-career-hub', { push: false })); }
  names = namesDb; ufcLogo = logo;
  document.getElementById('screen-career-start').addEventListener('screen:show', renderStart);
  document.getElementById('screen-career-create').addEventListener('screen:show', renderCreate);
  document.getElementById('screen-career-pick').addEventListener('screen:show', renderPick);
  document.getElementById('screen-career-hub').addEventListener('screen:show', renderHub);
  document.getElementById('create-confirm').addEventListener('click', confirmCreate);
}

// ---------- INICIO ----------
function renderStart() {
  const box = document.getElementById('career-start');
  box.innerHTML = '';
  let saved = C.load();
  // Una partida guardada que no se puede mostrar no debe dejar la pantalla vacía.
  if (saved) try { renderSavedCard(box, saved); } catch (err) { console.warn('partida guardada ilegible', err); box.innerHTML = ''; saved = null; }
  const create = el('button', { class: 'btn' + (saved ? '' : ' btn-primary') }, el('span', { text: t('career_new_create') }), el('small', { text: t('career_new_create_sub') }));
  const pick = el('button', { class: 'btn' }, el('span', { text: t('career_new_pick') }), el('small', { text: t('career_new_pick_sub') }));
  const guard = fn => () => { if (C.load() && !confirm(t('career_overwrite'))) return; audio.play('ui'); fn(); };
  create.addEventListener('click', guard(() => show('screen-career-create')));
  pick.addEventListener('click', guard(() => show('screen-career-pick')));
  box.append(el('div', { class: 'start-actions' }, create, pick));
}

function renderSavedCard(box, saved) {
  const p = saved.player;
  const pc = portraitCanvas(p.cara, 3); pc.classList.add('portrait');
  const cont = el('button', { class: 'btn btn-primary' }, el('span', { text: t('career_continue') }));
  cont.addEventListener('click', () => { career = saved; audio.play('ui'); show('screen-career-hub'); });
  box.append(el('div', { class: 'card-row' }, pc, el('div', {},
    el('div', { class: 'fc-name', text: p.nombre }),
    el('div', { class: 'fc-meta' }, flagCanvas(p.pais, 2), el('span', { text: p.record }), starsEl(stars(p.atributos))),
    el('div', { class: 'note', text: `${orgName(saved.stage === 'nacional' ? 'nacional' : saved.org, p.pais)} · ${saved.date}` }))), cont);
}

// ---------- CREACIÓN ----------
const draft = {
  nombre: '', apodo: '', pais: 'AR', edad: 21, division: 'ligero', altura: 176, alcance: 180, estilo: 'boxeo', postura: 'ortodoxa',
  cara: { piel: 2, pelo: 'corto', colorPelo: 'negro', barba: 'sombra', cejas: 'normales', cabeza: 'redonda' },
};

function renderCreate() {
  const form = document.getElementById('create-form');
  form.innerHTML = '';
  const field = (labelKey, control) => el('div', { class: 'setting' }, el('label', { text: t(labelKey) }), control);
  const seg = (opts, value, on) => { const c = el('div', { class: 'seg' }); segmented(c, opts, value, v => { on(v); renderPreview(); }); return c; };
  const range = (min, max, value, on, fmt) => {
    const out = el('span', { class: 'value', text: fmt(value) });
    const i = el('input', { type: 'range', min, max, value });
    i.addEventListener('input', () => { on(+i.value); out.textContent = fmt(+i.value); renderPreview(); });
    return el('div', { class: 'range-row' }, i, out);
  };
  const nameIn = el('input', { type: 'text', maxlength: 24, value: draft.nombre, placeholder: t('name_placeholder'), class: 'text-in', autocomplete: 'off' });
  nameIn.addEventListener('input', () => { draft.nombre = nameIn.value; renderPreview(); });
  const nickIn = el('input', { type: 'text', maxlength: 20, value: draft.apodo, placeholder: t('nick_placeholder'), class: 'text-in', autocomplete: 'off' });
  nickIn.addEventListener('input', () => { draft.apodo = nickIn.value; });
  const countries = Object.keys(names).filter(k => /^[A-Z]{2,3}$/.test(k)).sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const sel = el('select', { class: 'text-in' }, countries.map(c => el('option', { value: c, selected: c === draft.pais, text: countryName(c) })));
  sel.addEventListener('change', () => { draft.pais = sel.value; renderPreview(); });
  const randomBtn = el('button', { type: 'button', class: 'btn btn-small', text: t('random_name') });
  randomBtn.addEventListener('click', () => {
    draft.nombre = randomName(Math.random, namesFor(names, draft.pais));
    nameIn.value = draft.nombre; renderPreview();
  });
  const [hMin, hMax] = HEIGHT_RANGE[draft.division];
  draft.altura = Math.min(hMax, Math.max(hMin, draft.altura));
  draft.alcance = Math.min(draft.altura + 14, Math.max(draft.altura - 6, draft.alcance));
  form.append(
    field('field_name', el('div', { class: 'range-row' }, nameIn, randomBtn)),
    field('field_nick', nickIn),
    field('field_country', sel),
    field('age', range(18, 35, draft.edad, v => { draft.edad = v; }, v => `${v} ${t('years')}`)),
    field('field_division', seg(state.divisions.map(d => ({ value: d.id, label: t('divshort_' + d.id) })), draft.division, v => { draft.division = v; renderCreate(); })),
    field('height', range(hMin, hMax, draft.altura, v => { draft.altura = v; }, v => `${v} cm`)),
    field('reach', range(draft.altura - 6, draft.altura + 14, draft.alcance, v => { draft.alcance = v; }, v => `${v} cm`)),
    field('style', seg(STYLES.map(s => ({ value: s, label: t('style_' + s) })), draft.estilo, v => { draft.estilo = v; })),
    field('stance', seg(['ortodoxa', 'zurda', 'switch'].map(s => ({ value: s, label: t('stance_' + s) })), draft.postura, v => { draft.postura = v; })),
    field('face_skin', seg([0, 1, 2, 3, 4, 5].map(v => ({ value: v, label: String(v + 1) })), draft.cara.piel, v => { draft.cara.piel = v; })),
    field('face_hair', seg(['rapado', 'corto', 'fade', 'medio', 'largo', 'rizado', 'mohicano', 'calvo'].map(v => ({ value: v, label: t('hair_' + v) })), draft.cara.pelo, v => { draft.cara.pelo = v; })),
    field('face_hair_color', seg(['negro', 'castano', 'castano_claro', 'rubio', 'pelirrojo', 'gris'].map(v => ({ value: v, label: t('hc_' + v) })), draft.cara.colorPelo, v => { draft.cara.colorPelo = v; })),
    field('face_beard', seg(['ninguna', 'sombra', 'corta', 'completa', 'candado', 'bigote'].map(v => ({ value: v, label: t('beard_' + v) })), draft.cara.barba, v => { draft.cara.barba = v; })),
    field('face_brows', seg(['finas', 'normales', 'gruesas'].map(v => ({ value: v, label: t('brows_' + v) })), draft.cara.cejas, v => { draft.cara.cejas = v; })),
    field('face_head', seg(['redonda', 'cuadrada', 'ovalada', 'ancha'].map(v => ({ value: v, label: t('head_' + v) })), draft.cara.cabeza, v => { draft.cara.cabeza = v; })),
  );
  renderPreview();
}

function renderPreview() {
  const box = document.getElementById('create-preview');
  box.innerHTML = '';
  const p = C.createPlayer({ ...draft, nombre: draft.nombre || '???', seed: 7 });
  const pc = portraitCanvas(draft.cara, 4); pc.classList.add('portrait');
  box.append(pc, el('div', { class: 'fc-name', text: draft.nombre || '—' }),
    el('div', { class: 'fc-meta' }, flagCanvas(draft.pais, 2), el('span', { text: countryName(draft.pais) })),
    el('div', { class: 'fc-meta' }, starsEl(stars(p.atributos)), el('span', { text: '0-0-0' })),
    el('div', { class: 'attrs' }, ATTRS.map(k => el('div', { class: 'attr' }, el('span', { text: t('attr_' + k) }), el('b', { text: String(Math.round(p.atributos[k])) }), el('div', { class: 'bar' }, el('i', { style: `width:${p.atributos[k]}%` }))))),
    el('p', { class: 'note', text: t('create_note') }));
  document.getElementById('create-confirm').disabled = !draft.nombre.trim();
}

function confirmCreate() {
  if (!draft.nombre.trim()) return;
  audio.play('ui');
  const player = C.createPlayer({ ...draft, nombre: draft.nombre.trim(), apodo: draft.apodo.trim(), seed: Math.floor(Math.random() * 1e9), cara: { ...draft.cara } });
  career = C.newCareer({ player, promos: state.promotionsDb, fighters: state.fighters });
  persist();
  resetHistory(['screen-menu']);
  show('screen-career-hub', { push: false });
}

// ---------- PELEADOR EXISTENTE ----------
let pickDiv = 'ligero';
function renderPick() {
  segmented(document.getElementById('pick-div'), state.divisions.map(d => ({ value: d.id, label: t('divshort_' + d.id) })), pickDiv, v => { pickDiv = v; renderPick(); });
  const list = document.getElementById('pick-list');
  list.innerHTML = '';
  for (const f of state.fighters.filter(x => x.division === pickDiv).sort((a, b) => (a.ranking ?? 99) - (b.ranking ?? 99))) {
    const b = el('button', { type: 'button' }, flagCanvas(f.pais, 2), el('span', { text: f.nombre }), rankLabel(f), starsEl(stars(f.atributos)), el('span', { class: 'tag', text: f.record }));
    b.addEventListener('click', () => {
      audio.play('ui');
      career = C.newCareer({ player: { id: f.id }, promos: state.promotionsDb, fighters: state.fighters, existing: true });
      persist();
      resetHistory(['screen-menu']);
      show('screen-career-hub', { push: false });
    });
    list.append(el('li', {}, b));
  }
}

// ---------- HUB ----------
let hubTab = 'train';
async function renderHub() {
  if (!career) { career = C.load(); if (!career) return show('screen-career-start'); }
  if (career.retired) return renderRetired();
  if (career.pendingContract) return showContract();
  if (!career.offer) { C.makeOffer(career, ctx()); persist(); }
  const c = career, p = c.player, opp = C.opponentOf(c);
  const hub = document.getElementById('hub');
  hub.innerHTML = '';

  // Columna 1: jugador
  const pc = portraitCanvas(p.cara, 3); pc.classList.add('portrait');
  const logo = await orgLogo(c.stage === 'nacional' ? 'nacional' : c.org, 120, 32);
  logo.classList?.add('org-logo');
  const menuBtn = el('button', { class: 'btn btn-small', text: t('to_menu') });
  menuBtn.addEventListener('click', () => { persist(); resetHistory(); show('screen-menu', { push: false }); });
  const gymNext = C.GYM_COST[p.gimnasio + 1];
  const gymBtn = el('button', { class: 'btn btn-small', disabled: !gymNext || p.dinero < gymNext, text: gymNext ? t('gym_upgrade', { cost: money(gymNext) }) : t('gym_max') });
  gymBtn.addEventListener('click', () => { if (C.upgradeGym(c)) { audio.play('ui'); persist(); renderHub(); } });
  const col1 = el('div', { class: 'hub-card' },
    el('div', { class: 'fc-top' }, pc, el('div', {},
      el('div', { class: 'fc-name', text: p.nombre }), p.apodo ? el('div', { class: 'fc-nick', text: `"${p.apodo}"` }) : null,
      el('div', { class: 'fc-meta' }, flagCanvas(p.pais, 2), c.stage === 'ufc' ? rankLabel(p) : null),
      el('div', { class: 'fc-meta' }, starsEl(stars(p.atributos)), el('span', { text: p.record })))),
    el('div', { class: 'org-row' }, logo, el('span', { class: 'note', text: stageText() })),
    el('div', { class: 'fc-facts' },
      el('span', {}, `${t('age')}: `, el('b', { text: String(p.edad) })),
      el('span', {}, `${t('date')}: `, el('b', { text: c.date })),
      el('span', {}, `${t('money')}: `, el('b', { text: money(p.dinero) })),
      el('span', {}, `${t('gym')}: `, el('b', { text: '★'.repeat(p.gimnasio) })),
      el('span', {}, `${t('streak')}: `, el('b', { text: p.racha > 0 ? `+${p.racha}` : String(p.racha) })),
      el('span', {}, `${t('belts')}: `, el('b', { text: p.cinturones.length ? p.cinturones.map(orgName).join(', ') : '—' })),
      c.contract ? el('span', {}, `${t('contract')}: `, el('b', { text: t('contract_left', { n: c.contract.left, total: c.contract.total }) })) : null),
    el('div', { class: 'row-actions' }, gymBtn, menuBtn));

  // Columna 2: próxima pelea
  const off = c.offer;
  const oc = portraitCanvas(opp.cara, 3); oc.classList.add('portrait'); oc.style.transform = 'scaleX(-1)';
  const prob = C.playerWinProb(c);
  const playBtn = el('button', { class: 'btn btn-primary', text: t('mode_play') });
  const simBtn = el('button', { class: 'btn', text: t('mode_sim') });
  playBtn.addEventListener('click', () => fightNow('play'));
  simBtn.addEventListener('click', () => fightNow('sim'));
  const col2 = el('div', { class: 'hub-card fight-card' },
    el('div', { class: 'event-title', text: eventText(off.event) }),
    el('div', { class: 'note', text: `${off.fecha} · ${off.rounds} ${t('rounds').toLowerCase()}${off.title ? ' · ' + t('title_fight') : ''}` }),
    el('div', { class: 'fc-top' }, oc, el('div', {},
      el('div', { class: 'fc-name', text: opp.nombre }),
      el('div', { class: 'fc-meta' }, flagCanvas(opp.pais, 2), opp.generico ? el('span', { class: 'rank-badge', text: t('arch_' + opp.arquetipo) }) : rankLabel(opp)),
      el('div', { class: 'fc-meta' }, starsEl(stars(opp.atributos)), el('span', { text: opp.record })),
      el('div', { class: 'note', text: `${opp.edad} ${t('years')} · ${t('style_' + opp.estilo)} · ${opp.altura} cm` }))),
    el('div', { class: 'win-prob' }, el('span', { class: 'r', style: `width:${prob * 100}%`, text: `${Math.round(prob * 100)}%` }), el('span', { class: 'b', style: `width:${(1 - prob) * 100}%`, text: `${Math.round((1 - prob) * 100)}%` })),
    el('div', { class: 'note', text: `${t('purse')}: ${money(off.purse.show)} + ${money(off.purse.win)} ${t('win_bonus')}` }),
    el('div', { class: 'note', text: t('camp_status', { n: c.camp.sessions, max: c.camp.max }) }),
    el('div', { class: 'row-actions' }, simBtn, playBtn));

  // Columna 3: pestañas
  const tabs = [['train', 'tab_train'], ['tech', 'tab_tech'], ['rank', 'tab_rank'], ['hist', 'tab_hist'], ['news', 'tab_news']];
  const tabBar = el('div', { class: 'seg tabs' });
  segmented(tabBar, tabs.map(([v, k]) => ({ value: v, label: t(k) })), hubTab, v => { hubTab = v; renderTab(panel); });
  const panel = el('div', { class: 'tab-panel' });
  const col3 = el('div', { class: 'hub-card' }, tabBar, panel);
  hub.append(col1, col2, col3);
  renderTab(panel);
}

// Fin de carrera: resumen y opción de empezar otra.
function renderRetired() {
  show('screen-career-hub', { push: false });
  const c = career, p = c.player;
  const hub = document.getElementById('hub');
  hub.innerHTML = '';
  const pc = portraitCanvas(p.cara, 4); pc.classList.add('portrait');
  const wins = p.historial.filter(h => h.resultado === 'W');
  const finishes = wins.filter(h => ['ko', 'tko', 'sub'].includes(h.metodo)).length;
  const again = el('button', { class: 'btn btn-primary', text: t('career_new_create') });
  again.addEventListener('click', () => { C.clearSave(); career = null; show('screen-career-start', { push: false }); });
  const menu = el('button', { class: 'btn', text: t('to_menu') });
  menu.addEventListener('click', () => { resetHistory(); show('screen-menu', { push: false }); });
  hub.append(el('div', { class: 'hub-card retired-card' },
    el('h2', { text: t('career_over') }), pc,
    el('div', { class: 'fc-name', text: p.nombre }),
    el('div', { class: 'fc-meta' }, flagCanvas(p.pais, 2), starsEl(stars(p.atributos)), el('b', { text: p.record })),
    el('p', { class: 'event-msg', text: t('career_summary', { age: p.edad, fights: p.historial.length, finishes, belts: p.cinturones.length ? p.cinturones.map(orgName).join(', ') : '—', money: money(p.dinero) }) }),
    el('div', { class: 'row-actions' }, menu, again)));
}

function stageText() {
  const c = career;
  switch (c.stage) {
    case 'nacional': return t('stage_nacional', { n: Math.max(0, C.NATIONAL_SAME_COUNTRY_FIGHTS - c.sameCountryFights) });
    case 'regional': return c.regionalChamp[c.org] === 'player' ? t('stage_regional_champ') : t('stage_regional', { n: Math.max(0, C.REGIONAL_TITLE_STREAK - (c.streakInStage || 0)) });
    case 'dwcs': return t('stage_dwcs');
    case 'rtu': return t('stage_rtu', { n: c.rtuRound + 1 });
    case 'pfl': return t('stage_pfl');
    default: return c.player.ranking === 0 ? t('stage_ufc_champ') : c.player.ranking ? t('stage_ufc_ranked', { n: c.player.ranking }) : t('stage_ufc');
  }
}

function renderTab(panel) {
  const c = career, p = c.player;
  panel.innerHTML = '';
  if (hubTab === 'train') {
    const grid = el('div', { class: 'train-grid' });
    for (const [focus, map] of Object.entries(C.TRAINING)) {
      const main = Object.keys(map)[0];
      const b = el('button', { class: 'btn btn-small', disabled: c.camp.sessions >= c.camp.max },
        el('span', { text: t('train_' + focus) }), el('small', { text: String(Math.round(p.atributos[main])) }));
      b.title = `${t('attr_' + main)} ${Math.round(p.atributos[main])}`;
      b.addEventListener('click', () => {
        const r = C.train(c, focus);
        if (!r.ok) { toast(t(r.reason === 'no_time' ? 'no_time' : 'camp_full')); return; }
        audio.play('ui'); persist();
        toast(Object.entries(r.gains).map(([k, v]) => `+${v} ${t('attr_' + k)}`).join('  ') + (r.injury ? ' · ' + t('injury') : ''));
        renderHub();
      });
      grid.append(b);
    }
    panel.append(el('p', { class: 'note', text: t('train_note', { techo: p.techo, pts: p.puntos }) }), grid);
  } else if (hubTab === 'tech') {
    panel.append(el('p', { class: 'note', text: t('tech_points', { n: p.puntos }) }));
    for (const tier of [1, 2, 3]) {
      panel.append(el('div', { class: 'tech-tier tier-' + tier, text: '★'.repeat(tier) + ' ' + t('tier_' + tier) }));
      for (const [k, tech] of Object.entries(C.TECHNIQUES).filter(([, x]) => x.tier === tier)) {
        const st = C.techniqueStatus(c, k), has = st.reason === 'learned';
        const b = el('button', { class: 'btn btn-small', disabled: !st.ok }, el('span', { text: t(tech.nameKey) }), el('small', { text: has ? t('learned') : t('cost_pts', { n: tech.cost }) }));
        b.addEventListener('click', () => { if (C.learnTechnique(c, k)) { audio.play('ui'); persist(); renderHub(); } });
        // Requisitos: en rojo los que todavía no cumplís.
        const req = el('div', { class: 'tech-req' }, t('tech_req', { list: '' }));
        for (const [a, v] of Object.entries(tech.req)) req.append(el('span', { class: p.atributos[a] >= v || has ? 'ok' : 'bad', text: `${t('attr_' + a)} ${v} ` }));
        if (tech.stars) req.append(el('span', { class: stars(p.atributos) >= tech.stars || has ? 'ok' : 'bad', text: t('req_stars', { n: tech.stars }) }));
        panel.append(el('div', { class: 'tech-row' + (has ? ' has' : '') }, b, el('div', {}, el('span', { class: 'note', text: t('techdesc_' + k) }), req)));
      }
    }
  } else if (hubTab === 'rank') {
    const divSel = el('div', { class: 'seg' });
    const tbl = el('table', { class: 'stats rank-table' });
    const draw = div => {
      tbl.innerHTML = '';
      for (const f of C.rankingTable(c, div)) {
        tbl.append(el('tr', { class: f.id === 'player' ? 'me' : '' },
          el('td', { text: f.ranking === 0 ? 'C' : String(f.ranking) }), el('td', {}, flagCanvas(f.pais, 1.5), ' ', f.nombre), el('td', { text: f.record }), el('td', { class: 'star-num', text: `${stars(f.atributos)}★` })));
      }
    };
    segmented(divSel, state.divisions.map(d => ({ value: d.id, label: t('divshort_' + d.id) })), p.division, draw);
    panel.append(divSel, el('div', { class: 'scroll' }, tbl));
    draw(p.division);
  } else if (hubTab === 'hist') {
    if (!p.historial.length) panel.append(el('p', { class: 'note', text: t('no_fights') }));
    const tbl = el('table', { class: 'stats hist-table' });
    for (const h of p.historial) {
      tbl.append(el('tr', {}, el('td', { class: h.resultado === 'W' ? 'win' : h.resultado === 'L' ? 'loss' : '', text: h.resultado }),
        el('td', { text: h.rival }), el('td', { text: `${t('method_' + h.metodo)} R${h.round}` }), el('td', { text: orgName(h.org) })));
    }
    panel.append(el('div', { class: 'scroll' }, tbl));
  } else {
    const ul = el('ul', { class: 'news' });
    for (const n of c.news) {
      const vars = { ...n.vars }; if (vars.div) vars.div = t('div_' + vars.div); if (vars.org && C.promoById(state.promotionsDb, vars.org)) vars.org = orgName(vars.org);
      ul.append(el('li', {}, el('b', { text: n.date }), ' ', t(n.key, vars)));
    }
    panel.append(el('div', { class: 'scroll' }, ul));
  }
}

function toast(text) {
  const tEl = el('div', { class: 'toast', role: 'status', text });
  document.body.append(tEl);
  setTimeout(() => tEl.remove(), 2200);
}

// ---------- PELEA ----------
async function fightNow(mode) {
  const c = career, p = c.player, opp = C.opponentOf(c), off = c.offer;
  audio.play('ui');
  const after = result => {
    const events = C.applyCareerFight(c, ctx(), result);
    persist();
    showResult(p, opp, result, {
      simulated: mode === 'sim', career: true,
      onContinue: () => showEvents(events),
    });
  };
  if (mode === 'sim') {
    const r = simulateFight(p, opp, { rounds: off.rounds, roundSeconds: 300 });
    return after(r);
  }
  const logo = c.stage === 'ufc' ? ufcLogo : await orgLogo(c.stage === 'nacional' ? 'nacional' : c.org, 160, 48);
  const danaChance = c.stage === 'ufc' ? 0.35 : c.stage === 'dwcs' ? 0.8 : 0;
  showVS(p, opp, () => {
    startFight(p, opp, {
      rounds: off.rounds, ufcLogo: logo, danaChance, eventLabel: eventText(off.event),
      onEnd: result => {
        if (!result) { show('screen-career-hub', { push: false }); return; }
        after(result);
      },
    });
  });
}

// ---------- EVENTOS TRAS LA PELEA ----------
function showEvents(events) {
  const queue = [...events];
  const box = document.getElementById('career-events');
  const next = () => {
    const e = queue.shift();
    if (!e) { show('screen-career-hub', { push: false }); return; }
    if (e.type === 'belt') return showBelt(e, next);
    box.innerHTML = '';
    let text;
    switch (e.type) {
      case 'purse': text = t('ev_purse', { amount: money(e.amount) }) + (e.bonus ? ' ' + t('ev_bonus', { amount: money(e.bonus) }) : ''); break;
      case 'stars': text = t('ev_stars', { from: e.from, to: e.to }); break;
      case 'contract': text = t('ev_contract', { org: orgName(e.org) }) + (e.fights ? ' ' + t('ev_contract_fights', { n: e.fights }) : ''); break;
      case 'invite': text = t(e.org === 'rtu' ? 'ev_invite_rtu' : 'ev_invite_dwcs'); break;
      case 'released': text = t('ev_released', { org: orgName(e.org) }); break;
      case 'no_contract': text = t('ev_no_contract'); break;
      case 'rtu_advance': text = t('ev_rtu_advance', { n: e.round }); break;
      case 'short_notice': text = t('ev_short_notice'); break;
      case 'renewed': text = t('ev_renewed', { org: orgName(e.org) }); break;
      case 'retire_forced': text = t('ev_retire_forced'); break;
      case 'retire_option': {
        box.innerHTML = '';
        const keep = el('button', { class: 'btn btn-primary', text: t('keep_fighting') });
        const ret = el('button', { class: 'btn', text: t('retire_now') });
        keep.addEventListener('click', () => { audio.play('ui'); next(); });
        ret.addEventListener('click', () => { audio.play('ui'); C.retire(career); persist(); renderRetired(); });
        box.append(el('div', { class: 'panel' }, el('p', { class: 'event-msg', text: t('ev_retire_option', { age: career.player.edad }) }), el('div', { class: 'row-actions' }, ret, keep)));
        show('screen-career-events', { push: false });
        return;
      }
      default: text = '';
    }
    const btn = el('button', { class: 'btn btn-primary', text: t('continue') });
    btn.addEventListener('click', () => { audio.play('ui'); next(); });
    box.append(el('div', { class: 'panel' }, e.type === 'stars' ? starsEl(e.to) : null, el('p', { class: 'event-msg', text }), btn));
    show('screen-career-events', { push: false });
    btn.focus();
  };
  next();
}

// ---------- CINTURÓN ----------
function showBelt(e, done) {
  show('screen-belt', { push: false });
  const canvas = document.getElementById('belt-canvas');
  const W = 220, H = 120;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
  document.getElementById('belt-text').textContent = (e.first ? t('belt_new') : t('belt_defend')) + ' — ' + orgName(e.org);
  const confetti = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 20 + Math.random() * 40, c: ['#f2c230', '#d20a0a', '#ffffff', '#1f5fe0'][Math.floor(Math.random() * 4)] }));
  audio.play('bell', { times: 3 }); audio.roar(1);
  let t0 = performance.now(), raf;
  const label = e.org === 'ufc' ? 'UFC' : orgName(e.org).toUpperCase();
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const tt = (now - t0) / 1000;
    g.fillStyle = '#0b0d14'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(242,194,48,0.08)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(W / 2, H / 2); const a = tt * 0.3 + i * Math.PI / 4; g.lineTo(W / 2 + Math.cos(a) * 200, H / 2 + Math.sin(a) * 200); g.lineTo(W / 2 + Math.cos(a + 0.2) * 200, H / 2 + Math.sin(a + 0.2) * 200); g.fill(); }
    const s = Math.min(2, 0.4 + tt * 1.6);
    drawBelt(g, W / 2, H / 2, s, tt, { label });
    for (const p of confetti) { p.y += p.v / 60; if (p.y > H) p.y = -4; g.fillStyle = p.c; g.fillRect(Math.round(p.x + Math.sin(tt * 3 + p.y) * 3), Math.round(p.y), 2, 2); }
  };
  raf = requestAnimationFrame(frame);
  const btn = document.getElementById('belt-continue');
  btn.onclick = () => { cancelAnimationFrame(raf); audio.play('ui'); done(); };
}

// ---------- CONTRATO (conferencia de prensa + firma manteniendo presionado) ----------
function showContract() {
  const k = career.pendingContract;
  show('screen-contract', { push: false });
  if (k.org === 'ufc') pressConference(() => contractPaper(k));
  else contractPaper(k);
}

function pressConference(done) {
  const box = document.getElementById('contract');
  box.innerHTML = '';
  const canvas = el('canvas', { class: 'pixel press-canvas', width: 240, height: 120, 'aria-hidden': 'true' });
  const lines = [t('dana_1', { name: career.player.nombre }), t('dana_2', { country: countryName(career.player.pais) }), t('dana_3')];
  let i = 0;
  const bubble = el('div', { class: 'bubble' }, el('b', { text: 'Dana White: ' }), el('span', { text: lines[0] }));
  const nextBtn = el('button', { class: 'btn btn-primary', text: t('continue') });
  box.append(el('div', { class: 'press' }, canvas, bubble, nextBtn));
  const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
  const t0 = performance.now(); let raf;
  const frame = now => { raf = requestAnimationFrame(frame); drawPressConference(g, 240, 120, { t: (now - t0) / 1000, logo: ufcLogo, face: career.player.cara }); };
  raf = requestAnimationFrame(frame);
  audio.roar(0.5);
  nextBtn.addEventListener('click', () => {
    audio.play('ui'); i++;
    if (i < lines.length) bubble.lastChild.textContent = lines[i];
    else { cancelAnimationFrame(raf); done(); }
  });
}

function contractPaper(k) {
  const box = document.getElementById('contract');
  box.innerHTML = '';
  const p = career.player;
  const purse = { ufc: 14000, pfl: 30000, regional: 4000 }[k.type] || 4000;
  const sigCanvas = el('canvas', { class: 'sig-canvas', width: 720, height: 140 });
  const g = sigCanvas.getContext('2d');
  document.fonts?.load(`40px ${SIGNATURE_FONT}`).catch(() => {});
  const hold = el('button', { class: 'btn btn-primary hold-btn', text: t('hold_to_sign') });
  const decline = el('button', { class: 'btn', text: t('decline') });
  const bar = el('div', { class: 'sub-bar' }, el('div', { class: 'sub-fill', style: 'width:0%' }));
  box.append(el('div', { class: 'paper' },
    el('h2', { text: t('contract_title', { org: orgName(k.org) }) }),
    el('p', { text: t('contract_body', { name: p.nombre, org: orgName(k.org), n: k.fights, purse: money(purse), date: career.date }) }),
    el('div', { class: 'sig-box' }, sigCanvas, el('div', { class: 'sig-line', text: p.nombre })),
    bar),
    el('div', { class: 'row-actions' }, k.org === 'ufc' ? null : decline, hold));
  let progress = 0, holding = false, last = 0, raf;
  const render = now => {
    raf = requestAnimationFrame(render);
    if (holding) { progress = Math.min(1, progress + (now - last) / 2600); last = now; }
    g.clearRect(0, 0, 720, 140);
    drawHandSignature(g, p.nombre, 720, 140, progress);
    bar.firstChild.style.width = `${progress * 100}%`;
    if (progress >= 1) {
      cancelAnimationFrame(raf); holding = false;
      audio.play('bell'); audio.roar(0.6);
      C.acceptContract(career); persist();
      hold.textContent = t('signed'); hold.disabled = true;
      setTimeout(() => show('screen-career-hub', { push: false }), 1100);
    }
  };
  raf = requestAnimationFrame(render);
  const start = e => { e.preventDefault(); holding = true; last = performance.now(); audio.unlock(); };
  const stop = () => { holding = false; };
  hold.addEventListener('pointerdown', start);
  hold.addEventListener('pointerup', stop); hold.addEventListener('pointerleave', stop); hold.addEventListener('pointercancel', stop);
  hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { if (!holding) start(e); } });
  hold.addEventListener('keyup', stop);
  decline.addEventListener('click', () => { cancelAnimationFrame(raf); C.declineContract(career); persist(); show('screen-career-hub', { push: false }); });
}

export function hasCareer() { return !!C.load(); }
export { portraitCanvas, drawPortrait, fmtTime };
