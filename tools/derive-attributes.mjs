// Rellena los atributos de los peleadores con "fuente": "calculado" y atributos null
// (o todos con --force) usando ranking, récord, racha, estilo y ajustes de perfil.
// Uso: node tools/derive-attributes.mjs [--force]
import { readFileSync, writeFileSync } from 'node:fs';
import { deriveAttributes, stars, overall } from '../js/ratings.js';

const path = new URL('../data/fighters.json', import.meta.url);
const db = JSON.parse(readFileSync(path, 'utf8'));
const force = process.argv.includes('--force');
for (const f of db.peleadores) {
  if (f.fuente !== 'calculado' || (f.atributos && !force)) continue;
  f.atributos = deriveAttributes({
    ranking: f.ranking, record: f.record, streak: f.racha,
    style: f.estilo, age: f.edad, ajustes: f.ajustesPerfil,
  });
  f.estrellas = stars(f.atributos);
  console.log(f.nombre.padEnd(20), f.estrellas, overall(f.atributos).toFixed(1), JSON.stringify(f.atributos));
}
writeFileSync(path, JSON.stringify(db, null, 2) + '\n');
