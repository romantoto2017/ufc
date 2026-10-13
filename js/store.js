// Carga de datos JSON y configuración persistente (localStorage sobre data/settings.json).
import { stars } from './ratings.js';

const KEY = 'pixelmma.settings.v1';
export const state = { settings: null, defaults: null, fighters: [], divisions: [], promotions: [], promotionsDb: null, names: null };

async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function loadAll() {
  const [defaults, fdb, pdb, names] = await Promise.all([
    getJSON('data/settings.json'), getJSON('data/fighters.json'), getJSON('data/promotions.json'), getJSON('data/names.json'),
  ]);
  state.names = names;
  state.defaults = defaults;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { saved = {}; }
  state.settings = { ...defaults, ...saved };
  state.divisions = fdb.divisiones;
  // Las estrellas siempre se recalculan desde los atributos.
  state.fighters = fdb.peleadores.filter(f => f.atributos).map(f => ({ ...f, estrellas: stars(f.atributos) }));
  state.promotions = pdb.promociones;
  state.promotionsDb = pdb;
  return state;
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(state.settings)); } catch { /* almacenamiento no disponible */ }
}

export function resetSettings() {
  state.settings = { ...state.defaults };
  saveSettings();
}

// Peleadores de una división (incluye a los rankeados también en otra, p. ej. Pereira en pesado).
export function fightersIn(divisionId) {
  const rankIn = f => (f.division === divisionId ? f.ranking : f.otrasDivisiones?.[divisionId]) ?? 99;
  return state.fighters.filter(f => f.division === divisionId || f.otrasDivisiones?.[divisionId] != null)
    .sort((a, b) => rankIn(a) - rankIn(b) || stars(b.atributos) - stars(a.atributos));
}
