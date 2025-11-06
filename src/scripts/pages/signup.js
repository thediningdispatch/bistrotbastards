import { auth, db, authPersistenceReady } from '../core/firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername, setStoredUser, getStoredUser } from '../core/utils.js';
import { ROUTES } from '../core/config.js';

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

  if (!username) {
    showError(errElm, "Choisissez un nom d'utilisateur.");
    return;
  }

  if (password.length < 6) {
    showError(errElm, 'Le mot de passe doit contenir au moins 6 caractères.');
    return;
  }

  lock.lock('Création…');
  let shouldUnlock = true;

  try {
    await authPersistenceReady;
    const pseudoEmail = `${username}@bistrotbastards.local`;
    const credential = await createUserWithEmailAndPassword(auth, pseudoEmail, password);

    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      username: displayName,
      createdAt: serverTimestamp()
    });

    // Store user data
    await setStoredUser({
      username: displayName
    });
    console.log('[Auth] Stored user after signup:', await getStoredUser());

    if (!window.__bb_redirecting) {
      window.__bb_redirecting = true;
      shouldUnlock = false;
      window.location.replace(ROUTES.WAITER_HOME);
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
