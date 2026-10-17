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

export function randomName(rng, names) {
  let pool = names;
  // Países con comunidades distintas (Rusia, Sudáfrica, Nigeria...): nombre y apellido del mismo grupo.
  if (names.grupos?.length) {
    const total = names.grupos.reduce((s, g) => s + (g.peso || 1), 0);
    let r = rng() * total;
    pool = names.grupos[0];
    for (const g of names.grupos) { r -= g.peso || 1; if (r <= 0) { pool = g; break; } }
  }
  const first = pick(rng, pool.nombres);
  let last = first;
  // En Corea, Vietnam o China unos pocos apellidos son muchísimo más comunes. Nunca "Olawale Olawale".
  for (let i = 0; i < 5 && last === first; i++) last = pool.frecuentes?.length && rng() < 0.45 ? pick(rng, pool.frecuentes) : pick(rng, pool.apellidos);
  return `${first} ${last}`;
}

export function namesFor(namesDb, country) {
  const key = namesDb[country] ? country : (namesDb._alias?.[country] || 'US');
  return namesDb[key] || namesDb.US;
}

// Nivel numérico de cada etapa (para el regional se usa el nivel real de la promotora).
export const LEVEL_TIER = { nacional: 1, regional: 2, dwcs: 3.5, rtu: 3.5, pfl: 4, ufc: 5 };
// Desde este nivel (Ares, Brave, Oktagon, LFA, Cage Warriors, KSW, ONE, PFL, UFC...) nadie tiene récord negativo.
export const ADVANCED_TIER = 2.5;

// Tope de peleas: en el circuito nacional son pocas (nadie llega con 15); más arriba, según la edad.
function maxFights(rng, archetype, tier) {
  if (tier < 2) return { prospecto: randInt(rng, 1, 5), local: randInt(rng, 2, 8), relleno: randInt(rng, 3, 10), veterano: randInt(rng, 4, 10) }[archetype];
  if (tier < ADVANCED_TIER) return randInt(rng, 6, 16);
  return randInt(rng, 12, 30);
}

// Récord coherente con la edad, el arquetipo y el nivel de la organización.
export function makeRecord(rng, age, archetype, level, tier = LEVEL_TIER[level] || 2) {
  const startAge = archetype === 'veterano' ? randInt(rng, 18, 23) : randInt(rng, 19, 25);
  const years = Math.max(0.5, age - startAge);
  const perYear = archetype === 'relleno' || archetype === 'veterano' ? 1.8 + rng() * 1.2 : 1.2 + rng() * 1.2;
  let fights = Math.max(1, Math.min(maxFights(rng, archetype, tier), Math.round(years * perYear)));
  if (archetype === 'prospecto') fights = Math.min(fights, randInt(rng, 3, 12));
  // Arriba de todo nadie llega con pocas peleas (como el jugador): UFC 10-18, PFL 10-20, Contender 8-14, Road to UFC 6-12.
  const EXP = { ufc: [10, 18], pfl: [10, 20], dwcs: [8, 14], rtu: [6, 12] }[level];
  if (EXP) fights = randInt(rng, EXP[0], EXP[1]);
  let winPct;
  switch (archetype) {
    case 'prospecto': winPct = 0.8 + rng() * 0.2; break;
    case 'veterano': winPct = 0.45 + rng() * 0.25; break;
    case 'relleno': winPct = tier < 2 ? 0.25 + rng() * 0.25 : 0.4 + rng() * 0.2; break;
    default: winPct = 0.6 + rng() * 0.25; // local favorito
  }
  if (tier >= ADVANCED_TIER) winPct = Math.max(winPct, 0.6 + rng() * 0.12);
  if (level === 'dwcs' || level === 'rtu' || level === 'pfl' || level === 'ufc') winPct = Math.max(winPct, 0.72 + rng() * 0.2);
  let w = Math.round(fights * winPct);
  let l = fights - w;
  const d = rng() < 0.12 ? 1 : 0;
  const maxL = EXP ? Math.min(3, Math.floor(fights / 5)) : 1;
  if (archetype === 'prospecto' && l > maxL) { w += l - maxL; l = maxL; }
  if (rng() < (EXP ? 0.08 : 0.25) && archetype === 'prospecto') { w += l; l = 0; } // invictos: raros arriba
  // En promotoras de nivel alto, siempre récord ganador (al menos 2 victorias más que derrotas).
  if (tier >= ADVANCED_TIER && w < l + 2) { const move = Math.ceil((l + 2 - w) / 2); w += move; l = Math.max(0, l - move); }
  return { w, l, d, record: `${w}-${l}-${d}` };
}

// ¿Este récord es creíble para ese nivel? (sirve para descartar rivales guardados de versiones viejas)
export function plausibleRecord(f) {
  const [w, l] = String(f.record).split('-').map(Number);
  const tier = f.tier ?? LEVEL_TIER[f.nivel] ?? 2;
  if (f.nivel === 'nacional') return w + l <= 12;
  if (tier >= ADVANCED_TIER || f.nivel !== 'regional') return w > l;
  return w >= l;
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

// Apariencia según el país: tono de piel (0 = muy claro … 5 = muy oscuro), color y tipo de pelo.
// Pesos aproximados de cada población; cada país apunta a un perfil.
const LOOKS = {
  nordico:     { piel: [45, 45, 8, 2, 0, 0], color: { negro: 6, castano: 30, castano_claro: 28, rubio: 28, pelirrojo: 6, gris: 2 } },
  europeo:     { piel: [25, 50, 17, 4, 3, 1], color: { negro: 14, castano: 44, castano_claro: 22, rubio: 14, pelirrojo: 4, gris: 2 } },
  britanico:   { piel: [30, 40, 10, 8, 7, 5], color: { negro: 18, castano: 38, castano_claro: 20, rubio: 14, pelirrojo: 8, gris: 2 } },
  irlandes:    { piel: [55, 38, 5, 2, 0, 0], color: { negro: 8, castano: 36, castano_claro: 24, rubio: 14, pelirrojo: 16, gris: 2 } },
  mediterraneo:{ piel: [6, 42, 42, 8, 2, 0], color: { negro: 50, castano: 40, castano_claro: 7, rubio: 2, gris: 1 } },
  este:        { piel: [30, 55, 13, 2, 0, 0], color: { negro: 12, castano: 46, castano_claro: 24, rubio: 15, pelirrojo: 2, gris: 1 } },
  caucaso:     { piel: [5, 45, 45, 5, 0, 0], color: { negro: 68, castano: 28, castano_claro: 3, gris: 1 } },
  asia_central:{ piel: [5, 45, 45, 5, 0, 0], color: { negro: 88, castano: 11, gris: 1 } },
  asia_este:   { piel: [10, 60, 28, 2, 0, 0], color: { negro: 92, castano: 7, gris: 1 } },
  asia_sur_este:{ piel: [0, 10, 45, 40, 5, 0], color: { negro: 95, castano: 4, gris: 1 } },
  asia_sur:    { piel: [0, 4, 30, 44, 20, 2], color: { negro: 95, castano: 4, gris: 1 } },
  arabe:       { piel: [3, 25, 52, 17, 3, 0], color: { negro: 84, castano: 15, gris: 1 } },
  africa:      { piel: [0, 0, 0, 6, 44, 50], color: { negro: 98, gris: 2 }, rizado: true },
  sudafrica:   { piel: [12, 6, 6, 14, 30, 32], color: { negro: 82, castano: 12, rubio: 4, gris: 2 } },
  rioplatense: { piel: [22, 50, 22, 5, 1, 0], color: { negro: 30, castano: 46, castano_claro: 14, rubio: 8, gris: 2 } },
  latino:      { piel: [4, 20, 46, 24, 5, 1], color: { negro: 66, castano: 30, castano_claro: 3, gris: 1 } },
  andino:      { piel: [0, 8, 40, 44, 8, 0], color: { negro: 88, castano: 11, gris: 1 } },
  brasil:      { piel: [12, 26, 22, 18, 14, 8], color: { negro: 52, castano: 38, castano_claro: 6, rubio: 3, gris: 1 } },
  caribe:      { piel: [3, 9, 18, 26, 26, 18], color: { negro: 88, castano: 11, gris: 1 }, rizado: true },
  eeuu:        { piel: [26, 30, 14, 10, 12, 8], color: { negro: 36, castano: 36, castano_claro: 14, rubio: 10, pelirrojo: 3, gris: 1 } },
  oceania:     { piel: [35, 35, 12, 10, 6, 2], color: { negro: 22, castano: 38, castano_claro: 20, rubio: 16, pelirrojo: 3, gris: 1 } },
};
const LOOK_OF = {
  SE: 'nordico', NO: 'nordico', DK: 'nordico', FI: 'nordico', IS: 'nordico', EE: 'nordico', LV: 'nordico', LT: 'nordico',
  GB: 'britanico', ENG: 'britanico', WAL: 'europeo', SCO: 'irlandes', NIR: 'irlandes', IE: 'irlandes',
  FR: 'britanico', BE: 'europeo', NL: 'europeo', DE: 'europeo', AT: 'europeo', CH: 'europeo',
  ES: 'mediterraneo', PT: 'mediterraneo', IT: 'mediterraneo', GR: 'mediterraneo', TR: 'mediterraneo', LB: 'mediterraneo',
  PL: 'este', CZ: 'este', SK: 'este', HU: 'este', RO: 'este', BG: 'este', RS: 'este', HR: 'este', BA: 'este', SI: 'este', ME: 'este',
  BY: 'este', UA: 'este', RU: 'este', MD: 'este',
  GE: 'caucaso', AM: 'caucaso', AZ: 'caucaso',
  KZ: 'asia_central', UZ: 'asia_central', TJ: 'asia_central', KG: 'asia_central', TM: 'asia_central', MN: 'asia_central', AF: 'asia_central',
  JP: 'asia_este', KR: 'asia_este', CN: 'asia_este', TW: 'asia_este', SG: 'asia_este',
  VN: 'asia_sur_este', TH: 'asia_sur_este', MM: 'asia_sur_este', MY: 'asia_sur_este', ID: 'asia_sur_este', PH: 'asia_sur_este',
  IN: 'asia_sur',
  MA: 'arabe', EG: 'arabe', IQ: 'arabe', IR: 'arabe', AE: 'arabe', SA: 'arabe', QA: 'arabe', KW: 'arabe', BH: 'arabe', OM: 'arabe', JO: 'arabe',
  SN: 'africa', GH: 'africa', NG: 'africa', CM: 'africa', CD: 'africa', UG: 'africa', AO: 'africa', ZA: 'sudafrica',
  AR: 'rioplatense', UY: 'rioplatense', CL: 'latino', PY: 'latino', CR: 'latino', MX: 'latino', CO: 'latino', VE: 'latino', SV: 'latino', HN: 'latino', NI: 'latino', PA: 'caribe',
  GT: 'andino', PE: 'andino', BO: 'andino', EC: 'andino',
  BR: 'brasil', CU: 'caribe', DO: 'caribe', PR: 'latino',
  US: 'eeuu', CA: 'eeuu', AU: 'oceania', NZ: 'oceania',
};
export const lookOf = country => LOOKS[LOOK_OF[country]] || LOOKS.europeo;

function weighted(rng, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
}

export function randomFace(rng, country) {
  const look = lookOf(country);
  const piel = Number(weighted(rng, look.piel.map((w, i) => [i, w])));
  const styles = look.rizado
    ? [['rapado', 4], ['corto', 3], ['calvo', 2], ['rizado', 4], ['fade', 3], ['mohicano', 1], ['rastas', 1]]
    : [['rapado', 3], ['corto', 4], ['fade', 3], ['medio', 2], ['calvo', 2], ['rizado', 1], ['mohicano', 1], ['largo', 1]];
  return {
    piel,
    pelo: weighted(rng, styles),
    colorPelo: weighted(rng, Object.entries(look.color)),
    barba: pick(rng, ['ninguna', 'sombra', 'corta', 'completa', 'candado', 'bigote']),
    cejas: pick(rng, ['finas', 'normales', 'gruesas']),
    cabeza: pick(rng, ['redonda', 'cuadrada', 'ovalada', 'ancha']),
  };
}

const HEIGHT_BY_DIV = { mosca: 165, gallo: 170, pluma: 173, ligero: 177, welter: 181, medio: 185, semipesado: 189, pesado: 193 };

// Crea un rival genérico.
// Estrellas de los rivales según el nivel de la organización (1.5 = Samurai ... 3.5 = ONE).
export const orgStars = nivel => [Math.min(3.4, 0.6 * nivel + 0.5), Math.min(3.8, 0.6 * nivel + 1.5)];

export function generateFighter(rng, { namesDb, country, division, level, archetype, idPrefix = 'g', starsRange = null, tier = null }) {
  tier = tier ?? LEVEL_TIER[level] ?? 2;
  archetype = archetype || pick(rng, level === 'nacional' ? ['prospecto', 'veterano', 'relleno', 'relleno', 'local', 'local'] : ['prospecto', 'veterano', 'relleno', 'local', 'prospecto']);
  let age;
  switch (archetype) {
    case 'prospecto': age = level === 'ufc' || level === 'pfl' ? randInt(rng, 23, 30) : level === 'dwcs' ? randInt(rng, 22, 28) : randInt(rng, 19, 25); break;
    case 'veterano': age = randInt(rng, 31, 40); break;
    case 'relleno': age = randInt(rng, 24, 38); break;
    default: age = randInt(rng, 22, 33);
  }
  const rec = makeRecord(rng, age, archetype, level, tier);
  const [lo, hi] = starsRange || LEVEL_STARS[level] || [1.5, 3];
  const archShift = { prospecto: 0.15, veterano: 0, relleno: -0.35, local: 0.1 }[archetype];
  const targetStars = clamp(lo + (hi - lo) * rng() + archShift, lo, hi);
  const style = pick(rng, STYLES);
  const names = namesFor(namesDb, country);
  const nombre = randomName(rng, names);
  const h = HEIGHT_BY_DIV[division] + Math.round(gauss(rng) * 4);
  const reach = h + Math.round(gauss(rng) * 4);
  const streak = archetype === 'relleno' ? -randInt(rng, 0, 3) : archetype === 'prospecto' ? randInt(rng, 1, Math.max(1, rec.w)) : randInt(rng, -2, 3);
  return {
    id: `${idPrefix}-${Math.floor(rng() * 1e9).toString(36)}`,
    generico: true, arquetipo: archetype, nivel: level, tier,
    nombre, apodo: null, pais: country, edad: age, division,
    altura: h, alcance: reach, postura: rng() < 0.2 ? 'zurda' : 'ortodoxa', estilo: style,
    record: rec.record, racha: Math.min(streak, rec.w), ranking: null,
    atributos: makeAttributes(rng, { targetStars, style, age, archetype }),
    cara: randomFace(rng, country), fuente: 'generado',
  };
}
