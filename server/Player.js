const crypto = require('crypto');

class Player {
  constructor(socketId, name) {
    this.id = crypto.randomUUID();
    this.socketId = socketId;
    this.name = name;
    this.teamIndex = -1;
    this.reconnectToken = crypto.randomUUID();
    this.connected = true;
    this.disconnectedAt = null;

    // Round state
    this.currentAnswer = null;
    this.answerTime = null;
    this.roundScore = 0;

    // Power-ups
    this.powerUps = [];
    this.shielded = false;
    this.skipNextAdvance = false;
  }

  disconnect() {
    this.connected = false;
    this.disconnectedAt = Date.now();
  }

  reconnect(newSocketId) {
    this.socketId = newSocketId;
    this.connected = true;
    this.disconnectedAt = null;
  }

  resetRoundState() {
    this.currentAnswer = null;
    this.answerTime = null;
    this.roundScore = 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      teamIndex: this.teamIndex,
      connected: this.connected,
      powerUps: this.powerUps.map(p => ({ id: p.id, name: p.name })),
      shielded: this.shielded
    };
  }
}

module.exports = Player;
