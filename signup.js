import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';

const form = document.getElementById('signupForm');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = (formData.get('username') || '').trim();
    const email = (formData.get('email') || '').trim();
    const password = formData.get('password') || '';
    const position = formData.get('position') || 'waiter';
    const restaurant = (formData.get('restaurant') || '').trim();
    const avatarURL = formData.get('avatar') || '';

    if (!username || !email || !password || !restaurant || !avatarURL) {
      alert('Please complete every field.');
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = credential;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        email,
        position,
        restaurant,
        avatarURL,
        score: 0,
        createdAt: serverTimestamp()
      });

      localStorage.setItem('bb_user', JSON.stringify({
        username,
        avatar: avatarURL,
        restaurant,
        role: position
      }));
      localStorage.setItem('restaurant', restaurant);
      localStorage.setItem('username', username);
      localStorage.setItem('avatarURL', avatarURL);

      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      alert(error.message || 'Sign-up failed. Please try again.');
    }
  });
}
