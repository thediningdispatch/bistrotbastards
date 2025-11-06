import { auth } from '../core/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authReady } from '../core/auth-guard.js';
import { ADMIN_UID } from '../core/config.js';

const tPageStart = performance.now();

const statusEl = document.getElementById('adminStatus');
const gridEl = document.getElementById('adminGrid');

function redirectToLogin() {
  window.location.href = '../../pages/auth/login.html';
}

function redirectToProfile() {
  window.location.href = '../../pages/waiter/profile.html';
}

function showGrid() {
  if (gridEl) {
    gridEl.classList.remove('hidden');
    gridEl.setAttribute('aria-hidden', 'false');
  }
}

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  if (isError) {
    statusEl.style.background = '#ffe3e3';
    statusEl.style.color = '#c00';
  } else {
    statusEl.style.background = '#e9ffe3';
    statusEl.style.color = '#060';
  }
}

console.log('[Perf] admin-portal init in', (performance.now() - tPageStart).toFixed(1), 'ms');

// ========== ADMIN PORTAL ACCESS GUARD (MVP) ==========
// Vérifier que l'utilisateur possède l'UID admin
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log('[admin-portal] No user signed in, redirecting to login...');
    setStatus('Connexion requise.', true);
    setTimeout(redirectToLogin, 600);
    return;
  }

  console.log('[admin-portal] User authenticated:', user.uid);

  if (user.uid !== ADMIN_UID) {
    console.warn('[admin-portal] Access denied - admin UID required');
    setStatus('Accès refusé — réservé à l\'administrateur.', true);
    setTimeout(redirectToProfile, 1200);
    return;
  }

  // Admin OK → afficher la grille
  console.log('[admin-portal] Admin access granted (MVP)');
  setStatus('Accès confirmé (MVP). Bienvenue, admin.', false);
  showGrid();
});
