/* AudioPIN Lock: the unlocked screen — lock again, change PIN, choose the direction layout. */

$('lockBtn').onclick = () => goLock('');
$('changeBtn').onclick = () => startSetup(true);

// Every way into the unlocked screen goes through here, so the PIN card is always current.
function goHome() {
  show('home');
  refreshPinCard();
}

// The layout can only be changed while unlocked, and it is saved with the lock state.
function applyLayout(name) {
  DIRECTIONS = (LAYOUTS[name] || LAYOUTS[DEFAULT_LAYOUT]).dirs;
  buildChart('chart', DIRECTIONS.map(d => d[0]), usedVoices());
}

$('layoutSel').replaceChildren(...Object.entries(LAYOUTS).map(([value, l]) => {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = l.label;
  return option;
}));

$('layoutSel').onchange = async event => {
  const name = event.target.value, state = loadState();
  if (!state || $('home').hidden) return;
  state.layout = name;
  saveState(state);
  applyLayout(name);
  $('layoutNote').textContent = `Now: ${LAYOUTS[name].label.toLowerCase()}. Used from the next unlock; your PIN stays the same.`;
  await initAudio();                                  // load any extra sounds this layout needs, now rather than mid-unlock
};

// Leaving the app locks it, the way a phone does.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ($('home').hidden === false || $('entry').hidden === false)) goLock('');
});
