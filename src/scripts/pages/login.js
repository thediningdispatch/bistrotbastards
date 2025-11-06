import { auth, db, authPersistenceReady } from '../core/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername, setStoredUser, getStoredUser } from '../core/utils.js';
import { ROUTES, ADMIN_UID, ADMIN_PORTAL_PATH } from '../core/config.js';

const tPageStart = performance.now();

const form = document.getElementById('loginForm');
const errElm = document.getElementById('loginError');

if (typeof window.__bb_redirecting !== 'boolean') {
  window.__bb_redirecting = false;
}

if (onceBind(form, handleSubmit)) {
  showError(errElm, '');
}

// Admin shortcut modal logic (MVP: redirection directe sans auth Firebase)
const $ = (id) => document.getElementById(id);

$('bbAdminBtn')?.addEventListener('click', () => {
  $('#bbAdminModal').classList.remove('hidden');
  $('#bbAdminModal').setAttribute('aria-hidden', 'false');
  $('#bbAdminUID').focus();
});

$('bbAdminCancel')?.addEventListener('click', () => {
  $('#bbAdminModal').classList.add('hidden');
  $('#bbAdminModal').setAttribute('aria-hidden', 'true');
});

$('bbAdminGo')?.addEventListener('click', () => {
  const val = ($('#bbAdminUID')?.value || '').trim();
  if (val !== ADMIN_UID) {
    alert('UID invalide');
    return;
  }
  // Token MVP pour le portail admin (effacé à l'ouverture)
  sessionStorage.setItem('bb.admin.pass', 'ok');
  window.location.href = ADMIN_PORTAL_PATH;
});

console.log('[Perf] login init in', (performance.now() - tPageStart).toFixed(1), 'ms');

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
    await authPersistenceReady;
    const pseudoEmail = `${username}@bistrotbastards.local`;
    const credential = await signInWithEmailAndPassword(auth, pseudoEmail, password);

    try {
      const snapshot = await getDoc(doc(db, 'users', credential.user.uid));
      const data = snapshot.exists() ? (snapshot.data() || {}) : {};
      const finalName = data.username || displayName || username;

      // Store user data
      await setStoredUser({
        username: finalName
      });

      console.log('[Auth] Stored user after login:', await getStoredUser());
    } catch (profileError) {
      // Store minimal user data on profile fetch error
      await setStoredUser({
        username: displayName || username
      });
      console.log('[Auth] Stored user after login (fallback):', await getStoredUser());
    }

    if (!window.__bb_redirecting) {
      window.__bb_redirecting = true;
      shouldUnlock = false;
      window.location.replace(ROUTES.WAITER_HOME);
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
