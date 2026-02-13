const Team = require('./Team');
const RaceEngine = require('./RaceEngine');
const RoundManager = require('./RoundManager');
const { PHASE, MAX_PLAYERS_PER_ROOM, MIN_TEAMS, MAX_TEAMS, TRIVIA_SHOW_RESULTS_TIME } = require('./constants');

class Room {
  constructor(code, hostSocketId, io) {
    this.code = code;
    this.hostSocketId = hostSocketId;
    this.io = io;
    this.phase = PHASE.LOBBY;
    this.players = [];
    this.teams = [];
    this.numTeams = 2;
    this.raceEngine = null;
    this.roundManager = null;
    this.roundInProgress = false;
    this.createdAt = Date.now();

    // Settings
    this.triviaPacks = ['general-knowledge'];
  }

  addPlayer(player) {
    if (this.players.length >= MAX_PLAYERS_PER_ROOM) return false;
    this.players.push(player);
    return true;
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      this.players.splice(idx, 1);
      return true;
    }
    return false;
  }

  findPlayerBySocket(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  findPlayerByToken(token) {
    return this.players.find(p => p.reconnectToken === token);
  }

  findPlayerById(id) {
    return this.players.find(p => p.id === id);
  }

  setTeamCount(count) {
    this.numTeams = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, count));
  }

  assignTeam(playerId, teamIndex) {
    const player = this.findPlayerById(playerId);
    if (player && teamIndex >= 0 && teamIndex < this.numTeams) {
      player.teamIndex = teamIndex;
      return true;
    }
    return false;
  }

  autoAssignTeams() {
    const unassigned = this.players.filter(p => p.teamIndex === -1);
    unassigned.forEach((player, i) => {
      player.teamIndex = i % this.numTeams;
    });
  }

  startGame() {
    if (this.phase !== PHASE.LOBBY) return false;

    // Ensure all players are assigned
    this.autoAssignTeams();

    // Create teams
    this.teams = [];
    for (let i = 0; i < this.numTeams; i++) {
      this.teams.push(new Team(i));
    }

    // Init engines
    this.raceEngine = new RaceEngine(this.teams);
    this.roundManager = new RoundManager(this);
    this.roundManager.init(this.triviaPacks);

    this.phase = PHASE.RACING;
    return true;
  }

  startNextRound() {
    if (this.phase !== PHASE.RACING || this.roundInProgress) return;
    this.roundInProgress = true;

    const roundData = this.roundManager.startNextRound();

    // Send to host
    this.emitToHost('round:start', roundData);

    // Send to players (without correct answer)
    this.emitToPlayers('round:start', {
      type: roundData.type,
      number: roundData.number,
      question: roundData.question,
      options: roundData.options,
      timeLimit: roundData.timeLimit,
      gameId: roundData.gameId,
      gameName: roundData.gameName,
      // Include mini-game specific data
      ...(roundData.phrase !== undefined && { phrase: roundData.phrase }),
      ...(roundData.instructions !== undefined && { instructions: roundData.instructions })
    });
  }

  handleAnswer(player, answerIndex) {
    if (!this.roundInProgress) return;
    const result = this.roundManager.handleAnswer(player, answerIndex);
    if (result) {
      // Send individual feedback to player
      this.emitToPlayer(player, 'answer:result', result);
      // Update host with answer count
      this.emitToHost('answer:received', {
        playerId: player.id,
        playerName: player.name,
        teamIndex: player.teamIndex
      });
    }
  }

  handleMiniGameInput(player, input) {
    if (!this.roundInProgress) return;
    const result = this.roundManager.handleMiniGameInput(player, input);
    if (result) {
      this.emitToPlayer(player, 'minigame:result', result);
      this.emitToHost('minigame:update', {
        playerId: player.id,
        playerName: player.name,
        ...result
      });
    }
  }

  onRoundEnd(results) {
    this.roundInProgress = false;

    // Advance cars based on scores
    const advances = this.raceEngine.advanceCars(results.teamScores);
    results.advances = advances;
    results.raceState = this.raceEngine.getState();
    results.positions = this.raceEngine.getPositions();

    // Check for winner
    const winner = this.raceEngine.checkWinner();
    if (winner) {
      results.winner = winner.toJSON();
      this.phase = PHASE.FINISHED;
    }

    // Send results to everyone
    this.emitToHost('round:results', results);
    this.emitToPlayers('round:results', results);

    // If game continues, schedule next round
    if (!winner) {
      setTimeout(() => {
        if (this.phase === PHASE.RACING) {
          this.startNextRound();
        }
      }, TRIVIA_SHOW_RESULTS_TIME);
    } else {
      this.emitToHost('game:finished', { winner: winner.toJSON(), teams: this.teams.map(t => t.toJSON()) });
      this.emitToPlayers('game:finished', { winner: winner.toJSON(), teams: this.teams.map(t => t.toJSON()) });
    }
  }

  resetGame() {
    this.phase = PHASE.LOBBY;
    this.teams = [];
    this.raceEngine = null;
    this.roundInProgress = false;
    if (this.roundManager) {
      this.roundManager.cleanup();
      this.roundManager = null;
    }
    for (const player of this.players) {
      player.teamIndex = -1;
      player.resetRoundState();
      player.powerUps = [];
      player.shielded = false;
      player.skipNextAdvance = false;
    }
  }

  // Socket emission helpers
  emitToHost(event, data) {
    this.io.to(this.hostSocketId).emit(event, data);
  }

  emitToPlayers(event, data) {
    for (const player of this.players) {
      if (player.connected) {
        this.io.to(player.socketId).emit(event, data);
      }
    }
  }

  emitToPlayer(player, event, data) {
    if (player.connected) {
      this.io.to(player.socketId).emit(event, data);
    }
  }

  emitToAll(event, data) {
    this.emitToHost(event, data);
    this.emitToPlayers(event, data);
  }

  getState() {
    return {
      code: this.code,
      phase: this.phase,
      players: this.players.map(p => p.toJSON()),
      teams: this.teams.map(t => t.toJSON()),
      numTeams: this.numTeams,
      raceState: this.raceEngine ? this.raceEngine.getState() : null,
      positions: this.raceEngine ? this.raceEngine.getPositions() : null
    };
  }

  getLobbyState() {
    return {
      code: this.code,
      players: this.players.map(p => p.toJSON()),
      numTeams: this.numTeams,
      triviaPacks: this.triviaPacks
    };
  }
}

module.exports = Room;
