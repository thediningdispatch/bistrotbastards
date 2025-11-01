import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById('signupForm');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = (formData.get('username') || '').trim();
    const password = formData.get('password') || '';

    if (!username || !password) {
      alert('Please complete every field.');
      return;
    }

    const pseudoEmail = `${username}@bistrotbastards.local`;

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
      console.error(error);
      const message = mapSignupError(error);
      alert(message);
    }
  });
}

function mapSignupError(error) {
  if (!error) return 'Sign-up failed. Please try again.';
  const { code } = error;
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This username is already taken. Choose another one.';
    case 'auth/weak-password':
      return 'Password is too weak. Try a longer password.';
    case 'auth/operation-not-allowed':
      return 'Sign-ups are temporarily disabled. Please contact support.';
    default:
      return 'Sign-up failed. Please try again.';
  }
}
