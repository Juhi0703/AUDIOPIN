# Pilot study protocol (≈ 15 min per participant)

Goal: first-session numbers for the report — success rate and entry time for the AudioPIN key code
vs. a normal PIN (and optionally wait-for-cue), plus SUS. 4–6 participants is enough for a pilot;
say "pilot" and report N honestly.

## Before you start
- One phone, **wired or Bluetooth stereo earphones**, both buds in, **Mono Audio off**, volume at a comfortable fixed level (note it).
- Open `index.html` (GitHub Pages link or local server). Set **Directions** to *Four side positions* (the recommended layout) and keep it the same for everyone.
- Write each participant's ID (P01, P02, …) in the **Participant** box before they start.
- Close the **Results log** panel while the participant is using the phone (it shows answers).

## Per participant
1. **Consent + background** (1 min): age range, earphone type, prior spatial-audio experience. Write it in `data/participants.csv`.
2. **Step 1 – practice** (3 min): *Play all, labelled*, then ~10 × *Play a random one*; then ~10 × *Play a key code*. These rows (`test`, `key-test`) give direction and key-reading accuracy.
3. **Step 2**: the app has generated a random 4-digit number PIN. Show it to the participant, let them memorise it.
4. **Conditions** — alternate the order between participants (P01: normal → key; P02: key → normal; …):
   - **Step 4 – normal PIN**: 1 practice + 5 logins.
   - **Step 5 – key code**: 1 practice + 5 logins.
   - *(optional)* **Step 3 – wait-for-cue**: set a direction PIN in Step 2 first, then 1 practice + 5 logins.
5. **SUS** after each condition: the printable form is `docs/sus_form.md`. Enter answers in `data/sus.csv` (see `data/sus_template.csv`).
6. **Save the data** at the end of the session (see *Collecting the CSV files* below).

## Collecting the CSV files
The prototype keeps every answer in the phone's browser storage (it survives a reload) until you press
**Clear log**. At the end of each session open **Results log** and use one of:

| Button | Best for | What happens |
|---|---|---|
| **Share CSV** (shown only on phones that support it) | Android Chrome, iPhone Safari | Opens the share sheet: send `audiopin-P01-<date>.csv` to WhatsApp (yourself), Google Drive, Gmail, Nearby Share… |
| **Download CSV** | laptop, Android | Saves `audiopin-P01-<date>.csv` to Downloads (iPhone: Files app → Downloads) |
| **Show CSV to copy** | anything else | Shows the text; copy-paste it into a file named `audiopin-P01.csv` |

Rules that keep the data clean:
- Type the participant ID **before** they start — it is stored in every row and in the file name.
- One phone for everyone? Download/share after each participant, then **Clear log** (tap twice) before the next one.
  If you forget to clear, nothing is lost: the script removes duplicate rows when files overlap.
- Several phones? Each phone's file is separate; just put them all in `data/`.
- Put every file in the repository's `data/` folder on your laptop. They are git-ignored on purpose
  (participant data); commit them only with consent (`git add -f data/...`).

## Analyse
```bash
python analysis/study_analysis.py data/*.csv --exclude-practice 1 --sus data/sus.csv \
       --tex report/tables/study_table.tex --plot report/figures/study_times.png
```
`--exclude-practice 1` drops each participant's first login per condition (the practice one).
Upload the new `report/tables/study_table.tex` to Overleaf — the table in the report updates itself.

## Optional: microphone attack (strengthens Section IV-A)
Record 10 key-code cues with a second phone 30 cm from the earbuds (once in front, once to one side).
Ask 3 classmates to name the **sound** and the **side** for each cue. Their accuracies go into:
```bash
python analysis/attack_simulation.py --sound-acc 0.9 --side-acc 0.6
```

## Ethics / privacy
Use IDs, not names, in every file. The raw CSVs contain no personal data beyond the ID; still,
ask participants before publishing them in the repository.
