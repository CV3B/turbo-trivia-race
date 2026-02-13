// Trivia UI for player screen
const TriviaUI = {
  hasAnswered: false,

  show(data) {
    this.hasAnswered = false;

    const questionEl = document.getElementById('player-question');
    const gridEl = document.getElementById('answer-grid');
    const feedbackEl = document.getElementById('answer-feedback');

    if (!questionEl || !gridEl) {
      console.error('[TriviaUI] Missing DOM elements for trivia display');
      return;
    }

    questionEl.textContent = data.question;
    gridEl.innerHTML = '';
    if (feedbackEl) {
      feedbackEl.classList.add('hidden');
      feedbackEl.textContent = '';
    }

    const labels = ['A', 'B', 'C', 'D'];
    data.options.forEach((option, i) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = `${labels[i]}. ${option}`;
      btn.addEventListener('click', () => this.selectAnswer(i, btn));
      gridEl.appendChild(btn);
    });
  },

  selectAnswer(index, btnEl) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;

    // Highlight selected
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    btnEl.classList.add('selected');

    // Emit answer
    PlayerApp.socket.emit('player:answer', { answerIndex: index });
  },

  showResult(result) {
    const feedbackEl = document.getElementById('answer-feedback');
    feedbackEl.classList.remove('hidden');

    if (result.correct) {
      feedbackEl.className = 'answer-feedback correct-feedback';
      feedbackEl.innerHTML = `Correct!<div class="score-display">+${result.score} points</div>`;
    } else {
      feedbackEl.className = 'answer-feedback wrong-feedback';
      feedbackEl.innerHTML = `Wrong!<div class="score-display">+0 points</div>`;
    }
  },

  showRoundResults(results, correctAnswer) {
    // Highlight correct/wrong on buttons
    const btns = document.querySelectorAll('.answer-btn');
    btns.forEach((btn, i) => {
      if (i === correctAnswer) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected') && i !== correctAnswer) {
        btn.classList.add('wrong');
      }
    });
  }
};
