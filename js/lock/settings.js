/* AudioPIN Lock: layouts, limits and screen switching. */

// Every layout the app offers. The number of sounds follows from it: 10 / positions, rounded up.
// Fewer positions are easier to hear but put more of the key on WHICH sound plays, the part a
// nearby microphone can pick up. Changed on the unlocked screen.
const LAYOUTS = {
  two:      { label: 'Left and right · 5 sounds',            dirs: [['left', -90], ['right', 90]] },
  three:    { label: 'Left, front, right · 4 sounds',        dirs: [['left', -90], ['front', 0], ['right', 90]] },
  side:     { label: 'Four side positions · 3 sounds',       dirs: [['far left', -90], ['left', -30], ['right', 30], ['far right', 90]] },
  cardinal: { label: 'Left, front, right, back · 3 sounds',  dirs: [['left', -90], ['front', 0], ['right', 90], ['back', 180]] },
  five:     { label: 'Five positions · 2 sounds',            dirs: [['far left', -90], ['left', -45], ['front', 0], ['right', 45], ['far right', 90]] }
};
const DEFAULT_LAYOUT = 'two';   // what a fresh install starts with
let DIRECTIONS = LAYOUTS[DEFAULT_LAYOUT].dirs;   // [name, angle] pairs of the active layout

const KEY_LEAD_MS = 300;     // pause before each digit's sound
const MAX_TRIES   = 3;       // wrong PINs allowed before a lockout
const LOCKOUT_MS  = 30000;   // how long the lockout lasts
const STORE       = 'audiopin-lock-v1';

const usedVoices = () => voicesFor(DIRECTIONS.length);
const keyDir     = key => DIRECTIONS[keyColumn(key, DIRECTIONS.length)];   // [name, angle]
const keyVoice   = key => usedVoices()[keyRow(key, DIRECTIONS.length)];

const SCREENS = ['setup', 'lock', 'entry', 'home'];
function show(name) { for (const s of SCREENS) $(s).hidden = s !== name; }
