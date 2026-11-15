/* Step 2: set the secrets — a direction PIN for step 3 and a number PIN for steps 4 and 5. */

$('goEnroll').onclick = () => { showStep('enroll'); say('Four directions for step 3, and a 4-digit number for steps 4 and 5.'); };

function showPin() { $('pinView').textContent = pin.length ? pin.join(' → ') : '—'; }

function addToPin(d) {
  if (pin.length === PIN_LEN) return say('The direction PIN already has four directions. Press Clear to change it.');
  pin.push(d);
  showPin();
  say(pin.length === PIN_LEN ? 'Direction PIN set. Go to step 3.' : `${PIN_LEN - pin.length} more to choose.`);
}

$('example').onclick = () => {
  setLayout('cardinal');
  pin = ['left', 'right', 'front', 'left'];
  showPin();
  say('Direction PIN set to left → right → front → left. Go to step 3.');
};

$('clear').onclick = () => { pin = []; showPin(); say('Choose four directions in order.'); };
