// Diagnóstico de equilibrio: IA vs IA sin dibujo. Uso: node tools/balance.mjs [segundosRound] [N]
import { seeded } from '../tests/rng.mjs';
import { Fight } from '../js/fight/engine.js';
import { AI } from '../js/fight/ai.js';
import { deriveAttributes } from '../js/ratings.js';
const secs = +process.argv[2] || 300, N = +process.argv[3] || 40;
const mk = (id, ranking, style) => ({ id, estilo: style, edad: 29, atributos: deriveAttributes({ ranking, record: '12-3-0', streak: 0, style, age: 29 }) });
function run(a, b, seed) {
  const fight = new Fight(a, b, { rounds: 3, roundSeconds: secs, rng: seeded(seed) });
  fight.betweenSeconds = 0.1;
  const ais = [new AI(fight, 0, 'normal'), new AI(fight, 1, 'normal')];
  while (fight.phase !== 'over') { ais[0].update(1/60); ais[1].update(1/60); fight.update(1/60); fight.drainEvents(); }
  return fight;
}
for (const [a, b] of [[mk('A', 5, 'boxeo'), mk('B', 5, 'muay_thai')], [mk('A', 0, 'lucha_libre'), mk('B', 15, 'kickboxing')], [mk('A', 3, 'bjj'), mk('B', 3, 'boxeo')]]) {
  let aw = 0; const m = {}; let rsum = 0, thrown = 0, landed = 0, td = 0;
  for (let i = 0; i < N; i++) {
    const f = run(a, b, 1000 + i); const r = f.result;
    if (r.winnerId === 'A') aw++; m[r.method] = (m[r.method] || 0) + 1;
    rsum += (r.round - 1) * secs + r.time;
    thrown += r.stats[0].thrown + r.stats[1].thrown; landed += r.stats[0].landed + r.stats[1].landed; td += r.stats[0].tdLanded + r.stats[1].tdLanded;
  }
  console.log(`${a.estilo}(${a.atributos.golpeo}) vs ${b.estilo}: A gana ${aw}/${N}`, m, 'dur media', (rsum / N).toFixed(0) + 's', 'golpes/min', (thrown / (rsum / 60)).toFixed(0), 'acierto', (landed / thrown * 100).toFixed(0) + '%', 'TD/pelea', (td / N).toFixed(1));
}
