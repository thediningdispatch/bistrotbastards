import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername } from './ux.js';

const form = document.getElementById('signupForm');
const errElm = document.getElementById('signupError');

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

  if (!username) {
    showError(errElm, 'Choose a username.');
    return;
  }

  if (password.length < 6) {
    showError(errElm, 'Password must be at least 6 characters.');
    return;
  }

  lock.lock('Creating…');
  let shouldUnlock = true;

  try {
    await setPersistence(auth, browserLocalPersistence);
    const pseudoEmail = `${username}@bistrotbastards.local`;
    const credential = await createUserWithEmailAndPassword(auth, pseudoEmail, password);

    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      username: displayName,
      createdAt: serverTimestamp()
    });

    localStorage.setItem('bb_user', JSON.stringify({ username: displayName }));

    if (!window.__bb_redirecting) {
      window.__bb_redirecting = true;
      shouldUnlock = false;
      location.href = 'index_waiter.html';
    }
  } catch (error) {
    console.error('[signup]', error?.code, error?.message);
    const code = String(error?.code || '');
    if (code.includes('weak-password')) {
      showError(errElm, 'Password must be at least 6 characters.');
    } else if (code.includes('email-already-in-use')) {
      showError(errElm, 'This username is already taken.');
    } else if (code.includes('invalid-email')) {
      showError(errElm, 'Invalid username.');
    } else {
      showError(errElm, 'Sign-up failed. Please try again.');
    }
  } finally {
    if (shouldUnlock) {
      lock.unlock();
    }
  }
}
