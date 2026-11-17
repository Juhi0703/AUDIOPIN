/* AudioPIN Lock: "Listen to the sounds" -- a playable chart on the setup screen (so a new user learns the
   sounds before the first unlock) and on the unlocked screen. Deliberately absent from PIN entry:
   tapping a cell there would show an onlooker which key was heard. */

let demoRun = 0;

const keyLabel = key => `${key} = ${keyVoice(key)} from the ${keyDir(key)[0]}`;

function demoTap(chartId, noteId) {
  return async key => {
    await initAudio();
    demoRun++;                                        // a tap stops a running play-all
    playKey(key);
    flashCell(chartId, key, Math.round(SOUND_SEC * 1000));
    $(noteId).textContent = keyLabel(key);
  };
}

// Called by applyLayout(): the demo charts always match the current directions.
function buildDemoCharts() {
  demoRun++;
  const columns = DIRECTIONS.map(d => d[0]);
  buildChart('setupChart', columns, usedVoices(), demoTap('setupChart', 'setupDemoNote'));
  buildChart('homeChart', columns, usedVoices(), demoTap('homeChart', 'homeDemoNote'));
  $('setupDemoNote').textContent = '';
  $('homeDemoNote').textContent = '';
}

function wirePlayAll(buttonId, chartId, noteId, screenId) {
  $(buttonId).onclick = async () => {
    await initAudio();
    const run = ++demoRun;
    const done = await playAllKeys(chartId, playKey, key => { $(noteId).textContent = keyLabel(key); },
                                   () => run !== demoRun || $(screenId).hidden);
    if (done) $(noteId).textContent = 'That was every sound in the chart.';
  };
}
wirePlayAll('setupPlayAll', 'setupChart', 'setupDemoNote', 'setup');
wirePlayAll('homePlayAll', 'homeChart', 'homeDemoNote', 'home');
