const Room = require('./Room');
const Player = require('./Player');
const { ROOM_CODE_LENGTH, RECONNECT_TIMEOUT, PHASE } = require('./constants');
const { listPacks } = require('./trivia/loader');

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();       // code -> Room
    this.socketToRoom = new Map(); // socketId -> code
    this.hostSockets = new Set();  // socketIds that are hosts
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I or O (confusing)
    let code;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId) {
    const code = this.generateCode();
    const room = new Room(code, hostSocketId, this.io);
    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);
    this.hostSockets.add(hostSocketId);
    return room;
  }

  joinRoom(code, socketId, playerName, reconnectToken) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (room.phase === PHASE.FINISHED) return { error: 'Game already finished' };

    // Check for reconnection
    if (reconnectToken) {
      const existing = room.findPlayerByToken(reconnectToken);
      if (existing) {
        existing.reconnect(socketId);
        this.socketToRoom.set(socketId, code);
        return { player: existing, room, reconnected: true };
      }
    }

    // New player
    if (room.phase !== PHASE.LOBBY) return { error: 'Game already in progress' };

    const player = new Player(socketId, playerName);
    if (!room.addPlayer(player)) {
      return { error: 'Room is full' };
    }

    this.socketToRoom.set(socketId, code);
    return { player, room, reconnected: false };
  }

  handleDisconnect(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return;
    }

    // If host disconnected
    if (this.hostSockets.has(socketId)) {
      this.hostSockets.delete(socketId);
      // Don't destroy room immediately - host might refresh
      // Set a timeout
      setTimeout(() => {
        if (room.hostSocketId === socketId) {
          this.destroyRoom(code);
        }
      }, RECONNECT_TIMEOUT);
      this.socketToRoom.delete(socketId);
      return { type: 'host', room };
    }

    // Player disconnected
    const player = room.findPlayerBySocket(socketId);
    if (player) {
      player.disconnect();
      this.socketToRoom.delete(socketId);

      // Schedule removal if no reconnect
      setTimeout(() => {
        if (!player.connected) {
          room.removePlayer(player.id);
          room.emitToHost('player:left', { playerId: player.id, playerName: player.name });
        }
      }, RECONNECT_TIMEOUT);

      return { type: 'player', room, player };
    }

    this.socketToRoom.delete(socketId);
  }

  reconnectHost(code, socketId) {
    const room = this.rooms.get(code);
    if (!room) return null;

    room.hostSocketId = socketId;
    this.socketToRoom.set(socketId, code);
    this.hostSockets.add(socketId);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  getRoomBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  destroyRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      if (room.roundManager) room.roundManager.cleanup();
      // Notify all players
      room.emitToPlayers('room:destroyed', { message: 'Host left the game' });
      this.rooms.delete(code);
    }
  }

  getAvailablePacks() {
    return listPacks();
  }
}

module.exports = GameManager;
