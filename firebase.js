import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHsl-wNXYGKO6YfDJoaQjhuNKQJnK8hmc",
  authDomain: "bistrotbastards-login.firebaseapp.com",
  projectId: "bistrotbastards-login",
  storageBucket: "bistrotbastards-login.firebasestorage.app",
  messagingSenderId: "479005578581",
  appId: "1:479005578581:web:6615d66dca477c69730bdc",
  measurementId: "G-DPMP82GM2Y",
  databaseURL: "https://bistrotbastards-login-default-rtdb.europe-west1.firebasedatabase.app"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

console.log("[firebase] projectId:", app.options.projectId, "| apiKey6:", (firebaseConfig.apiKey || "").slice(0, 6));

export { firebaseConfig, setPersistence, browserLocalPersistence, onAuthStateChanged };
