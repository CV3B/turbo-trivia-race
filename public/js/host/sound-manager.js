// Sound manager using Web Audio API for retro sound effects
const SoundManager = {
  ctx: null,
  enabled: true,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // Generate a simple beep tone
  beep(frequency, duration, type = 'square', volume = 0.15) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  // Correct answer sound - rising arpeggio
  correct() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this.beep(523, 0.1, 'square', 0.12); // C
    setTimeout(() => this.beep(659, 0.1, 'square', 0.12), 80); // E
    setTimeout(() => this.beep(784, 0.15, 'square', 0.12), 160); // G
  },

  // Wrong answer sound - descending buzz
  wrong() {
    this.beep(200, 0.3, 'sawtooth', 0.1);
    setTimeout(() => this.beep(150, 0.3, 'sawtooth', 0.1), 150);
  },

  // Countdown tick
  tick() {
    this.beep(800, 0.05, 'square', 0.08);
  },

  // Round start
  roundStart() {
    this.beep(440, 0.1, 'square', 0.1);
    setTimeout(() => this.beep(660, 0.1, 'square', 0.1), 120);
    setTimeout(() => this.beep(880, 0.2, 'square', 0.1), 240);
  },

  // Victory fanfare
  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.beep(freq, 0.2, 'square', 0.12), i * 150);
    });
  },

  // Car advance
  advance() {
    this.beep(330, 0.08, 'triangle', 0.08);
    setTimeout(() => this.beep(440, 0.08, 'triangle', 0.08), 50);
  },

  // Nitro boost
  boost() {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => this.beep(200 + i * 80, 0.05, 'sawtooth', 0.06), i * 30);
    }
  },

  // Game start countdown
  countdownBeep(isLast) {
    if (isLast) {
      this.beep(880, 0.3, 'square', 0.15);
    } else {
      this.beep(440, 0.15, 'square', 0.1);
    }
  }
};
