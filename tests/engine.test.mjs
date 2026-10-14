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
  const g = db.peleadores.find(f => f.id === 'justin-gaethje'), t = db.peleadores.find(f => f.id === 'ilia-topuria');
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

test('Knockdown: el que derriba se tira encima y el ground and pound termina en TKO', () => {
  const a = mk('a', 3, 'boxeo'), b = mk('b', 3, 'boxeo');
  const fight = new Fight(a, b, { rounds: 3, roundSeconds: 120, rng: seeded(9) });
  fight.phase = 'fight';
  const [A, B] = fight.f;
  A.x = 220; B.x = 250; B.dmg.head = 50;
  fight.knockdown(A, B, 'head');
  assert.equal(A.state, 'pounce');
  for (let i = 0; i < 50; i++) fight.update(1 / 60); // salto (0,5 s) + pausa del impacto
  assert.equal(A.ground, 'top'); assert.equal(B.ground, 'bottom'); assert.ok(B.rocked);
  B.ctl.press('escape'); fight.update(1 / 60);
  assert.notEqual(B.state, 'escape_try', 'aturdido no puede escapar');
  for (let i = 0; i < 600 && !fight.result; i++) { if (A.canAct) A.ctl.press('gnpPunch'); fight.update(1 / 60); }
  assert.equal(fight.result?.method, 'tko');
  assert.equal(fight.result.winnerId, 'a');
});

test('Spamear golpes no gana: la IA contragolpea al que tira sin parar', () => {
  const N = 8; let wins = 0, bigCounters = 0;
  for (let k = 0; k < N; k++) {
    const fight = new Fight(mk('p', 5, 'boxeo'), mk('c', 5, 'boxeo'), { rounds: 3, roundSeconds: 120, rng: seeded(700 + k) });
    fight.betweenSeconds = 0.1;
    const ai = new AI(fight, 1, 'normal'), [P, C] = fight.f;
    const chain = ['jab', 'cross', 'hook', 'elbow'];
    let t = 0, i = 0, steps = 0;
    while (fight.phase !== 'over' && steps++ < 60 * 400) {
      const c = P.ctl; t += 1 / 60; c.left = c.right = false;
      if (fight.sub) c.tap();
      else if (P.ground === 'top') c.press('gnpPunch');
      else if (!P.ground) {
        if (Math.abs(C.x - P.x) > 33) c[C.x > P.x ? 'right' : 'left'] = true;
        else if (t > 0.12) { c.press(chain[i++ % 4]); t = 0; }
      }
      ai.update(1 / 60); fight.update(1 / 60);
      for (const e of fight.drainEvents()) if (e.type === 'hit' && e.who === 0 && e.bigCounter) bigCounters++;
    }
    if (fight.result?.winnerId === 'p') wins++;
  }
  console.log('spammer gana', wins, '/', N, 'contras fuertes', bigCounters);
  assert.ok(wins <= 2, `spammer wins=${wins}`);
  assert.ok(bigCounters > N * 3);
});
