/* Step 1: test that directions can be heard, then practise reading key codes off the chart. */

$('goCalib').onclick = () => { showStep('calib'); say('Play the labelled demo, then test yourself with random ones.'); };

$('demo').onclick = async () => {
  await initAudio();
  for (const d of dirNames()) {
    if ($('calibPanel').hidden) break;
    drawHead(d);
    say('Playing: ' + d);
    play(d);
    await sleep(Math.round(SOUND_SEC * 1000) + 400);
  }
  drawHead(null);
  if (!$('calibPanel').hidden) say('Now press "Play a random one" and choose where it came from.');
};

$('quizPlay').onclick = async () => {
  await initAudio();
  quizTarget = dirNames()[randInt(dirNames().length)];
  play(quizTarget);
  say('Where did that come from?');
};

function answerQuiz(d) {
  if (!quizTarget) return say('Press "Play a random one" first.');
  const ok = d === quizTarget;
  addLog({ mode: 'test', code: cueVoice, target: quizTarget, chosen: d, correct: ok });
  say(ok ? `Correct: ${d}.` : `Not quite: it was ${quizTarget}, you chose ${d}.`);
  quizTarget = null;
}

$('keyPractice').onclick = async () => {
  await initAudio();
  practiceKey = randInt(KEYS);
  playKey(practiceKey);
  say('Which number was that? Read it off the chart.');
};

function answerPractice(n) {
  if (practiceKey === null) return say('Press "Play a key code" first.');
  const ok = n === practiceKey;
  addLog({ mode: 'key-test', key: practiceKey, code: codeName(practiceKey), target: practiceKey, chosen: n, correct: ok });
  say(ok ? `Correct: ${practiceKey} (${codeName(practiceKey)}).`
         : `It was ${practiceKey} (${codeName(practiceKey)}), you said ${n}.`);
  practiceKey = null;
}

$('practiceNums').replaceChildren(...Array.from({ length: KEYS }, (_, n) => {
  const b = document.createElement('button');
  b.textContent = n;
  b.onclick = () => answerPractice(n);
  return b;
}));
