/* AudioPIN Lock: unlocking with key codes.
   For each digit a fresh key plays; the tap is (digit + key) mod 10. The entered PIN is recovered
   as (tap - key) mod 10 and checked only as a whole against the stored hash. */

let session = 0, pendingTap = null, keyAnswer = null, repeatTimer = null, unlockStart = 0;

function cancelEntry() {
  session++;
  keyAnswer = null;
  clearTimeout(repeatTimer); repeatTimer = null;
  $('replayBtn').onclick = null;
  if (pendingTap) { const finish = pendingTap; pendingTap = null; finish(null); }
}

// One digit: play its key sound, repeat it until a tap, resolve with
// {chosen, ms, repeats, replays} (null if cancelled). ms runs from the first play to the tap.
function askKey(key, run) {
  return new Promise(resolve => {
    pendingTap = resolve;
    const soundMs = Math.min(SOUND_SEC, voices[keyVoice(key)].duration) * 1000;
    let repeats = 0, replays = 0, start = 0;
    const again = () => {
      clearTimeout(repeatTimer);
      repeatTimer = setTimeout(() => {
        if (run !== session || !keyAnswer) return;
        repeats++;
        playKey(key);
        again();
      }, soundMs + REPEAT_MS);
    };
    setTimeout(() => {
      if (run !== session) return;
      playKey(key);
      start = performance.now();
      $('replayBtn').onclick = () => { replays++; playKey(key); again(); };
      keyAnswer = chosen => {
        keyAnswer = null;
        clearTimeout(repeatTimer); repeatTimer = null;
        $('replayBtn').onclick = null;
        pendingTap = null;
        buzz(25);
        resolve({ chosen, ms: performance.now() - start, repeats, replays });
      };
      again();
    }, KEY_LEAD_MS);
  });
}

$('unlockBtn').onclick = async () => {
  const state = loadState();
  if (!state) return startSetup(false);
  if (state.lockedUntil > Date.now()) return tick();
  await initAudio();
  unlockStart = performance.now();
  show('entry');
  const run = ++session, taps = [], keys = [], steps = [];
  drawDots('entryDots', 0);
  $('entryMsg').textContent = 'Listen, read the number, count from your digit, tap.';
  for (let i = 0; i < PIN_LEN; i++) {
    const key = randInt(KEYS);
    const answer = await askKey(key, run);
    if (answer === null || run !== session) return;    // cancelled or auto-locked
    keys.push(key); taps.push(answer.chosen);
    steps.push({ ms: answer.ms, repeats: answer.repeats, replays: answer.replays });   // timing only (usage-log.js)
    drawDots('entryDots', i + 1);
  }
  // Judged only as a whole, so a wrong answer never reveals which digit was wrong.
  const guess = taps.map((t, i) => decodeTap(t, keys[i])).join('');
  $('entryMsg').textContent = 'Checking…';
  const ok = sameBytes(await hashPin(guess, unb64(state.salt)), unb64(state.verifier));
  if (run !== session) return;
  logUnlock(ok, performance.now() - unlockStart, steps);   // result + timings only, never keys or taps
  const fresh = loadState();
  if (ok) {
    fresh.fails = 0;
    saveState(fresh);
    session++;
    sessionPin = guess;                                // memory only, wiped on lock (see pin-reveal.js)
    goHome();
    $('homeInfo').textContent = `Unlocked in ${((performance.now() - unlockStart) / 1000).toFixed(1)} s. Nothing on the screen showed your PIN.`;
    return;
  }
  fresh.fails = (fresh.fails || 0) + 1;
  buzz([80, 60, 80]);
  if (fresh.fails >= MAX_TRIES) {
    fresh.fails = 0;
    fresh.lockedUntil = Date.now() + LOCKOUT_MS;     // survives a reload
    saveState(fresh);
    goLock('', true);
  } else {
    saveState(fresh);
    const left = MAX_TRIES - fresh.fails;
    goLock(`Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.`, true);
  }
  $('lock').classList.remove('shake'); void $('lock').offsetWidth; $('lock').classList.add('shake');
};

$('cancelBtn').onclick = () => goLock('');
