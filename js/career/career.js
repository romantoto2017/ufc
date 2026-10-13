// Modo carrera: estado, escalera (nacional → regional → DWCS/Road to UFC → UFC, con PFL como alternativa),
// ofertas de pelea, contratos, entrenamiento, dinero y simulación del mundo UFC. Módulo puro (testeable en Node).
import { ATTRS, STYLE_PROFILE, stars, starsExact, overall } from '../ratings.js';
import { simulateFight, applyResult, winProbability } from '../sim.js';
import { generateFighter, makeAttributes, starsToOverall, namesFor } from './generator.js';

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

function genericOpponent(c, ctx, { level, country, archetype }) {
  const rng = rngOf(c);
  const f = generateFighter(rng, { namesDb: ctx.names, country, division: c.player.division, level, archetype });
  c.generics[f.id] = f;
  return f;
}

// Revancha: rivales genéricos guardados que vuelven a aparecer.
function rematchCandidate(c, level, rng) {
  const pool = Object.values(c.generics).filter(g => g.nivel === level && g.division === c.player.division && g.vsPlayer);
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
    if (!isChamp && c.streakInStage >= REGIONAL_TITLE_STREAK) {
      // Pelea por el título regional contra el campeón vigente
      let champ = champId && c.generics[champId];
      if (!champ) { champ = genericOpponent(c, ctx, { level: 'regional', country: pick(rng, regionCountries(promos, c)), archetype: rng() < 0.5 ? 'local' : 'prospecto' }); champ.atributos = makeAttributes(rng, { targetStars: 3, style: champ.estilo, age: champ.edad, archetype: 'local' }); c.regionalChamp[c.org] = champ.id; }
      opponent = champ; rounds = 5; title = true;
    } else {
      opponent = rematchCandidate(c, 'regional', rng) || genericOpponent(c, ctx, { level: 'regional', country: pick(rng, regionCountries(promos, c)) });
      if (org.nivel >= 3) opponent.atributos = makeAttributes(rng, { targetStars: 2.5 + rng() * 0.75, style: opponent.estilo, age: opponent.edad, archetype: opponent.arquetipo });
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
    fecha: addDays(c.date, 7 * (c.stage === 'ufc' ? 12 + Math.floor(rng() * 9) : c.stage === 'nacional' ? 6 + Math.floor(rng() * 5) : 8 + Math.floor(rng() * 6))),
    country: c.stage === 'nacional' ? p.pais : org.pais,
  };
  c.camp = { sessions: 0, max: 3 + p.gimnasio };
  return c.offer;
}

function ufcOpponent(c, rng) {
  const p = c.player;
  const div = c.ufc.filter(f => f.division === p.division && f.id !== 'player' && !f.retirado);
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
  if (c.camp) c.camp.max = 3 + next;
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
  return events;
}

function offerContract(c, org, type) {
  c.pendingContract = { org, type, fights: org === 'ufc' ? 4 : 3, date: c.date };
}

function progression(c, ctx, { won, draw, result, opp, events, rng }) {
  const { promos } = ctx;
  const p = c.player;
  const r = rec(p);
  const winPct = r.w / Math.max(1, r.w + r.l);
  const st = starsExact(p.atributos);
  switch (c.stage) {
    case 'nacional': {
      if (c.stageFights >= 4 && r.w >= 3 && winPct >= 0.6 && p.racha >= 1 && st >= 1.9) {
        const orgs = promos.orgsPorRegion[regionOf(promos, p.pais)].filter(id => promoById(promos, id)?.activa);
        const org = pick(rng, orgs);
        offerContract(c, org, 'regional');
        events.push({ type: 'contract', org });
      }
      break;
    }
    case 'regional': {
      const champ = c.regionalChamp[c.org] === 'player';
      if (won && c.cooldownWins > 0) c.cooldownWins--;
      const ready = !(c.cooldownWins > 0);
      if (ready && ((champ && won) || p.racha >= 4 || (r.w >= 8 && st >= 3 && p.racha >= 2))) {
        // Asiáticos: Road to UFC; tras 2 torneos perdidos también pueden ir al Contender Series.
        const asian = isAsian(promos, p.pais) && (c.rtuFails || 0) < 2;
        c.stage = asian ? 'rtu' : 'dwcs'; c.org = c.stage; c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0; c.rtuRound = 0;
        events.push({ type: 'invite', org: c.stage });
        news(c, asian ? 'news_rtu' : 'news_dwcs', { name: p.nombre });
      } else if (p.racha <= -3) {
        events.push({ type: 'released', org: c.org });
        c.stage = 'nacional'; c.org = null; c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0;
        news(c, 'news_released', { name: p.nombre });
      }
      break;
    }
    case 'dwcs': {
      if (won) {
        const chance = ['ko', 'tko', 'sub'].includes(result.method) ? 0.9 : result.method === 'dec_unanimous' ? 0.5 : 0.25;
        if (rng() < chance) { offerContract(c, 'ufc', 'ufc'); events.push({ type: 'contract', org: 'ufc' }); news(c, 'news_ufc_contract', { name: p.nombre }); }
        else {
          events.push({ type: 'no_contract' });
          backToRegional(c, ctx);
          if (rng() < 0.4) { offerContract(c, 'pfl', 'pfl'); events.push({ type: 'contract', org: 'pfl' }); }
        }
      } else { events.push({ type: 'no_contract' }); backToRegional(c, ctx); }
      break;
    }
    case 'rtu': {
      if (won) {
        c.rtuRound++;
        if (c.rtuRound >= 3) { offerContract(c, 'ufc', 'ufc'); events.push({ type: 'contract', org: 'ufc' }); news(c, 'news_rtu_win', { name: p.nombre }); }
        else events.push({ type: 'rtu_advance', round: c.rtuRound });
      } else { c.rtuFails = (c.rtuFails || 0) + 1; events.push({ type: 'no_contract' }); backToRegional(c, ctx); }
      break;
    }
    case 'pfl': {
      if (won && (c.regionalChamp.pfl === 'player' ? rng() < 0.6 : rng() < 0.15) && st >= 3.3) { offerContract(c, 'ufc', 'ufc'); events.push({ type: 'contract', org: 'ufc' }); }
      break;
    }
    case 'ufc': {
      if (!won && !draw && p.ranking == null && p.racha <= -3) {
        c.ufc = c.ufc.filter(f => f.id !== 'player');
        c.stage = 'regional'; backToRegional(c, ctx); events.push({ type: 'released', org: 'ufc' }); news(c, 'news_ufc_cut', { name: p.nombre });
        if (rng() < 0.5) { offerContract(c, 'pfl', 'pfl'); events.push({ type: 'contract', org: 'pfl' }); }
      }
      break;
    }
    default: break;
  }
}

function backToRegional(c, ctx) {
  const { promos } = ctx;
  const orgs = promos.orgsPorRegion[regionOf(promos, c.player.pais)];
  c.stage = 'regional'; c.org = c.org && orgs.includes(c.org) ? c.org : orgs[0];
  c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0;
  c.cooldownWins = 3; // hay que volver a ganarse la oportunidad
}

export function acceptContract(c) {
  const k = c.pendingContract;
  if (!k) return;
  const p = c.player;
  c.stage = k.type === 'regional' ? 'regional' : k.org; c.org = k.org;
  c.stageFights = 0; c.stageWins = 0; c.streakInStage = 0;
  if (k.org === 'ufc') {
    p.ranking = null;
    if (!c.ufc.find(f => f.id === 'player')) c.ufc.push(p);
    news(c, 'news_signed_ufc', { name: p.nombre });
  } else news(c, 'news_signed', { name: p.nombre, org: k.org });
  c.pendingContract = null;
  c.offer = null; c.camp = null; // la próxima pelea ya es en la nueva organización
}

export function declineContract(c) { c.pendingContract = null; }

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
      maintainRankings(c, div);
    }
    // Envejecimiento anual de la IA (cada 12 meses simulados)
    c.worldMonths = (c.worldMonths || 0) + 1;
    if (c.worldMonths % 12 === 0) for (const f of c.ufc) if (f.id !== 'player') {
      f.edad++;
      if (f.edad >= 41 && f.racha < 0 && f.ranking == null) f.retirado = true;
    }
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
