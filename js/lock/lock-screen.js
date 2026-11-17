/* AudioPIN Lock: the lock screen — clock, messages and the lockout countdown. */

function tick() {
  const now = new Date();
  $('time').textContent = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
  $('date').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const state = loadState();
  const wait = state ? (state.lockedUntil || 0) - Date.now() : 0;
  $('unlockBtn').disabled = wait > 0;
  if (wait > 0) {
    $('lockMsg').textContent = `Too many attempts. Try again in ${Math.ceil(wait / 1000)} s.`;
    $('lockMsg').classList.add('bad');
    $('lockMsg').dataset.lockout = '1';
  } else if ($('lockMsg').dataset.lockout) {        // the lockout just ended
    $('lockMsg').textContent = '';
    $('lockMsg').classList.remove('bad');
    delete $('lockMsg').dataset.lockout;
  }
}

function goLock(message, bad) {
  cancelEntry();
  if (typeof disarmReset === 'function') disarmReset();
  sessionPin = null;
  hidePin();
  show('lock');
  $('lockMsg').textContent = message || '';
  $('lockMsg').classList.toggle('bad', !!bad);
  delete $('lockMsg').dataset.lockout;
  tick();
}

setInterval(() => { if (!$('lock').hidden) tick(); }, 1000);

// ---- "Forgot PIN? Reset app" ----
// Like a phone's factory reset: it erases the PIN hash, the view-PIN copy and its key, and the
// settings, then starts setup again. It never reveals the old PIN. Two taps within 5 s, so a stray
// tap cannot wipe it (no browser confirm() dialog: those can freeze an installed web app).
let resetArmed = false, resetTimer = null;
const RESET_LABEL = 'Forgot PIN? Reset app';

function disarmReset() {
  resetArmed = false;
  clearTimeout(resetTimer);
  $('resetBtn').textContent = RESET_LABEL;
  $('resetBtn').classList.remove('danger');
}

$('resetBtn').onclick = async () => {
  if (!resetArmed) {
    resetArmed = true;
    $('resetBtn').textContent = 'Tap again to erase the PIN and start over';
    $('resetBtn').classList.add('danger');
    resetTimer = setTimeout(disarmReset, 5000);
    return;
  }
  disarmReset();
  cancelEntry();
  sessionPin = null;
  hidePin();
  memoryState = null;
  try { localStorage.removeItem(STORE); } catch (e) {}
  try { await deleteRevealKey(); } catch (e) {}
  applyLayout(DEFAULT_LAYOUT);
  $('layoutSel').value = DEFAULT_LAYOUT;
  startSetup(false);
  $('setupMsg').textContent = 'App reset. Do the earphone check, then choose a new PIN.';
};
