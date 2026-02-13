const { TRACK_PROGRESS_WIN, MAX_ADVANCE_PER_ROUND, MIN_ADVANCE_PER_ROUND } = require('./constants');

class RaceEngine {
  constructor(teams) {
    this.teams = teams;
  }

  /**
   * Advance cars based on round scores.
   * Winner gets MAX_ADVANCE, others proportional.
   * Scores are already normalized by team size.
   */
  advanceCars(teamScores) {
    if (!teamScores || teamScores.length === 0) return;

    const maxScore = Math.max(...teamScores.map(ts => ts.score));
    if (maxScore <= 0) return;

    const advances = {};

    for (const { teamIndex, score } of teamScores) {
      const team = this.teams[teamIndex];
      if (!team) continue;

      let advance = 0;
      if (score > 0) {
        const ratio = score / maxScore;
        advance = MIN_ADVANCE_PER_ROUND + (MAX_ADVANCE_PER_ROUND - MIN_ADVANCE_PER_ROUND) * ratio;
      }

      team.advanceProgress(advance);
      advances[teamIndex] = advance;
    }

    return advances;
  }

  checkWinner() {
    for (const team of this.teams) {
      if (team.progress >= TRACK_PROGRESS_WIN) {
        return team;
      }
    }
    return null;
  }

  getPositions() {
    return [...this.teams]
      .sort((a, b) => b.progress - a.progress)
      .map((team, i) => ({
        teamIndex: team.index,
        position: i + 1,
        progress: team.progress
      }));
  }

  getState() {
    return this.teams.map(t => t.toJSON());
  }
}

module.exports = RaceEngine;
