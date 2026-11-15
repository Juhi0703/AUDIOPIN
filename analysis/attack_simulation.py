"""AudioPIN attack simulation: how many PINs an observer breaks within 3 guesses.

Threat model (same as the paper):
  * The user's PIN is 4 uniform random digits. For every digit of every login a fresh uniform
    key 0..9 is drawn and played as (sound row, direction column) of the public chart:
        row = key // n_directions,   column = key % n_directions
    The user taps  (digit + key) mod 10.
  * Attackers, from weakest to strongest:
      video         sees every tap (and the public chart), hears nothing
      sound         + identifies WHICH sound played for each digit (a microphone near the earbuds)
      sound+side    + also hears which side it came from (microphone off-centre): left / right /
                    centre. Front and back are both "centre": with a generic HRTF they reach the two
                    ears identically, so one microphone cannot tell them apart.
  * The attacker may watch several logins of the same PIN, then makes up to G guesses
    (default 3, a typical retry limit), in order of posterior probability.

The attacker is Bayes-optimal. For a candidate digit d and an observed tap t the key must have
been k = (t - d) mod 10, so the likelihood of d is
        P(heard row | row(k)) * P(heard side | side(k)),
with an identification accuracy a: the true row is heard with probability a, any other row with
(1 - a) / (rows - 1); likewise for side. Digits are independent, so the posterior of a PIN is the
product of the per-digit posteriors. The attack succeeds if the true PIN is among the G most
likely PINs (ties broken at random, so a tie of N PINs for the last k slots succeeds with k/N).

With perfect identification some cases are exact, which tests/test_attack_simulation.py checks:
two directions x five sounds, sound heard once -> 2 candidates per digit -> 3/16 = 18.75 %.

Usage (from the repository root):
    python analysis/attack_simulation.py                      # perfect identification, table
    python analysis/attack_simulation.py --sound-acc 0.8      # attackers name the sound 80 % of the time
    python analysis/attack_simulation.py --csv analysis/results.csv --plot analysis/attack_results.png
Plug in the identification rates measured in the attack study with --sound-acc / --side-acc.
"""

import argparse
import csv
import sys

import numpy as np

KEYS, PIN_LEN = 10, 4

# Same layouts as the apps (angles in degrees: 0 ahead, -90 left, 90 right, 180 behind).
LAYOUTS = {
    "five":     ("5 directions × 2 sounds",              [-90, -45, 0, 45, 90]),
    "side":     ("4 × 3, four side positions",           [-90, -30, 30, 90]),
    "cardinal": ("4 × 3, left/front/right/back",         [-90, 0, 90, 180]),
    "three":    ("3 directions × 4 sounds",              [-90, 0, 90]),
    "two":      ("2 directions × 5 sounds",              [-90, 90]),
}


def side_of(angle):
    """0 = left, 1 = centre (front or back: indistinguishable), 2 = right."""
    if angle in (0, 180):
        return 1
    return 0 if angle < 0 else 2


def key_tables(angles):
    """For each key 0..9: its sound row and the side its direction lies on."""
    n = len(angles)
    rows = np.array([k // n for k in range(KEYS)])
    sides = np.array([side_of(angles[k % n]) for k in range(KEYS)])
    return rows, sides


def noisy(true_vals, n_classes, accuracy, rng):
    """Observe each value correctly with probability `accuracy`, otherwise as a uniform other class."""
    if n_classes < 2 or accuracy >= 1:
        return true_vals.copy()
    wrong = rng.random(true_vals.shape) >= accuracy
    shift = rng.integers(1, n_classes, size=true_vals.shape)       # never lands on the true class
    return np.where(wrong, (true_vals + shift) % n_classes, true_vals)


def likelihood(observed, candidate, n_classes, accuracy):
    """P(observed | candidate class) under the symmetric confusion model."""
    if n_classes < 2:
        return np.ones_like(candidate, dtype=float)
    miss = (1 - accuracy) / (n_classes - 1)
    return np.where(observed == candidate, accuracy, miss)


def success_rate(angles, logins, hears_sound, hears_side, sound_acc=1.0, side_acc=1.0,
                 guesses=3, trials=20000, seed=0, chunk=1000):
    """Fraction of PINs broken within `guesses` guesses after watching `logins` logins."""
    rng = np.random.default_rng(seed)
    rows_of, sides_of = key_tables(angles)
    n_rows, n_sides = rows_of.max() + 1, len(set(sides_of.tolist()))
    total = 0.0
    for start in range(0, trials, chunk):
        T = min(chunk, trials - start)
        pins = rng.integers(0, 10, size=(T, PIN_LEN))
        keys = rng.integers(0, KEYS, size=(T, logins, PIN_LEN))
        taps = (pins[:, None, :] + keys) % 10

        d = np.arange(10)                                              # candidate digits
        cand_keys = (taps[..., None] - d) % 10                         # (T, L, 4, 10)
        loglik = np.zeros((T, PIN_LEN, 10))
        if hears_sound:
            heard = noisy(rows_of[keys], n_rows, sound_acc, rng)[..., None]
            loglik += np.log(likelihood(heard, rows_of[cand_keys], n_rows, sound_acc) + 1e-300).sum(axis=1)
        if hears_side:
            heard = noisy(sides_of[keys], n_sides, side_acc, rng)[..., None]
            loglik += np.log(likelihood(heard, sides_of[cand_keys], n_sides, side_acc) + 1e-300).sum(axis=1)

        post = np.exp(loglik - loglik.max(axis=2, keepdims=True))
        post /= post.sum(axis=2, keepdims=True)                        # (T, 4, 10), uniform prior
        # Probability of every one of the 10^4 PINs, per trial.
        p_all = (post[:, 0, :, None, None, None] * post[:, 1, None, :, None, None] *
                 post[:, 2, None, None, :, None] * post[:, 3, None, None, None, :]).reshape(T, -1)
        p_true = np.prod(np.take_along_axis(post, pins[..., None], axis=2)[..., 0], axis=1)
        tol = 1e-9 * p_true[:, None]
        better = (p_all > p_true[:, None] + tol).sum(axis=1)
        tied = (np.abs(p_all - p_true[:, None]) <= tol).sum(axis=1)   # includes the true PIN
        total += np.clip((guesses - better) / tied, 0, 1).sum()
    return total / trials


SCENARIOS = [
    # (column title, logins watched, hears sound, hears side)
    ("video only", 1, False, False),
    ("sound, 1 login", 1, True, False),
    ("sound, 2 logins", 2, True, False),
    ("sound, 3 logins", 3, True, False),
    ("sound+side, 1 login", 1, True, True),
]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--trials", type=int, default=20000, help="simulated PINs per cell (default 20000)")
    ap.add_argument("--guesses", type=int, default=3, help="guesses the attacker gets (default 3)")
    ap.add_argument("--sound-acc", type=float, default=1.0, help="P(attacker names the sound correctly)")
    ap.add_argument("--side-acc", type=float, default=1.0, help="P(attacker names the side correctly)")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--csv", help="also write the table to this CSV file")
    ap.add_argument("--plot", help="also save a figure (PNG/PDF) of PINs broken vs logins watched")
    args = ap.parse_args(argv)

    results = {}
    for key, (label, angles) in LAYOUTS.items():
        results[key] = [100 * success_rate(angles, L, snd, sd, args.sound_acc, args.side_acc,
                                           args.guesses, args.trials, args.seed)
                        for _, L, snd, sd in SCENARIOS]

    print(f"% of PINs broken within {args.guesses} guesses "
          f"({args.trials} PINs per cell, sound accuracy {args.sound_acc:.0%}, side accuracy {args.side_acc:.0%})\n")
    head = f"{'layout':<32}" + "".join(f"{t:>21}" for t, *_ in SCENARIOS)
    print(head + "\n" + "-" * len(head))
    for key, (label, _) in LAYOUTS.items():
        print(f"{label:<32}" + "".join(f"{v:>20.2f}%" for v in results[key]))
    print(f"\nchance level (no information): {100 * args.guesses / 10 ** PIN_LEN:.2f}%")

    if args.csv:
        with open(args.csv, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["layout"] + [t for t, *_ in SCENARIOS])
            for key, (label, _) in LAYOUTS.items():
                w.writerow([label] + [f"{v:.2f}" for v in results[key]])
        print(f"wrote {args.csv}")
    if args.plot:
        plot(results, args.plot, args.guesses)
        print(f"wrote {args.plot}")


def plot(results, path, guesses):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    # Categorical palette (validated for colour-vision deficiency); markers + direct labels carry identity too.
    # Under a sound-only attacker both 4-direction layouts give identical numbers (same rows), so they share
    # one line. Categorical palette validated for colour-vision deficiency; markers + end labels carry identity too.
    series = [("five", "5 dir. × 2 sounds"), ("side", "4 dir. × 3 sounds (both layouts)"),
              ("three", "3 dir. × 4 sounds"), ("two", "2 dir. × 5 sounds")]
    colours = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]
    markers = ["o", "s", "^", "D"]
    fig, ax = plt.subplots(figsize=(3.5, 2.9), dpi=200)                # one IEEE column
    x = [1, 2, 3]
    for (key, label), c, m in zip(series, colours, markers):
        y = results[key][1:4]
        ax.plot(x, y, color=c, marker=m, markersize=5, linewidth=2, label=label, clip_on=False)
        ax.annotate(f"{y[-1]:.0f}%", (x[-1], y[-1]), xytext=(5, 0), textcoords="offset points",
                    va="center", fontsize=7, color="#333333")
    ax.set_xticks(x)
    ax.set_xlabel("Logins observed (sound identified)", fontsize=8)
    ax.set_ylabel(f"PINs broken in {guesses} guesses (%)", fontsize=8)
    ax.set_ylim(0, 100)
    ax.set_xlim(0.85, 3.35)
    ax.tick_params(labelsize=7, length=0)
    ax.grid(axis="y", color="#e5e5e5", linewidth=0.6)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.legend(fontsize=6.5, frameon=False, loc="upper center", bbox_to_anchor=(0.5, -0.25), ncol=2)
    fig.tight_layout()
    fig.savefig(path)


if __name__ == "__main__":
    sys.exit(main())
