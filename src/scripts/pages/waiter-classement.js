import { db } from '../core/firebase.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tPageStart = performance.now();

const loadingEl = document.getElementById('leaderboardLoading');
const contentEl = document.getElementById('leaderboardContent');
const tableBody = document.getElementById('leaderboardTableBody');
const refreshBtn = document.getElementById('refreshBtn');

let unsubscribe = null;

function getRankBadge(rank) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return rank;
  }
}

function createLeaderboardRow(userData, rank) {
  const username = (userData.username || 'ANONYME').toString().toUpperCase();
  const position = (userData.position || 'Serveur').toString();
  const score = Number.isFinite(userData.score) ? userData.score : 0;
  const stats = userData.stats || {};
  const meta = `<div style="font-size:11px;color:var(--muted);">Scans ${stats.scans || 0} · Posts ${stats.posts || 0} · TM €${Number(stats.ticketMoyen || 0).toFixed(2)}</div>`;

  const tr = document.createElement('tr');
  tr.className = rank <= 3 ? `leaderboard-row leaderboard-top${rank}` : 'leaderboard-row';

  tr.innerHTML = `
    <td class="leaderboard-rank">${getRankBadge(rank)}</td>
    <td class="leaderboard-username">${username}${meta}</td>
    <td class="leaderboard-position">${position}</td>
    <td class="leaderboard-score">${Math.round(score)}</td>
    <td class="leaderboard-actions">
      <a href="/waiter/performances.html?uid=${userData.uid}" class="btn btn-small">Voir performances</a>
    </td>
  `;

  return tr;
}

function renderLeaderboard(users) {
  tableBody.innerHTML = '';
  if (!users.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:40px;color:var(--muted);">
          Aucun participant pour le moment
        </td>
      </tr>`;
    return;
  }

  users.forEach((user, index) => {
    tableBody.appendChild(createLeaderboardRow(user, index + 1));
  });
}

function subscribeLeaderboard() {
  loadingEl.style.display = 'block';
  contentEl.style.display = 'none';

  if (unsubscribe) {
    unsubscribe();
  }

  unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() || {};
      const score = Number.isFinite(data.score) ? data.score : Number(data.xp?.total || 0);
      users.push({
        uid: docSnap.id,
        username: data.username || docSnap.id,
        position: data.position,
        score,
        stats: data.stats || {},
        xp: data.xp || {}
      });
    });

    users.sort((a, b) => (b.score || 0) - (a.score || 0));
    renderLeaderboard(users);
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  }, (error) => {
    console.error('[leaderboard] Subscribe error:', error);
    loadingEl.innerHTML = `<p style="color:red;padding:40px;">Erreur: ${error?.message || error}</p>`;
  });
}

refreshBtn?.addEventListener('click', () => {
  subscribeLeaderboard();
});

window.addEventListener('beforeunload', () => unsubscribe?.());

console.log('[Perf] leaderboard init in', (performance.now() - tPageStart).toFixed(1), 'ms');

subscribeLeaderboard();
