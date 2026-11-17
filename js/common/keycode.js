/* The key-code method, shared by both pages.
   For each PIN digit a fresh uniform key 0..9 is played as (sound, direction):
     key = sound row x number of directions + direction column
   The user taps (digit + key) mod 10 on a ring of numbers. Because the key is uniform and
   fresh for every digit, every tap is equally likely: watching the screen reveals nothing. */

// How many sounds a layout with `directionCount` positions needs: 10 / directions, rounded up.
const soundsNeeded = directionCount => Math.ceil(KEYS / directionCount);
const voicesFor    = directionCount => VOICE_NAMES.slice(0, soundsNeeded(directionCount));

// Which column (direction) and row (sound) carry a key.
const keyColumn = (key, directionCount) => key % directionCount;
const keyRow    = (key, directionCount) => Math.floor(key / directionCount);

// The answer the user should tap, and the digit recovered from a tap.
const encodeDigit = (digit, key) => (digit + key) % 10;
const decodeTap   = (tap, key) => (tap - key + 10) % 10;

// The public chart: rows are sounds, columns are directions, cells are the numbers 0-9.
// It never shows which code is playing -- that is the whole secret.
// onCellTap (optional) makes each number playable, for LEARNING screens only. Never pass it for a chart
// shown while a PIN is entered: tapping a cell there would show an onlooker which key was heard.
function buildChart(id, columns, rows, onCellTap) {
  const cells = [cell('h', '')];
  for (const c of columns) cells.push(cell('h', c));
  rows.forEach((name, row) => {
    cells.push(cell('h', name));
    columns.forEach((c, col) => {
      const value = row * columns.length + col;
      if (value >= KEYS) { cells.push(cell('v off', '–')); return; }
      const v = cell('v', String(value));
      v.dataset.key = value;
      if (onCellTap) {
        v.classList.add('tap');
        v.setAttribute('role', 'button');
        v.tabIndex = 0;
        v.setAttribute('aria-label', `Play ${value}: ${name} from ${c}`);
        v.onclick = () => onCellTap(value);
        v.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellTap(value); } };
      }
      cells.push(v);
    });
  });
  $(id).style.gridTemplateColumns = `auto repeat(${columns.length}, minmax(0, 1fr))`;
  $(id).replaceChildren(...cells);
}

// Light up one number of a chart while its sound plays.
function flashCell(id, key, ms) {
  const c = $(id).querySelector(`[data-key="${key}"]`);
  if (!c) return;
  c.classList.add('playing');
  setTimeout(() => c.classList.remove('playing'), ms);
}

// Demo: plays every code 0-9 in order, lighting its cell and naming it via label(key).
// Stops early (returns false) as soon as isCancelled() is true, e.g. the screen or layout changed.
async function playAllKeys(id, playOne, label, isCancelled) {
  const gap = Math.round(SOUND_SEC * 1000) + 500;
  for (let key = 0; key < KEYS; key++) {
    if (isCancelled()) return false;
    playOne(key);
    flashCell(id, key, gap - 150);
    label(key);
    await sleep(gap);
  }
  return !isCancelled();
}

// The ring of digits 0-9, clockwise from the top. onTap(d) is called with the tapped digit.
function buildRing(id, onTap) {
  $(id).replaceChildren(...Array.from({ length: 10 }, (_, d) => {
    const b = document.createElement('button');
    b.textContent = d;
    const a = (-90 + d * 36) * Math.PI / 180;
    b.style.left = (50 + 38 * Math.cos(a)).toFixed(2) + '%';
    b.style.top  = (50 + 38 * Math.sin(a)).toFixed(2) + '%';
    b.onclick = () => onTap(d);
    return b;
  }));
}
