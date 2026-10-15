(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const titleEl = document.getElementById('title');
  const msgEl = document.getElementById('msg');
  const btn1p = document.getElementById('btn1p');
  const btn2p = document.getElementById('btn2p');

  const W = canvas.width;
  const H = canvas.height;
  const PADDLE_W = 12;
  const PADDLE_H = 90;
  const BALL_R = 8;
  const WIN_SCORE = 7;
  const PADDLE_SPEED = 6;
  const AI_SPEED = 4.2;
  const START_SPEED = 5;
  const MAX_SPEED = 13;

  const left = { x: 20, y: H / 2 - PADDLE_H / 2, dy: 0, score: 0 };
  const right = { x: W - 20 - PADDLE_W, y: H / 2 - PADDLE_H / 2, dy: 0, score: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };

  let mode = '1p';
  let running = false;
  let paused = false;
  let lastTime = 0;
  const keys = {};

  function clampPaddle(p) {
    p.y = Math.max(0, Math.min(H - PADDLE_H, p.y));
  }

  function resetBall(dir) {
    ball.x = W / 2;
    ball.y = H / 2;
    const angle = (Math.random() - 0.5) * 0.9;
    ball.vx = Math.cos(angle) * START_SPEED * dir;
    ball.vy = Math.sin(angle) * START_SPEED;
  }

  function startGame(selectedMode) {
    mode = selectedMode;
    left.score = 0;
    right.score = 0;
    left.y = right.y = H / 2 - PADDLE_H / 2;
    paused = false;
    running = true;
    resetBall(Math.random() < 0.5 ? -1 : 1);
    overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame(winnerText) {
    running = false;
    titleEl.textContent = winnerText;
    msgEl.textContent = 'Final score: ' + left.score + ' - ' + right.score;
    overlay.style.display = 'flex';
  }

  function bounceOffPaddle(p, dir) {
    const hit = (ball.y - (p.y + PADDLE_H / 2)) / (PADDLE_H / 2); // -1 .. 1
    const angle = hit * 0.9;
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, MAX_SPEED);
    ball.vx = Math.cos(angle) * speed * dir;
    ball.vy = Math.sin(angle) * speed;
  }

  function update(dt) {
    // Left paddle (W/S, plus arrows in 1-player mode)
    left.dy = 0;
    if (keys['w'] || (mode === '1p' && keys['arrowup'])) left.dy -= 1;
    if (keys['s'] || (mode === '1p' && keys['arrowdown'])) left.dy += 1;
    left.y += left.dy * PADDLE_SPEED * dt;
    clampPaddle(left);

    // Right paddle: human in 2P, CPU in 1P
    if (mode === '2p') {
      right.dy = 0;
      if (keys['arrowup']) right.dy -= 1;
      if (keys['arrowdown']) right.dy += 1;
      right.y += right.dy * PADDLE_SPEED * dt;
    } else {
      const target = ball.vx > 0 ? ball.y : H / 2;
      const center = right.y + PADDLE_H / 2;
      if (Math.abs(target - center) > 10) {
        right.y += Math.sign(target - center) * AI_SPEED * dt;
      }
    }
    clampPaddle(right);

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Top / bottom walls
    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
    if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); }

    // Left paddle collision
    if (ball.vx < 0 &&
        ball.x - BALL_R <= left.x + PADDLE_W &&
        ball.x + BALL_R >= left.x &&
        ball.y >= left.y - BALL_R &&
        ball.y <= left.y + PADDLE_H + BALL_R) {
      ball.x = left.x + PADDLE_W + BALL_R;
      bounceOffPaddle(left, 1);
    }

    // Right paddle collision
    if (ball.vx > 0 &&
        ball.x + BALL_R >= right.x &&
        ball.x - BALL_R <= right.x + PADDLE_W &&
        ball.y >= right.y - BALL_R &&
        ball.y <= right.y + PADDLE_H + BALL_R) {
      ball.x = right.x - BALL_R;
      bounceOffPaddle(right, -1);
    }

    // Scoring
    if (ball.x < -BALL_R) {
      right.score++;
      if (right.score >= WIN_SCORE) {
        return endGame(mode === '1p' ? 'CPU Wins!' : 'Player 2 Wins!');
      }
      resetBall(-1);
    } else if (ball.x > W + BALL_R) {
      left.score++;
      if (left.score >= WIN_SCORE) {
        return endGame(mode === '1p' ? 'You Win! 🎉' : 'Player 1 Wins!');
      }
      resetBall(1);
    }
  }

  function draw() {
    ctx.fillStyle = '#111a33';
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(left.score, W / 4, 20);
    ctx.fillText(right.score, (W * 3) / 4, 20);

    // Paddles
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(left.x, left.y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(right.x, right.y, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, H / 2);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 16.67, 2); // normalize to ~60fps
    lastTime = now;
    if (!paused) update(dt);
    draw();
    if (running) requestAnimationFrame(loop);
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    keys[k] = true;
    if (k === ' ' && running) {
      paused = !paused;
      if (!paused) lastTime = performance.now();
      draw();
    }
  });
  document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  // Mouse (1 player: moves left paddle)
  function canvasY(clientY) {
    const rect = canvas.getBoundingClientRect();
    return ((clientY - rect.top) / rect.height) * H;
  }

  canvas.addEventListener('mousemove', e => {
    if (!running || paused || mode !== '1p') return;
    left.y = canvasY(e.clientY) - PADDLE_H / 2;
    clampPaddle(left);
  });

  // Touch
  function handleTouch(e) {
    if (!running || paused) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (const t of e.touches) {
      const x = ((t.clientX - rect.left) / rect.width) * W;
      const y = canvasY(t.clientY) - PADDLE_H / 2;
      if (mode === '2p' && x > W / 2) {
        right.y = y;
        clampPaddle(right);
      } else {
        left.y = y;
        clampPaddle(left);
      }
    }
  }
  canvas.addEventListener('touchstart', handleTouch, { passive: false });
  canvas.addEventListener('touchmove', handleTouch, { passive: false });

  btn1p.addEventListener('click', () => startGame('1p'));
  btn2p.addEventListener('click', () => startGame('2p'));

  draw();
})();
