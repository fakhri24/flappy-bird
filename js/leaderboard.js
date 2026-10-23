import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, firebaseReady } from "./firebase.js";
import { FIRESTORE, getUid, getUsername } from "./config.js";
import { getUid as authGetUid, getUsername as authGetUsername } from "./auth.js";

let leaderboardReady = false;
let leaderboardError = null;

export { leaderboardReady, leaderboardError };

export async function saveScore(score) {
  const uidVal = authGetUid();
  const usernameVal = authGetUsername();
  if (!db || !firebaseReady) {
    leaderboardError = new Error("Firestore not ready");
    throw leaderboardError;
  }
  if (!uidVal) {
    leaderboardError = new Error("Not authenticated");
    throw leaderboardError;
  }

  try {
    const scoresRef = collection(db, FIRESTORE.collectionScores);
    await setDoc(doc(scoresRef), {
      uid: uidVal,
      username: usernameVal || "Pemain",
      score: score,
      createdAt: serverTimestamp(),
    });

    // Update player profile best score if higher
    try {
      const playerRef = doc(db, FIRESTORE.collectionPlayers, uidVal);
      const snap = await getDoc(playerRef);
      if (snap.exists()) {
        const data = snap.data() || {};
        const best = data.bestScore || 0;
        if (score > best) {
          await setDoc(playerRef, { bestScore: score, updatedAt: serverTimestamp() }, { merge: true });
        }
      } else {
        await setDoc(playerRef, {
          username: usernameVal || "Pemain",
          bestScore: score,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      // best score update is non-critical
    }

    leaderboardError = null;
    return true;
  } catch (err) {
    leaderboardError = err;
    console.error("Save score failed:", err);
    throw err;
  }
}

export async function getLeaderboard() {
  if (!db || !firebaseReady) {
    leaderboardError = new Error("Firestore not ready");
    throw leaderboardError;
  }

  try {
    const q = query(
      collection(db, FIRESTORE.collectionScores),
      orderBy("score", "desc"),
      orderBy("createdAt", "desc"),
      limit(FIRESTORE.leaderboardLimit)
    );
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      rows.push({
        id: docSnap.id,
        username: data.username || "Pemain",
        score: data.score || 0,
        createdAt: data.createdAt,
      });
    });
    leaderboardError = null;
    leaderboardReady = true;
    return rows;
  } catch (err) {
    leaderboardError = err;
    console.error("Load leaderboard failed:", err);
    leaderboardReady = false;
    throw err;
  }
}

export function isLeaderboardReady() {
  return leaderboardReady;
}

export function getLeaderboardError() {
  return leaderboardError;
}
