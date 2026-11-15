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

**Entering the answers:** one row per form in `data/sus.csv`
(`participant,condition,q1,...,q10`; condition = `normal`, `key` or `cue`).
`analysis/study_analysis.py --sus data/sus.csv` computes the 0–100 score.
Tip: a Google Form with these 10 items (linear scale 1–5) exports to a sheet you can paste into the CSV.
