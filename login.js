import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername } from './ux.js';

const form = document.getElementById('loginForm');
const errElm = document.getElementById('loginError');

if (typeof window.__bb_redirecting !== 'boolean') {
  window.__bb_redirecting = false;
}

if (onceBind(form, handleSubmit)) {
  showError(errElm, '');
}

async function handleSubmit(event) {
  event.preventDefault();
  showError(errElm, '');

  const lock = withSubmitLock(form);
  const rawUsername = form?.username?.value || '';
  const username = normUsername(rawUsername);
  const password = form?.password?.value || '';
  const displayName = rawUsername.trim() || username;

  if (!username || !password) {
    showError(errElm, 'Please fill both fields.');
    return;
  }

  lock.lock('Logging in…');
  let shouldUnlock = true;

  try {
    await setPersistence(auth, browserLocalPersistence);
    const pseudoEmail = `${username}@bistrotbastards.local`;
    const credential = await signInWithEmailAndPassword(auth, pseudoEmail, password);

    try {
      const snapshot = await getDoc(doc(db, 'users', credential.user.uid));
      const finalName = snapshot.exists()
        ? (snapshot.data().username || displayName || username)
        : (displayName || username);
      localStorage.setItem('bb_user', JSON.stringify({ username: finalName }));
    } catch (profileError) {
      console.debug('[login] profile fetch skipped', profileError);
      localStorage.setItem('bb_user', JSON.stringify({ username: displayName || username }));
    }

    if (!window.__bb_redirecting) {
      window.__bb_redirecting = true;
      shouldUnlock = false;
      location.href = 'index_waiter.html';
    }
  } catch (error) {
    console.error('[login]', error?.code, error?.message);
    const code = String(error?.code || '');
    if (code.includes('user-not-found') || code.includes('wrong-password')) {
      showError(errElm, 'Invalid username or password.');
    } else if (code.includes('too-many-requests')) {
      showError(errElm, 'Too many attempts. Try again later.');
    } else {
      showError(errElm, 'Login failed. Please try again.');
    }
  } finally {
    if (shouldUnlock) {
      lock.unlock();
    }
  }
}
