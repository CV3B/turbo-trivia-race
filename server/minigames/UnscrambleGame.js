const words = [
  'TRIVIA', 'RACING', 'TURBO', 'WINNER', 'ARCADE',
  'PLAYER', 'FINISH', 'TROPHY', 'ROCKET', 'DRAGON',
  'GALAXY', 'PIRATE', 'PLANET', 'CASTLE', 'FOREST',
  'KNIGHT', 'SHIELD', 'BRIDGE', 'TEMPLE', 'MYSTIC',
  'FALCON', 'VOYAGE', 'SPIRIT', 'IMPACT', 'LAUNCH',
  'HUNTER', 'BREEZE', 'COBALT', 'FROZEN', 'BLITZ',
];

function scrambleWord(word) {
  const chars = word.split('');
  // Fisher-Yates shuffle, ensure it's different from original
  for (let attempts = 0; attempts < 20; attempts++) {
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    if (chars.join('') !== word) break;
  }
  return chars.join('');
}

class UnscrambleGame {
  constructor() {
    this.id = 'unscramble';
    this.name = 'Unscramble!';
    this.timeLimit = 12000;
  }

  setup(room) {
    const word = words[Math.floor(Math.random() * words.length)];
    this._correctAnswer = word.toLowerCase();
    this._scrambled = scrambleWord(word);
    this._submissions = {};
    return {
      instructions: 'Unscramble the letters to form a word!',
      scrambled: this._scrambled
    };
  }

  handleInput(player, input, round) {
    if (this._submissions[player.id]) return null;

    if (input.type === 'unscramble' && input.text) {
      const typed = input.text.trim().toLowerCase();

      if (typed === this._correctAnswer) {
        const elapsed = Date.now() - round.startTime;
        this._submissions[player.id] = elapsed;
        return { message: `Correct in ${(elapsed / 1000).toFixed(1)}s!` };
      } else {
        return { message: 'Wrong, try again!' };
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

    const times = Object.values(submissions);
    const fastest = times.length > 0 ? Math.min(...times) : round.timeLimit;

    for (const player of room.players) {
      if (player.teamIndex < 0 || !player.connected) continue;

      if (submissions[player.id]) {
        const time = submissions[player.id];
        const ratio = fastest / time;
        scores[player.id] = Math.round(150 * ratio);
      } else {
        scores[player.id] = 0;
      }
    }

    return scores;
  }
}

module.exports = UnscrambleGame;
