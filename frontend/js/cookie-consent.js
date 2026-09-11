// ============================================================
// Cookie consent banner
//
// Shows a banner on first visit. Saves the person's choice
// locally (so it doesn't ask again) AND sends it to the backend,
// which stores it in Firestore — useful for compliance records.
// ============================================================

(function () {
  const CONSENT_KEY = 'eminentcloud_cookie_consent';

  function getApiBase() {
    const isLocal = window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1'
      || window.location.protocol === 'file:';
    return isLocal ? 'http://localhost:3000' : 'https://api.eminentcloude.in';
  }

  function getDeviceId() {
    let id = localStorage.getItem('eminentcloud_device_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem('eminentcloud_device_id', id);
    }
    return id;
  }

  async function recordConsent(decision) {
    const record = {
      decision, // "accepted" or "rejected"
      deviceId: getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));

    try {
      await fetch(`${getApiBase()}/privacy/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (err) {
      // Non-critical if this fails — the local record still applies,
      // and the person isn't blocked from using the site.
      console.warn('Could not save consent record to server:', err);
    }
  }

  function hideBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.remove('show');
  }

  window.acceptCookies = function () {
    recordConsent('accepted');
    hideBanner();
  };

  window.rejectCookies = function () {
    recordConsent('rejected');
    hideBanner();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const alreadyDecided = localStorage.getItem(CONSENT_KEY);
    if (!alreadyDecided) {
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.classList.add('show');
    }
  });
})();
