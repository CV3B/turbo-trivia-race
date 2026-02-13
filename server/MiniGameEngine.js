const registry = require('./minigames/index');

class MiniGameEngine {
  constructor() {
    this.games = registry.getAll();
  }

  hasGames() {
    return this.games.length > 0;
  }

  pickRandom() {
    const idx = Math.floor(Math.random() * this.games.length);
    return this.games[idx];
  }

  getGame(id) {
    return this.games.find(g => g.id === id);
  }
}

module.exports = MiniGameEngine;
