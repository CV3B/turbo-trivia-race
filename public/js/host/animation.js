// Animation and tweening system
const Animation = {
  tweens: [],
  particles: [],

  // Create a tween
  tween(obj, prop, target, duration, easing = Utils.easeOutCubic) {
    const start = obj[prop];
    const startTime = performance.now();

    return new Promise(resolve => {
      this.tweens.push({
        obj, prop, start, target, duration, easing, startTime,
        resolve
      });
    });
  },

  // Spawn particles at position
  spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 30 + Math.random() * 60;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        color,
        size: 2 + Math.random() * 3
      });
    }
  },

  // Spawn celebration particles
  spawnCelebration(x, y) {
    const colors = ['#ff4444', '#4488ff', '#44ff44', '#ffaa00', '#ff44aa', '#00ccff'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 100;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 1.0,
        decay: 0.008 + Math.random() * 0.012,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4
      });
    }
  },

  // Update all animations
  update(dt) {
    const now = performance.now();

    // Update tweens
    this.tweens = this.tweens.filter(t => {
      const elapsed = now - t.startTime;
      const progress = Math.min(1, elapsed / t.duration);
      const easedProgress = t.easing(progress);

      t.obj[t.prop] = t.start + (t.target - t.start) * easedProgress;

      if (progress >= 1) {
        t.obj[t.prop] = t.target;
        t.resolve();
        return false;
      }
      return true;
    });

    // Update particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt; // gravity
      p.life -= p.decay;
      return p.life > 0;
    });
  },

  // Render particles on canvas
  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },

  clear() {
    this.tweens = [];
    this.particles = [];
  }
};
