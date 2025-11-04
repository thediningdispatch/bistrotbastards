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
