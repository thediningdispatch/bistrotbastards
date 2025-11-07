import { auth, db } from '../core/firebase.js';
import { ROUTES } from '../core/config.js';
import { collection, getDocs, doc, setDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const todayISO = new Date().toISOString().slice(0, 10);

const dayPicker = document.getElementById('dayPicker');
const stepAttendance = document.getElementById('stepAttendance');
const stepMetrics = document.getElementById('stepMetrics');
const userListEl = document.getElementById('userList');
const metricsGrid = document.getElementById('metricsGrid');
const statusEl = document.getElementById('adminStatus');
const loadingEl = document.getElementById('adminLoading');
const contentEl = document.getElementById('adminContent');

const btnSelectAll = document.getElementById('btnSelectAll');
const btnClearAll = document.getElementById('btnClearAll');
const btnContinue = document.getElementById('btnContinue');
const btnBack = document.getElementById('btnBack');
const btnSaveDay = document.getElementById('btnSaveDay');

let allUsers = [];
let selectedUids = new Set();

if (sessionStorage.getItem('bb_admin_ok') !== '1') {
  console.warn('[admin] accès refusé — code non validé');
  window.location.replace(ROUTES.WAITER_HOME);
}

function showStatus(message, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `admin-status show ${type}`;
}

function clearStatus() {
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.className = 'admin-status';
  }
}

async function ensureConnected() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  console.debug('[admin] writing as uid:', auth.currentUser?.uid, 'isAnonymous:', auth.currentUser?.isAnonymous);
}

function cleanFirestore(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Number.isNaN(value)) return;
      out[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      out[key] = value.filter(item => item !== undefined && item !== null);
      return;
    }

    if (typeof value === 'object') {
      const nested = cleanFirestore(value);
      if (Object.keys(nested).length === 0) return;
      out[key] = nested;
      return;
    }

    out[key] = value;
  });
  return out;
}

function setStep(step) {
  if (step === 'metrics') {
    stepAttendance.hidden = true;
    stepMetrics.hidden = false;
  } else {
    stepAttendance.hidden = false;
    stepMetrics.hidden = true;
  }
}

function buildUserItem(user) {
  const item = document.createElement('label');
  item.className = 'user-item';
  item.innerHTML = `
    <input type="checkbox" value="${user.uid}" ${selectedUids.has(user.uid) ? 'checked' : ''} />
    <div class="user-info">
      <span class="user-name">${user.username}</span>
    </div>
  `;
  const checkbox = item.querySelector('input');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedUids.add(user.uid);
    } else {
      selectedUids.delete(user.uid);
    }
  });
  return item;
}

function renderUserList() {
  if (!userListEl) return;
  userListEl.innerHTML = '';
  if (allUsers.length === 0) {
    userListEl.innerHTML = '<p class="user-empty">Aucun serveur enregistré.</p>';
    return;
  }
  allUsers.forEach(user => userListEl.appendChild(buildUserItem(user)));
}

function renderMetricsForm() {
  if (!metricsGrid) return;
  metricsGrid.innerHTML = '';
  const selectedUsers = allUsers.filter(user => selectedUids.has(user.uid));
  if (selectedUsers.length === 0) {
    metricsGrid.innerHTML = '<p class="user-empty">Sélectionne au moins un serveur.</p>';
    return;
  }

  const header = document.createElement('div');
  header.className = 'metrics-row metrics-row--head';
  header.innerHTML = `
    <div>Serveur</div>
    <div>Scans</div>
    <div>Posts</div>
    <div>Note/10</div>
    <div>Ticket joueur (€)</div>
    <div>Ticket moyen (€)</div>
    <div>Ticket max (€)</div>
    <div>Chablis vendus</div>
    <div>Chablis max</div>
  `;
  metricsGrid.appendChild(header);

  selectedUsers.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'metrics-row';
    row.dataset.uid = user.uid;
    row.innerHTML = `
      <div class="metrics-name">${user.username}</div>
      <input type="number" name="scans" min="0" step="1" value="0" inputmode="numeric"/>
      <input type="number" name="posts" min="0" step="1" value="0" inputmode="numeric"/>
      <input type="number" name="noteSur10" min="0" max="10" step="0.1" value="0" inputmode="decimal"/>
      <input type="number" name="ticketJoueur" min="0" step="0.01" value="0" inputmode="decimal"/>
      <input type="number" name="ticketMoyen" min="0" step="0.01" value="0" inputmode="decimal"/>
      <input type="number" name="ticketMax" min="0" step="0.01" value="0" inputmode="decimal"/>
      <input type="number" name="chablisVendus" min="0" step="1" value="0" inputmode="numeric"/>
      <input type="number" name="chablisMax" min="0" step="1" value="0" inputmode="numeric"/>
    `;
    metricsGrid.appendChild(row);
  });
}

function parseNumberValue(input, options = {}) {
  const raw = (input.value || '').trim();
  let value = raw === '' ? 0 : Number(raw);
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (options.max !== undefined && value > options.max) value = options.max;
  if (options.decimals !== undefined) {
    value = Number(value.toFixed(options.decimals));
  } else {
    value = Math.floor(value);
  }
  return value;
}

function collectMetrics() {
  const metrics = {};
  const rows = metricsGrid?.querySelectorAll('.metrics-row[data-uid]');
  rows?.forEach((row) => {
    const uid = row.dataset.uid;
    if (!uid) return;

    metrics[uid] = {
      scans: parseNumberValue(row.querySelector('input[name="scans"]')),
      posts: parseNumberValue(row.querySelector('input[name="posts"]')),
      noteSur10: parseNumberValue(row.querySelector('input[name="noteSur10"]'), { max: 10, decimals: 2 }),
      ticketJoueur: parseNumberValue(row.querySelector('input[name="ticketJoueur"]'), { decimals: 2 }),
      ticketMoyen: parseNumberValue(row.querySelector('input[name="ticketMoyen"]'), { decimals: 2 }),
      ticketMax: parseNumberValue(row.querySelector('input[name="ticketMax"]'), { decimals: 2 }),
      chablisVendus: parseNumberValue(row.querySelector('input[name="chablisVendus"]')),
      chablisMax: parseNumberValue(row.querySelector('input[name="chablisMax"]'))
    };
  });
  return metrics;
}

function getSelectedUsers() {
  return allUsers.filter(user => selectedUids.has(user.uid));
}

async function saveDay() {
  if (!btnSaveDay) return;
  const dateISO = dayPicker?.value || todayISO;
  const selected = getSelectedUsers();
  if (selected.length === 0) {
    showStatus('Sélectionne au moins un serveur.', 'error');
    return;
  }

  if (sessionStorage.getItem('bb_admin_ok') !== '1') {
    showStatus('Accès refusé: mot de passe admin requis.', 'error');
    return;
  }

  const metrics = collectMetrics();
  btnSaveDay.disabled = true;
  showStatus('Enregistrement en cours…', 'info');

  try {
    await ensureConnected();
    console.debug('[admin] write as', auth.currentUser?.uid, { dateISO, selected: selected.map(u => u.uid) });
    await persistDay(dateISO, selected, metrics);
    showStatus(`✅ Journée ${dateISO} enregistrée. <a href="../waiter/classement.html">Voir le classement</a>`, 'success');
  } catch (error) {
    console.error('[admin] Save day error:', error);
    const msg = (error && (error.code || error.message)) || 'Erreur inconnue';
    showStatus(`❌ Erreur d'enregistrement: ${msg}`, 'error');
  } finally {
    btnSaveDay.disabled = false;
  }
}

async function persistDay(dateISO, selectedUsers, metricsByUid) {
  await ensureConnected();
  const uids = selectedUsers.map(user => user.uid);

  await setDoc(
    doc(db, 'days', dateISO, 'meta', 'info'),
    cleanFirestore({
      dateISO,
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );

  await setDoc(
    doc(db, 'days', dateISO, 'attendance', 'roster'),
    cleanFirestore({
      uids,
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );

  for (const user of selectedUsers) {
    const raw = metricsByUid[user.uid] || {};
    const metrics = cleanFirestore({
      uid: user.uid,
      username: user.username,
      scans: Number(raw.scans || 0) || 0,
      posts: Number(raw.posts || 0) || 0,
      noteSur10: Math.max(0, Math.min(10, Number(raw.noteSur10 || 0) || 0)),
      ticketJoueur: Number(raw.ticketJoueur || 0) || 0,
      ticketMoyen: Number(raw.ticketMoyen || 0) || 0,
      ticketMax: Number(raw.ticketMax || 0) || 0,
      chablisVendus: Math.max(0, Number.parseInt(raw.chablisVendus || 0, 10) || 0),
      chablisMax: Math.max(0, Number.parseInt(raw.chablisMax || 0, 10) || 0),
      updatedAt: serverTimestamp()
    });
    console.debug('[admin] write metrics', { dateISO, uid: user.uid, metrics });

    await setDoc(
      doc(db, 'days', dateISO, 'metrics', user.uid),
      metrics,
      { merge: true }
    );

    await setDoc(
      doc(db, 'users', user.uid),
      cleanFirestore({
        stats: {
          scans: metrics.scans,
          posts: metrics.posts,
          noteSur10: metrics.noteSur10,
          ticketJoueur: metrics.ticketJoueur,
          ticketMoyen: metrics.ticketMoyen,
          ticketMax: metrics.ticketMax,
          chablisVendus: metrics.chablisVendus,
          chablisMax: metrics.chablisMax
        },
        lastActiveDate: dateISO,
        updatedAt: serverTimestamp()
      }),
      { merge: true }
    );
  }
}

async function loadUsers() {
  try {
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    clearStatus();

    const q = query(collection(db, 'users'), orderBy('username', 'asc'));
    const snapshot = await getDocs(q);
    allUsers = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() || {};
      allUsers.push({
        uid: docSnap.id,
        username: data.username || docSnap.id
      });
    });

    renderUserList();

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('[admin] Load users error:', error);
    showStatus('Impossible de charger les utilisateurs.', 'error');
    loadingEl.innerHTML = '<p style="padding:20px;color:red;">Erreur de chargement.</p>';
  }
}

function initDatePicker() {
  if (dayPicker && !dayPicker.value) {
    dayPicker.value = todayISO;
  }
}

function initActions() {
  btnSelectAll?.addEventListener('click', () => {
    selectedUids = new Set(allUsers.map(u => u.uid));
    renderUserList();
  });

  btnClearAll?.addEventListener('click', () => {
    selectedUids.clear();
    renderUserList();
  });

  btnContinue?.addEventListener('click', () => {
    const checkedBoxes = userListEl?.querySelectorAll('input[type="checkbox"]:checked') || [];
    selectedUids = new Set(Array.from(checkedBoxes).map(cb => cb.value));
    if (selectedUids.size === 0) {
      showStatus('Sélectionne au moins un serveur.', 'error');
      return;
    }
    renderMetricsForm();
    setStep('metrics');
    clearStatus();
  });

  btnBack?.addEventListener('click', () => {
    setStep('attendance');
    clearStatus();
  });

  btnSaveDay?.addEventListener('click', saveDay);
}

function bootstrap() {
  initDatePicker();
  initActions();
  setStep('attendance');
  loadUsers();
}

bootstrap();
