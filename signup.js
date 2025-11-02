import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById('signupForm');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = (form.username.value || '').trim();
    const password = form.password.value || '';

    if (!username || !password) {
      alert('Please complete every field.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    const normalizedUsername = username.toLowerCase();
    const pseudoEmail = `${normalizedUsername}@bistrotbastards.local`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await createUserWithEmailAndPassword(auth, pseudoEmail, password);
      const { user } = credential;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        createdAt: serverTimestamp()
      });

      localStorage.setItem('bb_user', JSON.stringify({ username }));

      window.location.href = 'index_waiter.html';
    } catch (error) {
      console.error('[signup]', error.code, error.message);
      const message = mapSignupError(error);
      alert(message);
    }
  });
}

function mapSignupError(error) {
  if (!error) return 'Sign-up failed. Please try again.';
  const { code } = error;
  switch (code) {
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'This username is already taken.';
    case 'auth/invalid-email':
      return 'Invalid username format.';
    default:
      return 'Sign-up failed. Please try again.';
  }
}
