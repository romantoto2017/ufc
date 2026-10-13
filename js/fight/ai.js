// IA de pelea. Escribe en el Controller del peleador, igual que el jugador.
// Pelea mejor según la dificultad elegida y la valoración (estrellas) del peleador.
import { starsExact } from '../ratings.js';

const DIFFICULTY = {
  facil:   { react: 0.55, guard: 0.2,  block: 0.3,  aggr: 0.3,  taps: 3.5 },
  normal:  { react: 0.36, guard: 0.13, block: 0.5,  aggr: 0.4,  taps: 5.5 },
  dificil: { react: 0.22, guard: 0.09, block: 0.65, aggr: 0.5,  taps: 7.5 },
  leyenda: { react: 0.14, guard: 0.06, block: 0.78, aggr: 0.6,  taps: 9.5 },
};

const STYLE_WEIGHTS = {
  boxeo:       { jab: 3, cross: 3, hook: 2.5, lowKick: 0.5, bodyKick: 0.3, highKick: 0.2, takedown: 0.2 },
  kickboxing:  { jab: 2.5, cross: 2, hook: 1.2, lowKick: 2, bodyKick: 1.5, highKick: 1, takedown: 0.2 },
  muay_thai:   { jab: 1.5, cross: 1.8, hook: 1.5, lowKick: 2.2, bodyKick: 2, highKick: 1, takedown: 0.3 },
  bjj:         { jab: 2, cross: 1.5, hook: 0.8, lowKick: 0.8, bodyKick: 0.4, highKick: 0.2, takedown: 1 },
  lucha_libre: { jab: 2, cross: 1.5, hook: 1, lowKick: 0.6, bodyKick: 0.3, highKick: 0.2, takedown: 1.3 },
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
    if (!me.canAct || this.rng() > this.blockP) return;
    const dist = Math.abs(op.x - me.x);
    if (me.ground) { if (m.zone === 'head') { c.blockHigh = true; this.holdBlockT = 0.35; } return; }
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
    // Sin aguante: recuperar distancia.
    if (me.stamFrac < 0.22 && this.rng() < 0.75) {
      if (dist < 45) return this.step(-1, 0.4);
      return;
    }
    if (dist > this.pref + 8) return this.step(1, 0.2 + this.rng() * 0.2);
    if (dist < this.pref - 8 && this.weights.takedown < 1 && this.rng() < 0.4) return this.step(-1, 0.15);

    if (this.rng() > this.aggr) {
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
