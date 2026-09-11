// ============================================================
// Activity routes
//
// Returns the real log of automated actions (comment replies,
// DMs sent) for a connected account, so the dashboard can show
// genuine activity instead of placeholder data.
// ============================================================

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// GET /activity/:userId — most recent 20 events for this account
router.get('/:userId', async (req, res) => {
  try {
    const snapshot = await db.collection('activity')
      .where('instagramAccountId', '==', req.params.userId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (err) {
    console.error('Error loading activity:', err);
    // If this is the first time this query runs, Firestore may ask
    // for a composite index — the error message includes a direct
    // link to create it with one click.
    res.status(500).json({ error: 'Could not load activity', details: err.message });
  }
});

module.exports = router;
