import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    const normalizedUsername = username.toLowerCase();
    const pseudoEmail = `${normalizedUsername}@bistrotbastards.local`;

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(auth, pseudoEmail, password);
      const user = credential.user;
      const profileRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(profileRef);

      let storedUsername = username;
      if (snapshot.exists()) {
        const data = snapshot.data();
        storedUsername = data.username || storedUsername;
      }

      localStorage.setItem('bb_user', JSON.stringify({ username: storedUsername }));

      window.location.href = 'index_waiter.html';
    } catch (error) {
      console.error('[login]', error.code, error.message);
      const message = mapLoginError(error);
      alert(message);
    }
  });
}

function mapLoginError(error) {
  if (!error) return 'Login failed. Please try again.';
  const { code } = error;
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid username or password.';
  }
  return 'Login failed. Please try again.';
}
