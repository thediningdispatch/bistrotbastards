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
