import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const PUBLIC_PAGES = new Set(['', 'index.html', 'login.html', 'signup.html']);
const USER_KEY = 'bb_user';

function currentPage() {
  return window.location.pathname.split('/').pop() || '';
}

function redirectToLogin() {
  if (currentPage() !== 'login.html') {
    window.location.href = 'login.html';
  }
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
  if (PUBLIC_PAGES.has(currentPage())) {
    return;
  }

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      localStorage.removeItem(USER_KEY);
      redirectToLogin();
      return;
    }

    await hydrateUser(firebaseUser);
  });
}

guard();
