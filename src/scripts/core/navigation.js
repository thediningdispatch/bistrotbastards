import { NAV_ITEMS, ROUTES } from './config.js';
import { getStoredUser, setStoredUser } from './utils.js';
import { auth, onAuthStateChanged } from './firebase.js';

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
function renderNavigation() {
  // Vérifier si la barre n'existe pas déjà
  if (document.querySelector('.bb-topbar')) return;

  // Construire les boutons de navigation avec la structure System 7
  const navButtons = NAV_ITEMS.map(item => {
    if (item.key === 'logout') {
      return `<button id="bbLogoutBtn" class="bb-nav-btn" type="button">${item.label}</button>`;
    }
    return `<a href="${item.href}" class="bb-nav-btn">${item.label}</a>`;
  }).join('');

  // Créer et injecter la barre en haut du body
  const topbar = document.createElement('div');
  topbar.className = 'bb-topbar';
  topbar.innerHTML = navButtons;

  document.body.insertBefore(topbar, document.body.firstChild);

  // Bind le bouton de déconnexion
  const logoutBtn = document.getElementById('bbLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Gestion de la déconnexion
async function handleLogout() {
  try {
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    await signOut(auth);
    localStorage.clear();
    location.href = ROUTES.LOGIN;
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Initialisation
function bootstrap() {
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
