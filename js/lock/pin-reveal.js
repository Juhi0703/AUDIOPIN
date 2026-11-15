/* AudioPIN Lock: optional "view my PIN" setting. OFF by default.

   Off (default): only the salted PBKDF2 hash is stored (pin-storage.js), so the PIN cannot be shown
                  by anyone, including this app.
   On:            the PIN is also stored encrypted with AES-GCM. The key is a non-extractable WebCrypto
                  key kept in IndexedDB, so a copy of localStorage alone does not reveal the PIN.
                  Honest limit: anyone who can unlock the phone and run code in this app's origin can
                  decrypt it. The PIN is shown only on the unlocked screen, only while a button is held.

   The PIN is known in memory only right after it is typed: at an unlock (decoded from the key codes)
   or when it is set. It is wiped when the app locks. */

let sessionPin = null;          // PIN from the current unlock or setup; memory only
let revealTimer = null;
const REVEAL_DB = 'audiopin-lock-keys';
const REVEAL_MAX_MS = 10000;    // never leave the PIN on screen longer than this

// ---- key storage (IndexedDB holds the CryptoKey object; its bytes are never readable) ----
function openRevealDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(REVEAL_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keys');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest(db, mode, action) {
  return new Promise((resolve, reject) => {
    const req = action(db.transaction('keys', mode).objectStore('keys'));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getRevealKey(create) {
  const db = await openRevealDb();
  try {
    let key = await idbRequest(db, 'readonly', s => s.get('reveal'));
    if (!key && create) {
      key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await idbRequest(db, 'readwrite', s => s.put(key, 'reveal'));
    }
    return key || null;
  } finally {
    db.close();
  }
}

async function deleteRevealKey() {
  const db = await openRevealDb();
  try { await idbRequest(db, 'readwrite', s => s.delete('reveal')); } finally { db.close(); }
}

async function encryptPin(pin) {
  const key = await getRevealKey(true);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(pin)));
  return { iv: b64(iv), data: b64(data) };
}

async function decryptPin(reveal) {
  const key = await getRevealKey(false);
  if (!key || !reveal) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(reveal.iv) }, key, unb64(reveal.data));
    return new TextDecoder().decode(plain);
  } catch (e) {
    return null;
  }
}

// ---- the "Your PIN" card on the unlocked screen ----
const pinNote = text => { $('pinNote').textContent = text; };

function hidePin() {
  clearTimeout(revealTimer); revealTimer = null;
  $('pinShow').textContent = '';
  $('pinShow').hidden = true;
}

function refreshPinCard() {
  const state = loadState();
  const on = !!(state && state.reveal);
  $('revealToggle').checked = on;
  $('revealBtn').hidden = !on;
  hidePin();
  pinNote(on
    ? 'On: your PIN is stored encrypted on this device. Hold the button to see it — only where nobody is watching.'
    : 'Off: only a salted hash of your PIN is stored, so nobody — not even this app — can show it.');
}

$('revealToggle').onchange = async event => {
  const state = loadState();
  if (!state || $('home').hidden) return;
  if (event.target.checked) {
    if (!sessionPin) {                                 // e.g. the page was reloaded while unlocked
      event.target.checked = false;
      return pinNote('Lock and unlock once more, then turn this on.');
    }
    try {
      state.reveal = await encryptPin(sessionPin);
    } catch (e) {
      event.target.checked = false;
      return pinNote('This browser cannot store the PIN securely (private mode?), so viewing stays off.');
    }
    saveState(state);
  } else {
    delete state.reveal;
    saveState(state);
    try { await deleteRevealKey(); } catch (e) {}
  }
  refreshPinCard();
};

async function showPin() {
  const state = loadState();
  if (!state || !state.reveal || $('home').hidden) return;
  const pin = await decryptPin(state.reveal);
  if (!pin) return pinNote('The stored PIN could not be read on this device. Turn the setting off and on again.');
  $('pinShow').textContent = pin.split('').join(' ');
  $('pinShow').hidden = false;
  clearTimeout(revealTimer);
  revealTimer = setTimeout(hidePin, REVEAL_MAX_MS);
}

// Shown only while held (touch, mouse or keyboard), so it never stays on screen by accident.
$('revealBtn').onpointerdown = event => { event.preventDefault(); showPin(); };
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('revealBtn').addEventListener(ev, hidePin);
$('revealBtn').onkeydown = event => { if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); showPin(); } };
$('revealBtn').onkeyup = hidePin;
$('revealBtn').oncontextmenu = event => event.preventDefault();   // long-press must not open a menu
