// Modo carrera: estado, escalera (nacional → regional → DWCS/Road to UFC → UFC, con PFL como alternativa),
// ofertas de pelea, contratos, entrenamiento, dinero y simulación del mundo UFC. Módulo puro (testeable en Node).
import { ATTRS, STYLE_PROFILE, stars, starsExact, overall } from '../ratings.js';
import { simulateFight, applyResult, winProbability } from '../sim.js';
import { generateFighter, makeAttributes, starsToOverall, namesFor, orgStars, plausibleRecord, ADVANCED_TIER } from './generator.js';

// Nombres por país para los recién llegados a UFC (los carga la interfaz o los tests).
let NAMES = null;
export function setNames(n) { NAMES = n; }

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const START_DATE = '2026-10-13';

// ---------- utilidades ----------
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// RNG persistente dentro del estado (para que guardar/cargar no repita resultados)
export function rngOf(c) {
  return () => {
    c.seed = (c.seed + 0x6D2B79F5) >>> 0;
    let t = c.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function addDays(iso, days) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function ageOn(dob, iso) {
  const [y, m, d] = dob.split('-').map(Number), [Y, M, D] = iso.split('-').map(Number);
  return Y - y - ((M < m || (M === m && D < d)) ? 1 : 0);
}
function rec(f) { const [w, l, d] = String(f.record).split('-').map(n => parseInt(n, 10) || 0); return { w, l, d }; }
function setRec(f, r) { f.record = `${r.w}-${r.l}-${r.d}`; }

export const REGIONAL_TITLE_STREAK = 3;
export const NATIONAL_SAME_COUNTRY_FIGHTS = 3;

export const TECHNIQUES = {
  elbow:     { cost: 3, nameKey: 'move_elbow' },
  spinKick:  { cost: 4, nameKey: 'move_spinKick' },
  singleLeg: { cost: 3, nameKey: 'move_singleLeg' },
  doubleLeg: { cost: 4, nameKey: 'move_doubleLeg' },
  checkKick: { cost: 2, nameKey: 'tech_checkKick' },
  ironChin:  { cost: 5, nameKey: 'tech_ironChin' },
};

export const TRAINING = {
  boxeo:    { golpeo: 1, velocidad: 0.3 },
  patadas:  { patadas: 1, velocidad: 0.2 },
  lucha:    { grappling: 1, cardio: 0.2 },
  bjj:      { sumisiones: 1, grappling: 0.4 },
  defensa:  { defensa: 1 },
  cardio:   { cardio: 1 },
  fuerza:   { menton: 0.8, golpeo: 0.3 },
  velocidad:{ velocidad: 1 },
};

export const GYM_COST = { 2: 20000, 3: 80000 };
export const PURSE = { nacional: 800, regional: 4000, dwcs: 8000, rtu: 10000, pfl: 30000, ufc: 14000 };

// ---------- regiones y organizaciones ----------
export function regionOf(promos, country) {
  for (const [r, list] of Object.entries(promos.regiones)) if (list.includes(country)) return r;
  return 'norteamerica';
}
export const isAsian = (promos, country) => regionOf(promos, country) === 'asia';
export function promoById(promos, id) { return promos.promociones.find(p => p.id === id); }

export function stageOrg(c, promos) {
  if (c.stage === 'nacional') return { id: 'nacional', nombre: null, nacional: true, pais: c.player.pais, nivel: 1, logo: null };
  return promoById(promos, c.org);
}

// ---------- creación ----------
export function createPlayer(opts) {
  const { nombre, apodo, pais, edad, division, altura, alcance, estilo, postura, cara } = opts;
  const rng = mulberry(opts.seed || 7);
  // Arranca en 2 estrellas, con perfil del estilo.
  const attrs = makeAttributes(rng, { targetStars: 2, style: estilo, age: edad, archetype: 'local' });
  // Reach/altura: un alcance largo ayuda al golpeo a distancia.
  const reachAdv = clamp((alcance - altura) / 4, -3, 3);
  attrs.golpeo = clamp(Math.round(attrs.golpeo + reachAdv), 15, 95);
  // Techo (potencial): aleatorio, mayor cuanto más joven empieza.
  const techo = clamp(Math.round(84 + rng() * 11 - Math.max(0, edad - 24) * 1.5), 70, 95);
  const [Y] = START_DATE.split('-').map(Number);
  return {
    id: 'player', jugador: true, nombre, apodo: apodo || null, pais, edad, fechaNacimiento: `${Y - edad}-03-01`,
    division, altura, alcance, postura, estilo, record: '0-0-0', racha: 0, ranking: null,
    atributos: attrs, cara, fuente: 'jugador', techo, tecnicas: [], puntos: 0, dinero: 2000, gimnasio: 1,
    historial: [], cinturones: [],
  };
}

export function newCareer({ player, promos, fighters, existing = false, seed = Date.now() % 2147483647 }) {
  const c = {
    version: 1, seed: seed >>> 0 || 1, date: START_DATE, player,
    stage: 'nacional', org: null, stageFights: 0, stageWins: 0, sameCountryFights: 0,
    ufc: fighters.map(f => ({ ...f, atributos: { ...f.atributos } })),
    generics: {}, regionalChamp: {}, eventNo: {}, offer: null, pendingContract: null, camp: null,
    news: [], dwcsTries: 0, rtuRound: 0, released: false, injuryWeeks: 0, lastWorldSim: START_DATE,
  };
  if (existing) {
    // Tomar un peleador existente: ya está en UFC con su récord y ranking.
    const real = c.ufc.find(f => f.id === player.id);
    Object.assign(player, { ...real, jugador: true, id: 'player', realId: real.id, tecnicas: [], puntos: 0, dinero: 50000, gimnasio: 2, historial: [], cinturones: real.ranking === 0 ? ['ufc'] : [], techo: clamp(Math.round(97 - Math.max(0, real.edad - 26) * 1.2), 75, 98) });
    c.ufc = c.ufc.filter(f => f.id !== real.id);
    c.ufc.push(player);
    c.stage = 'ufc'; c.org = 'ufc';
  }
  news(c, 'news_start', { name: player.nombre });
  return c;
}

function news(c, key, vars = {}) { c.news.unshift({ date: c.date, key, vars }); c.news.length = Math.min(c.news.length, 40); }

// ---------- ofertas de pelea ----------
function eventName(c, org, promos) {
  c.eventNo[org.id] = (c.eventNo[org.id] || (org.id === 'ufc' ? 333 : org.id === 'dwcs' ? 0 : org.nacional ? 0 : 40 + Math.floor(rngOf(c)() * 200))) + 1;
  const n = c.eventNo[org.id];
  if (org.nacional) return { key: 'event_national', n };
  if (org.id === 'dwcs') return { key: 'event_dwcs', n: Math.ceil(n / 1), season: 10 + Math.floor(n / 10) };
  if (org.id === 'rtu') return { key: 'event_rtu', n: 5 + Math.floor(n / 3) };
  if (org.id === 'ufc') return { key: 'event_ufc', n };
  return { key: 'event_org', org: org.nombre, n };
}

export const MAX_VS_SAME = 4;
const timesVs = (c, id) => (c.vs && c.vs[id]) || 0;

function genericOpponent(c, ctx, { level, country, archetype, starsRange = null, tier = null }) {
  const rng = rngOf(c);
  const f = generateFighter(rng, { namesDb: ctx.names, country, division: c.player.division, level, archetype, starsRange, tier });
  c.generics[f.id] = f;
  return f;
}

// Revancha: rivales genéricos guardados que vuelven a aparecer.
function rematchCandidate(c, level, rng) {
  const pool = Object.values(c.generics).filter(g => g.nivel === level && g.division === c.player.division && g.vsPlayer && timesVs(c, g.id) < MAX_VS_SAME && !g.retirado && plausibleRecord(g));
  if (!pool.length || rng() > 0.18) return null;
  const lostTo = pool.filter(g => g.vsPlayer.l > 0);
  return pick(rng, lostTo.length ? lostTo : pool);
}

function regionCountries(promos, c) {
  const r = regionOf(promos, c.player.pais);
  return promos.regiones[r] || [c.player.pais];
}

export function makeOffer(c, ctx) {
  const { promos } = ctx;
  const rng = rngOf(c);
  const p = c.player;
  const org = stageOrg(c, promos);
  let opponent, rounds = 3, title = false, kind = c.stage;
  if (c.stage === 'nacional') {
    const mustLocal = c.sameCountryFights < NATIONAL_SAME_COUNTRY_FIGHTS;
    const country = mustLocal || rng() < 0.7 ? p.pais : pick(rng, regionCountries(promos, c));
    opponent = rematchCandidate(c, 'nacional', rng) || genericOpponent(c, ctx, { level: 'nacional', country });
  } else if (c.stage === 'regional') {
    const champId = c.regionalChamp[c.org];
    const isChamp = champId === 'player';
    const range = orgStars(org.nivel || 2);
    const orgCountries = (org.region && promos.regiones[org.region]) || regionCountries(promos, c);
    if (!isChamp && c.streakInStage >= REGIONAL_TITLE_STREAK) {
      // Pelea por el título contra el campeón vigente de esa organización
      let champ = champId && champId !== 'player' && c.generics[champId];
      if (!champ || timesVs(c, champ.id) >= MAX_VS_SAME || !plausibleRecord(champ)) { champ = genericOpponent(c, ctx, { level: 'regional', country: pick(rng, orgCountries), archetype: rng() < 0.5 ? 'local' : 'prospecto', starsRange: range, tier: org.nivel }); champ.atributos = makeAttributes(rng, { targetStars: range[1], style: champ.estilo, age: champ.edad, archetype: 'local' }); c.regionalChamp[c.org] = champ.id; }
      opponent = champ; rounds = 5; title = true;
    } else {
      const again = rematchCandidate(c, 'regional', rng);
      opponent = again && (again.tier ?? 2) <= (org.nivel || 2) + 0.5 ? again : genericOpponent(c, ctx, { level: 'regional', country: pick(rng, orgCountries), starsRange: range, tier: org.nivel || 2 });
      if (isChamp && rng() < 0.6) { rounds = 5; title = true; kind = 'defense'; }
    }
  } else if (c.stage === 'dwcs') {
    opponent = genericOpponent(c, ctx, { level: 'dwcs', country: pick(rng, Object.values(promos.regiones).flat()), archetype: 'prospecto' });
  } else if (c.stage === 'rtu') {
    opponent = genericOpponent(c, ctx, { level: 'rtu', country: pick(rng, promos.regiones.asia), archetype: 'prospecto' });
  } else if (c.stage === 'pfl') {
    opponent = rematchCandidate(c, 'pfl', rng) || genericOpponent(c, ctx, { level: 'pfl', country: pick(rng, Object.values(promos.regiones).flat()) });
    if (c.streakInStage >= 3 && c.regionalChamp.pfl !== 'player') { rounds = 5; title = true; }
  } else if (c.stage === 'ufc') {
    opponent = ufcOpponent(c, rng);
    if (opponent.ranking === 0 || p.ranking === 0) { rounds = 5; title = true; }
    else if (opponent.ranking != null && opponent.ranking <= 5 && rng() < 0.5) rounds = 5; // evento estelar
  }
  const ev = eventName(c, org, promos);
  const base = PURSE[c.stage === 'regional' ? 'regional' : c.stage] || 1000;
  const rankBonus = c.stage === 'ufc' && p.ranking != null ? (16 - p.ranking) * 6000 : 0;
  const show = Math.round((base + rankBonus) * (title ? 2.5 : 1));
  c.offer = {
    opponentId: opponent.id, org: org.id, event: ev, rounds, title, kind,
    purse: { show, win: show },
    fecha: nextFightDate(c, rng),
    country: c.stage === 'nacional' ? p.pais : org.pais,
  };
  c.camp = { sessions: 0, max: 5 + 2 * p.gimnasio };
  return c.offer;
}

// Calendario realista: lo normal es ~1 pelea por año; nunca más de 3 en 12 meses.
const MONTHS_GAP = { nacional: [3, 7], regional: [4, 9], pfl: [4, 8], ufc: [5, 11], rtu: [3, 5] };
function nextFightDate(c, rng) {
  let date;
  if (c.stage === 'dwcs') {
    // El Contender Series se hace entre agosto y octubre
    const [Y, M] = c.date.split('-').map(Number);
    date = M >= 8 && M <= 9 ? addDays(c.date, 21 + Math.floor(rng() * 21)) : `${M >= 10 ? Y + 1 : Y}-08-${String(5 + Math.floor(rng() * 20)).padStart(2, '0')}`;
  } else {
    const [lo, hi] = MONTHS_GAP[c.stage] || [4, 9];
    date = addDays(c.date, Math.round((lo + rng() * (hi - lo)) * 30.4));
  }
  const recent = c.player.historial.map(h => h.fecha).filter(f => f > addDays(date, -365)).sort();
  if (recent.length >= 3) date = addDays(recent[recent.length - 3], 366);
  return date;
}

function ufcOpponent(c, rng) {
  const p = c.player;
  const allDiv = c.ufc.filter(f => f.division === p.division && f.id !== 'player' && !f.retirado);
  const fresh = allDiv.filter(f => timesVs(c, f.id) < MAX_VS_SAME);
  const div = fresh.length >= 4 ? fresh : allDiv;
  const byRank = r => div.find(f => f.ranking === r);
  if (p.ranking === 0) {
    const contenders = [1, 2, 3].map(byRank).filter(Boolean);
    return pick(rng, contenders);
  }
  if (p.ranking != null) {
    if ((p.ranking <= 2 && p.racha >= 2) || p.ranking === 1) {
      const champ = byRank(0);
      if (champ) return champ;
    }
    const hi = Math.max(1, p.ranking - 3), lo = Math.min(15, p.ranking + 2);
    const pool = div.filter(f => f.ranking != null && f.ranking >= hi && f.ranking <= lo && f.ranking !== 0);
    if (pool.length) return pick(rng, pool);
  }
  const unranked = div.filter(f => f.ranking == null);
  if (p.racha >= 2 || rng() < 0.15) {
    const low = div.filter(f => f.ranking != null && f.ranking >= 11);
    if (low.length) return pick(rng, low);
  }
  return pick(rng, unranked.length ? unranked : div);
}

export function opponentOf(c) {
  const id = c.offer?.opponentId;
  return c.generics[id] || c.ufc.find(f => f.id === id) || null;
}

// ---------- entrenamiento ----------
export function trainingGain(age, gym, current, techo, r) {
  const youth = age <= 24 ? 1.3 : age <= 29 ? 1.0 : age <= 33 ? 0.7 : 0.4;
  const room = clamp((techo - current) / 25, 0.04, 1);
  return (1.0 + gym * 0.45) * youth * room * (0.6 + r * 0.8);
}

export function train(c, focus) {
  const p = c.player;
  if (!c.camp || c.camp.sessions >= c.camp.max) return { ok: false, reason: 'camp_full' };
  if (c.offer?.fecha && addDays(c.date, 7) > c.offer.fecha) return { ok: false, reason: 'no_time' };
  const rng = rngOf(c);
  const map = TRAINING[focus];
  const gains = {};
  for (const [attr, w] of Object.entries(map)) {
    const g = trainingGain(p.edad, p.gimnasio, p.atributos[attr], p.techo, rng()) * w;
    p.atributos[attr] = Math.round(clamp(p.atributos[attr] + g, 15, p.techo) * 10) / 10;
    gains[attr] = Math.round(g * 10) / 10;
  }
  c.camp.sessions++;
  p.puntos += 1;
  c.date = addDays(c.date, 7);
  let injury = false;
  if (rng() < 0.03) { injury = true; c.date = addDays(c.date, 14); p.atributos.cardio = Math.max(15, p.atributos.cardio - 1); news(c, 'news_injury', {}); }
  tick(c);
  return { ok: true, gains, injury };
}

export function learnTechnique(c, key) {
  const p = c.player, t = TECHNIQUES[key];
  if (!t || p.tecnicas.includes(key) || p.puntos < t.cost) return false;
  p.puntos -= t.cost; p.tecnicas.push(key);
  if (key === 'ironChin') p.atributos.menton = Math.min(p.techo, p.atributos.menton + 3);
  return true;
}

export function upgradeGym(c) {
  const p = c.player, next = p.gimnasio + 1, cost = GYM_COST[next];
  if (!cost || p.dinero < cost) return false;
  p.dinero -= cost; p.gimnasio = next;
  if (c.camp) c.camp.max = 5 + 2 * next;
  return true;
}

// ---------- resultado de una pelea de la carrera ----------
export function applyCareerFight(c, ctx, result) {
  const { promos } = ctx;
  const p = c.player, opp = opponentOf(c), offer = c.offer;
  const rng = rngOf(c);
  const events = [];
  const won = result.winnerId === 'player';
  const draw = !result.winnerId;
  const before = stars(p.atributos);

  // Récords y rachas
  if (c.stage === 'ufc' && !draw) {
    // El jugador progresa por entrenamiento; se conserva su ficha de atributos.
    const keep = { ...p.atributos };
    applyResult(c.ufc, { winnerId: result.winnerId, loserId: result.loserId });
    p.atributos = keep;
  } else {
    const rp = rec(p), ro = rec(opp);
    if (draw) { rp.d++; ro.d++; p.racha = 0; opp.racha = 0; }
    else if (won) { rp.w++; ro.l++; p.racha = p.racha > 0 ? p.racha + 1 : 1; opp.racha = opp.racha < 0 ? opp.racha - 1 : -1; }
    else { rp.l++; ro.w++; p.racha = p.racha < 0 ? p.racha - 1 : -1; opp.racha = opp.racha > 0 ? opp.racha + 1 : 1; }
    setRec(p, rp); setRec(opp, ro);
  }
  c.vs = c.vs || {};
  c.vs[opp.id] = (c.vs[opp.id] || 0) + 1;
  if (c.contract) { c.contract.left--; if (won) c.contract.w++; else if (!draw) c.contract.l++; }
  if (opp.generico) {
    opp.vsPlayer = opp.vsPlayer || { w: 0, l: 0 };
    if (won) opp.vsPlayer.l++; else if (!draw) opp.vsPlayer.w++;
  }

  // Experiencia de pelea (el entrenamiento es la vía principal de mejora)
  const exp = won ? 0.8 : draw ? 0.4 : 0.25;
  for (const a of ATTRS) p.atributos[a] = Math.round(clamp(p.atributos[a] + exp * (a === 'defensa' ? 1.5 : 0.6), 15, p.techo) * 10) / 10;
  if (!won && !draw && (result.method === 'ko' || result.method === 'tko')) p.atributos.menton = Math.max(15, p.atributos.menton - 1.5);
  p.puntos += won ? 3 : 1;

  // Bolsa
  const earned = offer.purse.show + (won ? offer.purse.win : 0);
  p.dinero += earned;
  const bonus = won && ['ko', 'tko', 'sub'].includes(result.method) && rng() < (c.stage === 'ufc' ? 0.35 : 0.15) ? (c.stage === 'ufc' ? 50000 : 2000) : 0;
  p.dinero += bonus;

  p.historial.unshift({
    fecha: c.date, rival: opp.nombre, rivalPais: opp.pais, org: offer.org, evento: offer.event, titulo: offer.title,
    resultado: draw ? 'D' : won ? 'W' : 'L', metodo: result.method, submission: result.submission || null, round: result.round, tiempo: result.time,
  });
  events.push({ type: 'purse', amount: earned, bonus });

  c.stageFights++;
  if (won) { c.stageWins++; c.streakInStage = (c.streakInStage || 0) + 1; } else { c.streakInStage = 0; }
  if (c.stage === 'nacional' && opp.pais === p.pais) c.sameCountryFights++;

  // Títulos
  if (offer.title && won) {
    if (c.stage === 'ufc') { const first = !p.cinturones.includes('ufc'); if (first) p.cinturones.push('ufc'); events.push({ type: 'belt', org: 'ufc', first }); news(c, first ? 'news_ufc_champ' : 'news_defense', { name: p.nombre, org: 'UFC' }); }
    else {
      const orgId = c.stage === 'pfl' ? 'pfl' : c.org;
      const had = c.regionalChamp[orgId] === 'player';
      c.regionalChamp[orgId] = 'player';
      if (!p.cinturones.includes(orgId)) p.cinturones.push(orgId);
      events.push({ type: 'belt', org: orgId, first: !had });
      news(c, had ? 'news_defense' : 'news_title', { name: p.nombre, org: promoById(promos, orgId)?.nombre || orgId });
    }
  } else if (offer.title && !won && !draw) {
    if (c.stage !== 'ufc') { const orgId = c.stage === 'pfl' ? 'pfl' : c.org; if (c.regionalChamp[orgId] === 'player') { c.regionalChamp[orgId] = opp.id; p.cinturones = p.cinturones.filter(x => x !== orgId); news(c, 'news_lost_title', { name: p.nombre }); } }
    else p.cinturones = p.cinturones.filter(x => x !== 'ufc');
  }

  // Tiempo: fecha del evento + recuperación (suspensión médica más larga tras un KO)
  if (offer.fecha && c.date < offer.fecha) c.date = offer.fecha;
  const recovery = ['ko', 'tko'].includes(result.method) && !won ? 60 : 30;
  c.date = addDays(c.date, recovery);
  tick(c);

  // Progresión en la escalera
  progression(c, ctx, { won, draw, result, opp, events, rng });

  const after = stars(p.atributos);
  if (after > before) events.push({ type: 'stars', from: before, to: after });
  c.offer = null; c.camp = null;
  // Si el rival de UFC quedó con récord perdedor después de pelear con vos, lo cortan.
  if (!opp.generico && c.ufc.includes(opp)) cutLosers(c, opp.division, rng);
  // Retiro: a partir de los 36 se puede elegir; a los 40 es obligatorio.
  if (p.edad >= 40) { c.retired = true; events.push({ type: 'retire_forced' }); news(c, 'news_player_retired', { name: p.nombre, record: p.record }); }
  else if (p.edad >= 36 && !c.pendingContract) events.push({ type: 'retire_option' });
  return events;
}

function offerContract(c, org, type, fights) {
  c.pendingContract = { org, type, fights: fights || (org === 'ufc' ? 4 : 3), date: c.date };
}

// Ofertas de promotoras de mayor nivel (misma región o vidrieras internacionales).
function higherOrg(c, promos, rng) {
  const p = c.player;
  const cur = c.stage === 'nacional' ? 0 : (promoById(promos, c.org)?.nivel || 0);
  const region = regionOf(promos, p.pais);
  const local = (promos.orgsPorRegion[region] || []).map(id => promoById(promos, id));
  const showcase = (promos.vidrieras || []).map(id => promoById(promos, id));
  const asia = isAsian(promos, p.pais) ? ['one', 'rizin'].map(id => promoById(promos, id)) : [];
  // Del circuito nacional se pasa a una promotora de la propia región; después se abren las vidrieras.
  const candidates = c.stage === 'nacional' ? local : [...local, ...showcase, ...asia];
  const pool = [...new Set(candidates)].filter(o => o && o.activa && o.nivel > cur && o.id !== c.org);
  if (!pool.length) return null;
  // Más probable el salto chico que el grande
  const weights = pool.map(o => [o, 1 / (1 + (o.nivel - cur) * 1.5) * (local.includes(o) ? 1.5 : 1)]);
  let r = rng() * weights.reduce((a, [, w]) => a + w, 0);
  for (const [o, w] of weights) { r -= w; if (r <= 0) return o; }
  return pool[0];
}

function progression(c, ctx, { won, draw, result, opp, events, rng }) {
  const { promos } = ctx;
  const p = c.player;
  const r = rec(p);
  const winPct = r.w / Math.max(1, r.w + r.l);
  const st = starsExact(p.atributos);
  const offer = (org, type, fights, ev = 'contract') => { offerContract(c, org, type, fights); events.push({ type: ev, org, fights: c.pendingContract.fights }); };
  switch (c.stage) {
    case 'nacional': {
      if (won && c.sameCountryFights >= NATIONAL_SAME_COUNTRY_FIGHTS && r.w >= 3 && winPct >= 0.6 && st >= 1.8 && rng() < 0.7) {
        const org = higherOrg(c, promos, rng);
        if (org) offer(org.id, 'regional', 3);
      }
      break;
    }
    case 'regional': {
      const org = promoById(promos, c.org) || { nivel: 2 };
      const champ = c.regionalChamp[c.org] === 'player';
      if (won && c.cooldownWins > 0) c.cooldownWins--;
      const ready = !(c.cooldownWins > 0);
      const hot = ((champ && won) || c.streakInStage >= 3) && r.w > r.l; // con récord perdedor no te llaman de arriba
      if (r.w > r.l && won && champ && org.nivel >= 2.5 && rng() < 0.4 + (org.nivel - 2.5) * 0.3) {
        // Campeón de una promotora fuerte: UFC lo llama directo (contrato corto)
        offer('ufc', 'ufc', 1 + Math.floor(rng() * 2)); news(c, 'news_ufc_contract', { name: p.nombre });
      } else if (r.w > r.l && won && st >= 2.8 && c.streakInStage >= 3 && rng() < 0.07) {
        offer('ufc', 'ufc', 1, 'short_notice'); news(c, 'news_short_notice', { name: p.nombre });
      } else if (hot && rng() < 0.45 && higherOrg(c, promos, rng)) {
        offer(higherOrg(c, promos, rng).id, 'regional', 3 + Math.floor(rng() * 2));
      } else if (ready && r.w > r.l && ((champ && won) || p.racha >= 4 || (r.w >= 8 && st >= 3 && p.racha >= 2)) && rng() < 0.6) {
        // Asiáticos: Road to UFC; tras 2 torneos perdidos también pueden ir al Contender Series.
        const asian = isAsian(promos, p.pais) && (c.rtuFails || 0) < 2;
        c.stage = asian ? 'rtu' : 'dwcs'; c.prevOrg = c.org; c.org = c.stage; c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0; c.rtuRound = 0; c.contract = null;
        events.push({ type: 'invite', org: c.stage });
        news(c, asian ? 'news_rtu' : 'news_dwcs', { name: p.nombre });
      } else if (r.w > r.l && won && champ && org.nivel >= 2.5 && rng() < 0.12) {
        offer('pfl', 'pfl', 3);
      } else if (p.racha <= -3 || (org.nivel >= ADVANCED_TIER && r.l > r.w)) {
        // Rachas malas o récord perdedor en una promotora fuerte: te cortan.
        events.push({ type: 'released', org: c.org });
        // Te cortan: bajás a una promotora más chica de tu región, o al circuito nacional.
        const lower = (promos.orgsPorRegion[regionOf(promos, p.pais)] || []).map(id => promoById(promos, id)).filter(o => o && o.activa && o.nivel < org.nivel).sort((a, b) => b.nivel - a.nivel)[0];
        if (lower) { c.org = lower.id; c.prevOrg = lower.id; c.contract = { org: lower.id, total: 3, left: 3, w: 0, l: 0 }; }
        else { c.stage = 'nacional'; c.org = null; c.contract = null; }
        c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0;
        news(c, 'news_released', { name: p.nombre });
      }
      break;
    }
    case 'dwcs': {
      if (won) {
        const chance = ['ko', 'tko', 'sub'].includes(result.method) ? 0.9 : result.method === 'dec_unanimous' ? 0.5 : 0.25;
        if (rng() < chance) { offer('ufc', 'ufc', 2 + Math.floor(rng() * 3)); news(c, 'news_ufc_contract', { name: p.nombre }); }
        else {
          events.push({ type: 'no_contract' });
          backToRegional(c, ctx);
          if (rng() < 0.4) offer('pfl', 'pfl', 3);
        }
      } else { events.push({ type: 'no_contract' }); backToRegional(c, ctx); }
      break;
    }
    case 'rtu': {
      if (won) {
        c.rtuRound++;
        if (c.rtuRound >= 3) { offer('ufc', 'ufc', 4); news(c, 'news_rtu_win', { name: p.nombre }); }
        else events.push({ type: 'rtu_advance', round: c.rtuRound });
      } else { c.rtuFails = (c.rtuFails || 0) + 1; events.push({ type: 'no_contract' }); backToRegional(c, ctx); }
      break;
    }
    case 'pfl': {
      if (won && (c.regionalChamp.pfl === 'player' ? rng() < 0.5 : rng() < 0.12) && st >= 3.2) offer('ufc', 'ufc', 2 + Math.floor(rng() * 3));
      else if (!won && !draw && (p.racha <= -3 || r.l > r.w)) {
        events.push({ type: 'released', org: 'pfl' }); news(c, 'news_released_org', { name: p.nombre, org: 'PFL' });
        backToRegional(c, ctx);
      }
      break;
    }
    case 'ufc': {
      // Con récord perdedor UFC te corta aunque estés rankeado.
      if (!won && !draw && ((p.ranking == null && p.racha <= -3) || r.l > r.w)) releaseFromUfc(c, ctx, events, rng);
      break;
    }
    default: break;
  }
  // Fin de contrato: renovación según cómo te fue
  const k = c.contract;
  if (k && k.left <= 0 && !c.pendingContract && c.stage === k.org) {
    if (k.org === 'ufc') {
      if (k.w >= k.l || p.ranking != null) { c.contract = { org: 'ufc', total: 4, left: 4, w: 0, l: 0 }; events.push({ type: 'renewed', org: 'ufc' }); news(c, 'news_renewed', { name: p.nombre, org: 'UFC' }); }
      else releaseFromUfc(c, ctx, events, rng);
    } else {
      c.contract = { org: k.org, total: 3, left: 3, w: 0, l: 0 };
      events.push({ type: 'renewed', org: k.org });
    }
  }
}

function releaseFromUfc(c, ctx, events, rng) {
  const p = c.player;
  c.ufc = c.ufc.filter(f => f.id !== 'player');
  p.ranking = null;
  backToRegional(c, ctx);
  events.push({ type: 'released', org: 'ufc' }); news(c, 'news_ufc_cut', { name: p.nombre });
  if (rng() < 0.4) { offerContract(c, 'pfl', 'pfl', 3); events.push({ type: 'contract', org: 'pfl', fights: 3 }); }
}

function backToRegional(c, ctx) {
  const { promos } = ctx;
  const orgs = promos.orgsPorRegion[regionOf(promos, c.player.pais)];
  const best = [...orgs].sort((a, b) => (promoById(promos, b)?.nivel || 0) - (promoById(promos, a)?.nivel || 0))[0];
  let back = c.prevOrg || best;
  // Con récord perdedor no podés volver a una promotora fuerte: bajás a una más chica o al circuito nacional.
  const r = rec(c.player);
  if (r.l >= r.w && (promoById(promos, back)?.nivel ?? 5) >= ADVANCED_TIER) {
    back = [...orgs].map(id => promoById(promos, id)).filter(o => o && o.activa && o.nivel < ADVANCED_TIER).sort((a, b) => b.nivel - a.nivel)[0]?.id;
    if (!back) { c.stage = 'nacional'; c.org = null; c.contract = null; c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0; return; }
  }
  c.stage = 'regional'; c.org = back;
  c.contract = { org: back, total: 3, left: 3, w: 0, l: 0 };
  c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0;
  c.cooldownWins = 3; // hay que volver a ganarse la oportunidad
}

export function acceptContract(c) {
  const k = c.pendingContract;
  if (!k) return;
  const p = c.player;
  c.stage = k.type === 'regional' ? 'regional' : k.org; c.org = k.org;
  c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0;
  c.contract = { org: k.org, total: k.fights, left: k.fights, w: 0, l: 0 };
  if (k.type === 'regional') c.prevOrg = k.org;
  if (k.org === 'ufc') {
    p.ranking = null;
    if (!c.ufc.find(f => f.id === 'player')) c.ufc.push(p);
    news(c, 'news_signed_ufc', { name: p.nombre });
  } else news(c, 'news_signed', { name: p.nombre, org: k.org });
  c.pendingContract = null;
  c.offer = null; c.camp = null; // la próxima pelea ya es en la nueva organización
}

export function declineContract(c) { c.pendingContract = null; }

export function retire(c) {
  c.retired = true;
  news(c, 'news_player_retired', { name: c.player.nombre, record: c.player.record });
}

// ---------- paso del tiempo y mundo UFC ----------
function tick(c) {
  const p = c.player;
  if (p.fechaNacimiento) {
    const a = ageOn(p.fechaNacimiento, c.date);
    if (a > p.edad) {
      p.edad = a;
      if (a >= 33) { p.atributos.velocidad = Math.max(15, p.atributos.velocidad - (a - 32) * 0.8); p.atributos.cardio = Math.max(15, p.atributos.cardio - (a - 32) * 0.6); }
      p.techo = Math.max(60, p.techo - (a >= 30 ? 1.5 : 0));
    }
  }
  // El mundo UFC avanza mes a mes
  const months = Math.floor((new Date(c.date) - new Date(c.lastWorldSim)) / (30 * 864e5));
  if (months > 0) { simulateWorld(c, months); c.lastWorldSim = addDays(c.lastWorldSim, months * 30); }
}

export function simulateWorld(c, months) {
  const rng = rngOf(c);
  const divisions = [...new Set(c.ufc.map(f => f.division))];
  for (let m = 0; m < months; m++) {
    for (const div of divisions) {
      const pool = c.ufc.filter(f => f.division === div && f.id !== 'player' && !f.retirado);
      if (pool.length < 4) continue;
      const fights = 2;
      const used = new Set(c.offer ? [c.offer.opponentId] : []);
      // Pelea por el título aproximadamente cada 4 meses
      if (rng() < 0.25) {
        const champ = pool.find(f => f.ranking === 0), con = pool.find(f => f.ranking === 1) || pool.find(f => f.ranking === 2);
        if (champ && con && !used.has(champ.id) && !used.has(con.id)) { fightAI(c, champ, con, 5, rng); used.add(champ.id); used.add(con.id); }
      }
      for (let i = 0; i < fights; i++) {
        const a = pick(rng, pool.filter(f => !used.has(f.id) && f.ranking !== 0));
        if (!a) break;
        const near = pool.filter(f => f !== a && !used.has(f.id) && f.ranking !== 0 && Math.abs((f.ranking ?? 20) - (a.ranking ?? 20)) <= 4);
        const b = near.length ? pick(rng, near) : null;
        if (!b) continue;
        fightAI(c, a, b, 3, rng);
        used.add(a.id); used.add(b.id);
      }
      cutLosers(c, div, rng);
      maintainRankings(c, div);
    }
    // Envejecimiento anual de la IA (cada 12 meses simulados)
    c.worldMonths = (c.worldMonths || 0) + 1;
    if (c.worldMonths % 12 === 0) yearlyTurnover(c, rng);
  }
}

// UFC corta a quien queda con récord no ganador o encadena 3 derrotas sin ranking, y firma a un prospecto.
function cutLosers(c, div, rng) {
  for (const f of c.ufc) {
    if (f.division !== div || f.id === 'player' || f.retirado || f.id === c.offer?.opponentId) continue;
    const r = rec(f);
    if (!(r.l >= r.w || (f.ranking == null && f.racha <= -3))) continue;
    f.retirado = true; f.cortado = true;
    if (f.ranking != null) news(c, 'news_ufc_cut', { name: f.nombre });
    f.ranking = null;
    if (NAMES) c.ufc.push(newUfcProspect(c, div, rng));
  }
}

function newUfcProspect(c, div, rng) {
  const countries = Object.keys(NAMES).filter(k => /^[A-Z]{2,3}$/.test(k));
  const nf = generateFighter(rng, { namesDb: NAMES, country: pick(rng, countries), division: div, level: 'ufc', archetype: 'prospecto', idPrefix: 'ufc' });
  nf.generico = false; nf.nuevo = true;
  return nf;
}

// Cada año: los veteranos se retiran (la mayoría entre los 36 y los 40) y llegan prospectos nuevos.
const RETIRE_BY_AGE = { 34: 0.05, 35: 0.1, 36: 0.2, 37: 0.32, 38: 0.48, 39: 0.65 };
function yearlyTurnover(c, rng) {
  const divisions = [...new Set(c.ufc.map(f => f.division))];
  for (const f of c.ufc) {
    if (f.id === 'player' || f.retirado) continue;
    f.edad++;
    if (f.id === c.offer?.opponentId) continue; // ya tiene pelea pactada con el jugador
    let pr = f.edad >= 40 ? 0.85 : RETIRE_BY_AGE[f.edad] || 0;
    if (f.racha <= -2) pr += 0.15;
    if (f.ranking == null && f.racha <= -3) pr += 0.3;
    if (rng() < pr) {
      f.retirado = true;
      if (f.ranking != null) news(c, f.ranking === 0 ? 'news_champ_retired' : 'news_retired', { name: f.nombre, record: f.record, div: f.division });
      f.ranking = null;
    }
  }
  for (const div of divisions) {
    rerank(c, div);
    const active = c.ufc.filter(f => f.division === div && !f.retirado).length;
    const newcomers = Math.max(0, 26 - active) + (rng() < 0.6 ? 1 : 0);
    for (let i = 0; i < newcomers && NAMES; i++) c.ufc.push(newUfcProspect(c, div, rng));
  }
  // Los retirados viejos se borran para que el guardado no crezca sin límite
  c.ufc = c.ufc.filter(f => !f.retirado || f.id === 'player');
}

// Reordena el ranking sin huecos; si el campeón se retiró, el #1 pasa a ser campeón.
function rerank(c, div) {
  const ranked = c.ufc.filter(f => f.division === div && !f.retirado && f.ranking != null).sort((a, b) => a.ranking - b.ranking);
  const hadChamp = ranked.some(f => f.ranking === 0);
  ranked.forEach((f, i) => {
    const r = i + (hadChamp ? 0 : 0);
    if (!hadChamp && i === 0) news(c, 'news_new_champ', { name: f.nombre, div });
    f.ranking = r <= 15 ? r : null;
  });
  // Completar el top 15 con los mejores no rankeados
  const n = c.ufc.filter(f => f.division === div && !f.retirado && f.ranking != null).length;
  if (n < 16) {
    const pool = c.ufc.filter(f => f.division === div && !f.retirado && f.ranking == null && f.id !== 'player').sort((a, b) => b.racha - a.racha || starsExact(b.atributos) - starsExact(a.atributos));
    pool.slice(0, 16 - n).forEach((f, i) => { f.ranking = n + i; });
  }
}

function fightAI(c, a, b, rounds, rng) {
  const res = simulateFight(a, b, { rounds, rng });
  const wasChamp = [a, b].find(f => f.ranking === 0);
  applyResult(c.ufc, res);
  const W = c.ufc.find(f => f.id === res.winnerId);
  if (wasChamp && W !== wasChamp && W.ranking === 0) news(c, 'news_new_champ', { name: W.nombre, div: W.division });
}

// Los no rankeados con racha entran al top 15 desplazando a quien viene perdiendo.
function maintainRankings(c, div) {
  const fs = c.ufc.filter(f => f.division === div && !f.retirado);
  const hot = fs.filter(f => f.ranking == null && f.racha >= 3).sort((x, y) => y.racha - x.racha)[0];
  const cold = fs.filter(f => f.ranking != null && f.ranking >= 12 && f.racha <= -2).sort((x, y) => y.ranking - x.ranking)[0];
  if (hot && cold) { hot.ranking = cold.ranking; cold.ranking = null; }
  for (const f of fs) if (f.retirado && f.ranking != null) f.ranking = null;
}

export function rankingTable(c, division) {
  return c.ufc.filter(f => f.division === division && f.ranking != null && !f.retirado).sort((a, b) => a.ranking - b.ranking);
}

export function playerWinProb(c) {
  const opp = opponentOf(c);
  return opp ? winProbability(c.player, opp) : 0.5;
}

// ---------- guardado ----------
export const SAVE_KEY = 'pixelmma.career.v1';
export function save(c) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(c)); return true; } catch { return false; } }
export function load() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? relink(JSON.parse(s)) : null;
  } catch { return null; }
}
// Tras JSON, el jugador dentro del mundo UFC y c.player deben ser el mismo objeto.
export function relink(c) {
  const i = c.ufc.findIndex(f => f.id === 'player');
  if (i >= 0) c.ufc[i] = c.player;
  return c;
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* nada */ } }

export { starsToOverall, namesFor, overall, STYLE_PROFILE };
