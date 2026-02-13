const puzzles = [
  { emojis: '🌍🔥', answer: 'global warming' },
  { emojis: '🏠📖', answer: 'homework' },
  { emojis: '⏰💣', answer: 'time bomb' },
  { emojis: '🌙🚶', answer: 'moonwalk' },
  { emojis: '🔥🚒', answer: 'fire truck' },
  { emojis: '⭐🐟', answer: 'starfish' },
  { emojis: '🌈🦄', answer: 'unicorn' },
  { emojis: '❄️🧊', answer: 'ice cold' },
  { emojis: '🌊🏄', answer: 'surfing' },
  { emojis: '🎂🎉', answer: 'birthday party' },
  { emojis: '🔑🗝️', answer: 'keyboard' },
  { emojis: '🐝🏠', answer: 'beehive' },
  { emojis: '👀🐮', answer: 'eyebrow' },
  { emojis: '🦷🧚', answer: 'tooth fairy' },
  { emojis: '🌻🌞', answer: 'sunflower' },
  { emojis: '🐴👟', answer: 'horseshoe' },
  { emojis: '🏖️⚽', answer: 'beach ball' },
  { emojis: '🍳🥞', answer: 'breakfast' },
  { emojis: '📱🤳', answer: 'selfie' },
  { emojis: '🎤🌟', answer: 'rock star' },
];

class EmojiDecoderGame {
  constructor() {
    this.id = 'emoji-decoder';
    this.name = 'Emoji Decoder!';
    this.timeLimit = 15000;
  }

  setup(room) {
    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    this._currentAnswer = puzzle.answer.toLowerCase();
    this._submissions = {};
    return {
      instructions: 'Decode the emoji phrase!',
      emojis: puzzle.emojis
    };
  }

  handleInput(player, input, round) {
    if (this._submissions[player.id]) return null;

    if (input.type === 'emoji-decoder' && input.text) {
      const typed = input.text.trim().toLowerCase();

      if (typed === this._currentAnswer) {
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

module.exports = EmojiDecoderGame;
