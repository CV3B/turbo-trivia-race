const { loadPack, listPacks } = require('./trivia/loader');
const { TRIVIA_BASE_SCORE, TRIVIA_SPEED_BONUS_MAX, TRIVIA_TIME_LIMIT } = require('./constants');

class TriviaEngine {
  constructor() {
    this.packs = {};
    this.usedQuestions = new Set();
  }

  loadPacks(packIds) {
    for (const id of packIds) {
      this.packs[id] = loadPack(id);
    }
  }

  getAvailablePacks() {
    return listPacks();
  }

  getRandomQuestion() {
    const allQuestions = [];
    for (const [packId, pack] of Object.entries(this.packs)) {
      for (let i = 0; i < pack.questions.length; i++) {
        const key = `${packId}:${i}`;
        if (!this.usedQuestions.has(key)) {
          allQuestions.push({ ...pack.questions[i], _key: key });
        }
      }
    }

    if (allQuestions.length === 0) {
      // Reset if all questions used
      this.usedQuestions.clear();
      return this.getRandomQuestion();
    }

    const idx = Math.floor(Math.random() * allQuestions.length);
    const question = allQuestions[idx];
    this.usedQuestions.add(question._key);

    return {
      question: question.question,
      options: question.options,
      answer: question.answer
    };
  }

  scoreAnswer(answerIndex, correctAnswer, answerTime, timeLimit) {
    if (answerIndex !== correctAnswer) return 0;

    const elapsed = answerTime || timeLimit;
    const timeRatio = Math.max(0, 1 - (elapsed / timeLimit));
    const speedBonus = Math.round(TRIVIA_SPEED_BONUS_MAX * timeRatio);

    return TRIVIA_BASE_SCORE + speedBonus;
  }
}

module.exports = TriviaEngine;
