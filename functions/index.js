/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const ADMIN_PASS = process.env.ADMIN_PASS;
const METRIC_FIELDS = [
  "scans",
  "posts",
  "noteSur10",
  "ticketJoueur",
  "ticketMoyen",
  "ticketMax",
  "chablisVendus",
  "chablisMax",
];

function cleanNumber(value, clamp) {
  let num = Number(value);
  if (!Number.isFinite(num)) num = 0;
  if (clamp) {
    num = Math.min(clamp.max, Math.max(clamp.min, num));
  }
  return num;
}

function cleanPayload(obj = {}) {
  const cleaned = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return;
      cleaned[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      cleaned[key] = value.filter((item) => item !== undefined && item !== null);
      return;
    }
    if (typeof value === "object") {
      const nested = cleanPayload(value);
      if (Object.keys(nested).length === 0) return;
      cleaned[key] = nested;
      return;
    }
    cleaned[key] = value;
  });
  return cleaned;
}

async function recomputeStats(uid) {
  const snaps = await db.collectionGroup("metrics").where("uid", "==", uid).get();
  const agg = {
    scans: 0,
    posts: 0,
    noteSum: 0,
    noteCount: 0,
    ticketJoueur: 0,
    ticketMoyenSum: 0,
    ticketMoyenCount: 0,
    ticketMax: 0,
    chablisVendus: 0,
    chablisMax: 0,
  };

  snaps.forEach((docSnap) => {
    const data = docSnap.data() || {};
    agg.scans += Number(data.scans || 0);
    agg.posts += Number(data.posts || 0);
    if (Number.isFinite(data.noteSur10)) {
      agg.noteSum += Number(data.noteSur10);
      agg.noteCount += 1;
    }
    if (Number.isFinite(data.ticketJoueur)) {
      agg.ticketJoueur += Number(data.ticketJoueur);
    }
    if (Number.isFinite(data.ticketMoyen)) {
      agg.ticketMoyenSum += Number(data.ticketMoyen);
      agg.ticketMoyenCount += 1;
    }
    if (Number.isFinite(data.ticketMax)) {
      agg.ticketMax = Math.max(agg.ticketMax, Number(data.ticketMax));
    }
    agg.chablisVendus += Number(data.chablisVendus || 0);
    agg.chablisMax += Number(data.chablisMax || 0);
  });

  const stats = {
    scans: agg.scans,
    posts: agg.posts,
    noteSur10: agg.noteCount ? Number((agg.noteSum / agg.noteCount).toFixed(2)) : 0,
    ticketJoueur: Number(agg.ticketJoueur.toFixed(2)),
    ticketMoyen: agg.ticketMoyenCount ? Number((agg.ticketMoyenSum / agg.ticketMoyenCount).toFixed(2)) : 0,
    ticketMax: agg.ticketMax,
    chablisVendus: agg.chablisVendus,
    chablisMax: agg.chablisMax,
  };

  const xpReviews = (stats.scans * 10) + (stats.posts * 25) + Math.round(stats.noteSur10 * 8);
  const xpTicket = Math.round(stats.ticketMoyen * 2) + Math.round(stats.ticketMax * 0.5);
  const overflow = Math.max(0, stats.chablisVendus - stats.chablisMax);
  const xpChablis = stats.chablisVendus * 15 + overflow * 5;
  const xpEngagement = 0;
  const total = xpReviews + xpTicket + xpChablis + xpEngagement;

  await db.doc(`users/${uid}`).set(cleanPayload({
    stats,
    xp: {
      reviews: xpReviews,
      ticket: xpTicket,
      chablis: xpChablis,
      engagement: xpEngagement,
      total,
    },
    score: total,
    updatedAt: FieldValue.serverTimestamp(),
  }), {merge: true});
}

exports.saveDayAdmin = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "method-not-allowed"});
    return;
  }

  if (!ADMIN_PASS) {
    console.error("[saveDayAdmin] Missing ADMIN_PASS env variable");
    res.status(500).json({error: "server-not-configured"});
    return;
  }

  try {
    const body = req.body || {};
    const password = body.password;
    if (!password || password !== ADMIN_PASS) {
      console.warn("[saveDayAdmin] invalid password");
      res.status(403).json({error: "forbidden"});
      return;
    }

    const dateISO = String(body.dateISO || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      res.status(400).json({error: "invalid-dateISO"});
      return;
    }

    const selectedUids = Array.isArray(body.selectedUids) ? body.selectedUids.filter(Boolean) : [];
    if (!selectedUids.length) {
      res.status(400).json({error: "no-selected-uids"});
      return;
    }

    const metricsByUid = body.metricsByUid || {};
    const sanitizedMetrics = {};

    selectedUids.forEach((uid) => {
      const raw = metricsByUid[uid] || {};
      const cleaned = {};
      METRIC_FIELDS.forEach((field) => {
        const clamp = field === "noteSur10" ? {min: 0, max: 10} : null;
        cleaned[field] = cleanNumber(raw[field], clamp);
      });
      sanitizedMetrics[uid] = cleanPayload({
        uid,
        username: raw.username || uid,
        ...cleaned,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await db.doc(`days/${dateISO}/meta/info`).set(
        cleanPayload({dateISO, updatedAt: FieldValue.serverTimestamp()}),
        {merge: true},
    );

    await db.doc(`days/${dateISO}/attendance/roster`).set(
        cleanPayload({uids: selectedUids, updatedAt: FieldValue.serverTimestamp()}),
        {merge: true},
    );

    for (const uid of selectedUids) {
      await db.doc(`days/${dateISO}/metrics/${uid}`).set(sanitizedMetrics[uid], {merge: true});
    }

    for (const uid of selectedUids) {
      await recomputeStats(uid);
    }

    res.status(200).json({ok: true});
  } catch (error) {
    console.error("[saveDayAdmin] error:", error);
    if (error.code === 400 || error.code === 403) {
      res.status(error.code).json({error: error.message || "bad-request"});
    } else {
      res.status(500).json({error: "internal-error"});
    }
  }
});
