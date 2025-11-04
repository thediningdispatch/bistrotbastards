import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ROUTES } from './config.js';

const USER_KEY = 'bb_user';
const normalizePath = (path) => {
  if (!path) return '/';
  const normalized = path.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
};

const PUBLIC_PATHS = new Set([
  '/',
  normalizePath(ROUTES.INDEX),
  normalizePath(ROUTES.LOGIN),
  normalizePath(ROUTES.SIGNUP)
]);

// Export auth ready promise for other modules to await
let authReadyResolve;
export const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

function redirectToLogin() {
  const loginPath = ROUTES.LOGIN;
  if (normalizePath(window.location.pathname) !== normalizePath(loginPath)) {
    window.location.replace(loginPath);
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
  const currentPath = normalizePath(window.location.pathname);

  if (PUBLIC_PATHS.has(currentPath)) {
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
