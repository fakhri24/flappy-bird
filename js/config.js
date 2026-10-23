// Firebase configuration.
// Ganti nilai placeholder di bawah dengan config project Firebase Anda
// dari Firebase Console (Project settings > General > Your apps > Firebase SDK snippet > Config).
export const firebaseConfig = {
  apiKey: "AIzaSyArRJ_IyXzclRa3_ofqAzwCp4FFKd0k04Y",
  authDomain: "flappy-bird-firestore.firebaseapp.com",
  projectId: "flappy-bird-firestore",
  storageBucket: "flappy-bird-firestore.firebasestorage.app",
  messagingSenderId: "391669306020",
  appId: "1:391669306020:web:a9534d81c337fc76da0c31",
  measurementId: "G-PLACEHOLDER",
};

// Konstanta game
export const GAME = {
  canvasId: "gameCanvas",
  gravity: 0.6,
  jump: -9.5,
  birdX: 80,
  birdRadius: 14,
  pipeWidth: 60,
  pipeGap: 150,
  pipeSpawnInterval: 1400, // ms
  basePipeSpeed: 2.2,
  pipeSpeedIncrement: 0.15, // per skor
  maxPipeSpeed: 5.5,
  groundHeight: 110,
  skyCeiling: -20,
};

export const FIRESTORE = {
  collectionScores: "scores",
  collectionPlayers: "players",
  leaderboardLimit: 10,
};
