import { db, auth, onAuthStateChanged } from '../core/firebase.js';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ADMIN_UID } from '../core/config.js';

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

/**
 * Calcule les XP pondérés à partir des valeurs de la ligne
 * et met à jour les cellules de sortie en lecture seule.
 * @param {HTMLTableRowElement} rowElement - La ligne à calculer
 * @returns {Object} Les XP calculés { reviewsPond, ticketPond, chablisPond, engagementPond, total }
 */
function computeXpFromRow(rowElement) {
  const getValue = (field) => {
    const input = rowElement.querySelector(`input[data-field="${field}"]`);
    if (!input) return 0;
    if (input.type === 'checkbox') return input.checked ? 1 : 0;
    const val = parseFloat(input.value) || 0;
    return val >= 0 ? val : 0;
  };

  const scans = getValue('scans');
  const posts = getValue('posts');
  const note = getValue('note');
  const ticketJoueur = getValue('ticketJoueur');
  const ticketMoyenne = getValue('ticketMoyenne');
  const ticketMax = getValue('ticketMax');
  const chablisVendus = getValue('chablisVendus');
  const chablisMax = getValue('chablisMax');
  const connexion = getValue('connexion');
  const saisieTips = getValue('saisieTips');
  const streak7 = getValue('streak7');

  // ——— REVIEWS (30%) ———
  const XP_scans = 10 * scans;
  const XP_posts = 25 * posts;
  const bonus_qualite = (note < 7) ? 0 : (note - 6) / 3;
  const XP_qualite = (XP_scans + XP_posts) * bonus_qualite;
  const XP_reviews = Math.min(XP_scans + XP_posts + XP_qualite, 800);
  const XP_reviews_pond = 0.30 * XP_reviews;

  // ——— TICKET (30%) ———
  const ratio = (ticketJoueur <= ticketMoyenne) ? 0 : (ticketJoueur - ticketMoyenne) / ticketMoyenne;
  const XP_ticket_day = 200 * ratio;
  const XP_bonus_leader = (ticketJoueur === ticketMax && ticketMax > 0) ? 100 : 0;
  const XP_ticket = XP_ticket_day + XP_bonus_leader;
  const XP_ticket_pond = 0.30 * XP_ticket;

  // ——— CHABLIS (25%) ———
  const XP_vente = 40 * chablisVendus;
  const XP_bonus_chablis = (chablisVendus === chablisMax && chablisMax > 0) ? 150 : 0;
  const XP_chablis = XP_vente + XP_bonus_chablis;
  const XP_chablis_pond = 0.25 * XP_chablis;

  // ——— ENGAGEMENT (15%) ———
  const XP_engagement_day = (10 * connexion) + (15 * saisieTips);
  const XP_bonus_assiduite = (streak7 ? 100 : 0);
  const XP_engagement = XP_engagement_day + XP_bonus_assiduite;
  const XP_engagement_pond = 0.15 * XP_engagement;

  // ——— TOTAL ———
  const XP_total = XP_reviews_pond + XP_ticket_pond + XP_chablis_pond + XP_engagement_pond;

  // Update readonly output cells
  const setOutput = (field, value) => {
    const cell = rowElement.querySelector(`[data-xp="${field}"]`);
    if (cell) cell.textContent = Math.round(value);
  };

  setOutput('reviewsPond', XP_reviews_pond);
  setOutput('ticketPond', XP_ticket_pond);
  setOutput('chablisPond', XP_chablis_pond);
  setOutput('engagementPond', XP_engagement_pond);
  setOutput('total', XP_total);

  return {
    reviewsPond: XP_reviews_pond,
    ticketPond: XP_ticket_pond,
    chablisPond: XP_chablis_pond,
    engagementPond: XP_engagement_pond,
    total: XP_total
  };
}

function createUserRow(user) {
  const tr = document.createElement('tr');
  tr.dataset.uid = user.uid;

  const username = (user.username || user.uid).toString();

  // Extract stats with defaults
  const stats = user.stats || {};
  const isActive = user.isActive !== undefined ? user.isActive : false;
  const scans = stats.scans || 0;
  const posts = stats.posts || 0;
  const note = stats.note || 0;
  const ticketJoueur = stats.ticketJoueur || 0;
  const ticketMoyenne = stats.ticketMoyenne || 0;
  const ticketMax = stats.ticketMax || 0;
  const chablisVendus = stats.chablisVendus || 0;
  const chablisMax = stats.chablisMax || 0;
  const connexion = stats.connexion || 0;
  const saisieTips = stats.saisieTips || 0;
  const streak7 = stats.streak7 || 0;

  tr.innerHTML = `
    <td class="admin-username">${username}</td>
    <td><input type="checkbox" data-field="isActive" ${isActive ? 'checked' : ''} /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="scans" min="0" step="1" value="${scans}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="posts" min="0" step="1" value="${posts}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="note" min="0" max="10" step="0.1" value="${note}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="ticketJoueur" min="0" step="0.01" value="${ticketJoueur}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="ticketMoyenne" min="0" step="0.01" value="${ticketMoyenne}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="ticketMax" min="0" step="0.01" value="${ticketMax}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="chablisVendus" min="0" step="1" value="${chablisVendus}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="chablisMax" min="0" step="1" value="${chablisMax}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="connexion" min="0" max="1" step="1" value="${connexion}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="saisieTips" min="0" max="1" step="1" value="${saisieTips}" /></td>
    <td><input type="number" class="admin-input admin-input-small" data-field="streak7" min="0" max="1" step="1" value="${streak7}" /></td>
    <td class="admin-xp-output" data-xp="reviewsPond">—</td>
    <td class="admin-xp-output" data-xp="ticketPond">—</td>
    <td class="admin-xp-output" data-xp="chablisPond">—</td>
    <td class="admin-xp-output" data-xp="engagementPond">—</td>
    <td class="admin-xp-output admin-xp-total" data-xp="total">—</td>
    <td><button class="btn admin-save-btn" data-action="save">Enregistrer</button></td>
  `;

  // Auto-compute XP on input change
  const inputs = tr.querySelectorAll('input[data-field]');
  inputs.forEach(input => {
    input.addEventListener('input', () => computeXpFromRow(tr));
  });

  const saveBtn = tr.querySelector('[data-action="save"]');
  saveBtn.addEventListener('click', () => saveUserData(user.uid, tr));

  // Initial XP computation
  computeXpFromRow(tr);

  return tr;
}

async function saveUserData(uid, rowElement) {
  const getValue = (field) => {
    const input = rowElement.querySelector(`input[data-field="${field}"]`);
    if (!input) return null;
    if (input.type === 'checkbox') return input.checked;
    const val = parseFloat(input.value) || 0;
    return val >= 0 ? val : 0;
  };

  // Validate note
  const note = getValue('note');
  if (note !== null && note > 10) {
    showStatus('La note doit être entre 0 et 10', 'error');
    return;
  }

  // Extract all stats
  const isActive = getValue('isActive');
  const stats = {
    scans: Math.floor(getValue('scans') || 0),
    posts: Math.floor(getValue('posts') || 0),
    note: parseFloat((note || 0).toFixed(1)),
    ticketJoueur: parseFloat((getValue('ticketJoueur') || 0).toFixed(2)),
    ticketMoyenne: parseFloat((getValue('ticketMoyenne') || 0).toFixed(2)),
    ticketMax: parseFloat((getValue('ticketMax') || 0).toFixed(2)),
    chablisVendus: Math.floor(getValue('chablisVendus') || 0),
    chablisMax: Math.floor(getValue('chablisMax') || 0),
    connexion: getValue('connexion') ? 1 : 0,
    saisieTips: getValue('saisieTips') ? 1 : 0,
    streak7: getValue('streak7') ? 1 : 0
  };

  // Compute XP
  const xp = computeXpFromRow(rowElement);

  // Import serverTimestamp
  const { serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  // Build update object
  const updates = {
    isActive,
    stats,
    xp: {
      reviewsPond: xp.reviewsPond,
      ticketPond: xp.ticketPond,
      chablisPond: xp.chablisPond,
      engagementPond: xp.engagementPond,
      total: xp.total,
      updatedAt: serverTimestamp()
    },
    score: xp.total
  };

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

async function loadUsers(filterActiveOnly = false) {
  try {
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    tableBody.innerHTML = '';

    const q = query(collection(db, 'users'), orderBy('username', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 20px; color: var(--muted);">Aucun utilisateur trouvé</td></tr>';
    } else {
      usersData = [];
      snapshot.forEach(docSnap => {
        const userData = docSnap.data();
        usersData.push({
          uid: docSnap.id,
          username: userData.username || docSnap.id,
          isActive: userData.isActive || false,
          stats: userData.stats || {},
          xp: userData.xp || {},
          score: userData.score || 0
        });
      });

      // Apply filter if needed
      const filteredUsers = filterActiveOnly
        ? usersData.filter(u => u.isActive)
        : usersData;

      if (filteredUsers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 20px; color: var(--muted);">Aucun serveur actif trouvé</td></tr>';
      } else {
        filteredUsers.forEach(user => {
          tableBody.appendChild(createUserRow(user));
        });
      }
    }

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('[admin] Load error:', error);

    // Vérifier si c'est une erreur de permissions Firestore
    if (error.code === 'permission-denied') {
      loadingEl.innerHTML = '<p style="color: red; padding: 40px; text-align: center;">❌ Permissions insuffisantes — vérifiez vos droits admin.</p>';
      showStatus('Permissions Firestore refusées', 'error');
    } else {
      loadingEl.innerHTML = '<p style="color: red; padding: 40px; text-align: center;">Erreur lors du chargement des données</p>';
      showStatus('Erreur lors du chargement', 'error');
    }
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    const filterCheckbox = document.getElementById('filterActiveOnly');
    loadUsers(filterCheckbox ? filterCheckbox.checked : false);
  });
}

// Handle filter checkbox
const filterCheckbox = document.getElementById('filterActiveOnly');
if (filterCheckbox) {
  filterCheckbox.addEventListener('change', (e) => {
    loadUsers(e.target.checked);
  });
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

let adminBootstrapped = false;

function bootstrapAdmin() {
  if (adminBootstrapped) return;
  adminBootstrapped = true;
  scheduleInitialLoad();
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('../admin/admin-portal.html');
    return;
  }

  if (user.uid !== ADMIN_UID) {
    showStatus('Accès refusé — administrateur requis.', 'error');
    window.location.replace('../auth/login.html');
    return;
  }

  bootstrapAdmin();
});
