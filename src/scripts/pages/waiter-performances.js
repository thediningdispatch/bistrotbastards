import { auth, db } from '../core/firebase.js';
import { ROUTES } from '../core/config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tPageStart = performance.now();

const elements = {
  dateEl: document.getElementById('perfDate'),
  userRoleEl: document.getElementById('perfUserRole'),
  userNameEl: document.getElementById('perfUserName'),
  statusEl: document.getElementById('perfStatus'),
  gridEl: document.getElementById('perfGrid'),
  refreshBtn: document.getElementById('perfRefresh'),
  badgeTicket: document.getElementById('ticketBadge'),
  cards: {
    satisfaction: {
      score: document.getElementById('perfScoreSatisfaction'),
      detail: document.getElementById('perfDetailSatisfaction'),
      meta: document.getElementById('perfMetaSatisfaction')
    },
    ticket: {
      score: document.getElementById('perfScoreTicket'),
      detail: document.getElementById('perfDetailTicket'),
      meta: document.getElementById('perfMetaTicket')
    },
    avis: {
      score: document.getElementById('perfScoreAvis'),
      detail: document.getElementById('perfDetailAvis'),
      meta: document.getElementById('perfMetaAvis')
    },
    produit: {
      score: document.getElementById('perfScoreProduit'),
      detail: document.getElementById('perfDetailProduit'),
      meta: document.getElementById('perfMetaProduit')
    },
    total: {
      score: document.getElementById('perfScoreTotal'),
      detail: document.getElementById('perfDetailTotal')
    }
  }
};

const urlParams = new URLSearchParams(window.location.search);
const requestedUid = (urlParams.get('uid') || '').trim() || null;
const requestedDate = sanitizeDate(urlParams.get('date'));

const serviceDate = buildServiceDate(requestedDate);
if (elements.dateEl) {
  elements.dateEl.textContent = serviceDate.iso;
}

const numberFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currencyFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

let currentUser = null;
let isLoading = false;
let perfLogEmitted = false;

setStatus('⏳ Chargement des performances...', 'info');

onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    window.location.replace(ROUTES.LOGIN);
    return;
  }
  currentUser = firebaseUser;
  await loadPerformances();
});

elements.refreshBtn?.addEventListener('click', () => {
  loadPerformances();
});

async function loadPerformances() {
  if (!currentUser || isLoading) return;
  const targetUid = requestedUid || currentUser.uid;
  const fallbackName = deriveFallbackName(targetUid, targetUid === currentUser.uid ? currentUser : null);

  isLoading = true;
  setStatus('⏳ Chargement des performances...', 'info');
  elements.gridEl?.setAttribute('aria-busy', 'true');

  try {
    const [displayName, statsResult, dayMeta] = await Promise.all([
      fetchUserDisplayName(targetUid, fallbackName),
      fetchStatsDocument(targetUid, serviceDate),
      fetchDayMeta(serviceDate.iso)
    ]);

    updateViewerInfo(displayName, targetUid === currentUser.uid);

    const dataset = { ...(dayMeta || {}), ...(statsResult.data || {}) };
    const computed = computeScores(dataset, targetUid, statsResult.source);

    renderCards(computed);
    elements.gridEl?.removeAttribute('aria-busy');
    elements.gridEl?.removeAttribute('hidden');

    if (statsResult.source) {
      setStatus(`Performances synchronisées (${serviceDate.iso})`, 'success');
    } else {
      setStatus(`En attente des données du service ${serviceDate.iso}.`, 'muted');
    }
  } catch (error) {
    console.error('[perf] load error', error);
    setStatus('Impossible de charger tes performances. Réessaie plus tard.', 'error');
  } finally {
    isLoading = false;
    elements.gridEl?.removeAttribute('aria-busy');
    if (!perfLogEmitted) {
      perfLogEmitted = true;
      console.log('[Perf] waiter-performances init in', (performance.now() - tPageStart).toFixed(1), 'ms');
    }
  }
}

function setStatus(message, tone = 'info') {
  if (!elements.statusEl) return;
  elements.statusEl.textContent = message;
  elements.statusEl.dataset.tone = tone;
}

function sanitizeDate(raw) {
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function buildServiceDate(dateIso) {
  if (dateIso) {
    return { iso: dateIso, compact: dateIso.replace(/-/g, '') };
  }
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  const iso = `${get('year')}-${get('month')}-${get('day')}`;
  return { iso, compact: iso.replace(/-/g, '') };
}

function deriveFallbackName(uid, user) {
  if (user?.displayName) return user.displayName;
  if (user?.email) return user.email.split('@')[0];
  return uid;
}

async function fetchUserDisplayName(uid, fallback) {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (snapshot.exists()) {
      const username = snapshot.data()?.username;
      if (username) return username;
    }
  } catch (error) {
    console.warn('[perf] username fetch warning:', error);
  }
  return fallback;
}

async function fetchStatsDocument(uid, dateInfo) {
  const refs = [
    doc(db, 'serviceStats', dateInfo.iso, 'waiters', uid),
    doc(db, 'daily', dateInfo.iso, 'waiters', uid),
    doc(db, 'stats_by_day', dateInfo.compact, 'users', uid)
  ];

  for (const ref of refs) {
    try {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return { data: snapshot.data() || {}, source: ref.path };
      }
    } catch (error) {
      console.warn('[perf] stats fetch warning:', ref.path, error);
    }
  }
  return { data: {}, source: null };
}

async function fetchDayMeta(dateIso) {
  const refs = [
    doc(db, 'serviceStats', dateIso, 'meta', 'global'),
    doc(db, 'serviceStats', dateIso, 'meta', 'default'),
    doc(db, 'serviceStats_meta', dateIso),
    doc(db, 'daily_meta', dateIso)
  ];

  for (const ref of refs) {
    try {
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return snapshot.data() || {};
      }
    } catch (error) {
      console.warn('[perf] meta fetch warning:', error);
    }
  }
  return {};
}

function computeScores(data = {}, targetUid, sourcePath) {
  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const roundScore = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

  const topCount = Math.max(0, toNumber(data.topCount ?? data.top ?? 0));
  const okCount = Math.max(0, toNumber(data.okCount ?? data.ok ?? 0));
  const feedbackTotal = topCount + okCount;
  const topShare = feedbackTotal > 0 ? topCount / feedbackTotal : 0;
  const okShare = feedbackTotal > 0 ? okCount / feedbackTotal : 0;
  let satisfactionScore = feedbackTotal > 0 ? (topShare * 10) + (okShare * 5) : 0;
  satisfactionScore = roundScore(Math.min(satisfactionScore, 10));

  const ticketAvg = Math.max(0, toNumber(data.ticketAvg ?? data.ticketAverage ?? data.ticket_personal));
  let ticketRef = Math.max(0, toNumber(data.ticketRef ?? data.ticketReference ?? data.ticketRestau ?? data.ticketGlobal));
  const bestTicketUid = (data.serviceBestTicketUid || data.bestTicketUid || '').toString();
  let ticketScore = 0;
  if (ticketAvg > 0 && ticketRef > 0) {
    ticketScore = (ticketAvg / ticketRef) * 10;
  }
  let bonusApplied = Boolean(bestTicketUid && targetUid && bestTicketUid === targetUid);
  if (bonusApplied) {
    ticketScore += 1;
  }
  ticketScore = roundScore(Math.min(ticketScore, 10));

  const scansValidated = Math.max(0, toNumber(data.scansValidated ?? data.scans ?? data.qrScans));
  const reviewsPosted = Math.max(0, toNumber(data.reviewsPosted ?? data.reviews ?? data.reviewsPublished));
  let avisScore = 0;
  if (scansValidated > 0) {
    avisScore = Math.min((reviewsPosted / scansValidated) * 10, 10);
  } else if (reviewsPosted > 0) {
    avisScore = 10;
  }
  avisScore = roundScore(avisScore);

  const productSales = Math.max(0, toNumber(data.productSales ?? data.productCount ?? data.focusSales));
  const productTarget = Math.max(0, toNumber(data.productTarget ?? data.focusTarget));
  let produitScore = 0;
  if (productTarget > 0) {
    produitScore = Math.min((productSales / productTarget) * 10, 10);
  } else if (productSales > 0) {
    produitScore = 10;
  }
  produitScore = roundScore(produitScore);

  const totalScore = roundScore(
    (0.40 * satisfactionScore) +
    (0.25 * ticketScore) +
    (0.15 * avisScore) +
    (0.20 * produitScore)
  );

  return {
    satisfaction: { score: satisfactionScore, topCount, okCount, feedbackTotal, topShare, okShare },
    ticket: { score: ticketScore, avg: ticketAvg, ref: ticketRef, bonusApplied },
    avis: { score: avisScore, posted: reviewsPosted, scans: scansValidated },
    produit: { score: produitScore, sales: productSales, target: productTarget },
    total: { score: totalScore },
    sourcePath: sourcePath || null
  };
}

function renderCards(scores) {
  const formatScore = (value) => numberFormat.format(Number.isFinite(value) ? value : 0);
  const formatShare = (value) => percentFormat.format(Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 1)));

  const satisfactionCard = elements.cards.satisfaction;
  if (satisfactionCard?.score) {
    satisfactionCard.score.textContent = `${formatScore(scores.satisfaction.score)} / 10`;
    if (scores.satisfaction.feedbackTotal > 0) {
      satisfactionCard.detail.textContent =
        `Top ${scores.satisfaction.topCount} (${formatShare(scores.satisfaction.topShare)}) · ` +
        `OK ${scores.satisfaction.okCount} (${formatShare(scores.satisfaction.okShare)})`;
      satisfactionCard.meta.textContent =
        `${scores.satisfaction.feedbackTotal} retours clients pris en compte.`;
    } else {
      satisfactionCard.detail.textContent = 'En attente des retours clients.';
      satisfactionCard.meta.textContent = '';
    }
  }

  const ticketCard = elements.cards.ticket;
  if (ticketCard?.score) {
    ticketCard.score.textContent = `${formatScore(scores.ticket.score)} / 10`;
    if (scores.ticket.avg > 0 || scores.ticket.ref > 0) {
      const refText = scores.ticket.ref > 0 ? currencyFormat.format(scores.ticket.ref) : '—';
      ticketCard.detail.textContent = `Ton ticket : ${currencyFormat.format(scores.ticket.avg || 0)} · Resto : ${refText}`;
      if (scores.ticket.ref > 0) {
        const ratio = scores.ticket.avg > 0 && scores.ticket.ref > 0
          ? Math.min(scores.ticket.avg / scores.ticket.ref, 1)
          : 0;
        ticketCard.meta.textContent = `Progression vs resto : ${formatShare(ratio)}`;
      } else {
        ticketCard.meta.textContent = 'Référence resto en attente.';
      }
    } else {
      ticketCard.detail.textContent = 'En attente des tickets du service.';
      ticketCard.meta.textContent = '';
    }
    if (elements.badgeTicket) {
      elements.badgeTicket.hidden = !scores.ticket.bonusApplied;
    }
  }

  const avisCard = elements.cards.avis;
  if (avisCard?.score) {
    avisCard.score.textContent = `${formatScore(scores.avis.score)} / 10`;
    if (scores.avis.scans > 0 || scores.avis.posted > 0) {
      avisCard.detail.textContent = `${scores.avis.posted} avis publiés / ${scores.avis.scans || 0} scans`;
      if (scores.avis.scans > 0) {
        const ratio = Math.min(scores.avis.posted / scores.avis.scans, 1);
        avisCard.meta.textContent = `Taux de publication : ${formatShare(ratio)}`;
      } else {
        avisCard.meta.textContent = '';
      }
    } else {
      avisCard.detail.textContent = 'En attente des scans QR.';
      avisCard.meta.textContent = '';
    }
  }

  const produitCard = elements.cards.produit;
  if (produitCard?.score) {
    produitCard.score.textContent = `${formatScore(scores.produit.score)} / 10`;
    if (scores.produit.sales > 0 || scores.produit.target > 0) {
      const targetText = scores.produit.target > 0 ? scores.produit.target : '—';
      produitCard.detail.textContent = `${scores.produit.sales} ventes / ${targetText} objectif`;
      if (scores.produit.target > 0) {
        const progress = Math.min(scores.produit.sales / scores.produit.target, 1);
        produitCard.meta.textContent = `Avancement : ${formatShare(progress)}`;
      } else {
        produitCard.meta.textContent = 'Objectif en attente de validation.';
      }
    } else {
      produitCard.detail.textContent = 'En attente des ventes du produit phare.';
      produitCard.meta.textContent = '';
    }
  }

  const totalCard = elements.cards.total;
  if (totalCard?.score) {
    totalCard.score.textContent = `${formatScore(scores.total.score)} / 10`;
    const breakdown = [
      `0,40×${formatScore(scores.satisfaction.score)}`,
      `0,25×${formatScore(scores.ticket.score)}`,
      `0,15×${formatScore(scores.avis.score)}`,
      `0,20×${formatScore(scores.produit.score)}`
    ].join(' + ');
    totalCard.detail.textContent = breakdown;
  }
}

function updateViewerInfo(name, isSelf) {
  if (elements.userRoleEl) {
    elements.userRoleEl.textContent = isSelf ? 'Serveur' : 'Serveur observé';
  }
  if (elements.userNameEl) {
    elements.userNameEl.textContent = name || '—';
  }
}
