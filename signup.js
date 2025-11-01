import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';

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
      alert(error.message || 'Sign-up failed. Please try again.');
    }
  });
}
