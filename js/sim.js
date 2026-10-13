// Simulación realista de peleas (sin jugar) y actualización del mundo.
import { starsExact, progressAfterFight } from './ratings.js';

export const MAX_FAVORITE = 0.92;
const K_STARS = 1.45; // pendiente logística por estrella de diferencia

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const logistic = x => 1 / (1 + Math.exp(-x));

const takedownDefense = f => f.atributos.grappling * 0.6 + f.atributos.defensa * 0.4;
const grapplingThreat = f => Math.max(f.atributos.grappling, f.atributos.sumisiones * 0.9);
const agePenalty = age => (age > 34 ? (age - 34) * 0.06 : age < 23 ? 0.05 : 0);

// Componentes (en logits) de la ventaja de A sobre B. Se exponen para depurar y para la UI.
export function matchupFactors(a, b) {
  const rating = K_STARS * (starsExact(a.atributos) - starsExact(b.atributos));
  // Cruce de estilos: el grappler castiga al striker sin defensa de derribo.
  const style = (Math.max(0, grapplingThreat(a) - takedownDefense(b) - 5)
    - Math.max(0, grapplingThreat(b) - takedownDefense(a) - 5)) / 100 * 1.2;
  const reach = clamp(((a.alcance || 0) - (b.alcance || 0)) / 10 * 0.07, -0.2, 0.2);
  const chin = (a.atributos.menton - b.atributos.menton) / 100 * 0.4;
  const age = agePenalty(b.edad) - agePenalty(a.edad);
  return { rating, style, reach, chin, age };
}

export function winProbability(a, b) {
  const f = matchupFactors(a, b);
  const x = f.rating + f.style + f.reach + f.chin + f.age;
  return clamp(logistic(x), 1 - MAX_FAVORITE, MAX_FAVORITE);
}

function pickWeighted(rng, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
}

const SUBMISSIONS = {
  bjj: ['sub_rnc', 'sub_triangle', 'sub_armbar', 'sub_kimura'],
  lucha_libre: ['sub_rnc', 'sub_arm_triangle', 'sub_guillotine'],
  default: ['sub_rnc', 'sub_guillotine', 'sub_arm_triangle', 'sub_armbar'],
};

export function randomSubmission(style, rng = Math.random) {
  const list = SUBMISSIONS[style] || SUBMISSIONS.default;
  return list[Math.floor(rng() * list.length)];
}

// Tarjetas de los jueces coherentes con el tipo de decisión.
function makeScorecards(rng, rounds, kind) {
  // Rounds ganados por el ganador en cada tarjeta.
  const cards = [];
  const majorityWin = Math.floor(rounds / 2) + 1;
  for (let j = 0; j < 3; j++) {
    let won;
    const loserCard = (kind === 'split' && j === 2);
    const evenCard = (kind === 'majority' && j === 2);
    if (loserCard) won = majorityWin - 1;
    else won = majorityWin + Math.floor(rng() * (rounds - majorityWin + 1));
    let w = 0, l = 0;
    if (evenCard) {
      // Empate en la tarjeta: rounds repartidos y, si son impares, uno 10-10.
      for (let r = 0; r < rounds; r++) {
        if (r === rounds - 1 && rounds % 2 === 1) { w += 10; l += 10; }
        else if (r % 2 === 0) { w += 10; l += 9; } else { w += 9; l += 10; }
      }
    } else {
      w = won * 10 + (rounds - won) * 9;
      l = won * 9 + (rounds - won) * 10;
      if (!loserCard && won === rounds && rng() < 0.12) l -= 1; // un 10-8
    }
    cards.push([w, l]);
  }
  return cards;
}

// Simula una pelea. Devuelve ganador, método, round y tiempo.
export function simulateFight(a, b, { rounds = 3, roundSeconds = 300, rng = Math.random } = {}) {
  const pA = winProbability(a, b);
  const aWins = rng() < pA;
  const W = aWins ? a : b, L = aWins ? b : a;
  const gap = Math.abs(pA - 0.5) * 2; // 0 = parejos, ~0.84 = máxima diferencia

  const wa = W.atributos, la = L.atributos;
  const power = ((wa.golpeo + wa.patadas) / 2) / 75;
  const koW = 0.30 * power * ((100 - la.menton + 30) / 80) * (1 + gap);
  const subW = 0.17 * (wa.sumisiones / 75) * ((130 - (la.grappling + la.defensa) / 2) / 80) * (1 + gap);
  const decW = 0.5 * (1 - gap * 0.4);
  const method = pickWeighted(rng, [['ko', koW], ['sub', subW], ['dec', decW]]);

  const res = { winnerId: W.id, loserId: L.id, probA: pA, rounds };
  if (method === 'dec') {
    const closeness = 1 - gap;
    const kind = pickWeighted(rng, [['unanimous', 0.75], ['split', 0.22 * closeness + 0.03], ['majority', 0.04]]);
    res.method = kind === 'unanimous' ? 'dec_unanimous' : kind === 'split' ? 'dec_split' : 'dec_majority';
    res.round = rounds;
    res.time = roundSeconds;
    res.scorecards = makeScorecards(rng, rounds, kind);
  } else {
    const weights = [1, 0.75, 0.55, 0.4, 0.3].slice(0, rounds).map((w, i) => [i + 1, w]);
    res.round = pickWeighted(rng, weights);
    res.time = Math.round(10 + rng() * (roundSeconds - 11));
    if (method === 'ko') res.method = rng() < 0.42 ? 'ko' : 'tko';
    else { res.method = 'sub'; res.submission = randomSubmission(W.estilo, rng); }
  }
  return res;
}

// ---------- Actualización del mundo tras peleas entre IA ----------

function parseRecord(rec) {
  const [w, l, d] = String(rec).split('-').map(n => parseInt(n, 10) || 0);
  return { w, l, d };
}

// Ordena la división: campeón, #1..#15, luego no rankeados.
function rankingOrder(list) {
  return [...list].sort((x, y) => {
    const rx = x.ranking == null ? 999 : x.ranking;
    const ry = y.ranking == null ? 999 : y.ranking;
    return rx - ry;
  });
}

// Aplica el resultado: récords, rachas, rankings, atributos (y por tanto estrellas).
// `fighters` es el array completo; se modifica en el lugar y se devuelve.
export function applyResult(fighters, result, { draw = false } = {}) {
  const W = fighters.find(f => f.id === result.winnerId);
  const L = fighters.find(f => f.id === result.loserId);
  if (!W || !L) throw new Error('peleador no encontrado');

  const rw = parseRecord(W.record), rl = parseRecord(L.record);
  if (draw) {
    rw.d++; rl.d++; W.racha = 0; L.racha = 0;
  } else {
    rw.w++; rl.l++;
    W.racha = W.racha > 0 ? W.racha + 1 : 1;
    L.racha = L.racha < 0 ? L.racha - 1 : -1;
  }
  W.record = `${rw.w}-${rw.l}-${rw.d}`;
  L.record = `${rl.w}-${rl.l}-${rl.d}`;

  if (!draw) {
    const pW = winProbability(W, L);
    W.atributos = progressAfterFight(W.atributos, { won: true, expected: pW, age: W.edad });
    L.atributos = progressAfterFight(L.atributos, { won: false, expected: 1 - pW, age: L.edad });
    updateRankings(fighters, W, L);
  }
  return fighters;
}

function updateRankings(fighters, W, L) {
  if (W.division !== L.division) return;
  const div = fighters.filter(f => f.division === W.division);
  const hasChampion = div.some(f => f.ranking === 0);
  const order = rankingOrder(div).filter(f => f.ranking != null || f === W || f === L);
  const idxW = order.indexOf(W), idxL = order.indexOf(L);
  const wRank = W.ranking == null ? Infinity : W.ranking;
  const lRank = L.ranking == null ? Infinity : L.ranking;
  if (lRank === Infinity && wRank === Infinity) return;

  if (wRank > lRank) {
    // Sorpresa: el ganador ocupa el puesto del perdedor; el perdedor baja uno.
    order.splice(idxW, 1);
    order.splice(idxL, 0, W);
  } else if (idxL >= 0 && idxL + 1 < order.length && L.ranking != null && L.ranking !== 0) {
    // Perdió el favorito o el de abajo: el perdedor cae un puesto.
    [order[idxL], order[idxL + 1]] = [order[idxL + 1], order[idxL]];
  }
  const offset = hasChampion ? 0 : 1;
  order.forEach((f, i) => {
    const r = i + offset;
    f.ranking = r <= 15 ? r : null;
  });
}

// Simula y aplica en un solo paso (útil para el mundo de la carrera).
export function simulateAndApply(fighters, idA, idB, opts) {
  const a = fighters.find(f => f.id === idA), b = fighters.find(f => f.id === idB);
  const res = simulateFight(a, b, opts);
  applyResult(fighters, res);
  return res;
}
