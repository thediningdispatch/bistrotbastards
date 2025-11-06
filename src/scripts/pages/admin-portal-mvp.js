import { ADMIN_UID } from '../core/config.js';

const statusEl = document.getElementById('bbAdminStatus');
const gridEl = document.getElementById('bbAdminGrid');

function openPortal(msg = '✅ Accès confirmé. Bienvenue, admin.') {
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.classList.remove('error');
  }
  if (gridEl) {
    gridEl.classList.remove('hidden');
    gridEl.setAttribute('aria-hidden', 'false');
  }
  // Ne pas laisser le pass traîner pour les prochains onglets
  sessionStorage.removeItem('bb.admin.pass');
}

function showError(msg = 'Accès refusé.') {
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.classList.add('error');
  }
}

(async () => {
  console.log('[Admin Portal] Script loaded');
  console.log('[Admin Portal] Checking sessionStorage...');
  const passValue = sessionStorage.getItem('bb.admin.pass');
  console.log('[Admin Portal] sessionStorage bb.admin.pass:', passValue);

  // 1) Pass MVP depuis login (via UID) :
  if (passValue === 'ok') {
    console.log('[Admin Portal] Valid pass found, opening portal...');
    openPortal();
    return;
  }
  console.log('[Admin Portal] No valid pass, checking Firebase auth...');
  // 2) Ou, si déjà connecté à Firebase avec l'UID admin, on autorise aussi :
  const waitAuth = () => new Promise(res => {
    let i = setInterval(() => { if (window.auth) { clearInterval(i); res(window.auth) } }, 50);
  });
  const auth = window.auth || await waitAuth();
  const user = auth?.currentUser || null;
  if (user && user.uid === ADMIN_UID) {
    openPortal('Accès admin via UID connecté.');
    return;
  }
  // 3) Sinon, retour login
  showError('❌ Accès refusé — redirection vers la page de connexion...');
  setTimeout(() => location.href = '../auth/login.html', 900);
})();
