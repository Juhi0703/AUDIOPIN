/* Research prototype: start-up. Loaded last, after every other script. */

loadLog();
$('numPin').value = String(randInt(10000)).padStart(4, '0');

$('cueSel').replaceChildren(...VOICE_NAMES.map(name => {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  return option;
}));
$('cueSel').value = cueVoice;
$('cueSel').onchange = event => {
  cueVoice = event.target.value;
  say(`Direction cues now use the ${cueVoice}. Every answer records which sound it used in the CSV.`);
};

buildRing('ring', d => { if (keyAnswer) keyAnswer(d); });
setLayout('cardinal');
showStep('calib');
renderLog();
