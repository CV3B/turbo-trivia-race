function generateProblem() {
  const ops = [
    () => {
      const a = Math.floor(Math.random() * 50) + 2;
      const b = Math.floor(Math.random() * 50) + 2;
      return { text: `${a} + ${b}`, answer: a + b };
    },
    () => {
      const a = Math.floor(Math.random() * 80) + 20;
      const b = Math.floor(Math.random() * a) + 1;
      return { text: `${a} - ${b}`, answer: a - b };
    },
    () => {
      const a = Math.floor(Math.random() * 20) + 2;
      const b = Math.floor(Math.random() * 12) + 2;
      return { text: `${a} × ${b}`, answer: a * b };
    },
    () => {
      const a = Math.floor(Math.random() * 20) + 2;
      const b = Math.floor(Math.random() * 12) + 2;
      const c = Math.floor(Math.random() * 30) + 1;
      return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
    },
    () => {
      const a = Math.floor(Math.random() * 30) + 10;
      const b = Math.floor(Math.random() * 20) + 2;
      const c = Math.floor(Math.random() * 10) + 1;
      return { text: `${a} + ${b} - ${c}`, answer: a + b - c };
    },
  ];

  return ops[Math.floor(Math.random() * ops.length)]();
}

class QuickMathGame {
  constructor() {
    this.id = 'quick-math';
    this.name = 'Quick Math!';
    this.timeLimit = 12000;
  }

  setup(room) {
    const problem = generateProblem();
    this._correctAnswer = problem.answer;
    this._submissions = {};
    return {
      instructions: 'Solve the math problem!',
      problem: problem.text + ' = ?'
    };
  }

  handleInput(player, input, round) {
    if (this._submissions[player.id]) return null;

    if (input.type === 'quick-math' && input.answer !== undefined) {
      const numAnswer = parseInt(input.answer, 10);

      if (numAnswer === this._correctAnswer) {
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

module.exports = QuickMathGame;
