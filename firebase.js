import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHsl-wNXYGKO6YfDJoaqJhuNKQJnK8hmc",
  authDomain: "bistrotbastards-login.firebaseapp.com",
  projectId: "bistrotbastards-login",
  storageBucket: "bistrotbastards-login.firebasestorage.app",
  messagingSenderId: "479005578581",
  appId: "1:479005578581:web:6615d66dca477c69730bdc",
  measurementId: "G-DPMP82GM2Y"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { firebaseConfig, setPersistence, browserLocalPersistence, onAuthStateChanged };
