(() => {
  const defaultUser = {
    username: 'Bistrot Waiter',
    role: 'waiter',
    avatar: null
  };

  function loadUser() {
    try {
      const stored = localStorage.getItem('bb_user');
      if (stored) {
        return { ...defaultUser, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('User state error:', err);
    }
    return { ...defaultUser };
  }

  function saveUser(user) {
    try {
      localStorage.setItem('bb_user', JSON.stringify(user));
    } catch (err) {
      console.warn('Could not persist user:', err);
    }
  }

  function initNavigation(user) {
    const avatar = document.getElementById('navAvatar');
    const usernameEl = document.getElementById('navUsername');
    const roleEl = document.getElementById('navRole');

    if (avatar) {
      if (user.avatar) {
        avatar.style.backgroundImage = `url(${user.avatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = '';
      } else {
        avatar.style.backgroundImage = 'none';
        avatar.textContent = (user.username || 'B')[0].toUpperCase();
      }
    }

    if (usernameEl) usernameEl.textContent = user.username || 'Guest';
    if (roleEl) roleEl.textContent = user.role || 'staff';

    const navLinks = document.querySelectorAll('.nav-links a[data-nav]');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
      const target = link.getAttribute('href');
      const slug = link.dataset.nav;
      const matches = target && currentPath && target.includes(currentPath);
      if (matches) {
        link.classList.add('is-active');
      } else if (slug && currentPath.startsWith(slug)) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }

      if (slug === 'logout') {
        link.addEventListener('click', evt => {
          evt.preventDefault();
          localStorage.removeItem('bb_user');
          window.location.href = 'login.html';
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const user = loadUser();
    initNavigation(user);

    // Simple guard: if on dashboard-like pages without real auth, ensure user stored.
    const protectedRoutes = ['dashboard.html', 'leaderboard.html', 'chat.html', 'admin.html'];
    const currentPath = window.location.pathname.split('/').pop();
    if (protectedRoutes.includes(currentPath) && !localStorage.getItem('bb_user')) {
      saveUser(user);
    }
  });

  window.appState = {
    get user() {
      return loadUser();
    },
    setUser(user) {
      saveUser(user);
      initNavigation(loadUser());
    }
  };
})();
