// Audio sintetizado con WebAudio (sin archivos): efectos, público y música chiptune.
class AudioEngine {
  constructor() { this.ctx = null; this.musicVol = 0.6; this.sfxVol = 0.8; this.musicOn = false; this.crowdLevel = 0; }

  // Debe llamarse tras un gesto del usuario.
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.connect(this.master);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  setVolumes(music, sfx) { this.musicVol = music / 100; this.sfxVol = sfx / 100; this.applyVolumes(); }
  applyVolumes() {
    if (!this.ctx) return;
    this.music.gain.value = this.musicVol * 0.35;
    this.sfx.gain.value = this.sfxVol * 0.9;
  }

  noise(dur, { type = 'lowpass', freq = 1000, q = 1, gain = 0.5, sweepTo = null, when = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }

  tone(freq, dur, { type = 'sine', gain = 0.4, slideTo = null, when = 0, dest = null } = {}) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }

  play(name, opt = {}) {
    if (!this.ctx || this.sfxVol <= 0) return;
    switch (name) {
      case 'punch': this.noise(0.07, { freq: 1400, gain: 0.5 }); this.tone(140, 0.08, { gain: 0.5, slideTo: 60 }); break;
      case 'heavy': this.noise(0.12, { freq: 900, gain: 0.7 }); this.tone(95, 0.16, { gain: 0.7, slideTo: 40 }); break;
      case 'kick': this.noise(0.1, { freq: 1100, gain: 0.6 }); this.tone(110, 0.12, { gain: 0.55, slideTo: 50 }); break;
      case 'block': this.noise(0.04, { type: 'highpass', freq: 2500, gain: 0.25 }); this.tone(520, 0.04, { type: 'square', gain: 0.08 }); break;
      case 'whoosh': this.noise(0.14, { type: 'bandpass', freq: 600, q: 2, gain: 0.25, sweepTo: 2400 }); break;
      case 'takedown': this.noise(0.25, { freq: 400, gain: 0.8 }); this.tone(60, 0.3, { gain: 0.7, slideTo: 35 }); break;
      case 'bell': for (let i = 0; i < (opt.times || 1); i++) for (const [f, g] of [[1046, 0.3], [1568, 0.15], [2093, 0.08]]) this.tone(f, 1.2, { gain: g, when: i * 0.32 }); break;
      case 'ko': this.tone(70, 0.6, { gain: 0.9, slideTo: 30 }); this.noise(0.6, { freq: 500, gain: 0.8 }); this.roar(1); break;
      case 'knockdown': this.tone(80, 0.4, { gain: 0.8, slideTo: 40 }); this.noise(0.3, { freq: 700, gain: 0.6 }); this.roar(0.7); break;
      case 'ui': this.tone(880, 0.05, { type: 'square', gain: 0.08 }); break;
      case 'uiBack': this.tone(440, 0.06, { type: 'square', gain: 0.07 }); break;
      case 'tap': this.tone(300 + Math.random() * 80, 0.03, { type: 'square', gain: 0.05 }); break;
      default: break;
    }
  }

  roar(level) { if (this.ctx) this.noise(2.2, { type: 'bandpass', freq: 900, q: 0.6, gain: 0.35 * level }); }

  startCrowd() {
    if (!this.ctx || this.crowdNode) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start();
    this.crowdNode = { src, g };
  }
  setCrowd(level) { if (this.crowdNode) this.crowdNode.g.gain.setTargetAtTime(0.04 + level * 0.12, this.ctx.currentTime, 0.3); }
  stopCrowd() { if (this.crowdNode) { this.crowdNode.src.stop(); this.crowdNode = null; } }

  // Música chiptune en bucle (La menor, 128 bpm).
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const bpm = 128, step = 60 / bpm / 2;
    const lead = [69, 0, 72, 0, 76, 74, 72, 0, 69, 0, 67, 69, 72, 0, 0, 0, 65, 0, 69, 0, 72, 71, 69, 0, 64, 0, 67, 0, 71, 0, 0, 0];
    const bass = [45, 45, 45, 45, 45, 45, 45, 45, 41, 41, 41, 41, 41, 41, 41, 41, 38, 38, 38, 38, 38, 38, 38, 38, 40, 40, 40, 40, 40, 40, 40, 40];
    const midi = n => 440 * Math.pow(2, (n - 69) / 12);
    let i = 0, next = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.musicOn) return;
      while (next < this.ctx.currentTime + 0.25) {
        const k = i % 32, when = next - this.ctx.currentTime;
        if (lead[k]) this.tone(midi(lead[k]), step * 0.9, { type: 'square', gain: 0.07, when, dest: this.music });
        if (k % 2 === 0) this.tone(midi(bass[k]), step * 1.8, { type: 'triangle', gain: 0.2, when, dest: this.music });
        if (k % 4 === 0) this.tone(150, 0.08, { type: 'sine', gain: 0.25, slideTo: 50, when, dest: this.music });
        if (k % 4 === 2) { const c = this.ctx, t = c.currentTime + when; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const g = c.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; s.connect(f); f.connect(g); g.connect(this.music); s.start(t); s.stop(t + 0.06); }
        next += step; i++;
      }
      this.musicTimer = setTimeout(tick, 60);
    };
    tick();
  }
  stopMusic() { this.musicOn = false; clearTimeout(this.musicTimer); }
}

export const audio = new AudioEngine();

export function vibrate(pattern, enabled) {
  if (enabled && navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* sin soporte */ } }
}
