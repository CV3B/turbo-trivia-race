// Mini-game UI dispatcher for player screen
const MiniGameUI = {
  currentGame: null,
  _pendingTimeouts: [],

  _clearTimeouts() {
    for (const id of this._pendingTimeouts) clearTimeout(id);
    this._pendingTimeouts = [];
  },

  _trackTimeout(id) {
    this._pendingTimeouts.push(id);
    return id;
  },

  show(data) {
    this._clearTimeouts();
    const container = document.getElementById('minigame-container');
    container.innerHTML = '';

    switch (data.gameId) {
      case 'speed-type':
        this.showSpeedType(container, data);
        break;
      case 'reaction':
        this.showReaction(container, data);
        break;
      case 'emoji-decoder':
        this.showEmojiDecoder(container, data);
        break;
      case 'quick-math':
        this.showQuickMath(container, data);
        break;
      case 'unscramble':
        this.showUnscramble(container, data);
        break;
      default:
        container.innerHTML = `<p class="minigame-instructions">Unknown mini-game: ${data.gameId}</p>`;
    }
  },

  showSpeedType(container, data) {
    container.innerHTML = `
      <h2 style="color:var(--neon-pink);">Speed Type!</h2>
      <p class="minigame-instructions">Type the phrase as fast as you can:</p>
      <div class="target-phrase">${data.phrase}</div>
      <input type="text" class="type-input" id="speed-type-input" placeholder="Start typing..." autocomplete="off" autocapitalize="off" autocorrect="off">
      <p class="minigame-instructions" id="type-status"></p>
    `;

    const input = document.getElementById('speed-type-input');
    input.focus();

    input.addEventListener('input', () => {
      const typed = input.value.trim().toLowerCase();
      const target = data.phrase.toLowerCase();

      if (typed === target) {
        document.getElementById('type-status').textContent = 'Submitted!';
        document.getElementById('type-status').style.color = 'var(--neon-green)';
        input.disabled = true;
        PlayerApp.socket.emit('player:minigameInput', { type: 'speed-type', text: input.value });
      }
    });
  },

  showReaction(container, data) {
    container.innerHTML = `
      <h2 style="color:var(--neon-pink);">Reaction Time!</h2>
      <p class="minigame-instructions">Wait for GREEN, then tap!</p>
      <div class="reaction-zone waiting" id="reaction-zone">WAIT...</div>
      <p class="minigame-instructions" id="reaction-status"></p>
    `;

    const zone = document.getElementById('reaction-zone');
    let ready = false;
    let readyTime = 0;
    let tapped = false;

    // Random delay 1-4 seconds
    const delay = 1000 + Math.random() * 3000;

    const readyTimeout = this._trackTimeout(setTimeout(() => {
      zone.className = 'reaction-zone ready';
      zone.textContent = 'TAP NOW!';
      ready = true;
      readyTime = Date.now();
    }, delay));

    zone.addEventListener('click', () => {
      if (tapped) return;
      tapped = true;

      if (!ready) {
        // Too early!
        clearTimeout(readyTimeout);
        zone.className = 'reaction-zone early';
        zone.textContent = 'TOO EARLY!';
        document.getElementById('reaction-status').textContent = 'Penalty!';
        PlayerApp.socket.emit('player:minigameInput', { type: 'reaction', time: -1 });
      } else {
        const reactionTime = Date.now() - readyTime;
        zone.textContent = `${reactionTime}ms`;
        document.getElementById('reaction-status').textContent = 'Recorded!';
        document.getElementById('reaction-status').style.color = 'var(--neon-green)';
        PlayerApp.socket.emit('player:minigameInput', { type: 'reaction', time: reactionTime });
      }
    });
  },

  showEmojiDecoder(container, data) {
    container.innerHTML = `
      <h2 style="color:var(--neon-pink);">Emoji Decoder!</h2>
      <p class="minigame-instructions">What does this mean?</p>
      <div class="target-phrase" style="font-size:2.5rem;">${data.emojis}</div>
      <input type="text" class="type-input" id="emoji-input" placeholder="Type your answer..." autocomplete="off" autocapitalize="off" autocorrect="off" style="text-transform:none;letter-spacing:1px;">
      <button class="btn btn-primary" id="emoji-submit" style="margin-top:8px;">Submit</button>
      <p class="minigame-instructions" id="emoji-status"></p>
    `;

    const input = document.getElementById('emoji-input');
    const btn = document.getElementById('emoji-submit');
    input.focus();

    const submit = () => {
      if (!input.value.trim() || input.disabled) return;
      PlayerApp.socket.emit('player:minigameInput', { type: 'emoji-decoder', text: input.value }, (res) => {});
      // Server will send minigame:result with feedback
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
  },

  showQuickMath(container, data) {
    container.innerHTML = `
      <h2 style="color:var(--neon-pink);">Quick Math!</h2>
      <p class="minigame-instructions">Solve it!</p>
      <div class="target-phrase">${data.problem}</div>
      <input type="text" class="type-input" id="math-input" placeholder="Your answer..." autocomplete="off" inputmode="numeric" style="text-transform:none;letter-spacing:2px;">
      <button class="btn btn-primary" id="math-submit" style="margin-top:8px;">Submit</button>
      <p class="minigame-instructions" id="math-status"></p>
    `;

    const input = document.getElementById('math-input');
    const btn = document.getElementById('math-submit');
    input.focus();

    const submit = () => {
      if (!input.value.trim() || input.disabled) return;
      PlayerApp.socket.emit('player:minigameInput', { type: 'quick-math', answer: input.value.trim() });
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
  },

  showUnscramble(container, data) {
    container.innerHTML = `
      <h2 style="color:var(--neon-pink);">Unscramble!</h2>
      <p class="minigame-instructions">Rearrange the letters!</p>
      <div class="target-phrase">${data.scrambled}</div>
      <input type="text" class="type-input" id="scramble-input" placeholder="Type the word..." autocomplete="off" autocapitalize="off" autocorrect="off" style="text-transform:none;letter-spacing:2px;">
      <button class="btn btn-primary" id="scramble-submit" style="margin-top:8px;">Submit</button>
      <p class="minigame-instructions" id="scramble-status"></p>
    `;

    const input = document.getElementById('scramble-input');
    const btn = document.getElementById('scramble-submit');
    input.focus();

    const submit = () => {
      if (!input.value.trim() || input.disabled) return;
      PlayerApp.socket.emit('player:minigameInput', { type: 'unscramble', text: input.value });
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
  },

  showResult(result) {
    const status = document.getElementById('type-status')
      || document.getElementById('reaction-status')
      || document.getElementById('emoji-status')
      || document.getElementById('math-status')
      || document.getElementById('scramble-status');
    if (status && result.message) {
      status.textContent = result.message;
      if (result.message.startsWith('Correct') || result.message.startsWith('Done') || result.message === 'Recorded!') {
        status.style.color = 'var(--neon-green)';
      } else {
        status.style.color = 'var(--neon-red)';
      }
    }
  }
};
