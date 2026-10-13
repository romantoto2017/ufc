// Definición de golpes. Tiempos en segundos, alcance en píxeles del mundo.
// kd = multiplicador de poder de derribo/KO (solo golpes a la cabeza).

export const BASE_MOVES = {
  jab:      { key: 'jab',      type: 'punch', zone: 'head', dmg: 3,   stam: 2.5, startup: 0.09, active: 0.06, recovery: 0.14, range: 35, kd: 0.25, pose: 'jab' },
  cross:    { key: 'cross',    type: 'punch', zone: 'head', dmg: 6.5, stam: 4.5, startup: 0.15, active: 0.07, recovery: 0.22, range: 37, kd: 0.65, pose: 'cross' },
  hook:     { key: 'hook',     type: 'punch', zone: 'head', dmg: 8,   stam: 5.5, startup: 0.19, active: 0.07, recovery: 0.28, range: 30, kd: 1.0,  pose: 'hook' },
  lowKick:  { key: 'lowKick',  type: 'kick',  zone: 'legs', dmg: 6,   stam: 5,   startup: 0.20, active: 0.08, recovery: 0.28, range: 39, kd: 0,    pose: 'lowKick' },
  bodyKick: { key: 'bodyKick', type: 'kick',  zone: 'body', dmg: 8.5, stam: 7.5, startup: 0.26, active: 0.08, recovery: 0.34, range: 41, kd: 0,    pose: 'bodyKick' },
  highKick: { key: 'highKick', type: 'kick',  zone: 'head', dmg: 15,  stam: 12,  startup: 0.36, active: 0.09, recovery: 0.46, range: 43, kd: 1.6,  pose: 'highKick' },
  takedown: { key: 'takedown', type: 'grapple', zone: null, dmg: 0,   stam: 12,  startup: 0.28, active: 0.12, recovery: 0.6,  range: 33, kd: 0,    pose: 'shoot', tdBonus: 0 },
};

// Golpes en el suelo.
export const GROUND_MOVES = {
  gnpPunch: { key: 'gnpPunch', type: 'punch', zone: 'head', dmg: 4.5, stam: 3,  startup: 0.12, active: 0.06, recovery: 0.2,  kd: 0, pose: 'gnp' },
  gnpElbow: { key: 'gnpElbow', type: 'punch', zone: 'head', dmg: 7,   stam: 5,  startup: 0.2,  active: 0.06, recovery: 0.3,  kd: 0, pose: 'gnp' },
  upStrike: { key: 'upStrike', type: 'punch', zone: 'head', dmg: 2,   stam: 2,  startup: 0.12, active: 0.06, recovery: 0.2,  kd: 0, pose: 'gnp' },
};

// Variantes por estilo: cambian nombre (nameKey), estadísticas y, a veces, la pose.
const STYLE_VARIANTS = {
  boxeo: {
    jab: { dmg: 1.08, startup: 0.88 }, cross: { dmg: 1.08, startup: 0.92 },
    hook: { dmg: 1.1, kd: 1.1 },
    lowKick: { dmg: 0.8, stam: 1.15, startup: 1.1 }, bodyKick: { dmg: 0.8, stam: 1.15, startup: 1.1 }, highKick: { dmg: 0.8, stam: 1.15, startup: 1.1 },
    takedown: { tdBonus: -0.08 },
  },
  kickboxing: {
    lowKick: { dmg: 1.1, startup: 0.88 }, bodyKick: { startup: 0.88 },
    highKick: { nameKey: 'move_spinKick', dmg: 1.15, startup: 1.05, spin: true },
    takedown: { tdBonus: -0.05 },
  },
  muay_thai: {
    hook: { nameKey: 'move_elbow', dmg: 1.15, range: 0.8, kd: 1.15, pose: 'elbow' },
    lowKick: { dmg: 1.25 }, bodyKick: { dmg: 1.25 }, highKick: { dmg: 1.05 },
  },
  bjj: {
    jab: { dmg: 0.9 }, cross: { dmg: 0.9 }, hook: { dmg: 0.9 },
    takedown: { nameKey: 'move_singleLeg', tdBonus: 0.05 },
  },
  lucha_libre: {
    lowKick: { dmg: 0.85 }, bodyKick: { dmg: 0.85 }, highKick: { dmg: 0.85 },
    takedown: { nameKey: 'move_doubleLeg', tdBonus: 0.1, startup: 0.9 },
  },
};

const MULT_FIELDS = ['dmg', 'stam', 'startup', 'active', 'recovery', 'range', 'kd'];

export function movesForStyle(style) {
  const out = {};
  const variants = STYLE_VARIANTS[style] || {};
  for (const [k, base] of Object.entries(BASE_MOVES)) {
    const m = { ...base, nameKey: 'move_' + k };
    const v = variants[k];
    if (v) {
      for (const [f, val] of Object.entries(v)) {
        if (MULT_FIELDS.includes(f)) m[f] = base[f] * val;
        else m[f] = val;
      }
    }
    out[k] = m;
  }
  for (const [k, base] of Object.entries(GROUND_MOVES)) out[k] = { ...base, nameKey: 'move_' + k };
  if (style === 'lucha_libre') { out.gnpPunch.dmg *= 1.2; out.gnpElbow.dmg *= 1.2; }
  return out;
}

export const STANDING_ACTIONS = ['jab', 'cross', 'hook', 'lowKick', 'bodyKick', 'highKick', 'takedown'];
