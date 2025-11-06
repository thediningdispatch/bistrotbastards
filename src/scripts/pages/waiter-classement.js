import { db, auth } from '../core/firebase.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { authReady } from '../core/auth-guard.js';

const tPageStart = performance.now();

const loadingEl = document.getElementById('leaderboardLoading');
const contentEl = document.getElementById('leaderboardContent');
const tableBody = document.getElementById('leaderboardTableBody');
const refreshBtn = document.getElementById('refreshBtn');

/**
 * Calcule le score à partir des stats si score/xp.total manquant
 * (mêmes formules que l'admin)
 */
function computeScoreFromStats(stats) {
  if (!stats) return 0;

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
  return XP_reviews_pond + XP_ticket_pond + XP_chablis_pond + XP_engagement_pond;
}

/**
 * Récupère le score final d'un utilisateur
 * Priorité : score > xp.total > calcul depuis stats
 */
function getFinalScore(userData) {
  if (userData.score && Number.isFinite(userData.score)) {
    return userData.score;
  }
  if (userData.xp?.total && Number.isFinite(userData.xp.total)) {
    return userData.xp.total;
  }
  return computeScoreFromStats(userData.stats);
}

/**
 * Retourne le badge pour le top 3
 */
function getRankBadge(rank) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return rank;
  }
}

/**
 * Crée une ligne du tableau de classement
 */
function createLeaderboardRow(userData, rank) {
  const username = (userData.username || 'ANONYME').toString().toUpperCase();
  const position = (userData.position || 'Serveur').toString();
  const score = getFinalScore(userData);
  const scoreDisplay = Number.isFinite(score) && score > 0 ? Math.round(score) : '--';

  const tr = document.createElement('tr');
  tr.className = rank <= 3 ? `leaderboard-row leaderboard-top${rank}` : 'leaderboard-row';

  tr.innerHTML = `
    <td class="leaderboard-rank">${getRankBadge(rank)}</td>
    <td class="leaderboard-username">${username}</td>
    <td class="leaderboard-position">${position}</td>
    <td class="leaderboard-score">${scoreDisplay}</td>
    <td class="leaderboard-actions">
      <a href="performances.html?uid=${userData.uid}" class="btn btn-small">Voir performances</a>
    </td>
  `;

  return tr;
}

/**
 * Charge le classement depuis Firestore
 */
async function loadLeaderboard() {
  try {
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    tableBody.innerHTML = '';

    // Query: users WHERE isActive==true ORDER BY score DESC LIMIT 200
    const q = query(
      collection(db, 'users'),
      where('isActive', '==', true),
      orderBy('score', 'desc'),
      limit(200)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: var(--muted);">
            Aucun participant actif pour le moment
          </td>
        </tr>
      `;
    } else {
      const users = [];
      snapshot.forEach(docSnap => {
        const userData = docSnap.data();
        users.push({
          uid: docSnap.id,
          username: userData.username,
          position: userData.position,
          score: userData.score,
          xp: userData.xp,
          stats: userData.stats
        });
      });

      // Re-trier localement au cas où le score calculé diffère
      users.sort((a, b) => getFinalScore(b) - getFinalScore(a));

      // Afficher chaque ligne
      users.forEach((user, index) => {
        const rank = index + 1;
        tableBody.appendChild(createLeaderboardRow(user, rank));
      });
    }

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('[leaderboard] Load error:', error);

    if (error.code === 'permission-denied') {
      loadingEl.innerHTML = '<p style="color: red; padding: 40px; text-align: center;">❌ Permissions insuffisantes — connectez-vous pour voir le classement.</p>';
    } else if (error.message?.includes('index')) {
      loadingEl.innerHTML = `
        <p style="padding: 40px; text-align: center;">
          ⚠️ Index Firestore manquant.<br />
          <a href="${error.message.match(/https:\/\/[^\s]+/)?.[0] || '#'}" target="_blank" style="text-decoration: underline;">Cliquez ici pour créer l'index</a>
        </p>
      `;
    } else {
      loadingEl.innerHTML = '<p style="color: red; padding: 40px; text-align: center;">Erreur lors du chargement du classement</p>';
    }
  }
}

// Bouton refresh
if (refreshBtn) {
  refreshBtn.addEventListener('click', loadLeaderboard);
}

console.log('[Perf] leaderboard init in', (performance.now() - tPageStart).toFixed(1), 'ms');

// Charger le classement après auth
const scheduleInitialLoad = () => {
  const start = () => loadLeaderboard();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(start);
  } else {
    setTimeout(start, 0);
  }
};

(async () => {
  await authReady;
  if (!auth.currentUser) {
    loadingEl.innerHTML = '<p style="color: red; padding: 40px; text-align: center;">❌ Connexion requise</p>';
    return;
  }
  scheduleInitialLoad();
})();
