import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./config.js";

let app;
let auth;
let db;
let firebaseReady = false;
let firebaseError = null;

export { app, auth, db, firebaseReady, firebaseError };

export function initFirebase() {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseReady = true;
    return { app, auth, db };
  } catch (err) {
    firebaseError = err;
    console.error("Firebase init error:", err);
    return null;
  }
}

export function signInAnon() {
  if (!auth) return Promise.reject(new Error("Auth not initialized"));
  return signInAnonymously(auth);
}

export function onAuthState(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
