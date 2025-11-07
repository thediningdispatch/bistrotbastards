import { auth, db } from '../core/firebase.js';
import { ROUTES } from '../core/config.js';
import { authReady } from '../core/auth-guard.js';
import {
  doc,
  onSnapshot,
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const xpEl = document.getElementById('profileXpValue');
const tipsEl = document.getElementById('profileTipsValue');
const rankEl = document.getElementById('profileRankValue');
const perfBtn = document.getElementById('btnPerformances');

const xpFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function setXp(value) {
  if (!xpEl) return;
  if (Number.isFinite(value)) {
    xpEl.textContent = xpFormatter.format(Math.max(0, value));
  } else {
    xpEl.textContent = '—';
  }
}

function setTips(value) {
  if (!tipsEl) return;
  if (Number.isFinite(value)) {
    tipsEl.textContent = currencyFormatter.format(Math.max(0, value));
  } else {
    tipsEl.textContent = '— €';
  }
}

function setRank(rank, total) {
  if (!rankEl) return;
  if (rank && total) {
    rankEl.textContent = `#${rank}/${total}`;
  } else {
    rankEl.textContent = '—';
  }
}

function updateStats(data) {
  const xpValue = Number(data?.xp?.total ?? data?.score);
  setXp(Number.isFinite(xpValue) ? xpValue : null);

  const tipsValue = Number(
    data?.stats?.ticketJoueur ??
    data?.stats?.ticketMoyen ??
    data?.stats?.chablisVendus
  );
  setTips(Number.isFinite(tipsValue) ? tipsValue : null);
}

async function updateRank(uid) {
  if (!rankEl) return;
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const rows = [];
    snapshot.forEach((docSnap) => {
      const payload = docSnap.data() || {};
      const score = Number(payload.score ?? payload?.xp?.total ?? 0);
      rows.push({ id: docSnap.id, score: Number.isFinite(score) ? score : 0 });
    });
    rows.sort((a, b) => b.score - a.score);
    const total = rows.length;
    const rankIndex = rows.findIndex((entry) => entry.id === uid);
    if (rankIndex === -1) {
      setRank(null, null);
      return;
    }
    setRank(rankIndex + 1, total);
  } catch (error) {
    console.error('[profile] Rank fetch failed', error);
    setRank(null, null);
  }
}

function wirePerformanceButton() {
  if (!perfBtn) return;
  const target = ROUTES.WAITER_PERFORMANCES || '/waiter/performances.html';
  perfBtn.setAttribute('href', target);
  perfBtn.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = target;
  });
}

async function initProfileOverview() {
  if (!xpEl || !tipsEl || !rankEl) return;

  await authReady;
  const user = auth.currentUser;
  if (!user) return;

  wirePerformanceButton();

  const userRef = doc(db, 'users', user.uid);
  onSnapshot(userRef, (snapshot) => {
    if (!snapshot.exists()) {
      updateStats(null);
      setRank(null, null);
      return;
    }
    const payload = snapshot.data() || {};
    updateStats(payload);
    updateRank(user.uid);
  }, (error) => {
    console.error('[profile] Unable to load stats', error);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initProfileOverview().catch((error) => console.error('[profile] init error', error));
  }, { once: true });
} else {
  initProfileOverview().catch((error) => console.error('[profile] init error', error));
}
