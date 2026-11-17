/* AudioPIN Lock: usage log for studies, exported as CSV (same columns as the research prototype).

   Records per unlock attempt: time, tester ID, layout, result (correct / wrong), total time, and per
   digit the response time, automatic repeats and manual replays.
   NEVER records the PIN, the keys, the taps or whether a digit wrapped: digit = tap - key, so keys and
   taps together would put the PIN in the file, and "wrapped" hints at the digit's size. The app cannot
   leak them by accident either: it never knows the PIN, only its hash.
   Per-digit times are what a stopwatch-holding observer could measure anyway.

   The log survives "Forgot PIN? Reset app" (it holds no secret, and study data should not vanish). */

const LOCK_LOG_STORE = 'audiopin-lock-log';
const LOCK_ID_STORE = 'audiopin-lock-tester';
let lockLog = [];
let lockClearArmed = false;

function loadLockLog() {
  try { lockLog = JSON.parse(localStorage.getItem(LOCK_LOG_STORE)) || []; } catch (e) { lockLog = []; }
  try { $('testerId').value = localStorage.getItem(LOCK_ID_STORE) || ''; } catch (e) {}
  renderLockLog();
}

function saveLockLog() {
  try { localStorage.setItem(LOCK_LOG_STORE, JSON.stringify(lockLog)); } catch (e) {}
}

function renderLockLog() {
  const unlocks = lockLog.filter(r => r.mode === 'lock-total').length;
  $('lockLogCount').textContent = `${unlocks} unlock attempt${unlocks === 1 ? '' : 's'} logged`;
}

// Called by unlock.js after every complete attempt. steps = [{ms, repeats, replays}] per digit.
function logUnlock(correct, totalMs, steps) {
  const base = {
    participant: $('testerId').value.trim(),
    layout: (loadState() || {}).layout || DEFAULT_LAYOUT,
    trial: lockLog.reduce((max, r) => Math.max(max, Number(r.trial) || 0), 0) + 1,
    delay_ms: Math.round(outputDelayMs())
  };
  const time = new Date().toISOString();
  steps.forEach((s, i) => lockLog.push({ ...base, time, mode: 'lock-step', step: i + 1,
                                          ms: Math.round(s.ms), repeats: s.repeats, replays: s.replays }));
  lockLog.push({ ...base, time, mode: 'lock-total', correct, ms: Math.round(totalMs),
                 repeats: steps.reduce((n, s) => n + s.repeats, 0), replays: steps.reduce((n, s) => n + s.replays, 0) });
  saveLockLog();
  renderLockLog();
}

const lockCsvFile = () => csvFileOf(lockLog, csvFileName('audiopin-lock', $('testerId').value));
const lockNote = text => { if (text) $('lockLogNote').textContent = text; };

$('testerId').onchange = () => { try { localStorage.setItem(LOCK_ID_STORE, $('testerId').value.trim()); } catch (e) {} };

$('lockShare').onclick = async () => {
  if (!lockLog.length) return lockNote('The log is empty — unlock a few times first.');
  lockNote(await shareOrDownload(lockCsvFile()));
};

$('lockDownload').onclick = () => {
  if (!lockLog.length) return lockNote('The log is empty — unlock a few times first.');
  downloadFile(lockCsvFile());
  lockNote(`Downloaded ${lockCsvFile().name}.`);
};

// Clearing needs two taps within 4 s.
$('lockClear').onclick = () => {
  if (!lockClearArmed) {
    lockClearArmed = true;
    $('lockClear').textContent = 'Tap again to delete the log';
    setTimeout(() => { lockClearArmed = false; $('lockClear').textContent = 'Clear log'; }, 4000);
    return;
  }
  lockClearArmed = false;
  $('lockClear').textContent = 'Clear log';
  lockLog = [];
  try { localStorage.removeItem(LOCK_LOG_STORE); } catch (e) {}
  renderLockLog();
  lockNote('Log cleared.');
};

loadLockLog();
