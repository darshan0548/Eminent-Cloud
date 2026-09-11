# EminentCloud

Instagram comment/DM auto-reply service — plain HTML/CSS/JS frontend + Node.js backend. No build tools required.

## Current status

| Piece | Status |
|---|---|
| Landing page + dashboard UI | ✅ Done, mobile-friendly, sidebar navigation |
| Backend server | ✅ Working |
| Firebase (database) connection | ✅ Working, tested |
| Dashboard settings save/load | ✅ Working, saves to Firestore |
| Instagram Business Login (real connect) | ✅ Working — tested end to end |
| Webhook reply-sending (auto-reply logic) | ✅ Real code — posts real comment replies and DMs via Instagram's API |
| Activity log | ✅ Real data from Firestore, shown in dashboard |
| Templates | ✅ Real quick-fill presets in the dashboard |
| Contacts / Broadcasts / rich Analytics | 🔲 Not built — would need real conversation history and a compliant sending system; intentionally left out rather than faked |
| Deployed live | 🔲 Not yet — steps below |

## Folder structure

```
eminentcloud/
├── frontend/              → the website — deploys to Cloudflare Pages
│   ├── index.html          (landing page)
│   ├── dashboard.html      (user dashboard)
│   ├── css/style.css
│   └── js/
│       ├── main.js         (landing page animation)
│       └── dashboard.js    (connect flow, save/load settings)
├── backend/                → the server — deploys to Render
│   ├── server.js           (main entry point)
│   ├── firebase.js         (Firebase connection)
│   ├── .env.example        (template — copy to .env, see below)
│   └── routes/
│       ├── auth.js         (Instagram Business Login — REAL, working)
│       ├── settings.js     (save/load user settings — REAL, working)
│       └── webhook.js      (receives Instagram events — TODO: send real replies)
└── README.md               (this file)
```

---

## 1. Editing your `.env` file

Your `.env` file holds all your secret keys. It is **never uploaded to GitHub** (already excluded via `.gitignore`).

**Create it:**
1. Go into the `backend` folder
2. Copy `.env.example` and rename the copy to exactly `.env` (no `.example`)
3. Open `.env` in any text editor (Notepad, VS Code)

**Fill in each value:**

| Variable | Where to get it |
|---|---|
| `INSTAGRAM_APP_ID` | developers.facebook.com → your app → **Use cases** → "Manage messaging & content on Instagram" → shown directly on that page as "Instagram app ID" |
| `INSTAGRAM_APP_SECRET` | Same page → click "Instagram app secret" to reveal it |
| `WEBHOOK_VERIFY_TOKEN` | Make up any word/phrase yourself — you'll enter the same value into Meta's webhook setup screen later |
| `FIREBASE_PROJECT_ID` | Firebase console → Project Settings → General tab |
| `FIREBASE_CLIENT_EMAIL` | Firebase console → Project Settings → Service Accounts → Generate new private key (downloads a `.json` — this value is inside it) |
| `FIREBASE_PRIVATE_KEY` | Same downloaded `.json` file — copy the whole value including `\n` characters, wrapped in double quotes |
| `PORT` | Leave as `3000` |
| `FRONTEND_URL` | For local testing: `http://localhost:3000` is NOT this — leave as `https://eminentcloude.in` for now, it only matters once deployed |
| `BACKEND_URL` | For local testing, leave as `http://localhost:3000` |

Save the file once all values are filled in.

---

## 2. Testing it on your computer

**Install dependencies (first time only, or after any update):**
```
cd backend
npm install
```

**Start the server:**
```
npm start
```
You should see: `EminentCloud backend listening on port 3000`
(Keep this terminal window open — closing it stops your server.)

**Test the backend + Firebase:**
Open a browser → go to `http://localhost:3000/test-firebase` → you should see a success message with a timestamp.

**Test the full dashboard:**
1. Open `frontend/dashboard.html` directly (double-click the file)
2. Click **"Connect with Facebook"** — this now redirects to Instagram's real login
3. Log in with your Instagram Business/Creator account and approve permissions
4. You should land back on your dashboard, connected
5. Toggle switches / edit reply text / click **"Save changes"** — check Firebase console → Firestore → `userSettings` collection to confirm it saved

**Before this works, in your Meta app dashboard, make sure you've done:**
- Added `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages` permissions under your Use Case
- Added `http://localhost:3000/auth/callback` as a valid redirect URI under Instagram Business Login settings
- Added yourself as an **Instagram Tester** under the app's **Roles** tab (required while the app isn't published/reviewed yet)

---

## 3. What's left to build before going fully live

`backend/routes/webhook.js` currently just logs incoming comments/messages to the console — it doesn't send replies yet. That's the next real feature to build: reading the saved settings for the relevant connected account, then calling the Instagram API to actually post a reply/DM.

---

## 4. Deploying

### Push to GitHub
Create a repo, upload this whole `eminentcloud` folder (the `.gitignore` will automatically keep your `.env` out of it).

### Deploy the backend to Render
- render.com → sign up with GitHub → New → Web Service → pick your repo
- Root Directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Under **Environment**, manually add every variable from your local `.env` (Render doesn't read the file itself — you re-type each key/value into their dashboard)
- Deploy — you'll get a `.onrender.com` URL

### Deploy the frontend to Cloudflare Pages
- dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → pick your repo
- Build output directory: `frontend`
- Deploy — you'll get a `.pages.dev` URL

### Connect your domain (eminentcloude.in)
- Move your domain's DNS to Cloudflare (free) for the easiest setup
- Cloudflare Pages project → Custom domains → add `eminentcloude.in`
- Render service → Settings → Custom Domain → add `api.eminentcloude.in` (Render gives you a CNAME to add in Cloudflare DNS — set it to "DNS only")

### After deploying, update these
- In your live Render environment variables: set `FRONTEND_URL=https://eminentcloude.in` and `BACKEND_URL=https://api.eminentcloude.in`
- In Meta app dashboard: add `https://api.eminentcloude.in/auth/callback` as another valid redirect URI (keep the localhost one too, for future local testing)
- `frontend/js/dashboard.js` already auto-detects localhost vs. live, so no code change needed there
