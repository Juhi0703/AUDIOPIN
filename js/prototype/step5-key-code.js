/* Step 5: the proposed key-code login (no waiting for a cue).
   One coded sound per digit gives a one-time key 0-9; the user taps (digit + key) mod 10. */

$('goKey').onclick = async () => {
  await initAudio();
  const secret = $('numPin').value;
  if (!/^\d{4}$/.test(secret)) { showStep('enroll'); return say('Type a 4-digit number PIN in step 2 first.'); }
  showStep('key');
  const run = loginRun, trial = ++trialNo, entered = [], t0 = performance.now();
  drawDots('keyDots', 0);
  for (let i = 0; i < PIN_LEN; i++) {
    const digit = Number(secret[i]);
    const key = randInt(KEYS);
    say(`Digit ${i + 1} of ${PIN_LEN}: listen, then tap your answer.`);
    const answer = await askKey(key);
    if (!answer || run !== loginRun) return;
    const expected = encodeDigit(digit, key);
    entered.push(answer.chosen === expected);
    drawDots('keyDots', i + 1);
    addLog({ mode: 'key-step', trial, step: i + 1, key, code: codeName(key),
             target: expected, chosen: answer.chosen, correct: answer.chosen === expected,
             wrapped: digit + key >= 10, replays: answer.replays, repeats: answer.repeats, ms: answer.ms });
  }
  const ok = entered.every(Boolean);
  const ms = performance.now() - t0;
  addLog({ mode: 'key-total', trial, target: secret, chosen: ok ? secret : '(wrong)', correct: ok, ms });
  say(`${ok ? 'Access granted' : 'Wrong PIN'} in ${(ms / 1000).toFixed(1)} s. Press step 5 to try again.`);
};

// Plays one coded sound, then waits for a tap on the ring. Taps before the sound are ignored.
// Until an answer comes, the SAME sound plays again REPEAT_MS after each play ends; the key
// never changes mid-digit. Repeats (automatic) and replays (button) are logged separately.
function askKey(key) {
  return new Promise(resolve => {
    pendingTap = resolve;
    const run = loginRun;
    let replays = 0, repeats = 0;
    const soundMs = Math.min(SOUND_SEC, voices[keyVoice(key)].duration) * 1000;
    const scheduleRepeat = () => {                      // (re)start the countdown after every play
      clearTimeout(repeatTimer);
      repeatTimer = setTimeout(() => {
        if (run !== loginRun || !keyAnswer) return;
        repeats++;
        playKey(key);
        scheduleRepeat();
      }, soundMs + REPEAT_MS);
    };
    setTimeout(() => {
      if (run !== loginRun) return;                     // the step was cancelled while we waited
      playKey(key);
      const start = performance.now();
      $('keyReplay').onclick = () => { replays++; playKey(key); scheduleRepeat(); };
      keyAnswer = chosen => {
        keyAnswer = null;
        clearTimeout(repeatTimer); repeatTimer = null;
        $('keyReplay').onclick = null;
        pendingTap = null;
        buzz(30);
        resolve({ chosen, ms: performance.now() - start, replays, repeats });
      };
      scheduleRepeat();
    }, KEY_LEAD_MS);
  });
}
