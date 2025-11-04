import { AVATAR_URLS, NAV_ITEMS, ROUTES, STORAGE_KEYS } from './config.js';
import { getStoredUser, setStoredUser } from './utils.js';

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
  const stored = localStorage.getItem('avatarURL');
  return stored || null;
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

async function initNavigation(user, existingNav) {
  const nav = existingNav || ensureNav();
  if (!nav) return;

  // ============= COMPREHENSIVE DEBUG LOGGING =============
  console.group('[Nav] === Navigation Initialization ===');

  // 1. User object from loadUser()
  console.log('[Nav] User from loadUser():', user);
  console.log('[Nav]   - username:', user?.username);
  console.log('[Nav]   - avatarKey:', user?.avatarKey);
  console.log('[Nav]   - avatar:', user?.avatar);
  console.log('[Nav]   - role:', user?.role);

  // 2. Raw localStorage values
  console.log('[Nav] Raw localStorage values:');
  console.log('[Nav]   - STORAGE_KEYS.USER:', localStorage.getItem(STORAGE_KEYS.USER));
  console.log('[Nav]   - STORAGE_KEYS.AVATAR_URL:', localStorage.getItem(STORAGE_KEYS.AVATAR_URL));
  console.log('[Nav]   - STORAGE_KEYS.USERNAME:', localStorage.getItem(STORAGE_KEYS.USERNAME));

  // 3. AVATAR_URLS mapping
  console.log('[Nav] AVATAR_URLS map:', AVATAR_URLS);
  console.log('[Nav] Available avatar keys:', Object.keys(AVATAR_URLS));

  const avatarEl = nav.querySelector('#navAvatar');
  const usernameEl = nav.querySelector('#navUsername');

  // 4. DOM elements
  console.log('[Nav] DOM elements:');
  console.log('[Nav]   - avatarEl found:', !!avatarEl);
  console.log('[Nav]   - usernameEl found:', !!usernameEl);

  if (avatarEl) {
    const avatarUrl = getAvatarUrl(user);

    // 5. Avatar resolution
    console.log('[Nav] Avatar resolution:');
    console.log('[Nav]   - getAvatarUrl() returned:', avatarUrl);
    console.log('[Nav]   - user.avatar exists:', !!user?.avatar);
    console.log('[Nav]   - user.avatarKey exists:', !!user?.avatarKey);
    console.log('[Nav]   - AVATAR_URLS[user.avatarKey]:', user?.avatarKey ? AVATAR_URLS[user.avatarKey] : 'N/A');

    if (avatarUrl) {
      avatarEl.src = avatarUrl;
      avatarEl.style.display = 'block';

      // 6. Final img element state
      console.log('[Nav] ✅ Avatar set successfully:');
      console.log('[Nav]   - avatarEl.src:', avatarEl.src);
      console.log('[Nav]   - avatarEl.style.display:', avatarEl.style.display);
      console.log('[Nav]   - computed width:', window.getComputedStyle(avatarEl).width);
      console.log('[Nav]   - computed height:', window.getComputedStyle(avatarEl).height);
    } else {
      // Fallback: hide img
      avatarEl.style.display = 'none';
      console.warn('[Nav] ⚠️ No avatar URL found - hiding avatar image');
      console.warn('[Nav] Possible causes:');
      console.warn('[Nav]   - user.avatarKey does not match any key in AVATAR_URLS');
      console.warn('[Nav]   - user.avatar is null/undefined');
      console.warn('[Nav]   - localStorage does not have avatar data');
    }
  } else {
    console.error('[Nav] ❌ Avatar element #navAvatar not found in DOM!');
  }

  if (usernameEl) {
    const displayUsername = user.username || 'Guest';
    usernameEl.textContent = displayUsername;
    console.log('[Nav] ✅ Username set to:', displayUsername);
  } else {
    console.error('[Nav] ❌ Username element #navUsername not found in DOM!');
  }

  console.groupEnd();

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

document.addEventListener('DOMContentLoaded', bootstrap);

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
