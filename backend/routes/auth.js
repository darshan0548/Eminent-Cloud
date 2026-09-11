// ============================================================
// Auth routes — Business Login for Instagram
//
// This uses Meta's current recommended flow ("Instagram API with
// Instagram Login"). Unlike the older Facebook-Page-based flow,
// this lets a user connect their Instagram Business/Creator
// account directly — no Facebook Page required.
//
// Flow:
//   1. /auth/instagram   -> redirect user to Instagram's own login
//   2. /auth/callback    -> Instagram sends them back here with a code
//   3. We exchange that code for a short-lived token
//   4. We exchange that for a long-lived token (lasts ~60 days)
//   5. We save it to Firestore, keyed by their Instagram user ID
//   6. We redirect back to the dashboard, now "connected"
// ============================================================

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('../firebase');

// Where your backend itself is reachable — must exactly match a URI
// you added in the Instagram Business Login redirect settings.
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

// --- Step 1: Send the user to Instagram to log in ---
router.get('/instagram', (req, res) => {
  const redirectUri = `${BACKEND_URL}/auth/callback`;
  const scopes = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
  ].join(',');

  const igLoginUrl =
    `https://api.instagram.com/oauth/authorize` +
    `?client_id=${process.env.INSTAGRAM_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&response_type=code`;

  res.redirect(igLoginUrl);
});

// Kept as an alias so any old links/buttons still work.
router.get('/facebook', (req, res) => res.redirect('/auth/instagram'));

// --- Step 2: Instagram sends the user back here with a code ---
router.get('/callback', async (req, res) => {
  const { error } = req.query;
  let { code } = req.query;
  const redirectUri = `${BACKEND_URL}/auth/callback`;

  if (error || !code) {
    console.error('Instagram login was cancelled or failed:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard.html?connected=false`);
  }

  // Instagram appends a trailing "#_" to the code sometimes — strip it.
  code = code.replace('#_', '');

  try {
    // --- Exchange the code for a short-lived access token ---
    const params = new URLSearchParams();
    params.append('client_id', process.env.INSTAGRAM_APP_ID);
    params.append('client_secret', process.env.INSTAGRAM_APP_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    params.append('code', code);

    const shortTokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      params
    );
    const { access_token: shortLivedToken, user_id: instagramUserId } = shortTokenRes.data;

    // --- Exchange it for a long-lived token (lasts ~60 days) ---
    const longTokenRes = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        access_token: shortLivedToken,
      },
    });
    const longLivedToken = longTokenRes.data.access_token;

    // --- Get basic profile info (nice to show in the dashboard) ---
    const profileRes = await axios.get(`https://graph.instagram.com/v21.0/me`, {
      params: {
        fields: 'id,username,account_type',
        access_token: longLivedToken,
      },
    });
    const profile = profileRes.data;

    // --- Save everything to Firestore, keyed by the Instagram user ID ---
    const userId = String(instagramUserId);
    await db.collection('connectedAccounts').doc(userId).set({
      instagramUserId: userId,
      username: profile.username,
      accountType: profile.account_type,
      accessToken: longLivedToken, // used later to send replies/DMs
      connectedAt: new Date().toISOString(),
    });

    // --- Send the user back to the dashboard, now connected ---
    res.redirect(`${process.env.FRONTEND_URL}/dashboard.html?connected=true&userId=${userId}`);
  } catch (err) {
    console.error('Instagram auth callback failed:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard.html?connected=false&reason=error`);
  }
});

module.exports = router;
