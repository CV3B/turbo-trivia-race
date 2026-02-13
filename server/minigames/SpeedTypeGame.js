const phrases = [
  "the quick brown fox",
  "turbo trivia race",
  "speed is everything",
  "pixel perfect victory",
  "race to the finish",
  "type it out now",
  "winner takes all",
  "fast and furious",
  "checkered flag ahead",
  "neon arcade dreams",
  "press start to play",
  "level up champion",
  "full throttle mode",
  "retro racing glory",
  "nitro boost active"
];

class SpeedTypeGame {
  constructor() {
    this.id = 'speed-type';
    this.name = 'Speed Type!';
    this.timeLimit = 15000;
  }

  setup(room) {
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this._currentPhrase = phrase;
    this._submissions = {};
    return {
      instructions: 'Type the phrase as fast as you can!',
      phrase
    };
  }

  handleInput(player, input, round) {
    if (this._submissions[player.id]) return null;

    if (input.type === 'speed-type' && input.text) {
      const typed = input.text.trim().toLowerCase();
      const target = this._currentPhrase.toLowerCase();

      if (typed === target) {
        const elapsed = Date.now() - round.startTime;
        this._submissions[player.id] = elapsed;
        return { message: `Done in ${(elapsed / 1000).toFixed(1)}s!` };
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

    // Find fastest time
    const times = Object.values(submissions);
    const fastest = times.length > 0 ? Math.min(...times) : round.timeLimit;

    for (const player of room.players) {
      if (player.teamIndex < 0 || !player.connected) continue;

      if (submissions[player.id]) {
        const time = submissions[player.id];
        // Score based on speed: 150 for fastest, scaling down
        const ratio = fastest / time;
        scores[player.id] = Math.round(150 * ratio);
      } else {
        scores[player.id] = 0;
      }
    }

    return scores;
  }
}

module.exports = SpeedTypeGame;
