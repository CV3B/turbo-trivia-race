// Host application - main controller
(function () {
  const socket = io();
  let roomCode = null;
  let gameState = null;
  let answerCount = 0;
  let totalPlayers = 0;
  let numTeams = 2;

  const screens = ['create-screen', 'lobby-screen', 'race-screen', 'victory-screen'];

  // Init sound
  SoundManager.init();

  // --- Create Game ---
  document.getElementById('create-btn').addEventListener('click', () => {
    SoundManager.resume();
    socket.emit('host:create', (response) => {
      roomCode = response.code;
      document.getElementById('room-code-display').textContent = roomCode;
      document.getElementById('lobby-url').textContent = `Go to ${window.location.origin} and enter code`;
      Utils.showScreen('lobby-screen', screens);
      SoundManager.roundStart();
    });
  });

  // --- Team count selector ---
  document.getElementById('team-count-selector').addEventListener('click', (e) => {
    const btn = e.target.closest('.team-count-btn');
    if (!btn) return;

    document.querySelectorAll('.team-count-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    numTeams = parseInt(btn.dataset.count);

    socket.emit('host:settings', { numTeams });
  });

  // --- Auto Assign ---
  document.getElementById('auto-assign-btn').addEventListener('click', () => {
    socket.emit('host:autoAssign');
  });

  // --- Start Game ---
  document.getElementById('start-btn').addEventListener('click', () => {
    socket.emit('host:start');
  });

  // --- Play Again ---
  document.getElementById('play-again-btn').addEventListener('click', () => {
    socket.emit('host:playAgain');
  });

  // --- Socket Events ---

  // Lobby updates
  socket.on('lobby:update', (state) => {
    gameState = state;
    numTeams = state.numTeams;
    UIManager.buildLobby(state, numTeams, socket);
  });

  // Game started
  socket.on('game:started', (data) => {
    Utils.showScreen('race-screen', screens);
    document.getElementById('header-room-code').textContent = roomCode;

    // Init race renderer
    RaceRenderer.init(document.getElementById('race-canvas'));
    RaceRenderer.setupCars(data.teams);
    RaceRenderer.startLoop();

    // Init sidebar
    UIManager.updateSidebar(
      data.teams.map((t, i) => ({ teamIndex: i, position: i + 1, progress: 0 })),
      data.raceState
    );

    totalPlayers = 0; // Will be updated
    SoundManager.roundStart();
  });

  // Round start
  socket.on('round:start', (data) => {
    answerCount = 0;
    UIManager.updateRoundCounter(data.number);

    if (data.type === 'trivia') {
      UIManager.showQuestion(data);
      SoundManager.roundStart();
    } else if (data.type === 'mini_game') {
      UIManager.showMiniGame(data);
      SoundManager.roundStart();
    }
  });

  // Answer received
  socket.on('answer:received', (data) => {
    answerCount++;
    UIManager.updateAnswerCount(answerCount, totalPlayers);
  });

  // Mini-game update
  socket.on('minigame:update', (data) => {
    const status = document.getElementById('minigame-status');
    if (status) {
      status.textContent = `${data.playerName}: ${data.message || 'submitted'}`;
    }
  });

  // Round results
  socket.on('round:results', (results) => {
    UIManager.stopTimer();

    // Reveal correct answer for trivia
    if (results.type === 'trivia' && results.correctAnswer !== undefined) {
      UIManager.revealAnswer(results.correctAnswer);
      SoundManager.correct();
    }

    // Update race state
    if (results.raceState) {
      RaceRenderer.updateCarTargets(results.raceState);
      SoundManager.advance();

      // Particles for advancing teams
      if (results.advances) {
        for (const [teamIdx, advance] of Object.entries(results.advances)) {
          if (advance > 0) {
            const car = RaceRenderer.cars.find(c => c.teamIndex === parseInt(teamIdx));
            if (car) {
              setTimeout(() => {
                Animation.spawnParticles(car.x, car.y, car.color, 6);
              }, 500);
            }
          }
        }
      }
    }

    // Show results overlay after brief delay
    setTimeout(() => {
      if (results.positions) {
        UIManager.updateSidebar(results.positions, results.raceState);
      }
      UIManager.showResults(results);
    }, 1000);

    // Count total active players for next round
    if (results.raceState) {
      // Estimate from team scores
      totalPlayers = results.teamScores.reduce((sum, ts) => sum + (ts.score > 0 ? 1 : 0), 0);
    }

    // Hide results before next round
    setTimeout(() => {
      UIManager.hideOverlays();
    }, results.showTime || 4000);
  });

  // Game finished
  socket.on('game:finished', (data) => {
    Utils.showScreen('victory-screen', screens);

    const winner = data.winner;
    document.getElementById('winner-name').innerHTML =
      `<span style="color:${winner.color}">${winner.name}</span>`;

    // Build standings
    const standings = data.teams
      .sort((a, b) => b.progress - a.progress);

    const standingsEl = document.getElementById('final-standings');
    standingsEl.innerHTML = '<h2 style="margin-bottom:15px;">Final Standings</h2>';

    standings.forEach((team, i) => {
      const row = document.createElement('div');
      row.className = 'standing-row';
      row.innerHTML = `
        <span>
          <span style="color:var(--neon-yellow);margin-right:10px;">#${i + 1}</span>
          <span style="color:${team.color}">${team.name}</span>
        </span>
        <span>
          <span style="margin-right:15px;">${Math.round(team.progress * 100)}%</span>
          <span style="color:var(--text-secondary);font-size:0.5rem;">${team.roundsWon} rounds won</span>
        </span>
      `;
      standingsEl.appendChild(row);
    });

    // Victory effects
    SoundManager.victory();
    const canvas = document.getElementById('race-canvas');
    if (canvas) {
      Animation.spawnCelebration(RaceRenderer.width / 2, RaceRenderer.height / 2);
    }
  });

  // Game reset
  socket.on('game:reset', (state) => {
    gameState = state;
    numTeams = state.numTeams;
    Utils.showScreen('lobby-screen', screens);
    UIManager.buildLobby(state, numTeams, socket);
    Animation.clear();
  });

  // Player events
  socket.on('player:disconnected', (data) => {
    Utils.showToast(`${data.playerName} disconnected`);
  });

  socket.on('player:reconnected', (data) => {
    Utils.showToast(`${data.player.name} reconnected`);
  });

  socket.on('player:left', (data) => {
    Utils.showToast(`${data.playerName} left`);
  });

  // Error handling
  socket.on('error:message', (data) => {
    Utils.showToast(data.message);
  });

  // Reconnect handling
  socket.on('disconnect', () => {
    Utils.showToast('Connection lost - reconnecting...');
  });

  socket.on('connect', () => {
    if (roomCode) {
      socket.emit('host:reconnect', { code: roomCode }, (response) => {
        if (response.success) {
          Utils.showToast('Reconnected!');
          // Restore state
          const state = response.state;
          if (state.phase === 'lobby') {
            Utils.showScreen('lobby-screen', screens);
            UIManager.buildLobby(state, state.numTeams, socket);
          } else if (state.phase === 'racing') {
            Utils.showScreen('race-screen', screens);
            document.getElementById('header-room-code').textContent = roomCode;
            RaceRenderer.init(document.getElementById('race-canvas'));
            RaceRenderer.setupCars(state.teams);
            RaceRenderer.updateCarTargets(state.raceState);
            RaceRenderer.startLoop();
            if (state.positions) {
              UIManager.updateSidebar(state.positions, state.raceState);
            }
          }
        }
      });
    }
  });
})();
