/* AudioPIN Lock: first run — earphone check (3 correct sides in a row), then choose and confirm a PIN. */

let checkSide = null, streak = 0, firstPin = null, typed = '';

function startSetup(skipCheck) {
  show('setup');
  $('checkPanel').hidden = !!skipCheck;
  $('pinPanel').hidden = !skipCheck;
  streak = 0; firstPin = null; typed = '';
  $('checkStreak').textContent = '0 / 3';
  $('pinTitle').textContent = (skipCheck ? '' : '2 · ') + 'Choose a 4-digit PIN';
  $('setupCancel').hidden = !(skipCheck && loadState());
  drawDots('pinDots', 0);
  $('setupMsg').textContent = '';
}
$('setupCancel').onclick = () => show('home');

// ---- earphone check: catches phone-speaker playback, one bud, or Mono Audio ----
$('checkPlay').onclick = async () => {
  await initAudio();
  checkSide = randInt(2) ? 'right' : 'left';
  playCueAt(voices[usedVoices()[0]], checkSide === 'left' ? -90 : 90);
  $('setupMsg').textContent = 'Which side was that?';
};

function answerCheck(side) {
  if (!checkSide) return;
  if (side === checkSide) {
    streak++;
    $('setupMsg').textContent = streak >= 3 ? 'Earphones are working.' : 'Right. Play another.';
  } else {
    streak = 0;
    $('setupMsg').textContent = 'Not quite. Check both buds are in and Mono Audio is off, then try again.';
  }
  checkSide = null;
  $('checkStreak').textContent = `${Math.min(streak, 3)} / 3`;
  if (streak >= 3) { $('checkPanel').hidden = true; $('pinPanel').hidden = false; }
}
$('checkLeft').onclick = () => answerCheck('left');
$('checkRight').onclick = () => answerCheck('right');

// ---- choose the PIN, type it twice, store only its hash ----
async function setupKey(k) {
  typed = k === '⌫' ? typed.slice(0, -1) : (typed + k).slice(0, PIN_LEN);
  drawDots('pinDots', typed.length);
  if (typed.length < PIN_LEN) return;
  const pin = typed;
  typed = '';
  await sleep(150);
  drawDots('pinDots', 0);
  if (!firstPin) {
    if (tooEasy(pin)) { $('setupMsg').textContent = 'Too easy to guess. Pick another.'; return; }
    firstPin = pin;
    $('pinTitle').textContent = 'Type it again';
    $('setupMsg').textContent = '';
    return;
  }
  if (pin !== firstPin) {
    firstPin = null;
    $('pinTitle').textContent = 'Choose a 4-digit PIN';
    $('setupMsg').textContent = "Those didn't match. Start again.";
    return;
  }
  $('setupMsg').textContent = 'Saving…';
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const previous = loadState() || {};
  saveState({ salt: b64(salt), verifier: b64(await hashPin(pin, salt)), fails: 0, lockedUntil: 0,
              layout: previous.layout || DEFAULT_LAYOUT });                // a new PIN keeps the chosen layout
  firstPin = null;
  goLock('PIN saved. Lock is on.');
}

buildKeypad('setupPad', setupKey);
