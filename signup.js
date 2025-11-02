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
      console.error('[signup] error', error);
      alert('Sign-up failed. Please try again.');
    }
  });
}
