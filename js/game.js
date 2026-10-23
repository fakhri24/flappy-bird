import { GAME } from "./config.js";
import { saveScore, getLeaderboard, isLeaderboardReady, getLeaderboardError } from "./leaderboard.js";
import { getUsername, getUid, isAuthenticated, saveUsername, clearUsername, onAuthChange } from "./auth.js";

const canvas = document.getElementById(GAME.canvasId);
const ctx = canvas.getContext("2d");

let width, height;

let state = "USERNAME"; // USERNAME | MENU | PLAYING | GAME_OVER
let running = true;
let lastTime = 0;
let frame = 0;

let bird = { x: 0, y: 0, vy: 0, radius: GAME.birdRadius, angle: 0, alive: true };
let pipes = [];
let score = 0;
let bestScore = 0;
let pipeTimer = 0;
let gameOverLock = false;

let saveStatusEl;
let finalScoreEl;
let gameOverBestEl;
let menuBestEl;
let menuUsernameEl;
let leaderboardListEl;

let leaderboardData = [];
let leaderboardLoading = false;

export {
  canvas, ctx, width, height, state, bird, pipes, score, bestScore,
  setSize, resetGame, startPlaying, showGameOver, togglePause,
  renderLeaderboard, refreshLeaderboard,
};

function setSize() {
  width = canvas.width = canvas.clientWidth;
  height = canvas.height = canvas.clientHeight;
  bird.x = GAME.birdX;
  if (state === "USERNAME" || state === "MENU") {
    bird.y = height / 2;
  }
  if (state === "PLAYING" && bird.y > height - GAME.groundHeight) {
    bird.y = height - GAME.groundHeight - 10;
  }
}

window.addEventListener("resize", setSize);

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function jump() {
  if (state !== "PLAYING") return;
  if (!bird.alive) return;
  bird.vy = GAME.jump;
}

function handleInput(e) {
  if (e.type === "keydown" && e.code !== "Space") return;
  e.preventDefault();
  jump();
}

window.addEventListener("keydown", handleInput);
window.addEventListener("mousedown", handleInput);
window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
}, { passive: false });

function spawnPipe() {
  const minPipeTop = 60;
  const maxPipeTop = height - GAME.groundHeight - GAME.pipeGap - minPipeTop;
  const pipeTop = clamp(
    Math.random() * (maxPipeTop - minPipeTop) + minPipeTop,
    minPipeTop,
    maxPipeTop
  );

  pipes.push({
    x: width,
    top: pipeTop,
    bottom: pipeTop + GAME.pipeGap,
    width: GAME.pipeWidth,
    passed: false,
    speed: getPipeSpeed(),
  });
}

function getPipeSpeed() {
  return clamp(GAME.basePipeSpeed + score * GAME.pipeSpeedIncrement, 0, GAME.maxPipeSpeed);
}

function updatePipeSpeeds() {
  pipes.forEach((p) => {
    p.speed = getPipeSpeed();
  });
}

function resetGame() {
  bird = { x: GAME.birdX, y: height / 2, vy: 0, radius: GAME.birdRadius, angle: 0, alive: true };
  pipes = [];
  score = 0;
  pipeTimer = 0;
  gameOverLock = false;
  updatePipeSpeeds();
}

function startPlaying() {
  resetGame();
  state = "PLAYING";
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function collideRectCircle(rect, circle) {
  const cx = clamp(circle.x, rect.left, rect.right);
  const cy = clamp(circle.y, rect.top, rect.bottom);
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function update(dt) {
  if (state !== "PLAYING") return;

  // Bird physics
  bird.vy += GAME.gravity;
  bird.y += bird.vy;
  bird.angle = clamp(bird.vy * 0.15, -25, 60);
  bird.angle = (bird.angle * Math.PI) / 180;

  // Pipes
  pipeTimer += dt;
  if (pipeTimer >= GAME.pipeSpawnInterval) {
    spawnPipe();
    pipeTimer = 0;
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= p.speed;

    const birdRect = {
      left: bird.x - bird.radius,
      right: bird.x + bird.radius,
      top: bird.y - bird.radius,
      bottom: bird.y + bird.radius,
    };

    const topPipe = { left: p.x, right: p.x + p.width, top: 0, bottom: p.top };
    const bottomPipe = { left: p.x, right: p.x + p.width, top: p.bottom, bottom: height - GAME.groundHeight };

    if (collideRectCircle(topPipe, bird) || collideRectCircle(bottomPipe, bird)) {
      die();
      return;
    }

    if (!p.passed && p.x + p.width < bird.x) {
      p.passed = true;
      score += 1;
      updatePipeSpeeds();
    }

    if (p.x + p.width < 0) {
      pipes.splice(i, 1);
    }
  }

  // Ground / ceiling
  if (bird.y + bird.radius >= height - GAME.groundHeight || bird.y - bird.radius <= GAME.skyCeiling) {
    die();
  }
}

function die() {
  if (!bird.alive) return;
  bird.alive = false;
  state = "GAME_OVER";
  gameOverLock = true;

  if (score > bestScore) {
    bestScore = score;
    trySaveScore();
  }

  showGameOver();
}

async function trySaveScore() {
  if (!isAuthenticated()) return;
  try {
    await saveScore(score);
    updateSaveStatus("Skor tersimpan!", false);
  } catch (err) {
    updateSaveStatus("Gagal menyimpan skor ke server. Main lanjut tetap bisa.", true);
  }
}

function updateSaveStatus(msg, isErr) {
  if (!saveStatusEl) return;
  saveStatusEl.textContent = msg;
  saveStatusEl.className = "status" + (isErr ? " error" : "");
  saveStatusEl.classList.remove("hidden");
  setTimeout(() => {
    saveStatusEl.classList.add("hidden");
  }, 3000);
}

function showGameOver() {
  finalScoreEl.textContent = score;
  gameOverBestEl.textContent = bestScore;
  // screens handled by ui module
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);

  // Body
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b7950b";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wing
  const wingOffset = Math.sin(frame * 0.2) * 3;
  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.ellipse(-5, 2 + wingOffset, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(8, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(16, 3);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPipe(p) {
  ctx.fillStyle = "#27ae60";
  ctx.strokeStyle = "#1e8449";
  ctx.lineWidth = 3;

  // Top pipe
  ctx.fillRect(p.x, 0, p.width, p.top);
  ctx.strokeRect(p.x, 0, p.width, p.top);
  // Pipe cap top
  ctx.fillRect(p.x - 4, p.top - 18, p.width + 8, 18);
  ctx.strokeRect(p.x - 4, p.top - 18, p.width + 8, 18);

  // Bottom pipe
  ctx.fillRect(p.x, p.bottom, p.width, height - GAME.groundHeight - p.bottom);
  ctx.strokeRect(p.x, p.bottom, p.width, height - GAME.groundHeight - p.bottom);
  // Pipe cap bottom
  ctx.fillRect(p.x - 4, p.bottom, p.width + 8, 18);
  ctx.strokeRect(p.x - 4, p.bottom, p.width + 8, 18);
}

function drawBackground() {
  ctx.fillStyle = "#4ec0ca";
  ctx.fillRect(0, 0, width, height);

  // Clouds (procedural)
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 5; i++) {
    const cx = (frame * 0.2 + i * 150) % (width + 120) - 60;
    const cy = 80 + i * 70;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy, 28, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy, 24, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = "#7eb03b";
  ctx.fillRect(0, height - GAME.groundHeight, width, GAME.groundHeight);
  ctx.fillStyle = "#5d9a1b";
  ctx.fillRect(0, height - GAME.groundHeight, width, 10);
}

function drawScore() {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(score, width / 2, 60);
}

function draw() {
  drawBackground();
  pipes.forEach(drawPipe);
  drawGround();
  drawBird();
  if (state === "PLAYING") drawScore();
}

function loop(now) {
  if (!running) return;
  const dt = now - lastTime;
  lastTime = now;
  frame++;

  if (state === "PLAYING") {
    update(dt);
  }

  draw();

  // Gentle idle bird animation on menu
  if (state === "MENU" || state === "USERNAME") {
    bird.y = height / 2 + Math.sin(frame * 0.05) * 12;
    bird.angle = Math.sin(frame * 0.05) * 0.1;
    drawBird();
  }

  requestAnimationFrame(loop);
}

// Public API for UI module
export function initUIHooks(ui) {
  saveStatusEl = ui.saveStatusEl;
  finalScoreEl = ui.finalScoreEl;
  gameOverBestEl = ui.gameOverBestEl;
  menuBestEl = ui.menuBestEl;
  menuUsernameEl = ui.menuUsernameEl;
  leaderboardListEl = ui.leaderboardListEl;

  wireUI(ui);
}

function wireUI(ui) {
  ui.startBtn.addEventListener("click", () => {
    const val = ui.usernameInput.value.trim();
    if (!val) {
      ui.usernameError.classList.remove("hidden");
      return;
    }
    saveUsername(val);
    ui.usernameScreen.classList.remove("active");
    ui.menuScreen.classList.remove("hidden");
    ui.menuUsernameEl.textContent = val;
    state = "MENU";
  });

  ui.usernameInput.addEventListener("input", () => {
    ui.startBtn.disabled = ui.usernameInput.value.trim() === "";
    ui.usernameError.classList.add("hidden");
  });

  ui.playBtn.addEventListener("click", () => {
    ui.menuScreen.classList.add("hidden");
    ui.overlay.classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    startPlaying();
  });

  ui.leaderboardBtn.addEventListener("click", () => {
    ui.menuScreen.classList.add("hidden");
    ui.leaderboardScreen.classList.remove("hidden");
    refreshLeaderboard();
  });

  ui.backToMenuBtn.addEventListener("click", () => {
    ui.leaderboardScreen.classList.add("hidden");
    ui.menuScreen.classList.remove("hidden");
  });

  ui.playAgainBtn.addEventListener("click", () => {
    ui.gameOverScreen.classList.add("hidden");
    ui.overlay.classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    startPlaying();
  });

  ui.menuBtn.addEventListener("click", () => {
    ui.gameOverScreen.classList.add("hidden");
    ui.menuScreen.classList.remove("hidden");
    ui.overlay.classList.remove("hidden");
    document.getElementById("hud").classList.add("hidden");
  });
}

export async function refreshLeaderboard() {
  if (leaderboardLoading) return;
  leaderboardLoading = true;
  if (leaderboardListEl) leaderboardListEl.textContent = "Memuat...";

  try {
    const rows = await getLeaderboard();
    renderLeaderboard(rows);
  } catch (err) {
    if (leaderboardListEl) {
      leaderboardListEl.textContent = "Gagal memuat leaderboard. Coba lagi nanti.";
    }
  } finally {
    leaderboardLoading = false;
  }
}

export function renderLeaderboard(rows = leaderboardData) {
  leaderboardData = rows;
  if (!leaderboardListEl) return;
  if (!rows || rows.length === 0) {
    leaderboardListEl.textContent = "Belum ada skor.";
    return;
  }
  leaderboardListEl.innerHTML = rows
    .map(
      (r, i) => `
      <div class="leader-entry ${i < 3 ? "ranked" : ""}">
        <span>${i + 1}. ${r.username}</span>
        <span>${r.score}</span>
      </div>
    `
    )
    .join("");
}

export function setBestScore(val) {
  bestScore = val;
  if (menuBestEl) menuBestEl.textContent = val;
  if (gameOverBestEl) gameOverBestEl.textContent = val;
}

export function getState() {
  return state;
}

export function setState(s) {
  state = s;
}
