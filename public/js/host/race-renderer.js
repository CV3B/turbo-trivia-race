// Canvas race track renderer at 480x270 internal resolution
const RaceRenderer = {
  canvas: null,
  ctx: null,
  offscreenCanvas: null,
  offscreenCtx: null,
  width: 480,
  height: 270,

  // Track waypoints (oval) - these define the center of the road
  trackWaypoints: [],
  trackWidth: 30,

  // Car display state
  cars: [],  // { teamIndex, color, name, displayProgress, targetProgress, x, y, angle }

  // Finish line position on track (progress value)
  finishLineProgress: 0.0,

  // Track colors
  colors: {
    grass: '#1a5c1a',
    grassLight: '#1e6b1e',
    road: '#444455',
    roadEdge: '#ffff66',
    roadCenter: '#666677',
    finish: '#ffffff',
    finishAlt: '#111111'
  },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = this.width;
    canvas.height = this.height;

    // Offscreen canvas for static track
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');

    // Generate oval track waypoints
    this.generateTrackWaypoints();

    // Render static track
    this.renderStaticTrack();

    // Scale canvas to fit container
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  generateTrackWaypoints() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const rx = 190; // horizontal radius
    const ry = 95;  // vertical radius
    const numPoints = 200;

    this.trackWaypoints = [];
    for (let i = 0; i < numPoints; i++) {
      // Start at bottom-center, go clockwise
      const angle = (Math.PI / 2) + (Math.PI * 2 * i) / numPoints;
      this.trackWaypoints.push({
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry
      });
    }
  },

  getTrackPosition(progress) {
    const totalPoints = this.trackWaypoints.length;
    const exactIdx = (progress % 1.0) * totalPoints;
    const idx = Math.floor(exactIdx);
    const frac = exactIdx - idx;

    const p1 = this.trackWaypoints[idx % totalPoints];
    const p2 = this.trackWaypoints[(idx + 1) % totalPoints];

    return {
      x: Utils.lerp(p1.x, p2.x, frac),
      y: Utils.lerp(p1.y, p2.y, frac)
    };
  },

  getTrackAngle(progress) {
    const totalPoints = this.trackWaypoints.length;
    const idx = Math.floor((progress % 1.0) * totalPoints);
    const p1 = this.trackWaypoints[idx % totalPoints];
    const p2 = this.trackWaypoints[(idx + 1) % totalPoints];
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  },

  renderStaticTrack() {
    const ctx = this.offscreenCtx;

    // Grass background with checker pattern
    ctx.fillStyle = this.colors.grass;
    ctx.fillRect(0, 0, this.width, this.height);

    // Light grass patches
    for (let x = 0; x < this.width; x += 16) {
      for (let y = 0; y < this.height; y += 16) {
        if ((x + y) % 32 === 0) {
          ctx.fillStyle = this.colors.grassLight;
          ctx.fillRect(x, y, 16, 16);
        }
      }
    }

    // Draw road
    ctx.strokeStyle = this.colors.road;
    ctx.lineWidth = this.trackWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    this.trackWaypoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Road edge lines (yellow dashes)
    for (const offset of [-1, 1]) {
      ctx.strokeStyle = this.colors.roadEdge;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);

      ctx.beginPath();
      this.trackWaypoints.forEach((p, i) => {
        const next = this.trackWaypoints[(i + 1) % this.trackWaypoints.length];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len * (this.trackWidth / 2 - 1) * offset;
        const ny = dx / len * (this.trackWidth / 2 - 1) * offset;

        if (i === 0) ctx.moveTo(p.x + nx, p.y + ny);
        else ctx.lineTo(p.x + nx, p.y + ny);
      });
      ctx.closePath();
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road center dashes
    ctx.strokeStyle = this.colors.roadCenter;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    this.trackWaypoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Finish line (checkered pattern at progress = 0/1)
    this.renderFinishLine(ctx);

    // Decorations
    this.renderDecorations(ctx);
  },

  renderFinishLine(ctx) {
    const pos = this.getTrackPosition(0);
    const angle = this.getTrackAngle(0);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    const halfWidth = this.trackWidth / 2;
    const checkerSize = 4;
    const rows = Math.ceil(halfWidth * 2 / checkerSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const isWhite = (r + c) % 2 === 0;
        ctx.fillStyle = isWhite ? this.colors.finish : this.colors.finishAlt;

        const startX = pos.x + perpX * (-halfWidth + r * checkerSize) + Math.cos(angle) * (c - 1) * checkerSize;
        const startY = pos.y + perpY * (-halfWidth + r * checkerSize) + Math.sin(angle) * (c - 1) * checkerSize;

        ctx.fillRect(Math.round(startX), Math.round(startY), checkerSize, checkerSize);
      }
    }
  },

  renderDecorations(ctx) {
    // Simple pixel trees around the track
    const treePositions = [
      { x: 50, y: 40 }, { x: 120, y: 30 }, { x: 240, y: 20 },
      { x: 360, y: 30 }, { x: 430, y: 45 },
      { x: 50, y: 230 }, { x: 150, y: 245 }, { x: 240, y: 250 },
      { x: 350, y: 245 }, { x: 430, y: 225 },
      { x: 240, y: 135 }, { x: 200, y: 120 }, { x: 280, y: 120 },
      { x: 200, y: 150 }, { x: 280, y: 150 }
    ];

    for (const { x, y } of treePositions) {
      // Trunk
      ctx.fillStyle = '#553311';
      ctx.fillRect(x - 1, y, 3, 5);
      // Canopy
      ctx.fillStyle = '#116611';
      ctx.fillRect(x - 3, y - 4, 7, 5);
      ctx.fillRect(x - 2, y - 6, 5, 3);
    }
  },

  setupCars(teams) {
    this.cars = teams.map((team, i) => ({
      teamIndex: team.index,
      color: team.color,
      name: team.name,
      displayProgress: 0,
      targetProgress: 0,
      x: 0,
      y: 0,
      angle: 0,
      laneOffset: (i - (teams.length - 1) / 2) * 6  // Spread cars across lanes
    }));
  },

  updateCarTargets(raceState) {
    if (!raceState) return;
    for (const teamState of raceState) {
      const car = this.cars.find(c => c.teamIndex === teamState.index);
      if (car) {
        car.targetProgress = teamState.progress;
      }
    }
  },

  update(dt) {
    // Smoothly interpolate car positions
    for (const car of this.cars) {
      const diff = car.targetProgress - car.displayProgress;
      if (Math.abs(diff) > 0.0001) {
        car.displayProgress += diff * Math.min(1, dt * 3);
      } else {
        car.displayProgress = car.targetProgress;
      }

      // Get position on track
      const pos = this.getTrackPosition(car.displayProgress);
      const angle = this.getTrackAngle(car.displayProgress);

      // Apply lane offset perpendicular to track direction
      car.x = pos.x + Math.cos(angle + Math.PI / 2) * car.laneOffset;
      car.y = pos.y + Math.sin(angle + Math.PI / 2) * car.laneOffset;
      car.angle = angle;
    }

    // Update animations
    Animation.update(dt);
  },

  render() {
    const ctx = this.ctx;

    // Draw cached static track
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    // Draw cars (sorted by progress so leaders drawn on top)
    const sortedCars = [...this.cars].sort((a, b) => a.displayProgress - b.displayProgress);

    for (const car of sortedCars) {
      this.renderCar(ctx, car);
    }

    // Draw particles
    Animation.renderParticles(ctx);
  },

  renderCar(ctx, car) {
    ctx.save();
    ctx.translate(Math.round(car.x), Math.round(car.y));
    ctx.rotate(car.angle);

    // Car body (rectangle)
    const w = 12;
    const h = 7;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w, h);

    // Body
    ctx.fillStyle = car.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Windshield
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(w / 2 - 4, -h / 2 + 1, 2, h - 2);

    // Wheels
    ctx.fillStyle = '#222222';
    ctx.fillRect(-w / 2, -h / 2 - 1, 3, 2);
    ctx.fillRect(-w / 2, h / 2 - 1, 3, 2);
    ctx.fillRect(w / 2 - 3, -h / 2 - 1, 3, 2);
    ctx.fillRect(w / 2 - 3, h / 2 - 1, 3, 2);

    ctx.restore();

    // Name label above car
    ctx.fillStyle = car.color;
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(car.name.split(' ')[0], Math.round(car.x), Math.round(car.y) - 8);
  },

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const scaleX = containerW / this.width;
    const scaleY = containerH / this.height;
    const scale = Math.min(scaleX, scaleY);

    this.canvas.style.width = Math.floor(this.width * scale) + 'px';
    this.canvas.style.height = Math.floor(this.height * scale) + 'px';
  },

  // Main render loop
  startLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
};
