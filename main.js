import { auth } from './firebase.js';

const NAV_ITEMS = [
  { label: 'Dashboard', href: 'dashboard.html', key: 'dashboard' },
  { label: 'Leaderboard', href: 'leaderboard.html', key: 'leaderboard' },
  { label: 'Chat', href: 'chat.html', key: 'chat' },
  { label: 'Profile', href: 'dashboard.html#profile', key: 'profile' },
  { label: 'Logout', href: '#', key: 'logout' }
];

const defaultUser = {
  username: 'Bistrot Waiter',
  role: 'waiter',
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
  } catch (error) {
    console.warn('Could not persist user:', error);
  }
}

function ensureNav() {
  if (document.body.classList.contains('no-nav')) return null;
  let nav = document.querySelector('.top-nav');
  if (nav) return nav;

  nav = document.createElement('header');
  nav.className = 'top-nav window';
  nav.innerHTML = `
    <div class="nav-inner">
      <div class="nav-left">
        <div class="nav-avatar" id="navAvatar"></div>
        <div class="nav-username">
          <span id="navUsername"></span>
          <small id="navRole"></small>
        </div>
      </div>
      <h1 class="logo-text">Bistrot Bastards</h1>
      <div class="nav-links">
        ${NAV_ITEMS.map(item => `<a href="${item.href}" data-nav="${item.key}">${item.label}</a>`).join('')}
      </div>
    </div>
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
  if (roleEl) roleEl.textContent = user.role || 'staff';

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const currentHash = window.location.hash || '';
  nav.querySelectorAll('.nav-links a').forEach(link => {
    const key = link.dataset.nav;
    const href = link.getAttribute('href') || '';
    if (key === 'logout') return;

    const linkPath = href.split('#')[0];
    let matches = linkPath ? linkPath === currentPath : false;
    if (key === 'profile') {
      matches = currentPath === 'dashboard.html' && currentHash === '#profile';
    }
    if (matches) {
      link.classList.add('is-active');
    } else {
      link.classList.remove('is-active');
    }
  });

  const logoutLink = nav.querySelector('[data-nav="logout"]');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await auth.signOut();
      } catch (error) {
        console.warn('Sign-out warning:', error);
      }
      localStorage.removeItem('bb_user');
      localStorage.removeItem('restaurant');
      window.location.href = 'login.html';
    });
  }
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
