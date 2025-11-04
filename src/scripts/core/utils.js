export function onceBind(form, handler) {
  if (!form || typeof handler !== 'function') return false;
  if (form.dataset.bound === '1') return false;
  form.dataset.bound = '1';
  form.addEventListener('submit', handler);
  return true;
}

export function withSubmitLock(form, buttonSelector = 'button[type="submit"]') {
  const btn = form ? form.querySelector(buttonSelector) : null;
  let locked = false;
  return {
    lock(label = 'Chargement…') {
      if (locked) return;
      locked = true;
      if (btn) {
        if (!btn.dataset._label) {
          btn.dataset._label = btn.textContent;
        }
        btn.disabled = true;
        btn.textContent = label;
      }
    },
    unlock() {
      if (!locked) return;
      locked = false;
      if (btn) {
        btn.disabled = false;
        const original = btn.dataset._label || 'Valider';
        btn.textContent = original;
        delete btn.dataset._label;
      }
    }
  };
}

export function showError(container, message) {
  if (!container) return;
  const text = message || '';
  container.textContent = text;
  container.style.display = text ? 'block' : 'none';
}

export function normUsername(value) {
  return (value || '').trim().toLowerCase();
}

/**
 * Calculate average tips per worked day based on tips history
 * @param {Object} tipsHistory - Object mapping ISO dates to tip amounts (e.g., { "2025-01-15": 23.50 })
 * @returns {number} Average tips per day, or 0 if no data
 */
export function calculateAverageTipsPerDay(tipsHistory) {
  if (!tipsHistory || typeof tipsHistory !== 'object') {
    return 0;
  }

  const entries = Object.entries(tipsHistory);
  if (entries.length === 0) {
    return 0;
  }

  let totalTips = 0;
  let validDays = 0;

  for (const [date, amount] of entries) {
    const num = Number(amount);
    if (Number.isFinite(num) && num >= 0) {
      totalTips += num;
      validDays++;
    }
  }

  if (validDays === 0) {
    return 0;
  }

  return totalTips / validDays;
}

/**
 * Store user data to localStorage with proper avatar resolution
 * @param {Object} user - User object with username, avatarKey, avatar, etc.
 */
export async function setStoredUser(user = {}) {
  // Lazy import to avoid circular dependencies
  const { AVATAR_URLS, STORAGE_KEYS } = await import('./config.js');

  const payload = {};

  if (user.username) {
    payload.username = user.username;
    localStorage.setItem(STORAGE_KEYS.USERNAME, user.username);
  }

  if (user.avatarKey) {
    payload.avatarKey = user.avatarKey;
  }

  // Resolve avatar URL from avatarKey if needed
  const resolvedAvatar = user.avatar || (user.avatarKey && AVATAR_URLS[user.avatarKey]) || null;
  if (resolvedAvatar) {
    payload.avatar = resolvedAvatar;
    localStorage.setItem(STORAGE_KEYS.AVATAR_URL, resolvedAvatar);
  }

  // Store complete user object
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(payload));

  console.log('[setStoredUser] Stored user:', payload);
  console.log('[setStoredUser]   - avatarKey:', payload.avatarKey);
  console.log('[setStoredUser]   - resolved avatar:', resolvedAvatar);
}

/**
 * Retrieve user data from localStorage
 * @returns {Object} User object or empty object if parsing fails
 */
export async function getStoredUser() {
  // Lazy import to avoid circular dependencies
  const { STORAGE_KEYS, AVATAR_URLS } = await import('./config.js');

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    const parsed = raw ? JSON.parse(raw) : {};

    // Ensure avatar is resolved from avatarKey if not present
    if (parsed && typeof parsed === 'object') {
      if (!parsed.avatar && parsed.avatarKey && AVATAR_URLS[parsed.avatarKey]) {
        parsed.avatar = AVATAR_URLS[parsed.avatarKey];
      }

      console.log('[getStoredUser] Retrieved user:', parsed);
      console.log('[getStoredUser]   - avatarKey:', parsed.avatarKey);
      console.log('[getStoredUser]   - avatar:', parsed.avatar);

      return parsed;
    }

    return {};
  } catch (error) {
    console.error('[getStoredUser] Parse error:', error);
    return {};
  }
}
