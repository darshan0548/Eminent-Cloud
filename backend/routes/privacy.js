// ============================================================
// Privacy / consent routes
//
// Stores each visitor's cookie consent decision in Firestore —
// useful as an auditable record for privacy compliance.
// ============================================================

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// POST /privacy/consent — save a consent decision
router.post('/consent', async (req, res) => {
  try {
    const { decision, deviceId, timestamp } = req.body;
    if (!decision || !deviceId) {
      return res.status(400).json({ error: 'Missing decision or deviceId' });
    }

    await db.collection('cookieConsent').add({
      decision,
      deviceId,
      timestamp: timestamp || new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving consent record:', err);
    res.status(500).json({ error: 'Could not save consent' });
  }
});

module.exports = router;
