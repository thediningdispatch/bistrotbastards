import { AVATAR_URLS, NAV_ITEMS, ROUTES } from './config.js';
import { getStoredUser, setStoredUser, getStoredAvatar, hydrateBadge } from './utils.js';
import { auth, onAuthStateChanged } from './firebase.js';

const defaultUser = {
  username: 'Serveur Bistrot',
  role: 'serveur',
  avatar: null,
  avatarKey: null,
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
    // Store additional legacy keys for compatibility
    if (user.restaurant) {
      localStorage.setItem('restaurant', user.restaurant);
    }
  } catch (error) {
    console.warn('Could not persist user:', error);
  }
}

let bbNavOffsetBound = false;

function updateNavOffset(nav) {
  const header = nav || document.querySelector('.top-nav');
  if (!header) return;

  const safeTop = (header.offsetHeight || 0) + 8;
  document.documentElement.style.setProperty('--bb-nav-height', `${safeTop}px`);
}

function bindNavOffsetUpdates(nav) {
  updateNavOffset(nav);

  if (bbNavOffsetBound) return;
  bbNavOffsetBound = true;

  const handler = () => updateNavOffset(nav);

  window.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);
  window.addEventListener('load', handler);
}

function getAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar) return user.avatar;
  if (user.avatarKey && AVATAR_URLS[user.avatarKey]) {
    return AVATAR_URLS[user.avatarKey];
  }
  return null;
}

function ensureNavStyles() {
  const existing = document.querySelector('link[href*="navigation.css"]');
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../../styles/navigation.css', import.meta.url).pathname;
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
      <div class="bb-nav-main-profile">
        <div class="nav-profile-box">
          <img class="nav-profile-avatar" id="navAvatar" alt="Avatar" />
          <span class="nav-profile-username" id="navUsername"></span>
        </div>
      </div>
      <div class="bb-nav-main-actions">
        <div class="bb-nav-inline" role="menubar" aria-label="Main">
          ${NAV_ITEMS.map(item => {
            if (item.key === 'logout') {
              return `<button class="btn" type="button" data-nav="${item.key}" id="bbLogoutBtn">${item.label}</button>`;
            }
            return `<a href="${item.href}" class="btn" data-nav="${item.key}">${item.label}</a>`;
          }).join('')}
        </div>
        <div class="bb-nav-menu">
          <a href="${ROUTES.WAITER_HOME}" class="btn" data-nav="home">Home</a>
          <a href="${ROUTES.CHAT}" class="btn" data-nav="chat">Chat</a>
          <button id="bbMenuToggle" class="btn" aria-haspopup="true" aria-expanded="false">Menu ▾</button>
          <div id="bbMenuDropdown" class="bb-dropdown" role="menu" hidden>
            ${NAV_ITEMS.filter(item => item.key !== 'home' && item.key !== 'chat').map(item => {
              if (item.key === 'logout') {
                return `<button id="bbLogoutBtnMobile" role="menuitem" class="linklike" data-nav="${item.key}" type="button">${item.label}</button>`;
              }
              return `<a href="${item.href}" role="menuitem" data-nav="${item.key}">${item.label}</a>`;
            }).join('')}
          </div>
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

let navPerfLogged = false;

async function initNavigation(user, existingNav) {
  const tNavStart = performance.now();
  const nav = existingNav || ensureNav();
  if (!nav) return;

  const storedSnapshot = await getStoredUser();
  console.log('[Nav] User state on init:', {
    storedUser: storedSnapshot,
    avatarKey: user?.avatarKey || null,
    avatarFromUser: user?.avatar || null,
    resolvedFromMap: user?.avatarKey ? AVATAR_URLS[user.avatarKey] : null
  });

  const avatarEl = nav.querySelector('#navAvatar');
  const usernameEl = nav.querySelector('#navUsername');

  if (avatarEl) {
    const avatarUrl = getAvatarUrl(user);
    if (avatarUrl) {
      avatarEl.src = avatarUrl;
      avatarEl.style.display = 'block';
    } else {
      avatarEl.style.display = 'none';
      avatarEl.removeAttribute('src');
    }
    console.log('[Nav] Final avatar src:', avatarEl?.src || '(none)');
  } else {
    console.error('[Nav] ❌ Avatar element #navAvatar not found in DOM!');
  }

  if (usernameEl) {
    const displayUsername = user.username || 'Guest';
    usernameEl.textContent = displayUsername;
  } else {
    console.error('[Nav] ❌ Username element #navUsername not found in DOM!');
  }

  const normalizePath = (path) => path.replace(/\/+$/, '');
  const currentPath = normalizePath(new URL(window.location.href).pathname);
  const navLinks = nav.querySelectorAll('.bb-nav-inline a, .bb-nav-menu > a, #bbMenuDropdown a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href || href === '#') {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
      return;
    }
    const linkPath = normalizePath(new URL(href, window.location.href).pathname);
    const matches = linkPath === currentPath;
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
  bindNavOffsetUpdates(nav);

  if (!navPerfLogged) {
    navPerfLogged = true;
    console.log('[Perf] navigation init in', (performance.now() - tNavStart).toFixed(1), 'ms');
  }
}

function ensureDefaultRestaurant(user) {
  if (!localStorage.getItem('restaurant') && user.restaurant) {
    localStorage.setItem('restaurant', user.restaurant);
  }
}

async function bootstrap() {
  const user = await loadUser();
  const nav = ensureNav();
  if (nav) {
    await initNavigation(user, nav);
  }
  ensureDefaultRestaurant(user);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Home page avatar hydration (auth + LS + observer)
document.addEventListener('DOMContentLoaded', () => {
  const isHome = /\/waiter\/home\.html$|\/home\.html$/.test(location.pathname);
  if (!isHome) return;

  const apply = () => {
    const url = (auth.currentUser?.photoURL) || getStoredAvatar() || "";
    hydrateBadge(url);
    console.debug("BB_AVATAR:home:apply", { photoURL: auth.currentUser?.photoURL, ls: getStoredAvatar() });
  };

  // 1) First paint (LS fallback)
  apply();

  // 2) When Firebase resolves user
  onAuthStateChanged(auth, () => apply());

  // 3) If title DOM is re-inserted (late render)
  const mo = new MutationObserver(() => apply());
  mo.observe(document.body, { childList: true, subtree: true });

  // 4) Tab visibility / HMR Vite
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") apply(); });
  if (import.meta?.hot) { import.meta.hot.on("vite:afterUpdate", apply); }
});

window.appState = {
  async getUser() {
    return await loadUser();
  },
  async setUser(user) {
    await saveUser(user);
    const updatedUser = await loadUser();
    await initNavigation(updatedUser);
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
      location.href = ROUTES.LOGIN;
    });
  }
  wireLogout(logoutDesktop);
  wireLogout(logoutMobile);
}
