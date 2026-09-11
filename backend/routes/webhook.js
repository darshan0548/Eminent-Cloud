// ============================================================
// Webhook routes — the core automation engine
//
// Meta calls these routes automatically whenever something
// happens on a connected Instagram account (a new comment, a
// new DM, etc). This is where EminentCloud actually decides
// what to send back, and sends it for real.
// ============================================================

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('../firebase');

const GRAPH_URL = 'https://graph.instagram.com/v21.0';

// --- Step 1: Verification (Meta confirms you own this server) ---
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// --- Step 2: Real events arrive here ---
router.post('/', async (req, res) => {
  // Respond immediately so Meta doesn't retry/timeout — we do the
  // actual work after responding.
  res.sendStatus(200);

  const body = req.body;
  if (!body.entry) return;

  for (const entry of body.entry) {
    const instagramAccountId = String(entry.id);

    try {
      // --- Handle new comments ---
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            await handleNewComment(instagramAccountId, change.value);
          }
        }
      }

      // --- Handle new DMs (logged for now; auto-DM-reply is a
      // separate feature from the comment -> DM funnel below) ---
      if (entry.messaging) {
        for (const msg of entry.messaging) {
          await logActivity(instagramAccountId, {
            type: 'dm_received',
            fromUsername: msg.sender?.id || 'unknown',
            text: msg.message?.text || '',
          });
        }
      }
    } catch (err) {
      console.error('Error processing webhook entry:', err.response?.data || err.message);
    }
  }
});

// --- Core logic: a new comment came in — reply, and optionally DM ---
async function handleNewComment(instagramAccountId, commentData) {
  const commentId = commentData.id;
  const commenterUsername = commentData.from?.username || 'someone';
  const commentText = commentData.text || '';

  // Find which connected EminentCloud account owns this Instagram account
  const accountDoc = await db.collection('connectedAccounts').doc(instagramAccountId).get();
  if (!accountDoc.exists) {
    console.log(`No connected account found for Instagram ID ${instagramAccountId} — ignoring.`);
    return;
  }
  const account = accountDoc.data();
  const accessToken = account.accessToken;

  // Load this user's automation settings
  const settingsDoc = await db.collection('userSettings').doc(instagramAccountId).get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};

  // --- 1. Auto-reply to the comment ---
  if (settings.commentsEnabled && settings.replyText) {
    try {
      await axios.post(`${GRAPH_URL}/${commentId}/replies`, null, {
        params: { message: settings.replyText, access_token: accessToken },
      });
      await logActivity(instagramAccountId, {
        type: 'comment_reply',
        fromUsername: commenterUsername,
        text: settings.replyText,
        success: true,
      });
    } catch (err) {
      console.error('Failed to send comment reply:', err.response?.data || err.message);
      await logActivity(instagramAccountId, {
        type: 'comment_reply',
        fromUsername: commenterUsername,
        success: false,
        error: err.response?.data?.error?.message || err.message,
      });
    }
  }

  // --- 2. Follow-up private DM to the commenter ---
  if (settings.dmEnabled && settings.dmText) {
    try {
      await axios.post(`${GRAPH_URL}/${account.instagramUserId}/messages`, {
        recipient: { comment_id: commentId },
        message: { text: settings.dmText },
      }, {
        params: { access_token: accessToken },
      });
      await logActivity(instagramAccountId, {
        type: 'dm_sent',
        fromUsername: commenterUsername,
        text: settings.dmText,
        success: true,
      });
    } catch (err) {
      console.error('Failed to send follow-up DM:', err.response?.data || err.message);
      await logActivity(instagramAccountId, {
        type: 'dm_sent',
        fromUsername: commenterUsername,
        success: false,
        error: err.response?.data?.error?.message || err.message,
      });
    }
  }
}

// --- Record every automated action so the dashboard can show real activity ---
async function logActivity(instagramAccountId, entry) {
  await db.collection('activity').add({
    instagramAccountId,
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

module.exports = router;
