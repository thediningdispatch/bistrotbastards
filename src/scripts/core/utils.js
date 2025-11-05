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
  const { AVATAR_URLS, STORAGE_KEYS } = await import('./config.js');

  let current = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    current = raw ? JSON.parse(raw) || {} : {};
  } catch (error) {
    console.warn('[setStoredUser] Failed to parse existing user state:', error);
  }

  const merged = { ...current };
  const hasProp = (key) => Object.prototype.hasOwnProperty.call(user, key);

  if (hasProp('username')) {
    const usernameValue = user.username ?? '';
    if (usernameValue) {
      merged.username = usernameValue;
      localStorage.setItem(STORAGE_KEYS.USERNAME, usernameValue);
    } else {
      delete merged.username;
      localStorage.removeItem(STORAGE_KEYS.USERNAME);
    }
  }

  if (hasProp('avatarKey')) {
    merged.avatarKey = user.avatarKey || null;
  }

  if (hasProp('avatar')) {
    merged.avatar = user.avatar || null;
  }

  const finalAvatarKey = merged.avatarKey || null;
  const resolvedAvatar = merged.avatar || (finalAvatarKey && AVATAR_URLS[finalAvatarKey]) || null;

  if (resolvedAvatar) {
    merged.avatar = resolvedAvatar;
    localStorage.setItem(STORAGE_KEYS.AVATAR_URL, resolvedAvatar);
  } else {
    delete merged.avatar;
    localStorage.removeItem(STORAGE_KEYS.AVATAR_URL);
  }

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
  console.log('[setStoredUser] Persisted user state:', merged);
  return merged;
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

/**
 * Get stored avatar URL from localStorage
 * @returns {string} Avatar URL or empty string
 */
export function getStoredAvatar() {
  try {
    return localStorage.getItem("bb.avatarUrl") || "";
  } catch {
    return "";
  }
}

/**
 * Set or remove stored avatar URL in localStorage
 * @param {string} url - Avatar URL to store (empty to remove)
 */
export function setStoredAvatar(url) {
  try {
    if (url) {
      localStorage.setItem("bb.avatarUrl", url);
    } else {
      localStorage.removeItem("bb.avatarUrl");
    }
  } catch (error) {
    console.warn('[setStoredAvatar] Error:', error);
  }
}

/**
 * Hydrate/refresh avatar badge, robust to cache hits
 * @param {string} url - Avatar URL to display
 */
export function hydrateBadge(url) {
  const img = document.getElementById("bbUserBadge");
  if (!img) return;
  const show = () => { img.classList.remove("bb-badge--loading", "bb-badge--hidden"); img.onload = null; img.onerror = null; };
  const hide = () => { img.classList.add("bb-badge--hidden"); img.classList.remove("bb-badge--loading"); img.onload = null; img.onerror = null; };
  if (!url) { hide(); return; }
  img.classList.add("bb-badge--loading");
  img.classList.remove("bb-badge--hidden");
  img.onload = show;
  img.onerror = hide;
  if (img.src !== url) img.src = url; // avoid re-triggering load if same src
  if (img.complete) (img.naturalWidth > 0 ? show() : hide()); // instant cache check
  console.debug("BB_AVATAR:hydrateBadge", { url, complete: img.complete });
}
