/* Small helpers used by both pages. */

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Unpredictable random integer 0..n-1. Math.random is not meant for security; this is.
const randInt = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;

// Fisher-Yates shuffle with the secure random source.
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Short vibration as tap feedback, where the device supports it.
const buzz = pattern => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} };

// PIN progress dots: ●●○○
const drawDots = (id, filled) => { $(id).textContent = '●'.repeat(filled) + '○'.repeat(PIN_LEN - filled); };

function cell(className, text) {
  const node = document.createElement('div');
  node.className = className;
  node.textContent = text;
  return node;
}

// A 3x4 phone keypad: 1-9, blank, 0, delete.
function buildKeypad(id, onKey) {
  $(id).replaceChildren(...['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(key => {
    const b = document.createElement('button');
    b.textContent = key;
    if (!key) b.style.visibility = 'hidden';
    else b.onclick = () => onKey(key);
    if (key === '⌫') b.setAttribute('aria-label', 'Delete');
    return b;
  }));
}
