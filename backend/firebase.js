// ============================================================
// Firebase connection
//
// This file reads your FIREBASE_* values from .env and connects
// to your Firestore database. Every other file that needs the
// database imports { db } from here.
// ============================================================

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // .env stores the key with literal \n characters — this turns
    // them back into real line breaks, which the key needs to work.
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
  }),
});

const db = admin.firestore();

module.exports = { admin, db };
