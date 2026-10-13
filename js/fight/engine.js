// Motor de pelea jugada: lógica pura, sin dibujo. Se puede ejecutar en Node (tests IA vs IA).
import { movesForStyle } from './moves.js';
import { randomSubmission } from '../sim.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const ARENA_W = 480;          // ancho del mundo en píxeles
const EDGE = 40;                      // límite de la jaula
const MIN_SEP = 22;                   // distancia mínima de pie

function emptyStats() {
  return {
    thrown: 0, landed: 0, head: 0, body: 0, legs: 0, blocked: 0,
    dmgDealt: 0, blockedDmg: 0, kd: 0, tdAtt: 0, tdLanded: 0, control: 0, subAtt: 0, subThreat: 0,
  };
}

export class Controller {
  constructor() { this.left = false; this.right = false; this.blockHigh = false; this.blockLow = false; this.queue = []; this.taps = 0; }
  press(action) { this.queue.length = 0; this.queue.push(action); }
  tap() { this.taps++; }
  take() { return this.queue.shift(); }
  clear() { this.queue.length = 0; this.taps = 0; }
}

export class FighterState {
  constructor(data, idx) {
    this.data = data;
    this.idx = idx;
    this.a = data.atributos;
    this.style = data.estilo;
    this.moves = movesForStyle(data.estilo, data.tecnicas);
    this.checkKick = (data.tecnicas || []).includes('checkKick');
    this.ctl = new Controller();
    this.staminaMax = 70 + this.a.cardio * 0.3;
    this.stamina = this.staminaMax;
    this.dmg = { head: 0, body: 0, legs: 0 };
    this.stats = emptyStats();
    this.roundStats = [];
    this.resetPosition();
  }

  resetPosition() {
    this.x = ARENA_W / 2 + (this.idx === 0 ? -45 : 45);
    this.dir = this.idx === 0 ? 1 : -1;
    this.state = 'idle'; this.t = 0; this.move = null; this.hitDone = false;
    this.blockZone = null; this.ground = null; this.downT = 0; this.hitsWhileDown = 0;
    this.stunT = 0; this.walkPhase = 0; this.moving = 0; this.hurtZone = null; this.counter = false;
  }

  get stamFrac() { return this.stamina / this.staminaMax; }
  // Rendimiento por aguante: con poco aguante pega más flojo y se mueve peor.
  get stamFactor() { return 0.55 + 0.45 * Math.min(1, this.stamina / (0.5 * this.staminaMax)); }
  get speedMult() { return 0.8 + this.a.velocidad * 0.004; }
  get canAct() { return this.state === 'idle' || this.state === 'walk' || this.state === 'block'; }
  get isAttacking() { return this.state === 'attack'; }
  get inStartup() { return this.state === 'attack' && this.t < this.move.startup / this.speedMult; }

  newRoundStats() { this.cur = emptyStats(); this.roundStats.push(this.cur); }
  stat(k, v = 1) { this.stats[k] += v; this.cur[k] += v; }
  spend(v) { this.stamina = Math.max(0, this.stamina - v); }
}

export class Fight {
  constructor(dataA, dataB, opts = {}) {
    this.rounds = opts.rounds || 3;
    this.roundSeconds = opts.roundSeconds || 300;
    this.rng = opts.rng || Math.random;
    this.f = [new FighterState(dataA, 0), new FighterState(dataB, 1)];
    this.round = 1;
    this.clock = this.roundSeconds;
    this.phase = 'intro';
    this.phaseT = 0;
    this.events = [];
    this.sub = null;
    this.result = null;
    this.hitstop = 0;
    this.groundIdleT = 0;
    this.groundT = 0;
    this.judgeCards = [[], [], []]; // por juez: [ptsA, ptsB] por round
    // Escala del daño acumulado: rounds más cortos comprimen la pelea para que siga habiendo finalizaciones.
    this.zoneScale = 0.08 * Math.pow(300 / this.roundSeconds, 0.75);
    for (const f of this.f) f.newRoundStats();
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  opp(f) { return this.f[1 - f.idx]; }

  update(dt) {
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.phaseT += dt;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 1.6) { this.phase = 'fight'; this.phaseT = 0; this.emit('bell'); this.emit('fight'); }
        break;
      case 'fight': this.stepFight(dt); break;
      case 'between':
        if (this.phaseT > (this.betweenSeconds ?? 5)) this.startNextRound();
        break;
      default: break;
    }
  }

  startNextRound() {
    this.round++;
    this.clock = this.roundSeconds;
    for (const f of this.f) { f.resetPosition(); f.newRoundStats(); f.ctl.clear(); }
    this.phase = 'intro'; this.phaseT = 0; this.sub = null; this.groundIdleT = 0; this.groundT = 0;
    this.emit('round_start', { round: this.round });
  }

  stepFight(dt) {
    this.clock -= dt;
    const [A, B] = this.f;
    if (this.sub) this.stepSub(dt);
    else for (const f of this.f) this.stepFighter(f, dt);
    this.resolveSpacing();
    if (A.ground) {
      const top = A.ground === 'top' ? A : B; top.stat('control', dt);
      this.groundIdleT += dt; this.groundT += dt;
      // El árbitro levanta a los peleadores si no hay acción o si el control se alarga sin avanzar.
      if (this.groundIdleT > 15 || this.groundT > 40) this.standUp('ref_standup');
    }
    if (this.phase === 'fight' && this.clock <= 0) this.endRound();
  }

  // ---------- fighter ----------
  stepFighter(f, dt) {
    const o = this.opp(f);
    f.t += dt;
    if (f.subCooldown > 0) f.subCooldown -= dt;
    // Recuperación de aguante: rápida al estar quieto o en guardia; el daño al cuerpo la reduce.
    const regenBase = 18 * (0.6 + f.a.cardio / 250) * (1 - f.dmg.body / 100 * 0.6);

    switch (f.state) {
      case 'idle': case 'walk': case 'block': {
        if (!f.ground) f.dir = Math.sign(o.x - f.x) || f.dir;
        const action = f.ctl.take();
        if (action) { this.doAction(f, action); break; }
        const wantBlock = f.ctl.blockHigh ? 'high' : f.ctl.blockLow ? 'low' : null;
        if (wantBlock && !(f.ground && wantBlock === 'low')) {
          if (f.state !== 'block' || f.blockZone !== wantBlock) { f.state = 'block'; f.t = 0; }
          f.blockZone = wantBlock;
          f.stamina = Math.min(f.staminaMax, f.stamina + regenBase * dt); // la guardia no gasta aguante
          f.moving = 0;
          break;
        }
        f.blockZone = null;
        let mv = (f.ctl.right ? 1 : 0) - (f.ctl.left ? 1 : 0);
        if (f.ground) mv = 0;
        if (mv !== 0) {
          f.state = 'walk';
          const speed = 40 * f.speedMult * (1 - f.dmg.legs / 100 * 0.55) * (0.7 + 0.3 * f.stamFrac);
          f.x = clamp(f.x + mv * speed * dt, EDGE, ARENA_W - EDGE);
          f.walkPhase += dt * speed * 0.12;
          f.moving = mv * f.dir; // +1 avanza, -1 retrocede
          f.stamina = Math.min(f.staminaMax, f.stamina + regenBase * 0.85 * dt);
        } else {
          f.state = 'idle'; f.moving = 0;
          f.stamina = Math.min(f.staminaMax, f.stamina + regenBase * (f.ground === 'bottom' ? 0.5 : 1) * dt);
        }
        break;
      }
      case 'attack': {
        const m = f.move, sm = f.speedMult;
        const st = m.startup / sm, ac = m.active, rc = m.recovery / sm * (f.stamina < 1 ? 1.4 : 1);
        if (!f.hitDone && f.t >= st) { f.hitDone = true; this.resolveMove(f, o, m); }
        if (f.state !== 'attack') break; // pudo cambiar (derribo)
        // Permite encadenar combos en la segunda mitad de la recuperación.
        if (f.t >= st + ac + rc * 0.5 && f.ctl.queue.length) { const a = f.ctl.take(); f.state = 'idle'; this.doAction(f, a); break; }
        if (f.t >= st + ac + rc) { f.state = 'idle'; f.t = 0; f.move = null; }
        break;
      }
      case 'hitstun': case 'sprawled': case 'escape_try':
        if (f.t >= f.stunT) {
          if (f.state === 'escape_try') this.resolveEscape(f);
          else { f.state = 'idle'; f.t = 0; }
        }
        break;
      case 'down':
        f.downT -= dt;
        if (f.downT <= 0) { f.state = 'getup'; f.t = 0; this.emit('getup', { who: f.idx }); }
        break;
      case 'getup':
        if (f.t > 0.45) { f.state = 'idle'; f.t = 0; f.hitsWhileDown = 0; }
        break;
      default: break;
    }
  }

  doAction(f, action) {
    const o = this.opp(f);
    if (f.ground) {
      if (action === 'sub') return this.startSub(f, o);
      if (action === 'escape' && f.ground === 'bottom') {
        f.state = 'escape_try'; f.t = 0; f.stunT = 0.5; f.spend(7); this.groundIdleT = 0; return;
      }
      if (action === 'standUp' && f.ground === 'top') return this.standUp('stand');
      const key = f.ground === 'top' ? (action === 'gnpElbow' ? 'gnpElbow' : action === 'gnpPunch' ? 'gnpPunch' : null)
        : (action === 'upStrike' ? 'upStrike' : null);
      if (!key) return;
      return this.startAttack(f, f.moves[key]);
    }
    const m = f.moves[action];
    if (!m || m.key.startsWith('gnp') || m.key === 'upStrike') return;
    this.startAttack(f, m);
  }

  startAttack(f, m) {
    f.state = 'attack'; f.t = 0; f.move = m; f.hitDone = false; f.blockZone = null; f.moving = 0;
    f.attackId = (f.attackId || 0) + 1;
    f.spend(m.stam * (f.stamina < m.stam ? 0.5 : 1));
    if (m.type !== 'grapple') f.stat('thrown');
    this.emit('swing', { who: f.idx, move: m.key, moveType: m.type });
  }

  // ---------- resolución de golpes ----------
  resolveMove(A, D, m) {
    if (m.type === 'grapple') return this.resolveTakedown(A, D, m);
    const dist = Math.abs(A.x - D.x);
    const onGround = !!A.ground;
    if (!onGround && dist > m.range) { this.emit('miss', { who: A.idx, move: m.key }); return; }
    if (D.state === 'ko') return;
    // A un rival caído solo se le puede pegar con los puños (sin patadas a la cabeza).
    if (D.state === 'down' && m.type === 'kick') { this.emit('miss', { who: A.idx, move: m.key }); return; }

    // Esquiva: depende de la defensa del rival y de la precisión del atacante.
    const acc = (m.type === 'kick' ? A.a.patadas : A.a.golpeo) / 100;
    const defenderFree = D.state === 'idle' || D.state === 'walk' || D.state === 'block';
    if (!onGround && defenderFree && D.state !== 'down') {
      const pEvade = clamp(D.a.defensa / 100 * 0.4 * D.stamFactor - acc * 0.12, 0.03, 0.35);
      if (this.rng() < pEvade) { this.emit('miss', { who: A.idx, move: m.key, slip: true }); return; }
    }

    const blocked = D.state === 'block' && (m.zone === 'head' ? D.blockZone === 'high' : D.blockZone === 'low');
    let dmg = m.dmg * (0.55 + acc * 0.7) * A.stamFactor * (0.85 + this.rng() * 0.3);
    const counter = D.inStartup;
    if (counter) dmg *= 1.25;
    if (D.state === 'down') dmg *= 0.8;

    if (blocked) {
      dmg *= 0.25 - D.a.defensa / 1000;
      D.spend(m.dmg * 0.12 * (1.2 - D.a.defensa / 200)); // bloquear casi no cansa
      if (D.stamina <= 0) dmg *= 2; // guardia rota por cansancio
      // Chequeo de patada baja: el atacante se lastima la pierna
      if (D.checkKick && m.zone === 'legs') { dmg *= 0.5; A.dmg.legs = Math.min(100, A.dmg.legs + m.dmg * 0.6 * this.zoneScale); }
      D.dmg[m.zone] = Math.min(100, D.dmg[m.zone] + dmg * this.zoneScale);
      A.stat('blocked'); A.stat('blockedDmg', dmg);
      D.state = 'block'; D.t = 0;
      this.emit('block', { who: D.idx, by: A.idx, zone: m.zone, move: m.key });
      return;
    }

    D.dmg[m.zone] = Math.min(100, D.dmg[m.zone] + dmg * this.zoneScale);
    A.stat('landed'); A.stat(m.zone); A.stat('dmgDealt', dmg);
    if (D.state === 'down') D.hitsWhileDown++;
    if (m.zone === 'body') D.spend(dmg * 0.8);
    if (A.ground) this.groundIdleT = 0;
    this.emit('hit', { who: D.idx, by: A.idx, zone: m.zone, move: m.key, dmg, counter, x: D.x });

    // Reacción
    if (D.state !== 'down' && D.state !== 'ko') {
      if (D.state === 'attack') D.move = null;
      D.state = 'hitstun'; D.t = 0; D.stunT = 0.12 + dmg * 0.015; D.hurtZone = m.zone;
    }
    if (dmg > 9) this.hitstop = 0.07;

    // Finalizaciones
    if (D.dmg.head >= 100) return this.finish(A, D, 'tko');
    // El árbitro para la pelea si el caído recibe golpes sin defenderse (antes cuanto más dañado esté).
    if (D.state === 'down' && D.hitsWhileDown >= Math.max(2, 3 + Math.floor((60 - D.dmg.head) / 20))) return this.finish(A, D, 'tko');
    if (m.zone === 'head' && m.kd > 0 && !A.ground) this.checkKnockdown(A, D, m, dmg);
    else if (m.zone === 'body' && D.dmg.body > 80 && dmg >= 6 && this.rng() < (D.dmg.body - 80) / 60) this.knockdown(A, D, 'body');
    else if (m.zone === 'legs' && D.dmg.legs >= 95 && dmg >= 5) {
      if (D.dmg.legs >= 100 && D.legsDowned) return this.finish(A, D, 'tko');
      D.legsDowned = true; this.knockdown(A, D, 'legs');
    }
  }

  checkKnockdown(A, D, m, dmg) {
    const chin = 6 + D.a.menton / 100 * 14;
    const koPower = dmg * m.kd * (0.35 + D.dmg.head / 100 * 1.3);
    const p = clamp((koPower - chin * 0.7) / (chin * 4), 0, 0.5);
    if (this.rng() >= p) return;
    const pKO = Math.pow(D.dmg.head / 100, 2) * 0.5 + (koPower > chin * 1.7 ? 0.35 : 0);
    if (this.rng() < pKO) return this.finish(A, D, 'ko');
    this.knockdown(A, D, 'head');
  }

  knockdown(A, D, cause) {
    if (D.state === 'down') return;
    D.state = 'down'; D.t = 0; D.move = null; D.hitsWhileDown = 0;
    D.downT = 1.6 + D.dmg.head / 100 * 2 + (cause === 'body' ? 0.8 : 0);
    D.ground = null; A.ground = null;
    A.stat('kd');
    this.hitstop = 0.15;
    this.emit('knockdown', { who: D.idx, by: A.idx, cause });
  }

  resolveTakedown(A, D, m) {
    A.stat('tdAtt');
    const dist = Math.abs(A.x - D.x);
    if (dist > m.range || D.state === 'down') { this.emit('miss', { who: A.idx, move: m.key }); this.sprawl(A); return; }
    let p = 0.3 + (A.a.grappling - (D.a.grappling * 0.6 + D.a.defensa * 0.4)) / 100 * 0.8 + (m.tdBonus || 0);
    if (D.state === 'attack') p += 0.18;
    if (D.state === 'block' && D.blockZone === 'low') p -= 0.35; // sprawl
    p += (1 - D.stamFrac) * 0.2 - (1 - A.stamFrac) * 0.15;
    p = clamp(p, 0.05, 0.75);
    if (this.rng() < p) {
      A.stat('tdLanded');
      A.ground = 'top'; D.ground = 'bottom';
      A.state = 'idle'; D.state = 'idle'; A.move = null; D.move = null; A.t = D.t = 0;
      D.dir = Math.sign(A.x - D.x) || 1; A.dir = -D.dir;
      A.x = clamp(D.x + D.dir * 12, EDGE, ARENA_W - EDGE);
      this.groundIdleT = 0; this.groundT = 0;
      D.spend(4);
      this.emit('takedown', { who: A.idx, on: D.idx });
    } else {
      this.emit('td_fail', { who: A.idx });
      this.sprawl(A);
    }
  }

  sprawl(A) { A.state = 'sprawled'; A.t = 0; A.stunT = 0.6; A.move = null; }

  resolveEscape(f) {
    const top = this.opp(f);
    const p = clamp(0.35 + (f.a.grappling - top.a.grappling) / 100 * 0.6 + (1 - top.stamFrac) * 0.25, 0.12, 0.7);
    if (this.rng() < p) this.standUp('escape');
    else { f.state = 'idle'; f.t = 0; this.emit('escape_fail', { who: f.idx }); }
  }

  standUp(reason) {
    const [A, B] = this.f;
    for (const f of this.f) { f.ground = null; f.state = 'idle'; f.t = 0; f.move = null; }
    const mid = (A.x + B.x) / 2;
    const left = A.x <= B.x ? A : B, right = left === A ? B : A;
    left.x = clamp(mid - 16, EDGE, ARENA_W - EDGE); right.x = clamp(mid + 16, EDGE, ARENA_W - EDGE);
    this.emit('standup', { reason });
  }

  // ---------- sumisiones ----------
  startSub(att, def) {
    if (att.stamina < 8 || att.subCooldown > 0) return;
    att.spend(10); att.stat('subAtt');
    this.groundIdleT = 0;
    att.ctl.clear(); def.ctl.clear();
    // Probabilidad base según atributos, aguante y daño; los toques (taps) de cada lado la inclinan.
    const pBase = clamp(0.05 + (att.a.sumisiones - (def.a.grappling * 0.7 + def.a.defensa * 0.3)) / 100 * 0.5
      + (1 - def.stamFrac) * 0.15 + def.dmg.head / 100 * 0.15 + (att.ground === 'top' ? 0.03 : 0) + (att.style === 'bjj' ? 0.04 : 0), 0.03, 0.6);
    const bias = this.rng() < pBase ? 1 : -1;
    this.sub = { att, def, progress: 0.3, t: 0, max: 0.3, bias, name: randomSubmission(att.style, this.rng) };
    att.state = 'sub'; def.state = 'sub'; att.move = def.move = null;
    this.emit('sub_start', { who: att.idx, name: this.sub.name });
  }

  stepSub(dt) {
    const s = this.sub, { att, def } = s;
    s.t += dt;
    // La técnica (bias) marca la tendencia; quien toca más rápido puede darle la vuelta.
    s.progress += s.bias * 0.1 * dt + (att.ctl.taps - def.ctl.taps) * 0.03;
    att.ctl.taps = 0; def.ctl.taps = 0;
    att.spend(4 * dt); def.spend(2.5 * dt);
    s.max = Math.max(s.max, s.progress);
    if (s.progress >= 1) { this.sub = null; return this.finish(att, def, 'sub', { submission: s.name }); }
    if (s.progress <= 0 || s.t > 7) {
      if (s.max > 0.6) att.stat('subThreat');
      this.sub = null;
      att.state = 'idle'; def.state = 'idle'; att.t = def.t = 0;
      att.spend(6);
      att.subCooldown = 10;
      this.emit('sub_escape', { who: def.idx });
      // Una sumisión fallida suele dejar levantarse al rival.
      if (this.rng() < 0.5) this.standUp('scramble');
    }
  }

  resolveSpacing() {
    const [A, B] = this.f;
    if (A.ground || A.state === 'down' || B.state === 'down' || A.state === 'ko' || B.state === 'ko') return;
    const d = B.x - A.x, ad = Math.abs(d);
    if (ad < MIN_SEP) {
      const push = (MIN_SEP - ad) / 2, s = Math.sign(d) || 1;
      A.x = clamp(A.x - s * push, EDGE, ARENA_W - EDGE);
      B.x = clamp(B.x + s * push, EDGE, ARENA_W - EDGE);
      if (Math.abs(B.x - A.x) < MIN_SEP) { // contra la jaula
        if (A.x <= EDGE + 1 || B.x <= EDGE + 1) { const l = A.x < B.x ? A : B; (l === A ? B : A).x = l.x + MIN_SEP; }
        else { const r = A.x > B.x ? A : B; (r === A ? B : A).x = r.x - MIN_SEP; }
      }
    }
  }

  // ---------- rounds y resultado ----------
  roundPoints(s) {
    return s.dmgDealt + s.blockedDmg * 0.15 + s.kd * 25 + s.tdLanded * 6 + s.control * 0.35 + s.subThreat * 8 + s.landed * 0.5;
  }

  gauss() { let u = 0, v = 0; while (!u) u = this.rng(); while (!v) v = this.rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  scoreRound() {
    const [A, B] = this.f;
    const sa = A.cur, sb = B.cur;
    const pa = this.roundPoints(sa), pb = this.roundPoints(sb);
    for (let j = 0; j < 3; j++) {
      const ja = pa * (1 + this.gauss() * 0.12) + this.rng() * 2;
      const jb = pb * (1 + this.gauss() * 0.12) + this.rng() * 2;
      let card;
      if (Math.abs(ja - jb) < 0.5 && pa < 3 && pb < 3) card = [10, 10];
      else {
        const aWin = ja > jb;
        const [w, l, sw] = aWin ? [ja, jb, sa] : [jb, ja, sb];
        const dominant = (w > l * 2.3 && w - l > 35) || sw.kd >= 2;
        card = aWin ? [10, dominant ? 8 : 9] : [dominant ? 8 : 9, 10];
      }
      this.judgeCards[j].push(card);
    }
  }

  endRound() {
    this.clock = 0;
    this.scoreRound();
    this.emit('bell'); this.emit('round_end', { round: this.round });
    if (this.round >= this.rounds) return this.decision();
    for (const f of this.f) {
      f.stamina += (f.staminaMax - f.stamina) * 0.65;
      f.staminaMax = Math.max(50, f.staminaMax - (3 + f.dmg.body * 0.05) * (1.3 - f.a.cardio / 100));
      f.stamina = Math.min(f.stamina, f.staminaMax);
      f.dmg.head *= 0.85; f.dmg.body *= 0.9; f.dmg.legs *= 0.85;
      f.legsDowned = false;
    }
    this.sub = null;
    this.phase = 'between'; this.phaseT = 0;
  }

  decision() {
    const totals = this.judgeCards.map(c => c.reduce(([x, y], [a, b]) => [x + a, y + b], [0, 0]));
    let aJ = 0, bJ = 0;
    for (const [a, b] of totals) { if (a > b) aJ++; else if (b > a) bJ++; }
    const [A, B] = this.f;
    let method, winner = null;
    if (aJ === 3 || bJ === 3) method = 'dec_unanimous';
    else if ((aJ === 2 && bJ === 1) || (bJ === 2 && aJ === 1)) method = 'dec_split';
    else if (aJ === 2 || bJ === 2) method = 'dec_majority';
    else method = 'draw';
    if (aJ > bJ) winner = A; else if (bJ > aJ) winner = B;
    if (method !== 'draw' && !winner) method = 'draw';
    const loser = winner ? this.opp(winner) : null;
    const cards = totals.map(([a, b]) => (winner === B ? [b, a] : [a, b]));
    this.end({
      winnerId: winner ? winner.data.id : null, loserId: loser ? loser.data.id : null,
      winnerIdx: winner ? winner.idx : -1, method, round: this.rounds, time: this.roundSeconds, scorecards: cards,
      scorecardsAB: totals,
    });
  }

  finish(W, L, method, extra = {}) {
    if (this.result) return;
    L.state = method === 'sub' ? 'tapped' : 'ko'; L.t = 0;
    if (method === 'sub') L.ground = L.ground || 'bottom';
    W.state = 'victory'; W.t = 0; W.ground = null;
    if (method !== 'sub') L.ground = null;
    this.hitstop = 0.25;
    this.emit(method === 'sub' ? 'tapout' : 'ko', { who: L.idx, by: W.idx });
    this.end({
      winnerId: W.data.id, loserId: L.data.id, winnerIdx: W.idx, method, round: this.round,
      time: Math.max(1, Math.round(this.roundSeconds - this.clock)), ...extra,
    });
  }

  end(result) {
    result.rounds = this.rounds;
    result.roundSeconds = this.roundSeconds;
    result.stats = this.f.map(f => ({ ...f.stats }));
    result.dmg = this.f.map(f => ({ ...f.dmg }));
    this.result = result;
    this.phase = 'over'; this.phaseT = 0;
    this.emit('fight_end', { result });
  }
}
