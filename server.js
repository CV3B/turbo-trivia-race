const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameManager = require('./server/GameManager');

// Catch uncaught errors so the server doesn't silently crash
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// Game manager
const gm = new GameManager(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // --- HOST EVENTS ---

  socket.on('host:create', (callback) => {
    const room = gm.createRoom(socket.id);
    const packs = gm.getAvailablePacks();
    callback({ code: room.code, packs });
    console.log(`Room created: ${room.code} by ${socket.id}`);
  });

  socket.on('host:reconnect', ({ code }, callback) => {
    const room = gm.reconnectHost(code, socket.id);
    if (room) {
      callback({ success: true, state: room.getState() });
    } else {
      callback({ success: false });
    }
  });

  socket.on('host:settings', ({ numTeams, triviaPacks }) => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    if (numTeams) room.setTeamCount(numTeams);
    if (triviaPacks) room.triviaPacks = triviaPacks;
    room.emitToHost('lobby:update', room.getLobbyState());
  });

  socket.on('host:assignTeam', ({ playerId, teamIndex }) => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    room.assignTeam(playerId, teamIndex);
    room.emitToAll('lobby:update', room.getLobbyState());

    // Notify the player of their team assignment
    const player = room.findPlayerById(playerId);
    if (player) {
      room.emitToPlayer(player, 'team:assigned', { teamIndex });
    }
  });

  socket.on('host:autoAssign', () => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    room.autoAssignTeams();
    room.emitToAll('lobby:update', room.getLobbyState());

    // Notify all players
    for (const player of room.players) {
      room.emitToPlayer(player, 'team:assigned', { teamIndex: player.teamIndex });
    }
  });

  socket.on('host:start', () => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;

    if (room.players.length < 1) {
      socket.emit('error:message', { message: 'Need at least 1 player to start' });
      return;
    }

    if (room.startGame()) {
      room.emitToAll('game:started', { teams: room.teams.map(t => t.toJSON()), raceState: room.raceEngine.getState() });
      console.log(`Game started in room ${room.code}`);

      // Start first round after brief delay
      setTimeout(() => room.startNextRound(), 2000);
    }
  });

  socket.on('host:playAgain', () => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    room.resetGame();
    room.emitToAll('game:reset', room.getLobbyState());
    console.log(`Game reset in room ${room.code}`);
  });

  // --- PLAYER EVENTS ---

  socket.on('player:join', ({ code, name, reconnectToken }, callback) => {
    if (!code || !name) {
      callback({ error: 'Room code and name are required' });
      return;
    }

    const result = gm.joinRoom(code.toUpperCase(), socket.id, name.trim(), reconnectToken);

    if (result.error) {
      callback({ error: result.error });
      return;
    }

    const { player, room, reconnected } = result;
    callback({
      success: true,
      playerId: player.id,
      reconnectToken: player.reconnectToken,
      teamIndex: player.teamIndex,
      reconnected,
      phase: room.phase,
      roomState: room.phase === 'lobby' ? room.getLobbyState() : room.getState()
    });

    if (reconnected) {
      console.log(`Player reconnected: ${player.name} to ${room.code}`);
      room.emitToHost('player:reconnected', { player: player.toJSON() });
    } else {
      console.log(`Player joined: ${player.name} to ${room.code}`);
      room.emitToHost('lobby:update', room.getLobbyState());
    }
  });

  socket.on('player:answer', ({ answerIndex }) => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.findPlayerBySocket(socket.id);
    if (!player) return;
    room.handleAnswer(player, answerIndex);
  });

  socket.on('player:minigameInput', (input) => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.findPlayerBySocket(socket.id);
    if (!player) return;
    room.handleMiniGameInput(player, input);
  });

  socket.on('player:usePowerUp', ({ powerUpId, targetTeam }) => {
    const room = gm.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.findPlayerBySocket(socket.id);
    if (!player) return;
    // Power-up handling will be implemented in Phase 2
    if (room.powerUpManager) {
      room.powerUpManager.usePowerUp(player, powerUpId, targetTeam);
    }
  });

  // --- DISCONNECT ---

  socket.on('disconnect', () => {
    const result = gm.handleDisconnect(socket.id);
    if (result) {
      if (result.type === 'player' && result.room) {
        result.room.emitToHost('player:disconnected', {
          playerId: result.player.id,
          playerName: result.player.name
        });
        console.log(`Player disconnected: ${result.player.name}`);
      } else if (result.type === 'host') {
        console.log(`Host disconnected from room ${result.room.code}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Turbo Trivia Race server running on http://localhost:${PORT}`);
});
