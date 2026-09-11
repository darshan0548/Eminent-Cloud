// ============================================================
// EminentCloud backend — main server
//
// This is the server that runs 24/7 once deployed on Render.
// It does three jobs:
//   1. Lets users connect their Instagram account (auth routes)
//   2. Receives notifications from Meta when someone comments
//      or sends a DM (webhook routes)
//   3. Decides what automatic reply/DM to send back
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { db } = require('./firebase');
const webhookRoutes = require('./routes/webhook');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const privacyRoutes = require('./routes/privacy');
const activityRoutes = require('./routes/activity');

const app = express();

// CORS: during local development, the dashboard is often opened directly
// as a file (file://...) or from localhost, which don't send a normal
// "origin" header the same way a real deployed site does. This allows
// those cases through. Before inviting real users, tighten this to only
// allow your actual deployed frontend URL.
app.use(cors({ origin: true }));
app.use(express.json());

// Health check — visiting this URL confirms the server is alive.
// Useful for checking your Render deployment worked.
app.get('/', (req, res) => {
  res.send('EminentCloud backend is running.');
});

// Test route — visit this in your browser to confirm the backend
// can actually write to and read from your Firestore database.
// Remove this route once everything's confirmed working.
app.get('/test-firebase', async (req, res) => {
  try {
    const testRef = db.collection('_connectionTest').doc('ping');
    await testRef.set({ checkedAt: new Date().toISOString() });
    const saved = await testRef.get();
    res.json({ success: true, message: 'Firebase is connected!', data: saved.data() });
  } catch (err) {
    console.error('Firebase test failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use('/auth', authRoutes);
app.use('/webhook', webhookRoutes);
app.use('/settings', settingsRoutes);
app.use('/privacy', privacyRoutes);
app.use('/activity', activityRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EminentCloud backend listening on port ${PORT}`);
});
