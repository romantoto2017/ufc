// Habilidades especiales del modo carrera.
// Se pagan con puntos que solo se ganan peleando (ver career.js) y piden atributos mínimos:
// en una carrera normal alcanzan para 4 a 7 de las 18, así que hay que elegir.
// tier: 1 común, 2 avanzada, 3 legendaria (además pide 4 estrellas).
// sim: peso en la simulación (unidades del logit de sim.js; 1 estrella = 1,45).
// Los efectos en la pelea jugada están en moves.js (golpes) y engine.js (reglas).
export const TECHNIQUES = {
  // ---- Golpeo ----
  elbow:          { tier: 1, cost: 6,  req: { golpeo: 60 },                 nameKey: 'tech_elbow',          sim: 0.05 },
  checkKick:      { tier: 1, cost: 6,  req: { defensa: 60 },                nameKey: 'tech_checkKick',      sim: 0.05 },
  bodySnatcher:   { tier: 1, cost: 8,  req: { patadas: 65 },                nameKey: 'tech_bodySnatcher',   sim: 0.06 },
  legKiller:      { tier: 1, cost: 10, req: { patadas: 70 },                nameKey: 'tech_legKiller',      sim: 0.07 },
  spinKick:       { tier: 2, cost: 10, req: { patadas: 74 },                nameKey: 'tech_spinKick',       sim: 0.06 },
  heavyHands:     { tier: 2, cost: 14, req: { golpeo: 78 },                 nameKey: 'tech_heavyHands',     sim: 0.1 },
  headMovement:   { tier: 2, cost: 14, req: { defensa: 76, velocidad: 70 }, nameKey: 'tech_headMovement',   sim: 0.1 },
  counterPuncher: { tier: 2, cost: 16, req: { golpeo: 74, velocidad: 74 },  nameKey: 'tech_counterPuncher', sim: 0.1 },
  // ---- Lucha ----
  singleLeg:      { tier: 1, cost: 6,  req: { grappling: 60 },              nameKey: 'move_singleLeg',      sim: 0.05 },
  escapeArtist:   { tier: 1, cost: 8,  req: { grappling: 64 },              nameKey: 'tech_escapeArtist',   sim: 0.05 },
  doubleLeg:      { tier: 2, cost: 10, req: { grappling: 72 },              nameKey: 'move_doubleLeg',      sim: 0.07 },
  sprawl:         { tier: 2, cost: 12, req: { grappling: 72, defensa: 68 }, nameKey: 'tech_sprawl',         sim: 0.09 },
  groundAndPound: { tier: 2, cost: 12, req: { grappling: 74, golpeo: 66 },  nameKey: 'tech_groundAndPound', sim: 0.08 },
  subHunter:      { tier: 2, cost: 16, req: { sumisiones: 80 },             nameKey: 'tech_subHunter',      sim: 0.1 },
  // ---- Físico y mente ----
  ironChin:       { tier: 2, cost: 12, req: { menton: 74 },                 nameKey: 'tech_ironChin',       sim: 0.08 },
  gasTank:        { tier: 2, cost: 14, req: { cardio: 80 },                 nameKey: 'tech_gasTank',        sim: 0.09 },
  killerInstinct: { tier: 3, cost: 22, req: { golpeo: 86, velocidad: 80 },  nameKey: 'tech_killerInstinct', sim: 0.16, stars: 4 },
  unbreakable:    { tier: 3, cost: 24, req: { menton: 86, cardio: 80 },     nameKey: 'tech_unbreakable',    sim: 0.16, stars: 4 },
};

export const techSimBonus = list => (list || []).reduce((s, k) => s + (TECHNIQUES[k]?.sim || 0), 0);
