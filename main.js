const defaultUser = {
  username: 'Serveur Bistrot',
  role: 'serveur',
  avatar: null,
  restaurant: ''
};

const NAV_ITEMS = [
  { key: 'performances', label: 'Performances', href: '#', type: 'link' },
  { key: 'leaderboard', label: 'Classement', href: '#', type: 'link' },
  { key: 'chat', label: 'Chat', href: 'chat.html', type: 'link' },
  { key: 'profile', label: 'Profil', href: 'profile_waiter.html', type: 'link' },
  { key: 'logout', label: 'Out', href: '#', type: 'action' }
];

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
            return `<button class="btn" type="button" data-nav="${item.key}" id="bbLogoutBtn">${item.label}</button>`;
          }
          return `<a href="${item.href}" class="btn" data-nav="${item.key}">${item.label}</a>`;
        }).join('')}
      </div>
      <div class="bb-nav-menu">
        <a href="index.html" class="btn" data-nav="home">Home</a>
        <button id="bbMenuToggle" class="btn" aria-haspopup="true" aria-expanded="false">Menu ▾</button>
        <div id="bbMenuDropdown" class="bb-dropdown" role="menu" hidden>
          ${NAV_ITEMS.map(item => {
            if (item.key === 'logout') {
              return `<button id="bbLogoutBtnMobile" role="menuitem" class="linklike" data-nav="${item.key}" type="button">${item.label}</button>`;
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

function mountNavIntoHost(nav) {
  const host = document.getElementById('navHost');
  if (nav && host && nav.parentElement !== host) {
    host.appendChild(nav);
  }
}

function initNavigation(user, existingNav) {
  const nav = existingNav || ensureNav();
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
  const navLinks = nav.querySelectorAll('.bb-nav-inline a, #bbMenuDropdown a');
  navLinks.forEach(link => {
    const key = link.dataset.nav;
    const href = link.getAttribute('href') || '';
    const [linkPath] = href.split('#');
    let matches = false;
    switch (key) {
      case 'performances':
        matches = currentPath === 'performances.html';
        break;
      case 'leaderboard':
        matches = currentPath === 'leaderboard.html';
        break;
      case 'chat':
        matches = currentPath === 'chat.html';
        break;
      case 'profile':
        matches = currentPath === 'profile_waiter.html';
        break;
      default:
        matches = linkPath ? linkPath === currentPath : false;
        break;
    }
    if (matches) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });

  mountNavIntoHost(nav);
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
    initNavigation(user, nav);
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

  const menuBtn = nav.querySelector('#bbMenuToggle');
  const menuDrop = nav.querySelector('#bbMenuDropdown');
  if (menuBtn && menuDrop){
    menuBtn.addEventListener('click', () => {
      const open = !menuDrop.hasAttribute('hidden');
      if (open) {
        menuDrop.setAttribute('hidden','');
        menuBtn.setAttribute('aria-expanded','false');
      } else {
        menuDrop.removeAttribute('hidden');
        menuBtn.setAttribute('aria-expanded','true');
      }
    });
    document.addEventListener('click', (e)=>{
      if (menuDrop && !menuDrop.contains(e.target) && e.target !== menuBtn){
        menuDrop.setAttribute('hidden','');
        menuBtn.setAttribute('aria-expanded','false');
      }
    });
    menuDrop.addEventListener('click', (e)=>{
      if (e.target.closest('a, button')){
        menuDrop.setAttribute('hidden','');
        menuBtn.setAttribute('aria-expanded','false');
      }
    });
  }

  const logoutDesktop = nav.querySelector('#bbLogoutBtn');
  const logoutMobile = nav.querySelector('#bbLogoutBtnMobile');
  function wireLogout(btn){
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const { auth } = await import('./firebase.js');
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signOut(auth);
      localStorage.clear();
      location.href = 'login.html';
    });
  }
  wireLogout(logoutDesktop);
  wireLogout(logoutMobile);
}
