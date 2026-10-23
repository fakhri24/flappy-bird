import { signInAnon, onAuthState, auth, firebaseReady } from "./firebase.js";
import { FIRESTORE } from "./config.js";

const LS_KEY_USERNAME = "flappybird_username";
const LS_KEY_UID = "flappybird_uid";

let currentUser = null;
let username = null;
let uid = null;

let listeners = [];

export {
  currentUser,
  username,
  uid,
  LS_KEY_USERNAME,
  LS_KEY_UID,
  initAuth,
  getUsername,
  getUid,
  isAuthenticated,
  onAuthChange,
  saveUsername,
  clearUsername,
};

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

function lsGet(key) {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    return ls.getItem(key);
  } catch (e) {
    return null;
  }
}

function lsSet(key, value) {
  const ls = safeLocalStorage();
  if (!ls) return false;
  try {
    ls.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function lsRemove(key) {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(key);
  } catch (e) {
    // ignore
  }
}

export async function initAuth() {
  if (!firebaseReady) {
    throw new Error("Firebase not ready");
  }

  return new Promise((resolve, reject) => {
    const unsub = onAuthState((user) => {
      unsub();
      if (user) {
        currentUser = user;
        uid = user.uid;
        lsSet(LS_KEY_UID, uid);

        const stored = lsGet(LS_KEY_USERNAME);
        if (stored) {
          username = stored;
          currentUser = { uid, username };
          listeners.forEach((cb) => cb({ authenticated: true, username, uid }));
          resolve({ authenticated: true, username, uid });
        } else {
          listeners.forEach((cb) => cb({ authenticated: true, username: null, uid }));
          resolve({ authenticated: true, username: null, uid });
        }
      } else {
        // Not signed in yet; sign in anonymously
        signInAnon()
          .then((userCred) => {
            currentUser = userCred.user;
            uid = userCred.user.uid;
            lsSet(LS_KEY_UID, uid);
            listeners.forEach((cb) => cb({ authenticated: true, username: null, uid }));
            resolve({ authenticated: true, username: null, uid });
          })
          .catch((err) => {
            console.error("Anonymous sign-in failed:", err);
            listeners.forEach((cb) => cb({ authenticated: false, error: err }));
            reject(err);
          });
      }
    });
  });
}

export function getUsername() {
  return username;
}

export function getUid() {
  return uid;
}

export function isAuthenticated() {
  return !!currentUser;
}

export function onAuthChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}

export function saveUsername(name) {
  username = name.trim();
  currentUser = { uid, username };
  lsSet(LS_KEY_USERNAME, username);
  // Create/update player profile in Firestore (best effort, non-blocking)
  createPlayerProfile(uid, username).catch(() => {
    // ignore - non-critical
  });
  listeners.forEach((cb) => cb({ authenticated: true, username, uid }));
}

export function clearUsername() {
  username = null;
  lsRemove(LS_KEY_USERNAME);
  currentUser = uid ? { uid } : null;
  listeners.forEach((cb) => cb({ authenticated: true, username: null, uid }));
}

async function createPlayerProfile(uidVal, usernameVal) {
  try {
    const { getDoc, doc, setDoc, serverTimestamp } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );
    const { db } = await import("./firebase.js");
    if (!db) return;
    const playerRef = doc(db, FIRESTORE.collectionPlayers, uidVal);
    const snap = await getDoc(playerRef);
    if (!snap.exists()) {
      await setDoc(playerRef, {
        username: usernameVal,
        createdAt: serverTimestamp(),
      });
    }
  } catch (e) {
    // Non-critical
  }
}
