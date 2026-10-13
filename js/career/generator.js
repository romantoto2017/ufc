// Generador de peleadores genéricos para el camino previo a UFC.
// Coherencia: edad ↔ récord ↔ arquetipo ↔ nivel de la organización ↔ atributos/estrellas.
import { ATTRS, STYLES, STYLE_PROFILE, overall } from '../ratings.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Rango de estrellas por nivel (escala pedida). El overall se obtiene invirtiendo la fórmula de estrellas.
export const LEVEL_STARS = {
  nacional: [1, 2.5], regional: [1.5, 3], dwcs: [3, 3.5], rtu: [2.75, 3.5], pfl: [3, 4], ufc: [3, 3.5],
};
export const starsToOverall = s => 30 + (s - 0.5) * 62 / 4.5;

export const ARCHETYPES = ['prospecto', 'veterano', 'relleno', 'local'];

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function randInt(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
function gauss(rng) { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }

export function namesFor(namesDb, country) {
  const key = namesDb[country] ? country : (namesDb._alias?.[country] || 'US');
  return namesDb[key] || namesDb.US;
}

// Récord coherente con la edad y el arquetipo.
export function makeRecord(rng, age, archetype, level) {
  const startAge = archetype === 'veterano' ? randInt(rng, 18, 23) : randInt(rng, 19, 25);
  const years = Math.max(0.5, age - startAge);
  const perYear = archetype === 'relleno' || archetype === 'veterano' ? 2.2 + rng() * 1.6 : 1.4 + rng() * 1.4;
  let fights = Math.max(2, Math.round(years * perYear * (level === 'nacional' ? 0.8 : 1)));
  if (archetype === 'prospecto') fights = Math.min(fights, randInt(rng, 3, 12));
  let winPct;
  switch (archetype) {
    case 'prospecto': winPct = 0.8 + rng() * 0.2; break;
    case 'veterano': winPct = 0.45 + rng() * 0.25; break;
    case 'relleno': winPct = 0.25 + rng() * 0.25; break;
    default: winPct = 0.6 + rng() * 0.25; // local favorito
  }
  if (level === 'dwcs' || level === 'rtu' || level === 'pfl') winPct = Math.max(winPct, 0.72 + rng() * 0.2);
  let w = Math.round(fights * winPct);
  let l = fights - w;
  const d = rng() < 0.12 ? 1 : 0;
  if (archetype === 'prospecto' && l > 1) { w += l - 1; l = 1; }
  if (rng() < 0.25 && archetype === 'prospecto') { w += l; l = 0; }
  return { w, l, d, record: `${w}-${l}-${d}` };
}

// Atributos a partir de un objetivo de estrellas, estilo, edad y arquetipo.
export function makeAttributes(rng, { targetStars, style, age, archetype }) {
  const target = starsToOverall(targetStars);
  const prof = STYLE_PROFILE[style] || {};
  const raw = {};
  for (const k of ATTRS) raw[k] = target + (prof[k] || 0) + gauss(rng) * 4;
  switch (archetype) {
    case 'prospecto': raw.velocidad += 8; raw.cardio += 6; raw.defensa -= 7; raw.menton -= 2; break;
    case 'veterano': raw.menton += 8; raw.defensa += 6; raw.velocidad -= 10; raw.cardio -= 8; break;
    case 'relleno': raw.menton += 3; raw.cardio -= 4; break;
    default: raw.golpeo += 3; break;
  }
  if (age > 33) { raw.velocidad -= (age - 33) * 1.2; raw.cardio -= (age - 33) * 0.8; }
  if (age < 23) { raw.defensa -= 3; raw.velocidad += 2; }
  let out = { ...raw };
  for (let i = 0; i < 6; i++) {
    const shift = target - overall(out);
    for (const k of ATTRS) out[k] = clamp(out[k] + shift, 15, 95);
  }
  for (const k of ATTRS) out[k] = Math.round(out[k]);
  return out;
}

export function randomFace(rng) {
  return {
    piel: randInt(rng, 0, 5),
    pelo: pick(rng, ['rapado', 'corto', 'fade', 'medio', 'calvo', 'rizado', 'mohicano', 'largo']),
    colorPelo: pick(rng, ['negro', 'negro', 'castano', 'castano_claro', 'rubio', 'pelirrojo', 'gris']),
    barba: pick(rng, ['ninguna', 'sombra', 'corta', 'completa', 'candado', 'bigote']),
    cejas: pick(rng, ['finas', 'normales', 'gruesas']),
    cabeza: pick(rng, ['redonda', 'cuadrada', 'ovalada', 'ancha']),
  };
}

const HEIGHT_BY_DIV = { mosca: 165, gallo: 170, pluma: 173, ligero: 177, welter: 181, medio: 185, semipesado: 189, pesado: 193 };

// Crea un rival genérico.
export function generateFighter(rng, { namesDb, country, division, level, archetype, idPrefix = 'g' }) {
  archetype = archetype || pick(rng, level === 'nacional' ? ['prospecto', 'veterano', 'relleno', 'relleno', 'local', 'local'] : ['prospecto', 'veterano', 'relleno', 'local', 'prospecto']);
  let age;
  switch (archetype) {
    case 'prospecto': age = randInt(rng, 19, 25); break;
    case 'veterano': age = randInt(rng, 31, 40); break;
    case 'relleno': age = randInt(rng, 24, 38); break;
    default: age = randInt(rng, 22, 33);
  }
  const rec = makeRecord(rng, age, archetype, level);
  const [lo, hi] = LEVEL_STARS[level] || [1.5, 3];
  const archShift = { prospecto: 0.15, veterano: 0, relleno: -0.35, local: 0.1 }[archetype];
  const targetStars = clamp(lo + (hi - lo) * rng() + archShift, lo, hi);
  const style = pick(rng, STYLES);
  const names = namesFor(namesDb, country);
  const nombre = `${pick(rng, names.nombres)} ${pick(rng, names.apellidos)}`;
  const h = HEIGHT_BY_DIV[division] + Math.round(gauss(rng) * 4);
  const reach = h + Math.round(gauss(rng) * 4);
  const streak = archetype === 'relleno' ? -randInt(rng, 0, 3) : archetype === 'prospecto' ? randInt(rng, 1, Math.max(1, rec.w)) : randInt(rng, -2, 3);
  return {
    id: `${idPrefix}-${Math.floor(rng() * 1e9).toString(36)}`,
    generico: true, arquetipo: archetype, nivel: level,
    nombre, apodo: null, pais: country, edad: age, division,
    altura: h, alcance: reach, postura: rng() < 0.2 ? 'zurda' : 'ortodoxa', estilo: style,
    record: rec.record, racha: Math.min(streak, rec.w), ranking: null,
    atributos: makeAttributes(rng, { targetStars, style, age, archetype }),
    cara: randomFace(rng), fuente: 'generado',
  };
}
