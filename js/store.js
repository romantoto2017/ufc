// Carga de datos JSON y configuración persistente (localStorage sobre data/settings.json).
import { stars } from './ratings.js';

const KEY = 'pixelmma.settings.v1';
export const state = { settings: null, defaults: null, fighters: [], divisions: [], promotions: [] };

async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function loadAll() {
  const [defaults, fdb, pdb] = await Promise.all([
    getJSON('data/settings.json'), getJSON('data/fighters.json'), getJSON('data/promotions.json'),
  ]);
  state.defaults = defaults;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { saved = {}; }
  state.settings = { ...defaults, ...saved };
  state.divisions = fdb.divisiones;
  // Las estrellas siempre se recalculan desde los atributos.
  state.fighters = fdb.peleadores.filter(f => f.atributos).map(f => ({ ...f, estrellas: stars(f.atributos) }));
  state.promotions = pdb.promociones;
  return state;
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(state.settings)); } catch { /* almacenamiento no disponible */ }
}

export function resetSettings() {
  state.settings = { ...state.defaults };
  saveSettings();
}

export function fightersIn(divisionId) {
  return state.fighters.filter(f => f.division === divisionId)
    .sort((a, b) => (a.ranking ?? 99) - (b.ranking ?? 99));
}
