import {
  canvas,
  state,
  setState,
  setBestScore,
  refreshLeaderboard,
  renderLeaderboard,
  initUIHooks,
  getState,
} from "./game.js";
import { getUsername, onAuthChange, clearUsername } from "./auth.js";
import { isLeaderboardReady, getLeaderboardError } from "./leaderboard.js";

const overlay = document.getElementById("overlay");
const usernameScreen = document.getElementById("usernameScreen");
const menuScreen = document.getElementById("menuScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const usernameInput = document.getElementById("usernameInput");
const startBtn = document.getElementById("startBtn");
const usernameError = document.getElementById("usernameError");

const playBtn = document.getElementById("playBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");

const playAgainBtn = document.getElementById("playAgainBtn");
const menuBtn = document.getElementById("menuBtn");

const saveStatusEl = document.getElementById("saveStatus");
const finalScoreEl = document.getElementById("finalScore");
const gameOverBestEl = document.getElementById("gameOverBestScore");
const menuBestEl = document.getElementById("menuBestScore");
const menuUsernameEl = document.getElementById("menuUsername");
const leaderboardListEl = document.getElementById("leaderboardList");

const ui = {
  overlay,
  usernameScreen,
  menuScreen,
  leaderboardScreen,
  gameOverScreen,
  usernameInput,
  startBtn,
  usernameError,
  playBtn,
  leaderboardBtn,
  backToMenuBtn,
  playAgainBtn,
  menuBtn,
  saveStatusEl,
  finalScoreEl,
  gameOverBestEl,
  menuBestEl,
  menuUsernameEl,
  leaderboardListEl,
};

initUIHooks(ui);

onAuthChange((session) => {
  if (session.authenticated && session.username) {
    // Returning user: skip username, go to menu
    usernameScreen.classList.remove("active");
    menuScreen.classList.remove("hidden");
    overlay.classList.remove("hidden");
    menuUsernameEl.textContent = session.username;
    menuBestEl.textContent = "0";
    setState("MENU");
  } else if (session.authenticated && !session.username) {
    // Fresh user: show username screen
    usernameScreen.classList.add("active");
    menuScreen.classList.add("hidden");
    leaderboardScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    overlay.classList.remove("hidden");
    setState("USERNAME");
  }
});

// Best score sync from leaderboard (best-effort)
setInterval(async () => {
  if (getState() === "MENU" && isLeaderboardReady()) {
    try {
      // best score handled via local var in game.js; keep displayed as-is
    } catch (e) {
      // ignore
    }
  }
}, 5000);
