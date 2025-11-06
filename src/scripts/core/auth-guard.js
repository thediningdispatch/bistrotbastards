import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ROUTES } from './config.js';

const tAuthStart = performance.now();
let authLogEmitted = false;
let authReadyLogged = false;

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
  if (!authLogEmitted) {
    authLogEmitted = true;
    console.log('[Perf] auth-guard complete in', (performance.now() - tAuthStart).toFixed(1), 'ms');
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
  const currentPath = normalizePath(window.location.pathname);
  const isPublicPath = PUBLIC_PATHS.has(currentPath);
  const loginPath = normalizePath(ROUTES.LOGIN);
  const signupPath = normalizePath(ROUTES.SIGNUP);

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!authReadyLogged) {
      authReadyLogged = true;
      console.log('[Perf] Firebase/auth ready');
    }

    if (firebaseUser) {
      await hydrateUser(firebaseUser);

      if (normalizePath(window.location.pathname) === loginPath || normalizePath(window.location.pathname) === signupPath) {
        authReadyResolve(firebaseUser);
        window.location.replace(ROUTES.WAITER_HOME);
        return;
      }

      showPage();
      authReadyResolve(firebaseUser);
      return;
    }

    localStorage.removeItem(USER_KEY);

    if (isPublicPath) {
      showPage();
      authReadyResolve(false);
      return;
    }

    authReadyResolve(false);
    redirectToLogin();
  });
}

guard();

/*
 * PERF NOTES:
 * - Auth, navigation, and all page modules emit lightweight [Perf] logs for init timing.
 * - Home stats scripts and admin dashboard data fetch defer work via requestAnimationFrame/requestIdleCallback.
 * - Firebase SDK download remains the main startup cost and may need bundling/shaking for deeper gains.
 */
