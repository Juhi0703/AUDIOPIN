/* AudioPIN Lock: connects the shared audio engine to this page. */

const missingFiles = [];

// Every button that plays audio awaits this first. Only the sounds the current layout needs are decoded.
async function initAudio() {
  await startAudioContext();
  for (const name of await loadVoices(usedVoices())) missingFiles.push(SOUND_DIR + VOICE_FILES[name]);
  if (missingFiles.length) {
    $('warn').textContent = `Couldn't load ${missingFiles.join(', ')}. Built-in stand-ins are playing instead — check the assets/sounds folder.`;
    $('warn').hidden = false;
  }
}

function playKey(key) { playCueAt(voices[keyVoice(key)], keyDir(key)[1]); }
