import { db } from '../core/firebase.js';
import { ROUTES } from '../core/config.js';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const todayISO = new Date().toISOString().slice(0, 10);

const dayPicker = document.getElementById('dayPicker');
const dayPrevBtn = document.getElementById('dayPrev');
const dayNextBtn = document.getElementById('dayNext');
const reloadDayBtn = document.getElementById('reloadDay');
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

const METRIC_FIELDS = ['scans', 'posts', 'noteSur10', 'ticketJoueur', 'ticketMoyen', 'ticketMax', 'chablisVendus', 'chablisMax'];

let currentDateISO = todayISO;
let allUsers = [];
const userMap = new Map();
let dayMetrics = {};
let selectedUids = new Set();

if (sessionStorage.getItem('bb_admin_ok') !== '1') {
  window.location.replace(ROUTES.WAITER_HOME);
}

function clean(o) {
  const out = {};
  Object.entries(o || {}).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) return;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = clean(value);
      if (Object.keys(nested).length) out[key] = nested;
    } else {
      out[key] = value;
    }
  });
  return out;
}

function buildScore(stats) {
  const xpReviews = (stats.scans || 0) * 10 + (stats.posts || 0) * 25 + Math.round((stats.noteSur10 || 0) * 8);
  const xpTicket = Math.round((stats.ticketMoyen || 0) * 2) + Math.round((stats.ticketMax || 0) * 0.5);
  const xpChablis = (stats.chablisVendus || 0) * 15;
  const xpEngagement = 0;
  const total = xpReviews + xpTicket + xpChablis + xpEngagement;
  return { score: total, xp: { reviews: xpReviews, ticket: xpTicket, chablis: xpChablis, engagement: xpEngagement, total } };
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

function setStep(step) {
  const showMetrics = step === 'metrics';
  stepAttendance.hidden = showMetrics;
  stepMetrics.hidden = !showMetrics;
}

function shiftDate(iso, deltaDays) {
  const d = new Date(iso);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function normalizeFieldValue(field, raw) {
  let value = raw === '' ? 0 : Number(raw);
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (field === 'noteSur10') {
    value = Number(Math.min(10, Math.max(0, value)).toFixed(2));
  } else if (field.startsWith('ticket')) {
    value = Number(value.toFixed(2));
  } else {
    value = Math.floor(value);
  }
  return value;
}

function getMetricsForUid(uid, username) {
  if (!dayMetrics[uid]) {
    dayMetrics[uid] = {
      uid,
      username: username || userMap.get(uid)?.username || uid,
      scans: 0,
      posts: 0,
      noteSur10: 0,
      ticketJoueur: 0,
      ticketMoyen: 0,
      ticketMax: 0,
      chablisVendus: 0,
      chablisMax: 0
    };
  }
  return dayMetrics[uid];
}

function captureDraftMetrics() {
  const rows = metricsGrid?.querySelectorAll('.metrics-row[data-uid]');
  rows?.forEach(row => {
    const uid = row.dataset.uid;
    if (!uid) return;
    const user = userMap.get(uid);
    const store = getMetricsForUid(uid, user?.username || uid);
    METRIC_FIELDS.forEach((field) => {
      const input = row.querySelector(`[data-field="${field}"]`);
      if (!input) return;
      store[field] = normalizeFieldValue(field, input.value);
    });
    dayMetrics[uid] = store;
  });
}

function getSelectedUsers() {
  return allUsers.filter((user) => selectedUids.has(user.uid));
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
    captureDraftMetrics();
    if (checkbox.checked) {
      selectedUids.add(user.uid);
    } else {
      selectedUids.delete(user.uid);
    }
    if (!stepMetrics.hidden) {
      renderMetricsForm();
    }
  });
  return item;
}

function renderUserList() {
  if (!userListEl) return;
  userListEl.innerHTML = '';
  if (!allUsers.length) {
    userListEl.innerHTML = '<p class="user-empty">Aucun serveur enregistré.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  allUsers.forEach(user => fragment.appendChild(buildUserItem(user)));
  userListEl.appendChild(fragment);
}

function renderMetricsForm() {
  if (!metricsGrid) return;
  captureDraftMetrics();
  metricsGrid.innerHTML = '';

  const selectedUsers = getSelectedUsers();
  if (!selectedUsers.length) {
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
    const metrics = getMetricsForUid(user.uid, user.username);
    const row = document.createElement('div');
    row.className = 'metrics-row';
    row.dataset.uid = user.uid;
    row.innerHTML = `
      <div class="metrics-name">${user.username}</div>
      <input type="number" data-field="scans" min="0" step="1" value="${metrics.scans}" inputmode="numeric" />
      <input type="number" data-field="posts" min="0" step="1" value="${metrics.posts}" inputmode="numeric" />
      <input type="number" data-field="noteSur10" min="0" max="10" step="0.1" value="${metrics.noteSur10}" inputmode="decimal" />
      <input type="number" data-field="ticketJoueur" min="0" step="0.01" value="${metrics.ticketJoueur}" inputmode="decimal" />
      <input type="number" data-field="ticketMoyen" min="0" step="0.01" value="${metrics.ticketMoyen}" inputmode="decimal" />
      <input type="number" data-field="ticketMax" min="0" step="0.01" value="${metrics.ticketMax}" inputmode="decimal" />
      <input type="number" data-field="chablisVendus" min="0" step="1" value="${metrics.chablisVendus}" inputmode="numeric" />
      <input type="number" data-field="chablisMax" min="0" step="1" value="${metrics.chablisMax}" inputmode="numeric" />
    `;
    metricsGrid.appendChild(row);
  });
}

function collectMetrics() {
  captureDraftMetrics();
  const result = {};
  getSelectedUsers().forEach((user) => {
    const snapshot = getMetricsForUid(user.uid, user.username);
    result[user.uid] = {
      username: user.username,
      scans: Number(snapshot.scans || 0),
      posts: Number(snapshot.posts || 0),
      noteSur10: Number(snapshot.noteSur10 || 0),
      ticketJoueur: Number(snapshot.ticketJoueur || 0),
      ticketMoyen: Number(snapshot.ticketMoyen || 0),
      ticketMax: Number(snapshot.ticketMax || 0),
      chablisVendus: Number(snapshot.chablisVendus || 0),
      chablisMax: Number(snapshot.chablisMax || 0)
    };
  });
  return result;
}

async function fetchAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  allUsers = [];
  userMap.clear();
  snap.forEach(docSnap => {
    const data = docSnap.data() || {};
    const user = {
      uid: docSnap.id,
      username: data.username || docSnap.id
    };
    allUsers.push(user);
    userMap.set(user.uid, user);
  });
  allUsers.sort((a, b) => a.username.localeCompare(b.username));
}

async function loadDay(dateISO) {
  currentDateISO = dateISO;
  if (dayPicker) dayPicker.value = dateISO;
  loadingEl.style.display = 'block';
  contentEl.style.display = 'none';
  clearStatus();

  if (!allUsers.length) {
    await fetchAllUsers();
  }

  const [attendanceSnap, metricsSnap] = await Promise.all([
    getDoc(doc(db, 'days', dateISO, 'attendance', 'roster')),
    getDocs(collection(db, 'days', dateISO, 'metrics'))
  ]);

  const roster = attendanceSnap.exists() ? (attendanceSnap.data().uids || []) : [];
  selectedUids = new Set(roster);
  dayMetrics = {};

  metricsSnap.forEach(metricDoc => {
    const data = metricDoc.data() || {};
    const uid = data.uid || metricDoc.id;
    dayMetrics[uid] = {
      uid,
      username: data.username || userMap.get(uid)?.username || uid,
      scans: Number(data.scans || 0),
      posts: Number(data.posts || 0),
      noteSur10: Number(data.noteSur10 || 0),
      ticketJoueur: Number(data.ticketJoueur || 0),
      ticketMoyen: Number(data.ticketMoyen || 0),
      ticketMax: Number(data.ticketMax || 0),
      chablisVendus: Number(data.chablisVendus || 0),
      chablisMax: Number(data.chablisMax || 0)
    };
    selectedUids.add(uid);
  });

  renderUserList();
  renderMetricsForm();
  setStep('attendance');

  loadingEl.style.display = 'none';
  contentEl.style.display = 'block';
  showStatus(`Journée chargée : ${dateISO}`, 'info');
}

async function saveDay() {
  if (!btnSaveDay) return;
  const selectedUsers = getSelectedUsers();
  if (!selectedUsers.length) {
    showStatus('Sélectionne au moins un serveur.', 'error');
    return;
  }

  const metricsByUid = collectMetrics();
  btnSaveDay.disabled = true;
  showStatus('Enregistrement en cours…', 'info');

  try {
    await persistDay(currentDateISO, selectedUsers.map((user) => user.uid), metricsByUid);
    showStatus(`✅ Journée ${currentDateISO} enregistrée.`, 'success');
  } catch (error) {
    console.error('[admin] Save day error:', error?.code, error?.message, error);
    showStatus('❌ Erreur: ' + (error?.code || error?.message || 'inconnue'), 'error');
  } finally {
    btnSaveDay.disabled = false;
  }
}

async function persistDay(dateISO, selectedUids, metricsByUid) {
  await setDoc(doc(db, 'days', dateISO, 'meta', 'info'),
    clean({ dateISO, updatedAt: serverTimestamp() }),
    { merge: true });

  await setDoc(doc(db, 'days', dateISO, 'attendance', 'roster'),
    clean({ uids: selectedUids, updatedAt: serverTimestamp() }),
    { merge: true });

  for (const uid of selectedUids) {
    const m = metricsByUid[uid] || {};
    const metrics = clean({
      uid,
      scans: Number(m.scans || 0),
      posts: Number(m.posts || 0),
      noteSur10: Math.max(0, Math.min(10, Number(m.noteSur10 || 0))),
      ticketJoueur: Number(m.ticketJoueur || 0),
      ticketMoyen: Number(m.ticketMoyen || 0),
      ticketMax: Number(m.ticketMax || 0),
      chablisVendus: Number(m.chablisVendus || 0),
      chablisMax: Number(m.chablisMax || 0),
      updatedAt: serverTimestamp()
    });

    await setDoc(doc(db, 'days', dateISO, 'metrics', uid), metrics, { merge: true });

    const { score, xp } = buildScore(metrics);
    await setDoc(doc(db, 'users', uid), clean({
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
      xp,
      score,
      lastActiveDate: dateISO,
      updatedAt: serverTimestamp()
    }), { merge: true });
  }
}

async function recomputeUser(uid) {
  const q = query(collectionGroup(db, 'metrics'), where('uid', '==', uid));
  const snaps = await getDocs(q);
  const agg = { scans: 0, posts: 0, noteSum: 0, noteCount: 0, tj: 0, tmSum: 0, tmCount: 0, tMax: 0, chV: 0, chMax: 0 };
  snaps.forEach(docSnap => {
    const m = docSnap.data() || {};
    agg.scans += Number(m.scans || 0);
    agg.posts += Number(m.posts || 0);
    if (Number.isFinite(m.noteSur10)) { agg.noteSum += Number(m.noteSur10); agg.noteCount++; }
    agg.tj += Number(m.ticketJoueur || 0);
    if (Number.isFinite(m.ticketMoyen)) { agg.tmSum += Number(m.ticketMoyen); agg.tmCount++; }
    agg.tMax = Math.max(agg.tMax, Number(m.ticketMax || 0));
    agg.chV += Number(m.chablisVendus || 0);
    agg.chMax += Number(m.chablisMax || 0);
  });
  const stats = {
    scans: agg.scans,
    posts: agg.posts,
    noteSur10: agg.noteCount ? +(agg.noteSum / agg.noteCount).toFixed(2) : 0,
    ticketJoueur: +agg.tj.toFixed(2),
    ticketMoyen: agg.tmCount ? +(agg.tmSum / agg.tmCount).toFixed(2) : 0,
    ticketMax: agg.tMax,
    chablisVendus: agg.chV,
    chablisMax: agg.chMax
  };
  const { score, xp } = buildScore(stats);
  await setDoc(doc(db, 'users', uid), clean({ stats, xp, score, updatedAt: serverTimestamp() }), { merge: true });
}

function initDateControls() {
  if (dayPicker) {
    dayPicker.value = currentDateISO;
    dayPicker.addEventListener('change', () => {
      const value = dayPicker.value || todayISO;
      loadDay(value);
    });
  }

  dayPrevBtn?.addEventListener('click', () => {
    const prev = shiftDate(currentDateISO, -1);
    loadDay(prev);
  });

  dayNextBtn?.addEventListener('click', () => {
    const next = shiftDate(currentDateISO, 1);
    loadDay(next);
  });

  reloadDayBtn?.addEventListener('click', () => {
    loadDay(currentDateISO);
  });
}

function initActions() {
  btnSelectAll?.addEventListener('click', () => {
    captureDraftMetrics();
    selectedUids = new Set(allUsers.map(user => user.uid));
    renderUserList();
    if (!stepMetrics.hidden) {
      renderMetricsForm();
    }
  });

  btnClearAll?.addEventListener('click', () => {
    captureDraftMetrics();
    selectedUids.clear();
    renderUserList();
    if (!stepMetrics.hidden) {
      renderMetricsForm();
    }
  });

  btnContinue?.addEventListener('click', () => {
    if (!getSelectedUsers().length) {
      showStatus('Sélectionne au moins un serveur.', 'error');
      return;
    }
    renderMetricsForm();
    setStep('metrics');
    clearStatus();
  });

  btnBack?.addEventListener('click', () => {
    captureDraftMetrics();
    setStep('attendance');
  });

  btnSaveDay?.addEventListener('click', (event) => {
    event.preventDefault();
    saveDay();
  });
}

async function bootstrap() {
  initDateControls();
  initActions();
  await loadDay(currentDateISO);
}

bootstrap();
