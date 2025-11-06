import { auth } from '../core/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authReady } from '../core/auth-guard.js';

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

// ========== ADMIN PORTAL ACCESS GUARD ==========
// Vérifier que l'utilisateur possède le custom claim isAdmin
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log('[admin-portal] No user signed in, redirecting to login...');
    setStatus('Connexion requise.', true);
    setTimeout(redirectToLogin, 600);
    return;
  }

  try {
    // Récupérer le token avec les claims
    const tokenResult = await user.getIdTokenResult(true);
    const isAdmin = !!tokenResult.claims?.isAdmin;

    console.log('[admin-portal] User authenticated:', user.uid);
    console.log('[admin-portal] isAdmin claim:', isAdmin);

    if (!isAdmin) {
      console.warn('[admin-portal] Access denied - admin privileges required');
      setStatus('Accès refusé — réservé à l\'administrateur.', true);
      setTimeout(redirectToProfile, 1200);
      return;
    }

    // Admin OK → afficher la grille
    console.log('[admin-portal] Admin access granted');
    setStatus('Accès confirmé. Bienvenue, admin.', false);
    showGrid();
  } catch (error) {
    console.error('[admin-portal] Error checking admin status:', error);
    setStatus('Erreur d\'authentification — réessayez.', true);
  }
});
