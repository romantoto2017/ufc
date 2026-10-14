// Tutorial interactivo: un compañero de sparring y pasos que avanzan al hacer cada acción.
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { el } from './common.js';
import { state } from '../store.js';

const STEPS = [
  { key: 'tut_move', check: s => s.moved > 14 },
  { key: 'tut_jab', move: 'jab' },
  { key: 'tut_cross', move: 'cross' },
  { key: 'tut_hook', move: 'hook' },
  { key: 'tut_elbow', move: 'elbow' },
  { key: 'tut_low', move: 'lowKick' },
  { key: 'tut_body', move: 'bodyKick' },
  { key: 'tut_high', move: 'highKick' },
  { key: 'tut_spin', move: 'spinKick' },
  { key: 'tut_block_high', dummy: 'jab', block: 'high', count: 2 },
  { key: 'tut_block_low', dummy: 'lowKick', block: 'low', count: 2 },
  { key: 'tut_stamina', info: true },
  { key: 'tut_spam', info: true },
  { key: 'tut_gnp', info: true },
  { key: 'tut_takedown', event: 'takedown' },
  { key: 'tut_sub', event: 'sub_start' },
  { key: 'tut_tap', event: 'sub_done' },
  { key: 'tut_done', info: true, last: true },
];

export class Tutorial {
  constructor(ctx, exit) {
    this.ctx = ctx; this.exit = exit;
    this.i = 0; this.count = 0; this.moved = 0; this.lastX = ctx.player.x; this.dummyT = 0;
    const fight = ctx.fight;
    this.dummy = fight.f[1];
    this.dummy.a = { ...this.dummy.a, grappling: 15, defensa: 20 }; // el sparring se deja derribar
    this.dummy.counterSkill = 0; fight.noPounce = true; // en el tutorial no hay contras ni remates
    // En el tutorial nadie gana: las finalizaciones solo cuentan como paso cumplido.
    fight.finish = (W, L, method) => {
      fight.emit(method === 'sub' ? 'sub_done' : 'tut_reset');
      fight.sub = null; fight.standUp('tutorial');
      for (const f of fight.f) { f.dmg = { head: 0, body: 0, legs: 0 }; f.state = 'idle'; }
    };
    this.box = document.getElementById('tutorial-box');
    this.box.hidden = false;
    this.render();
  }

  get step() { return STEPS[this.i]; }

  render() {
    const s = this.step;
    this.box.innerHTML = '';
    const exitBtn = el('button', { class: 'btn btn-small', text: t('tut_exit') });
    exitBtn.addEventListener('click', () => this.exit());
    // En el esquema clásico cada golpe tiene su botón: los pasos de golpes usan otro texto.
    const classic = (state.settings.esquemaControles || 'clasico') !== 'simple';
    const key = classic && s.move ? s.key + '_c' : s.key;
    const kids = [el('b', { text: t('tut_title', { n: this.i + 1, total: STEPS.length }) }), el('div', { text: t(key) })];
    if (s.count) kids.push(el('div', { class: 'note', text: `${this.count}/${s.count}` }));
    const row = el('div', { class: 'row-actions' });
    if (s.info) {
      const next = el('button', { class: 'btn btn-small btn-primary', text: s.last ? t('tut_finish') : t('continue') });
      next.addEventListener('click', () => (s.last ? this.exit() : this.advance()));
      row.append(next);
    }
    row.append(exitBtn);
    this.box.append(...kids, row);
  }

  advance() {
    audio.play('ui');
    this.i = Math.min(STEPS.length - 1, this.i + 1); this.count = 0; this.dummyT = 1.2;
    this.render();
  }

  onEvent(e) {
    const s = this.step, p = this.ctx.player;
    if (s.move && e.type === 'swing' && e.who === p.idx && e.move === s.move) this.advance();
    else if (s.block && e.type === 'block' && e.who === p.idx) {
      const zone = e.zone === 'head' ? 'high' : 'low';
      if (zone === s.block) { this.count++; if (this.count >= s.count) this.advance(); else this.render(); }
    } else if (s.event === 'takedown' && e.type === 'takedown' && e.who === p.idx) this.advance();
    else if (s.event === 'sub_start' && e.type === 'sub_start' && e.who === p.idx) {
      if (this.ctx.fight.sub) this.ctx.fight.sub.bias = 1; // la sumisión del tutorial siempre puede salir
      this.advance();
    } else if (s.event === 'sub_done' && (e.type === 'sub_done' || e.type === 'sub_escape')) this.advance();
    // Si el sparring escapa o se levantan antes de tiempo, se vuelve al paso del derribo
    if ((s.event === 'sub_start' || s.event === 'sub_done') && e.type === 'standup' && e.reason !== 'tutorial' && !this.ctx.fight.sub) {
      this.i = STEPS.findIndex(x => x.event === 'takedown'); this.render();
    }
  }

  // Controla al compañero de sparring y mantiene a los dos sanos.
  update(dt) {
    const { fight, player } = this.ctx, d = this.dummy, c = d.ctl, s = this.step;
    fight.clock = fight.roundSeconds;
    for (const f of fight.f) { f.dmg.head = Math.min(f.dmg.head, 40); f.dmg.legs = Math.min(f.dmg.legs, 40); f.dmg.body = Math.min(f.dmg.body, 40); }
    this.moved += Math.abs(player.x - this.lastX); this.lastX = player.x;
    if (s.check && s.check(this)) this.advance();
    c.left = c.right = false;
    if (d.ground) return;
    const dist = Math.abs(player.x - d.x);
    const want = s.dummy ? 30 : 36;
    if (dist > want + 6) { if (player.x < d.x) c.left = true; else c.right = true; }
    if (s.dummy && d.canAct) {
      this.dummyT -= dt;
      if (this.dummyT <= 0 && dist < 44) { c.press(s.dummy); this.dummyT = 1.6; }
    }
  }

  destroy() { this.box.hidden = true; this.box.innerHTML = ''; }
}
