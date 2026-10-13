import test from 'node:test';
import { seeded } from './rng.mjs';
import assert from 'node:assert/strict';
import { deriveAttributes, stars } from '../js/ratings.js';
import { winProbability, simulateFight, applyResult, MAX_FAVORITE } from '../js/sim.js';

const mk = (id, ranking, style = 'boxeo', extra = {}) => ({
  id, division: 'ligero', ranking, edad: 29, alcance: 180, estilo: style, record: '15-3-0', racha: 0,
  atributos: deriveAttributes({ ranking, record: '15-3-0', streak: 0, style, age: 29 }), ...extra,
});


test('campeón vs #15 gana ~85-90%', () => {
  const p = winProbability(mk('c', 0), mk('r15', 15));
  assert.ok(p >= 0.84 && p <= 0.91, `p=${p}`);
});

test('peleadores parejos ~50%', () => {
  const p = winProbability(mk('a', 5), mk('b', 5));
  assert.ok(Math.abs(p - 0.5) < 0.02, `p=${p}`);
});

test('el favorito nunca supera el 92%', () => {
  const elite = mk('e', 0), weak = { ...mk('w', null), atributos: deriveAttributes({ ranking: null, record: '3-9-0', streak: -5, style: 'bjj', age: 39 }) };
  weak.atributos = Object.fromEntries(Object.keys(weak.atributos).map(k => [k, 25]));
  assert.ok(winProbability(elite, weak) <= MAX_FAVORITE + 1e-9);
  assert.ok(winProbability(weak, elite) >= 1 - MAX_FAVORITE - 1e-9);
});

test('luchador castiga a striker sin defensa de derribo', () => {
  const wrestler = mk('w', 5, 'lucha_libre'), striker = mk('s', 5, 'kickboxing');
  assert.ok(winProbability(wrestler, striker) > 0.52);
});

test('simulación: frecuencias y métodos razonables', () => {
  const rng = seeded(42);
  const a = mk('c', 0), b = mk('r15', 15);
  let wins = 0; const methods = {};
  for (let i = 0; i < 4000; i++) {
    const r = simulateFight(a, b, { rounds: 5, rng });
    if (r.winnerId === 'c') wins++;
    methods[r.method] = (methods[r.method] || 0) + 1;
    assert.ok(r.round >= 1 && r.round <= 5 && r.time > 0 && r.time <= 300);
  }
  const pct = wins / 4000;
  assert.ok(pct > 0.82 && pct < 0.92, `pct=${pct}`);
  for (const m of ['ko', 'tko', 'sub', 'dec_unanimous', 'dec_split']) assert.ok(methods[m] > 0, m);
});

test('applyResult: récord, racha, ranking y título', () => {
  const champ = mk('c', 0), r3 = mk('r3', 3), r1 = mk('r1', 1), r2 = mk('r2', 2);
  champ.racha = 4; const fighters = [champ, r1, r2, r3];
  const before = stars(r3.atributos);
  applyResult(fighters, { winnerId: 'r3', loserId: 'c' });
  assert.equal(r3.ranking, 0); assert.equal(champ.ranking, 1);
  assert.equal(r3.record, '16-3-0'); assert.equal(champ.record, '15-4-0');
  assert.equal(r3.racha, 1); assert.equal(champ.racha, -1);
  assert.ok(stars(r3.atributos) >= before);
  assert.deepEqual(fighters.map(f => f.ranking).sort(), [0, 1, 2, 3]);
});
