import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PUBLIC_PAGES = new Set(['', 'index.html', 'login.html', 'signup.html']);
const USER_KEY = 'bb_user';

// Export auth ready promise for other modules to await
let authReadyResolve;
export const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

function currentPage() {
  return window.location.pathname.split('/').pop() || '';
}

function redirectToLogin() {
  if (currentPage() !== 'login.html') {
    window.location.href = 'login.html';
  }
}

function showPage() {
  document.body.style.visibility = 'visible';
  document.body.style.opacity = '1';
}

function persistUser(payload) {
  if (window.appState?.setUser) {
    window.appState.setUser(payload);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(payload));
  }
}

async function hydrateUser(firebaseUser) {
  try {
    const profileRef = doc(db, 'users', firebaseUser.uid);
    const snapshot = await getDoc(profileRef);
    const fallbackName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Guest';
    const username = snapshot.exists()
      ? snapshot.data().username || fallbackName
      : fallbackName;

    persistUser({ username });
  } catch (error) {
    console.warn('Auth guard hydration warning:', error);
    const fallbackName = firebaseUser?.email ? firebaseUser.email.split('@')[0] : 'Guest';
    persistUser({ username: fallbackName });
  }
}

function guard() {
  const page = currentPage();

  if (PUBLIC_PAGES.has(page)) {
    showPage();
    authReadyResolve(true);
    return;
  }

  // Hide page content until auth is verified
  document.body.style.visibility = 'hidden';
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.2s ease';

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      localStorage.removeItem(USER_KEY);
      redirectToLogin();
      return;
    }

    await hydrateUser(firebaseUser);
    showPage();
    authReadyResolve(firebaseUser);
  });
}

guard();
