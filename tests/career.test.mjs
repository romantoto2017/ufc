import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPlayer, newCareer, makeOffer, applyCareerFight, acceptContract, train, opponentOf, rankingTable, relink, setNames } from '../js/career/career.js';
import { generateFighter } from '../js/career/generator.js';
import { simulateFight } from '../js/sim.js';
import { stars } from '../js/ratings.js';
import { seeded } from './rng.mjs';

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const promos = load('../data/promotions.json');
const names = load('../data/names.json');
const fighters = load('../data/fighters.json').peleadores;
const ctx = { promos, names };
setNames(names);

test('rivales genéricos coherentes con edad, récord y nivel', () => {
  const rng = seeded(3);
  for (let i = 0; i < 300; i++) {
    const level = ['nacional', 'regional', 'dwcs'][i % 3];
    const f = generateFighter(rng, { namesDb: names, country: 'AR', division: 'ligero', level });
    const [w, l] = f.record.split('-').map(Number);
    assert.ok(f.edad >= 19 && f.edad <= 40);
    assert.ok(w + l <= (f.edad - 17) * 4 + 2, `${f.edad} ${f.record}`);
    const s = stars(f.atributos);
    const range = { nacional: [1, 2.5], regional: [1.5, 3], dwcs: [3, 3.5] }[level];
    assert.ok(s >= range[0] - 0.5 && s <= range[1] + 0.5, `${level} ${s}`);
    if (f.arquetipo === 'prospecto') assert.ok(f.edad <= 25 && l <= 1);
    if (f.arquetipo === 'veterano') { assert.ok(f.edad >= 31); assert.ok(f.atributos.menton > f.atributos.velocidad); }
    assert.ok(names.AR.nombres.includes(f.nombre.split(' ')[0]));
  }
});

test('las primeras 3 peleas del circuito nacional son contra compatriotas', () => {
  const p = createPlayer({ nombre: 'Test', pais: 'AR', edad: 22, division: 'ligero', altura: 176, alcance: 180, estilo: 'boxeo', postura: 'ortodoxa', cara: {} });
  assert.equal(stars(p.atributos), 2);
  const c = newCareer({ player: p, promos, fighters, seed: 11 });
  for (let i = 0; i < 3; i++) {
    makeOffer(c, ctx);
    assert.equal(opponentOf(c).pais, 'AR');
    applyCareerFight(c, ctx, { winnerId: 'player', loserId: c.offer.opponentId, method: 'dec_unanimous', round: 3, time: 300 });
  }
});

test('carrera completa simulada: llega a UFC y el mundo UFC cambia', () => {
  const p = createPlayer({ nombre: 'Test', pais: 'US', edad: 21, division: 'welter', altura: 183, alcance: 188, estilo: 'lucha_libre', postura: 'ortodoxa', cara: {} });
  let c = newCareer({ player: p, promos, fighters, seed: 5 });
  const champBefore = rankingTable(c, 'welter')[0].nombre;
  const rng = seeded(9);
  const stagesSeen = new Set();
  for (let i = 0; i < 80 && c.stage !== 'ufc'; i++) {
    if (c.pendingContract) acceptContract(c);
    stagesSeen.add(c.stage);
    makeOffer(c, ctx);
    while (train(c, ['boxeo', 'lucha', 'cardio', 'defensa', 'fuerza', 'velocidad', 'bjj', 'patadas'][Math.floor(rng() * 8)]).ok);
    const opp = opponentOf(c);
    const r = simulateFight(c.player, opp, { rounds: c.offer.rounds, rng });
    applyCareerFight(c, ctx, r);
    c = relink(JSON.parse(JSON.stringify(c))); // guardar/cargar en cada pelea
  }
  if (c.pendingContract) acceptContract(c);
  console.log('etapas', [...stagesSeen], 'final', c.stage, 'récord', c.player.record, 'estrellas', stars(c.player.atributos), 'fecha', c.date, 'edad', c.player.edad);
  assert.ok(stagesSeen.has('nacional') && stagesSeen.has('regional'));
  assert.equal(c.stage, 'ufc');
  assert.ok(stars(c.player.atributos) > 2);
  assert.ok(c.ufc.some(f => f.id === 'player'));
  const changed = c.ufc.filter(f => f.id !== 'player').some(f => { const o = fighters.find(x => x.id === f.id); return o && o.record !== f.record; });
  assert.ok(changed, 'el mundo UFC simuló peleas');
  console.log('campeón welter antes/después:', champBefore, '/', rankingTable(c, 'welter')[0]?.nombre);
});

test('realismo: ~1-2 peleas por año, máx. 3 en 12 meses, retiro antes de los 41, máx. 4 vs el mismo', () => {
  const p = createPlayer({ nombre: 'Test', pais: 'BR', edad: 22, division: 'ligero', altura: 176, alcance: 180, estilo: 'muay_thai', postura: 'ortodoxa', cara: {} });
  const c = newCareer({ player: p, promos, fighters, seed: 21 });
  const rng = seeded(4);
  for (let i = 0; i < 120 && !c.retired; i++) {
    if (c.pendingContract) acceptContract(c);
    makeOffer(c, ctx);
    while (train(c, 'boxeo').ok);
    applyCareerFight(c, ctx, simulateFight(c.player, opponentOf(c), { rounds: c.offer.rounds, rng }));
  }
  assert.ok(c.retired, 'se retira');
  assert.ok(c.player.edad <= 40);
  const dates = c.player.historial.map(h => h.fecha).sort();
  for (let i = 3; i < dates.length; i++) assert.ok((new Date(dates[i]) - new Date(dates[i - 3])) / 864e5 > 365, 'máximo 3 peleas en 12 meses');
  const years = (new Date(c.date) - new Date('2026-10-13')) / 3.156e10;
  const perYear = c.player.historial.length / years;
  assert.ok(perYear > 0.9 && perYear < 2.2, `peleas/año ${perYear}`);
  assert.ok(Math.max(...Object.values(c.vs)) <= 4);
  assert.ok(!c.ufc.some(f => f.id === 'joshua-van' && f.edad > 41), 'los veteranos se retiran');
});
