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
  show('lock');
  $('lockMsg').textContent = message || '';
  $('lockMsg').classList.toggle('bad', !!bad);
  delete $('lockMsg').dataset.lockout;
  tick();
}

setInterval(() => { if (!$('lock').hidden) tick(); }, 1000);
