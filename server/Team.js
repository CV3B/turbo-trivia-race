const { TEAM_COLORS, TEAM_NAMES } = require('./constants');

class Team {
  constructor(index) {
    this.index = index;
    this.name = TEAM_NAMES[index];
    this.color = TEAM_COLORS[index];
    this.progress = 0.0;  // 0.0 to 1.0
    this.totalScore = 0;
    this.roundsWon = 0;
  }

  getPlayers(allPlayers) {
    return allPlayers.filter(p => p.teamIndex === this.index && p.connected);
  }

  advanceProgress(amount) {
    this.progress = Math.min(1.0, this.progress + amount);
  }

  toJSON() {
    return {
      index: this.index,
      name: this.name,
      color: this.color,
      progress: this.progress,
      totalScore: this.totalScore,
      roundsWon: this.roundsWon
    };
  }
}

module.exports = Team;
