import { auth, db } from '../core/firebase.js';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername, setStoredUser } from '../core/utils.js';
import { AVATAR_URLS, ROUTES } from '../core/config.js';

const tPageStart = performance.now();

const form = document.getElementById('signupForm');
const errElm = document.getElementById('signupError');

if (typeof window.__bb_redirecting !== 'boolean') {
  window.__bb_redirecting = false;
}

if (onceBind(form, handleSubmit)) {
  showError(errElm, '');
}

console.log('[Perf] signup init in', (performance.now() - tPageStart).toFixed(1), 'ms');

async function handleSubmit(event) {
  event.preventDefault();
  showError(errElm, '');

  const lock = withSubmitLock(form);
  const rawUsername = form?.username?.value || '';
  const username = normUsername(rawUsername);
  const password = form?.password?.value || '';
  const displayName = rawUsername.trim() || username;
  const avatarKey = form?.avatarKey?.value || '';
  const avatarUrl = AVATAR_URLS[avatarKey] || '';

  if (!username) {
    showError(errElm, 'Choisissez un nom d’utilisateur.');
    return;
  }

  if (password.length < 6) {
    showError(errElm, 'Le mot de passe doit contenir au moins 6 caractères.');
    return;
  }

  if (!avatarUrl) {
    showError(errElm, 'Choisis un badge avant de continuer.');
    return;
  }

  lock.lock('Création…');
  let shouldUnlock = true;

  try {
    await setPersistence(auth, browserLocalPersistence);
    const pseudoEmail = `${username}@bistrotbastards.local`;
    const credential = await createUserWithEmailAndPassword(auth, pseudoEmail, password);

    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      username: displayName,
      avatarKey,
      createdAt: serverTimestamp()
    });

    // Store user data with proper avatar resolution
    await setStoredUser({
      username: displayName,
      avatarKey,
      avatar: avatarUrl
    });

    if (!window.__bb_redirecting) {
      window.__bb_redirecting = true;
      shouldUnlock = false;
      location.href = ROUTES.WAITER_HOME;
    }
  } catch (error) {
    console.error('[signup]', error?.code, error?.message);
    const code = String(error?.code || '');
    if (code.includes('weak-password')) {
      showError(errElm, 'Le mot de passe doit contenir au moins 6 caractères.');
    } else if (code.includes('email-already-in-use')) {
      showError(errElm, 'Ce nom d’utilisateur est déjà utilisé.');
    } else if (code.includes('invalid-email')) {
      showError(errElm, 'Nom d’utilisateur invalide.');
    } else {
      showError(errElm, 'Inscription impossible. Veuillez réessayer.');
    }
  } finally {
    if (shouldUnlock) {
      lock.unlock();
    }
  }
}
