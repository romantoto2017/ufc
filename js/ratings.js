// Valoraciones: atributos 0-100 -> estrellas 0,5..5 (medias estrellas).
// Módulo puro: se usa en el navegador y en los tests de Node.

export const ATTRS = ['golpeo', 'patadas', 'grappling', 'sumisiones', 'defensa', 'cardio', 'menton', 'velocidad'];

const WEIGHTS = {
  golpeo: 0.16, patadas: 0.11, grappling: 0.14, sumisiones: 0.09,
  defensa: 0.15, cardio: 0.12, menton: 0.11, velocidad: 0.12,
};

export const STYLES = ['boxeo', 'kickboxing', 'muay_thai', 'bjj', 'lucha_libre'];

// Desplazamientos de atributos por estilo (suman ~0 ponderado).
export const STYLE_PROFILE = {
  boxeo:       { golpeo: 10, patadas: -10, grappling: -4, sumisiones: -6, defensa: 4, cardio: 0, menton: 2, velocidad: 4 },
  kickboxing:  { golpeo: 6, patadas: 10, grappling: -7, sumisiones: -8, defensa: 2, cardio: 0, menton: 0, velocidad: 3 },
  muay_thai:   { golpeo: 4, patadas: 12, grappling: -2, sumisiones: -8, defensa: 0, cardio: 2, menton: 3, velocidad: -1 },
  bjj:         { golpeo: -6, patadas: -8, grappling: 6, sumisiones: 16, defensa: 1, cardio: 1, menton: -1, velocidad: -2 },
  lucha_libre: { golpeo: -4, patadas: -10, grappling: 16, sumisiones: 2, defensa: 2, cardio: 5, menton: 1, velocidad: -1 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function overall(attrs) {
  let s = 0;
  for (const k of ATTRS) s += (attrs[k] ?? 50) * WEIGHTS[k];
  return s;
}

// Valor continuo, útil para la simulación.
export function starsExact(attrs) {
  return clamp(0.5 + (overall(attrs) - 30) * 4.5 / 62, 0.5, 5);
}

export function stars(attrs) {
  return Math.round(starsExact(attrs) * 2) / 2;
}

// Overall objetivo para un peleador UFC según ranking (0 = campeón, null = no rankeado).
export function targetOverallFromRanking(ranking) {
  if (ranking === 0) return 88;
  if (ranking == null) return 67;
  return 85.5 - (ranking - 1) * (85.5 - 72) / 14;
}

function parseRecord(rec) {
  const [w, l, d] = String(rec).split('-').map(n => parseInt(n, 10) || 0);
  return { w, l, d };
}

// Calcula atributos a partir de ranking, récord, racha y estilo.
// `ajustes` son correcciones opcionales por perfil verificado (p. ej. récord de sumisiones).
export function deriveAttributes({ ranking, record, streak, style, age, ajustes = {} }) {
  const { w, l } = parseRecord(record);
  let target = targetOverallFromRanking(ranking);
  if (streak > 0) target += Math.min(streak * 0.6, 2.4);
  if (streak < 0) target += Math.max(streak * 1.0, -3);
  const winPct = w + l > 0 ? w / (w + l) : 0.5;
  target += (winPct - 0.8) * 6;

  const prof = STYLE_PROFILE[style] || {};
  const raw = {};
  for (const k of ATTRS) raw[k] = target + (prof[k] || 0) + (ajustes[k] || 0);
  // Edad: los veteranos pierden velocidad y cardio; ganan algo de defensa por experiencia.
  if (age > 33) { raw.velocidad -= (age - 33) * 1.5; raw.cardio -= (age - 33) * 1.0; raw.defensa += 1; }
  // Re-escalar para que el overall final coincida con el objetivo (respetando el tope 97).
  let out = { ...raw };
  for (let i = 0; i < 6; i++) {
    const shift = target - overall(out);
    for (const k of ATTRS) out[k] = clamp(out[k] + shift, 20, 97);
  }
  for (const k of ATTRS) out[k] = Math.round(out[k]);
  return out;
}

// Actualización de atributos tras una pelea (sube el ganador, baja el perdedor, edad).
export function progressAfterFight(attrs, { won, expected, age }) {
  const k = 3.2;
  const delta = won ? k * (1 - expected) : -k * expected;
  const out = { ...attrs };
  for (const a of ATTRS) out[a] = clamp(Math.round((out[a] + delta * (a === 'menton' && !won ? 1.4 : 1)) * 10) / 10, 20, 99);
  if (age >= 34) {
    const decay = (age - 33) * 0.6;
    out.velocidad = clamp(out.velocidad - decay, 20, 99);
    out.cardio = clamp(out.cardio - decay * 0.8, 20, 99);
    out.menton = clamp(out.menton - decay * 0.5, 20, 99);
  }
  return out;
}
