import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/es/index.js';

async function fetchLeaderboard() {
  const tbody = document.querySelector('#leaderboardTable tbody');
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

  try {
    const restaurant = localStorage.getItem('restaurant');
    if (!restaurant) {
      tbody.innerHTML = "<tr><td colspan='4'>Set your restaurant first.</td></tr>";
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
        position: data.position || 'waiter',
        total
      });
    });

    users.sort((a, b) => b.total - a.total);

    if (!users.length) {
      tbody.innerHTML = "<tr><td colspan='4'>No waiters found for this restaurant.</td></tr>";
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
    tbody.innerHTML = `<tr><td colspan='4'>${error.message || 'Could not load leaderboard.'}</td></tr>`;
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
      if (qrStatus) qrStatus.textContent = '⚠️ Please enter your wallet address.';
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('bb_user') || '{}');
      const username = storedUser.username || localStorage.getItem('username') || 'Anonymous';
      const message = `Tip ${username} on Bistrot Bastards`;
      const uri = `ethereum:${wallet}?message=${encodeURIComponent(message)}`;

      await QRCode.toCanvas(qrCanvas, uri, { width: 180, margin: 1 });
      if (qrStatus) qrStatus.textContent = '✅ QR ready — show this to your guest!';
      console.log('✅ QR generated for', wallet);
    } catch (error) {
      console.error('❌ QR generation error:', error);
      if (qrStatus) qrStatus.textContent = '❌ Failed to generate QR.';
    }
  });
}
