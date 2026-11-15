# SUS questionnaire (print one per participant per condition)

System Usability Scale, Brooke (1996) — cite it in the report when you use it.

Participant ID: ________   Condition (circle): **Normal PIN** / **AudioPIN key code** / **Wait-for-cue**

Circle one number per line: 1 = strongly disagree … 5 = strongly agree.
"This system" = the PIN method you just used.

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | I think that I would like to use this system frequently. | ○ | ○ | ○ | ○ | ○ |
| 2 | I found the system unnecessarily complex. | ○ | ○ | ○ | ○ | ○ |
| 3 | I thought the system was easy to use. | ○ | ○ | ○ | ○ | ○ |
| 4 | I think that I would need the support of a technical person to be able to use this system. | ○ | ○ | ○ | ○ | ○ |
| 5 | I found the various functions in this system were well integrated. | ○ | ○ | ○ | ○ | ○ |
| 6 | I thought there was too much inconsistency in this system. | ○ | ○ | ○ | ○ | ○ |
| 7 | I would imagine that most people would learn to use this system very quickly. | ○ | ○ | ○ | ○ | ○ |
| 8 | I found the system very cumbersome to use. | ○ | ○ | ○ | ○ | ○ |
| 9 | I felt very confident using the system. | ○ | ○ | ○ | ○ | ○ |
| 10 | I needed to learn a lot of things before I could get going with this system. | ○ | ○ | ○ | ○ | ○ |

## Using Google Forms (recommended)
1. New form. Question 1: **Participant ID** (short answer, required).
2. Question 2: **Condition** (multiple choice, required): `Normal PIN`, `AudioPIN key code`, `Wait-for-cue`.
3. Questions 3–12: the 10 statements above, **in this order**, each as *Linear scale* 1–5
   (label 1 = Strongly disagree, 5 = Strongly agree), required.
4. The participant fills it once after **each** condition, right after finishing it.
5. Responses → *Link to Sheets* → in the sheet: File → Download → **CSV** → save as `data/sus.csv`.
   No editing needed: `analysis/study_analysis.py --sus data/sus.csv` reads the Google export directly
   (it finds the ID and Condition columns by name and takes the 10 answers in order).
   If someone submits the same condition twice, the last submission counts.

Without Google Forms: type one row per form into `data/sus.csv` as
`participant,condition,q1,...,q10` (condition = `normal`, `key` or `cue`).
