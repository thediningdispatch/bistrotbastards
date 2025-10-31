import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const form = document.getElementById('loginForm');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = (form.email.value || '').trim();
    const password = form.password.value || '';

    if (!email || !password) {
      alert('Enter both email and password.');
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      const profileRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(profileRef);

      if (!snapshot.exists()) {
        throw new Error('User profile not found.');
      }

      const data = snapshot.data();
      const payload = {
        username: data.username || email,
        avatar: data.avatarURL || null,
        restaurant: data.restaurant || '',
        role: data.position || 'waiter'
      };

      localStorage.setItem('bb_user', JSON.stringify(payload));
      if (payload.restaurant) {
        localStorage.setItem('restaurant', payload.restaurant);
      }
      localStorage.setItem('username', payload.username || '');
      if (payload.avatar) {
        localStorage.setItem('avatarURL', payload.avatar);
      } else {
        localStorage.removeItem('avatarURL');
      }

      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      alert(error.message || 'Login failed. Please try again.');
    }
  });
}
