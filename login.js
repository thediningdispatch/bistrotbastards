import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername } from './ux.js';

const AVATAR_URLS = {
  pup_orange: 'assets/img/avatar_pup_orange.svg',
  pup_red: 'assets/img/avatar_pup_red.svg'
};

const form = document.getElementById('loginForm');
const errElm = document.getElementById('loginError');

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

  if (!username || !password) {
    showError(errElm, 'Veuillez remplir les deux champs.');
    return;
  }

  lock.lock('Connexion…');
  let shouldUnlock = true;

  try {
    await setPersistence(auth, browserLocalPersistence);
    const pseudoEmail = `${username}@bistrotbastards.local`;
    const credential = await signInWithEmailAndPassword(auth, pseudoEmail, password);

    try {
      const snapshot = await getDoc(doc(db, 'users', credential.user.uid));
      const data = snapshot.exists() ? (snapshot.data() || {}) : {};
      const finalName = data.username || displayName || username;
      const avatarKey = data.avatarKey || null;
      const avatarUrl = avatarKey && AVATAR_URLS[avatarKey] ? AVATAR_URLS[avatarKey] : (data.avatar || null);
      localStorage.setItem('bb_user', JSON.stringify({ username: finalName, avatarKey, avatar: avatarUrl || undefined }));
    } catch (profileError) {
      console.debug('[login] profil non récupéré', profileError);
      localStorage.setItem('bb_user', JSON.stringify({ username: displayName || username }));
    }

    if (!window.__bb_redirecting) {
      window.__bb_redirecting = true;
      shouldUnlock = false;
      location.href = 'index_waiter.html';
    }
  } catch (error) {
    console.error('[login]', error?.code, error?.message);
    const code = String(error?.code || '');
    if (code.includes('user-not-found') || code.includes('wrong-password')) {
      showError(errElm, 'Nom d’utilisateur ou mot de passe incorrect.');
    } else if (code.includes('too-many-requests')) {
      showError(errElm, 'Trop de tentatives. Réessayez plus tard.');
    } else {
      showError(errElm, 'Connexion impossible. Veuillez réessayer.');
    }
  } finally {
    if (shouldUnlock) {
      lock.unlock();
    }
  }
}
