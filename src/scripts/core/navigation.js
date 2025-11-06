import { NAV_ITEMS, ROUTES } from './config.js';
import { getStoredUser, setStoredUser } from './utils.js';

const defaultUser = {
  username: 'Serveur Bistrot',
  role: 'serveur',
  restaurant: ''
};

async function loadUser() {
  try {
    const stored = await getStoredUser();
    if (stored && Object.keys(stored).length > 0) {
      return { ...defaultUser, ...stored };
    }
  } catch (error) {
    console.warn('User state error:', error);
  }
  return { ...defaultUser };
}

async function saveUser(user) {
  try {
    await setStoredUser(user);
    if (user.restaurant) {
      localStorage.setItem('restaurant', user.restaurant);
    }
  } catch (error) {
    console.warn('Could not persist user:', error);
  }
}

// Fonction pour injecter la barre de navigation System 7 en haut de la page
async function renderNavigation() {
  // Vérifier si la barre n'existe pas déjà
  if (document.querySelector('.bb-topbar')) return;

  const primaryItems = NAV_ITEMS.filter(item => ['home', 'chat', 'profile'].includes(item.key));

  const primaryButtons = primaryItems.map(item => {
    return `<a href="${item.href}" class="bb-nav-btn">${item.label}</a>`;
  }).join('');

  const dropdownMarkup = `
    <div class="bb-nav-dropdown-wrapper">
      <button id="bbMenuToggle" class="bb-nav-btn bb-nav-btn--menu" type="button" aria-haspopup="true" aria-expanded="false">
        Menu ▾
      </button>
      <div id="bbMenuDropdown" class="bb-dropdown" role="menu" hidden>
        <button id="bbAdminBtn" class="bb-dropdown__item linklike" type="button" role="menuitem">Admin</button>
        <button id="bbLogoutBtn" class="bb-dropdown__item linklike" type="button" role="menuitem">Out</button>
      </div>
    </div>`;

  const navButtons = primaryButtons + dropdownMarkup;

  // Créer et injecter la barre en haut du body
  const topbar = document.createElement('div');
  topbar.className = 'bb-topbar';
  topbar.innerHTML = navButtons;

  document.body.insertBefore(topbar, document.body.firstChild);

  const menuToggle = topbar.querySelector('#bbMenuToggle');
  const dropdown = topbar.querySelector('#bbMenuDropdown');
  const adminBtn = topbar.querySelector('#bbAdminBtn');
  const logoutBtn = topbar.querySelector('#bbLogoutBtn');

  if (!menuToggle || !dropdown) return;

  const ensureClosedState = () => {
    dropdown.setAttribute('hidden', '');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  ensureClosedState();

  const isOpen = () => !dropdown.hasAttribute('hidden');

  const openMenu = () => {
    if (isOpen()) return;
    dropdown.removeAttribute('hidden');
    menuToggle.setAttribute('aria-expanded', 'true');
    dropdown.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
  };

  const closeMenu = () => {
    if (!isOpen()) return;
    dropdown.setAttribute('hidden', '');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  const toggleMenu = () => {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  menuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  document.addEventListener('click', (event) => {
    if (!isOpen()) return;
    if (dropdown.contains(event.target) || event.target === menuToggle) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.addEventListener('resize', closeMenu);
  window.addEventListener('orientationchange', closeMenu);

  const handleLogout = async () => {
    closeMenu();
    try {
      const { auth } = await import('../core/firebase.js');
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signOut(auth);
    } catch (_) {}
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
    const fallback = ROUTES.LOGIN || ROUTES.WAITER_HOME || '/';
    window.location.href = fallback;
  };

  adminBtn?.addEventListener('click', () => {
    closeMenu();
    const PASS = 'pranklord666';
    const input = window.prompt('Mot de passe admin :');
    if (!input) return;
    if (input === PASS) {
      try {
        sessionStorage.setItem('bb_admin_ok', '1');
      } catch (_) {}
      window.location.href = ROUTES.ADMIN_DASHBOARD;
    } else {
      window.alert('❌ Mot de passe incorrect');
    }
  });
  logoutBtn?.addEventListener('click', async () => {
    await handleLogout();
    closeMenu();
  });
}

// Initialisation
async function bootstrap() {
  const body = document.body;
  const skipNav = body?.classList?.contains('admin-page')
    || body?.classList?.contains('no-nav');

  if (skipNav) {
    return;
  }

  renderNavigation();
}

// Exécution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// API globale pour compatibilité
window.appState = {
  async getUser() {
    return await loadUser();
  },
  async setUser(user) {
    await saveUser(user);
  }
};
