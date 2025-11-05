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
 * Store user data to localStorage
 * @param {Object} user - User object with username, etc.
 */
export async function setStoredUser(user = {}) {
  const { STORAGE_KEYS } = await import('./config.js');

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

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
  console.log('[setStoredUser] Persisted user state:', merged);
  return merged;
}

/**
 * Retrieve user data from localStorage
 * @returns {Object} User object or empty object if parsing fails
 */
export async function getStoredUser() {
  const { STORAGE_KEYS } = await import('./config.js');

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    const parsed = raw ? JSON.parse(raw) : {};

    if (parsed && typeof parsed === 'object') {
      console.log('[getStoredUser] Retrieved user:', parsed);
      return parsed;
    }

    return {};
  } catch (error) {
    console.error('[getStoredUser] Parse error:', error);
    return {};
  }
}
