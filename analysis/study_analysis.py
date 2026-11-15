"""Analyse the user-study logs exported by the research prototype (index.html -> Download CSV).

Reads one or more CSV files (one per phone/session is fine; duplicates are dropped) and reports:
  1. Login conditions  - normal PIN (step 4), key code (step 5), wait-for-cue (step 3):
                         logins, success rate, entry time (median per participant, then mean +- SD across them)
  2. Key-code digits   - per-digit accuracy, response time, automatic repeats and manual replays
  3. Timing leak       - response time of digits whose answer wrapped past 9 vs not (permutation test).
                         A large gap means a stopwatch reveals whether a digit is large (see the paper).
  4. Calibration       - direction-test and key-code-practice accuracy (step 1), per layout and sound
  5. SUS (optional)    - System Usability Scale per condition from a separate questionnaire CSV

Writes, if asked: a LaTeX table for the paper (--tex) and a figure of entry time per condition (--plot).

Usage (from the repository root):
    python analysis/study_analysis.py data/*.csv
    python analysis/study_analysis.py data/*.csv --sus data/sus.csv --tex analysis/study_table.tex --plot analysis/study_times.png
    python analysis/study_analysis.py data/*.csv --exclude-practice 1   # drop each participant's first login per condition

SUS CSV format (one row per participant x condition; answers 1-5 to the 10 standard SUS items):
    participant,condition,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10
    P01,key,4,2,4,1,5,2,4,2,4,2
condition is one of: normal, key, cue
"""

import argparse
import csv
import glob
import statistics as st
import sys

import numpy as np

CONDITIONS = [  # (mode in the CSV, short name, label in the paper)
    ("normal-total", "normal", "Normal PIN"),
    ("key-total", "key", "AudioPIN key code"),
    ("audio-total", "cue", "Wait-for-cue"),
]


def truthy(v):
    return str(v).strip().lower() == "true"


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def load(paths):
    rows, seen = [], set()
    for pattern in paths:
        for path in sorted(glob.glob(pattern)) or [pattern]:
            with open(path, newline="", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    key = (r.get("time"), r.get("participant"), r.get("mode"), r.get("trial"), r.get("step"))
                    if key in seen:
                        continue
                    seen.add(key)
                    r["participant"] = (r.get("participant") or "").strip() or "(no id)"
                    rows.append(r)
    return rows


def drop_practice(rows, n):
    """Remove each participant's first n logins of every condition (and their per-digit rows)."""
    if n <= 0:
        return rows
    drop = set()
    for mode, *_ in CONDITIONS:
        by_p = {}
        for r in rows:
            if r["mode"] == mode:
                by_p.setdefault(r["participant"], []).append(r)
        for p, rs in by_p.items():
            rs.sort(key=lambda r: r["time"])
            drop |= {(p, r["trial"]) for r in rs[:n]}
    return [r for r in rows if (r["participant"], r["trial"]) not in drop or r["mode"] in ("test", "key-test")]


def mean_sd(xs):
    if not xs:
        return None, None
    return st.mean(xs), (st.stdev(xs) if len(xs) > 1 else 0.0)


def login_summary(rows):
    out = []
    for mode, short, label in CONDITIONS:
        rs = [r for r in rows if r["mode"] == mode]
        if not rs:
            continue
        per_p = {}
        for r in rs:
            per_p.setdefault(r["participant"], []).append(r)
        medians = [st.median([num(r["ms"]) / 1000 for r in v if num(r["ms"]) is not None]) for v in per_p.values()]
        rates = [sum(truthy(r["correct"]) for r in v) / len(v) for v in per_p.values()]
        m, sd = mean_sd(medians)
        out.append(dict(short=short, label=label, participants=len(per_p), logins=len(rs),
                        success=sum(truthy(r["correct"]) for r in rs) / len(rs),
                        success_pp=mean_sd(rates), time_mean=m, time_sd=sd, medians=medians))
    return out


def permutation_test(a, b, rounds=10000, seed=0):
    """Two-sided p-value for a difference in medians."""
    rng = np.random.default_rng(seed)
    a, b = np.asarray(a), np.asarray(b)
    observed = abs(np.median(a) - np.median(b))
    pooled = np.concatenate([a, b])
    count = 0
    for _ in range(rounds):
        rng.shuffle(pooled)
        count += abs(np.median(pooled[:len(a)]) - np.median(pooled[len(a):])) >= observed
    return (count + 1) / (rounds + 1)


def sus_scores(path):
    """Standard SUS: odd items score-1, even items 5-score, sum x 2.5 -> 0..100."""
    scores = {}
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            q = [int(r[f"q{i}"]) for i in range(1, 11)]
            s = sum((q[i] - 1) if i % 2 == 0 else (5 - q[i]) for i in range(10)) * 2.5
            scores.setdefault(r["condition"].strip().lower(), []).append(s)
    return scores


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("csv", nargs="+", help="CSV files exported by index.html (wildcards allowed)")
    ap.add_argument("--participants", help="comma-separated IDs to keep (default: all)")
    ap.add_argument("--exclude-practice", type=int, default=0, metavar="N",
                    help="drop each participant's first N logins per condition")
    ap.add_argument("--sus", help="SUS questionnaire CSV (see the header of this file)")
    ap.add_argument("--tex", help="write a LaTeX results table to this file")
    ap.add_argument("--plot", help="write a figure of entry time per condition (PNG/PDF)")
    args = ap.parse_args(argv)

    rows = load(args.csv)
    if args.participants:
        keep = {p.strip() for p in args.participants.split(",")}
        rows = [r for r in rows if r["participant"] in keep]
    rows = drop_practice(rows, args.exclude_practice)
    if not rows:
        sys.exit("No rows found.")
    people = sorted({r["participant"] for r in rows})
    print(f"{len(rows)} rows from {len(people)} participants: {', '.join(people)}\n")

    # 1. login conditions
    summary = login_summary(rows)
    print("1. LOGIN CONDITIONS (time = median per participant, then mean +- SD across participants)")
    for s in summary:
        print(f"   {s['label']:<20} {s['participants']} participants, {s['logins']:>3} logins | "
              f"success {s['success']:.0%} | time {s['time_mean']:.1f} +- {s['time_sd']:.1f} s")

    # 2. key-code digits
    steps = [r for r in rows if r["mode"] == "key-step"]
    if steps:
        ms = [num(r["ms"]) for r in steps if num(r["ms"]) is not None]
        print(f"\n2. KEY-CODE DIGITS: {len(steps)} digits | accuracy "
              f"{sum(truthy(r['correct']) for r in steps) / len(steps):.0%} | median response {st.median(ms) / 1000:.2f} s | "
              f"automatic repeats per digit {st.mean(num(r['repeats']) or 0 for r in steps):.2f} | "
              f"replays per digit {st.mean(num(r['replays']) or 0 for r in steps):.2f}")

        # 3. timing leak (correct answers only, so errors don't blur it)
        ok = [r for r in steps if truthy(r["correct"]) and num(r["ms"]) is not None]
        wrapped = [num(r["ms"]) for r in ok if truthy(r["wrapped"])]
        straight = [num(r["ms"]) for r in ok if not truthy(r["wrapped"])]
        if len(wrapped) >= 3 and len(straight) >= 3:
            diff = st.median(wrapped) - st.median(straight)
            p = permutation_test(wrapped, straight)
            print(f"\n3. TIMING LEAK (correct digits): wrapped median {st.median(wrapped) / 1000:.2f} s (n={len(wrapped)}) vs "
                  f"not wrapped {st.median(straight) / 1000:.2f} s (n={len(straight)}); "
                  f"difference {diff:+.0f} ms, permutation p = {p:.3f}")
        else:
            print("\n3. TIMING LEAK: not enough correct digits in both groups yet (need >= 3 each)")

    # 4. calibration
    tests = [r for r in rows if r["mode"] == "test"]
    if tests:
        print("\n4. DIRECTION TEST (step 1), accuracy by layout and cue sound:")
        groups = {}
        for r in tests:
            groups.setdefault((r["layout"], r["code"]), []).append(truthy(r["correct"]))
        for (lay, snd), v in sorted(groups.items()):
            print(f"   {lay:<9} {snd:<8} {sum(v) / len(v):>4.0%}  (n={len(v)})")
    practice = [r for r in rows if r["mode"] == "key-test"]
    if practice:
        print(f"   key-code practice: {sum(truthy(r['correct']) for r in practice) / len(practice):.0%} correct (n={len(practice)})")

    # 5. SUS
    sus = sus_scores(args.sus) if args.sus else {}
    if sus:
        print("\n5. SUS (0-100):")
        for _, short, label in CONDITIONS:
            if short in sus:
                m, sd = mean_sd(sus[short])
                print(f"   {label:<20} {m:.1f} +- {sd:.1f}  (n={len(sus[short])})")

    if args.tex:
        write_tex(args.tex, summary, sus, len(people))
        print(f"\nwrote {args.tex}")
    if args.plot:
        plot(args.plot, summary)
        print(f"wrote {args.plot}")


def write_tex(path, summary, sus, n_people):
    lines = [
        "% Generated by analysis/study_analysis.py -- re-run it after collecting more data; do not edit by hand.",
        "\\begin{table}[t]",
        "\\centering",
        f"\\caption{{Login performance ($N={n_people}$). Time: median per participant, mean $\\pm$ SD across participants.}}",
        "\\label{tab:study}",
        "\\begin{tabular}{lccc}",
        "\\toprule",
        "Condition & Success & Time (s) & SUS \\\\",
        "\\midrule",
    ]
    for s in summary:
        su = sus.get(s["short"])
        sus_txt = f"{st.mean(su):.1f}" if su else "--"
        lines.append(f"{s['label']} & {100 * s['success']:.0f}\\% & {s['time_mean']:.1f} $\\pm$ {s['time_sd']:.1f} & {sus_txt} \\\\")
    lines += ["\\bottomrule", "\\end{tabular}", "\\end{table}", ""]
    with open(path, "w") as f:
        f.write("\n".join(lines))


def plot(path, summary):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(3.5, 2.2), dpi=200)          # one IEEE column
    labels = [s["label"] for s in summary]
    for i, s in enumerate(summary):
        ax.bar(i, s["time_mean"], width=0.55, color="#2a78d6", zorder=2)
        jitter = np.linspace(-0.12, 0.12, len(s["medians"])) if len(s["medians"]) > 1 else [0]
        ax.scatter(i + np.asarray(jitter), s["medians"], s=10, color="#1a1a19", zorder=3, linewidths=0)
        top = max([s["time_mean"]] + s["medians"])               # label above the highest dot, never on it
        ax.annotate(f"{s['time_mean']:.1f} s", (i, top), xytext=(0, 5), textcoords="offset points",
                    ha="center", fontsize=7, color="#333333")
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, fontsize=7)
    ax.set_ylabel("Entry time (s)", fontsize=8)
    ax.tick_params(labelsize=7, length=0)
    ax.grid(axis="y", color="#e5e5e5", linewidth=0.6, zorder=0)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.set_title("Bars: mean of participant medians; dots: participants", fontsize=6.5, color="#555555")
    fig.tight_layout()
    fig.savefig(path)


if __name__ == "__main__":
    main()
