// IA de pelea. Escribe en el Controller del peleador, igual que el jugador.
// Pelea mejor según la dificultad elegida y la valoración (estrellas) del peleador.
import { starsExact } from '../ratings.js';

// counter = ganas de contragolpear cuando el rival tira golpes de más o pega al aire;
// auto = reflejo del contragolpe automático del motor al esquivar o bloquear una ráfaga.
const DIFFICULTY = {
  facil:   { react: 0.5,  guard: 0.18, block: 0.35, aggr: 0.32, taps: 4,   counter: 0.25, auto: 0.35 },
  normal:  { react: 0.26, guard: 0.095, block: 0.65, aggr: 0.45, taps: 7,   counter: 0.65, auto: 0.85 },
  dificil: { react: 0.19, guard: 0.075, block: 0.72, aggr: 0.55, taps: 8.5, counter: 0.75, auto: 1 },
  leyenda: { react: 0.12, guard: 0.05, block: 0.84, aggr: 0.65, taps: 10.5, counter: 0.9, auto: 1.15 },
};

const STYLE_WEIGHTS = {
  boxeo:       { jab: 3, cross: 3, hook: 2.5, elbow: 0.3, lowKick: 0.5, bodyKick: 0.3, highKick: 0.2, spinKick: 0.05, takedown: 0.2 },
  kickboxing:  { jab: 2.5, cross: 2, hook: 1.2, elbow: 0.3, lowKick: 2, bodyKick: 1.5, highKick: 0.8, spinKick: 0.4, takedown: 0.2 },
  muay_thai:   { jab: 1.5, cross: 1.8, hook: 1, elbow: 1.2, lowKick: 2.2, bodyKick: 2, highKick: 1, spinKick: 0.1, takedown: 0.3 },
  bjj:         { jab: 2, cross: 1.5, hook: 0.8, elbow: 0.3, lowKick: 0.8, bodyKick: 0.4, highKick: 0.2, spinKick: 0.05, takedown: 1 },
  lucha_libre: { jab: 2, cross: 1.5, hook: 1, elbow: 0.4, lowKick: 0.6, bodyKick: 0.3, highKick: 0.2, spinKick: 0.05, takedown: 1.3 },
};
const PREF_RANGE = { boxeo: 32, kickboxing: 36, muay_thai: 34, bjj: 29, lucha_libre: 29 };

export class AI {
  constructor(fight, idx, difficulty = 'normal') {
    this.fight = fight;
    this.me = fight.f[idx];
    this.op = fight.f[1 - idx];
    const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.skill = starsExact(this.me.a) / 5; // 0.1 .. 1
    this.react = d.react * (1.35 - this.skill * 0.5);
    this.guardReact = d.guard * (1.35 - this.skill * 0.5); // reflejo de guardia ante un golpe
    this.cooldown = 0;
    this.blockP = Math.min(0.92, d.block * (0.6 + this.skill * 0.5) * (0.6 + this.me.a.defensa / 250));
    this.aggr = d.aggr * (0.55 + this.skill * 0.45);
    this.tapRate = d.taps * (0.8 + this.skill * 0.3);
    this.counterP = Math.min(0.95, d.counter * (0.6 + this.skill * 0.5) * this.me.boxing);
    this.punishId = null;
    this.me.counterSkill = d.auto; // reflejo de contragolpe automático en el motor
    this.thinkT = 0.3; this.tapAcc = 0; this.reactingTo = null; this.reactT = 0; this.holdBlockT = 0;
    this.plan = []; this.moveT = 0;
    this.weights = STYLE_WEIGHTS[this.me.style] || STYLE_WEIGHTS.boxeo;
    this.pref = PREF_RANGE[this.me.style] || 28;
  }

  rng() { return this.fight.rng(); }

  update(dt) {
    const { me, op, fight } = this;
    const c = me.ctl;
    if (fight.phase !== 'fight') { c.left = c.right = c.blockHigh = c.blockLow = false; return; }

    if (fight.sub && (fight.sub.att === me || fight.sub.def === me)) {
      this.tapAcc += dt * this.tapRate * (0.85 + this.rng() * 0.3);
      while (this.tapAcc >= 1) { c.tap(); this.tapAcc--; }
      return;
    }

    // Combos planificados
    if (this.plan.length) {
      this.plan[0].t -= dt;
      if (this.plan[0].t <= 0) c.press(this.plan.shift().a);
    }

    if (this.punish()) return;
    this.defend(dt);
    if (this.holdBlockT > 0) return;

    this.moveT -= dt;
    this.cooldown -= dt;
    if (this.moveT <= 0) { c.left = c.right = false; }
    this.thinkT -= dt;
    if (this.thinkT > 0) return;
    this.thinkT = this.react * (0.6 + this.rng() * 0.8);
    if (!me.canAct && me.state !== 'attack') return;
    if (me.ground) return this.groundThink();
    this.standThink();
  }

  // Castiga al rival que pegó al aire o que está tirando golpes sin pausa.
  punish() {
    const { me, op } = this, c = me.ctl;
    if (me.ground || !me.canAct || op.state !== 'attack' || !op.hitDone || this.punishId === op.attackId) return false;
    const blocked = me.state === 'block' && me.t < 0.2; // acaba de parar el golpe: devolver
    if (!op.whiffed && op.spam < 1.5 && !blocked) return false;
    this.punishId = op.attackId;
    const dist = Math.abs(op.x - me.x);
    const ex = op.spamExcess;
    // Tras bloquear, la respuesta más rápida (recto); al aire o ante una ráfaga, el gancho.
    const k = dist <= me.moves.hook.range && !blocked ? 'hook' : dist <= me.moves.cross.range ? 'cross' : null;
    const p = ex > 0 ? Math.min(1, 0.5 + ex * 0.2) : op.whiffed ? 0.45 : blocked ? 0.35 : 0.2;
    if (!k || this.rng() > this.counterP * p) return false;
    c.blockHigh = c.blockLow = false; this.holdBlockT = 0;
    c.press(k);
    if (this.rng() < 0.4 + this.skill * 0.3) this.plan.push({ a: k === 'hook' ? 'cross' : 'hook', t: 0.22 });
    this.cooldown = 0.5;
    return true;
  }

  defend(dt) {
    const { me, op } = this, c = me.ctl;
    if (this.holdBlockT > 0) {
      this.holdBlockT -= dt;
      if (this.holdBlockT <= 0 || (op.state !== 'attack' && op.state !== 'idle')) { c.blockHigh = c.blockLow = false; this.holdBlockT = 0; }
      return;
    }
    if (op.state === 'attack' && this.reactingTo !== op.attackId) {
      this.reactingTo = op.attackId; this.reactT = this.guardReact * (0.6 + this.rng() * 0.8); this.decided = false;
    }
    if (op.state !== 'attack') { this.reactingTo = null; return; }
    if (this.decided) return;
    this.reactT -= dt;
    if (this.reactT > 0) return;
    this.decided = true;
    const m = op.move;
    if (!me.canAct) return;
    const dist = Math.abs(op.x - me.x);
    // Ante una ráfaga: leer el golpe, esquivarlo y contragolpear (o al menos cubrirse más).
    const ex = op.spamExcess;
    if (!me.ground && m.type === 'punch' && m.zone === 'head') {
      const pRead = this.counterP * Math.min(1, Math.max(0.04, (op.spam - 1) * 0.25));
      if (this.rng() < pRead) { c.press('slip'); return; }
    }
    const blockP = Math.min(0.95, (me.rocked ? this.blockP * 0.6 : this.blockP) + ex * 0.08);
    if (this.rng() > blockP) return;
    if (me.ground) { if (m.zone === 'head') { c.blockHigh = true; this.holdBlockT = me.rocked ? 0.5 : 0.35; } return; }
    if (m.type === 'grapple') { c.blockLow = true; this.holdBlockT = 0.45; return; }
    if (m.type === 'kick' && dist > 31 && this.rng() < 0.35) { this.step(-1, 0.25); return; }
    if (m.zone === 'head') c.blockHigh = true; else c.blockLow = true;
    this.holdBlockT = 0.3 + m.startup;
  }

  step(dirRel, t) {
    const c = this.me.ctl, worldDir = dirRel * this.me.dir;
    c.right = worldDir > 0; c.left = worldDir < 0; this.moveT = t;
  }

  standThink() {
    const { me, op } = this, c = me.ctl;
    if (me.state === 'attack') return;
    const dist = Math.abs(op.x - me.x);
    c.blockHigh = c.blockLow = false;

    if (op.state === 'down') {
      if (dist > 27) return this.step(1, 0.3);
      if (this.rng() < 0.7) c.press(this.rng() < 0.5 ? 'cross' : 'hook');
      return;
    }
    // Rival tocado: ir a buscar el nocaut.
    const hurt = op.dmg.head > 55 || op.stamFrac < 0.25;
    // Sin aguante: recuperar distancia.
    if (me.stamFrac < 0.22 && this.rng() < 0.75) {
      if (dist < 45) return this.step(-1, 0.4);
      return;
    }
    if (dist > this.pref + 8) return this.step(1, 0.2 + this.rng() * 0.2);
    if (dist < this.pref - 8 && this.weights.takedown < 1 && this.rng() < 0.4) return this.step(-1, 0.15);

    if (this.rng() > Math.min(0.9, this.aggr * (hurt ? 1.35 : 1))) {
      if (this.rng() < 0.4) this.step(this.rng() < 0.5 ? 1 : -1, 0.15);
      return;
    }
    if (this.cooldown > 0) {
      if (this.rng() < 0.35) this.step(this.rng() < 0.55 ? -1 : 1, 0.12);
      return;
    }
    const action = this.chooseAttack(dist);
    if (!action) return this.step(1, 0.15);
    c.press(action);
    this.queueCombo(action);
    this.cooldown = (1.0 + this.rng() * 2.0) * (1.3 - this.aggr);
  }

  chooseAttack(dist) {
    const { me, op } = this;
    const entries = [];
    const tdd = op.a.grappling * 0.6 + op.a.defensa * 0.4;
    for (const [k, w0] of Object.entries(this.weights)) {
      const m = me.moves[k];
      if (m.range < dist - 2) continue;
      if (me.stamina < m.stam * 1.6 && m.stam > 5) continue;
      let w = w0;
      if (op.state === 'block' && op.blockZone === 'high' && m.zone !== 'head' && m.zone) w *= 2.5;
      if (op.state === 'block' && op.blockZone === 'low' && m.zone === 'head') w *= 2.5;
      if (k === 'takedown') w *= Math.max(0.1, 1 + (me.a.grappling - tdd) / 45) * (1.1 - op.stamFrac * 0.6);
      if (k === 'lowKick' && op.dmg.legs > 50) w *= 1.4;
      if (m.zone === 'head' && op.dmg.head > 60) w *= 1.3;
      entries.push([k, w]);
    }
    if (!entries.length) return null;
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.rng() * total;
    for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
    return entries[0][0];
  }

  queueCombo(first) {
    const p = 0.25 + this.skill * 0.35;
    if (first === 'jab' && this.rng() < p) {
      this.plan.push({ a: 'cross', t: 0.18 });
      if (this.rng() < p * 0.6) this.plan.push({ a: this.rng() < 0.5 ? 'hook' : 'lowKick', t: 0.25 });
    } else if (first === 'cross' && this.rng() < p * 0.6) {
      this.plan.push({ a: this.rng() < 0.5 ? 'hook' : 'lowKick', t: 0.25 });
    }
  }

  groundThink() {
    const { me, op } = this, c = me.ctl;
    c.blockHigh = false;
    if (me.state !== 'idle') return;
    const r = this.rng();
    if (me.ground === 'top' && op.rocked) {
      // Rival aturdido después del knockdown: lluvia de golpes hasta que pare el árbitro.
      if (r < 0.9) c.press(this.rng() < 0.7 ? 'gnpPunch' : 'gnpElbow');
      return;
    }
    if (me.rocked) return;
    if (me.ground === 'top') {
      const edge = me.a.sumisiones - op.a.grappling;
      const subChance = Math.max(0, me.a.sumisiones - 55) / 3000 * (edge > 5 ? 1 : 0.4) + (1 - op.stamFrac) * 0.02;
      if (r < subChance && me.stamina > 20) return c.press('sub');
      if (me.style !== 'lucha_libre' && me.style !== 'bjj' && op.a.grappling > me.a.grappling + 5 && r > 0.93) return c.press('standUp');
      if (r < 0.5 * this.aggr + 0.1) c.press(this.rng() < 0.65 ? 'gnpPunch' : 'gnpElbow');
    } else {
      const subChance = me.style === 'bjj' ? 0.06 : Math.max(0, me.a.sumisiones - 60) / 900;
      if (r < subChance && me.stamina > 20) return c.press('sub');
      if (r < 0.4) return c.press('escape');
      if (r < 0.55) c.press('upStrike');
    }
  }
}
