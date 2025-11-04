import { db, auth } from '../core/firebase.js';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { authReady } from '../core/auth-guard.js';

const tPageStart = performance.now();

const loadingEl = document.getElementById('adminLoading');
const contentEl = document.getElementById('adminContent');
const tableBody = document.getElementById('adminTableBody');
const statusEl = document.getElementById('adminStatus');
const refreshBtn = document.getElementById('refreshBtn');

let usersData = [];

function showStatus(message, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = 'admin-status show';
  if (type === 'success') statusEl.classList.add('success');
  if (type === 'error') statusEl.classList.add('error');
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 4000);
}

function createUserRow(user) {
  const tr = document.createElement('tr');
  tr.dataset.uid = user.uid;

  const username = (user.username || user.uid).toString();
  const ticketMoyen = Number.isFinite(Number(user.ticketMoyen)) ? Number(user.ticketMoyen) : '';
  const googleReviews = Number.isFinite(Number(user.googleReviews)) ? Number(user.googleReviews) : '';
  const noteClients = Number.isFinite(Number(user.noteClients)) ? Number(user.noteClients) : '';
  const ventesRuinart = Number.isFinite(Number(user.ventesRuinart)) ? Number(user.ventesRuinart) : '';

  tr.innerHTML = `
    <td class="admin-username">${username}</td>
    <td>
      <input
        type="number"
        class="admin-input"
        data-field="ticketMoyen"
        step="0.01"
        min="0"
        placeholder="0"
        value="${ticketMoyen}"
      />
    </td>
    <td>
      <input
        type="number"
        class="admin-input"
        data-field="googleReviews"
        step="1"
        min="0"
        placeholder="0"
        value="${googleReviews}"
      />
    </td>
    <td>
      <input
        type="number"
        class="admin-input"
        data-field="noteClients"
        step="0.1"
        min="0"
        max="10"
        placeholder="0"
        value="${noteClients}"
      />
    </td>
    <td>
      <input
        type="number"
        class="admin-input"
        data-field="ventesRuinart"
        step="1"
        min="0"
        placeholder="0"
        value="${ventesRuinart}"
      />
    </td>
    <td>
      <button class="btn admin-save-btn" data-action="save">Enregistrer</button>
    </td>
  `;

  const saveBtn = tr.querySelector('[data-action="save"]');
  saveBtn.addEventListener('click', () => saveUserData(user.uid, tr));

  return tr;
}

async function saveUserData(uid, rowElement) {
  const inputs = rowElement.querySelectorAll('input[data-field]');
  const updates = {};
  let hasErrors = false;

  inputs.forEach(input => {
    const field = input.dataset.field;
    const rawValue = input.value.trim();

    if (rawValue === '') {
      updates[field] = 0;
      return;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      showStatus(`Valeur invalide pour ${field}`, 'error');
      hasErrors = true;
      return;
    }

    if (field === 'noteClients' && value > 10) {
      showStatus('La note clients doit être entre 0 et 10', 'error');
      hasErrors = true;
      return;
    }

    if (field === 'ticketMoyen' || field === 'noteClients') {
      updates[field] = parseFloat(value.toFixed(2));
    } else {
      updates[field] = Math.floor(value);
    }
  });

  if (hasErrors) return;

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);

    // Update local cache
    const userIndex = usersData.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      usersData[userIndex] = { ...usersData[userIndex], ...updates };
    }

    showStatus('Données enregistrées avec succès', 'success');
  } catch (error) {
    console.error('[admin] Save error:', error);
    showStatus('Erreur lors de l\'enregistrement', 'error');
  }
}

async function loadUsers() {
  try {
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    tableBody.innerHTML = '';

    const q = query(collection(db, 'users'), orderBy('username', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--muted);">Aucun utilisateur trouvé</td></tr>';
    } else {
      usersData = [];
      snapshot.forEach(docSnap => {
        const userData = docSnap.data();
        usersData.push({
          uid: docSnap.id,
          username: userData.username || docSnap.id,
          ticketMoyen: userData.ticketMoyen || 0,
          googleReviews: userData.googleReviews || 0,
          noteClients: userData.noteClients || 0,
          ventesRuinart: userData.ventesRuinart || 0
        });
      });

      usersData.forEach(user => {
        tableBody.appendChild(createUserRow(user));
      });
    }

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('[admin] Load error:', error);
    loadingEl.innerHTML = '<p style="color: red;">Erreur lors du chargement des données</p>';
    showStatus('Erreur lors du chargement', 'error');
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', loadUsers);
}

console.log('[Perf] admin init in', (performance.now() - tPageStart).toFixed(1), 'ms');

const scheduleInitialLoad = () => {
  const start = () => loadUsers();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(start);
  } else {
    setTimeout(start, 0);
  }
};

(async () => {
  await authReady;
  if (!auth.currentUser) return;
  scheduleInitialLoad();
})();
