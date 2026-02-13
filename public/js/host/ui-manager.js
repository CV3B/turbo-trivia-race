// Host UI Manager - handles overlays and UI state
const UIManager = {
  timerInterval: null,

  // Show trivia question overlay
  showQuestion(data) {
    const overlay = document.getElementById('question-overlay');
    const questionText = document.getElementById('host-question-text');
    const optionsGrid = document.getElementById('host-options-grid');
    const answerCount = document.getElementById('answer-count');
    const timerBar = document.getElementById('host-timer-bar');

    questionText.textContent = data.question;
    optionsGrid.innerHTML = '';
    answerCount.textContent = '0 answers received';

    const labels = ['A', 'B', 'C', 'D'];
    data.options.forEach((option, i) => {
      const div = document.createElement('div');
      div.className = 'option-display';
      div.id = `host-option-${i}`;
      div.textContent = `${labels[i]}. ${option}`;
      optionsGrid.appendChild(div);
    });

    overlay.classList.remove('hidden');
    document.getElementById('results-overlay').classList.add('hidden');
    document.getElementById('minigame-overlay').classList.add('hidden');

    // Start timer
    this.startTimer(timerBar, data.timeLimit);
  },

  // Show mini-game overlay
  showMiniGame(data) {
    const overlay = document.getElementById('minigame-overlay');
    const title = document.getElementById('minigame-title');
    const desc = document.getElementById('minigame-description');
    const status = document.getElementById('minigame-status');
    const timerBar = document.getElementById('minigame-timer-bar');

    title.textContent = data.gameName || data.gameId;
    desc.textContent = data.instructions || 'Game in progress...';
    status.textContent = 'Waiting for players...';

    overlay.classList.remove('hidden');
    document.getElementById('question-overlay').classList.add('hidden');
    document.getElementById('results-overlay').classList.add('hidden');

    this.startTimer(timerBar, data.timeLimit);
  },

  // Update answer count
  updateAnswerCount(count, total) {
    const el = document.getElementById('answer-count');
    if (el) el.textContent = `${count} / ${total} answered`;
  },

  // Reveal correct answer
  revealAnswer(correctIndex) {
    const labels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`host-option-${i}`);
      if (!el) continue;
      if (i === correctIndex) {
        el.classList.add('correct');
      } else {
        el.classList.add('wrong');
      }
    }
  },

  // Show round results
  showResults(results) {
    const overlay = document.getElementById('results-overlay');
    document.getElementById('question-overlay').classList.add('hidden');
    document.getElementById('minigame-overlay').classList.add('hidden');

    let html = `<h2>Round ${results.number} Results</h2>`;
    html += '<div class="team-scores-display">';

    for (const ts of results.teamScores) {
      const team = results.raceState[ts.teamIndex];
      const advance = results.advances ? results.advances[ts.teamIndex] : 0;
      const advancePercent = advance ? `+${(advance * 100).toFixed(1)}%` : '+0%';

      html += `
        <div class="team-score-card ${ts.isWinner ? 'winner' : ''}">
          <div style="color:${team.color};font-size:0.6rem;">${team.name}</div>
          <div class="score" style="color:${team.color}">${Math.round(ts.avgScore)}</div>
          <div class="advance">${advancePercent}</div>
        </div>
      `;
    }

    html += '</div>';
    overlay.innerHTML = html;
    overlay.classList.remove('hidden');
  },

  // Hide all overlays
  hideOverlays() {
    document.getElementById('question-overlay').classList.add('hidden');
    document.getElementById('results-overlay').classList.add('hidden');
    document.getElementById('minigame-overlay').classList.add('hidden');
    this.stopTimer();
  },

  // Update race sidebar
  updateSidebar(positions, raceState) {
    const sidebar = document.getElementById('race-sidebar');
    if (!raceState) return;

    let html = '<h3>Standings</h3>';
    for (const pos of positions) {
      const team = raceState[pos.teamIndex];
      const pct = Math.round(pos.progress * 100);
      html += `
        <div class="position-entry">
          <span class="position-number">${pos.position}.</span>
          <span style="color:${team.color}">${team.name.split(' ')[0]}</span>
          <div class="progress-bar-mini">
            <div class="fill" style="width:${pct}%;background:${team.color}"></div>
          </div>
          <span>${pct}%</span>
        </div>
      `;
    }
    sidebar.innerHTML = html;
  },

  // Update round counter
  updateRoundCounter(roundNum) {
    const el = document.getElementById('round-counter');
    if (el) el.textContent = `Round ${roundNum}`;
  },

  // Timer management
  startTimer(barElement, duration) {
    this.stopTimer();
    const startTime = Date.now();

    barElement.style.width = '100%';
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / duration);
      barElement.style.width = (remaining * 100) + '%';

      if (remaining <= 0) {
        this.stopTimer();
      }
    }, 50);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  // Build lobby UI
  buildLobby(state, numTeams, socket) {
    const teamsGrid = document.getElementById('teams-grid');
    const unassignedList = document.getElementById('unassigned-list');
    const unassignedSection = document.getElementById('unassigned-section');

    // Build team columns
    teamsGrid.innerHTML = '';
    for (let t = 0; t < numTeams; t++) {
      const col = document.createElement('div');
      col.className = `team-column team-border-${t}`;
      col.innerHTML = `<h3 class="team-${t}">${Utils.TEAM_NAMES[t]}</h3>`;

      const teamPlayers = state.players.filter(p => p.teamIndex === t);
      for (const player of teamPlayers) {
        const div = document.createElement('div');
        div.className = 'team-player';
        div.innerHTML = `
          <span style="color:${player.connected ? '#fff' : '#666'}">${player.name}${!player.connected ? ' (DC)' : ''}</span>
          <div class="move-btns">
            ${Array.from({ length: numTeams }, (_, i) =>
              i !== t ? `<button class="move-btn team-${i}" data-player="${player.id}" data-team="${i}">${i + 1}</button>` : ''
            ).join('')}
          </div>
        `;
        col.appendChild(div);
      }

      teamsGrid.appendChild(col);
    }

    // Unassigned players
    const unassigned = state.players.filter(p => p.teamIndex === -1);
    unassignedList.innerHTML = '';
    if (unassigned.length > 0) {
      unassignedSection.classList.remove('hidden');
      for (const player of unassigned) {
        const span = document.createElement('span');
        span.className = 'unassigned-player';
        span.textContent = player.name;
        unassignedList.appendChild(span);
      }
    } else {
      unassignedSection.classList.add('hidden');
    }

    // Add click handlers for move buttons
    teamsGrid.querySelectorAll('.move-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        socket.emit('host:assignTeam', {
          playerId: btn.dataset.player,
          teamIndex: parseInt(btn.dataset.team)
        });
      });
    });
  }
};
