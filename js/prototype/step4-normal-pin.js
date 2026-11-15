/* Step 4: an ordinary PIN keypad — the baseline condition. */

let numEntry = '', numStart = 0, numDone = true;

$('goBase').onclick = () => {
  if (!/^\d{4}$/.test($('numPin').value)) { showStep('enroll'); return say('Type a 4-digit number PIN in step 2 first.'); }
  showStep('base');
  numEntry = ''; numDone = false; numStart = performance.now();
  drawDots('numDots', 0);
  say('Type the number PIN.');
};

function pressKey(key) {
  if (numDone) return;
  numEntry = key === '⌫' ? numEntry.slice(0, -1) : numEntry + key;
  drawDots('numDots', numEntry.length);
  if (numEntry.length < PIN_LEN) return;
  numDone = true;
  const ms = performance.now() - numStart, target = $('numPin').value, ok = numEntry === target;
  addLog({ mode: 'normal-total', trial: ++trialNo, target, chosen: numEntry, correct: ok, ms });
  say(`${ok ? 'Access granted' : 'Wrong PIN'} in ${(ms / 1000).toFixed(1)} s. Press step 4 to try again.`);
}

buildKeypad('keypad', pressKey);
