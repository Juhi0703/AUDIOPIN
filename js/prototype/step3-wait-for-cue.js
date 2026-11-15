/* Step 3: the original wait-for-your-cue login (comparison condition).
   Directions play in a fresh random order; the user taps when their direction plays.
   Someone watching sees WHEN the tap happens, never WHAT was playing. */

$('goLogin').onclick = async () => {
  await initAudio();
  if (pin.length !== PIN_LEN) { showStep('enroll'); return say('Set a four-direction PIN first.'); }
  showStep('login');                                   // also stops a login that is already running
  const run = loginRun, trial = ++trialNo, entered = [], t0 = performance.now();
  drawDots('audioDots', 0);
  for (let i = 0; i < PIN_LEN; i++) {
    say(`Position ${i + 1} of ${PIN_LEN}: tap when you hear your direction.`);
    await sleep(LEAD_MS);
    if (run !== loginRun) return;
    const answer = await waitForTap();
    if (!answer || run !== loginRun) return;
    entered.push(answer.chosen);
    drawDots('audioDots', i + 1);
    addLog({ mode: 'audio-step', trial, step: i + 1, code: cueVoice, target: pin[i], chosen: answer.chosen,
             correct: answer.chosen === pin[i], ms: answer.ms, cues: answer.cues });
  }
  const ok = entered.every((d, i) => d === pin[i]);
  const ms = performance.now() - t0;
  addLog({ mode: 'audio-total', trial, target: pin.join(' '), chosen: entered.join(' '), correct: ok, ms });
  say(`${ok ? 'Access granted' : 'Wrong PIN'} in ${(ms / 1000).toFixed(1)} s. Press step 3 to try again.`);
};

// Plays every direction in a fresh random order, again and again, until the user taps.
function waitForTap() {
  return new Promise(resolve => {
    pendingTap = resolve;
    const order = shuffle(dirNames());
    const played = [];                                  // every cue so far: { dir, at }
    const start = performance.now();
    const next = () => {
      const dir = order[played.length % order.length];
      played.push({ dir, at: performance.now() });
      play(dir);
    };
    next();
    cueTimer = setInterval(next, CUE_MS);
    $('tap').onpointerdown = event => {
      event.preventDefault();
      const now = performance.now();
      // A tap answers the last cue the user could have heard AND reacted to.
      const heard = played.filter(c => c.at + outputDelayMs() + REACT_MS <= now);
      if (!heard.length) return;                        // too early to be an answer: ignore it
      clearInterval(cueTimer); cueTimer = null;
      $('tap').onpointerdown = null;
      pendingTap = null;
      buzz(30);
      resolve({ chosen: heard[heard.length - 1].dir, ms: now - start, cues: played.length });
    };
  });
}
