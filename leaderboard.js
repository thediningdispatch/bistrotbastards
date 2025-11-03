import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/es/index.js';

async function fetchLeaderboard() {
  const tbody = document.querySelector('#leaderboardTable tbody');
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Chargement…</td></tr>";

  try {
    const restaurant = localStorage.getItem('restaurant');
    if (!restaurant) {
      tbody.innerHTML = "<tr><td colspan='4'>Renseignez d’abord votre restaurant.</td></tr>";
      return;
    }

    const q = query(collection(db, 'users'), where('restaurant', '==', restaurant));
    const snapshot = await getDocs(q);
    const users = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const s = data.stats || {};

      const satisfactionScore = ((((s.percentAmazing || 0) * 10) + ((s.percentOkay || 0) * 5)) / 10) * 0.4;
      const ticketScore = Math.min(((s.ticketAvg || 0) / Math.max(s.ticketRef || 1, 1)) * 10, 10) * 0.25;
      const feedbackScore = ((s.feedbackRate || 0) * 10) * 0.15;
      const productScore = Math.min(((s.productSales || 0) / Math.max(s.productGoal || 1, 1)) * 10, 10) * 0.20;

      const total = Number((satisfactionScore + ticketScore + feedbackScore + productScore).toFixed(2));

      users.push({
        username: data.username,
        position: data.position || 'serveur',
        total
      });
    });

    users.sort((a, b) => b.total - a.total);

    if (!users.length) {
      tbody.innerHTML = "<tr><td colspan='4'>Aucun serveur trouvé pour ce restaurant.</td></tr>";
      return;
    }

    tbody.innerHTML = '';
    users.forEach((u, i) => {
      const row = document.createElement('tr');
      let medal = i + 1;
      if (i === 0) medal = '🥇';
      else if (i === 1) medal = '🥈';
      else if (i === 2) medal = '🥉';

      row.innerHTML = `
        <td>${medal}</td>
        <td>${u.username}</td>
        <td>${u.position}</td>
        <td>${u.total.toFixed(1)} / 10</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan='4'>${error.message || 'Impossible de charger le classement.'}</td></tr>`;
  }
}

document.getElementById('refreshLeaderboard')?.addEventListener('click', fetchLeaderboard);

fetchLeaderboard();

const walletInput = document.getElementById('walletInput');
const qrCanvas = document.getElementById('qrCanvas');
const qrStatus = document.getElementById('qrStatus');
const generateBtn = document.getElementById('generateQR');

if (generateBtn) {
  generateBtn.addEventListener('click', async () => {
    const wallet = walletInput?.value.trim();
    if (!wallet) {
      if (qrStatus) qrStatus.textContent = '⚠️ Saisis ton adresse de portefeuille.';
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('bb_user') || '{}');
      const username = storedUser.username || localStorage.getItem('username') || 'Anonyme';
      const message = `Pourboire pour ${username} sur Bistrot Bastards`;
      const uri = `ethereum:${wallet}?message=${encodeURIComponent(message)}`;

      await QRCode.toCanvas(qrCanvas, uri, { width: 180, margin: 1 });
      if (qrStatus) qrStatus.textContent = '✅ QR prêt — montre-le à ton client !';
    } catch (error) {
      console.error('❌ Erreur génération QR :', error);
      if (qrStatus) qrStatus.textContent = '❌ Impossible de générer le QR.';
    }
  });
}
