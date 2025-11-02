import { auth } from './firebase.js';

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: 'dashboard.html', key: 'dashboard' },
  { label: 'Classement', href: 'leaderboard.html', key: 'leaderboard' },
  { label: 'Chat', href: 'chat.html', key: 'chat' },
  { label: 'Profil', href: 'dashboard.html#profile', key: 'profile' },
  { label: 'Déconnexion', href: '#', key: 'logout' }
];

const defaultUser = {
  username: 'Serveur Bistrot',
  role: 'serveur',
  avatar: null,
  restaurant: ''
};

function loadUser() {
  try {
    const stored = localStorage.getItem('bb_user');
    if (stored) {
      return { ...defaultUser, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('User state error:', error);
  }
  return { ...defaultUser };
}

function saveUser(user) {
  try {
    localStorage.setItem('bb_user', JSON.stringify(user));
    if (user.restaurant) {
      localStorage.setItem('restaurant', user.restaurant);
    }
    if (user.username) {
      localStorage.setItem('username', user.username);
    }
    if (user.avatar) {
      localStorage.setItem('avatarURL', user.avatar);
    } else {
      localStorage.removeItem('avatarURL');
    }
  } catch (error) {
    console.warn('Could not persist user:', error);
  }
}

function ensureNavStyles() {
  const existing = document.querySelector('link[href$="assets/css/nav.css"]');
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'assets/css/nav.css';
  link.id = 'bb-nav-css';
  document.head.appendChild(link);
}

function ensureNav() {
  if (document.body.classList.contains('no-nav')) return null;
  let nav = document.querySelector('.top-nav');
  if (nav) return nav;

  ensureNavStyles();

  nav = document.createElement('header');
  nav.className = 'top-nav window';
  nav.innerHTML = `
    <nav class="bb-nav">
      <div class="bb-nav-left nav-left">
        <div class="nav-avatar" id="navAvatar"></div>
        <div class="nav-username">
          <span id="navUsername"></span>
          <small id="navRole"></small>
        </div>
      </div>
      <div class="bb-nav-inline" role="menubar" aria-label="Main">
        ${NAV_ITEMS.map(item => {
          if (item.key === 'logout') {
            return `<button type="button" class="btn" data-nav="${item.key}" id="bbLogoutBtn">${item.label}</button>`;
          }
          return `<a class="btn" href="${item.href}" data-nav="${item.key}">${item.label}</a>`;
        }).join('')}
      </div>
      <div class="bb-nav-menu">
        <button id="bbMenuToggle" class="btn" aria-haspopup="true" aria-expanded="false">Menu ▾</button>
        <div id="bbMenuDropdown" class="bb-dropdown" role="menu" hidden>
          ${NAV_ITEMS.map(item => {
            if (item.key === 'logout') {
              return `<button type="button" class="linklike" data-nav="${item.key}" id="bbLogoutBtnMobile" role="menuitem">${item.label}</button>`;
            }
            return `<a href="${item.href}" role="menuitem" data-nav="${item.key}">${item.label}</a>`;
          }).join('')}
        </div>
      </div>
    </nav>
  `;
  document.body.prepend(nav);
  return nav;
}

function initNavigation(user) {
  const nav = ensureNav();
  if (!nav) return;

  const avatarEl = nav.querySelector('#navAvatar');
  const usernameEl = nav.querySelector('#navUsername');
  const roleEl = nav.querySelector('#navRole');

  if (avatarEl) {
    if (user.avatar) {
      avatarEl.style.backgroundImage = `url(${user.avatar})`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.textContent = (user.username || 'B')[0].toUpperCase();
    }
  }

  if (usernameEl) usernameEl.textContent = user.username || 'Guest';
  if (roleEl) roleEl.textContent = user.role || 'équipe';

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const currentHash = window.location.hash || '';
  nav.querySelectorAll('.bb-nav-inline a').forEach(link => {
    const key = link.dataset.nav;
    const href = link.getAttribute('href') || '';
    const linkPath = href.split('#')[0];
    let matches = linkPath ? linkPath === currentPath : false;
    if (key === 'leaderboard') {
      matches = matches || currentPath === 'index_waiter.html';
    }
    if (key === 'profile') {
      matches = currentPath === 'dashboard.html' && currentHash === '#profile';
    }
    if (matches) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });

  nav.querySelectorAll('#bbMenuDropdown a').forEach(link => {
    const key = link.dataset.nav;
    const href = link.getAttribute('href') || '';
    const linkPath = href.split('#')[0];
    let matches = linkPath ? linkPath === currentPath : false;
    if (key === 'leaderboard') {
      matches = matches || currentPath === 'index_waiter.html';
    }
    if (key === 'profile') {
      matches = currentPath === 'dashboard.html' && currentHash === '#profile';
    }
    if (matches) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });

  bindNavInteractions(nav);
}

function ensureDefaultRestaurant(user) {
  if (!localStorage.getItem('restaurant') && user.restaurant) {
    localStorage.setItem('restaurant', user.restaurant);
  }
}

function bootstrap() {
  const user = loadUser();
  const nav = ensureNav();
  if (nav) {
    initNavigation(user);
  }
  ensureDefaultRestaurant(user);
}

document.addEventListener('DOMContentLoaded', bootstrap);

window.appState = {
  get user() {
    return loadUser();
  },
  setUser(user) {
    saveUser(user);
    initNavigation(loadUser());
  }
};

function bindNavInteractions(nav) {
  if (!nav || nav.dataset.navBound === '1') return;
  nav.dataset.navBound = '1';

  const menuToggle = nav.querySelector('#bbMenuToggle');
  const dropdown = nav.querySelector('#bbMenuDropdown');

  const closeMenu = () => {
    if (!dropdown || dropdown.hidden) return;
    dropdown.hidden = true;
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  };

  if (menuToggle && dropdown) {
    menuToggle.addEventListener('click', (event) => {
      event.preventDefault();
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeMenu();
      } else {
        dropdown.hidden = false;
        menuToggle.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    dropdown.querySelectorAll('a, button').forEach(item => {
      item.addEventListener('click', () => {
        closeMenu();
      });
    });
  }

  const logoutButtons = nav.querySelectorAll('[data-nav="logout"]');
  logoutButtons.forEach(button => {
    if (button.dataset.logoutBound === '1') return;
    button.dataset.logoutBound = '1';
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      await performLogout();
    });
  });
}

async function performLogout() {
  try {
    await auth.signOut();
  } catch (error) {
    console.warn('Sign-out warning:', error);
  }
  localStorage.removeItem('bb_user');
  localStorage.removeItem('restaurant');
  window.location.href = 'login.html';
}
