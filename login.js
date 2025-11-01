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
      const message = mapLoginError(error);
      alert(message);
    }
  });
}

function mapLoginError(error) {
  if (!error) return 'Login failed. Please try again.';
  const { code } = error;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect username or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Login failed. Please try again.';
  }
}
