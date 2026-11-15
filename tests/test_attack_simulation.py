"""Checks attack_simulation.py against cases that can be worked out by hand.

Run from the repository root:  python tests/test_attack_simulation.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "analysis"))
from attack_simulation import LAYOUTS, success_rate  # noqa: E402

TWO, FIVE, CARDINAL = LAYOUTS["two"][1], LAYOUTS["five"][1], LAYOUTS["cardinal"][1]
CASES = [
    # (description, computed, exact answer, tolerance)
    ("video only: every tap equally likely -> 3 / 10^4",
     lambda: success_rate(TWO, 1, False, False, trials=2000), 3 / 10**4, 1e-12),
    ("video only, 3 logins: fresh keys add nothing -> still 3 / 10^4",
     lambda: success_rate(FIVE, 3, False, False, trials=2000), 3 / 10**4, 1e-12),
    ("2 dir x 5 sounds, sound heard once: 2 keys per row -> 2^4 = 16 PINs -> 3/16",
     lambda: success_rate(TWO, 1, True, False, trials=2000), 3 / 16, 1e-12),
    ("5 dir x 2 sounds, sound heard once: 5 keys per row -> 5^4 = 625 PINs -> 3/625",
     lambda: success_rate(FIVE, 1, True, False, trials=2000), 3 / 625, 1e-12),
    ("2 dir x 5 sounds, sound + side heard: key fully known -> 100 %",
     lambda: success_rate(TWO, 1, True, True, trials=2000), 1.0, 1e-12),
    # Keys 1,3,5,7 (front/back of a 4-key row) leave 2 candidates, all others 1, so each digit has
    # 2 candidates w.p. 0.4. With m such digits there are 2^m PINs: sum_m Bin(4,0.4)(m) * min(1, 3/2^m) = 0.7968.
    ("cardinal, sound + side: front/back both 'centre' -> 0.7968 (Monte Carlo, +-0.02)",
     lambda: success_rate(CARDINAL, 1, True, True, trials=4000), 0.7968, 0.02),
    ("attacker who guesses the sound at chance learns nothing: 2 dir x 5 sounds, 20 % accuracy",
     lambda: success_rate(TWO, 1, True, False, sound_acc=0.2, trials=2000), 3 / 10**4, 1e-9),
]

failed = 0
for text, run, expected, tol in CASES:
    got = run()
    ok = abs(got - expected) <= tol
    failed += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {text}: got {got:.6f}, expected {expected:.6f}")
print("ALL PASS" if not failed else f"{failed} FAILED")
sys.exit(1 if failed else 0)
