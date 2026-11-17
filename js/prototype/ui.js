/* Research prototype: status line, step navigation, layout switching and the head diagram. */

const say  = text => { $('status').textContent = text; };
const warn = text => { $('warn').textContent = text; $('warn').hidden = !text; };

const STEPS = { calib: 'goCalib', enroll: 'goEnroll', login: 'goLogin', base: 'goBase', key: 'goKey' };

function showStep(name) {
  stopLogin();
  for (const step in STEPS) {
    $(step + 'Panel').hidden = step !== name;
    $(STEPS[step]).setAttribute('aria-pressed', String(step === name));
  }
  // Put the working panel at the top of the screen, so nobody scrolls during a timed entry.
  if (name !== 'calib') $(name + 'Panel').scrollIntoView({ block: 'start' });
}

// Stops any login that is running (step 3 or step 5) and releases its waiting promise.
function stopLogin() {
  loginRun++;
  clearInterval(cueTimer); cueTimer = null;
  $('tap').onpointerdown = null;
  keyAnswer = null;
  clearTimeout(repeatTimer); repeatTimer = null;
  $('keyReplay').onclick = null;
  if (pendingTap) { const finish = pendingTap; pendingTap = null; finish(null); }
}

function setLayout(name) {
  const needed = soundsNeeded(Object.keys(LAYOUTS[name]).length);
  if (VOICE_NAMES.length < needed) {                 // fewer directions always means more sounds
    warn(`The "${name}" layout needs ${needed} sounds and VOICE_NAMES lists ${VOICE_NAMES.length}. Add ${needed - VOICE_NAMES.length} more before using it.`);
    $('layout').value = layout;
    return;
  }
  layout = name;
  $('layout').value = name;
  pin = []; showPin();
  quizTarget = null; practiceKey = null;
  for (const [boxId, pick] of [['quizBtns', answerQuiz], ['enrollBtns', addToPin]]) {
    $(boxId).replaceChildren(...dirNames().map(d => {
      const b = document.createElement('button');
      b.textContent = d;
      b.onclick = () => pick(d);
      return b;
    }));
  }
  drawHead(null);
  demoRun++;                                         // stop a running "Play every sound"
  buildChart('chartA', dirNames(), usedVoices(), demoKey);   // step 1: playable, for learning
  // chartB is the step-5 login chart: deliberately NOT playable.
  buildChart('chartB', dirNames(), usedVoices());
}

$('layout').onchange = e => {
  stopLogin();
  setLayout(e.target.value);
  say('Directions changed, so the direction PIN was cleared and the key chart was rebuilt.');
};

// Top view of the head with the sound positions. Lights up only in step 1, never while logging in.
function drawHead(active) {
  const cx = 140, cy = 105, r = 68;
  let svg = `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/>` +
            `<path class="skull" d="M${cx - 8} ${cy - 22} L${cx} ${cy - 36} L${cx + 8} ${cy - 22} Z"/>` +
            `<circle class="skull" cx="${cx}" cy="${cy}" r="24"/>`;
  for (const d of dirNames()) {
    const a = dirs()[d] * Math.PI / 180;
    const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
    const lx = cx + (r + 16) * Math.sin(a), ly = cy - (r + 16) * Math.cos(a);
    const anchor = Math.sin(a) < -0.3 ? 'end' : Math.sin(a) > 0.3 ? 'start' : 'middle';
    svg += `<circle class="spot${d === active ? ' on' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9"/>` +
           `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" dy="0.35em" text-anchor="${anchor}">${d}</text>`;
  }
  $('head').innerHTML = svg;
}
