/* Research prototype: layouts, timing and session state. */

// Angles in degrees, seen from above: 0 = straight ahead, 90 = right, -90 = left, 180 = behind.
const LAYOUTS = {
  cardinal: { left: -90, front: 0, right: 90, back: 180 },                            // 4 x 3 sounds, 2 spare boxes
  lateral:  { 'far-left': -90, 'near-left': -30, 'near-right': 30, 'far-right': 90 }, // if front/back get confused
  wide:     { 'far-left': -90, left: -45, front: 0, right: 45, 'far-right': 90 },     // 5 x 2 sounds, none spare
  trio:     { left: -90, front: 0, right: 90 },                                       // 3 x 4 sounds, 2 spare
  pair:     { left: -90, right: 90 }                                                  // 2 x 5 sounds, none spare
};

const CUE_VOICE   = VOICE_NAMES[0];  // steps 1 and 3 start with the rain: steady noise places best
// Step 3 plays cue after cue, so its spacing grows with the sound: silence between cues
// keeps one from smearing into the next (the CHI paper's floor was 0.6 s for 0.54 s sounds).
const CUE_MS      = Math.round(SOUND_SEC * 1000) + 800;
const LEAD_MS     = 700;   // step 3: pause before each position starts
const REACT_MS    = 200;   // nobody reacts faster than this, so a quicker tap answers the previous cue
const KEY_LEAD_MS = 250;   // step 5: pause before the coded sound plays

// ---- state ----
let layout = 'cardinal';
let pin = [];             // the direction PIN, e.g. ['left', 'right', 'front', 'left']
let quizTarget = null;    // direction just played in step 1
let practiceKey = null;   // key code just played in step 1
let loginRun = 0;         // goes up whenever a running login must stop
let cueTimer = null;      // interval that plays the cue cycle in step 3
let pendingTap = null;    // finishes the position that is waiting for an answer
let keyAnswer = null;     // set while step 5 waits for a tap on the ring
let repeatTimer = null;   // step 5: plays the same sound again while no answer has come
let cueVoice = CUE_VOICE; // which sound carries plain direction cues in steps 1 and 3
let trialNo = 0;

// ---- layout helpers ----
const dirs       = () => LAYOUTS[layout];
const dirNames   = () => Object.keys(dirs());
const usedVoices = () => voicesFor(dirNames().length);

// A key code 0..9 is one direction plus one sound.
const keyDir   = key => dirNames()[keyColumn(key, dirNames().length)];
const keyVoice = key => usedVoices()[keyRow(key, dirNames().length)];
const codeName = key => `${keyDir(key)} + ${keyVoice(key)}`;
