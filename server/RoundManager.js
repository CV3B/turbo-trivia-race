const TriviaEngine = require('./TriviaEngine');
const { TRIVIA_TIME_LIMIT, TRIVIA_SHOW_RESULTS_TIME, ROUND_TYPE, MINI_GAME_CHANCE } = require('./constants');

class RoundManager {
  constructor(room) {
    this.room = room;
    this.triviaEngine = new TriviaEngine();
    this.miniGameEngine = null;
    this.currentRound = null;
    this.roundNumber = 0;
    this.roundTimer = null;
    this.answeredPlayers = new Set();
  }

  init(packIds) {
    this.triviaEngine.loadPacks(packIds || ['general-knowledge']);
    try {
      const MiniGameEngine = require('./MiniGameEngine');
      this.miniGameEngine = new MiniGameEngine();
    } catch (e) {
      // Mini-games not yet available
    }
  }

  startNextRound() {
    this.roundNumber++;
    this.answeredPlayers.clear();

    // Reset all player round state
    for (const player of this.room.players) {
      player.resetRoundState();
    }

    // Decide round type
    let roundType = ROUND_TYPE.TRIVIA;
    if (this.miniGameEngine && this.miniGameEngine.hasGames() && Math.random() < MINI_GAME_CHANCE) {
      roundType = ROUND_TYPE.MINI_GAME;
    }

    if (roundType === ROUND_TYPE.TRIVIA) {
      return this.startTriviaRound();
    } else {
      return this.startMiniGameRound();
    }
  }

  startTriviaRound() {
    const question = this.triviaEngine.getRandomQuestion();
    this.currentRound = {
      type: ROUND_TYPE.TRIVIA,
      number: this.roundNumber,
      question: question.question,
      options: question.options,
      correctAnswer: question.answer,
      startTime: Date.now(),
      timeLimit: TRIVIA_TIME_LIMIT,
      scores: {}
    };

    // Set server-authoritative timer
    this.roundTimer = setTimeout(() => {
      this.endTriviaRound();
    }, TRIVIA_TIME_LIMIT);

    return {
      type: ROUND_TYPE.TRIVIA,
      number: this.roundNumber,
      question: question.question,
      options: question.options,
      timeLimit: TRIVIA_TIME_LIMIT
    };
  }

  startMiniGameRound() {
    const game = this.miniGameEngine.pickRandom();
    const setup = game.setup(this.room);

    this.currentRound = {
      type: ROUND_TYPE.MINI_GAME,
      number: this.roundNumber,
      game: game,
      gameId: game.id,
      startTime: Date.now(),
      timeLimit: game.timeLimit,
      scores: {}
    };

    this.roundTimer = setTimeout(() => {
      this.endMiniGameRound();
    }, game.timeLimit);

    return {
      type: ROUND_TYPE.MINI_GAME,
      number: this.roundNumber,
      gameId: game.id,
      gameName: game.name,
      timeLimit: game.timeLimit,
      ...setup
    };
  }

  handleAnswer(player, answerIndex) {
    if (!this.currentRound || this.currentRound.type !== ROUND_TYPE.TRIVIA) return null;
    if (this.answeredPlayers.has(player.id)) return null;

    this.answeredPlayers.add(player.id);
    const elapsed = Date.now() - this.currentRound.startTime;
    player.answerTime = elapsed;
    player.currentAnswer = answerIndex;

    const score = this.triviaEngine.scoreAnswer(
      answerIndex,
      this.currentRound.correctAnswer,
      elapsed,
      this.currentRound.timeLimit
    );
    player.roundScore = score;
    this.currentRound.scores[player.id] = score;

    // Check if all connected players answered
    const activePlayers = this.room.players.filter(p => p.connected && p.teamIndex >= 0);
    if (this.answeredPlayers.size >= activePlayers.length) {
      clearTimeout(this.roundTimer);
      this.endTriviaRound();
    }

    return { correct: answerIndex === this.currentRound.correctAnswer, score };
  }

  handleMiniGameInput(player, input) {
    if (!this.currentRound || this.currentRound.type !== ROUND_TYPE.MINI_GAME) return null;
    const result = this.currentRound.game.handleInput(player, input, this.currentRound);

    // Check if all active players have submitted — end early if so
    if (this.currentRound && this.currentRound.game.getSubmissionCount) {
      const activePlayers = this.room.players.filter(p => p.connected && p.teamIndex >= 0);
      if (this.currentRound.game.getSubmissionCount() >= activePlayers.length) {
        clearTimeout(this.roundTimer);
        this.endMiniGameRound();
      }
    }

    return result;
  }

  endTriviaRound() {
    if (!this.currentRound) return;
    clearTimeout(this.roundTimer);

    const round = this.currentRound;
    const teamScores = this.calculateTeamScores();

    const results = {
      type: ROUND_TYPE.TRIVIA,
      number: round.number,
      correctAnswer: round.correctAnswer,
      teamScores,
      playerScores: {},
      showTime: TRIVIA_SHOW_RESULTS_TIME
    };

    // Compile player results
    for (const player of this.room.players) {
      if (player.teamIndex >= 0) {
        results.playerScores[player.id] = {
          name: player.name,
          answer: player.currentAnswer,
          correct: player.currentAnswer === round.correctAnswer,
          score: player.roundScore,
          time: player.answerTime
        };
      }
    }

    this.currentRound = null;
    this.room.onRoundEnd(results);
  }

  endMiniGameRound() {
    if (!this.currentRound) return;
    clearTimeout(this.roundTimer);

    const scores = this.currentRound.game.score(this.currentRound, this.room);
    const round = this.currentRound;

    // Apply scores to players
    for (const [playerId, score] of Object.entries(scores)) {
      const player = this.room.players.find(p => p.id === playerId);
      if (player) player.roundScore = score;
    }

    const teamScores = this.calculateTeamScores();

    const results = {
      type: ROUND_TYPE.MINI_GAME,
      number: round.number,
      gameId: round.gameId,
      teamScores,
      playerScores: scores,
      showTime: TRIVIA_SHOW_RESULTS_TIME
    };

    this.currentRound = null;
    this.room.onRoundEnd(results);
  }

  calculateTeamScores() {
    const teamScores = [];

    for (const team of this.room.teams) {
      const teamPlayers = team.getPlayers(this.room.players);
      if (teamPlayers.length === 0) {
        teamScores.push({ teamIndex: team.index, score: 0, avgScore: 0 });
        continue;
      }

      const totalScore = teamPlayers.reduce((sum, p) => sum + p.roundScore, 0);
      const avgScore = totalScore / teamPlayers.length;  // Normalize by team size

      team.totalScore += totalScore;
      teamScores.push({ teamIndex: team.index, score: avgScore, avgScore });
    }

    // Mark round winner
    const maxScore = Math.max(...teamScores.map(ts => ts.score));
    for (const ts of teamScores) {
      ts.isWinner = ts.score === maxScore && maxScore > 0;
      if (ts.isWinner) {
        this.room.teams[ts.teamIndex].roundsWon++;
      }
    }

    return teamScores;
  }

  cleanup() {
    clearTimeout(this.roundTimer);
    this.currentRound = null;
  }
}

module.exports = RoundManager;
