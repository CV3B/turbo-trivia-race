class ReactionGame {
  constructor() {
    this.id = 'reaction';
    this.name = 'Reaction Time!';
    this.timeLimit = 10000;
  }

  setup(room) {
    this._submissions = {};
    return {
      instructions: 'Wait for the green light, then tap as fast as you can! Tap too early = penalty!'
    };
  }

  handleInput(player, input, round) {
    if (this._submissions[player.id]) return null;

    if (input.type === 'reaction') {
      this._submissions[player.id] = input.time; // -1 means too early

      if (input.time === -1) {
        return { message: 'Too early! Penalty!' };
      } else {
        return { message: `${input.time}ms reaction time!` };
      }
    }
    return null;
  }

  getSubmissionCount() {
    return Object.keys(this._submissions).length;
  }

  score(round, room) {
    const scores = {};
    const submissions = this._submissions;

    // Filter valid times (exclude early taps)
    const validTimes = Object.entries(submissions)
      .filter(([_, time]) => time > 0)
      .map(([id, time]) => ({ id, time }));

    const fastest = validTimes.length > 0 ? Math.min(...validTimes.map(v => v.time)) : 1000;

    for (const player of room.players) {
      if (player.teamIndex < 0 || !player.connected) continue;

      const time = submissions[player.id];
      if (time === undefined) {
        // Didn't tap at all
        scores[player.id] = 0;
      } else if (time === -1) {
        // Tapped too early - penalty
        scores[player.id] = 0;
      } else {
        // Score based on reaction time (faster = higher)
        // Perfect score at 150ms, scales down to 0 at 1500ms
        const normalized = Math.max(0, 1 - (time - 100) / 1400);
        scores[player.id] = Math.round(150 * normalized);
      }
    }

    return scores;
  }
}

module.exports = ReactionGame;
