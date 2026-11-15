/* Shared settings for both pages (index.html and lock.html).
   Loaded first: every other script reads these constants. */

// ---- sounds ----
// The sound is one half of a key code: one sound per row of the public chart.
// Only as many rows as a layout needs are used (10 / directions, rounded up), so the
// ORDER matters: 4 directions use the first 3, 3 directions the first 4, 2 directions all 5.
// The first three sit in three different envelope families (continuous, one hit, two hits).
const SOUND_DIR   = 'assets/sounds/';
const VOICE_NAMES = ['rain', 'knock', 'chirp', 'cowbell', 'cat'];   // chart rows, top to bottom
const VOICE_FILES = {                                              // all from Mixkit, free licence (see README)
  rain:    'rain.wav',     // "Rain on umbrella" (#1263), first 2 s kept   continuous, smooth
  knock:   'knock.wav',    // "Wood hard hit" (#2182)                      one impulse
  chirp:   'chirp.wav',    // "Forest birds singing" (#1212)               short pulses
  cowbell: 'cowbell.wav',  // "Cowbell sharp hit" (#1743)                  metallic ring
  cat:     'cat.wav'       // "Cartoon little cat meow" (#91)              voice-like swell
};
const VOICE_GAIN = { rain: 1, knock: 1, chirp: 1, cowbell: 1, cat: 1 };  // fine-tune loudness by ear
const BUILT_IN   = ['hiss', 'knock', 'drip', 'bell', 'buzz'];          // synthetic stand-ins if a file fails to load

// ---- key codes ----
const KEYS      = 10;    // key = sound row x number of directions + direction column, so codes 0..9
const PIN_LEN   = 4;     // digits in a PIN
const SOUND_SEC = 1.0;   // how much of each recording plays
const REPEAT_MS = 2000;  // no answer yet? the same sound plays again this long after it ends
