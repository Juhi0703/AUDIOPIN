# AudioPIN — observation-resistant PIN entry with spatial audio

AudioPIN is a PIN-entry method for phones with earphones in which the secret never appears on screen.
For each PIN digit the earphones play one short **spatial sound**. *Which* sound it is and *which direction*
it comes from together encode a fresh random **key** 0–9 (read from a public chart that is always on screen).
The user taps **(digit + key) mod 10** on a ring of numbers. Because the key is uniform and new for every digit
of every login, every observed tap is equally likely, so a camera learns nothing about the PIN, however
many logins it records.

The repository contains two browser apps that share one audio engine:

| Page | What it is |
|---|---|
| `index.html` | **Research prototype** used in the study: direction test, key-code practice, and three login conditions (wait-for-cue, normal PIN baseline, key code) with a CSV results log. |
| `lock.html` | **AudioPIN Lock**, an installable demo app (PWA): earphone check, PIN setup (hash only), key-code unlock, lockout after 3 wrong PINs, works offline. |

No build step, no dependencies: plain HTML, CSS and JavaScript using the Web Audio API's HRTF panner.

---

## Running it

The pages load sound files with `fetch`, which browsers block on `file://`. **Serve the folder over HTTP.**

### Option 1 — on your computer
```bash
git clone https://github.com/Juhi0703/AUDIOPIN.git
cd AUDIOPIN
python3 -m http.server 8000
```
Open <http://localhost:8000/index.html> (prototype) or <http://localhost:8000/lock.html> (demo app).
Wear **stereo earphones**, left bud in the left ear. Mono Audio (accessibility setting) must be off.

### Option 2 — on a phone, via GitHub Pages
1. Repository → **Settings → Pages** → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
2. After a minute the apps are at `https://juhi0703.github.io/AUDIOPIN/index.html` and `.../lock.html`.
3. To install the lock app: Android Chrome → menu → *Install app*; iPhone Safari → Share → *Add to Home Screen*.
   On iPhone also turn the silent switch off.

### Running the automated test
`tests/smoke_test.py` drives both pages in a headless browser (starts its own local server) and checks
23 behaviours end to end: all sounds load, each login condition completes with correct taps, every layout
builds its chart, CSV export, PIN setup refuses common PINs and stores only a hash, lockout survives a
reload, the service worker caches every file, and there are no JavaScript errors or missing files.
```bash
pip install playwright
python -m playwright install chromium
python tests/smoke_test.py          # prints PASS/FAIL per check, then ALL PASS
```

### Running the attack simulation
`analysis/attack_simulation.py` computes how many PINs a Bayes-optimal observer breaks within 3 guesses,
for every layout, against three attackers: **video only** (sees taps), **+ sound** (a microphone identifies
which sound played) after watching 1, 2 or 3 logins, and **+ sound and side** (an off-centre microphone also
hears left/centre/right; front and back are indistinguishable). Takes about a minute.
```bash
pip install numpy matplotlib
python analysis/attack_simulation.py                                   # prints the table
python analysis/attack_simulation.py --csv analysis/results.csv --plot analysis/attack_results.png
python analysis/attack_simulation.py --sound-acc 0.8 --side-acc 0.6    # plug in measured identification rates
python tests/test_attack_simulation.py                                 # checks it against hand-computed cases
```
Result with perfect identification (20,000 simulated PINs per cell; saved in `analysis/results.csv`):

| Layout | Video only | + sound, 1 / 2 / 3 logins | + sound and side, 1 login |
|---|---|---|---|
| 5 directions × 2 sounds | 0.03% | 0.5 / 5.0 / 16.4% | 37.2% |
| 4 × 3, four side positions | 0.03% | 2.4 / 19.8 / 46.9% | 18.8% |
| 4 × 3, left/front/right/back | 0.03% | 2.4 / 19.8 / 46.9% | 79.8% |
| 3 directions × 4 sounds | 0.03% | 7.6 / 43.1 / 74.7% | 100% |
| 2 directions × 5 sounds | 0.03% | 18.8 / 70.2 / 91.4% | 100% |

0.03% is chance (3 guesses out of 10,000). Every sound added to the chart makes codes easier to hear and
easier to steal. `analysis/attack_results.png` plots the sound-only columns.

---

## Using the research prototype (`index.html`)

1. **Step 1 – Test directions.** *Play all, labelled*, then *Play a random one* and pick the direction.
   Below that, practise reading key codes off the chart.
2. **Step 2 – Set the secrets.** A 4-direction PIN (for step 3) and a 4-digit number PIN (for steps 4 and 5).
3. **Step 3 – Wait for your cue.** Directions play in random order; tap when yours plays (comparison method).
4. **Step 4 – Normal PIN.** Ordinary keypad (baseline).
5. **Step 5 – Key code (proposed method).** One sound per digit; read its number from the chart, count that
   many steps clockwise from your digit, tap where you land. The same sound repeats every 2 s until you tap.

Choose the **Directions** layout at the top. Results are kept in the browser and exported with
**Results log → Download CSV**. Columns:
`time, participant, layout, mode, trial, step, key, code, target, chosen, correct, wrapped, replays, repeats, ms, cues, delay_ms`.

### Layouts
The number of sounds needed is 10 ÷ directions, rounded up.

| Layout (menu) | Directions × sounds | Spare chart boxes |
|---|---|---|
| Left, front, right, back | 4 × 3 | 2 |
| Four side positions (±30°, ±90°) | 4 × 3 | 2 |
| Five positions (45° apart) | 5 × 2 | 0 |
| Three positions | 3 × 4 | 2 |
| Two positions (left/right) | 2 × 5 | 0 |

---

## Code structure

```
AUDIOPIN/
├── index.html               research prototype (markup only)
├── lock.html                AudioPIN Lock demo app (markup only)
├── manifest.webmanifest     PWA manifest for lock.html
├── sw.js                    service worker: offline cache for lock.html (must stay in the root)
├── css/
│   ├── prototype.css        styles for index.html (light/dark)
│   └── lock.css             styles for lock.html
├── js/
│   ├── common/              shared by both pages
│   │   ├── config.js        sound list, file names, loudness gains, key/PIN constants
│   │   ├── utils.js         DOM helpers, secure random (crypto.getRandomValues), shuffle, keypad
│   │   ├── audio-engine.js  load → mono → trim → loudness-equalise → HRTF spatial playback
│   │   └── keycode.js       key ↔ (sound, direction) mapping, encode/decode, public chart, digit ring
│   ├── prototype/           index.html only
│   │   ├── settings.js      layouts, timings, session state
│   │   ├── sound.js         audio set-up and play helpers for this page
│   │   ├── ui.js            status line, step navigation, layout switching, head diagram
│   │   ├── step1-calibration.js   direction test + key-code practice
│   │   ├── step2-enroll.js        set direction PIN and number PIN
│   │   ├── step3-wait-for-cue.js  wait-for-your-cue login
│   │   ├── step4-normal-pin.js    normal PIN baseline
│   │   ├── step5-key-code.js      proposed key-code login
│   │   ├── log.js           results log and CSV export
│   │   └── main.js          start-up
│   └── lock/                lock.html only
│       ├── settings.js      layouts, lockout limits, screen switching
│       ├── sound.js         audio set-up for this page
│       ├── pin-storage.js   salted PBKDF2 hash, constant-time compare, common-PIN filter
│       ├── setup.js         earphone check and PIN setup
│       ├── lock-screen.js   clock and lockout countdown
│       ├── unlock.js        key-code unlock and wrong-PIN handling
│       ├── home.js          unlocked screen, layout choice, auto-lock when hidden
│       └── main.js          start-up, service-worker registration
├── analysis/
│   ├── attack_simulation.py  shoulder-surfing / microphone attack simulation
│   ├── results.csv           its output table
│   └── attack_results.png    its figure (one IEEE column)
├── assets/
│   ├── sounds/              the five cue sounds (see below)
│   └── icons/               app icons
├── tests/
│   ├── smoke_test.py        end-to-end browser test of both apps
│   └── test_attack_simulation.py   checks the simulation against hand-computed cases
└── requirements.txt         Python packages for analysis/ and tests/ (the apps need none)
```

Scripts are plain (non-module) scripts loaded in order by each HTML page: `common/` first, page start-up
(`main.js`) last. This keeps the apps runnable from any static host with no bundler.

### Audio pipeline (`js/common/audio-engine.js`)
Every recording is decoded, folded to mono, its leading silence removed, cut to at most **1.0 s** with
5 ms fades, and loudness-equalised (RMS normalisation + soft limiter) so that volume is never a clue.
Each cue is then rendered through a Web Audio `PannerNode` with `panningModel = 'HRTF'` at the key's angle.
If a file fails to load, a synthetic stand-in plays and a warning is shown.

### Security-relevant details
- Keys come from `crypto.getRandomValues`, never `Math.random`.
- The lock app stores only a salted PBKDF2-SHA-256 hash (150,000 iterations), compared in constant time;
  the PIN is judged as a whole, so a wrong entry never reveals which digit was wrong.
- **Known limit:** with only 10,000 PINs a stolen hash can be brute-forced offline; real phones keep the
  attempt counter in secure hardware. A web app cannot replace the OS lock screen, so this is an *app lock*.

---

## Sounds

All five files are from **Mixkit** (free licence, no attribution required); listed for reproducibility.

| File | Mixkit title (ID) | Envelope family |
|---|---|---|
| `rain.wav` | Rain on umbrella (1263) — first 2 s kept, the app plays only 1 s | continuous, smooth |
| `knock.wav` | Wood hard hit (2182) | one impulse |
| `chirp.wav` | Forest birds singing (1212) | short pulses |
| `cowbell.wav` | Cowbell sharp hit (1743) | metallic ring |
| `cat.wav` | Cartoon little cat meow (91) | voice-like swell |

To change a sound, replace the file (keep the name) or edit `js/common/config.js`; tune loudness by ear
with `VOICE_GAIN`. If you change the file list, bump `CACHE` in `sw.js`.

---

## Related work
Closest prior work: Naitou et al., *AudioPIN: A Spatial Audio-based PIN-like Authentication System*,
CHI EA '26, doi:10.1145/3772363.3798635. Their secret is a sequence of sounds selected by head-turning;
ours is an ordinary numeric PIN entered through one-time spatial-audio keys.

## AI usage declaration
<!-- Edit this to match what you actually used, as the course requires. -->
An AI assistant (Claude, Anthropic) was used to reorganise the codebase into separate files, write this
README, the smoke test and the attack-simulation script and its test. The method, design decisions, sound selection and study are the authors' own.
