import { auth, db, authPersistenceReady } from '../core/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onceBind, withSubmitLock, showError, normUsername, setStoredUser, getStoredUser } from '../core/utils.js';
import { ROUTES, ADMIN_UID, ADMIN_EMAIL } from '../core/config.js';

const tPageStart = performance.now();

const form = document.getElementById('loginForm');
const errElm = document.getElementById('loginError');

if (typeof window.__bb_redirecting !== 'boolean') {
  window.__bb_redirecting = false;
}

if (onceBind(form, handleSubmit)) {
  showError(errElm, '');
}

// Admin shortcut modal logic
const $ = (id) => document.getElementById(id);

$('adminShortcutBtn')?.addEventListener('click', () => {
  $('#adminUidModal').classList.remove('hidden');
  $('#adminUidModal').setAttribute('aria-hidden', 'false');
  $('#adminUidInput').focus();
});

$('adminUidCancel')?.addEventListener('click', () => {
  $('#adminUidModal').classList.add('hidden');
  $('#adminUidModal').setAttribute('aria-hidden', 'true');
});

$('adminUidOk')?.addEventListener('click', () => {
  const v = ($('#adminUidInput')?.value || '').trim();
  if (v !== ADMIN_UID) {
    alert('UID incorrect');
    return;
  }
  const usernameField = $('#loginUsername');
  const passwordField = $('#loginPassword');
  // Pre-fill with email if available, otherwise username "bistrotbastards"
  usernameField.value = (ADMIN_EMAIL && ADMIN_EMAIL.includes('@')) ? ADMIN_EMAIL : 'bistrotbastards';
  usernameField.dispatchEvent(new Event('input', { bubbles: true }));
  $('#adminUidModal').classList.add('hidden');
  $('#adminUidModal').setAttribute('aria-hidden', 'true');
  passwordField.focus();
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
      // Redirect to admin portal if user is admin, otherwise to waiter home
      const redirectUrl = (credential.user.uid === ADMIN_UID) ? ROUTES.ADMIN_PORTAL : ROUTES.WAITER_HOME;
      window.location.replace(redirectUrl);
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
