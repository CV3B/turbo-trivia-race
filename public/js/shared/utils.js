// Shared utility functions
const Utils = {
  // Show one screen, hide all others
  showScreen(screenId, screens) {
    for (const id of screens) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== screenId);
    }
  },

  // Simple lerp
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Ease out cubic
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  // Ease in out
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  // Format percentage
  formatPercent(value) {
    return Math.round(value * 100) + '%';
  },

  // Create element helper
  el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') element.className = value;
      else if (key === 'text') element.textContent = value;
      else if (key === 'html') element.innerHTML = value;
      else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
      else element.setAttribute(key, value);
    }
    for (const child of children) {
      if (typeof child === 'string') element.appendChild(document.createTextNode(child));
      else if (child) element.appendChild(child);
    }
    return element;
  },

  // Show a toast notification
  showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  },

  // Team colors
  TEAM_COLORS: ['#ff4444', '#4488ff', '#44ff44', '#ffaa00', '#ff44ff', '#00ffcc', '#ff8844', '#aaff00'],
  TEAM_NAMES: ['Red Rockets', 'Blue Blazers', 'Green Machines', 'Gold Gears', 'Purple Panthers', 'Cyan Comets', 'Orange Outlaws', 'Lime Legends'],
};
