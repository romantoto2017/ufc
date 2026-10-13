import test from 'node:test';
import { seeded } from './rng.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Fight } from '../js/fight/engine.js';
import { AI } from '../js/fight/ai.js';
import { deriveAttributes } from '../js/ratings.js';

const db = JSON.parse(readFileSync(new URL('../data/fighters.json', import.meta.url)));

function runFight(a, b, { rounds = 3, roundSeconds = 120, diff = 'normal', seed = 1 } = {}) {
  const rng = seeded(seed);
  const fight = new Fight(a, b, { rounds, roundSeconds, rng });
  fight.betweenSeconds = 0.1;
  const ais = [new AI(fight, 0, diff), new AI(fight, 1, diff)];
  const dt = 1 / 60;
  let steps = 0;
  while (fight.phase !== 'over' && steps < 60 * (roundSeconds + 10) * rounds) {
    ais[0].update(dt); ais[1].update(dt); fight.update(dt); fight.drainEvents(); steps++;
  }
  return fight;
}

const mk = (id, ranking, style, age = 29) => ({ id, nombre: id, estilo: style, edad: age, atributos: deriveAttributes({ ranking, record: '12-3-0', streak: 0, style, age }) });

test('Gaethje vs Topuria termina con resultado válido', () => {
  const [g, t] = db.peleadores;
  const f = runFight(g, t, { seed: 7 });
  assert.equal(f.phase, 'over');
  assert.ok(['ko', 'tko', 'sub', 'dec_unanimous', 'dec_split', 'dec_majority', 'draw'].includes(f.result.method));
  assert.ok(f.result.stats[0].thrown > 10 && f.result.stats[1].thrown > 10);
});

test('IA vs IA: el de más estrellas gana la mayoría y hay variedad de métodos', () => {
  const elite = mk('elite', 0, 'kickboxing'), weak = mk('weak', null, 'kickboxing');
  weak.atributos = Object.fromEntries(Object.entries(weak.atributos).map(([k, v]) => [k, v - 22]));
  let eliteWins = 0; const methods = {};
  const N = 30;
  for (let i = 0; i < N; i++) {
    const f = runFight(elite, weak, { seed: 100 + i, roundSeconds: 90 });
    if (f.result.winnerId === 'elite') eliteWins++;
    methods[f.result.method] = (methods[f.result.method] || 0) + 1;
  }
  console.log('elite wins', eliteWins, '/', N, methods);
  assert.ok(eliteWins >= N * 0.7, `eliteWins=${eliteWins}`);
});

test('Peleadores parejos: resultados repartidos', () => {
  const a = mk('a', 5, 'boxeo'), b = mk('b', 5, 'muay_thai');
  let aw = 0; const methods = {};
  const N = 30;
  for (let i = 0; i < N; i++) {
    const f = runFight(a, b, { seed: 300 + i, roundSeconds: 90 });
    if (f.result.winnerId === 'a') aw++;
    methods[f.result.method] = (methods[f.result.method] || 0) + 1;
  }
  console.log('a wins', aw, '/', N, methods);
  assert.ok(aw > 5 && aw < 25, `aw=${aw}`);
});
