// ============================================================
// Settings routes
//
// Stores and retrieves each user's automation settings
// (toggle states + reply/DM text) in Firestore.
//
// NOTE: Right now there's no real login yet (that comes once
// Facebook Login is wired up), so the frontend generates a
// temporary random ID per browser and sends it as the userId.
// Once real auth exists, this ID will be replaced with the
// user's actual connected Instagram account ID.
// ============================================================

const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// GET /settings/:userId — load this user's saved settings
router.get('/:userId', async (req, res) => {
  try {
    const doc = await db.collection('userSettings').doc(req.params.userId).get();
    if (!doc.exists) {
      // No settings saved yet — send sensible defaults
      return res.json({
        commentsEnabled: true,
        dmEnabled: false,
        replyText: '',
        dmText: '',
      });
    }
    res.json(doc.data());
  } catch (err) {
    console.error('Error loading settings:', err);
    res.status(500).json({ error: 'Could not load settings' });
  }
});

// POST /settings/:userId — save this user's settings
router.post('/:userId', async (req, res) => {
  try {
    const { commentsEnabled, dmEnabled, replyText, dmText } = req.body;
    await db.collection('userSettings').doc(req.params.userId).set(
      { commentsEnabled, dmEnabled, replyText, dmText, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Could not save settings' });
  }
});

module.exports = router;
