/* Spatial audio engine shared by both pages.
   Pipeline for every recording:
     fetch -> decode -> fold to mono -> trim leading silence, keep SOUND_SEC, 5 ms fades
           -> equalise loudness (RMS + soft limiter) -> HRTF panner at the cue's angle -> earphones */

let ctx = null;              // the Web Audio context, created on the first tap
const voices = {};           // sound name -> prepared AudioBuffer
const voiceSource = {};      // sound name -> 'file' or 'built-in'

// Start downloading every sound as soon as the page loads, so a tap never waits on the network.
const pendingFiles = {};
for (const name of VOICE_NAMES) {
  if (VOICE_FILES[name]) {
    pendingFiles[name] = fetch(SOUND_DIR + VOICE_FILES[name]).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  }
}

// Browsers only allow sound after a user tap, so this must run inside a tap handler.
async function startAudioContext() {
  if (!ctx) {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iPhone: play with the silent switch on
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.createPanner().panningModel = 'HRTF';   // start loading the HRTF data now, not on the first cue
  }
  if (ctx.state !== 'running') await ctx.resume();
}

// Decodes and prepares each named sound once. Returns the names whose file could not be used;
// those get a synthetic stand-in so the chart rows still sound different.
async function loadVoices(names) {
  const missing = [];
  for (const name of names) {
    if (voices[name]) continue;
    let buffer = null;
    if (pendingFiles[name]) {
      const bytes = await pendingFiles[name];
      if (bytes) {
        try { buffer = prepare(toMono(await ctx.decodeAudioData(bytes))); } catch (e) { buffer = null; }
      }
      if (!buffer) missing.push(name);
    }
    voiceSource[name] = buffer ? 'file' : 'built-in';
    const standIn = BUILT_IN[VOICE_NAMES.indexOf(name) % BUILT_IN.length];  // same stand-in for a sound in every layout
    voices[name] = normalise(buffer || buildVoice(standIn), VOICE_GAIN[name]);
  }
  return missing;
}

// Cut the silence at the front, keep at most SOUND_SEC, and fade both edges so it cannot click.
function prepare(buffer) {
  const sr = buffer.sampleRate, d = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (!peak) return null;
  const floor = peak * 0.02;
  let start = 0;
  while (start < d.length && Math.abs(d[start]) < floor) start++;
  const length = Math.min(Math.round(sr * SOUND_SEC), d.length - start);
  if (length < Math.round(sr * 0.02)) return null;    // under 20 ms of sound: treat it as a bad file
  const out = ctx.createBuffer(1, length, sr);
  const o = out.getChannelData(0);
  const fade = Math.round(sr * 0.005);
  for (let i = 0; i < length; i++) {
    const gain = i < fade ? i / fade : (i > length - fade ? (length - i) / fade : 1);
    o[i] = d[start + i] * gain;
  }
  return out;
}

// The HRTF panner wants one channel, so a stereo recording is folded down first.
function toMono(buffer) {
  if (buffer.numberOfChannels === 1) return buffer;
  const mono = ctx.createBuffer(1, buffer.length, buffer.sampleRate);
  const out = mono.getChannelData(0);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}

// Equal loudness for every sound, so volume is never a clue.
// The soft limiter matters: dividing by the peak instead would make short sounds much quieter than long ones.
function normalise(buffer, tweak) {
  const d = buffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
  const gain = 0.25 * (tweak || 1) / (Math.sqrt(sum / d.length) || 1);
  for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * gain);
  return buffer;
}

// Synthetic 0.3 s stand-in sounds, used only when a file is missing.
// Every one starts with a 4 ms broadband click: a sharp onset is the strongest cue the ear has for direction.
function buildVoice(name) {
  const sr = ctx.sampleRate, n = Math.round(sr * 0.3);
  const buffer = ctx.createBuffer(1, n, sr);
  const d = buffer.getChannelData(0);
  if (name === 'bell') {                              // inharmonic partials, metallic and ringing
    const f0 = 520, ratios = [1, 2.76, 5.4, 8.93, 13.34], amps = [1, 0.6, 0.4, 0.25, 0.15];
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (let k = 0; k < ratios.length; k++) {
        v += amps[k] * Math.sin(2 * Math.PI * f0 * ratios[k] * t) * Math.exp(-t * (3 + k * 2.5));
      }
      d[i] = v * 0.3;
    }
  } else if (name === 'knock') {                      // short wooden rap, gone in about 60 ms
    // Needs real treble: the loudness difference between the ears only exists above ~1.5 kHz.
    let previous = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, x = Math.random() * 2 - 1;
      const bright = x - 0.9 * previous;              // cheap high-pass, so the rap keeps its treble
      previous = x;
      d[i] = bright * Math.exp(-t * 45) * 1.2
           + Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t * 60) * 0.5
           + Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t * 80) * 0.4;
    }
  } else if (name === 'drip') {                       // water drop: a quick upward blip
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const f = 500 + 900 * Math.min(t / 0.06, 1);
      d[i] = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * 2.4 * f * t)) * Math.exp(-t * 28);
    }
  } else if (name === 'buzz') {                       // low rasp
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (let k = 1; k <= 9; k += 2) v += Math.sin(2 * Math.PI * 150 * k * t) / k;
      d[i] = v * (0.6 + 0.4 * Math.sin(2 * Math.PI * 35 * t)) * Math.exp(-t * 6);
    }
  } else {                                            // 'hiss': plain broadband noise
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const click = Math.round(sr * 0.004);
  for (let i = 0; i < click; i++) d[i] += (Math.random() * 2 - 1) * (1 - i / click) * 0.8;
  return buffer;
}

// Plays one sound so it seems to come from `angle` degrees (0 = ahead, -90 = left, 90 = right, 180 = behind).
// Chain: sound -> volume envelope -> HRTF panner -> earphones.
function playCueAt(buffer, angle, when = ctx.currentTime) {
  const a = angle * Math.PI / 180;
  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';                       // filters each ear the way a real head would
  const x = Math.sin(a), z = -Math.cos(a);           // listener at (0,0,0) facing -z; +x is to the right
  if (panner.positionX) {
    panner.positionX.value = x; panner.positionY.value = 0; panner.positionZ.value = z;
  } else {
    panner.setPosition(x, 0, z);                      // older Safari
  }
  panner.connect(ctx.destination);

  const length = Math.min(buffer.duration, SOUND_SEC);
  const envelope = ctx.createGain();                  // 10 ms fades so the sound doesn't click
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(0.6, when + 0.01);
  envelope.gain.setValueAtTime(0.6, when + Math.max(0.02, length - 0.02));
  envelope.gain.linearRampToValueAtTime(0, when + length);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(envelope);
  envelope.connect(panner);
  source.start(when);
  source.stop(when + length + 0.02);
}

// Delay between starting a sound and it reaching the ears. Large with Bluetooth; not every browser reports it.
function outputDelayMs() {
  return ctx ? ((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000 : 0;
}
