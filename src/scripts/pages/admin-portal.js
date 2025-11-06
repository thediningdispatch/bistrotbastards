import { auth, onAuthStateChanged, signInWithEmailAndPassword } from '../core/firebase.js';
import { ADMIN_UID, ADMIN_EMAIL } from '../core/config.js';

const statusEl = document.getElementById('adminStatus');
const gridEl = document.getElementById('adminGrid');
const loginEl = document.getElementById('adminLogin');
const emailEl = document.getElementById('adminEmail');
const passEl = document.getElementById('adminPass');
const signInBtn = document.getElementById('adminSignIn');

let busy = false;

if (emailEl && ADMIN_EMAIL) {
  emailEl.value = ADMIN_EMAIL;
}

function show(message = '', { grid = false, login = false } = {}) {
  if (statusEl) {
    statusEl.textContent = message;
  }
  if (gridEl) {
    gridEl.hidden = !grid;
  }
  if (loginEl) {
    loginEl.hidden = !login;
  }
}

async function handleSignIn() {
  if (!signInBtn || busy) return;

  const email = (emailEl?.value || '').trim();
  const password = passEl?.value || '';

  if (!email || !password) {
    show('Renseigne email et mot de passe.', { login: true });
    return;
  }

  busy = true;
  signInBtn.disabled = true;
  show('Connexion…', { login: true });

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('[admin portal] signIn error:', error);
    show('Échec de connexion. Vérifie les identifiants.', { login: true });
  } finally {
    busy = false;
    signInBtn.disabled = false;
  }
}

signInBtn?.addEventListener('click', handleSignIn);

passEl?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSignIn();
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    show('Connecte-toi pour accéder à l’administration.', { login: true });
    return;
  }

  if (user.uid !== ADMIN_UID) {
    show('Accès refusé — compte administrateur requis.', { login: true });
    return;
  }

  show('Accès confirmé.', { grid: true });
});
