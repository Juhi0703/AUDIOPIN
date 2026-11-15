/* AudioPIN Lock: start-up. Loaded last, after every other script. */

const saved = loadState();
const startLayout = saved && LAYOUTS[saved.layout] ? saved.layout : DEFAULT_LAYOUT;
applyLayout(startLayout);
$('layoutSel').value = startLayout;
buildRing('ring', d => { if (keyAnswer) keyAnswer(d); });
if (saved) goLock(''); else startSetup(false);

// Offline support once installed (see sw.js).
if ('serviceWorker' in navigator) {
  try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}
