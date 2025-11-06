import { ADMIN_UID } from '../core/config.js';

const statusEl = document.getElementById('bbAdminStatus');
const gridEl = document.getElementById('bbAdminGrid');

function openPortal(msg = 'Accès admin accordé (MVP).') {
  statusEl.textContent = msg;
  gridEl.hidden = false;
  // Ne pas laisser le pass traîner pour les prochains onglets
  sessionStorage.removeItem('bb.admin.pass');
}

(async () => {
  // 1) Pass MVP depuis login (via UID) :
  if (sessionStorage.getItem('bb.admin.pass') === 'ok') {
    openPortal();
    return;
  }
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
  statusEl.textContent = 'Accès refusé — retourne à la page de connexion.';
  setTimeout(() => location.href = '../auth/login.html', 900);
})();
