import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const form = document.getElementById('loginForm');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = (form.username.value || '').trim();
    const password = form.password.value || '';

    if (!username || !password) {
      alert('Enter both username and password.');
      return;
    }

    const pseudoEmail = `${username}@bistrotbastards.local`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(auth, pseudoEmail, password);
      const user = credential.user;
      const profileRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(profileRef);

      if (!snapshot.exists()) {
        throw new Error('User profile not found.');
      }

      const data = snapshot.data();
      const payload = {
        username: data.username || username
      };

      localStorage.setItem('bb_user', JSON.stringify(payload));

      window.location.href = 'index_waiter.html';
    } catch (error) {
      console.error(error);
      alert(error.message || 'Login failed. Please try again.');
    }
  });
}
