// Player application - main controller
const PlayerApp = {
  socket: null,
  playerId: null,
  teamIndex: -1,
  roomCode: null,
  playerName: null,
  timerInterval: null,

  screens: ['join-screen', 'waiting-screen', 'game-screen', 'minigame-screen', 'results-screen', 'player-victory-screen'],

  init() {
    this.socket = io({ transports: ['websocket'] });
    this.setupSocketEvents();
    this.setupUI();

    // Check if coming from landing page with session data
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const savedToken = sessionStorage.getItem('reconnectToken');
    const savedName = sessionStorage.getItem('playerName');

    if (code && savedToken && savedName) {
      this.roomCode = code;
      this.playerName = savedName;
      this.attemptJoin(code, savedName, savedToken);
    } else if (code) {
      document.getElementById('room-code-input').value = code;
    }
  },

  setupUI() {
    const joinBtn = document.getElementById('join-btn');
    const codeInput = document.getElementById('room-code-input');
    const nameInput = document.getElementById('player-name-input');

    // Auto-uppercase
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    });

    joinBtn.addEventListener('click', () => {
      const code = codeInput.value.trim();
      const name = nameInput.value.trim();
      if (!code || code.length !== 4) {
        document.getElementById('join-error').textContent = 'Enter a 4-letter code';
        return;
      }
      if (!name) {
        document.getElementById('join-error').textContent = 'Enter your name';
        return;
      }
      this.attemptJoin(code, name);
    });

    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') joinBtn.click();
    });
    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') nameInput.focus();
    });

    // Restore saved values
    const savedCode = sessionStorage.getItem('roomCode');
    const savedName = sessionStorage.getItem('playerName');
    if (savedCode) codeInput.value = savedCode;
    if (savedName) nameInput.value = savedName;
  },

  attemptJoin(code, name, reconnectToken) {
    const joinBtn = document.getElementById('join-btn');
    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining...';
    document.getElementById('join-error').textContent = '';

    this.socket.emit('player:join', {
      code,
      name,
      reconnectToken: reconnectToken || sessionStorage.getItem('reconnectToken')
    }, (response) => {
      joinBtn.disabled = false;
      joinBtn.textContent = 'Join';

      if (response.error) {
        document.getElementById('join-error').textContent = response.error;
        return;
      }

      this.playerId = response.playerId;
      this.teamIndex = response.teamIndex;
      this.roomCode = code;
      this.playerName = name;

      // Save session data
      sessionStorage.setItem('reconnectToken', response.reconnectToken);
      sessionStorage.setItem('roomCode', code);
      sessionStorage.setItem('playerName', name);

      // Show appropriate screen
      if (response.phase === 'lobby') {
        this.showWaiting();
      } else if (response.phase === 'racing') {
        this.showWaiting();
        // Will get round:start soon
      }

      if (response.reconnected) {
        Utils.showToast('Reconnected!');
      }
    });
  },

  showWaiting() {
    Utils.showScreen('waiting-screen', this.screens);
    document.getElementById('player-name-display').textContent = this.playerName;
    document.getElementById('room-code-show').textContent = `Room: ${this.roomCode}`;
    this.updateTeamBadge();
  },

  updateTeamBadge() {
    const badge = document.getElementById('team-badge');
    if (this.teamIndex >= 0) {
      badge.textContent = Utils.TEAM_NAMES[this.teamIndex];
      badge.className = `team-badge team-${this.teamIndex} team-border-${this.teamIndex}`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  startTimer(barId, duration) {
    this.stopTimer();
    const barEl = document.getElementById(barId);
    if (!barEl) return;

    const startTime = Date.now();
    barEl.style.width = '100%';

    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / duration);
      barEl.style.width = (remaining * 100) + '%';
      if (remaining <= 0) this.stopTimer();
    }, 50);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  setupSocketEvents() {
    // Team assignment
    this.socket.on('team:assigned', ({ teamIndex }) => {
      this.teamIndex = teamIndex;
      this.updateTeamBadge();
    });

    // Game started
    this.socket.on('game:started', (data) => {
      // Switch to a "get ready" state so player isn't stuck on waiting screen
      Utils.showScreen('game-screen', this.screens);
      const questionEl = document.getElementById('player-question');
      const gridEl = document.getElementById('answer-grid');
      const feedbackEl = document.getElementById('answer-feedback');
      if (questionEl) questionEl.textContent = 'Get Ready...';
      if (gridEl) gridEl.innerHTML = '';
      if (feedbackEl) feedbackEl.classList.add('hidden');
    });

    // Round start
    this.socket.on('round:start', (data) => {
      try {
        if (data.type === 'trivia') {
          Utils.showScreen('game-screen', this.screens);
          TriviaUI.show(data);
          this.startTimer('player-timer-bar', data.timeLimit);
        } else if (data.type === 'mini_game') {
          Utils.showScreen('minigame-screen', this.screens);
          MiniGameUI.show(data);
          this.startTimer('minigame-player-timer', data.timeLimit);
        }
      } catch (err) {
        console.error('[PlayerApp] Error in round:start handler:', err);
      }
    });

    // Answer result (individual feedback)
    this.socket.on('answer:result', (result) => {
      TriviaUI.showResult(result);
    });

    // Mini-game result
    this.socket.on('minigame:result', (result) => {
      MiniGameUI.showResult(result);
    });

    // Round results
    this.socket.on('round:results', (results) => {
      this.stopTimer();

      // Show correct answer on trivia
      if (results.type === 'trivia') {
        TriviaUI.showRoundResults(results, results.correctAnswer);
      }

      // Show results screen after brief delay
      setTimeout(() => {
        Utils.showScreen('results-screen', this.screens);
        this.showRoundResultsScreen(results);
      }, 1500);
    });

    // Game finished
    this.socket.on('game:finished', (data) => {
      Utils.showScreen('player-victory-screen', this.screens);

      const isWinner = data.winner.index === this.teamIndex;
      const titleEl = document.getElementById('player-victory-title');
      const messageEl = document.getElementById('player-victory-message');

      if (isWinner) {
        titleEl.textContent = 'YOU WIN!';
        titleEl.style.color = 'var(--neon-yellow)';
        messageEl.innerHTML = `<span style="color:${data.winner.color}">${data.winner.name}</span> crossed the finish line!`;
      } else {
        titleEl.textContent = 'RACE OVER';
        titleEl.style.color = 'var(--neon-red)';
        messageEl.innerHTML = `<span style="color:${data.winner.color}">${data.winner.name}</span> won the race!`;
      }
    });

    // Game reset
    this.socket.on('game:reset', () => {
      this.teamIndex = -1;
      this.showWaiting();
    });

    // Lobby update
    this.socket.on('lobby:update', (state) => {
      // Update team assignment if changed
      const me = state.players.find(p => p.id === this.playerId);
      if (me && me.teamIndex !== this.teamIndex) {
        this.teamIndex = me.teamIndex;
        this.updateTeamBadge();
      }
    });

    // Room destroyed
    this.socket.on('room:destroyed', ({ message }) => {
      Utils.showToast(message);
      sessionStorage.clear();
      setTimeout(() => window.location.href = '/', 2000);
    });

    // Disconnect/reconnect
    this.socket.on('disconnect', () => {
      document.getElementById('disconnected-overlay').classList.remove('hidden');
    });

    this.socket.on('connect', () => {
      document.getElementById('disconnected-overlay').classList.add('hidden');

      // Attempt reconnect if we have session data
      if (this.roomCode && this.playerName) {
        this.attemptJoin(this.roomCode, this.playerName, sessionStorage.getItem('reconnectToken'));
      }
    });
  },

  showRoundResultsScreen(results) {
    const titleEl = document.getElementById('result-title');
    const iconEl = document.getElementById('result-icon');
    const fillEl = document.getElementById('team-progress-fill');
    const labelEl = document.getElementById('team-progress-label');

    // Find my team's results
    const myTeamResult = results.teamScores.find(ts => ts.teamIndex === this.teamIndex);
    const myTeamState = results.raceState ? results.raceState.find(t => t.index === this.teamIndex) : null;

    if (myTeamResult && myTeamResult.isWinner) {
      titleEl.textContent = 'Round Won!';
      titleEl.style.color = 'var(--neon-green)';
      iconEl.textContent = '>>>';
      iconEl.style.color = 'var(--neon-green)';
    } else {
      titleEl.textContent = 'Keep Racing!';
      titleEl.style.color = 'var(--text-secondary)';
      iconEl.textContent = '>>';
      iconEl.style.color = 'var(--text-secondary)';
    }

    // Progress bar
    if (myTeamState) {
      const color = Utils.TEAM_COLORS[this.teamIndex] || '#ffffff';
      fillEl.style.background = color;
      fillEl.style.width = (myTeamState.progress * 100) + '%';
      labelEl.textContent = `${Math.round(myTeamState.progress * 100)}% to finish`;
    }
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => PlayerApp.init());
