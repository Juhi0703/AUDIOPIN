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
function buildChart(id, columns, rows) {
  const cells = [cell('h', '')];
  for (const c of columns) cells.push(cell('h', c));
  rows.forEach((name, row) => {
    cells.push(cell('h', name));
    columns.forEach((c, col) => {
      const value = row * columns.length + col;
      cells.push(value < KEYS ? cell('v', String(value)) : cell('v off', '–'));
    });
  });
  $(id).style.gridTemplateColumns = `auto repeat(${columns.length}, minmax(0, 1fr))`;
  $(id).replaceChildren(...cells);
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
