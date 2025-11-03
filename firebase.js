// firebase.js — clean unified config for bistrotbastards-login (EU region)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---- Firebase config (from console for bistrotbastards-login)
export const firebaseConfig = {
  apiKey: "AIzaSyDHsl-wNXYGKO6YfDJoaQjhuNKQJnK8hmc",
  authDomain: "bistrotbastards-login.firebaseapp.com",
  projectId: "bistrotbastards-login",
  storageBucket: "bistrotbastards-login.appspot.com",
  messagingSenderId: "479005578581",
  appId: "1:479005578581:web:6615d66dca477c69730bdc",
  measurementId: "G-DPMP82GM2Y",
  databaseURL: "https://bistrotbastards-login-default-rtdb.firebaseio.com"
};

// ---- Initialize core services
console.log('[Firebase] Initializing app...');
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---- Realtime Database (explicit regional URL)
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);
console.log('[Firebase] ✅ Initialized successfully');

export { setPersistence, browserLocalPersistence, onAuthStateChanged };
