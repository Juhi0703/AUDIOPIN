/* Research prototype: connects the shared audio engine to this page. */

let noise = null;   // fallback buffer for plain direction cues

// Every button that plays audio awaits this first (browsers need a tap before sound).
async function initAudio() {
  await startAudioContext();
  const missing = await loadVoices(VOICE_NAMES);   // load all five, so changing layout never waits
  noise = voices[cueVoice] || voices[VOICE_NAMES[0]];
  warn(missing.length
    ? `Could not load ${missing.map(n => `${n} (${SOUND_DIR}${VOICE_FILES[n]})`).join(', ')} — a built-in sound is standing in. ` +
      'Serve the page over http (file:// blocks loading) and check the names in js/common/config.js.'
    : '');
}

// A plain direction cue (steps 1 and 3).
function play(dir) { playCueAt(voices[cueVoice] || noise, dirs()[dir]); }

// A key code: the key's sound from the key's direction (steps 1 and 5).
function playKey(key) { playCueAt(voices[keyVoice(key)], dirs()[keyDir(key)]); }
