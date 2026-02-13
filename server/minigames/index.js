const SpeedTypeGame = require('./SpeedTypeGame');
const ReactionGame = require('./ReactionGame');
const EmojiDecoderGame = require('./EmojiDecoderGame');
const QuickMathGame = require('./QuickMathGame');
const UnscrambleGame = require('./UnscrambleGame');

const games = [
  new SpeedTypeGame(),
  new ReactionGame(),
  new EmojiDecoderGame(),
  new QuickMathGame(),
  new UnscrambleGame()
];

module.exports = {
  getAll() {
    return games;
  },

  get(id) {
    return games.find(g => g.id === id);
  }
};
